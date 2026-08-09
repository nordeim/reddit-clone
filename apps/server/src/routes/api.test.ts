import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { openDb, runSeed, type Database, type DrizzleDB } from "@embers/db";
import { buildApp } from "../app";

const ACCESS_SECRET = "test-access-secret-32-chars-minimum-length!";
const REFRESH_SECRET = "test-refresh-secret-32-chars-minimum-length!";

let raw: Database;
let db: DrizzleDB;
let app: FastifyInstance;
let demoAccessToken: string;

beforeAll(async () => {
  ({ raw, db } = openDb({ path: ":memory:" }));
  await runSeed(db, {
    hashPassword: (plain: string) =>
      import("argon2").then((a) =>
        a.hash(plain, { type: a.argon2id, timeCost: 2, memoryCost: 1024, parallelism: 1 }),
      ),
  });
  app = await buildApp({
    env: {
      NODE_ENV: "test",
      JWT_ACCESS_SECRET: ACCESS_SECRET,
      JWT_REFRESH_SECRET: REFRESH_SECRET,
      JWT_ACCESS_TTL: "15m",
      JWT_REFRESH_TTL: "7d",
      CORS_ORIGIN: "*",
    },
    skipHelmet: true,
    db,
    rawDb: raw,
  });

  // Login as the demo user to get an access token for authenticated requests.
  const loginRes = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { username: "you", password: "embers-demo" },
  });
  demoAccessToken = loginRes.json().accessToken;
});

afterAll(async () => {
  await app.close();
  raw.close();
});

