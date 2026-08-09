import { eq, and } from "drizzle-orm";
import { votes } from "@embers/db";
export function createVoteRepository(db) {
    return {
        /**
         * Find an existing vote by (userId, targetId, targetType).
         * Returns undefined if no vote exists.
         */
        find(userId, targetId, targetType) {
            const row = db.select().from(votes).where(and(eq(votes.userId, userId), eq(votes.targetId, targetId), eq(votes.targetType, targetType))).get();
            return row
                ? {
                    userId: row.userId,
                    targetId: row.targetId,
                    targetType: row.targetType,
                    value: row.value,
                    createdAt: row.createdAt,
                }
                : undefined;
        },
        /**
         * Insert a new vote. Returns the inserted row. Throws on composite-PK
         * conflict (caller should check `find()` first).
         */
        insert(input) {
            db.insert(votes).values({
                userId: input.userId,
                targetId: input.targetId,
                targetType: input.targetType,
                value: input.value,
            }).run();
        },
        /** Update the value of an existing vote. */
        update(userId, targetId, targetType, value) {
            db.update(votes)
                .set({ value })
                .where(and(eq(votes.userId, userId), eq(votes.targetId, targetId), eq(votes.targetType, targetType)))
                .run();
        },
        /** Delete an existing vote (toggle-off). */
        delete(userId, targetId, targetType) {
            db.delete(votes).where(and(eq(votes.userId, userId), eq(votes.targetId, targetId), eq(votes.targetType, targetType))).run();
        },
    };
}
