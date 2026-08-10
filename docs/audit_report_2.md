### 1. Audit & Validation of `docs/REMEDIATION_PLAN.md`

A systematic review of the provided remediation plan against the current codebase state reveals that while the high-level target architecture is sound, the document contains severe internal contradictions and mismatches with the actual implementation.

**Summary of Findings**
| Severity | Count | Description |
| :--- | :---: | :--- |
| **Critical** | 2 | Architectural contradictions that will cause implementation drift. |
| **High** | 3 | Security and data-model mismatches with the live codebase. |
| **Medium** | 2 | Execution dependencies and capability gaps. |

#### Detailed Findings

**[CRITICAL] F1: API Layer Contradiction (tRPC vs REST+Zod)**
*   **Location:** `docs/REMEDIATION_PLAN.md` §2 (Target Architecture Stack) vs. §Audit of Previous Plan.
*   **Description:** §2 lists "tRPC" as the API layer, but the Audit section explicitly rejects tRPC in favor of "REST+Zod".
*   **Evidence:** The codebase (ADR-101, `apps/server/src/routes`) is fully implemented as REST+Zod.
*   **Impact:** Developers may attempt to introduce tRPC into an existing REST backend, causing fragmentation.
*   **Recommended Fix:** Rewrite §2 to explicitly state "REST + Zod (Fastify)" and purge all tRPC references.
*   **Confidence:** Verified.

**[CRITICAL] F2: Monorepo Tooling Contradiction (pnpm/Turborepo vs npm)**
*   **Location:** `docs/REMEDIATION_PLAN.md` §2 vs. §8 (ADR-107).
*   **Description:** §2 proposes "Turborepo + pnpm workspaces", while §8 defines ADR-107 as "npm-workspaces".
*   **Evidence:** The repository uses `npm-workspaces` (root `package.json` contains `workspaces` array; `package-lock.json` is present).
*   **Impact:** CI/CD pipelines will fail if scripts assume `pnpm` or Turborepo cache mechanisms.
*   **Recommended Fix:** Align §2 to "npm-workspaces". Turborepo can be added as an orchestration layer, but the package manager must remain `npm`.
*   **Confidence:** Verified.

**[HIGH] F3: JWT Algorithm Mismatch (RS256 vs HS256)**
*   **Location:** `docs/REMEDIATION_PLAN.md` §5.1 (Authentication Design).
*   **Description:** Specifies "Asymmetric JWT (RS256)" for token signing.
*   **Evidence:** `apps/server/src/auth/jwt.ts` uses `jose` with HS256 (symmetric), as documented in `AGENTS.md`.
*   **Impact:** RS256 requires public/private key pair management, which is not implemented in the current `loadEnv()` schema.
*   **Recommended Fix:** Update §5.1 to specify "Symmetric JWT (HS256) via `jose`" to match the live implementation.
*   **Confidence:** Verified.

**[HIGH] F4: Data Model ID Strategy (UUID vs Branded/Sequential)**
*   **Location:** `docs/REMEDIATION_PLAN.md` §4.1 (SQLite Data Model).
*   **Description:** Specifies `id (UUID)` for all tables.
*   **Evidence:** The seed script (`packages/db/scripts/seed.ts`) generates sequential IDs (`u1`, `p1`). `@embers/shared` uses branded string IDs (`UserId`, `PostId`).
*   **Impact:** Enforcing UUIDs requires rewriting the seed script and breaking the deterministic mapping used in 453+ tests.
*   **Recommended Fix:** Update §4.1 to specify "Branded String IDs (e.g., `UserId`), seeded as `u1`, `p1`, etc., in dev; UUIDs/ULIDs in prod".
*   **Confidence:** Verified.

