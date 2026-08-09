import type { DrizzleDB } from "../client.js";
import type { GeneratedPost } from "./posts.js";
import type { GeneratedUser } from "./users.js";
export interface GeneratedComment {
    id: string;
    postId: string;
    authorId: string;
    parentId: string | null;
    body: string;
    upvotes: number;
    downvotes: number;
    createdAt: string;
    depth: number;
}
/**
 * Generate deterministic comment trees for ALL posts eagerly
 * (the apps/web version lazily generates per-post). This is the
 * backend equivalent of memoising the entire comment graph at
 * seed time.
 *
 * Inserts all rows into the `comments` table. Returns the flat list
 * (parent-child relationships preserved via the parentId column).
 */
export declare function seedComments(db: DrizzleDB, generatedPosts: GeneratedPost[], generatedUsers: GeneratedUser[]): GeneratedComment[];
