# Round 8 — Live-Deployment Audit & Codebase Hardening

**Date:** 2026-08-10
**Status:** Planned, in execution
**Scope:** Round 8 is **not** a feature round. It is an audit-and-hardening round triggered by running the deployed site at `https://reddit.jesspete.shop/` through a browser-based E2E audit and finding that the production deployment does not match the production-ready claims in `docs/REMEDIATION_PLAN.md`.

**Companion documents:**
- `docs/REMEDIATION_PLAN.md` — Master plan (B0–B24 backlog; B0–B16 + B18 + B23 + B24 done; B17 + B19–B22 deferred)
- `docs/REMEDIATION_EXECUTION_PLAN.md` — Execution log for B0–B16
- `docs/REMEDIATION_PLAN_ROUND_5.md` / `_ROUND_6.md` / `_ROUND_7.md` — Prior round changelogs
- `docs/session_4.md` — Round 7 quality-gate results

---

## 1. Trigger — Why Round 8 Exists

Round 7 (2026-08-10) declared the codebase production-ready:
> "All 453 vitest tests + 18 Playwright E2E tests pass, ESLint is clean, and typecheck + build succeed as of Round 7."

That claim is **true for the local repository** but **false for the live deployment**. Round 8 exists because running `e2e/live.spec.ts` against `https://reddit.jesspete.shop/` surfaced a gap between "the tests pass" and "the site is production-ready".

Round 8 is scoped to:
1. **Document** the live-deployment gaps so future operators don't repeat them.
2. **Harden the repository** so the same gaps are caught by CI before they reach production.
3. **Align the docs** (AGENTS.md, CLAUDE.md, README.md) with the actual codebase + the live state.

Round 8 is explicitly **not** a redeployment of the live site — that requires operator access to the hosting provider and is tracked as a follow-up. What Round 8 *does* is make the repository diagnose-and-prevent these issues automatically.

---

## 2. Live-Deployment Audit Findings (2026-08-10)

The audit was performed by `e2e/live.spec.ts` (added in R8.3) running against `https://reddit.jesspete.shop/`. Findings are classified per the operating instructions' severity taxonomy.

### 2.1 Critical

| ID | Finding | Evidence | Impact |
|----|---------|----------|--------|
| **LIVE-CRIT-1** | The live site serves the **Vite dev server**, not a production build. | `<script type="module" src="/@react-refresh">` and `<script type="module" src="/@vite/client">` are present in the served HTML. | HMR client + react-refresh are exposed to the public internet. Dev-only error overlays can leak source-code paths. Performance is dramatically worse (no minification, no tree-shaking, no caching headers). |
| **LIVE-CRIT-2** | The Fastify backend is **not reachable** from the live URL. | `POST /api/auth/login` returns `HTTP 404` with `content-length: 0`. `GET /api/posts`, `/api/communities`, `/api/search`, and `/health` all return the SPA `index.html` (1579 bytes, `content-type: text/html`) instead of JSON. | The entire B18 auth flow (login, register, /notifications) is broken in production. The SPA falls back to its deterministic data layer, so the feed *appears* to work, but every auth attempt throws `Failed to fetch` in the browser console. |
| **LIVE-CRIT-3** | No production security headers are set. | `content-security-policy`, `strict-transport-security`, `x-content-type-options`, `x-frame-options`, and `referrer-policy` are all absent from the response headers (verified via `e2e/live.spec.ts` → "security headers" test). | XSS exposure is higher than necessary. No clickjacking defence. No MIME-type sniffing defence. HSTS absent — first-visit HTTP downgrade attacks are possible. |

### 2.2 High

| ID | Finding | Evidence | Impact |
|----|---------|----------|--------|
| **LIVE-HIGH-1** | `npm run typecheck` fails on a fresh clone. | Running `npm run typecheck` immediately after `npm install` produces `error TS2307: Cannot find module '@embers/db'` in `apps/server/src/services/voteService.ts` and a cascade of `error TS2339: Property 'parentId' does not exist on type 'CommentTreeNode'` in `apps/server/src/services/commentTreeService.ts`. The errors disappear after `npm run build --workspace @embers/shared && npm run build --workspace @embers/db` (which is what `pretest` does). | A contributor running `npm run typecheck` on a fresh clone (the documented pre-commit gate) sees a wall of false-positive errors. They either learn to run `npm test` first (undocumented) or stop trusting the typecheck gate. This is a documentation + tooling gap, not a code bug. |
| **LIVE-HIGH-2** | The `e2e/live.spec.ts` audit found that the SearchPage does not render a visible search input when navigated to directly via `/#/search?q=react`. | `LIVE-SEARCH-INPUT-VISIBLE: false` in the audit log. | This is **not a bug** in the SearchPage — the search input lives in the `Navbar` (rendered by `AppShell`), not on the `SearchPage` itself. But it is a **UX gap**: a user who lands on `/#/search?q=react` from an external link sees results but no obvious way to refine the query without scrolling up to the navbar. Round 8 documents this; Round 9+ may address it. |