**[HIGH] F5: ADR Revocation vs. Deferred Execution (The "Offline" Conflict)**
*   **Location:** `docs/REMEDIATION_PLAN.md` §1 (Revoked ADRs) vs. §11 (Phase B17-B22).
*   **Description:** §1 explicitly revokes ADR-001 (Deterministic Data), ADR-003 (Single-File), and ADR-004 (HashRouter). However, §11 defers B17 (which removes Single-File and HashRouter) and implicitly relies on ADR-001 for the offline SPA.
*   **Evidence:** `apps/web/src/data/*` is still imported to render the feed when the backend is not wired.
*   **Impact:** If ADR-001 is truly revoked, the client SPA breaks immediately. If B17 is deferred, ADR-003/004 cannot be revoked.
*   **Recommended Fix:** Change §1 status to "Target State (Pending B17 Execution)". The ADRs remain active until the frontend migration is executed.
*   **Confidence:** Verified.

**[MEDIUM] F6: Frontend Integration Deadlock**
*   **Location:** `docs/REMEDIATION_PLAN.md` §11 (Phase B17-B22).
*   **Description:** B19-B22 (React Query, API wiring) depend on B17 (BrowserRouter + chunked build), but B17 is deferred to preserve "deploy-anywhere" static hosting.
*   **Impact:** The enhancement cannot be executed as long as B17 is deferred.
*   **Recommended Fix:** The new plan must explicitly resolve this deadlock by either (A) executing B17 properly and updating deployment docs, or (B) adapting B19-B22 to work within `HashRouter` constraints.
*   **Confidence:** Reasoned.

**[MEDIUM] F7: Loss of Offline Capability**
*   **Location:** `docs/REMEDIATION_PLAN.md` §4.4 (Refactor Zustand Store).
*   **Description:** Proposes removing all server state from Zustand and moving purely to React Query.
*   **Impact:** Removes the client's ability to function offline with deterministic data unless a fallback strategy is implemented.
*   **Recommended Fix:** Define a "Hybrid Data Strategy" where React Query attempts the API first, and on failure/initial load, falls back to the deterministic `src/data/*` layer.
*   **Confidence:** Reasoned.

---

### 2. Comprehensive Remediation Plan (The "Enhancement")

To execute the enhancement—wiring the frontend to the backend and achieving the enterprise target state—we must resolve the deadlock identified in **F6**. The recommended strategy is to **execute B17 (Build Refactor)** as the foundational step, transitioning from "deploy-anywhere demo" to "enterprise SPA," while retaining a fallback mechanism for offline resilience.

#### Phase C1: Resolve B17 (Build & Routing Refactor)
*Objective: Transition from demo constraints to enterprise patterns.*
*   [ ] **C1.1:** Remove `vite-plugin-singlefile` from `apps/web/vite.config.ts`. Configure standard Vite chunking with content hashing (`[name]-[hash].js`) for long-term caching.
*   [ ] **C1.2:** Replace `HashRouter` with `BrowserRouter` in `apps/web/src/App.tsx`.
*   [ ] **C1.3:** Update deployment documentation (`README.md`, `AGENTS.md`) to require a reverse proxy (Nginx/Caddy) or hosting platform (Vercel/Netlify) that handles SPA fallback routing (`/*` -> `index.html`).
*   [ ] **C1.4:** Update `e2e/` Playwright tests to handle standard URL paths (remove `#` handling).
*   **Gate:** `npm run build` outputs chunked assets; deep-linking to `/r/technology` works locally and in E2E.

#### Phase C2: Server State Management (Executing B19)
*Objective: Introduce TanStack Query (React Query) for server state.*
*   [ ] **C2.1:** Install `@tanstack/react-query` in `apps/web`.
*   [ ] **C2.2:** Create a `QueryProvider` in `apps/web/src/providers/` wrapping the `<App />` in `main.tsx`.
*   [ ] **C2.3:** Define `QueryKey` factories in `apps/web/src/lib/queryKeys.ts` (e.g., `posts.list`, `posts.detail(id)`).
*   [ ] **C2.4:** Implement `useApi` hook that combines `useAuth()` token injection with the `createApiClient` from `lib/api.ts`.
*   [ ] **C2.5:** Create `useFeed` hook (`useInfiniteQuery`) and `usePost` hook (`useQuery`).
*   **Gate:** React Query DevTools show queries firing against the Fastify backend; 0 duplicate fetches.

