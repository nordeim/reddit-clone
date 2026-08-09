# embers

**A Reddit-style community feed — 100% client-side, zero backend.**

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
| Text | `zinc-900` | `zinc-50` | Primary text |
| Accent | `orange-600` | `orange-500` | Active states, brand, upvotes |
| Downvote | `indigo-600` | `indigo-500` | Downvote button |
| Border | `zinc-200` | `zinc-800` | Card/section borders |

Dark mode uses a custom variant: `@custom-variant dark (&:where(.dark, .dark *));`

### Component Primitives

`Avatar` · `Button` (5 variants × 4 sizes) · `Modal` · `Dropdown` · `Skeleton` · `Toaster` · `VoteControl` · `Card`

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
