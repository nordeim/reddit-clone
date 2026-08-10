/**
 * Foundational fetch-based API client for the embers backend (Round 5).
 *
 * Purpose
 * -------
 * This module gives `apps/web` a typed, framework-agnostic client for the
 * Fastify backend at `apps/server`. It is the foundation for the deferred
 * B17–B22 frontend integration (auth provider, React Query wiring, optimistic
 * UI, notification polling) without yet coupling to any of those layers.
 *
 * Design
 * ------
 * - Pure fetch wrapper — no React, no Axios, no React Query. Can be reused
 *   inside hooks, store actions, or non-React code.
 * - Dependency-injected `fetch` and `getToken` so tests run with zero network.
 * - Typed return values mirror the Zod schemas in `@embers/shared` (imported
 *   lazily by callers — this file stays free of workspace deps to keep the
 *   test surface small).
 * - Uniform error handling: non-2xx responses throw `ApiError` carrying the
 *   structured `{ code, message, requestId }` triple from the server's
 *   errorHandler plugin (see `apps/server/src/plugins/errorHandler.ts`).
 *
 * Future integration
 * ------------------
 * - B18 (Auth Provider): callers pass `getToken: () => authCtx.accessToken`.
 * - B19 (React Query): hooks wrap these methods in `useQuery` / `useMutation`.
 * - B21 (Optimistic UI): `vote` + `createComment` will get `onMutate` rollback
 *   wrappers at the hook layer; this client stays pessimistic.
 * - B22 (Notifications): `getNotifications` will be polled on a timer.
 *
 * @packageDocumentation
 */

/** Error thrown for any non-2xx API response. Mirrors the server's errorHandler shape. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;

  constructor(
    status: number,
    code: string,
    message: string,
    requestId?: string
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

/** Constructor options. All optional — sensible defaults are applied. */
export interface ApiClientOptions {
  /**
   * Base URL of the backend. Defaults to `import.meta.env.VITE_API_URL` if
   * set, otherwise `http://localhost:4000` (the Fastify dev default).
   */
  baseUrl?: string;
  /** Fetch implementation to use. Defaults to global `fetch`. */
  fetch?: typeof fetch;
  /** Accessor for the current access token. Returning null omits the header. */
  getToken?: () => string | null;
  /**
   * When `true` (default `false`), a 401 response on an authenticated
   * request triggers a single `POST /api/auth/refresh` attempt. If the
   * refresh succeeds, the original request is retried once with the new
   * access token (which is also forwarded to `onTokenRefresh` so the
   * caller can update its in-memory token). If the refresh fails (401
   * or network error), the original 401 is propagated to the caller.
   *
   * The refresh call itself NEVER triggers a recursive refresh — this
   * is enforced by an internal `skipRefresh` flag on the request. This
   * prevents infinite loops when the refresh token is revoked.
   *
   * Round 6 B18.3.
   */
  tryRefreshOn401?: boolean;
  /**
   * Callback invoked after a successful refresh with the new access
   * token. The caller (typically `AuthProvider`) uses this to update
   * its in-memory token ref. Optional — if omitted, the refreshed
   * token is used only for the in-flight retry.
   *
   * Round 6 B18.3.
   */
  onTokenRefresh?: (token: string) => void;
}

// --- Response shapes (mirror @embers/shared Zod schemas; intentionally loose
// here so this file has zero workspace deps and stays unit-testable in
// isolation). Callers can re-cast to the branded types from @embers/shared.

export interface HealthResponse {
  status: string;
}

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  karma: number;
  createdAt: string;
  colorFrom: string;
  colorTo: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

/**
 * Response from `POST /api/auth/register`. The server creates the user
 * but does NOT establish a session — no access token, no refresh cookie.
 * The client must call `api.login()` afterwards to get a session.
 *
 * Mirrors `authUserSchema` from `@embers/shared` (Round 7 widened the
 * shape from `{ id, username }` to the full server response so the
 * Navbar can display `displayName` + `karma`).
 */
