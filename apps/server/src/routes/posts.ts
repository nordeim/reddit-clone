import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import {
  createPostInputSchema,
  updatePostInputSchema,
  listPostsQuerySchema,
  paginateOutputSchema,
  type Post,
} from "@embers/shared";
import type { PostRepository, CommunityRepository } from "../repositories/postRepository.js";

export interface PostRouteDeps {
  postRepo: PostRepository;
  communityRepo: CommunityRepository;
}

export function buildPostRoutes(deps: PostRouteDeps) {
  return async function postRoutes(app: FastifyInstance): Promise<void> {
    /**
     * GET /api/posts — cursor-paginated list.
     * Query: ?cursor=&limit=&communityId=&sort=
     */
    app.get("/api/posts", async (req, reply) => {
      const parsed = listPostsQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        reply.code(422);
        throw parsed.error;
      }
      const { limit, cursor, communityId, sort } = parsed.data;
      const result = deps.postRepo.list({
        limit,
        cursor,
        communityId,
        sort,
      });
      return reply.send({
        data: result.items.map(toPost),
        nextCursor: result.nextCursor,
      });
    });

    /**
     * GET /api/posts/:id — single post.
     */
    app.get("/api/posts/:id", async (req, reply) => {
      const { id } = req.params as { id: string };
      const post = deps.postRepo.findById(id);
      if (!post) {
        reply.code(404);
        return reply.send({
          error: {
            code: "NOT_FOUND",
            message: "Post not found",
            requestId: req.id,
          },
        });
      }
      return reply.send(toPost(post));
    });

    /**
     * POST /api/posts — create a post (auth required).
     * The preHandler decorator is added by the route registrar (see app.ts).
     */
    app.post("/api/posts", {
      preHandler: [app.authenticate],
    }, async (req, reply) => {
      const parsed = createPostInputSchema.safeParse(req.body);
      if (!parsed.success) {
        reply.code(422);
        throw parsed.error;
      }
      const input = parsed.data;

      // Verify the community exists
      const community = deps.communityRepo.findById(input.communityId);
      if (!community) {
        reply.code(404);
        return reply.send({
          error: {
            code: "NOT_FOUND",
            message: "Community not found",
            requestId: req.id,
          },
        });
      }

      const user = req.user!;
      const post = deps.postRepo.create({
        id: `p-${randomUUID()}`,
        communityId: input.communityId,
        authorId: user.id,
        title: input.title,
        type: input.type,
        body: input.body ?? null,
        linkUrl: input.linkUrl ?? null,
        linkDomain: input.linkUrl ? new URL(input.linkUrl).hostname : null,
        imageCategory: input.imageCategory ?? null,
        flair: input.flair ?? null,
      });
      reply.code(201);
      return reply.send(toPost(post));
    });

    /**
     * PATCH /api/posts/:id — partial update (auth required, author-only).
     * Body: any subset of { title, body, linkUrl, imageCategory, flair }.
     * 200 on success, 401 without auth, 403 if caller is not the author,
     * 404 if post doesn't exist, 422 on invalid input.
     */
    app.patch("/api/posts/:id", {
      preHandler: [app.authenticate],
    }, async (req, reply) => {
      const { id } = req.params as { id: string };
      const parsed = updatePostInputSchema.safeParse(req.body);
      if (!parsed.success) {
        reply.code(422);
        throw parsed.error;
      }

      const existing = deps.postRepo.findById(id);
      if (!existing) {
        reply.code(404);
        return reply.send({
          error: {
            code: "NOT_FOUND",
            message: "Post not found",
            requestId: req.id,
          },
        });
      }

      const user = req.user!;
      if (existing.authorId !== user.id) {
        reply.code(403);
        return reply.send({
          error: {
            code: "FORBIDDEN",
            message: "Only the author can edit this post",
            requestId: req.id,
          },
        });
      }

      const patch: {
        title?: string;
        body?: string | null;
        linkUrl?: string | null;
        linkDomain?: string | null;
        imageCategory?: string | null;
        flair?: string | null;
      } = {};
      if (parsed.data.title !== undefined) patch.title = parsed.data.title;
      if (parsed.data.body !== undefined) patch.body = parsed.data.body;
      if (parsed.data.linkUrl !== undefined) {
        patch.linkUrl = parsed.data.linkUrl;
        patch.linkDomain = parsed.data.linkUrl ? new URL(parsed.data.linkUrl).hostname : null;
      }
      if (parsed.data.imageCategory !== undefined) patch.imageCategory = parsed.data.imageCategory;
      if (parsed.data.flair !== undefined) patch.flair = parsed.data.flair;

      const updated = deps.postRepo.update(id, patch);
      if (!updated) {
        // Shouldn't happen — we already verified the post exists above.
        reply.code(404);
        return reply.send({
          error: {
            code: "NOT_FOUND",
            message: "Post not found",
            requestId: req.id,
          },
        });
      }
      return reply.send(toPost(updated));
    });

    /**
     * DELETE /api/posts/:id — delete a post (auth required, author-only).
     * 204 on success, 401 without auth, 403 if caller is not the author,
     * 404 if post doesn't exist. The FTS5 `posts_ad` trigger fires
     * automatically and removes the corresponding row from `posts_fts`.
     */
    app.delete("/api/posts/:id", {
      preHandler: [app.authenticate],
    }, async (req, reply) => {
      const { id } = req.params as { id: string };

      const existing = deps.postRepo.findById(id);
      if (!existing) {
        reply.code(404);
        return reply.send({
          error: {
            code: "NOT_FOUND",
            message: "Post not found",
            requestId: req.id,
          },
        });
      }

      const user = req.user!;
      if (existing.authorId !== user.id) {
        reply.code(403);
        return reply.send({
          error: {
            code: "FORBIDDEN",
            message: "Only the author can delete this post",
            requestId: req.id,
          },
        });
      }

      deps.postRepo.delete(id);
      reply.code(204);
      return reply.send();
    });
  };
}

function toPost(row: {
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
}): Post {
  return {
    id: row.id,
    communityId: row.communityId,
    authorId: row.authorId,
    title: row.title,
    type: row.type as Post["type"],
    body: row.body ?? undefined,
    linkUrl: row.linkUrl ?? undefined,
    linkDomain: row.linkDomain ?? undefined,
    imageCategory: (row.imageCategory ?? undefined) as Post["imageCategory"],
    flair: row.flair ?? undefined,
    score: row.upvotes - row.downvotes,
    commentCount: row.commentCount,
    createdAt: row.createdAt,
  };
}

// Suppress unused-import warning (paginateOutputSchema is exported for type-narrowing at call sites)
void paginateOutputSchema;
