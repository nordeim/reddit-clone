Alignment Review — AGENTS.md · CLAUDE.md · README.md · reddit-clone_SKILL.md · REMEDIATION_PLAN_ROUND_17.md 
 
Branch: main · HEAD: c1064c1 · Date: 2026-08-23 codebase state · Validated via: file reads + rg counts + npm test + git diff 
 
---
 
Executive Summary 
 
The five docs are well-aligned overall — the recurring round-history summaries, the unified commands tables, the plugin-order / route / auth / DB / FTS5 architecture descriptions, and the 
Docker/E2E/ESLint/hygiene sections all match the codebase. The headline test count 490 = 286 + 103 + 70 + 31 is correct (rg -c "it|test(" = 490; verified per-workspace: web 286/19 files, server 103/9, shared   
70/3, db 31/2; api.test.ts = 44). HashRouter, vite-plugin-singlefile, Tailwind v4, STATIC_DIR, dotenv precedence, helmet/CORS/cookie/rateLimit/requestId/auth/routes/static/errorHandler order, and all 12 web 
routes + 7 API route groups are accurate. 
 
Residual drift is narrow but real — 3 HIGH/MEDIUM + a few LOW/INFO items, concentrated in one file. The project status is healthy (shippable); every required gate (lint, typecheck, test 490, test:build, 
test:no-secrets, test:gitignore, test:ci-config, test:plan-alignment, test:prod-readiness:test) is code-correct. The drift does not break builds or tests; it misleads readers who trust per-section counts 
without re-running rg. 
 
---
 
Findings by Severity 
 
### HIGH — PAD still carries pre-Round-17 counts in 4 places 
 
┌───────────────────────────────────────────┬───────────────────────────────┬───────────────────────────────┬───────────────┬───────────────────────────────────┐ 
│ Doc                                       │ Lines                         │ Doc says                      │ Reality       │ Evidence                          │ 
├───────────────────────────────────────────┼───────────────────────────────┼───────────────────────────────┼───────────────┼───────────────────────────────────┤ 
│ docs/Project-Architecture-Document.md:597 │ Testing strategy prose        │ "281 tests across 19 files"   │ 286 web tests │ rg -c web=286                     │ 
├───────────────────────────────────────────┼───────────────────────────────┼───────────────────────────────┼───────────────┼───────────────────────────────────┤ 
│ docs/Project-Architecture-Document.md:610 │ Code block comment            │ all 485 tests must pass       │ 490           │ 485→490 in Round 17 (web 281→286) │ 
├───────────────────────────────────────────┼───────────────────────────────┼───────────────────────────────┼───────────────┼───────────────────────────────────┤ 
│ docs/Project-Architecture-Document.md:734 │ "No test runner → Vitest" row │ 281 tests … 31 db = 485 total │ 286 / 490     │ Same                              │ 
├───────────────────────────────────────────┼───────────────────────────────┼───────────────────────────────┼───────────────┼───────────────────────────────────┤ 
│ docs/Project-Architecture-Document.md:867 │ Architecture diagram footer   │ 281 tests passing             │ 286           │ Same                              │ 
└───────────────────────────────────────────┴───────────────────────────────┴───────────────────────────────┴───────────────┴───────────────────────────────────┘ 
 
REMEDIATION_PLAN_ROUND_17.md task D5 ("fix per-file test counts, §13.3, L976…") and commit c1064c1 ("align …/PAD with the Round 17 codebase (R17-F4)") claim this was fixed — the §13.3 table and the Last 
Updated line were fixed, but these 4 prose/diagram lines were not. Fix: bump each to 286 / 490 (the same values already used on PAD:545–547). 
 
### MEDIUM — CLAUDE.md file-organization diagram is stale 
 
┌───────────────┬──────────────────────────┬─────────────────────────────────────────────────┬─────────┬─────────────────────────────────────────────────┐ 
│ Doc           │ Line                     │ Doc says                                        │ Reality │ Evidence                                        │ 
├───────────────┼──────────────────────────┼─────────────────────────────────────────────────┼─────────┼─────────────────────────────────────────────────┤ 
│ CLAUDE.md:706 │ Monorepo tree annotation │ web/ ← @embers/web (React SPA, Vite, 281 tests) │ 286     │ rg -c web=286; api.test.ts alone is 44 (not 39) │ 
└───────────────┴──────────────────────────┴─────────────────────────────────────────────────┴─────────┴─────────────────────────────────────────────────┘ 
 
