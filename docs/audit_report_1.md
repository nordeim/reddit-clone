### 1. Codebase Understanding

Based on a systematic review of `AGENTS.md`, `CLAUDE.md`, `README.md`, and `docs/session_10.md`, the project ("emons") is a Reddit-style community feed implemented as an npm-workspaces monorepo.

**Architecture & Stack**
*   **Frontend (`@emons/web`)**: React 19 + Vite + TypeScript client SPA. It relies on a "deploy anywhere" static hosting model (GitHub Pages, S3, simple HTTP servers) achieved via `HashRouter` and `vite-plugin-singlefile`, which inlines all JS/CSS into a single HTML bundle.
*   **Backend (`@emons/server`)**: Fastify REST API with a composition root pattern (`buildApp`).
*   **Data Layer (`@emons/db`)**: SQLite via `better-sqlite3` and Drizzle ORM, utilizing FTS5 virtual tables for full-text search.
*   **Shared Contracts (`@emons/shared`)**: Zod schemas and branded string IDs (e.g., `UserId`, `PostId`) shared between client and server.

**State & Data Generation**
*   The client SPA uses **deterministic, immutable data generation** in the browser via seeded PRNGs (FNV-1a → mulberry32) for users, posts, and communities.
*   State is managed via a single **Zustand store** using an "overlay pattern." User actions (votes, new posts, comments, read notifications) are kept in separate slices and merged at render time, leaving the generated data untouched.
*   Authentication is wired via a custom fetch-based API client (`lib/api.ts`) and a React context (`AuthProvider`), featuring 401-refresh-retry logic and cookie-based rotating-session JWTs.

**Testing & CI/CD**
*   The project follows a strict TDD approach with 462 unit tests and 18 Playwright E2E tests.
*   `session_10.md` confirms recent alignment efforts: 9 precise edits were made to documentation to correct test counts (e.g., `api.test.ts` = 32, `RegisterPage` = 12) and update file trees to include `auth/` and `lib/` directories.
*   CI gates include `test:plan-alignment` to ensure documentation does not reference deprecated architectural proposals (e.g., RPC frameworks or non-npm package managers).

---

### 2. Validation of `REMEDIATION_PLAN.md` Findings

The `REMEDIATION_PLAN.md` outlines 10 Reconciled Architecture Decision Records (ADRs) and a phased execution plan (B0–B24). Cross-referencing these findings against the actual codebase (`app.ts`, `vite.config.ts`, `App.tsx`, `store.ts`, `package.json`) and `audit_report_1.md` reveals high alignment, with intentional deferrals correctly documented.

#### ✅ Implemented & Aligned ADRs
The following ADRs are fully implemented in the codebase and match the plan's descriptions:

*   **ADR-101 (REST + Zod), ADR-102 (Fastify), & ADR-104 (Cookie Auth)**: Implemented in `apps/server`. `app.ts` registers Fastify with helmet, CORS, and cookie plugins. Auth routes use rotating access/refresh tokens.
*   **ADR-103 (SQLite + Drizzle) & ADR-109 (FTS5 Search)**: Implemented in `packages/db`. `client.ts` opens a `better-sqlite3` connection, applies WAL/hardening pragmas, and calls `applyFts5(raw)` to set up virtual tables for search.
*   **ADR-108 (Atomic Vote Counters)**: The backend `voteService` handles transactions for vote increments. The frontend still uses the local Zustand overlay for immediate UI updates (pending B17–B22 integration).
*   **ADR-110 (Pino Structured Logging)**: Fastify's default Pino logger is configured in `app.ts` with `redact` paths for authorization headers and cookies, plus `requestId` correlation.

#### ⏸️ Documented Deferrals (Frontend Integration)
The plan proposes ADRs that supersede the original "static demo" constraints, but these are explicitly **DEFERRED** (tracked as phases B17–B22). This is a deliberate architectural choice to preserve static hosting capabilities, and the codebase correctly reflects this:

*   **ADR-105 (React Query + Zustand split)**:
    *   *Plan*: React Query for server cache; Zustand for ephemeral UI.
    *   *Codebase*: `package.json` does not include `@tanstack/react-query`. `store.ts` remains the single source of truth using the Zustand overlay pattern. This aligns with the "Deferred" status noted in `audit_report_1.md`.
*   **ADR-106 (BrowserRouter + Standard Chunking)**:
    *   *Plan*: BrowserRouter with standard Vite chunking; supersedes Single-File Build.
    *   *Codebase*: `App.tsx` imports and uses `HashRouter`. `vite.config.ts` explicitly imports and uses `viteSingleFile()`. Switching to `BrowserRouter` would break the "deploy anywhere" static hosting story, justifying the deferral.

#### 📊 Summary of Alignment
The `REMEDIATION_PLAN.md` is highly aligned with the codebase. The "Round 10 alignment note" in the plan correctly identifies that the original draft proposals (RPC, asymmetric JWT, UUIDs) have been replaced by the actual stack (REST, symmetric HS256, branded IDs). The discrepancies between the "superseded" ADRs (105, 106) and the actual frontend code are not errors; they are correctly identified as deferred work (B17–B22) to avoid breaking the existing, stable client SPA.
