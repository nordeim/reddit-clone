# Round 10 — Comprehensive Audit-Driven Remediation Plan

> **Date:** 2026-08-10
> **Trigger:** Operator asked for a fresh browser-based E2E audit of
> `https://reddit.jesspete.shop/` followed by TDD remediation of any
> findings, plus doc alignment with `audit_report_1.md`,
> `audit_report_2.md`, and `session_8.md`.
>
> **Confidence:** Verified — every finding below was reproduced locally
> and against the live site, with source-level root-cause analysis.

---

## 1. Validation of Prior Audit Reports

### 1.1 `audit_report_1.md` — All 6 Findings Verified

| ID | Finding | Validation |
|---|---|---|
| F1 | `REMEDIATION_PLAN.md` §2 + §3.1 propose tRPC; codebase uses REST+Zod (ADR-101) | ✅ Verified — `apps/server/src/routes/*.ts` are Fastify REST routes; no tRPC dependency in any `package.json`. |
| F2 | `REMEDIATION_PLAN.md` §2 proposes `pnpm` + Turborepo; repo uses npm-workspaces (ADR-107) | ✅ Verified — root `package.json` has `"workspaces": ["apps/*", "packages/*"]`; only `package-lock.json` present. |
| F3 | B17–B22 are load-bearing despite deferral | ✅ Verified — `apps/web/src/data/*` is still imported by `HomePage`, `CommunityPage`, `PostPage`, `ProfilePage`, `SearchPage`. |
| F4 | Live deployment gaps (LIVE-CRIT-2/3/4) | ✅ Verified — `curl https://reddit.jesspete.shop/health` returns 404; `/api/posts` returns 404; `/api/auth/login` returns 501; all 5 security headers missing. |
| F5 | Secrets in git history (commits `89f1012`, `526a836`) | ✅ Verified — documented in `docs/SECRET_ROTATION_GUIDE.md`; operator rotation is the primary remediation. |
| F6 | Test infrastructure gaps (no Prettier, no coverage thresholds, no ZAP/DAST, no pre-commit gitleaks hook) | ✅ Verified — CI runs gitleaks on push but no local pre-commit hook. |

### 1.2 `audit_report_2.md` — All 7 Findings Verified

| ID | Finding | Validation |
|---|---|---|
| F1 | API Layer Contradiction (tRPC vs REST+Zod) | ✅ Verified — same as audit-1 F1. |
| F2 | Monorepo Tooling Contradiction (pnpm/Turborepo vs npm) | ✅ Verified — same as audit-1 F2. |
| F3 | JWT Algorithm Mismatch (RS256 vs HS256) | ✅ Verified — `apps/server/src/auth/jwt.ts` line 21 documents HS256; uses `jose` `SignJWT.setProtectedHeader({ alg: 'HS256' })`. `REMEDIATION_PLAN.md` §5.1 says RS256. |
| F4 | Data Model ID Strategy (UUID vs Branded/Sequential) | ✅ Verified — `packages/shared/src/ids.ts` defines `UserId`, `PostId`, `CommentId`, etc. as branded strings. Seed script generates `u1`, `p1`, `c1` IDs. `REMEDIATION_PLAN.md` §4.1 says `id (UUID)`. |
| F5 | ADR Revocation vs. Deferred Execution | ✅ Verified — `REMEDIATION_PLAN.md` §1 "revokes" ADR-001/003/004 but §11 defers B17 (which removes 003 + 004). The ADRs remain load-bearing until B17 executes. |
| F6 | Frontend Integration Deadlock | ✅ Verified — B19–B22 depend on B17 (BrowserRouter + chunked build), but B17 is deferred to preserve "deploy anywhere" hosting. |
| F7 | Loss of Offline Capability | ✅ Verified — `REMEDIATION_PLAN.md` §4.4 proposes removing all server state from Zustand; deterministic `src/data/*` would no longer be a fallback. |

### 1.3 `session_8.md` — Status of Findings

The Round 8 audit (session_8.md) identified 2 critical, 5 major, 8 minor,
and 4 npm-script issues. Most were applied in-session; the following
remain **open** and are addressed by Round 10:

