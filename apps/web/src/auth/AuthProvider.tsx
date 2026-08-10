import { createContext, useContext, useMemo, type ReactNode } from "react";

/**
 * AuthProvider (Round 6, B18) — React context for embers auth.
 *
 * Holds the access token in a `useRef` (NOT in state — the token must
 * not trigger re-renders on every change, only the `user`/`status`
 * triple should). Exposes `useAuth()` returning
 * `{ user, status, error, login, logout }`.
 *
 * Slice 1 (this file): initial state + stub login/logout that reject
 * with "not implemented". Later slices replace the stubs:
 *   - Slice 2: introduces `useState` for user/status/error, `login`
 *     calls `api.login(username, password)`, stores the access token,
 *     sets `user` + `status="authenticated"`.
 *   - Slice 3: `logout` calls `api.logout()`, clears the token, resets
 *     state to anonymous.
 *   - Slice 5: wires `tryRefreshOn401` on the api client so 401s on
 *     authenticated requests silently refresh and retry once.
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

export interface AuthProviderProps {
  children: ReactNode;
  /**
   * Factory for the API client. Defaults to the production factory
   * (which calls `createApiClient` from `lib/api.ts`). Tests pass a
   * stub that returns a mocked client.
   *
   * Typed loosely here so the AuthProvider module has no static import
   * on `lib/api.ts` — that keeps the Slice 1 test surface minimal and
   * lets Slice 2 swap in the real client without touching the test
   * scaffolding.
   */
  apiClientFactory?: () => unknown;
}

/**
 * Top-level auth provider. Wrap `<App />` (or `<HashRouter>`) with this
 * so every route can read auth state via `useAuth()`.
 *
 * Slice 1: returns a static context value with stub login/logout that
 * reject with "not implemented". Slice 2 introduces real state.
 */
export function AuthProvider({ children }: AuthProviderProps): ReactNode {
  // Slice 1: state is a constant. Slice 2 will replace this with
  // `useState` so `login`/`logout` can mutate it.
  const user: AuthUser | null = null;
  const status: AuthStatus = "anonymous";
  const error: string | null = null;

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      error,
      login: async () => {
        throw new Error("not implemented");
      },
      logout: async () => {
        throw new Error("not implemented");
      },
    }),
    [user, status, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
