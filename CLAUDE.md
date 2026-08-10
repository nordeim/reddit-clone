# embers — Reddit-style Community Feed

> **Monorepo transition (2026-08-09):** This repo is now an npm-workspaces
> monorepo. The client SPA documented below lives at `apps/web/` (workspace
> `@embers/web`) and continues to follow every convention listed here. New
> workspaces: `@embers/server` (Fastify backend), `@embers/shared` (Zod
> schemas + branded IDs), `@embers/db` (Drizzle ORM + SQLite + FTS5).
> Run workspace-scoped commands via `npm test --workspace @embers/web`,
> `npm run typecheck --workspace @embers/web`, etc. See `README.md` for
> the full monorepo layout and `docs/REMEDIATION_EXECUTION_PLAN.md` for
> the execution log (B0–B16 done, B17–B22 deferred, B23 + B24 done in
> Round 3, ESLint added in Round 4 — see §9 / §10 of that file).

---

The original client-only React SPA lives at `apps/web/` (`@embers/web`): **no backend, no API, no `fetch`** — all content is generated deterministically in the browser via seeded PRNGs. Three backend workspaces (`@embers/server`, `@embers/db`, `@embers/shared`) provide a Fastify REST API, Drizzle ORM data layer, and shared Zod contracts.

**Related docs:** `AGENTS.md` — comprehensive codebase reference (architecture, data layer contracts, full route table, backend patterns). Read it for deep context; this file focuses on daily implementation conventions.

## Tech Stack

### Client (`apps/web`)

| Layer | Technology | Version |
|---|---|---|
| Framework | React | 19.2.6 |
| Build | Vite | 7.3.2 |
| Language | TypeScript | 5.9.3 (strict) |
| CSS | Tailwind CSS | 4.1.17 (CSS-first `@theme`) |
| Routing | react-router-dom | 7.18.2 (`HashRouter`) |
| State | zustand | 5.0.14 (`persist` middleware) |
| Animation | framer-motion | 13.x |
| Icons | lucide-react | 1.31.0 |
| Utilities | clsx + tailwind-merge | 2.1.1 / 3.4.0 |
| Testing | vitest + @testing-library/react | 2.1.9 / 16.x |
| Test env | jsdom | 25.x |

### Backend (`apps/server`, `packages/{db,shared}`)

| Layer | Technology | Version |
|---|---|---|
| API Framework | Fastify | 5.11.3 |
| ORM | Drizzle ORM | 0.36.4 |
| Database | better-sqlite3 | 13.0.3 (prebuilt binaries) |
| Auth | jose (JWT) + argon2 (hashing) | 5.10.0 / 0.41.1 |
| Validation | zod | 3.25.76 |
| Logging | pino | 9.14.0 |
| Testing | vitest + Fastify inject | 2.1.9 |
| Runtime | Node.js | ≥20 |

Tests are colocated with source as `*.test.ts(x)`. The vitest config lives in each workspace's `vitest.config.ts`. ESLint 9 flat config (`eslint.config.mjs` at repo root) was added in Round 4 — see the "ESLint Conventions (Round 4)" section below.

## Commands

### All workspaces (run from root)

| Command | Purpose |
|---------|---------|
| `npm run dev --workspace @embers/web` | Vite dev server (default `:5173`) |
| `npm run dev --workspace @embers/server` | Fastify dev server (default `:4000`) |
| `npm run build` | Build all — **topological**: `shared → db → server → web` |
| `npm run typecheck` | Typecheck all — same order |
| `npm test` | Test all via `--workspaces` (do NOT run `vitest run` from root) |
| `npm run db:migrate --workspace @embers/db` | Apply Drizzle migrations |
| `npm run db:seed --workspace @embers/db` | Seed dev.db (49 users, 320 posts, etc.) |

### Per-workspace

| Command | Purpose |
|---------|---------|
| `npm run build --workspace @embers/server` | Build one workspace |
| `npm test --workspace @embers/db` | Test one workspace |
| `npm run typecheck --workspace @embers/shared` | Typecheck one workspace |

`build` is bare `vite build`, not `tsc -b && vite build`. Always run `npm run typecheck` before claiming a change compiles. Run `npm test` before claiming a change is correct — every code change should ship with tests (TDD: red → green → refactor).

## Critical Build Constraints

These are non-negotiable. Violating them breaks the build or runtime.

### Client (`apps/web`)