| Issue | Status Before R10 | R10 Action |
|---|---|---|
| C1 — AGENTS.md "no backend" contradiction | ✅ Fixed in session_8 | Re-verify only |
| C2 — CLAUDE.md missing Live Deployment section | ✅ Fixed in session_8 | Re-verify only |
| M1 — Pre-commit checklist divergence | ✅ Fixed in session_8 | Re-verify only |
| M2 — "428 at Round 6" only in CLAUDE.md | ⏭ Deferred | R10 will add the note to AGENTS.md |
| M3 — CLAUDE.md missing Repo Hygiene cross-ref | ⏭ Deferred | R10 will add the cross-reference |
| M4 — Test count categorization | ✅ Implicitly fixed | No action |
| M5 — README.md duplication | ⏭ Deferred | R10 will collapse the duplicates |
| m1 — Build size mismatch | ⏭ Low impact | Reconcile to actual built size |
| m2 — Version imprecision | ⏭ Low impact | Pin to exact versions |
| m3 — CLAUDE.md tree omits `src/data/images.ts` | ⏭ Low impact | Add it |
| m4 — AGENTS.md has no tech version table | ⏭ Low impact | Cross-ref to CLAUDE.md |
| m5 — Argon2id vs argon2 naming | ⏭ Low impact | Standardize |
| m6 — Absolute negative framing | ✅ Fixed via C1 | No action |
| m7 — README File Hierarchy hooks as separate files | ⏭ Low impact | Add note about `hooks/index.ts` |
| m8 — AGENTS.md says "React 19" | ⏭ Low impact | Pin to 19.2.6 |
| S1/S2 — `npm run db:migrate --workspace @embers/db` broken | ✅ Fixed in session_8 | Re-verify only |
| S3 — `npm run db:generate` missing workspace scope | ✅ Fixed in session_8 | Re-verify only |
| S4 — `@embers/server` missing coverage script | ✅ Fixed in session_8 | Re-verify only |

---

## 2. Round 10 E2E Audit — New Bugs Discovered

A new extended live E2E suite (`e2e/live_extended.spec.ts`, 16 tests)
probed user journeys NOT covered by the Round 8 suite. It surfaced
**5 new findings**, of which 4 are real bugs requiring code fixes:

| ID | Severity | Title | Root Cause |
|---|---|---|---|
| BUG-R10-1 | Test-only | `savedPosts` field-name mismatch in test | Test asserted `parsed.state.savedPosts` but the actual store field is `savedPostIds: string[]`. |
| **BUG-R10-2** | **Critical** | PostPage crashes with React error #185 on every post detail navigation | `apps/web/src/pages/PostPage.tsx:24` uses `useAppStore((s) => s.localComments[postId] ?? [])` — the `?? []` returns a new array reference on every render, causing React 19's `useSyncExternalStore` (used by zustand) to infinite-loop with "Maximum update depth exceeded". The ErrorBoundary catches the crash and renders the fallback UI on every `/comments/:postId` navigation. |
| **BUG-R10-3** | Medium | NotFoundPage lacks "404" / "not found" text | `apps/web/src/pages/NotFoundPage.tsx` renders "Nothing here yet" / "drifted off into space" — neither "404" nor "not found" appears, hurting UX/SEO/screen-reader identification. |
| **BUG-R10-4** | Medium | Mobile horizontal overflow (37px) on 375px viewport | `apps/web/src/components/layout/Navbar.tsx:43` — the search-bar wrapper `<div className="mx-auto w-full max-w-xl flex-1">` lacks `min-w-0`. Flexbox defaults `min-width: auto`, so the SearchBar's `<input>` (intrinsic min ~200px) prevents the flex item from shrinking below its content size, pushing the right-side `Create + Log in + Sign up` cluster past the viewport. |
| **BUG-R10-5** | Medium | RegisterPage submit button enabled when passwords mismatch | `apps/web/src/pages/RegisterPage.tsx:182-187` — the `disabled` check only verifies the three fields are non-empty; it does NOT check `password !== confirmPassword`. The form's `handleSubmit` catches the mismatch later (line 56), but the button stays enabled — confusing UX. |

### 2.1 Reproduction Evidence

**BUG-R10-2** was reproduced locally against both the production build
(`apps/web/dist/`) and the Vite dev server. The dev server's unminified
error message is the canonical confirmation:

```
console.error: The result of getSnapshot should be cached to avoid an infinite loop
console.error: Error: Maximum update depth exceeded. This can happen when a
  component repeatedly calls setState inside componentWillUpdate or
  componentDidUpdate. React limits the number of nested updates to prevent
  infinite loops.
console.error: [ErrorBoundary] render error {name: Error, message: Maximum
  update depth exceeded...}
```

URL after click: `http://localhost:8766/#/comments/p18`. The
ErrorBoundary fallback ("⚠️ Something went wrong") renders in place of
the post body — the live site has been broken for post detail views
since the Round 6/7 auth integration widened `AuthUser` and the
production build started using React 19's stricter `useSyncExternalStore`.

**BUG-R10-4** was reproduced via a Playwright probe that walked the DOM
on a 375×667 viewport and reported every element with `rect.right >
clientWidth`:

