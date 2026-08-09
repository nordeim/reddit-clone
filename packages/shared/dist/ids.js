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
export function asUserId(id) {
    return id;
}
export function asCommunityId(id) {
    return id;
}
export function asPostId(id) {
    return id;
}
export function asCommentId(id) {
    return id;
}
export function asNotificationId(id) {
    return id;
}
export function isUserId(value) {
    return typeof value === "string";
}
//# sourceMappingURL=ids.js.map