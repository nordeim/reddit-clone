docs/REMEDIATION_PLAN.md — Remaining Gaps Advisory 
 
Reviewed at: 904ffce (53b5e6b+doc-fix + skill-fix) · Method: read REMEDIATION_PLAN.md at exact line + rg probes vs codebase (package.json:29 scripts, 485 vitest, app.ts:9 plugins, vite.config.ts singlefile, 
App.tsx HashRouter, lib/api.ts fetch client, REMEDIATION_EXECUTION_PLAN.md, docs/session_*.md). test:plan-alignment currently ✅ PASS — no forbidden token. 
 
│ Headline: 10 checkboxes remain [ ] (7 in Phase 4 + 3 in Phase 5) — all correctly open, none contradict code. 0 critical hidden gaps; 5 correctly-deferred breaking changes, 3 
│ intentionally-deferred-by-operator, 2 true audit gaps that are the next frontier. 
 
---
 
1. Execution Status Snapshot 
 
┌───────────┬─────────────────────────────┬─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐ 
│ Band      │ Status                      │ Evidence                                                                                                                                                            │ 
├───────────┼─────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ B0–B16    │ DONE (committed to main)    │ REMEDIATION_EXECUTION_PLAN.md: B0–B16 done, verified client.ts WAL/busy_timeout, 0000+0001 migrations, voteService.ts atomic, app.ts 9 plugins, e2e/smoke 9         │ 
├───────────┼─────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ B17–B22   │ B18 DONE (R6+R7), rest      │ REMEDIATION_PLAN.md:6 banner: B17 / B19–B22 still deferred — see §5. B18 = 64 TDD tests (AuthProvider 20 + api refresh 9 + LoginPage 10 + RegisterPage 11 + Navbar  │ 
│           │ DEFERRED                    │ 8 + RequireAuth 5 + api displayName 1)                                                                                                                              │ 
├───────────┼─────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ B23–B24   │ DONE (R3)                   │ Dockerfile 4.4K + compose 2.1K + ci.yml 3 jobs + playwright.config.ts 4 variants                                                                                    │ 
├───────────┼─────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Phase 1–3 │ All ✅                      │ ESLint 9 flat (eslint.config.mjs — Prettier intentionally omitted per R11 F9), CI gitleaks→test→build→e2e, 7 tables+FTS5+seed                                       │ 
└───────────┴─────────────────────────────┴─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ 
 
---
 
2. Remaining Gaps — The 10 Open Checkboxes 
 
### Phase 4: Frontend Refactoring (Client-Server Integration) — 7 open 
 
