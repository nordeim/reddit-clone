# REMEDIATION_PLAN_ROUND_17.md

> **Date:** 2026-08-23
> **Mode:** Audit-driven remediation (docs → live E2E → plan validation → TDD execution → doc alignment)
> **Live target:** `https://reddit.jesspete.shop/`
> **Skills used:** `planning-and-task-breakdown`, `tdd-workflow`, `writing-plans`, `e2e-testing-lessons`, `code-review-and-audit`, `documentation-and-adrs`, `how-to-git-push-using-ssh-wrapper`

---

## 0. Executive summary

Round 17 is a **live-re-audit + client UX fix + documentation reconciliation** round. The repo was cloned fresh, all four primary docs (AGENTS/CLAUDE/README/SKILL) plus the PAD and `docs/REMEDIATION_PLAN.md` were reviewed and validated against the codebase, and a browser-based E2E audit (existing suites + new ad-hoc probes) was run against the live deployment.

**Headline findings (all Verified unless noted):**

1. The **operator redeployed the live site with the Round 15/16 client fixes** — the live bundle (539,190 bytes) is byte-identical in size to a fresh `npm run build` of current `main`, contains the inline favicon, the `state.from` redirect, and posts login to **same-origin** `/api/auth/login` (no more `localhost:4000` / "Failed to fetch").
2. **LIVE-CRIT-2/3/4 persist but with changed symptoms**: the public origin is now a static host with an SPA fallback — `GET /health` and `GET /api/*` return **200 `text/html`** (the SPA shell) instead of the old Python `http.server` 404 page, and `POST /api/auth/login` returns **404 (empty body)** instead of 501. All 5 required security headers are still absent.
3. **New client bug (live-verified):** when the API origin returns a non-2xx response whose body is not the structured JSON error envelope, the API client surfaces a raw **`"HTTP 404"`** message to end users on the login and register pages. The fallback in `apps/web/src/lib/api.ts` is `errorBody.error?.message ?? \`HTTP ${res.status}\`` — meaningless to a non-engineer, exactly the class of problem Round 15 F2 fixed for network errors.
4. **Doc drift is real but narrow:** ~20 stale claims across the five docs (per-file test counts, the Round 5/6/7 "not yet implemented" deep-dive sections, the PAD §8 deployment story that predates Rounds 15–16, `test:e2e:live` undercounting its own suite, "15 rounds" vs 16, skills/ file count) plus a **missing Round 16 worklog entry**.
5. **Plan item 5.8 (OWASP Top 10 + WCAG 2.2 AA audit) executed this round** with browser-based evidence — result: PASS on all audited surfaces (details §3.3).

**What this round executes (in-repo, TDD):**

| ID | Item | Why now |
|---|---|---|
| R17-F1 | Friendly fallback message for non-JSON / message-less API error bodies | Live-verified UX bug: users see "HTTP 404" on login/register |
| R17-F2 | Permanent live a11y E2E spec (`e2e/live_a11y_r17.spec.ts`, 3 tests, opt-in via `LIVE_BASE_URL`) | Executed 5.8's WCAG slice with repeatable regression coverage |
| R17-F3 | Backfill the missing Round 16 entry in `worklog.md` | Worklog is the cross-agent memory; Round 16 is absent |
| R17-F4 | Full documentation reconciliation: AGENTS.md, CLAUDE.md, README.md, reddit-clone_SKILL.md, PAD | ~20 stale claims + live-status tables describe the pre-redeploy symptoms |
| R17-F5 | Tick plan item 5.8 with audit evidence; annotate the re-audit date on remaining live gaps | 5.8 is now executed; remaining checkboxes stay correctly open |
| R17-F6 | Verification ledger: run every quality gate + re-run live E2E after the code change | Round 16's Phase E ledger was left unticked; this round closes it |

**What this round explicitly does NOT execute (and why):**

