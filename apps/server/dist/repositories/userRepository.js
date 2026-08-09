import { eq } from "drizzle-orm";
import { users } from "@embers/db";
export function createUserRepository(db) {
    return {
        async create(input) {
            db.insert(users)
                .values({
                id: input.id,
                username: input.username,
                passwordHash: input.passwordHash,
                displayName: input.displayName,
                bio: input.bio ?? "",
                karma: 0,
                colorFrom: input.colorFrom,
                colorTo: input.colorTo,
            })
                .run();
            const row = db.select().from(users).where(eq(users.id, input.id)).get();
            if (!row)
                throw new Error("user insert did not return row");
            return {
                id: row.id,
                username: row.username,
                passwordHash: row.passwordHash,
                displayName: row.displayName,
                bio: row.bio,
                karma: row.karma,
                createdAt: row.createdAt,
                colorFrom: row.colorFrom,
                colorTo: row.colorTo,
            };
        },
        findByUsername(username) {
            const row = db.select().from(users).where(eq(users.username, username)).get();
            return row
                ? {
                    id: row.id,
                    username: row.username,
                    passwordHash: row.passwordHash,
                    displayName: row.displayName,
                    bio: row.bio,
                    karma: row.karma,
                    createdAt: row.createdAt,
                    colorFrom: row.colorFrom,
                    colorTo: row.colorTo,
                }
                : undefined;
        },
        findById(id) {
            const row = db.select().from(users).where(eq(users.id, id)).get();
            return row
                ? {
                    id: row.id,
                    username: row.username,
                    passwordHash: row.passwordHash,
                    displayName: row.displayName,
                    bio: row.bio,
                    karma: row.karma,
                    createdAt: row.createdAt,
                    colorFrom: row.colorFrom,
                    colorTo: row.colorTo,
                }
                : undefined;
        },
    };
}
