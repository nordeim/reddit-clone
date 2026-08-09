import type { DrizzleDB } from "../client.js";
import { comments as commentsTable } from "../schema/index.js";
import { createRng } from "./random.js";
import { OPENERS, REPLIES } from "./data.js";
import type { GeneratedPost } from "./posts.js";
import type { GeneratedUser } from "./users.js";

export interface GeneratedComment {
  id: string;
  postId: string;
  authorId: string;
  parentId: string | null;
  body: string;
  upvotes: number;
  downvotes: number;
  createdAt: string;
  depth: number;
}

interface BuildContext {
  rng: ReturnType<typeof createRng>;
  postId: string;
  parentId: string | null;
  depth: number;
  createdBase: number;
  idCounter: { n: number };
  generatedUsers: GeneratedUser[];
  out: GeneratedComment[];
}

function buildCommentTree(ctx: BuildContext): void {
  if (ctx.depth > 4) return;
  const count =
    ctx.depth === 0 ? ctx.rng.int(3, 7) : ctx.rng.bool(0.45) ? ctx.rng.int(1, 3) : 0;

  for (let i = 0; i < count; i++) {
    ctx.idCounter.n += 1;
    const author = ctx.rng.pick(ctx.generatedUsers);
    const minutesAgo = ctx.rng.int(5, 60 * 24 * 10) + ctx.depth * 15;
    const createdAt = new Date(ctx.createdBase - minutesAgo * 60_000).toISOString();
    const body = ctx.rng.pick(ctx.depth === 0 ? OPENERS : REPLIES);
    const id = `${ctx.postId}-c${ctx.idCounter.n}`;
    const score = ctx.rng.int(-4, 320);
    const upvotes = Math.max(0, score);
    const downvotes = Math.max(0, -score);

    ctx.out.push({
      id,
      postId: ctx.postId,
      authorId: author.id,
      parentId: ctx.parentId,
      body,
      upvotes,
      downvotes,
      createdAt,
      depth: ctx.depth,
    });

    if (ctx.rng.bool(ctx.depth < 3 ? 0.55 : 0.2)) {
      buildCommentTree({
        ...ctx,
        parentId: id,
        depth: ctx.depth + 1,
      });
    }
  }
}

/**
 * Generate deterministic comment trees for ALL posts eagerly
 * (the apps/web version lazily generates per-post). This is the
 * backend equivalent of memoising the entire comment graph at
 * seed time.
 *
 * Inserts all rows into the `comments` table. Returns the flat list
 * (parent-child relationships preserved via the parentId column).
 */
export function seedComments(
  db: DrizzleDB,
  generatedPosts: GeneratedPost[],
  generatedUsers: GeneratedUser[],
): GeneratedComment[] {
  const allComments: GeneratedComment[] = [];

  for (const post of generatedPosts) {
    const rng = createRng(`comments-${post.id}`);
    const ctx: BuildContext = {
      rng,
      postId: post.id,
      parentId: null,
      depth: 0,
      createdBase: Date.now(),
      idCounter: { n: 0 },
      generatedUsers,
      out: [],
    };
    buildCommentTree(ctx);
    allComments.push(...ctx.out);
  }

  if (allComments.length > 0) {
    // Batch insert (1000 at a time to avoid SQLite param limits)
    const BATCH_SIZE = 1000;
    for (let i = 0; i < allComments.length; i += BATCH_SIZE) {
      const batch = allComments.slice(i, i + BATCH_SIZE);
      db.insert(commentsTable)
        .values(
          batch.map((c) => ({
            id: c.id,
            postId: c.postId,
            authorId: c.authorId,
            parentId: c.parentId,
            body: c.body,
            upvotes: c.upvotes,
            downvotes: c.downvotes,
            createdAt: c.createdAt,
            depth: c.depth,
          })),
        )
        .run();
    }
  }

  return allComments;
}
