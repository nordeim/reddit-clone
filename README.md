# embers

**A Reddit-style community feed.** Client-only SPA + an enterprise backend
monorepo.

## Repository Layout (npm workspaces)

```
reddit-clone/
├── apps/
│   ├── web/          ← @embers/web — the original client-only React SPA
│   │                   (HashRouter, vite-plugin-singlefile, 176 tests)
│   └── server/       ← @embers/server — Fastify REST API + auth + FTS5 search
│                       (95 tests, /health, /api/auth, /api/posts,
│                        /api/communities, /api/votes, /api/comments,
│                        /api/search, /api/notifications)
├── packages/
│   ├── shared/       ← @embers/shared — Zod schemas + branded IDs (67 tests)
│   └── db/           ← @embers/db — Drizzle ORM + SQLite + FTS5 + seed (29 tests)
├── docs/             ← REMEDIATION_EXECUTION_PLAN.md (B0–B16 status),
│                       REMEDIATION_PLAN_2.md (B17–B24 deferred),
│                       Project-Architecture-Document.md, AGENTS.md, etc.
├── skills/           ← local skill library (198 skills, see skills-catalog.md)
└── package.json      ← root workspaces config + fan-out scripts
```

## Quick Start

```bash
# 1. Install dependencies at the workspace root
npm install

# 2. Run the client SPA dev server (apps/web)
npm run dev --workspace @embers/web

# 3. (Backend) Apply migrations + seed dev.db, then start the server
npm run db:migrate --workspace @embers/db
npm run db:seed    --workspace @embers/db
npm run dev        --workspace @embers/server   # http://localhost:4000
```

**Verify:**
- Client: `http://localhost:5173` — the embers feed (320 posts across 18 communities)
- Server: `curl http://localhost:4000/health` → `{"status":"ok",…}`
- Demo login (server): `POST /api/auth/login` with `{"username":"you","password":"embers-demo"}`

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

The Dockerfile is a multi-stage Node 20 build that produces a production image
for `@embers/server` only. The client SPA is not containerised — it is built
separately via `npm run build --workspace @embers/web` and served from a static
host (ADR-003 single-file build is still in force for the client).

## Test Status

| Workspace | Tests | Command |
|-----------|-------|---------|
| `@embers/web` | 176 | `npm test --workspace @embers/web` |
| `@embers/shared` | 67 | `npm test --workspace @embers/shared` |
| `@embers/db` | 29 | `npm test --workspace @embers/db` |
| `@embers/server` | 95 | `npm test --workspace @embers/server` |
| **Vitest total** | **367** | `npm test --workspaces --if-present` |
| E2E (Playwright) | 9 | `npm run test:e2e` |

All 367 vitest tests + 9 Playwright E2E smoke tests pass as of Round 3 (2026-08-10).
See `docs/REMEDIATION_EXECUTION_PLAN.md` §9 for the Round 3 changelog (test fix,
`dist/` untracking, B23 Docker + CI, B24 Playwright).

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

**Deferred (B17–B24, see `docs/REMEDIATION_EXECUTION_PLAN.md` §5):**
- ADR-105 — React Query + Zustand split (requires breaking client refactor)
- ADR-106 — BrowserRouter + chunked Vite build (requires removing single-file)
- B17–B22 — Frontend integration (React Query, Axios, optimistic UI, auth-aware UI)
- ~~B23 — Docker, GitHub Actions~~ **Done in Round 3** (see `Dockerfile`, `docker-compose.yml`, `.github/workflows/ci.yml`)
- ~~B24 — Playwright E2E~~ **Done in Round 3** (see `e2e/smoke.spec.ts`, `playwright.config.ts`)

## Documentation Map

| Document | Purpose |
|----------|---------|
| `README.md` (this file) | Monorepo overview + quick start + test status |
| `AGENTS.md` | Deep codebase reference (data layer, state, routes) |
| `CLAUDE.md` | Daily implementation conventions (TS, build, testing) |
| `docs/Project-Architecture-Document.md` | Master PAD — full architecture + ADRs |
| `docs/REMEDIATION_EXECUTION_PLAN.md` | Active execution plan (B0–B16 done, B17–B24 deferred) |
| `docs/REMEDIATION_PLAN_2.md` | Original 10-ADR remediation proposal (status annotations added) |
| `docs/IMPLEMENTATION_PLAN.md` | Original greenfield plan that produced `apps/web` |
| `docs/MANUAL_QA.md` | Manual QA matrix for the client SPA |

## License

No license file is included. All rights reserved by the author.

---

## Below: original client-SPA README (preserved for historical context)

---



## Overview

embers is a self-contained Reddit clone that runs entirely in the browser. Every user, community, post, comment, and notification is generated deterministically at page load using seeded PRNGs — no server, no API, no `fetch` calls. Vote, comment, save, create posts, and toggle dark mode; your state persists in `localStorage`. Built with React 19, Vite 7, Tailwind CSS v4, and Zustand.

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

# 3. Start the dev server
npm run dev
```

**Verify:** Open `http://localhost:5173`. You should see the embers feed with 320 posts across 18 communities.

```bash
# Production build (outputs dist/index.html)
npm run build

# Preview the production build
npm run preview

# Typecheck
npm run typecheck

# Run the test suite (Vitest + Testing Library)
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
| Icons | lucide-react | 1.30.x |
| Utilities | clsx + tailwind-merge | 2.1.1 / 3.4.0 |
| Single-file | vite-plugin-singlefile | 2.3.0 |
| Testing | vitest + @testing-library/react | 2.1.9 / 16.x |
| Test env | jsdom | 25.x |

Tests are colocated with source as `*.test.ts(x)`. The vitest config lives in `vitest.config.ts` (kept separate from `vite.config.ts` to avoid a type clash between the project's `vite` package and the `vite` bundled inside `vitest`). No ESLint.

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
