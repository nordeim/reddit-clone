import { describe, it, expect } from "vitest";
import { buildApp } from "../app";

/**
 * Phase J — Helmet + rate-limit hardening tests.
 *
 * Helmet CSP header: verified via the /health endpoint response headers.
 * Auth route rate limit: verified by sending 6 login attempts and
 * asserting the 6th returns 429.
 *
 * These tests run with NODE_ENV=development so the global rate limiter
 * is active (it's disabled in NODE_ENV=test by default).
 */
describe("Phase J: hardening", () => {
  describe("Helmet security headers (via /health)", () => {
    it("emits Content-Security-Policy with the expected directives", async () => {
      const app = await buildApp({
        env: { NODE_ENV: "test" },
        // Helmet is enabled by default — only skipHelmet=true disables it.
      });
      const res = await app.inject({ method: "GET", url: "/health" });
      const csp = res.headers["content-security-policy"] as string | undefined;
      expect(csp).toBeTruthy();
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("font-src 'self' https://fonts.gstatic.com");
      expect(csp).toContain("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com");
      expect(csp).toContain("img-src 'self' data:");
      expect(csp).toContain("script-src 'self'");
      await app.close();
    });

    it("emits X-Content-Type-Options: nosniff", async () => {
      const app = await buildApp({ env: { NODE_ENV: "test" } });
      const res = await app.inject({ method: "GET", url: "/health" });
      expect(res.headers["x-content-type-options"]).toBe("nosniff");
      await app.close();
    });

    it("emits X-Frame-Options: SAMEORIGIN", async () => {
      const app = await buildApp({ env: { NODE_ENV: "test" } });
      const res = await app.inject({ method: "GET", url: "/health" });
      expect(res.headers["x-frame-options"]).toBe("SAMEORIGIN");
      await app.close();
    });

    it("emits Referrer-Policy: no-referrer", async () => {
      const app = await buildApp({ env: { NODE_ENV: "test" } });
      const res = await app.inject({ method: "GET", url: "/health" });
      expect(res.headers["referrer-policy"]).toBe("no-referrer");
      await app.close();
    });

    it("does NOT emit HSTS in non-production environments", async () => {
      const app = await buildApp({ env: { NODE_ENV: "test" } });
      const res = await app.inject({ method: "GET", url: "/health" });
      expect(res.headers["strict-transport-security"]).toBeUndefined();
      await app.close();
    });
  });

  describe("Auth rate limiting (5/min/IP)", () => {
    it("returns 429 on the 6th login attempt from the same IP", async () => {
      // Use NODE_ENV=development so the global rate limiter is active,
      // and a real DB so /api/auth/login can execute (auth flow needs
      // user lookup). We use the seeded dev.db.
      const { openDb, runSeed } = await import("@embers/db");
      const { raw, db } = openDb({ path: ":memory:" });
      await runSeed(db, {
        hashPassword: (plain: string) =>
          import("argon2").then((a) =>
            a.hash(plain, { type: a.argon2id, timeCost: 2, memoryCost: 1024, parallelism: 1 }),
          ),
      });

      const app = await buildApp({
        env: {
          NODE_ENV: "development",
          JWT_ACCESS_SECRET: "dev-access-secret-32-chars-minimum-length!",
          JWT_REFRESH_SECRET: "dev-refresh-secret-32-chars-minimum-length!",
          JWT_ACCESS_TTL: "15m",
          JWT_REFRESH_TTL: "7d",
          CORS_ORIGIN: "*",
        },
        db,
        rawDb: raw,
      });

      try {
        // Send 5 bad-password login attempts — all should return 401.
        for (let i = 0; i < 5; i++) {
          const res = await app.inject({
            method: "POST",
            url: "/api/auth/login",
            payload: { username: "you", password: `wrong-${i}` },
          });
          expect(res.statusCode).toBe(401);
        }
        // 6th attempt should be rate-limited.
        const res = await app.inject({
          method: "POST",
          url: "/api/auth/login",
          payload: { username: "you", password: "wrong-6" },
        });
        expect(res.statusCode).toBe(429);
        expect(res.headers["x-ratelimit-limit"]).toBe("5");
        expect(res.headers["x-ratelimit-remaining"]).toBe("0");
        expect(res.headers["retry-after"]).toBeTruthy();
        const body = res.json();
        expect(body.error.code).toBe("RATE_LIMITED");
      } finally {
        await app.close();
        raw.close();
      }
    });

    it("does NOT rate-limit non-auth endpoints (e.g. /health) on rapid requests", async () => {
      const app = await buildApp({ env: { NODE_ENV: "development" } });
      try {
        for (let i = 0; i < 20; i++) {
          const res = await app.inject({ method: "GET", url: "/health" });
          expect(res.statusCode).toBe(200);
        }
      } finally {
        await app.close();
      }
    });
  });
});