### 2.3 Medium

| ID | Finding | Evidence | Impact |
|----|---------|----------|--------|
| **LIVE-MED-1** | React `act()` warnings are emitted by `apps/web/src/auth/AuthProvider.test.tsx` and `apps/web/src/pages/LoginPage.test.tsx` during `npm test`. | Test output contains: `An update to AuthProvider inside a test was not wrapped in act(...)` and `An update to MemoryRouter inside a test was not wrapped in act(...)`. | Not a runtime bug — these are test-hygiene warnings. But they violate the "Tests, linter, type-checker, and build/compile step have been run where available; failures are fixed or explicitly reported, never suppressed to force a pass" rule from the operating instructions. They also make the test output noisier, which masks real failures. |
| **LIVE-MED-2** | The live deployment has no SPA fallback rule for `/api/*` routes — API requests receive the SPA `index.html` with HTTP 200, masking API failures as successful responses. | `GET /api/posts` returns HTTP 200 with `content-type: text/html` (the SPA shell) instead of either a JSON response or a clear 404/502. | A misconfigured client that points at the wrong API base URL will silently "succeed" with HTML responses, then crash at JSON-parse time with a confusing error. The deployment should either route `/api/*` to the Fastify backend or return a clear 502/503 when the backend is down. |

### 2.4 Informational

| ID | Finding | Evidence | Impact |
|----|---------|----------|--------|
| **LIVE-INFO-1** | The live SPA's deterministic feed renders correctly: 8 articles on initial load, 48 after 5 scroll-to-bottom cycles. | `LIVE-FEED-ARTICLES: 8` and `LIVE-INFINITE-SCROLL: 8 → 48` in the audit log. | Confirms that the client-side data layer + infinite scroll work end-to-end without a backend. |
| **LIVE-INFO-2** | The dark-mode toggle persists across reloads via `localStorage` key `reddit-clone-state` (zustand `persist` middleware). | `LIVE-THEME-LOCALSTORAGE-AFTER-TOGGLE: {"state":{"schemaVersion":1,"theme":"dark",...}}` | Confirms ADR-005 (zustand persist) works on the live site. |
| **LIVE-INFO-3** | The `/notifications` route guard correctly redirects unauthenticated users to `/login`. | `LIVE-NOTIFICATIONS-UNAUTH-REDIRECT: https://reddit.jesspete.shop/#/login` | Confirms `RequireAuth` (B18.8) works on the live site. |
| **LIVE-INFO-4** | No console errors on initial page load. | `LIVE-CONSOLE-ERRORS: 0 errors` | The SPA itself is clean — the bugs are all in the deployment, not the SPA code. |

---

## 3. Round 8 ToDo List (TDD-Driven)

Each item below follows red → green → refactor. The "Test" column names the failing test that must exist before the fix is applied.

### R8.1 — Fix `npm run typecheck` on fresh clone

**Problem:** `npm run typecheck` fails on a fresh clone because `@embers/server`'s typecheck imports types from `@embers/db` and `@embers/shared`, which haven't been built yet. `npm test` works because of the `pretest` script, but `npm run typecheck` has no such guard.

**Fix:** Add a `pretypecheck` script to the root `package.json` that builds `@embers/shared` + `@embers/db` before running typecheck. Mirror the existing `pretest` pattern.

**Test (red):** A new shell-based integration test in `scripts/verify-fresh-clone-typecheck.sh` that:
1. Creates a temporary copy of the repo (or simulates a fresh clone by removing `dist/` directories).
2. Runs `npm run typecheck`.
3. Asserts exit code 0.

This is a meta-test — it tests the build system, not the application code. It will live in `scripts/` and be documented in `package.json` as `test:fresh-clone`.

**Files touched:**
- `package.json` (add `pretypecheck` script)
- `scripts/verify-fresh-clone-typecheck.sh` (new)
- `package.json` (add `test:fresh-clone` script that runs the shell test)

### R8.2 — Silence React `act()` warnings in AuthProvider + LoginPage tests

