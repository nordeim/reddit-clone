import type { DrizzleDB } from "../client.js";
export interface GeneratedUser {
    id: string;
    username: string;
    displayName: string;
    bio: string;
    karma: number;
    createdAt: string;
    colorFrom: string;
    colorTo: string;
}
/**
 * Generate 48 deterministic users + a single "demo" current user.
 * Returns the array AND inserts all rows into the `users` table.
 *
 * The demo user (id "u-me") has a known password — "embers-demo" —
 * hashed with Argon2id at seed time. This is the user used by the
 * auth flow integration tests and the smoke test endpoint.
 */
export declare function seedUsers(db: DrizzleDB, hashPassword: (plain: string) => Promise<string>): Promise<GeneratedUser[]>;
