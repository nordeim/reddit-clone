# AGENTS.md

> **Monorepo transition (2026-08-09):** The repo is now an npm-workspaces
> monorepo. The client SPA that this document originally described now
> lives under `apps/web/` and is published as the `@embers/web` workspace.
> Three new workspaces were added in the same pass:
>   - `@embers/server` (`apps/server/`) — Fastify REST API + auth
>   - `@embers/shared` (`packages/shared/`) — Zod schemas + branded IDs
>   - `@embers/db` (`packages/db/`) — Drizzle ORM + SQLite + FTS5 + seed
>
> See `docs/REMEDIATION_EXECUTION_PLAN.md` for the full execution log
> (Phases B0–B16 done, B17–B24 deferred). The architecture notes below
> remain accurate for `apps/web/` unchanged — every path mentioned is
> relative to `apps/web/` (e.g. `src/data/posts.ts` is `apps/web/src/data/posts.ts`).

---

**embers** — a Reddit-style community feed. The original client-only React SPA lives at `apps/web/` (`@embers/web`): **no backend, no API, no `fetch`** — every post, user, community, comment and notification is generated deterministically in the browser. Three backend workspaces (`@embers/server`, `@embers/db`, `@embers/shared`) were added in the monorepo transition and provide a Fastify REST API, Drizzle ORM data layer, and shared Zod schema contracts.

## Commands

### All workspaces (run from root)

