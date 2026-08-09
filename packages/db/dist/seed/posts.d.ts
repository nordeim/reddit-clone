import type { DrizzleDB } from "../client.js";
import { hashString } from "./random.js";
import type { GeneratedCommunity } from "./communities.js";
import type { GeneratedUser } from "./users.js";
export interface GeneratedPost {
    id: string;
    communityId: string;
    authorId: string;
    title: string;
    type: "text" | "link" | "image";
    body: string | null;
    linkUrl: string | null;
    linkDomain: string | null;
    imageCategory: string | null;
    flair: string | null;
    upvotes: number;
    downvotes: number;
    commentCount: number;
    createdAt: string;
}
/**
 * Generate 320 deterministic posts from the seed `posts-seed-v2`.
 *
 * Note: the `commentCount` field is initially derived from a formula
 * (matching the original apps/web behaviour) and is NOT later adjusted
 * to match the actual comment tree count. This is a known divergence
 * from the apps/web client behaviour (which walks the comment tree
 * after generation to fix the count) — for the backend, comment counts
 * are derived at query time from the `comments` table.
 */
export declare function seedPosts(db: DrizzleDB, generatedCommunities: GeneratedCommunity[], generatedUsers: GeneratedUser[]): GeneratedPost[];
export { hashString };
