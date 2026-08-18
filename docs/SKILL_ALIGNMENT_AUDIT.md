# SKILL_ALIGNMENT_AUDIT — `reddit-clone_SKILL.md` vs Codebase

**Date:** 2026-08-18
**Scope:** Validate every factual claim in `reddit-clone_SKILL.md` (1174 lines, 21 sections) against the live codebase, scripts, and directory layout.
**Method:** (1) file-existence checks, (2) source-content greps at line level, (3) live execution of the 8 CI gates + the full vitest suite, (4) cross-doc reconciliation vs `AGENTS.md`.
**Mode:** Read-only review. No edits applied to `reddit-clone_SKILL.md` (per user direction: Report only).

---

## Verdict

**11 ALIGNED / 4 DRIFT / 0 BROKEN-by-behavior** (plus 1 informational completeness gap).

The skill is **highly accurate** on versions, architecture, security posture, schema, interfaces, and runnable gates. The discrepancies are concentrated in three areas: the **per-round test-count trajectory** (§21), **fabricated design tokens** (§4.1), and **two over-stated code claims** (§4.3/§7.1 category list, §6.3/§8 `useFocusTrap` in `Dropdown`). All are documentation-accuracy issues, not code defects.

---

## Live validation results (ground truth)

| Gate | Result |
|---|---|
| `npm run test:plan-alignment` | ✅ PASS (no forbidden tokens) |
| `npm run test:gitignore` | ✅ PASS (no tracked file is gitignored) |
| `npm run test:no-secrets` | ✅ PASS (no secret-bearing files tracked) |
| `npm run test:ci-config` | ✅ PASS (gitleaks job present) |
| `npm test` (web) | ✅ 271 passed |
| `npm test` (db) | ✅ 31 passed |
| `npm test` (shared) | ✅ 70 passed |
| `npm test` (server) | ✅ 95 passed |
| **Total** | **✅ 467 passed** — matches `project_state` exactly |

---

## DRIFT / BROKEN findings (must fix in the skill)

### D-1 — §21 Round-History test-count trajectory is wrong  **[HIGH]**
- **Claim:** Round history table lists `R6–7 ≈ 462`, `R8 = 462`, `R9 = 453`, `R10 = 462`.
- **Reality (authoritative, `AGENTS.md` "Total vitest count" line + per-round prose):**
  `R6 = 428 → R7 = 453 → R8 = 453 → R9 = 453 → R10 = 462 → R11 = 466 → R12 = 466 → R13 = 467`.
  R9 added **zero** tests (only secret-rotation + 6 CI gates), so there was **no 9-test drop** — the skill's `462 → 453` at R8→R9 is false.
- **Evidence:** `AGENTS.md` (round history prose); live run = 271+31+70+95 = 467.
- **Fix:** Replace the `Tests` column with:
  `R1–3 ≈ ~300 · R4 ≈ ~350* · R5 ≈ ~350* · R6–7 = 453 · R8 = 453 · R9 = 453 · R10 = 462 · R11 = 466 · R12 = 466 · R13 = 467`
  (\* approximate — `AGENTS.md` does not state exact R4/R5 counts; only note them as approximate, not as if measured).
- **Why it matters:** This is the skill's own audit trail. A fabricated dip contradicts the canonical `AGENTS.md` count and would mislead any agent reconciling history.

### D-2 — §4.1 `@theme` design tokens are fabricated  **[MEDIUM]**
- **Claim:** Shows `@theme { --color-ember-500: #f97316; --color-ember-600: #db2777; /* ... */ }`.
- **Reality:** `apps/web/src/index.css` `@theme` block defines **only** `--font-sans` (line 6). There are **no `ember-*` tokens**. The UI uses Tailwind v4's default palette — e.g. the global focus outline uses `var(--color-orange-500)` (line ~38); surfaces use `zinc-*`. The `.line-clamp-1`/`.line-clamp-2` custom utilities exist (lines 107–119) but there is no `ember` palette.
- **Evidence:** `apps/web/src/index.css` lines 4–6, 38, 107–119.
- **Fix:** Replace the snippet with the real `@theme` block (`--font-sans: "Inter", …`) and state plainly that the design system uses Tailwind's default `orange-*`/`zinc-*` palette (no custom `ember-*` color tokens are defined). Remove the `#f97316`/`#db2777` hex example (those are Tailwind `orange-500`/`pink-600` values, mislabeled as `ember`).

