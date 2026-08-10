import {
  createContext,
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
 * Slice 2 (this file): `login` calls `api.login(username, password)`,
 * stores the access token in a ref, sets `user` + `status="authenticated"`.
 * Slice 3 (next): `logout` calls `api.logout()`, clears the token ref,
 * resets state to anonymous.
 * Slice 5 (later): wires `tryRefreshOn401` on the api client so 401s
 * on authenticated requests silently refresh and retry once.
 *
 * The provider accepts an optional `apiClientFactory` prop so tests can
 * inject a stub `createApiClient`. Production code (main.tsx) uses the
 * default factory which calls `createApiClient` from `lib/api.ts`.
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

/**
 * The minimal subset of the `ApiClient` (from `lib/api.ts`) that
 * `AuthProvider` actually calls. The factory returns `unknown` from
 * the public prop type to keep this module decoupled from `lib/api.ts`
 * at the type level, but internally we cast to this interface.
 *
 * Slice 5 will widen this to include `refresh`.
 */
interface AuthApiClient {
  login: (
    username: string,
    password: string
  ) => Promise<{ accessToken: string; user: AuthUser }>;
  logout: () => Promise<void>;
}

export interface AuthProviderProps {
  children: ReactNode;
  /**
   * Factory for the API client. Defaults to a factory that throws
   * "not implemented" — production code (main.tsx) passes the real
   * factory which calls `createApiClient` from `lib/api.ts`. Tests
   * pass a stub that returns a mocked client.
   *
   * Typed as `() => unknown` so the AuthProvider module has no static
   * import on `lib/api.ts` — this keeps the test surface minimal and
   * lets tests inject stubs without importing the real client.
   */
  apiClientFactory?: () => unknown;
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

  const value = useMemo<AuthContextValue>(() => {
    /**
     * Lazily instantiate the api client on first login. If the caller
     * didn't pass a factory, reject loudly so the mistake surfaces at
     * the call site rather than causing a silent no-op.
     */
    function getClient(): AuthApiClient {
      if (!apiClientFactory) {
        throw new Error(
          "AuthProvider: apiClientFactory is required (Slice 2). main.tsx must pass createApiClient from lib/api.ts."
        );
      }
      return apiClientFactory() as AuthApiClient;
    }

    return {
      user,
      status,
      error,
      login: async (username: string, password: string) => {
        setStatus("loading");
        setError(null);
        try {
          const client = getClient();
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
          const client = getClient();
          await client.logout();
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
        } finally {
          tokenRef.current = null;
          setUser(null);
          setStatus("anonymous");
        }
      },
    };
  }, [user, status, error, apiClientFactory]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
