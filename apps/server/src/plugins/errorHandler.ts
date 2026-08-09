import type { FastifyInstance, FastifyError, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { ZodError } from "zod";

/**
 * errorHandler plugin — global error handler that:
 *   - Logs the error (with stack) at error level, tagged with requestId.
 *   - Returns a structured {@link ErrorResponse} body consistent with
 *     `errorResponseSchema` from @embers/shared.
 *   - Never leaks stack traces or internal details to the client.
 *
 * Status code mapping:
 *   - ZodError        → 422 (validation error, includes field details)
 *   - HttpError       → its own .statusCode (set by route via app.httpErrors)
 *   - Everything else → 500 (internal error)
 */
export default fp(async function errorHandler(app: FastifyInstance) {
  app.setErrorHandler(function (
    err: FastifyError,
    req: FastifyRequest,
    reply: FastifyReply,
  ) {
    const requestId = req.id;

    if (err instanceof ZodError) {
      req.log.warn({ err: err.flatten(), requestId }, "validation error");
      reply.status(422);
      return reply.send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: err.flatten(),
          requestId,
        },
      });
    }

    const statusCode = err.statusCode ?? 500;
    if (statusCode >= 500) {
      req.log.error({ err, requestId }, "unhandled server error");
    } else {
      req.log.warn({ err, requestId }, "client error");
    }

    const code =
      statusCode === 404 ? "NOT_FOUND" :
      statusCode === 401 ? "UNAUTHORIZED" :
      statusCode === 403 ? "FORBIDDEN" :
      statusCode === 409 ? "CONFLICT" :
      statusCode === 429 ? "RATE_LIMITED" :
      statusCode >= 500 ? "INTERNAL_ERROR" : "ERROR";

    const message =
      statusCode === 404 ? "Route not found" :
      statusCode === 500 ? "Internal server error" :
      err.message;

    reply.status(statusCode);
    return reply.send({
      error: {
        code,
        message,
        requestId,
      },
    });
  });

  app.setNotFoundHandler(function (req: FastifyRequest, reply: FastifyReply) {
    reply.status(404);
    return reply.send({
      error: {
        code: "NOT_FOUND",
        message: "Route not found",
        requestId: req.id,
      },
    });
  });
}, { name: "errorHandler" });
