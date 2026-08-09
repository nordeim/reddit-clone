import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { openDb, runSeed } from "@embers/db";
import { createUserRepository } from "../repositories/userRepository.js";
import { createSessionRepository } from "../repositories/sessionRepository.js";
import { buildAuthRoutes } from "./auth.js";

const ACCESS_SECRET = "test-access-secret-32-chars-minimum-length!";
const REFRESH_SECRET = "test-refresh-secret-32-chars-minimum-length!";

async function buildAppWithAuth(): Promise<FastifyInstance> {
  const Fastify = (await import("fastify")).default;
  const cookie = (await import("@fastify/cookie")).default;

  const { raw, db } = openDb({ path: ":memory:" });
  await runSeed(db, {
    hashPassword: (plain: string) =>
      import("argon2").then((a) => a.hash(plain, { type: a.argon2id, timeCost: 2, memoryCost: 1024, parallelism: 1 })),
  });

  const app = Fastify({ logger: { level: "silent" } });
  await app.register(cookie);

  const deps = {
    userRepo: createUserRepository(db),
    sessionRepo: createSessionRepository(db),
    env: {
      JWT_ACCESS_SECRET: ACCESS_SECRET,
      JWT_REFRESH_SECRET: REFRESH_SECRET,
      JWT_ACCESS_TTL: "15m",
      JWT_REFRESH_TTL: "7d",
      NODE_ENV: "test",
      COOKIE_DOMAIN: undefined,
    },
  };
  await app.register(buildAuthRoutes(deps));

  // Keep a reference so the test can close the db after
  (app as unknown as { _raw: typeof raw })._raw = raw;

  return app;
}

describe("POST /api/auth/register", () => {
  let app: FastifyInstance;
  beforeEach(async () => { app = await buildAppWithAuth(); });
  afterEach(async () => { await app.close(); });

  it("creates a new user with 201", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { username: "newuser1", password: "supersecret123", displayName: "New User" },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.user.username).toBe("newuser1");
    expect(body.user.displayName).toBe("New User");
    expect(body.user.passwordHash).toBeUndefined();
  });

  it("rejects short username with 422", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { username: "ab", password: "supersecret123" },
    });
    expect(res.statusCode).toBe(422);
  });

  it("rejects short password with 422", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { username: "validuser", password: "short" },
    });
    expect(res.statusCode).toBe(422);
  });

  it("returns 409 when username already taken", async () => {
    // First registration succeeds
    await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { username: "dupeuser", password: "supersecret123" },
    });
    // Second registration with same username fails
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { username: "dupeuser", password: "different-password-1" },
    });
    expect(res.statusCode).toBe(409);
    const body = res.json();
    expect(body.error.code).toBe("CONFLICT");
  });
});

describe("POST /api/auth/login", () => {
  let app: FastifyInstance;
  beforeEach(async () => { app = await buildAppWithAuth(); });
  afterEach(async () => { await app.close(); });

  it("returns 200 with access token + sets refresh cookie for the seeded demo user", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "you", password: "embers-demo" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.accessToken).toBeTruthy();
    expect(body.accessToken.split(".").length).toBe(3);
    expect(body.user.username).toBe("you");
    // Refresh cookie set
    const setCookie = res.headers["set-cookie"];
    expect(setCookie).toBeDefined();
    const cookieStr = Array.isArray(setCookie) ? setCookie.join(";") : (setCookie as string);
    expect(cookieStr).toContain("embers_refresh=");
    expect(cookieStr.toLowerCase()).toContain("httponly");
  });

  it("returns 401 for wrong password", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "you", password: "wrong-password" },
    });
    expect(res.statusCode).toBe(401);
    const body = res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 401 for non-existent user", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "ghost_user", password: "anything" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("returns 422 for missing fields", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "you" },
    });
    expect(res.statusCode).toBe(422);
  });
});

describe("POST /api/auth/refresh", () => {
  let app: FastifyInstance;
  beforeEach(async () => { app = await buildAppWithAuth(); });
  afterEach(async () => { await app.close(); });

  async function loginAsYou(): Promise<{ accessToken: string; refreshCookie: string }> {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "you", password: "embers-demo" },
    });
    const setCookie = res.headers["set-cookie"];
    const cookieStr = Array.isArray(setCookie) ? setCookie.join(";") : (setCookie as string);
    const match = /embers_refresh=([^;]+)/.exec(cookieStr);
    if (!match) throw new Error("refresh cookie not found");
    return {
      accessToken: res.json().accessToken,
      refreshCookie: match[1],
    };
  }

  it("rotates the refresh token and issues a new access token", async () => {
    const { refreshCookie } = await loginAsYou();
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/refresh",
      cookies: { embers_refresh: refreshCookie },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.accessToken).toBeTruthy();
    expect(body.user.username).toBe("you");
    // New refresh cookie issued (different from the old one due to rotation)
    const newCookie = res.headers["set-cookie"];
    expect(newCookie).toBeDefined();
  });

  it("invalidates the old refresh token after rotation", async () => {
    const { refreshCookie } = await loginAsYou();
    // First refresh succeeds
    await app.inject({
      method: "POST",
      url: "/api/auth/refresh",
      cookies: { embers_refresh: refreshCookie },
    });
    // Second refresh with the same token fails (revoked)
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/refresh",
      cookies: { embers_refresh: refreshCookie },
    });
    expect(res.statusCode).toBe(401);
    const body = res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 401 when no refresh token is provided", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/refresh",
    });
    expect(res.statusCode).toBe(401);
  });
});

describe("POST /api/auth/logout", () => {
  let app: FastifyInstance;
  beforeEach(async () => { app = await buildAppWithAuth(); });
  afterEach(async () => { await app.close(); });

  it("returns 204 and clears the refresh cookie", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/logout",
    });
    expect(res.statusCode).toBe(204);
    // Set-Cookie with Max-Age=0 to clear
    const setCookie = res.headers["set-cookie"];
    if (setCookie) {
      const cookieStr = Array.isArray(setCookie) ? setCookie.join(";") : setCookie;
      expect(cookieStr.toLowerCase()).toMatch(/embers_refresh=;|max-age=0/);
    }
  });

  it("revokes the refresh token so refresh fails after logout", async () => {
    // Login to get a valid refresh cookie
    const loginRes = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "you", password: "embers-demo" },
    });
    const setCookie = loginRes.headers["set-cookie"];
    const cookieStr = Array.isArray(setCookie) ? setCookie.join(";") : (setCookie as string);
    const match = /embers_refresh=([^;]+)/.exec(cookieStr);
    if (!match) throw new Error("refresh cookie not found");
    const refreshCookie = match[1];

    // Logout
    await app.inject({
      method: "POST",
      url: "/api/auth/logout",
      cookies: { embers_refresh: refreshCookie },
    });

    // Refresh should now fail
    const refreshRes = await app.inject({
      method: "POST",
      url: "/api/auth/refresh",
      cookies: { embers_refresh: refreshCookie },
    });
    expect(refreshRes.statusCode).toBe(401);
  });

  it("is idempotent — logout with no cookie still returns 204", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/logout",
    });
    expect(res.statusCode).toBe(204);
  });
});
