# Audit Report 8 — Validation of `docs/REMEDIATION_PLAN_review.md` Against Codebase

> **Target:** `docs/REMEDIATION_PLAN_review.md` ("Remaining Gaps Advisory", self-dated at commit
> `904ffce`) vs working tree at HEAD `9dccc22` ("remediation review").
> **Date:** 2026-08-21 · **Method:** every claim in the review traced to source via read/grep probes
> with exact file:line checks, plus live execution of all four gates (`test:plan-alignment`,
> `lint`, `typecheck`, full `npm test`) and an authoritative per-file vitest run for the disputed
> B18 test arithmetic. Read-only — no code changes.

---

## Executive Summary

**Verdict: HIGH-FIDELITY.** Of ~60 discrete claims in the review document, **53 verify exactly**
(including every load-bearing claim: open-checkbox reality, code-state descriptions, line-number
citations, absence proofs, and gate status) and **7 contain minor inaccuracies** — one headline
undercount, one stale test-arithmetic snapshot, one wrong CI job count, one off-by-30 skills
count, and three citation/attribution nits. **None of the inaccuracies changes any conclusion or
recommendation in the review.** The review's bottom line — 10 phase items genuinely open, all
correctly deferred, sequencing advice sound, `test:plan-alignment` green — is confirmed.

### Gates executed during this audit

| Gate | Result |
| --- | --- |
| `npm run test:plan-alignment` | ✅ PASS — "no forbidden tokens" |
| `npm run lint` | ✅ 0 errors / 0 warnings |
| `npm run typecheck` (4 workspaces) | ✅ clean |
| `npm test` (all workspaces) | ✅ **485 passed** = web 281 + server 103 + shared 70 + db 31 |

---

## 1. Verified Claims (evidence-checked)

### 1.1 Header & meta claims

| Review claim | Result | Evidence |
| --- | --- | --- |
| Reviewed at `904ffce` (`53b5e6b` + doc-fix + skill-fix) | ✅ both commits exist | `git log`: `53b5e6b update docs` → `904ffce update docs` → `a2dbc28 update skill.md`; HEAD now `9dccc22` |
| 485 vitest total | ✅ exact | Live run: web 281, server 103, shared 70, db 31 |
| app.ts 9 plugins | ✅ | `apps/server/src/app.ts:36–45` documents order 1–9; registration matches (:67 helmet, :92 cors, :99 cookie, :110 rateLimit, :124 requestId, :127 auth, :130/:174–188 routes, :195 static, :205 errorHandler) |
| vite.config.ts singlefile | ✅ exact lines | `apps/web/vite.config.ts:6` import, `:17` plugins array |
| App.tsx HashRouter | ✅ exact line | `apps/web/src/App.tsx:30` `<HashRouter>` |
| lib/api.ts fetch client | ✅ | `resolveApiBaseUrl` at `api.ts:279`; `credentials: "include"` at `:364` and `:423` — all exact |
| `test:plan-alignment` ✅ PASS | ✅ reproduced | Ran live during this audit |

### 1.2 Phase 4 table (7 open items)

