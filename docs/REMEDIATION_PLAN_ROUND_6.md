# REMEDIATION_PLAN_ROUND_6.md

> **Round 6 (2026-08-10):** Frontend integration kickoff — execute Phase B18
> (Auth Provider) from the Round 5 TDD breakdown. This is the first
> end-user-visible step of the deferred B17–B22 frontend integration: it wires
> the Round 5 `apps/web/src/lib/api.ts` client into a React context, adds a
> real `/login` page, and adds 401-refresh-retry logic to the API client —
> all without breaking the existing deterministic data layer or the 9 e2e
> smoke tests.

---

## 1. Scope and Sequencing Decision

### 1.1 What Round 5 left on the table

`docs/REMEDIATION_PLAN_ROUND_5.md` §2 lists six deferred phases (B17–B22)
totalling 28–39 hours of estimated engineering effort. They form a strict
dependency chain:

```
B17 (build refactor) ──► B18 (auth provider) ──► B19 (React Query)
                                                      │
                                                      ▼
                                                  B20 (feeds+search)
                                                      │
                                                      ▼
                                          B21 (optimistic UI) + B22 (notifications)
```

B17 (remove `vite-plugin-singlefile`, switch to `BrowserRouter`) is the
keystone of the chain as written — but it is also the highest-risk step:
it breaks the "deploy anywhere" story in `README.md`, forces every
consumer to configure SPA fallback routing, and invalidates ~10 existing
web tests that assume `HashRouter` history semantics.

### 1.2 Why B18 first, not B17

After validating the Round 5 plan against the codebase, **B18 can be
executed independently of B17** with three adjustments:

1. The `/login` route works equally well under `HashRouter` (it becomes
   `#/login`) — no router swap required.
2. The 401-refresh-retry logic is added to `apps/web/src/lib/api.ts` as
   an opt-in `tryRefreshOn401` flag. Existing callers (which pass no
   `getToken`) never trigger the refresh path, so the 22 existing
   `api.test.ts` tests remain valid.
3. The new `AuthProvider` is wrapped around `<App />` in `main.tsx` but
   is purely additive: pages that don't call `useAuth()` are unaffected.
   The deterministic `src/data/*` layer, the Zustand store, and the
   simulated latency all continue to work as documented in ADR-001/002.

This sequencing decision trades a small amount of architectural purity
(B17 first would let us drop `HashRouter` and the single-file plugin in
one stroke) for a much smaller blast radius and a clean reversible
commit chain. B17 becomes a future round that can lean on the auth
context introduced here.

### 1.3 What is explicitly out of scope for Round 6

- **B17 (build refactor)** — deferred to Round 7. The single-file build
  remains in force. LoginPage works under `HashRouter`.
- **B19–B22** — depend on B17 (or at minimum on a decision to keep
  `HashRouter` permanently). Deferred.
- **Prettier, gitleaks, ZAP/DAST** — DoD gaps from Round 5 §3. Tracked
  separately; not addressed here.
- **Backend changes** — none. The server already implements the auth
  endpoints (`POST /api/auth/login`, `POST /api/auth/refresh`,
  `POST /api/auth/logout`) with refresh-token rotation, HttpOnly cookies,
  and rate limiting. Round 6 is frontend-only.

---

## 2. B18 ToDo List (TDD-driven, atomic commits per slice)

Each slice follows RED → GREEN → REFACTOR. Each slice ends with a
verification gate (`npm run lint && npm run typecheck && npm test`) and
an atomic commit on `main`. Slices are ordered so that the codebase is
fully working after each commit.

### Slice 1 — `AuthProvider` skeleton (initial state)

| Field | Value |
| --- | --- |
| Step | B18.1 |
| RED test | `apps/web/src/auth/AuthProvider.test.tsx`: render `<AuthProvider><Probe /></AuthProvider>`, assert `useAuth()` returns `{ user: null, status: "anonymous", error: null, login: fn, logout: fn }` |
| GREEN impl | Create `apps/web/src/auth/AuthProvider.tsx` exporting `AuthProvider`, `useAuth()`, `AuthContext`. Initial state: `user=null`, `status="anonymous"`. `login`/`logout` are stubs that throw `new Error("not implemented")`. |
| Verify | `npm test --workspace @embers/web` — new test passes, existing 198 tests still pass |
| Commit | `feat(web): add AuthProvider skeleton with useAuth hook (B18.1)` |