```
{
  "clientWidth": 375,
  "scrollWidth": 412,
  "overflow": 37,
  "sample": [
    {
      "tag": "div",
      "cls": "flex shrink-0 items-center gap-1.5 sm:gap-2",
      "rect": "left=182 right=412 w=230",
      "text": "CreateLog inSign up"
    },
    ...
  ]
}
```

**BUG-R10-5** was confirmed by reading `RegisterPage.tsx` lines 180-187
directly:

```tsx
<button
  type="submit"
  disabled={
    submitting ||
    username.length === 0 ||
    password.length === 0 ||
    confirmPassword.length === 0
  }
  ...
>
```

The `disabled` predicate checks for empty fields but not for password
mismatch. The fix is to add `password !== confirmPassword` to the
condition.

**BUG-R10-3** was confirmed by reading `NotFoundPage.tsx`:

```tsx
<h1 className="text-xl font-extrabold ...">Nothing here yet</h1>
<p className="text-sm text-zinc-500">
  This page drifted off into space. Let's get you back home.
</p>
```

Neither "404" nor "not found" appears anywhere on the page.

---

## 3. Comprehensive Remediation Plan & ToDo List

### Track A: Critical Bug Fixes (TDD)

> Each fix below is gated by a failing test that is written FIRST,
> then the implementation is changed to make it pass, then the test
> suite is run to confirm no regressions.

#### A1. Fix PostPage React error #185 (BUG-R10-2) — CRITICAL

**TDD step 1 — write failing test:**

Add `apps/web/src/pages/PostPage.test.tsx` with a test that:
1. Renders `<PostPage />` inside a `<MemoryRouter initialEntries={["/comments/p1"]}>`.
2. Wraps it in `<ErrorBoundary>` and `<AuthProvider>` (with a stub client).
3. Wraps in a fresh zustand store (or clears localStorage).
4. Asserts: no `⚠️ Something went wrong` text appears; the post title
   renders; at least one comment element is visible after the simulated
   500ms latency.
5. Asserts: `console.error` was NOT called with "Maximum update depth
   exceeded" or "getSnapshot should be cached".

**TDD step 2 — fix:**

Change `apps/web/src/pages/PostPage.tsx:24` from:

```tsx
const localComments = useAppStore((s) => s.localComments[postId] ?? []);
```

to:

```tsx
// Module-scope stable empty array — prevents zustand's
// useSyncExternalStore from seeing a new reference every render
// (React 19 stricter than v18; causes "Maximum update depth exceeded").
const EMPTY_COMMENTS: Comment[] = [];
// ...
const localComments = useAppStore((s) => s.localComments[postId] ?? EMPTY_COMMENTS);
```

**TDD step 3 — verify:**

- Run `npm test --workspace @embers/web` — new test passes.
- Run `npm run test:e2e` — no regressions.
- Re-build prod bundle and re-run `e2e/repro_r10_postpage.spec.ts` — should now fail (the bug is gone).

**DoD:** PostPage renders without crashing on both dev and prod builds.

---

#### A2. Fix NotFoundPage copy (BUG-R10-3) — Medium

**TDD step 1 — write failing test:**

Update `apps/web/src/pages/NotFoundPage.test.tsx` (or create if missing)
to assert the rendered output contains "404" OR "not found" (case-insensitive).

**TDD step 2 — fix:**

Update `apps/web/src/pages/NotFoundPage.tsx` to:

```tsx
<h1 className="text-xl font-extrabold ...">404 — Page not found</h1>
<p className="text-sm text-zinc-500">
  This page drifted off into space. Let's get you back home.
</p>
```

**TDD step 3 — verify:**

- Run `npm test --workspace @embers/web` — test passes.
- Run `npm run test:e2e:live` — `R10-NOTFOUND` test now passes.

**DoD:** NotFoundPage contains "404" in its visible text.

---

#### A3. Fix mobile horizontal overflow (BUG-R10-4) — Medium

**TDD step 1 — write failing test:**

Add a Playwright test to `e2e/live_extended.spec.ts` (already present
as the "mobile viewport" test — currently failing). The test asserts
`scrollWidth <= clientWidth + 5` on a 375×667 viewport.

Additionally, add a unit-level test in
`apps/web/src/components/layout/Navbar.test.tsx` that snapshots the
computed class names and asserts the search wrapper has `min-w-0`.

**TDD step 2 — fix:**

Update `apps/web/src/components/layout/Navbar.tsx:43` from:

```tsx
<div className="mx-auto w-full max-w-xl flex-1">
```

to:

