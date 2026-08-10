import { describe, it, expect, vi } from "vitest";
import { createApiClient, ApiError } from "./api";

/**
 * TDD test suite for the foundational API client (Round 5).
 *
 * This module is the entry point for the deferred B17–B22 frontend integration:
 * it gives `apps/web` a typed, fetch-based client for the Fastify backend at
 * `apps/server`. It is intentionally framework-agnostic (no React Query, no
 * Axios) so it can be reused inside React Query hooks, Zustand actions, or
 * plain non-React code without coupling.
 *
 * The client is fully dependency-injected: callers pass a `fetch` implementation
 * and a `getToken` accessor, so tests use the global `Response` constructor
 * with no network calls.
 */

function mockFetch(args: {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}): typeof fetch {
  const { status, body, headers } = args;
  return vi.fn().mockResolvedValue(
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: {
        "Content-Type": "application/json",
        ...(headers ?? {}),
      },
    })
  ) as unknown as typeof fetch;
}

describe("createApiClient — constructor", () => {
  it("uses the provided baseUrl for all requests", async () => {
    const fetchMock = mockFetch({ status: 200, body: { status: "ok" } });
    const api = createApiClient({ baseUrl: "http://test-host", fetch: fetchMock });
    await api.health();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://test-host/health",
      expect.objectContaining({ method: "GET" })
    );
  });
});

describe("health", () => {
  it("GET /health returns the parsed status object", async () => {
    const fetchMock = mockFetch({ status: 200, body: { status: "ok" } });
    const api = createApiClient({ baseUrl: "http://test", fetch: fetchMock });
    const result = await api.health();
    expect(result).toEqual({ status: "ok" });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://test/health",
      expect.objectContaining({ method: "GET", body: undefined })
    );
  });
});

describe("auth", () => {
  it("login sends credentials as JSON POST and returns access token + user", async () => {
    const fetchMock = mockFetch({
      status: 200,
      body: { accessToken: "tok-123", user: { id: "u1", username: "you" } },
    });
    const api = createApiClient({ baseUrl: "http://test", fetch: fetchMock });
    const result = await api.login("you", "embers-demo");
    expect(result).toEqual({
      accessToken: "tok-123",
      user: { id: "u1", username: "you" },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://test/api/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ username: "you", password: "embers-demo" }),
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      })
    );
  });

  it("register sends username + password and returns access token + user", async () => {
    const fetchMock = mockFetch({
      status: 201,
      body: { accessToken: "tok-new", user: { id: "u2", username: "newbie" } },
    });
    const api = createApiClient({ baseUrl: "http://test", fetch: fetchMock });
    const result = await api.register("newbie", "password123");
    expect(result.accessToken).toBe("tok-new");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://test/api/auth/register",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ username: "newbie", password: "password123" }),
      })
    );
  });

  it("logout POSTs to /api/auth/logout and resolves undefined on 204", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 })) as unknown as typeof fetch;
    const api = createApiClient({ baseUrl: "http://test", fetch: fetchMock });
    const result = await api.logout();
    expect(result).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://test/api/auth/logout",
      expect.objectContaining({ method: "POST" })
    );
  });
});

describe("auth header", () => {
  it("attaches Authorization: Bearer <token> when getToken returns a token", async () => {
    const fetchMock = mockFetch({ status: 200, body: [] });
    const api = createApiClient({ baseUrl: "http://test", fetch: fetchMock, getToken: () => "tok-xyz" });
    await api.getPosts();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://test/api/posts",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer tok-xyz",
        }),
      })
    );
  });

  it("omits Authorization header when getToken returns null", async () => {
    const fetchMock = mockFetch({ status: 200, body: [] });
    const api = createApiClient({ baseUrl: "http://test", fetch: fetchMock, getToken: () => null });
    await api.getPosts();
    const callArgs = (fetchMock as unknown as { mock: { calls: unknown[][] } })
      .mock.calls[0] as [string, RequestInit];
    expect(callArgs[1].headers).not.toHaveProperty("Authorization");
  });
});

