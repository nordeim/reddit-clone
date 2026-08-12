Codebase Alignment Review: AGENTS.md · CLAUDE.md · README.md ↔ embers 
 
Executive Summary 
 
I read all three docs against the actual source tree, ran the full test suite, and spot-checked every architecture claim with read/rg/bash. The documentation is remarkably accurate and meticulously maintained. Every structural, 
behavioral, and numerical claim I could verify against the repo holds — including the normally-fragile "reshuffling hazard" seed strings, the Round 10/11 bug-fix contracts, and the exact test counts. 
 
Verdict: aligned. I found 0 contradictions between docs and code. There are 3 minor doc-precision nuances and 1 out-of-scope repo-hygiene artifact (the skills/ symlink), none of which misrepresent the codebase. 
 
---
 
Validation Matrix (docs ↔ code) 
 
### 1. Structure & tech stack — ✅ exact 
 
- Workspaces apps/web, apps/server, packages/shared, packages/db present; root package.json workspaces glob matches. 
- Every version in the tables matches package.json: React 19.2.6, Vite 7.3.2, TS 5.9.3, Tailwind 4.1.17, react-router 7.18.2, zustand 5.0.14, framer-motion 13.x, lucide-react 1.31.0, vitest 2.1.9, jsdom 25.0.1, Fastify 5.11.3, Drizzle 
  0.36.4, better-sqlite3 13.0.3, jose 5.10.0, argon2 0.41.1, zod 3.25.76, pino 9.14.0. 
 
### 2. Test counts — ✅ exact (ran the suite) 
 
npm test → web 271 (19 files) · db 30 (2 files) · shared 70 (3 files) · server 95 (8 files) = 466, all green. E2E inventory matches: smoke.spec.ts(9) + auth.spec.ts(9) + live.spec.ts(12) + live_extended.spec.ts(16) + 
repro_r10_postpage.spec.ts(2) = 48. Server test distribution also matches the doc's "5 in routes/ + 2 in auth/ + 1 config" breakdown. 
 
### 3. State management — ✅ exact 
 
- store/storage.ts: STORAGE_KEY="reddit-clone-state", SCHEMA_VERSION=1, PERSISTED_FIELDS = 8 entries; partialize in store.ts whitelists exactly those 8 (toasts correctly excluded); validatePersistedState drops invalid fields 
  individually; mergePersistedState never throws. 
- store/selectors.ts: all six selectors present with the documented signatures — getVisibleScore, isPostSaved, isCommunityJoined, getUnreadNotificationCount, getDerivedCommentCount, capBadgeCount. All are pure (take slices, no 
  useAppStore). 
 
### 4. Deterministic data layer — ✅ exact 
 
- Seeds: USERS = generateUsers(48), CURRENT_USER (id:"u-me"), COMMUNITIES = generateCommunities() (18), POSTS = generatePosts(320), NOTIFICATIONS (18). 
- Seed strings match the "reshuffling hazard" claim: users-seed-v1, posts-seed-v2, notifications-seed-v1. 
- Accessor contracts verified in code: getPost → Post | undefined; getCommunityByName → Community | undefined; getCommunity throws (communities.ts:226); getUser → usersById.get(id) ?? CURRENT_USER (silently returns CURRENT_USER on 
  miss). 
 
### 5. Routing — ✅ exact (App.tsx) 
 
HashRouter; /login + /register render outside AppShell; /notifications wrapped in <RequireAuth>; all other paths match the table. main.tsx wraps <App/> in <AuthProvider apiClientFactory={(opts) => createApiClient(opts)}>. 
 
### 6. Auth / Round 6–7 / Round 10 fixes — ✅ exact 
 
- lib/api.ts: ApiError{status,code,message,requestId}, tryRefreshOn401 opt-in (default false), onTokenRefresh callback, refresh() passes skipRefresh:true (no recursion), encodeURIComponent on dynamic segments, pessimistic by design.   
- AuthProvider.tsx: AuthUser full server shape; register() + login() + logout() (best-effort); token in useRef; tryRefreshOn401:true wired. 
- BUG-R10-5 (RegisterPage): submit disabled on password !== confirmPassword and real-time inline hint — both present. 
- BUG-R10-4 (Navbar): min-w-0 on the SearchBar wrapper div — present. 
- BUG-R10-2 (PostPage): module-scope EMPTY_COMMENTS constant for the zustand selector — present; 500 ms simulated latency present. 
- BUG-R10-3 (NotFoundPage): h1 reads 404 — Page not found. 
 