1. **No code splitting.** `vite-plugin-singlefile` inlines everything into one `dist/index.html`. Never add `React.lazy`, dynamic `import()`, or manual chunks.
2. **`HashRouter`, not `BrowserRouter`.** Deliberate — enables static hosting without rewrite rules. Don't switch it.
3. **Dist is gitignored.** Both `node_modules/` and `dist/` are in `.gitignore`, so neither pollutes `git status`.
4. **Google Fonts + images load externally.** `index.css` `@import`s Inter from Google Fonts; `public/images/*.jpg` are referenced as `${import.meta.env.BASE_URL}images/...`. Opening `dist/` over `file://` breaks both. Serve from a web root.
5. **Tailwind v4 has no config file.** Theme lives in `src/index.css` under `@theme`. No `tailwind.config.js`, no PostCSS config. Use CSS custom properties like `var(--color-orange-500)` in plain CSS — the `theme()` function syntax from v3 does NOT work.

### Backend (`apps/server`, `packages/{db,shared}`)

6. **Prebuilt binaries, no compilation.** `better-sqlite3@13.0.3` ships prebuilt `.node` binaries in `prebuilds/`. Install scripts being blocked is **fine** — no `node-gyp` needed. The native module loads via platform subpath exports (`./linux-x64` → `prebuilds/linux-x64.node`).
7. **ESM everywhere.** All backend workspaces are `"type": "module"`. Use `.js` extensions in relative imports (e.g., `import { foo } from "./bar.js"`).
8. **`buildApp()` is the composition root.** Tests use `app.inject()` — no port binding. API routes only register when `db` + `rawDb` are passed.
9. **Env via `loadEnv()` only.** Server reads config through zod-validated `loadEnv()` — never `process.env` directly. Production requires `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `DATABASE_URL`, `CORS_ORIGIN`.

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

## Backend Data Layer

The backend uses **Drizzle ORM** with `better-sqlite3` — a completely different data layer from the client's deterministic generation.

### Schema (`packages/db/src/schema/index.ts`)

7 tables: `users`, `communities`, `posts`, `comments`, `votes`, `notifications`, `sessions`.

- All IDs are `text`. API-created rows use UUIDs (`p-${uuid}`, `u-${uuid}`), but seed data uses deterministic IDs (`u1`…`u48`, `p1`…`p320`, `c1`…`cN`)
- Timestamps are `text`. All `created_at` columns default to SQLite `CURRENT_TIMESTAMP` (`YYYY-MM-DD HH:MM:SS`). Only seed data and session-expiry writes use `toISOString()` (ISO 8601)
- `votes` has a composite PK `(user_id, target_id, target_type)` — one vote per user per target
- `sessions` stores refresh-token JTIs for revocation

### FTS5 Full-Text Search (`packages/db/src/fts5.ts`)

- Virtual table `posts_fts` with external-content pattern (`content='posts'`, `content_rowid='rowid'`) — halves storage
- Sync triggers: `posts_ai` (insert), `posts_ad` (delete), `posts_au` (update)
- BM25 ranking via `searchPosts(db, query, limit, offset)`

### Branded IDs (`packages/shared/src/ids.ts`)

Nominal-typed string aliases (`UserId`, `PostId`, etc.) that prevent passing the wrong ID type. Erased at runtime, enforced at compile time. Use `asUserId()` to lift a raw string.

### Migrations & Seed

- **Migrations**: `npm run db:generate` (drizzle-kit) → SQL in `src/migrations/`, applied via `npm run db:migrate`
- **Seed**: `npm run db:seed` — deterministic PRNG → 49 users, 18 communities, 320 posts, ~3037 comments, 18 notifications. Demo user: `you` / `embers-demo`

### SQLite Hardening

Applied by `openDb()` in `packages/db/src/client.ts`:
- `PRAGMA journal_mode=WAL` (skipped for `:memory:`)
- `PRAGMA busy_timeout=5000`
- `PRAGMA foreign_keys=ON`
- `PRAGMA synchronous=NORMAL`

## Backend Architecture (ADRs)

| ADR | Decision |
|---|---|
| ADR-101 | REST + Zod API contract (`@embers/shared`) |
| ADR-102 | Fastify web framework (plugin-based, inject-based testing) |
| ADR-103 | SQLite + Drizzle ORM (WAL, busy_timeout=5000) |
| ADR-104 | JWT auth (15m access + 7d refresh, HttpOnly cookies) |
| ADR-107 | npm-workspaces monorepo |
| ADR-108 | Transactional atomic vote counters (`UPDATE … SET col = col + delta`) |
| ADR-109 | SQLite FTS5 virtual tables for full-text search |
| ADR-110 | Pino structured logging + requestId correlation |

Deferred: ADR-105 (React Query), ADR-106 (BrowserRouter), B17–B22 (frontend integration — see `docs/REMEDIATION_PLAN_ROUND_5.md`). B23 (Docker/GHA) and B24 (Playwright E2E) were completed in Round 3.

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

### Client (`apps/web`)

Tests use **Vitest** with the **Testing Library** + **jsdom** environment.

- Config: `vitest.config.ts` (separate from `vite.config.ts`).
- Setup file: `src/test/setup.ts` — imports `@testing-library/jest-dom/vitest`, stubs `IntersectionObserver` and `matchMedia`.
- Router helper: `src/test/utils.tsx` exports `renderWithRouter` which wraps a component in `MemoryRouter`.
- Test files live alongside source as `*.test.ts(x)`.
- TDD: write the failing test first (RED), implement the minimum to pass (GREEN), then refactor.
- Never weaken or skip a test to make the build pass.

### Backend (`apps/server`, `packages/{db,shared}`)

Tests use **Vitest** with **Fastify's `inject()`** — no port binding needed.

- **Fresh DB per test**: `openDb({ path: ":memory:" })` creates an isolated in-memory SQLite instance.
- **Wire everything**: `buildApp({ env, db, rawDb })` registers repositories + routes for integration tests.
- **Skip middleware**: `skipHelmet`/`skipRateLimit` options (rate-limit auto-disabled in `NODE_ENV=test`).
- **Auth flow**: tests log in as the seeded demo user (`you` / `embers-demo`) to get access tokens.
- **Direct seeding**: performance tests (vote concurrency) insert users directly via Drizzle to bypass Argon2id.
- Test files: `*.test.ts` alongside source — 8 in server, 2 in db, 3 in shared.

### Pre-commit checklist

```bash
npm run lint        # ESLint flat config — 0 errors, 0 warnings (Round 4)
npm run typecheck   # tsc --noEmit — must pass clean
npm test            # vitest run (all workspaces) — all 389 tests must pass
npm run test:e2e    # playwright run — 9 smoke tests must pass (B24, Round 3)
npm run build       # topological build — must succeed
git ls-files | grep -E '(^|/)dist/' | wc -l   # must be 0 (no dist/ tracked)
```

> **Test count breakdown (389 total):** `@embers/web` = 198 (incl. 22 in
> `src/lib/api.test.ts` added Round 5), `@embers/server` = 95,
> `@embers/shared` = 67, `@embers/db` = 29. The previously documented total
> of 367 (Round 4) was superseded when Round 5 added the foundational web
> API client test suite.

**Build-before-test prerequisite (Round 5):** `@embers/server`'s test suites import
`@embers/db` and `@embers/shared` as runtime packages, so their `dist/` builds
must exist before `npm test --workspaces` runs. The root `package.json` has a
`pretest` script that builds `@embers/shared` and `@embers/db` first, so a fresh
`git clone && npm install && npm test` works without manual `npm run build`.
If you skip the pretest (e.g. `npm test --ignore-scripts`), run
`npm run build --workspace @embers/shared && npm run build --workspace @embers/db`
first or the server's 4 route test suites will fail with
`Failed to resolve entry for package "@embers/db"`.

### Coverage (Round 5)

`@vitest/coverage-v8` is installed in `@embers/server`. Run server tests with
coverage via:

```bash
npm test --workspace @embers/server -- --coverage
```

The `apps/server/vitest.config.ts` enables v8 coverage with sensible defaults
(`src/**/*.ts`, exclude `*.test.ts` and `index.ts`). Coverage thresholds are
NOT enforced in CI yet — they are informational. The DoD's "80% backend coverage"
line in `docs/REMEDIATION_PLAN.md` is therefore aspirational, not enforced.

### Manual smoke verification

`apps/server/verify_claims.ts` is a one-off script that boots the server with an
in-memory seeded DB and verifies four runtime invariants: login status code,
access token presence, CSP header, and rate-limit headers. Run it via
`npx tsx apps/server/verify_claims.ts` from the repo root. It is not part of the
automated test suite (it duplicates what `api.test.ts` + `hardening.test.ts`
already cover) but is useful for ad-hoc manual checks before a release.

**Round 3 additions:**
- `Dockerfile` + `docker-compose.yml` + `.dockerignore` at repo root (B23).
- `.github/workflows/ci.yml` runs lint + typecheck + test + build + e2e on push/PR.
- `playwright.config.ts` + `e2e/smoke.spec.ts` + `e2e/start-server.ts` (B24).
- `npm run test:e2e` runs the 9 Playwright smoke tests.
- `npm run test:e2e:install` installs the chromium browser (one-time).
- `dist/` artifacts must NEVER be committed. The previous `remediation 3`
  commit (16d482c) accidentally force-added 96 build artifacts; Round 3
  untracked them via `git rm -r --cached`. Pre-commit check above enforces
  this going forward.

**Round 4 additions:**
- ESLint 9 flat config at `eslint.config.mjs` (repo root).
- `npm run lint` and `npm run lint:fix` scripts in root `package.json`.
- 6 lint errors fixed: 4 `import()` type annotations → top-level `import type`,
  1 `let` → `const` (`prefer-const`), 1 stale `eslint-disable` directive removed.
- 10 `console.log` warnings in CLI scripts resolved via ESLint override
  (`no-console: off` for `packages/db/scripts/**`).
- CI workflow runs `npm run lint` before `typecheck` and `test`.
- ESLint config adapted from the sample Next.js config: `@next/eslint-plugin-next`
  removed (not used), 5-layer architecture enforcement removed (different
  pattern), React rules scoped to `apps/web/src/**` only.

**Round 5 additions (doc-alignment + infra hygiene):**
- Fixed stale "No ESLint" line in this file (§Tech Stack → Backend) and in
  `README.md`. Both files originally said "No ESLint"; both now reference the
  Round 4 flat config.
- Fixed stale `Deferred` line in this file (§Backend Architecture → ADRs) —
  B23 + B24 are done, not deferred.
- Added `pretest` script to root `package.json` that builds `@embers/shared` and
  `@embers/db` before `npm test --workspaces`, so a fresh clone passes tests
  out-of-the-box.
- Added `@vitest/coverage-v8` to `@embers/server` and enabled v8 coverage in
  `apps/server/vitest.config.ts`. Coverage is informational (no CI gate yet).
- Documented `apps/server/verify_claims.ts` (manual smoke script).
- Added `apps/web/src/lib/api.ts` — foundational fetch-based API client for the
  deferred B17–B22 frontend integration. Non-breaking: existing Zustand store
  + HashRouter + deterministic data layer are untouched.
- New `docs/REMEDIATION_PLAN_ROUND_5.md` with a detailed TDD breakdown for
  B17–B22 (the still-deferred frontend integration phases).

### ESLint Conventions (Round 4)

- **Flat config** (`eslint.config.mjs`), not legacy `.eslintrc`.
- **`@typescript-eslint/no-explicit-any: error`** — matches the existing
  "Don't use `any`. Use `unknown`." convention. No exceptions.
- **`@typescript-eslint/consistent-type-imports: error`** — all type-only
  imports must use `import type { X }` (not inline `import("pkg").X`). This
  is required for `isolatedModules` compatibility.
- **`react-hooks/exhaustive-deps: error`** — strict dependency-array
  enforcement. If you disable it for a specific line, remove the directive
  when the code is refactored so the dependency array becomes correct.
- **`no-console: warn`** in server/package source — use `app.log.info()` /
  `app.log.error()` (Fastify's Pino logger) instead of `console.log`.
  Exceptions: CLI scripts (`packages/db/scripts/**`) and E2E bootstrap
  (`e2e/**`) where `no-console: off`.
- **Unused vars** — `@typescript-eslint/no-unused-vars: error` with
  `argsIgnorePattern: '^_'`, `varsIgnorePattern: '^_'`,
  `caughtErrorsIgnorePattern: '^_'`. Prefix intentionally-unused bindings
  with `_` (e.g., `catch (_err)`, `function handler(_req, reply) { ... }`).
- **Never include `*/` inside a JSDoc block comment** — the `*/` sequence
  always closes the comment, even inside backticks or quotes. This caused
  a `SyntaxError: Unexpected token '*'` during Round 4 setup.

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
reddit-clone/
├── apps/
│   ├── web/                 ← @embers/web (React SPA, Vite, 198 tests)
│   │   └── src/             # See AGENTS.md for full web tree.
│   │                        # Note: `lib/api.ts` (Round 5) is the foundational
│   │                        # fetch-based client for the deferred B17–B22
│   │                        # frontend integration — not yet wired into pages.
│   └── server/              ← @embers/server (Fastify, 95 tests)
│       └── src/
│           ├── app.ts       # buildApp() composition root
│           ├── index.ts     # Entry point (listen + graceful shutdown)
│           ├── config.ts    # loadEnv() zod-validated env
│           ├── auth/        # jwt.ts, password.ts (Argon2id)
│           ├── plugins/     # requestId, auth, errorHandler (local files); helmet/cors/cookie/rateLimit are @fastify/* registered inline in app.ts
│           ├── repositories/ # userRepository, postRepository, voteRepository, etc.
│           ├── services/    # voteService (transactional), commentTreeService
│           └── routes/      # health, auth, posts, communities, votes, comments, search, notifications
├── packages/
│   ├── shared/              ← @embers/shared (Zod + branded IDs, 67 tests)
│   │   └── src/
│   │       ├── ids.ts       # Branded ID types + constructors
│   │       ├── schemas/     # Entity Zod schemas
│   │       └── api/         # API input/output schemas per endpoint
│   └── db/                  ← @embers/db (Drizzle + SQLite + FTS5, 29 tests)
│       └── src/
│           ├── client.ts    # openDb() — connection + hardening pragmas
│           ├── fts5.ts      # FTS5 virtual table + sync triggers + searchPosts()
│           ├── schema/      # Drizzle table definitions (7 tables)
│           └── seed/        # Deterministic seed script
├── docs/                    # Architecture, remediation plans, QA
└── package.json             # Root workspaces config + fan-out scripts
```