**Problem:** Two test files emit `act()` warnings:
- `apps/web/src/auth/AuthProvider.test.tsx` — `An update to AuthProvider inside a test was not wrapped in act(...)`
- `apps/web/src/pages/LoginPage.test.tsx` — `An update to MemoryRouter inside a test was not wrapped in act(...)`

The AuthProvider test already uses `act()` in most places (10 occurrences), so the warning is from a code path that was missed. The LoginPage test does not import `act` at all.

**Fix:** Audit each test that triggers an async state update, wrap it in `act()`. For LoginPage, import `act` from `@testing-library/react` and wrap the form-submit + `waitFor` chains.

**Test (red):** Run `npm test --workspace @embers/web 2>&1 | grep "act(...)"` and assert the output is empty. This becomes a CI gate.

**Files touched:**
- `apps/web/src/auth/AuthProvider.test.tsx` (wrap missed async updates)
- `apps/web/src/pages/LoginPage.test.tsx` (import + wrap)
- `apps/web/src/pages/RegisterPage.test.tsx` (proactive — same pattern)

### R8.3 — Add `e2e/live.spec.ts` (live-deployment audit suite)

**Problem:** No automated test exercises the live deployment. The existing `e2e/smoke.spec.ts` and `e2e/auth.spec.ts` test the API against a locally-bootstrapped server, which is necessary but not sufficient — they cannot catch deployment-time regressions like "the operator ran `npm run dev` instead of `npm run build`".

**Fix:** Add `e2e/live.spec.ts` (already drafted in this round) with:
- A separate `playwright.live.config.ts` (no `webServer` — tests hit the live URL).
- Tests that are **opt-in**: only run when `LIVE_BASE_URL` env var is set, otherwise skip with a clear message.
- Tests that assert:
  1. Homepage returns 200 and does NOT contain Vite dev-only modules.
  2. SPA renders the feed (article elements appear).
  3. Dark-mode toggle persists to localStorage.
  4. Infinite scroll loads more articles.
  5. SearchPage renders results for a query.
  6. Login form is interactive (does not assert success — that requires a real backend).
  7. Register form validates short input.
  8. `/notifications` route guard redirects to `/login`.
  9. No console errors on initial load.
  10. Security headers are present (CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy).
  11. API endpoint reachability probe (logs status + content-type, does not assert — informational).

**Test (red):** The `e2e/live.spec.ts` file itself is the test. It will be run on-demand via `npm run test:e2e:live` and is NOT part of the default `npm test` or `npm run test:e2e` gates (it requires a live deployment).

**Files touched:**
- `e2e/live.spec.ts` (new — already drafted, will be refined)
- `playwright.live.config.ts` (new — already drafted)
- `package.json` (add `test:e2e:live` script)

### R8.4 — Add production-build verification test

**Problem:** Nothing in CI asserts that the built `dist/index.html` is actually a production build (no `/@react-refresh`, no `/@vite/client`, no unminified source). The live site is currently serving a dev build, which CI would have caught if this test existed.

**Fix:** Add `scripts/verify-production-build.mjs` that:
1. Runs `npm run build --workspace @embers/web`.
2. Reads `apps/web/dist/index.html`.
3. Asserts the file does NOT contain `/@react-refresh`, `/@vite/client`, or `import.meta.hot`.
4. Asserts the file DOES contain the inlined JS (singlefile plugin) — i.e., the file is larger than 100 KB.
5. Exits 0 on success, 1 on failure with a clear message.

**Test (red):** The script itself is the test. It will be wired into CI via a new `test:build` script.

**Files touched:**
- `scripts/verify-production-build.mjs` (new)
- `package.json` (add `test:build` script)

### R8.5 — Document live-deployment remediation steps (operator-facing)

**Problem:** The repo documents how to run the project locally and how to deploy via Docker, but does not document:
- That the live site is at `https://reddit.jesspete.shop/`.
- What the current live-deployment gaps are.
- What an operator must do to fix them.

**Fix:** Add a new section to `README.md` titled "Live Deployment" that:
- States the live URL.
- Lists the current gaps (LIVE-CRIT-1, LIVE-CRIT-2, LIVE-CRIT-3, LIVE-HIGH-2, LIVE-MED-2).
- Links to `docs/REMEDIATION_PLAN_ROUND_8.md` for the full audit.
- Provides the exact operator commands to fix each gap:
  - Build the SPA: `npm run build --workspace @embers/web` → serve `apps/web/dist/`.
  - Start the Fastify backend: `npm run server:start` (or the Docker equivalent).
  - Configure the reverse proxy to route `/api/*` and `/health` to the Fastify backend.
  - Add security headers at the CDN/reverse-proxy layer.

