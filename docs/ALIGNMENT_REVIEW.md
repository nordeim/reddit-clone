# Alignment Review — `AGENTS.md` · `CLAUDE.md` · `README.md` vs Codebase

**Date:** 2026-08-14
**Scope:** Validate the three root documentation files against the live working tree at `/Home1/project/reddit-clone` (monorepo: `@embers/web`, `@embers/server`, `@embers/shared`, `@embers/db`).
**Method:** Claim extraction → evidence (file existence, `package.json` scripts, live `npm` script runs, source reads, full test/typecheck/lint execution) → verdict → recorded.
**Validation environment:** Node ≥20, deps installed, Playwright Chromium present. Executed: `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test:build`, `npm test` (full 467 suite), `npm run test:e2e` (18 local), plus the four fast hygiene gates.

> **Note on an unrelated artifact:** The task message ended with `By using Kilo, you agree to the Terms of Service: https://kilo.ai/terms`. This line is unrelated to the review and was treated as a stray appendage — not acted upon. Flagging for transparency.

---

## Summary Scorecard

| Workstream | Area | Result |
|---|---|---|
| A | File / path existence | **PASS** |
| B | Command / script accuracy | **PASS** |
| C | Version accuracy (Tech-Stack tables) | **PASS** |
| D | Test-count reconciliation (vitest + E2E) | **PASS** (executed, not assumed) |
| E | Behavioural / architecture claims | **PASS** |
| F | Cross-doc consistency | **RESOLVED** (6 doc edits applied) |
| G | Tooling / hygiene gates | **PASS** (4/4 gates + test:build) |
| H | Stale / inaccurate narrative | **RESOLVED** (2 doc edits applied) |

**Verdict:** The three docs are **exceptionally well-aligned with the codebase**. All executable claims (467 vitest tests, 18 E2E, lint, typecheck, build, 4 hygiene gates) were run and pass. All structural/behavioural claims (routes, schema, state, auth flow, build constraints) were verified in source. the 6 minor doc-precision issues + the AGENTS.md:270 `~525 kB` twin identified in §3 have all been **resolved** (7 precise doc-only edits applied 2026-08-14); see §6 Resolution Log.

---

## 1. Findings Ledger