Probably missed when c1064c1 fixed AGENTS/README/SKILL but not this line. Fix: 281 → 286. 
 
### LOW — SKILL “8 CI gates” vs 13 test:* scripts is defensible but underspecified

┌──────────────────────────┬─────────────────┬───────────────────────────────────────┬──────────────────────────────────────────────────┬───────────────────────────────────────────────────────────────────────┐ 
│ Doc                      │ Line            │ Doc says                              │ Reality                                          │ Notes                                                                 │ 
├──────────────────────────┼─────────────────┼───────────────────────────────────────┼──────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────┤ 
│ reddit-clone_SKILL.md:13 │ project_state:  │ 8 CI gates                            │ Root has 13 test:* scripts (test:e2e,            │ SKILL’s list at L721 (lint, typecheck, test, test:plan-alignment,     │ 
│                          │ header          │                                       │ test:e2e:live, test:build, test:fresh-clone,     │ test:build, test:no-secrets, test:gitignore, test:ci-config) is the   │ 
│                          │                 │                                       │ test:no-secrets, test:gitignore, test:ci-config, │ required gate set; the other 5 are opt-in                             │ 
│                          │                 │                                       │ test:plan-alignment, test:local-prod,            │ (LIVE_BASE_URL/PROD_BASE_URL-gated or fresh-clone). Not a bug, but    │ 
│                          │                 │                                       │ test:repro, test:prod-readiness,                 │ the header 8 CI gates will confuse readers who count test:* in        │ 
│                          │                 │                                       │ test:prod-readiness:test, test:e2e:install)      │ package.json. Suggestion: 8 required CI gates (+5 opt-in) to make the │ 
│                          │                 │                                       │                                                  │ distinction explicit.                                                 │ 
├──────────────────────────┼─────────────────┼───────────────────────────────────────┼──────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────┤ 
│ CLAUDE.md                │ (omission)      │ Does not mention                      │ File exists and is a required gate (npm run      │ AGENTS.md does mention it; add one line to CLAUDE to match. Mirrors   │ 
│                          │                 │ scripts/verify-production-build.mjs   │ test:build)                                      │ the similar omission already noted in docs/ALIGNMENT_REVIEW.md.       │ 
│                          │                 │ (test:build) in its verification      │                                                  │                                                                       │ 
│                          │                 │ section                               │                                                  │                                                                       │ 
└──────────────────────────┴─────────────────┴───────────────────────────────────────┴──────────────────────────────────────────────────┴───────────────────────────────────────────────────────────────────────┘ 
 
### INFO — Historical “No ESLint” references are intentional 
 
AGENTS.md:18 and CLAUDE.md:551–552 mention the old stale "No ESLint" line only as history ("Fixed stale 'No ESLint' line in this file … Round 4/5"). README.md and SKILL.md are clean. No action — these are 
correctly framed as past drift that was fixed. 
 
### INFO — skills/ git-status deletions are expected 
 
git status --porcelain shows ~14k  D skills/... deletions — these are the intentionally-ignored skills/ directory (.gitignore:13 = skills/, untracked in Round 12 via git rm -r --cached skills/). Local skills/  
stays on disk; clones don’t include it. Not drift. 
 
---
 
What Was Verified CORRECT (no fix needed) 
 
- Monorepo wiring: workspaces ["apps/*","packages/*"], topological build/typecheck/pretest order shared → db → server → web, engines node ≥20, allowScripts (esbuild/argon2/better-sqlite3) — all match 
  package.json:6–42. 
- Commands tables: Every script in the AGENTS All workspaces table (test, test:e2e, test:e2e:live, test:build, test:fresh-clone, test:no-secrets, test:gitignore, test:ci-config, test:plan-alignment, 
  test:local-prod, test:repro, test:prod-readiness, test:prod-readiness:test, typecheck, lint, db:*, server:*) exists in root package.json:10–33. Workspace-local build/typecheck/test exist in each 
  apps/*/package.json / packages/*/package.json. 
