# embers — Remediation Plan, Round 3 (2026-08-10)

**Status:** ACTIVE — execution in progress
**Scope:** Close real gaps found by validating `docs/REMEDIATION_PLAN.md` and
`docs/REMEDIATION_EXECUTION_PLAN.md` against the current codebase.
**Approach:** TDD (red → green → refactor) for every code-bearing change.
**Branch policy:** `main` only — no feature branches (per orchestrating instruction).

---

## 1. Validation of the source plans against the codebase (Round 3)

### 1.1 What `REMEDIATION_PLAN.md` proposes vs. what exists today

The 10-ADR plan (ADR-101…ADR-110) and the B0–B24 sequenced backlog are the
authoritative source. The Round 1 + Round 2 execution passes landed B0–B16 on
`main`. This round re-checks that state and finds the following:

| Backlog ID | Plan claim | Codebase state today (Round 3) | Action |
| --- | --- | --- | --- |
| B0–B16 | "Done" | Verified present (4 workspaces, 7 DB tables, 14 API routes, Helmet + rate-limit + Pino + requestId). | None — confirmed. |
| Test count | "367 tests pass" (per `README.md`, `CLAUDE.md`, `docs/REMEDIATION_EXECUTION_PLAN.md` §8.4) | **Actual: 366 pass + 1 fail** in `apps/server/src/routes/api.test.ts` → "returns a tree with children arrays". | **Fix** — see §2.1. |
| B17–B22 (frontend refactor) | "Deferred" | Still deferred. `apps/web` retains HashRouter + `vite-plugin-singlefile` + Zustand overlay + 176 tests, all green. | Document as still-deferred. |
| B23 (Docker + GitHub Actions) | "Deferred — pre-deployment concern" | Not started. | **Land in Round 3** — see §2.3. |
| B24 (Playwright E2E) | "Deferred — pre-deployment concern" | Not started. | **Land in Round 3** — see §2.4. |
| Repo hygiene | (Implicit — `dist/` is gitignored) | **96 `dist/` build artifacts committed in `16d482c` "remediation 3"** despite `.gitignore` listing `apps/server/dist/`, `packages/*/dist/`, `dist/`. They were force-added or added before the gitignore rule was effective. | **Fix** — see §2.2. |

### 1.2 Root-cause analysis of the failing test

**Test:** `apps/server/src/routes/api.test.ts` →
`describe("GET /api/posts/:id/comments") > it("returns a tree with children arrays")`.

**Symptom:** `AssertionError: expected false to be true` at line 596.

**Root cause:** The test iterates the first 5 posts returned by
`GET /api/posts?limit=5` (sorted by `created_at DESC`). For each post it fetches
the comment tree and inspects **only `body.data[0]`** — i.e. the highest-scored
root comment — checking that `Array.isArray(first.children)` is true. If the
highest-scored root comment has no replies, the test silently moves to the next
post without setting `found = true`. If none of the top 5 posts has a
highest-scored root comment with replies, the test fails.

The seed data has 3037 comments (1452 are replies with `parent_id IS NOT NULL`)
and most posts have at least one reply somewhere in their tree — but there is no
guarantee that the *highest-scored root comment* of any given post is the one
that has replies. The test's assertion is correct (every node in the tree should
have a `children` array) but its iteration logic is brittle.

**Fix:** iterate *all* root comments of each post, not just `body.data[0]`. The
first root comment that has a non-empty `children` array sets `found = true` and
breaks. This still verifies the contract ("every node has a `children` array")
but doesn't depend on seed-data ordering.

### 1.3 Root-cause analysis of the `dist/` pollution

The `16d482c` "remediation 3" commit added:

- 31 files under `apps/server/dist/`
- 9 files under `apps/web/dist/` (incl. `index.html` and 8 category JPGs)
- 28 files under `packages/db/dist/`
- 28 files under `packages/shared/dist/`

Total: 96 compiled artifacts committed to `main`. The root `.gitignore` has
`dist/`, `apps/server/dist/`, `packages/*/dist/` — but git only applies
gitignore rules to *untracked* files. Once a file is staged and committed, the
gitignore rule has no effect; the file stays tracked until explicitly removed
with `git rm --cached`.