function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${demoAccessToken}` };
}

describe("GET /api/posts", () => {
  it("returns paginated list with nextCursor", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/posts?limit=10",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.length).toBe(10);
    expect(body.nextCursor).toBeTruthy();
  });

  it("paginates to the end of the list and returns null nextCursor", async () => {
    let cursor: string | null = null;
    let totalFetched = 0;
    for (let i = 0; i < 10; i++) {
      const cursorParam: string = cursor ? `&cursor=${encodeURIComponent(cursor)}` : "";
      const url: string = `/api/posts?limit=100${cursorParam}`;
      const res = await app.inject({ method: "GET", url });
      expect(res.statusCode).toBe(200);
      const body = res.json() as { data: unknown[]; nextCursor: string | null };
      totalFetched += body.data.length;
      cursor = body.nextCursor;
      if (!cursor) break;
    }
    expect(totalFetched).toBe(320);
  });

  it("rejects limit > 100", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/posts?limit=200",
    });
    expect(res.statusCode).toBe(422);
  });

  it("filters by communityId", async () => {
    // First find a community id from /api/communities
    const communities = (await app.inject({ method: "GET", url: "/api/communities" })).json().data;
    const firstCommunityId = communities[0].id;
    const res = await app.inject({
      method: "GET",
      url: `/api/posts?communityId=${firstCommunityId}&limit=100`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    for (const p of body.data) {
      expect(p.communityId).toBe(firstCommunityId);
    }
  });
});

describe("GET /api/posts/:id", () => {
  it("returns 200 for a valid post id", async () => {
    const list = (await app.inject({ method: "GET", url: "/api/posts?limit=1" })).json();
    const firstPostId = list.data[0].id;
    const res = await app.inject({
      method: "GET",
      url: `/api/posts/${firstPostId}`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.id).toBe(firstPostId);
  });

  it("returns 404 for a non-existent post id", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/posts/nonexistent-id",
    });
    expect(res.statusCode).toBe(404);
    const body = res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });
});

describe("POST /api/posts", () => {
  it("requires authentication (401 without token)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/posts",
      payload: { communityId: "c1", title: "Test", type: "text", body: "Body" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("creates a post with 201 when authenticated", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/posts",
      headers: authHeaders(),
      payload: { communityId: "c1", title: "New post", type: "text", body: "Body content" },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.id).toBeTruthy();
    expect(body.title).toBe("New post");
    expect(body.authorId).toBe("u-me");
    expect(body.score).toBe(0);
  });

  it("rejects empty title with 422", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/posts",
      headers: authHeaders(),
      payload: { communityId: "c1", title: "", type: "text" },
    });
    expect(res.statusCode).toBe(422);
  });

  it("rejects javascript: URL link post", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/posts",
      headers: authHeaders(),
      payload: {
        communityId: "c1",
        title: "Bad link",
        type: "link",
        linkUrl: "javascript:alert(1)",
      },
    });
    expect(res.statusCode).toBe(422);
  });

  it("returns 404 for non-existent community", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/posts",
      headers: authHeaders(),
      payload: {
        communityId: "nonexistent",
        title: "Test",
        type: "text",
      },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe("GET /api/communities", () => {
  it("returns all 18 communities", async () => {
    const res = await app.inject({ method: "GET", url: "/api/communities" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.length).toBe(18);
    expect(body.data[0].slug).toBeTruthy();
    expect(Array.isArray(body.data[0].rules)).toBe(true);
  });
});

describe("GET /api/communities/:slug", () => {
  it("returns 200 for a valid slug", async () => {
    const res = await app.inject({ method: "GET", url: "/api/communities/rust" });
    // 'rust' isn't a seeded community — programming is. Let me use that.
    const res2 = await app.inject({ method: "GET", url: "/api/communities/programming" });
    expect(res2.statusCode).toBe(200);
    const body = res2.json();
    expect(body.slug).toBe("programming");
    expect(body.title).toBe("Programming");
    void res;
  });

  it("returns 404 for unknown slug", async () => {
    const res = await app.inject({ method: "GET", url: "/api/communities/nonexistent" });
    expect(res.statusCode).toBe(404);
  });
});

describe("PUT /api/votes/:targetId", () => {
  let firstPostId: string;

  beforeAll(async () => {
    const list = (await app.inject({ method: "GET", url: "/api/posts?limit=1" })).json();
    firstPostId = list.data[0].id;
  });

  it("requires authentication (401 without token)", async () => {
    const res = await app.inject({
      method: "PUT",
      url: `/api/votes/${firstPostId}`,
      payload: { targetType: "post", value: 1 },
    });
    expect(res.statusCode).toBe(401);
  });

  it("casts an upvote and returns updated score", async () => {
    const post = (await app.inject({ method: "GET", url: `/api/posts/${firstPostId}` })).json();
    const initialScore = post.score;
    const res = await app.inject({
      method: "PUT",
      url: `/api/votes/${firstPostId}`,
      headers: authHeaders(),
      payload: { targetType: "post", value: 1 },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.value).toBe(1);
    expect(body.score).toBe(initialScore + 1);
  });

  it("toggles off when same value is cast again", async () => {
    const post = (await app.inject({ method: "GET", url: `/api/posts/${firstPostId}` })).json();
    const initialScore = post.score;
    const res = await app.inject({
      method: "PUT",
      url: `/api/votes/${firstPostId}`,
      headers: authHeaders(),
      payload: { targetType: "post", value: 1 },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.value).toBe(0); // toggled off
    expect(body.score).toBe(initialScore - 1);
  });

  it("flips from -1 to +1 when value changes", async () => {
    // Cast -1
    await app.inject({
      method: "PUT",
      url: `/api/votes/${firstPostId}`,
      headers: authHeaders(),
      payload: { targetType: "post", value: -1 },
    });
    const post = (await app.inject({ method: "GET", url: `/api/posts/${firstPostId}` })).json();
    const afterDownvote = post.score;
    // Flip to +1
    const res = await app.inject({
      method: "PUT",
      url: `/api/votes/${firstPostId}`,
      headers: authHeaders(),
      payload: { targetType: "post", value: 1 },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.value).toBe(1);
    expect(body.score).toBe(afterDownvote + 2); // -1 → 0 → +1 = +2
  });

  it("rejects value 2 with 422", async () => {
    const res = await app.inject({
      method: "PUT",
      url: `/api/votes/${firstPostId}`,
      headers: authHeaders(),
      payload: { targetType: "post", value: 2 },
    });
    expect(res.statusCode).toBe(422);
  });
});

describe("GET /api/posts/:id/comments", () => {
  it("returns a tree with children arrays", async () => {
    // Find a post that has comments (seeded posts all have ≥1)
    const list = (await app.inject({ method: "GET", url: "/api/posts?limit=5" })).json();
    let found = false;
    for (const p of list.data) {
      const res = await app.inject({ method: "GET", url: `/api/posts/${p.id}/comments` });
      if (res.statusCode === 200) {
        const body = res.json();
        if (body.data.length > 0) {
          const first = body.data[0];
          expect(Array.isArray(first.children)).toBe(true);
          found = true;
          break;
        }
      }
    }
    expect(found).toBe(true);
  });

  it("returns 404 for non-existent post", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/posts/nonexistent/comments",
    });
    expect(res.statusCode).toBe(404);
  });
});

describe("POST /api/posts/:id/comments", () => {
  let firstPostId: string;

  beforeAll(async () => {
    const list = (await app.inject({ method: "GET", url: "/api/posts?limit=1" })).json();
    firstPostId = list.data[0].id;
  });

  it("requires authentication", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/posts/${firstPostId}/comments`,
      payload: { body: "Test comment" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("creates a top-level comment with 201", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/posts/${firstPostId}/comments`,
      headers: authHeaders(),
      payload: { body: "Top-level test comment" },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.id).toBeTruthy();
    expect(body.body).toBe("Top-level test comment");
    expect(body.parentId).toBeNull();
    expect(body.depth).toBe(0);
  });

  it("rejects empty body with 422", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/posts/${firstPostId}/comments`,
      headers: authHeaders(),
      payload: { body: "" },
    });
    expect(res.statusCode).toBe(422);
  });

  it("returns 404 for non-existent parent comment", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/posts/${firstPostId}/comments`,
      headers: authHeaders(),
      payload: { body: "Reply", parentId: "nonexistent-comment-id" },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe("GET /api/search", () => {
  it("searches posts with FTS5", async () => {
    // 'react' is a common tech term — should match posts in reactjs/programming communities
    const res = await app.inject({
      method: "GET",
      url: "/api/search?q=react&type=posts",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("searches communities", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/search?q=programming&type=communities",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.some((c: { name: string }) => c.name === "programming")).toBe(true);
  });

  it("searches users", async () => {
    // 'alex' is in the FIRST_NAMES list — should match at least one user
    const res = await app.inject({
      method: "GET",
      url: "/api/search?q=alex&type=users",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("rejects empty query with 422", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/search?q=&type=posts",
    });
    expect(res.statusCode).toBe(422);
  });

  it("rejects unknown type with 422", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/search?q=test&type=comments",
    });
    expect(res.statusCode).toBe(422);
  });
});

describe("GET /api/notifications", () => {
  it("requires authentication", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/notifications",
    });
    expect(res.statusCode).toBe(401);
  });

  it("returns the demo user's 18 notifications when authenticated", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/notifications",
      headers: authHeaders(),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.length).toBe(18);
  });

  it("supports filter=unread", async () => {
    const allRes = await app.inject({
      method: "GET",
      url: "/api/notifications?filter=all",
      headers: authHeaders(),
    });
    const unreadRes = await app.inject({
      method: "GET",
      url: "/api/notifications?filter=unread",
      headers: authHeaders(),
    });
    expect(allRes.statusCode).toBe(200);
    expect(unreadRes.statusCode).toBe(200);
    const allBody = allRes.json();
    const unreadBody = unreadRes.json();
    expect(unreadBody.data.length).toBeLessThanOrEqual(allBody.data.length);
    for (const n of unreadBody.data) {
      expect(n.read).toBe(false);
    }
  });

  it("returns only the caller's notifications", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/notifications",
      headers: authHeaders(),
    });
    const body = res.json();
    for (const n of body.data) {
      expect(n.userId).toBe("u-me");
    }
  });
});
