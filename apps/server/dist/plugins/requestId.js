import fp from "fastify-plugin";
import { randomUUID } from "node:crypto";
export default fp(async function requestId(app, opts = {}) {
    const headerName = opts.headerName ?? "x-request-id";
    app.addHook("onRequest", async (req, reply) => {
        const incoming = req.headers[headerName];
        if (typeof incoming === "string" && incoming.length > 0) {
            req.id = incoming;
        }
        else {
            // Fastify's default req.id is a numeric counter; replace with UUIDv4
            // for cross-instance correlation.
            req.id = randomUUID();
        }
        reply.header(headerName, req.id);
    });
}, { name: "requestId" });
