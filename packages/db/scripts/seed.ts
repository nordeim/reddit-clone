import { openDb } from "../src/client";
import { runSeed } from "../src/seed";

/**
 * Production seed runner.
 *
 * Usage:
 *   pnpm --filter @embers/db seed
 *   DATABASE_URL=/path/to/db.sqlite pnpm --filter @embers/db seed
 *
 * Requires argon2 — installed as a transitive dependency of @embers/server.
 * The seed script runs the actual Argon2id hash so the demo user 'u-me'
 * can log in with the documented password 'embers-demo'.
 */
async function main(): Promise<void> {
  const path = process.env.DATABASE_URL ?? "./dev.db";

  // Dynamic import so @embers/db's main code doesn't take a hard
  // dependency on argon2 (which is a native module).
  const argon2 = await import("argon2");
  const hashPassword = (plain: string) => argon2.hash(plain, { type: argon2.argon2id });

  const { raw, db } = openDb({ path, skipMigrate: false });
  console.log(`Seeding database at ${path}…`);
  const result = await runSeed(db, { hashPassword });
  console.log(`Seed complete:`);
  console.log(`  users:         ${result.userCount}`);
  console.log(`  communities:    ${result.communityCount}`);
  console.log(`  posts:          ${result.postCount}`);
  console.log(`  comments:       ${result.commentCount}`);
  console.log(`  notifications:  ${result.notificationCount}`);
  console.log(`Demo user: 'you' / 'embers-demo'`);
  raw.close();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
