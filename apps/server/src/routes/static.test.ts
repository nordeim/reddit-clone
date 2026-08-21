import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, it, expect, afterEach } from "vitest";
import { buildApp } from "../app.js";

/**
 * Round 16 — Fastify static SPA serving (STATIC_DIR).
 *
 * The live site was serving the SPA via `python -m http.server`, which
 * cannot handle POST (LIVE-CRIT-4 → 501) and emits no Helmet headers
 * (LIVE-CRIT-3). Serving `apps/web/dist` from Fastify itself closes
 * those gaps when the operator points the public origin at this process.
 *
 * `wildcard: false` is required so unknown `/api/*` paths still return
 * the structured JSON 404 from the error handler (not a static 404).
 */

const tempDirs: string[] = [];

function makeStaticRoot(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "embers-static-"));
  tempDirs.push(dir);
  for (const [name, body] of Object.entries(files)) {
    writeFileSync(join(dir, name), body, "utf8");
  }
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe("STATIC_DIR — optional SPA serving (Round 16)", () => {
  it("does not serve GET / when STATIC_DIR is unset (existing 404 JSON)", async () => {
    const app = await buildApp({ env: { NODE_ENV: "test" } });
    try {
      const res = await app.inject({ method: "GET", url: "/" });
      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe("NOT_FOUND");
    } finally {
      await app.close();
    }
  });

  it("serves a nested asset from STATIC_DIR (images survive the single-file build)", async () => {
    const root = makeStaticRoot({
      "index.html": "<!doctype html><title>embers</title>",
    });
    const imagesDir = join(root, "images");
    const { mkdirSync } = await import("node:fs");
    mkdirSync(imagesDir);
    writeFileSync(join(imagesDir, "cat-tech.jpg"), "fake-jpeg", "utf8");
    const app = await buildApp({
      env: { NODE_ENV: "test", STATIC_DIR: root },
    });
    try {
      const res = await app.inject({ method: "GET", url: "/images/cat-tech.jpg" });
      expect(res.statusCode).toBe(200);
      expect(res.body).toBe("fake-jpeg");
    } finally {
      await app.close();
    }
  });

  it("serves index.html from STATIC_DIR at GET /", async () => {
    const root = makeStaticRoot({
      "index.html": "<!doctype html><html><body><div id=\"root\"></div></body></html>",
    });
    const app = await buildApp({
      env: { NODE_ENV: "test", STATIC_DIR: root },
    });
    try {
      const res = await app.inject({ method: "GET", url: "/" });
      expect(res.statusCode).toBe(200);
      expect(res.headers["content-type"]).toMatch(/html/);
      expect(res.body).toContain("id=\"root\"");
    } finally {
      await app.close();
    }
  });

  it("still returns JSON 404 for unknown /api/* when STATIC_DIR is set", async () => {
    const root = makeStaticRoot({
      "index.html": "<!doctype html><title>embers</title>",
    });
    const app = await buildApp({
      env: { NODE_ENV: "test", STATIC_DIR: root },
    });
    try {
      const res = await app.inject({
        method: "GET",
        url: "/api/this-route-does-not-exist",
      });
      expect(res.statusCode).toBe(404);
      expect(res.headers["content-type"]).toMatch(/json/);
      expect(res.json().error.code).toBe("NOT_FOUND");
    } finally {
      await app.close();
    }
  });

  it("relaxes script-src to allow the inlined SPA bundle when STATIC_DIR is set", async () => {
    const root = makeStaticRoot({
      "index.html": "<!doctype html><title>embers</title>",
    });
    const app = await buildApp({
      env: { NODE_ENV: "test", STATIC_DIR: root },
    });
    try {
      const res = await app.inject({ method: "GET", url: "/health" });
      const csp = res.headers["content-security-policy"] as string | undefined;
      expect(csp).toContain("script-src 'self' 'unsafe-inline'");
    } finally {
      await app.close();
    }
  });

  it("does not shadow GET /health when STATIC_DIR is set", async () => {
    const root = makeStaticRoot({
      "index.html": "<!doctype html><title>embers</title>",
    });
    const app = await buildApp({
      env: { NODE_ENV: "test", STATIC_DIR: root },
    });
    try {
      const res = await app.inject({ method: "GET", url: "/health" });
      expect(res.statusCode).toBe(200);
      expect(res.json().status).toBe("ok");
    } finally {
      await app.close();
    }
  });
});
