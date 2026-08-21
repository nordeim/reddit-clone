# REMEDIATION_PLAN_ROUND_16.md

> **Date:** 2026-08-19
> **Mode:** Audit-driven remediations (docs → live E2E → plan validation → TDD execution)
> **Live target:** `https://reddit.jesspete.shop/`
> **Skills used:** `planning-and-task-breakdown`, `tdd-workflow`, `testing-patterns`, `e2e-testing-lessons`, `code-review-checklist`, `documentation-and-adrs`, `agents-md`, `how-to-git-push-using-ssh-wrapper`

---

## 0. Executive summary

Round 16 is a **production-serving + live-gap + deferred-bug** remediations. The remaining items in `docs/REMEDIATION_PLAN.md` were re-validated against the codebase and the live site.

**What this round executes (in-repo, TDD):**

| ID | Item | Why now |
|---|---|---|
| R15.1 | Production API client uses same-origin (`""`) instead of `http://localhost:4000` | Live SPA currently posts login to localhost; that can never succeed on the public host |
| R15.2 | Fastify optional static SPA serving (`STATIC_DIR`) | Root cause of LIVE-CRIT-2/3/4: operator serves SPA via `python -m http.server` (no POST, no Helmet headers) |
| R15.3 | Helmet CSP allows inline scripts when serving the single-file SPA | Required so `@fastify/static` can actually run the inlined bundle |
| R15.4 | LoginPage redirects to `location.state.from` after success | Documented deferred bug (Rounds 6–7) |
| R15.5 | LoginPage ↔ RegisterPage cross-links | Register has a login link; Login has none (WCAG 2.2 AA discoverability) |
| R15.6 | Favicon (live `/favicon.ico` is 404) | Brand + console noise |
| R15.7 | `start_production.sh` + Docker serve SPA from Fastify (no Python http.server) | Makes the unified server the supported production path |
| R15.8 | Cloudflare `_headers` for static-only deploys | Closes LIVE-CRIT-3 when the operator keeps a CDN/static host |
| R15.9 | Doc alignment (PAD stale counts, Round 14/15, security claims, live status) | Requested first; completed after code so docs match the remediated tree |

**What this round explicitly does NOT execute (and why):**

| Item | Plan ref | Reason |
|---|---|---|
| B17 BrowserRouter + drop `vite-plugin-singlefile` | Phase 4.1–4.2 | Sacred "deploy anywhere" ADR-003/004. Docs require **explicit user confirmation**. Live site is a HashRouter static host. |
| B19–B22 React Query / optimistic UI / notification polling | Phase 4.3–4.6, 4.10 | Live backend is unreachable. Wiring feeds to the API as the primary source without a working origin would break the deterministic demo. Hybrid strategy remains the documented target for a future round. |
| Sentry + source maps | Phase 5.4–5.5 | Requires a DSN / auth token the repo does not have. Adding a stub would be speculative scaffolding. |
| Git history rewrite of leaked `.env` | R9.1 | Rotation remains the primary remediations. Force-push is out of scope. |

---

## 1. Validation: docs vs codebase (pre-remediation)

Validated 2026-08-19 against HEAD `970e2e1` (`main`).

### 1.1 Alignment scorecard

| Workstream | Result |
|---|---|
| File/path existence | PASS — `apps/{web,server}`, `packages/{shared,db}`, e2e specs, scripts all exist as documented |
| Commands / root scripts | PASS — 25 scripts in `package.json` match AGENTS/README/CLAUDE |
| Versions | PASS — React 19.2.6, Vite 7.3.2, Fastify 5.11.3, Drizzle 0.36.4, jose 5.10.0, argon2 0.41.1, Zod 3.25.76, Playwright ^1.62.1 |
| Test file inventory | PASS — web 19, server 8, shared 3, db 2 (matches AGENTS) |
| Architecture (HashRouter, overlay, composition root, 17 routes, 7 tables + FTS5) | PASS |
| PAD (`docs/Project-Architecture-Document.md`) | **DRIFT** — §7.1 still says **453** tests (web 262 / shared 67 / db 29); actual documented/claimed total is **467** (271 / 70 / 31). Last Updated is Round 13; Round 14 is missing. §6.1 still says "No server exists". §9.2 commands are client-only. |
| AGENTS.md / CLAUDE.md / README.md / reddit-clone_SKILL.md | Largely aligned after session 14 (test counts 467, Round 14 banner present). Live-deployment section still describes 2026-08-10 state (accurate for API/headers; client R10 fixes appear deployed). |
| `skills/` tracking | 13,926 files are tracked again (commit `319e266` restored them after Round 12 untrack). `.gitignore` still lists `skills/`. Not a code bug; a hygiene decision. |

