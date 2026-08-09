# embers — Reddit-style Community Feed

> **Monorepo transition (2026-08-09):** This repo is now an npm-workspaces
> monorepo. The client SPA documented below lives at `apps/web/` (workspace
> `@embers/web`) and continues to follow every convention listed here. New
> workspaces: `@embers/server` (Fastify backend), `@embers/shared` (Zod
> schemas + branded IDs), `@embers/db` (Drizzle ORM + SQLite + FTS5).
> Run workspace-scoped commands via `npm test --workspace @embers/web`,
> `npm run typecheck --workspace @embers/web`, etc. See `README.md` for
> the full monorepo layout and `docs/REMEDIATION_EXECUTION_PLAN.md` for
> the execution log.

---

A client-only React SPA: **no backend, no API, no `fetch`**. All content (users, communities, posts, comments, notifications) is generated deterministically in the browser via seeded PRNGs.

**Related docs:** `AGENTS.md` — comprehensive codebase reference (architecture, data layer contracts, full route table). Read it for deep context; this file focuses on daily implementation conventions.

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | React | 19.2.6 |
| Build | Vite | 7.3.2 |
| Language | TypeScript | 5.9.3 (strict) |
| CSS | Tailwind CSS | 4.1.17 (CSS-first `@theme`) |
| Routing | react-router-dom | 7.18.2 (`HashRouter`) |
| State | zustand | 5.0.14 (`persist` middleware) |
| Animation | framer-motion | 13.x |
| Icons | lucide-react | 1.30.x |
| Utilities | clsx + tailwind-merge | 2.1.1 / 3.4.0 |
| Testing | vitest + @testing-library/react | 2.1.9 / 16.x |
| Test env | jsdom | 25.x |

