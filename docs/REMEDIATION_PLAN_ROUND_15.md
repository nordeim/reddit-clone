# Round 15 Remediation Plan — Post-Login Redirect + Network-Error UX + Prod-Readiness Gate + Doc Reconciliation

> **Round 15 (2026-08-19):** This plan is scoped against (a) the live
> deployment E2E audit re-run against `https://reddit.jesspete.shop/`
> on 2026-08-19, and (b) a Mode-C alignment audit of
> `AGENTS.md` / `CLAUDE.md` / `README.md` / `reddit-clone_SKILL.md` /
> `docs/Project-Architecture-Document.md` against the codebase at HEAD
> (`970e2e1`). Six findings — five are codebase-side fixes executable
> with TDD; one is a pure doc reconciliation. No finding requires the
> deferred B17 / B19–B22 frontend integration, and no finding breaks
> the existing "deploy anywhere" story or the 467-test vitest baseline.
>
> Skills referenced (from `skills/skills-catalog.md`):
>   - `planning-and-task-breakdown` — structured this ToDo list
>   - `tdd-workflow` — RED-GREEN-REFACTOR for every code change
>   - `testing-patterns` — unit test design for each new code path
>   - `code-review-and-audit` — 12-category scan during validation
>   - `e2e-testing-lessons` — informed the strict prod-readiness gate
>   - `writing-plans` — bite-sized task granularity for execution
>   - `how-to-git-push-using-ssh-wrapper` — for the final push step

---

## 0. Pre-Plan Validation Summary

Before writing this plan, the following checks were run and passed
against the codebase at `970e2e1`:

| Check | Command | Result |
|-------|---------|--------|
| Typecheck (all 4 workspaces) | `npm run typecheck` | ✅ clean |
| Lint (ESLint 9 flat config) | `npm run lint` | ✅ 0 errors, 0 warnings |
| Vitest (all workspaces) | `npm test` | ✅ 467/467 pass (web 271, db 31, shared 70, server 95) |
| Plan-alignment gate | `npm run test:plan-alignment` | ✅ no forbidden tokens |
| No-secrets gate | `npm run test:no-secrets` | ✅ clean |
| Gitignore-enforcement gate | `npm run test:gitignore` | ✅ clean |
| Live E2E audit | `LIVE_BASE_URL=https://reddit.jesspete.shop/ npm run test:e2e:live` | 27/28 pass, 1 skipped (needs backend) |

**Live E2E audit observations (2026-08-19):**
- All Round 10 client-side bug fixes (BUG-R10-2/3/4/5) confirmed still
  working on the live site.
- Backend is still unreachable: `GET /api/posts`, `GET /api/communities`,
  `GET /api/search`, `GET /health` all return 404 text/html (460 bytes);
  `POST /api/auth/login` returns 501 text/html (482 bytes). The reverse
  proxy is still not routing `/api/*` to the Fastify backend.
- All 5 security headers (CSP, HSTS, X-Content-Type-Options,
  X-Frame-Options, Referrer-Policy) are still absent.
- LoginPage surfaces `"Failed to fetch"` to the user when the backend
  is unreachable — a generic browser-network error, not a friendly
  actionable message.

These three live findings are deployment-side gaps (operator
responsibility, documented in `docs/REMEDIATION_PLAN_ROUND_8.md`).
Round 15 does NOT fix the operator-side deployment gaps — instead, it
hardens the **codebase** so the gaps are easier to detect and the UX
is better while they persist.

---

## 1. Consolidated Findings — Root Cause → Optimal Fix

Each finding was identified by surveying the codebase + docs at HEAD
(`970e2e1`) and validated before being added here. Findings are
ordered by severity.

### F1 — LoginPage does not redirect back to `state.from` after login (Medium — UX bug, deferred since Round 7)
- **Source:** `docs/Project-Architecture-Document.md` §10 "Known Issues &
  Outstanding Tasks" + `AGENTS.md` "Round 7 deferred" + `CLAUDE.md`
  "Round 7 deferred" — all three docs list this as a deferred gap.
- **Root cause:** `<RequireAuth>` (`apps/web/src/auth/RequireAuth.tsx`)
  correctly redirects anonymous users to `/login` with
  `state: { from: location.pathname }`. But `LoginPage.tsx` line 47
  unconditionally calls `navigate("/")` after a successful login — the
  preserved `state.from` is ignored. Users who click a deep link to
  `/notifications`, get redirected to `/login`, then log in, land on
  `/` instead of `/notifications`. Bad UX.