### 1.2 `docs/REMEDIATION_PLAN.md` remaining checkboxes (validated)

Already done (confirmed in source): Phase 1.x, 2.x, 3.x, 4.7–4.9, 5.1–5.3, 5.6–5.7, B0–B16, B18, B23, B24.

Still open and **correctly** open:

- `[ ]` 4.1 / 4.2 / B17 — BrowserRouter + drop singlefile
- `[ ]` 4.3–4.6 / 4.10 / B19–B22 — React Query + hybrid data + optimistic UI + infinite query
- `[ ]` 5.4 / 5.5 — Sentry
- `[ ]` 5.8 — OWASP + WCAG audit (this round performs the audit and lands the in-repo fixes)

No plan/code contradiction that `test:plan-alignment` would fail. Forbidden tokens (tRPC / pnpm / Turborepo / RS256 / UUID PKs) are absent.

---

## 2. Live-site audit (2026-08-19)

Probes against `https://reddit.jesspete.shop/` (Cloudflare in front):

| Probe | Result | Classification |
|---|---|---|
| `GET /` | **200** `text/html` **537,956 bytes**. Title `embers — a Reddit-style community feed`. No `/@vite/client` or `/@react-refresh`. | LIVE-CRIT-1 still **FIXED**. Production single-file SPA is deployed (last-modified 2026-08-18). |
| `GET /api/posts`, `/api/communities`, `/api/search`, `/health` | **404** `text/html` Python `http.server` "File not found." | LIVE-CRIT-2 **still broken** |
| `POST /api/auth/login` | **501** `text/html` "Unsupported method ('POST')." | LIVE-CRIT-4 **still broken** — classic `python -m http.server` |
| Security headers (CSP, HSTS, XCTO, XFO, Referrer-Policy) | **all absent** | LIVE-CRIT-3 **still broken** |
| `GET /favicon.ico` | **404** | New: LIVE-MED-1 |
| `GET /images/cat-tech.jpg` | **200** image/jpeg | OK |
| `GET /login` (no hash) | **404** | Expected under HashRouter + static host |
| `#/login`, `#/register`, `#/comments/p1` | Serve the same SPA HTML | OK |

**Live Playwright (Verified, 2026-08-19):** `LIVE_BASE_URL=https://reddit.jesspete.shop/ npm run test:e2e:live` → **27 passed, 1 skipped** (comment composer skipped because backend is down). Client R10 fixes are live (PostPage renders, 404 text present, mobile `scrollWidth=375`, register mismatch disables submit). Login surfaces `role="alert"` with **"Failed to fetch"** — the production bundle is calling `http://localhost:4000`, not the public origin. Feed: 8 articles → 48 on scroll. Console errors on load: 0. Backend probes: **0/4 OK** (health/posts/communities 404, login 501). Security headers: **5/5 missing**.

**Root cause (Verified):** the public origin is a **Python static file server**, not Fastify. That is exactly what `start_production.sh` currently starts on port 5173 (`python3 -m http.server 5173 --directory apps/web/dist`). Fastify (port 5000) is either not running or not routed by the reverse proxy / Cloudflare. The production API client default (`http://localhost:4000`) is a second, independent client-side bug.

**In-repo remediations (this round):** stop recommending a split Python+Fastify production topology. Serve the SPA from Fastify so Helmet headers, POST, `/health`, and `/api/*` share one origin.

---

## 3. Architecture decisions (this round)

1. **Do not revoke ADR-003 / ADR-004.** HashRouter + single-file stay. B17 remains deferred.
2. **Unified production origin.** Fastify optionally serves `apps/web/dist` from `STATIC_DIR`. HashRouter needs no SPA fallback.
3. **Production API base URL is same-origin.** `createApiClient` defaults to `""` when `import.meta.env.PROD` is true; Vite dev still defaults to `http://localhost:4000`.
4. **CSP tradeoff (stated, not silent):** serving the single-file SPA requires `script-src 'self' 'unsafe-inline'` because the bundle and theme-bootstrap script are inlined. This is a known cost of ADR-003. Documented in AGENTS + this plan.
5. **No React Query this round.** Adding it without a reachable backend (or a complete hybrid) would be speculative. Feeds stay on the deterministic layer.

