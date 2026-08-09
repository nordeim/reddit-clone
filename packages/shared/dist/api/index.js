import { z } from "zod";
import { sortModeSchema, postTypeSchema, imageCategorySchema, voteValueSchema, } from "../schemas/index.js";
/**
 * API input/output schemas — every endpoint validates its request body /
 * query string / response against one of these. The Fastify zod-validator
 * plugin uses these directly so the runtime contract matches the TS types.
 *
 * Naming convention:
 *   <resource><action>InputSchema   — request body / query
 *   <resource><action>OutputSchema  — response body
 */
/* ---------------- Auth ---------------- */
export const registerInputSchema = z.object({
    username: z.string().min(3).max(30),
    password: z.string().min(8).max(256),
    displayName: z.string().min(1).max(50).optional(),
});
export const loginInputSchema = z.object({
    username: z.string().min(1),
    password: z.string().min(1),
});
export const authUserSchema = z.object({
    id: z.string().min(1),
    username: z.string().min(3).max(30),
    displayName: z.string().min(1).max(50),
    bio: z.string().max(500).default(""),
    karma: z.number().int().nonnegative().default(0),
    createdAt: z.string().datetime(),
    colorFrom: z.string().min(1),
    colorTo: z.string().min(1),
});
export const loginOutputSchema = z.object({
    accessToken: z.string().min(1),
    user: authUserSchema,
});
export const refreshTokenOutputSchema = z.object({
    accessToken: z.string().min(1),
    user: authUserSchema,
});
/* ---------------- Posts ---------------- */
export const createPostInputSchema = z
    .object({
    communityId: z.string().min(1),
    title: z.string().min(1).max(300),
    type: postTypeSchema,
    body: z.string().max(40000).optional(),
    linkUrl: z.string().url().optional(),
    imageCategory: imageCategorySchema.optional(),
    flair: z.string().max(50).optional(),
})
    .refine((data) => {
    if (data.type === "link")
        return typeof data.linkUrl === "string" && data.linkUrl.length > 0;
    return true;
}, { message: "linkUrl is required for link posts" })
    .refine((data) => {
    if (data.type === "link" && typeof data.linkUrl === "string") {
        const u = data.linkUrl.toLowerCase();
        // Reject javascript: / data: schemes (XSS / SSRF prevention per ADR-101).
        return u.startsWith("http://") || u.startsWith("https://");
    }
    return true;
}, { message: "linkUrl must be http(s):// scheme" });
/**
 * PATCH /api/posts/:id — partial update. All fields optional.
 * Same URL-safety refine as createPostInputSchema applies to linkUrl.
 */
export const updatePostInputSchema = z
    .object({
    title: z.string().min(1).max(300).optional(),
    body: z.string().max(40000).optional(),
    linkUrl: z.string().url().optional(),
    imageCategory: imageCategorySchema.optional(),
    flair: z.string().max(50).optional(),
})
    .refine((data) => {
    if (typeof data.linkUrl === "string") {
        const u = data.linkUrl.toLowerCase();
        return u.startsWith("http://") || u.startsWith("https://");
    }
    return true;
}, { message: "linkUrl must be http(s):// scheme" });
export const listPostsQuerySchema = z.object({
    cursor: z.string().optional(),
    limit: z.coerce.number().int().positive().max(100).default(20),
    sort: sortModeSchema.default("best"),
    communityId: z.string().optional(),
});
/* ---------------- Communities ---------------- */
export const createCommunityInputSchema = z.object({
    name: z.string().min(1).max(50).regex(/^[a-z0-9-_]+$/, "lowercase letters, digits, hyphen, underscore only"),
    title: z.string().min(1).max(100),
    description: z.string().max(1000).optional(),
    category: imageCategorySchema,
    icon: z.string().min(1).max(10),
});
/* ---------------- Votes ---------------- */
export const castVoteInputSchema = z.object({
    targetType: z.enum(["post", "comment"]),
    value: voteValueSchema,
});
export const castVoteOutputSchema = z.object({
    targetId: z.string().min(1),
    targetType: z.enum(["post", "comment"]),
    value: voteValueSchema,
    score: z.number().int(),
});
/* ---------------- Comments ---------------- */
export const createCommentInputSchema = z.object({
    body: z.string().min(1).max(10000),
    parentId: z.string().min(1).optional(),
});
/* ---------------- Search ---------------- */
export const searchQuerySchema = z.object({
    q: z.string().min(1).max(200),
    type: z.enum(["posts", "communities", "users"]).default("posts"),
    cursor: z.string().optional(),
    limit: z.coerce.number().int().positive().max(50).default(20),
});
/* ---------------- Notifications ---------------- */
export const listNotificationsQuerySchema = z.object({
    filter: z.enum(["all", "unread"]).default("all"),
    cursor: z.string().optional(),
    limit: z.coerce.number().int().positive().max(50).default(20),
});
/* ---------------- Shared envelopes ---------------- */
/**
 * Generic paginated response. Pass a Zod schema (or refinement) for the
 * data element; nextCursor is null when there are no more results.
 *
 * Usage:
 *   const postsPageSchema = paginateOutputSchema(postSchema);
 */
export function paginateOutputSchema(element) {
    return z.object({
        data: z.array(element),
        nextCursor: z.string().nullable(),
    });
}
export const errorResponseSchema = z.object({
    error: z.object({
        code: z.string().min(1),
        message: z.string().min(1),
        details: z.unknown().optional(),
        requestId: z.string().optional(),
    }),
});
//# sourceMappingURL=index.js.map