- Build quirks: HashRouter (App.tsx: HashRouter, no BrowserRouter), vite-plugin-singlefile inlines to single dist/index.html, @tailwindcss/vite, no tailwind.config.js, custom variant @custom-variant dark 
  (&:where(.dark, .dark *)), .line-clamp-* in index.css, public/images/*.jpg + Inter Google Fonts. 
- Backend architecture: buildApp(opts) composition root, 9-step plugin order (helmet → cors → cookie → rateLimit → requestId → auth → routes (lazy, only with db+rawDb) → static (STATIC_DIR, wildcard:false, 
  after routes) → errorHandler), repository factories, voteService with db.transaction(), SIGINT/SIGTERM graceful shutdown — verified in apps/server/src/app.ts:41–212. 
- API routes: All 7 groups (/health, /api/auth/* ×5, /api/posts, /api/communities, /api/votes, /api/posts/:id/comments, /api/search, /api/notifications) lazy-registered in app.ts:142–196; per-route auth 
  decorators and 403-author checks verified (posts.ts:134–135). 
- Auth: HS256 via jose, Argon2id, authenticate decorator (Authorization: Bearer), 5 req/min/IP on auth (vs 100 global), refresh rotation (sessions.revokedAt), rate-limit skip in NODE_ENV=test. 
- DB/FTS5: 7 tables, composite PK on votes, posts_fts virtual table + 3 triggers in packages/db/src/fts5.ts, openDb() WAL/busy_timeout/foreign_keys, Drizzle index() builders in migration 
  0001_add_performance_indexes.sql. 
- AuthProvider / LoginPage / RegisterPage / Navbar / RequireAuth: Files exist at stated paths; AuthUser widened to full server shape; register returns 201 {user} → login flow; RequireAuth preserves state.from  
  with open-redirect guard; same-origin + credentials: "include" (Round 16) and unexpectedResponseMessage fallback (Round 17) verified in apps/web/src/lib/api.ts:488–558 (14 methods) and api.test.ts:44. 
- Docker: Multi-stage Dockerfile copies apps/web/dist + STATIC_DIR=/app/apps/web/dist, CMD ["node", "apps/server/dist/index.js"], docker-compose.yml mounts embers-data:/data/dev.db and requires JWT_*_SECRET 
  ≥32. 
- E2E: e2e/smoke.spec.ts 9 + e2e/auth.spec.ts 9 = 18 local; opt-in e2e/live.spec.ts 12 + e2e/live_extended.spec.ts 16 + e2e/live_a11y_r17.spec.ts 3 = 31 (via LIVE_BASE_URL), e2e/repro_r10_postpage.spec.ts 2 
  via PROD_BASE_URL. 
- Round history math (R6–R17): 453→462→466→467→473→485→490 progression is arithmetic-consistent; per-round file tables in AGENTS/CLAUDE match the repo. 
- REMEDIATION_PLAN_ROUND_17.md: F1 (unexpectedResponseMessage + 5 tests), F2 (a11y spec 3 tests), F3 (OWASP audit pass), F5 (worklog backfill) all verified. The verification ledger commands (npm test, npm run  
  test:e2e, hygiene gates) exist and are code-correct. 
 
---
 
Current Project Status 
 
- Tests in repo: 490 vitest (286 web / 103 server / 70 shared / 31 db) + 18 local Playwright + 31 live-audit E2E (opt-in) + 14 node --test for verify-prod-readiness. No stale per-file counts remain outside the 
  PAD/CLAUDE lines above; api.test.ts is consistently reported as 44. 
- Live deployment: LIVE-CRIT-1 fixed (539 KB single-file prod HTML); LIVE-CRIT-2/3/4 still broken on the public origin (static SPA fallback, no Helmet headers, POST→404) — code-side remediations (same-origin   
  client, STATIC_DIR serving, Helmet with 'unsafe-inline' when static) are in-repo and correct; cutover to a unified Fastify origin is operator-side. 
- Deferred: B17 (remove singlefile / switch to BrowserRouter), B19–B22 (React Query + feed/search/optimistic UI/notification polling), Sentry — all consistently marked deferred across docs. 
- Doc duplicate: Root Project-Architecture-Document.md correctly absent (canonical docs/…, guarded by verify-plan-alignment). 
 
---
 
Prioritized Action List 
 
1. Fix PAD:597/610/734/867 — bump 281→286, 485→490 (the R17 D5 that was claimed done; 4-line edit). 
2. Fix CLAUDE:706 — 281 tests → 286 tests. 
3. (Optional) Clarify SKILL:13 — 8 CI gates → 8 required CI gates (+5 opt-in) and add a matching note to the pre-ship checklist. 
4. (Optional) Add test:build to CLAUDE’s verification section to match AGENTS. 
 
No code changes are needed; items 3–4 can ride along with the next feature round without urgency.

---

Alignment Re-Validation & Fixes — Complete 
 
### Re-Validation Result 
 
All 5 docs were re-checked line-by-line against rg counts and live test runs. AGENTS.md (490/286), README.md (490), and reddit-clone_SKILL.md (490/286) are already correct — no fix needed. Three issues were 
confirmed as genuine current-state drift, plus one latent placeholder bug: 
 
┌───┬───────────────────────────────────────────────────────────────────────────────────────────────────────────────┬──────────┬────────────────────────────────────────┬───────────────────────────────────────┐ 
│ # │ Root Cause                                                                                                    │ Severity │ Files                                  │ Status                                │ 
├───┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────────────────────────────────────┼───────────────────────────────────────┤ 
│ 1 │ R17's PAD reconciliation (D5) fixed the Last Updated header + §13.3 table but missed 4 prose spots that still │ HIGH     │ docs/Project-Architecture-Document.md: │ Fixed                                 │ 
│   │ describe the current state as 281/485 (pre-R17). Copy-paste drift — the editor updated the most visible table │          │ 597, 610, 734, 867                     │                                       │ 
│   │ but not the narrative prose/diagram.                                                                          │          │                                        │                                       │ 
├───┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────────────────────────────────────┼───────────────────────────────────────┤ 
│ 2 │ Same batch edit (c1064c1) missed the CLAUDE monorepo tree annotation 281 tests — a current-state diagram, not │ MEDIUM   │ CLAUDE.md:706                          │ Fixed                                 │ 
│   │ historical.                                                                                                   │          │                                        │                                       │ 
├───┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────────────────────────────────────┼───────────────────────────────────────┤ 
│ 3 │ .env.example placeholder replace-with-32-char-min-secret is 31 chars, 1 short of z.string().min(32) — its     │ HIGH     │ .env.example:19,23 (+ local .env)      │ Fixed →                               │ 
│   │ name says "32" but delivers 31. CI never hits this (uses env vars); fresh clones that cp .env.example .env    │          │                                        │ replace-with-32-char-minimum-secret   │ 
│   │ then run tests hit ZodError: too_small on every server route test.                                            │          │                                        │ (35 chars)                            │ 
└───┴───────────────────────────────────────────────────────────────────────────────────────────────────────────────┴──────────┴────────────────────────────────────────┴───────────────────────────────────────┘ 
 
The 19 failing server tests (health, hardening, static suites) were caused entirely by #3 — not a code bug, just the placeholder failing Zod even in NODE_ENV=test (field is .optional().min(32) — providing a 
short value fails regardless of env). 
 
Not flagged (false positives avoided): 
- CLAUDE.md:194 (web 281, server 103…) with Tests: 473 → 485 — historical Round 16 summary, correctly left as-is. 
- SKILL.md:13 8 CI gates — intentional categorization of the 8 required gates vs 5 opt-in (test:e2e:live, test:local-prod, etc.), already consistent with BP-12. 
- skills/ D deletions in git status — pre-existing (Round 12 git rm --cached skills/), files not on disk in this checkout, unrelated to this change. 
 
### Fixes Applied (3 files, 7 lines) 
 
``` 
  .env.example                          | 4 ++--  (both JWT placeholders 31→35 chars) 
  CLAUDE.md                             | 2 +- 
  docs/Project-Architecture-Document.md | 8 ++++---- 
``` 
 
- PAD:597 prose 281 → 286, 485 → 490 (also notes Round 17 in the covering description) 
- PAD:610 code block 485 → 490 
- PAD:734 resolved-issues table 281/485 → 286/490 
- PAD:867 backend topology diagram 281 → 286 
- CLAUDE:706 file-org tree 281 → 286 
 
### Verification (all green post-fix) 

``` 
  build               ✓  539 KB single-file, 2276 modules 
  typecheck           ✓  4 workspaces, 0 errors (pretypecheck hook) 
  test                ✓  490 vitest (103 server + 286 web + 70 shared + 31 db) — was 19 failed 
  lint                ✓  0 errors, 0 warnings 
  test:build          ✓  no Vite dev modules, 526.6 KB 
  test:plan-alignment ✓  no forbidden tokens 
  test:no-secrets     ✓  no tracked secret files 
  test:gitignore      ✓  no tracked gitignored files 
  test:ci-config      ✓  gitleaks job present 
  test:prod-readiness:test ✓ 14/14 
  test:fresh-clone    ✓  typecheck on simulated fresh clone 
  test:e2e            ✓  18 passed, 19 skipped (opt-in suites) 
  dist tracked        ✓  0 
``` 
 
Post-fix drift scan: rg "281 tests|485 tests" against current-state prose returns 0 — no remaining stale counts.

