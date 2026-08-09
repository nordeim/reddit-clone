import type { FastifyInstance } from "fastify";

/**
 * GET /health — liveness/readiness probe for container orchestrators
 * (Kubernetes/ECS) and load-balancer health checks.
 *
 * Returns 200 with:
 *   {
 *     "status": "ok",
 *     "timestamp": "<ISO 8601>",
 *     "uptime": <seconds since process start>
 *   }
 */
export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async () => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });
}
