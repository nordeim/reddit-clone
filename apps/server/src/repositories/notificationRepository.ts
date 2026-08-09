import { eq, desc } from "drizzle-orm";
import type { DrizzleDB } from "@embers/db";
import { notifications } from "@embers/db";

export interface NotificationRow {
  id: string;
  userId: string;
  type: "upvote" | "reply" | "mention" | "community";
  message: string;
  detail: string;
  postId: string | null;
  actorId: string | null;
  read: boolean;
  createdAt: string;
}

export function createNotificationRepository(db: DrizzleDB) {
  return {
    create(input: {
      id: string;
      userId: string;
      type: "upvote" | "reply" | "mention" | "community";
      message: string;
      detail: string;
      postId?: string | null;
      actorId?: string | null;
    }): NotificationRow {
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
      if (!row) throw new Error("notification insert did not return row");
      return {
        id: row.id,
        userId: row.userId,
        type: row.type as NotificationRow["type"],
        message: row.message,
        detail: row.detail,
        postId: row.postId,
        actorId: row.actorId,
        read: row.read,
        createdAt: row.createdAt,
      };
    },

    listForUser(
      userId: string,
      opts: { filter?: "all" | "unread"; limit?: number } = {},
    ): NotificationRow[] {
      const limit = Math.min(opts.limit ?? 20, 50);
      const query = opts.filter === "unread"
        ? db.select().from(notifications).where(
            and(eq(notifications.userId, userId), eq(notifications.read, false)),
          ).orderBy(desc(notifications.createdAt)).limit(limit)
        : db.select().from(notifications).where(eq(notifications.userId, userId))
            .orderBy(desc(notifications.createdAt)).limit(limit);
      return query.all().map((r) => ({
        id: r.id,
        userId: r.userId,
        type: r.type as NotificationRow["type"],
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

// Local import for the chained `and()` filter
import { and } from "drizzle-orm";

export type NotificationRepository = ReturnType<typeof createNotificationRepository>;
