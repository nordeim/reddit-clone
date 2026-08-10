# embers — Master Project Architecture Document (PAD) v1.0

**Classification:** Internal Engineering Reference
**Status:** DEFINITIVE, PRODUCTION-LOCKED BLUEPRINT
**Companion Documents:** `AGENTS.md` (deep codebase reference), `CLAUDE.md` (daily implementation guide)
**Last Updated:** 2026-08-10 (Round 5 — doc-alignment, `pretest` script, `@vitest/coverage-v8`, foundational web API client)
**Audience:** Senior Engineers, Tech Leads, DevOps, and Onboarding Engineers
**Rule:** Every architectural decision in this document traces to a specific rationale.
           Nothing is here "because it's popular."

---

## Table of Contents

1. [System Overview & Decisions](#1-system-overview--decisions)
2. [High-Level System Topology](#2-high-level-system-topology)
3. [Application Architecture](#3-application-architecture)
4. [Data Architecture](#4-data-architecture)
5. [Design System Reference](#5-design-system-reference)
6. [Security Architecture](#6-security-architecture)
7. [Testing Strategy](#7-testing-strategy)
8. [Build & Deployment](#8-build--deployment)
9. [Developer Handbook](#9-developer-handbook)
10. [Known Issues & Outstanding Tasks](#10-known-issues--outstanding-tasks)
11. [Key Files Reference](#11-key-files-reference)
12. [Glossary](#12-glossary)

---

## 1. System Overview & Decisions

### 1.1 Document Metadata & Purpose

**embers** is a client-only Reddit-style community feed SPA. It has **no backend, no API, and no `fetch` calls**. Every piece of content — users, communities, posts, comments, notifications — is generated deterministically in the browser at module load time via seeded PRNGs.

This PAD serves as the single source of truth for:

- **New engineers:** Understand the architectural philosophy (deterministic data, overlay pattern, single-file build) before touching code.
- **Debugging:** Trace the data flow from seed → generation → store overlay → render.
- **Replication:** Rebuild this exact system elsewhere by following the layer model and ADRs.

### 1.2 Technology Stack Summary

| Layer | Technology | Version | Key Rationale |
|---|---|---|---|
| UI Runtime | React | 19.2.6 | Latest stable; strict mode, concurrent features |
| Build Tool | Vite | 7.3.2 | Native ESM, fast HMR, Rolldown bundler |
| Language | TypeScript | 5.9.3 | Strict mode; compile-time safety |
| CSS | Tailwind CSS | 4.1.17 | CSS-first `@theme`, no config file, Vite plugin |
| Routing | react-router-dom | 7.18.2 | `HashRouter` for zero-config static hosting |
| State | zustand | 5.0.14 | Minimal boilerplate; `persist` middleware for localStorage |
| Animation | framer-motion | 13.x | Layout animations, `AnimatePresence`, gesture support |
| Icons | lucide-react | 1.30.x | Consistent stroke-based icon set |
| Class merging | clsx + tailwind-merge | 2.1.1 / 3.4.0 | Conditional classes without specificity conflicts |
| Single-file | vite-plugin-singlefile | 2.3.0 | Inlines all JS/CSS into one HTML for portable deployment |

Test runner: Vitest 2.1.9 + Testing Library + jsdom. Linter: ESLint 9 flat
config (`eslint.config.mjs`) with `typescript-eslint` + `eslint-plugin-react`
+ `eslint-plugin-react-hooks` (added in Round 4, 2026-08-10). Playwright 1.62
for E2E smoke tests (added in Round 3).

### 1.3 Architecture Decision Records (ADRs)

#### ADR-001: Deterministic Data Generation Instead of Backend

- **Context:** The project is a self-contained demo product. It needs rich, realistic content (users, posts, comments) without a server, database, or API.
- **Decision:** All content is generated at import time via seeded PRNGs (FNV-1a hash → mulberry32) in `src/data/*`. Changing a seed string or the order of `rng` calls reshuffles everything deterministically.
- **Rationale:** Zero infrastructure. The app works offline, on any static host, with no cold start. Identical seeds produce identical content — critical for debugging and demo reproducibility.
- **Consequences:** (+) No network, no CORS, no rate limits. (+) Full offline support. (−) Content is static between reloads (no live updates). (−) Reseeding orphans persisted votes/saves keyed to old IDs.
- **Alternatives Rejected:** JSON fixtures (too verbose for 320 posts + comment trees). Third-party mock API (defeats client-only goal). Hardcoded arrays (unmaintainable).

#### ADR-002: Overlay Pattern for User State

- **Context:** Generated data must remain immutable (deterministic), but user actions (votes, saves, new posts) need to be reflected in the UI and persisted.
- **Decision:** User-mutable state lives in a separate zustand store slice (the "overlay") and is merged with generated data at render time. `votes[targetId]` overlays `post.score`; `localPosts` is prepended to `POSTS`.
- **Rationale:** Preserves immutability of generated data. Adding a new feature means adding a new overlay slice — never mutating `USERS`, `POSTS`, or `COMMUNITIES`.
- **Consequences:** (+) Clean separation of generated vs. user state. (+) Easy to add features. (−) Requires merge logic at every render site. (−) Vote keys must be namespaced (`post:` / `comment:`) to avoid collisions.
- **Alternatives Rejected:** Mutating generated data (breaks determinism). Derived selectors with React useMemo everywhere (too verbose for 320 posts).

#### ADR-003: Single-File Build with vite-plugin-singlefile

- **Context:** The app is a demo that must be trivially deployable — drag-and-drop onto any static host, no server config.
- **Decision:** `vite-plugin-singlefile` inlines all JS and CSS into a single `dist/index.html`. Code splitting is prohibited.
- **Rationale:** One file = zero routing config, zero MIME issues, zero cache-busting complexity. Host it on GitHub Pages, Netlify, S3, or `python -m http.server` — all work.
- **Consequences:** (+) Ultimate portability. (−) No `React.lazy` or dynamic imports. (−) Larger initial load (~528 KB). (−) No code splitting for performance.
- **Alternatives Rejected:** Standard multi-chunk build (breaks single-file goal). Server-side rendering (defeats client-only architecture).

#### ADR-004: HashRouter for Zero-Config Routing

- **Context:** Static hosts don't support SPA fallback routing (no `_redirects` or `rewrites`).
- **Decision:** `HashRouter` instead of `BrowserRouter`. Routes use `#/path` format.
- **Rationale:** Hash fragments are never sent to the server — all routing is client-side. Works on any static host without configuration.
- **Consequences:** (+) Works everywhere, no server rules. (−) URLs contain `#` (cosmetic). (−) No server-side rendering of routes.
- **Alternatives Rejected:** BrowserRouter (requires server fallback config). MemoryRouter (breaks deep linking).

#### ADR-005: Zustand with persist for State Management

- **Context:** The app needs lightweight global state (votes, saves, theme, toasts) with localStorage persistence and minimal boilerplate.
- **Decision:** Zustand with the `persist` middleware. Persisted to `localStorage` key `reddit-clone-state`. `partialize` whitelists exactly 8 fields; `toasts` is deliberately excluded.
- **Rationale:** Zustand is 1/3 the boilerplate of Redux, has no provider wrapping, and the `persist` middleware handles hydration automatically. The overlay pattern maps naturally to zustand slices.
- **Consequences:** (+) Minimal API surface. (+) No Provider component. (−) No built-in devtools (Redux DevTools). (−) No `version`/`migrate` — changed state shapes hydrate stale data.
- **Alternatives Rejected:** Redux Toolkit (overkill for this scale). React Context + useReducer (prop drilling, no persistence). Jotai (unnecessary atom complexity).

---

## 2. High-Level System Topology

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    React 19 SPA                           │   │
│  │                                                          │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │   │
│  │  │  HashRouter  │  │   Zustand    │  │  framer-motion │  │   │
│  │  │  (react-     │  │   Store      │  │  (animations)  │  │   │
│  │  │   router-    │  │   + persist  │  │                │  │   │
│  │  │   dom v7)    │  │   middleware │  │                │  │   │
│  │  └─────────────┘  └──────────────┘  └────────────────┘  │   │
│  │                                                          │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │              Data Layer (src/data/*)                │  │   │
│  │  │  Seeded PRNG (FNV-1a → mulberry32) generates:     │  │   │
│  │  │  • 48 users        • 320 posts                    │  │   │
│  │  │  • 18 communities  • per-post comment trees        │  │   │
│  │  │  • 18 notifications                               │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │                                                          │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │           Tailwind CSS v4 (CSS-first @theme)        │  │   │
│  │  │  Custom dark variant  •  .line-clamp-1/2/3         │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌────────────────────┐     ┌──────────────────────────────┐   │
│  │  localStorage      │     │  External Resources           │   │
│  │  Key: reddit-      │     │  • Google Fonts (Inter)       │   │
│  │  clone-state       │     │  • public/images/*.jpg (8)    │   │
│  │  (persisted store) │     │  • lucide-react icons (CDN    │   │
│  └────────────────────┘     │    not needed — bundled)      │   │
│                             └──────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**Runtime characteristics:**
- Single-page app. No SSR. No hydration mismatch risk.
- All "async" behavior is simulated with `setTimeout` (650ms feed load, 500ms comments).
- No WebSocket, no SSE, no real-time updates.
- Persistence: localStorage only. No IndexedDB, no cookies, no server sessions.

---

## 3. Application Architecture

### 3.1 The Layer Model

This project follows a strict overlay architecture. Generated data is sacred; user state is ephemeral overlay.

```
Layer 0: Generated Data (src/data/*) — IMMUTABLE
  Rule: Never write back. Never mutate. Treat as a read-only database.

Layer 1: Store Overlay (src/store/store.ts) — USER MUTABLE
  Rule: All user actions land here. Merge with Layer 0 at render time.

Layer 2: Routing (src/App.tsx) — DECLARATIVE
  Rule: HashRouter only. Route scope derived from pathname, not props.

Layer 3: Pages (src/pages/*) — COMPOSITION
  Rule: Pages compose components. They merge overlays with generated data here.

Layer 4: Components (src/components/*) — PRESENTATION
  Rule: Components receive data via props. They never import generated data directly
        (except VoteControl which receives targetId + baseScore).

Layer 5: Utilities (src/utils/*) — PURE FUNCTIONS
  Rule: No side effects. No React imports. Testable in isolation.
```

### 3.2 Annotated Directory Structure

```
src/
├── main.tsx                    # Entry: StrictMode → createRoot → <App />
├── App.tsx                     # HashRouter + routes + .dark theme toggle
├── index.css                   # @import Inter → @tailwindcss → @theme → .line-clamp
│
├── types/
│   └── index.ts                # All interfaces: User, Post, Comment, Community, etc.
│
├── data/                       # ← LAYER 0: Generated immutable content
│   ├── users.ts                # 48 users (seed: users-seed-v1) + CURRENT_USER
│   ├── communities.ts          # 18 communities (seed: community-${name})
│   ├── posts.ts                # 320 posts (seed: posts-seed-v2) + sortPosts()
│   ├── comments.ts             # Lazy per-post trees (seed: comments-${postId}), max depth 4
│   ├── notifications.ts        # 18 notifications (seed: notifications-seed-v1)
│   └── images.ts               # ImageCategory → /images/*.jpg mapping
│
├── store/
│   ├── store.ts                # ← LAYER 1: Zustand store + persist middleware
│   ├── storage.ts              # safe JSON parse + persisted-state validation + merge helpers
│   ├── selectors.ts            # pure selectors (visible score, unread count, badge cap, etc.)
│   └── themeBootstrap.ts       # synchronous theme application before React mounts
│
├── lib/
│   └── api.ts                  # Foundational fetch-based API client (Round 5) — basis for B17–B22
│
├── hooks/
│   ├── index.ts                # useDebounce, useOnClickOutside, useInfiniteScroll
│   └── useFocusTrap.ts         # focus trap for Modal/Drawer overlays (Tab cycle, Escape, focus return)
│
├── utils/
│   ├── cn.ts                   # clsx + tailwind-merge
│   ├── format.ts               # timeAgo, formatCount, formatFullDate
│   ├── random.ts               # hashString, seededRandom, createRng, gradientFor
│   ├── score.ts                # getVisibleScore, hotScore, risingScore, sortPosts
│   ├── search.ts               # normalizeQuery, matchScore, searchPosts/Communities/Users
│   └── url.ts                  # isSafeUrl, extractDomain
│
├── components/
│   ├── ui/                     # ← Primitives (no business logic)
│   │   ├── Avatar.tsx          # Gradient avatar (seed → gradientFor → initials/emoji)
│   │   ├── Button.tsx          # forwardRef, variant × size lookup maps
│   │   ├── Dropdown.tsx        # Render-props pattern (trigger + children)
│   │   ├── Modal.tsx           # createPortal → document.body, AnimatePresence
│   │   ├── Skeleton.tsx        # animate-pulse placeholders + PostCardSkeleton
│   │   └── Toaster.tsx         # Bottom-right toast stack, auto-dismiss 3200ms
│   │
│   ├── layout/                 # ← Structural components
│   │   ├── AppShell.tsx        # Navbar + Sidebar + <Outlet /> + Toaster
│   │   ├── Navbar.tsx          # Sticky header: logo, search, create, theme, notifications, account
│   │   ├── Sidebar.tsx         # Nav links + joined communities + all communities; mobile drawer
│   │   ├── RightPanel.tsx      # Trending communities, about footer (hidden < xl)
│   └── ErrorBoundary.tsx    # Class component wrapping <Outlet />, catches render-time errors
│   │
│   ├── feed/                   # ← Post display + interaction
│   │   ├── PostCard.tsx        # Post preview: vote, community, author, title, actions
│   │   ├── PostList.tsx        # Infinite scroll feed: PAGE_SIZE=8, 650ms simulated load
│   │   ├── SortTabs.tsx        # best / hot / new / top / rising
│   │   ├── VoteControl.tsx     # Up/down vote with baseScore + vote display
│   │   └── CreatePostModal.tsx # New post form (text/image/link), generates local-${Date.now()}
│   │
│   ├── post/                   # ← Comment thread display
│   │   ├── CommentThread.tsx   # Recursive comment tree, collapsible, reply composer
│   │   └── CommentComposer.tsx # Textarea + submit for new comments
│   │
│   ├── community/
│   │   └── CommunityHeader.tsx # Community banner: icon, title, member count, join button
│   │
│   ├── search/
│   │   └── SearchBar.tsx       # Full-text search with keyboard nav + race-fix
│
│   ├── notifications/
│   │   └── NotificationsPanel.tsx # Notification list with All/Unread tabs + mark-read
│
├── pages/
│   ├── HomePage.tsx            # /, /popular, /all, /explore — scope from pathname
│   ├── CommunityPage.tsx       # /r/:name — community feed + header
│   ├── PostPage.tsx            # /comments/:postId — post detail + comment tree
│   ├── ProfilePage.tsx         # /u/:username — user profile (posts, comments, saved, about)
│   ├── SearchPage.tsx          # /search?q= — tabs: posts, communities, users
│   ├── NotificationsPage.tsx   # /notifications — full notification list
│   └── NotFoundPage.tsx        # * — catch-all 404
```

### 3.3 Critical Code Patterns

#### Pattern 1: Seeded Deterministic Generation

```typescript
// src/utils/random.ts — The foundation of all content.
// FNV-1a hash converts any string seed to a 32-bit integer.
// mulberry32 converts that integer to a deterministic [0, 1) float stream.

export function hashString(input: string): number {
  let hash = 2166136261;  // FNV offset basis
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);  // FNV prime
  }
  return hash >>> 0;  // Unsigned 32-bit
}

export function seededRandom(seed: number): () => number {
  let a = seed || 1;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// createRng wraps the generator with ergonomic helpers (int, pick, picks, bool).
// Every data module calls createRng("seed-string") at module scope.
// The SAME seed ALWAYS produces the SAME content — this is the contract.
```

**Why this pattern:** Identical seeds → identical content. Changing a seed reshuffles everything, which is why persisted votes keyed to old IDs get orphaned. The `order of rng calls` matters as much as the seed itself.

#### Pattern 2: Overlay Merge at Render

```typescript
// src/pages/HomePage.tsx — The canonical overlay pattern.
// Generated data (POSTS) is immutable. User data (localPosts) is prepended.

export function HomePage() {
  const localPosts = useAppStore((s) => s.localPosts);  // Overlay slice
  const joinedIds = useAppStore((s) => s.joinedCommunityIds);  // Another overlay

  // Merge: local posts first, then generated posts
  const combined = useMemo(() => [...localPosts, ...POSTS], [localPosts]);

  // Apply scope filter (home = joined only, popular/all = everything)
  const scoped = useMemo(() => {
    if (scope === "home" && joinedIds.length > 0) {
      return combined.filter((p) => joinedIds.includes(p.communityId));
    }
    return combined;
  }, [combined, scope, joinedIds]);

  // Sort via deterministic algorithm (hot, best, new, top, rising)
  const sorted = useMemo(() => sortPosts(scoped, sort), [scoped, sort]);
  // ...
}
```

**Why this pattern:** Generated data stays pure. User actions are additive. The merge logic is explicit and co-located with the page.

#### Pattern 3: Namespaced Vote Keys

```typescript
// src/components/feed/VoteControl.tsx — Vote display with immutable base + overlay.

export function VoteControl({ targetId, baseScore, ... }: VoteControlProps) {
  const vote = useAppStore((s) => s.votes[targetId] ?? 0) as VoteValue;
  const score = baseScore + vote;  // Never mutates post.score

  // Called as: <VoteControl targetId={`post:${post.id}`} baseScore={post.score} />
  //             <VoteControl targetId={`comment:${comment.id}`} baseScore={comment.score} />
}
```

**Why namespacing:** Local IDs (`local-1234567890`) and generated IDs (`p1`) could theoretically collide. The `post:` / `comment:` prefixes prevent this and make vote keys self-documenting.

#### Pattern 4: Feed Paging with IntersectionObserver

```typescript
// src/components/feed/PostList.tsx — Infinite scroll with skeleton loading.

const PAGE_SIZE = 8;

function loadMore() {
  if (loadingMore || !hasMore) return;
  setLoadingMore(true);
  setTimeout(() => {
    setVisibleCount((c) => Math.min(c + PAGE_SIZE, posts.length));
    setLoadingMore(false);
  }, 650);  // Simulated latency — intentional UX pattern
}

const sentinelRef = useInfiniteScroll(loadMore, hasMore);
// Sentinel div triggers loadMore when it scrolls into view (rootMargin: 400px)
```

**Why this pattern:** The 650ms delay + skeleton state simulates real async behavior for demo purposes. It's intentional — don't optimize it away.

---

## 4. Data Architecture

### 4.1 Data Models (TypeScript Interfaces)

```typescript
// src/types/index.ts — All domain types

interface User { id, username, displayName, bio, karma, createdAt, colorFrom, colorTo }
interface Community { id, name, title, description, memberCount, onlineCount, createdAt,
                      category: ImageCategory, colorFrom, colorTo, icon, rules }
interface Post { id, communityId, authorId, title, type: PostType, body?, linkUrl?,
                  linkDomain?, imageCategory?, flair?, score, commentCount, createdAt, isLocal? }
interface Comment { id, postId, authorId, parentId, body, score, createdAt,
                    children: Comment[], isLocal? }
interface AppNotification { id, type: NotificationType, message, detail, postId?,
                            actorId, createdAt, read }

type VoteValue = -1 | 0 | 1
type PostType = "text" | "link" | "image"
type SortMode = "best" | "hot" | "new" | "top" | "rising"
type NotificationType = "upvote" | "reply" | "mention" | "community"
type ImageCategory = "nature" | "tech" | "gaming" | "food" |
                     "space" | "art" | "animals" | "sports"
```

### 4.2 Persistence Strategy

| Aspect | Detail |
|---|---|
| Mechanism | zustand `persist` middleware |
| Storage | `localStorage` key `reddit-clone-state` |
| Whitelist (partialize) | `schemaVersion`, `theme`, `votes`, `joinedCommunityIds`, `savedPostIds`, `localPosts`, `localComments`, `notificationReadOverrides` |
| Excluded | `toasts` (ephemeral UI only) |
| Schema version | `schemaVersion: 1` + custom `merge` + `migrate` hook on `persist` |
| Debug tip | Clear `reddit-clone-state` key when state behaves oddly |

### 4.3 Data Generation Summary

| Entity | Count | Seed | Module | Notes |
|---|---|---|---|---|
| Users | 48 | `users-seed-v1` | `data/users.ts` | + `CURRENT_USER` (`u-me`) |
| Communities | 18 | `community-${name}` | `data/communities.ts` | From 18 hand-written `SEEDS` |
| Posts | 320 | `posts-seed-v2` | `data/posts.ts` | Sorted by date after generation |
| Comments | ~3-7 per post | `comments-${postId}` | `data/comments.ts` | Lazy, memoized, max depth 4 |
| Notifications | 18 | `notifications-seed-v1` | `data/notifications.ts` | 4 types: upvote, reply, mention, community |
| Images | 8 categories | N/A | `data/images.ts` | Maps `ImageCategory → /images/cat-{name}.jpg` |

---

## 5. Design System Reference

### 5.1 Typographic System

| Element | Font | Weight | Usage |
|---|---|---|------|
| Body | Inter (Google Fonts) | 400 | Base text, descriptions |
| UI Labels | Inter | 500 | Buttons, nav items, metadata |
| Headings | Inter | 700-800 | Page titles, post titles, card headings |
| Small UI | Inter | 600 | Badges, timestamps, vote counts |

Font loaded via `@import url("https://fonts.googleapis.com/...")` in `index.css`. Not bundled — requires network.

### 5.2 Color Tokens

Tailwind v4 CSS-first `@theme` in `index.css` uses Tailwind's built-in color scales:

| Purpose | Light Mode | Dark Mode |
|---|---|---|
| Background | `bg-zinc-50` | `bg-zinc-950` |
| Surface | `bg-white` | `bg-zinc-900` |
| Text primary | `text-zinc-900` | `text-zinc-100` |
| Text secondary | `text-zinc-600` | `text-zinc-300` |
| Text muted | `text-zinc-500` | `text-zinc-400` |
| Border | `border-zinc-200` | `border-zinc-800` |
| Accent primary | `orange-600` | `orange-500` |
| Accent upvote | `orange-600` | `orange-600` |
| Accent downvote | `indigo-600` | `indigo-600` |
| Active nav | `bg-orange-50` / `text-orange-700` | `bg-orange-500/10` / `text-orange-400` |

Dark mode: Custom variant `@custom-variant dark (&:where(.dark, .dark *));` — toggled via `.dark` class on `<html>`.

### 5.3 Component Primitives

| Component | Location | Pattern |
|---|---|---|
| `Avatar` | `ui/Avatar.tsx` | Gradient from `gradientFor(seed)`, shows emoji or initial |
| `Button` | `ui/Button.tsx` | `forwardRef`, 5 variants × 4 sizes via lookup maps |
| `Modal` | `ui/Modal.tsx` | `createPortal` → `document.body`, `AnimatePresence` |
| `Dropdown` | `ui/Dropdown.tsx` | Render props: `trigger` + `children(close)` |
| `Skeleton` | `ui/Skeleton.tsx` | `animate-pulse` + `PostCardSkeleton` + `CommentSkeleton` |
| `Toaster` | `ui/Toaster.tsx` | Bottom-right stack, auto-dismiss 3200ms, 3 tones |
| `VoteControl` | `feed/VoteControl.tsx` | Up/down with `baseScore + vote` display |
| `PostList` | `feed/PostList.tsx` | Infinite scroll, PAGE_SIZE=8, 650ms simulated load |
| `Card` | `layout/RightPanel.tsx` | Bordered card shell with optional title |
| `CommentComposer` | `post/CommentComposer.tsx` | Textarea + submit button |

### 5.4 Motion & Animation

| Library | Usage |
|---|---|
| `framer-motion` | Layout animations (`layout` prop), `AnimatePresence` for enter/exit, `whileTap` for vote buttons |
| Simulated latency | 650ms feed paging, 500ms comment loading — intentional for demo feel |
| Mobile sidebar | `motion.div` with x-axis slide (`-100%` → `0`) |

---

## 6. Security Architecture

### 6.1 Security Rules

| Rule | Enforcement |
|---|---|
| No user input to server | No server exists — no injection surface |
| No `dangerouslySetInnerHTML` | All content rendered via JSX text nodes |
| No `eval` or dynamic code | Zero dynamic code execution |
| Clipboard access is read-only | `navigator.clipboard.writeText()` only on user click (share button) |
| No secrets in code | No API keys, tokens, or credentials in the codebase |

### 6.2 Threat Model

| Vector | Risk | Mitigation |
|---|---|---|
| XSS via post content | Low | All content is generated from static strings, never user HTML. No `dangerouslySetInnerHTML`. |
| localStorage tampering | Low | Client-only demo. Users tamper with their own data. No server to protect. |
| Dependency compromise | Medium | Pinned versions in `package.json`. `vite-plugin-singlefile` is the only non-obvious dependency. |
| Google Fonts unavailable | Low | Graceful fallback to `ui-sans-serif, system-ui` in font stack. |

### 6.3 Authentication & Authorization

**None.** `CURRENT_USER` (`id: "u-me"`) is a hardcoded local identity. The "Log out (demo)" button in the navbar is cosmetic.

---

## 7. Testing Strategy

### 7.1 Current State

| Aspect | Status |
|---|---|
| Test runner | **Vitest 2.1.9** |
| Test env | **jsdom 25.x** (client) — in-memory SQLite + Fastify `inject()` (server) |
| Component testing | **@testing-library/react 16.x + @testing-library/user-event 14.x** |
| E2E framework | **Playwright 1.62** (added Round 3 — 9 smoke tests in `e2e/smoke.spec.ts`) |
| Linter | **ESLint 9 flat config** (`eslint.config.mjs` at repo root, added Round 4 — 0 errors, 0 warnings) |
| Coverage | **`@vitest/coverage-v8`** in `@embers/server` (added Round 5 — informational, no CI gate yet) |
| Typechecker | `npm run typecheck` (alias for `tsc --noEmit` across all 4 workspaces) |
| Total tests | **389 vitest** (web=198, server=95, shared=67, db=29) + **9 Playwright E2E** |

### 7.2 Test layout

Tests are colocated with source as `*.test.ts(x)`:

```
src/
├── utils/
│   ├── cn.test.ts           # class merge sanity
│   ├── format.test.ts       # timeAgo, formatCount, formatFullDate
│   ├── random.test.ts       # hashString, seededRandom, createRng, gradientFor
│   ├── score.test.ts        # getVisibleScore, hotScore, risingScore, sortPosts
│   ├── search.test.ts       # normalizeQuery, matchScore, searchPosts/Communities/Users
│   └── url.test.ts          # isSafeUrl, extractDomain
├── store/
│   ├── storage.test.ts      # safeParseJSON, validatePersistedState, mergePersistedState
│   ├── selectors.test.ts    # getVisibleScore, isPostSaved, getUnreadNotificationCount, etc.
│   └── themeBootstrap.test.ts # applyPersistedTheme
├── lib/
│   └── api.test.ts          # foundational fetch client (Round 5) — 22 tests
├── components/feed/
│   ├── VoteControl.test.tsx     # integration: voting toggles, score updates, persistence
│   └── CreatePostModal.test.tsx # integration: validation, URL safety, submit + store
└── test/
    ├── setup.ts             # jest-dom matchers + IntersectionObserver/matchMedia stubs
    └── utils.tsx            # renderWithRouter helper
```

### 7.3 Configuration

- `vitest.config.ts` — separate from `vite.config.ts` to avoid a TypeScript type clash between the project's `vite` package and the `vite` bundled inside `vitest`. The `test` block in vitest's config is ignored by `vite build`, so the single-file production output is unaffected.
- `src/test/setup.ts` — auto-imported by every test file via `setupFiles`. Imports `@testing-library/jest-dom/vitest` for DOM matchers, stubs `IntersectionObserver` and `matchMedia` (which jsdom doesn't implement).
- `src/test/utils.tsx` — exports `renderWithRouter` which wraps a component in `MemoryRouter` and returns `user` (a `userEvent` instance) alongside the usual RTL queries.

### 7.4 Quality Assurance

The project relies on:

1. **TypeScript strict mode** — catches type errors, unused variables, fallthrough cases
2. **Vitest unit + integration tests** — 198 tests across 12 files covering pure utilities, store logic, the foundational API client, and key components (web) + 95 server tests + 67 shared tests + 29 db tests = 389 total
3. **ESLint 9 flat config** (Round 4) — 0 errors, 0 warnings across all workspaces
4. **Playwright E2E** (Round 3) — 9 smoke tests covering health, register, login, feed, single post, search, communities
5. **Manual typecheck** — `npm run typecheck` before claiming a change compiles
6. **Production build** — `npm run build` validates bundling succeeds

### 7.5 Pre-Commit Checklist

```bash
npm run lint        # ESLint flat config — 0 errors, 0 warnings (Round 4)
npm run typecheck   # tsc --noEmit across all 4 workspaces — must pass clean
npm test            # vitest run — all 389 tests must pass (pretest auto-builds shared+db)
npm run test:e2e    # playwright run — 9 smoke tests must pass (Round 3)
npm run build       # topological build — must succeed
git ls-files | grep -E '(^|/)dist/' | wc -l   # must be 0 (no dist/ tracked)
```

### 7.6 Manual QA matrix

See `docs/MANUAL_QA.md` for the full manual QA matrix covering feed, voting, posts, comments, communities, profiles, search, notifications, theme, persistence, accessibility, and responsiveness.

---

## 8. Build & Deployment

### 8.1 Production Build

```bash
npm install        # Install dependencies
npm run build      # → dist/index.html (single file, ~528 KB)
npm run preview    # Serve dist/ for verification
```

**Output:** `dist/index.html` — fully self-contained JS/CSS inlined. External deps: Google Fonts, `public/images/*.jpg` (referenced as `${import.meta.env.BASE_URL}images/...` so the build works under subpath hosting).

### 8.2 Environment Variables

**None.** The app reads no environment variables. No `.env` file. No build-time configuration. `import.meta.env.BASE_URL` is the only Vite env reference — used by `src/data/images.ts` for asset paths.

### 8.3 Build Constraints

| Constraint | Reason |
|---|---|
| No `React.lazy` or dynamic `import()` | Defeats `vite-plugin-singlefile` |
| No code splitting | Single-file output requires single chunk |
| No `tailwind.config.js` | Tailwind v4 uses CSS-first `@theme` |
| No PostCSS config | `@tailwindcss/vite` handles everything |
| No `theme()` function in plain CSS | Tailwind v4 doesn't support it; use `var(--color-*)` directly |

### 8.4 Deployment Targets

| Target | Works? | Notes |
|---|---|---|
| Static file server (`python -m http.server`) | ✅ | Serve `dist/` from web root |
| GitHub Pages | ✅ | Push `dist/` to `gh-pages` branch |
| Netlify / Vercel (static) | ✅ | No redirects needed (HashRouter) |
| `file://` protocol | ❌ | Breaks Google Fonts + images |
| S3 / GCS / R2 | ✅ | Upload `dist/` contents |

---

## 9. Developer Handbook

### 9.1 Local Setup

```bash
# Clone and install
git clone <repo-url>
cd embers
npm install

# Start dev server
npm run dev      # → http://localhost:5173

# Typecheck
npm run typecheck

# Production build
npm run build    # → dist/index.html
npm run preview  # → serves dist/ on a local port
```

### 9.2 Common Commands

| Command | Location | Purpose |
|---|---|---|
| `npm run dev` | Root | Vite dev server with HMR |
| `npm run build` | Root | Production build (no typecheck) |
| `npm run preview` | Root | Serve `dist/` over HTTP |
| `npm run typecheck` | Root | `tsc --noEmit` — TypeScript typecheck |
| `npm test` | Root | Vitest run mode (single shot) |
| `npm run test:watch` | Root | Vitest watch mode |

### 9.3 Code Style Rules

| Rule | Source |
|---|---|
| `strict: true` in tsconfig | `tsconfig.json` |
| `noUnusedLocals`, `noUnusedParameters` | `tsconfig.json` — unused imports are hard errors |
| `jsx: react-jsx` | Never `import React` |
| Relative imports only | `@/*` alias exists but is unused — don't mix |
| Named exports | Throughout; only `App.tsx` has `export default` |
| `cn()` for class merging | `clsx` + `tailwind-merge` |
| Early returns | Avoid deeply nested conditionals |

### 9.4 Git Workflow

| Convention | Detail |
|---|---|
| `node_modules/` | Gitignored |
| `dist/` | Gitignored (along with `node_modules/`) |
| Branching | Not specified — use feature branches |
| Commit style | Not enforced |

---

## 10. Known Issues & Outstanding Tasks

| Priority | Issue | Impact | Status |
|----------|-------|--------|--------|
| ~~MEDIUM~~ | ~~No linter installed~~ | ~~No enforced code style~~ | **Resolved in Round 4** — ESLint 9 flat config with `typescript-eslint` + React + react-hooks plugins |
| LOW | Google Fonts loaded externally | Breaks when offline or blocked by CSP | Open |
| LOW | Comment IDs (`${postId}-c${Date.now()}`) can theoretically collide if two comments are created in the same millisecond | Extremely unlikely but possible | Open |

### 10.1 Resolved in the latest remediation pass

The following previously-open issues are now resolved (see `docs/REMEDIATION_PLAN.md` for the full audit):

| Issue | Resolution |
|---|---|
| No test runner installed | Vitest + Testing Library + jsdom installed; 198 tests across 12 files (web) + 95 server + 67 shared + 29 db = 389 total |
| No `version`/`migrate` on `persist` | `schemaVersion: 1` + custom `merge` + `migrate` hook on `persist` |
| Corrupt localStorage could crash the app | `mergePersistedState` validates every field, drops invalid entries, never throws |
| Theme flash on reload | Synchronous inline script in `index.html` applies `.dark` before React mounts |
| Modal missing focus trap / Escape / scroll lock | `useFocusTrap` hook + Escape handler + body scroll lock added |
| Dropdown missing `aria-expanded` / arrow keys | Trigger wrapped with a11y props; arrow-key navigation between items |
| No skip link | `<a href="#main" className="skip-link">` in `AppShell` |
| No reduced-motion support | `MotionConfig reducedMotion="user"` wrapper + CSS `@media (prefers-reduced-motion)` |
| `CreatePostModal` accepted `javascript:` URLs | `isSafeUrl` validates http(s) only; inline error messages with `aria-describedby` |
| Post detail silently redirected on missing post | Now renders a "Post not found" empty state with link back to home |
| `post.commentCount` didn't match the generated tree | Now derived from `countComments(getCommentsForPost(post.id))` at module scope |
| Search bar lacked keyboard nav / Escape / race-fix | ArrowUp/ArrowDown/Enter/Escape handlers; navigation uses bound result objects |
| Notifications page lacked All/Unread tabs + per-item mark-read | Added with `?filter=` URL sync; target safety checks `getPost(id)` |
| Notification bell badge showed raw count | `capBadgeCount` caps at "9+" |
| Feed sort wasn't URL-synced | `?sort=` param on HomePage + CommunityPage; invalid sort falls back to default |
| No error boundary around router outlet | `ErrorBoundary` class component wraps `<Outlet />` |
| Reply allowed past max comment depth | Reply button hidden at `depth >= 4`, replaced with "Continue thread" hint |
| Images broke under subpath hosting | `data/images.ts` prefixes paths with `import.meta.env.BASE_URL` |
| `timeAgo` not deterministic in tests | Accepts optional `now?: number` parameter |
| Score/sort logic untestable | Extracted to pure `src/utils/score.ts`; `sortPosts` adds stable id-ascending tie-breakers |
| Search logic untestable | Extracted to pure `src/utils/search.ts` with normalize + rank + tie-breakers |

---

## 11. Key Files Reference

| File | Purpose |
|---|---|
| `src/main.tsx` | Application entry point |
| `src/App.tsx` | HashRouter + route definitions + theme toggle |
| `src/index.css` | Tailwind import, `@theme`, dark variant, `.line-clamp` |
| `src/types/index.ts` | All domain type definitions |
| `src/store/store.ts` | Zustand store with persist middleware |
| `src/data/users.ts` | 48 generated users + CURRENT_USER |
| `src/data/communities.ts` | 18 generated communities |
| `src/data/posts.ts` | 320 generated posts + `sortPosts()` |
| `src/data/comments.ts` | Lazy per-post comment trees (max depth 4) |
| `src/data/notifications.ts` | 18 generated notifications |
| `src/data/images.ts` | ImageCategory → URL mapping |
| `src/utils/random.ts` | Seeded PRNG (FNV-1a → mulberry32) + gradientFor |
| `src/utils/cn.ts` | clsx + tailwind-merge utility |
| `src/utils/format.ts` | timeAgo, formatCount, formatFullDate |
| `src/utils/score.ts` | getVisibleScore, hotScore, risingScore, sortPosts |
| `src/utils/search.ts` | normalizeQuery, matchScore, searchPosts/Communities/Users |
| `src/utils/url.ts` | isSafeUrl, extractDomain |
| `src/store/storage.ts` | safe JSON parse + persisted-state validation + merge helpers |
| `src/store/selectors.ts` | pure selectors (visible score, unread count, badge cap) |
| `src/store/themeBootstrap.ts` | synchronous theme application before React mounts |
| `src/hooks/useFocusTrap.ts` | focus trap for Modal/Drawer overlays |
| `src/components/feed/PostList.tsx` | Feed paging (PAGE_SIZE=8, infinite scroll) |
| `src/components/feed/VoteControl.tsx` | Vote up/down with baseScore + vote |
| `src/components/feed/PostCard.tsx` | Post preview card |
| `src/components/ui/Button.tsx` | Button with variant × size maps |
| `src/components/ui/Modal.tsx` | Portal-based modal with AnimatePresence |
| `src/components/ui/Dropdown.tsx` | Render-props dropdown |
| `src/components/ui/Skeleton.tsx` | Loading placeholders |
| `src/components/layout/AppShell.tsx` | Root layout: Navbar + Sidebar + Outlet |
| `src/components/layout/Navbar.tsx` | Sticky header with search, create, theme, notifications |
| `src/components/layout/Sidebar.tsx` | Navigation links + communities (desktop + mobile) |
| `src/components/layout/ErrorBoundary.tsx` | Class component wrapping <Outlet /> |
| `src/components/search/SearchBar.tsx` | Full-text search with keyboard nav + race-fix |
| `src/components/notifications/NotificationsPanel.tsx` | Notification list with All/Unread tabs |
| `src/pages/HomePage.tsx` | Feed with scope (home/popular/all/explore) |
| `src/pages/PostPage.tsx` | Post detail + comment tree (500ms simulated load) |
| `src/lib/api.ts` | Foundational fetch-based API client for the Fastify backend (Round 5) — basis for deferred B17–B22 frontend integration |
| `src/lib/api.test.ts` | 22 tests for the API client (constructor defaults, every endpoint, auth header, cursor encoding, 4xx/5xx error mapping) |
| `vite.config.ts` | Vite + React + Tailwind + singlefile |
| `tsconfig.json` | Strict TypeScript config |
| `index.html` | Minimal HTML shell (title + root div + module script) |

---

## 12. Glossary

| Term | Definition |
|---|---|
| **Overlay** | A zustand store slice that augments immutable generated data with user-mutable state |
| **Seeded PRNG** | Pseudo-random number generator initialized with a fixed seed; produces identical output for identical seeds |
| **mulberry32** | The PRNG algorithm used; fast, deterministic, good distribution for demo data |
| **FNV-1a** | String hashing algorithm used to convert seed strings to 32-bit integers |
| **HashRouter** | React Router variant using `#/path` URLs for client-side-only routing |
| **partialize** | zustand persist option that whitelists which store fields survive a reload |
| **PAGE_SIZE** | Number of posts rendered per feed page (8) |
| **CURRENT_USER** | Hardcoded local identity (`id: "u-me"`) representing the viewer |
| **ImageCategory** | Union type of 8 categories mapping post types to stock images |
| **SortMode** | Feed sorting algorithm: best, hot, new, top, rising |
| **VoteValue** | Union type: `-1` (downvote), `0` (no vote), `1` (upvote) |
| **Simulated latency** | Intentional `setTimeout` delays (650ms feed, 500ms comments) for demo feel |
| **gradientFor(seed)** | Stable gradient pair derived from a string seed for avatar colors |
| **namespaced keys** | Vote storage keys prefixed with `post:` or `comment:` to avoid ID collisions |

---

## 13. Part 2 — Enterprise Backend Layer (added 2026-08-09)

This section documents the backend stack added in the Phase B0–B16
remediation pass. It is **additive** — the original ADR-001…ADR-005
remain in force for `apps/web` (the client SPA). The new ADR-101…ADR-110
apply to `apps/server` and the `packages/{shared,db}` workspaces.

### 13.1 New ADRs

| ADR | Decision | Workspace |
|---|---|---|
| ADR-101 | REST + Zod API contract | `packages/shared` |
| ADR-102 | Fastify web framework | `apps/server` |
| ADR-103 | SQLite + Drizzle ORM (WAL, busy_timeout=5000, FK on) | `packages/db` |
| ADR-104 | JWT auth (15m access + 7d refresh, HttpOnly cookies) | `apps/server/src/auth` |
| ADR-105 | React Query + Zustand split | **DEFERRED** — see REMEDIATION_EXECUTION_PLAN.md §5 |
| ADR-106 | BrowserRouter + chunked Vite build | **DEFERRED** — breaking change to apps/web |
| ADR-107 | npm-workspaces monorepo | root `package.json` |
| ADR-108 | Transactional atomic vote counters (`UPDATE … SET col = col + delta`) | `apps/server/src/services/voteService.ts` |
| ADR-109 | SQLite FTS5 virtual tables + BM25 ranking | `packages/db/src/fts5.ts` |
| ADR-110 | Pino structured logging + requestId correlation | `apps/server/src/plugins/{requestId,errorHandler}.ts` |

### 13.2 Backend Topology

```
┌──────────────────────────────────────────────────────────────┐
│                  CLIENT (Browser) — apps/web                  │
│   React 19 SPA (unchanged from §2, runs via HashRouter +       │
│   vite-plugin-singlefile, 198 tests green)                    │
└──────────────────────────────────────────────────────────────┘
                              │
                              │  (frontend integration deferred — §5)
                              ▼
┌──────────────────────────────────────────────────────────────┐
│              API SERVER (Node 20+) — apps/server              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Fastify 5 (Pino logger, Helmet, CORS, rate-limit,      │  │
│  │  cookie, requestId, errorHandler)                      │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────┐  │
│  │ /api/auth/*      │  │ /api/posts/*     │  │ /api/comm. │  │
│  │ Argon2id + JWT   │  │ CRUD + cursor pg │  │ CRUD       │  │
│  └──────────────────┘  └──────────────────┘  └────────────┘  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────┐  │
│  │ /api/votes/:id   │  │ /api/comments/*  │  │ /api/search│  │
│  │ atomic tx        │  │ tree + notif.    │  │ FTS5 BM25  │  │
│  └──────────────────┘  └──────────────────┘  └────────────┘  │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                   DATABASE — packages/db                      │
│   better-sqlite3 (WAL, busy_timeout=5000, foreign_keys=ON)    │
│   ┌──────────┐ ┌────────────┐ ┌──────────┐ ┌──────────────┐   │
│   │ users    │ │ communities│ │ posts    │ │ posts_fts    │   │
│   │ sessions │ │ comments   │ │ votes    │ │ (FTS5 virt.) │   │
│   │ notifs.  │ │            │ │          │ │ + triggers   │   │
│   └──────────┘ └────────────┘ └──────────┘ └──────────────┘   │
│   Drizzle ORM (types + migrations) + runSeed() PRNG port     │
└──────────────────────────────────────────────────────────────┘
```

### 13.3 Backend Test Coverage (80 tests)

| Suite | Tests | Coverage |
|---|---|---|
| `config.test.ts` | 8 | Env loader (dev defaults, prod-required vars) |
| `routes/health.test.ts` | 6 | /health shape, requestId header, 404 envelope, 500 stack suppression, CORS preflight |
| `auth/password.test.ts` | 4 | Argon2id hash + verify round-trip |
| `auth/jwt.test.ts` | 7 | Access/refresh token sign/verify, expiry, wrong-secret rejection |
| `routes/auth.test.ts` | 14 | Register/login/refresh/logout + 401/409/422 paths |
| `routes/api.test.ts` | 34 | Posts, communities, votes (toggle/flip), comments, search, notifications |
| `routes/hardening.test.ts` | 7 | Helmet CSP, X-Frame-Options, etc.; auth route rate limit (5/min → 429) |

### 13.4 Shared Package Schemas (61 tests)

`packages/shared/src/` defines Zod schemas for every entity and API
endpoint. These are the runtime contract — Fastify's zod-validator
plugin uses them directly so the TS types and runtime validation
cannot drift. Branded ID types (`UserId`, `PostId`, etc.) prevent
accidental cross-assignment at compile time, erased at runtime.

### 13.5 Database Package (29 tests)

`packages/db/src/` provides:
- `client.ts` — `openDb()` returns both raw `better-sqlite3` connection
  (for FTS5 + pragma queries) and the Drizzle ORM wrapper.
- `schema/index.ts` — 7 tables + composite-PK votes table.
- `fts5.ts` — `posts_fts` virtual table + sync triggers + `searchPosts()`.
- `seed/` — Port of `apps/web/src/utils/random.ts` + `apps/web/src/data/*`
  into DB inserts. `runSeed()` is idempotent and dependency-injected with
  `hashPassword` so the package stays free of the argon2 native module.

### 13.6 Backend Operation

```bash
# Apply migrations + seed dev.db (one-time setup)
npm run db:migrate --workspace @embers/db
npm run db:seed    --workspace @embers/db

# Start the dev server (port 4000)
npm run dev --workspace @embers/server

# Smoke test
curl http://localhost:4000/health
curl -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"you","password":"embers-demo"}'
```

### 13.7 Backend Definition of Done

✅ B0 Monorepo init — `npm install` at root works; `npm test --workspaces`
   runs all 4 workspace test suites.
✅ B1 Shared types — `@embers/shared` builds to `dist/`; 61 schema tests green.
✅ B2 Backend scaffold — `buildApp()` returns FastifyInstance; `/health`
   returns 200 with `{ status, timestamp, uptime }`.
✅ B3 DB scaffold — `openDb()` applies WAL pragma; verified by
   `PRAGMA journal_mode;` query returning `'wal'`.
✅ B4–B6 Schema + FTS5 + migrations — `drizzle-kit generate` produces
   `0000_*.sql`; migration applied to `dev.db`; all 7 tables + 5 FTS5
   shadow tables present.
✅ B7 Seed script — 49 users (48 + demo), 18 communities, 320 posts,
   ~3000 comments, 18 notifications; idempotent.
✅ B8–B9 Auth — Argon2id + JWT (HS256) with refresh-token rotation;
   14 integration tests covering register/login/refresh/logout.
✅ B10 Post/Community API — GET list (cursor-paginated), GET single,
   POST create (auth required); 12 tests.
✅ B11 Transactional votes — atomic `UPDATE … SET col = col + delta`
   inside a transaction; toggle/flip/zero lifecycle; 5 tests.
✅ B12 Comment tree — O(n) parent-pointer join; depth cap enforced;
   reply notification emitted; 6 tests.
✅ B13 FTS5 search — `GET /api/search?q=&type=` for posts/communities/users;
   5 tests.
✅ B14 Notifications — `GET /api/notifications?filter=all|unread`;
   4 tests.
✅ B15 Helmet + rate limit — CSP header verified; auth route rate
   limit (5/min → 429) verified; 7 tests.
✅ B16 Observability — Pino structured logs + requestId correlation
   on every response; verified via `x-request-id` header.

