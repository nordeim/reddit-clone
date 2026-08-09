import { eq } from "drizzle-orm";
import type { DrizzleDB } from "@embers/db";
import { users } from "@embers/db";

export interface UserRow {
  id: string;
  username: string;
  passwordHash: string;
  displayName: string;
  bio: string;
  karma: number;
  createdAt: string;
  colorFrom: string;
  colorTo: string;
}

export function createUserRepository(db: DrizzleDB) {
  return {
    async create(input: {
      id: string;
      username: string;
      passwordHash: string;
      displayName: string;
      colorFrom: string;
      colorTo: string;
      bio?: string;
    }): Promise<UserRow> {
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
      if (!row) throw new Error("user insert did not return row");
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

    findByUsername(username: string): UserRow | undefined {
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

    findById(id: string): UserRow | undefined {
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

export type UserRepository = ReturnType<typeof createUserRepository>;
