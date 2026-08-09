Validation is complete — all 367 tests pass, and I've cross-checked every structural claim in both documents against the code. Here is the full report. 
 
---
 
Documentation ↔ Codebase Alignment Audit 
 
Method 
 
- Read AGENTS.md and CLAUDE.md in full, then verified claims against: root + workspace package.jsons, tsconfig.base.json, .gitignore, all server routes/plugins/repositories/services, packages/db schema/FTS5/client/seed/migrations, 
  packages/shared ids/schemas/api, the web app's data layer/store/UI components/CSS, docs/REMEDIATION_EXECUTION_PLAN.md, and a full test-suite run (367/367 pass, matching the documented counts exactly). 
 
✅ Verified alignment (the docs are accurate on all major claims) 
 
Monorepo & commands 
- Workspaces apps/* + packages/*; root build/typecheck are topological shared → db → server → web; npm test uses --workspaces; db:migrate/db:seed fan out; engines.node >= 20; better-sqlite3@13.0.3 in allowScripts. 
 
Client stack — every version matches installed reality: React 19.2.6, Vite 7.3.2, TS 5.9.3 strict, Tailwind 4.1.17, react-router-dom 7.18.2, zustand 5.0.14, framer-motion 13.0.0, clsx/tailwind-merge, vitest 2.1.9, jsdom 25.0.1. 
 
Build constraints — vite-plugin-singlefile wired (no code splitting anywhere); HashRouter with the exact documented route table; App.tsx toggles .dark on <html>; @/* alias wired in both tsconfig.json and vite.config.ts but used 
nowhere; no ESLint; Google Fonts @import + BASE_URL-prefixed /images/*.jpg (all 8 category images present). 
 
Tailwind v4 specifics — @theme block, no tailwind.config.js/PostCSS config, @custom-variant dark (&:where(.dark, .dark *)), hand-written .line-clamp-1/2/3, var(--color-orange-500) usage. 
 
Data layer — all 5 modules match seed strings exactly (users-seed-v1 → 48 + CURRENT_USER u-me; community-${name} over SEEDS → 18; posts-seed-v2 → 320; comments-${postId} lazy/memoised/max-depth-4; notifications-seed-v1 → 18). Accessor 
contracts confirmed: getPost→undefined, getCommunityByName→undefined, getCommunity→throws, getUser→silently CURRENT_USER. 
 
State — one zustand store, all overlay slices present (votes with post:/comment: namespacing, localPosts, localComments, notificationReadOverrides, joinedCommunityIds, savedPostIds, theme); toasts excluded from partialize; 
SCHEMA_VERSION=1 + mergePersistedState/validatePersistedState; inline theme-bootstrap script in index.html mirrored by themeBootstrap.ts; all 6 pure selectors; ErrorBoundary class component wrapping <Outlet/> in AppShell; 
[...localPosts, ...POSTS] prepend in Home/Community/Profile/Search pages. 
 
UI conventions — Button forwardRef + variant/size maps, Modal = always-mounted portal + open-gated AnimatePresence, Dropdown render props, VoteControl computes baseScore + vote without mutation, PAGE_SIZE=8 + useInfiniteScroll with 
rootMargin: 400px, 650 ms/500 ms simulated latency, cn(), gradientFor (used by Avatar). Local ID patterns match exactly (local-${Date.now()}, ${postId}-c${Date.now()}, ${comment.id}-r${Date.now()}) vs generated (p1…p320, u1…u48, 
${postId}-c1…cN). App.tsx is the sole export default. 
 
Backend architecture — buildApp() composition root with the documented 8-step plugin order; lazy route registration gated on db + rawDb; repository factories + voteService inside db.transaction(() => {...}) with atomic col + delta 
counters; SIGINT/SIGTERM graceful shutdown; loadEnv() zod validation requiring the 4 secrets in production; Argon2id; jose HS256 with 15 m access / 7 d refresh; authenticate decorator → req.user = { id, username }; author-only 403; 5  
req/min auth rate limit; refresh rotation via stored jti + revokedAt; error handler returning only { error: { code, message, requestId } }; requestId plugin. DB: 7 tables, votes composite PK, all 4 hardening pragmas (WAL skipped for   
:memory:), FTS5 external-content + 3 sync triggers + BM25, drizzle-kit migration applied by openDb()/scripts/migrate.ts. 
 
Seed & shared — 49 users (48 + demo you/embers-demo), 18 communities, 320 posts, 18 notifications; deterministic PRNG ported from the web app; branded IDs (& Brand<T> nominal pattern) + Zod entity/API schemas in @embers/shared. 
 
Test infrastructure — setup.ts stubs IntersectionObserver + matchMedia; renderWithRouter wraps in MemoryRouter; counts verified: web 176, server 95, db 29, shared 67 = 367, all green. docs/REMEDIATION_EXECUTION_PLAN.md confirms B0–B16 
done / B17–B24 deferred, matching both docs. 
 
⚠ Discrepancies found 
 
┌────┬────────────────────────────────────┬───────────────────────────────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┬─────────────────────┐ 
│ #  │ Doc                                │ Claim                                     │ Reality                                                                                                                    │ Severity            │ 
├────┼────────────────────────────────────┼───────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼─────────────────────┤ 
│ 1  │ CLAUDE.md ("Backend Data Layer")   │ "Branded IDs (packages/db/src/ids.ts)"    │ ids.ts lives at packages/shared/src/ids.ts (exported by @embers/shared); packages/db has no ids.ts. AGENTS.md gets this    │ Medium —            │ 
│    │                                    │                                           │ right.                                                                                                                     │ wrong-package       │ 
│    │                                    │                                           │                                                                                                                            │ lookup              │ 
├────┼────────────────────────────────────┼───────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼─────────────────────┤ 
│ 2  │ Both docs (API route table)        │ GET /api/communities/:id                  │ Actual route is GET /api/communities/:slug (resolved via findBySlug)                                                       │ Medium              │ 
├────┼────────────────────────────────────┼───────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼─────────────────────┤ 
│ 3  │ Both docs (API route table)        │ GET /api/comments/:postId / POST          │ Actual routes are nested: GET /api/posts/:id/comments / POST /api/posts/:id/comments                                       │ Medium              │ 
│    │                                    │ /api/comments/:postId                     │                                                                                                                            │                     │ 
├────┼────────────────────────────────────┼───────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼─────────────────────┤ 
│ 4  │ AGENTS.md (auth)                   │ "session row revocedAt set"               │ Column is revokedAt (SQL revoked_at) — typo                                                                                │ Low                 │ 
├────┼────────────────────────────────────┼───────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼─────────────────────┤ 
│ 5  │ CLAUDE.md ("Timestamps are ISO     │ Applies to all rows                       │ Only seed data + explicit writes (session expiry) use toISOString(). All 7 created_at columns default to SQLite            │ Medium — subtle     │ 
│    │ 8601…toISOString()")               │                                           │ CURRENT_TIMESTAMP (YYYY-MM-DD HH:MM:SS, no T/Z), and API-created posts/comments/votes/notifications/users rely on that     │ correctness claim   │ 
│    │                                    │                                           │ default (repos never pass createdAt). API-created rows are therefore not ISO 8601.                                         │                     │ 
├────┼────────────────────────────────────┼───────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼─────────────────────┤ 
│ 6  │ CLAUDE.md (file-org tree)          │ plugins/ # helmet, cors, cookie,          │ Only requestId.ts, auth.ts, errorHandler.ts are local files; helmet/cors/cookie/rateLimit are @fastify/* packages          │ Low — misleading    │ 
│    │                                    │ rateLimit, requestId, auth, errorHandler  │ registered inline in app.ts (AGENTS.md describes this correctly)                                                           │ tree                │ 
├────┼────────────────────────────────────┼───────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼─────────────────────┤ 
│ 7  │ CLAUDE.md ("All IDs are text UUIDs │ All IDs                                   │ True for API-created rows (p-${uuid}, u-${uuid}, ${postId}-c-${uuid}, n-${uuid}), but seed rows use deterministic ids      │ Low — nuance        │ 
│    │ via crypto.randomUUID()")          │                                           │ (u1…u48, u-me, p${i+1}-style)                                                                                              │                     │ 
├────┼────────────────────────────────────┼───────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼─────────────────────┤ 
│ 8  │ README (not AGENTS/CLAUDE)         │ skills/ ← local skill library (198        │ No skills/ directory exists in the repo (it's in .gitignore; the catalog lives at ~/.pi/agent/skills)                      │ Low                 │ 
│    │                                    │ skills)                                   │                                                                                                                            │                     │ 
├────┼────────────────────────────────────┼───────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼─────────────────────┤ 
│ 9  │ AGENTS.md                          │ "8 test files in apps/server/src/routes/  │ Count is right (8) but distribution is 5 routes + 2 auth + 1 (config.test.ts) in src/ root                                 │ Trivial — loose     │ 
│    │                                    │ and src/auth/"                            │                                                                                                                            │ wording             │ 
├────┼────────────────────────────────────┼───────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼─────────────────────┤ 
│ 10 │ CLAUDE.md (tech-stack table)       │ lucide-react "1.30.x"                     │ Installed/declared 1.31.0 (^1.31.0)                                                                                        │ Trivial             │ 
├────┼────────────────────────────────────┼───────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼─────────────────────┤ 
│ 11 │ CLAUDE.md                          │ "dist/index.html (~508 kB)"               │ Build-size measurement; dist/ is gitignored and absent — unverifiable without a build                                      │ Trivial —           │ 
│    │                                    │                                           │                                                                                                                            │ stale-prone         │ 
│    │                                    │                                           │                                                                                                                            │ measurement         │ 
└────┴────────────────────────────────────┴───────────────────────────────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┴─────────────────────┘ 
 
Bottom line 
 
The documents are structurally excellent and unusually accurate — every architecture claim (composition root, plugin order, overlay state pattern, deterministic seeding, FTS5, singlefile constraints), every command, every version, and 
every test count checks out against the code, and the full 367-test suite passes. The misalignments are concentrated in four places worth fixing: 
 
1. CLAUDE.md §Backend Data Layer — branded IDs are in packages/shared/src/ids.ts, not packages/db. 
2. Both route tables — communities lookup is by :slug, and comments live at /api/posts/:id/comments (not /api/comments/:postId). 
3. CLAUDE.md timestamp claim — API-created rows get SQLite CURRENT_TIMESTAMP format via schema defaults, not toISOString(); only seed/session-expiry writes are ISO 8601. 
4. AGENTS.md revocedAt typo → revokedAt, plus the minor plugin-tree/README skills/ nits. 
 
If you'd like, I can patch these four items directly in AGENTS.md/CLAUDE.md (and the README skills/ line) with a single surgical edit pass.
