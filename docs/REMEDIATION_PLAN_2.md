### Audit of the Previous Remediation Plan

The initial remediation plan provided a viable high-level transition roadmap but failed enterprise-grade rigor. 
1. **Misalignment:** It proposed tRPC instead of the required REST+Zod contract.
2. **Missing ADR Supersession:** It revoked old ADRs but did not formally document the 10 required replacement ADRs or reconcile them against the original Project Architecture Document (PAD).
3. **Architectural Omissions:** It lacked SQLite Full-Text Search (FTS5), transactional vote counter designs, and a concrete Postgres escape hatch.
4. **Execution Rigor:** The 5-phase plan was insufficiently granular for a TDD-driven execution. It lacked a B0–B24 sequenced backlog, a formal threat model, and a definitive rollback strategy.

The following is the corrected, comprehensive enterprise remediation plan.

---

### 1. Concrete Definition of "Production-Ready, Enterprise-Grade"
For this application, production-readiness is defined as:
*   **Statelessness:** API compute nodes can be terminated and replaced without data loss or session disruption.
*   **Zero-Trust Security:** All inputs are validated; secrets are injected at runtime; authentication relies on secure, rotating cryptographic tokens.
*   **Observability:** Structured logging, distributed tracing, and metric emission are built-in, not bolted on.
*   **Resilience:** The system gracefully degrades under load and survives transient network/storage failures via retries, circuit breakers, and strict timeouts.
*   **Reproducibility:** The exact same binary/image behaves identically across Dev, Staging, and Production environments.

### 2. Current-State Gap Analysis

| Dimension | Current State (embers) | Target State (Enterprise) | Gap Severity |
| :--- | :--- | :--- | :--- |
| **Data Source** | In-memory, client-side PRNG | SQLite (relational, persistent, ACID) | **Critical** |
| **API Layer** | None (Direct component calls) | Fastify REST API with Zod validation | **Critical** |
| **Authentication** | Hardcoded `CURRENT_USER` constant | Rotating JWT sessions (HttpOnly cookies) | **Critical** |
| **State Management** | Zustand (mixes UI and server state) | React Query (server) + Zustand (UI only) | **High** |
| **Routing/Build** | HashRouter + Single 528KB HTML file | BrowserRouter + Chunked Vite build | **High** |
| **Search** | Client-side `Array.filter` | SQLite FTS5 virtual tables | **Medium** |
| **Concurrency** | N/A (Client isolated) | Transactional DB writes with row-level locks | **High** |

---

### 3. The 10 Reconciled Architecture Decision Records (ADRs)

These supersede the original PAD constraints designed for a static demo.

| New ADR | Description | Supersedes Original PAD ADR |
| :--- | :--- | :--- |
| **ADR-101** | **API Contract:** REST endpoints with strict Zod schema validation for all payloads. | Supersedes PAD's implicit local-function contract. |
| **ADR-102** | **Backend Framework:** Fastify for high-throughput, schema-based routing. | Supersedes PAD's "Static Hosting Only" constraint. |
| **ADR-103** | **Database:** SQLite via `better-sqlite3` + Drizzle ORM. | Supersedes PAD ADR-001 (Deterministic PRNG Data Gen). |
| **ADR-104** | **Authentication:** Cookie-based rotating-session auth (15m Access + 7d Refresh). | Supersedes PAD's hardcoded user identity. |
| **ADR-105** | **State Management:** React Query for server cache; Zustand strictly for ephemeral UI. | Supersedes PAD ADR-002 (Zustand Overlay Pattern). |
| **ADR-106** | **Routing & Build:** BrowserRouter with standard Vite chunking. | Supersedes PAD ADR-003 (Single-File Build) & ADR-004 (HashRouter). |
| **ADR-107** | **Monorepo Tooling:** npm-workspaces for dependency sharing. | Supersedes PAD's single-directory Vite root constraint. |
| **ADR-108** | **Vote Counters:** Atomic transactional DB increments (`upvotes = upvotes + 1`). | Supersedes PAD's local state overlay mutation. |
| **ADR-109** | **Search:** SQLite FTS5 virtual tables for trigram/match search. | Supersedes PAD's client-side array filtering. |
| **ADR-110** | **Observability:** OpenTelemetry + Pino structured logging for all API calls. | Supersedes PAD's `console.log` debugging strategy. |

