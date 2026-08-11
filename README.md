# embers

**A Reddit-style community feed.** Client-only SPA + an enterprise backend
monorepo.

## Repository Layout (npm workspaces)

```
reddit-clone/
├── apps/
│   ├── web/          ← @embers/web — the original client-only React SPA
│   │                   (HashRouter, vite-plugin-singlefile, 271 tests;
│   │                    includes `src/lib/api.ts` foundational fetch client
│   │                    added in Round 5, `src/auth/AuthProvider.tsx` React
│   │                    context + `useAuth()` hook + 401 refresh-and-retry
│   │                    added in Round 6 B18, `src/pages/LoginPage.tsx`
│   │                    real /login form (Round 6), `src/pages/RegisterPage.tsx`
│   │                    real /register form (Round 7), `src/auth/RequireAuth.tsx`
│   │                    route guard (Round 7), auth-aware Navbar (Round 7))
│   └── server/       ← @embers/server — Fastify REST API + auth + FTS5 search
│                       (95 tests, /health, /api/auth, /api/posts,
│                        /api/communities, /api/votes, /api/comments,
│                        /api/search, /api/notifications)
├── packages/
│   ├── shared/       ← @embers/shared — Zod schemas + branded IDs (70 tests)
│   └── db/           ← @embers/db — Drizzle ORM + SQLite + FTS5 + seed (30 tests)
├── docs/             ← REMEDIATION_EXECUTION_PLAN.md (B0–B16 done, B17–B22 deferred),
│                       REMEDIATION_PLAN_ROUND_5.md (B17–B22 TDD breakdown),
│                       REMEDIATION_PLAN_ROUND_6.md (B18 auth provider),
│                       REMEDIATION_PLAN_ROUND_7.md (B18 completion),
│                       Project-Architecture-Document.md, etc.
├── e2e/              ← Playwright E2E: smoke.spec.ts (9) + auth.spec.ts (9)
├── Dockerfile        ← Multi-stage Node 20 production build for @embers/server
├── docker-compose.yml ← Local container orchestration (port 4000)
├── .github/           ← CI workflow (lint → typecheck → test → build → e2e)
└── package.json      ← root workspaces config + fan-out scripts
```

## Quick Start

```bash
# 1. Install dependencies at the workspace root
npm install

# 2. Run the client SPA dev server (apps/web)
npm run dev --workspace @embers/web      # http://localhost:5173

# 3. (Backend) Apply migrations + seed dev.db, then start the server
npm run db:migrate
npm run db:seed
npm run dev        --workspace @embers/server   # http://localhost:4000
```

**Verify:**
- Client: `http://localhost:5173` — the embers feed (320 posts across 18 communities, generated deterministically in-browser)
- Server: `curl http://localhost:4000/health` → `{"status":"ok",…}`
- Demo login (server): `POST /api/auth/login` with `{"username":"you","password":"embers-demo"}` → access token + refresh cookie
- All tests pass: `npm test` (466 vitest + 18 Playwright E2E; plus 30 opt-in live-audit E2E — see Test Status)

### Quick Start (Docker)

```bash
# 1. Create a .env file with the required production secrets
cat > .env <<EOF
JWT_ACCESS_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
CORS_ORIGIN=http://localhost:5173
EOF

# 2. Build and start the server container (port 4000, persistent SQLite volume)
docker compose up --build -d

# 3. Verify
curl http://localhost:4000/health   # → {"status":"ok",…}
docker compose logs -f embers-server

# 4. Stop and remove the container (volume persists)
docker compose down
```

## New Deployment

Get both the backend API and the frontend SPA running from a fresh
`git clone`. The two run on separate ports — start the backend first,
then the frontend.

### 1. Backend (API Server)

```bash
# Clone and install
git clone <repo-url>
cd reddit-clone
npm install

# Initialize the database (runs migrations + seeds demo data)
npm run db:setup
# → Creates packages/db/dev.db
# → Applies 7 tables + FTS5 virtual tables + sync triggers
# → Seeds 49 users, 18 communities, 320 posts, ~3037 comments, 18 notifications
# → Demo user: 'you' / 'embers-demo'

# Start the API server on port 5000
npm run server:start
# → Fastify listening at http://localhost:5000
```

### Environment Variables

The server reads configuration from environment variables, loaded from `.env`
and `.env.local` files in the repo root (via `dotenv`). Precedence (highest →
lowest):

