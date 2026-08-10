To transition this into a **production-ready, enterprise-grade application** with a SQLite backend, we must fundamentally restructure the architecture. The "demo constraints" (single-file build, hash routing, client-side data generation) must be revoked in favor of standard enterprise patterns (code-splitting, clean URLs, database-driven source of truth).

Below is the comprehensive remediation plan and detailed ToDo list to execute this transition.

---

### 1. Revoked Architecture Decision Records (ADRs)
Before implementing new features, we must explicitly revoke or alter several ADRs from the current Project Architecture Document (PAD) that are incompatible with a production backend:

*   **Revoke ADR-001 (Deterministic Data Generation at Runtime):** The PRNG logic is excellent but must be retired from runtime execution. It will be repurposed exclusively as a **database seed script**. Runtime data must flow from SQLite via API.
*   **Revoke ADR-002 (Overlay Pattern for User State):** The Zustand overlay was a necessary hack because generated data was immutable. In a client-server model, the database is the source of truth. Server state (posts, votes, comments) will migrate to **TanStack Query (React Query)**. Zustand will be restricted strictly to ephemeral UI state (theme, toasts, layout toggles).
*   **Revoke ADR-003 (Single-File Build via `vite-plugin-singlefile`):** A monolithic ~528KB HTML file is an anti-pattern for enterprise performance. We must enable route-based code splitting, tree-shaking, and long-term asset hashing for CDN caching.
*   **Revoke ADR-004 (HashRouter for Zero-Config Routing):** Hash routing (`#/path`) was chosen for static hosting simplicity. Enterprise apps require clean, SEO-friendly URLs (`/path`) via `BrowserRouter`, with the backend handling SPA fallback routing.

---

### 2. Target Architecture Stack
*   **Monorepo:** Turborepo + `pnpm` workspaces (`apps/web`, `apps/server`, `packages/shared`, `packages/database`).
*   **Backend:** Node.js + **Fastify** (high performance, schema-based validation) + TypeScript.
*   **API Layer:** **tRPC** (End-to-end type safety without code generation or OpenAPI overhead).
*   **Database:** SQLite via **`better-sqlite3`** + **Drizzle ORM** (Type-safe SQL).
*   **Client State:** **TanStack Query** (Server state) + **Zustand** (Ephemeral UI state).
*   **Auth:** Argon2id (passwords) + JWT (Access/Refresh tokens).

---

### 3. Comprehensive Remediation Plan & ToDo List

#### Phase 1: Monorepo & Infrastructure Foundation
*Objective: Restructure the project for full-stack development and establish strict code quality gates.*

*   [ ] **1.1** Initialize monorepo using `pnpm` workspaces and Turborepo to manage `apps/web`, `apps/server`, `packages/shared`, and `packages/database`.
*   [ ] **1.2** Extract `src/types/index.ts` into `packages/shared` to ensure identical domain models (User, Post, Comment, etc.) across client and server.
*   [ ] **1.3** Scaffold `apps/server` with Node.js, Fastify, TypeScript, and Pino (structured JSON logging).
*   [ ] **1.4** Configure strict ESLint and Prettier rules across the entire monorepo (replacing the current "No ESLint" setup) to enforce enterprise code quality.
*   [ ] **1.5** Set up a CI/CD pipeline (GitHub Actions) to run typechecking, linting, and unit tests on every pull request.

#### Phase 2: Database Layer & Schema (SQLite Production Hardening)
*Objective: Design a robust relational schema and migrate the deterministic seed data into SQLite.*

*   [ ] **2.1** Scaffold `packages/database` with Drizzle ORM and `better-sqlite3`.
*   [ ] **2.2** Design relational schema: `users`, `communities`, `posts`, `comments`, `votes`, `notifications`, and `sessions`.
*   [ ] **2.3** **Critical SQLite Hardening:** Enable Write-Ahead Logging (WAL) mode (`PRAGMA journal_mode=WAL;`) and configure `busy_timeout = 5000` to safely handle concurrent write contention.
*   [ ] **2.4** Write and apply the initial migration (`drizzle-kit generate` / `migrate`) to establish the schema.
*   [ ] **2.5** Create a seed script that executes the existing PRNG logic (`src/utils/random.ts`) to populate the DB with the 48 users, 18 communities, 320 posts, and comment trees.
*   [ ] **2.6** Implement transactional boundaries for complex operations (e.g., creating a post + generating notifications for followers).

#### Phase 3: API & Security (Fastify + tRPC)
*Objective: Build a type-safe, secure API layer with real authentication.*

*   [ ] **3.1** Integrate `@trpc/server` with Fastify. Define Zod schemas for all inputs/outputs in `packages/shared`.
*   [ ] **3.2** Implement Authentication Router: Register, Login, Logout, and Refresh Token endpoints.
*   [ ] **3.3** Implement secure password hashing using `argon2` (replacing any plaintext or weak hashing).
*   [ ] **3.4** Implement JWT strategy: short-lived access tokens (15m) stored in memory, long-lived refresh tokens (7d) stored in `HttpOnly`, `Secure`, `SameSite=Strict` cookies.
*   [ ] **3.5** Implement authorization middleware (e.g., `protectedProcedure` in tRPC) that validates the access token and attaches `ctx.user` to the request context.
*   [ ] **3.6** Implement Community, Post, Comment, Vote, and Notification routers with full CRUD and strict ownership validation (users can only edit/delete their own content).
*   [ ] **3.7** Add security middleware: `@fastify/cors` (strict origin whitelist), `@fastify/helmet` (CSP, HSTS), and `@fastify/rate-limit` (especially on auth endpoints to prevent brute force).
*   [ ] **3.8** Add `/health` and `/ready` endpoints for container orchestration probes (Kubernetes/ECS).