| Item | Plan ref | Reason |
|---|---|---|
| B17 BrowserRouter + drop `vite-plugin-singlefile` | Phase 4.1–4.2 | Unchanged from Round 16: sacred "deploy anywhere" ADR-003/004; docs require **explicit user confirmation** which has not been given. Live site is (still) a HashRouter static host. |
| B19–B22 React Query / optimistic UI / notification polling | Phase 4.3–4.6, 4.10 | Unchanged from Round 16: the live backend is **still unreachable** (re-verified 2026-08-23 — 0/4 API probes OK). Wiring feeds to the API as primary source without a working origin would break the deterministic demo. The Hybrid Data Strategy (§4.4) remains the documented target for a future round. |
| Sentry + source maps | Phase 5.4–5.5 | Deferred indefinitely per operator decision (Round 15 F6 annotation). |
| Git history rewrite of leaked `.env` | R9.1 | Rotation remains the primary remediation; force-push out of scope. |
| Operator-side live cutover | LIVE-CRIT-2/3/4 | In-repo fixes (unified Fastify origin via `STATIC_DIR`, `_headers`) landed in Rounds 15–16; the live host must be repointed by the operator. Docs updated with the new symptoms. |

---

## 1. Validation: docs vs codebase (pre-remediation)

Validated 2026-08-23 against clone of `main` @ `864c9f7`.

### 1.1 Alignment scorecard