1. Shell env vars (command line — e.g. `PORT=5000 npm run server:start`)
2. `.env.local` (local dev overrides — gitignored)
3. `.env` (base values / production secrets — gitignored)
4. `loadEnv()` defaults (dev/test safe defaults)

```bash
# 1. Create your local env files
cp .env.example .env
cp .env.local.example .env.local

# 2. Fill in production secrets in .env (required when NODE_ENV=production)
#    JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, CORS_ORIGIN
#    Generate secrets: openssl rand -hex 32
```

The web app (`apps/web`) uses Vite's built-in `.env` support. To override
the API base URL, add to `.env.local`:
```
VITE_API_URL=http://localhost:5000
```

### 2. Frontend (React SPA)

Open a **second terminal** (the backend must keep running), then:

```bash
# From the repo root — start the client dev server
npm run dev --workspace @embers/web
# → Vite listening at http://localhost:5173
```

Open **`http://localhost:5173`** in a browser — that's the Reddit-style
SPA with the feed, voting, comments, communities, and dark mode.

### 3. Production Deployment

For production, build both workspaces and run the compiled backend (`node dist/index.js`)
instead of the dev server (`tsx watch`). The production server reads `NODE_ENV=production`
from the environment — Fastify then enables HSTS hardening and `loadEnv()` requires
all production secrets to be present.

```bash
# 1. Build all workspaces (topological: shared → db → server → web)
npm run build
# → apps/server/dist/index.js  (Fastify production bundle)
# → apps/web/dist/index.html    (single-file SPA, ~525 KB)

# 2. Initialize the database (if not already done)
npm run db:setup

# 3. Fill in production secrets in .env (required when NODE_ENV=production)
#    JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, CORS_ORIGIN
#    Generate secrets: openssl rand -hex 32

# 4. Start the backend in production mode (port 5000)
npm run server:start-prod
# → Fastify listening at http://localhost:5000 (NODE_ENV=production)

# 5. Serve the frontend from a web root
#    HashRouter means no server rewrite rules needed.
#    Any static host works: nginx, S3, GitHub Pages, `python -m http.server`.
cp -r apps/web/dist/* /var/www/html/
```

Verify the production deployment:

```bash
# Health check
curl http://localhost:5000/health
# → {"status":"ok","timestamp":"...","uptime":...}

# Production secrets are enforced — this will fail without them:
# (server refuses to start if JWT_ACCESS_SECRET or JWT_REFRESH_SECRET
#  are missing or shorter than 32 chars, per loadEnv())
```

| Variable | Required | Notes |
|---|---|---|
| `JWT_ACCESS_SECRET` | Yes | Min 32 chars |
| `JWT_REFRESH_SECRET` | Yes | Min 32 chars |
| `CORS_ORIGIN` | Yes | Your frontend origin |
| `DATABASE_URL` | No | Defaults to `packages/db/dev.db` |
| `PORT` | No | Defaults to 5000 |

### Architecture

```
Browser ──http://localhost:5173──→ React SPA (apps/web)
                                      │
                                      ├── Deterministic data layer (no backend needed):
                                      │   48 users, 320 posts, 18 communities,
                                      │   per-post comment trees, 18 notifications
                                      │
                                      └── Auth flow (B18) calls the API:
                                          POST /api/auth/login
                                          POST /api/auth/register
                                          GET  /api/notifications  (protected)
                 ──http://localhost:5000──→ Fastify API (apps/server)
                                          │
                                          └── SQLite (packages/db/dev.db)
```

### Verify Both Servers

```bash
# Backend health
curl http://localhost:5000/health
# → {"status":"ok","timestamp":"...","uptime":...}

# Backend demo login
curl -X POST http://localhost:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"you","password":"embers-demo"}'
# → {"accessToken":"eyJ...","user":{...}}

# Backend feed
curl http://localhost:5000/api/posts
# → {"data":[...],"nextCursor":...}

# Frontend — open in browser
# http://localhost:5173
```

### What Each Script Does

| Script | Purpose |
|---|---|
| `npm run db:setup` | Migrate + seed the SQLite database |
| `npm run db:migrate` | Apply Drizzle migrations only |
| `npm run db:seed` | Seed deterministic demo data only |
| `npm run server:start` | Start Fastify API on port 5000 in **development** mode (`tsx watch`, `NODE_ENV=development`) |
| `npm run server:prod` | Start Fastify API in **production** mode (`node dist/index.js`, bare) |
| `npm run server:start-prod` | Start Fastify API on port 5000 in **production** mode (explicit env: `NODE_ENV=production`) |
| `npm run dev --workspace @embers/web` | Start Vite dev server on port 5173 |

