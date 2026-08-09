import type { DrizzleDB } from "../client.js";
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
export declare function runSeed(db: DrizzleDB, opts: SeedOptions): Promise<SeedResult>;
export { seedUsers, seedCommunities, seedPosts, seedComments, seedNotifications };
