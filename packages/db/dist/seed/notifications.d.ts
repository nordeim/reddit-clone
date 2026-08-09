import type { DrizzleDB } from "../client.js";
import type { GeneratedPost } from "./posts.js";
import type { GeneratedUser } from "./users.js";
import type { GeneratedCommunity } from "./communities.js";
export interface GeneratedNotification {
    id: string;
    userId: string;
    type: "upvote" | "reply" | "mention" | "community";
    message: string;
    detail: string;
    postId: string | null;
    actorId: string | null;
    read: boolean;
    createdAt: string;
}
/**
 * Generate 18 deterministic notifications addressed to the demo user (u-me).
 * Mirrors the apps/web generator: picks a type, post, actor, builds a
 * message + detail string, timestamps within the last 14 days.
 */
export declare function seedNotifications(db: DrizzleDB, generatedPosts: GeneratedPost[], generatedUsers: GeneratedUser[], generatedCommunities: GeneratedCommunity[]): GeneratedNotification[];