## Routes

### Client (HashRouter)

| Path | Page |
|---|---|
| `/`, `/popular`, `/all`, `/explore` | HomePage (scope derived from pathname) |
| `/r/:name` | CommunityPage |
| `/comments/:postId` | PostPage |
| `/u/:username` | ProfilePage |
| `/search` | SearchPage |
| `/notifications` | NotificationsPage |
| `*` | NotFoundPage |

### Server API

| Method | Path | Auth | Purpose |
|---|---|---|---|
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

## Local ID Patterns

Generated IDs use stable prefixes (`p1…p320`, `u1…u48`, `${postId}-c1…cN`). Local (user-created) IDs are timestamp-based:

- Posts: `` `local-${Date.now()}` ``
- Top-level comments: `` `${postId}-c${Date.now()}` ``
- Nested replies: `` `${comment.id}-r${Date.now()}` ``

This is why vote keys are namespaced (`post:` / `comment:`) — to avoid collisions between local and generated IDs.

## Pitfalls to Avoid

### Client

1. **Don't add `React.lazy` or dynamic `import()`.** Defeats `vite-plugin-singlefile`.
2. **Don't switch to `BrowserRouter`.** Hash routing is intentional.
3. **Don't mutate generated data.** Add overlay slices for new user-mutable features.
4. **Don't forget `partialize`.** New persisted fields must be whitelisted or they silently won't survive reload.
5. **Don't use `any`.** Use `unknown`. The codebase is `strict` mode — `noUnusedLocals`/`noUnusedParameters` catch dead code.
6. **Don't use absolute imports.** All imports are relative; match the convention.
7. **Don't remove simulated latency.** It's intentional UX paired with skeleton states.
8. **Don't call `getCommunity(id)` without a try/catch.** It throws on miss — use `getCommunityByName` for safe lookups.
9. **Don't import React.** `jsx: react-jsx` handles it automatically.

### Backend

10. **Don't read `process.env` directly.** Use `loadEnv()` — it's zod-validated and enforces production required-fields.
11. **Don't add `import type` for Drizzle tables.** Tables are runtime values (the `comments` import bug in Round 2).
12. **Don't use the `tx` param in `db.transaction()` for better-sqlite3.** It's synchronous — outer `db` already executes within the transaction. Use `db.transaction(() => { ... })`.
13. **Don't leak internals.** The error handler returns `{ error: { code, message, requestId } }` only — no stack traces.
14. **Don't skip the `requestId` plugin.** The error handler depends on `req.id`.
15. **Don't forget `.js` extensions in ESM imports.** All backend workspaces are `"type": "module"`.
16. **Don't forget WAL is skipped for `:memory:` DBs.** `openDb()` handles this — don't override.