### 7. Backend — ✅ exact 
 
- app.ts buildApp(): documented plugin order (helmet→cors→cookie→rateLimit→requestId→auth→routes→errorHandler); lazy route registration gated on db && rawDb; repositories + voteService injected. 
- config.ts loadEnv(): zod-validated; .env/.env.local loaded via dotenv from repo root (precedence shell > .env.local > .env > defaults); production requires JWT_ACCESS_SECRET/JWT_REFRESH_SECRET/DATABASE_URL/CORS_ORIGIN (min 32 
  chars). 
- @embers/db schema/index.ts: 7 tables; votes composite PK (user_id,target_id,target_type); sessions stores refresh JTI; the Round 11 index() builders (idx_posts_community_created, idx_comments_post_id, idx_notifications_user_read)    
  mirror migrations/0001_add_performance_indexes.sql (which exists, idempotent IF NOT EXISTS). 
- client.ts: pragmas WAL / busy_timeout=5000 / foreign_keys=ON / synchronous=NORMAL; WAL skipped for :memory:. 
- fts5.ts: posts_fts external-content pattern; triggers posts_ai/posts_ad/posts_au; BM25 via searchPosts. 
- @embers/shared: branded IDs (UserId/CommunityId/PostId/CommentId/NotificationId + asXxx); registerResponseSchema = { user: authUserSchema } present (Round 11 F3). 
- Backend seed: 49 users (48 generated + demo you/embers-demo), 18 communities, 320 posts, ~3037 comments, 18 notifications — matches seed.test.ts assertions. 
 
### 8. Build constraints — ✅ exact 
 