Tests are colocated with source as `*.test.ts(x)`. The vitest config lives in `vitest.config.ts` (separate from `vite.config.ts` to avoid a type clash between the project's `vite` package and the `vite` bundled inside `vitest`). No ESLint.

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite dev server (default `:5173`) |
| `npm run build` | Production build — **does NOT typecheck** |
| `npm run typecheck` | `tsc --noEmit` — runs the type checker |
| `npm test` | Vitest in run mode (single shot) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run preview` | Serve `dist/` over HTTP |

`build` is bare `vite build`, not `tsc -b && vite build`. Always run `npm run typecheck` before claiming a change compiles. Run `npm test` before claiming a change is correct — every code change should ship with tests (TDD: red → green → refactor).

## Critical Build Constraints

These are non-negotiable. Violating them breaks the build or runtime.

1. **No code splitting.** `vite-plugin-singlefile` inlines everything into one `dist/index.html`. Never add `React.lazy`, dynamic `import()`, or manual chunks.
2. **`HashRouter`, not `BrowserRouter`.** Deliberate — enables static hosting without rewrite rules. Don't switch it.
3. **Dist is gitignored.** Both `node_modules/` and `dist/` are in `.gitignore`, so neither pollutes `git status`.
4. **Google Fonts + images load externally.** `index.css` `@import`s Inter from Google Fonts; `public/images/*.jpg` are referenced as `${import.meta.env.BASE_URL}images/...`. Opening `dist/` over `file://` breaks both. Serve from a web root.
5. **Tailwind v4 has no config file.** Theme lives in `src/index.css` under `@theme`. No `tailwind.config.js`, no PostCSS config. Use CSS custom properties like `var(--color-orange-500)` in plain CSS — the `theme()` function syntax from v3 does NOT work.

## TypeScript

- `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` — all on. An unused import is a **hard error under `tsc`**.
- `jsx: react-jsx` — never `import React`.
- `vite build` does NOT typecheck. Run `npx tsc --noEmit` to catch errors the build silently ignores.
- **Relative imports only.** The `@/*` → `src/*` alias is wired in both `tsconfig.json` and `vite.config.ts` but used nowhere. Don't mix styles.

## Data Layer

All content is generated at import time from `src/data/*` using seeded PRNGs (`src/utils/random.ts`: FNV-1a hash → mulberry32). Generated data is **immutable** — never write back into `USERS`, `POSTS`, `COMMUNITIES`.

| Module | Seed | Produces |
|---|---|---|
| `data/users.ts` | `users-seed-v1` | 48 users + `CURRENT_USER` (`id: "u-me"`) |
| `data/communities.ts` | `community-${name}` per seed | 18 communities |
| `data/posts.ts` | `posts-seed-v2` | 320 posts |
| `data/comments.ts` | `comments-${postId}` | lazy per-post tree (max depth 4), memoised |
| `data/notifications.ts` | `notifications-seed-v1` | 18 notifications |

**Reshuffling hazard:** Changing a seed string, loop count, or the **order of `rng` calls** reshuffles the entire app and orphans persisted votes/saves keyed to old ids.

### Accessor contracts (check before calling)

| Function | On miss |
|---|---|
| `getPost(id)` | returns `undefined` |
| `getCommunityByName(name)` | returns `undefined` |
| `getCommunity(id)` | **throws** |
| `getUser(id)` | silently returns `CURRENT_USER` |

## State Management

Single zustand store (`src/store/store.ts`), persisted to `localStorage` key `reddit-clone-state`. User actions are stored as **overlay slices** and merged at render time:

- `votes` — `Record<targetId, -1 | 0 | 1>` with namespaced keys: `` `post:${id}` `` / `` `comment:${id}` ``
- `localPosts` — prepended: `[...localPosts, ...POSTS]` in HomePage, CommunityPage, ProfilePage, SearchPage
- `localComments[postId]` — prepended to generated tree in PostPage
- `notificationReadOverrides` — overlays generated `read` flag
- `joinedCommunityIds`, `savedPostIds` — user's joined/saved state
- `theme` — `"light"` | `"dark"`
- `toasts` — ephemeral UI, **excluded from persistence**

### Persistence rules

- `partialize` whitelists exactly what survives a reload. **A new persisted field must also be added to `partialize` AND to `validatePersistedState` in `src/store/storage.ts`** or it will silently be dropped on hydration.
- The persisted state is stamped with `schemaVersion: 1` (`SCHEMA_VERSION` in `src/store/storage.ts`). The `persist` middleware is configured with `version: SCHEMA_VERSION` + a custom `merge` function (`mergePersistedState`) that validates every field's shape and drops invalid entries individually. Corrupt JSON, wrong schema versions, and privacy-mode `localStorage` errors all fall back to defaults without crashing.
- When debugging odd state, clear the `reddit-clone-state` key first.

### Theme bootstrap

A synchronous inline script in `index.html` (mirrored in `src/store/themeBootstrap.ts` for testability) reads the persisted theme and applies the `.dark` class to `<html>` **before** React mounts. This prevents a flash of light theme on reload when dark mode is persisted.

### Pure selectors

`src/store/selectors.ts` exports pure functions: `getVisibleScore`, `isPostSaved`, `isCommunityJoined`, `getUnreadNotificationCount`, `getDerivedCommentCount`, `capBadgeCount`. They take plain state slices as input — they do NOT call `useAppStore` themselves — so they're unit-testable without mocking zustand.

### Error boundary

`src/components/layout/ErrorBoundary.tsx` is a class component wrapping `<Outlet />` in `AppShell`. It catches render-time errors from any page, logs them to the console (structured for grepability), and renders a fallback UI with a reload button.

## Testing

Tests use **Vitest** with the **Testing Library** + **jsdom** environment.

### Setup

- Config: `vitest.config.ts` (separate from `vite.config.ts`).
- Setup file: `src/test/setup.ts` — imports `@testing-library/jest-dom/vitest`, stubs `IntersectionObserver` and `matchMedia` (which jsdom doesn't implement).
- Router helper: `src/test/utils.tsx` exports `renderWithRouter` which wraps a component in `MemoryRouter` and returns `user` (a `userEvent` instance) alongside the usual RTL queries.

### Conventions

- Test files live alongside source as `*.test.ts(x)`.
- Characterization tests for existing pure utilities (format, random, score, search, url, selectors, storage) live in `src/utils/*.test.ts` and `src/store/*.test.ts`.
- Integration tests for components (VoteControl, CreatePostModal, Modal, Dropdown, SearchBar) live next to the component.
- TDD: write the failing test first (RED), implement the minimum to pass (GREEN), then refactor with tests still green.
- Never weaken or skip a test to make the build pass. If a test is wrong, fix the test. If a test is right, fix the code.

### Pre-commit checklist

```bash
npm run typecheck   # tsc --noEmit — must pass clean
npm test            # vitest run — all tests must pass
npm run build       # vite build — must succeed
```

## UI Conventions

### Simulated latency is intentional

Paired with `components/ui/Skeleton.tsx`: 650 ms in `PostList.loadMore`, 500 ms for comments in `PostPage`. Keep this pattern for new "async" views; don't optimise it away.

### Component patterns

- **Button** — `forwardRef` with `variant` × `size` lookup maps. Extend the maps, don't add one-off classNames.
- **Modal** — `createPortal` into `document.body`; `open` gates the `AnimatePresence` child.
- **Dropdown** — render props: `trigger={({ open, toggle }) => …}` and `children={(close) => …}`.
- **VoteControl** — receives `targetId` + `baseScore`; internally computes `baseScore + vote`. Never mutates `post.score`.
- **Feed paging** — `PAGE_SIZE = 8`, `useInfiniteScroll` with `rootMargin: "400px"`.

### Utilities

- `cn()` from `src/utils/cn.ts` (clsx + tailwind-merge) — use for all class merging
- `gradientFor(seed)` from `src/utils/random.ts` — stable per-user/community avatar gradients
- `formatCount()`, `timeAgo()` from `src/utils/format.ts`

### Dark mode

Custom variant, not v3 `darkMode: 'class'`:
```css
@custom-variant dark (&:where(.dark, .dark *));
```
`App.tsx` toggles `.dark` on `<html>` from the persisted store value.

## File Organization

```
src/
├── App.tsx              # HashRouter + routes + theme effect
├── main.tsx             # Entry point
├── index.css            # Tailwind import, @theme, dark variant, .line-clamp
├── components/
│   ├── community/       # CommunityHeader
│   ├── feed/            # PostCard, PostList, SortTabs, VoteControl, CreatePostModal
│   ├── layout/          # AppShell, Navbar, Sidebar, RightPanel, ErrorBoundary
│   ├── notifications/   # NotificationsPanel
│   ├── post/            # CommentThread, CommentComposer
│   ├── search/          # SearchBar
│   └── ui/              # Avatar, Button, Dropdown, Modal, Skeleton, Toaster
├── data/                # Deterministic content generation (immutable)
├── hooks/               # useDebounce, useOnClickOutside, useInfiniteScroll, useFocusTrap
├── pages/               # HomePage, CommunityPage, PostPage, ProfilePage, SearchPage, NotificationsPage, NotFoundPage
├── store/               # Single zustand store (useAppStore)
├── types/               # All TypeScript interfaces and union types
└── utils/               # cn, format, random, score, search, url
```

## Routes (HashRouter)

| Path | Page |
|---|---|
| `/`, `/popular`, `/all`, `/explore` | HomePage (scope derived from pathname) |
| `/r/:name` | CommunityPage |
| `/comments/:postId` | PostPage |
| `/u/:username` | ProfilePage |
| `/search` | SearchPage |
| `/notifications` | NotificationsPage |
| `*` | NotFoundPage |

## Local ID Patterns

Generated IDs use stable prefixes (`p1…p320`, `u1…u48`, `${postId}-c1…cN`). Local (user-created) IDs are timestamp-based:

- Posts: `` `local-${Date.now()}` ``
- Top-level comments: `` `${postId}-c${Date.now()}` ``
- Nested replies: `` `${comment.id}-r${Date.now()}` ``

This is why vote keys are namespaced (`post:` / `comment:`) — to avoid collisions between local and generated IDs.

## Pitfalls to Avoid

1. **Don't add `React.lazy` or dynamic `import()`.** Defeats `vite-plugin-singlefile`.
2. **Don't switch to `BrowserRouter`.** Hash routing is intentional.
3. **Don't mutate generated data.** Add overlay slices for new user-mutable features.
4. **Don't forget `partialize`.** New persisted fields must be whitelisted or they silently won't survive reload.
5. **Don't use `any`.** Use `unknown`. The codebase is `strict` mode — `noUnusedLocals`/`noUnusedParameters` catch dead code.
6. **Don't use absolute imports.** All imports are relative; match the convention.
7. **Don't remove simulated latency.** It's intentional UX paired with skeleton states.
8. **Don't call `getCommunity(id)` without a try/catch.** It throws on miss — use `getCommunityByName` for safe lookups.
9. **Don't import React.** `jsx: react-jsx` handles it automatically.
