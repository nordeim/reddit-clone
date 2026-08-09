Based on a comprehensive review of `AGENTS.md`, `CLAUDE.md`, `README.md`, and the `Project-Architecture-Document.md`, I have analyzed the current state of the **embers** codebase.

The current architecture is a brilliant, highly optimized **100% client-side deterministic SPA**. It relies on seeded PRNGs to generate data in the browser and uses a clever "overlay pattern" in Zustand to manage user interactions without mutating the generated data. However, these constraints were explicitly chosen to support a **zero-backend, single-file static demo**.

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

