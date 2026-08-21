I now have a complete, independently-verified picture. Full total confirmed: 281 (web) + 103 (server) + 70 (shared) + 31 (db) = 485, all passing; typecheck and lint clean across all 4 workspaces. 
 
──────────────────────────────────────────────────────────────────────────────── 
 
Audit: Round 16 uncommitted changes vs HEAD 
 
What changed (scope) 
 
This is the Round 16 remediation: production same-origin API default + credentials: "include", Fastify STATIC_DIR SPA serving (@fastify/static), LoginPage state.from redirect + /register link, inline favicon,  
Cloudflare _headers, unified start_production.sh/Docker, and the accompanying doc updates. 
 
Validation performed 
 
┌─────────────────────────────────────────────┬──────────────────────────────────────────┐ 
│ Gate                                        │ Result                                   │ 
├─────────────────────────────────────────────┼──────────────────────────────────────────┤ 
│ npm run typecheck (4 workspaces)            │ ✅ clean (exit 0)                        │ 
├─────────────────────────────────────────────┼──────────────────────────────────────────┤ 
│ npm run lint (eslint .)                     │ ✅ 0 errors / 0 warnings                 │ 
├─────────────────────────────────────────────┼──────────────────────────────────────────┤ 
│ apps/web tests                              │ ✅ 281/281                               │ 
├─────────────────────────────────────────────┼──────────────────────────────────────────┤ 
│ apps/server tests                           │ ✅ 103/103 (incl. new static.test.ts ×6) │ 
├─────────────────────────────────────────────┼──────────────────────────────────────────┤ 
│ apps/shared / apps/db tests                 │ ✅ 70 / 31                               │ 
├─────────────────────────────────────────────┼──────────────────────────────────────────┤ 
│ Total                                       │ ✅ 485/485, 0 fail                       │ 
├─────────────────────────────────────────────┼──────────────────────────────────────────┤ 
│ Cross-check vs stale docs/audit_report_5.md │ ⚠️ see below                             │ 
└─────────────────────────────────────────────┴──────────────────────────────────────────┘ 
 
Verdict: No functional/code regressions. The net-new functionality is correct and fully tested. 
 
I reviewed every diff and explicitly verified each regression claim raised by a stale prior audit (docs/audit_report_5.md): 
 
- safePostLoginPath is behaviorally identical to the old validateFromPath (returns "/" instead of null — equivalent when passed to navigate). The /\\ backslash guard is present, and { replace: true } is 
  present. 
- NETWORK_ERROR normalization is intact in api.ts, and the 3 R15-F2a/b/c tests exist (I confirmed they were already at HEAD, so the "restored this round" comment is a minor misnomer, not a regression). 
- verify-plan-alignment.mjs still has the root-PAD-duplicate guard (the "dropped" claim is false). 
- reddit-clone_SKILL.md, worklog.md, docs/REMEDIATION_PLAN.md are not even modified in the working tree, so the "reverted" claims (F4/F5/F7) don't apply to the current state. 
- package-lock.json was regenerated with @fastify/static (npm ci won't break). 
- CORS + credentials: "include" is safe: server already had credentials: true; same-origin prod (Fastify serves the SPA) doesn't trigger CORS, and dev cross-origin works via origin reflection. 
- STATIC_DIR registration order is correct: registered after API routes with wildcard: false, so /health + /api/* keep precedence and unknown /api/* still returns JSON 404 (6 passing static.test.ts tests cover 
  this). 
 
Remaining issues (documentation only — not code) 
 
1. AGENTS.md contradicts itself on test counts (the one real defect in the current tree). 
- Line 450 Total vitest count: 485 = 103 + 70 + 31 + 281 → correct (matches measurement). 
- Line 309 Round 16 banner 467 → 482 (web 271→278, server 95→103). See docs/REMEDIATION_PLAN_ROUND_15.md → wrong count (482/278) and wrong file reference (should be ROUND_16.md). 
- Line 705 pre-commit checklist all 482 tests must pass (… web 278 …) → wrong count. 
- CLAUDE.md and README.md also state 482 / web 278 throughout. 
- Actual current counts: 485 total, web 281, server 103 (vs HEAD 473: web +4 from api.test.ts resolveApiBaseUrl×3 + credentials×1; server +8 from config+1, hardening+1, static.test.ts+6). 

2. docs/audit_report_5.md is a stale, self-contradicting artifact (228 lines). It first says "Do not commit as-is" (F1–F13 regressions), then an appended rebuttal says most are false and "the branch is now  
clean." It reports web=278 — but the real count is 281, so it describes an intermediate state. It was not in the git status you pasted, so it appeared after your snapshot (likely a leftover from a prior agent  
run this session). If you git add ., it would be committed and pollute the repo with a misleading verdict. 
 
Recommended actions 
 
1. Normalize all test-count references to 485 / web 281 / server 103, and fix the Round 16 banner's ROUND_15 → ROUND_16 file reference in AGENTS.md. 
2. Don't commit docs/audit_report_5.md — delete it (or move it to a scratch dir). 
 
Everything else is sound — the code is safe to commit once the doc counts are corrected.

---

Done. Here's the final state of the audit and the cleanup I applied. 
 
Audit verdict 
 
No functional/code regressions in the Round 16 changes. The net-new functionality is correct and fully tested: 
- resolveApiBaseUrl same-origin production default + credentials: "include" (kills the live "Failed to fetch") 
- Fastify STATIC_DIR SPA serving (@fastify/static, wildcard: false) — verified not to shadow /health or /api/* (6 new static.test.ts tests) 
- safePostLoginPath is behaviorally identical to the old validateFromPath (the /\\ guard and { replace: true } are both present) 
- Inline favicon, Cloudflare _headers, unified start_production.sh/Docker 
 
Validation (re-confirmed after edits): typecheck ✅ (exit 0), lint ✅ (exit 0), tests 485/485 (web 281 · server 103 · shared 70 · db 31). 
 
What I fixed (per your selection) 
 
1. Normalized all test-count references across AGENTS.md, CLAUDE.md, README.md, and docs/Project-Architecture-Document.md to the measured 485 / web 281 / server 103. This also corrected a pre-existing 
   misattribution the round edits had baked in: resolveApiBaseUrl / credentials: include / STATIC_DIR were wrongly credited to "Round 15 → 482" even though that work is this round's (and HEAD was actually 473  
   / web 277). The docs now state accurately: Round 15 → 473 (web 277), Round 16 → 485 (web 281, server 103). 
2. Fixed ROUND_15 → ROUND_16 file references inside the Round 16 sections (the legitimately-Round-15 references were left intact). 
3. Deleted the stale docs/audit_report_5.md — a 228-line self-contradicting artifact (it says both "do not commit as-is" and "branch is clean," and reports web=278 vs the real 281). It was not in your git 
   status snapshot, so it was a leftover; it would have polluted the commit. 
 
Working tree now 
 
- All code changes unchanged and validated. 
- Three intended untracked files remain: apps/server/src/routes/static.test.ts, apps/web/public/_headers, docs/REMEDIATION_PLAN_ROUND_16.md. 
- No 482/278 count references remain; 473 survives only as the correct Round 15 historical total. 
 
The branch is consistent and safe to commit. One thing still operator-side (unchanged by this round): the live deployment gaps LIVE-CRIT-2/3/4 require redeploying with STATIC_DIR set — the in-repo remediations 
are all in place.