### Production Deployment

See **§3. Production Deployment** above for the full production walkthrough
(`npm run build` → `npm run server:start-prod` → serve `apps/web/dist/*`).
The key difference from development: the production server runs the compiled
`node dist/index.js` bundle (not `tsx watch`) with `NODE_ENV=production`, which
enables HSTS hardening and requires all production secrets via `loadEnv()`.

### Run All Quality Gates Before Deploying

```bash
npm run lint        # ESLint — 0 errors, 0 warnings
npm run typecheck   # tsc --noEmit — all 4 workspaces clean
npm test            # 466 vitest tests (pretest auto-builds shared + db)
npm run build       # topological build — all workspaces succeed
```

The Dockerfile is a multi-stage Node 20 build that produces a production image
for `@embers/server` only. The client SPA is not containerised — it is built
separately via `npm run build --workspace @embers/web` and served from a static
host (ADR-003 single-file build is still in force for the client).

## Test Status

| Workspace | Tests | Command |
|-----------|-------|---------|
| `@embers/web` | 271 | `npm test --workspace @embers/web` |
| `@embers/shared` | 70 | `npm test --workspace @embers/shared` |
| `@embers/db` | 30 | `npm test --workspace @embers/db` |
| `@embers/server` | 95 | `npm test --workspace @embers/server` |
| **Vitest total** | **466** | `npm test --workspaces --if-present` |
| E2E — local API (Playwright) | 18 | `npm run test:e2e` |
| E2E — live audit, Round 8 (opt-in) | 12 | `LIVE_BASE_URL=… npm run test:e2e:live` |
| E2E — extended live, Round 10 (opt-in) | 16 | `npm run test:local-prod` |
| E2E — repro regression, Round 10 (opt-in) | 2 | `npm run test:repro` |
| Production-build check | 1 script | `npm run test:build` |
| Fresh-clone typecheck | 1 script | `npm run test:fresh-clone` |
| Lint (ESLint) | 0 errors, 0 warnings | `npm run lint` |

All 466 vitest tests + 18 Playwright E2E tests pass (`npm test` — do NOT
run `vitest run` from root; it won't discover workspace configs), ESLint is
clean, and typecheck + build succeed as of Round 8 (2026-08-10).

> **Run tests correctly:** always use `npm test` (which triggers `pretest`)
to build `@embers/shared` + `@embers/db` first via `--workspaces`). Running
`vitest run` directly from root discovers 0 workspace configs.
>
> **R8.1 -- `npm run typecheck` works on a fresh clone too:** a `pretypecheck`
> hook (added in Round 8) mirrors `pretest` and builds `@embers/shared` +
> `@embers/db` before invoking `tsc --noEmit` on each workspace. Verify with
> `npm run test:fresh-clone`.
>
> **R8.3 -- Live-deployment audit is opt-in:** `e2e/live.spec.ts` is excluded
> from `npm run test:e2e` (it would add 12 always-skipped tests). Run it
> explicitly via `LIVE_BASE_URL=https://reddit.jesspete.shop/ npm run test:e2e:live`.
>
> **R10.4 — Round 10 extended the live-audit E2E coverage:**
> - `e2e/live_extended.spec.ts` (16 tests) — broader live-deployment assertions;
>   run via `npm run test:local-prod` (uses `playwright.local-prod.config.ts`).
> - `e2e/repro_r10_postpage.spec.ts` (2 tests) — regression guard for the
>   BUG-R10-2 PostPage crash; run via `npm run test:repro` (uses
>   `playwright.repro.config.ts`).
> Total opt-in E2E count is now 12 + 16 + 2 = 30 (Round 8 live-audit +
> Round 10 extended-live + Round 10 repro regression).

Round 8 (2026-08-10) was a **live-deployment audit + codebase hardening**
round. A browser-based E2E audit against `https://reddit.jesspete.shop/`
surfaced 3 critical deployment gaps (Vite dev server exposed in production,
no Fastify backend reachable, no security headers) -- documented in
`docs/REMEDIATION_PLAN_ROUND_8.md`. Round 8 hardens the repository to
prevent these gaps from recurring: added `pretypecheck` script,
`scripts/verify-fresh-clone-typecheck.mjs`, `scripts/verify-production-build.mjs`,
`e2e/live.spec.ts` (opt-in), and silenced all 6 React `act()` warnings in
`LoginPage` + `RegisterPage` tests. No new vitest tests; the deferred
B17 / B19--B22 status is unchanged.

