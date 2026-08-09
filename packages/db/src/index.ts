/**
 * @embers/db — Drizzle ORM + better-sqlite3 + FTS5.
 *
 * Exports:
 *   - openDb(): open a hardened connection (WAL, busy_timeout, FK on)
 *   - listTables(): introspection helper
 *   - Drizzle schema tables: users, communities, posts, comments,
 *     votes, notifications, sessions
 *   - FTS5: applyFts5(), searchPosts()
 */

export * from "./client";
export * as schema from "./schema/index";
export { applyFts5, searchPosts, FTS5_SCHEMA_SQL, FTS5_TRIGGERS_SQL } from "./fts5";
