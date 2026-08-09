/**
 * Branded ID types — nominal-typed string aliases that prevent accidentally
 * passing one kind of ID where another is expected.
 *
 * Branded via the `& { readonly __brand: T }` intersection pattern, which is
 * erased at runtime (a UserId is just a string at the JS level) but enforced
 * at compile time.
 *
 * The `asXxx` constructors are the only sanctioned way to lift a raw string
 * into a branded ID. They exist at module scope so they don't get tree-shaken
 * out of the type graph.
 */
export type Brand<T extends string> = {
    readonly __brand: T;
};
export type UserId = string & Brand<"UserId">;
export type CommunityId = string & Brand<"CommunityId">;
export type PostId = string & Brand<"PostId">;
export type CommentId = string & Brand<"CommentId">;
export type NotificationId = string & Brand<"NotificationId">;
/**
 * VoteTargetId is the namespaced storage key for a vote — either
 * `post:<id>` or `comment:<id>`. It is intentionally a plain `string`
 * (not branded) because it crosses the wire as a JSON string and is
 * parsed back into `{ targetType, targetId }` by the cast-vote API.
 */
export type VoteTargetId = string;
export declare function asUserId(id: string): UserId;
export declare function asCommunityId(id: string): CommunityId;
export declare function asPostId(id: string): PostId;
export declare function asCommentId(id: string): CommentId;
export declare function asNotificationId(id: string): NotificationId;
export declare function isUserId(value: unknown): value is UserId;
//# sourceMappingURL=ids.d.ts.map