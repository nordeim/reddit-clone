import { eq, and } from "drizzle-orm";
import type { DrizzleDB } from "@embers/db";
import { votes } from "@embers/db";

export interface VoteRow {
  userId: string;
  targetId: string;
  targetType: "post" | "comment";
  value: -1 | 1;
  createdAt: string;
}

export type TargetType = "post" | "comment";

export function createVoteRepository(db: DrizzleDB) {
  return {
    /**
     * Find an existing vote by (userId, targetId, targetType).
     * Returns undefined if no vote exists.
     */
    find(
      userId: string,
      targetId: string,
      targetType: TargetType,
    ): VoteRow | undefined {
      const row = db.select().from(votes).where(
        and(
          eq(votes.userId, userId),
          eq(votes.targetId, targetId),
          eq(votes.targetType, targetType),
        ),
      ).get();
      return row
        ? {
            userId: row.userId,
            targetId: row.targetId,
            targetType: row.targetType as TargetType,
            value: row.value as -1 | 1,
            createdAt: row.createdAt,
          }
        : undefined;
    },

    /**
     * Insert a new vote. Returns the inserted row. Throws on composite-PK
     * conflict (caller should check `find()` first).
     */
    insert(input: {
      userId: string;
      targetId: string;
      targetType: TargetType;
      value: -1 | 1;
    }): void {
      db.insert(votes).values({
        userId: input.userId,
        targetId: input.targetId,
        targetType: input.targetType,
        value: input.value,
      }).run();
    },

    /** Update the value of an existing vote. */
    update(
      userId: string,
      targetId: string,
      targetType: TargetType,
      value: -1 | 1,
    ): void {
      db.update(votes)
        .set({ value })
        .where(
          and(
            eq(votes.userId, userId),
            eq(votes.targetId, targetId),
            eq(votes.targetType, targetType),
          ),
        )
        .run();
    },

    /** Delete an existing vote (toggle-off). */
    delete(
      userId: string,
      targetId: string,
      targetType: TargetType,
    ): void {
      db.delete(votes).where(
        and(
          eq(votes.userId, userId),
          eq(votes.targetId, targetId),
          eq(votes.targetType, targetType),
        ),
      ).run();
    },
  };
}
export type VoteRepository = ReturnType<typeof createVoteRepository>;
