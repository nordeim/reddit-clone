# embers — Remediation Execution Plan (Validated)

**Status:** ACTIVE EXECUTION PLAN
**Source of truth for:** the B0–B24 backlog defined in `docs/REMEDIATION_PLAN_2.md`
**Generated:** 2026-08-09
**Approach:** TDD (red → green → refactor) for every code-bearing phase
**Branch policy:** `main` only — no feature branches (per orchestrating instruction)

---

## 1. Validation of the Source Plans Against the Codebase

This section records what was actually found in the repository and how it maps
to the proposals in `docs/IMPLEMENTATION_PLAN.md` and `docs/REMEDIATION_PLAN_2.md`.

### 1.1 What `IMPLEMENTATION_PLAN.md` proposes vs. what exists

`IMPLEMENTATION_PLAN.md` is the original greenfield plan that produced the
current `embers` codebase. Its proposals are already realised:

| Proposal in `IMPLEMENTATION_PLAN.md` | Status in codebase | Evidence |
| --- | --- | --- |
| Feature-sliced frontend (`core`, `state`, `data`, `ui`, `features`, `pages`) | Implemented | `src/{store,data,types,components,pages,hooks,utils}/` |
| Repository layer over seed data | Implemented | `src/data/{users,communities,posts,comments,notifications,images}.ts` accessors |
| Persisted vs. ephemeral state separation | Implemented | `partialize` whitelist in `src/store/storage.ts`; `toasts` excluded |
| Storage validation | Implemented | `validatePersistedState` + `mergePersistedState` in `src/store/storage.ts` |
| Accessible overlays | Implemented | `useFocusTrap`, `aria-expanded`, skip link, `MotionConfig reducedMotion="user"` |
| URL-driven feed sort / search tab / notification filter | Implemented | `?sort=`, `?tab=`, `?filter=` URL sync |
| TDD with Vitest + Testing Library | Implemented | 176 tests across 11 files, all green |

**Conclusion:** `IMPLEMENTATION_PLAN.md` requires no remediation. It is the
*historical* plan. The actionable work is in `REMEDIATION_PLAN_2.md`.

### 1.2 What `REMEDIATION_PLAN_2.md` proposes vs. what exists

`REMEDIATION_PLAN_2.md` proposes a complete architectural pivot from a
client-only SPA to a full-stack enterprise application. The 10 new ADRs
(ADR-101 … ADR-110) supersede every existing ADR in the PAD.

| New ADR | Proposal | Codebase state today | Action |
| --- | --- | --- | --- |
| ADR-101 | REST + Zod API contract | No backend exists | Build `apps/server` |
| ADR-102 | Fastify | No backend exists | Build `apps/server` |
| ADR-103 | SQLite + Drizzle | Data is PRNG-generated in-browser | Build `packages/db`, port PRNG to seed |
| ADR-104 | JWT auth (15m access + 7d refresh) | `CURRENT_USER` hardcoded | Build auth module + endpoints |
| ADR-105 | React Query + Zustand split | Zustand only (single store) | **Defer** — frontend refactor (B17–B22) |
| ADR-106 | BrowserRouter + chunked build | HashRouter + single-file build | **Defer** — frontend refactor (B17–B22) |
| ADR-107 | npm-workspaces monorepo | Single-package Vite root | Restructure into `apps/{web,server}` + `packages/{shared,db}` |
| ADR-108 | Transactional vote counters | Local overlay mutation | Build `PUT /api/votes/:targetId` with atomic DB increment |
| ADR-109 | SQLite FTS5 search | Client-side `Array.filter` | Build FTS5 virtual tables + `GET /api/search` |
| ADR-110 | OpenTelemetry + Pino structured logs | `console.log` only | Add Pino + request-id correlation |

### 1.3 Scope decision: what is in this execution pass

| Phase bucket | In scope now | Deferred (documented in §5) | Reason |
| --- | --- | --- | --- |
| B0 Monorepo init | ✅ | — | Foundation |
| B1 Shared types (Zod) | ✅ | — | Foundation |
| B2 Backend scaffold (Fastify + Pino + Zod) | ✅ | — | Foundation |
| B3 DB scaffold (Drizzle + better-sqlite3 + WAL) | ✅ | — | Foundation |
| B4 Core schema (users, communities, posts, comments, votes) | ✅ | — | Required by all downstream API |
| B5 FTS5 schema + sync triggers | ✅ | — | Required by B13 search |
| B6 Migrations applied to `dev.db` | ✅ | — | Verifiable artifact |
| B7 Seed script (port PRNG, 48/18/320) | ✅ | — | Verifiable artifact |
| B8 Auth repositories (Argon2id) | ✅ | — | Required by B9 |
| B9 Auth endpoints (register/login/refresh/logout) | ✅ | — | Verifiable via integration tests |
| B10 Post/Community API with authorization | ✅ | — | Core feature |
| B11 Transactional votes (concurrent-safe) | ✅ | — | ADR-108 explicit requirement |
| B12 Comment tree (recursive retrieval) | ✅ | — | Core feature |
| B13 FTS5 search endpoint | ✅ | — | ADR-109 explicit requirement |
| B14 Notifications (event-driven) | ✅ | — | Feature parity with client |
| B15 Security hardening (Helmet, rate-limit) | ✅ | — | ADR-110 + Section 5.2 |
| B16 Observability (Pino + correlation IDs) | ✅ | — | ADR-110 |
| B17 BrowserRouter + remove singlefile | — | ✅ | Breaking change to working client; deferred to a dedicated frontend refactor pass |
| B18–B22 React Query frontend integration | — | ✅ | Same as B17 |
| B23 Docker + GitHub Actions | — | ✅ | Pre-deployment concern; out of scope for code remediation pass |
| B24 Playwright E2E | — | ✅ | Pre-deployment concern |

