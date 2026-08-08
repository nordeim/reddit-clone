# AGENTS.md

**embers** — a Reddit-style community feed. A client-only React SPA: **no backend, no API, no `fetch` anywhere**. Every post, user, community, comment and notification is generated deterministically in the browser at module load.

## Commands

| Task | Command | Notes |
| --- | --- | --- |
| Dev server | `npm run dev` | Vite, default `:5173` |
| Production build | `npm run build` | Bare `vite build` — **does not typecheck** |
| Typecheck | `npx tsc --noEmit` | No script for it; run manually. Passes clean as of this writing. |
| Preview build | `npm run preview` | Serves `dist/` over HTTP |

- `build` is **not** the standard Vite template's `tsc -b && vite build`. Type errors will not fail it. Always run `npx tsc --noEmit` before claiming a change compiles.
- **No test runner and no linter are installed.** `npm test` / `npm run lint` do not exist. The `eslint-disable-next-line` comment at `src/hooks/index.ts:47` is a leftover, not evidence of ESLint.
- `node_modules/` is gitignored; **`dist/` is not** — delete it after building or it pollutes `git status`.

## Build & toolchain quirks

- **`vite-plugin-singlefile`** inlines all JS and CSS into a single `dist/index.html` (~508 kB). Do **not** add `React.lazy`, dynamic `import()`, or manual chunks — code splitting defeats the plugin.
- The build is **not** fully self-contained. `public/images/*.jpg` are copied to `dist/images/` and referenced by absolute URL `/images/...` (`src/data/images.ts`), and `src/index.css` `@import`s Inter from Google Fonts. Serve `dist/` from a web root; opening it over `file://` breaks images and fonts.
- **`HashRouter`**, not `BrowserRouter` (`src/App.tsx`) — deliberate, so the single-file build works on any static host with no rewrite rules. Don't switch it.
- **Tailwind CSS v4** via the `@tailwindcss/vite` plugin. There is no `tailwind.config.js` and no PostCSS config; the theme lives in `src/index.css` under `@theme`.
- Dark mode is a **custom variant**, not the v3 `darkMode: 'class'` option:
  `@custom-variant dark (&:where(.dark, .dark *));`
  `App.tsx` toggles `.dark` on `<html>` from the persisted store value.
- `.line-clamp-1/2/3` are hand-written in `index.css` and shadow Tailwind's built-ins.

## TypeScript conventions

- `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` are all on. An unused import is a **hard error under `tsc`** but invisible to `vite build`.
- The `@/*` → `src/*` alias is wired in **both** `tsconfig.json` and `vite.config.ts` but is **used nowhere**. Every import is relative (`../../utils/cn`). Match that — don't start mixing styles.
- `jsx: react-jsx` — never `import React`.
- Named exports throughout; `src/App.tsx` holds the only `export default`.

## Data layer — deterministic generation

`src/data/*` builds all content at import time from seeded PRNGs in `src/utils/random.ts` (FNV-1a hash → mulberry32).

| Module | Seed | Produces |
| --- | --- | --- |
| `data/users.ts` | `users-seed-v1` | `USERS` (48), `CURRENT_USER` |
| `data/communities.ts` | `community-${seed.name}` over hand-written `SEEDS` | `COMMUNITIES` |
| `data/posts.ts` | `posts-seed-v2` | `POSTS` (320) |
| `data/comments.ts` | `comments-${postId}` | lazy per-post tree, memoised in a module `Map`, max depth 4 |
| `data/notifications.ts` | `notifications-seed-v1` | `NOTIFICATIONS` (18) |

Changing a seed string, a loop count, or the **order of `rng` calls** reshuffles the entire app and orphans persisted votes/saves keyed to the old ids.

Accessor contracts are inconsistent — check before calling:

| Function | Behaviour on miss |
| --- | --- |
| `getPost(id)` | returns `undefined` |
| `getCommunityByName(name)` | returns `undefined` |
| `getCommunity(id)` | **throws** |
| `getUser(id)` | silently returns `CURRENT_USER` |

`CURRENT_USER` (`id: "u-me"`) is the local viewer. It is **not** a member of `USERS`, but is registered in the id lookup map.

## State — one store, overlay pattern

`src/store/store.ts` exports a single zustand store `useAppStore`, persisted to `localStorage` key **`reddit-clone-state`**.

**Generated data is immutable.** Every user action is kept in a separate overlay slice and merged at render time:

- **Votes** — `votes: Record<targetId, -1 | 0 | 1>` with **namespaced keys**: `` `post:${id}` `` / `` `comment:${id}` ``. `VoteControl` displays `baseScore + vote`; `post.score` is never mutated.
- **New posts** — `localPosts`, prepended: `[...localPosts, ...POSTS]` in `HomePage`, `CommunityPage`, `ProfilePage`, `SearchPage`.
- **New comments** — `localComments[postId]`, prepended to the generated tree in `PostPage`.
- **Read state** — `notificationReadOverrides` overlays the generated `read` flag, applied by `useNotifications()` in `components/notifications/NotificationsPanel.tsx` (not in `data/`).

To add a user-mutable feature, add an overlay slice — never write back into `POSTS` / `USERS` / `COMMUNITIES`.

Persistence caveats:

- `partialize` whitelists exactly what is saved (`toasts` is deliberately excluded). **A new persisted field must also be added to `partialize`, or it silently won't survive a reload.**
- There is no `version` / `migrate` on the `persist` middleware, so a changed state shape hydrates stale data from earlier runs. When debugging odd state, clear the `reddit-clone-state` key first.

Local ids are timestamp-based (`local-${Date.now()}` for posts, `${postId}-c${Date.now()}` for top-level comments, `${comment.id}-r${Date.now()}` for nested replies) versus generated `p1…p320`, `u1…u48`, `c1…cN` — which is why vote keys are namespaced.

## UI conventions

- **Simulated latency is intentional**, paired with `components/ui/Skeleton.tsx`: 650 ms in `PostList.loadMore`, 500 ms for comments in `PostPage`. Keep the pattern for new "async" views; don't optimise it away.
- Feed paging: `PAGE_SIZE = 8` in `PostList`, driven by `useInfiniteScroll` (IntersectionObserver, `rootMargin: 400px`) from `src/hooks/index.ts`.
- `Modal` renders via `createPortal` into `document.body`; the portal is always mounted and `open` only gates the `AnimatePresence` child.
- `Dropdown` uses render props: `trigger={({ open, toggle }) => …}` and `children={(close) => …}`.
- `Button` is a `forwardRef` with `variant` (primary/secondary/ghost/outline/danger) × `size` (sm/md/lg/icon) lookup maps — extend the maps rather than adding one-off classNames.
- Merge classes with `cn()` (`clsx` + `tailwind-merge`) from `src/utils/cn.ts`.
- Avatar gradients come from `gradientFor(seed)` — stable per user/community.
- Animation is `framer-motion`; icons are `lucide-react`.

## Routes (`src/App.tsx`)

`/`, `/popular`, `/all` and `/explore` all render `HomePage`, which derives its scope from `location.pathname`. Remaining: `/r/:name`, `/comments/:postId`, `/u/:username`, `/search?q=`, `/notifications`, and `*` → `NotFoundPage`. All pages render inside `AppShell` via `<Outlet />`.