### Slice 2 — `login()` wires to `api.login()`

| Field | Value |
| --- | --- |
| Step | B18.2 |
| RED test | `AuthProvider.test.tsx`: render provider, call `login("you", "embers-demo")` with a mocked `createApiClient` whose `login` resolves to `{ accessToken: "tok", user: { id: "u-1", username: "you" } }`. Assert `useAuth().status === "authenticated"` and `useAuth().user.username === "you"` after settle. |
| GREEN impl | Replace stub `login` with real impl that calls `api.login(username, password)`, stores `accessToken` in a `useRef`, sets `user` + `status="authenticated"`. Inject `createApiClient` via a `AuthProviderProps.apiClientFactory` so tests can mock. |
| Verify | `npm test --workspace @embers/web` — both AuthProvider tests pass, no regressions |
| Commit | `feat(web): wire AuthProvider.login to api client (B18.2)` |

### Slice 3 — `logout()` clears state

| Field | Value |
| --- | --- |
| Step | B18.2b |
| RED test | `AuthProvider.test.tsx`: after a successful login, call `logout()`. Assert `status === "anonymous"`, `user === null`, `accessToken` ref is cleared, and `api.logout` was called. |
| GREEN impl | Add `logout` impl that calls `api.logout()`, clears the token ref, resets state to anonymous. |
| Verify | Full test suite + lint + typecheck |
| Commit | `feat(web): implement AuthProvider.logout (B18.2b)` |

### Slice 4 — 401 refresh-and-retry in `api.ts`

| Field | Value |
| --- | --- |
| Step | B18.3 |
| RED test | Extend `apps/web/src/lib/api.test.ts`: when `getToken` returns a token and the server returns 401, the client should automatically call `refresh()` once and retry the original request. If the retry succeeds, the caller sees the success result. If the retry also 401s, the caller sees the 401 `ApiError`. Use a mock `fetch` that returns 401 once then 200. |
| GREEN impl | Add `tryRefreshOn401?: boolean` (default `true`) to `ApiClientOptions`. In `request<T>()`, on `res.status === 401 && !alreadyRetried && tryRefreshOn401 && getToken()`, call an internal `refresh()` then re-run the original request once. Add `_retried` flag to prevent infinite loops. |
| Verify | `npm test --workspace @embers/web` — all 22 existing api tests still pass + new refresh tests pass |
| Commit | `feat(web): add 401 refresh-and-retry to api client (B18.3)` |

### Slice 5 — Wire `AuthProvider` to use the refresh path

| Field | Value |
| --- | --- |
| Step | B18.3b |
| RED test | `AuthProvider.test.tsx`: simulate a 401 on a `getPosts` call (via the mocked apiClient), assert the provider silently refreshes and retries once. If refresh succeeds, the original call succeeds. If refresh fails (401 on refresh too), assert `status === "anonymous"` and `error` is set. |
| GREEN impl | Pass `getToken: () => tokenRef.current` and `tryRefreshOn401: true` to `createApiClient`. On `ApiError` with `status === 401 && code === "REFRESH_FAILED"`, set `status="anonymous"`, clear token ref, set `error`. |
| Verify | Full test suite |
| Commit | `feat(web): wire AuthProvider to api client refresh path (B18.3b)` |

### Slice 6 — `/login` route + `LoginPage`

| Field | Value |
| --- | --- |
| Step | B18.4 |
| RED test | `apps/web/src/pages/LoginPage.test.tsx`: render `<LoginPage />` inside `<MemoryRouter>`, fill username `you` + password `embers-demo`, click submit. Assert `useAuth().login` was called with `("you", "embers-demo")`. After login resolves, assert `useNavigate` was called with `/`. Also test the loading state (button disabled while submitting) and the error state (alert rendered when login rejects). |
| GREEN impl | Create `apps/web/src/pages/LoginPage.tsx` — form with username/password, submit calls `useAuth().login`, on success navigates to `/`, on failure shows error. Add `/login` route in `apps/web/src/App.tsx`. Wrap `<App />` in `<AuthProvider>` in `apps/web/src/main.tsx`. |
| Verify | Full test suite + lint + typecheck + build |
| Commit | `feat(web): add /login route and LoginPage (B18.4)` |

### Slice 7 — Documentation + final verification