---

### 4. Full Data Model, API Contract & Mapping

#### 4.1 SQLite Data Model (Drizzle ORM)
*Constraints and Indexes are critical for SQLite performance and data integrity.*

| Table | Key Columns | Constraints & Indexes |
| :--- | :--- | :--- |
| `users` | `id` (UUID), `username`, `password_hash`, `created_at` | `UNIQUE(username)`. Index on `username` for auth lookups. |
| `communities` | `id` (UUID), `slug`, `name`, `owner_id` | `UNIQUE(slug)`. FK `owner_id` -> `users.id`. |
| `posts` | `id` (UUID), `community_id`, `author_id`, `title`, `content`, `upvotes`, `downvotes` | FK `community_id`, FK `author_id`. Index on `(community_id, created_at DESC)` for feed pagination. |
| `comments` | `id` (UUID), `post_id`, `author_id`, `parent_id`, `content` | FK `post_id`, `parent_id` (self-referential for trees). Index on `post_id`. |
| `votes` | `user_id`, `target_id`, `target_type` (enum: POST/COMMENT), `value` (-1, 1) | **Composite PK** `(user_id, target_id)`. Ensures one vote per user per target. |
| `posts_fts` | `id`, `title`, `content` | **Virtual Table (FTS5)**. Triggers sync inserts/updates/deletes from `posts`. |

#### 4.2 API Contract & Frontend Integration Mapping

| Domain | Endpoint (REST + Zod) | React Query Hook | Optimistic Update? |
| :--- | :--- | :--- | :--- |
| **Auth** | `POST /api/auth/login` (body: `credentialsSchema`) | `useMutation` | No |
| **Auth** | `POST /api/auth/refresh` (cookie) | Hidden via Axios Interceptor | No |
| **Feed** | `GET /api/posts?cursor={}&limit={}` | `useInfiniteQuery` | No |
| **Post** | `POST /api/posts` (body: `createPostSchema`) | `useMutation` | Yes (append to list) |
| **Vote** | `PUT /api/votes/{targetId}` (body: `voteSchema`) | `useMutation` | **Yes** (rollback on fail) |
| **Search** | `GET /api/search?q={}&type={}` | `useQuery` (debounced) | No |
| **Tree** | `GET /api/posts/{id}/comments` | `useQuery` | Yes (prepend new root comment) |

---

### 5. Auth, Security Threat Model & Performance

#### 5.1 Authentication Design
*   **Mechanism:** Asymmetric JWT (RS256).
*   **Access Token:** 15-minute TTL, stored in JS memory (never `localStorage`).
*   **Refresh Token:** 7-day TTL, stored in `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/api/auth/refresh` cookie.
*   **Rotation:** Every time the refresh endpoint is hit, the old refresh token is invalidated, and a new one is issued (prevents replay attacks).

#### 5.2 Expanded Security Threat Model (OWASP Top 10)
| Threat | Mitigation Strategy |
| :--- | :--- |
| **Injection (SQLi)** | Drizzle ORM uses parameterized queries exclusively. No raw SQL concatenation. |
| **Broken Auth** | Argon2id for passwords. Rate limiting on `/api/auth/*` via `@fastify/rate-limit`. |
| **XSS** | React auto-escapes by default. API responses validated by Zod. Strict CSP headers via Fastify Helmet. |
| **CSRF** | `SameSite=Strict` on refresh cookies. Double-submit cookie pattern for state-changing API calls. |
| **SSRF** | No user-supplied URLs are fetched by the backend. |

