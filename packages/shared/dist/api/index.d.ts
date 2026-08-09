import { z } from "zod";
/**
 * API input/output schemas — every endpoint validates its request body /
 * query string / response against one of these. The Fastify zod-validator
 * plugin uses these directly so the runtime contract matches the TS types.
 *
 * Naming convention:
 *   <resource><action>InputSchema   — request body / query
 *   <resource><action>OutputSchema  — response body
 */
export declare const registerInputSchema: z.ZodObject<{
    username: z.ZodString;
    password: z.ZodString;
    displayName: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    username: string;
    password: string;
    displayName?: string | undefined;
}, {
    username: string;
    password: string;
    displayName?: string | undefined;
}>;
export type RegisterInput = z.infer<typeof registerInputSchema>;
export declare const loginInputSchema: z.ZodObject<{
    username: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    username: string;
    password: string;
}, {
    username: string;
    password: string;
}>;
export type LoginInput = z.infer<typeof loginInputSchema>;
export declare const authUserSchema: z.ZodObject<{
    id: z.ZodString;
    username: z.ZodString;
    displayName: z.ZodString;
    bio: z.ZodDefault<z.ZodString>;
    karma: z.ZodDefault<z.ZodNumber>;
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
    createdAt: string;
    colorFrom: string;
    colorTo: string;
    bio?: string | undefined;
    karma?: number | undefined;
}>;
export type AuthUser = z.infer<typeof authUserSchema>;
export declare const loginOutputSchema: z.ZodObject<{
    accessToken: z.ZodString;
    user: z.ZodObject<{
        id: z.ZodString;
        username: z.ZodString;
        displayName: z.ZodString;
        bio: z.ZodDefault<z.ZodString>;
        karma: z.ZodDefault<z.ZodNumber>;
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
        createdAt: string;
        colorFrom: string;
        colorTo: string;
        bio?: string | undefined;
        karma?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    accessToken: string;
    user: {
        id: string;
        username: string;
        displayName: string;
        bio: string;
        karma: number;
        createdAt: string;
        colorFrom: string;
        colorTo: string;
    };
}, {
    accessToken: string;
    user: {
        id: string;
        username: string;
        displayName: string;
        createdAt: string;
        colorFrom: string;
        colorTo: string;
        bio?: string | undefined;
        karma?: number | undefined;
    };
}>;
export type LoginOutput = z.infer<typeof loginOutputSchema>;
export declare const refreshTokenOutputSchema: z.ZodObject<{
    accessToken: z.ZodString;
    user: z.ZodObject<{
        id: z.ZodString;
        username: z.ZodString;
        displayName: z.ZodString;
        bio: z.ZodDefault<z.ZodString>;
        karma: z.ZodDefault<z.ZodNumber>;
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
        createdAt: string;
        colorFrom: string;
        colorTo: string;
        bio?: string | undefined;
        karma?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    accessToken: string;
    user: {
        id: string;
        username: string;
        displayName: string;
        bio: string;
        karma: number;
        createdAt: string;
        colorFrom: string;
        colorTo: string;
    };
}, {
    accessToken: string;
    user: {
        id: string;
        username: string;
        displayName: string;
        createdAt: string;
        colorFrom: string;
        colorTo: string;
        bio?: string | undefined;
        karma?: number | undefined;
    };
}>;
export type RefreshTokenOutput = z.infer<typeof refreshTokenOutputSchema>;
export declare const createPostInputSchema: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    communityId: z.ZodString;
    title: z.ZodString;
    type: z.ZodEnum<["text", "link", "image"]>;
    body: z.ZodOptional<z.ZodString>;
    linkUrl: z.ZodOptional<z.ZodString>;
    imageCategory: z.ZodOptional<z.ZodEnum<["nature", "tech", "gaming", "food", "space", "art", "animals", "sports"]>>;
    flair: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "text" | "link" | "image";
    title: string;
    communityId: string;
    body?: string | undefined;
    linkUrl?: string | undefined;
    imageCategory?: "nature" | "tech" | "gaming" | "food" | "space" | "art" | "animals" | "sports" | undefined;
    flair?: string | undefined;
}, {
    type: "text" | "link" | "image";
    title: string;
    communityId: string;
    body?: string | undefined;
    linkUrl?: string | undefined;
    imageCategory?: "nature" | "tech" | "gaming" | "food" | "space" | "art" | "animals" | "sports" | undefined;
    flair?: string | undefined;
}>, {
    type: "text" | "link" | "image";
    title: string;
    communityId: string;
    body?: string | undefined;
    linkUrl?: string | undefined;
    imageCategory?: "nature" | "tech" | "gaming" | "food" | "space" | "art" | "animals" | "sports" | undefined;
    flair?: string | undefined;
}, {
    type: "text" | "link" | "image";
    title: string;
    communityId: string;
    body?: string | undefined;
    linkUrl?: string | undefined;
    imageCategory?: "nature" | "tech" | "gaming" | "food" | "space" | "art" | "animals" | "sports" | undefined;
    flair?: string | undefined;
}>, {
    type: "text" | "link" | "image";
    title: string;
    communityId: string;
    body?: string | undefined;
    linkUrl?: string | undefined;
    imageCategory?: "nature" | "tech" | "gaming" | "food" | "space" | "art" | "animals" | "sports" | undefined;
    flair?: string | undefined;
}, {
    type: "text" | "link" | "image";
    title: string;
    communityId: string;
    body?: string | undefined;
    linkUrl?: string | undefined;
    imageCategory?: "nature" | "tech" | "gaming" | "food" | "space" | "art" | "animals" | "sports" | undefined;
    flair?: string | undefined;
}>;
export type CreatePostInput = z.infer<typeof createPostInputSchema>;
/**
 * PATCH /api/posts/:id — partial update. All fields optional.
 * Same URL-safety refine as createPostInputSchema applies to linkUrl.
 */
export declare const updatePostInputSchema: z.ZodEffects<z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    body: z.ZodOptional<z.ZodString>;
    linkUrl: z.ZodOptional<z.ZodString>;
    imageCategory: z.ZodOptional<z.ZodEnum<["nature", "tech", "gaming", "food", "space", "art", "animals", "sports"]>>;
    flair: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    title?: string | undefined;
    body?: string | undefined;
    linkUrl?: string | undefined;
    imageCategory?: "nature" | "tech" | "gaming" | "food" | "space" | "art" | "animals" | "sports" | undefined;
    flair?: string | undefined;
}, {
    title?: string | undefined;
    body?: string | undefined;
    linkUrl?: string | undefined;
    imageCategory?: "nature" | "tech" | "gaming" | "food" | "space" | "art" | "animals" | "sports" | undefined;
    flair?: string | undefined;
}>, {
    title?: string | undefined;
    body?: string | undefined;
    linkUrl?: string | undefined;
    imageCategory?: "nature" | "tech" | "gaming" | "food" | "space" | "art" | "animals" | "sports" | undefined;
    flair?: string | undefined;
}, {
    title?: string | undefined;
    body?: string | undefined;
    linkUrl?: string | undefined;
    imageCategory?: "nature" | "tech" | "gaming" | "food" | "space" | "art" | "animals" | "sports" | undefined;
    flair?: string | undefined;
}>;
export type UpdatePostInput = z.infer<typeof updatePostInputSchema>;
export declare const listPostsQuerySchema: z.ZodObject<{
    cursor: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    sort: z.ZodDefault<z.ZodEnum<["best", "hot", "new", "top", "rising"]>>;
    communityId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    sort: "best" | "hot" | "new" | "top" | "rising";
    limit: number;
    communityId?: string | undefined;
    cursor?: string | undefined;
}, {
    sort?: "best" | "hot" | "new" | "top" | "rising" | undefined;
    communityId?: string | undefined;
    cursor?: string | undefined;
    limit?: number | undefined;
}>;
export type ListPostsQuery = z.infer<typeof listPostsQuerySchema>;
export declare const createCommunityInputSchema: z.ZodObject<{
    name: z.ZodString;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    category: z.ZodEnum<["nature", "tech", "gaming", "food", "space", "art", "animals", "sports"]>;
    icon: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    title: string;
    category: "nature" | "tech" | "gaming" | "food" | "space" | "art" | "animals" | "sports";
    icon: string;
    description?: string | undefined;
}, {
    name: string;
    title: string;
    category: "nature" | "tech" | "gaming" | "food" | "space" | "art" | "animals" | "sports";
    icon: string;
    description?: string | undefined;
}>;
export type CreateCommunityInput = z.infer<typeof createCommunityInputSchema>;
export declare const castVoteInputSchema: z.ZodObject<{
    targetType: z.ZodEnum<["post", "comment"]>;
    value: z.ZodUnion<[z.ZodLiteral<-1>, z.ZodLiteral<0>, z.ZodLiteral<1>]>;
}, "strip", z.ZodTypeAny, {
    value: 0 | 1 | -1;
    targetType: "post" | "comment";
}, {
    value: 0 | 1 | -1;
    targetType: "post" | "comment";
}>;
export type CastVoteInput = z.infer<typeof castVoteInputSchema>;
export declare const castVoteOutputSchema: z.ZodObject<{
    targetId: z.ZodString;
    targetType: z.ZodEnum<["post", "comment"]>;
    value: z.ZodUnion<[z.ZodLiteral<-1>, z.ZodLiteral<0>, z.ZodLiteral<1>]>;
    score: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    value: 0 | 1 | -1;
    score: number;
    targetType: "post" | "comment";
    targetId: string;
}, {
    value: 0 | 1 | -1;
    score: number;
    targetType: "post" | "comment";
    targetId: string;
}>;
export type CastVoteOutput = z.infer<typeof castVoteOutputSchema>;
export declare const createCommentInputSchema: z.ZodObject<{
    body: z.ZodString;
    parentId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    body: string;
    parentId?: string | undefined;
}, {
    body: string;
    parentId?: string | undefined;
}>;
export type CreateCommentInput = z.infer<typeof createCommentInputSchema>;
export declare const searchQuerySchema: z.ZodObject<{
    q: z.ZodString;
    type: z.ZodDefault<z.ZodEnum<["posts", "communities", "users"]>>;
    cursor: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "posts" | "communities" | "users";
    limit: number;
    q: string;
    cursor?: string | undefined;
}, {
    q: string;
    type?: "posts" | "communities" | "users" | undefined;
    cursor?: string | undefined;
    limit?: number | undefined;
}>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;
export declare const listNotificationsQuerySchema: z.ZodObject<{
    filter: z.ZodDefault<z.ZodEnum<["all", "unread"]>>;
    cursor: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    filter: "all" | "unread";
    limit: number;
    cursor?: string | undefined;
}, {
    filter?: "all" | "unread" | undefined;
    cursor?: string | undefined;
    limit?: number | undefined;
}>;
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
/**
 * Generic paginated response. Pass a Zod schema (or refinement) for the
 * data element; nextCursor is null when there are no more results.
 *
 * Usage:
 *   const postsPageSchema = paginateOutputSchema(postSchema);
 */
export declare function paginateOutputSchema<T>(element: z.ZodType<T, z.ZodTypeDef, unknown>): z.ZodObject<{
    data: z.ZodArray<z.ZodType<T, z.ZodTypeDef, unknown>, "many">;
    nextCursor: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    data: T[];
    nextCursor: string | null;
}, {
    data: unknown[];
    nextCursor: string | null;
}>;
export type PaginateOutput<T> = {
    data: T[];
    nextCursor: string | null;
};
export declare const errorResponseSchema: z.ZodObject<{
    error: z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        details: z.ZodOptional<z.ZodUnknown>;
        requestId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        message: string;
        details?: unknown;
        requestId?: string | undefined;
    }, {
        code: string;
        message: string;
        details?: unknown;
        requestId?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    error: {
        code: string;
        message: string;
        details?: unknown;
        requestId?: string | undefined;
    };
}, {
    error: {
        code: string;
        message: string;
        details?: unknown;
        requestId?: string | undefined;
    };
}>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
//# sourceMappingURL=index.d.ts.map