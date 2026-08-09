import { eq, desc, and } from "drizzle-orm";
import { notifications } from "@embers/db";
export function createNotificationRepository(db) {
    return {
        create(input) {
            db.insert(notifications).values({
                id: input.id,
                userId: input.userId,
                type: input.type,
                message: input.message,
                detail: input.detail,
                postId: input.postId ?? null,
                actorId: input.actorId ?? null,
                read: false,
            }).run();
            const row = db.select().from(notifications).where(eq(notifications.id, input.id)).get();
            if (!row)
                throw new Error("notification insert did not return row");
            return {
                id: row.id,
                userId: row.userId,
                type: row.type,
                message: row.message,
                detail: row.detail,
                postId: row.postId,
                actorId: row.actorId,
                read: row.read,
                createdAt: row.createdAt,
            };
        },
        listForUser(userId, opts = {}) {
            const limit = Math.min(opts.limit ?? 20, 50);
            const query = opts.filter === "unread"
                ? db.select().from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.read, false))).orderBy(desc(notifications.createdAt)).limit(limit)
                : db.select().from(notifications).where(eq(notifications.userId, userId))
                    .orderBy(desc(notifications.createdAt)).limit(limit);
            return query.all().map((r) => ({
                id: r.id,
                userId: r.userId,
                type: r.type,
                message: r.message,
                detail: r.detail,
                postId: r.postId,
                actorId: r.actorId,
                read: r.read,
                createdAt: r.createdAt,
            }));
        },
    };
}
