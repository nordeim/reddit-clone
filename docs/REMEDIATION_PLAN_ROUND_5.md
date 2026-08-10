# REMEDIATION_PLAN_ROUND_5.md

> **Round 5 (2026-08-10):** Doc-alignment + infrastructure-hygiene pass. This
> round did **not** execute B17–B22 (frontend integration) — those remain
> deferred. It did, however, lay the groundwork so the next round can tackle
> them without tripping over stale docs, missing build prerequisites, or
> absent test coverage tooling.

---

## 1. Round 5 Changelog

### Documentation alignment (fixes stale claims found by code-vs-doc validation)

| File | Line(s) | Before | After |
| --- | --- | --- | --- |
| `CLAUDE.md` | 51 | "No ESLint." | References Round 4 ESLint flat config. |
| `CLAUDE.md` | 175 | "Deferred: … B23 (Docker/GHA), B24 (Playwright E2E)." | B23 + B24 listed as **done in Round 3**; B17–B22 explicitly deferred with pointer to this file. |
| `CLAUDE.md` | §Pre-commit checklist | — | Added "Build-before-test prerequisite" subsection documenting the `pretest` script and the manual workaround. |
| `CLAUDE.md` | — | — | New "Coverage (Round 5)" subsection documenting `@vitest/coverage-v8` + how to invoke it. |
| `CLAUDE.md` | — | — | New "Manual smoke verification" subsection documenting `apps/server/verify_claims.ts`. |
| `CLAUDE.md` | §Round 4 additions | — | Appended "Round 5 additions" list mirroring this changelog. |
| `README.md` | 23 | "skills/ ← local skill library (198 skills, see skills-catalog.md)" | Notes that `skills/` is gitignored — not part of the published repo. |
| `README.md` | 212 | "No ESLint." | References Round 4 ESLint flat config + cross-link to `CLAUDE.md`. |
| `README.md` | §Test Status | "as of Round 4" | "as of Round 5" + pointer to this file. |
| `README.md` | §Documentation Map | — | Adds `docs/REMEDIATION_PLAN.md` + `docs/REMEDIATION_PLAN_ROUND_5.md`. |
| `AGENTS.md` | top-of-file monorepo-transition note | — | Adds a "Round 5 (2026-08-10)" paragraph mirroring the changelog. |

### Infrastructure hygiene

| Change | Why |
| --- | --- |
| Added `pretest` script to root `package.json`: `npm run build --workspace @embers/shared && npm run build --workspace @embers/db`. | `@embers/server`'s test suites import `@embers/db` and `@embers/shared` as runtime packages. Without their `dist/` builds, 4 route test suites fail with `Failed to resolve entry for package "@embers/db"` (70 tests unrun). `npm test` now works on a fresh `git clone && npm install && npm test`. |
| Added `@vitest/coverage-v8@^2.1.9` to `apps/server/package.json` devDependencies. | The DoD in `docs/REMEDIATION_PLAN.md` §7 requires ">80% backend coverage". Coverage wasn't configured — the line was aspirational and unmeasurable. |
| Updated `apps/server/vitest.config.ts` with v8 coverage config (include `src/**/*.ts`, exclude tests + `index.ts` + `app.ts` + `config.ts`, reporters text + html, thresholds at 0 — informational only). | Lets developers run `npm test --workspace @embers/server -- --coverage` to see actual coverage. No CI gate yet — that's a future round. |
| Documented `apps/server/verify_claims.ts` in `CLAUDE.md`. | The 28-line script was an orphan — tracked but undocumented. Now labelled as a manual smoke verification tool. |

### Foundational code (TDD)

| File | Purpose | Tests |
| --- | --- | --- |
| `apps/web/src/lib/api.ts` | Typed, fetch-based API client for the Fastify backend. Framework-agnostic — no React, no Axios, no React Query. Dependency-injected `fetch` + `getToken`. Uniform `ApiError` carrying `{ status, code, message, requestId }` from the server's errorHandler. | `apps/web/src/lib/api.test.ts` — **22 tests, all green**. |

