embers — Project Overview 
 
A Reddit-style community feed that began as a client-only React SPA and has grown into a full-stack npm-workspaces monorepo. The name "embers" and the Reddit-clone positioning suggest a warm, community-driven feed experience. 
 
---
 
Architecture 
 
### Monorepo Layout (4 workspaces) 
 
┌────────────────┬──────────────────┬────────────────────────────────────┐ 
│ Workspace      │ Path             │ Role                               │ 
├────────────────┼──────────────────┼────────────────────────────────────┤ 
│ @embers/web    │ apps/web/        │ React 19 SPA — the frontend        │ 
├────────────────┼──────────────────┼────────────────────────────────────┤ 
│ @embers/server │ apps/server/     │ Fastify REST API — the backend     │ 
├────────────────┼──────────────────┼────────────────────────────────────┤ 
│ @embers/shared │ packages/shared/ │ Zod schemas + branded IDs          │ 
├────────────────┼──────────────────┼────────────────────────────────────┤ 
│ @embers/db     │ packages/db/     │ Drizzle ORM + SQLite + FTS5 + seed │ 
└────────────────┴──────────────────┴────────────────────────────────────┘ 
 
### Two Data Layers (coexisting, not yet fully wired) 
 
1. Client deterministic layer (apps/web/src/data/*) — FNV-1a hash → mulberry32 PRNG generates all 48 users, 18 communities, 320 posts, per-post comment trees, 18 notifications at import time. Immutable at runtime. 
2. Backend database layer — Drizzle ORM + better-sqlite3 + FTS5, with migrations and deterministic seed (same counts as client). 
 
Frontend integration of the API into feeds/search is deferred (B17–B22). Auth (B18) is complete. 
 
---
 
Key Technical Decisions 
 
### Client (apps/web) 
 
- React 19.2.6 + Vite 7.3.2 + TypeScript 5.9.3 strict 
- Tailwind CSS v4 CSS-first @theme (no tailwind.config.js) 
- HashRouter — deliberate for zero-config static hosting 
- vite-plugin-singlefile — inlines all JS/CSS into one dist/index.html (~525 KB) 
- Zustand with persist middleware + schema-validated merge 
- Overlay pattern — generated data is immutable; user state (votes, local posts, local comments, reads, joins, saves) lives in separate overlay slices merged at render time 
- framer-motion for animations, lucide-react for icons 
 
### Backend (apps/server + packages) 
 
- Fastify 5 composition-root pattern (buildApp()) 
- Drizzle ORM + better-sqlite3 (WAL mode, busy_timeout=5000, foreign_keys=ON) 
- JWT auth — jose HS256, 15m access token + 7d HttpOnly refresh cookie, Argon2id password hashing 
- Zod for all input/output validation 
- FTS5 virtual table with external-content pattern + BM25 ranking 
- Branded IDs (UserId, PostId, etc.) — nominal typing to prevent ID mixups 
- Plugin registration order matters: helmet → cors → cookie → rateLimit → requestId → auth → routes → errorHandler 
- Repository pattern + service layer for cross-repo operations (votes) 
 
---
 
State Management 
 
Single zustand store (useAppStore) persisted to localStorage key reddit-clone-state: 
- Schema-versioned (schemaVersion: 1) with validated merge 
- partialize whitelists persisted fields — new fields must be added to both partialize AND validatePersistedState 
- Pure selectors in src/store/selectors.ts (unit-testable without mocking) 
- Theme bootstrap via inline <script> in index.html (prevents flash of light theme) 
- ErrorBoundary wraps <Outlet /> in AppShell 
 
---
 
Auth Flow (B18 — Complete) 
 
- AuthProvider (src/auth/AuthProvider.tsx) — React context + useAuth() hook 
- Token held in useRef (not state) to avoid re-renders 
- lib/api.ts — fetch-based API client with opt-in 401-refresh-retry 
- LoginPage (/login) + RegisterPage (/register) — render outside AppShell 
- RequireAuth route guard — redirects anonymous to /login with state.from 
- Navbar is auth-aware (replaced hardcoded CURRENT_USER with useAuth()) 
 
---
 
Testing 
 
┌─────────────────┬───────┬──────────────────────────────────┐ 
│ Suite           │ Count │ Tools                            │ 
├─────────────────┼───────┼──────────────────────────────────┤ 
│ @embers/web     │ 271   │ Vitest + Testing Library + jsdom │ 
├─────────────────┼───────┼──────────────────────────────────┤ 
│ @embers/server  │ 95    │ Vitest + Fastify inject()        │ 
├─────────────────┼───────┼──────────────────────────────────┤ 
│ @embers/shared  │ 67    │ Vitest                           │ 
├─────────────────┼───────┼──────────────────────────────────┤ 
│ @embers/db      │ 29    │ Vitest                           │ 
├─────────────────┼───────┼──────────────────────────────────┤ 
│ Vitest total    │ 462   │                                  │ 
├─────────────────┼───────┼──────────────────────────────────┤ 
│ E2E local       │ 18    │ Playwright (9 smoke + 9 auth)    │ 
├─────────────────┼───────┼──────────────────────────────────┤ 
│ E2E live-audit  │ 12    │ opt-in via LIVE_BASE_URL         │ 
├─────────────────┼───────┼──────────────────────────────────┤ 
│ E2E extended    │ 16    │ opt-in via PROD_BASE_URL         │ 
├─────────────────┼───────┼──────────────────────────────────┤ 
│ E2E repro guard │ 2     │ opt-in via PROD_BASE_URL         │ 
└─────────────────┴───────┴──────────────────────────────────┘ 
 
- pretest script builds @embers/shared + @embers/db first (server tests import them) 
- pretypecheck script does the same for npm run typecheck 
- ESLint 9 flat config (eslint.config.mjs) — no-explicit-any: error, consistent-type-imports: error, exhaustive-deps: error 
 
---
 
Known Live Deployment Issues 
 
┌─────────────┬────────┬───────────────────────────────────────────────────────────────────┐ 
│ ID          │ Status │ Issue                                                             │ 
├─────────────┼────────┼───────────────────────────────────────────────────────────────────┤ 
│ LIVE-CRIT-1 │ FIXED  │ Vite dev server was exposed in prod → now serves production build │ 
├─────────────┼────────┼───────────────────────────────────────────────────────────────────┤ 
│ LIVE-CRIT-2 │ Broken │ Fastify backend not reachable — all /api/* return 404/501         │ 
├─────────────┼────────┼───────────────────────────────────────────────────────────────────┤ 
│ LIVE-CRIT-3 │ Broken │ No security headers (CSP, HSTS, etc.)                             │ 
├─────────────┼────────┼───────────────────────────────────────────────────────────────────┤ 
│ LIVE-CRIT-4 │ Broken │ /api/auth/login returns 501 (partial misconfiguration)            │ 
└─────────────┴────────┴───────────────────────────────────────────────────────────────────┘ 
 
Secret rotation required — .env with JWT secrets was committed to git history in 3 commits (89f1012, 526a836, e09e425). Removed from tracking but still in history. 
 
---
 
Roadmap Status 
 
- B0–B16 — Done (monorepo transition, server, db, shared) 
- B17 — Deferred (build refactor: remove singlefile, switch to BrowserRouter) 
- B18 — Done (AuthProvider, LoginPage, RegisterPage, RequireAuth, auth-aware Navbar) 
- B19–B22 — Deferred (React Query, feeds/search wiring, optimistic UI, notification polling — depend on B17) 
- B23 + B24 — Done (Docker, Playwright E2E, CI) 
 
---
 
Critical Pitfalls (must remember) 
 
1. No React.lazy / dynamic import() — defeats singlefile plugin 
2. No BrowserRouter — HashRouter is intentional 
3. Don't mutate generated data — use overlay slices 
4. New persisted fields need BOTH partialize AND validatePersistedState 
5. Don't use any — unknown instead 
6. Relative imports only — @/* alias exists but is unused 
7. getCommunity(id) throws on miss — use getCommunityByName for safe lookups 
8. Backend: use loadEnv() not process.env directly 
9. Backend: .js extensions required in ESM imports 
10. vite build does NOT typecheck — always run npm run typecheck 
 
---
 
This is a mature, extensively documented codebase with 462 passing tests, clear architectural boundaries, and a well-tracked remediation history across 10+ rounds. The frontend is polished and feature-complete for the demo experience; 
the backend is solid but not yet wired into the feeds/search pages. The deferred B17–B22 work represents the next major engineering effort.

---

All 18 core E2E tests pass (9 smoke + 9 auth lifecycle). The 2 failures are expected — they're from repro_r10_postpage.spec.ts, which requires PROD_BASE_URL=http://localhost:8765/ with a locally-served production build. These are 
opt-in regression guards, not part of the standard suite. 
 
---
 
Full QA Report 
 
┌─────────────────────┬─────────────────┬─────────────────────────────────────────────────────────────────────────────────────────┐ 
│ Check               │ Status          │ Details                                                                                 │ 
├─────────────────────┼─────────────────┼─────────────────────────────────────────────────────────────────────────────────────────┤ 
│ ESLint              │ ✅ Clean        │ 0 errors, 0 warnings                                                                    │ 
├─────────────────────┼─────────────────┼─────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Typecheck           │ ✅ Clean        │ All 4 workspaces pass tsc --noEmit                                                      │ 
├─────────────────────┼─────────────────┼─────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Unit tests          │ ✅ 462/462 pass │ web=271, server=95, shared=67, db=29                                                    │ 
├─────────────────────┼─────────────────┼─────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Build               │ ✅ Success      │ Topological: shared → db → server → web                                                 │ 
├─────────────────────┼─────────────────┼─────────────────────────────────────────────────────────────────────────────────────────┤ 
│ E2E (local API)     │ ✅ 18/18 pass   │ 9 smoke + 9 auth lifecycle                                                              │ 
├─────────────────────┼─────────────────┼─────────────────────────────────────────────────────────────────────────────────────────┤ 
│ test:build          │ ✅ Pass         │ No Vite dev modules, 525 KB bundle                                                      │ 
├─────────────────────┼─────────────────┼─────────────────────────────────────────────────────────────────────────────────────────┤ 
│ test:no-secrets     │ ✅ Pass         │ No .env / env.bak tracked                                                               │ 
├─────────────────────┼─────────────────┼─────────────────────────────────────────────────────────────────────────────────────────┤ 
│ test:gitignore      │ ✅ Pass         │ No tracked file matches gitignore                                                       │ 
├─────────────────────┼─────────────────┼─────────────────────────────────────────────────────────────────────────────────────────┤ 
│ test:ci-config      │ ✅ Pass         │ gitleaks job present in CI                                                              │ 
├─────────────────────┼─────────────────┼─────────────────────────────────────────────────────────────────────────────────────────┤ 
│ test:plan-alignment │ ✅ Pass         │ No forbidden tokens in plan                                                             │ 
├─────────────────────┼─────────────────┼─────────────────────────────────────────────────────────────────────────────────────────┤ 
│ dist/ artifacts     │ ✅ Clean        │ Single-file 537 KB HTML, inlined JS+CSS, images copied, no .map files, 0 tracked by git │ 
└─────────────────────┴─────────────────┴─────────────────────────────────────────────────────────────────────────────────────────┘ 
 
### Notes 
 
1. Port 4000 conflict: A litellm system service binds to ports 4000 and 4001. The E2E suite ran on port 4002 to avoid the conflict. Playwright's reuseExistingServer was reusing litellm (which returned 404 for all /api/* routes), 
   causing the initial failures. 
 
2. repro_r10_postpage.spec.ts (2 tests) correctly fails without PROD_BASE_URL — these are opt-in regression guards run via npm run test:repro, not part of the default npm run test:e2e gate. 
 
3. live_extended.spec.ts (16 tests) correctly skipped — opt-in via LIVE_BASE_URL or PROD_BASE_URL.

