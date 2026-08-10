# embers

**A Reddit-style community feed.** Client-only SPA + an enterprise backend
monorepo.

## Repository Layout (npm workspaces)

```
reddit-clone/
├── apps/
│   ├── web/          ← @embers/web — the original client-only React SPA
│   │                   (HashRouter, vite-plugin-singlefile, 262 tests;
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
│   ├── shared/       ← @embers/shared — Zod schemas + branded IDs (67 tests)
│   └── db/           ← @embers/db — Drizzle ORM + SQLite + FTS5 + seed (29 tests)
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
npm run db:migrate --workspace @embers/db
npm run db:seed    --workspace @embers/db
npm run dev        --workspace @embers/server   # http://localhost:4000
```

**Verify:**
- Client: `http://localhost:5173` — the embers feed (320 posts across 18 communities, generated deterministically in-browser)
- Server: `curl http://localhost:4000/health` → `{"status":"ok",…}`
- Demo login (server): `POST /api/auth/login` with `{"username":"you","password":"embers-demo"}` → access token + refresh cookie
- All tests pass: `npm test` (453 vitest + 18 Playwright E2E)

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

### 2. Frontend (React SPA)

Open a **second terminal** (the backend must keep running), then:

```bash
# From the repo root — start the client dev server
npm run dev --workspace @embers/web
# → Vite listening at http://localhost:5173
```

Open **`http://localhost:5173`** in a browser — that's the Reddit-style
SPA with the feed, voting, comments, communities, and dark mode.

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
| `npm run server:start` | Start Fastify API on port 5000 |
| `npm run dev --workspace @embers/web` | Start Vite dev server on port 5173 |

### Production Deployment

For a real deployment, build the SPA to static files and serve it from a
web root (no Vite dev server needed):

```bash
# Build the SPA (single-file output)
npm run build --workspace @embers/web
# → dist/index.html (~538 KB, all JS/CSS inlined)

# Serve dist/ from any web root
# (HashRouter means no server rewrite rules needed)
```

Start the backend with production secrets:

```bash
JWT_ACCESS_SECRET=$(openssl rand -hex 32) \
JWT_REFRESH_SECRET=$(openssl rand -hex 32) \
CORS_ORIGIN=https://your-frontend.com \
npm run server:start
```

| Variable | Required | Notes |
|---|---|---|
| `JWT_ACCESS_SECRET` | Yes | Min 32 chars |
| `JWT_REFRESH_SECRET` | Yes | Min 32 chars |
| `CORS_ORIGIN` | Yes | Your frontend origin |
| `DATABASE_URL` | No | Defaults to `packages/db/dev.db` |
| `PORT` | No | Defaults to 5000 |

### Run All Quality Gates Before Deploying

```bash
npm run lint        # ESLint — 0 errors, 0 warnings
npm run typecheck   # tsc --noEmit — all 4 workspaces clean
npm test            # 453 vitest tests (pretest auto-builds shared + db)
npm run build       # topological build — all workspaces succeed
```

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

The Dockerfile is a multi-stage Node 20 build that produces a production image
for `@embers/server` only. The client SPA is not containerised — it is built
separately via `npm run build --workspace @embers/web` and served from a static
host (ADR-003 single-file build is still in force for the client).

## Test Status

| Workspace | Tests | Command |
|-----------|-------|---------|
| `@embers/web` | 262 | `npm test --workspace @embers/web` |
| `@embers/shared` | 67 | `npm test --workspace @embers/shared` |
| `@embers/db` | 29 | `npm test --workspace @embers/db` |
| `@embers/server` | 95 | `npm test --workspace @embers/server` |
| **Vitest total** | **453** | `npm test --workspaces --if-present` |
| E2E (Playwright) | 18 | `npm run test:e2e` |
| Lint (ESLint) | 0 errors, 0 warnings | `npm run lint` |

All 453 vitest tests + 18 Playwright E2E tests pass (`npm test` — do NOT
run `vitest run` from root; it won't discover workspace configs), ESLint is
clean, and typecheck + build succeed as of Round 7 (2026-08-10).

> **Run tests correctly:** always use `npm test` (which triggers `pretest`
to build `@embers/shared` + `@embers/db` first via `--workspaces`). Running
`vitest run` directly from root discovers 0 workspace configs.

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
    ├── pages/                  # HomePage, CommunityPage, PostPage, ProfilePage,
    │                           #   SearchPage, NotificationsPage, NotFoundPage
    │
    ├── hooks/                  # useDebounce, useOnClickOutside, useInfiniteScroll, useFocusTrap
    ├── test/                   # setup.ts (jest-dom + jsdom stubs), utils.tsx (renderWithRouter)
    └── utils/                  # cn, format (with injectable `now`), random, score, search, url
```

## License

No license file is included. All rights reserved by the author.
