import type { FastifyInstance } from "fastify";
import { listNotificationsQuerySchema } from "@embers/shared";
import type { NotificationRepository } from "../repositories/notificationRepository.js";

export interface NotificationRouteDeps {
  notificationRepo: NotificationRepository;
}

export function buildNotificationRoutes(deps: NotificationRouteDeps) {
  return async function notificationRoutes(app: FastifyInstance): Promise<void> {
    /**
     * GET /api/notifications?filter=all|unread&limit=
     * Auth required — returns the caller's notifications only.
     */
    app.get("/api/notifications", {
      preHandler: [app.authenticate],
    }, async (req, reply) => {
      const parsed = listNotificationsQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        reply.code(422);
        throw parsed.error;
      }
      const user = req.user!;
      const items = deps.notificationRepo.listForUser(user.id, {
        filter: parsed.data.filter,
        limit: parsed.data.limit,
      });
      return reply.send({
        data: items,
        nextCursor: null,
      });
    });
  };
}
