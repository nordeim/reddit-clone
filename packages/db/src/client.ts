import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate as drizzleMigrate } from "drizzle-orm/better-sqlite3/migrator";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import * as schema from "./schema/index.js";
import { applyFts5 } from "./fts5.js";

export type Database = Database.Database;
export type DrizzleDB = BetterSQLite3Database<typeof schema>;

export interface OpenDbOptions {
  /** Path to the SQLite file. `:memory:` for in-memory DB. Defaults to ./dev.db */
  path?: string;
  /** Skip applying migrations on open (default: false). */
  skipMigrate?: boolean;
  /** Skip applying FTS5 schema (default: false). */
  skipFts5?: boolean;
  /** Skip applying WAL pragma (default: false). Set true for in-memory DBs. */
  skipWal?: boolean;
}

/**
 * Open a `better-sqlite3` connection, apply SQLite hardening pragmas,
 * optionally apply migrations + FTS5 schema, and return both the raw
 * connection (for FTS5 / pragma queries) and the Drizzle ORM wrapper.
 *
 * Hardening (always applied unless `skipWal` is set):
 *   PRAGMA journal_mode=WAL;        -- multi-reader, single-writer
 *   PRAGMA busy_timeout=5000;       -- wait up to 5s on write contention
 *   PRAGMA foreign_keys=ON;         -- enforce FK constraints
 *   PRAGMA synchronous=NORMAL;     -- safe with WAL; faster than FULL
 *
 * The WAL pragma is skipped automatically when path === ':memory:'.
 */
export function openDb(opts: OpenDbOptions = {}): { raw: Database; db: DrizzleDB } {
  const path = opts.path ?? "./dev.db";
  const isMemory = path === ":memory:";

  const raw = new Database(path);
  raw.pragma("foreign_keys=ON");

  if (!opts.skipWal && !isMemory) {
    raw.pragma("journal_mode=WAL");
    raw.pragma("busy_timeout=5000");
    raw.pragma("synchronous=NORMAL");
  }

  const db = drizzle(raw, { schema });

  if (!opts.skipMigrate) {
    const migrationsFolder = resolveMigrationsFolder();
    drizzleMigrate(db, { migrationsFolder });
  }

  if (!opts.skipFts5) {
    applyFts5(raw);
  }

  return { raw, db };
}

function resolveMigrationsFolder(): string {
  // The migrations folder is created by `drizzle-kit generate` at
  // `src/migrations/`. When the package is built with `tsc`, that folder
  // is NOT copied to `dist/` (tsc only compiles .ts files). We resolve
  // the folder by trying both locations:
  //   - dist/migrations  (preferred when the package was built + the
  //                       build was configured to copy migrations)
  //   - src/migrations   (used when running via tsx, or when dist is
  //                       absent and we're running from source)
  const here = dirname(fileURLToPath(import.meta.url));
  const distMigrations = resolve(here, "migrations");
  const srcMigrations = resolve(here, "..", "src", "migrations");
  if (existsSync(distMigrations)) return distMigrations;
  if (existsSync(srcMigrations)) return srcMigrations;
  // Last resort — return dist path so the error message is clear.
  return distMigrations;
}

/**
 * Verify that all expected tables exist in the database. Used by the
 * migration test and by the health endpoint (could be).
 */
export function listTables(raw: Database): string[] {
  const rows = raw
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
    )
    .all() as Array<{ name: string }>;
  return rows.map((r) => r.name);
}

/**
 * Result of a `backupDb()` call — wraps better-sqlite3's BackupMetadata
 * with the destination path for convenience.
 */
export interface BackupResult {
  /** Total pages in the backup (roughly proportional to DB size). */
  totalPages: number;
  /** Pages remaining (always 0 on success — only non-zero mid-progress). */
  remainingPages: number;
  /** Path the backup was written to. */
  destination: string;
}

/**
 * Back up a SQLite database to a destination file using SQLite's online
 * backup API (Round 13, F1 — Phase 5.6).
 *
 * This is safe to run while the server is writing to the source DB —
 * SQLite's backup API uses page-level copy with coordinated read locks,
 * never blocking writers for more than the duration of a single page copy.
 *
 * The destination file is created (or overwritten). The backup includes
 * all tables, indexes, triggers, and FTS5 virtual tables present in the
 * source.
 *
 * Usage:
 *   ```ts
 *   const result = await backupDb("./dev.db", "./backups/dev-20260813.db");
 *   console.log(`Backed up ${result.totalPages} pages to ${result.destination}`);
 *   ```
 *
 * For cron-based scheduling, see `packages/db/scripts/backup.ts`.
 *
 * @param sourcePath      Path to the source SQLite file.
 * @param destinationPath Path for the backup file (created or overwritten).
 * @returns Backup metadata.
 */
export async function backupDb(
  sourcePath: string,
  destinationPath: string,
): Promise<BackupResult> {
  const { raw } = openDb({
    path: sourcePath,
    skipMigrate: true,
    skipFts5: true,
  });
  try {
    const meta = await raw.backup(destinationPath);
    return {
      totalPages: meta.totalPages,
      remainingPages: meta.remainingPages,
      destination: destinationPath,
    };
  } finally {
    raw.close();
  }
}