**TDD sequence followed (RED → GREEN → REFACTOR):**
1. **RED**: Wrote `api.test.ts` with 22 test cases covering constructor, health, auth (login/register/logout), auth header, posts (list/get/create with cursor encoding), votes, comments, search, communities, notifications, and 4 error-handling paths. Ran `npx vitest run` → test file failed with `Failed to resolve import "./api"`.
2. **GREEN**: Wrote `api.ts` with the minimal `createApiClient()` implementation. Ran tests → all 22 passed.
3. **REFACTOR**: Split internal helpers (`defaultBaseUrl`, `parseErrorBody`) from the public `createApiClient` factory; added JSDoc explaining the role of this module in the upcoming B17–B22 integration. Tests still green after refactor.

**Non-breaking by design:** the new `api.ts` is not imported anywhere else in `apps/web` yet. Existing Zustand store, HashRouter, and deterministic `src/data/*` layer are untouched. The 176 existing web tests + 95 server tests + 67 shared tests + 29 db tests all continue to pass.

---

## 2. B17–B22 Detailed TDD Breakdown (still deferred — for the next round)

These six phases remain `[ ]` in `docs/REMEDIATION_PLAN.md`. They require
breaking changes to the working client SPA and are scoped for a future
frontend-refactor round. The breakdown below is the validated, ready-to-execute
plan for that round.

### Phase B17 — Build & routing refactor

**Goal:** remove `vite-plugin-singlefile`, switch `HashRouter` → `BrowserRouter`,
enable route-based code splitting.

**Risk:** high. The single-file build is currently load-bearing for the
"deploy anywhere" story in `README.md` (GitHub Pages, S3, `python -m http.server`).
Removing it forces every consumer to configure SPA fallback routing.

| Step | TDD test | Implementation note |
| --- | --- | --- |
| B17.1 | New `App.test.tsx`: renders `<App />` with `MemoryRouter`, asserts `BrowserRouter` (not `HashRouter`) is the active router. | Replace `<HashRouter>` with `<BrowserRouter>` in `apps/web/src/App.tsx`. |
| B17.2 | New `vite.config.ts` smoke test: build outputs multiple JS chunks (not one inlined HTML). | Remove `viteSingleFile()` from `apps/web/vite.config.ts` plugin list. Update `index.html` if needed. |
| B17.3 | New `e2e/deeplink.spec.ts`: navigate to `/comments/p-1` directly (no client-side click), assert page renders. | Configure Vite dev server `server.fs.allow` + production host SPA fallback. Update `README.md` deployment table. |
| B17.4 | Update existing 176 web tests — any using `HashRouter` history assertions need updating. | Sweep `apps/web/src/**/*.test.tsx` for `createHashHistory`, `#/`-prefixed paths. |

**Estimated effort:** 4–6 hours. **Estimated test delta:** +5 new, ~10 existing updated.

### Phase B18 — Auth provider (Axios or fetch interceptor + AuthContext)

**Goal:** wire the new `api.ts` client into a React context that holds the
access token, refreshes on 401, and exposes `useAuth()`.

| Step | TDD test | Implementation note |
| --- | --- | --- |
| B18.1 | `AuthProvider.test.tsx`: renders, asserts `useAuth()` returns `{ user: null, status: "anonymous" }` initially. | Create `apps/web/src/auth/AuthProvider.tsx` + `useAuth()` hook. Wrap `<App />` in `<AuthProvider>`. |
| B18.2 | `AuthProvider.test.tsx`: calls `login("you", "embers-demo")`, asserts `useAuth().user.username === "you"` after settle. | Wire `api.login()` into the context. Store token in memory + refresh token in HttpOnly cookie (server already sets it). |
| B18.3 | `AuthProvider.test.tsx`: simulates 401 on a `getPosts` call, asserts the provider silently refreshes and retries once. | Add a fetch wrapper in `api.ts` that catches `ApiError` with `status === 401`, calls `api.refresh()`, retries original request. If refresh also 401, redirect to `/login`. |
| B18.4 | `LoginPage.test.tsx`: fills username + password, submits, asserts redirect to `/`. | Build `apps/web/src/pages/LoginPage.tsx`. Add `/login` route. |

