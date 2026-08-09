import { eq } from "drizzle-orm";
import { sessions } from "@embers/db";
/**
 * Session repository — manages refresh-token JTIs.
 *
 * Each issued refresh token's jti is stored here. Rotation = delete old +
 * insert new (atomic via the routes layer's transaction). Revocation =
 * set revokedAt. Verification = row exists AND revokedAt is null AND
 * expiresAt > now.
 */
export function createSessionRepository(db) {
    return {
        create(input) {
            db.insert(sessions)
                .values({
                jti: input.jti,
                userId: input.userId,
                expiresAt: input.expiresAt,
            })
                .run();
        },
        findActive(jti) {
            const row = db.select().from(sessions).where(eq(sessions.jti, jti)).get();
            if (!row)
                return undefined;
            if (row.revokedAt !== null)
                return undefined;
            // expiresAt is ISO 8601 string; compare via Date
            if (new Date(row.expiresAt).getTime() <= Date.now())
                return undefined;
            return {
                jti: row.jti,
                userId: row.userId,
                expiresAt: row.expiresAt,
                createdAt: row.createdAt,
                revokedAt: row.revokedAt,
            };
        },
        /**
         * Atomic rotation: delete the old jti, insert the new one. Returns
         * true if the rotation succeeded (old existed and was active),
         * false otherwise. Must be called within a transaction by the
         * caller (the auth route does this).
         */
        rotate(oldJti, newJti, userId, newExpiresAt) {
            const existing = db.select().from(sessions).where(eq(sessions.jti, oldJti)).get();
            if (!existing || existing.revokedAt !== null)
                return false;
            // Delete old + insert new, atomically
            db.delete(sessions).where(eq(sessions.jti, oldJti)).run();
            db.insert(sessions)
                .values({ jti: newJti, userId, expiresAt: newExpiresAt })
                .run();
            return true;
        },
        revoke(jti) {
            const existing = db.select().from(sessions).where(eq(sessions.jti, jti)).get();
            if (!existing)
                return false;
            db.update(sessions)
                .set({ revokedAt: new Date().toISOString() })
                .where(eq(sessions.jti, jti))
                .run();
            return true;
        },
        revokeAllForUser(userId) {
            const result = db.update(sessions)
                .set({ revokedAt: new Date().toISOString() })
                .where(eq(sessions.userId, userId))
                .run();
            return result.changes;
        },
    };
}
