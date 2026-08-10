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
> (Phases B0–B16 done, B17–B22 deferred, B23 + B24 done in Round 3).
> Round 3 (2026-08-10) also fixed a pre-existing failing test in
> `apps/server/src/routes/api.test.ts` and untracked 96 accidentally-committed
> `dist/` build artifacts. See `docs/REMEDIATION_PLAN_ROUND_3.md` for the
> full Round 3 plan and verification ledger.
> Round 5 (2026-08-10) was a doc-alignment + infra-hygiene pass: fixed stale
> "No ESLint" / "B23+B24 deferred" lines in `CLAUDE.md` + `README.md`, added
> a `pretest` script to root `package.json` (so `npm test` works on a fresh
> clone), added `@vitest/coverage-v8` + coverage config to `@embers/server`,
> and added `apps/web/src/lib/api.ts` — a foundational fetch-based API client
> for the still-deferred B17–B22 frontend integration. See
> `docs/REMEDIATION_PLAN_ROUND_5.md` for the Round 5 changelog + B17–B22
> TDD breakdown. The architecture notes below remain accurate for `apps/web/`
> unchanged — every path mentioned is relative to `apps/web/` (e.g.
> `src/data/posts.ts` is `apps/web/src/data/posts.ts`).
> Round 6 (2026-08-10) executed Phase B18 (Auth Provider): added
> `apps/web/src/auth/AuthProvider.tsx` + `useAuth()` hook, added 401
> refresh-and-retry to `apps/web/src/lib/api.ts`, added a real
> `apps/web/src/pages/LoginPage.tsx` + `/login` route, and wrapped
> `<App />` in `<AuthProvider>` in `main.tsx`. 39 new TDD tests
> (20 AuthProvider + 9 api refresh-and-retry + 10 LoginPage) bring
> the web suite to 237. See `docs/REMEDIATION_PLAN_ROUND_6.md` for
> the Round 6 changelog + 7-slice TDD breakdown.
> Round 7 (2026-08-10) completed B18: added `/register` page +
> auth-aware Navbar (replaced hardcoded `CURRENT_USER` with `useAuth`)
> + `<RequireAuth>` route guard (protecting `/notifications`) + 9 E2E
> auth lifecycle tests. The `AuthUser` interface was widened from
> `{ id, username }` to the full server shape (with `displayName`,
> `karma`, etc.) so the Navbar can display them. 24 new web tests
> (11 RegisterPage + 8 Navbar + 5 RequireAuth) + 1 new api test
> (register displayName) bring the web suite to 262. 9 new E2E tests
> bring the E2E suite to 18. See `docs/REMEDIATION_PLAN_ROUND_7.md`
> for the Round 7 changelog + 5-slice TDD breakdown + the rationale
> for deferring B17 (build refactor) again.
> Round 8 (2026-08-10) was a **live-deployment audit + codebase
> hardening** round, triggered by running browser-based E2E tests
> against `https://reddit.jesspete.shop/`. The audit surfaced 3
> critical deployment gaps (Vite dev server exposed in production,
> no Fastify backend reachable, no security headers) that are
> documented in `docs/REMEDIATION_PLAN_ROUND_8.md`. Round 8 hardens
> the repository to prevent these gaps from recurring: added
> `pretypecheck` script (so `npm run typecheck` works on a fresh
> clone), added `scripts/verify-fresh-clone-typecheck.mjs` +
> `scripts/verify-production-build.mjs` (CI gates), added
> `e2e/live.spec.ts` (opt-in live-deployment audit via
> `LIVE_BASE_URL=... npm run test:e2e:live`), and silenced all 6
> React `act()` warnings in `LoginPage` + `RegisterPage` tests.
> See `docs/REMEDIATION_PLAN_ROUND_8.md` for the full audit + 6-item
> TDD breakdown. The architecture notes below remain accurate for
> `apps/web/` unchanged.
>
> **Between Round 8 and Round 9** (session 6, 2026-08-10): the operator
> added production-deployment support -- `dotenv@^17.4.2` dependency,
> `.env` / `.env.local` loading in `apps/server/src/config.ts` (with
> precedence: shell vars > .env.local > .env > loadEnv() defaults),
> `.env.example` + `.env.local.example` templates, `server:prod` +
> `server:start-prod` npm scripts, and `start_production.sh`
> orchestrator. The live site was also fixed to serve a production
> build (LIVE-CRIT-1 resolved). See `docs/session_6.md` for the full
> session-6 worklog.
>
> Round 9 (2026-08-10) was a **security incident response + CI
> hardening + doc alignment** round. A post-session-6 audit found
> that `.env` (containing real JWT signing secrets) had been
> committed to git history (commits `89f1012` + `526a836`) and
> pushed to GitHub. Round 9: (R9.1) removed `.env` + `env.bak` from
> git tracking via `git rm --cached` + added
> `scripts/verify-no-secrets-tracked.sh`; (R9.2) added a `security`
> job to `.github/workflows/ci.yml` running `gitleaks/gitleaks-action`
> on every push/PR; (R9.3) added `scripts/verify-gitignore-enforced.sh`
> to catch force-added gitignored files; (R9.4) updated the README
> "Live Deployment" section -- LIVE-CRIT-1 now FIXED, LIVE-CRIT-2/3
> still broken, LIVE-CRIT-4 new (501 on /api/auth/login); (R9.5)
> aligned AGENTS.md + CLAUDE.md with session-6 changes; (R9.6) added
> `docs/SECRET_ROTATION_GUIDE.md` -- **the operator MUST rotate the
> leaked JWT secrets**. The secrets remain in git history (history
> rewriting is out of scope -- rotation is the primary remediation).
> See `docs/REMEDIATION_PLAN_ROUND_9.md` for the full incident report
> + 6-item TDD breakdown.