describe("posts", () => {
  it("getPosts with no cursor hits GET /api/posts", async () => {
    const fetchMock = mockFetch({
      status: 200,
      body: { items: [], nextCursor: null },
    });
    const api = createApiClient({ baseUrl: "http://test", fetch: fetchMock });
    await api.getPosts();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://test/api/posts",
      expect.any(Object)
    );
  });

  it("getPosts with cursor appends ?cursor=<encoded>", async () => {
    const fetchMock = mockFetch({
      status: 200,
      body: { items: [], nextCursor: null },
    });
    const api = createApiClient({ baseUrl: "http://test", fetch: fetchMock });
    await api.getPosts("2024-01-01 10:00:00");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://test/api/posts?cursor=2024-01-01%2010%3A00%3A00",
      expect.any(Object)
    );
  });

  it("getPost hits GET /api/posts/:id with encoded id", async () => {
    const fetchMock = mockFetch({
      status: 200,
      body: { id: "p-1", title: "Hello" },
    });
    const api = createApiClient({ baseUrl: "http://test", fetch: fetchMock });
    await api.getPost("p-1");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://test/api/posts/p-1",
      expect.any(Object)
    );
  });

  it("createPost POSTs JSON body and returns the created post", async () => {
    const fetchMock = mockFetch({
      status: 201,
      body: { id: "p-new", title: "Hi" },
    });
    const api = createApiClient({ baseUrl: "http://test", fetch: fetchMock });
    const result = await api.createPost({
      title: "Hi",
      content: "World",
      communityId: "c-1",
    });
    expect(result).toEqual({ id: "p-new", title: "Hi" });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://test/api/posts",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          title: "Hi",
          content: "World",
          communityId: "c-1",
        }),
      })
    );
  });
});

describe("votes", () => {
  it("vote PUTs value to /api/votes/:targetId", async () => {
    const fetchMock = mockFetch({
      status: 200,
      body: { targetId: "p-1", value: 1 },
    });
    const api = createApiClient({ baseUrl: "http://test", fetch: fetchMock });
    await api.vote("p-1", 1);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://test/api/votes/p-1",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ value: 1 }),
      })
    );
  });
});

describe("comments", () => {
  it("getComments hits GET /api/posts/:id/comments", async () => {
    const fetchMock = mockFetch({ status: 200, body: [] });
    const api = createApiClient({ baseUrl: "http://test", fetch: fetchMock });
    await api.getComments("p-1");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://test/api/posts/p-1/comments",
      expect.any(Object)
    );
  });

  it("createComment POSTs body to /api/posts/:id/comments", async () => {
    const fetchMock = mockFetch({ status: 201, body: { id: "c-1" } });
    const api = createApiClient({ baseUrl: "http://test", fetch: fetchMock });
    await api.createComment("p-1", { content: "Nice post!", parentId: null });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://test/api/posts/p-1/comments",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ content: "Nice post!", parentId: null }),
      })
    );
  });
});

describe("search + communities + notifications", () => {
  it("search encodes the q parameter", async () => {
    const fetchMock = mockFetch({ status: 200, body: { posts: [], communities: [], users: [] } });
    const api = createApiClient({ baseUrl: "http://test", fetch: fetchMock });
    await api.search("hello world");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://test/api/search?q=hello%20world",
      expect.any(Object)
    );
  });

  it("getCommunities hits GET /api/communities", async () => {
    const fetchMock = mockFetch({ status: 200, body: [] });
    const api = createApiClient({ baseUrl: "http://test", fetch: fetchMock });
    await api.getCommunities();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://test/api/communities",
      expect.any(Object)
    );
  });

  it("getCommunity encodes the slug", async () => {
    const fetchMock = mockFetch({ status: 200, body: { slug: "r/news" } });
    const api = createApiClient({ baseUrl: "http://test", fetch: fetchMock });
    await api.getCommunity("r/news");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://test/api/communities/r%2Fnews",
      expect.any(Object)
    );
  });

  it("getNotifications hits GET /api/notifications", async () => {
    const fetchMock = mockFetch({ status: 200, body: [] });
    const api = createApiClient({ baseUrl: "http://test", fetch: fetchMock });
    await api.getNotifications();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://test/api/notifications",
      expect.any(Object)
    );
  });
});