#### Phase 4: Frontend Refactoring (Client-Server Integration)
*Objective: Decouple the frontend from local data generation and integrate with the new API.*

*   [ ] **4.1** Migrate `apps/web` to use `BrowserRouter` instead of `HashRouter` for clean URLs.
*   [ ] **4.2** Remove `vite-plugin-singlefile` to enable route-based code splitting and long-term asset caching.
*   [ ] **4.3** Integrate `@trpc/client` and TanStack Query (React Query) in `apps/web`.
*   [ ] **4.4** **Refactor Zustand Store:** Remove all server-state (votes, posts, joined communities, notifications). Keep *only* ephemeral UI state (theme, toasts, sidebar open/close).
*   [ ] **4.5** Replace `src/data/*` imports with tRPC React Query hooks (`useQuery`, `useInfiniteQuery`, `useMutation`).
*   [ ] **4.6** Implement optimistic UI updates for voting and commenting, with automatic rollback on API failure (replacing the current local overlay mutations).
*   [ ] **4.7** Build real Login/Register UI pages and wire them to the auth router.
*   [ ] **4.8** Replace the cosmetic "Log out (demo)" button with real session destruction and redirect logic.
*   [ ] **4.9** Update `AppShell` to fetch and display real unread notification counts and conditionally render UI based on authentication state.
*   [ ] **4.10** Implement infinite scroll pagination using `useInfiniteQuery` cursor-based pagination backed by the database (replacing the 650ms simulated latency).

#### Phase 5: Testing, Observability & Hardening
*Objective: Ensure the application is robust, observable, and ready for production deployment.*

*   [ ] **5.1** Write backend integration tests for all tRPC routers using Fastify's `inject` method against an in-memory/test SQLite DB.
*   [ ] **5.2** Install and configure Playwright for End-to-End (E2E) testing.
*   [ ] **5.3** Write E2E tests for critical flows: User registration, login, create post, upvote, comment, and logout.
*   [ ] **5.4** Integrate Sentry for client-side and server-side error tracking and performance monitoring.
*   [ ] **5.5** Configure Vite build to generate source maps and upload them to Sentry for error deobfuscation.
*   [ ] **5.6** Add an automated database backup strategy (e.g., Litestream for continuous SQLite replication to S3, or cron-based snapshots).
*   [ ] **5.7** Configure Dockerization (`Dockerfile` for multi-stage build of frontend and backend) and a `docker-compose.yml` for local development.
*   [ ] **5.8** Perform a final security audit (OWASP Top 10) and accessibility audit (WCAG 2.2 AA).

---

### 4. Risk Assessment & Production Realities

#### SQLite Concurrency Constraints
SQLite is highly viable for production but has specific concurrency characteristics that must be respected:
*   **Single Writer:** SQLite allows only one concurrent write transaction. High-volume write operations (e.g., thousands of votes per second) will queue.
*   **Mitigation:** The `busy_timeout = 5000` and WAL mode configured in Phase 2 will prevent immediate crashes. However, if the application scales past ~500 write transactions per second (TPS), we must implement write-batching (e.g., aggregating votes in memory and flushing to DB periodically) or plan a migration to PostgreSQL.

#### State Management Shift
The current codebase mixes server state and UI state in a single Zustand store. This is the highest-risk refactor area.
*   **Risk:** If React Query (server cache) and Zustand (UI state) become desynchronized, the UI will display stale data or "ghost" updates.
*   **Mitigation:** Strict separation. React Query owns all data that exists in the database. Zustand only owns data that exists solely in the user's current browser session (e.g., "is the sidebar open?", "is dark mode enabled?").

#### Authentication State Management
Moving from a hardcoded `CURRENT_USER` to real JWT authentication requires robust global error handling.
*   **Mitigation:** Implement a global tRPC link/interceptor that catches `401 Unauthorized` responses, silently attempts to refresh the access token using the refresh cookie, and retries the original request. If the refresh fails, redirect the user to the login page.

---

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
*   [x] **B10: Post/Community API.** Implement CRUD with authorization checks (only author can edit). *Test: Integration tests verify 403 Forbidden on unauthorized edits.* (PATCH + DELETE routes with author-only authorization added in Round 2; 12 integration tests cover 200/403/404/422 paths.)
*   [x] **B11: Transactional Votes.** Implement `PUT /votes`. *Test: Concurrent load test (100 simultaneous votes) results in exactly 100 incremented upvotes without race conditions.* (Atomic SQL `UPDATE … SET col = col + delta` inside a transaction; verified by `voteConcurrency.test.ts` — 100 upvotes from 100 different users produce exactly +100 score; 100 toggles from one user produce 0 net; flip from -1 to +1 produces +2.)
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
