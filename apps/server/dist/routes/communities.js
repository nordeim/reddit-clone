export function buildCommunityRoutes(deps) {
    return async function communityRoutes(app) {
        /**
         * GET /api/communities — list all communities.
         */
        app.get("/api/communities", async (_req, reply) => {
            const rows = deps.communityRepo.list(100);
            return reply.send({
                data: rows.map((c) => ({
                    id: c.id,
                    slug: c.slug,
                    name: c.name,
                    title: c.title,
                    description: c.description,
                    memberCount: c.memberCount,
                    onlineCount: c.onlineCount,
                    createdAt: c.createdAt,
                    category: c.category,
                    colorFrom: c.colorFrom,
                    colorTo: c.colorTo,
                    icon: c.icon,
                    rules: JSON.parse(c.rules),
                })),
                nextCursor: null,
            });
        });
        /**
         * GET /api/communities/:slug — single community by slug.
         */
        app.get("/api/communities/:slug", async (req, reply) => {
            const { slug } = req.params;
            const community = deps.communityRepo.findBySlug(slug);
            if (!community) {
                reply.code(404);
                return reply.send({
                    error: {
                        code: "NOT_FOUND",
                        message: "Community not found",
                        requestId: req.id,
                    },
                });
            }
            return reply.send({
                id: community.id,
                slug: community.slug,
                name: community.name,
                title: community.title,
                description: community.description,
                memberCount: community.memberCount,
                onlineCount: community.onlineCount,
                createdAt: community.createdAt,
                category: community.category,
                colorFrom: community.colorFrom,
                colorTo: community.colorTo,
                icon: community.icon,
                rules: JSON.parse(community.rules),
            });
        });
    };
}
