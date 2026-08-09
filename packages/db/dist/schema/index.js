import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
/**
 * Drizzle ORM schema for the embers backend (ADR-103).
 *
 * Design notes:
 *   - All IDs are TEXT (UUIDs are generated application-side via `crypto.randomUUID()`).
 *   - Timestamps are stored as ISO 8601 TEXT (UTC, `toISOString()`).
 *   - Foreign keys are declared but only enforced when `PRAGMA foreign_keys=ON`
 *     is set on the connection (handled by `client.ts`).
 *   - The `votes` table uses a composite PK `(user_id, target_id, target_type)`
 *     to enforce "one vote per user per target" without a separate unique index.
 *   - `posts_fts` (FTS5 virtual table) lives in `fts5.ts` because its schema
 *     is `CREATE VIRTUAL TABLE` syntax that Drizzle's table builder doesn't
 *     model directly.
 */
export const users = sqliteTable("users", {
    id: text("id").primaryKey(),
    username: text("username").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name").notNull(),
    bio: text("bio").notNull().default(""),
    karma: integer("karma").notNull().default(0),
    createdAt: text("created_at").notNull().default(sql `(CURRENT_TIMESTAMP)`),
    colorFrom: text("color_from").notNull(),
    colorTo: text("color_to").notNull(),
});
export const communities = sqliteTable("communities", {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    ownerId: text("owner_id").references(() => users.id),
    memberCount: integer("member_count").notNull().default(0),
    onlineCount: integer("online_count").notNull().default(0),
    createdAt: text("created_at").notNull().default(sql `(CURRENT_TIMESTAMP)`),
    category: text("category").notNull(),
    colorFrom: text("color_from").notNull(),
    colorTo: text("color_to").notNull(),
    icon: text("icon").notNull(),
    rules: text("rules").notNull().default("[]"), // JSON-encoded string[]
});
export const posts = sqliteTable("posts", {
    id: text("id").primaryKey(),
    communityId: text("community_id").notNull().references(() => communities.id),
    authorId: text("author_id").notNull().references(() => users.id),
    title: text("title").notNull(),
    type: text("type").notNull(), // text | link | image
    body: text("body"),
    linkUrl: text("link_url"),
    linkDomain: text("link_domain"),
    imageCategory: text("image_category"),
    flair: text("flair"),
    upvotes: integer("upvotes").notNull().default(0),
    downvotes: integer("downvotes").notNull().default(0),
    commentCount: integer("comment_count").notNull().default(0),
    createdAt: text("created_at").notNull().default(sql `(CURRENT_TIMESTAMP)`),
});
export const comments = sqliteTable("comments", {
    id: text("id").primaryKey(),
    postId: text("post_id").notNull().references(() => posts.id),
    authorId: text("author_id").notNull().references(() => users.id),
    parentId: text("parent_id"), // self-referential — FK added by migration
    body: text("body").notNull(),
    upvotes: integer("upvotes").notNull().default(0),
    downvotes: integer("downvotes").notNull().default(0),
    createdAt: text("created_at").notNull().default(sql `(CURRENT_TIMESTAMP)`),
    depth: integer("depth").notNull().default(0),
});
export const votes = sqliteTable("votes", {
    userId: text("user_id").notNull().references(() => users.id),
    targetId: text("target_id").notNull(),
    targetType: text("target_type").notNull(), // post | comment
    value: integer("value").notNull(), // -1 | 1
    createdAt: text("created_at").notNull().default(sql `(CURRENT_TIMESTAMP)`),
}, (table) => ({
    pk: primaryKey({ columns: [table.userId, table.targetId, table.targetType] }),
}));
export const notifications = sqliteTable("notifications", {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id),
    type: text("type").notNull(), // upvote | reply | mention | community
    message: text("message").notNull(),
    detail: text("detail").notNull().default(""),
    postId: text("post_id"),
    actorId: text("actor_id").references(() => users.id),
    read: integer("read", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull().default(sql `(CURRENT_TIMESTAMP)`),
});
export const sessions = sqliteTable("sessions", {
    jti: text("jti").primaryKey(), // JWT ID of refresh token
    userId: text("user_id").notNull().references(() => users.id),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull().default(sql `(CURRENT_TIMESTAMP)`),
    revokedAt: text("revoked_at"),
});