| Field | Value |
| --- | --- |
| Step | B18.5 |
| RED test | (no test — documentation only) |
| GREEN impl | Update `AGENTS.md` (new AuthProvider section + LoginPage route), `CLAUDE.md` (Tech Stack note + pre-commit checklist test count bump), `README.md` (test count bump + new `/login` mention), `docs/Project-Architecture-Document.md` (Key Files Reference + Layer Model + §13 ADR table note that B18 is partially in force). |
| Verify | Full test suite + lint + typecheck + build + e2e (if time permits) |
| Commit | `docs: align AGENTS/CLAUDE/README/PAD with Round 6 (B18) auth provider` |

---

## 3. Risk Assessment and Rollback

### 3.1 Risks

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| AuthProvider wrapping breaks existing pages | Low | High | Provider is purely additive — pages that don't call `useAuth()` are unaffected. Verified by running all 198 existing web tests after each slice. |
| 401 refresh logic causes infinite loop | Medium | High | `_retried` flag in `request<T>()` ensures at most one retry. Two dedicated tests cover both retry-success and retry-failure paths. |
| Mocking `createApiClient` in tests is awkward | Medium | Low | Inject `apiClientFactory` via `AuthProviderProps`. Default factory uses `createApiClient` from `lib/api.ts`. Tests pass a stub. |
| E2E smoke tests break | Low | Medium | E2E tests hit the server directly via Playwright's `request` fixture — they don't render the React app. Unaffected. |
| Lint fails on new files | Low | Low | ESLint config already covers `apps/web/src/**/*.{ts,tsx}` with React + react-hooks rules. Run `npm run lint` after each slice. |

### 3.2 Rollback

Each slice is one atomic commit on `main`. If a slice breaks the build or
tests, `git revert <sha>` restores the previous known-good state. Slices
are ordered so that the codebase is fully working after each commit —
there are no "intermediate" broken states.

If the entire Round 6 needs to be rolled back:
```bash
git revert <slice-7-sha> <slice-6-sha> <slice-5-sha> <slice-4-sha> <slice-3-sha> <slice-2-sha> <slice-1-sha>
```
Or equivalently:
```bash
git reset --hard <sha-before-slice-1>
```

---

## 4. Definition of Done — Round 6

| DoD line | How verified |
| --- | --- |
| 0 TypeScript errors | `npm run typecheck` clean |
| 0 ESLint warnings | `npm run lint` clean |
| All existing tests pass | `npm test` — 389 prior + new tests, all green |
| New tests cover B18 acceptance criteria | TDD: every slice ships with RED → GREEN evidence |
| `npm run build` succeeds | Topological build green |
| 9 Playwright E2E tests still pass | `npm run test:e2e` (if browser install is available) |
| `dist/` not tracked | `git ls-files \| grep -E '(^\\|/)dist/' \| wc -l` returns 0 |
| Docs aligned | AGENTS.md, CLAUDE.md, README.md, Project-Architecture-Document.md updated |
| Atomic commits | One commit per slice, descriptive messages, no mixing of unrelated changes |

---

## 5. Files to be added/modified in Round 6

| File | Status | Purpose |
| --- | --- | --- |
| `apps/web/src/auth/AuthProvider.tsx` | New | React context + `useAuth()` hook |
| `apps/web/src/auth/AuthProvider.test.tsx` | New | TDD tests for initial state, login, logout, refresh-and-retry |
| `apps/web/src/lib/api.ts` | Modified | Add `tryRefreshOn401` option + refresh-and-retry logic |
| `apps/web/src/lib/api.test.ts` | Modified | Add tests for 401 refresh path |
| `apps/web/src/pages/LoginPage.tsx` | New | Login form page |
| `apps/web/src/pages/LoginPage.test.tsx` | New | TDD tests for form submit, loading, error states |
| `apps/web/src/App.tsx` | Modified | Add `/login` route |
| `apps/web/src/main.tsx` | Modified | Wrap `<App />` in `<AuthProvider>` |
| `AGENTS.md` | Modified | New AuthProvider section + LoginPage route |
| `CLAUDE.md` | Modified | Test count bump + auth note |
| `README.md` | Modified | Test count bump + `/login` mention |
| `docs/Project-Architecture-Document.md` | Modified | Key Files + Layer Model + ADR table |
| `docs/REMEDIATION_PLAN_ROUND_6.md` | New | This document |
| `docs/REMEDIATION_PLAN.md` | Modified | Mark B18 as partial done |
