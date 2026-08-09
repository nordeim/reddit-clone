import type { DrizzleDB } from "../client.js";
import { sql } from "drizzle-orm";
import { seedUsers } from "./users.js";
import { seedCommunities } from "./communities.js";
import { seedPosts } from "./posts.js";
import { seedComments } from "./comments.js";
import { seedNotifications } from "./notifications.js";

export interface SeedResult {
  userCount: number;
  communityCount: number;
  postCount: number;
  commentCount: number;
  notificationCount: number;
}

export interface SeedOptions {
  /**
   * Password-hashing function. Required so the seed module doesn't need
   * to depend on argon2 directly (keeps @embers/db free of native
   * argon2 dependency; the caller supplies the implementation).
   */
  hashPassword: (plain: string) => Promise<string>;
}

/**
 * Idempotent seed runner. Truncates all data tables, then runs every
 * seed module in FK-safe order within a single transaction.
 *
 * Order:
 *   1. users          (no FKs)
 *   2. communities    (FK to users.owner_id — null at seed time)
 *   3. posts          (FK to communities, users)
 *   4. comments       (FK to posts, users; self-ref parentId)
 *   5. notifications  (FK to users, optional postId/actorId)
 *
 * Re-running the seed produces identical row counts and content
 * (deterministic seeds). Safe to call against an already-seeded DB.
 */
export async function runSeed(
  db: DrizzleDB,
  opts: SeedOptions,
): Promise<SeedResult> {
  // Truncate all data tables (in reverse FK order to avoid constraint
  // violations). Drizzle's `sql.raw()` lets us run raw SQL inside a
  // transaction.
  db.transaction((tx) => {
    tx.run(sql`DELETE FROM notifications;`);
    tx.run(sql`DELETE FROM comments;`);
    tx.run(sql`DELETE FROM votes;`);
    tx.run(sql`DELETE FROM posts;`);
    tx.run(sql`DELETE FROM communities;`);
    tx.run(sql`DELETE FROM sessions;`);
    tx.run(sql`DELETE FROM users;`);
  });

  // Seed (each module inserts its own rows).
  const generatedUsers = await seedUsers(db, opts.hashPassword);
  const generatedCommunities = seedCommunities(db);
  const generatedPosts = seedPosts(db, generatedCommunities, generatedUsers);
  const generatedComments = seedComments(db, generatedPosts, generatedUsers);
  const generatedNotifications = seedNotifications(db, generatedPosts, generatedUsers, generatedCommunities);

  return {
    userCount: generatedUsers.length + 1, // +1 for u-me
    communityCount: generatedCommunities.length,
    postCount: generatedPosts.length,
    commentCount: generatedComments.length,
    notificationCount: generatedNotifications.length,
  };
}

export { seedUsers, seedCommunities, seedPosts, seedComments, seedNotifications };
