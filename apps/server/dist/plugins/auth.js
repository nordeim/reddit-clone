import fp from "fastify-plugin";
import { verifyAccessToken } from "../auth/jwt.js";
/**
 * Auth plugin — registers the `authenticate` decorator used by protected
 * routes via `app.addHook("preHandler", app.authenticate)`.
 *
 * Reads the access token from the `Authorization: Bearer <token>` header.
 * On success, sets `req.user = { id, username }`. On failure, returns 401
 * with the standard error envelope (handled by errorHandler plugin).
 *
 * Routes opt in by adding `preHandler: [app.authenticate]` — this plugin
 * does NOT enforce auth globally.
 */
export default fp(async function auth(app) {
    app.decorate("authenticate", async function authenticate(req, reply) {
        const header = req.headers.authorization;
        if (!header || !header.startsWith("Bearer ")) {
            reply.code(401);
            throw new Error("Missing or malformed Authorization header");
        }
        const token = header.slice("Bearer ".length).trim();
        const env = app.env;
        if (!env?.JWT_ACCESS_SECRET) {
            reply.code(500);
            throw new Error("JWT_ACCESS_SECRET not configured");
        }
        try {
            const payload = await verifyAccessToken(token, env.JWT_ACCESS_SECRET);
            req.user = { id: payload.id, username: payload.username };
        }
        catch {
            reply.code(401);
            throw new Error("Invalid or expired access token");
        }
    });
}, { name: "auth" });
