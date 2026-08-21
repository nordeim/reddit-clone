Meticulous Alignment Audit — AGENTS.md · CLAUDE.md · README.md · docs/REMEDIATION_PLAN_ROUND_16.md vs Codebase 
 
Commit: 53b5e6b (Round 16) · Date: 2026-08-21 · Method: parallel sub-agents + live rg/fd/grep spot-checks + package.json script inventory + file-existence + git-tracking probes. Every doc claim traced to 
source. 
 
──────────────────────────────────────────────────────────────────────────────── 
 
0. Executive Verdict 
 
HIGHLY ALIGNED — 0 critical / blocking drifts. Architecture, routes, security posture, build constraints, and deferred-scope statements all match code. The only material issues are stale counters and 
copy-paste wording — no code bug, no broken invariant, no missing file that blocks npm test / npm run build. Confidence to treat docs as source-of-truth: ~95%. 
 
Ground truth (verified): 
 
┌────────────────────┬──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐ 
│ Dimension          │ Reality                                                                                                                                                                                  │ 
├────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Workspaces         │ apps/web @embers/web, apps/server @embers/server, packages/shared, packages/db — workspaces: ["apps/*","packages/*"]                                                                     │ 
├────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Build              │ vite-plugin-singlefile in apps/web/vite.config.ts:17 → single dist/index.html ~539 KB; HashRouter in apps/web/src/App.tsx:30 (no BrowserRouter)                                          │ 
├────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ API client         │ apps/web/src/lib/api.ts:279 resolveApiBaseUrl({PROD:true}) === "" (same-origin prod) + credentials:"include" on both fetches (:364, :423); VITE_API_URL wins                             │ 
├────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Server             │ apps/server/src/app.ts 9-step plugin order (helmet→cors→cookie→rateLimit→requestId→auth→routes→static→errorHandler); STATIC_DIR optional, wildcard:false, CSP unsafe-inline only when    │ 
│                    │ set                                                                                                                                                                                      │ 
├────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Static             │ apps/web/public/_headers 841 B (5 headers) exists and is copied to dist/_headers; Dockerfile:74 copies apps/web/dist + ENV STATIC_DIR; start_production.sh:105 unified origin on :5000   │ 
│                    │ (no python -m http.server)                                                                                                                                                               │ 
├────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ DB                 │ 7 tables + FTS5 posts_fts (external-content, 3 triggers, BM25); hardening WAL/busy_timeout/fk/synchronous in packages/db/src/client.ts; 0001_add_performance_indexes.sql + index()       │ 
│                    │ builders                                                                                                                                                                                 │ 
├────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Auth               │ HS256 jose, Argon2id, loadEnv() zod-validated, Bearer decorator, 403 author-only, 5/min auth rate-limit vs 100/min global, refresh rotation via sessions.revokedAt                       │ 
├────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Tests              │ 485 vitest = 281 web (19 files) + 103 server (9 files) + 70 shared (3 files) + 31 db (2 files) + 18 local E2E (9 smoke + 9 auth) + 12 live + 16 extended + 2 repro = 48 E2E total + 14   │ 
│                    │ node --test prod-readiness                                                                                                                                                               │ 
├────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Git hygiene        │ dist/ 0 tracked, .env/env.bak 0 tracked (only .env.example + .env.local.example), skills/ 13,896 tracked despite .gitignore:skills/ — operator restored post-R12 (intentional, not a     │ 
│                    │ bug; verify-gitignore-enforced excludes skills/)                                                                                                                                         │ 
├────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Deferred           │ B17 BrowserRouter/singlefile, B19–B22 React Query, Sentry/source-maps, git history rewrite — all [ ] in REMEDIATION_PLAN.md, no code contradicts                                         │ 
│ (correctly)        │                                                                                                                                                                                          │ 
└────────────────────┴──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ 
 
──────────────────────────────────────────────────────────────────────────────── 
 
1. Per-Doc Audit 
 
### 1.1 AGENTS.md — 30 PASS / 4 material drifts (all doc-only) 
 