describe("error handling", () => {
  it("throws ApiError with code + message + requestId on 4xx with structured body", async () => {
    const fetchMock = mockFetch({
      status: 401,
      body: { error: { code: "INVALID_CREDENTIALS", message: "Bad password" } },
      headers: { "x-request-id": "req-abc" },
    });
    const api = createApiClient({ baseUrl: "http://test", fetch: fetchMock });
    const err = await api.login("you", "wrong").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({
      status: 401,
      code: "INVALID_CREDENTIALS",
      message: "Bad password",
      requestId: "req-abc",
    });
  });

  it("falls back to INTERNAL code when body has no error.code field", async () => {
    const fetchMock = mockFetch({ status: 500, body: {} });
    const api = createApiClient({ baseUrl: "http://test", fetch: fetchMock });
    await expect(api.getPosts()).rejects.toMatchObject({
      status: 500,
      code: "INTERNAL",
    });
  });

  it("falls back to HTTP <status> message when body has no error.message field", async () => {
    const fetchMock = mockFetch({ status: 503, body: { error: {} } });
    const api = createApiClient({ baseUrl: "http://test", fetch: fetchMock });
    await expect(api.getPosts()).rejects.toMatchObject({
      status: 503,
      message: "HTTP 503",
    });
  });

  it("falls back to defaults when body is not valid JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("not json", {
        status: 502,
        headers: { "Content-Type": "text/plain" },
      })
    ) as unknown as typeof fetch;
    const api = createApiClient({ baseUrl: "http://test", fetch: fetchMock });
    await expect(api.getPosts()).rejects.toMatchObject({
      status: 502,
      code: "INTERNAL",
      message: "HTTP 502",
    });
  });
});

// ---------------------------------------------------------------------------
// 401 refresh-and-retry (Slice 4 — Round 6 B18.3)
// ---------------------------------------------------------------------------

/**
 * A fetch mock that returns a sequence of responses, in order. Used to
 * simulate the 401-then-200 retry flow.
 */
function sequentialFetch(
  responses: Array<{ status: number; body?: unknown; headers?: Record<string, string> }>
): typeof fetch & {
  calls: Array<{ url: string; init: RequestInit }>;
} {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  let i = 0;
  const fn = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
    calls.push({ url, init: init ?? ({} as RequestInit) });
    const next = responses[i] ?? responses[responses.length - 1];
    i += 1;
    return Promise.resolve(
      new Response(
        next.body === undefined ? null : JSON.stringify(next.body),
        {
          status: next.status,
          headers: {
            "Content-Type": "application/json",
            ...(next.headers ?? {}),
          },
        }
      )
    );
  }) as unknown as typeof fetch & {
    calls: Array<{ url: string; init: RequestInit }>;
  };
  fn.calls = calls;
  return fn;
}