## Live Deployment

The embers SPA is deployed at **`https://reddit.jesspete.shop/`**.

### Known gaps (re-audited 2026-08-10, see `docs/REMEDIATION_PLAN_ROUND_8.md` + `docs/REMEDIATION_PLAN_ROUND_9.md`)

| ID | Severity | Status | Gap | Operator fix |
|----|----------|--------|-----|--------------|
| LIVE-CRIT-1 | Critical | **FIXED** (2026-08-10) | The live site was serving the Vite dev server. | Now resolved -- the live site serves a 537 KB production build (no `/@react-refresh` or `/@vite/client` in the HTML). Verified by `e2e/live.spec.ts` test #1. |
| LIVE-CRIT-2 | Critical | **Still broken** | The Fastify backend is **not reachable** from the live URL. `/api/posts`, `/api/communities`, `/api/search`, `/health` all return HTTP 404 (335 bytes, `text/html`). `/api/auth/login` returns HTTP 501. | Start the Fastify backend (`npm run server:start-prod` or `docker compose up`) and configure the reverse proxy to route `/api/*` and `/health` to the Fastify port (5000). |
| LIVE-CRIT-3 | Critical | **Still broken** | No production security headers are set (CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy all absent). | Add the 5 required security headers at the CDN/reverse-proxy layer. Fastify Helmet already sets them on the backend -- the proxy must not strip them. |
| LIVE-CRIT-4 | Critical | **New (Round 9)** | `/api/auth/login` returns HTTP 501 (Not Implemented) instead of 404 or 200. This suggests the reverse proxy has a partial route to the backend but the route is misconfigured. | Investigate the reverse proxy config -- the `/api/auth/*` route may be pointing to the wrong upstream or the backend may not be running. All other `/api/*` routes return 404 (SPA fallback), but `/api/auth/login` returns 501 (proxy error). |
| LIVE-HIGH-2 | High | **Still broken** | `/api/*` requests receive a Python 404 error page (not the SPA `index.html`) instead of JSON, masking API failures. | Configure the reverse proxy to return 502/503 when the backend is down, not a generic 404. Ensure the Fastify backend is running and reachable. |

### SECRET ROTATION REQUIRED (R9.1, 2026-08-10)

**A `.env` file containing real JWT signing secrets was committed to git history** (commits `89f1012` and `526a836`) and pushed to GitHub. The secrets have been removed from the current commit (R9.1), but **they remain in the git history**.

**The operator MUST rotate the following secrets immediately:**
- `JWT_ACCESS_SECRET` (was: a 64-hex-char value, committed in plain text)
- `JWT_REFRESH_SECRET` (was: the same value as JWT_ACCESS_SECRET -- both were identical)

**How to rotate:**
1. Generate new secrets: `openssl rand -hex 32` (run twice -- use a DIFFERENT value for each)
2. Update `.env` (local, gitignored): set `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` to the new values
3. Restart the Fastify backend: `npm run server:start-prod`
4. All existing JWT tokens become invalid -- users must log in again

See `docs/SECRET_ROTATION_GUIDE.md` for the full step-by-step guide.
See `docs/REMEDIATION_PLAN_ROUND_9.md` for the full incident report and remediation plan.

### Round 10 status (2026-08-10)

Round 10 was a **comprehensive audit-driven remediation round** responding
to two fresh audit reports (`docs/audit_report_1.md`, `docs/audit_report_2.md`).
See `docs/REMEDIATION_PLAN_ROUND_10.md` for the full plan.

**Client-side bug fixes (live after the operator redeploys):**

| ID | Fix | Status |
|----|-----|--------|
| BUG-R10-2 | `PostPage` React error #185 crash (crash when navigating to a post detail page) | Fixed via TDD |
| BUG-R10-3 | `NotFoundPage` did not render the `404` text expected by users | Fixed via TDD |
| BUG-R10-4 | Mobile horizontal overflow (page exceeded viewport width on small screens) | Fixed via TDD |
| BUG-R10-5 | `RegisterPage` accepted mismatched passwords (no validation) | Fixed via TDD |

These four fixes are committed but **will only be live after the operator
rebuilds (`npm run build --workspace @embers/web`) and redeploys the SPA**
to `https://reddit.jesspete.shop/`.

**R9.1 regression — secrets re-leaked in commit `e09e425`:** After Round 9
had removed `.env` + `env.bak` from git tracking (R9.1), they were
accidentally re-added to tracking in commit `e09e425 add auti reports`.
Round 10 removed them again via `git rm --cached .env env.bak`. **The
secrets are STILL in git history** — now in three commits: `89f1012`,
`526a836`, AND `e09e425`.

