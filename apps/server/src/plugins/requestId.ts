import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { randomUUID } from "node:crypto";

/**
 * requestId plugin — assigns `req.id` from the `x-request-id` header or
 * generates a fresh UUIDv4 if absent. The id is exposed on the response
 * as `x-request-id` so callers can correlate client-side logs with
 * server-side traces (ADR-110).
 *
 * This plugin does NOT replace Fastify's built-in `requestIdHeader` config
 * — it complements it by always emitting the header on the response and
 * by attaching it to error responses via the error handler.
 */
export interface RequestIdOptions {
  headerName?: string;
}

export default fp(async function requestId(app: FastifyInstance, opts: RequestIdOptions = {}) {
  const headerName = opts.headerName ?? "x-request-id";

  app.addHook("onRequest", async (req: FastifyRequest, reply: FastifyReply) => {
    const incoming = req.headers[headerName];
    if (typeof incoming === "string" && incoming.length > 0) {
      req.id = incoming;
    } else {
      // Fastify's default req.id is a numeric counter; replace with UUIDv4
      // for cross-instance correlation.
      req.id = randomUUID();
    }
    reply.header(headerName, req.id);
  });
}, { name: "requestId" });
