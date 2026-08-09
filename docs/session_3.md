Validation Report: docs/session_2.md vs Codebase 
 
Methodology 
 
Read the 175-line session transcript, extracted every factual claim about what was built, then verified each claim against the actual codebase using: file inspection, build/typecheck commands, test runs (via npm test --workspaces), 
and targeted spot-checks. 
 
---
 
Claim-by-Claim Results 
 
### 1. Monorepo Structure ✅ 
 
┌───────────────────────────────────────────────────────────────────────┬──────────────┬───────────────────────────────────────────────────────────────────────────────────┐ 
│ Claim                                                                 │ Status       │ Evidence                                                                          │ 
├───────────────────────────────────────────────────────────────────────┼──────────────┼───────────────────────────────────────────────────────────────────────────────────┤ 
│ 4 workspaces: @embers/web, @embers/shared, @embers/db, @embers/server │ ✅ Confirmed │ apps/web, apps/server, packages/shared, packages/db all present with package.json │ 
├───────────────────────────────────────────────────────────────────────┼──────────────┼───────────────────────────────────────────────────────────────────────────────────┤ 
│ Root package.json uses workspaces: ["apps/*", "packages/*"]           │ ✅ Confirmed │ Verified                                                                          │ 
└───────────────────────────────────────────────────────────────────────┴──────────────┴───────────────────────────────────────────────────────────────────────────────────┘ 
 
### 2. Build Ordering Fix ✅ 
 
┌───────────────────────────────────────────────────────────┬──────────────┬──────────────────────────────────────────────────────────────────────┐ 
│ Claim                                                     │ Status       │ Evidence                                                             │ 
├───────────────────────────────────────────────────────────┼──────────────┼──────────────────────────────────────────────────────────────────────┤ 
│ Build script runs topological: shared → db → server → web │ ✅ Confirmed │ Root package.json build script chains workspaces in dependency order │ 
├───────────────────────────────────────────────────────────┼──────────────┼──────────────────────────────────────────────────────────────────────┤ 
│ typecheck script also topological                         │ ✅ Confirmed │ Same order in typecheck script                                       │ 
└───────────────────────────────────────────────────────────┴──────────────┴──────────────────────────────────────────────────────────────────────┘ 
 
### 3. Missing Dependency Fix ✅ 
 
┌──────────────────────────────────────────────┬──────────────┬──────────────────────────────────────────────────┐ 
│ Claim                                        │ Status       │ Evidence                                         │ 
├──────────────────────────────────────────────┼──────────────┼──────────────────────────────────────────────────┤ 
│ @embers/db added to apps/server/package.json │ ✅ Confirmed │ "@embers/db": "*" present in server dependencies │ 
└──────────────────────────────────────────────┴──────────────┴──────────────────────────────────────────────────┘ 
 
### 4. TypeScript Bug Fixes (4 bugs) ✅ 
 