**The operator MUST rotate `JWT_ACCESS_SECRET` + `JWT_REFRESH_SECRET` again**
(even if they were already rotated after Round 9). The leaked secrets in
`e09e425` are the same ones Round 9 warned about. See
`docs/SECRET_ROTATION_GUIDE.md` for the step-by-step guide. Round 10 did
NOT rewrite git history (force-push risk) — rotation remains the primary
remediation.

**Other Round 10 changes (repo-side, not deployment-side):**

- `docs/REMEDIATION_PLAN.md` aligned with the codebase — removed tRPC /
  pnpm / Turborepo / RS256 / UUID drift called out by `audit_report_2`
  findings F1-F4.
- New `npm run test:plan-alignment` CI gate
  (`scripts/verify-plan-alignment.mjs`) asserts the plan never re-drifts.
- New E2E: `e2e/live_extended.spec.ts` (16 tests) +
  `e2e/repro_r10_postpage.spec.ts` (2 regression-guard tests), via
  `npm run test:local-prod` and `npm run test:repro`.
- Vitest count: 453 → 462 (+9 new `@embers/web` tests; web suite 262 → 271).

#### Round 11 (2026-08-12) — audit-driven doc + schema reconciliation

- Triggered by validating `audit_report_1.md`, `audit_report_2.md`, and a
  fresh Mode-C audit (`docs/session_11.md`) against the codebase. 9 findings
  (1 High, 2 Medium, 3 Low, 3 Informational), all fixed.
- **TDD code changes:** (F2) added migration
  `packages/db/src/migrations/0001_add_performance_indexes.sql` with three
  indexes claimed in `REMEDIATION_PLAN.md` §4.1 (`posts(community_id,
  created_at DESC)`, `comments(post_id)`, `notifications(user_id, read)`);
  mirrored in `packages/db/src/schema/index.ts` via Drizzle `index()`
  builders; +1 RED→GREEN test in `packages/db/src/client.test.ts`. (F3)
  added the missing `registerResponseSchema` to
  `packages/shared/src/api/index.ts` (canonical Zod schema for
  `POST /api/auth/register` 201 responses); +3 RED→GREEN tests in
  `packages/shared/src/api.test.ts`.
- **Doc fixes:** (F1) removed fabricated CSRF "double-submit cookie" claim
  from `REMEDIATION_PLAN.md` §5.2 — actual posture is Bearer tokens +
  `SameSite=Strict` cookie; (F4) corrected refresh-cookie `Path` from
  `/api/auth/refresh` → `/api/auth`; (F5) reconciled three divergent
  ID-strategy descriptions; (F6) added FTS5 → tsvector rewrite step to the
  Postgres escape hatch; (F7) fixed `session_10.md` route-count math
  (auth × 5 → auth × 4); (F8) ticked 11 5-Phase checkboxes that were
  already Done per the B0–B24 backlog; (F9) clarified Phase 1.4 — Prettier
  intentionally omitted (ESLint 9 flat config + `--fix` is the formatter).
- Vitest count: 462 → 466 (+4 new tests; db 29→30, shared 67→70).
- See `docs/REMEDIATION_PLAN_ROUND_11.md` for the full plan, TDD breakdown,
  and verification ledger.

### How to verify the live deployment

```bash
# Opt-in live audit (12 tests, ~30s):
LIVE_BASE_URL=https://reddit.jesspete.shop/ npm run test:e2e:live

# Or curl probes:
curl -sS -o /dev/null -w "%{http_code} %{content_type}\n" https://reddit.jesspete.shop/
curl -sS -o /dev/null -w "%{http_code} %{content_type}\n" https://reddit.jesspete.shop/api/posts
curl -sS -o /dev/null -w "%{http_code} %{content_type}\n" https://reddit.jesspete.shop/health
# Current state (2026-08-10): 200 text/html (SPA), 404 text/html (API broken), 404 text/html (health broken)
# Expected after fix:  200 text/html, 200 application/json, 200 application/json
```

### What works on the live site today

- The SPA is served as a **production build** (537 KB single-file HTML, no Vite dev modules). [Fixed in Round 9 -- was LIVE-CRIT-1]
- The deterministic SPA feed renders (8 articles on initial load, 48 after scroll).
- Dark-mode toggle persists to `localStorage` (zustand `persist`).
- Infinite scroll via `IntersectionObserver`.
- `/notifications` route guard redirects unauthenticated users to `/login`.
- No browser console errors on initial load.
- The HashRouter-based SPA works on any static host with no rewrite rules.

