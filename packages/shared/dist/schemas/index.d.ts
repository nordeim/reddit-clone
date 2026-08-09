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
export declare const voteValueSchema: z.ZodUnion<[z.ZodLiteral<-1>, z.ZodLiteral<0>, z.ZodLiteral<1>]>;
export type VoteValue = z.infer<typeof voteValueSchema>;
export declare const postTypeSchema: z.ZodEnum<["text", "link", "image"]>;
export type PostType = z.infer<typeof postTypeSchema>;
export declare const sortModeSchema: z.ZodEnum<["best", "hot", "new", "top", "rising"]>;
export type SortMode = z.infer<typeof sortModeSchema>;
export declare const imageCategorySchema: z.ZodEnum<["nature", "tech", "gaming", "food", "space", "art", "animals", "sports"]>;
export type ImageCategory = z.infer<typeof imageCategorySchema>;
export declare const notificationTypeSchema: z.ZodEnum<["upvote", "reply", "mention", "community"]>;
export type NotificationType = z.infer<typeof notificationTypeSchema>;
export declare const userSchema: z.ZodObject<{
    id: z.ZodString;
    username: z.ZodString;
    displayName: z.ZodString;
    bio: z.ZodDefault<z.ZodString>;
    karma: z.ZodNumber;
    createdAt: z.ZodString;
    colorFrom: z.ZodString;
    colorTo: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    username: string;
    displayName: string;
    bio: string;
    karma: number;
    createdAt: string;
    colorFrom: string;
    colorTo: string;
}, {
    id: string;
    username: string;
    displayName: string;
    karma: number;
    createdAt: string;
    colorFrom: string;
    colorTo: string;
    bio?: string | undefined;
}>;
export type User = z.infer<typeof userSchema>;
export declare const communitySchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    title: z.ZodString;
    description: z.ZodDefault<z.ZodString>;
    memberCount: z.ZodNumber;
    onlineCount: z.ZodNumber;
    createdAt: z.ZodString;
    category: z.ZodEnum<["nature", "tech", "gaming", "food", "space", "art", "animals", "sports"]>;
    colorFrom: z.ZodString;
    colorTo: z.ZodString;
    icon: z.ZodString;
    rules: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    colorFrom: string;
    colorTo: string;
    name: string;
    title: string;
    description: string;
    memberCount: number;
    onlineCount: number;
    category: "nature" | "tech" | "gaming" | "food" | "space" | "art" | "animals" | "sports";
    icon: string;
    rules: string[];
}, {
    id: string;
    createdAt: string;
    colorFrom: string;
    colorTo: string;
    name: string;
    title: string;
    memberCount: number;
    onlineCount: number;
    category: "nature" | "tech" | "gaming" | "food" | "space" | "art" | "animals" | "sports";
    icon: string;
    description?: string | undefined;
    rules?: string[] | undefined;
}>;
export type Community = z.infer<typeof communitySchema>;
export declare const postSchema: z.ZodObject<{
    id: z.ZodString;
    communityId: z.ZodString;
    authorId: z.ZodString;
    title: z.ZodString;
    type: z.ZodEnum<["text", "link", "image"]>;
    body: z.ZodOptional<z.ZodString>;
    linkUrl: z.ZodOptional<z.ZodString>;
    linkDomain: z.ZodOptional<z.ZodString>;
    imageCategory: z.ZodOptional<z.ZodEnum<["nature", "tech", "gaming", "food", "space", "art", "animals", "sports"]>>;
    flair: z.ZodOptional<z.ZodString>;
    score: z.ZodNumber;
    commentCount: z.ZodNumber;
    createdAt: z.ZodString;
    isLocal: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    type: "text" | "link" | "image";
    id: string;
    createdAt: string;
    title: string;
    communityId: string;
    authorId: string;
    score: number;
    commentCount: number;
    body?: string | undefined;
    linkUrl?: string | undefined;
    linkDomain?: string | undefined;
    imageCategory?: "nature" | "tech" | "gaming" | "food" | "space" | "art" | "animals" | "sports" | undefined;
    flair?: string | undefined;
    isLocal?: boolean | undefined;
}, {
    type: "text" | "link" | "image";
    id: string;
    createdAt: string;
    title: string;
    communityId: string;
    authorId: string;
    score: number;
    commentCount: number;
    body?: string | undefined;
    linkUrl?: string | undefined;
    linkDomain?: string | undefined;
    imageCategory?: "nature" | "tech" | "gaming" | "food" | "space" | "art" | "animals" | "sports" | undefined;
    flair?: string | undefined;
    isLocal?: boolean | undefined;
}>;
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
export declare const commentSchema: z.ZodType<Comment>;
export declare const notificationSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<["upvote", "reply", "mention", "community"]>;
    message: z.ZodString;
    detail: z.ZodDefault<z.ZodString>;
    postId: z.ZodOptional<z.ZodString>;
    actorId: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodString;
    read: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    message: string;
    type: "upvote" | "reply" | "mention" | "community";
    id: string;
    createdAt: string;
    detail: string;
    read: boolean;
    postId?: string | undefined;
    actorId?: string | undefined;
}, {
    message: string;
    type: "upvote" | "reply" | "mention" | "community";
    id: string;
    createdAt: string;
    read: boolean;
    postId?: string | undefined;
    detail?: string | undefined;
    actorId?: string | undefined;
}>;
export type AppNotification = z.infer<typeof notificationSchema>;
//# sourceMappingURL=index.d.ts.map