---

## 4. Detailed ToDo (TDD)

### Phase A — Client bugs (vertical slices)

- [x] **A1.** RED: `LoginPage` test — after login, if `location.state.from` is `/notifications`, navigate there (not `/`). GREEN: read `useLocation().state`.
- [x] **A2.** RED: `LoginPage` test — page contains a link to `/register`. GREEN: add the link (mirrors RegisterPage).
- [x] **A3.** RED: `createApiClient` uses same-origin (`""`) when `import.meta.env.PROD` is true. GREEN: `defaultBaseUrl()`. Existing explicit-`baseUrl` tests stay green.
- [x] **A4.** Favicon in `apps/web/index.html` (inline data-URI SVG).

### Phase B — Unified Fastify static serving

- [x] **B1.** `npm install @fastify/static --workspace @embers/server` (do not hand-edit `package.json`).
- [x] **B2.** RED: `config.test.ts` — `STATIC_DIR` optional, default `undefined`. GREEN: add to `envSchema`.
- [x] **B3.** RED: `static.test.ts` — without `STATIC_DIR`, `GET /` is still 404 JSON; with a temp dir containing `index.html`, `GET /` returns 200 HTML and `GET /health` still 200 JSON. GREEN: register `@fastify/static` after API routes, before error handler.
- [x] **B4.** RED: hardening test — when `STATIC_DIR` is set, CSP includes `script-src` with `'unsafe-inline'`. When unset, existing `script-src 'self'` assertion still holds.
- [x] **B5.** `start_production.sh` starts only Fastify with `STATIC_DIR=apps/web/dist` (no Python http.server).
- [x] **B6.** Dockerfile copies `apps/web/dist` → `/app/apps/web/dist` and sets `STATIC_DIR`. Compose CORS default becomes same-origin.

### Phase C — Static-host hardening (operator-side, in-repo)

- [x] **C1.** `apps/web/public/_headers` (Cloudflare Pages / similar) with CSP, HSTS, XCTO, XFO, Referrer-Policy — implemented: `apps/web/public/_headers` (841 B) shipped to `dist/_headers`; Vite copies it (closes LIVE-CRIT-3 for static-host deploys).
- [ ] **C2.** Document the operator cutover: point the live origin at Fastify (or Docker) instead of `python -m http.server`.

### Phase D — Docs (after code is green)

- [x] **D1.** AGENTS.md, CLAUDE.md, README.md, reddit-clone_SKILL.md, PAD — Round 15 banner, test counts, unified-server commands, live-status table, PAD stale 453/262/67/29 and "no server exists".
- [x] **D2.** Tick nothing in REMEDIATION_PLAN.md that is still deferred. Add a Round 15 note to 5.8 (audit performed; remaining items listed).

### Phase E — Verification ledger

- [ ] lint, typecheck, vitest, e2e local, test:plan-alignment, test:no-secrets, test:gitignore, test:ci-config, test:build
- [ ] Re-run live E2E (informational; live origin will not change until the operator redeploys)

---

## 5. Risk register

| Risk | Impact | Mitigation |
|---|---|---|
| `@fastify/static` shadows `/api/*` or `/health` | High | Register static **after** API routes; prefix-exclude `/api` and `/health` |
| CSP `'unsafe-inline'` weakens XSS posture | Medium | Only when `STATIC_DIR` is set; stated tradeoff of single-file build |
| Same-origin default breaks Vite-dev login | High | Dev still uses `http://localhost:4000`; only `import.meta.env.PROD` flips |
| Operator does not redeploy | Medium | In-repo fix is complete; live gaps stay until cutover. Docs say so. |
| `skills/` still tracked (13,926 files) | Low | Out of scope (user restored them). Do not `git rm`. |

---

## 6. Definition of Done

1. Every Phase A–D checkbox is either done or explicitly deferred with a reason.
2. TDD: each code change has a failing test first (except favicon / `_headers` / shell / Dockerfile / docs).
3. `npm run lint`, `typecheck`, `test`, `test:e2e`, `test:plan-alignment` pass.
4. No secrets committed. No `dist/` tracked.
5. Docs match the remediated tree (test counts, commands, live status).
6. Commits on `main` only; push via the SSH wrapper.