| Task | Command | Notes |
| --- | --- | --- |
| Dev server (web) | `npm run dev --workspace @embers/web` | Vite, default `:5173` |
| Dev server (server) | `npm run dev --workspace @embers/server` | `tsx watch`, default `:4000` |
| Production build (all) | `npm run build` | Topological: `shared → db → server → web` |
| Typecheck (all) | `npm run typecheck` | Same topological order |
| Test (all) | `npm test` | Uses `--workspaces` — **do NOT run `vitest run` from root** (it won't discover workspace configs) |
| DB migrate | `npm run db:migrate --workspace @embers/db` | Drizzle migrations |
| DB seed | `npm run db:seed --workspace @embers/db` | 49 users, 320 posts, ~3000 comments |

### Per-workspace (run from root with `--workspace`)

| Task | Command |
| --- | --- |
| Build one workspace | `npm run build --workspace @embers/server` |
| Typecheck one workspace | `npm run typecheck --workspace @embers/db` |
| Test one workspace | `npm test --workspace @embers/shared` |

- `build` is **not** the standard Vite template's `tsc -b && vite build`. Type errors will not fail it. Always run `npm run typecheck` before claiming a change compiles.
- **Tests run on Vitest + Testing Library + jsdom** (web) and **Vitest + Fastify inject** (server). Config lives in each workspace's `vitest.config.ts`. Test files live alongside source as `*.test.ts(x)`.
- Both `node_modules/` and `dist/` are gitignored — neither pollutes `git status`.
- **Node ≥20** required. `better-sqlite3@13.0.3` ships prebuilt binaries (no compilation needed) — install scripts being blocked is fine.

## Build & toolchain quirks

- **`vite-plugin-singlefile`** inlines all JS and CSS into a single `dist/index.html` (~525 kB). Do **not** add `React.lazy`, dynamic `import()`, or manual chunks — code splitting defeats the plugin.
- The build is **not** fully self-contained. `public/images/*.jpg` are copied to `dist/images/` and referenced by absolute URL `/images/...` (`src/data/images.ts`), and `src/index.css` `@import`s Inter from Google Fonts. Serve `dist/` from a web root; opening it over `file://` breaks images and fonts.
- **`HashRouter`**, not `BrowserRouter` (`src/App.tsx`) — deliberate, so the single-file build works on any static host with no rewrite rules. Don't switch it.
- **Tailwind CSS v4** via the `@tailwindcss/vite` plugin. There is no `tailwind.config.js` and no PostCSS config; the theme lives in `src/index.css` under `@theme`.
- Dark mode is a **custom variant**, not the v3 `darkMode: 'class'` option:
  `@custom-variant dark (&:where(.dark, .dark *));`
  `App.tsx` toggles `.dark` on `<html>` from the persisted store value.
- `.line-clamp-1/2/3` are hand-written in `index.css` and shadow Tailwind's built-ins.

## Backend Workspaces

Three workspaces form the REST API backend alongside the client SPA:

| Workspace | Path | Purpose |
|---|---|---|
| `@embers/shared` | `packages/shared/` | Zod schemas, branded IDs, API contracts (request/response validation) |
| `@embers/db` | `packages/db/` | Drizzle ORM schema, SQLite client, FTS5, seed script |
| `@embers/server` | `apps/server/` | Fastify REST API, auth, plugins, repositories, routes |

### Server Architecture

The server follows a **composition root** pattern — `buildApp(opts)` in `src/app.ts` is a pure function that returns an unstarted Fastify instance (tests use `app.inject()` without binding a port).

**Plugin registration order matters:**
1. **helmet** — outermost, hardens all responses (CSP, HSTS, nosniff)
2. **cors** — must precede routes so preflight works
3. **cookie** — HttpOnly refresh cookie parsing
4. **rateLimit** — guards all routes (auth endpoints have stricter overrides)
5. **requestId** — assigns `req.id` before error handler uses it
6. **auth** — registers `app.authenticate` decorator
7. **routes** — health + (when `db` provided) all API routes
8. **errorHandler** — last, so it can wrap everything

**Lazy route registration:** API routes (auth, posts, communities, votes, comments, search, notifications) are only registered when `db` + `rawDb` are passed to `buildApp()`. Without them, only health + error handler are registered (used by health tests).

**Repository pattern:** Data access lives in `src/repositories/` — factory functions (`createUserRepository(db)`, etc.) that return plain objects. Repositories are injected into routes at registration time.

**Service layer:** Cross-repository operations (vote casting) live in `src/services/`. `voteService` wraps repositories and executes inside `db.transaction()` for atomicity.

**Graceful shutdown:** `src/index.ts` registers SIGINT/SIGTERM handlers that call `app.close()` before exiting.

### API Routes

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | No | Health check |
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Login → access token + refresh cookie |
| POST | `/api/auth/refresh` | Cookie | Rotate access token |
| POST | `/api/auth/logout` | Cookie | Revoke refresh token |
| GET | `/api/posts` | No | Cursor-paginated list |
| GET | `/api/posts/:id` | No | Single post |
| POST | `/api/posts` | Yes | Create post |
| PATCH | `/api/posts/:id` | Yes (author) | Partial update |
| DELETE | `/api/posts/:id` | Yes (author) | Delete post |
| GET | `/api/communities` | No | List communities |
| GET | `/api/communities/:slug` | No | Single community |
| PUT | `/api/votes/:targetId` | Yes | Cast/toggle/flip vote |
| GET | `/api/posts/:id/comments` | No | Comment tree |
| POST | `/api/posts/:id/comments` | Yes | Create comment |
| GET | `/api/search` | No | FTS5 search (posts/communities/users) |
| GET | `/api/notifications` | Yes | List notifications |

### Authentication & Authorization

- **JWT access token** (15m TTL) + **HttpOnly refresh cookie** (7d TTL), signed with `jose` HS256
- **Argon2id** for password hashing (`src/auth/password.ts`)
- **`authenticate` decorator** — routes opt in via `preHandler: [app.authenticate]`. Reads `Authorization: Bearer <token>`, sets `req.user = { id, username }`
- **Author-only enforcement**: routes check `existing.authorId !== user.id` → 403 (not 401)
- **Rate limiting on auth endpoints**: 5 req/min/IP (stricter than the 100/min global limit)
- **Refresh token rotation**: each refresh revokes the old token (session row `revokedAt` set) and issues a new one

### Database & FTS5

- **Drizzle ORM** with `better-sqlite3` driver
- **SQLite hardening**: WAL mode, `busy_timeout=5000`, `foreign_keys=ON`, `synchronous=NORMAL`
- **Schema** in `packages/db/src/schema/index.ts` — 7 tables: `users`, `communities`, `posts`, `comments`, `votes`, `notifications`, `sessions`
- **`votes` composite PK**: `(user_id, target_id, target_type)` enforces one vote per user per target
- **FTS5 virtual table** `posts_fts` in `packages/db/src/fts5.ts` — external-content pattern (`content='posts'`), sync triggers (`posts_ai`, `posts_ad`, `posts_au`), BM25 ranking
- **Migrations**: `drizzle-kit generate` → SQL in `src/migrations/`, applied via `scripts/migrate.ts`
- **Seed script**: deterministic PRNG (ported from `apps/web/src/utils/random.ts`) → 49 users, 18 communities, 320 posts, ~3037 comments, 18 notifications. Demo user: `you` / `embers-demo`

### Backend Testing Patterns

- Tests use **`app.inject()`** (Fastify's lightweight HTTP injection) — no port binding needed
- Each test creates a **fresh in-memory DB** via `openDb({ path: ":memory:" })`
- `buildApp({ env, db, rawDb })` wires repositories + routes for integration tests
- **Helmet/rate-limit** can be skipped via `skipHelmet`/`skipRateLimit` options (rate-limit auto-disabled in `NODE_ENV=test`)
- **Auth tests** use the seeded demo user; **vote concurrency tests** seed 100 users directly via Drizzle insert (bypassing Argon2id for speed)
- Test files: 8 in `apps/server/src/` (5 in `routes/`, 2 in `auth/`, 1 `config.test.ts` in root), 2 in `packages/db/src/`, 3 in `packages/shared/src/`

### Backend Pitfalls

1. **Don't read `process.env` directly** — use `loadEnv()` (zod-validated, production-safe with required-field checks)
2. **Don't forget WAL is skipped for `:memory:` DBs** — `openDb()` handles this automatically
3. **Don't use `db.transaction()` with the `tx` parameter** — better-sqlite3 is synchronous; the outer `db` already executes within the transaction. Use `db.transaction(() => { ... })`
4. **Don't add `import type` for Drizzle table imports** — tables are values (runtime objects), not types
5. **Don't rate-limit `/health`** — it's excluded from the auth rate limiter; the global limiter allows 100/min
6. **Don't leak stack traces** — `errorHandler` returns structured `{ error: { code, message, requestId } }` only
7. **Don't skip `requestId` plugin** — the error handler depends on `req.id` being set

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

Persistence details:

- **Schema versioning + validation.** The persisted state is stamped with `schemaVersion: 1` (`src/store/storage.ts`). The `persist` middleware is configured with `version: SCHEMA_VERSION` + a custom `merge` function (`mergePersistedState`) that validates every field's shape and drops invalid entries individually (rather than rejecting the whole blob). Corrupt JSON, wrong schema versions, and privacy-mode `localStorage` errors all fall back to defaults without crashing the app. **A new persisted field must be added to `partialize` AND to `validatePersistedState`** or it will silently be dropped on hydration.
- **Theme bootstrap.** A synchronous inline script in `index.html` (mirrored in `src/store/themeBootstrap.ts` for testability) reads the persisted theme and applies the `.dark` class to `<html>` **before** React mounts, preventing a flash of light theme on reload.
- **Pure selectors** live in `src/store/selectors.ts` (`getVisibleScore`, `isPostSaved`, `isCommunityJoined`, `getUnreadNotificationCount`, `getDerivedCommentCount`, `capBadgeCount`). They take plain state slices as input — they do NOT call `useAppStore` themselves — so they're unit-testable without mocking zustand.

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
