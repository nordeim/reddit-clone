import { z } from "zod";

/**
 * Entity Zod schemas — the canonical, runtime-validated shape of every
 * domain object. The corresponding TS interfaces are inferred from these
 * schemas (single source of truth).
 *
 * These mirror the existing `apps/web/src/types/index.ts` interfaces, with
 * the addition of runtime validation. The web app's hand-written types
 * remain unchanged (they're still valid TS) but the backend uses these
 * schemas for boundary validation per ADR-101.
 */

export const voteValueSchema = z.union([z.literal(-1), z.literal(0), z.literal(1)]);
export type VoteValue = z.infer<typeof voteValueSchema>;

export const postTypeSchema = z.enum(["text", "link", "image"]);
export type PostType = z.infer<typeof postTypeSchema>;

export const sortModeSchema = z.enum(["best", "hot", "new", "top", "rising"]);
export type SortMode = z.infer<typeof sortModeSchema>;

export const imageCategorySchema = z.enum([
  "nature",
  "tech",
  "gaming",
  "food",
  "space",
  "art",
  "animals",
  "sports",
]);
export type ImageCategory = z.infer<typeof imageCategorySchema>;

export const notificationTypeSchema = z.enum(["upvote", "reply", "mention", "community"]);
export type NotificationType = z.infer<typeof notificationTypeSchema>;

export const userSchema = z.object({
  id: z.string().min(1),
  username: z.string().min(3).max(30),
  displayName: z.string().min(1).max(50),
  bio: z.string().max(500).default(""),
  karma: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  colorFrom: z.string().min(1),
  colorTo: z.string().min(1),
});
export type User = z.infer<typeof userSchema>;

export const communitySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(50),
  title: z.string().min(1).max(100),
  description: z.string().max(1000).default(""),
  memberCount: z.number().int().nonnegative(),
  onlineCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  category: imageCategorySchema,
  colorFrom: z.string().min(1),
  colorTo: z.string().min(1),
  icon: z.string().min(1).max(10),
  rules: z.array(z.string().max(200)).default([]),
});
export type Community = z.infer<typeof communitySchema>;

export const postSchema = z.object({
  id: z.string().min(1),
  communityId: z.string().min(1),
  authorId: z.string().min(1),
  title: z.string().min(1).max(300),
  type: postTypeSchema,
  body: z.string().max(40000).optional(),
  linkUrl: z.string().url().optional(),
  linkDomain: z.string().max(253).optional(),
  imageCategory: imageCategorySchema.optional(),
  flair: z.string().max(50).optional(),
  score: z.number().int(),
  commentCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  isLocal: z.boolean().optional(),
});
export type Post = z.infer<typeof postSchema>;

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  parentId: string | null;
  body: string;
  score: number;
  createdAt: string;
  children: Comment[];
  isLocal?: boolean;
}

export const commentSchema: z.ZodType<Comment> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    postId: z.string().min(1),
    authorId: z.string().min(1),
    parentId: z.string().nullable(),
    body: z.string().min(1).max(10000),
    score: z.number().int(),
    createdAt: z.string().datetime(),
    children: z.array(commentSchema),
    isLocal: z.boolean().optional(),
  }),
);

export const notificationSchema = z.object({
  id: z.string().min(1),
  type: notificationTypeSchema,
  message: z.string().min(1).max(300),
  detail: z.string().max(500).default(""),
  postId: z.string().optional(),
  actorId: z.string().optional(),
  createdAt: z.string().datetime(),
  read: z.boolean(),
});
export type AppNotification = z.infer<typeof notificationSchema>;