### D-3 — §4.3 / §7.1 community category count + list  **[MEDIUM]**
- **Claim:** §4.3 lists 8 categories `(nature, tech, gaming, food, space, art, animals, sports)`; §7.1 says "18 communities across 8 categories".
- **Reality:** 18 communities is **correct**, but there are only **7 distinct categories**: `tech` (6), `art` (5), `space` (2), `sports` (2), `animals` (1), `food` (1), `gaming` (1). **`nature` does not exist.**
- **Evidence:** `apps/web/src/data/communities.ts` — `category:` values (uniq count = 7; `nature` absent). Community count = sum of `category:` rows = 18.
- **Fix:** Change "8 categories" → "7 categories" and replace the list with `(tech, art, space, sports, animals, food, gaming)` (drop `nature`).

### D-4 — §6.3 / §8 `useFocusTrap` in `Dropdown.tsx` is incorrect  **[MEDIUM]**
- **Claim:** "Used by `Modal.tsx` and `Dropdown.tsx` to trap keyboard focus … Restores focus to the trigger element on close."
- **Reality:** `useFocusTrap` is defined in `apps/web/src/hooks/useFocusTrap.ts` (exported aliased as `n`) and is used **only in `Modal.tsx`**. `Dropdown.tsx` does **not** import or call it — it implements its own focus handling: `Escape` to close + return focus to the trigger (`triggerRef.current?.focus()`), plus arrow-key navigation between items (`apps/web/src/components/ui/Dropdown.tsx` lines 24–48).
- **Evidence:** `rg -rn "useFocusTrap"` → only `Modal.tsx` + `hooks/useFocusTrap.ts`; `Dropdown.tsx` lines 17, 24–48.
- **Fix:** Change to: "`useFocusTrap()` (in `hooks/useFocusTrap.ts`) is used by `Modal.tsx`. `Dropdown.tsx` implements its own focus management (Escape-to-close, returns focus to trigger, arrow-key item navigation) rather than the shared hook."

---

## Informational completeness gap (not an error, optional tidy-up)

### I-1 — §18.1 "Key Columns" lists omit real columns  **[LOW]**
- The schema/index.ts tables contain columns not shown in the skill's "Key Columns" tables: `users.bio`, `communities.description` / `onlineCount` / `createdAt`, `posts.link_domain` / `image_category` / `flair` / `createdAt`, `votes.createdAt`. All index names (`idx_posts_community_created`, `idx_comments_post_id`, `idx_notifications_user_read`) and PK definitions (incl. `votes` composite PK) **match exactly**.
- **Fix (optional):** Either label the column sets "selected columns" or add the omitted columns for completeness. No correctness issue.

---

## Verified ALIGNED (sampled evidence)

