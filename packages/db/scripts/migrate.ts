import { openDb } from "../src/client";

/**
 * Apply pending Drizzle migrations to the configured database.
 *
 * Usage:
 *   pnpm --filter @embers/db migrate
 *   DATABASE_URL=/path/to/db.sqlite pnpm --filter @embers/db migrate
 *
 * The DATABASE_URL env var (default: ./dev.db) selects the target file.
 * In production, prefer running this as part of the deploy pipeline
 * before the server starts.
 */
async function main(): Promise<void> {
  const path = process.env.DATABASE_URL ?? "./dev.db";
  const { raw } = openDb({ path, skipMigrate: false });
  // `openDb` already ran migrate() — just verify and exit.
  const tables = raw
    .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    .all() as Array<{ name: string }>;
  console.log(`Migrations applied to ${path}. Tables present:`);
  for (const t of tables) {
    console.log(`  - ${t.name}`);
  }
  raw.close();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