Round 7 completed B18: added `/register` page, auth-aware Navbar (replaced
hardcoded `CURRENT_USER` with `useAuth()`), `<RequireAuth>` route guard
(protecting `/notifications`), and 9 E2E auth lifecycle tests. The
`AuthUser` interface was widened to the full server shape (with
`displayName`, `karma`, etc.). 25 new web tests (11 RegisterPage + 8 Navbar
+ 5 RequireAuth + 1 api register-displayName) bring the web suite to 262.
See `docs/REMEDIATION_PLAN_ROUND_7.md` for the Round 7 changelog + 5-slice
TDD breakdown + the rationale for deferring B17 (build refactor) again.

## Architecture Decision Records

**Active for `apps/web` (the client SPA):**
- ADR-001 — Deterministic PRNG data generation (no backend)
- ADR-002 — Overlay pattern for user state (zustand persist)
- ADR-003 — Single-file build (`vite-plugin-singlefile`)
- ADR-004 — `HashRouter` for zero-config static hosting
- ADR-005 — Zustand `persist` middleware

**Active for `apps/server` + `packages/{shared,db}` (the backend):**
- ADR-101 — REST + Zod API contract (`@embers/shared`)
- ADR-102 — Fastify web framework
- ADR-103 — SQLite + Drizzle ORM (`packages/db`, WAL mode, busy_timeout=5000)
- ADR-104 — JWT auth (15m access + 7d refresh, HttpOnly cookies)
- ADR-107 — npm-workspaces monorepo
- ADR-108 — Transactional atomic vote counters (`UPDATE … SET col = col + delta`)
- ADR-109 — SQLite FTS5 virtual tables for full-text search
- ADR-110 — Pino structured logging + requestId correlation

**Deferred (B17–B22, see `docs/REMEDIATION_EXECUTION_PLAN.md` §5):**
- ADR-105 — React Query + Zustand split (requires breaking client refactor)
- ADR-106 — BrowserRouter + chunked Vite build (requires removing single-file)
- B17, B19–B22 — Build refactor, React Query, feeds/search wiring, optimistic UI, notification polling (depend on B17)

**Done in Rounds 6-7 (B18 — Auth Provider):**
- `apps/web/src/auth/AuthProvider.tsx` + `useAuth()` hook
- `apps/web/src/pages/LoginPage.tsx` real `/login` form
- `apps/web/src/pages/RegisterPage.tsx` real `/register` form
- `apps/web/src/auth/RequireAuth.tsx` route guard
- Auth-aware Navbar (replaced hardcoded `CURRENT_USER` with `useAuth()`)
- 401 refresh-and-retry in `lib/api.ts`
- 9 E2E auth lifecycle tests
- See `docs/REMEDIATION_PLAN_ROUND_6.md` and `docs/REMEDIATION_PLAN_ROUND_7.md`.

**Done in Round 3 (B23 + B24 — Docker + E2E):**
- `Dockerfile`, `docker-compose.yml`, `.github/workflows/ci.yml`
- `e2e/smoke.spec.ts`, `e2e/auth.spec.ts`, `playwright.config.ts`

## Documentation Map

| Document | Purpose |
|----------|---------|
| `README.md` (this file) | Monorepo overview + quick start + test status |
| `AGENTS.md` | Deep codebase reference (data layer, state, routes, auth) |
| `CLAUDE.md` | Daily implementation conventions (TS, build, testing) |
| `docs/Project-Architecture-Document.md` | Master PAD — full architecture + ADRs |
| `docs/REMEDIATION_EXECUTION_PLAN.md` | Active execution plan (B0–B16 done, B17–B22 deferred; B23+B24 done) |
| `docs/REMEDIATION_PLAN.md` | Master remediation plan (10 ADRs, B0–B24 backlog) |
| `docs/REMEDIATION_PLAN_ROUND_5.md` | Round 5 changelog + detailed B17–B22 TDD breakdown |
| `docs/REMEDIATION_PLAN_ROUND_6.md` | Round 6 changelog — B18 (Auth Provider) execution, 7-slice TDD breakdown |
| `docs/REMEDIATION_PLAN_ROUND_7.md` | Round 7 changelog — B18 completion (RegisterPage, auth-aware Navbar, RequireAuth, E2E auth lifecycle), 5-slice TDD breakdown + B17 deferral rationale |
| `docs/REMEDIATION_PLAN_ROUND_8.md` | Round 8 changelog -- live-deployment audit (3 critical gaps found) + codebase hardening (pretypecheck, test:build, test:fresh-clone, e2e/live.spec.ts, act() fixes), 6-item TDD breakdown |
| `docs/REMEDIATION_PLAN_2.md` | Original 10-ADR remediation proposal (status annotations added) |
| `docs/IMPLEMENTATION_PLAN.md` | Original greenfield plan that produced `apps/web` |
| `docs/MANUAL_QA.md` | Manual QA matrix for the client SPA |