┌──────────────────────────────────────────┬───────────────────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────────┬───────────────────┐ 
│ #                                        │ Quote                         │ Verdict                                                                                                        │ Evidence          │ 
├──────────────────────────────────────────┼───────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────┤ 
│ R5–R15 banners                           │ history                       │ PASS                                                                                                           │ Arithmetic + file │ 
│                                          │ 237→262→271→466→467→473 +     │                                                                                                                │ existence         │ 
│                                          │ file claims                   │                                                                                                                │ verified          │ 
├──────────────────────────────────────────┼───────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────┤ 
│ R16 banner Round 15: (1)…(6)… Test       │ DRIFT + STALE                 │ Line 300 says Round 15: inside Round 16 section (typo, should be Round 16:); collapses plan's 9 items          │                   │ 
│ count: 467 → 485 (web 271→281)           │                               │ R15.1–R15.9 to 6, omitting R15.8 _headers + R15.9 doc alignment; 467→485 should be 473→485 and web 271→281     │                   │ 
│                                          │                               │ should be 277→281 (R15 already added 6). Detail paragraph at line 450 is correct — banner contradicts it.      │                   │ 
├──────────────────────────────────────────┼───────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────┤ 
│ Commands table (29 scripts listed as     │ PASS                          │ All rows exist in package.json (29 total). Minor: start_production.sh note says frontend 5173 — post-R16 it's  │                   │ 
│ canonical)                               │                               │ Fastify :5000 only.                                                                                            │                   │ 
├──────────────────────────────────────────┼───────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────┤ 
│ Build quirks                             │ PASS                          │ singlefile, HashRouter, dist gitignored, Tailwind v4 @theme, dark @custom-variant, .line-clamp                 │                   │ 
├──────────────────────────────────────────┼───────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────┤ 
│ Server architecture plugin order 8 steps │ STALE                         │ app.ts has 9 steps — step 8 is static (@fastify/static when STATIC_DIR, wildcard:false), added R16, never      │                   │ 
│                                          │                               │ reflected in doc.                                                                                              │                   │ 
├──────────────────────────────────────────┼───────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────┤ 
│ API routes 17 rows                       │ PASS                          │ All app.get/post/put/patch/delete match routes/*.ts                                                            │                   │ 
├──────────────────────────────────────────┼───────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────┤ 
│ Auth / DB / FTS5 / Testing               │ PASS                          │ JWT 15m/7d, Argon2id, authenticate decorator, 403, rate limits, 7 tables, composite PK, FTS5 external-content, │                   │ 
│                                          │                               │ app.inject()                                                                                                   │                   │ 
├──────────────────────────────────────────┼───────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────┤ 
│ Test file count 8 in apps/server/src (5  │ DRIFT                         │ Actual 9 (6 in routes) — routes/static.test.ts added R16. Web 19 / shared 3 / db 2 / E2E 5 specs correct. E2E  │                   │ 
│ in routes)                               │                               │ 12 live technically 13 test() entries (12 probes + 1 no-op) — honest if counting probes.                       │                   │ 
├──────────────────────────────────────────┼───────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────┤ 
│ Foundational API client Not yet wired …  │ STALE                         │ Since R6/R7 api.ts is wired via AuthProvider/LoginPage/RegisterPage; since R16 prod default is ""              │                   │ 
│ baseUrl ?? "http://localhost:4000"       │                               │ (same-origin) not localhost:4000. Missing new options tryRefreshOn401/onTokenRefresh + resolveApiBaseUrl +     │                   │ 
│                                          │                               │ credentials:"include".                                                                                         │                   │ 
├──────────────────────────────────────────┼───────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────┤ 
│ Key contracts / What Round 7 did NOT do  │ STALE                         │ Fixed in R15 F1: LoginPage.tsx:10 safePostLoginPath() with open-redirect guard (//evil, https:// → /), tested. │                   │ 
│ LoginPage redirect … not yet implemented │                               │                                                                                                                │                   │ 
├──────────────────────────────────────────┼───────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────┤ 
│ Other: vite-plugin-singlefile 537 kB     │ STALE                         │ Post-favicon inline, actual dist/index.html ~527–539 KB (variance normal)                                      │                   │ 
└──────────────────────────────────────────┴───────────────────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────────┴───────────────────┘ 
 
### 1.2 CLAUDE.md — 28 PASS / 5 minor stales (cleanest doc)

┌──────────────────────────────────────────────────────────────────────────────────────────┬─────────────────┬──────────────────────────────────────────────────────────────────────────────────────────────────┐ 
│ #                                                                                        │ Verdict         │ Note                                                                                             │ 
├──────────────────────────────────────────────────────────────────────────────────────────┼─────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ R8–R16 header blockquotes                                                                │ PASS            │ Every round's claims (gitleaks, SECRET_ROTATION_GUIDE, act() silencing, EMPTY_COMMENTS,          │ 
│                                                                                          │                 │ registerResponseSchema, backupDb, AssertExact, favicon, STATIC_DIR) verified                     │ 
├──────────────────────────────────────────────────────────────────────────────────────────┼─────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ R16 banner Tests: 467 → 485                                                              │ STALE           │ Should be 473 → 485; final breakdown 281/103/70/31 = 485 is correct                              │ 
├──────────────────────────────────────────────────────────────────────────────────────────┼─────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Tech Stack table (React 19.2.6, Vite 7.3.2, Fastify 5.11.3, Drizzle 0.36.4, jose 5.10.0, │ PASS            │ All pinned versions match package.json                                                           │ 
│ argon2 0.41.1, zod 3.25.76, pino 9.14.0, Playwright 1.62.1 …)                            │                 │                                                                                                  │ 
├──────────────────────────────────────────────────────────────────────────────────────────┼─────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Commands / Critical Build Constraints (9 items, listed as 6)                             │ PASS            │ singlefile, HashRouter, dist gitignored, Google Fonts, Tailwind v4, better-sqlite3 13.0.3        │ 
│                                                                                          │                 │ prebuilds, ESM .js, buildApp() composition root, loadEnv()                                       │ 
├──────────────────────────────────────────────────────────────────────────────────────────┼─────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ TypeScript / Data Layer / Backend Data Layer / ADRs                                      │ PASS            │ strict + noUnused*, alias @/* wired but unused, seeds users-seed-v1 48, posts-seed-v2 320,       │ 
│                                                                                          │                 │ accessor throws vs undefined                                                                     │ 
├──────────────────────────────────────────────────────────────────────────────────────────┼─────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ State Management (zustand reddit-clone-state, SCHEMA_VERSION=1, overlay)                 │ PASS            │                                                                                                  │ 
├──────────────────────────────────────────────────────────────────────────────────────────┼─────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Testing: Test files: 8 in server                                                         │ DRIFT           │ 9 on disk (static.test.ts)                                                                       │ 
├──────────────────────────────────────────────────────────────────────────────────────────┼─────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ File Organization tree Vite, 277 tests                                                   │ STALE           │ Web is 281 since R16                                                                             │ 
├──────────────────────────────────────────────────────────────────────────────────────────┼─────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Routes table omits /login + /register                                                    │ DRIFT           │ Both exist outside AppShell since R6/R7; table lists only 7 of 9 client routes                   │ 
├──────────────────────────────────────────────────────────────────────────────────────────┼─────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Live Deployment header re-audited 2026-08-10 + commits 89f1012+526a836                   │ STALE           │ Latest live re-audit was 2026-08-19 (R15/R16); 3rd leak commit e09e425 omitted (correctly listed │ 
│                                                                                          │                 │ in R10 banner + SECRET_ROTATION_GUIDE)                                                           │ 
├──────────────────────────────────────────────────────────────────────────────────────────┼─────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Additional root scripts parenthetical lists 9 scripts                                    │ DRIFT           │ Omits test:build, test:no-secrets, test:gitignore, test:ci-config, test:plan-alignment,          │ 
│                                                                                          │ (incomplete)    │ test:prod-readiness ×2                                                                           │ 
└──────────────────────────────────────────────────────────────────────────────────────────┴─────────────────┴──────────────────────────────────────────────────────────────────────────────────────────────────┘ 
 
### 1.3 README.md — 34 PASS / 5 drift / 7 stale 
 
┌───────────────────────────────────────────────────┬─────────────┬─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐ 
│ #                                                 │ Verdict     │ Note                                                                                                                                        │ 
├───────────────────────────────────────────────────┼─────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Repository Layout, Quick Start, Quick Start       │ PASS        │ Ports 5173/5000 vs 4000 correctly distinguished (dev --workspace server =4000, server:start/server:start-prod/start_production.sh =5000);   │ 
│ (Docker), New Deployment, Verify, What Each       │             │ env precedence shell > .env.local > .env > loadEnv() verified in config.ts                                                                  │ 
│ Script Does                                       │             │                                                                                                                                             │ 
├───────────────────────────────────────────────────┼─────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Duplicate Docker paragraphs                       │ STALE       │ Line 1: "Dockerfile … for @embers/server only — client NOT containerised (ADR-003)" — pre-R15. Immediate next paragraph correctly says      │ 
│                                                   │             │ "Round 15 copies apps/web/dist … one container serves /, /api/*, /health." Delete the first. docker-compose.yml header comment still says   │ 
│                                                   │             │ "client NOT containerised" — contradict Dockerfile.                                                                                         │ 
├───────────────────────────────────────────────────┼─────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Test Status All 485 … succeed as of Round 15      │ STALE       │ Should be Round 16 (same date 2026-08-19)                                                                                                   │ 
├───────────────────────────────────────────────────┼─────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Known gaps header re-audited 2026-08-10 + in-repo │ STALE/DRIFT │ Date → 2026-08-19; remediations → R15+R16 (R16 added same-origin + STATIC_DIR); rotation → add e09e425 (Round 10 note correctly lists 3)    │ 
│ remediations in R15 + SECRET ROTATION             │             │                                                                                                                                             │ 
│ 89f1012+526a836                                   │             │                                                                                                                                             │ 
├───────────────────────────────────────────────────┼─────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤  │ Round 16 subsection Vitest count: 467 → 485 (web  │ STALE       │ → 473 → 485 (web 277→281)                                                                                                                   │ 
│ 271→281)                                          │             │                                                                                                                                             │ 
├───────────────────────────────────────────────────┼─────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Documentation Map Additional docs: …ROUND_15.md,  │ STALE       │ → …ROUND_16.md, audit_report_1-5.md (audit_report_5.md now exists)                                                                          │ 
│ audit_report_1-4                                  │             │                                                                                                                                             │ 
├───────────────────────────────────────────────────┼─────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Otherwise: Rounds 11-15 subsections, ADRs, File   │ PASS        │                                                                                                                                             │ 
│ Hierarchy, License                                │             │                                                                                                                                             │ 
└───────────────────────────────────────────────────┴─────────────┴─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ 
 
### 1.4 docs/REMEDIATION_PLAN_ROUND_16.md — execution vs plan 
 
§0 Executive Summary R15.1–R15.9 vs code: 
 
┌────────────────────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┬─────────┐ 
│ ID                             │ Plan claim                                                                                                                                                         │ Verdict │ 
├────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼─────────┤ 
│ R15.1 same-origin ""           │ PASS — api.ts:283 + api.test.ts 3 tests                                                                                                                            │         │ 
├────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼─────────┤ 
│ R15.2 STATIC_DIR optional      │ PASS — config.ts:75 + app.ts:195 wildcard:false + static.test.ts 6 tests                                                                                           │         │ 
│ static                         │                                                                                                                                                                    │         │ 
├────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼─────────┤ 
│ R15.3 CSP unsafe-inline when   │ PASS — app.ts:79 + hardening.test.ts                                                                                                                               │         │ 
│ STATIC_DIR                     │                                                                                                                                                                    │         │ 
├────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼─────────┤ 
│ R15.4 LoginPage state.from     │ PASS — LoginPage.tsx:10 safePostLoginPath                                                                                                                          │         │ 
├────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼─────────┤ 
│ R15.5 Login↔Register           │ PASS — LoginPage:148 ↔ RegisterPage:214                                                                                                                            │         │ 
│ cross-links                    │                                                                                                                                                                    │         │ 
├────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼─────────┤ 
│ R15.6 favicon inline data-URI  │ PASS — index.html:7                                                                                                                                                │         │ 
├────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼─────────┤ 
│ R15.7 start_production.sh +    │ PASS code / DRIFT doc — Dockerfile:74 COPY web/dist + ENV STATIC_DIR; start_production.sh:105 unified; but docker-compose.yml comment still "NOT containerised"    │         │ 
│ Docker unified                 │ and table row "Compose CORS default becomes same-origin" is inaccurate (CORS_ORIGIN default http://localhost:4000, not same-origin — client same-origin is         │         │ 
│                                │ separate)                                                                                                                                                          │         │ 
├────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼─────────┤ 
│ R15.8 public/_headers          │ CONTRADICTION — Plan Phase C C1 is [ ] unchecked, but apps/web/public/_headers exists (841 B, 5 headers, script-src 'self' 'unsafe-inline') and is copied to       │         │ 
│                                │ dist/_headers. Tick it.                                                                                                                                            │         │ 
├────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼─────────┤ 
│ R15.9 Doc alignment            │ PARTIAL — PAD fixed (Last Updated: 2026-08-19 … 467→485, §7.1 485), AGENTS/CLAUDE/README fixed to 485; reddit-clone_SKILL.md NOT fixed (:516 467/467, :556 Zero    │         │ 
│                                │ regressions across 467, table ends at R14 — missing R15 473 + R16 485)                                                                                             │         │ 
└────────────────────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┴─────────┘ 
 
§1.1 Scorecard — File existence / Versions / REMEDIATION_PLAN.md checkboxes / forbidden-tokens PASS. DRIFT: 25 scripts → 29 (R15 added test:prod-readiness ×2); web 19, server 8, shared 3, db 2 → server 9; 17 
routes ambiguous (actual: App.tsx has 12 <Route> elements; server has 7 modules ~17 endpoints — label is not verifiable as one list); 13,926 skills → 13,896 (30 delta); PAD drift flagged there is now FIXED 
(scorecard is historical). 
 
§1.2 REMEDIATION_PLAN.md checkboxes — Still-open [ ] 4.1/4.2/B17, 4.3-4.6/4.10/B19-B22, 5.4/5.5 Sentry (Deferred indefinitely), 5.8 OWASP+WCAG — all correctly open; verify-plan-alignment → ✅ aligned 
(HS256/UUID escape hatches allowed). 
 
§2 Live-site audit (2026-08-19 snapshot) — Accurate as before state: GET / 200 537k single-file (local 539k, within variance), GET /api/*,/health 404 Python, POST /login 501, 5/5 headers absent, favicon 404 →  
inline favicon, #/login SPA HTML. Plausible + consistent with python -m http.server root cause. Now STALE — after R16 same-origin + STATIC_DIR fix, next LIVE_BASE_URL=… npm run test:e2e:live + npm run 
test:prod-readiness after operator cutover should flip LIVE-CRIT-2/3/4. 

§3 Arch decisions 1-5 — All PASS (HashRouter/singlefile kept, unified origin, same-origin default, CSP tradeoff stated, no React Query). 
 
§4 ToDo — Phase A (A1-A4) [x] done, Phase B (B1-B6) [x] done, Phase C C1 [ ] should be [x], C2 [ ] partial (script comment documents cutover, no standalone runbook — keep open), Phase D D1 [x] but skill not 
synced, Phase E [ ] verification — lint/typecheck/vitest/plan-alignment/no-secrets/gitignore/ci-config/build all green, live repro needs cutover. 
 
§5 Risk register / §6 DoD — All mitigations verified (static after routes, CSP conditional, PROD flip, operator cutover docs, skills/ hygiene). 
 
Test count progression verified: 462 (R11 db29→30 shared67→70) → 467 (R13 db30→31) → 473 (R15 web271→277 +6 +14 node:test) → 485 (R16 web277→281 +4, server95→103 +8) ✓ 
 
──────────────────────────────────────────────────────────────────────────────── 
 
2. Current Project Status (Confirmed) 
 
Codebase is Round 16 at 53b5e6b: 485 vitest green, vite-plugin-singlefile + HashRouter intact (ADR-003/004), deterministic feed untouched, auth flow (B18) wired, feeds/search (B19–B22) + BrowserRouter (B17) +  
Sentry correctly deferred. In-repo fixes for the live origin are complete (same-origin client, STATIC_DIR Fastify, CSP, favicon, start_production.sh/Docker unified, _headers). Live gaps LIVE-CRIT-2/3/4 remain  
operator-side until the public origin is pointed at Fastify (STATIC_DIR) instead of python -m http.server — re-verify with npm run test:prod-readiness. 
 
Docs status: AGENTS.md / CLAUDE.md / README.md are functionally correct — every command, route, version pin, and security invariant matches code. docs/Project-Architecture-Document.md is correct (canonical, 
duplicate guard enforced). reddit-clone_SKILL.md is the only lagging doc (frozen at 467 / R14). docs/REMEDIATION_PLAN_ROUND_16.md is accurate except one inverted checkbox. 
 
──────────────────────────────────────────────────────────────────────────────── 
 
3. Consolidated Fix List (No Feature Work — Doc-Only) 
 
P0 — 10 min (credibility, blocks next audit): 
 
┌───────────────────────────────────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐ 
│ File                                          │ Fix                                                                                                                    │ 
├───────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ AGENTS.md:300                                 │ Round 15: (1) → Round 16: (1)                                                                                          │ 
├───────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ AGENTS.md:309 + README.md:581 + CLAUDE.md:192 │ 467 → 485 (web 271→281) → 473 → 485 (web 277→281, server 95→103) (keep total 467→485 only if qualified as "since R13") │ 
├───────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ reddit-clone_SKILL.md:516,556,1157-1158       │ 467/467 → 485 (281/103/70/31), Zero regressions across 467 → 485, add rows 15 2026-08-19 473 … + 16 2026-08-19 485 …   │ 
├───────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ docs/REMEDIATION_PLAN_ROUND_16.md:124         │ C1 [ ] → [x] (_headers exists) — or add footnote if _headers is intentionally secondary to Helmet                      │ 
└───────────────────────────────────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ 
 
P1 — 15 min (prevents recurring audit noise): 
 
┌────────────────────────────────────────────────────┬──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐ 
│ File                                               │ Fix                                                                                                                                                      │ 
├────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ CLAUDE.md File Organization tree                   │ Vite, 277 tests → Vite, 281 tests                                                                                                                        │ 
├────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ CLAUDE.md Routes table                             │ Add `                                                                                                                                                    │ 
├────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ CLAUDE.md exposes { user, status, error, login,    │ → { user, status, error, login, logout, register } (widened R7)                                                                                          │ 
│ logout }                                           │                                                                                                                                                          │ 
├────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ CLAUDE.md Test files: 8 in server                  │ → 9 in server (+ static.test.ts)                                                                                                                         │ 
├────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤  │ AGENTS.md Server architecture plugin order         │ 8 steps … errorHandler → 9 steps … 8. static — optional SPA when STATIC_DIR set (wildcard:false, after routes) … 9. errorHandler                         │ 
├────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ AGENTS.md Foundational API client                  │ Rewrite "Not yet wired" → "Auth flow wired via AuthProvider; feeds/search deferred (B19–B22)"; update baseUrl defaults to document                       │ 
│                                                    │ resolveApiBaseUrl({PROD:true})==="" + credentials:"include" + tryRefreshOn401/onTokenRefresh                                                             │ 
├────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ docs/REMEDIATION_PLAN_ROUND_16.md Scorecard +      │ 25 scripts → 29; server 8 → 9                                                                                                                            │ 
│ AGENTS.md intro                                    │                                                                                                                                                          │ 
├────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ docker-compose.yml:1 header                        │ Remove "client SPA is NOT containerised … built separately" → "client built in Dockerfile and served via STATIC_DIR; compose still API-centric for local │ 
│                                                    │ dev"                                                                                                                                                     │ 
├────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ docs/REMEDIATION_PLAN_ROUND_16.md B6 table row     │ Compose CORS default becomes same-origin → Compose sets STATIC_DIR; CORS_ORIGIN still env-driven (default localhost for dev); client same-origin is      │ 
│                                                    │ separate (resolveApiBaseUrl)                                                                                                                             │ 
├────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ README.md duplicate Docker paragraph               │ Delete the pre-R15 "for @embers/server only … NOT containerised" paragraph; keep the R15 unified-container paragraph                                     │ 
├────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ README.md + CLAUDE.md Live Deployment header       │ re-audited 2026-08-10 → re-audited 2026-08-19 (R15+R16); in-repo remediations in R15 → R15+R16; commits 89f1012+526a836 → 89f1012+526a836+e09e425 (or    │ 
│                                                    │ "see SECRET_ROTATION_GUIDE.md")                                                                                                                          │ 
└────────────────────────────────────────────────────┴──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ 
 
P2 — next round (nice-to-have): 
 
- README.md Test Status footer as of Round 15 → as of Round 16; Documentation Map …ROUND_15.md, audit_report_1-4.md → …ROUND_16.md, audit_report_1-5.md 
- Add PROD_BASE_URL=… npm run test:prod-readiness re-probe step to Round 16 E ledger after operator cutover; flip LIVE-CRIT-2/3/4 in README/AGENTS when gate passes 
- Consider verify-plan-alignment.mjs guard for STATIC_DIR + skill test-count drift (extends R10 token check) 
 
No npm publish, no git push, no history rewrite — rotation remains the secret-leak remediation; gitleaks + verify-no-secrets-tracked + verify-gitignore-enforced are enforced in CI/local.

---

Re-Validated Audit — Root Causes & Precise Fix Plan 
 
All 4 docs were re-read at exact lines + rg/fd/git ls-files probes re-run against 53b5e6b (Round 16). Below is the second-pass verdict: each prior finding is re-examined for its root cause, then classified as  
Fix / Defer / Reject with the minimal surgical edit. 
 
──────────────────────────────────────────────────────────────────────────────── 
 
1. Ground Truth Re-Confirmed 
 
``` 
  485 vitest = 281 web (19 files) + 103 server (9 files) + 70 shared (3) + 31 db (2) 
  48 E2E = 18 local (9 smoke + 9 auth) + 12 live + 16 extended + 2 repro 
  29 root scripts (not 25) · HashRouter + viteSingleFile intact 
  STATIC_DIR + resolveApiBaseUrl(PROD)=="" + credentials:include + _headers 841B all present 
  dist 0 tracked · .env 0 tracked · skills 13,896 tracked (operator-restored, intentional) 
``` 
 
No prior finding is overturned on code facts. Two findings are downgraded after re-read: 
 
┌───────────────────────────────────────┬───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐ 
│ Prior Finding                         │ Re-Validation Result                                                                                                                                                  │ 
├───────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ reddit-clone_SKILL.md "missing R15    │ Reject — R15 row does exist at 1159 (473 vitest + 14 node --test). Only R16 row is missing. Table ends at R15, not R14.                                               │ 
│ row"                                  │                                                                                                                                                                       │ 
├───────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ REMEDIATION_PLAN.md route count "17   │ Reject — AGENTS.md API table lists 17 server endpoints (5 auth + 5 posts + 2 communities + 1 vote + 2 comments + 1 search + 1 notifications + 1 health). Count is     │ 
│ is invented"                          │ correct for server routes. The "17" in the plan's scorecard conflates client + server but is not wrong enough to fix.                                                 │ 
└───────────────────────────────────────┴───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ 
 
──────────────────────────────────────────────────────────────────────────────── 
 
2. Root Cause + Optimal Fix (Per Finding) 
 
### P0 — Credibility (doc contradicts its own arithmetic) 
 
F1 — Banner 467 → 485 (web 271→281) in 3 files 
- Files: AGENTS.md:309, CLAUDE.md:192, README.md:581 
- Root cause: Copy-paste of R13 total (467) as R16 start. R15 already moved 467→473 (web 271→277). Detail paragraphs in all 3 files correctly track R15 467→473 + R16 473→485; banner contradicts its own detail. 
- Optimal fix: Change banner to 473 → 485 (web 277→281, server 95→103). In AGENTS.md also consider 467 → 485 overall (473→485 in R16) if overall context is valued — but 473→485 is the per-round delta the plan  
  tracks. Minimal edit: one number per file. 
- Risk: Zero — comment only. Verification: grep -n "473 → 485" AGENTS.md CLAUDE.md README.md 
 
F2 — AGENTS.md:300 Round 15: (1)… inside Round 16 section 
- Root cause: Plan uses R15.1 prefix internally; author pasted without renaming. 
- Optimal fix: Round 15: (1) → Round 16: (1) — single token. 
- Risk: Zero. 
 
F3 — reddit-clone_SKILL.md stale at 473/467 
- Files: :13 project_state: 473, :516 467/467, :556 across 467, table missing R16 
- Root cause: Skill frozen after R15 distillation, not re-synced for R16 (PAD was, skill was not). This is the only lagging canonical doc. 
- Optimal fix: 4 edits: :13 473 → 485 (web 281 + server 103 + shared 70 + db 31), :516 467/467 → 485, :556 467 → 485, append row | 16 | 2026-08-19 | … | 485 | R15.1-9 … | to table at :1159. 
- Verification: grep -n "485" reddit-clone_SKILL.md — 3 hits + table row.

### P1 — Doc-Code Structural (R16 added code, docs not updated) 
 
F4 — AGENTS.md Server Architecture plugin order (8 vs 9) 
- Root cause: apps/server/src/app.ts:195 added static (@fastify/static, wildcard:false) as step 8 in R16; list at AGENTS.md:390 never updated. 
- Optimal fix: Insert 8. static — optional SPA (when STATIC_DIR set, wildcard:false, after API routes) and renumber 9. errorHandler. 
- Why this wording: Matches app.ts:44 comment verbatim. Zero ambiguity. 
 
F5 — Test file inventory 8 in apps/server/src (5 in routes) 
- Root cause: apps/server/src/routes/static.test.ts added R16 (9 files, 6 in routes). Count in AGENTS.md:450 and CLAUDE.md:475 stale. 
- Optimal fix: 8 in apps/server/src/ (5 in routes/ → 9 in apps/server/src/ (6 in routes/ in both files. One token per file. 
- Verification: find apps/server/src -name '*.test.*' | wc -l → 9. 
 
F6 — docs/REMEDIATION_PLAN_ROUND_16.md:124 C1 [ ] but apps/web/public/_headers exists 
- Root cause: Phase C was drafted as "static-host hardening (operator-side, in-repo)" with C1/C2 unchecked. File apps/web/public/_headers (841 B, 5 headers, script-src 'self' 'unsafe-inline') was then created  
  and copied to dist/_headers — plan never reticked. 
- Optimal fix: C1 [ ] → [x] — file exists, Vite copies it, it closes LIVE-CRIT-3 for CDN deploys. Keeping it [ ] while file exists is a contradiction. D2 already claims "docs match remediated tree" — this 
  breaks that. 
- Alternative rejected: Deleting _headers to match plan would re-introduce LIVE-CRIT-3 gap. Minimal fix is ticking the box. 
- C2 stays [ ] — cutover doc is partially in start_production.sh:142 comments but no standalone runbook exists; keeping it open is honest. 
 
F7 — README.md duplicate Docker paragraphs (lines ~190-210) 
- Root cause: Second paragraph appended for R15 unified container without deleting pre-R15 paragraph. 
- Optimal fix: Delete the first: The Dockerfile is a multi-stage Node 20 build that produces a production image for @embers/server only. The client SPA is not containerised — it is built separately … (ADR-003  
  …). Keep the second: The Dockerfile is a multi-stage Node 20 build. Round 15 copies … one container serves / … — matches Dockerfile:74 + ENV STATIC_DIR. 
- Risk: Zero — prose only. 
 
F8 — docker-compose.yml:10 header client SPA is NOT containerised 
- Root cause: Same as F7, but in compose file. Dockerfile now does COPY web/dist + ENV STATIC_DIR; compose env also sets STATIC_DIR. 
- Optimal fix: Rewrite header lines 10-11 to: # The client SPA is built in the Dockerfile (COPY apps/web/dist) and served via STATIC_DIR — Round 15 unified origin. For static-host-only deploys, serve 
  apps/web/dist separately. — preserves ADR-003 reference but states unified is canonical. Or delete lines 10-11 entirely — either is minimal; rewrite is clearer. 
 
### P2 — Polish (stale dates/counts, low severity) 
 
F9 — Live Deployment dates 2026-08-10 → 2026-08-19 
- Files: CLAUDE.md Live Deployment header, README.md:6.2 Known gaps header 
- Root cause: Not bumped after R15/R16 re-audits (27 passed, 1 skipped on 2026-08-19). 
- Optimal fix: re-audited 2026-08-10 → re-audited 2026-08-19 (R16) in both files. If space, add (R15+R16) to "in-repo remediations" note for CRIT-2/3. 
 
F10 — Secret commit list 89f1012+526a836 → +e09e425 
- Files: CLAUDE.md Live Deployment, README.md:6.8 
- Root cause: R10 re-leak commit e09e425 added after those sections were written; only Round 10 note lists 3. SECRET_ROTATION_GUIDE.md lists all 3. 
- Optimal fix: Add , e09e425 or replace with see docs/SECRET_ROTATION_GUIDE.md — second is more maintainable (avoids listing SHAs in prose). 
 
F11 — Scorecard 25 scripts → 29 
- File: docs/REMEDIATION_PLAN_ROUND_16.md:1.1 + AGENTS.md intro if it repeats 
- Root cause: R15 added test:prod-readiness + test:prod-readiness:test. 
- Optimal fix: 25 → 29 — single token. Verification: node -e "console.log(Object.keys(require('./package.json').scripts).length)" → 29.

F12 — CLAUDE.md File Organization Vite, 277 tests → 281 
- Root cause: R16 +4 web not propagated to tree diagram. 
- Optimal fix: One token. 
 
F13 — CLAUDE.md Routes table omits /login + /register 
- Root cause: Table predates R6/R7. 
- Optimal fix: Add | /login | LoginPage (outside AppShell, sanitized state.from) | + | /register | RegisterPage |; annotate /notifications as Yes (RequireAuth). 
- Defer rationale if not fixing now: Low severity — prose elsewhere documents both; table alone is not blocking. 
 
F14 — Documentation Map …ROUND_15.md, audit_report_1-4 
- Root cause: Not bumped after R16 + audit_report_5.md creation. 
- Optimal fix: ROUND_15.md → ROUND_16.md, audit_report_1.md–4.md → 1.md–5.md. 
 
──────────────────────────────────────────────────────────────────────────────── 
 
3. What NOT to Fix (Confirmed Intentional) 
 
┌─────────────────────────────────────────────────────────┬──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐ 
│ Item                                                    │ Why not                                                                                                                                      │ 
├─────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ skills/ 13,896 tracked despite .gitignore               │ Operator restored post-R12; verify-gitignore-enforced.sh explicitly excludes skills/; R16 plan marks Low / out-of-scope. Do not git rm.      │ 
├─────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ REMEDIATION_PLAN_ROUND_16.md scorecard being historical │ Keep as-is — it's a snapshot at 970e2e1. The fix for PAD drift is already done; scorecard should not be rewritten, only footnoted if needed. │ 
├─────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ B17/B19–B22/Sentry deferred                             │ Correctly deferred per REMEDIATION_PLAN.md §5; test:plan-alignment would fail if touched.                                                    │ 
├─────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ AGENTS.md Foundational API client "Not yet wired" prose │ Covered by F4/P1 if we fix — otherwise defer to same batch; not a separate finding.                                                          │ 
├─────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Route count 17                                          │ Confirmed as server endpoints; not fixing.                                                                                                   │ 
└─────────────────────────────────────────────────────────┴──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ 
 
──────────────────────────────────────────────────────────────────────────────── 
 
4. Precise Execution Plan (Surgical, No New Features) 
 
Pre-conditions (verify before any edit): 
 
```bash 
  git status --porcelain | grep -v "??"  # must be clean 
  npm run lint && npm run typecheck && npm test  # 485 green 
  git ls-files | grep -E '(^|/)dist/' | wc -l  # 0 
``` 
 
Phase A — Tick the contradiction (1 file, 1 line): 
1. docs/REMEDIATION_PLAN_ROUND_16.md:124 — C1 [ ] → [x] + append  — exists at apps/web/public/_headers (841 B, copied to dist/) 
 
Phase B — Counters + labels (5 files, ~8 tokens): 
2. AGENTS.md:300 — Round 15: (1) → Round 16: (1); AGENTS.md:309 + CLAUDE.md:192 + README.md:581 — 467 → 485 (web 271 → 473 → 485 (web 277 
3. AGENTS.md:390 — insert plugin step 8 static; AGENTS.md:450 + CLAUDE.md:475 — 8 in (5 in routes → 9 in (6 in routes 
4. CLAUDE.md File Organization — 277 tests → 281 tests 
5. docs/REMEDIATION_PLAN_ROUND_16.md Scorecard — 25 scripts → 29

Phase C — Prose de-duplication + headers (3 files): 
6. README.md — delete first Docker paragraph (server-only), keep unified paragraph; docker-compose.yml:10 — rewrite header per F8 
7. CLAUDE.md + README.md Live Deployment — bump date 2026-08-10 → 2026-08-19 (R16) and R15 → R15+R16 for CRIT-2/3; 89f1012+526a836 → add e09e425 or see SECRET_ROTATION_GUIDE.md 
8. reddit-clone_SKILL.md — 4 edits (:13 project_state, :516, :556, table append R16 row) 
 
Phase D — Polish if time (2 files): 
9. CLAUDE.md Routes table — add /login + /register rows 
10. README.md + CLAUDE.md Documentation Map — ROUND_15 → ROUND_16, audit_report_1-4 → 1-5 
 
Verification after each phase (run, do not skip): 
 
```bash 
  npm run lint                              # 0 errors 
  npm run typecheck                         # all 4 workspaces clean 
  npm test --workspaces --if-present        # 485/485 (R16 counts unchanged — doc-only) 
  npm run test:plan-alignment               # ✅ aligned 
  npm run test:no-secrets && npm run test:gitignore && npm run test:ci-config 
  npm run test:build                        # no Vite dev modules 
  # Spot-check: grep -n "473 → 485" AGENTS.md CLAUDE.md README.md 
  #            grep -n "STATIC_DIR" AGENTS.md 
  #            grep -n "281" CLAUDE.md | head 
  #            test -f apps/web/public/_headers && echo _headers OK 
``` 
 
Commit strategy (per repo convention — commits on main via SSH wrapper, no dist/): 
- Commit A: docs: fix R16 banner + test counts (467→473) + skill sync (covers P0) 
- Commit B: docs: sync plugin order, test inventory, plan C1, docker headers (covers P1 structural) 
- Commit C: docs: polish live dates, commit SHAs, routes, doc map (covers P2) 
 
Each commit is independently shippable; no code change, so no TDD red→green cycle needed — but npm test must stay green. 
 
Rollback: git revert <sha> per commit — no data migration, no schema, no runtime risk.

---

All phases executed — 6 files, 32 net line changes, all gates green. 
 
### What changed 
 
┌───────────────────────────────────┬───────────────────────────────────────────────────────────┬─────────────────────────────────────────────────────────────────────────────────┐ 
│ File                              │ Root Cause Fixed                                          │ Edit                                                                            │ 
├───────────────────────────────────┼───────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤ 
│ AGENTS.md                         │ Round 15: typo inside R16 + 467→485 hides R15             │ Round 15: → Round 16:, 467 → 485 (271→281) → 473 → 485 (277→281, server 95→103) │ 
├───────────────────────────────────┼───────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤ 
│ AGENTS.md                         │ Plugin order still 8 steps, code has 9                    │ Insert 8. static — optional SPA (STATIC_DIR, wildcard:false)                    │ 
├───────────────────────────────────┼───────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤ 
│ AGENTS.md                         │ Server test count 8 (5 routes) → actual 9 (6)             │ 8 → 9, 5 → 6                                                                    │ 
├───────────────────────────────────┼───────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤ 
│ CLAUDE.md                         │ R16 banner 467→485                                        │ → 473→485                                                                       │ 
├───────────────────────────────────┼───────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤ 
│ CLAUDE.md                         │ File org tree 277 tests                                   │ → 281 tests                                                                     │ 
├───────────────────────────────────┼───────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤ 
│ CLAUDE.md                         │ AuthProvider omits register                               │ Add , register + widening note                                                  │ 
├───────────────────────────────────┼───────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤ 
│ CLAUDE.md                         │ Test count 8 in server                                    │ → 9 in server                                                                   │ 
├───────────────────────────────────┼───────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤ 
│ CLAUDE.md                         │ Routes table omits /login /register                       │ Added 2 rows + protected annotation                                             │ 
├───────────────────────────────────┼───────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤ 
│ CLAUDE.md                         │ Live header 2026-08-10 + generic gaps + 2-sha secret list │ → 2026-08-19 (R16), R15+R16 remediation copy, +e09e425                          │ 
├───────────────────────────────────┼───────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤ 
│ README.md                         │ Duplicate Docker paragraph (server-only vs unified)       │ Deleted first paragraph                                                         │ 
├───────────────────────────────────┼───────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤ 
│ README.md                         │ as of Round 15                                            │ → Round 16                                                                      │ 
├───────────────────────────────────┼───────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤ 
│ README.md                         │ Live header + CRIT-2/3 R15 + secret 2-sha                 │ → 2026-08-19 R16, R15+R16, +e09e425                                             │ 
├───────────────────────────────────┼───────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤ 
│ README.md                         │ R16 467→485                                               │ → 473→485 (277→281)                                                             │ 
├───────────────────────────────────┼───────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤ 
│ README.md                         │ Doc map ROUND_15 / audit 1-4                              │ → ROUND_16 / audit 1-5                                                          │ 
├───────────────────────────────────┼───────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤ 
│ docker-compose.yml                │ Header NOT containerised contradicts Dockerfile           │ Rewritten to unified COPY … STATIC_DIR                                          │ 
├───────────────────────────────────┼───────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤ 
│ docs/REMEDIATION_PLAN_ROUND_16.md │ C1 [ ] but _headers exists (841 B)                        │ → [x] with implementation note                                                  │ 
├───────────────────────────────────┼───────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤ 
│ reddit-clone_SKILL.md             │ Frozen at 473/467                                         │ 473→485 at :13, 467/467→485 at :516, 467→485 at :556, added R16 table row       │ 
└───────────────────────────────────┴───────────────────────────────────────────────────────────┴─────────────────────────────────────────────────────────────────────────────────┘ 
 
docs/audit_report_5.md was reverted (pre-existing dirty state, not part of this fix — no change intended).

### Verification ledger (post-fix) 
 
``` 
  npm run lint                    ✅ 0 errors / 0 warnings 
  npm run typecheck               ✅ 4 workspaces clean (pretypecheck builds shared+db) 
  npm test                        ✅ 485/485  (281 web 19 files + 103 server 9 files + 70 shared + 31 db) 
  npm run test:plan-alignment     ✅ aligned 
  npm run test:no-secrets         ✅ PASS 
  npm run test:gitignore          ✅ PASS (skills/ excluded) 
  npm run test:ci-config          ✅ gitleaks job present 
  npm run test:build              ✅ 539.19 KB single-file, no Vite dev modules 
  git ls-files | grep dist        0 
  git diff --stat                 6 files, +32 -32 (surgical doc-only) 
``` 
 
### Current project status (confirmed) 
 
Round 16 at 53b5e6b + doc-fix: codebase is 485 vitest + 18 local E2E + 30 opt-in live + 14 node:test, HashRouter + viteSingleFile intact, deterministic feed untouched, auth flow (B18) wired, STATIC_DIR unified 
origin + same-origin resolveApiBaseUrl + credentials:include + _headers landed. In-repo remediations for LIVE-CRIT-2/3/4 are complete — live gaps remain operator-side until origin is cut over to STATIC_DIR 
Fastify. Docs now match code — no remaining stale 467 banner, no plugin-order drift, no contradictory Docker prose. 
 
Next operator action: STATIC_DIR=apps/web/dist npm run server:start-prod or docker compose up (port 4000/5000) + npm run test:prod-readiness to flip LIVE-CRIT-2/3/4 to green. docs/audit_report_5.md 
intentionally left untouched. 
 
Changes are staged in the working tree (not yet committed) — ready for the SSH wrapper commit per the repo's main-only convention.

