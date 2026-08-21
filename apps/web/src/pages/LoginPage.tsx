import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

/**
 * Only allow in-app paths as a post-login destination.
 * Rejects protocol-relative (`//evil`) and absolute (`https://…`) URLs
 * so `state.from` cannot be used as an open redirect.
 */
export function safePostLoginPath(from: unknown): string {
  if (typeof from !== "string") return "/";
  if (!from.startsWith("/")) return "/";
  if (from.startsWith("//")) return "/";
  if (from.startsWith("/\\")) return "/";
  return from;
}

/**
 * LoginPage (Round 6, B18.4) — the entry point for real authentication.
 *
 * Renders a username + password form, calls `useAuth().login` on submit,
 * shows loading + error states, and navigates to `state.from` (or "/")
 * on success. `state.from` is sanitized against open redirects.
 *
 * The page is rendered at `/login` (added to App.tsx in the same slice)
 * and lives outside `AppShell` so it has no sidebar/navbar. The
 * HashRouter makes the URL `#/login` — B17 will switch to BrowserRouter
 * + clean `/login` in a future round.
 *
 * Accessibility (WCAG 2.2 AA):
 *   - Each input has a `<label htmlFor>` pointing at its `id`.
 *   - The submit button has `aria-busy` while submitting.
 *   - Errors render in an element with `role="alert"`.
 *   - The form is keyboard-navigable (native `<form>` + `<button>`).
 *
 * @packageDocumentation
 */

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // `auth.error` is the source of truth for the latest auth error, but
  // we also keep a local `error` state so the page can clear it
  // immediately when the user starts a new submission (better UX than
  // waiting for the next login attempt to clear the context-level error).
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await auth.login(username, password);
      const from =
        location.state && typeof location.state === "object"
          ? (location.state as { from?: unknown }).from
          : undefined;
      navigate(safePostLoginPath(from), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6 text-center">
          Log in to embers
        </h1>

        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 space-y-4"
          noValidate
        >
          <div className="space-y-1">
            <label
              htmlFor="login-username"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Username
            </label>
            <input
              id="login-username"
              name="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={submitting}
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="login-password"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Password
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-md px-3 py-2"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || username.length === 0 || password.length === 0}
            aria-busy={submitting}
            className="w-full rounded-md bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-4 py-2 transition-colors"
          >
            {submitting ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Demo credentials: <code className="font-mono">you</code> /{" "}
          <code className="font-mono">embers-demo</code>
        </p>
        <p className="mt-2 text-center text-sm text-zinc-500 dark:text-zinc-400">
          New here?{" "}
          <Link
            to="/register"
            className="font-medium text-orange-600 hover:text-orange-700 dark:text-orange-500 dark:hover:text-orange-400"
          >
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
