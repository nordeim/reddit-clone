import Fastify, { type FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";

import { loadEnv, type Env } from "./config.js";
import requestIdPlugin from "./plugins/requestId.js";
import errorHandlerPlugin from "./plugins/errorHandler.js";
import authPlugin from "./plugins/auth.js";
import { healthRoutes } from "./routes/health.js";
import type { DrizzleDB, Database } from "@embers/db";

export interface BuildAppOptions {
  /** Partial env overrides (primarily for tests). */
  env?: Partial<Record<string, string | undefined>>;
  /** Skip helmet in tests (default: false). */
  skipHelmet?: boolean;
  /** Skip rate limit in tests (default: false in NODE_ENV=test). */
  skipRateLimit?: boolean;
  /**
   * Open database connection to use for repositories. If omitted, the app
   * registers only health + error handler (used by health tests). When
   * provided, all API routes (auth, posts, communities, votes, comments,
   * search, notifications) are wired up.
   */
  db?: DrizzleDB;
  rawDb?: Database;
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
 *   6. auth (decorator) — registers `app.authenticate`
 *   7. routes — health + (when db provided) all API routes
 *   8. errorHandler — last, so it can wrap everything
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
  //    Allowlist is intentionally empty: localhost gets rate-limited
  //    like any other client (the secure default — overrides happen at
  //    the route level for auth endpoints).
  //    Custom errorResponseBuilder ensures the 429 body matches the
  //    standard { error: { code, message, requestId } } envelope.
  if (!opts.skipRateLimit && env.NODE_ENV !== "test") {
    await app.register(rateLimit, {
      max: env.RATE_LIMIT_MAX,
      timeWindow: env.RATE_LIMIT_WINDOW,
      errorResponseBuilder: (_req: unknown, context: { after: string }) => ({
        statusCode: 429,
        error: {
          code: "RATE_LIMITED",
          message: `Rate limit exceeded. Retry after ${context.after}.`,
        },
      }),
    });
  }

  // 5. Request ID — must precede error handler so the id is available.
  await app.register(requestIdPlugin);

  // 6. Auth decorator (registers app.authenticate for protected routes).
  await app.register(authPlugin);

  // 7. Routes — always register health.
  await app.register(healthRoutes);

  // When a DB connection is provided, register all API routes.
  if (opts.db && opts.rawDb) {
    const { createUserRepository } = await import("./repositories/userRepository.js");
    const { createSessionRepository } = await import("./repositories/sessionRepository.js");
    const {
      createPostRepository,
      createCommunityRepository,
      createCommentRepository,
    } = await import("./repositories/postRepository.js");
    const { createVoteRepository } = await import("./repositories/voteRepository.js");
    const { createNotificationRepository } = await import("./repositories/notificationRepository.js");
    const { createVoteService } = await import("./services/voteService.js");
    const { buildAuthRoutes } = await import("./routes/auth.js");
    const { buildPostRoutes } = await import("./routes/posts.js");
    const { buildCommunityRoutes } = await import("./routes/communities.js");
    const { buildVoteRoutes } = await import("./routes/votes.js");
    const { buildCommentRoutes } = await import("./routes/comments.js");
    const { buildSearchRoutes } = await import("./routes/search.js");
    const { buildNotificationRoutes } = await import("./routes/notifications.js");

    const userRepo = createUserRepository(opts.db);
    const sessionRepo = createSessionRepository(opts.db);
    const postRepo = createPostRepository(opts.db);
    const communityRepo = createCommunityRepository(opts.db);
    const commentRepo = createCommentRepository(opts.db);
    const voteRepo = createVoteRepository(opts.db);
    const notificationRepo = createNotificationRepository(opts.db);
    const voteService = createVoteService(opts.db, {
      voteRepo,
      postRepo,
      commentRepo,
    });

    const authEnv = {
      JWT_ACCESS_SECRET: env.JWT_ACCESS_SECRET ?? "dev-access-secret-not-for-prod-32+chars",
      JWT_REFRESH_SECRET: env.JWT_REFRESH_SECRET ?? "dev-refresh-secret-not-for-prod-32+chars",
      JWT_ACCESS_TTL: env.JWT_ACCESS_TTL,
      JWT_REFRESH_TTL: env.JWT_REFRESH_TTL,
      NODE_ENV: env.NODE_ENV,
      COOKIE_DOMAIN: env.COOKIE_DOMAIN,
    };

    await app.register(buildAuthRoutes({ userRepo, sessionRepo, env: authEnv }));
    await app.register(buildPostRoutes({ postRepo, communityRepo }));
    await app.register(buildCommunityRoutes({ communityRepo }));
    await app.register(buildVoteRoutes({ voteService }));
    await app.register(buildCommentRoutes({
      commentRepo,
      postRepo,
      notificationRepo,
    }));
    await app.register(buildSearchRoutes({
      rawDb: opts.rawDb,
      db: opts.db,
      communityRepo,
    }));
    await app.register(buildNotificationRoutes({ notificationRepo }));
  }

  // 8. Error handler — last so it wraps everything.
  await app.register(errorHandlerPlugin);

  // Decorate app with env for downstream plugins/routes
  app.decorate("env", env);

  return app;
}
