import { eq, desc, and, lt, sql } from "drizzle-orm";
import type { DrizzleDB } from "@embers/db";
import { posts, communities, comments } from "@embers/db";

export interface PostRow {
  id: string;
  communityId: string;
  authorId: string;
  title: string;
  type: string;
  body: string | null;
  linkUrl: string | null;
  linkDomain: string | null;
  imageCategory: string | null;
  flair: string | null;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  createdAt: string;
}

function toPostRow(row: typeof posts.$inferSelect): PostRow {
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

export function createPostRepository(db: DrizzleDB) {
  return {
    create(input: {
      id: string;
      communityId: string;
      authorId: string;
      title: string;
      type: string;
      body?: string | null;
      linkUrl?: string | null;
      linkDomain?: string | null;
      imageCategory?: string | null;
      flair?: string | null;
    }): PostRow {
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
      if (!row) throw new Error("post insert did not return row");
      return toPostRow(row);
    },

    findById(id: string): PostRow | undefined {
      const row = db.select().from(posts).where(eq(posts.id, id)).get();
      return row ? toPostRow(row) : undefined;
    },

    /**
     * Cursor-paginated list. Cursor is base64-encoded JSON
     * `{ createdAt, id }` of the last item on the previous page.
     * Returns { items, nextCursor } where nextCursor is null when
     * the end is reached.
     */
    list(opts: {
      limit: number;
      cursor?: string;
      communityId?: string;
      sort?: "best" | "hot" | "new" | "top" | "rising";
    }): { items: PostRow[]; nextCursor: string | null } {
      const limit = Math.min(opts.limit, 100);
      const conditions = [];

      if (opts.communityId) {
        conditions.push(eq(posts.communityId, opts.communityId));
      }

      if (opts.cursor) {
        try {
          const decoded = JSON.parse(
            Buffer.from(opts.cursor, "base64").toString("utf-8"),
          ) as { createdAt: string; id: string };
          conditions.push(
            lt(posts.createdAt, decoded.createdAt),
          );
        } catch {
          // Invalid cursor — treat as no cursor (start of list)
        }
      }

      const orderClause =
        opts.sort === "top" ? desc(sql`${posts.upvotes} - ${posts.downvotes}`) :
        opts.sort === "hot" ? desc(sql`${posts.upvotes} - ${posts.downvotes}`) :
        desc(posts.createdAt);

      const query = conditions.length > 0
        ? db.select().from(posts).where(and(...conditions)).orderBy(orderClause).limit(limit + 1)
        : db.select().from(posts).orderBy(orderClause).limit(limit + 1);

      const rows = query.all();
      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;
      const nextCursor = hasMore
        ? Buffer.from(
            JSON.stringify({
              createdAt: items[items.length - 1].createdAt,
              id: items[items.length - 1].id,
            }),
            "utf-8",
          ).toString("base64")
        : null;

      return {
        items: items.map(toPostRow),
        nextCursor,
      };
    },

    incrementCommentCount(postId: string, delta: number): void {
      db.update(posts)
        .set({ commentCount: sql`${posts.commentCount} + ${delta}` })
        .where(eq(posts.id, postId))
        .run();
    },

    /** Atomic upvote/downvote increment (concurrent-safe via SQL atomic UPDATE). */
    incrementVoteCounters(
      postId: string,
      deltaUp: number,
      deltaDown: number,
    ): void {
      db.update(posts)
        .set({
          upvotes: sql`${posts.upvotes} + ${deltaUp}`,
          downvotes: sql`${posts.downvotes} + ${deltaDown}`,
        })
        .where(eq(posts.id, postId))
        .run();
    },
  };
}

export type PostRepository = ReturnType<typeof createPostRepository>;

export function createCommunityRepository(db: DrizzleDB) {
  return {
    list(limit: number = 50): Array<typeof communities.$inferSelect> {
      return db.select().from(communities).limit(limit).all();
    },
    findBySlug(slug: string): typeof communities.$inferSelect | undefined {
      return db.select().from(communities).where(eq(communities.slug, slug)).get();
    },
    findById(id: string): typeof communities.$inferSelect | undefined {
      return db.select().from(communities).where(eq(communities.id, id)).get();
    },
  };
}
export type CommunityRepository = ReturnType<typeof createCommunityRepository>;

export function createCommentRepository(db: DrizzleDB) {
  return {
    create(input: {
      id: string;
      postId: string;
      authorId: string;
      parentId: string | null;
      body: string;
      depth: number;
    }): typeof comments.$inferSelect {
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
      if (!row) throw new Error("comment insert did not return row");
      return row;
    },

    listForPost(postId: string): Array<typeof comments.$inferSelect> {
      return db.select().from(comments).where(eq(comments.postId, postId)).all();
    },

    findById(id: string): typeof comments.$inferSelect | undefined {
      return db.select().from(comments).where(eq(comments.id, id)).get();
    },

    incrementVoteCounters(
      commentId: string,
      deltaUp: number,
      deltaDown: number,
    ): void {
      db.update(comments)
        .set({
          upvotes: sql`${comments.upvotes} + ${deltaUp}`,
          downvotes: sql`${comments.downvotes} + ${deltaDown}`,
        })
        .where(eq(comments.id, commentId))
        .run();
    },
  };
}
export type CommentRepository = ReturnType<typeof createCommentRepository>;