**Fix:** `git rm -r --cached apps/server/dist apps/web/dist packages/db/dist packages/shared/dist`. The files stay on disk (so local builds still work); they
are simply removed from git's index and will not be tracked on future commits.

---

## 2. Round 3 ToDo list (TDD-driven)

### 2.1 Fix the failing `api.test.ts` comment-tree test (Critical — unblocks "all green")

- [ ] **2.1.1** Update the test to iterate *all* root comments of each post, not
  just `body.data[0]`. Assert every inspected node has `Array.isArray(children)`.
- [ ] **2.1.2** Run `npm test --workspace @embers/server -- src/routes/api.test.ts`
  → expect 46/46 passing.
- [ ] **2.1.3** Run full `npm test` → expect 367/367 passing (was 366+1 fail).

### 2.2 Remove accidentally-committed `dist/` artifacts (Repo hygiene)

- [ ] **2.2.1** `git rm -r --cached apps/server/dist apps/web/dist packages/db/dist packages/shared/dist` — untrack without deleting from disk.
- [ ] **2.2.2** Verify `.gitignore` already covers these paths (it does — `dist/`,
  `apps/server/dist/`, `packages/*/dist/`).
- [ ] **2.2.3** Verify `git status` shows the removals as staged deletions, and
  that the files still exist on disk (`ls apps/server/dist/app.js` works).
- [ ] **2.2.4** Verify `npm run build` still produces the same `dist/` files
  locally (i.e. removing them from git did not break the build).

### 2.3 B23 — Docker + GitHub Actions CI (lands in Round 3)

#### 2.3.1 Dockerfile (multi-stage, Node 20 LTS)

- [ ] **2.3.1.1** Write `Dockerfile` at repo root:
  - Stage 1 (`builder`): `node:20-bookworm-slim`, install deps with
    `npm ci --omit=dev` for production deps only, then `npm ci` (with devDeps)
    in a separate stage for building, run `npm run build`, run `npm prune --omit=dev`.
  - Stage 2 (`runner`): `node:20-bookworm-slim`, copy only `package.json`,
    `package-lock.json`, `apps/server/dist/`, `packages/*/dist/`, and
    `node_modules/` (production only). Expose 4000. `CMD ["node", "apps/server/dist/index.js"]`.
- [ ] **2.3.1.2** Write `.dockerignore` to exclude `node_modules`, `**/dist`,
  `*.db*`, `.git`, `apps/web/node_modules`, `skills/`, `docs/`.

#### 2.3.2 docker-compose.yml (local dev orchestration)

