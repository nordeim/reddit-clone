import { eq, desc, and, lt, sql } from "drizzle-orm";
import { posts, communities, comments } from "@embers/db";
function toPostRow(row) {
    return {
        id: row.id,
        communityId: row.communityId,
        authorId: row.authorId,
        title: row.title,
        type: row.type,
        body: row.body,
        linkUrl: row.linkUrl,
        linkDomain: row.linkDomain,
        imageCategory: row.imageCategory,
        flair: row.flair,
        upvotes: row.upvotes,
        downvotes: row.downvotes,
        commentCount: row.commentCount,
        createdAt: row.createdAt,
    };
}
export function createPostRepository(db) {
    return {
        create(input) {
            db.insert(posts)
                .values({
                id: input.id,
                communityId: input.communityId,
                authorId: input.authorId,
                title: input.title,
                type: input.type,
                body: input.body ?? null,
                linkUrl: input.linkUrl ?? null,
                linkDomain: input.linkDomain ?? null,
                imageCategory: input.imageCategory ?? null,
                flair: input.flair ?? null,
            })
                .run();
            const row = db.select().from(posts).where(eq(posts.id, input.id)).get();
            if (!row)
                throw new Error("post insert did not return row");
            return toPostRow(row);
        },
        findById(id) {
            const row = db.select().from(posts).where(eq(posts.id, id)).get();
            return row ? toPostRow(row) : undefined;
        },
        /**
         * Cursor-paginated list. Cursor is base64-encoded JSON
         * `{ createdAt, id }` of the last item on the previous page.
         * Returns { items, nextCursor } where nextCursor is null when
         * the end is reached.
         */
        list(opts) {
            const limit = Math.min(opts.limit, 100);
            const conditions = [];
            if (opts.communityId) {
                conditions.push(eq(posts.communityId, opts.communityId));
            }
            if (opts.cursor) {
                try {
                    const decoded = JSON.parse(Buffer.from(opts.cursor, "base64").toString("utf-8"));
                    conditions.push(lt(posts.createdAt, decoded.createdAt));
                }
                catch {
                    // Invalid cursor — treat as no cursor (start of list)
                }
            }
            const orderClause = opts.sort === "top" ? desc(sql `${posts.upvotes} - ${posts.downvotes}`) :
                opts.sort === "hot" ? desc(sql `${posts.upvotes} - ${posts.downvotes}`) :
                    desc(posts.createdAt);
            const query = conditions.length > 0
                ? db.select().from(posts).where(and(...conditions)).orderBy(orderClause).limit(limit + 1)
                : db.select().from(posts).orderBy(orderClause).limit(limit + 1);
            const rows = query.all();
            const hasMore = rows.length > limit;
            const items = hasMore ? rows.slice(0, limit) : rows;
            const nextCursor = hasMore
                ? Buffer.from(JSON.stringify({
                    createdAt: items[items.length - 1].createdAt,
                    id: items[items.length - 1].id,
                }), "utf-8").toString("base64")
                : null;
            return {
                items: items.map(toPostRow),
                nextCursor,
            };
        },
        incrementCommentCount(postId, delta) {
            db.update(posts)
                .set({ commentCount: sql `${posts.commentCount} + ${delta}` })
                .where(eq(posts.id, postId))
                .run();
        },
        /** Atomic upvote/downvote increment (concurrent-safe via SQL atomic UPDATE). */
        incrementVoteCounters(postId, deltaUp, deltaDown) {
            db.update(posts)
                .set({
                upvotes: sql `${posts.upvotes} + ${deltaUp}`,
                downvotes: sql `${posts.downvotes} + ${deltaDown}`,
            })
                .where(eq(posts.id, postId))
                .run();
        },
        /**
         * Partial update — only the provided fields are written. Returns the
         * updated row, or undefined if the post doesn't exist.
         */
        update(id, patch) {
            const setValues = {};
            if (patch.title !== undefined)
                setValues.title = patch.title;
            if (patch.body !== undefined)
                setValues.body = patch.body;
            if (patch.linkUrl !== undefined)
                setValues.linkUrl = patch.linkUrl;
            if (patch.linkDomain !== undefined)
                setValues.linkDomain = patch.linkDomain;
            if (patch.imageCategory !== undefined)
                setValues.imageCategory = patch.imageCategory;
            if (patch.flair !== undefined)
                setValues.flair = patch.flair;
            if (Object.keys(setValues).length === 0) {
                // Nothing to update — return the current row unchanged.
                return this.findById(id);
            }
            db.update(posts).set(setValues).where(eq(posts.id, id)).run();
            const row = db.select().from(posts).where(eq(posts.id, id)).get();
            return row ? toPostRow(row) : undefined;
        },
        /**
         * Delete a post. Returns true if a row was deleted, false if the post
         * didn't exist. The FTS5 `posts_ad` trigger fires automatically and
         * removes the corresponding row from `posts_fts`.
         */
        delete(id) {
            const result = db.delete(posts).where(eq(posts.id, id)).run();
            return result.changes > 0;
        },
    };
}
export function createCommunityRepository(db) {
    return {
        list(limit = 50) {
            return db.select().from(communities).limit(limit).all();
        },
        findBySlug(slug) {
            return db.select().from(communities).where(eq(communities.slug, slug)).get();
        },
        findById(id) {
            return db.select().from(communities).where(eq(communities.id, id)).get();
        },
    };
}
export function createCommentRepository(db) {
    return {
        create(input) {
            db.insert(comments)
                .values({
                id: input.id,
                postId: input.postId,
                authorId: input.authorId,
                parentId: input.parentId,
                body: input.body,
                depth: input.depth,
            })
                .run();
            const row = db.select().from(comments).where(eq(comments.id, input.id)).get();
            if (!row)
                throw new Error("comment insert did not return row");
            return row;
        },
        listForPost(postId) {
            return db.select().from(comments).where(eq(comments.postId, postId)).all();
        },
        findById(id) {
            return db.select().from(comments).where(eq(comments.id, id)).get();
        },
        incrementVoteCounters(commentId, deltaUp, deltaDown) {
            db.update(comments)
                .set({
                upvotes: sql `${comments.upvotes} + ${deltaUp}`,
                downvotes: sql `${comments.downvotes} + ${deltaDown}`,
            })
                .where(eq(comments.id, commentId))
                .run();
        },
    };
}
