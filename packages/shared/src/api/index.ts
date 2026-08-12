import { z } from "zod";
import {
  sortModeSchema,
  postTypeSchema,
  imageCategorySchema,
  voteValueSchema,
} from "../schemas/index.js";

/**
 * API input/output schemas — every endpoint validates its request body /
 * query string / response against one of these. The Fastify zod-validator
 * plugin uses these directly so the runtime contract matches the TS types.
 *
 * Naming convention:
 *   <resource><action>InputSchema    — request body / query
 *   <resource><action>ResponseSchema — response body
 *
 * Round 12 (F5) standardized all response schemas on the *ResponseSchema
 * convention (previously a mix of *OutputSchema and *ResponseSchema).
 * The generic helper paginateOutputSchema() retains its name — it is a
 * factory function, not a response schema itself.
 */

/* ---------------- Auth ---------------- */

export const registerInputSchema = z.object({
  username: z.string().min(3).max(30),
  password: z.string().min(8).max(256),
  displayName: z.string().min(1).max(50).optional(),
});
export type RegisterInput = z.infer<typeof registerInputSchema>;

export const loginInputSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginInputSchema>;

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
export type AuthUser = z.infer<typeof authUserSchema>;

export const loginResponseSchema = z.object({
  accessToken: z.string().min(1),
  user: authUserSchema,
});
export type LoginResponse = z.infer<typeof loginResponseSchema>;

/**
 * Response schema for `POST /api/auth/register` (Round 11, F3).
 *
 * The server creates the user but does NOT establish a session — no
 * access token, no refresh cookie. The client must call `login()`
 * afterwards. This schema is the single source of truth for the 201
 * response shape; the web client's `RegisterResponse` interface in
 * `apps/web/src/lib/api.ts` mirrors it.
 */
export const registerResponseSchema = z.object({
  user: authUserSchema,
});
export type RegisterResponse = z.infer<typeof registerResponseSchema>;

export const refreshTokenResponseSchema = z.object({
  accessToken: z.string().min(1),
  user: authUserSchema,
});
export type RefreshTokenResponse = z.infer<typeof refreshTokenResponseSchema>;

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
  .refine(
    (data) => {
      if (data.type === "link") return typeof data.linkUrl === "string" && data.linkUrl.length > 0;
      return true;
    },
    { message: "linkUrl is required for link posts" },
  )
  .refine(
    (data) => {
      if (data.type === "link" && typeof data.linkUrl === "string") {
        const u = data.linkUrl.toLowerCase();
        // Reject javascript: / data: schemes (XSS / SSRF prevention per ADR-101).
        return u.startsWith("http://") || u.startsWith("https://");
      }
      return true;
    },
    { message: "linkUrl must be http(s):// scheme" },
  );
export type CreatePostInput = z.infer<typeof createPostInputSchema>;

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
  .refine(
    (data) => {
      if (typeof data.linkUrl === "string") {
        const u = data.linkUrl.toLowerCase();
        return u.startsWith("http://") || u.startsWith("https://");
      }
      return true;
    },
    { message: "linkUrl must be http(s):// scheme" },
  );
export type UpdatePostInput = z.infer<typeof updatePostInputSchema>;

export const listPostsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: sortModeSchema.default("best"),
  communityId: z.string().optional(),
});
export type ListPostsQuery = z.infer<typeof listPostsQuerySchema>;

/* ---------------- Communities ---------------- */

export const createCommunityInputSchema = z.object({
  name: z.string().min(1).max(50).regex(/^[a-z0-9-_]+$/, "lowercase letters, digits, hyphen, underscore only"),
  title: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  category: imageCategorySchema,
  icon: z.string().min(1).max(10),
});
export type CreateCommunityInput = z.infer<typeof createCommunityInputSchema>;

/* ---------------- Votes ---------------- */

export const castVoteInputSchema = z.object({
  targetType: z.enum(["post", "comment"]),
  value: voteValueSchema,
});
export type CastVoteInput = z.infer<typeof castVoteInputSchema>;

export const castVoteResponseSchema = z.object({
  targetId: z.string().min(1),
  targetType: z.enum(["post", "comment"]),
  value: voteValueSchema,
  score: z.number().int(),
});
export type CastVoteResponse = z.infer<typeof castVoteResponseSchema>;

/* ---------------- Comments ---------------- */

export const createCommentInputSchema = z.object({
  body: z.string().min(1).max(10000),
  parentId: z.string().min(1).optional(),
});
export type CreateCommentInput = z.infer<typeof createCommentInputSchema>;

/* ---------------- Search ---------------- */

export const searchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  type: z.enum(["posts", "communities", "users"]).default("posts"),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(50).default(20),
});
export type SearchQuery = z.infer<typeof searchQuerySchema>;

/* ---------------- Notifications ---------------- */

export const listNotificationsQuerySchema = z.object({
  filter: z.enum(["all", "unread"]).default("all"),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(50).default(20),
});
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;

/* ---------------- Shared envelopes ---------------- */

/**
 * Generic paginated response. Pass a Zod schema (or refinement) for the
 * data element; nextCursor is null when there are no more results.
 *
 * Usage:
 *   const postsPageSchema = paginateOutputSchema(postSchema);
 */
export function paginateOutputSchema<T>(element: z.ZodType<T, z.ZodTypeDef, unknown>) {
  return z.object({
    data: z.array(element),
    nextCursor: z.string().nullable(),
  });
}
export type PaginateOutput<T> = { data: T[]; nextCursor: string | null };

export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    details: z.unknown().optional(),
    requestId: z.string().optional(),
  }),
});
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
