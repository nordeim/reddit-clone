import type { FastifyInstance } from "fastify";
import { searchQuerySchema } from "@embers/shared";
import type { Database } from "@embers/db";
import { searchPosts, communities, users } from "@embers/db";
import type { CommunityRepository } from "../repositories/postRepository";
import { or, like } from "drizzle-orm";

type CommunitySelectRow = typeof communities.$inferSelect;
type UserSelectRow = typeof users.$inferSelect;
type SearchPostResult = { id: string; title: string; body: string | null; rank: number };

export interface SearchRouteDeps {
  rawDb: Database;
  communityRepo: CommunityRepository;
  db: import("@embers/db").DrizzleDB;
}

export function buildSearchRoutes(deps: SearchRouteDeps) {
  return async function searchRoutes(app: FastifyInstance): Promise<void> {
    /**
     * GET /api/search?q=&type=&limit=&cursor=
     * type: posts | communities | users
     */
    app.get("/api/search", async (req, reply) => {
      const parsed = searchQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        reply.code(422);
        throw parsed.error;
      }
      const { q, type, limit } = parsed.data;

      if (type === "posts") {
        const results = searchPosts(deps.rawDb, q, limit, 0);
        return reply.send({
          data: results.map((r: SearchPostResult) => ({
            id: r.id,
            title: r.title,
            body: r.body,
            rank: r.rank,
          })),
          nextCursor: null,
        });
      }

      if (type === "communities") {
        const pattern = `%${q}%`;
        const rows = deps.db
          .select()
          .from(communities)
          .where(or(
            like(communities.name, pattern),
            like(communities.title, pattern),
            like(communities.description, pattern),
          ))
          .limit(limit)
          .all();
        return reply.send({
          data: rows.map((c: CommunitySelectRow) => ({
            id: c.id,
            slug: c.slug,
            name: c.name,
            title: c.title,
            description: c.description,
            category: c.category,
            icon: c.icon,
          })),
          nextCursor: null,
        });
      }

      // type === "users"
      const pattern = `%${q}%`;
      const rows = deps.db
        .select()
        .from(users)
        .where(or(
          like(users.username, pattern),
          like(users.displayName, pattern),
        ))
        .limit(limit)
        .all();
      return reply.send({
        data: rows.map((u: UserSelectRow) => ({
          id: u.id,
          username: u.username,
          displayName: u.displayName,
          karma: u.karma,
          colorFrom: u.colorFrom,
          colorTo: u.colorTo,
        })),
        nextCursor: null,
      });
    });
  };
}