## License

No license file is included. All rights reserved by the author.

---

## Below: original client-SPA README (preserved for historical context)

---



## Overview

embers is a Reddit-style community feed. The original client-only React SPA lives at `apps/web/`: every user, community, post, comment, and notification is generated deterministically at page load using seeded PRNGs. A Fastify REST API backend lives at `apps/server/` (with `packages/shared` + `packages/db`), added in the monorepo transition. The client's `src/lib/api.ts` provides a fetch-based API client — wired into the AuthProvider (B18) but not yet into the feeds/search pages (deferred B17–B22).

## Key Features

| | Feature | Detail |
|---|---------|--------|
| 🔀 | **Deterministic content** | 48 users, 18 communities, 320 posts, per-post comment trees — all generated from seeded PRNGs. Same seed = same content, every time. |
| ⬆️ | **Voting & scoring** | Upvote/downvote posts and comments. Score computed as `baseScore + vote`; generated data is never mutated. |
| 📝 | **Create content** | Publish text, link, or image posts. Write comments and nested replies. New content is prepended to the feed. |
| 🔄 | **Infinite scroll feed** | `IntersectionObserver`-driven paging (8 posts per page) with skeleton loading states. |
| 🎯 | **Feed scoping** | Home (joined communities), Popular, All, Explore — scope derived from the URL pathname. |
| 🔍 | **Search** | Full-text search across posts, communities, and users with tabbed results. |
| 🌙 | **Dark mode** | Custom Tailwind v4 dark variant, persisted to `localStorage`, toggled from the navbar. |
| 💾 | **Persistent state** | Votes, saves, created content, joined communities, theme — all survive page reloads via `localStorage`. |
| 📱 | **Responsive layout** | Three-column desktop layout (sidebar + feed + right panel), collapsible mobile drawer. |
| 📦 | **Single-file build** | `vite-plugin-singlefile` inlines everything into one `dist/index.html` — deployable anywhere. |

## Quick Start

**Requirements:** Node.js ≥20

```bash
# 1. Clone the repository
git clone <repo-url>
cd reddit-clone

# 2. Install dependencies
npm install

# 3. Start the client dev server
npm run dev --workspace @embers/web
```

**Verify:** Open `http://localhost:5173`. You should see the embers feed with 320 posts across 18 communities.

```bash
# Production build (all workspaces, topological order)
npm run build

# Typecheck (all workspaces)
npm run typecheck

# Lint (ESLint flat config — 0 errors, 0 warnings)
npm run lint

# Run the test suite (all workspaces — use npm test, NOT vitest run)
npm test
```

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| UI Runtime | React | 19.2.6 |
| Build Tool | Vite | 7.3.2 |
| Language | TypeScript | 5.9.3 (strict) |
| CSS | Tailwind CSS | 4.1.17 (CSS-first `@theme`) |
| Routing | react-router-dom | 7.18.2 (`HashRouter`) |
| State | zustand | 5.0.14 (`persist` middleware) |
| Animation | framer-motion | 13.x |
| Icons | lucide-react | 1.31.0 |
| Utilities | clsx + tailwind-merge | 2.1.1 / 3.4.0 |
| Single-file | vite-plugin-singlefile | 2.3.0 |
| Testing | vitest + @testing-library/react | 2.1.9 / 16.x |
| Test env | jsdom | 25.x |