#### Phase C3: API Wiring & Pagination (Executing B20)
*Objective: Wire feeds and search to the real backend.*
*   [ ] **C3.1:** Replace `src/data/posts.ts` imports in `HomePage.tsx` and `CommunityPage.tsx` with `useFeed({ communitySlug })`.
*   [ ] **C3.2:** Implement `useInfiniteScroll` to trigger `fetchNextPage()` when the IntersectionObserver intersects.
*   [ ] **C3.3:** Replace `src/utils/search.ts` client-side filtering with `useSearch(query)` hitting `GET /api/search`.
*   [ ] **C3.4:** Implement empty/error states: If the API is unreachable, gracefully fall back to the deterministic `src/data/*` layer (preserving the offline demo capability).
*   **Gate:** Scrolling the feed fetches pages from SQLite; search results match FTS5 ranking.

#### Phase C4: Optimistic UI & Mutations (Executing B21)
*Objective: Ensure mutations feel instantaneous and handle failures gracefully.*
*   [ ] **C4.1:** Implement `useVote` mutation (`useMutation`). Use `onMutate` to snapshot the previous query data, optimistically update the UI, and `onError` to rollback to the snapshot.
*   [ ] **C4.2:** Implement `useCreateComment` mutation with optimistic prepending to the comment tree.
*   [ ] **C4.3:** Implement `useCreatePost` mutation with optimistic prepending to the feed.
*   [ ] **C4.4:** Add global toast notifications (`Toaster` component) for mutation failures (e.g., "Failed to upvote: Network error").
*   **Gate:** Throttling network to "Slow 3G" shows instant UI updates; failing the API rolls back the UI and shows a toast.

#### Phase C5: Notification Polling & Real-time Feel (Executing B22)
*Objective: Wire unread notification counts.*
*   [ ] **C5.1:** Implement `useNotifications` hook with `refetchInterval: 30000` (30s polling) for authenticated users.
*   [ ] **C5.2:** Replace the hardcoded `18` notification count in `Navbar.tsx` with `useUnreadNotificationCount()`.
*   [ ] **C5.3:** Implement mutation invalidation: `queryClient.invalidateQueries({ queryKey: ['notifications'] })` after creating a comment.
*   **Gate:** Creating a comment in a second tab increments the notification bell in the first tab within 30 seconds.

#### Phase C6: Cleanup & State Migration
*Objective: Finalize the transition from Zustand overlay to React Query.*
*   [ ] **C6.1:** Remove `votes`, `localPosts`, `localComments` from the Zustand store (`src/store/store.ts`). Keep only UI state (`theme`, `sidebarOpen`).
*   [ ] **C6.2:** Move the deterministic `src/data/*` layer behind a "Demo Mode" feature flag or fallback handler, ensuring it is not rendered by default in production when the API is healthy.
*   [ ] **C6.3:** Update `localStorage` schema versioning to v2, clearing deprecated overlay slices on hydration.
*   **Gate:** `npm run typecheck` and `npm test` pass with no references to the old overlay slices.

### 3. Definition of Done & Gates
A phase is only "Done" when:
1.  **Type Safety:** `npm run typecheck` passes across all 4 workspaces with 0 errors.
2.  **Testing:** Unit test coverage for new hooks/mutations is >80%; E2E tests cover the critical path.
3.  **Resilience:** The UI gracefully degrades to the deterministic data layer if the Fastify backend is unreachable.
4.  **Documentation:** `AGENTS.md` and `README.md` are updated to reflect the new state management patterns and deployment requirements.