**Estimated effort:** 6–8 hours. **Estimated test delta:** +12 new.

### Phase B19 — Server state (React Query provider)

**Goal:** add `@tanstack/react-query` and migrate server-state reads off the
deterministic `src/data/*` layer.

| Step | TDD test | Implementation note |
| --- | --- | --- |
| B19.1 | `QueryProvider.test.tsx`: wraps a test component, asserts `useQueryClient()` returns the client. | Add `@tanstack/react-query` dep. Create `apps/web/src/query/QueryProvider.tsx`. Wrap `<App />`. |
| B19.2 | `usePosts.test.tsx`: renders a component calling `usePosts()`, mocks `api.getPosts`, asserts it returns data + loading states. | Create `apps/web/src/query/usePosts.ts` wrapping `useInfiniteQuery`. |
| B19.3 | Repeat for `usePost`, `useComments`, `useCommunities`, `useSearch`, `useNotifications`. | One hook per resource, all thin wrappers around `api.*` methods. |

**Estimated effort:** 4–6 hours. **Estimated test delta:** +18 new.

### Phase B20 — Feeds & search wiring

**Goal:** replace `src/data/*` imports in pages with React Query hooks.

| Step | TDD test | Implementation note |
| --- | --- | --- |
| B20.1 | `HomePage.test.tsx`: renders, mocks `usePosts`, asserts 8 cards render (no `data/posts.ts` import). | Update `apps/web/src/pages/HomePage.tsx` to call `usePosts()`. Keep simulated latency via `isLoading` state. |
| B20.2 | `PostPage.test.tsx`: renders, mocks `usePost` + `useComments`, asserts post + tree render. | Update `apps/web/src/pages/PostPage.tsx`. |
| B20.3 | `SearchPage.test.tsx`: types query, debounces, asserts `useSearch` called with debounce. | Update `apps/web/src/pages/SearchPage.tsx`. |
| B20.4 | `CommunityPage.test.tsx`: renders, mocks `useCommunity` + filtered `usePosts`. | Update `apps/web/src/pages/CommunityPage.tsx`. |

**Estimated effort:** 6–8 hours. **Estimated test delta:** +12 new (mostly updates to existing tests).

### Phase B21 — Optimistic UI (vote + comment)

**Goal:** add `onMutate` / `onError` rollback to vote and comment mutations.

| Step | TDD test | Implementation note |
| --- | --- | --- |
| B21.1 | `useVote.test.tsx`: casts upvote, asserts UI shows +1 immediately, then settles to server value. | Create `apps/web/src/query/useVote.ts` using `useMutation` with `onMutate` (cache write) + `onError` (rollback). |
| B21.2 | `useVote.test.tsx`: mocks API failure, asserts UI rolls back to pre-vote state. | Same hook, different test. |
| B21.3 | `useCreateComment.test.tsx`: posts comment, asserts it prepends to tree, rolls back on failure. | Create `apps/web/src/query/useCreateComment.ts`. |

**Estimated effort:** 4–5 hours. **Estimated test delta:** +9 new.

### Phase B22 — Notification UI (polling)

**Goal:** wire unread notification count to the API via polling.

| Step | TDD test | Implementation note |
| --- | --- | --- |
| B22.1 | `useNotifications.test.tsx`: mocks `api.getNotifications`, asserts hook returns unread count. | Create `apps/web/src/query/useNotifications.ts` using `useQuery` with `refetchInterval: 30_000`. |
| B22.2 | `Navbar.test.tsx`: renders, asserts badge shows count from `useNotifications`. | Update `apps/web/src/components/layout/Navbar.tsx`. |
| B22.3 | E2E: log in user A in tab 1, log in user B in tab 2, user A comments on user B's post, assert user B's badge updates within 30s. | Add `e2e/notifications.spec.ts`. |