Tests are colocated with source as `*.test.ts(x)`. The vitest config lives in `vitest.config.ts` (kept separate from `vite.config.ts` to avoid a type clash between the project's `vite` package and the `vite` bundled inside `vitest`). ESLint 9 flat config (`eslint.config.mjs` at repo root) was added in Round 4 — see the "ESLint Conventions (Round 4)" section of `CLAUDE.md`.

## Design System

### Typography

Inter (loaded from Google Fonts). Fallback chain: `ui-sans-serif, system-ui, -apple-system, sans-serif`.

### Colors

| Token | Light | Dark | Usage |
|---|---|---|---|
| Background | `zinc-50` | `zinc-950` | Page background |
| Surface | `white` | `zinc-900` | Cards, modals, sidebar |
| Text | `zinc-900` | `zinc-100` | Primary text |
| Accent | `orange-600` | `orange-500` | Active states, brand, upvotes |
| Downvote | `indigo-600` | `indigo-600` | Downvote button |
| Border | `zinc-200` | `zinc-800` | Card/section borders |

Dark mode uses a custom variant: `@custom-variant dark (&:where(.dark, .dark *));`

### Component Primitives

`Avatar` · `Button` (5 variants × 4 sizes) · `Modal` · `Dropdown` · `Skeleton` · `Toaster`

### Animation

`framer-motion` for layout transitions, enter/exit animations, and gesture feedback. Simulated latency (650ms feed, 500ms comments) paired with skeleton states for demo feel.

## Deployment

The production build outputs a single `dist/index.html` with all JS and CSS inlined. Because routing uses `HashRouter`, no server-side rewrite rules are needed.

**Works on any static host:**

```bash
npm run build
# Upload dist/ contents to your host of choice
```

| Host | Works | Notes |
|---|---|---|
| GitHub Pages | ✅ | Push `dist/` to `gh-pages` branch |
| Netlify / Vercel | ✅ | Deploy `dist/` as static site |
| S3 / R2 / GCS | ✅ | Upload `dist/` contents |
| `python -m http.server` | ✅ | Serve `dist/` from web root |
| `file://` protocol | ❌ | Breaks Google Fonts and images |

**External runtime dependencies:** Google Fonts (Inter), `public/images/*.jpg` (8 category images). These load over the network — serve from a web root for full functionality.

## File Hierarchy

```
├── index.html                  # HTML shell (title + root div + module script)
├── vite.config.ts              # Vite + React + Tailwind + singlefile
├── tsconfig.json               # Strict TypeScript config
├── package.json                # Dependencies + scripts
│
├── public/
│   └── images/                 # 8 category images (nature, tech, gaming, etc.)
│
└── src/
    ├── main.tsx                # Entry: StrictMode → createRoot → <App />
    ├── App.tsx                 # HashRouter + routes + theme toggle
    ├── index.css               # Tailwind, @theme, dark variant, .line-clamp
    │
    ├── types/index.ts          # All domain interfaces (User, Post, Comment, etc.)
    │
    ├── data/                   # Deterministic content generation (immutable)
    │   ├── users.ts            # 48 users + CURRENT_USER
    │   ├── communities.ts      # 18 communities
    │   ├── posts.ts            # 320 posts + sort algorithms
    │   ├── comments.ts         # Lazy per-post trees (max depth 4)
    │   ├── notifications.ts    # 18 notifications
    │   └── images.ts           # ImageCategory → URL mapping
    │
    ├── store/
    │   ├── store.ts            # Zustand store + persist middleware (schema-versioned + validated)
    │   ├── storage.ts          # safe JSON parse + persisted-state validation + merge helpers
    │   ├── selectors.ts        # pure selectors (visible score, unread count, badge cap, etc.)
    │   └── themeBootstrap.ts   # synchronous theme application before React mounts
    │
    ├── components/
    │   ├── ui/                 # Primitives: Avatar, Button, Modal, Dropdown, Skeleton, Toaster
    │   ├── layout/             # AppShell, Navbar, Sidebar, RightPanel, ErrorBoundary
    │   ├── notifications/      # NotificationsPanel
    │   ├── feed/               # PostCard, PostList, SortTabs, VoteControl, CreatePostModal
    │   ├── post/               # CommentThread, CommentComposer
    │   ├── community/          # CommunityHeader
    │   └── search/             # SearchBar (with keyboard nav + race-fix)
    │
    ├── auth/                   # AuthProvider (React context + useAuth), RequireAuth (route guard)
    ├── lib/                    # api.ts — fetch-based API client for the Fastify backend
    │
    ├── pages/                  # HomePage, CommunityPage, PostPage, ProfilePage,
    │                           #   SearchPage, NotificationsPage, NotFoundPage,
    │                           #   LoginPage, RegisterPage
    │
    ├── hooks/                  # useDebounce, useOnClickOutside, useInfiniteScroll, useFocusTrap
    ├── test/                   # setup.ts (jest-dom + jsdom stubs), utils.tsx (renderWithRouter)
    └── utils/                  # cn, format (with injectable `now`), random, score, search, url
```

## License

No license file is included. All rights reserved by the author.
