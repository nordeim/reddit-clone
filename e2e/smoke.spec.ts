import { test, expect } from "@playwright/test";

/**
 * embers — E2E smoke suite (B24)
 *
 * Covers the critical paths a production deployment must serve:
 *   1. Health endpoint
 *   2. Auth: register a new user
 *   3. Auth: login as the seeded demo user
 *   4. Feed: list posts
 *   5. Search: FTS5 query
 *
 * The server is started by `playwright.config.ts`'s `webServer` against a
 * fresh in-memory SQLite DB seeded with 49 users, 18 communities, 320 posts.
 * Each test is independent — they don't share auth state unless explicitly
 * storage-stated via `e2e/.auth/`.
 */

test.describe("health", () => {
  test("GET /health returns 200 with status ok", async ({ request }) => {
    const res = await request.get("/health");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeTruthy();
    expect(typeof body.uptime).toBe("number");
  });
});

test.describe("auth", () => {
  test("POST /api/auth/register creates a new user, then login works", async ({ request }) => {
    const username = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const password = "TestPassword123!";

    // Register
    const regRes = await request.post("/api/auth/register", {
      data: {
        username,
        password,
        displayName: "E2E Tester",
      },
    });
    expect(regRes.status()).toBe(201);
    const regBody = await regRes.json();
    expect(regBody.user.username).toBe(username);
    expect(regBody.user.id).toBeTruthy();
    expect(regBody.user.passwordHash).toBeUndefined(); // never leak hash
    // Register returns only the user — no access token. Client must login next.

    // Login with the freshly registered user
    const loginRes = await request.post("/api/auth/login", {
      data: { username, password },
    });
    expect(loginRes.status()).toBe(200);
    const loginBody = await loginRes.json();
    expect(loginBody.accessToken).toBeTruthy();
    expect(loginBody.user.username).toBe(username);
    const setCookie = loginRes.headers()["set-cookie"];
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain("HttpOnly");
  });

  test("POST /api/auth/login succeeds for seeded demo user", async ({ request }) => {
    const res = await request.post("/api/auth/login", {
      data: {
        username: "you",
        password: "embers-demo",
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.accessToken).toBeTruthy();
    expect(body.user.username).toBe("you");
    // Refresh cookie should be set
    const setCookie = res.headers()["set-cookie"];
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain("HttpOnly");
  });

  test("POST /api/auth/login rejects wrong password with 401", async ({ request }) => {
    const res = await request.post("/api/auth/login", {
      data: { username: "you", password: "wrong-password" },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe("feed", () => {
  test("GET /api/posts returns paginated list with cursor", async ({ request }) => {
    const res = await request.get("/api/posts?limit=5");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeLessThanOrEqual(5);
    expect(body.data.length).toBeGreaterThan(0);
    // Each post should have the minimum shape
    const first = body.data[0];
    expect(first.id).toBeTruthy();
    expect(first.title).toBeTruthy();
    expect(first.communityId).toBeTruthy();
    expect(first.authorId).toBeTruthy();
    // Cursor pagination metadata
    expect(body.nextCursor === null || typeof body.nextCursor === "string").toBe(true);
  });

  test("GET /api/posts/:id returns a single post", async ({ request }) => {
    const list = await (await request.get("/api/posts?limit=1")).json();
    const postId = list.data[0].id;
    const res = await request.get(`/api/posts/${postId}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(postId);
  });
});

test.describe("search", () => {
  test("GET /api/search?q=react&type=posts returns results or empty list", async ({ request }) => {
    const res = await request.get("/api/search?q=react&type=posts");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
  });

  test("GET /api/search with empty q returns 422", async ({ request }) => {
    const res = await request.get("/api/search?q=&type=posts");
    expect(res.status()).toBe(422);
  });
});

test.describe("communities", () => {
  test("GET /api/communities returns non-empty list", async ({ request }) => {
    const res = await request.get("/api/communities");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    // 18 communities seeded
    expect(body.data.length).toBeGreaterThanOrEqual(18);
  });
});