- [ ] **2.3.2.1** Write `docker-compose.yml` at repo root with a single service
  `embers-server` that builds from the Dockerfile, maps port 4000, mounts a
  volume for `packages/db/dev.db` persistence, and sets env vars
  (`NODE_ENV=production`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`,
  `DATABASE_URL=/data/dev.db`, `CORS_ORIGIN=http://localhost:5173`).

#### 2.3.3 GitHub Actions CI workflow

- [ ] **2.3.3.1** Write `.github/workflows/ci.yml`:
  - Triggers: `push` to `main`, `pull_request` to `main`.
  - Job `test` (ubuntu-latest, Node 20):
    - `actions/checkout@v4`
    - `actions/setup-node@v4` with `cache: npm` and `node-version: 20`
    - `npm ci`
    - `npm run typecheck`
    - `npm test --workspaces --if-present`
    - Upload coverage artifact (optional).
  - Job `build` (depends on `test`): `npm run build`, upload `apps/server/dist`
    and `apps/web/dist` as artifacts.

### 2.4 B24 — Playwright E2E smoke test (lands in Round 3)

- [ ] **2.4.1** Add `@playwright/test` to root `devDependencies` (or to a new
  `apps/e2e` workspace — choose the lighter option, which is root devDeps).
- [ ] **2.4.2** Write `playwright.config.ts` at repo root: base URL
  `http://localhost:4000`, single chromium project, `webServer` config that
  starts the Fastify server on port 4000 with a test SQLite DB.
- [ ] **2.4.3** Write `e2e/smoke.spec.ts`:
  - `GET /health` returns 200 with `{ status: "ok" }`.
  - `POST /api/auth/register` with a unique username returns 201.
  - `POST /api/auth/login` with the seeded demo user returns 200 + access token.
  - `GET /api/posts?limit=5` returns 5 posts.
  - `GET /api/search?q=react&type=posts` returns ≥0 results (no 422).
- [ ] **2.4.4** Run `npx playwright test` → expect 4/4 passing.
- [ ] **2.4.5** Add `playwright-report/`, `test-results/`, `e2e/.auth/` to
  `.gitignore`.

### 2.5 Documentation updates

- [ ] **2.5.1** Update `README.md`:
  - Add "Round 3" row to the test status table (367 passing, 0 failing).
  - Add Docker quick-start section.
  - Add CI badge placeholder.
- [ ] **2.5.2** Update `CLAUDE.md`:
  - Add `dist/` artifacts must never be committed (pre-commit check).
  - Add Playwright E2E conventions.
- [ ] **2.5.3** Update `AGENTS.md`:
  - Note the `dist/` untracking and the test fix.
- [ ] **2.5.4** Append `docs/REMEDIATION_EXECUTION_PLAN.md` §9 "Round 3":
  - Document the test fix + root cause.
  - Document the `dist/` untracking.
  - Document B23 (Docker + CI) and B24 (Playwright) landing.
  - Update §8.4 test count table.
- [ ] **2.5.5** Update `docs/REMEDIATION_PLAN.md` §6 to mark B23 and B24 as
  done (remove "DEFERRED" annotation, add "Done in Round 3").

### 2.6 Final verification

- [ ] **2.6.1** `npm test` → 367/367 green (includes new Playwright smoke if
  run; otherwise 367 vitest tests + 4 Playwright tests).
- [ ] **2.6.2** `npm run typecheck` → exit 0 across all 4 workspaces.
- [ ] **2.6.3** `npm run build` → all 4 workspaces emit `dist/`.
- [ ] **2.6.4** `git status` → clean working tree.
- [ ] **2.6.5** `git log --oneline -10` → Round 3 commits present on `main`.

---

## 3. Pre-mortem — top failure modes

| Failure mode | Mitigation |
| --- | --- |
| Removing `dist/` from git breaks the build | `git rm --cached` only untracks; the files stay on disk. `npm run build` regenerates them. |
| Dockerfile fails because `apps/server/dist/index.js` doesn't exist | The Dockerfile runs `npm run build` in the builder stage, so `dist/` is regenerated inside the image. |
| Playwright can't start the server in CI | `webServer` config starts `tsx apps/server/src/index.ts` with `DATABASE_URL=:memory:`; if port 4000 is busy, the test fails fast with a clear error. |
| GitHub Actions fails on `npm ci` because `package-lock.json` is out of sync | Verified locally: `npm ci` succeeds after `npm install`. |
| Test fix changes seed data or test contracts | No — only the assertion iteration logic changes. The `children` array contract is unchanged. |
| Push fails because SSH key is malformed | The provided `ssh-key.txt` has its `-----BEGIN OPENSSH PRIVATE KEY-----` line replaced with `[REDACTED:ssh_private_key]`. Restore the BEGIN line before using the wrapper script. |

---

## 4. Verification ledger

| Check | Method | Pass criterion |
| --- | --- | --- |
| Failing test fixed | `npm test --workspace @embers/server` | 95/95 passing |
| All workspaces green | `npm test --workspaces --if-present` | 367/367 passing |
| Typecheck clean | `npm run typecheck` | Exit 0 |
| Build succeeds | `npm run build` | All 4 `dist/` folders emitted |
| `dist/` untracked | `git ls-files \| grep dist` | 0 results |
| Dockerfile builds | `docker build -t embers .` (if Docker available) | Image built, `docker run` starts server |
| CI workflow valid | YAML lint + dry-run | `actionlint` passes (or manual review) |
| Playwright tests pass | `npx playwright test` | 4/4 passing |
| Docs updated | Manual review | All section references accurate |

---

## 5. Out of scope for Round 3 (still deferred)

- **B17–B22 (frontend refactor):** BrowserRouter, React Query, optimistic UI,
  auth-aware UI. Requires a dedicated frontend refactor pass that breaks the
  working client SPA's 176 tests. Tracked in `docs/REMEDIATION_EXECUTION_PLAN.md`
  §5. Not addressed in Round 3.

End of plan.