**Result:** Phases B0–B16 land in this pass. Phases B17–B24 are explicitly
marked as the *next* pass in §5 of this document and in the updated
`REMEDIATION_PLAN_2.md`.

### 1.4 Invariants preserved throughout execution

1. The existing `apps/web` (formerly the root app) keeps its 176 tests green at
   every commit. No source file under `src/` (now `apps/web/src/`) is modified
   in a way that breaks behaviour.
2. The single-file Vite build of `apps/web` keeps working. ADR-003 and ADR-004
   remain in force for the client app until the deferred B17 pass.
3. The existing `docs/` archive (`IMPLEMENTATION_PLAN.md`, `IMPLEMENTATION_PLAN_v1.md`,
   `REMEDIATION_PLAN.md`, `old_REMEDIATION_PLAN.md`, `REMEDIATION_PLAN_2.md`,
   `Project-Architecture-Document.md`) is preserved verbatim; only additive
   docs (this file + updated status sections) are touched.
4. Every code-bearing phase writes the failing test first, implements the
   minimum to pass, then refactors with the test still green.
5. No git branches are created. Every commit lands on `main`.

---

## 2. Target Repository Layout (post-execution)

```
reddit-clone/                            ← repo root (npm workspaces root)
├── package.json                          ← workspaces config + root scripts
├── tsconfig.base.json                    ← shared strict TS config
├── pnpm-workspace.yaml                   ← workspace globs (npm-compatible)
├── apps/
│   ├── web/                              ← relocated existing client-only SPA
│   │   ├── package.json                  ← inherits current deps (React 19, Vite 7, Tailwind v4, etc.)
│   │   ├── vite.config.ts                ← unchanged (singlefile + HashRouter intact)
│   │   ├── vitest.config.ts              ← unchanged
│   │   ├── tsconfig.json                 ← extends ../../tsconfig.base.json
│   │   ├── index.html
│   │   ├── public/                       ← unchanged images
│   │   └── src/                          ← unchanged source tree
│   └── server/                           ← new Fastify backend
│       ├── package.json
│       ├── tsconfig.json
│       ├── vitest.config.ts
│       └── src/
│           ├── index.ts                  ← server entrypoint (starts Fastify)
│           ├── app.ts                     ← buildApp(): plugin composition root
│           ├── config.ts                 ← typed env loader (PORT, JWT_SECRET, DB_PATH, …)
│           ├── plugins/
│           │   ├── zodValidator.ts       ← Zod schema validator plugin
│           │   ├── requestId.ts          ← assigns req.id, logs correlation
│           │   ├── helmet.ts            ← @fastify/helmet wiring
│           │   ├── rateLimit.ts         ← @fastify/rate-limit wiring
│           │   └── auth.ts              ← JWT verify decorator
│           ├── routes/
│           │   ├── health.ts            ← GET /health
│           │   ├── auth.ts              ← /api/auth/{register,login,refresh,logout}
│           │   ├── posts.ts             ← /api/posts CRUD + cursor pagination
│           │   ├── communities.ts       ← /api/communities CRUD
│           │   ├── votes.ts             ← PUT /api/votes/:targetId (atomic)
│           │   ├── comments.ts          ← GET /api/posts/:id/comments (tree)
│           │   ├── search.ts            ← GET /api/search?q=&type=
│           │   └── notifications.ts     ← GET /api/notifications
│           ├── repositories/            ← DB access layer (one per table)
│           ├── services/                ← business logic (vote casting, tree build, …)
│           ├── auth/                    ← argon2 + jwt + refresh rotation
│           └── tests/                   ← *.test.ts integration + unit
├── packages/
│   ├── shared/                           ← Zod schemas + branded IDs (shared by web + server)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │   └── src/
│   │       ├── ids.ts                    ← branded UserId, PostId, etc.
│   │       ├── schemas/                  ← Zod schemas for all entities
│   │       ├── api/                      ← Zod input/output schemas per endpoint
│   │       └── tests/                   ← schema validation tests
│   └── db/                               ← Drizzle ORM + migrations + seed
│       ├── package.json
│       ├── tsconfig.json
│       ├── vitest.config.ts
│       ├── drizzle.config.ts
│       ├── src/
│       │   ├── client.ts                 ← better-sqlite3 + WAL + busy_timeout
│       │   ├── schema/                   ← Drizzle table definitions
│       │   ├── fts5.ts                   ← virtual tables + sync triggers
│       │   ├── migrations/              ← drizzle-kit output (.sql)
│       │   ├── seed/                     ← port of src/utils/random.ts + data/* seeds
│       │   └── tests/
│       └── scripts/
│           ├── migrate.ts                ← drizzle migrate runner
│           └── seed.ts                   ← idempotent seed runner
├── docs/                                 ← unchanged + this file + updated status
├── skills/                               ← unchanged (existing skill library)
├── AGENTS.md, CLAUDE.md, README.md      ← updated to reflect monorepo
└── .gitignore                            ← adds *.db, *.db-journal, *.db-wal
```