- vite.config.ts: viteSingleFile() plugin, no manualChunks, and a repo-wide rg found no React.lazy / no code-splitting import(). 
- Tailwind v4: index.css has @custom-variant dark (...) + @theme + hand-written .line-clamp-1/2/3; no tailwind.config.*/postcss.config.* exist. 
- @/* alias wired in both tsconfig.json (paths) and vite.config.ts (resolve.alias) but unused (zero @/ imports in src). 
- Theme bootstrap: inline index.html script reads reddit-clone-state and applies .dark before paint. 
- ErrorBoundary wraps <Outlet/> in AppShell. 
 
### 9. Security / hygiene (R9.1 · R10.5) — ✅ exact 
 
- .env and env.bak are gitignored and not tracked (git ls-files returns nothing; git check-ignore matches). test:no-secrets would pass. 
- npm run lint (ESLint 9 flat config) → exit 0, 0 errors/warnings. 
 
---
 
Minor Nuances (doc precision, not contradictions) 
 
1. DATABASE_URL default is env-template-supplied, not code-default. README/CLAUDE say it "Defaults to packages/db/dev.db," but config.ts hardcodes z.string().default("./dev.db") (resolved to <repo-root>/dev.db by loadEnv when no .env  
   exists). The documented value actually comes from .env.example (DATABASE_URL=packages/db/dev.db). In this checkout .env provides it, so seed (packages/db/dev.db) and server (resolved to <repo-root>/packages/db/dev.db = same path)   
   agree. Without an .env, the two would diverge. Doc-precision note only. 
 
2. Stray apps/server/dev.db (+ -shm/-wal) exists on disk. A stale artifact from an earlier server run where the DB resolved under apps/server/. It's gitignored (*.db) so untracked/clutter — safe to delete. 
 
3. root package.json allowScripts lists better-sqlite3@11.10.0 in addition to the actual 13.0.3. The 11.10.0 entry is stale but harmless. 
 
Out-of-scope hygiene observation (flagged, not a doc/code issue) 
 
git ls-files returns ~13,896 tracked entries under skills/ — the skills symlink points at /home/pete/.pi/agent/skills and was committed before/despite the skills/ gitignore rule. None of the three docs mention skills/, and it's 
unrelated to the embers codebase, but the operator may want to untrack it (git rm -r --cached skills) to slim the repo. I did not touch it. 
 
---
 
Conclusion 
 
The documentation set (AGENTS.md, CLAUDE.md, README.md) is a faithful, current reflection of the codebase. Recommendation: no remediation needed for doc↔code alignment. The only actionable items are the two hygiene cleanups (delete    
apps/server/dev.db; untrack skills/) and one doc-precision tightening (state that DATABASE_URL's "default" is sourced from .env.example, not the schema).

---

I've read the full docs/session_11.md. It's a Mode-C audit report (audit of docs/REMEDIATION_PLAN.md against the codebase) that produced 9 findings (H-1, M-1, M-2, L-1, L-2, L-3, I-1, I-2, plus a long "Verified claims" block). 
Critically, per the AGENTS/CLAUDE/README round-logs I reviewed in the previous turn, Round 11 (2026-08-12) already remediated 8 of those 9 findings via F1–F9 — so validating this doc today means checking both audit fidelity (was the   
auditor right about the code?) and current-state reconciliation (did the Round 11 fixes actually land?). 
 
Below is the meticulous plan. I have not executed it yet — this is the ANALYZE/PLAN phase, awaiting your go-ahead before I run the validation. 
 
---
 
Plan: Review & Validate docs/session_11.md Against the Codebase 
 
1. Objective 
 
Establish, with evidence, whether docs/session_11.md accurately describes the embers codebase, by independently re-verifying every finding and every "Verified claim" against the current source — and reconciling each with the Round 11  
remediations (F1–F9) that the doc itself precipitated. 
 
2. Scope & Provenance Checks (must pass first) 
 
The doc's header claims it audits nordeim/reddit-clone @ HEAD (commit 79fe074). The project is actually @embers/* (embers). Before trusting any finding I will: 
- git rev-parse HEAD and git log -1 --oneline — confirm the actual HEAD and whether 79fe074 is an ancestor/matches. 
- Confirm every file path cited in the doc (apps/server/src/routes/auth.ts, packages/db/src/migrations/0000_*.sql, packages/shared/src/api/index.ts, etc.) exists in this checkout. 
- Note the repo-name discrepancy (nordeim/reddit-clone vs embers) as a doc-hygiene flag. 
 
3. Methodology 
 
For each item: (a) re-read the cited source file/line; (b) classify against the doc's own claim as Verified-Accurate / Remediated-Now / Drifted / Contradicted; (c) record the exact file:line evidence. Tests will be run where a finding 
depends on a test (e.g., I-2 vote concurrency, M-1 index regression test). 
 
4. Detailed Validation Checklist 
 
### Meta / provenance 
 
- [ ] HEAD commit == 79fe074 or documents its relationship; repo identity noted. 
- [ ] All 12+ cited paths exist; no phantom references. 
 
### H-1 — CSRF "double-submit cookie" fabricated (§5.2) 
 
- [ ] rg -i "csrf|double-submit|xsrf|x-csrf" across apps/server, apps/web → matches only in docs. 
- [ ] apps/server/src/routes/auth.ts sets SameSite=Strict on refresh cookie (doc cites :313). 
- [ ] Reconcile with Round 11 F1: confirm docs/REMEDIATION_PLAN.md §5.2 no longer contains the fabricated CSRF claim (replaced with Bearer-token mitigation). → Expect: finding was accurate at audit time, and now remediated in the 
      plan. 
 
### M-1 — Indexes claimed in §4.1 absent from migration 
 
- [ ] Read packages/db/src/migrations/0000_*.sql → only communities_slug_unique, users_username_unique. 
- [ ] Reconcile with Round 11 F2: confirm packages/db/src/migrations/0001_add_performance_indexes.sql exists with idx_posts_community_created, idx_comments_post_id, idx_notifications_user_read; confirm schema/index.ts index() builders 
      mirror them; confirm packages/db/src/client.test.ts has the +1 regression test. 
- [ ] Naming drift: plan said recipient_id/read_at; schema uses user_id/read — confirm current migration uses notifications(user_id, read). 
 
### M-2 — loginResponseSchema / registerResponseSchema naming 
 
- [ ] rg "loginResponseSchema|registerResponseSchema|loginOutputSchema" in packages/shared. 
- [ ] Reconcile with Round 11 F3: confirm registerResponseSchema now exists in packages/shared/src/api/index.ts (I confirmed line 61-64 last turn). Note: doc also wanted loginOutputSchema → loginResponseSchema rename — check whether   
      F3 did the rename or only added registerResponseSchema (likely partial remediation). 
 
### L-1 — Refresh cookie Path=/api/auth/refresh vs /api/auth 
 
- [ ] apps/server/src/routes/auth.ts:314 and :274 → path: "/api/auth". 
- [ ] Reconcile with Round 11 F4: confirm docs/REMEDIATION_PLAN.md §5.1 updated to Path=/api/auth. 
 
### L-2 — ID-generation strategy divergence (plan vs schema comment vs runtime) 
 
- [ ] packages/shared/src/ids.ts (branded types, compile-time only). 
- [ ] packages/db/src/schema/index.ts:8 comment + apps/server/src/routes/{auth,posts}.ts runtime (u-<uuid>, p-<uuid>). 
- [ ] Reconcile with Round 11 F5: confirm the three sources now describe one canonical strategy. 
 
### L-3 — Postgres escape hatch aspirational (§5.3) 
 
- [ ] Confirm docs/REMEDIATION_PLAN.md §5.3 now includes the 4th step (FTS5 → tsvector/tsquery rewrite of packages/db/src/fts5.ts + search.ts). → Round 11 F6. 
 
### I-1 — session_10.md route-count math (auth × 5 → × 4) 
 
- [ ] Recompute: 1 + 4 + 5 + 2 + 1 + 2 + 1 + 1 = 17. 
- [ ] Reconcile with Round 11 F7: confirm docs/session_10.md "Server routes" row now says auth × 4. 
 
### I-2 — B11 vote-concurrency (verified) 
 
- [ ] Read apps/server/src/routes/voteConcurrency.test.ts — confirm 3 tests at the cited lines asserting +100 / toggle→0 / flip→+2. 
- [ ] Confirm atomicity in services/voteService.ts (UPDATE … SET col = col + delta inside db.transaction()). → Expect: still accurate, unchanged. 
 
### "Verified claims" block (spot-check representative subset) 
 
- [ ] Monorepo 4 workspaces; plugin order in app.ts; Pino redaction list. 
- [ ] JWT HS256 15m/7d + jti rotation (auth/jwt.ts); Argon2id (auth/password.ts). 
- [ ] SQLite pragmas in client.ts; FTS5 triggers posts_ai/ad/au. 
- [ ] votes composite PK; 7 tables; branded IDs present. 
- [ ] 17 API routes exist (enumerate); author-only 403 in posts.ts. 
- [ ] B17 deferred (HashRouter/viteSingleFile active); B18 done; B19–B22 deferred (rg "tanstack|react-query" → docs only). 
- [ ] B23 Dockerfile + compose + CI gitleaks-first; B24 Playwright e2e/. 
 
5. Edge Cases / Risks 
 
- Historical-snapshot risk: session_11.md is pre-Round-11; "aligned" today means audit was faithful + remediations landed — not that the doc literally matches current code. 
- Repo-name mismatch (nordeim vs embers) — verify it's the same codebase by path/commit, not a foreign repo. 
- Partial remediation: M-2 likely only half-fixed (added registerResponseSchema, may not have renamed loginOutputSchema). 
- Test-dependent findings: M-1 relies on a regression test added in Round 11 — I'll run npm test --workspace @embers/db to confirm it passes. 
 
6. Definition of Done 
 
- Every one of the 9 findings has a traceability row: finding → cited evidence re-verified → Round-11 remediation status → final verdict. 
- Every "Verified claim" has at least a spot-check confirmation. 
- A final verdict: does docs/session_11.md accurately reflect this codebase? (expected: "Yes as a historical audit; all 8 remediable findings confirmed fixed in Round 11, I-2 still valid"). 
- Output: a findings-to-code traceability matrix + a short list of residual doc-hygiene notes (repo name, any partial remediation like M-2 rename). 
 
7. Execution Phases 
 
1. Phase 0 — Provenance: HEAD/commit + path existence. 
2. Phase 1 — Findings H-1, L-1, L-2, L-3, I-1: grep + read cited lines + confirm Round 11 doc fixes. 
3. Phase 2 — Findings M-1, M-2: schema/migration/share read + run db + shared test suites for regression tests. 
4. Phase 3 — I-2 + Verified-claims spot-checks: read voteConcurrency.test.ts, enumerate routes, grep react-query. 
5. Phase 4 — Synthesize: traceability matrix + verdict + residual notes. 
 
8. What I Will NOT Do 
 
This is review-only (mirroring the doc's own contract). I will not modify session_11.md, the plan, or any source — only report alignment. If you want remediations applied (they're largely already done in Round 11), that's a separate,  
confirmed step. 
 
---
 
Shall I execute this validation plan? I'll proceed through Phases 0–4 and return the traceability matrix + verdict. (If you'd prefer I scope it down — e.g., only the 9 findings, skipping the Verified-claims spot-checks — tell me and   
I'll trim Phase 3's breadth.)

---

All closing checks pass. Provenance resolved: git cat-file -t 79fe074 returns commit — the audit's cited HEAD genuinely exists in this clone's history (it predates the Round 11 finalization commits 0987bd5/9c4c268), so there is no 
provenance discrepancy; the audit simply ran before Round 11. The remaining verified-claims (author-only 403 at posts.ts:134/201, refresh-jti rotation at auth.ts:212/265, Argon2id at password.ts:19, B23 Docker/compose/CI-gitleaks) all 
check out. 
 
---
 
Validation Report — docs/session_11.md ↔ embers codebase 
 
Method: Independent re-verification of every finding + a representative subset of the "Verified claims" block against current source. Tests run where a finding depends on one. No files modified (review-only, per the audit contract).   
 
Provenance (Phase 0) — ✅ clean 
 
- Commit 79fe074 exists in history (git cat-file -t → commit); it is the pre-Round-11 audit HEAD, with 0987bd5/9c4c268 layered on top. The stale hash is expected, not a contradiction. 
- Remote is git@github.com:nordeim/reddit-clone — the doc's nordeim/reddit-clone is the correct repo (the @embers/* name is just the internal npm scope). 
- All 12+ cited file paths exist. 
 
Traceability Matrix — the 9 findings 
 
┌─────┬───────────────────────────────────────────┬────────────────────────────────────────────────┬─────────────────────────────────────────────────────────────────────────────────────────────────────────────┬───────────────────────┐ 
│ ID  │ Audit claim                               │ Audit accurate at audit-time?                  │ Current state (post-Round-11)                                                                               │ Verdict               │ 
├─────┼───────────────────────────────────────────┼────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────┤ 
│ H-1 │ §5.2 claimed CSRF double-submit cookie;   │ ✅ Yes — only matched in docs                  │ REMEDIATION_PLAN.md:216 now states "no such mechanism exists" (F1)                                          │ Auditor correct ·     │ 
│     │ absent in code                            │                                                │                                                                                                             │ Remediated            │ 
├─────┼───────────────────────────────────────────┼────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────┤ 
│ M-1 │ §4.1 claimed 4 indexes; 0000 had only 2   │ ✅ Yes — 0000 has only                         │ 0001_* adds idx_posts_community_created, idx_comments_post_id, idx_notifications_user_read; schema/index.ts │ Auditor correct ·     │ 
│     │                                           │ communities_slug_unique, users_username_unique │  mirrors via index() builders; client.test.ts:199 regression passes (db suite 30 ✅)                        │ Fully Remediated      │ 
├─────┼───────────────────────────────────────────┼────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────┤ 
│ M-2 │ registerResponseSchema absent;            │ ✅ Yes — registerResponseSchema did not exist; │ registerResponseSchema added (api/index.ts:61, F3) ✅, but loginOutputSchema was NOT renamed → mixed        │ ⚠ Partially          │ 
│     │ loginOutputSchema not renamed             │ naming mixed                                   │ *OutputSchema/*ResponseSchema convention persists                                                           │ Remediated            │ 
├─────┼───────────────────────────────────────────┼────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────┤ 
│ L-1 │ §5.1 claimed Path=/api/auth/refresh; code │ ✅ Yes                                         │ auth.ts:274,314 = path:"/api/auth"; REMEDIATION_PLAN.md:207 corrected (F4)                                  │ Auditor correct ·     │ 
│     │ uses /api/auth                            │                                                │                                                                                                             │ Remediated            │ 
├─────┼───────────────────────────────────────────┼────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────┤ 
│ L-2 │ 3 sources disagree on ID strategy         │ ✅ Yes                                         │ schema/index.ts:8 + auth.ts:96 (u-${randomUUID()}) + posts.ts:90 (p-${randomUUID()}) now converge (F5)      │ Auditor correct ·     │ 
│     │                                           │                                                │                                                                                                             │ Remediated            │ 
├─────┼───────────────────────────────────────────┼────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────┤ 
│ L-3 │ §5.3 escape hatch misses FTS5→tsvector    │ ✅ Reasoned-correct                            │ REMEDIATION_PLAN.md:226 adds the 4th step (F6)                                                              │ Auditor correct ·     │ 
│     │ rewrite                                   │                                                │                                                                                                             │ Remediated            │ 
├─────┼───────────────────────────────────────────┼────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────┤ 
│ I-1 │ session_10.md "auth × 5" → 17 miscount    │ ✅ Yes                                         │ session_10.md:34 now "auth × 4" (F7); route enumeration independently confirms exactly 17 routes            │ Auditor correct ·     │ 
│     │                                           │                                                │                                                                                                             │ Remediated            │ 
├─────┼───────────────────────────────────────────┼────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────┤ 
│ I-2 │ B11 vote concurrency (3 tests)            │ ✅ Yes — voteConcurrency.test.ts asserts +100  │ Unchanged by Round 11; still valid                                                                          │ Verified · Unchanged  │ 
│     │                                           │ / toggle→0 / flip→+2                           │                                                                                                             │                       │ 
└─────┴───────────────────────────────────────────┴────────────────────────────────────────────────┴─────────────────────────────────────────────────────────────────────────────────────────────────────────────┴───────────────────────┘ 
 
Verified-claims block — spot-checks all ✅ 
 
Monorepo (4 ws) · plugin order (app.ts) · Pino redaction (authorization/cookie/password/accessToken/refreshToken, app.ts:54-58) · JWT HS256 + 7d refresh with jti (jwt.ts) · Argon2id (password.ts:19) · SQLite pragmas (client.ts) · FTS5 
external-content + posts_ai/ad/au (fts5.ts) · votes composite PK · 7 tables · branded IDs (ids.ts) · bearer authenticate decorator · refresh-jti rotation/revoke (auth.ts:212,265) · 17 routes enumerated · author-only 403 
(posts.ts:134,201) · prod-env validation (config.ts) · B17 deferred (HashRouter + viteSingleFile) · B18 done (AuthProvider/RequireAuth/refresh-retry) · B19–B22 deferred (only a docstring mention of React Query in api.ts, zero imports) 
· B23 done (Dockerfile + compose + CI gitleaks-first) · B24 done (Playwright e2e/) · access token in useRef. 
 
Final Verdict 
 
docs/session_11.md is a faithful, accurate audit of this codebase. Every finding's primary "Evidence" re-verified against current source is correct — the auditor neither fabricated nor misread. All 8 remediable findings were fixed in  
Round 11 (F1–F9); the 9th (I-2) was a verification that remains valid. The current codebase has moved past every actionable item the doc raised. 
 
### One residual note (non-blocking) 
 
M-2 is only partially closed. Round 11 F3 added registerResponseSchema (resolving the doc's headline "doesn't exist at all" claim), but did not rename loginOutputSchema → loginResponseSchema as the audit recommended. The shared API    
layer now uses a mixed convention: authUserSchema, registerResponseSchema, loginOutputSchema, refreshTokenOutputSchema, castVoteOutputSchema, errorResponseSchema. This is cosmetic and breaks nothing, but it leaves exactly the naming   
inconsistency the audit flagged. Recommended (optional, out of scope for this review): pick one convention — either rename loginOutputSchema/refreshTokenOutputSchema/castVoteOutputSchema to *ResponseSchema, or update docs to 
standardize on *OutputSchema. 
 
### Bottom line 
 
The document is aligned with the codebase: as a historical audit it is factually correct, and as a recommendation set it is fully satisfied by the current (post-Round-11) state — with the single minor exception above. No doc↔code 
contradictions were found.