**Estimated effort:** 4–6 hours. **Estimated test delta:** +6 new (1 E2E).

### B17–B22 totals

- **Estimated effort:** 28–39 hours of focused engineering.
- **Estimated test delta:** +62 new tests, ~10 existing tests updated.
- **Sequencing:** B17 → B18 → B19 → B20 (parallel-safe with B21) → B21 → B22. B19 is the keystone — once React Query is in, B20/B21/B22 fan out.
- **Rollback strategy:** each phase is one commit on `main`. If a phase breaks E2E, revert the single commit; previous phases remain green.

---

## 3. Definition of Done — current status

| DoD line (from `docs/REMEDIATION_PLAN.md` §7) | Status after Round 5 |
| --- | --- |
| 0 TypeScript errors | ✅ `npm run typecheck` clean |
| 0 ESLint warnings | ✅ `npm run lint` clean (0 errors, 0 warnings) |
| Prettier formatted | ⚠ Not enforced — no Prettier config in repo. Future round. |
| Unit test coverage > 80% for backend logic | ⚠ Coverage now **measurable** via `npm test --workspace @embers/server -- --coverage`. Thresholds set to 0 (informational). Actual baseline TBD. |
| 100% of critical paths covered by E2E | ✅ 9 Playwright smoke tests pass — covers register, login, feed, single post, search, communities. |
| ZAP / DAST scan, no High/Critical vulns | ❌ Not done. Future round. |
| No hardcoded secrets (`gitleaks`) | ❌ Not run. Future round. |
| Structured logs with correlation IDs | ✅ Pino `requestId` plugin emits `x-request-id` on every response. |
| `README.md` bootstrap commands | ✅ Verified — `git clone && npm install && npm run db:migrate --workspace @embers/db && npm run db:seed --workspace @embers/db && npm run dev --workspace @embers/server` works. Round 5 also added `pretest` so `npm test` works on a fresh clone. |
| Reversible migrations | ✅ Drizzle migrations are reversible via `drizzle-kit drop`. |

---

## 4. Round 5 verification (post-changes)

Run from the repo root after applying Round 5 changes:

```bash
npm run lint            # 0 errors, 0 warnings
npm run typecheck       # all 4 workspaces pass
npm test                # 389 vitest tests pass (367 prior + 22 new api client tests)
                        # pretest auto-builds shared+db first
npm run build           # topological build succeeds
git ls-files | grep -E '(^|/)dist/' | wc -l   # 0
```

E2E (Playwright) is unaffected — no client routing changed.

---

## 5. Files touched in Round 5

| File | Change |
| --- | --- |
| `AGENTS.md` | Added Round 5 paragraph to top-of-file monorepo-transition note. |
| `CLAUDE.md` | Fixed "No ESLint" + "Deferred" lines; added pre-commit build-prerequisite subsection; added Coverage (Round 5) subsection; added Manual smoke verification subsection; added Round 5 additions list. |
| `README.md` | Fixed "No ESLint" line; fixed `skills/` directory note; updated Test Status to "as of Round 5"; added Round 5 plan to Documentation Map. |
| `package.json` (root) | Added `pretest` script. |
| `apps/server/package.json` | Added `@vitest/coverage-v8@^2.1.9` to devDependencies. |
| `apps/server/vitest.config.ts` | Added v8 coverage config (include/exclude/reporters/thresholds). |
| `apps/web/src/lib/api.ts` | New file — foundational fetch-based API client. |
| `apps/web/src/lib/api.test.ts` | New file — 22 TDD tests for the API client. |
| `docs/REMEDIATION_PLAN_ROUND_5.md` | New file — this document. |
| `package-lock.json` | Updated by `npm install --workspace @embers/server --save-dev @vitest/coverage-v8`. |
