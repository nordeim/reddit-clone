## Alignment Audit Report: `docs/REMEDIATION_PLAN.md` vs. Codebase

**Mode:** C (Audit / Review)
**Scope:** Validation of architectural, structural, and implementation claims in `docs/REMEDIATION_PLAN.md` against the current state of the `reddit-clone` monorepo.
**Confidence Level:** **Verified** (all claims validated via direct file inspection and programmatic search).

### Executive Summary
The `REMEDIATION_PLAN.md` is **strictly aligned** with the current codebase. Every structural, behavioral, and numerical claim documented — including the status of deferred phases, specific library versions, security configurations, and bug-fix implementations — maps exactly to the actual source code. There are **zero contradictions** between the remediation plan and the implementation.

---

### Verification Ledger

#### 1. Architecture & Target Stack
| Claim in Remediation Plan | Codebase Verification | Status |
| :--- | :--- | :--- |
| **Monorepo:** `npm` workspaces (`apps/*`, `packages/*`) | `package.json` defines `workspaces: ['apps/*', 'packages/*']`. | ✅ Aligned |
| **Backend:** Node.js + Fastify + TypeScript + Pino | `apps/server/package.json` lists `fastify@^5.11.3`, `pino@^9.14.0`. | ✅ Aligned |
| **Database:** SQLite via `better-sqlite3` + Drizzle ORM | `packages/db/package.json` lists `better-sqlite3@^13.0.3`, `drizzle-orm@^0.36.4`. | ✅ Aligned |
| **API Layer:** REST + Zod (No tRPC/RPC) | `packages/shared/package.json` lists `zod@^3.25.76`. No `@trpc/*` dependencies found. | ✅ Aligned |
| **Auth:** Argon2id + JWT (HS256 via `jose`) | `argon2@^0.41.1`, `jose@^5.10.0` present. `apps/server/src/auth/jwt.ts` explicitly uses `HS256`. | ✅ Aligned |
| **Client State:** Zustand only (React Query deferred) | `apps/web/package.json` lists `zustand@^5.0.14`. `@tanstack/react-query` is **absent**. | ✅ Aligned |

#### 2. Database Schema & Hardening (Phase 2)
| Claim | Verification Evidence | Status |
| :--- | :--- | :--- |
| **7 Core Tables** | `users`, `communities`, `posts`, `comments`, `votes`, `notifications`, `sessions` all defined in `packages/db/src/schema/index.ts`. | ✅ Aligned |
| **SQLite Hardening (WAL/Busy)** | `packages/db/src/client.ts` explicitly configures `journal_mode=WAL`, `busy_timeout=5000`, and `foreign_keys=ON`. | ✅ Aligned |
| **Migrations** | `packages/db/src/migrations/` contains exactly `0000_greedy_major_mapleleaf.sql` and `0001_add_performance_indexes.sql`. | ✅ Aligned |
| **FTS5 Virtual Tables** | `packages/db/src/fts5.ts` implements `posts_fts` with `posts_ai`, `posts_ad`, and `posts_au` triggers. | ✅ Aligned |

#### 3. Security & Authentication (Phase 3)
| Claim | Verification Evidence | Status |
| :--- | :--- | :--- |
| **JWT TTLs** | `apps/server/src/auth/jwt.ts` comments and implementation enforce 15m access / 7d refresh TTLs. | ✅ Aligned |
| **Refresh Cookie Scope** | `apps/server/src/routes/auth.ts` sets cookie with `path: "/api/auth"`, `httpOnly: true`, `secure: true`, `sameSite: "strict"`. | ✅ Aligned |
| **Fastify Plugin Order** | `apps/server/src/app.ts` registers plugins in exact documented order: `helmet → cors → cookie → rateLimit → requestId → auth → routes → errorHandler`. | ✅ Aligned |
| **CSRF Strategy** | No double-submit cookie logic exists; architecture correctly relies on Bearer tokens + SameSite cookies as documented. | ✅ Aligned |

#### 4. Frontend Integration & Deferred Phases
| Claim | Verification Evidence | Status |
| :--- | :--- | :--- |
| **B17 (Build/Routing) Deferred** | `apps/web/src/App.tsx` uses `HashRouter`. `apps/web/vite.config.ts` still includes `vite-plugin-singlefile`. | ✅ Aligned |
| **B18 (Auth Provider) Done** | `AuthProvider.tsx`, `LoginPage.tsx`, `RegisterPage.tsx`, and `RequireAuth.tsx` all exist and are wired correctly. | ✅ Aligned |
| **B19-B22 (React Query) Deferred** | `api.ts` uses native `fetch` with `tryRefreshOn401`. No React Query providers or hooks are implemented yet. | ✅ Aligned |
| **Round 10 Bug Fixes** | `RegisterPage.tsx` (password mismatch), `Navbar.tsx` (`min-w-0`), `PostPage.tsx` (`EMPTY_COMMENTS`), and `NotFoundPage.tsx` ("404 — Page not found") are all present. | ✅ Aligned |

#### 5. Testing & CI/CD (Phase 5)
| Claim | Verification Evidence | Status |
| :--- | :--- | :--- |
| **Test File Counts** | Exact match: Web (19), Server (8), DB (2), Shared (3). Total 32 vitest files. | ✅ Aligned |
| **E2E Inventory** | `e2e/` contains `smoke.spec.ts`, `auth.spec.ts`, `live.spec.ts`, `live_extended.spec.ts`, and `repro_r10_postpage.spec.ts`. | ✅ Aligned |
| **Infrastructure Scripts** | `scripts/` contains `verify-fresh-clone-typecheck.mjs`, `verify-production-build.mjs`, `verify-no-secrets-tracked.sh`, etc. | ✅ Aligned |
| **Containerization** | `Dockerfile` uses `node:20-bookworm-slim`. `docker-compose.yml` exposes port 4000. `.github/workflows/ci.yml` is present. | ✅ Aligned |

### Conclusion
The repository is a textbook example of documentation-code alignment. The `REMEDIATION_PLAN.md` is a reliable, accurate source of truth for the system's architecture, security posture, and current technical debt (specifically the deferred frontend refactor). No remediation or correction of the documentation is required.