---

**embers** — a Reddit-style community feed. The client SPA lives at `apps/web/` (`@embers/web`): all content is generated deterministically in the browser via seeded PRNGs (FNV-1a → mulberry32) — no network calls needed for the core feed experience. A fetch-based API client (`apps/web/src/lib/api.ts`) wires the auth flow to the backend. Three backend workspaces (`@embers/server`, `@embers/db`, `@embers/shared`) were added in the monorepo transition and provide a Fastify REST API, Drizzle ORM data layer, and shared Zod schema contracts. Backend integration for feeds/search pages is deferred (B17–B22).

## Commands

### All workspaces (run from root)

| Task | Command | Notes |
| --- | --- | --- |
| Dev server (web) | `npm run dev --workspace @embers/web` | Vite, default `:5173` |
| Dev server (server) | `npm run dev --workspace @embers/server` | `tsx watch`, default `:4000` |
| Production build (all) | `npm run build` | Topological: `shared → db → server → web` |
| Typecheck (all) | `npm run typecheck` | Same topological order. R8.1: a `pretypecheck` hook builds `@embers/shared` + `@embers/db` first, so this works on a fresh clone. |
| Test (all) | `npm test` | Uses `--workspaces` — **do NOT run `vitest run` from root** (it won't discover workspace configs) |
| E2E (local API) | `npm run test:e2e` | Playwright smoke + auth lifecycle (18 tests). Bootstraps a fresh seeded DB. |
| E2E (live audit) | `LIVE_BASE_URL=… npm run test:e2e:live` | R8.3: opt-in live-deployment audit (12 tests). Skipped when `LIVE_BASE_URL` is unset. |
| Build verification | `npm run test:build` | R8.4: asserts the built `dist/index.html` is a production bundle (no Vite dev modules). |
| Fresh-clone check | `npm run test:fresh-clone` | R8.1: simulates a fresh clone (removes `dist/`) and asserts `npm run typecheck` succeeds. |
| No-secrets check | `npm run test:no-secrets` | R9.1: asserts no secret-bearing files (`.env`, `env.bak`, `*.env`) are tracked by git. |
| Gitignore enforcement | `npm run test:gitignore` | R9.3: asserts no tracked file matches a `.gitignore` pattern (catches `git add -f` bypasses). |
| CI config check | `npm run test:ci-config` | R9.2: asserts `.github/workflows/ci.yml` has a gitleaks secret-scanning job. |
| Production server (bare) | `npm run server:prod` | Session 6: starts Fastify in production mode (`node dist/index.js`), default port 4000. |
| Production server (explicit) | `npm run server:start-prod` | Session 6: starts Fastify on port 5000 in production mode with `NODE_ENV=production`. |
| Production orchestrator | `./start_production.sh` | Session 6: builds + starts backend (5000) + frontend (5173) + health check + PID tracking. `./start_production.sh stop` to stop. |
| DB migrate | `npm run db:migrate` | Drizzle migrations (root delegates to `@embers/db`) |
| DB seed | `npm run db:seed` | 49 users, 320 posts, ~3000 comments (root delegates to `@embers/db`) |

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
- Test files: 8 in `apps/server/src/` (5 in `routes/`, 2 in `auth/`, 1 `config.test.ts` in root), 2 in `packages/db/src/`, 3 in `packages/shared/src/`, 17 in `apps/web/src/` (including `lib/api.test.ts` from Round 5, `auth/AuthProvider.test.tsx` + `auth/RequireAuth.test.tsx` from Rounds 6-7, `pages/LoginPage.test.tsx` from Round 6, `pages/RegisterPage.test.tsx` + `components/layout/Navbar.test.tsx` from Round 7), 3 E2E specs (`e2e/smoke.spec.ts` + `e2e/auth.spec.ts` + `e2e/live.spec.ts` from Round 8)
- **Total vitest count: 453** = 95 (server) + 67 (shared) + 29 (db) + 262 (web). Round 7 added 25 new web tests (11 RegisterPage + 8 Navbar + 5 RequireAuth + 1 api register-displayName) on top of the Round 6 baseline of 428. Round 8 did not add vitest tests — it silenced 6 React `act()` warnings in `LoginPage` + `RegisterPage` tests. **E2E: 18 local** (9 smoke + 9 auth lifecycle, added in Round 7) + **12 live-audit** (Round 8, opt-in via `LIVE_BASE_URL`).

### Backend Pitfalls

1. **Don't read `process.env` directly** — use `loadEnv()` (zod-validated, production-safe with required-field checks). As of session 6, `config.ts` loads `.env` and `.env.local` from the repo root via `dotenv` before `loadEnv()` runs -- precedence: shell vars > `.env.local` > `.env` > `loadEnv()` defaults. Never commit `.env` or `.env.local` (R9.1 incident -- see `docs/SECRET_ROTATION_GUIDE.md`).
2. **Don't forget WAL is skipped for `:memory:` DBs** — `openDb()` handles this automatically
3. **Don't use `db.transaction()` with the `tx` parameter** — better-sqlite3 is synchronous; the outer `db` already executes within the transaction. Use `db.transaction(() => { ... })`
4. **Don't add `import type` for Drizzle table imports** — tables are values (runtime objects), not types
5. **Don't rate-limit `/health`** — it's excluded from the auth rate limiter; the global limiter allows 100/min
6. **Don't leak stack traces** — `errorHandler` returns structured `{ error: { code, message, requestId } }` only
7. **Don't skip `requestId` plugin** — the error handler depends on `req.id` being set
8. **Don't commit secret-bearing files** (R9.1) — `.env`, `.env.local`, `env.bak`, and any `*.env` file must stay gitignored. CI runs `gitleaks` on every push (R9.2) and `npm run test:no-secrets` + `npm run test:gitignore` catch force-added files locally.

## Tech Stack

> See `CLAUDE.md` §Tech Stack for the full version table (React 19.2.6, Vite 7.3.2, Fastify 5.11.3, Drizzle 0.36.4, etc.). Versions are pinned in each workspace's `package.json`.

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

`/`, `/popular`, `/all` and `/explore` all render `HomePage`, which derives its scope from `location.pathname`. `/r/:name`, `/comments/:postId`, `/u/:username`, `/search?q=`, and `*` → `NotFoundPage` all render inside `AppShell` via `<Outlet />`. **`/login`** (Round 6) and **`/register`** (Round 7) render `LoginPage` / `RegisterPage` **outside** `AppShell` — no sidebar/navbar, just a centered form. **`/notifications`** (Round 7) is the first **protected** route — wrapped in `<RequireAuth>` which redirects anonymous users to `/login` with `state: { from: "/notifications" }` so the LoginPage can redirect back after successful login.

## Foundational API client (Round 5 — `apps/web/src/lib/api.ts`)

A typed, fetch-based client for the Fastify backend. **Not yet wired into any
page** — it is the foundation for the deferred B17–B22 frontend integration
(auth provider, React Query, optimistic UI, notification polling). Existing
Zustand store, `HashRouter`, and `src/data/*` deterministic layer are
untouched.

| Export | Purpose |
| --- | --- |
| `createApiClient(options)` | Factory; returns an object with `health`, `login`, `register`, `logout`, `refresh`, `getPosts`, `getPost`, `createPost`, `vote`, `getComments`, `createComment`, `search`, `getCommunities`, `getCommunity`, `getNotifications` methods |
| `ApiClient` | `ReturnType<typeof createApiClient>` — pass to hooks / store actions |
| `ApiError` | Thrown on non-2xx; carries `{ status, code, message, requestId }` mirroring the server's `errorHandler` plugin |
| `ApiClientOptions` | `{ baseUrl?, fetch?, getToken? }` — `fetch` + `getToken` are dependency-injected so the 22 unit tests run with zero network |

**Conventions:**
- The client is **pessimistic** by design. Optimistic UI (B21) will be added at the hook layer (`useVote`, `useCreateComment`) — this file stays rollback-free.
- `getToken` is a function (`() => string | null`), not a stored string. B18's `AuthProvider` will pass `() => authCtx.accessToken`; for now it defaults to `() => null` and the `Authorization` header is omitted.
- `baseUrl` defaults to `import.meta.env.VITE_API_URL ?? "http://localhost:4000"`. The `import.meta.env` access is cast through `unknown` so the file typechecks outside Vite (e.g. in unit tests).
- All paths use `encodeURIComponent` on dynamic segments — vote targets, post IDs, community slugs, search queries.

**Test coverage:** `apps/web/src/lib/api.test.ts` — 22 tests covering constructor defaults, every endpoint, auth header injection, cursor encoding, 4xx/5xx error mapping, and 204 No Content handling. Plus 9 new tests added in Round 6 (Slice 4) covering the 401 refresh-and-retry path (see "AuthProvider & LoginPage" below).

## AuthProvider & LoginPage (Round 6 — B18)

Round 6 executes Phase B18 (Auth Provider) from the Round 5 TDD breakdown. It is the first end-user-visible step of the deferred B17–B22 frontend integration: it wires the Round 5 `apps/web/src/lib/api.ts` client into a React context, adds a real `/login` page, and adds 401-refresh-retry logic to the API client — all without breaking the existing deterministic data layer or the 9 e2e smoke tests.

### What landed in Round 6

| File | Status | Purpose |
| --- | --- | --- |
| `apps/web/src/auth/AuthProvider.tsx` | New | React context + `useAuth()` hook. Holds the access token in a `useRef`, exposes `{ user, status, error, login, logout }`. |
| `apps/web/src/auth/AuthProvider.test.tsx` | New | 20 TDD tests covering initial state, login flow, logout flow, refresh-path wiring. |
| `apps/web/src/lib/api.ts` | Modified | Added `tryRefreshOn401` option + `onTokenRefresh` callback. On 401 with `tryRefreshOn401=true` && `getToken()` returning a token, calls `POST /api/auth/refresh` once and retries the original request with the new token. The `refresh()` method itself passes `skipRefresh: true` to prevent infinite loops. |
| `apps/web/src/lib/api.test.ts` | Modified | 9 new tests covering the refresh-and-retry path (3-fetch happy path, refresh-failure propagation, no-refresh-when-no-token, no-refresh-on-non-401, etc.). |
| `apps/web/src/pages/LoginPage.tsx` | New | Form with username + password inputs, submit handler calls `useAuth().login` then navigates to `/`, error alert with `role="alert"`, button with `aria-busy`, disabled-on-empty-credentials. |
| `apps/web/src/pages/LoginPage.test.tsx` | New | 10 TDD tests covering form rendering, submit, loading, error, navigation, accessibility. |
| `apps/web/src/App.tsx` | Modified | Added `/login` route OUTSIDE `AppShell` (no sidebar/navbar on login). |
| `apps/web/src/main.tsx` | Modified | Wrapped `<App />` in `<AuthProvider apiClientFactory={(opts) => createApiClient(opts)}>`. |

### Architecture decisions

1. **B18 before B17.** The Round 5 plan called for B17 (build refactor: remove singlefile, switch to BrowserRouter) first. Round 6 reverses this: B18 (auth provider) can be executed under the existing `HashRouter` + single-file build because `/login` works equally well as `#/login`. This trades a small amount of architectural purity for a much smaller blast radius. B17 becomes a future round that can lean on the auth context introduced here.
2. **The AuthProvider owns the token ref, not the api client.** The api client is built ONCE via `useMemo` with stable deps `[apiClientFactory, getToken, onTokenRefresh]`. `getToken` reads `tokenRef.current`; `onTokenRefresh` writes to it. The client never needs to be rebuilt when the token changes — it sees the live value via the closure.
3. **Refresh-and-retry is opt-in via `tryRefreshOn401`.** Defaults to `false` so all 22 pre-Round-6 api tests (which don't set the flag) continue to assert the original behavior. The AuthProvider sets it to `true` when wiring the factory.
4. **Refresh failure propagates the ORIGINAL 401.** If `POST /api/auth/refresh` itself returns 401 (refresh token revoked) or throws (network error), the original 401 is propagated to the caller — the refresh error is intentionally swallowed. The caller (a React Query hook, in B19+) decides whether to surface a re-login prompt. The AuthProvider does NOT intercept 401s on its own.
5. **logout() is best-effort.** Always clears client-side state regardless of whether the server-side `/api/auth/logout` call succeeds. A failed server logout must NOT leave the user stuck authenticated client-side.
6. **`/login` renders OUTSIDE AppShell.** No sidebar, no navbar, no right panel — just a centered form. The route is added before the `<Route element={<AppShell />}>` wrapper in `App.tsx`.

### AuthProvider API

```tsx
import { AuthProvider, useAuth } from "./auth/AuthProvider";

// Production wiring (already done in main.tsx):
<AuthProvider apiClientFactory={(opts) => createApiClient(opts)}>
  <App />
</AuthProvider>

// Consuming auth in a component:
function Header() {
  const { user, status, login, logout } = useAuth();
  if (status === "authenticated" && user) {
    return <button onClick={logout}>Log out {user.username}</button>;
  }
  return <Link to="/login">Log in</Link>;
}
```

### Testing conventions

- Tests inject a stub `apiClientFactory` that captures the options (`getToken`, `tryRefreshOn401`, `onTokenRefresh`) and returns a mocked client. No network calls.
- All async state updates are wrapped in `act()` from `@testing-library/react` to silence the React 18 testing-library warning.
- The `captureAuth()` helper grabs the latest `useAuth()` value into an outer ref-like object so tests can assert against it after async settles.

## Auth UI completion (Round 7 — B18 finished)

Round 7 closes the gap left by Round 6: the AuthProvider existed but the UI still showed the hardcoded `CURRENT_USER`, the auth flow had no `/register` page, and protected routes had no guard.

### What landed in Round 7

| File | Status | Purpose |
| --- | --- | --- |
| `apps/web/src/pages/RegisterPage.tsx` | New | Register form with login-after-register flow. Client-side validation (username ≥3, password ≥8, passwords match). On submit: `auth.register()` → `auth.login()` → navigate `/`. |
| `apps/web/src/pages/RegisterPage.test.tsx` | New | 11 TDD tests covering form rendering, submit flow, validation, loading, navigation, accessibility. |
| `apps/web/src/components/layout/Navbar.tsx` | Modified | Replaced `CURRENT_USER` import with `useAuth()`. Anonymous: shows "Log in" + "Sign up" links. Authenticated: shows avatar + username + karma + real "Log out" that calls `auth.logout()`. Notifications bell gated on authenticated status. |
| `apps/web/src/components/layout/Navbar.test.tsx` | New | 8 TDD tests covering anonymous + authenticated states, logout flow. |
| `apps/web/src/auth/RequireAuth.tsx` | New | Route guard. Anonymous → `<Navigate to="/login" state={{ from: location.pathname }} replace />`. Authenticated → children. Loading → null (avoids flash of login page). |
| `apps/web/src/auth/RequireAuth.test.tsx` | New | 5 TDD tests covering redirect, state preservation, authenticated rendering. |
| `apps/web/src/App.tsx` | Modified | Added `/register` route (outside AppShell). Wrapped `/notifications` in `<RequireAuth>`. |
| `e2e/auth.spec.ts` | New | 9 E2E auth lifecycle tests (register → login → access protected → logout → refresh revoked; taken username → 409; wrong password → 401; invalid token → 401; refresh rotation; validation 422s). |
| `apps/web/src/auth/AuthProvider.tsx` | Modified | Widened `AuthUser` to full server shape (displayName, karma, etc.). Added `register()` method to context value. |
| `apps/web/src/lib/api.ts` | Modified | Widened `AuthUser`. Fixed `register()` return type from `LoginResponse` to new `RegisterResponse` (`{ user }` — no access token). Added optional `displayName` param. |

### Key contracts

1. **`/api/auth/register` returns `{ user }` only (201)** — no access token, no refresh cookie. The client MUST call `/api/auth/login` afterwards to establish a session. `RegisterPage` orchestrates this: `await auth.register(...)` → `await auth.login(...)` → `navigate("/")`.
2. **`AuthUser` is the full server shape** (id, username, displayName, bio, karma, createdAt, colorFrom, colorTo) — mirrors `authUserSchema` from `@embers/shared`. The Navbar uses `displayName` + `karma`.
3. **`<RequireAuth>` preserves the intended destination** via `state: { from: location.pathname }`. LoginPage can read this via `useLocation().state.from` to redirect back after successful login (not yet implemented in LoginPage — deferred to a future round).
4. **`/notifications` is the first protected route.** Other routes (/, /r/:name, /comments/:id, /u/:username, /search) remain open — they render deterministic demo data when anonymous. B19/B20 will migrate them to React Query + API calls, at which point they'll also need `<RequireAuth>`.

### What Round 7 did NOT do (deferred)

- **B17 (build refactor)** — deferred again. Removing `vite-plugin-singlefile` + switching to `BrowserRouter` would break the "deploy anywhere" story (GitHub Pages, `python -m http.server`, S3 without SPA fallback). Needs explicit user confirmation. See `docs/REMEDIATION_PLAN_ROUND_7.md` §1.2 for the full rationale.
- **B19–B22** (React Query, feeds/search wiring, optimistic UI, notification polling) — depend on B17. Deferred.
- **LoginPage post-login redirect back to `state.from`** — the `state.from` is preserved by `<RequireAuth>` but LoginPage currently always navigates to `/`. A future round can read `location.state?.from` and redirect back.
- **Browser-level E2E tests of the React auth flow** — the E2E setup only starts the Fastify server, not the Vite dev server. The 9 new E2E tests verify the server-side auth contract, not the React rendering. Browser-level tests would require adding the Vite dev server to `playwright.config.ts`'s `webServer` config.

## Docker (B23 — Round 3)

A multi-stage `Dockerfile` at the repo root builds a production image for
`@embers/server` only. The client SPA is not containerised (ADR-003 single-file
build is still in force).

| File | Purpose |
| --- | --- |
| `Dockerfile` | Multi-stage Node 20 build: builder stage runs `npm ci` + `npm run build` + `npm prune --omit=dev`; runner stage copies `dist/` + production `node_modules/`. `CMD ["node", "apps/server/dist/index.js"]`. |
| `.dockerignore` | Excludes `node_modules`, `**/dist`, `*.db*`, `.git`, `skills/`, `docs/`, `e2e/` from the build context. |
| `docker-compose.yml` | Single `embers-server` service: builds from `Dockerfile`, maps port 4000, mounts `embers-data` volume for `/data/dev.db`, requires `JWT_ACCESS_SECRET` + `JWT_REFRESH_SECRET` from `.env`. |
| `.github/workflows/ci.yml` | GitHub Actions: `test` (typecheck + vitest) → `build` (all workspaces) → `e2e` (Playwright). Runs on push + PR to `main`. |

**Production secrets:** the image refuses to start without `JWT_ACCESS_SECRET`
and `JWT_REFRESH_SECRET` (each ≥32 chars) — enforced by `loadEnv()` in
`apps/server/src/config.ts`. Provide them via `docker compose --env-file .env`
or `docker run -e JWT_ACCESS_SECRET=… -e JWT_REFRESH_SECRET=…`.

## E2E Testing — Playwright (B24 — Round 3)

| File | Purpose |
| --- | --- |
| `playwright.config.ts` | Single chromium project, `webServer` that runs `npx tsx e2e/start-server.ts` with a fresh seeded DB at `/tmp/embers-e2e.db`. |
| `e2e/start-server.ts` | Bootstrap script: deletes prior DB → opens + migrates + seeds → starts Fastify on the same process (shares the DB handle). |
| `e2e/smoke.spec.ts` | 9 smoke tests: `/health`, register+login, login demo user, login wrong password, feed list, single post, search, empty-q 422, communities list. |
| `e2e/auth.spec.ts` | 9 auth lifecycle tests (Round 7): register → login → access protected endpoint → 200; register → login → logout → refresh revoked → 401; taken username → 409; wrong password → 401; no auth → 401; invalid token → 401; refresh rotation; validation 422s (short username, short password). |

**Run locally:**

```bash
npm run test:e2e:install   # one-time: install chromium browser
npm run test:e2e           # runs all 18 tests (9 smoke + 9 auth lifecycle) against a fresh seeded DB
```

**Run in CI:** the GitHub Actions `e2e` job (see `.github/workflows/ci.yml`)
installs Playwright, builds the server workspaces, and runs `npx playwright test`
with `NODE_ENV=test` env vars. Playwright reports are uploaded as artifacts.

**Conventions:**
- The `webServer` config starts the server with `DATABASE_URL=/tmp/embers-e2e.db`
  (file-based, not in-memory — better-sqlite3 in-memory DBs are per-connection,
  so a separate seed process and server process would each get an empty DB).
- `reuseExistingServer: !process.env.CI` — local dev reuses a running server
  on port 4000 if one exists; CI always starts a fresh one.
- `workers: 1` — the seeded DB is shared across tests; parallel workers would
  race on auth state. Tests are sequential by design.
- `fullyParallel: false` — same reason.

## Repo Hygiene (Round 3)

- `dist/` directories are gitignored (`.gitignore` lines: `dist/`,
  `apps/server/dist/`, `packages/*/dist/`). **Never commit build artifacts.**
- If you see `dist/` files in `git status`, you probably ran `npm run build`
  and then `git add .` — use `git add -A` followed by `git status` to verify,
  or use `git add <specific files>` instead.
### Pre-commit checklist

```bash
npm run lint        # ESLint flat config — 0 errors, 0 warnings
npm run typecheck   # tsc --noEmit — must pass clean (pretypecheck hook builds shared+db first)
npm test            # vitest run (all workspaces) — all 453 tests must pass
npm run test:e2e    # playwright run — 18 tests must pass (9 smoke + 9 auth lifecycle)
npm run test:build  # asserts dist/index.html is a production build (no Vite dev modules)
npm run test:no-secrets  # asserts no .env / env.bak / *.env files are tracked by git
npm run test:gitignore   # asserts no tracked file matches a .gitignore pattern
npm run test:ci-config   # asserts .github/workflows/ci.yml has a gitleaks job
npm run build       # topological build — must succeed
git ls-files | grep -E '(^|/)dist/' | wc -l   # must be 0 (no dist/ tracked)
```

> **Opt-in checks (not in pre-commit):**
> - `npm run test:fresh-clone` — simulates a fresh clone and asserts `npm run typecheck` succeeds.
> - `LIVE_BASE_URL=https://reddit.jesspete.shop/ npm run test:e2e:live` — opt-in live-deployment audit (12 tests). Skipped when `LIVE_BASE_URL` is unset.

See `CLAUDE.md` §Pre-commit checklist for the canonical list.

## ESLint (Round 4)

ESLint 9 flat config at `eslint.config.mjs` (repo root). Run `npm run lint`
from root — lints all workspaces in one pass.

| Config block | Files | Key rules |
| --- | --- | --- |
| Base (JS + TS recommended) | all `*.{ts,tsx,js,mjs}` | `@typescript-eslint/no-explicit-any: error`, `@typescript-eslint/consistent-type-imports: error`, `@typescript-eslint/no-unused-vars: error` (with `^_` ignore pattern) |
| Node source | `apps/server/src/**`, `packages/shared/src/**`, `packages/db/src/**` | `no-console: warn` (allow warn/error/info) |
| React source | `apps/web/src/**/*.{ts,tsx}` | React + react-hooks recommended, `react-hooks/exhaustive-deps: error`, `react/react-in-jsx-scope: off` (jsx: react-jsx handles it) |
| Test files | `**/*.test.{ts,tsx}`, `**/*.spec.{ts,tsx}` | Vitest globals (`describe`, `it`, `expect`, `beforeAll`, `afterAll`, `vi`) declared as `readonly` |
| E2E bootstrap | `e2e/**/*.ts` | `no-console: off` (intentional logs) |
| CLI scripts | `packages/db/scripts/**` | `no-console: off` (CLI user output) |

**Ignores:** `node_modules/`, `**/dist/`, `coverage/`, `playwright-report/`,
`test-results/`, `public/`, `skills/`, `docs/`, `*.config.{ts,js,mjs,cjs}`,
`.github/`.

**Adaptation notes (vs. the sample Next.js config):**
- `@next/eslint-plugin-next` is NOT used — `apps/web` is Vite, not Next.js.
- The 5-layer architecture enforcement block is removed — embers uses a
  composition-root pattern, not the Next.js `proxy → app → features → domain → lib` layout.
- React rules are scoped to `apps/web/src/**` only — server and packages have
  no JSX.

**Subtle bug fixed during Round 4:** the initial config file failed to load
with `SyntaxError: Unexpected token '*'` because the JSDoc comment block
contained the glob pattern `**/*.{ts,tsx}`, and the `*/` sequence inside that
string prematurely closed the comment block. Never include `*/` inside a
`/** ... */` comment — even inside backticks or quotes.
