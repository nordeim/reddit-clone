import type { FastifyInstance, FastifyRequest } from "fastify";
import { randomUUID } from "node:crypto";
import {
  registerInputSchema,
  loginInputSchema,
  type AuthUser,
} from "@embers/shared";
import { hashPassword, verifyPassword } from "../auth/password";
import { signAccessToken, signRefreshToken, verifyRefreshToken, newJti } from "../auth/jwt";
import type { UserRepository } from "../repositories/userRepository";
import type { SessionRepository } from "../repositories/sessionRepository";
import { gradientFor } from "@embers/db";
import { z } from "zod";

const REFRESH_COOKIE = "embers_refresh";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const REFRESH_TOKEN_BODY = z.object({ refreshToken: z.string().min(1) });

export interface AuthRouteDeps {
  userRepo: UserRepository;
  sessionRepo: SessionRepository;
  /** Allow tests to inject env without touching process.env */
  env: {
    JWT_ACCESS_SECRET?: string;
    JWT_REFRESH_SECRET?: string;
    JWT_ACCESS_TTL: string;
    JWT_REFRESH_TTL: string;
    NODE_ENV: string;
    COOKIE_DOMAIN?: string;
    /**
     * Auth rate-limit config. Defaults to 5 attempts per minute per IP
     * (sufficient to allow legitimate typo-retries while blocking
     * brute-force attacks). Set max=Infinity in tests to disable.
     */
    authRateLimitMax?: number;
    authRateLimitWindow?: string;
  };
}

/**
 * Build the auth route handler. Routes are pure functions of the
 * dependencies — the same handler works against an in-memory test DB
 * or the production SQLite file.
 */