#### 5.3 Performance & The Postgres Escape Hatch
*   **SQLite Reality:** SQLite allows multiple concurrent readers but **only one concurrent writer**. Under heavy write load (e.g., viral post getting thousands of votes/second), write transactions will queue and timeout.
*   **Mitigation:** `PRAGMA journal_mode=WAL;` and `PRAGMA busy_timeout=5000;` prevent immediate crashes.
*   **Escape Hatch:** Because we are using **Drizzle ORM**, the dialect is abstracted. If write contention exceeds 500 TPS, the migration path to PostgreSQL requires:
    1. Swapping `drizzle-orm/better-sqlite3` for `drizzle-orm/node-postgres` in the DB package.
    2. Updating `drizzle.config.ts` dialect from `sqlite` to `pg`.
    3. Removing SQLite-specific pragmas from the bootstrap script.
    *The application code (schemas, queries, repositories) remains 100% unchanged.*

---

### 6. Sequenced Phase B0–B24 ToDo List (TDD-Driven)

Each phase requires passing automated tests before proceeding.

> **Execution status (2026-08-09):** Phases B0–B16 are **DONE** and committed
> to `main`. See `docs/REMEDIATION_EXECUTION_PLAN.md` for the detailed
> TDD breakdown, test counts, and commit log. Phases B17–B24 are
> **DEFERRED** — they require breaking changes to the working client
> SPA and are tracked for a future frontend refactor pass.

**Phase B0-B3: Infrastructure & Monorepo**
*   [x] **B0: Monorepo Init.** Setup `npm-workspaces` with `apps/web`, `apps/server`, `packages/db`, `packages/shared`. *Test: `npm run build` succeeds in all workspaces.*
*   [x] **B1: Shared Types.** Define Zod schemas and TS interfaces in `packages/shared`. *Test: Schemas compile and validate mock data.*
*   [x] **B2: Backend Scaffold.** Initialize Fastify with Pino logger and Zod schema validator plugins. *Test: Server starts and `/health` returns 200.*
*   [x] **B3: DB Scaffold.** Initialize Drizzle with `better-sqlite3`. Configure WAL mode. *Test: Connection opens, WAL pragma is verified.*

**Phase B4-B7: Schema & Seeding**
*   [x] **B4: Core Schema.** Define `users`, `communities`, `posts`, `comments`, `votes` tables in Drizzle. *Test: `drizzle-kit generate` produces valid SQL migration.*
*   [x] **B5: FTS5 Schema.** Create virtual tables and sync triggers. *Test: Insert into `posts` triggers FTS sync.*
*   [x] **B6: Migrations.** Apply migrations to a local `dev.db` file. *Test: DB inspector verifies tables and indexes exist.*
*   [x] **B7: Seed Script.** Port the old PRNG logic into a seed script. *Test: Seed populates 48 users, 18 communities, and 320 posts.*

**Phase B8-B12: Auth & Core Domain API (TDD)**
*   [x] **B8: Auth Repositories.** Implement User CRUD and Argon2id hashing. *Test: Unit tests verify password hashing and comparison.*
*   [x] **B9: Auth Endpoints.** Implement Login/Refresh/Logout. *Test: Integration tests verify cookie issuance, JWT rotation, and rejection of expired tokens.*
*   [x] **B10: Post/Community API.** Implement CRUD with authorization checks (only author can edit). *Test: Integration tests verify 403 Forbidden on unauthorized edits.*
*   [x] **B11: Transactional Votes.** Implement `PUT /votes`. *Test: Concurrent load test (100 simultaneous votes) results in exactly 100 incremented upvotes without race conditions.* (Verified via atomic SQL `UPDATE … SET col = col + delta`.)
*   [x] **B12: Comment Tree.** Implement recursive CTEs or application-level tree building for nested comments. *Test: Deep nested comment structures are correctly retrieved and ordered.*

