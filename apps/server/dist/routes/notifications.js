import { listNotificationsQuerySchema } from "@embers/shared";
export function buildNotificationRoutes(deps) {
    return async function notificationRoutes(app) {
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
            const user = req.user;
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