| Workstream | Result |
|---|---|
| `npm install` + `npm test` | PASS — **485 vitest** (web 281 + server 103 + shared 70 + db 31), all green on Node 24.18 |
| `npm run lint` / `npm run typecheck` | PASS — 0 errors, 0 warnings; all 4 workspaces clean |
| Local E2E (`npm run test:e2e`) | PASS — 18 passed (9 smoke + 9 auth), 16 live_extended self-skipped (no `LIVE_BASE_URL`) |
| Gates: `test:plan-alignment`, `test:no-secrets`, `test:gitignore`, `test:ci-config`, `test:prod-readiness:test` (14), `test:build` | ALL PASS |
| Production build | PASS — `dist/index.html` 539,190 bytes (526.6 KiB); no Vite dev modules |
| Version claims (React 19.2.6, Vite 7.3.2, Fastify 5.11.3, Drizzle 0.36.4, jose 5.10.0, argon2 0.41.1, Zod 3.25.76, Playwright 1.62.1) | PASS — all match package manifests |
| Headline test counts in docs (485 / 281 / 103 / 70 / 31; 18 local E2E; 14 node --test) | PASS — exact |
| `skills/` tracking | **14,018 files tracked** (commit `40f3690` "add new skills" added more after Round 16's 13,926 count) — docs say 13,926/13,896 → stale counts |
| worklog.md | **MISSING Round 16 entry** (last entry is Round 15) |

### 1.2 Stale doc claims to fix (verified against code)

**AGENTS.md**
- L540–541 "Not yet wired into any page" (Round 5 API client section) — wired since Round 6.
- L551 "the 32 unit tests" / L559 "(32 total)" / L582 "all 22 pre-Round-6 api tests" — `api.test.ts` now has **39** tests.
- L556 `baseUrl` "defaults to … http://localhost:4000" — since Round 16 the **production default is same-origin** (`resolveApiBaseUrl`).
- L636 + L643 "`state.from` … not yet implemented in LoginPage — deferred to a future round" — implemented in Round 15 F1.
- L648–650 Docker "builds a production image for `@embers/server` only. The client SPA is not containerised" — since Round 16 the Dockerfile copies `apps/web/dist` and sets `STATIC_DIR`.
- L226 "16 rounds" vs CLAUDE.md L146 "13 rounds" (Round 14 banner) — reconcile to 13-at-the-time wording; L228/CLAUDE L147 "~800 lines" SKILL.md → 1,195+ lines.

**CLAUDE.md**
- L146/L147 Round 14 banner counts (see above).
- L798–804 Live Deployment known-gaps table — symptoms now changed (see §2).
- Test-count breakdown L441 "incl. 23 in `src/lib/api.test.ts` from Round 5" — the file now holds 39 (23 + 9 R6 + 3 R15 + 4 R16).

**README.md**
- Test Status table L287: "E2E — live audit, Round 8 (opt-in) | 12 | `LIVE_BASE_URL=… npm run test:e2e:live`" — that command runs **28 tests** (12 `live.spec.ts` + 16 `live_extended.spec.ts`, both matched by `playwright.live.config.ts`'s `testMatch: /live.*\.spec\.ts/`). Same for L590 "Opt-in live audit (12 tests, ~30s)".
- L496 "SKILL.md (21 sections, ~800 lines)" → 22 sections / 1,195+ lines; L500 "10 lessons" → 13 lessons.
- L339–345 Known-gaps table + L567–570 Round 16 section describe the **pre-redeploy** symptoms (Python 404 HTML / 501 POST / "Failed to fetch") — re-audit 2026-08-23 shows SPA-fallback 200 HTML / 404 empty POST / "HTTP 404" message.
- Bundle size claims "537 KB" / "537,956 bytes" (L158, L341, L603) → current build is **539,190 bytes (526.6 KiB)**.

**reddit-clone_SKILL.md**
- L7/L20/L599 "15 rounds" → 16 (17 after this round); L565 Lesson 3 "271 web tests" → 281; L614 Lesson 13 says Round 8 added `live_extended.spec.ts` (it was Round 10); L91 "5 config variants (local/live/repro/local-prod)" → 4 config files; L442 "13,896 files" vs README 13,926 vs actual 14,018; L13/L716 "8 CI gates" vs the 9 commands listed in §11.1.

**docs/Project-Architecture-Document.md (PAD)**
- L633 §8.2 API base URL "defaults to `http://localhost:4000`" — stale since Round 16 (same-origin in PROD).
- L635 §8.2 env-var list omits `STATIC_DIR`.
- §8.1/§8.4 (L621–655) deployment story omits Docker + `start_production.sh` unified-origin serving + `apps/web/public/_headers`.
- L101 ADR-005 consequence "No `version`/`migrate`" contradicts L411/L730 and the code (`schemaVersion: 1` + custom `merge`/`migrate` exist in `store.ts`).
- L794 `api.test.ts` 32 → 39; L800 LoginPage 10 → 13; L802 RegisterPage 11 → 12; L804 Navbar 8 → 9.
- §13.3 heading L896 "(95 tests)" → 103; L900 config 8 → 9; L906 hardening 7 → 8; missing `routes/static.test.ts` (6 tests) row.
- L976 B1 "61 schema tests" → 70; L912–913 "zod-validator plugin" mechanism claim — no such plugin exists (routes call `Schema.safeParse()` manually).
- §13 not listed in the Table of Contents.

### 1.3 `docs/REMEDIATION_PLAN.md` remaining checkboxes (re-validated)

Still open and **correctly** open: 4.1/4.2 (B17), 4.3–4.6/4.10 (B19–B22), 5.4/5.5 (Sentry, deferred indefinitely), 5.8 (OWASP+WCAG — **executed this round**, ticked with evidence).

---

## 2. Live-site audit (2026-08-23)

### 2.1 Probe results

| Probe | Result (2026-08-23) | Round 16 result (2026-08-19) | Classification |
|---|---|---|---|
| `GET /` | **200** `text/html`, 539,190 bytes, no Vite dev modules, inline favicon present | 200, 537,956 bytes | LIVE-CRIT-1 still **FIXED**; bundle now matches current `main` build exactly |
| `GET /health`, `/api/posts`, `/api/communities`, `/api/search` | **200 `text/html`** — the SPA shell (SPA-fallback static host) | 404 Python HTML | LIVE-CRIT-2 **still broken**, symptom changed |
| `POST /api/auth/login` | **404**, empty body, no content-type | 501 "Unsupported method ('POST')" | LIVE-CRIT-4 **still broken**, symptom changed |
| Security headers (CSP, HSTS, XCTO, XFO, Referrer-Policy) | **all 5 absent** | all 5 absent | LIVE-CRIT-3 **still broken** |
| `GET /favicon.ico` | 404 — but the SPA has an **inline data-URI favicon** (`<link rel="icon">` present, verified in DOM) | 404 (LIVE-MED-1) | Mitigated client-side in R15/16; direct `/favicon.ico` requests still 404 (cosmetic) |
| Login form (browser) | POSTs to `https://reddit.jesspete.shop/api/auth/login` → 404 → alert shows **"HTTP 404"** | POSTed to `localhost:4000` → "Failed to fetch" | **R16 client fix confirmed deployed**; new UX bug = R17-F1 |
| Live Playwright (`test:e2e:live`) | **27 passed, 1 skipped** (comment composer needs backend) | 27 passed, 1 skipped | No client regression |
| Console errors on load | 0 | 0 | OK |

**Root cause (unchanged from Round 16):** the public origin is a static file host (now with SPA fallback), not the Fastify backend. The in-repo remediation (unified origin via `STATIC_DIR`, `start_production.sh`, Docker) is complete; the cutover is operator-side.

### 2.2 Environmental note (test-infra)

The first live-E2E run in this environment produced 11 spurious failures caused by a broken cached `chromium_headless_shell-1234` (V8 snapshot load failure + GPU process crashes). Re-running with `PLAYWRIGHT_CHROMIUM_USE_HEADLESS_NEW=1` (full Chromium binary) produced a clean 27/28. Recorded here so future auditors in this sandbox do not misclassify browser crashes as site bugs.

### 2.3 New UX bug detail (R17-F1)

`apps/web/src/lib/api.ts` error paths:

```ts
const message = errorBody.error?.message ?? `HTTP ${res.status}`;   // L406, L457
const retryMessage = retryErrorBody.error?.message ?? `HTTP ${retryRes.status}`;  // L442
```

When the origin is not the API (static host SPA-fallback returns HTML 200s for GETs and empty 404s for POSTs), `parseErrorBody` returns `{}` and the user sees raw `"HTTP 404"`. Round 15 F2 fixed the analogous network-failure case with `NETWORK_ERROR_MESSAGE` ("Could not reach the embers server. Please try again later."). This round applies the same treatment to unparseable/message-less error bodies.

---

## 3. Plan-item 5.8 execution — OWASP Top 10 + WCAG 2.2 AA audit

### 3.1 OWASP Top 10 (code-level review of client + server)

| Area | Evidence | Verdict |
|---|---|---|
| Injection (SQLi) | Drizzle parameterized queries exclusively; no raw SQL concatenation (`rg` across `apps/server/src` — none) | PASS |
| Broken Auth | Argon2id (`password.ts`), JWT HS256 via `jose`, refresh rotation + `sessions` revocation, rate limit 5/min on `/api/auth/*` (`hardening.test.ts` asserts 429) | PASS |
| XSS | No `dangerouslySetInnerHTML`/`innerHTML` anywhere in `apps/web/src` (rg verified); React auto-escaping; Helmet CSP (when Fastify is origin) | PASS (client code) — live CSP header still missing (LIVE-CRIT-3, operator-side) |
| CSRF | Bearer tokens for state-changing calls; refresh cookie `SameSite=Strict`, `Path=/api/auth`, `HttpOnly` | PASS |
| SSRF | No user-supplied URLs fetched by the backend (rg verified) | PASS |
| Secrets | `test:no-secrets` + `test:gitignore` + gitleaks CI job all green; access token held in `useRef` memory, never `localStorage` (rg verified — only `reddit-clone-state` theme/UI key persists) | PASS |
| Misconfig | Helmet (CSP/HSTS/XCTO/XFO/Referrer-Policy) registered and tested in `hardening.test.ts` — header absence on live is the hosting gap, not missing code | PASS (code) / OPEN (live) |

### 3.2 Dependency health

Root + workspace manifests use pinned-compatible ranges; no known critical advisories for the locked versions (React 19.2.6, Fastify 5.11.3, better-sqlite3 13.0.3, jose 5.10.0, argon2 0.41.1). `allowScripts` allowlist is minimal and current.

### 3.3 WCAG 2.2 AA (browser-verified on live, 2026-08-23)

Executed via `e2e/live_a11y_r17.spec.ts` (kept as a permanent opt-in spec):

| Check | Result |
|---|---|
| Skip-to-content link is the first tab stop | PASS |
| Logical tab order (brand → search → create → theme → auth links → nav) | PASS — 12 stops recorded, none stuck on body |
| Visible focus affordance on focused element | PASS |
| All images have `alt` (WCAG 1.1.1) | PASS — 5/5 |
| Heading hierarchy present, starts at H1 (WCAG 1.3.1) | PASS — 11 headings |
| Login form keyboard-operable (focus + type without mouse) | PASS |
| `role="alert"` error regions (LoginPage L124, RegisterPage L183) | PASS (existing tests) |
| `target="_blank"` links carry `rel="noreferrer noopener"` (PostPage L129) | PASS |

**5.8 verdict: PASS on audited surfaces.** No OWASP or WCAG findings requiring code changes this round beyond R17-F1 (which is a UX/error-message quality issue surfaced by the live audit, not an OWASP/WCAG violation).

---

## 4. Architecture decisions (this round)

1. **Error-message fallback is a client concern.** The server's structured `{ error: { code, message } }` envelope always wins when present. Only when the body is unparseable or message-less does the new friendly fallback apply. Status + code values are unchanged (no API contract change).
2. **One shared fallback constant** (`UNEXPECTED_RESPONSE_MESSAGE`), mirroring the `NETWORK_ERROR_MESSAGE` pattern, used at all three construction sites (standard path, 401-refresh-fail path, retry-fail path). The HTTP status stays visible for diagnostics inside the message text.
3. **The a11y spec follows the `live.spec.ts` opt-in convention** (`describeLive` guard on `LIVE_BASE_URL`, matched by `playwright.live.config.ts`'s `/live.*\.spec\.ts/`), so the default `npm run test:e2e` gate is unaffected.
4. **The ad-hoc probe spec is deleted** after findings are recorded here — its assertions duplicate `live.spec.ts`'s backend probes; characterization output lives in this document.
5. **Docs describe the new live symptoms** (SPA-fallback 200/404-empty instead of Python 404/501) while keeping the LIVE-CRIT IDs stable — the IDs track the *gap* (backend unreachable / headers missing / POST unsupported), not the specific symptom text.

---

## 5. Detailed ToDo (TDD)

### Phase A — Client fix (R17-F1)

- [x] **A1.** RED (3 new tests in `apps/web/src/lib/api.test.ts`):
  - non-2xx with non-JSON body (static-host 404 shape) → `ApiError` message is the friendly fallback, **not** `"HTTP 404"`; `status` preserved; code `INTERNAL`.
  - non-2xx with JSON body but no `error.message` → friendly fallback (not `"HTTP 503"`).
  - 401-refresh-fail path with non-JSON original body → friendly fallback propagates.
- [x] **A2.** RED (1 new test): refresh-retry path — retry returns non-2xx non-JSON → friendly fallback.
- [x] **A3.** Update the two existing tests that lock in the old `HTTP <status>` behavior (L365, L374) to the new contract (deliberate behavior change, documented in-test).
- [x] **A4.** GREEN: add exported `unexpectedResponseMessage(status)` helper + use it at the three fallback sites in `api.ts` (executed: 5 new tests — R17-F1a/b/c/d/e — web suite 281 → 286).
- [x] **A5.** Verify: full `npm test --workspace @embers/web` green (286 web tests expected).

### Phase B — Live a11y spec (R17-F2)

- [x] **B1.** Add the `describeLive` opt-in guard to `e2e/live_a11y_r17.spec.ts` (mirrors `live_extended.spec.ts`).
- [x] **B2.** Delete `e2e/live_probe_r17.spec.ts` (characterization probe — findings recorded in §2).
- [x] **B3.** Verify: `npm run test:e2e` still 18 passed / now 19 skipped (a11y spec self-skips without `LIVE_BASE_URL`); live run = 30 passed, 1 skipped.

### Phase C — Worklog backfill (R17-F3)

- [x] **C1.** Append the missing Round 16 entry to `worklog.md` (template-conformant, summarizing commits `c57ab6f`…`864c9f7`).

### Phase D — Documentation reconciliation (R17-F4/F5)

- [x] **D1.** `AGENTS.md`: fix L540–541, L551/559/582 (39 api tests), L556 (same-origin default), L636/643 (state.from shipped), L648–650 (Docker SPA), L226/228 (Round-14 banner counts) + Round 17 banner.
- [x] **D2.** `CLAUDE.md`: fix L146/147 banner counts, L441 breakdown, live-deployment table symptoms + Round 17 banner.
- [x] **D3.** `README.md`: Test Status table (live-audit row 12 → 28, add a11y row 3), L590 (28 tests), L496/500 (SKILL stats), known-gaps table + Round 16 section re-audit note, bundle size 539,190 B, Round 17 subsection.
- [x] **D4.** `reddit-clone_SKILL.md`: "16 rounds" → 17, L565 281 web tests, L614 Round 10 attribution, L91 4 configs, skills/ 14,018 files, "9 CI gates" consistency, round-history row 17, frontmatter bump (version 1.2.0).
- [x] **D5.** `docs/Project-Architecture-Document.md`: §8.2 same-origin + `STATIC_DIR`, §8 deployment story (Docker/start_production.sh), ADR-005 L101 fix, per-file test counts, §13.3 (103 tests + static.test.ts row), L976 (70), L912 (remove zod-validator claim), ToC + §13, Last Updated line.
- [x] **D6.** `docs/REMEDIATION_PLAN.md`: tick 5.8 with audit-evidence note; add Round 17 annotation to the live-gap context.
- [x] **D7.** `worklog.md`: append Round 17 entry.

### Phase E — Verification ledger (R17-F6)

- [x] **E1.** `npm run lint` — 0 errors / 0 warnings. ✅ Verified 2026-08-23.
- [x] **E2.** `npm run typecheck` — all 4 workspaces clean. ✅ Verified.
- [x] **E3.** `npm test` — 490 vitest (web 286 + server 103 + shared 70 + db 31). ✅ Verified.
- [x] **E4.** `npm run test:e2e` — 18 passed, 19 self-skipped (16 live_extended + 3 a11y). ✅ Verified.
- [x] **E5.** Gates: plan-alignment PASS, no-secrets PASS, gitignore PASS, ci-config PASS, test:build PASS (526.6 KiB), prod-readiness:test 14/14. ✅ Verified.
- [x] **E6.** Live: 30 passed, 1 skipped (with `PLAYWRIGHT_CHROMIUM_USE_HEADLESS_NEW=1` in this sandbox). ✅ Verified.
- [x] **E7.** Commit (main only) + push via the SSH wrapper. ✅ Done — see worklog.md Round 17 entry.

---

## 6. Risk register

| Risk | Impact | Mitigation |
|---|---|---|
| Changing the fallback message breaks callers that string-match `"HTTP <status>"` | Low | rg sweep for `HTTP ` consumers; only tests match it today (updated in A3); UI renders the message verbatim |
| Friendly fallback masks real server errors | Medium | Server's structured message ALWAYS wins; fallback only fires when no message exists; status/code fields unchanged for programmatic handling |
| a11y spec flakiness on live (third-party host) | Low | Opt-in only, generous timeouts, no strict visual assertions |
| Doc edits introduce new drift (counts go stale as soon as tests are added) | Medium | Counts updated to post-Round-17 expected values and verified in Phase E before commit |
| Browser crashes in sandbox misread as site bugs | Low | Documented in §2.2; use `PLAYWRIGHT_CHROMIUM_USE_HEADLESS_NEW=1` |

---

## 7. Definition of Done

1. Every Phase A–E checkbox is either done or explicitly deferred with a reason.
2. TDD: A1/A2 tests fail before A4 lands (RED→GREEN verified in the transcript).
3. All gates in Phase E pass and are recorded in `worklog.md` (Round 17 entry).
4. No secrets committed; no `dist/` tracked; no new dependencies.
5. Docs match the remediated tree (test counts, commands, live status as of 2026-08-23).
6. Commits on `main` only; push via `skills/how-to-git-push-using-ssh-wrapper/scripts/ssh_git_wrapper_v3.py` with `docs/ssh-key.txt`.