export interface RegisterResponse {
  user: AuthUser;
}

export interface Post {
  id: string;
  title: string;
  content: string | null;
  authorId: string;
  communityId: string;
  upvotes: number;
  downvotes: number;
  score: number;
  createdAt: string;
}

export interface PaginatedPosts {
  items: Post[];
  nextCursor: string | null;
}

export interface CreatePostInput {
  title: string;
  content: string;
  communityId: string;
}

export interface VoteResponse {
  targetId: string;
  value: -1 | 0 | 1;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  parentId: string | null;
  content: string;
  createdAt: string;
}

export interface CreateCommentInput {
  content: string;
  parentId: string | null;
}

export interface SearchResponse {
  posts: Post[];
  communities: Array<{ id: string; slug: string; name: string }>;
  users: AuthUser[];
}

export interface Community {
  id: string;
  slug: string;
  name: string;
  description: string | null;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  read: boolean;
  createdAt: string;
  payload: unknown;
}

// --- Internal helpers --------------------------------------------------------

function defaultBaseUrl(): string {
  // Vite injects import.meta.env at build time. The cast keeps this file
  // typecheck-clean even when consumed outside Vite (e.g. unit tests).
  const env = (import.meta as unknown as { env?: Record<string, string> }).env;
  return env?.VITE_API_URL ?? "http://localhost:4000";
}

interface ServerErrorBody {
  error?: {
    code?: string;
    message?: string;
  };
}

async function parseErrorBody(res: Response): Promise<ServerErrorBody> {
  try {
    return (await res.json()) as ServerErrorBody;
  } catch {
    return {};
  }
}

// --- Public API --------------------------------------------------------------