| Item | Review's "Codebase Reality" | Result | Evidence |
| --- | --- | --- | --- |
| 4.1 BrowserRouter `[ ]` | HashRouter still runtime; rg → 0 runtime + 1 comment | ✅ | `App.tsx:30`; sole `BrowserRouter` mention is comment `LoginPage.tsx:27` ("B17 will switch to BrowserRouter") |
| 4.2 singlefile `[ ]` | vite.config.ts:6/:17; CSP unsafe-inline conditional on STATIC_DIR at app.ts:79 | ✅ | `vite.config.ts:6,17`; `app.ts:79–81` `scriptSrc: env.STATIC_DIR ? ["'self'","'unsafe-inline'"] : ["'self'"]` |
| 4.3 React Query `[ ]` | 0 hits in package.jsons; no useQuery/useMutation wrapper | ✅ | grep across root + 4 workspace package.jsons: 0; `useQuery\|useMutation\|QueryClient` in apps/web/src: only a doc comment (`lib/api.ts:26`) |
| 4.4 Hybrid Zustand `[ ]` | store owns votes/savedPosts/localPosts/localComments/notificationReadOverrides + theme/toasts; no QueryClient | ✅ (field is `savedPostIds`) | `store.ts:17–44` — all seven slices present; no QueryClient anywhere |
| 4.5 data/* imports `[ ]` | deterministic layer primary in Home/Community/Profile/Search | ✅ | grep confirms those four pages (+ PostPage, NotificationsPage) import `data/*` |
| 4.6 Optimistic UI `[ ]` | VoteControl displays baseScore + vote overlay; no onMutate rollback; api pessimistic, retry auth-only | ✅ | `VoteControl.tsx:28` `getVisibleScore(baseScore, vote)`; zero `onMutate` in apps/web/src; `tryRefreshOn401` opt-in in api.ts |
| 4.10 Infinite scroll `[ ]` | PAGE_SIZE=8 + rootMargin 400px + 650 ms latency; no cursor param | ✅ | `PostList.tsx:8` `PAGE_SIZE = 8`, `:23–26` `setTimeout(…, 650)`; `hooks/index.ts:45` `rootMargin: "400px"` |
| Note: 4.7/4.8/4.9 ticked | table shows them ✅ | ✅ | plan lines 82–84, all `[x]` with B18 annotations |

### 1.3 Phase 5 table (3 open items)

| Item | Review claim | Result | Evidence |
| --- | --- | --- | --- |
| 5.4 Sentry `[ ]` deferred indefinitely | rg sentry → 0 hits; pino + requestId sufficient | ✅ | 0 sentry references repo-wide; pino logger w/ redact paths authorization/cookie/password/accessToken/refreshToken at `app.ts:53–62`; `x-request-id` via `plugins/requestId.ts:20` |
| 5.5 Source maps `[ ]` depends on 5.4 | no sourcemap upload config | ✅ | 0 sourcemap references in vite.config/package.json/scripts |
| 5.8 OWASP/WCAG `[ ]` true gap | hardening.test.ts CSP/HSTS; Modal useFocusTrap; AppShell skip-link; MotionConfig reducedMotion; SKILL §8 44px; no ZAP/a11y report | ✅ | `routes/hardening.test.ts` asserts content-security-policy + strict-transport-security; `Modal.tsx:17` useFocusTrap; `AppShell.tsx:14` skip-link; `App.tsx:29` `MotionConfig reducedMotion="user"`; `reddit-clone_SKILL.md:396` "≥44×44px" inside §8 (starts :389); `ls docs \| grep -iE zap\|a11y\|owasp\|wcag` → none |

### 1.4 Cross-cutting analysis

| Dimension | Review verdict | Result | Evidence |
| --- | --- | --- | --- |
| Data source (ADR-001) | correctly deferred, no drift | ✅ | ADR-001 exists (plan :23,:161); `POSTS = generatePosts(320)` at `data/posts.ts:199` |
| State mgmt (ADR-105) | deferred, not a lie | ✅ | ADR-105 at plan :35,:163; store reality as §1.2 above |
| Routing/Build (ADR-106) | Target State (Pending B17) accurate | ✅ | ADR-106 at plan :164; heading `### 1. Target State (Pending B17 Execution)` at plan :20 verbatim |
| Search (ADR-109) | DONE, no gap | ✅ | `fts5.ts:27` `content='posts'`, triggers posts_ai/ad/au (:33,:38,:43), `bm25(posts_fts)` (:77), `searchPosts()` consumed by `routes/search.ts:33` |
| Observability (ADR-110) | Pino requestId variant DONE; OTel not wired | ✅ | redact list `app.ts:53–62`; x-request-id plugin; 0 opentelemetry/otel references |
| Definition of Done | 80% + ZAP aspirational, not CI-enforced | ✅ | DoD lists coverage >80% + ZAP (plan :296–297); server vitest thresholds all `0` with "Informational only" comment (`apps/server/vitest.config.ts:18–30`); `CLAUDE.md:493` "aspirational, not enforced"; gitleaks job present; `backupDb()` online API (`client.ts:96–110`, R13); docker-compose healthcheck (`docker-compose.yml:43`) |

### 1.5 Section 4 ("What Is NOT a Gap")

| Claim | Result | Evidence |
| --- | --- | --- |
| Path=/api/auth corrected (R11 F4); double-submit removed, Bearer+Strict (R11 F1) | ✅ | plan :207 and :216 verbatim |
| Docker COPY web/dist + STATIC_DIR closes LIVE-CRIT-3; _headers 841 B; start_production.sh unified | ✅ | `Dockerfile:74` COPY, `:91` ENV STATIC_DIR; `_headers` = exactly 841 bytes with CSP/HSTS/nosniff/XFO/RP/PP; script exports STATIC_DIR (:105) |
| client.ts WAL/busy_timeout=5000 live | ✅ | `client.ts:42–47` pragmas |
| safePostLoginPath rejects `//`, absolute URLs, `/\` | ✅ | `LoginPage.tsx:10–16` |
| skills/ tracked as intentional exception; verifier excludes `^skills/` | ⚠️ mechanism ✅, count ✗ | exclusion confirmed (`verify-gitignore-enforced.sh:33` `grep -v '^skills/'`); count wrong — see Finding D4 |
| ESLint 9 flat, Prettier omitted (R11 F9); migrations 0000+0001; voteService atomic; e2e smoke 9 + auth 9; playwright 4 variants; Dockerfile ≈4.4K | ✅ | `eslint.config.mjs` present, eslint ^9.39.5, 0 prettier refs; `migrations/0000_*` + `0001_add_performance_indexes.sql`; `voteService.ts:49` `db.transaction`; smoke 9/auth 9 counted; 4 `playwright*.config.ts`; Dockerfile 4435 B |

---

## 2. Discrepancies Found (7)

### D1 — Headline checkbox count understates (Minor, scoping)
**Review:** "10 checkboxes remain [ ] (7 in Phase 4 + 3 in Phase 5)".
**Reality:** the plan contains **15** literal `[ ]` — the 10 phase items *plus* five backlog
checkboxes B17/B19/B20/B21/B22 (`REMEDIATION_PLAN.md:267,269–272`). The 7+3 split for Phases 4–5
is correct; the headline omits the mirrored backlog items. Fix: "10 phase items (+5 mirrored
backlog checkboxes in §5)".

### D2 — B18 test arithmetic stale (Minor)
**Review:** "B18 = 64 TDD tests (AuthProvider 20 + api refresh 9 + LoginPage 10 + RegisterPage 11
+ Navbar 8 + RequireAuth 5 + api displayName 1)".
**Reality (authoritative vitest run):**

| File | Review | Actual | Delta |
| --- | --- | --- | --- |
| AuthProvider.test.tsx | 20 | **20** | — |
| api.test.ts refresh-and-retry subset | 9 | **9** ✅ (named tests at `api.test.ts:478–620`) | — |
| api.test.ts displayName subset | 1 | **1** ✅ (`:132`) | — |
| LoginPage.test.tsx | 10 | **13** | +3 (R15 state.from tests) |
| RegisterPage.test.tsx | 11 | **12** | +1 (R10 mismatch/regression swap) |
| Navbar.test.tsx | 8 | **9** | +1 (R10 min-w-0) |
| RequireAuth.test.tsx | 5 | **5** | — |

Same-subset sum with actuals = **69**, not 64. The breakdown reflects a pre-Round-10/15 snapshot.

### D3 — ci.yml job count wrong in one row (Minor, internally inconsistent)
**Review:** B23–B24 row says "ci.yml 3 jobs"; its own Phase 1–3 row says "gitleaks→test→build→e2e".
**Reality:** **4 jobs** — `security:` (:31), `test:` (:52), `build:` (:90), `e2e:` (:133) in
`.github/workflows/ci.yml`.

### D4 — skills/ tracked count off by 30 (Trivial)
**Review:** "skills/ 13,896 tracked". **Reality:** `git ls-files skills/ | wc -l` = **13,926**
(matches AGENTS.md Round 12 F4). The "intentional exception" characterization itself is correct.

### D5 — Banner citation imprecise (Trivial)
**Review:** "REMEDIATION_PLAN.md:6 banner: B17 / B19–B22 still deferred".
**Reality:** plan line 6 sits inside the Round-10 stack-alignment banner (REST+Zod/ADR tokens);
the explicit deferral statement is §1 line 20 ("These ADRs remain active until Phase B17
executes") plus the §5 backlog. Content exists; cited line is off.

### D6 — Round attribution ambiguity (Trivial)
**Review §4:** "R15 indexes + registerResponseSchema". Both artifacts are real and verified
(`migrations/0001_add_performance_indexes.sql`; `packages/shared/src/api/index.ts:66`
`registerResponseSchema`) but they landed in **Round 11** (F2/F3), not R15.

### D7 — Cosmetic nits (Trivial)
(a) "postgrase escape hatch" typo (§3 Search row) → Postgres;
(b) docker-compose.yml is 2064 B (~2.0K, review says 2.1K);
(c) `dist/index.html` "539 KB" unverifiable — dist/ absent from this checkout (gitignored);
(d) store field is `savedPostIds`, review wrote "savedPosts";
(e) "audit_report_2 F7 hybrid fallback" — the F7 label actually lives in
`docs/REMEDIATION_PLAN_ROUND_10.md:37` ("Loss of Offline Capability"); `audit_report_2.md`
contains no F7/hybrid text. This citation is inherited verbatim from the plan itself
(`REMEDIATION_PLAN.md:79`), so it is a pre-existing plan-side quirk, not a review-introduced error.

---

## 3. Conclusion

The review document is **accurate where it matters**: all ten open phase items were re-confirmed
as genuinely open against current code; every "correctly deferred" classification holds; every
absence proof (react-query, sentry, otel, sourcemap, ZAP/a11y reports) reproduces cleanly; all
line-number citations except the banner reference resolve exactly; and all four quality gates pass
live at HEAD. The seven discrepancies are confined to summary statistics and citations
(D1–D7) and require no change to any conclusion, severity rating, or sequencing recommendation.

**Recommended follow-ups (doc-only, no code):**
1. Patch D1–D4 in `docs/REMEDIATION_PLAN_review.md` (four numeric fixes).
2. Optionally fix D5–D7 citations/typos in the same pass.
3. Consider correcting the plan-side "(audit_report_2 F7)" pointer to
   "(audit_report_2 F7, catalogued in REMEDIATION_PLAN_ROUND_10.md)" — inherited quirk.

*End of audit — read-only validation; no codebase files modified.*
