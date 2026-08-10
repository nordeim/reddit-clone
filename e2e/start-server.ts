/**
 * E2E bootstrap — seeds a file-based SQLite DB then starts the Fastify server.
 *
 * Used by `playwright.config.ts`'s `webServer` command. The server itself
 * (apps/server/src/index.ts) only runs migrations on startup, not the seed —
 * the seed is a separate opt-in script. For E2E tests we need a seeded DB,
 * so this script:
 *
 *   1. Deletes any prior /tmp/embers-e2e.db (fresh per run).
 *   2. Opens the DB (which runs migrations).
 *   3. Runs the seed (49 users, 18 communities, 320 posts, ~3037 comments).
 *   4. Starts the Fastify server on the same process, sharing the DB handle.
 *
 * The server is started programmatically via buildApp + app.listen so the
 * seeded DB connection is reused (no second process, no IPC).
 *
 * Imports use workspace-relative paths because `e2e/` is not a workspace
 * package and Node's ESM resolver does not always traverse `node_modules`
 * for `@embers/*` imports from outside a workspace.
 *
 * Env vars (same as apps/server/src/index.ts):
 *   PORT, HOST, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, CORS_ORIGIN, NODE_ENV
 */
import { buildApp } from "../apps/server/src/app.js";
import { loadEnv } from "../apps/server/src/config.js";
import { openDb, runSeed } from "../packages/db/src/index.js";
import argon2 from "argon2";
import { existsSync, unlinkSync } from "node:fs";

const DB_PATH = process.env.E2E_DB_PATH ?? "/tmp/embers-e2e.db";

async function main(): Promise<void> {
  // 1. Fresh DB per run.
  if (existsSync(DB_PATH)) {
    unlinkSync(DB_PATH);
    // Also remove WAL/SHM sidecars if present.
    for (const ext of ["-wal", "-shm", "-journal"]) {
      const f = `${DB_PATH}${ext}`;
      if (existsSync(f)) unlinkSync(f);
    }
  }

  // 2. Open + migrate.
  const { raw, db } = openDb({ path: DB_PATH });

  // 3. Seed (real Argon2id hash so the demo user 'you' / 'embers-demo' works).
  const hashPassword = (plain: string) =>
    argon2.hash(plain, { type: argon2.argon2id, timeCost: 2, memoryCost: 1024, parallelism: 1 });
  await runSeed(db, { hashPassword });
  console.log(`[e2e] Seeded ${DB_PATH} — demo user 'you' / 'embers-demo'`);

  // 4. Start the server (reuses the seeded DB handle).
  const env = loadEnv();
  const app = await buildApp({ env: process.env, db, rawDb: raw });

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info({ port: env.PORT, host: env.HOST }, "[e2e] server listening");
  } catch (err) {
    app.log.error({ err }, "[e2e] failed to start server");
    process.exit(1);
  }

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info({ signal }, "[e2e] shutting down");
    await app.close();
    raw.close();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("[e2e] bootstrap failed:", err);
  process.exit(1);
});
