### Codebase Comprehension
I have cloned the repository and reviewed `AGENTS.md`, `CLAUDE.md`, `README.md`, and `docs/session_10.md`. The project is a mature, enterprise-grade npm-workspaces monorepo consisting of four packages:

1.  **`@embers/web` (`apps/web/`)**: A React 19 SPA using Vite 7, Tailwind v4, and Zustand. It currently runs on a **deterministic PRNG data layer** (ADR-001) for the core feed experience, using `HashRouter` and `vite-plugin-singlefile` for zero-config static hosting (ADR-003/004). Auth (B18) was completed in Rounds 6–7, adding `AuthProvider`, `LoginPage`, `RegisterPage`, and an auth-aware Navbar.
2.  **`@embers/server` (`apps/server/`)**: A Fastify REST API using Drizzle ORM, SQLite (`better-sqlite3`), and Zod for validation. It implements a composition-root pattern (`buildApp()`), transactional vote counters (ADR-108), and FTS5 virtual tables for search (ADR-109).
3.  **`@embers/db` (`packages/db/`)**: Drizzle schema, SQLite client with WAL mode and `busy_timeout=5000`, and deterministic seed scripts matching the client’s PRNG output.
4.  **`@embers/shared` (`packages/shared/`)**: Zod schemas and branded string IDs (`UserId`, `PostId`, etc.) to ensure type safety across the monorepo.

The codebase is extensively tested (462 vitest tests + 48 Playwright E2E tests) and passes all CI gates (lint, typecheck, test, build, gitleaks, plan-alignment).

---

### `docs/REMEDIATION_PLAN.md` Validation & Alignment

I have validated the claims in `docs/REMEDIATION_PLAN.md` against the actual source code. The document is **highly accurate regarding the architecture, tech stack, and ADRs**, but contains **internal inconsistencies in its 5-Phase execution checklist**.

#### 1. Architectural & Technical Alignment (Verified ✅)
*   **Monorepo & Stack**: Verified. `package.json` contains all four workspaces. `apps/server` uses Fastify/Pino/Zod. `packages/db` uses Drizzle/better-sqlite3.
*   **Authentication (ADR-104)**: Verified. `apps/server/src/auth/jwt.ts` uses **HS256** (symmetric) via `jose`. `config.ts` enforces **15m** access tokens and **7d** refresh tokens. `password.ts` uses **Argon2id**.
*   **Database Hardening (ADR-103)**: Verified. `packages/db/src/client.ts` sets `PRAGMA journal_mode=WAL` and `PRAGMA busy_timeout=5000`. `schema/index.ts` defines the `votes` table with a composite primary key `(user_id, target_id, target_type)`.
*   **FTS5 Search (ADR-109)**: Verified. `packages/db/src/fts5.ts` creates a `posts_fts` virtual table with `content='posts'` (external content pattern) and BM25 ranking.
*   **State Management (ADR-105 Status)**: Verified. The plan correctly identifies that React Query is the *Target State* (deferred B19–B22) and that Zustand currently still owns all state (verified in `apps/web/src/store/store.ts` which holds `votes`, `localPosts`, `localComments`).
*   **B18 (Auth Provider) Completion**: Verified. `AuthProvider.tsx`, `LoginPage.tsx`, `RegisterPage.tsx`, and `RequireAuth.tsx` all exist. `lib/api.ts` implements `tryRefreshOn401`.

#### 2. Discrepancies & Internal Inconsistencies (Action Required ⚠️)
While the Round 10 update successfully aligned the architecture sections and the B0–B24 backlog at the bottom of the document, the **5-Phase ToDo List** (Sections 3.1–3.8 and 4.1–4.10) was not fully updated to reflect completed work.

The following items are marked `[ ]` (Incomplete) in the 5-Phase list, but correspond exactly to phases that are already marked `[x]` in the B0–B24 backlog and exist in the codebase:

| Phase Item | Claim in `REMEDIATION_PLAN.md` | Actual Status in Codebase | Corresponding Backlog Item |
| :--- | :--- | :--- | :--- |
| **Phase 2 (2.1–2.6)** | Scaffold DB, Schema, WAL, Migrations, Seed, Transactions. | **All Complete**. `packages/db` exists, schema is defined, WAL is enabled, migrations applied, seed works, votes are transactional. | **B3–B7 (Done)** |
| **Phase 4 (4.7)** | Build real Login/Register UI pages. | **Complete**. `LoginPage.tsx` and `RegisterPage.tsx` exist and are wired to `useAuth()`. | **B18 (Done)** |
| **Phase 4 (4.8)** | Replace cosmetic "Log out" with real session destruction. | **Complete**. Navbar uses `auth.logout()` which clears client state and calls `/api/auth/logout`. | **B18 (Done)** |
| **Phase 4 (4.9)** | Update AppShell for unread counts & auth state. | **Complete**. `<RequireAuth>` protects `/notifications`; Navbar is auth-aware. | **B18 (Done)** |
| **Phase 5 (5.2–5.3)** | Install Playwright & Write E2E tests. | **Complete**. `playwright.config.ts` and `e2e/smoke.spec.ts` + `auth.spec.ts` exist and pass. | **B24 (Done)** |
| **Phase 5 (5.7)** | Dockerization & `docker-compose.yml`. | **Complete**. `Dockerfile` and `docker-compose.yml` exist at the repo root. | **B23 (Done)** |

#### 3. Outstanding Work (Verified Pending ⏳)
The following items are correctly marked `[ ]` (Incomplete/Deferred) and align with the "Deferred" status in `AGENTS.md` and `CLAUDE.md`:
*   **Phase 4 (4.1–4.6, 4.10)**: BrowserRouter, removal of `vite-plugin-singlefile`, React Query integration, and optimistic UI. These correspond to **B17 and B19–B22**, which are explicitly deferred in `AGENTS.md` to preserve the current "deploy anywhere" static hosting story.
*   **Phase 5 (5.4–5.6, 5.8)**: Sentry integration, source map uploads, Litestream/backup strategy, and final OWASP/WCAG audits. These are not yet implemented.
*   **Phase 1 (1.4)**: Prettier. The plan correctly notes this is "still open per audit_report_1 F6" (the project uses ESLint only).

### Summary Recommendation
The `REMEDIATION_PLAN.md` is architecturally sound and technically accurate regarding the implemented stack. The only remediation needed is a **document cleanup**: update the checkboxes for **Phase 2 (all items)**, **Phase 4 (items 4.7–4.9)**, and **Phase 5 (items 5.2–5.3, 5.7)** from `[ ]` to `[x]` to match the B0–B24 backlog and the actual state of the repository.
