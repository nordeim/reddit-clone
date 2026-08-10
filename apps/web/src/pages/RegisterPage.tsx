import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

/**
 * RegisterPage (Round 7, B18.6) — the account creation form.
 *
 * Renders username + password + confirm-password + optional display-name
 * fields. On submit:
 *   1. Client-side validation (username ≥3, password ≥8, passwords match).
 *   2. Call `useAuth().register(username, password, displayName)`.
 *   3. On 201, call `useAuth().login(username, password)` — the register
 *      endpoint returns `{ user }` only, no session, so the client must
 *      login to establish a session.
 *   4. On success, navigate to "/".
 *   5. On error (409 username taken, 422 invalid input, network), show
 *      an alert with the server's error message.
 *
 * The page is rendered at `/register` (added to App.tsx in the same slice)
 * and lives outside `AppShell` so it has no sidebar/navbar — parallel to
 * `/login`.
 *
 * Accessibility (WCAG 2.2 AA):
 *   - Each input has a `<label htmlFor>` pointing at its `id`.
 *   - The submit button has `aria-busy` while submitting.
 *   - Errors render in an element with `role="alert"`.
 *   - The form is keyboard-navigable (native `<form>` + `<button>`).
 *
 * @packageDocumentation
 */

export function RegisterPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    // Client-side validation — mirrors the server's registerInputSchema
    // (username 3-30, password 8-256) plus a confirm-password match.
    if (username.length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      // Step 1: register (returns { user } — no session).
      await auth.register(username, password, displayName || undefined);
      // Step 2: login to establish a session (access token + refresh cookie).
      await auth.login(username, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6 text-center">
          Create your embers account
        </h1>

        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 space-y-4"
          noValidate
        >
          <div className="space-y-1">
            <label
              htmlFor="register-username"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Username
            </label>
            <input
              id="register-username"
              name="username"
              type="text"
              autoComplete="username"
              required
              minLength={3}
              maxLength={30}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={submitting}
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="register-display-name"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Display name <span className="text-zinc-400">(optional)</span>
            </label>
            <input
              id="register-display-name"
              name="displayName"
              type="text"
              autoComplete="nickname"
              maxLength={50}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={submitting}
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="register-password"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Password
            </label>
            <input
              id="register-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="register-confirm-password"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Confirm password
            </label>
            <input
              id="register-confirm-password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            disabled={
              submitting ||
              username.length === 0 ||
              password.length === 0 ||
              confirmPassword.length === 0
            }
            aria-busy={submitting}
            className="w-full rounded-md bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-4 py-2 transition-colors"
          >
            {submitting ? "Creating account…" : "Sign up"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-orange-600 hover:text-orange-700 dark:text-orange-500 dark:hover:text-orange-400"
          >
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