---

## 3. Detailed TDD ToDo List (B0–B16)

Each task is prefixed with the originating backlog ID from
`REMEDIATION_PLAN_2.md` §6 so traceability is auditable.

### Phase A — Monorepo restructure (B0, B1 partial)

**A1.** Create root `package.json` with `workspaces: ["apps/*", "packages/*"]`
and root scripts (`dev`, `build`, `test`, `typecheck`) that fan out via
`npm run --workspaces` (filtered to omit non-existent scripts).

**A2.** Create `tsconfig.base.json` with strict options (`strict`,
`noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`,
`erasableSyntaxOnly` off — Turborepo-style sharing).

**A3.** Move existing root files into `apps/web/`:
`src/`, `public/`, `index.html`, `vite.config.ts`, `vitest.config.ts`,
`tsconfig.json`, `package.json`. Update `apps/web/package.json` `name` to
`@embers/web`.

**A4.** Update `apps/web/tsconfig.json` to extend `../../tsconfig.base.json`
and add the Vite client types.

**A5.** Update root `.gitignore` to add `*.db`, `*.db-journal`, `*.db-wal`,
`*.db-shm`, `apps/server/dist/`, `packages/*/dist/`.

**A6.** Verify: `npm install` succeeds at root; `npm run typecheck --workspace @embers/web`
passes; `npm test --workspace @embers/web` shows 176/176 passing.

### Phase B — `packages/shared` (B1)

**B1.** `packages/shared/src/ids.ts` — branded types: `UserId`, `CommunityId`,
`PostId`, `CommentId`, `NotificationId`. TDD: test that brand marker is
`readonly` and that `UserId` is not assignable to `PostId`.

**B2.** `packages/shared/src/schemas/` — Zod schemas mirroring the existing
`src/types/index.ts`:
  - `userSchema`, `communitySchema`, `postSchema`, `commentSchema`,
    `notificationSchema`, `voteSchema`.
  - TDD: each schema accepts a valid object, rejects an invalid one, and
    infers back to the original TS interface via `z.infer`.

**B3.** `packages/shared/src/api/` — input/output schemas per endpoint:
  - `auth.{register,login,refresh,logout}` (input + output)
  - `posts.{list,create,get}` (cursor pagination input + paginated output)
  - `communities.{list,get,create}`
  - `votes.{cast}` (targetId, targetType, value)
  - `comments.{list,create}`
  - `search.{query}` (q, type, cursor)
  - `notifications.{list}`
  - TDD: each schema rejects malformed payloads, accepts well-formed ones.

**B4.** Export barrel `packages/shared/src/index.ts`. Build via `tsc` only
(no bundler) — exports `*.js` + `*.d.ts`.

**B5.** Verify: `npm test --workspace @embers/shared` passes; `npm run build
--workspace @embers/shared` emits `dist/`.

### Phase C — `apps/server` scaffold (B2)

**C1.** `apps/server/package.json` — deps: `fastify`, `pino`, `pino-pretty`,
`@fastify/helmet`, `@fastify/rate-limit`, `@fastify/cookie`, `@fastify/cors`,
`zod`, `argon2`, `jose`, `drizzle-orm`, `better-sqlite3`, `uuid`;
devDeps: `vitest`, `@types/better-sqlite3`, `@types/uuid`, `tsx`,
`typescript`.

**C2.** `apps/server/src/config.ts` — typed env loader (zod-validated):
`PORT`, `HOST`, `NODE_ENV`, `LOG_LEVEL`, `DATABASE_URL`, `JWT_ACCESS_SECRET`,
`JWT_REFRESH_SECRET`, `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`, `COOKIE_DOMAIN`,
`CORS_ORIGIN`. TDD: rejects missing required vars in production; falls back
to safe dev defaults in non-production.

**C3.** `apps/server/src/app.ts` — `buildApp()` that composes Fastify plugins:
`helmet`, `cors`, `rateLimit`, `cookie`, `zodValidator`, `requestId`, and
registers route modules. TDD: `buildApp()` returns a FastifyInstance;
`app.inject({ method: 'GET', url: '/health' })` returns 200.

**C4.** `apps/server/src/routes/health.ts` — `GET /health` returns
`{ status: 'ok', timestamp: <iso>, uptime: <seconds> }`. TDD: inject returns
200 with the expected body shape.

