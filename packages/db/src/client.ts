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
