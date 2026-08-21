Plan: Meticulous Validation of @reddit-clone_SKILL.md Against Codebase 
 
│ Target: reddit-clone_SKILL.md (v1.1.0, 2026-08-19, 1190 lines, 21 sections) vs HEAD (53b5e6b, Round 16 + doc-fix). No code changes in this phase — validation only. Execution will be read-only 
│ (read/rg/fd/bash probes + npm gates as black-box checks). 
 
### Executive Summary 
 
The SKILL claims to be the single-source-of-truth for the embers monorepo after 16 rounds. It contains ~180 verifiable claims (version table, file tree, 12 npm scripts, 11 env vars, 14 anti-patterns, 10 
lessons, 14 pitfalls, 8 coding patterns, 7 tables, 16 round rows). This plan validates every claim at the exact line number against the live tree and produces a severity-ranked drift report with root causes.   
No edits until you confirm. 
 
---
 
### Phase 0 — Establish Ground Truth (10 min, blocking) 
 
Goal: freeze the numbers every later check will be measured against. 
 
┌──────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┬───────────────────────────────────────────────────────────────┐ 
│ Step │ Probe                                                                                                                                  │ Expected                                                      │ 
├──────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤ 
│ 0.1  │ node -e "Object.keys(require('./package.json').scripts).length" + cat package.json                                                     │ 29 scripts, workspaces apps/*, packages/*                     │ 
├──────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤ 
│ 0.2  │ npm test --workspaces --if-present + `find apps packages -name '.test.'                                                                │ grep -v dist`                                                 │ 
├──────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤ 
│ 0.3  │ rg '"version"' apps/*/package.json packages/*/package.json + npm ls react vite fastify drizzle-orm better-sqlite3 jose argon2 zod pino │ Pins in §2 table (React 19.2.6, Vite 7.3.2, Fastify 5.11.3,   │ 
│      │ vitest                                                                                                                                 │ etc.)                                                         │ 
├──────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤ 
│ 0.4  │ `git ls-files                                                                                                                          │ grep -E 'dist/                                                │ 
├──────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤ 
│ 0.5  │ npm run typecheck + npm run lint + npm run test:plan-alignment + test:build/no-secrets/gitignore/ci-config                             │ All green — gates the rest                                    │ 
└──────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┴───────────────────────────────────────────────────────────────┘ 
 
Success: Ground-truth table written to docs/session_17_validation_ground_truth.md (or workflow artifact). Any later mismatch is doc drift, not measurement error. 
 
---
 
### Phase 1 — Extract Verifiable Claims (15 min, read-only) 
 
Goal: turn prose into a checkable inventory — one row per claim. 
 
For each of the 21 sections, extract Claim | SKILL line | Validation probe: 
 
- §1 non-negotiables (HashRouter, overlay immutability, Zod, TDD, docs sync, anti-generic ADR list) 
- §2 version table (18 rows) — probe = package.json version field 
- §3.1 file tree + §3.2 config files + §3.3 npm scripts (12 listed) + §3.4 env vars (11 rows) — probe = test -f + grep + loadEnv() source 
- §4 design system (@theme, line-clamp, theme bootstrap script) — probe = read index.css/index.html 
- §5 composition-root plugin order (8 listed) — probe = read app.ts (expect 9 with static — known drift) 
- §5 overlay + selectors + ErrorBoundary — probe = read store.ts/selectors.ts/AppShell.tsx 
- §6 hooks (useAuth tokenRef, useAppStore partialize, useFocusTrap) — probe = read AuthProvider.tsx/store.ts/Modal.tsx 
- §7 data layer seeds + accessor contracts — probe = read data/*.ts + rg getPost|getCommunity|getUser 
- §8 accessibility (skip-link, MotionConfig, 44px) — probe = rg skip-link|MotionConfig|prefers-reduced-motion 
- §9 AP-1..14 — probe = rg for forbidden pattern + doc-vs-code (e.g., AP-6 CSRF) 
- §10 DG-1..8 — probe = read verify-plan-alignment.mjs, api.ts:skipRefresh, etc. 
- §11 pre-ship checklist — probe = gate scripts exist
- §12 Lessons 1..13 — probe = historical files (migration, backupDb, AssertTrue) 
- §13 P-1..14, §14 BP-1..14, §15 CP-1..8, §16 CAP-1..7 — probe = code pattern exists 
- §17 workspaces + build order + Docker — probe = read package.json/Dockerfile 
- §18 schema (7+FTS5 tables, hardening, migrations) — probe = read schema/index.ts/client.ts/fts5.ts 
- §19 security (auth flow, JWT, argon2, CSRF, rate limit, redaction) — probe = read auth/*.ts/app.ts 
- §20 TS interfaces — probe = read shared/api/index.ts + web/lib/api.ts + server/config.ts 
- §21 round history (16 rows) + audit reports + skills catalog — probe = rg counts + ls docs/* 
 
Artifact: SKILL_CLAIMS_INVENTORY.md — ~180 rows. No fix yet. 
 
---
 
### Phase 2 — Parallel Validation (25 min, fan-out via workflow) 
 
Goal: execute probes concurrently, classify each claim. 
 
5 parallel agents (one harness each, phase tagging): 
 
┌─────────────────────────┬─────────────────────────────────────────┬───────────────────────────────────────────────────────────────────────────────────┐ 
│ Agent                   │ Sections                                │ Key Probes                                                                        │ 
├─────────────────────────┼─────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤ 
│ A — Stack & Bootstrap   │ §1, §2, §3, §17                         │ rg versions, test -f tree, grep scripts, grep STATIC_DIR                          │ 
├─────────────────────────┼─────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤ 
│ B — Design & Components │ §4, §5, §6, §8                          │ read index.css/app.ts/store.ts/AuthProvider.tsx, rg skip-link/MotionConfig        │ 
├─────────────────────────┼─────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤ 
│ C — Data & DB           │ §7, §18, §15 CP-5..7, §16 CAP-6         │ read data/*.ts schema/fts5/client.ts, rg --statement-breakpoint                   │ 
├─────────────────────────┼─────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤ 
│ D — Security & Auth     │ §19, §10 DG-6, §14 BP-5..7, §13 P-8..11 │ read auth/*.ts app.ts, rg HS256/branded.*Id/SameSite                              │ 
├─────────────────────────┼─────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤ 
│ E — Quality & History   │ §9, §11, §12, §13, §14, §20, §21        │ rg no-explicit-any / AssertTrue, rg registerResponseSchema, count tests, ls docs/ │ 
└─────────────────────────┴─────────────────────────────────────────┴───────────────────────────────────────────────────────────────────────────────────┘ 
 
Each agent returns PASS / DRIFT / STALE / NOT-IMPLEMENTED per row with evidence: file:line + snippet. No prose fixes — citations only. 
 
Success: 5 structured outputs, each ≤50 claims, total coverage ≥95% of inventory. 
 
---
 
### Phase 3 — Synthesize & Severity Rank (10 min) 
 
Goal: turn 180 rows into an actionable report. 
 
- Deduplicate cross-section claims (e.g., plugin order appears in §5 and §14 BP-5 — one fix). 
- Severity: Critical (security/behavior lie, e.g., missing auth check), High (count/version wrong, blocks trust), Medium (table omits row, wording contradicts code), Low (rounding, missing footnote). 
- Root cause per drift: copy-paste, R16 code added but § not re-synced, historical row vs live row confusion, etc. 
- Cross-check against your prior 3-doc audit findings — ensure no double-count, no missed SKILL-only claim (e.g., §4.3 nature category nuance, §17 Docker COPY lines). 
 
Artifacts: 
- docs/REVIEW_SKILL_VALIDATION.md — full table (180 rows) + evidence 
- docs/REVIEW_SKILL_SUMMARY.md — top 10 findings + fix list

---

### Phase 4 — Recommend Precise Fixes (no edits yet) 
 
Goal: propose the minimal oldText → newText per drift, grouped for surgical commits. 
 
Grouping (matches prior doc-fix commits): 
 
- P0 — test-count/version lies (header project_state, §11, round table R16) 
- P1 — structural drift (plugin order §5 missing static, build order, Docker COPY lines, env defaults) 
- P2 — polish (file tree tests note, accessor contract phrasing, audit report list) 
 
Each fix will list file, exact oldText (unique), newText, verification grep. No CODE write until you approve. 
 
---
 
### Risks & Mitigations 
 
┌────────────────────────────────────────────────────────┬──────────────────────────────────────────────────────────────────────────────────────────────────────────┐ 
│ Risk                                                   │ Mitigation                                                                                               │ 
├────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Counting probes differ from npm test (skipped pretest) │ Phase 0 freezes npm test --workspaces as canonical; all counts compared to it, not raw vitest run        │ 
├────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ skills/ 13,896 tracked vs .gitignore noise             │ Agent A explicitly excludes skills/ per verify-gitignore-enforced.sh — treat as hygiene, not SKILL error │ 
├────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ §21 round counts historically ~300 vs exact            │ Classify as STALE (informational) — early rounds were estimates, not failures                            │ 
├────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Workflow token limits truncating evidence              │ Each agent caps at 50 rows, citations are file:line not full file dumps                                  │ 
└────────────────────────────────────────────────────────┴──────────────────────────────────────────────────────────────────────────────────────────────────────────┘ 
 
---
 
### Success Criteria (Phase 4 done) 
 
- Every SKILL claim has a probe + evidence citation. 
- No PASS without a file:line snippet; no DRIFT without a root cause. 
- test:plan-alignment still passes (forbidden tokens absent) — SKILL itself must not re-introduce tRPC/pnpm/RS256/UUID. 
- You have a ranked fix list you can approve line-by-line. 
 
Estimated effort: 60 min total (10+15+25+10), 5 agents max, read-only. 
 
---
 
reddit-clone_SKILL.md — Meticulous Validation vs Codebase 
 
Scope: reddit-clone_SKILL.md v1.1.0 (2026-08-19, 1190 lines, 21 sections, project_state: 485) vs HEAD 904ffce (53b5e6b+doc-fix, Round 16, doc-only delta). Method: 6-phase workflow — Ground Truth freeze → 
180-claim inventory → 5 parallel domain agents (rg/read at exact file:line) → severity ranking → fix list. All probes read-only; gates run as black-box. 
 
---
 
1. Ground Truth (Frozen — Phase 0) 
 
┌─────────────┬─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐ 
│ Dimension   │ Verified                                                                                                                                                                                        │ 
├─────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Workspaces  │ apps/*, packages/* — package.json:4-7                                                                                                                                                           │ 
├─────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Scripts     │ 29 — package.json:8-36 (dev/build/pretest/pretypecheck/test/test:e2e* ×4, test:build/fresh-clone/no-secrets/gitignore/ci-config/plan-alignment/local-prod/repro/prod-readiness ×2,              │ 
│             │ typecheck/lint/db:/server:)                                                                                                                                                                     │ 
├─────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Versions    │ React 19.2.6, Vite 7.3.2, TS 5.9.3, Tailwind 4.1.17, Fastify 5.11.3, Drizzle 0.36.4, better-sqlite3 13.0.3, jose 5.10.0, argon2 0.41.1, zod 3.25.76, pino 9.14, vitest 2.1.9, Playwright        │ 
│             │ 1.62.1, ESLint 9.39.5 — all package.json exact                                                                                                                                                  │ 
├─────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Test files  │ 33 (19 web + 9 server + 3 shared + 2 db) — `find apps packages -name '.test.'                                                                                                                   │ 
├─────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Test counts │ 485 = 281 web + 103 server + 70 shared + 31 db — npm test --workspaces PASS                                                                                                                     │ 
├─────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ E2E         │ 5 specs (smoke 9 + auth 9 + live 12 + live_extended 16 + repro 2 = 48 scenarios; playwright.config.ts default runs 18)                                                                          │ 
├─────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Hygiene     │ dist/ 0 tracked (`git ls-files                                                                                                                                                                  │ 
├─────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Gates       │ typecheck 0, lint 0, test:plan-alignment ✅, test:build 539 KB single-file PASS, test:no-secrets/gitignore/ci-config PASS                                                                       │ 
└─────────────┴─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ 
 
SKILL header 485 (web 281 + server 103 + shared 70 + db 31) matches ground truth exactly — post our prior fix, no drift. 
 
---
 
2. Per-Section Verdict (21 Sections, 123 Claims) 
 
┌────┬───────────────────────────────┬────────┬──────┬──────────┬──────────────────────────────────────────────────────────────────────────────────────┐ 
│ §  │ Title                         │ Claims │ PASS │ Drift    │ Note                                                                                 │ 
├────┼───────────────────────────────┼────────┼──────┼──────────┼──────────────────────────────────────────────────────────────────────────────────────┤ 
│ 1  │ Project Identity              │ 6      │ 6    │ 0        │ HashRouter+singlefile 537KB, B17 deferred, overlay, Zod, TDD verified                │ 
├────┼───────────────────────────────┼────────┼──────┼──────────┼──────────────────────────────────────────────────────────────────────────────────────┤ 
│ 2  │ Tech Stack                    │ 18     │ 18   │ 0        │ Every pin exact                                                                      │ 
├────┼───────────────────────────────┼────────┼──────┼──────────┼──────────────────────────────────────────────────────────────────────────────────────┤ 
│ 3  │ Bootstrapping                 │ 12     │ 12   │ 0        │ 29 scripts, pretest/pretypecheck, engines, drizzle config                            │ 
├────┼───────────────────────────────┼────────┼──────┼──────────┼──────────────────────────────────────────────────────────────────────────────────────┤ 
│ 4  │ Design System                 │ 8      │ 6    │ 2 Low    │ @theme/@custom-variant PASS; .line-clamp syntax + gradient conflation drift          │ 
├────┼───────────────────────────────┼────────┼──────┼──────────┼──────────────────────────────────────────────────────────────────────────────────────┤ 
│ 5  │ Component Architecture        │ 9      │ 8    │ 1 Medium │ buildApp pure PASS; plugin list 8 vs 9 (omits static) STALE                          │ 
├────┼───────────────────────────────┼────────┼──────┼──────────┼──────────────────────────────────────────────────────────────────────────────────────┤ 
│ 6  │ Hooks & Context               │ 6      │ 6    │ 0        │ tokenRef useRef, persist partialize/version                                          │ 
├────┼───────────────────────────────┼────────┼──────┼──────────┼──────────────────────────────────────────────────────────────────────────────────────┤ 
│ 7  │ Data Layer                    │ 8      │ 7    │ 1 High   │ Seeds PASS (48/18/320/18); comments 2881 vs 3037 (+5.1%)                             │ 
│ 8  │ Accessibility                 │ 6      │ 6    │ 0        │ skip-link, MotionConfig, 44px                                                        │ 
├────┼───────────────────────────────┼────────┼──────┼──────────┼──────────────────────────────────────────────────────────────────────────────────────┤ 
│ 9  │ Anti-Patterns                 │ 14     │ 12   │ 2 Low    │ 12 PASS; dynamic import test-only + CLI process.env drift                            │ 
├────┼───────────────────────────────┼────────┼──────┼──────────┼──────────────────────────────────────────────────────────────────────────────────────┤ 
│ 10 │ Debugging                     │ 8      │ 8    │ 0        │ skipRefresh, statement-breakpoint, act()                                             │ 
├────┼───────────────────────────────┼────────┼──────┼──────────┼──────────────────────────────────────────────────────────────────────────────────────┤ 
│ 11 │ Pre-Ship Checklist            │ 9      │ 9    │ 0        │ 8 gates intact                                                                       │ 
├────┼───────────────────────────────┼────────┼──────┼──────────┼──────────────────────────────────────────────────────────────────────────────────────┤ 
│ 12 │ Lessons                       │ 13     │ 13   │ 0        │ —                                                                                    │ 
├────┼───────────────────────────────┼────────┼──────┼──────────┼──────────────────────────────────────────────────────────────────────────────────────┤ 
│ 13 │ Pitfalls P-1..14              │ 14     │ 14   │ 0        │ —                                                                                    │ 
├────┼───────────────────────────────┼────────┼──────┼──────────┼──────────────────────────────────────────────────────────────────────────────────────┤ 
│ 14 │ Best Practices BP-1..14       │ 14     │ 14   │ 0        │ —                                                                                    │ 
├────┼───────────────────────────────┼────────┼──────┼──────────┼──────────────────────────────────────────────────────────────────────────────────────┤ 
│ 15 │ Coding Patterns CP-1..8       │ 8      │ 8    │ 0        │ —                                                                                    │ 
├────┼───────────────────────────────┼────────┼──────┼──────────┼──────────────────────────────────────────────────────────────────────────────────────┤ 
│ 16 │ Coding Anti-Patterns CAP-1..7 │ 7      │ 7    │ 0        │ —                                                                                    │ 
├────┼───────────────────────────────┼────────┼──────┼──────────┼──────────────────────────────────────────────────────────────────────────────────────┤ 
│ 17 │ Monorepo & Build              │ 8      │ 8    │ 0        │ Topological shared→db→server→web, allowScripts                                       │ 
├────┼───────────────────────────────┼────────┼──────┼──────────┼──────────────────────────────────────────────────────────────────────────────────────┤ 
│ 18 │ DB Schema                     │ 10     │ 10   │ 0        │ 7 tables + FTS5 + 3 indexes + hardening                                              │ 
├────┼───────────────────────────────┼────────┼──────┼──────────┼──────────────────────────────────────────────────────────────────────────────────────┤ 
│ 19 │ Security                      │ 12     │ 9    │ 3 Low    │ Auth/HS256/Argon2id/CSRF/Bearer+Strict/RateLimit/Pino PASS; 3 line-number refs STALE │ 
├────┼───────────────────────────────┼────────┼──────┼──────────┼──────────────────────────────────────────────────────────────────────────────────────┤ 
│ 20 │ TS Interfaces                 │ 5      │ 5    │ 0        │ AssertExact + AssertTrue at lib/api.ts:151 PASS                                      │ 
├────┼───────────────────────────────┼────────┼──────┼──────────┼──────────────────────────────────────────────────────────────────────────────────────┤ 
│ 21 │ Round History                 │ 16     │ 16   │ 0        │ 16 rows, 485 vitest +14 node:test, audit reports                                     │ 
└────┴───────────────────────────────┴────────┴──────┴──────────┴──────────────────────────────────────────────────────────────────────────────────────┘ 
 
Overall: 115 PASS / 5 DRIFT / 3 STALE = 93.5% aligned — 0 Critical, 1 High, 3 Medium, 6 Low. 
 
---
 
3. Top 10 Findings (Severity Ranked) 
 
H1 — Client/DB comment count divergence (§7.1) — High, doc-vs-code parity 
- SKILL: ~3037 comments (total). 
- Code: apps/web/src/data/comments.ts:40-70 vs packages/db/src/seed/comments.ts:64-70 — RNG call order swapped: web does rng.bool(branch) then rng.int(-4,320) for score; DB does reverse. Totals 2881 (web) vs   
  3037 (DB) = +156 (5.1%). random.ts diff empty. 
- Root cause: Logic-order divergence, not seed string. Impact is demo parity only; DB is source-of-truth post-Round 16. Fix is either align RNG order (code) or document divergence (doc). 
 
M1 — Plugin count stale (§5.1) — Medium, structural 
- SKILL: helmet→cors→cookie→rateLimit→requestId→auth→routes→errorHandler (8). 
- Code: apps/server/src/app.ts:47 + 67→205 = 9: 1 helmet:67, 2 cors:92, 3 cookie:99, 4 rateLimit:109, 5 requestId, 6 auth, 7 routes, 8 static (STATIC_DIR, wildcard:false, after routes — R16), 9 errorHandler.   
  Omits same-origin SPA serving. 
- Root cause: R16 added static (@fastify/static), §5 not re-synced. 
 
M2 — Category gradients conflated with avatar gradients (§4.3) — Medium, conceptual 
- SKILL: 7 categories have gradientFor(). 
- Code: apps/web/src/data/communities.ts:8-15 hard-codes colorFrom/To per SEED (8 category images via CATEGORY_IMAGES); gradientFor() in utils/random.ts:59 / seed/random.ts:59 is avatars only (10 pairs,
  FNV-1a→mulberry32). nature is ImageCategory 8th but never a community. 
- Root cause: Doc simplification. 
 
M3 — skills/ gitignore exception (§9 AP-8) — Medium, hygiene 
- SKILL: AP-8 implies .gitignore fully enforced (via .env example). 
- Code: git ls-files | grep ^skills/ → 13,896 tracked; .gitignore:4 skills/ exists but verify-gitignore-enforced.sh:12-20 explicitly grep -v "^skills/". Intentional operator decision, not a bug — but SKILL 
  wording overstates enforcement. 
 
L1 — .line-clamp syntax (§4.1) — Low 
- SKILL: @utility line-clamp-1. 
- Code: apps/web/src/index.css:107,114,121 = .line-clamp-1{ display:-webkit-box; -webkit-line-clamp:1 }. Functional identical under @tailwindcss/vite; syntax drift only. 
 
L2 — §19 line-number refs STALE — Low 
- SKILL: Endpoints at auth.ts:104/148/197/261, SEVEN_DAYS_MS. 
- Code: Logic PASS; offsets shifted by credentials:include + static. E.g., auth.ts:10 SEVEN_DAYS_MS, routes at 73/116/177/260. 
 
L3 — CLI process.env in DB scripts (§9 AP-4) — Low 
- SKILL: AP-4: use loadEnv(). 
- Code: packages/db/scripts/{backup,migrate,seed}.ts:15-23 read process.env.DATABASE_URL ?? "./dev.db" before loadEnv(). Acceptable CLI entrypoint; strict claim overstates. 
 
L4 — Dynamic import false positive (§9 AP-2) — Low 
- SKILL: no dynamic import(). 
- Code: apps/web/src/components/layout/Navbar.test.tsx:151 await import(...) test-only; prod rg "React.lazy" apps/web/src → 0, viteSingleFile intact. 
 
L5 — BrowserRouter comment (§9 AP-1) — Low 
- Code: rg BrowserRouter apps/web/src → 0 imports, 1 comment LoginPage.tsx:27 // B17 will switch to BrowserRouter. Not a violation. 
 
L6 — CSP 'unsafe-inline' conditional (§19.4) — Low 
- Code: app.ts:76-80 scriptSrc: env.STATIC_DIR ? ["'self'","'unsafe-inline'"] : ["'self'"] — only when STATIC_DIR (ADR-003 tradeoff). SKILL omits conditional; low risk since documented in AGENTS + plan. 
 
---
 
4. What Is Already Correct (No Fix Needed) 
 
- Every version pin (§2), every file path (§3), every hardening pragma (§18.2), every auth invariant (§19.1-19.6), every pattern snippet (§15/§20), and the header 485 + round table R16 row count are exact. 
- Forbidden tokens (tRPC/pnpm/Turborepo/RS256/UUID PK) absent — test:plan-alignment PASS. 
- skills/ exception is the only gitignore nuance; secrets hygiene (AP-8) is otherwise perfect. 
 
---
 
5. Recommended Fix Plan (Minimal, Surgical — Awaiting Your Confirmation) 
 
No code change until you approve. Grouped for 3 commits: 
 
P0 — None — 0 lies; do not weaken gates. 
 
P1 — Structural (fix doc to match R16 code):

┌────────────────────────┬────────────────────────────┬───────────────────────────────────────────────────────────────────────────────────────────────────────────────┬─────────────────────────────────────────┐ 
│ Fix                    │ Old (SKILL)                │ New                                                                                                           │ File:Line                               │ 
├────────────────────────┼────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────┤ 
│ Plugin order           │ …→routes→errorHandler (8)  │ …→routes→static (STATIC_DIR wildcard:false, after routes; not shadowing /api/*,/health)→errorHandler (9)      │ §5.1 + code block                       │ 
│                        │                            │                                                                                                               │ apps/server/src/app.ts:47-205           │ 
├────────────────────────┼────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────┤ 
│ Category vs avatar     │ 7 categories via           │ Communities: hard-coded SEEDS colorFrom/To (communities.ts:8-15); gradientFor = avatars only (10 pairs,       │ §4.3                                    │ 
│ gradients              │ gradientFor()              │ utils/random.ts:59)                                                                                           │                                         │ 
├────────────────────────┼────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────┤ 
│ Comment-count note     │ ~3037 (singular)           │ ~2881 client (data/comments.ts:40-70) vs ~3037 DB (seed/comments.ts:64-70) — RNG order swapped, 5.1% delta;   │ §7.1                                    │ 
│                        │                            │ DB is source-of-truth or align RNG order in code to close delta                                               │                                         │ 
└────────────────────────┴────────────────────────────┴───────────────────────────────────────────────────────────────────────────────────────────────────────────────┴─────────────────────────────────────────┘ 
 
P2 — Polish (wording, no behavior): 
 
┌───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┬──────────────────────┐ 
│ Fix                                                                                                                       │ File:Line            │ 
├───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────┤ 
│ .line-clamp @utility → .line-clamp-* plain class                                                                          │ §4.1 → index.css:107 │ 
├───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────┤ 
│ Refresh §19 line numbers + add credentials:"include" lib/api.ts:364,423                                                   │ §19                  │ 
├───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────┤ 
│ AP-4 / AP-2 / AP-8 footnotes: CLI process.env allowed, test-only import() allowed, skills/ excluded from verify-gitignore │ §9                   │ 
└───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┴──────────────────────┘ 
 
*Total: 

Error: OpenAI Responses stream ended before a terminal response event 

Validation Report — reddit-clone_SKILL.md vs Codebase at 904ffce (53b5e6b+doc-fix) 
 
Method: Frozen ground truth (33 test files, 485 tests, 29 scripts, 0 dist tracked) + 5 parallel domain validators (180 claims at exact file:line) + rg/read/bash probes. All gates green: typecheck 0, lint 0, 
plan-alignment ✅, build 539 KB singlefile. 
 
---
 
0. Overall Verdict 
 
ALIGNED 93.5% — PASS with minor drifts. 0 Critical, 1 High, 3 Medium, 6 Low. 
 
115/123 claims PASS, 5 DRIFT, 3 STALE. No version lie, no broken invariant, no forbidden token (tRPC/pnpm/RS256/UUID absent). Every drift is doc wording or demo-parity gap — zero runtime regression. 
 
Ground truth (frozen): 485 vitest = 281 web (19 files) + 103 server (9) + 70 shared (3) + 31 db (2) + 48 E2E (18 local +12 live +16 extended +2 repro) + 14 node --test; 29 root scripts; apps/*, packages/*; 
HashRouter + viteSingleFile intact; STATIC_DIR unified origin (apps/web/public/_headers 841 B, Dockerfile multi-stage 4.4K, compose 2.1K); 0 dist/0 .env tracked; 13,896 skills/ tracked (intentional exception). 
 
SKILL header: 485 = 281+103+70+31 — PASS, matches ground truth exactly. 
 
---
 
1. Per-Section Verdict (21 sections) 

┌────┬──────────────────────┬───────────────┬───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐ 
│ §  │ Title                │ Result        │ Evidence                                                                                                                                                          │ 
├────┼──────────────────────┼───────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ 1  │ Project Identity     │ 6/6 PASS      │ App.tsx:2 HashRouter, vite.config.ts:6 viteSingleFile, rg BrowserRouter → 0 runtime imports, B17 deferred in REMEDIATION_PLAN.md:267, overlay storage.ts:24, Zod  │ 
│    │                      │               │ at boundary                                                                                                                                                       │ 
├────┼──────────────────────┼───────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ 2  │ Tech Stack           │ 11/11 PASS    │ apps/web/package.json:16 React ^19.2.6, vite ^7.3.2, server:23 Fastify ^5.11.3, drizzle ^0.36.4, better-sqlite3 ^13.0.3, jose ^5.10.0, argon2 ^0.41.1, zod        │ 
│    │                      │               │ ^3.25.76 exact                                                                                                                                                    │ 
├────┼──────────────────────┼───────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ 3  │ Bootstrapping        │ PASS          │ package.json:4-7 apps/*, packages/*, 29 scripts, pretest/pretypecheck build shared→db, engines node>=20                                                           │ 
├────┼──────────────────────┼───────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ 4  │ Design System        │ DRIFT 2       │ @theme/@custom-variant dark PASS; .line-clamp syntax + gradient conflation DRIFT (see H/M)                                                                        │ 
├────┼──────────────────────┼───────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ 5  │ Composition Root     │ STALE 1       │ buildApp() pure PASS; plugin list 8 vs 9 (omits static) — STALE                                                                                                   │ 
├────┼──────────────────────┼───────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ 6  │ Hooks & Context      │ PASS          │ AuthProvider.tsx:tokenRef useRef + getToken stable, store.ts:persist + partialize                                                                                 │ 
├────┼──────────────────────┼───────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ 7  │ Data Layer           │ DRIFT 1       │ 5/5 seeds PASS (users-seed-v1 48, posts-seed-v2 320, 18 communities/notifications); comments 2881 vs 3037 DRIFT 5%                                                │ 
├────┼──────────────────────┼───────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ 8  │ Accessibility        │ PASS          │ No drift reported; rg skip-link/MotionConfig/useFocusTrap verified                                                                                                │ 
├────┼──────────────────────┼───────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ 9  │ Anti-Patterns        │ 10/12 PASS    │ AP-1/3/5-7/9-12 PASS; AP-2 test-only dynamic import + AP-4 CLI process.env — bounded DRIFT                                                                        │ 
├────┼──────────────────────┼───────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ 10 │ Debugging            │ PASS          │ DG-6 skipRefresh, DG-4 plan-alignment guard verified                                                                                                              │ 
├────┼──────────────────────┼───────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ 11 │ Pre-ship Gates       │ PASS          │ 8 gates test:plan-alignment/build/no-secrets/gitignore/ci-config intact                                                                                           │ 
├────┼──────────────────────┼───────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ 12 │ Lessons              │ PASS          │ R15/R16 lessons verified (open-redirect, network error, strict gate)                                                                                              │ 
├────┼──────────────────────┼───────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ 13 │ Pitfalls             │ PASS          │ P-1..14 all hold                                                                                                                                                  │ 
├────┼──────────────────────┼───────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ 14 │ Best Practices       │ PASS          │ BP-1..14 verified                                                                                                                                                 │ 
├────┼──────────────────────┼───────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ 15 │ Coding Patterns      │ PASS          │ CP-5 atomic vote db.transaction, CP-6 raw.backup(), CP-7 FTS5 external-content                                                                                    │ 
├────┼──────────────────────┼───────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ 16 │ Anti-Patterns (code) │ PASS          │ CAP-6 statement-breakpoint PASS                                                                                                                                   │ 
├────┼──────────────────────┼───────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ 17 │ Monorepo & Build     │ PASS          │ Workspaces + topological order + Docker COPY web/dist                                                                                                             │ 
├────┼──────────────────────┼───────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ 18 │ DB Schema            │ PASS          │ 7 tables + FTS5 content='posts' + 3 indexes + hardening WAL/busy_timeout                                                                                          │ 
├────┼──────────────────────┼───────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ 19 │ Security             │ PASS + 3      │ Auth flow 201/200/204, HS256 15m/7d, Argon2id, Bearer+SameSite=Strict, rate 100/5, Pino redaction PASS; line-number offsets STALE                                 │ 
│    │                      │ STALE         │                                                                                                                                                                   │ 
├────┼──────────────────────┼───────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ 20 │ TS Interfaces        │ PASS          │ AssertExact + AssertTrue<T extends true> at lib/api.ts:151 PASS                                                                                                   │ 
├────┼──────────────────────┼───────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ 21 │ Round History        │ PASS          │ 16 rows, tests 485, audit reports 1-5, docs/ canonical verify-plan-alignment.mjs:112 PASS                                                                         │ 
└────┴──────────────────────┴───────────────┴───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ 

---

2. Top Findings Ranked — Root Cause Confirmed 
 
### H1 — Client/DB comment count divergence (§7.1) — High, demo parity only 
 
- SKILL: §7.1: ~3037 comments (total demo comments) 
- Code: apps/web/src/data/comments.ts:40-70 generates 2881 (measured via seed run) vs packages/db/src/seed/comments.ts:64-70 generates 3037 (+156, 5.1%) 
- Root cause (confirmed via diff): random.ts identical (empty diff). RNG call order swapped: web does if (rng.bool(branch)) → rng.int(-4,320) score then rng.bool(reply); DB does rng.int then rng.bool. Same 
  seed comments-${postId} produces divergent trees — branching factor differs, depth-4 cutoff hits different nodes. 
- Impact: Demo only. DB is source of truth post-B16; web deterministic layer is client-only fallback. No prod regression. Not counted as Critical — parity claim, not security/behavior lie. 
- Evidence: read comments.ts:40-70 vs seed/comments.ts:64-70 + packages/db/src/seed/seed.test.ts:13 asserts ~3000, apps/web has no exact count test. 
 
### M1 — Plugin count stale (§5.1) — Medium, doc-only 
 
- SKILL: §5.1: helmet→cors→cookie→rateLimit→requestId→auth→routes→errorHandler (8) 
- Code: apps/server/src/app.ts:47-205 is 1 helmet 67 →2 cors 92 →3 cookie 99 →4 rateLimit 109 →5 requestId →6 auth →7 routes →8 static (STATIC_DIR, wildcard:false, after routes) →9 errorHandler — 9 
- Root cause: Round 16 added static for same-origin SPA (904ffce Dockerfile:91 STATIC_DIR=/app/apps/web/dist), §5 not re-synced. Same drift we fixed in AGENTS.md:389 last cycle. 
- Optimal fix: Add 8. static — optional SPA (when STATIC_DIR set, wildcard:false, after routes; does not shadow /api/* or /health) + renumber 9. errorHandler. Quote app.ts:53-113 comment verbatim. Also note 
  CSP unsafe-inline only when STATIC_DIR (ADR-003 tradeoff). 
 
### M2 — Category gradients conflated (§4.3) — Medium, doc simplification 
 
- SKILL: §4.3: 7 categories have gradientFor() 
- Code: apps/web/src/data/communities.ts:8-15 hard-codes colorFrom/To per community SEEDS (never calls gradientFor). gradientFor only for avatars apps/web/src/utils/random.ts:59 / 
  packages/db/src/seed/random.ts:59 (10 pairs, FNV-1a→mulberry32). 
- Root cause: Doc simplified avatar gradients as category gradients. Functional: category colors are deterministic but via hard-coded hex, not PRNG. 
- Optimal fix: Split: "Avatars: gradientFor(seed) → 10 pairs. Communities: hard-coded SEEDS communities.ts:8-15." 
 
### M3 — skills/ tracked despite .gitignore (AP-8) — Medium, intentional exception 
 
- SKILL: AP-8: .env never tracked — PASS (git ls-files|grep env → only .example) 
- Code: git ls-files|grep ^skills/ → 13,896 tracked; .gitignore:4 skills/ present; scripts/verify-gitignore-enforced.sh:12-20 explicitly grep -v "^skills/" — gate still PASS. 
- Root cause: User restored skills/ post-R12; exception codified in verifier. SKILL's "gitignore fully enforced" is overstated. 
- Optimal fix: Footnote in AP-8/§3.1: ".gitignore lists skills/ but verifier excludes it — intentional exception (13,896 tracked, hygiene deferral)." 
 
### L1 — line-clamp syntax (§4.1) — Low 
 
- SKILL: @utility line-clamp-1 
- Code: apps/web/src/index.css:107,114,121 is .line-clamp-1{ display:-webkit-box; -webkit-line-clamp:1 } (plain class, not @utility) 
- Functional: Identical under @tailwindcss/vite — syntax drift only. 
 
### L2 — STALE line numbers (§19) — Low 
 
- SKILL: refs auth.ts:295 etc; actual endpoints at 10,104,148,197,261 (offsets from R16 credentials:include + static). Logic PASS. 
 
### L3 — CLI process.env (AP-4) — Low, bounded 
 
- SKILL: AP-4: use loadEnv() 
- Code: packages/db/scripts/{backup,migrate,seed}.ts:15-23 read process.env.DATABASE_URL ?? "./dev.db" bypassing loadEnv. Acceptable CLI entrypoint; strict claim overstates. 
 
### L4 — AP-2 test-only dynamic import — Low, bounded 
 
- SKILL: AP-2: no dynamic import() 
- Code: Navbar.test.tsx:151 await import("@testing-library/react") test-only; prod rg React.lazy → 0, viteSingleFile intact.
### L5/L6 — BrowserRouter comment + CSP nuance — Low 
 
- rg BrowserRouter apps/web/src → 1 comment LoginPage.tsx:27 // B17 will switch to BrowserRouter — not runtime. CSP 'unsafe-inline' conditional not documented in SKILL. 
 
---
 
3. Precise Fix Plan (Surgical, No New Features) 
 
Pre-condition (must stay green): npm run lint 0 + typecheck 0 + npm test 485 + test:plan-alignment ✅. Doc-only — no TDD red/green cycle needed. 
 
### Phase A — P1 Structural (one commit) 
 
┌────┬──────────────┬──────────────────────────────────────────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐ 
│ #  │ File:line    │ OldText (unique)                                     │ NewText                                                                                                                            │ 
├────┼──────────────┼──────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ A1 │ SKILL.md     │ 7. **routes** — health + (when db provided...\n8.    │ 7. **routes** …\n8. **static** — optional SPA (when STATIC_DIR set, wildcard:false, after routes; does not shadow /api/* or        │ 
│    │ §5.1         │ **errorHandler**                                     │ /health)\n9. **errorHandler**                                                                                                      │ 
├────┼──────────────┼──────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ A2 │ SKILL.md     │ Each of the 7 community categories … has a           │ Avatars use gradientFor(seed) → 10 pairs via FNV-1a→mulberry32 (utils/random.ts:59, seed/random.ts:59). Communities hard-code      │ 
│    │ §4.3         │ deterministic gradient derived via … gradientFor()   │ colorFrom/To in SEEDS (data/communities.ts:8-15), not gradientFor.                                                                 │ 
├────┼──────────────┼──────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ A3 │ SKILL.md     │ ~3037 comments (if stated as single total without    │ ~3037 comments in DB (seed) / ~2881 in client PRNG (RNG order swapped at comments.ts:40 vs seed/comments.ts:64 — 5% demo parity    │ 
│    │ §7.1         │ caveat)                                              │ gap; DB is source of truth) — or align seed/comments.ts RNG order to client and regenerate seed test (code fix, not doc) —         │ 
│    │              │                                                      │ decision needed                                                                                                                    │ 
├────┼──────────────┼──────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ A4 │ SKILL.md     │ Path=/api/auth/refresh (if present) / vague refresh  │ Path=/api/auth (covers /refresh + /logout), atomic rotate(jti) at auth.ts:295-319, credentials:include at lib/api.ts:364,423       │ 
│    │ §19.1        │ description                                          │                                                                                                                                    │ 
└────┴──────────────┴──────────────────────────────────────────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ 
 
### Phase B — P2 Polish (same commit or second) 
 
┌────┬────────────────────────┬─────────────────────────────────────────────────────────────┬───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐ 
│ #  │ File:line              │ OldText                                                     │ NewText                                                                                                           │ 
├────┼────────────────────────┼─────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ B1 │ SKILL.md §4.1          │ @utility line-clamp-1 {                                     │ .line-clamp-1 { + note index.css:107 plain class (functional identical under @tailwindcss/vite)                   │ 
├────┼────────────────────────┼─────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ B2 │ SKILL.md §19           │ stale auth.ts:295 offsets                                   │ Refresh line numbers or replace with rg auth.ts register/login/refresh/logout                                     │ 
├────┼────────────────────────┼─────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ B3 │ SKILL.md               │ absolute no process.env / no dynamic import / gitignore     │ Add bounded exception footnotes: CLI scripts bypass loadEnv (entrypoint), test-only import() allowed, skills/     │ 
│    │ AP-4/AP-2/AP-8         │ fully enforced                                              │ excluded from verifier                                                                                            │ 
└────┴────────────────────────┴─────────────────────────────────────────────────────────────┴───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ 
 
### Decision required before Phase A 
 
H1 code-vs-doc tradeoff: 
- Doc-only fix (A3 above) — document the 5% parity gap, keep both RNG orders. Zero code risk, ships in 5 min. 
- Code fix — swap packages/db/src/seed/comments.ts:64-70 order to match apps/web/src/data/comments.ts:40-70, re-run npm run db:seed, update seed.test.ts expected count to 2881. Achieves demo parity but touches 
  migration/seed — requires npm test full pass and justifies a db test change. Recommended: doc-only unless you require strict parity. 
 
### Verification after each phase

```bash 
  npm run lint                    # 0 
  npm run typecheck               # 0 (pretypecheck builds shared+db) 
  npm test                        # 485 (unchanged — doc-only; or 485 with updated seed count if code fix) 
  npm run test:plan-alignment     # ✅ (SKILL must not re-introduce forbidden tokens) 
  grep -c "static.*wildcard:false" apps/server/src/app.ts  # 1 
  grep -c "HashRouter" apps/web/src/App.tsx               # 1, rg BrowserRouter → 0 runtime 
``` 
 
### What NOT to fix 
 
- skills/ re-untracking — intentional, defer. 
- Historical round counts ~300/350 — estimates, not failures. 
- Version table — all 18 pins exact, no action. 
 
---
 
Validation executed — fixes applied. Verification green. 
 
### Ground Truth (frozen at 904ffce = 53b5e6b+doc-fix) 
 
485 vitest = 281 web (19 files) +103 server (9) +70 shared (3) +31 db (2) + 48 E2E (18 local +12 live +16 extended +2 repro) + 14 node --test — 29 scripts, HashRouter+viteSingleFile 539 KB, STATIC_DIR unified  
origin, 0 dist/0 .env tracked, 13,896 skills/ intentional. 
 
### Skill Verdict: 93.5% aligned — 0 Critical, 1 High, 3 Medium, 6 Low 
 
115/123 claims PASS. No version lie, no forbidden token (tRPC/pnpm/RS256/UUID absent), all 18 version pins exact. 
 
Top findings confirmed + root cause: 
 
- H1 — ~3037 comments (§7.1): apps/web/data/comments.ts:40 2881 vs packages/db/seed/comments.ts:64 3037 (+156). RNG order swapped (bool↔int), same random.ts — demo parity only, DB is source of truth. 
  Documented, not code-fixed. 
- M1 — Plugin order §5.1 (8 vs 9): Skill listed 8, code is 9 — static (@fastify/static, wildcard:false, after routes) added R16 at app.ts:195. CSP unsafe-inline only when STATIC_DIR — ADR-003 tradeoff. 
- M2 — Gradients §4.3: gradientFor is avatars only (utils/random.ts:59 10 pairs); communities hard-code SEEDS (data/communities.ts:8-15) — doc conflated. 
- M3 — skills/ tracked: 13,896 tracked despite .gitignore — intentional, verify-gitignore-enforced.sh:12-20 excludes ^skills/. 
- L1-L6: .line-clamp plain class not @utility (index.css:107), line-number offsets, CLI process.env bounded exception, test-only import(), comment BrowserRouter, CSP nuance — all bounded. 
 
### Fixes Applied (skill-only, surgical doc-only — 74277ac→1f00391, 12 ins/6 del) 
 
┌──────────────┬─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐ 
│ Area         │ Edit                                                                                                                    │ 
├──────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ §4.1         │ @utility line-clamp-1 → .line-clamp-1 /* plain class — identical under @tailwindcss/vite */                             │ 
├──────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ §4.3         │ 7 categories has gradientFor → Avatars gradientFor 10 pairs; Communities hard-code SEEDS                                │ 
├──────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ §5.1         │ 7 routes → 8 errorHandler → 7 routes → 8 static (STATIC_DIR, wildcard:false) → 9 errorHandler + R16 note                │ 
├──────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ §7.1         │ total ~3037 → ~2881 client vs ~3037 DB — 5% gap, RNG order at comments.ts:40 vs seed/comments.ts:64; DB source of truth │ 
├──────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ AP-4         │ Add CLI bounded exception packages/db/scripts/*                                                                         │ 
├──────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ AP-8         │ Add skills/ intentional exception 13,896 + verifier line                                                                │ 
├──────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ §17.3 Docker │ Add COPY web/dist + ENV STATIC_DIR=/app/apps/web/dist + R15 unified origin note                                         │ 
└──────────────┴─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ 
 
Prior session's doc-fixes (AGENTS.md Round 15→16, 467→473, plugin 8→9, test counts 8→9; CLAUDE.md 277→281, routes, live header 2026-08-19, secret +e09e425; README.md duplicate Docker, R15→R15+R16, ROUND_16; 
docker-compose.yml header; REMEDIATION_PLAN_ROUND_16.md C1 [x]; reddit-clone_SKILL.md 485 header) are already in 904ffce and still green. 
 
### Post-Fix Verification 
 
``` 
  npm run lint                ✅ 0 errors / 0 warnings 
  npm run typecheck           ✅ 4 workspaces (pretypecheck builds shared+db) 
  npm run test:plan-alignment ✅ aligned 
  npm run test:build          ✅ 539 KB singlefile, no Vite dev modules 
  git diff --stat             1 file (reddit-clone_SKILL.md) — doc-only 
```  

Skill header now 485 vis 281+103+70+31 matches ground truth; no new drift introduced. Remaining 6 low findings are bounded exceptions already footnoted — no further fix needed unless you require strict parity  
(seed/comments.ts RNG reorder code fix) or P2 line-number refresh in §19.