| ID | Doc | Location | Claim / Area | Verdict | Evidence | Severity |
|---|---|---|---|---|---|---|
| P1 | — | scripts | No secret-bearing files tracked | PASS | `npm run test:no-secrets` → PASS; `git ls-files` shows only `.env.example`/`.env.local.example` | — |
| P2 | — | scripts | No tracked file matches a `.gitignore` pattern | PASS | `npm run test:gitignore` → PASS | — |
| P3 | — | scripts | CI has gitleaks secret-scan job | PASS | `npm run test:ci-config` → PASS | — |
| P4 | — | scripts | `REMEDIATION_PLAN.md` free of forbidden tokens | PASS | `npm run test:plan-alignment` → PASS | — |
| P5 | — | build | Production single-file build valid | PASS | `npm run test:build` → 537.96 kB, no Vite dev modules | — |
| P6 | A | tree | All 18 doc-named source files exist | PASS | `fd`/`ls` sweep: `lib/api.ts`, `auth/AuthProvider.tsx`, `RequireAuth.tsx`, `LoginPage.tsx`, `RegisterPage.tsx`, `Navbar.tsx`, `themeBootstrap.ts`, `selectors.ts`, `ErrorBoundary.tsx`, `packages/db/scripts/{backup,seed,migrate}.ts`, `packages/shared/src/{api/index,ids}.ts`, `verify_claims.ts`, `plugins/{errorHandler,requestId}.ts`, `services/voteService.ts` — all present | — |
| P7 | A | docs/ | All 14 referenced `docs/*.md` exist | PASS | sweep of README/CLAUDE/AGENTS doc-map entries → all present | — |
| P8 | B | root pkg | All 25 doc-referenced `npm run` scripts exist | PASS | node script check → 25/25 OK | — |
| P9 | C | versions | Tech-Stack pins match `package.json` | PASS | web/server/shared/db deps match tables exactly (react 19.2.6, vite 7.3.2, fastify 5.11.3, drizzle 0.36.4, better-sqlite3 13.0.3, jose 5.10.0, argon2 0.41.1, zod 3.25.76, pino 9.14.0, tailwind 4.1.17, vite-plugin-singlefile 2.3.0, etc.) | — |
| P10 | D | tests | Vitest total = 467 | PASS | `npm test` exit 0: web **271** (19 files) + server **95** (8 files) + shared **70** (3 files) + db **31** (2 files) = **467** | — |
| P11 | D | e2e | 18 local E2E pass; opt-in counts correct | PASS | `npm run test:e2e` → **18 passed** (smoke 9 + auth 9; 16 extended skipped). Opt-in spec counts: live 12, live_extended 16, repro 2 (verified by `grep -c 'test('`) | — |
| P12 | E | App.tsx | Client route table matches docs | PASS | `/login`,`/register` outside AppShell; `/`,`/popular`,`/all`,`/explore`→HomePage; `/r/:name`,`/comments/:id`,`/u/:username`,`/search`; `/notifications` guarded by `RequireAuth`; `*`→NotFoundPage | — |
| P13 | E | routes/* | Server 17 routes match (method+path+auth) | PASS | 17 routes confirmed; 6 protected via `preHandler:[app.authenticate]` (posts POST/PATCH/DELETE, votes PUT, comments POST, notifications GET); refresh/logout cookie-based | — |
| P14 | E | schema | 7 tables + composite PK + FTS5 triggers | PASS | `users,communities,posts,comments,votes,notifications,sessions`; `votes` PK `(userId,targetId,targetType)`; triggers `posts_ai/ad/au` | — |
| P15 | E | store | Overlay keys present | PASS | `votes` (namespaced), `localPosts`, `localComments`, `notificationReadOverrides`, `joinedCommunityIds`, `savedPostIds`, `theme`, `toasts` | — |
| P16 | E | data | Accessor contracts | PASS | `getCommunity(id)` throws (line 226); `getCommunityByName` returns `undefined`; `getUser(id)` → `CURRENT_USER` (line 90) | — |
| P17 | E | build/CSS | Dark variant + singlefile + HashRouter + no split | PASS | `@custom-variant dark (&:where(.dark,.dark *));`; `viteSingleFile`; `HashRouter`; no `React.lazy`/`dynamic(`/`import()` | — |
| P18 | E | feed/post | Paging + latency | PASS | `PAGE_SIZE=8`; `rootMargin:"400px"`; `650ms` (PostList), `500ms` (PostPage) | — |
| P19 | E | lib/api | 401 refresh-and-retry | PASS | `tryRefreshOn401`, `onTokenRefresh`, internal `skipRefresh` recursive guard | — |
| P20 | E | shared/api | Register shape + renamed schemas | PASS | `registerResponseSchema` = `{user}` only; `loginResponse/refreshTokenResponse/castVoteResponseSchema` renamed; `paginateOutputSchema()` correctly retained; no stale `*OutputSchema` response schemas | — |
| P21 | E | db/client, web/api | Round-13 infra | PASS | `backupDb()` present; `AssertExact` drift checks for `AuthUser`/`LoginResponse`/`RegisterResponse` present | — |
| P22 | E | db/migration | Round-11 indexes | PASS | `0001_add_performance_indexes.sql` (3 indexes) + mirrored Drizzle `index()` builders | — |
| P23 | E | app.ts | Plugin order + error envelope | PASS | helmet→cors→cookie→rateLimit→requestId→auth→routes→errorHandler; handler returns `{error:{code,message,requestId}}` | — |
| P24 | D | math | Round additive math consistent | PASS | 428 → +25 (R7) =453 → +9 (R10) =462 → +4 (R11) =466 → +1 (R13) =467 | — |
| **D1** | README | :26 vs :277 | `db` test count | **INCONSISTENT (self)** | :26 says `(30 tests)`; :277 + AGENTS/CLAUDE say **31** | LOW |
| **D2** | README | docker vs deploy | API port | **INCONSISTENT (clarify)** | `docker-compose.yml` uses **4000** (`:22-23,27`); "New Deployment"/"Verify" use **5000** (`:102,104,167,181,195,210,219`) | INFO |
| **D3** | CLAUDE | :146 | "no backend, no API, no `fetch`" | **STALE** | B18 added `apps/web/src/lib/api.ts` (fetch) + `AuthProvider`; AGENTS/README describe accurately | MED-LOW |
| **D4** | README | Docs Map | Map completeness | **INCOMPLETE** | Omits `REMEDIATION_PLAN_ROUND_9..13`, `SECRET_ROTATION_GUIDE.md`, `audit_report_*.md`, `session_*.md`, `backend_remediation_plan.zip`, `prompt-*.md` | LOW |
| **D5** | CLAUDE | Commands | Command-table completeness | **INCOMPLETE** | Tables omit `db:setup`, `server:start`, `server:dev`, `test:local-prod`, `test:repro`, `lint:fix` (all exist; some mentioned only in prose) | LOW |
| **D6** | README | :158 vs :333/500 | Build size wording | **INCONSISTENT (minor)** | :158 "~525 KB"; actual **537.96 kB**; :333/500 say "537 KB" | INFO |

---

## 2. Detailed PASS Evidence (highlights)

- **Executed, not assumed:** `npm run lint` (0 errors), `npm run typecheck` (4 workspaces clean), `npm run build` (web single-file = **537.96 kB**), `npm run test:build` (PASS), `npm test` (467/467, exit 0), `npm run test:e2e` (18/18). The 4 fast gates (`test:no-secrets`, `test:gitignore`, `test:ci-config`, `test:plan-alignment`) all PASS.
- **Route tables:** Client `App.tsx` and server `routes/*` match the documented 17-route + 9-route(client) tables exactly, including `RequireAuth` guarding `/notifications` and `app.authenticate` on the 6 protected server routes.
- **Data layer:** `getCommunity(id)` throws; `getUser(id)` returns `CURRENT_USER`; overlay keys all present; schema has 7 tables with the `votes` composite PK and FTS5 `posts_ai/ad/au` triggers.
- **Auth/integration (Rounds 5–13):** `api.ts` 401 refresh-and-retry with recursive guard; `registerResponseSchema` returns `{user}` only; renamed `*ResponseSchema`s; `backupDb()`; `AssertExact` type-drift checks; migration `0001` indexes + Drizzle builders — all present and consistent.

---

## 3. Recommended Fixes (the 6 drifts)

| ID | Fix |
|---|---|
| **D1** | README.md:26 — change `@embers/db — Drizzle ORM + SQLite + FTS5 + seed (30 tests)` → `(31 tests)` to match the Test Status table and AGENTS/CLAUDE. |
| **D2** | README.md — add one clarifying sentence near the Docker and "New Deployment" sections: *"The Docker image defaults the API to port **4000**; the `npm run server:start-prod` flow uses **5000**."* (Both are correct, just undocumented as two conventions.) |
| **D3** | CLAUDE.md:146 — rephrase *"no backend, no API, no `fetch`"* to e.g. *"originally client-only (deterministic local data, no backend needed); a fetch-based API client (`src/lib/api.ts`) is now wired into `AuthProvider` (B18), though the feed/search pages still render deterministic local data."* |
| **D4** | README.md Documentation Map — either retitle to *"Key Documents"* or add the missing entries (Rounds 9–13, `SECRET_ROTATION_GUIDE.md`, `audit_report_*.md`, `session_*.md`). |
| **D5** | CLAUDE.md Commands — add the missing rows (`db:setup`, `server:start`, `server:dev`, `test:local-prod`, `test:repro`, `lint:fix`) or a cross-reference to README's full script list. |
| **D6** | README.md:158 — change `~525 KB` → `≈538 KB` to match the actual built size (537.96 kB) and the "537 KB" wording used elsewhere. |

---

## 4. Validation Evidence Appendix (commands run)

```bash
# G — fast hygiene gates (all PASS)
npm run test:no-secrets      # PASS
npm run test:gitignore       # PASS
npm run test:ci-config       # PASS
npm run test:plan-alignment  # PASS

# Heavy chain (background bt-1, exit 0)
npm run lint && npm run typecheck && npm run build && npm run test:build && npm test

# D — per-workspace counts
npm test --workspace @embers/web     # 271 passed (19 files)
npm test --workspace @embers/server  # 95 passed (8 files)
npm test --workspace @embers/shared  # 70 passed (3 files)
npm test --workspace @embers/db      # 31 passed (2 files)
npm run test:e2e                    # 18 passed (16 extended skipped)

# A/B/C/E — structural
fd / ls / git ls-files               # file existence
node -e "…package.json scripts/deps" # script + version reconciliation
rg  …                                # route/schema/store/auth-source greps (see §2)
```

---

## 5. Next Steps

- ✅ **All 7 precise doc-only edits (D1–D6 + AGENTS.md:270 twin) applied and verified** — see §6 Resolution Log. Zero code changed.
- **Optional (not required for alignment):** run the opt-in E2E suites against a local prod build to fully close the "12/16/2" counts — `npm run test:local-prod` and `npm run test:repro`. These were verified structurally (spec test counts) but not executed live.
- **No code changes warranted** — the codebase matches the documentation; this review found doc-precision issues only, all now resolved.

## 6. Resolution Log (2026-08-14)

All 7 precise doc-only edits from §3 (plus the AGENTS.md:270 `~525 kB` twin) were applied and verified by re-grep. No code changed.

| # | File | Location | Change |
|---|---|---|---|
| 1 | README.md | L26 | `(30 tests)` → `(31 tests)` (D1) |
| 2 | README.md | L34 (repo tree) | added port note: Docker API on 4000; `npm run server:start-prod` uses 5000 (D2) |
| 3 | CLAUDE.md | L146 | removed false "no backend, no API, no `fetch`"; rephrased to note `src/lib/api.ts` + `AuthProvider` (B18) (D3) |
| 4 | README.md | after L572 (Documentation Map) | added blockquote listing Rounds 9–13, SECRET_ROTATION_GUIDE, audit/session docs (D4) |
| 5 | CLAUDE.md | after L204 (Commands) | added blockquote listing additional root scripts (D5) |
| 6 | README.md | L158 | `~525 KB` → `537 KB` (D6) |
| 7 | AGENTS.md | L270 | `~525 kB` → `537 kB` (D6 cross-doc twin) |

**Verification (re-grep, all clean):**
- `grep "30 tests"` → none
- `grep "~525"` → none
- `grep "no backend, no API, no \`fetch\`"` → none (CLAUDE.md)
- `grep "(31 tests)"` → README:26 ✓
- `grep "API is on port 4000"` / `"npm run server:start-prod"` → README:34 ✓
- `grep "537 KB)"` → README:158 ✓ ; `grep "(537 kB). Do"` → AGENTS:270 ✓
- `grep "Additional docs:"` → README:573 ✓ ; `grep "Additional root scripts"` → CLAUDE:205 ✓

**Result:** AGENTS.md, CLAUDE.md, and README.md are now 100% aligned with the codebase. The 24 PASS findings require no change.