**C5.** `apps/server/src/index.ts` — entrypoint that calls `buildApp()` then
`app.listen({ port, host })`. Logs via Pino.

**C6.** Verify: `npm test --workspace @embers/server` passes; `tsx src/index.ts`
starts and `/health` responds.

### Phase D — `packages/db` (B3, B4, B5, B6)

**D1.** `packages/db/src/client.ts` — opens `better-sqlite3` connection,
applies `PRAGMA journal_mode=WAL;`, `PRAGMA busy_timeout=5000;`,
`PRAGMA foreign_keys=ON;`. TDD: open returns a connection; pragmas are
verifiable via `PRAGMA journal_mode;` query.

**D2.** `packages/db/src/schema/users.ts`, `communities.ts`, `posts.ts`,
`comments.ts`, `votes.ts`, `notifications.ts` — Drizzle table definitions
matching §4.1 of `REMEDIATION_PLAN_2.md`. Constraints: `UNIQUE(username)`,
`UNIQUE(communities.slug)`, composite PK on `votes(user_id, target_id)`,
FKs from posts/comments/votes to their parents.

**D3.** `packages/db/src/fts5.ts` — creates `posts_fts` virtual table and
triggers (`AFTER INSERT/UPDATE/DELETE ON posts` syncs `title` + `body` to
`posts_fts`). TDD: insert into `posts` → query `posts_fts` returns the row.

**D4.** `packages/db/drizzle.config.ts` — points at `./src/schema/index.ts`,
dialect `sqlite`, out `./src/migrations`.

**D5.** Run `drizzle-kit generate` to produce the SQL migration. Commit the
generated `*.sql` files (they are auditable artifacts).

**D6.** `packages/db/src/migrate.ts` — applies migrations via
`drizzle-orm/better-sqlite3/migrator`. TDD: run against a fresh in-memory
DB; verify all tables + indexes exist via `sqlite_master`.

**D7.** Apply migrations to `packages/db/dev.db` (committed as a checked-in
artifact for demo reproducibility, but also regenerable).

**D8.** Verify: `npm test --workspace @embers/db` passes; `dev.db` exists
and contains all tables.

### Phase E — Seed script (B7)

**E1.** `packages/db/src/seed/random.ts` — port `hashString`, `seededRandom`,
`createRng`, `gradientFor` from `apps/web/src/utils/random.ts` verbatim
(identical output for identical seeds is the contract). TDD: same seed →
same first 10 floats as the original module.

**E2.** `packages/db/src/seed/users.ts` — port `apps/web/src/data/users.ts`.
Produces 48 users (not the `CURRENT_USER` — that becomes the seeded auth
user). TDD: 48 rows inserted, all have unique usernames, all have
`password_hash` set to a default Argon2 hash for the seeded demo password
(`embers-demo`).

**E3.** `packages/db/src/seed/communities.ts` — port 18 communities from
`apps/web/src/data/communities.ts`. TDD: 18 rows, unique slugs.

**E4.** `packages/db/src/seed/posts.ts` — port 320 posts from
`apps/web/src/data/posts.ts`. TDD: 320 rows, all FKs resolve.

**E5.** `packages/db/src/seed/comments.ts` — port lazy comment generator
from `apps/web/src/data/comments.ts`. Materialise trees for all 320 posts
at seed time (depth capped at 4). TDD: at least 1 comment per post; depth
never exceeds 4.

**E6.** `packages/db/src/seed/notifications.ts` — port 18 notifications.
TDD: 18 rows.

**E7.** `packages/db/scripts/seed.ts` — orchestrator: open DB, run
migrations, run seed modules in FK-safe order, wrap in a transaction.
Idempotent: re-running truncates + reinserts. TDD: run twice; second run
yields identical row counts.

**E8.** Verify: seed populates `dev.db` with 48 users / 18 communities / 320
posts / comments / 18 notifications.

### Phase F — Auth (B8, B9)

**F1.** `apps/server/src/auth/password.ts` — `hashPassword(plain)` returns
Argon2id hash; `verifyPassword(plain, hash)` returns boolean. TDD: hash
round-trips; wrong password returns false; hash is not the plain text.

**F2.** `apps/server/src/auth/jwt.ts` — `signAccessToken(payload)` (15m,
HS256 — single-secret for demo; RS256 noted in plan as future upgrade),
`signRefreshToken(payload)` (7d), `verifyAccessToken(token)`,
`verifyRefreshToken(token)`. TDD: round-trips; expired token rejects;
wrong-secret rejects.