```tsx
<div className="mx-auto w-full max-w-xl flex-1 min-w-0">
```

The `min-w-0` overrides the default `min-width: auto`, allowing
flexbox to shrink the SearchBar below its input's intrinsic size.

**TDD step 3 — verify:**

- Run `npm test --workspace @embers/web` — Navbar test passes.
- Build prod bundle, serve locally, run `e2e/live_extended.spec.ts` "mobile viewport" test — passes.

**DoD:** Mobile viewport (375×667) renders without horizontal scroll.

---

#### A4. Fix RegisterPage submit button (BUG-R10-5) — Medium

**TDD step 1 — write failing test:**

Add a test to `apps/web/src/pages/RegisterPage.test.tsx` that:
1. Renders `<RegisterPage />`.
2. Fills username = "newuser123", password = "validpassword123",
   confirmPassword = "differentpassword456".
3. Asserts the submit button is `disabled`.

**TDD step 2 — fix:**

Update `apps/web/src/pages/RegisterPage.tsx:182-187` from:

```tsx
disabled={
  submitting ||
  username.length === 0 ||
  password.length === 0 ||
  confirmPassword.length === 0
}
```

to:

```tsx
disabled={
  submitting ||
  username.length === 0 ||
  password.length === 0 ||
  confirmPassword.length === 0 ||
  password !== confirmPassword
}
```

**TDD step 3 — verify:**

- Run `npm test --workspace @embers/web` — new test passes.
- Run `npm run test:e2e:live` — `R10-REGISTER-MISMATCH` test passes.

**DoD:** Submit button is disabled when passwords don't match.

---

### Track B: Documentation Alignment (Resolve audit_report_1/2 + session_8 deferred items)

#### B1. Update `docs/REMEDIATION_PLAN.md` (audit F1-F7)

| Section | Change |
|---|---|
| §1 (Revoked ADRs) | Change "Revoke" → "Target State (Pending B17 Execution)". ADRs remain active until B17 executes. |
| §2 (Target Architecture Stack) | Remove tRPC; replace with "REST + Zod (Fastify)". Remove pnpm/Turborepo; replace with "npm-workspaces". |
| §3.1 (Phase 3 API & Security) | Remove `@trpc/server`; replace with "Fastify REST routes with Zod validation in `packages/shared`". |
| §4.1 (SQLite Data Model) | Change `id (UUID)` to `id (BrandedString, e.g. UserId) — seeded as u1/p1 in dev; UUIDs/ULIDs in prod`. |
| §4.2 (API Contract & Frontend Integration Mapping) | Replace "Axios Interceptor" with "fetch-based `apps/web/src/lib/api.ts` + `AuthProvider` 401-refresh-and-retry hook". |
| §4.4 (Refactor Zustand Store) | Add "Hybrid Data Strategy" note: React Query attempts API first; on failure/initial load, falls back to deterministic `src/data/*` layer. |
| §5.1 (Authentication Design) | Change "Asymmetric JWT (RS256)" → "Symmetric JWT (HS256) via `jose`". |

#### B2. Update `AGENTS.md`, `CLAUDE.md`, `README.md` (session_8 deferred + R10 banner)

- **AGENTS.md**:
  - Add Round 10 banner (audit + 4 bug fixes).
  - Add "428 total at Round 6" note (M2).
  - Pin React to 19.2.6 (m8).
  - Pin framer-motion / testing-library / jsdom to exact versions (m2).
  - Standardize "argon2 (Argon2id algorithm)" naming (m5).
  - Note hooks in `index.ts` (m7).
- **CLAUDE.md**:
  - Add Round 10 banner.
  - Add cross-reference to AGENTS.md §Repo Hygiene (M3).
  - Add `src/data/images.ts` to file tree (m3).
- **README.md**:
  - Add Round 10 status to Live Deployment section.
  - De-duplicate Quick Start / Tech Stack / File Hierarchy (M5).
  - Reconcile build size to actual (m1).

#### B3. Update `docs/audit_report_1.md` + `docs/audit_report_2.md`

Add a Round 10 status note to each finding documenting which were
resolved by R10 (doc-drift findings) vs. which remain operator-action
items (live deployment gaps).

---

### Track C: E2E Audit Suite Hardening

#### C1. Land `e2e/live_extended.spec.ts` (already written, 16 tests)

The new suite covers user journeys NOT in the Round 8 `live.spec.ts`:
vote toggle persistence, save-post persistence, community navigation,
post detail page, profile page, NotFound, sort tabs, mobile viewport,
deep-link refresh, login error alert, register validation, page title,
right panel, comment composer, backend reachability probe.

#### C2. Update `playwright.live.config.ts` to include the new suite (already done)

