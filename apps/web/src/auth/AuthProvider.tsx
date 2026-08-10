import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * AuthProvider (Round 6, B18) — React context for embers auth.
 *
 * Holds the access token in a `useRef` (NOT in state — the token must
 * not trigger re-renders on every change, only the `user`/`status`
 * triple should). Exposes `useAuth()` returning
 * `{ user, status, error, login, logout }`.
 *
 * Slice 1: initial state + stub login/logout that reject with
 * "not implemented".
 * Slice 2: `login` calls `api.login(username, password)`, stores the
 * access token in a ref, sets `user` + `status="authenticated"`.
 * Slice 3: `logout` calls `api.logout()`, clears the token ref, resets
 * state to anonymous.
 * Slice 5 (this file): wires `tryRefreshOn401` on the api client so
 * 401s on authenticated requests silently refresh and retry once.
 * The factory signature changed from `() => unknown` to
 * `(opts) => AuthApiClient` so the AuthProvider can pass the live
 * `getToken` accessor, the `tryRefreshOn401: true` flag, and the
 * `onTokenRefresh` callback that updates the token ref.
 *
 * Production code (main.tsx) passes a factory that calls
 * `createApiClient` from `lib/api.ts` with the options it receives.
 *
 * @packageDocumentation
 */

/** The authenticated user. `null` when anonymous. */
export interface AuthUser {
  id: string;
  username: string;
}

/** Session status — drives UI conditionals (login button vs. avatar). */
export type AuthStatus = "anonymous" | "authenticated" | "loading";

/**
 * The shape of `useAuth()`. All consumers of the auth context see this
 * object. Functions are stable across renders (useMemo).
 */
export interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  /** Human-readable error from the last failed login/refresh attempt. */
  error: string | null;
  /** Submit credentials. Rejects on network error or wrong password. */
  login: (username: string, password: string) => Promise<void>;
  /** Revoke the session. Always resolves — even if the server call fails. */
  logout: () => Promise<void>;
}

/**
 * Options the AuthProvider passes to the api client factory. These map
 * 1:1 to `ApiClientOptions.getToken` / `tryRefreshOn401` /
 * `onTokenRefresh` from `lib/api.ts`. The AuthProvider owns the
 * `tokenRef` and exposes these accessors so the api client can read
 * and update the live token without re-creating the client on every
 * render.
 *
 * Round 6 B18.3 / B18.5.
 */
export interface AuthApiClientOptions {
  /** Returns the current access token (null when anonymous). */
  getToken: () => string | null;
  /** Always `true` when the AuthProvider is in charge. */
  tryRefreshOn401: true;
  /** Updates the AuthProvider's internal token ref. */
  onTokenRefresh: (token: string) => void;
}

/**
 * The minimal subset of the `ApiClient` (from `lib/api.ts`) that
 * `AuthProvider` actually calls.
 */
export interface AuthApiClient {
  login: (
    username: string,
    password: string
  ) => Promise<{ accessToken: string; user: AuthUser }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Read the auth context. Throws if called outside `<AuthProvider>` —
 * this is the standard React context-safety pattern, surfacing the
 * mistake at the call site rather than failing later with `null`.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error("useAuth() must be called inside <AuthProvider>");
  }
  return ctx;
}

export interface AuthProviderProps {
  children: ReactNode;
  /**
   * Factory that receives the auth options and returns an api client.
   * Production code (main.tsx) wires this to `createApiClient` from
   * `lib/api.ts`:
   *
   * ```tsx
   * <AuthProvider apiClientFactory={(opts) => createApiClient(opts)}>
   *   <App />
   * </AuthProvider>
   * ```
   *
   * Tests pass a stub factory that captures the options and returns
   * a mocked client.
   */
  apiClientFactory: (opts: AuthApiClientOptions) => AuthApiClient;
}

/**
 * Top-level auth provider. Wrap `<App />` (or `<HashRouter>`) with this
 * so every route can read auth state via `useAuth()`.
 */
export function AuthProvider({
  children,
  apiClientFactory,
}: AuthProviderProps): ReactNode {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("anonymous");
  const [error, setError] = useState<string | null>(null);

  // The access token is stored in a ref so it can be read synchronously
  // by `getToken` callbacks (Slice 5) without triggering re-renders.
  const tokenRef = useRef<string | null>(null);

  // Stable accessors — same identity across renders so the api client
  // doesn't need to be re-created when the token changes.
  const getToken = useCallback(() => tokenRef.current, []);
  const onTokenRefresh = useCallback((token: string) => {
    tokenRef.current = token;
  }, []);

  // Build the api client once. The factory receives the stable
  // accessors — they read/write the ref, so the client sees the live
  // token without needing to be rebuilt.
  const client = useMemo(
    () =>
      apiClientFactory({
        getToken,
        tryRefreshOn401: true,
        onTokenRefresh,
      }),
    [apiClientFactory, getToken, onTokenRefresh]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      error,
      login: async (username: string, password: string) => {
        setStatus("loading");
        setError(null);
        try {
          const { accessToken, user: loggedInUser } = await client.login(
            username,
            password
          );
          tokenRef.current = accessToken;
          setUser(loggedInUser);
          setStatus("authenticated");
        } catch (err) {
          // Revert state and surface the error message.
          tokenRef.current = null;
          setUser(null);
          setStatus("anonymous");
          setError(err instanceof Error ? err.message : String(err));
          throw err;
        }
      },
      logout: async () => {
        // No-op when already anonymous — saves a network call and avoids
        // setting an error if the user double-logs-out.
        if (status === "anonymous" && user === null) {
          return;
        }
        // Best-effort: clear client-side state regardless of whether the
        // server-side revocation succeeds. A failed /logout should not
        // leave the user stuck authenticated client-side.
        try {
          await client.logout();
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
        } finally {
          tokenRef.current = null;
          setUser(null);
          setStatus("anonymous");
        }
      },
    }),
    [user, status, error, client]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
