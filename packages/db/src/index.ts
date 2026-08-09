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
export * from "./schema/index";
export * as schema from "./schema/index";
export { applyFts5, searchPosts, FTS5_SCHEMA_SQL, FTS5_TRIGGERS_SQL } from "./fts5";
export { runSeed, type SeedResult, type SeedOptions } from "./seed";

// PRNG utilities — ported from apps/web/src/utils/random.ts so the server
// can derive the same gradient colors as the client (no visual mismatch
// when the API is wired into apps/web).
export { hashString, seededRandom, createRng, gradientFor } from "./seed/random";