export function createApiClient(options: ApiClientOptions = {}) {
  const baseUrl = options.baseUrl ?? defaultBaseUrl();
  const fetchFn = options.fetch ?? fetch;
  const getToken = options.getToken ?? (() => null);
  const tryRefreshOn401 = options.tryRefreshOn401 ?? false;
  const onTokenRefresh = options.onTokenRefresh;

  /**
   * Internal request function. `skipRefresh` is set to `true` for the
   * `refresh()` method itself so it can never trigger a recursive
   * refresh (which would cause an infinite loop when the refresh token
   * is revoked).
   *
   * The refresh-and-retry flow (Round 6 B18.3):
   *   1. Caller invokes any authenticated method (e.g. `getPosts`).
   *   2. `request` adds the `Authorization: Bearer <token>` header and
   *      calls `fetch`.
   *   3. If the response is 401 AND `tryRefreshOn401` AND
   *      `getToken()` returned a token AND `skipRefresh !== true`:
   *      a. Call `refresh()` (which goes through this same `request`
   *         function but with `skipRefresh: true`).
   *      b. If refresh succeeds, capture the new access token, fire
   *         `onTokenRefresh`, and retry the original request once
   *         with the new token.
   *      c. If refresh fails (401 or network), propagate the ORIGINAL
   *         401 error to the caller — the retry never happens.
   *   4. Otherwise: standard success/error path.
   */
  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    opts: { skipRefresh?: boolean } = {}
  ): Promise<T> {
    const url = `${baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetchFn(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const requestId =
      res.headers.get("x-request-id") ?? undefined;

    if (!res.ok) {
      // Refresh-and-retry path (Round 6 B18.3).
      if (
        res.status === 401 &&
        tryRefreshOn401 &&
        !opts.skipRefresh &&
        token !== null
      ) {
        let refreshedToken: string | null = null;
        try {
          // `request` with `skipRefresh: true` to prevent recursion.
          const refreshResult = await request<LoginResponse>(
            "POST",
            "/api/auth/refresh",
            undefined,
            { skipRefresh: true }
          );
          refreshedToken = refreshResult.accessToken;
          if (onTokenRefresh) onTokenRefresh(refreshedToken);
        } catch {
          // Refresh failed — propagate the ORIGINAL 401 to the caller.
          // The refresh error is intentionally swallowed: the caller
          // only needs to know the original request failed with 401.
          const errorBody = await parseErrorBody(res).catch(
            (): ServerErrorBody => ({})
          );
          const code = errorBody.error?.code ?? "INTERNAL";
          const message = errorBody.error?.message ?? `HTTP ${res.status}`;
          throw new ApiError(res.status, code, message, requestId);
        }

        // Retry the original request once with the new token.
        // We construct a fresh headers object so the new token wins
        // over the stale one captured above.
        const retryHeaders: Record<string, string> = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${refreshedToken}`,
        };
        const retryRes = await fetchFn(url, {
          method,
          headers: retryHeaders,
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        const retryRequestId =
          retryRes.headers.get("x-request-id") ?? undefined;
        if (!retryRes.ok) {
          const retryErrorBody = await parseErrorBody(retryRes).catch(
            (): ServerErrorBody => ({})
          );
          const retryCode = retryErrorBody.error?.code ?? "INTERNAL";
          const retryMessage =
            retryErrorBody.error?.message ?? `HTTP ${retryRes.status}`;
          throw new ApiError(
            retryRes.status,
            retryCode,
            retryMessage,
            retryRequestId
          );
        }
        if (retryRes.status === 204) return undefined as T;
        return (await retryRes.json()) as T;
      }

      // Standard error path — no refresh, or refresh disabled.
      const errorBody = await parseErrorBody(res);
      const code = errorBody.error?.code ?? "INTERNAL";
      const message = errorBody.error?.message ?? `HTTP ${res.status}`;
      throw new ApiError(res.status, code, message, requestId);
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  return {
    // health
    health: () => request<HealthResponse>("GET", "/health"),

    // auth — refresh() passes skipRefresh:true to prevent infinite loops
    login: (username: string, password: string) =>
      request<LoginResponse>("POST", "/api/auth/login", { username, password }),
    register: (
      username: string,
      password: string,
      displayName?: string
    ) =>
      request<RegisterResponse>("POST", "/api/auth/register", {
        username,
        password,
        ...(displayName ? { displayName } : {}),
      }),
    logout: () => request<void>("POST", "/api/auth/logout"),
    refresh: () =>
      request<LoginResponse>("POST", "/api/auth/refresh", undefined, {
        skipRefresh: true,
      }),

    // posts
    getPosts: (cursor?: string) =>
      request<PaginatedPosts>(
        "GET",
        cursor ? `/api/posts?cursor=${encodeURIComponent(cursor)}` : "/api/posts"
      ),
    getPost: (id: string) =>
      request<Post>("GET", `/api/posts/${encodeURIComponent(id)}`),
    createPost: (input: CreatePostInput) =>
      request<Post>("POST", "/api/posts", input),

    // votes
    vote: (targetId: string, value: -1 | 0 | 1) =>
      request<VoteResponse>(
        "PUT",
        `/api/votes/${encodeURIComponent(targetId)}`,
        { value }
      ),

    // comments
    getComments: (postId: string) =>
      request<Comment[]>(
        "GET",
        `/api/posts/${encodeURIComponent(postId)}/comments`
      ),
    createComment: (postId: string, input: CreateCommentInput) =>
      request<Comment>(
        "POST",
        `/api/posts/${encodeURIComponent(postId)}/comments`,
        input
      ),

    // search
    search: (q: string) =>
      request<SearchResponse>(
        "GET",
        `/api/search?q=${encodeURIComponent(q)}`
      ),

    // communities
    getCommunities: () =>
      request<Community[]>("GET", "/api/communities"),
    getCommunity: (slug: string) =>
      request<Community>(
        "GET",
        `/api/communities/${encodeURIComponent(slug)}`
      ),

    // notifications
    getNotifications: () =>
      request<Notification[]>("GET", "/api/notifications"),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