- **Evidence:** `apps/web/src/pages/LoginPage.tsx:47`: `navigate("/")`.
  `apps/web/src/auth/RequireAuth.tsx:60`:
  `<Navigate to="/login" state={{ from: location.pathname }} replace />`.
  `apps/web/src/pages/LoginPage.test.tsx:161` test only asserts
  `expect(screen.getByTestId("home")).toBeInTheDocument()` — there is
  no test for `state.from` redirect-back.
- **Optimal fix:**
  1. Read `useLocation().state?.from` in `LoginPage`. Validate it is a
     **relative** path (starts with `/` but not `//`) — prevents an
     open-redirect attack if a hostile link sets `state.from` to an
     absolute URL.
  2. If valid: `navigate(from, { replace: true })`.
  3. Otherwise: `navigate("/", { replace: true })` (existing behavior).
  4. TDD (RED→GREEN):
     - RED: write a test in `apps/web/src/pages/LoginPage.test.tsx`
       that mounts `LoginPage` with
       `initialEntries={["/login"]}` and an explicit `state: { from: "/notifications" }`
       (via `MemoryRouter`'s `initialEntries` array of objects), then
       asserts that after a successful login the test ID for the
       notifications route appears.
     - GREEN: implement the `state.from` redirect-back in
       `LoginPage.tsx`.
- **Security note:** The open-redirect guard is mandatory — without it,
  a hostile link to `/#/login` with crafted `state` could redirect to
  `https://evil.example.com`. The validation must reject anything that
  is not a path-internal relative URL.
- **Confidence:** Verified
- **Type:** Code (TDD)

### F2 — `lib/api.ts` surfaces raw `"Failed to fetch"` on network errors (Medium — UX bug)
- **Source:** Live E2E audit 2026-08-19:
  `[AUDIT] LIVE-LOGIN-POST-SUBMIT-BODY-EXCERPT: Failed to fetch`. The
  LoginPage error alert shows the raw browser-network error message
  when the backend is unreachable.
- **Root cause:** `apps/web/src/lib/api.ts:291` calls `await fetchFn(...)`
  outside any try/catch. When `fetchFn` rejects with a `TypeError`
  (the standard browser error for "network unreachable", "CORS
  blocked", "DNS failure"), the `TypeError` propagates up through
  `request` → `api.login` → `auth.login` → `LoginPage`'s `catch` →
  the `error` state → the `role="alert"` div. The user sees
  "Failed to fetch", which is meaningless to a non-engineer.
- **Evidence:** `apps/web/src/lib/api.ts:291` — no try/catch around
  `fetchFn(url, ...)`. `apps/web/src/pages/LoginPage.tsx:50` —
  `setError(err instanceof Error ? err.message : String(err))` — passes
  the raw error message through verbatim.
- **Optimal fix:**
  1. Wrap the `fetchFn(url, ...)` call in `request<T>` with a
     try/catch.
  2. On catch (any thrown error from `fetchFn`), throw a new
     `ApiError(0, "NETWORK_ERROR",
       "Could not reach the embers server. Please try again later.",
       undefined)`. The status `0` is the conventional sentinel for
     "no HTTP response received" (used by Axios, fetch interceptors,
     etc.).
  3. Preserve the original error via `Error.cause` (ES2022, supported
     in Node 16+ and all modern browsers) for diagnostic purposes.
  4. TDD (RED→GREEN):
     - RED: write tests in `apps/web/src/lib/api.test.ts`:
       (a) when `fetchFn` rejects with `TypeError("Failed to fetch")`,
           `api.health()` rejects with an `ApiError` whose `status === 0`,
           `code === "NETWORK_ERROR"`, and message contains "Could not
           reach".
       (b) when `fetchFn` rejects with a generic `Error("boom")`,
           `api.health()` still rejects with an `ApiError` (status 0,
           code NETWORK_ERROR) — the wrapper normalizes ALL
           `fetchFn` exceptions, not just `TypeError`.
       (c) the original error is preserved on `error.cause`.
     - GREEN: implement the try/catch wrapper in `request<T>`.
- **Side effect on the refresh-and-retry path:** Currently, if
  `fetchFn` throws during the refresh call (line 311), the catch at
  line 319 swallows the error and propagates the original 401. With
  the new wrapper, the refresh call's network error would be thrown
  as `ApiError(0, "NETWORK_ERROR", ...)`. The catch at line 319 should
  continue to swallow ALL errors from the refresh call (network or
  HTTP 401) and propagate the original 401 — that's the documented
  contract from Round 6. The fix is therefore to keep the existing
  catch-all behavior at line 319; only the top-level `fetchFn` call
  at line 291 needs the new wrapper.
- **Confidence:** Verified
- **Type:** Code (TDD)

### F3 — No strict prod-readiness gate (Medium — infra)
- **Source:** Live E2E audit 2026-08-19 — `e2e/live.spec.ts` and
  `e2e/live_extended.spec.ts` document the LIVE-CRIT-2/3/4 gaps via
  `console.log` but explicitly do NOT fail the test suite:
  ```
  if (failures.length > 0) { console.log(`[AUDIT] LIVE-API-PROBE: ...`); }
  ```
  This was deliberate in Round 8 — the gaps were known and the gate
  was kept green so unrelated CI work could proceed. As of 2026-08-19
  the gaps are STILL present and there is still no gate that fails.
- **Root cause:** No script in `package.json` asserts that a deployed
  embers instance actually has the backend reachable AND the 5 required
  security headers set. The two existing live-audit specs are
  informational only.
- **Evidence:** `e2e/live.spec.ts:191-195` and `:232-236` — the
  `failures.length > 0` branch only logs. `scripts/verify-*.mjs`
  exist for fresh-clone typecheck, production-build, plan-alignment,
  no-secrets, gitignore-enforced, ci-has-secret-scan — but no
  `verify-prod-readiness.mjs`.
- **Optimal fix:**
  1. Add `scripts/verify-prod-readiness.mjs` — a Node script that:
     - Reads `PROD_BASE_URL` from env (default:
       `https://reddit.jesspete.shop/`).
     - Probes `GET /health`, `GET /api/posts`, `POST /api/auth/login`
       (with demo creds). Each must return 200 with JSON
       Content-Type.
     - Checks the 5 required security headers on the homepage:
       `content-security-policy`, `strict-transport-security`,
       `x-content-type-options`, `x-frame-options`, `referrer-policy`.
     - Exits 0 (pass) or 1 (fail) — NEVER silent. Prints a clear
       summary of which probes failed and which doc to consult.
     - Skipped when `PROD_READINESS=skip` is set (escape hatch for
       local dev where no live deployment exists).
  2. Add `test:prod-readiness` script to root `package.json`:
     `node scripts/verify-prod-readiness.mjs`.
  3. TDD (RED→GREEN):
     - RED: write `scripts/verify-prod-readiness.test.mjs` (a vitest
       test that imports the script's probe functions and asserts the
       pass/fail decision logic against fixture responses). The script
       must export its pure helper functions (`checkApiReachable`,
       `checkSecurityHeaders`, `summarize`) for testability.
     - GREEN: implement the helpers, the main script, and wire it up.
- **Why a separate script and not just making `live.spec.ts` strict:**
  The existing `live.spec.ts` is intentionally non-blocking so it can
  run in CI without breaking unrelated work. A separate strict gate
  that operators opt into (via `npm run test:prod-readiness`) is a
  cleaner separation of concerns: informational audits vs. release
  blockers. The operator decides when to enforce (e.g., add to a
  `release.yml` workflow, not `ci.yml`).
- **Confidence:** Verified
- **Type:** Code (TDD)

### F4 — `docs/Project-Architecture-Document.md` diverges from root `Project-Architecture-Document.md` (Low — doc reconciliation)
- **Source:** `diff Project-Architecture-Document.md docs/Project-Architecture-Document.md`:
  the only difference is line 6 — the "Last Updated" header. Root
  copy says `2026-08-18 (Round 14 — knowledge distillation...)`.
  Docs copy says `2026-08-13 (Round 13 — self-scoped infrastructure...)`.
  Round 14 updated the root copy but did NOT update the docs copy.
- **Root cause:** There are two copies of the same file. The README's
  "Documentation Map" (line 583) references
  `docs/Project-Architecture-Document.md` as the canonical location.
  The root copy is a stale duplicate from before the monorepo
  transition moved docs into `docs/`.
- **Evidence:** `wc -l Project-Architecture-Document.md docs/Project-Architecture-Document.md`
  → both 1002 lines. `diff` → only line 6 differs.
  `git ls-files | grep -c Project-Architecture-Document` → 2 (both
  tracked).
- **Optimal fix:**
  1. Sync `docs/Project-Architecture-Document.md` to match the root
     copy (Round 14 update line) — `cp Project-Architecture-Document.md
     docs/Project-Architecture-Document.md`.
  2. Delete the root `Project-Architecture-Document.md` — it is a
     stale duplicate. The README + AGENTS + CLAUDE all reference
     `docs/Project-Architecture-Document.md` as canonical.
  3. Add a one-line check to
     `scripts/verify-plan-alignment.mjs` (or a new tiny gate) that
     asserts the root `Project-Architecture-Document.md` does NOT
     exist — preventing future re-introduction.
- **Side effect:** The root `Project-Architecture-Document.md` is
  gitignored? Let me verify — no, it's tracked (per `git ls-files`).
  Deleting it is a one-line `git rm` and a commit.
- **Confidence:** Verified
- **Type:** Doc + infra (no test changes)

### F5 — worklog.md is missing Round 11–14 entries (Low — hygiene)
- **Source:** `worklog.md` currently has only one entry (Round 10
  CLAUDE-README). Rounds 11, 12, 13, 14 did not append their work
  records — `worklog.md` was not maintained as a continuous log.
- **Root cause:** The worklog protocol was added in Round 10 but the
  discipline was not carried forward into Rounds 11–14.
- **Evidence:** `wc -l worklog.md` → 42 lines (just the Round 10
  entry). `grep -c "^---$" worklog.md` → 1 (one entry separator).
- **Optimal fix:** Append concise entries for Rounds 11–14 summarizing
  what each round changed. Each entry follows the existing template
  (Task ID / Agent / Task / Work Log / Stage Summary). Round 15's
  own entry will be appended at the end of this round.
- **Confidence:** Verified
- **Type:** Doc (no test changes)

### F6 — REMEDIATION_PLAN.md checkbox Phase 5.4 (Sentry) is stale; Phase 5.5 (source maps) is stale (Informational — future enhancement)
- **Source:** `docs/REMEDIATION_PLAN.md` Phase 5.4 (`[ ] Integrate Sentry`)
  and Phase 5.5 (`[ ] Configure Vite build to generate source maps and
  upload them to Sentry`).
- **Root cause:** Sentry was an aspirational "enterprise observability"
  item from the original plan. No code exists for it; no operator has
  requested it; the existing Pino + requestId observability stack is
  sufficient for the current scale. Sentry is a vendor-purchase decision
  that is out of scope for codebase remediation.
- **Optimal fix:** Add an explicit "deferred indefinitely — operator
  decision" note next to Phase 5.4 and 5.5 in REMEDIATION_PLAN.md.
  Do NOT remove the items (they document the original enterprise-grade
  target). Do NOT mark them as done.
- **Confidence:** Reasoned (no operator statement on Sentry; deferral
  is a reasonable interpretation of the original aspirational text)
- **Type:** Doc (no test changes)

---

## 2. Detailed TDD Breakdown — Bite-Sized Tasks

Each task is independently committable. TDD: RED → GREEN → REFACTOR.
Tests run via `npm test` (which triggers `pretest` to build shared+db
first).

### Task R15-T1 — F1: LoginPage `state.from` redirect-back

**Files touched:**
- `apps/web/src/pages/LoginPage.tsx` — implement
- `apps/web/src/pages/LoginPage.test.tsx` — add tests

**Subtasks:**
1. **RED — write 3 new tests** in `apps/web/src/pages/LoginPage.test.tsx`:
   - `redirects to state.from when set after successful login` —
     mount with `initialEntries: [{ pathname: "/login", state: { from: "/notifications" } }]`,
     fill the form, submit, assert the notifications-route test ID
     renders.
   - `falls back to / when state.from is missing` — existing behavior
     covered; add an explicit assertion.
   - `rejects absolute URLs in state.from (open-redirect guard)` —
     mount with `state: { from: "https://evil.example.com" }`,
     submit, assert navigation lands on `/`, NOT on the external URL.
2. Run `npm test --workspace @embers/web` — confirm the 3 new tests
   FAIL with the expected reason (LoginPage navigates to `/`
   regardless).
3. **GREEN — implement** in `apps/web/src/pages/LoginPage.tsx`:
   - Import `useLocation`.
   - Read `const location = useLocation()`.
   - Extract `const from = (location.state as { from?: unknown } | null)?.from`.
   - Validate: `typeof from === "string" && from.startsWith("/") && !from.startsWith("//")`.
   - On success: `navigate(validatedFrom ? from : "/", { replace: true })`.
4. Run `npm test --workspace @embers/web` — confirm 274 tests pass
   (271 + 3 new).
5. Run `npm run lint`, `npm run typecheck` — confirm clean.
6. Commit:
   `fix(LoginPage): redirect to state.from after login (R15-F1)`

### Task R15-T2 — F2: Friendly network error in `lib/api.ts`

**Files touched:**
- `apps/web/src/lib/api.ts` — implement
- `apps/web/src/lib/api.test.ts` — add tests

**Subtasks:**
1. **RED — write 3 new tests** in `apps/web/src/lib/api.test.ts`:
   - `network error (TypeError) from fetch is normalized to ApiError(0, NETWORK_ERROR)` —
     `fetchFn` rejects with `new TypeError("Failed to fetch")`;
     `api.health()` rejects with `ApiError` whose `.status === 0`,
     `.code === "NETWORK_ERROR"`, message matches `/could not reach/i`.
   - `generic Error from fetch is also normalized to NETWORK_ERROR` —
     `fetchFn` rejects with `new Error("boom")`; same assertion.
   - `original error is preserved on error.cause` — `error.cause`
     equals the original `TypeError` instance.
2. Run `npm test --workspace @embers/web` — confirm the 3 new tests
   FAIL.
3. **GREEN — implement** in `apps/web/src/lib/api.ts`:
   - Wrap the top-level `await fetchFn(url, ...)` call at line 291
     in `try { ... } catch (err) { throw new ApiError(0, "NETWORK_ERROR", "Could not reach the embers server. Please try again later.", undefined); // preserve cause via Error constructor options }`.
   - Use the `Error.cause` ES2022 option:
     `new ApiError(0, "NETWORK_ERROR", msg, undefined, err)` — extend
     `ApiError`'s constructor to accept an optional 5th `cause` arg
     and forward it via `super(message, { cause })`.
   - DO NOT wrap the refresh-and-retry `fetchFn` call at line 311
     inside `try` — that call is already inside a try/catch at
     line 309-329 that swallows all errors and propagates the
     original 401. The new wrapper is ONLY for the top-level call.
   - DO NOT wrap the retry `fetchFn` call at line 338 — if the retry
     fails, the existing handling at line 345-358 already constructs
     an `ApiError`. Leave as-is. (Actually, we SHOULD wrap the retry
     too — if the retry fetch throws, the current code does
     `retryRes.headers.get(...)` which would crash. Add the wrapper
     around the retry fetch as well, mapping the network error to
     `ApiError(0, "NETWORK_ERROR", msg)` in that path too.)
4. Run `npm test --workspace @embers/web` — confirm 277 tests pass
   (274 + 3 new).
5. Run `npm run lint`, `npm run typecheck` — confirm clean.
6. Commit:
   `fix(api): normalize fetch network errors to ApiError NETWORK_ERROR (R15-F2)`

### Task R15-T3 — F3: Strict prod-readiness gate

**Files touched:**
- `scripts/verify-prod-readiness.mjs` — new file
- `scripts/verify-prod-readiness.test.mjs` — new test file
- `package.json` — add `test:prod-readiness` script

**Subtasks:**
1. **RED — write tests** in `scripts/verify-prod-readiness.test.mjs`:
   - Use `node:test` + `node:assert` (built-in, no vitest dependency
     needed for scripts; matches the existing
     `scripts/verify-*.mjs` pattern that uses plain Node assertions
     via vitest — check existing).
   - Actually, look at `scripts/verify-plan-alignment.mjs` — it
     doesn't have a `.test.mjs` file. It's a pure script. We should
     still test the helper functions; let's add a vitest config or
     use `node:test`. Simplest: extract pure helpers
     (`checkApiReachable`, `checkSecurityHeaders`, `formatSummary`)
     into the script and test them via `node:test` runner.
   - Tests:
     - `checkSecurityHeaders({})` returns array of 5 missing
       header names.
     - `checkSecurityHeaders({ "content-security-policy": "default-src 'self'", "strict-transport-security": "..." })`
       returns array of 3 missing headers (the other 3).
     - `checkApiReachable` with a fixture 200-JSON response returns
       `{ ok: true }`; with a 404 returns `{ ok: false, reason: ... }`.
     - `formatSummary` produces a multi-line string with pass/fail
       counts and the failing probe names.
2. Run `node --test scripts/verify-prod-readiness.test.mjs` — confirm
   tests FAIL (script doesn't exist yet).
3. **GREEN — implement** `scripts/verify-prod-readiness.mjs`:
   - Export pure helpers for testing.
   - Default-export an async `main()` that:
     - Reads `PROD_BASE_URL` (default: `https://reddit.jesspete.shop/`).
     - Reads `PROD_READINESS` (default: undefined). If `=== "skip"`,
       prints "skipped" and exits 0.
     - Runs `fetch` probes against `/health`, `/api/posts`,
       `POST /api/auth/login` (with `you`/`embers-demo` creds).
     - Runs a `fetch` against `/` and inspects response headers.
     - Prints a summary table.
     - Exits 1 if any probe failed; 0 if all passed.
4. Add `"test:prod-readiness": "node scripts/verify-prod-readiness.mjs"`
   to root `package.json`.
5. Run `node --test scripts/verify-prod-readiness.test.mjs` — confirm
   tests PASS.
6. Run `PROD_READINESS=skip npm run test:prod-readiness` — confirm
   skip mode works (exits 0).
7. Run `npm run test:prod-readiness` against the live deployment —
   expect FAIL (documents the still-broken deployment). Capture the
   output for the worklog.
8. Commit:
   `feat(scripts): add strict prod-readiness gate (R15-F3)`

### Task R15-T4 — F4: Reconcile `docs/Project-Architecture-Document.md`

**Files touched:**
- `docs/Project-Architecture-Document.md` — sync to Round 14 content
- `Project-Architecture-Document.md` (root) — DELETE
- `scripts/verify-plan-alignment.mjs` — add a check that the root
  copy does NOT exist

**Subtasks:**
1. `cp Project-Architecture-Document.md docs/Project-Architecture-Document.md`
   — sync docs/ copy with the Round 14 update from root.
2. `git rm Project-Architecture-Document.md` — delete the root
   duplicate.
3. Add a check to `scripts/verify-plan-alignment.mjs` (or new
   `scripts/verify-no-root-pad-duplicate.mjs`) that asserts the root
   `Project-Architecture-Document.md` does NOT exist. Update the
   script to also check for any other root-level docs that should
   live only under `docs/`.
4. Run `npm run test:plan-alignment` — confirm it now also checks
   for the absence of the root duplicate.
5. Commit:
   `docs(PAD): reconcile docs/ with root, delete root duplicate (R15-F4)`

### Task R15-T5 — F5: Append Round 11–14 worklog entries

**Files touched:**
- `worklog.md` — append entries

**Subtasks:**
1. Read each of `docs/REMEDIATION_PLAN_ROUND_11.md`,
   `docs/REMEDIATION_PLAN_ROUND_12.md`,
   `docs/REMEDIATION_PLAN_ROUND_13.md`, and the Round 14 banner in
   `AGENTS.md` / `CLAUDE.md` / `README.md`.
2. Append a concise (≤25 line) entry for each round following the
   existing template (`Task ID / Agent / Task / Work Log / Stage
   Summary`).
3. Commit:
   `docs(worklog): backfill Round 11–14 entries (R15-F5)`

### Task R15-T6 — F6: Annotate Sentry deferral in REMEDIATION_PLAN.md

**Files touched:**
- `docs/REMEDIATION_PLAN.md` — annotate Phase 5.4 and 5.5

**Subtasks:**
1. Edit Phase 5.4 line: append
   ` — **deferred indefinitely** (operator decision; Pino + requestId is sufficient for current scale).`
2. Edit Phase 5.5 line: same annotation.
3. Run `npm run test:plan-alignment` — confirm it still passes (the
   forbidden-token check should not be affected by these annotations).
4. Commit:
   `docs(plan): annotate Sentry phases as deferred indefinitely (R15-F6)`

### Task R15-T7 — Update AGENTS.md / CLAUDE.md / README.md / reddit-clone_SKILL.md with Round 15 banner

**Files touched:**
- `AGENTS.md`, `CLAUDE.md`, `README.md`, `reddit-clone_SKILL.md`

**Subtasks:**
1. Prepend a "Round 15 (2026-08-19)" blockquote banner to each doc
   summarizing the 6 findings + test count change (467 → 470+3+3 = 473;
   the exact delta depends on the TDD test additions for F1/F2/F3).
2. Update the test-count breakdown in `CLAUDE.md` and `README.md`.
3. Update the pre-commit checklist in `CLAUDE.md` and `AGENTS.md` to
   include `npm run test:prod-readiness` (as an opt-in check, like
   `test:e2e:live`).
4. Commit:
   `docs: align AGENTS/CLAUDE/README/SKILL with Round 15 changes (R15-T7)`

### Task R15-T8 — Append Round 15 entry to worklog.md

**Files touched:**
- `worklog.md` — append the Round 15 entry

**Subtasks:**
1. Append a comprehensive entry following the template.
2. Commit:
   `docs(worklog): append Round 15 entry (R15-T8)`

### Task R15-T9 — Final verification + git push

**Subtasks:**
1. Run the full pre-commit checklist:
   ```
   npm run lint
   npm run typecheck
   npm test
   npm run test:plan-alignment
   npm run test:no-secrets
   npm run test:gitignore
   npm run test:ci-config
   npm run build
   git ls-files | grep -E '(^|/)dist/' | wc -l   # must be 0
   ```
2. Verify the new `test:prod-readiness` script runs (skip mode).
3. Stage all changes:
   `git add -A`
4. Verify nothing secret-bearing is staged:
   `git status` — confirm no `.env`, `env.bak`, or `*.db` files.
5. Commit each task as a separate logical commit (R15-T1 through
   R15-T8 above), OR a single commit if the changes are intertwined.
   Prefer the per-task commit strategy for traceability.
6. Push to origin/main using the SSH wrapper:
   ```bash
   GIT_SSH_COMMAND="/path/to/ssh_git_wrapper_v3.py -i ~/.ssh/id_github -o StrictHostKeyChecking=accept-new" git push origin main
   ```

---

## 3. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| F1 open-redirect guard is incomplete | Low | High (security) | Test explicitly covers `https://evil.example.com`, `//evil.com`, backslashes; only accept paths starting with single `/`. |
| F2 wrapper swallows retry path errors | Medium | Medium (UX) | Tests cover both the top-level fetch AND the retry-fetch paths; the retry-path wrapper throws `ApiError(0, NETWORK_ERROR)` instead of crashing on `retryRes.headers`. |
| F3 false-positive failures on a flaky network | Medium | Low (operator friction) | Add a 10s timeout + 1 retry on each probe; print clear remediation hints. |
| F4 deletion breaks a hidden reference | Low | Low (doc) | `grep -rn "Project-Architecture-Document.md" docs/ AGENTS.md CLAUDE.md README.md reddit-clone_SKILL.md` — confirm all references point to `docs/`. |
| F5 worklog backfill misrepresents facts | Low | Low (hygiene) | Each backfilled entry cross-references the corresponding `REMEDIATION_PLAN_ROUND_*.md` file as authoritative. |
| F6 annotation misrepresents operator intent | Low | Low (doc) | Wording is "deferred indefinitely (operator decision)" — neutral, not "rejected". |

---

## 4. Definition of Done (per task)

- [ ] RED test(s) written and confirmed failing for the right reason.
- [ ] GREEN implementation minimal and passes the RED test(s).
- [ ] `npm run lint`, `npm run typecheck`, `npm test` all clean.
- [ ] `npm run test:plan-alignment` still passes (no forbidden tokens).
- [ ] `npm run test:no-secrets` + `test:gitignore` still pass.
- [ ] Relevant docs updated in the same commit (or follow-up commit
      in R15-T7).
- [ ] Worklog entry appended (R15-T8).
- [ ] Commit message follows the existing convention
      (`fix(scope): summary (R15-Fx)`).

---

## 5. Out of Scope for Round 15

- B17 (build refactor: remove `vite-plugin-singlefile`, switch to
  `BrowserRouter`). Still deferred — needs explicit operator
  confirmation per Round 7 §1.2.
- B19–B22 (React Query, feeds/search wiring, optimistic UI,
  notification polling). Depends on B17.
- LIVE-CRIT-2/3/4 deployment fixes (reverse proxy to Fastify,
  CDN-side security headers). Operator-side — Round 15 adds a gate
  that surfaces them clearly but does not fix them.
- Sentry integration (Phase 5.4/5.5). Deferred indefinitely per F6.
- History rewriting for the leaked JWT secrets in commits `89f1012`,
  `526a836`, `e09e425`. Still rotation-only per Round 9/10.
