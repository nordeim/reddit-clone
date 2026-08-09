import Database from "better-sqlite3";
import { type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema/index.js";
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
export declare function openDb(opts?: OpenDbOptions): {
    raw: Database;
    db: DrizzleDB;
};
/**
 * Verify that all expected tables exist in the database. Used by the
 * migration test and by the health endpoint (could be).
 */
export declare function listTables(raw: Database): string[];