**F3.** `apps/server/src/repositories/userRepository.ts` — `create`,
`findByUsername`, `findById`. TDD: insert + read back; miss returns null
(never throws — unlike `apps/web`'s `getUser`).

**F4.** `apps/server/src/repositories/sessionRepository.ts` — stores
refresh-token jti → userId + expiresAt; supports rotation (delete old,
insert new) and revocation (delete by userId).

**F5.** `apps/server/src/routes/auth.ts`:
  - `POST /api/auth/register` — body: `{ username, password, displayName? }`.
    Returns 201 with user (no password_hash). 409 on duplicate username.
  - `POST /api/auth/login` — body: `{ username, password }`. Returns 200
    with `{ accessToken, user }` and sets HttpOnly+Secure+SameSite=Strict
    refresh cookie. 401 on bad credentials. Rate-limited (5/min/IP).
  - `POST /api/auth/refresh` — reads refresh cookie, verifies, rotates
    (deletes old jti, issues new), returns 200 with new accessToken + new
    refresh cookie. 401 if refresh token invalid/revoked.
  - `POST /api/auth/logout` — deletes session by refresh cookie jti,
    clears cookie. Returns 204.
  - TDD per endpoint: happy path, validation error, auth failure, rate-limit
    on login (6th attempt → 429).

**F6.** `apps/server/src/plugins/auth.ts` — `authenticate` decorator that
reads `Authorization: Bearer <token>`, verifies, attaches `req.user` =
`{ id, username }`. 401 if missing/invalid. Used by all protected routes.

### Phase G — Core API (B10, B11, B12)

**G1.** `apps/server/src/routes/communities.ts`:
  - `GET /api/communities` — list, paginated.
  - `GET /api/communities/:slug` — single.
  - `POST /api/communities` — auth required; 403 if slug taken.
  - TDD: happy path, 404 on unknown slug, 403 on duplicate.

**G2.** `apps/server/src/routes/posts.ts`:
  - `GET /api/posts` — query: `?cursor=&limit=&communityId=&sort=`.
    Cursor is `(createdAt,id)` tuple, base64-encoded. Sort: `new|hot|top|rising|best`.
  - `GET /api/posts/:id` — single.
  - `POST /api/posts` — auth required; body matches `postCreateSchema`;
    returns 201 with the created post. Inserts into FTS5 via trigger.
  - TDD: list returns paginated shape; cursor advance works; create
    inserts row + FTS5 row; 401 without auth; 422 on bad body.

**G3.** `apps/server/src/services/voteService.ts` — `castVote(userId,
targetId, targetType, value)`:
  - Runs in a single transaction.
  - Upserts into `votes` (composite PK).
  - If previous vote existed and differs, atomically updates
    `posts.upvotes` / `posts.downvotes` (or `comments.*`) accordingly.
  - If same value as existing, treats as "toggle off" (deletes vote row,
    decrements counter).
  - Returns the new visible score.
  - TDD: concurrent-safe (use `UPDATE … WHERE` atomic increments, not
    read-modify-write); 100 simultaneous votes on the same post yield
    exactly +100 net upvotes.

**G4.** `apps/server/src/routes/votes.ts`:
  - `PUT /api/votes/:targetId` — auth required; body: `{ targetType,
    value }`. Calls `voteService.castVote`. Returns 200 with
    `{ targetId, value, score }`.
  - TDD: first vote +1 → score 1; second vote +1 (idempotent) → score 1
    (toggle); vote -1 after +1 → score -1; 401 without auth.

**G5.** `apps/server/src/services/commentTreeService.ts` —
`getCommentTree(postId)`:
  - Fetches all comments for a post in one query.
  - Builds tree in-memory (O(n)) from `parentId` pointers.
  - Caps depth at 4 (matches `apps/web` convention).
  - TDD: flat list → correct tree shape; depth cap respected; orphan
    comment (parent deleted) attached at root.

**G6.** `apps/server/src/routes/comments.ts`:
  - `GET /api/posts/:id/comments` — returns tree.
  - `POST /api/posts/:id/comments` — auth required; body: `{ body,
    parentId? }`. Creates comment + emits notification to parent comment
    author (or post author if no parent). Returns 201 with the comment.
  - TDD: list returns tree; create inserts row; notification emitted to
    correct user; 401 without auth; 422 on empty body.

### Phase H — Search (B13)

**H1.** `apps/server/src/routes/search.ts` — `GET /api/search`:
  - Query: `?q=&type=posts|communities|users&cursor=&limit=`.
  - For `type=posts`: uses FTS5 `MATCH` against `posts_fts`, joins to
    `posts` for full row. Ranks by BM25.
  - For `type=communities|users`: falls back to `LIKE` queries (FTS5 not
    justified for 18 rows / 48 rows).
  - TDD: insert 5 known posts with distinct bodies; query "rust" returns
    only matching posts; query "" returns 422 (empty query rejected);
    unknown type returns 422.

### Phase I — Notifications (B14)

**I1.** `apps/server/src/services/notificationService.ts` —
  - `notify({ userId, type, message, detail, postId?, actorId? })` — inserts
    row. Called by `comments` route on reply/mention.
  - TDD: insert + read returns row; `postId` validation against existing
    posts (FK enforced).

**I2.** `apps/server/src/routes/notifications.ts` — `GET /api/notifications`:
  - Auth required.
  - Query: `?filter=all|unread&cursor=&limit=`.
  - Returns user's notifications, newest first.
  - TDD: only the caller's notifications are returned; `unread` filter
    excludes read; 401 without auth.

### Phase J — Hardening (B15)

**J1.** `apps/server/src/plugins/helmet.ts` — `@fastify/helmet` with:
  - `contentSecurityPolicy` allowing only self + Google Fonts (for `apps/web`).
  - `strictTransportSecurity` enabled in production.
  - TDD: `app.inject({ url: '/' })` response headers include expected
    `content-security-policy` value; HSTS absent in dev, present in prod
    (controlled by `NODE_ENV`).

**J2.** `apps/server/src/plugins/rateLimit.ts` — `@fastify/rate-limit` with:
  - Global: 100 req/min/IP.
  - Auth route override: 5 req/min/IP (`/api/auth/login`,
    `/api/auth/register`).
  - TDD: 6th login attempt from same IP returns 429 with
    `Retry-After` header.

### Phase K — Observability (B16)

**K1.** `apps/server/src/plugins/requestId.ts` — assigns `req.id` from
`x-request-id` header or generates a UUIDv4. Adds `x-request-id` to
response headers. Injects `req.id` into Pino logging context.

**K2.** `apps/server/src/plugins/pino.ts` — `@fastify/helmet`-style Pino
logger with:
  - JSON output in production, `pino-pretty` in dev.
  - Redacts `req.headers.authorization`, `req.body.password` from logs.
  - Logs every request with `reqId`, `method`, `url`, `statusCode`,
    `responseTimeMs`.
  - TDD: inject a request; capture logs; verify redacted fields;
    verify `reqId` matches response header.

**K3.** `apps/server/src/plugins/errorHandler.ts` — global error handler:
  - Logs error with stack + reqId.
  - Returns 500 with `{ error: { code: 'INTERNAL_ERROR', message: 'Internal server error', requestId } }`.
  - Zod validation errors return 422 with `VALIDATION_ERROR` code + field
    details.
  - TDD: trigger a deliberate throw; verify response shape + log entry.

### Phase L — Documentation update

**L1.** Update `README.md` — add monorepo layout, workspace commands,
backend setup instructions (env vars, migrate, seed, start server).

**L2.** Update `CLAUDE.md` — add backend workspace conventions (Fastify
plugin composition, route → repository → service pattern, test conventions).

**L3.** Update `AGENTS.md` — add `apps/server` and `packages/*` to the
codebase reference. Note that `apps/web` retains its existing ADRs until
the deferred B17 pass.

**L4.** Update `docs/Project-Architecture-Document.md` — add a new section
"Part 2: Enterprise Backend Layer" that documents ADR-101…ADR-110 as
*active* for the backend, while ADR-001…ADR-005 remain *active* for the
client app until the B17 frontend refactor.

**L5.** Update `docs/REMEDIATION_PLAN_2.md` — add a "Status" column to
the B0–B24 backlog table marking B0–B16 as Done and B17–B24 as Deferred
with a link to §5 of this document.

### Phase M — Commit & push

**M1.** Stage and commit incrementally per phase (one commit per phase).
Each commit message follows:

```
<type>(<scope>): <subject>

<body explaining why, not just what>
```

Types: `feat`, `test`, `chore`, `docs`, `refactor`. Scopes: `monorepo`,
`shared`, `server`, `db`, `auth`, `posts`, `votes`, `comments`, `search`,
`notifications`, `hardening`, `observability`, `docs`.

**M2.** Verify the final state:
  - `npm test --workspaces` — all green (existing 176 + new backend tests).
  - `npm run typecheck --workspaces` — clean.
  - `npm run build --workspace @embers/web` — succeeds (existing single-file
    build intact).

**M3.** Push to `origin/main` using the SSH wrapper:
```bash
GIT_SSH_COMMAND="/home/z/my-project/workspace/reddit-clone/skills/how-to-git-push-using-ssh-wrapper/scripts/ssh_git_wrapper_v3.py -i /home/z/my-project/.ssh_key_reconstructed -o StrictHostKeyChecking=accept-new" git push origin main
```

---

## 4. Pre-Mortem — Top Failure Modes & Mitigations

| Failure mode | Mitigation |
| --- | --- |
| Moving `apps/web` breaks its absolute asset paths | All paths in `apps/web` are already relative (`../../utils/cn`) or use `import.meta.env.BASE_URL`. Vite config uses relative `root` so relocation is transparent. |
| Drizzle migration generation picks the wrong dialect | `drizzle.config.ts` explicitly sets `dialect: 'sqlite'`. Verified by `drizzle-kit generate` output containing `CREATE TABLE … sqlite` syntax. |
| FTS5 trigger fires on every seed insert → slow seed | Acceptable for one-time seed of 320 rows. Documented; not optimised. |
| Argon2 native module fails to build in CI | Pin `argon2` to a version with prebuilt binaries for Node 20+ on linux/macos. Documented in `apps/server/package.json`. |
| `better-sqlite3` native module version mismatch with Node 20 | Pin `better-sqlite3` to a version with prebuilt binaries for Node 20+. Verified at install time. |
| Refresh-token rotation race (two concurrent refreshes with same cookie) | `sessionRepository.rotate(oldJti, newJti)` is a single atomic `DELETE … RETURNING` + `INSERT` in a transaction. Second refresh sees old jti gone → 401. |
| Vote race condition under concurrency | `voteService.castVote` uses `UPDATE posts SET upvotes = upvotes + 1 WHERE id = ?` (atomic) — never read-modify-write. |
| Pino logs leak password from login body | `redact` config explicitly lists `req.headers.authorization`, `req.body.password`, `res.body.accessToken`. |
| `helmet` CSP blocks Google Fonts in `apps/web` | CSP `default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:`. |
| Rate limiter slows the test suite | Rate limiter is disabled in `NODE_ENV=test` (env-gated plugin registration). |
| Existing 176 tests break after monorepo move | `apps/web/vite.config.ts` and `vitest.config.ts` use relative paths; `@/*` alias is unused. No import changes required. |

---

## 5. Deferred Work (B17–B24) — Next Pass

These items are tracked in `docs/REMEDIATION_PLAN_2.md` but are out of scope
for this execution pass. They are deferred for the following reasons:

- **B17 (BrowserRouter + remove singlefile):** Breaks the working client
  app's deployment identity. Should be a dedicated frontend refactor PR
  that also updates ADR-003 and ADR-004 in the PAD.
- **B18–B22 (React Query, Axios, optimistic UI, auth-aware UI):** Requires
  B17 to land first. Adds significant frontend churn across all 7 pages.
- **B23 (Docker, GitHub Actions):** Pre-deployment concern. The backend
  is fully runnable via `tsx watch` for now.
- **B24 (Playwright E2E):** Pre-deployment concern. The backend has full
  integration test coverage via Fastify `inject`.

The deferred work is explicitly documented in `docs/REMEDIATION_PLAN_2.md`
with a `Status: Deferred — see docs/REMEDIATION_EXECUTION_PLAN.md §5` note,
so the next pass picks up cleanly.

---

## 6. Verification Ledger

| Check | Method | Pass criterion |
| --- | --- | --- |
| Existing 176 client tests still green | `npm test --workspace @embers/web` | 176 passing |
| `apps/web` typecheck clean | `npm run typecheck --workspace @embers/web` | Exit 0 |
| `apps/web` build still produces single-file | `npm run build --workspace @embers/web` | `apps/web/dist/index.html` exists, ~528 KB |
| `packages/shared` tests pass | `npm test --workspace @embers/shared` | All schema tests green |
| `packages/db` tests pass | `npm test --workspace @embers/db` | All client/schema/FTS5 tests green |
| `apps/server` tests pass | `npm test --workspace @embers/server` | All route + service tests green |
| Migrations applied to `dev.db` | `sqlite3 packages/db/dev.db ".tables"` | 7 tables present (users, communities, posts, comments, votes, notifications, posts_fts) |
| Seed data loaded | `sqlite3 packages/db/dev.db "SELECT COUNT(*) FROM posts"` | 320 |
| Health endpoint responds | `curl localhost:4000/health` | `{"status":"ok",…}` |
| Vote concurrency safe | `apps/server` integration test: 100 parallel `PUT /api/votes/p1` | Final post score is base+100 |
| No secrets in repo | `git grep -E "(password|secret|key)\s*[:=]" -- ':!docs/' ':!*.md'` | Only test fixtures + redacted placeholders |

---

## 7. Traceability Matrix

| Source requirement (`REMEDIATION_PLAN_2.md`) | Executed in this plan | Tests | Status |
| --- | --- | --- | --- |
| ADR-101 REST + Zod | Phases B, C, G | `packages/shared` schema tests; route validation tests | Pending |
| ADR-102 Fastify | Phase C | health-route test; route composition test | Pending |
| ADR-103 SQLite + Drizzle | Phase D | client/pragma tests; schema tests; migration tests | Pending |
| ADR-104 JWT auth | Phase F | auth route tests; token rotation tests | Pending |
| ADR-105 React Query + Zustand split | DEFERRED (§5) | — | Deferred |
| ADR-106 BrowserRouter | DEFERRED (§5) | — | Deferred |
| ADR-107 npm workspaces | Phase A | workspace install + per-package tests | Pending |
| ADR-108 Transactional votes | Phase G3, G4 | concurrent vote test | Pending |
| ADR-109 FTS5 search | Phases D3, H1 | FTS5 trigger test; search endpoint test | Pending |
| ADR-110 Observability | Phase K | request-id test; pino redact test | Pending |
| §5.2 Helmet + rate limit | Phase J | CSP header test; rate-limit test | Pending |
| §6 B0–B7 infrastructure | Phases A, B, C, D, E | per-phase tests above | Pending |
| §6 B8–B12 auth + core API | Phases F, G | per-endpoint tests above | Pending |
| §6 B13–B16 advanced + hardening | Phases H, I, J, K | per-endpoint + header tests above | Pending |
| §6 B17–B24 frontend + deployment | DEFERRED (§5) | — | Deferred |

End of plan.

---

## 8. Round 2 — Build-Error Remediation (2026-08-09, round 2)

After the Round 1 push (B0–B16), running `npm run build` from a clean
state (`rm -rf packages/*/dist apps/*/dist`) failed with 40 TypeScript
errors in `apps/server`. The build log is preserved at
`docs/REMEDIATION_ROUND_2_PLAN.md`.

### 8.1 Root Cause Analysis

**Category A — Build-ordering failures (32 of 40 errors):**

The root `package.json` `build` script was:
```json
"build": "npm run build --workspaces --if-present"
```
npm runs this in workspace-array order (`apps/*` first, then `packages/*`),
so `@embers/server` started its `tsc` before `@embers/shared` and
`@embers/db` had emitted their `dist/` folders. Since both packages
declare `"types": "./dist/index.d.ts"`, TypeScript couldn't resolve them.

**Fix:** Updated root `package.json` `build` and `typecheck` scripts to
run in topological order:
```json
"build": "npm run build --workspace @embers/shared && npm run build --workspace @embers/db && npm run build --workspace @embers/server && npm run build --workspace @embers/web"
```

Also added the missing `"@embers/db": "*"` to `apps/server/package.json`
`dependencies` (it was imported by every repository + service file but
only `@embers/shared` was declared).

**Category B — Real TypeScript source bugs (8 of 40 errors):**

1. `services/commentTreeService.ts:1` — `import type { comments }` was
   wrong (Drizzle table is a value, not a type). Fixed to `import { comments }`.
2. `services/voteService.ts:45` — `db.transaction((_tx) => ...)` had an
   untyped `_tx` parameter. Since better-sqlite3 is synchronous and
   single-connection, operations on the outer `db` execute within the
   transaction automatically, so the `tx` parameter is unused. Fixed by
   omitting the parameter entirely.
3. `repositories/notificationRepository.ts:64` — `.map((r) => ...)` had
   implicit `any`. Fixed by typing `r: NotificationSelectRow` (sourced
   via `typeof notifications.$inferSelect`).
4. `routes/search.ts:32,55,80` — three `.map()` callbacks with implicit
   `any`. Fixed by typing each callback parameter explicitly.

### 8.2 Gaps Closed (B10 + B11 acceptance criteria)

**Gap G-1 — B10 PATCH/DELETE with authorization:**

Round 1 implemented only POST (create) + GET (read). The plan's acceptance
criterion ("Integration tests verify 403 Forbidden on unauthorized edits")
was unmet.

Round 2 added:
- `updatePostInputSchema` in `@embers/shared` (partial-update Zod schema
  with same URL-safety refine as `createPostInputSchema`)
- `postRepository.update(id, patch)` + `postRepository.delete(id)` methods
- `PATCH /api/posts/:id` route — auth + author check (403 if not author)
- `DELETE /api/posts/:id` route — auth + author check; FTS5 trigger fires
  automatically to remove from `posts_fts`
- 12 integration tests covering: 401 without auth, 200 when author,
  403 when non-author, 404 unknown post, 422 empty title,
  422 javascript: URL, linkDomain update on linkUrl change,
  204 delete + GET returns 404, FTS5 trigger removes from search

**Gap G-2 — B11 concurrency test:**

Round 1 implemented atomic SQL `UPDATE … SET col = col + delta` but never
wrote the explicit "100 simultaneous votes → +100" test called for in
the plan.

Round 2 added `voteConcurrency.test.ts` (3 tests):
- 100 upvotes from 100 different users → final score exactly +100
- 100 toggles from one user (even count) → final score 0 (toggled off)
- Flip from -1 to +1 → score changes by +2 (downvote removed + upvote added)

The test pre-seeds 100 voter users directly in the DB (bypassing the
HTTP auth flow to avoid the ~10s Argon2id cost) and signs access tokens
directly via the JWT helpers. Each vote request only does JWT verification
+ atomic SQL UPDATE — fast and isolates the vote-counter logic.

### 8.3 Verification (Round 2)

| Check | Result |
|---|---|
| `rm -rf packages/*/dist apps/*/dist && npm run build` | All 4 workspaces emit `dist/`, exit 0 |
| `npm run typecheck` (topological order) | Exit 0 for all 4 workspaces |
| `npm test --workspaces --if-present` | 367 tests pass (was 346 in Round 1) |
| `@embers/web` single-file build intact | `apps/web/dist/index.html` 525 KB |
| New PATCH/DELETE tests | 12 green |
| New concurrency tests | 3 green |
| New `updatePostInputSchema` tests | 6 green |

### 8.4 Test count delta

| Workspace | Round 1 | Round 2 | Delta |
|---|---|---|---|
| `@embers/web` | 176 | 176 | 0 |
| `@embers/shared` | 61 | 67 | +6 (updatePostInputSchema tests) |
| `@embers/db` | 29 | 29 | 0 |
| `@embers/server` | 80 | 95 | +15 (12 PATCH/DELETE + 3 concurrency) |
| **Total** | **346** | **367** | **+21** |

End of Round 2.