┌──────┬────────────────────────────────┬──────────┬────────────────────────────────────────────────────────────────────┬────────────────┬─────────────┬────────────────────────────────────────────────────────┐ 
│ ID   │ Title                          │ Status   │ Codebase Reality                                                   │ Blocks         │ Severity    │ Recommendation                                         │ 
│      │                                │ in Plan  │                                                                    │                │             │                                                        │ 
├──────┼────────────────────────────────┼──────────┼────────────────────────────────────────────────────────────────────┼────────────────┼─────────────┼────────────────────────────────────────────────────────┤ 
│ 4.1  │ BrowserRouter for clean URLs   │ [ ]      │ App.tsx:30 still <HashRouter> — rg BrowserRouter apps/web/src → 0  │ SEO,           │ High,       │ Defer until explicit user confirmation (plan already   │ 
│      │                                │          │ runtime, 1 comment LoginPage.tsx:27 // B17 will switch             │ deep-links     │ breaking    │ says so). Sacred deploy anywhere (GitHub               │ 
│      │                                │          │                                                                    │ without #      │             │ Pages/S3/python -m http.server). Flipping requires     │ 
│      │                                │          │                                                                    │                │             │ backend SPA fallback + CDN rewrite — do not            │ 
│      │                                │          │                                                                    │                │             │ stealth-fix.                                           │ 
├──────┼────────────────────────────────┼──────────┼────────────────────────────────────────────────────────────────────┼────────────────┼─────────────┼────────────────────────────────────────────────────────┤ 
│ 4.2  │ Remove vite-plugin-singlefile  │ [ ]      │ vite.config.ts:6 import { viteSingleFile } + :17 plugins:          │ Perf (cache,   │ High,       │ Paired with 4.1 — same B17 gate. Removing singlefile   │ 
│      │ → code splitting               │          │ [...viteSingleFile()] — dist/index.html 539 KB singlefile intact.  │ chunking, CDN) │ breaking    │ without BrowserRouter is pointless. Keep deferred.     │ 
│      │                                │          │ CSP unsafe-inline conditional on STATIC_DIR at app.ts:79 is the    │                │             │                                                        │ 
│      │                                │          │ known tradeoff.                                                    │                │             │                                                        │ 
├──────┼────────────────────────────────┼──────────┼────────────────────────────────────────────────────────────────────┼────────────────┼─────────────┼────────────────────────────────────────────────────────┤ 
│ 4.3  │ Integrate React Query          │ [ ]      │ rg "react-query|@tanstack" package.json apps/*/package.json → 0    │ All of         │ High,       │ Next after B17 — but currently blocked by live backend │ 
│      │ (@tanstack/react-query)        │          │ hits. Fetch client exists apps/web/src/lib/api.ts:279              │ 4.4–4.6,4.10   │ foundation  │ unreachable (LIVE-CRIT-2 Python http.server). Wiring   │ 
│      │                                │          │ resolveApiBaseUrl + credentials:include, but no                    │                │             │ feeds to API as primary source now would break offline │ 
│      │                                │          │ useQuery/useMutation wrapper.                                      │                │             │ demo (audit_report_2 F7 hybrid fallback). Keep         │ 
│      │                                │          │                                                                    │                │             │ deferred.                                              │ 
├──────┼────────────────────────────────┼──────────┼────────────────────────────────────────────────────────────────────┼────────────────┼─────────────┼────────────────────────────────────────────────────────┤ 
│ 4.4  │ Hybrid Zustand → React Query   │ [ ]      │ store.ts still owns                                                │ State desync   │ High,       │ Same gate as 4.3. Requires 4.3 first. Documented       │  │      │ (server) + Zustand (UI only)   │          │ votes/savedPosts/localPosts/localComments/notificationReadOverride │ risk, stale UI │ design      │ mitigation (strict separation) is not yet testable.    │ 
│      │                                │          │ s + theme/toasts. No QueryClient. Plan describes hybrid: React     │                │             │                                                        │ 
│      │                                │          │ Query first, fallback to src/data/* on failure — not implemented.  │                │             │                                                        │ 
├──────┼────────────────────────────────┼──────────┼────────────────────────────────────────────────────────────────────┼────────────────┼─────────────┼────────────────────────────────────────────────────────┤ 
│ 4.5  │ Replace src/data/* imports     │ [ ]      │ rg "from.*data/(users|posts|communities)" apps/web/src/pages →     │ Data           │ High        │ Depends on 4.3/4.4. Hybrid strategy is the correct     │ 
│      │ with useQuery hooks            │          │ still deterministic layer is primary                               │ freshness,     │             │ target — wholesale replacement would break deploy      │ 
│      │                                │          │ (Home/Community/Profile/Search). lib/api.ts is foundation only     │ pagination     │             │ anywhere offline demo.                                 │ 
│      │                                │          │ (Round 5).                                                         │                │             │                                                        │ 
├──────┼────────────────────────────────┼──────────┼────────────────────────────────────────────────────────────────────┼────────────────┼─────────────┼────────────────────────────────────────────────────────┤ 
│ 4.6  │ Optimistic UI (vote/comment    │ [ ]      │ VoteControl still displays baseScore + vote via overlay; no        │ UX latency,    │ Medium      │ Requires 4.3. Current overlay is functional demo — not │ 
│      │ onMutate/onError rollback)     │          │ onMutate rollback. api.ts is pessimistic by design (Round 5),      │ flicker        │             │ broken, just not optimistic.                           │ 
│      │                                │          │ retry is auth-only (tryRefreshOn401).                              │                │             │                                                        │ 
├──────┼────────────────────────────────┼──────────┼────────────────────────────────────────────────────────────────────┼────────────────┼─────────────┼────────────────────────────────────────────────────────┤ 
│ 4.10 │ Infinite scroll                │ [ ]      │ PostList still PAGE_SIZE=8 + useInfiniteScroll rootMargin:400px +  │ Perf, real     │ Medium      │ Same gate. Latency intentionally paired with Skeleton  │ 
│      │ useInfiniteQuery cursor        │          │ 650 ms simulated latency (PostList.loadMore) + Skeleton. No cursor │ pagination     │             │ per AGENTS/CLAUDE — plan wants to replace it, but demo │ 
│      │ pagination                     │          │  param hitting GET /api/posts?cursor.                              │                │             │ still relies on it.                                    │ 
└──────┴────────────────────────────────┴──────────┴────────────────────────────────────────────────────────────────────┴────────────────┴─────────────┴────────────────────────────────────────────────────────┘ 
 
│ Note: 4.7/4.8/4.9 are already ✅ (LoginPage/RegisterPage at pages/, Navbar useAuth(), RequireAuth guarding /notifications — B18). The table correctly shows them ticked. 
 
### Phase 5: Testing, Observability & Hardening — 3 open 
 
┌─────┬───────────────┬────────────────────────────┬───────────────────────────────────────────────────────────────────────────────┬───────────┬────────────────────────────────────────────────────────────────┐ 
│ ID  │ Title         │ Plan Text                  │ Reality                                                                       │ Severity  │ Recommendation                                                 │ 
├─────┼───────────────┼────────────────────────────┼───────────────────────────────────────────────────────────────────────────────┼───────────┼────────────────────────────────────────────────────────────────┤ 
│ 5.4 │ Sentry error  │ [ ] Deferred indefinitely  │ rg "sentry|@sentry" package.json apps/ packages/ → 0 hits. No DSN/auth token  │ Low       │ Intentionally deferred — keep as-is. Adding a stub Sentry      │ 
│     │ tracking      │ (operator decision; Pino + │ in repo. app.ts logger is pino + requestId (x-request-id header) — correctly  │           │ without DSN would be speculative scaffolding (plan says so).   │ 
│     │               │ requestId sufficient. R15  │ annotated as sufficient for current scale.                                    │           │ Do not fix until operator provides SENTRY_DSN.                 │ 
│     │               │ F6)                        │                                                                               │           │                                                                │ 
├─────┼───────────────┼────────────────────────────┼───────────────────────────────────────────────────────────────────────────────┼───────────┼────────────────────────────────────────────────────────────────┤ 
│ 5.5 │ Source maps → │ [ ] Deferred indefinitely  │ No sourcemap upload config; Vite build is singlefile 539 KB.                  │ Low       │ Same gate as 5.4. Keep deferred.                               │ 
│     │ Sentry        │ (depends on 5.4)           │                                                                               │           │                                                                │ 
├─────┼───────────────┼────────────────────────────┼───────────────────────────────────────────────────────────────────────────────┼───────────┼────────────────────────────────────────────────────────────────┤ 
│ 5.8 │ OWASP Top 10  │ [ ] Perform a final        │ No ZAP scan artifact, no a11y audit report in docs/. Partial coverage exists: │ Medium,   │ Next frontier after test:prod-readiness cutover. Plan itself   │ 
│     │ + WCAG 2.2 AA │ security audit             │ hardening.test.ts asserts Helmet CSP/HSTS, Modal.tsx useFocusTrap, AppShell   │ true gap  │ was updated R16 to treat 5.8 as the remaining audit —          │ 
│     │ audit         │                            │ skip-link, MotionConfig reducedMotion, 44 px touch targets in SKILL §8 — but  │           │ correctly left [ ]. Recommend npm run test:prod-readiness      │ 
│     │               │                            │ no formal OWASP/WCAG report. Risk register notes SQLite write contention      │           │ (already strict gate) + axe-core + ZAP baseline scan as first  │ 
│     │               │                            │ (~500 TPS → Postgres escape hatch).                                           │           │ pass, not full cert.                                           │ 
└─────┴───────────────┴────────────────────────────┴───────────────────────────────────────────────────────────────────────────────┴───────────┴────────────────────────────────────────────────────────────────┘ 
 
---
 
3. Cross-Cutting Gap Analysis 
 
┌─────────────────┬───────────────────────────────────────────┬──────────────────────────────────────────────────────────────────────────────────────────────┬──────────────────────────────────────────────────┐ 
│ Dimension       │ Plan Says                                 │ Codebase Says                                                                                │ Gap?                                             │ 
├─────────────────┼───────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────┤ 
│ Data source     │ "SQLite is target, PRNG is seed-only      │ Deterministic layer still primary for feeds/search (POSTS 320 at import); DB is target for   │ Correctly deferred — hybrid strategy in §4.4 is  │ 
│                 │ (ADR-001)"                                │ api (GET /api/posts etc.)                                                                    │ the bridge, not yet implemented. No drift.       │ 
├─────────────────┼───────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────┤ 
│ State mgmt      │ "React Query owns server state" (ADR-105) │ Zustand still owns all (votes/saves/localPosts). lib/api.ts has getToken as function not     │ Same gate — deferred, not a lie.                 │ 
│                 │                                           │ stored string, tryRefreshOn401 opt-in — wired only for auth.                                 │                                                  │ 
├─────────────────┼───────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────┤ 
│ Routing/Build   │ "BrowserRouter + chunked Vite" (ADR-106)  │ HashRouter + viteSingleFile — sacred, needs user confirmation. Plan marks Target State       │ No drift.                                        │ 
│                 │                                           │ (Pending B17) — accurate.                                                                    │                                                  │ 
├─────────────────┼───────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────┤ 
│ Search          │ "FTS5 virtual tables" (ADR-109)           │ packages/db/src/fts5.ts content='posts' + triggers posts_ai/ad/au + BM25 searchPosts() +     │ No gap.                                          │ 
│                 │                                           │ search.ts GET /api/search — DONE. postgrase escape hatch correctly notes tsvector rewrite    │                                                  │ 
│                 │                                           │ (R11 F6).                                                                                    │                                                  │ 
├─────────────────┼───────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────┤ 
│ Observability   │ "OpenTelemetry + Pino" (ADR-110)          │ Pino requestId correlation (app.ts plugin order 1-9, x-request-id header, redacted           │ No gap.                                          │ 
│                 │                                           │ authorization/cookie/password/accessToken/refreshToken) — DONE as requestId variant; OTel    │                                                  │ 
│                 │                                           │ not wired. Plan notes Pino + requestId is sufficient — accurate.                             │                                                  │ 
├─────────────────┼───────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────┤ 
│ Definition of   │ Coverage >80%, ZAP no High/Critical,      │ lint 0, typecheck 0, 485 tests (no 80% gate — vitest.config.ts coverage informational,       │ DoD is aspirational — 80% and ZAP are not        │ 
│ Done            │ gitleaks, logs with correlation, README   │ thresholds 0), gitleaks present .github/workflows/ci.yml, test:plan-alignment ✅, no ZAP     │ CI-enforced (plan correctly doesn't claim they   │ 
│                 │ bootstrap, migration reversible           │ report, backup backupDb() online API (R13) exists, Docker healthcheck exists                 │ are; CLAUDE notes "80% aspirational, not         │ 
│                 │                                           │                                                                                              │ enforced").                                      │ 
└─────────────────┴───────────────────────────────────────────┴──────────────────────────────────────────────────────────────────────────────────────────────┴──────────────────────────────────────────────────┘ 
 
---
 
4. What Is NOT a Gap (Correctly Closed or Intentionally Deferred) 
 
- F1–F9, 11/13 round fixes: double-submit cookie removed (Bearer+Strict), Path=/api/auth corrected (R11 F4), R15 indexes + registerResponseSchema, ID strategy reconciled, FTS5→tsvector hatch, auth ×5→×4, 
  Prettier omitted (ESLint --fix) — all in plan and verified. 
- Docker COPY web/dist + STATIC_DIR: Dockerfile:91 + apps/web/public/_headers 841 B close LIVE-CRIT-3 for static hosts; start_production.sh unified. Plan's §4 Risk Assessment SQLite WAL/busy_timeout=5000 is 
  live (client.ts). 
- Auth refresh-and-retry: api.ts:364,423 credentials:include, LoginPage safePostLoginPath rejects //, https://, /\ (open-redirect guard) — all done (R6/R15). 
- skills/ 13,896 tracked: Intentional exception — verify-gitignore-enforced.sh excludes ^skills/ — not a plan failure. 
 
---
 
5. Recommended Sequencing (When You Do Tackle the 10) 
 
Do not break deploy anywhere without a user-confirmed cutover. Suggested order: 
 
1. 5.8 (audit) next — npm run test:prod-readiness (already strict, exits 1 when /health//api/*/headers fail) + axe-core + ZAP baseline. Cheapest, no breaking change, closes the only true audit gap. 
2. B17 (4.1+4.2) together — Remove vite-plugin-singlefile, add BrowserRouter, add SPA fallback (STATIC_DIR already handles /, but BrowserRouter needs /* fallback on static hosts). Requires CDN rewrite rule —   
   needs your explicit go-ahead (plan says so twice). 
3. 4.3 → 4.4 → 4.5 → 4.10 → 4.6 in that order — react-query first, then hybrid split, then feed rewiring, then cursor pagination, then optimistic rollback. Do not wire feeds to API as primary source while live 
   backend is still Python http.server (LIVE-CRIT-2). 
4. 5.4/5.5 last — only when SENTRY_DSN exists. 
 
If you want zero new work, the current open set is honest and shippable — test:plan-alignment stays green, docs already state "deferred indefinitely" where applicable, and the deferred items are precisely the  
breaking deploy-anywhere tradeoffs the plan was designed to gate.