`testMatch: /live.*\.spec\.ts/` matches both `live.spec.ts` and
`live_extended.spec.ts`.

#### C3. Land `e2e/repro_r10_postpage.spec.ts` as a regression guard

Keep the reproduction harness as a permanent regression test. It runs
against a locally-served prod build (`PROD_BASE_URL=... npm run test:repro`)
and asserts the PostPage does NOT crash with React error #185. Add
a `test:repro` npm script.

---

### Track D: Plan-Alignment CI Gate

#### D1. Add `scripts/verify-plan-alignment.mjs`

A Node script that asserts `docs/REMEDIATION_PLAN.md` does NOT contain
forbidden tokens:

```js
const FORBIDDEN = ["tRPC", "pnpm", "Turborepo", "RS256", "UUID (except in 'escape hatch' context)"];
```

Exits 1 if any forbidden token is found, with a clear error message
pointing to the line number.

#### D2. Add `test:plan-alignment` script to root `package.json`

```json
"test:plan-alignment": "node scripts/verify-plan-alignment.mjs"
```

#### D3. Add to pre-commit checklist in `AGENTS.md` + `CLAUDE.md`

```bash
npm run test:plan-alignment   # asserts REMEDIATION_PLAN.md has no tRPC/pnpm/RS256/UUID references
```

---

## 4. Execution Order & TDD Discipline

1. **Track A1** (PostPage crash, CRITICAL) — write failing test → fix → verify.
2. **Track A2** (NotFoundPage copy) — write failing test → fix → verify.
3. **Track A3** (mobile overflow) — write failing test → fix → verify.
4. **Track A4** (register validation) — write failing test → fix → verify.
5. **Track B1** (REMEDIATION_PLAN.md alignment) — apply all 7 section edits.
6. **Track D1-D3** (plan-alignment gate) — add script + npm script + checklist.
7. **Track B2** (AGENTS.md / CLAUDE.md / README.md alignment + R10 banner).
8. **Track B3** (audit_report_1/2 status notes).
9. **Track C1-C3** (E2E suite + repro harness) — already partially done.
10. **Final verification:** run `npm test`, `npm run lint`, `npm run typecheck`, `npm run test:build`, `npm run test:no-secrets`, `npm run test:gitignore`, `npm run test:ci-config`, `npm run test:plan-alignment`, and the live E2E suite against the live site.

Each Track A item is one atomic commit on `main`. Track B/D items may
be grouped into a single "docs + gates" commit.

---

## 5. Risk Register

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| PostPage fix changes render timing | Low | Medium | The fix uses a stable empty array — no timing change. Re-run all 262 web tests to catch regressions. |
| Mobile overflow fix breaks desktop layout | Low | Low | `min-w-0` only affects flex-shrink behavior; desktop viewport already has enough room. Re-run live E2E on 1280px viewport to confirm. |
| Register validation fix blocks valid submissions | Low | Low | The fix only adds a mismatch check; valid submissions (passwords match) are unaffected. Existing 11 RegisterPage tests cover the happy path. |
| Doc alignment changes break existing links | Low | Low | All doc edits are internal; no external links are changed. |
| Plan-alignment CI gate fails on existing docs | High | Low | The gate is added AFTER Track B1 fixes the docs, so the first run passes. |

---

## 6. Definition of Done

- [ ] All 4 bug fixes (Track A) pass their new TDD tests.
- [ ] `npm test` — all 453+ tests pass (plus the new R10 tests).
- [ ] `npm run lint` — 0 errors, 0 warnings.
- [ ] `npm run typecheck` — passes clean.
- [ ] `npm run test:build` — production build is valid.
- [ ] `npm run test:no-secrets` — passes.
- [ ] `npm run test:gitignore` — passes.
- [ ] `npm run test:ci-config` — passes.
- [ ] `npm run test:plan-alignment` — passes (NEW).
- [ ] `LIVE_BASE_URL=https://reddit.jesspete.shop/ npm run test:e2e:live` — both `live.spec.ts` (12) and `live_extended.spec.ts` (16) pass, except for tests that probe the unreachable backend (those remain informational).
- [ ] `docs/REMEDIATION_PLAN.md` no longer references tRPC, pnpm, Turborepo, RS256, or UUID (verified by `npm run test:plan-alignment`).
- [ ] `AGENTS.md`, `CLAUDE.md`, `README.md` updated with Round 10 banner + session_8 deferred fixes.
- [ ] `docs/audit_report_1.md` + `docs/audit_report_2.md` annotated with Round 10 status.
- [ ] All changes committed to `main` and pushed via the SSH wrapper.