describe("createApiClient — 401 refresh-and-retry (Slice 4)", () => {
  it("does not attempt refresh when getToken returns null (default)", async () => {
    // Default config: no token → no refresh attempt → caller sees the 401.
    const fetchMock = sequentialFetch([
      { status: 401, body: { error: { code: "UNAUTHORIZED", message: "no token" } } },
    ]);
    const api = createApiClient({ baseUrl: "http://test", fetch: fetchMock });
    await expect(api.getPosts()).rejects.toMatchObject({ status: 401 });
    expect(fetchMock.calls).toHaveLength(1); // no retry
  });

  it("refreshes and retries once when an authenticated request returns 401", async () => {
    // First call: 401 (token expired). Refresh: 200 + new token. Retry: 200.
    const fetchMock = sequentialFetch([
      { status: 401, body: { error: { code: "TOKEN_EXPIRED", message: "expired" } } },
      { status: 200, body: { accessToken: "tok-new", user: { id: "u1", username: "you" } } },
      { status: 200, body: { items: [{ id: "p1" }], nextCursor: null } },
    ]);
    const api = createApiClient({
      baseUrl: "http://test",
      fetch: fetchMock,
      getToken: () => "tok-old",
      tryRefreshOn401: true,
    });
    const result = await api.getPosts();
    expect(result).toEqual({ items: [{ id: "p1" }], nextCursor: null });
    // 3 fetches: original 401, refresh POST, retry 200.
    expect(fetchMock.calls).toHaveLength(3);
    expect(fetchMock.calls[1].url).toBe("http://test/api/auth/refresh");
    expect(fetchMock.calls[1].init.method).toBe("POST");
  });

  it("does not retry when tryRefreshOn401 is false (opt-out)", async () => {
    const fetchMock = sequentialFetch([
      { status: 401, body: { error: { code: "UNAUTHORIZED", message: "no" } } },
    ]);
    const api = createApiClient({
      baseUrl: "http://test",
      fetch: fetchMock,
      getToken: () => "tok-old",
      tryRefreshOn401: false,
    });
    await expect(api.getPosts()).rejects.toMatchObject({ status: 401 });
    expect(fetchMock.calls).toHaveLength(1);
  });

  it("propagates the original 401 when refresh itself returns 401 (refresh failed)", async () => {
    // First call: 401. Refresh: also 401. No retry of the original.
    const fetchMock = sequentialFetch([
      { status: 401, body: { error: { code: "TOKEN_EXPIRED", message: "expired" } } },
      { status: 401, body: { error: { code: "REFRESH_FAILED", message: "refresh revoked" } } },
    ]);
    const api = createApiClient({
      baseUrl: "http://test",
      fetch: fetchMock,
      getToken: () => "tok-old",
      tryRefreshOn401: true,
    });
    await expect(api.getPosts()).rejects.toMatchObject({
      status: 401,
      code: "TOKEN_EXPIRED", // original error preserved
    });
    // 2 fetches: original 401, refresh 401. No retry.
    expect(fetchMock.calls).toHaveLength(2);
  });

  it("propagates the original 401 when refresh throws (network error during refresh)", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === "http://test/api/auth/refresh") {
        return Promise.reject(new TypeError("network error"));
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({ error: { code: "TOKEN_EXPIRED", message: "expired" } }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        )
      );
    }) as unknown as typeof fetch;
    const api = createApiClient({
      baseUrl: "http://test",
      fetch: fetchMock,
      getToken: () => "tok-old",
      tryRefreshOn401: true,
    });
    await expect(api.getPosts()).rejects.toMatchObject({
      status: 401,
      code: "TOKEN_EXPIRED",
    });
  });

  it("does NOT trigger refresh on the refresh() call itself (avoids infinite loop)", async () => {
    // Calling api.refresh() directly when the refresh returns 401 should
    // surface the 401, not recurse into another refresh.
    const fetchMock = sequentialFetch([
      { status: 401, body: { error: { code: "REFRESH_FAILED", message: "revoked" } } },
    ]);
    const api = createApiClient({
      baseUrl: "http://test",
      fetch: fetchMock,
      getToken: () => "tok-old",
      tryRefreshOn401: true,
    });
    await expect(api.refresh()).rejects.toMatchObject({
      status: 401,
      code: "REFRESH_FAILED",
    });
    expect(fetchMock.calls).toHaveLength(1); // no recursive refresh
  });

  it("updates the access token via onTokenRefresh callback after a successful refresh", async () => {
    const fetchMock = sequentialFetch([
      { status: 401, body: { error: { code: "TOKEN_EXPIRED", message: "expired" } } },
      { status: 200, body: { accessToken: "tok-new", user: { id: "u1", username: "you" } } },
      { status: 200, body: { items: [], nextCursor: null } },
    ]);
    let capturedToken: string | null = null;
    const api = createApiClient({
      baseUrl: "http://test",
      fetch: fetchMock,
      getToken: () => "tok-old",
      tryRefreshOn401: true,
      onTokenRefresh: (token: string) => {
        capturedToken = token;
      },
    });
    await api.getPosts();
    expect(capturedToken).toBe("tok-new");
  });

  it("does not refresh on non-401 errors (e.g. 500)", async () => {
    const fetchMock = sequentialFetch([
      { status: 500, body: { error: { code: "INTERNAL", message: "boom" } } },
    ]);
    const api = createApiClient({
      baseUrl: "http://test",
      fetch: fetchMock,
      getToken: () => "tok-old",
      tryRefreshOn401: true,
    });
    await expect(api.getPosts()).rejects.toMatchObject({ status: 500 });
    expect(fetchMock.calls).toHaveLength(1);
  });

  it("retry uses the new access token from refresh in the Authorization header", async () => {
    const fetchMock = sequentialFetch([
      { status: 401, body: { error: { code: "TOKEN_EXPIRED", message: "expired" } } },
      { status: 200, body: { accessToken: "tok-fresh", user: { id: "u1", username: "you" } } },
      { status: 200, body: { items: [], nextCursor: null } },
    ]);
    const api = createApiClient({
      baseUrl: "http://test",
      fetch: fetchMock,
      getToken: () => "tok-old", // Note: the api client uses the refreshed token internally
      tryRefreshOn401: true,
    });
    await api.getPosts();
    // 3rd call is the retry — it should have Authorization: Bearer tok-fresh
    const retryCall = fetchMock.calls[2];
    const headers = new Headers(retryCall.init.headers as HeadersInit);
    expect(headers.get("Authorization")).toBe("Bearer tok-fresh");
  });
});