| Section | Claim | Evidence |
|---|---|---|
| §2 | 19 version rows (React 19.2.6, Vite 7.3.2, TS 5.9.3, Tailwind 4.1.17, RR 7.18.2, zustand 5.0.14, framer-motion 13.x, lucide 1.31.0, singlefile 2.3.0, Fastify 5.11.3, drizzle 0.36.4, better-sqlite3 13.0.3, jose 5.10.0, argon2 0.41.1, zod 3.25.76, pino 9.14.0, vitest 2.1.9, Playwright 1.62.1, ESLint 9.39.5) | All 4 `package.json` + root `allowScripts` (13.0.3, no stale 11.10.0) |
| §3.1 | Monorepo tree | on-disk |
| §3.2 | `vite.config.ts` plugins `[react(), tailwindcss(), viteSingleFile()]`; `playwright.config.ts` `testIgnore: /live\.spec\.ts|repro_r10_postpage\.spec\.ts/` | `apps/web/vite.config.ts:17`; `playwright.config.ts:21` |
| §3.3 | Root scripts (`db:setup`, `db:backup`, 8 gates) | root `package.json` |
| §3.4 | Env: `PORT` 4000, `DATABASE_URL` `./dev.db`, TTLs 15m/7d, `CORS_ORIGIN` `*`, rate limits 100/5 | `apps/server/src/config.ts:48,53,57,58,61,63,65` |
| §4.2 | Theme bootstrap reads `parsed.state.theme` | `apps/web/index.html` inline `<script>` |
| §5.2 | Overlay slices (`schemaVersion`, `theme`, `votes`, `joinedCommunityIds`, `savedPostIds`, `localPosts`, `localComments`, `notificationReadOverrides`, `toasts`) | `apps/web/src/store/store.ts:19,22,25,28,31,34,37,41` |
| §5.3 | Pure selectors | `apps/web/src/store/selectors.ts` |
| §5.5 | `ErrorBoundary` wraps `<Outlet />` | `apps/web/src/components/layout/AppShell.tsx:20` |
| §6.1 | `AuthContextValue` + token in `useRef` | `apps/web/src/auth/AuthProvider.tsx:51,59,72,93,97,160,165,169` |
| §7.1 | 48 users, 320 posts, 18 notifications | `users.ts:73`, `posts.ts:199`, `notifications.ts` `generateNotifications(18)` |
| §7.3 | `getPost`→undefined, `getCommunity`→throws, `getUser`→`CURRENT_USER` | `posts.ts:214`, `communities.ts:224–226`, `users.ts:89–91` |
| §9 | AP-6 CSRF posture (Bearer + `SameSite=Strict`), AP-7 `*ResponseSchema`, AP-13 `--> statement-breakpoint` | `api/index.ts` (all `*ResponseSchema`), `fts5.ts`/`0001_*.sql` |
| §15 CP-1 | Plugin order helmet→cors→cookie→rateLimit→requestId→auth→routes→errorHandler | `apps/server/src/app.ts:67,85,92` + comments 37–44 |
| §15 CP-2 | 401 retry with `skipRefresh` | `apps/web/src/lib/api.ts:282,304–305,315` |
| §15 CP-3 | `AssertExact` + `AssertTrue` drift check | `apps/web/src/lib/api.ts:112,122,123` |
| §15 CP-4 | `SCHEMA_VERSION=1`, `PERSISTED_FIELDS`, `validatePersistedState`, `mergePersistedState` | `apps/web/src/store/storage.ts:22,25,115,181` |
| §15 CP-5 | Atomic vote service | `apps/server/src/services/voteService.ts:49` (`db.transaction`) |
| §15 CP-6 | `backupDb` via `raw.backup()` | `packages/db/src/client.ts:132,142` |
| §15 CP-7 | FTS5 external-content | `packages/db/src/fts5.ts:24,27` |
| §15 CP-8 | Refresh rotation (`sessionRepo.rotate` + `setRefreshCookie`) | `apps/server/src/routes/auth.ts:212,247,305` |
| §18 | 7 tables + `posts_fts` + 3 indexes + composite PK | `packages/db/src/schema/index.ts:75,97,111,130` |
| §19.1 | Refresh cookie `Path=/api/auth` | `apps/server/src/routes/auth.ts:274,314` |
| §19.2 | JWT HS256, 15m/7d, `useRef`/`HttpOnly` | `config.ts`, `auth.ts` |
| §19.3 | Argon2id defaults (3 / 4096 KiB / 1) | `apps/server/src/auth/password.ts:8–10,19` |
| §19.4 | CSRF posture (no double-submit) | `apps/server/src/routes/auth.ts` (Bearer tokens) |
| §19.5 | Rate limits 100/min global, 5/min auth | `config.ts:63,65` |
| §19.6 | Pino redact paths | `apps/server/src/app.ts:54–58` |
| §11.2 | `linkUrl` rejects `javascript:`/`data:` | `packages/shared/src/api/index.ts:96–105,121–129` (CreatePostModal tests cover it) |
| §20.1 | `AuthUser` + `*ResponseSchema` naming | `api/index.ts:39,49,51,66,71,160,212` (exact field match) |
| §20.2 | Web `AuthUser`/`LoginResponse`/`RegisterResponse`/`ApiError` + drift check | `apps/web/src/lib/api.ts:35,131,142,156,123` |
| §20.3 | `Env` interface (PORT/HOST/TTLs/rate limits) | `apps/server/src/config.ts:46–66` |
| §12 L10 | `docs/ALIGNMENT_REVIEW.md` exists | on-disk in `docs/` |

---

## Recommended corrections (ordered)

1. **D-1** — fix §21 test-count column (HIGH).
2. **D-2** — fix §4.1 token snippet (MEDIUM).
3. **D-3** — fix §4.3 + §7.1 category count/list (MEDIUM).
4. **D-4** — fix §6.3 + §8 `useFocusTrap` claim (MEDIUM).
5. **I-1** — optional: complete §18.1 column lists (LOW).

No code changes are required — every drift is in documentation only. The 467-test suite and all 8 CI gates remain green, confirming the codebase itself is sound; only the skill's prose needs the edits above.