┌───────────────────────────┬───────────────────────────────────────────────────┬────────┬──────────────────────────────────────────────────────────────┐ 
│ File                      │ Claimed Fix                                       │ Status │ Evidence                                                     │ 
├───────────────────────────┼───────────────────────────────────────────────────┼────────┼──────────────────────────────────────────────────────────────┤ 
│ commentTreeService.ts     │ import type { comments } → import { comments }    │ ✅     │ Line 1: import { comments } from "@embers/db"                │ 
├───────────────────────────┼───────────────────────────────────────────────────┼────────┼──────────────────────────────────────────────────────────────┤ 
│ voteService.ts            │ Remove unused _tx parameter from db.transaction() │ ✅     │ db.transaction(() => { — parameter omitted                   │ 
├───────────────────────────┼───────────────────────────────────────────────────┼────────┼──────────────────────────────────────────────────────────────┤ 
│ notificationRepository.ts │ Type .map() callback with NotificationSelectRow   │ ✅     │ (r: NotificationSelectRow) => ({...})                        │ 
├───────────────────────────┼───────────────────────────────────────────────────┼────────┼──────────────────────────────────────────────────────────────┤ 
│ search.ts                 │ Type 3 .map() callbacks with explicit types       │ ✅     │ SearchPostResult, CommunitySelectRow, UserSelectRow all used │ 
└───────────────────────────┴───────────────────────────────────────────────────┴────────┴──────────────────────────────────────────────────────────────┘ 
 
### 5. PATCH/DELETE Routes with Author-Only Auth ✅ 
 
┌──────────────────────────────────────────────────────────────┬────────┬────────────────────────────────────────────────┐ 
│ Claim                                                        │ Status │ Evidence                                       │ 
├──────────────────────────────────────────────────────────────┼────────┼────────────────────────────────────────────────┤ 
│ PATCH /api/posts/:id exists                                  │ ✅     │ posts.ts lines 117-166                         │ 
├──────────────────────────────────────────────────────────────┼────────┼────────────────────────────────────────────────┤ 
│ DELETE /api/posts/:id exists                                 │ ✅     │ posts.ts lines 168-207                         │ 
├──────────────────────────────────────────────────────────────┼────────┼────────────────────────────────────────────────┤ 
│ Both require authentication (preHandler: [app.authenticate]) │ ✅     │ Both routes have auth preHandler               │ 
├──────────────────────────────────────────────────────────────┼────────┼────────────────────────────────────────────────┤ 
│ Both enforce author-only (403 if authorId !== user.id)       │ ✅     │ Both check existing.authorId !== user.id → 403 │ 
├──────────────────────────────────────────────────────────────┼────────┼────────────────────────────────────────────────┤ 
│ Proper status codes (401/200/403/404/422/204)                │ ✅     │ All paths covered in code + tests              │ 
└──────────────────────────────────────────────────────────────┴────────┴────────────────────────────────────────────────┘ 
 
### 6. Concurrency Tests ✅ 
 
┌───────────────────────────────────────────────────────────────┬────────┬────────────────────────────────────────────────┐ 
│ Claim                                                         │ Status │ Evidence                                       │ 
├───────────────────────────────────────────────────────────────┼────────┼────────────────────────────────────────────────┤ 
│ voteConcurrency.test.ts exists                                │ ✅     │ apps/server/src/routes/voteConcurrency.test.ts │ 
├───────────────────────────────────────────────────────────────┼────────┼────────────────────────────────────────────────┤ 
│ 3 tests: 100 upvotes → +100, 100 toggles → 0, flip -1→+1 → +2 │ ✅     │ All 3 tests present and passing                │ 
└───────────────────────────────────────────────────────────────┴────────┴────────────────────────────────────────────────┘ 
 
### 7. Test Counts ✅ 
 
┌────────────────┬─────────┬────────┬────────┐ 
│ Workspace      │ Claimed │ Actual │ Status │ 
├────────────────┼─────────┼────────┼────────┤ 
│ @embers/shared │ 67      │ 67     │ ✅     │ 
├────────────────┼─────────┼────────┼────────┤ 
│ @embers/web    │ 176     │ 176    │ ✅     │ 
├────────────────┼─────────┼────────┼────────┤ 
│ @embers/db     │ 29      │ 29     │ ✅     │ 
├────────────────┼─────────┼────────┼────────┤ 
│ @embers/server │ 95      │ 95     │ ✅     │ 
├────────────────┼─────────┼────────┼────────┤ 
│ TOTAL          │ 367     │ 367    │ ✅     │ 
└────────────────┴─────────┴────────┴────────┘ 
 
### 8. Build & Typecheck ✅ 
 
┌──────────────────────────────────┬────────┬───────────────────────────────────────────┐ 
│ Claim                            │ Status │ Evidence                                  │ 
├──────────────────────────────────┼────────┼───────────────────────────────────────────┤ 
│ All 4 workspaces build clean     │ ✅     │ npm run build exits 0, all dist/ produced │ 
├──────────────────────────────────┼────────┼───────────────────────────────────────────┤ 
│ All 4 workspaces typecheck clean │ ✅     │ npm run typecheck exits 0                 │ 
├──────────────────────────────────┼────────┼───────────────────────────────────────────┤ 
│ Web single-file build intact     │ ✅     │ dist/index.html = 525.44 KB               │ 
└──────────────────────────────────┴────────┴───────────────────────────────────────────┘ 
 
### 9. FTS5 Full-Text Search ✅ 
 
┌───────────────────────────────────────────────────────┬────────┬─────────────────────────────────────────────────────────────────────────────┐ 
│ Claim                                                 │ Status │ Evidence                                                                    │ 
├───────────────────────────────────────────────────────┼────────┼─────────────────────────────────────────────────────────────────────────────┤ 
│ posts_fts virtual table with external-content pattern │ ✅     │ fts5.ts — content='posts', content_rowid='rowid'                            │ 
├───────────────────────────────────────────────────────┼────────┼─────────────────────────────────────────────────────────────────────────────┤ 
│ Sync triggers: posts_ai, posts_ad, posts_au           │ ✅     │ All 3 triggers (INSERT/DELETE/UPDATE) present                               │ 
├───────────────────────────────────────────────────────┼────────┼─────────────────────────────────────────────────────────────────────────────┤ 
│ BM25 ranking via searchPosts()                        │ ✅     │ bm25(posts_fts) AS rank in query                                            │ 
├───────────────────────────────────────────────────────┼────────┼─────────────────────────────────────────────────────────────────────────────┤ 
│ posts_ad trigger cleans FTS on delete                 │ ✅     │ INSERT INTO posts_fts(posts_fts, rowid, title, body) VALUES ('delete', ...) │ 
└───────────────────────────────────────────────────────┴────────┴─────────────────────────────────────────────────────────────────────────────┘ 
 
### 10. Helmet Security Headers ✅ 
 
┌─────────────────────────────────┬────────┬─────────────────────────────────────────────────────────────────────────────┐ 
│ Claim                           │ Status │ Evidence                                                                    │ 
├─────────────────────────────────┼────────┼─────────────────────────────────────────────────────────────────────────────┤ 
│ CSP header present              │ ✅     │ hardening.test.ts verifies content-security-policy with specific directives │ 
├─────────────────────────────────┼────────┼─────────────────────────────────────────────────────────────────────────────┤ 
│ X-Content-Type-Options: nosniff │ ✅     │ Verified in test                                                            │ 
├─────────────────────────────────┼────────┼─────────────────────────────────────────────────────────────────────────────┤ 
│ X-Frame-Options: SAMEORIGIN     │ ✅     │ Verified in test                                                            │ 
├─────────────────────────────────┼────────┼─────────────────────────────────────────────────────────────────────────────┤ 
│ Referrer-Policy: no-referrer    │ ✅     │ Verified in test                                                            │ 
├─────────────────────────────────┼────────┼─────────────────────────────────────────────────────────────────────────────┤ 
│ No HSTS in non-production       │ ✅     │ Verified in test                                                            │ 
└─────────────────────────────────┴────────┴─────────────────────────────────────────────────────────────────────────────┘ 
 
### 11. Rate Limiting ✅ 
 
┌─────────────────────────────────────┬────────┬────────────────────────────────────┐ 
│ Claim                               │ Status │ Evidence                           │ 
├─────────────────────────────────────┼────────┼────────────────────────────────────┤ 
│ 5/min/IP on auth endpoints          │ ✅     │ hardening.test.ts: 6th login → 429 │ 
├─────────────────────────────────────┼────────┼────────────────────────────────────┤ 
│ Non-auth endpoints not rate-limited │ ✅     │ /health survives 20 rapid requests │ 
└─────────────────────────────────────┴────────┴────────────────────────────────────┘ 
 
### 12. Demo Login & Seed Data ✅ 
 
┌────────────────────────────────────────────────────────────────────────────┬────────┬────────────────────────────────────────────────┐ 
│ Claim                                                                      │ Status │ Evidence                                       │ 
├────────────────────────────────────────────────────────────────────────────┼────────┼────────────────────────────────────────────────┤ 
│ Demo user you / embers-demo                                                │ ✅     │ auth.test.ts tests login, seed.ts creates user │ 
├────────────────────────────────────────────────────────────────────────────┼────────┼────────────────────────────────────────────────┤ 
│ Seed: 49 users, 18 communities, 320 posts, 3037 comments, 18 notifications │ ✅     │ npm run db:seed output matches exactly         │ 
└────────────────────────────────────────────────────────────────────────────┴────────┴────────────────────────────────────────────────┘ 
 
### 13. updatePostInputSchema ✅ 
 
┌───────────────────────────────────────────────────────────────┬────────┬──────────────────────────────────┐ 
│ Claim                                                         │ Status │ Evidence                         │ 
├───────────────────────────────────────────────────────────────┼────────┼──────────────────────────────────┤ 
│ Schema exists in @embers/shared                               │ ✅     │ packages/shared/src/api/index.ts │ 
├───────────────────────────────────────────────────────────────┼────────┼──────────────────────────────────┤ 
│ Tested (partial update, empty object, all fields, validation) │ ✅     │ 5+ test cases in api.test.ts     │ 
└───────────────────────────────────────────────────────────────┴────────┴──────────────────────────────────┘ 
 
---
 
Discrepancies Found 
 
### ⚠ Critical: better-sqlite3 Native Binding Not Compiled 
 
The session transcript claims "367 tests passing" — this is conditionally true. In the current environment, the better-sqlite3 native module (.node file) was never compiled. All 25 @embers/db tests and 15 @embers/server tests that 
touch SQLite fail without the binding. 
 
Root cause: npm install ran with install scripts blocked (likely --ignore-scripts or a sandbox), so prebuild-install || node-gyp rebuild never executed. Node v24 has no prebuilt binaries, and the local compile was skipped. 
 
Fix applied during validation: Manually ran node-gyp rebuild --release in node_modules/better-sqlite3/, which compiled the .node binary. Tests then passed. 
 
Action needed: This is a setup gap — there's no postinstall script, no README instruction, and no CI step to compile native modules. The repo will fail fresh npm install on any new machine without manual intervention. 
 
### ⚠ Minor: vitest run from Root Doesn't Discover Workspace Configs 
 
Running npx vitest run from the monorepo root produces 26 failures (all web tests that need jsdom). This is expected vitest behavior — workspace vitest.config.ts files aren't auto-discovered from the root. The correct command is npm   
test (which uses --workspaces). Not a code bug, but worth documenting. 
 
### ⚠ Informational: Session Document Format 
 
session_2.md is not structured documentation — it's a raw session transcript (chain-of-thought + tool calls + output). It mixes claims, code, commands, and results without clear structure. This makes automated validation difficult and 
is not a typical docs/ file format. 
 
---
 
Summary 
 
┌──────────────────────────────────────┬────────┬──────────┬────────┐ 
│ Category                             │ Claims │ Verified │ Issues │ 
├──────────────────────────────────────┼────────┼──────────┼────────┤ 
│ Monorepo structure                   │ 2      │ 2        │ 0      │ 
├──────────────────────────────────────┼────────┼──────────┼────────┤ 
│ Build/dependency fixes               │ 3      │ 3        │ 0      │ 
├──────────────────────────────────────┼────────┼──────────┼────────┤ 
│ TS bug fixes                         │ 4      │ 4        │ 0      │ 
├──────────────────────────────────────┼────────┼──────────┼────────┤ 
│ Features (PATCH/DELETE, concurrency) │ 2      │ 2        │ 0      │ 
├──────────────────────────────────────┼────────┼──────────┼────────┤ 
│ Test counts                          │ 5      │ 5        │ 0      │ 
├──────────────────────────────────────┼────────┼──────────┼────────┤ 
│ Build/typecheck                      │ 3      │ 3        │ 0      │ 
├──────────────────────────────────────┼────────┼──────────┼────────┤ 
│ Security (Helmet, rate-limit)        │ 2      │ 2        │ 0      │ 
├──────────────────────────────────────┼────────┼──────────┼────────┤ 
│ FTS5 search                          │ 1      │ 1        │ 0      │ 
├──────────────────────────────────────┼────────┼──────────┼────────┤ 
│ Seed data & demo login               │ 2      │ 2        │ 0      │ 
├──────────────────────────────────────┼────────┼──────────┼────────┤ 
│ Schema validation                    │ 1      │ 1        │ 0      │ 
├──────────────────────────────────────┼────────┼──────────┼────────┤ 
│ TOTAL                                │ 25     │ 25       │ 0      │ 
└──────────────────────────────────────┴────────┴──────────┴────────┘ 
 
All 25 factual claims in session_2.md are accurate — the codebase matches the document. The only issue is an environment gap (uncompiled native binding) that the session didn't account for.

---

All 367 tests pass with zero manual compilation. The finding is invalidated. 
 
---
 
Re-Validation Report: better-sqlite3 Native Binding 
 
Original Finding (Session 2) 
 
│ ⚠ Critical: better-sqlite3 native binding not compiled. All db/server tests fail. Must manually run node-gyp rebuild. 
 
What Changed 
 
better-sqlite3 was bumped from 11.10.0 → 13.0.3 in package-lock.json (commit bdbcbcf: "update packages"). 
 
Why the Finding is Wrong 
 
### v11 (old) — requires compilation 
 
- Loads native module via bindings package → looks in build/Release/better_sqlite3.node 
- Install script: prebuild-install || node-gyp rebuild --release 
- If install scripts are blocked → no .node file → all tests fail 
 
### v13 (current) — ships prebuilt binaries ✅ 
 
- Loads native module via platform-specific subpath exports + lib/binding.js 
- Three-tier fallback: prebuilds/{platform}-{arch}.node → build/Debug/ → build/Release/ 
- The prebuilt binary ships inside the npm package — no compilation needed 
 
Evidence 
 
┌──────────────────────────────────────────┬───────────────────────────────────────────────────────┐ 
│ Check                                    │ Result                                                │ 
├──────────────────────────────────────────┼───────────────────────────────────────────────────────┤ 
│ prebuilds/linux-x64.node exists          │ ✅ 2.2 MB ELF 64-bit binary                           │ 
├──────────────────────────────────────────┼───────────────────────────────────────────────────────┤ 
│ build/Release/better_sqlite3.node exists │ ❌ Empty (NORMAL — not needed)                        │ 
├──────────────────────────────────────────┼───────────────────────────────────────────────────────┤ 
│ binding.js resolves to prebuild          │ ✅ getPrebuildPath() returns prebuilds/linux-x64.node │ 
├──────────────────────────────────────────┼───────────────────────────────────────────────────────┤ 
│ node -e "require('better-sqlite3')"      │ ✅ Loads and runs                                     │ 
├──────────────────────────────────────────┼───────────────────────────────────────────────────────┤ 
│ FTS5 query via prebuilt binary           │ ✅ Works                                              │ 
├──────────────────────────────────────────┼───────────────────────────────────────────────────────┤ 
│ npm test (367 tests)                     │ ✅ All pass — zero manual compilation                 │ 
└──────────────────────────────────────────┴───────────────────────────────────────────────────────┘ 
 
How lib/binding.js Works (v13) 
 
```javascript 
  // Tier 1: Prebuilt binary (shipped with npm package) 
  function getPrebuildPath() { 
    const target = `${process.platform}-${process.arch}`;  // "linux-x64" 
    const filename = path.join(__dirname, '..', 'prebuilds', `${target}.node`); 
    if (fs.existsSync(filename)) return filename;  // ← THIS HITS 
    return null; 
  } 
 
  // Tier 2: build/Debug (only checked if no prebuild) 
  // Tier 3: build/Release (only checked if no Debug) 
``` 
 
What the hasInstallScript: true Flag Does 
 
The git diff added "hasInstallScript": true to package-lock.json. This is largely irrelevant because: 
 
1. v13's package.json has no install script (only build-release, build-debug, etc.) 
2. The prebuilt binary is bundled in the npm tarball — it doesn't need an install step 
3. Even with install scripts blocked, the prebuilt binary is present and loads correctly 
 
The flag may cause npm to run npm run build-release if someone manually triggers it, but it's not needed for normal operation. 
 
Verdict 
 
┌──────────────────────────┬─────────────────────────────┬────────────────────────────────────────────┐ 
│ Aspect                   │ Original Claim              │ Reality                                    │ 
├──────────────────────────┼─────────────────────────────┼────────────────────────────────────────────┤ 
│ Binding compiled?        │ ❌ "Not compiled"           │ ✅ Prebuilt binary ships with npm package  │ 
├──────────────────────────┼─────────────────────────────┼────────────────────────────────────────────┤ 
│ Tests pass?              │ ❌ "25 db + 15 server fail" │ ✅ All 367 pass with zero compilation      │ 
├──────────────────────────┼─────────────────────────────┼────────────────────────────────────────────┤ 
│ Manual node-gyp needed?  │ ✅ "Required"               │ ❌ Not needed — v13 uses prebuilt binaries │ 
├──────────────────────────┼─────────────────────────────┼────────────────────────────────────────────┤ 
│ Fresh npm install works? │ ❌ "Will fail"              │ ✅ Works — no install scripts blocked      │ 
└──────────────────────────┴─────────────────────────────┴────────────────────────────────────────────┘ 
 
Conclusion 
 
The finding is invalidated. The v11→v13 upgrade fundamentally changed how better-sqlite3 loads its native module — from requiring local compilation (node-gyp) to shipping prebuilt binaries. The build/Release/ directory being empty is  
expected and correct for v13. The repo works on a fresh npm install with no manual intervention.

---

All 367 tests pass. Both docs are updated and consistent. Here's a summary of what was done: 
 
---
 
Summary 
 
### AGENTS.md — 8 edits 
 
┌──────────────────────────────────────┬──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐ 
│ Edit                                 │ What Changed                                                                                                     │ 
├──────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Intro paragraph                      │ Now reflects monorepo reality (client SPA + backend workspaces)                                                  │ 
├──────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Commands                             │ Split into "All workspaces" + "Per-workspace" tables; added server dev, DB migrate/seed, topological build order │ 
├──────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Backend Workspaces (new)             │ Table of 3 workspaces + purpose                                                                                  │ 
├──────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Server Architecture (new)            │ Composition root, plugin order, lazy route registration, repository/service patterns, graceful shutdown          │ 
├──────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ API Routes (new)                     │ Full 17-row route table with auth requirements                                                                   │ 
├──────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Authentication & Authorization (new) │ JWT + refresh cookies, Argon2id, decorator pattern, rate limiting                                                │ 
├──────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Database & FTS5 (new)                │ Drizzle schema, 7 tables, FTS5 triggers, migrations, seed                                                        │ 
├──────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Backend Testing Patterns (new)       │ app.inject(), in-memory DBs, seeded demo user, test file counts                                                  │ 
├──────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Backend Pitfalls (new)               │ 7 backend-specific pitfalls (loadEnv, import type, transactions, etc.)                                           │ 
└──────────────────────────────────────┴──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ 
 
### CLAUDE.md — 9 edits 
 
┌───────────────────────────────────┬─────────────────────────────────────────────────────────────────────────────────┐ 
│ Edit                              │ What Changed                                                                    │ 
├───────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤ 
│ Intro                             │ Updated to reflect monorepo                                                     │ 
├───────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤ 
│ Tech Stack                        │ Split into Client + Backend tables (Fastify, Drizzle, jose, argon2, pino, etc.) │ 
├───────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤ 
│ Commands                          │ Added workspace-scoped commands, DB migrate/seed                                │ 
├───────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤ 
│ Build Constraints                 │ Split Client/Backend; added prebuilt binaries, ESM, loadEnv() rules             │ 
├───────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤ 
│ Backend Data Layer (new)          │ Schema, FTS5, branded IDs, migrations, seed, SQLite hardening                   │ 
├───────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤ 
│ Backend Architecture (ADRs) (new) │ 8 active ADRs + deferred                                                        │ 
├───────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤ 
│ Testing                           │ Split Client/Backend; added app.inject(), in-memory DBs, test counts            │ 
├───────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤ 
│ File Organization                 │ Replaced web-only tree with full monorepo layout                                │ 
├───────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤ 
│ Routes                            │ Split Client (HashRouter) + Server API tables                                   │ 
├───────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤ 
│ Pitfalls                          │ Split Client/Backend; added 7 backend pitfalls                                  │ 
└───────────────────────────────────┴─────────────────────────────────────────────────────────────────────────────────┘ 
 
### README.md — 1 edit 
 
┌─────────────┬─────────────────────────────────────────────────────┐ 
│ Edit        │ What Changed                                        │ 
├─────────────┼─────────────────────────────────────────────────────┤ 
│ Repo layout │ Fixed stale test counts: server 80→95, shared 61→67 │ 
└─────────────┴─────────────────────────────────────────────────────┘ 
 
### Cross-doc consistency verified 
 
- Test counts match: web=176, shared=67, db=29, server=95, total=367 ✅ 
- Demo login (you/embers-demo) documented in all three ✅ 
- better-sqlite3@13.0.3 prebuilt binaries noted in AGENTS + CLAUDE ✅ 
- API route tables content-identical across AGENTS + CLAUDE ✅ 
- 367 tests passing, build clean, typecheck clean ✅