export function buildAuthRoutes(deps: AuthRouteDeps) {
  const authMax = deps.env.authRateLimitMax ?? 5;
  const authWindow = deps.env.authRateLimitWindow ?? "1 minute";
  const rateLimitConfig =
    authMax === Infinity
      ? {}
      : {
          config: {
            rateLimit: {
              max: authMax,
              timeWindow: authWindow,
              keyGenerator: (req: FastifyRequest) =>
                // Rate-limit by IP — auth attempts should be tracked per
                // client, not per access token (which doesn't exist yet).
                req.ip,
            },
          },
        };

  return async function authRoutes(app: FastifyInstance): Promise<void> {
    /**
     * POST /api/auth/register — create a new user account.
     * 201: returns { user } (without passwordHash)
     * 409: username taken
     * 422: invalid input (handled by zod validator / errorHandler)
     * Rate-limited: 5 attempts/minute/IP (brute-force protection).
     */
    app.post("/api/auth/register", rateLimitConfig, async (req, reply) => {
      const parsed = registerInputSchema.safeParse(req.body);
      if (!parsed.success) {
        reply.code(422);
        throw parsed.error;
      }
      const { username, password, displayName } = parsed.data;

      const existing = deps.userRepo.findByUsername(username);
      if (existing) {
        reply.code(409);
        return reply.send({
          error: {
            code: "CONFLICT",
            message: "Username already taken",
            requestId: req.id,
          },
        });
      }

      const passwordHash = await hashPassword(password);
      const [colorFrom, colorTo] = gradientFor(username);
      const user = await deps.userRepo.create({
        id: `u-${randomUUID()}`,
        username,
        passwordHash,
        displayName: displayName ?? username,
        colorFrom,
        colorTo,
      });

      reply.code(201);
      return reply.send({
        user: toAuthUser(user),
      });
    });

    /**
     * POST /api/auth/login — exchange credentials for an access token +
     * refresh cookie.
     * 200: { accessToken, user } + Set-Cookie: embers_refresh=<jwt>; HttpOnly; Secure; SameSite=Strict
     * 401: bad credentials
     */
    app.post("/api/auth/login", rateLimitConfig, async (req, reply) => {
      const parsed = loginInputSchema.safeParse(req.body);
      if (!parsed.success) {
        reply.code(422);
        throw parsed.error;
      }
      const { username, password } = parsed.data;

      const user = deps.userRepo.findByUsername(username);
      if (!user) {
        reply.code(401);
        return reply.send({
          error: {
            code: "UNAUTHORIZED",
            message: "Invalid username or password",
            requestId: req.id,
          },
        });
      }

      const ok = await verifyPassword(password, user.passwordHash);
      if (!ok) {
        reply.code(401);
        return reply.send({
          error: {
            code: "UNAUTHORIZED",
            message: "Invalid username or password",
            requestId: req.id,
          },
        });
      }

      const accessToken = await signAccessToken(
        { id: user.id, username: user.username },
        deps.env.JWT_ACCESS_SECRET!,
        deps.env.JWT_ACCESS_TTL,
      );

      const jti = newJti();
      const refreshExpiresAt = new Date(Date.now() + SEVEN_DAYS_MS).toISOString();
      const refreshToken = await signRefreshToken(
        { id: user.id, jti },
        deps.env.JWT_REFRESH_SECRET!,
        deps.env.JWT_REFRESH_TTL,
      );
      deps.sessionRepo.create({ jti, userId: user.id, expiresAt: refreshExpiresAt });

      setRefreshCookie(reply, refreshToken, deps.env);

      return reply.send({
        accessToken,
        user: toAuthUser(user),
      });
    });

    /**
     * POST /api/auth/refresh — exchange a valid refresh cookie for a new
     * access token + rotated refresh cookie. The old jti is revoked.
     * 200: { accessToken, user }
     * 401: missing/invalid/expired refresh token
     */
    app.post("/api/auth/refresh", async (req, reply) => {
      const cookieToken = req.cookies[REFRESH_COOKIE];
      const bodyToken = req.body && typeof req.body === "object" && "refreshToken" in req.body
        ? REFRESH_TOKEN_BODY.safeParse(req.body).data?.refreshToken
        : undefined;
      const token = cookieToken ?? bodyToken;

      if (!token) {
        reply.code(401);
        return reply.send({
          error: {
            code: "UNAUTHORIZED",
            message: "Missing refresh token",
            requestId: req.id,
          },
        });
      }

      let payload;
      try {
        payload = await verifyRefreshToken(token, deps.env.JWT_REFRESH_SECRET!);
      } catch {
        reply.code(401);
        return reply.send({
          error: {
            code: "UNAUTHORIZED",
            message: "Invalid or expired refresh token",
            requestId: req.id,
          },
        });
      }

      // Atomic rotation: delete old jti, insert new jti
      const newJtiValue = newJti();
      const newExpiresAt = new Date(Date.now() + SEVEN_DAYS_MS).toISOString();
      const rotated = deps.sessionRepo.rotate(payload.jti, newJtiValue, payload.id, newExpiresAt);
      if (!rotated) {
        reply.code(401);
        return reply.send({
          error: {
            code: "UNAUTHORIZED",
            message: "Refresh token has been revoked",
            requestId: req.id,
          },
        });
      }

      const user = deps.userRepo.findById(payload.id);
      if (!user) {
        reply.code(401);
        return reply.send({
          error: {
            code: "UNAUTHORIZED",
            message: "User no longer exists",
            requestId: req.id,
          },
        });
      }

      const accessToken = await signAccessToken(
        { id: user.id, username: user.username },
        deps.env.JWT_ACCESS_SECRET!,
        deps.env.JWT_ACCESS_TTL,
      );
      const newRefreshToken = await signRefreshToken(
        { id: user.id, jti: newJtiValue },
        deps.env.JWT_REFRESH_SECRET!,
        deps.env.JWT_REFRESH_TTL,
      );

      setRefreshCookie(reply, newRefreshToken, deps.env);

      return reply.send({
        accessToken,
        user: toAuthUser(user),
      });
    });

    /**
     * POST /api/auth/logout — revoke the refresh token (by jti) and clear
     * the cookie. Idempotent: returns 204 even if the token was already
     * revoked or never existed.
     */
    app.post("/api/auth/logout", async (req, reply) => {
      const token = req.cookies[REFRESH_COOKIE];
      if (token) {
        try {
          const payload = await verifyRefreshToken(token, deps.env.JWT_REFRESH_SECRET!);
          deps.sessionRepo.revoke(payload.jti);
        } catch {
          // Token invalid or already revoked — ignore, logout is idempotent
        }
      }
      reply.clearCookie(REFRESH_COOKIE, {
        httpOnly: true,
        secure: deps.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/api/auth",
        domain: deps.env.COOKIE_DOMAIN,
      });
      reply.code(204);
      return reply.send();
    });
  };
}

function toAuthUser(user: {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  karma: number;
  createdAt: string;
  colorFrom: string;
  colorTo: string;
}): AuthUser & Record<string, unknown> {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    bio: user.bio,
    karma: user.karma,
    createdAt: user.createdAt,
    colorFrom: user.colorFrom,
    colorTo: user.colorTo,
  };
}

function setRefreshCookie(
  reply: FastifyReplyLike,
  token: string,
  env: AuthRouteDeps["env"],
): void {
  reply.setCookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth",
    domain: env.COOKIE_DOMAIN,
    maxAge: SEVEN_DAYS_MS / 1000,
  });
}

type FastifyReplyLike = {
  setCookie: (name: string, value: string, opts: Record<string, unknown>) => unknown;
};
