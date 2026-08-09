import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { createCommentInputSchema } from "@embers/shared";
import type { CommentRepository, PostRepository } from "../repositories/postRepository";
import { buildCommentTree } from "../services/commentTreeService";
import type { NotificationRepository } from "../repositories/notificationRepository";

export interface CommentRouteDeps {
  commentRepo: CommentRepository;
  postRepo: PostRepository;
  notificationRepo: NotificationRepository;
}

export function buildCommentRoutes(deps: CommentRouteDeps) {
  return async function commentRoutes(app: FastifyInstance): Promise<void> {
    /**
     * GET /api/posts/:id/comments — return the comment tree for a post.
     * Returns a flat-list-shaped tree (each node has `children: []`).
     */
    app.get("/api/posts/:id/comments", async (req, reply) => {
      const { id: postId } = req.params as { id: string };
      const post = deps.postRepo.findById(postId);
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
      const flat = deps.commentRepo.listForPost(postId);
      const tree = buildCommentTree(flat);
      return reply.send({ data: tree, nextCursor: null });
    });

    /**
     * POST /api/posts/:id/comments — create a comment (auth required).
     * Body: { body, parentId? }
     * If parentId is set, looks up the parent's depth and uses depth+1
     * (capped at 4 — comments deeper than 4 are rejected with 422).
     * Emits a notification to the parent comment's author (or post author
     * for top-level comments — actually only for replies, to match the
     * apps/web "reply" notification type).
     */
    app.post("/api/posts/:id/comments", {
      preHandler: [app.authenticate],
    }, async (req, reply) => {
      const { id: postId } = req.params as { id: string };
      const parsed = createCommentInputSchema.safeParse(req.body);
      if (!parsed.success) {
        reply.code(422);
        throw parsed.error;
      }
      const user = req.user!;

      const post = deps.postRepo.findById(postId);
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

      let depth = 0;
      let parentAuthorId: string | null = null;
      if (parsed.data.parentId) {
        const parent = deps.commentRepo.findById(parsed.data.parentId);
        if (!parent) {
          reply.code(404);
          return reply.send({
            error: {
              code: "NOT_FOUND",
              message: "Parent comment not found",
              requestId: req.id,
            },
          });
        }
        if (parent.postId !== postId) {
          reply.code(422);
          return reply.send({
            error: {
              code: "VALIDATION_ERROR",
              message: "Parent comment does not belong to this post",
              requestId: req.id,
            },
          });
        }
        depth = parent.depth + 1;
        if (depth > 4) {
          reply.code(422);
          return reply.send({
            error: {
              code: "VALIDATION_ERROR",
              message: "Comment depth exceeds maximum (4)",
              requestId: req.id,
            },
          });
        }
        parentAuthorId = parent.authorId;
      }

      const comment = deps.commentRepo.create({
        id: `${postId}-c-${randomUUID()}`,
        postId,
        authorId: user.id,
        parentId: parsed.data.parentId ?? null,
        body: parsed.data.body,
        depth,
      });

      // Increment the post's comment count (atomic)
      deps.postRepo.incrementCommentCount(postId, 1);

      // Emit a "reply" notification to the parent comment's author
      // (don't notify self, and only for replies — top-level comments
      // don't trigger notifications per the apps/web behaviour).
      if (parentAuthorId && parentAuthorId !== user.id) {
        deps.notificationRepo.create({
          id: `n-${randomUUID()}`,
          userId: parentAuthorId,
          type: "reply",
          message: `u/${user.username} replied to your comment`,
          detail: `"${parsed.data.body.slice(0, 100)}${parsed.data.body.length > 100 ? "…" : ""}"`,
          postId,
          actorId: user.id,
        });
      }

      reply.code(201);
      return reply.send({
        id: comment.id,
        postId: comment.postId,
        authorId: comment.authorId,
        parentId: comment.parentId,
        body: comment.body,
        score: comment.upvotes - comment.downvotes,
        createdAt: comment.createdAt,
        depth: comment.depth,
        children: [],
      });
    });
  };
}