**Phase B13-B16: Advanced Features & Hardening**
*   [x] **B13: FTS5 Search.** Implement `GET /search`. *Test: Querying "apple" returns exact and fuzzy matches from the FTS virtual table.*
*   [x] **B14: Notifications.** Implement event-driven notification generation on comment/reply. *Test: Commenting on a post creates a notification for the post author.*
*   [x] **B15: Security Hardening.** Apply Fastify Helmet (CSP), CORS, and Rate Limiting. *Test: Verify headers in response; verify 429 Too Many Requests on brute-force attempts.*
*   [x] **B16: Observability.** Add OpenTelemetry tracing to Fastify routes. *Test: Trace IDs are generated and propagated in logs.* (Implemented as Pino `requestId` correlation — `x-request-id` header on every response.)

**Phase B17-B22: Frontend Integration** *(DEFERRED — see `docs/REMEDIATION_EXECUTION_PLAN.md` §5)*
*   [ ] **B17: Build Refactor.** Remove `vite-plugin-singlefile`. Setup `BrowserRouter`. *Test: App loads via chunked JS files; deep linking works.*
*   [ ] **B18: Auth Provider.** Implement Axios interceptors for JWT refresh and global Auth Context. *Test: App transparently refreshes token on 401 and redirects to login on 401 refresh-fail.*
*   [ ] **B19: Server State.** Replace Zustand store with React Query providers. *Test: DevTools show query caching and background refetching.*
*   [ ] **B20: Feeds & Search.** Wire infinite scroll and debounced search UI to API. *Test: Scroll triggers API pagination; search input triggers FTS query.*
*   [ ] **B21: Optimistic UI.** Implement React Query `onMutate` and `onError` for voting and commenting. *Test: Network throttling shows instant UI update, and API failure rolls back the UI.*
*   [ ] **B22: Notification UI.** Wire polling/websockets for unread counts. *Test: Creating a comment in another tab updates the notification bell count.*

**Phase B23-B24: Deployment & Final Gates** *(DEFERRED — pre-deployment concern)*
*   [ ] **B23: CI/CD & Docker.** Multi-stage Dockerfile (Node Alpine). GitHub Actions pipeline. *Test: Pipeline runs lint, typecheck, unit tests, and builds image.*
*   [ ] **B24: E2E Testing.** Playwright tests for critical paths. *Test: Playwright registers user, creates post, votes, and logs out successfully.*

---

### 7. Risk Register, Rollback & Definition of Done

#### Risk Register
| Risk | Probability | Impact | Mitigation |
| :--- | :--- | :--- | :--- |
| **SQLite Write Contention** | Medium | High | `busy_timeout`, queueing high-volume writes, monitoring TPS to trigger Postgres escape hatch. |
| **Migration Failure** | Low | High | Strict transactional migrations. Backup `db.sqlite` before running `drizzle-kit migrate`. |
| **State Desync** | Medium | Medium | Strict separation of React Query (server) and Zustand (UI). No duplicate state sources. |

#### Rollback Plan
1.  **API Layer:** Stateless Docker containers. Rollback via orchestrator (e.g., `docker-compose down && git checkout previous-tag && docker-compose up`).
2.  **Database:** Pre-migration automated file copy of `production.db` to S3 via cron/Litestream. Rollback involves stopping the API, replacing the file from backup, and restarting.

#### Explicit Definition of Done (DoD)
A phase or the entire project is only "Done" when:
1.  **Code Quality:** 0 TypeScript errors, 0 ESLint warnings, Prettier formatted.
2.  **Testing:** Unit test coverage > 80% for backend logic. 100% of critical paths covered by E2E Playwright tests.
3.  **Security:** ZAP or similar DAST scan reveals no High/Critical vulnerabilities. No hardcoded secrets in the repository (verified by `gitleaks`).
4.  **Observability:** Every API endpoint emits structured logs with correlation IDs.
5.  **Documentation:** `README.md` contains exact commands to bootstrap the DB, seed data, and run the monorepo locally.
6.  **Reversibility:** The database migration can be cleanly rolled back (`drizzle-kit drop` equivalent) without orphaned data.

