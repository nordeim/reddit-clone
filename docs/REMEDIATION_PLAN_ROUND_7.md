# REMEDIATION_PLAN_ROUND_7.md

> **Round 7 (2026-08-10):** Complete the B18 auth flow (register page +
> auth-aware navbar + route guard) and add E2E coverage for the auth
> lifecycle. This round does **not** execute B17 (build refactor) —
> that remains deferred because removing `vite-plugin-singlefile` and
> switching to `BrowserRouter` would break the "deploy anywhere" story
> (GitHub Pages, `python -m http.server`, S3 without SPA fallback) that
> the README heavily promotes. B17 needs explicit user confirmation
> before execution. Round 7 instead closes the gap left by Round 6:
> the AuthProvider exists but the UI still shows the hardcoded
> `CURRENT_USER`, the auth flow has no `/register` page, and protected
> routes have no guard.

---

## 1. Scope and Sequencing Decision

### 1.1 What Round 6 left on the table

Round 6 (`docs/REMEDIATION_PLAN_ROUND_6.md`) landed the AuthProvider +
`useAuth()` hook + `/login` page + 401 refresh-and-retry in the api
client. But the auth flow is incomplete:

| Gap | Impact |
| --- | --- |
| `Navbar.tsx` still imports `CURRENT_USER` from `data/users.ts` and renders the hardcoded demo identity. The "Log out (demo)" button is cosmetic — it doesn't call `useAuth().logout`. | The auth state from the AuthProvider is invisible to the user. Logging in via `/login` succeeds but the navbar still shows `u-me`. |
| No `/register` page exists. | Users cannot create new accounts through the UI. The `/api/auth/register` endpoint works (covered by E2E smoke test #2) but there's no frontend form. |
| No `<RequireAuth>` route guard. | Protected routes (e.g., `/notifications`, post creation) are accessible to anonymous users — they just show the deterministic demo data. There's no redirect-to-`/login` pattern. |
| No E2E coverage for the auth lifecycle (register → login → logout → login again). | The existing 9 E2E smoke tests hit the server's REST API directly via Playwright's `request` fixture. They don't exercise the React auth flow. |

### 1.2 Why not B17 (build refactor) in Round 7?

B17 is the official next item on the deferred backlog (`docs/REMEDIATION_PLAN.md`
line 251). It calls for:

1. Remove `vite-plugin-singlefile` from `apps/web/vite.config.ts`.
2. Switch `HashRouter` → `BrowserRouter` in `apps/web/src/App.tsx`.
3. Enable route-based code splitting.

After validating B17 against the codebase, I'm deferring it again because:

- **ADR-003 (single-file build) is load-bearing for the README's deployment
  story.** `README.md` lines 244-263 explicitly promote GitHub Pages,
  Netlify/Vercel, S3/R2/GCS, and `python -m http.server` as deployment
  targets — all of which work with a single `dist/index.html` and
  `HashRouter`. Removing `viteSingleFile()` and switching to
  `BrowserRouter` breaks `python -m http.server` and GitHub Pages (without
  a `404.html` workaround) for deep links. This is a major architectural
  reversal that needs explicit user confirmation.
- **B17's blast radius is larger than the Round 5 plan estimated.** The
  plan said "~10 existing tests need updating" but a grep shows zero
  tests assert `HashRouter` semantics (all component tests use
  `MemoryRouter`). The actual blast radius is the production deployment
  story + the `PostCard.tsx` share-link builder (line 29: builds a
  `#/comments/${post.id}` URL for clipboard).
- **B17 is not a prerequisite for closing the B18 gap.** The auth-aware
  navbar, register page, and route guard all work under `HashRouter` as
  `#/register`, `#/notifications`, etc. B17 can land in a future round
  without blocking this round.

This sequencing decision is consistent with the `deprecation-and-migration`
skill (in `skills/`): "Default to advisory. Use compulsory only when the
maintenance cost or risk justifies forcing migration." B17 is a compulsory
deprecation of ADR-003/004 — it should not be forced without explicit user
sign-off.

### 1.3 What Round 7 does instead

Round 7 closes the B18 gap with five TDD slices:

1. **`/register` page** — form parallel to `/login`, calls
   `api.register()` then `api.login()` (because the register endpoint
   returns `{ user }` only, no session — the client must login after
   register).
2. **Auth-aware Navbar** — replace the hardcoded `CURRENT_USER` with
   `useAuth()`. When anonymous: show "Log in" + "Sign up" links. When
   authenticated: show the user's avatar + username + karma, with a
   real "Log out" button that calls `useAuth().logout`.
3. **`<RequireAuth>` route guard** — a wrapper component that redirects
   to `/login` when `useAuth().status !== "authenticated"`. Applied to
   `/notifications` as the first protected route (the others stay open
   for now — they render deterministic demo data when anonymous).
4. **E2E auth lifecycle tests** — extend `e2e/smoke.spec.ts` (or add a
   new `e2e/auth.spec.ts`) with tests that exercise register → login →
   logout → login again through the REST API. These don't render the
   React app (the existing E2E setup only starts the Fastify server),
   but they verify the server-side auth contract that the React flow
   depends on.
5. **Documentation alignment** — update AGENTS.md, CLAUDE.md, README.md,
   PAD, and REMEDIATION_PLAN.md to reflect the completed B18 + the
   added E2E coverage.

### 1.4 What is explicitly out of scope for Round 7

- **B17 (build refactor)** — deferred to a future round, pending user
  confirmation. The single-file build + HashRouter remain in force.
- **B19 (React Query)** — depends on B17 (or a decision to keep
  HashRouter permanently). Deferred.
- **B20–B22** — depend on B19. Deferred.
- **Migrating the deterministic `src/data/*` layer to API calls** —
  that's B19/B20. Round 7 leaves the deterministic data layer untouched.
  The auth-aware navbar will show the real authenticated user (from
  `useAuth()`) but everything else (posts, comments, communities,
  notifications) continues to come from the deterministic generators.
- **Backend changes** — none. The server already implements
  `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, and
  `/api/auth/refresh` with refresh-token rotation, HttpOnly cookies,
  and rate limiting.

---

## 2. Round 7 ToDo List (TDD-driven, atomic commits per slice)

Each slice follows RED → GREEN → REFACTOR. Each slice ends with a
verification gate (`npm run lint && npm run typecheck && npm test`) and
an atomic commit on `main`. Slices are ordered so that the codebase is
fully working after each commit.

### Slice 1 — `/register` page

| Field | Value |
| --- | --- |
| RED test | `apps/web/src/pages/RegisterPage.test.tsx`: render `<RegisterPage />` inside `<MemoryRouter>` + `<AuthProvider>` with a stub api client. Assert: form has username + password + confirm-password + display-name fields. Submitting calls `api.register()` then `api.login()`. On success, navigates to `/`. On 409 (username taken), shows error alert. On 422 (invalid input), shows error alert. Loading state disables the button. |
| GREEN impl | Create `apps/web/src/pages/RegisterPage.tsx`. Form with username, password, confirmPassword, displayName (optional). Client-side validation: username ≥3 chars, password ≥8 chars, passwords match. On submit: call `api.register(username, password, displayName)` → on 201, call `api.login(username, password)` → on 200, navigate to `/`. On error: show alert with the server's error message. Add `/register` route to `App.tsx` outside `AppShell` (parallel to `/login`). |
| Verify | `npm test --workspace @embers/web` — new tests pass, existing 237 tests still pass |
| Commit | `feat(web): add /register page with login-after-register flow (B18.6, Round 7 Slice 1)` |

**Critical contract:** the `/api/auth/register` endpoint returns `{ user }`
(201) — it does **not** return an access token or set a refresh cookie.
The RegisterPage must call `api.login()` after a successful register to
establish a session. This is verified by the existing E2E smoke test #2
(`e2e/smoke.spec.ts` lines 31-61).

### Slice 2 — Auth-aware Navbar

| Field | Value |
| --- | --- |
| RED test | `apps/web/src/components/layout/Navbar.test.tsx`: render `<Navbar />` inside `<AuthProvider>` with a stub api client. Assert: (a) when anonymous, shows "Log in" and "Sign up" links pointing to `/login` and `/register`. (b) when authenticated, shows the user's avatar (using `useAuth().user.username` as the seed) and a "Log out" button. (c) clicking "Log out" calls `useAuth().logout()` and the navbar re-renders to the anonymous state. |
| GREEN impl | Modify `apps/web/src/components/layout/Navbar.tsx`: replace the `CURRENT_USER` import with `useAuth()`. When `status === "anonymous"`: render `<Link to="/login">Log in</Link>` + `<Link to="/register">Sign up</Link>` in place of the account dropdown. When `status === "authenticated"`: render the avatar with `user.username` as the seed, the dropdown header shows `u/${user.username}`, and the "Log out" item calls `auth.logout()`. The deterministic `CURRENT_USER` is no longer used by the navbar (but remains in `data/users.ts` for the deterministic feed/comments/notifications layer — that's B19/B20's problem). |
| Verify | `npm test --workspace @embers/web` — new tests pass, existing tests still pass. The `CreatePostModal` and `NotificationsPanel` still use the deterministic data layer — they're unaffected. |
| Commit | `feat(web): make Navbar auth-aware (replace hardcoded CURRENT_USER with useAuth) (B18.7, Round 7 Slice 2)` |

### Slice 3 — `<RequireAuth>` route guard

| Field | Value |
| --- | --- |
| RED test | `apps/web/src/auth/RequireAuth.test.tsx`: render `<RequireAuth><Protected /></RequireAuth>` inside `<MemoryRouter>` + `<AuthProvider>`. Assert: (a) when anonymous, redirects to `/login` (the `<Protected />` component is NOT rendered, and the URL becomes `/login`). (b) when authenticated, renders `<Protected />`. (c) preserves the intended destination in location state so `/login` can redirect back after successful login (e.g., `navigate("/login", { state: { from: "/notifications" } })`). |
| GREEN impl | Create `apps/web/src/auth/RequireAuth.tsx`. A wrapper component that reads `useAuth()`. If `status !== "authenticated"`, render `<Navigate to="/login" state={{ from: location }} replace />`. Otherwise, render `<Outlet />` (for nested routes) or `children`. Apply to the `/notifications` route in `App.tsx` as the first protected route. |
| Verify | `npm test --workspace @embers/web` — new tests pass, existing tests still pass. |
| Commit | `feat(web): add RequireAuth route guard + protect /notifications (B18.8, Round 7 Slice 3)` |

### Slice 4 — E2E auth lifecycle tests

| Field | Value |
| --- | --- |
| RED test | New file `e2e/auth.spec.ts`: extend the E2E suite with tests that exercise the full auth lifecycle through the REST API (the E2E setup only starts the Fastify server, not the React app — so these are API-level lifecycle tests, not browser-level). Tests: (a) register a new user → login → access a protected endpoint (`GET /api/notifications` with the access token) → 200. (b) register → login → logout → access protected endpoint → 401. (c) register → login → wait 16min (skip — can't wait in CI) → instead: login with a manually-expired token → 401 → refresh → 200. (d) register with a taken username → 409. (e) login with wrong password → 401. |
| GREEN impl | Create `e2e/auth.spec.ts`. Reuse the `request` fixture pattern from `e2e/smoke.spec.ts`. The tests don't need a browser — they verify the server-side auth contract that the React auth flow depends on. |
| Verify | `npm run test:e2e` — all 9 existing smoke tests + new auth lifecycle tests pass. |
| Commit | `test(e2e): add auth lifecycle suite (register → login → logout → refresh) (B18.9, Round 7 Slice 4)` |

### Slice 5 — Documentation alignment + final verification

| Field | Value |
| --- | --- |
| Step | B18.10 |
| Work | Update `AGENTS.md` (Navbar section + new routes + RequireAuth), `CLAUDE.md` (test count bump + Round 7 additions), `README.md` (test count bump + new routes), `docs/Project-Architecture-Document.md` (Key Files + ADR table + routes), `docs/REMEDIATION_PLAN.md` (B18 marked [x] done with Round 7 changelog). Create `docs/REMEDIATION_PLAN_ROUND_7.md` (this document). |
| Verify | Full suite: `npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build`. |
| Commit | `docs: align AGENTS/CLAUDE/README/PAD/REMEDIATION_PLAN with Round 7 (B18 complete)` |

---

## 3. Risk Assessment and Rollback

### 3.1 Risks

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Navbar changes break existing component tests | Medium | Medium | The existing tests don't assert Navbar behavior (no `Navbar.test.tsx` exists today). Slice 2 adds the first Navbar tests. The deterministic `CURRENT_USER` import is removed from Navbar but stays in `data/users.ts` for other consumers. |
| RequireAuth breaks `/notifications` for anonymous users | Low | Medium | The route guard redirects to `/login` with `state: { from: "/notifications" }` so the user returns after login. The existing deterministic `NotificationsPage` still renders the seeded notifications once authenticated — no data layer change. |
| RegisterPage's login-after-register flow races | Low | High | The flow is sequential: `await api.register()` → `await api.login()`. The 201 response from register does NOT set a session, so there's no race. The E2E test in Slice 4 verifies this contract server-side. |
| E2E auth tests conflict with existing smoke tests | Low | Low | Both suites use the same seeded DB. The auth tests use unique usernames (`e2e-auth-${Date.now()}-${random}`) to avoid collisions with the smoke test's register. The `workers: 1` config in `playwright.config.ts` ensures sequential execution. |
| Lint fails on new files | Low | Low | ESLint config already covers `apps/web/src/**/*.{ts,tsx}` and `e2e/**/*.ts`. Run `npm run lint` after each slice. |

### 3.2 Rollback

Each slice is one atomic commit on `main`. If a slice breaks the build or
tests, `git revert <sha>` restores the previous known-good state. Slices
are ordered so that the codebase is fully working after each commit —
there are no "intermediate" broken states.

---

## 4. Definition of Done — Round 7

| DoD line | How verified |
| --- | --- |
| 0 TypeScript errors | `npm run typecheck` clean |
| 0 ESLint warnings | `npm run lint` clean |
| All existing tests pass | `npm test` — 428 prior + new tests, all green |
| All existing E2E tests pass | `npm run test:e2e` — 9 prior + new auth tests, all green |
| New tests cover B18 acceptance criteria | TDD: every slice ships with RED → GREEN evidence |
| `npm run build` succeeds | Topological build green |
| `dist/` not tracked | `git ls-files \| grep -E '(^\\|/)dist/' \| wc -l` returns 0 |
| Docs aligned | AGENTS.md, CLAUDE.md, README.md, Project-Architecture-Document.md, REMEDIATION_PLAN.md updated |
| Atomic commits | One commit per slice, descriptive messages, no mixing of unrelated changes |

---

## 5. Files to be added/modified in Round 7

| File | Status | Purpose |
| --- | --- | --- |
| `apps/web/src/pages/RegisterPage.tsx` | New | Register form with login-after-register flow |
| `apps/web/src/pages/RegisterPage.test.tsx` | New | TDD tests for RegisterPage |
| `apps/web/src/components/layout/Navbar.tsx` | Modified | Replace `CURRENT_USER` with `useAuth()`; add login/signup links when anonymous |
| `apps/web/src/components/layout/Navbar.test.tsx` | New | TDD tests for auth-aware Navbar |
| `apps/web/src/auth/RequireAuth.tsx` | New | Route guard that redirects to `/login` when anonymous |
| `apps/web/src/auth/RequireAuth.test.tsx` | New | TDD tests for RequireAuth |
| `apps/web/src/App.tsx` | Modified | Add `/register` route; wrap `/notifications` in `<RequireAuth>` |
| `e2e/auth.spec.ts` | New | E2E auth lifecycle tests (register → login → logout → refresh) |
| `AGENTS.md` | Modified | Navbar section + new routes + RequireAuth docs |
| `CLAUDE.md` | Modified | Test count bump + Round 7 additions |
| `README.md` | Modified | Test count bump + new routes |
| `docs/Project-Architecture-Document.md` | Modified | Key Files + ADR table + routes |
| `docs/REMEDIATION_PLAN.md` | Modified | B18 marked [x] done with Round 7 changelog |
| `docs/REMEDIATION_PLAN_ROUND_7.md` | New | This document |