**Test (red):** Documentation-only — no automated test. The "test" is that a new operator can follow the README and produce a working production deployment.

**Files touched:**
- `README.md` (new "Live Deployment" section)
- `docs/REMEDIATION_PLAN_ROUND_8.md` (this file)

### R8.6 — Update AGENTS.md, CLAUDE.md, README.md with Round 8 changelog

**Problem:** The docs are accurate as of Round 7 but don't mention Round 8. They also don't mention the live deployment, the `pretypecheck` script, the `test:e2e:live` script, or the `test:build` script.

**Fix:**
- `AGENTS.md`: Add a Round 8 changelog entry at the top. Update the "Quality Gates" table to include `npm run test:build` and `npm run test:e2e:live`. Update the "Test Files" count to include `e2e/live.spec.ts`. Add a "Live Deployment" subsection that links to the README section.
- `CLAUDE.md`: Add a Round 8 note to the top monorepo-transition banner. Add `npm run test:build` and `npm run test:e2e:live` to the testing section. Add a "Live Deployment" note.
- `README.md`: Add the "Live Deployment" section (R8.5). Update the "Test Status" table to mention `e2e/live.spec.ts` (opt-in). Update the "Documentation Map" table to include `docs/REMEDIATION_PLAN_ROUND_8.md`.

**Test (red):** Documentation-only. The "test" is that a reader can follow the docs and reproduce the Round 8 state.

**Files touched:**
- `AGENTS.md`
- `CLAUDE.md`
- `README.md`
- `docs/REMEDIATION_PLAN_ROUND_8.md` (this file)

---

## 4. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Adding `pretypecheck` slows down `npm run typecheck` by ~3 seconds. | High | Low | Acceptable — the alternative is silent typecheck failures on fresh clones. Documented in CLAUDE.md. |
| The `act()` fixes change test timing and introduce flakiness. | Low | Medium | Each fix is verified by running the affected test file 5× in isolation before merging. |
| `e2e/live.spec.ts` is too brittle (depends on live site uptime). | Medium | Low | Tests are opt-in (only run when `LIVE_BASE_URL` is set). Default `npm test` and `npm run test:e2e` do not run them. |
| `scripts/verify-production-build.mjs` gives a false negative if the singlefile plugin changes its output format. | Low | Medium | The script checks for the *absence* of dev-only strings, not the *presence* of specific production strings — robust to plugin output changes. |
| Documentation updates make the docs longer without adding proportional value. | Medium | Low | Each doc update is scoped to a specific Round 8 change. No drive-by edits. |

---

## 5. Definition of Done (Round 8)

Round 8 is "Done" when:
1. **Code Quality:** `npm run lint` passes (0 errors, 0 warnings). `npm run typecheck` passes on a fresh clone (after `npm install`, no `pretest` needed). `npm test` passes (453+ vitest tests, 0 act() warnings). `npm run build` succeeds for all 4 workspaces. `npm run test:build` passes (production-build verification).
2. **Testing:** The 453 vitest tests still pass. The 18 Playwright E2E tests still pass. The new `e2e/live.spec.ts` runs (opt-in) and documents the live gaps. The new `scripts/verify-production-build.mjs` passes.
3. **Documentation:** `AGENTS.md`, `CLAUDE.md`, `README.md` mention Round 8. `docs/REMEDIATION_PLAN_ROUND_8.md` exists (this file). The README "Live Deployment" section documents the operator-facing gaps.
4. **Commits:** Each R8.x item is a separate atomic commit with a descriptive message. All commits are on `main`. No new branches.
5. **Push:** All commits are pushed to `origin/main` using the SSH wrapper (`skills/how-to-git-push-using-ssh-wrapper/scripts/ssh_git_wrapper_v3.py`).

---

## 6. Out of Scope (Deferred to Round 9+)

- **Redeploying the live site.** Round 8 documents the gaps; the actual redeployment requires operator access to the hosting provider and is tracked as a follow-up.
- **B17 (Build Refactor — remove singlefile + BrowserRouter).** Still deferred per Round 7's rationale. Round 8 does NOT change this — the singlefile build is still the production strategy, it just needs to actually be *used* in the live deployment.
- **B19–B22 (React Query, feeds/search wiring, optimistic UI, notification polling).** Still deferred. Round 8 does not touch the deferred frontend integration.
- **LIVE-HIGH-2 (SearchPage UX gap).** Documented but not fixed — it's a UX refinement, not a bug.
