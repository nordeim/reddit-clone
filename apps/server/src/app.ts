import { strict as assert } from "node:assert";
import Fastify, { type FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";

import { loadEnv, type Env } from "./config";
import requestIdPlugin from "./plugins/requestId";
import errorHandlerPlugin from "./plugins/errorHandler";
import { healthRoutes } from "./routes/health";

export interface BuildAppOptions {
  /** Partial env overrides (primarily for tests). */
  env?: Partial<Record<string, string | undefined>>;
  /** Skip helmet in tests (default: false). */
  skipHelmet?: boolean;
  /** Skip rate limit in tests (default: false in NODE_ENV=test). */
  skipRateLimit?: boolean;
}

/**
 * Build the Fastify application instance — the composition root for all
 * plugins and routes. Pure function: returns an unstarted instance so
 * tests can `inject` without binding a port.
 *
 * Plugin order matters:
 *   1. helmet   — outermost, hardens all responses
 *   2. cors     — must precede routes so preflight works
 *   3. cookie   — auth refresh cookie parsing
 *   4. rateLimit — guards all routes (with route-level overrides later)
 *   5. requestId — assigns req.id before error handler uses it
 *   6. errorHandler — last, so it can wrap everything
 */
export async function buildApp(opts: BuildAppOptions = {}): Promise<FastifyInstance> {
  const env: Env = loadEnv(opts.env);

  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      redact: {
        paths: [
          "req.headers.authorization",
          "req.headers.cookie",
          "req.body.password",
          "res.body.accessToken",
          "res.body.refreshToken",
        ],
        censor: "[REDACTED]",
      },
    },
  });

  // 1. Helmet — disable in tests to keep header assertions simple.
  if (!opts.skipHelmet) {
    await app.register(helmet, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:"],
          scriptSrc: ["'self'"],
        },
      },
      hsts: env.NODE_ENV === "production",
    });
  }

  // 2. CORS — strict origin list in production; permissive in dev/test.
  const corsOrigins = env.CORS_ORIGIN === "*"
    ? true
    : env.CORS_ORIGIN.split(",").map((s) => s.trim());
  await app.register(cors, {
    origin: corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  // 3. Cookie parsing (HttpOnly refresh cookies).
  await app.register(cookie, {
    secret: env.JWT_REFRESH_SECRET ?? "dev-cookie-secret-not-for-prod-use-32+chars",
  });

  // 4. Rate limiting — disabled in test env by default.
  if (!opts.skipRateLimit && env.NODE_ENV !== "test") {
    await app.register(rateLimit, {
      max: env.RATE_LIMIT_MAX,
      timeWindow: env.RATE_LIMIT_WINDOW,
      allowList: ["127.0.0.1"],
    });
  }

  // 5. Request ID — must precede error handler so the id is available
  //    in error responses.
  await app.register(requestIdPlugin);

  // 6. Routes
  await app.register(healthRoutes);

  // 7. Error handler — last so it wraps everything.
  await app.register(errorHandlerPlugin);

  // Decorate app with env for downstream plugins/routes
  app.decorate("env", env);
  void assert; // reserved for future invariants

  return app;
}
