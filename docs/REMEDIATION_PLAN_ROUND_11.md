# Round 11 Remediation Plan — Audit-Driven Doc + Schema Reconciliation

> **Round 11 (2026-08-12):** This plan executes the validated findings of
> `docs/session_11.md` (a Mode-C audit of `docs/REMEDIATION_PLAN.md` against
> the codebase) and the two prior audits (`docs/audit_report_1.md`,
> `docs/audit_report_2.md`). All findings have been re-validated against the
> codebase at HEAD (`f473db9`) before this plan was written. Findings F1, F4,
> F5, F6, F7, F8, F9 are documentation-only; F2 and F3 require code changes
> and will be executed with strict TDD (RED → GREEN → REFACTOR) per the
> `tdd-workflow` skill.
>
> Skills referenced (from `skills/skills-catalog.md`):
>   - `planning-and-task-breakdown` — structured this ToDo list
>   - `tdd-workflow` — RED-GREEN-REFACTOR cycle for code changes
>   - `code-review-checklist` — 12-category scan applied during validation
>   - `how-to-git-push-using-ssh-wrapper` — used for the final `git push`

---

## 1. Consolidated Findings — Root Cause → Optimal Fix

Each finding was reproduced against the codebase before being added here.
Confidence levels follow the audit contract: Verified / Reasoned / Assumed.

### F1 — CSRF "Double-submit cookie pattern" claimed but NOT implemented
- **Source:** `docs/session_11.md` H-1; `docs/REMEDIATION_PLAN.md` §5.2 line 216
- **Root cause:** The plan documents a security control that does not exist in
  `apps/server/` or `apps/web/`. Repo-wide grep for `csrf|double-submit|xsrf`
  returns matches only in two doc files.
- **Actual posture:** State-changing API calls use `Authorization: Bearer`
  (not cookies), so CSRF risk is low. The refresh cookie IS `SameSite=Strict`
  (`apps/server/src/routes/auth.ts:313`).
- **Optimal fix:** Update plan §5.2 to describe the actual mitigation
  (Bearer tokens + SameSite=Strict cookie) instead of the fabricated
  double-submit claim. Implementing a real CSRF system would add complexity
  for no marginal benefit given the Bearer-token architecture.
- **Confidence:** Verified
- **Type:** Doc-only

### F2 — DB performance indexes claimed in §4.1 are absent from the migration
- **Source:** `docs/session_11.md` M-1; `docs/REMEDIATION_PLAN.md` §4.1 lines 181–186
- **Root cause:** The initial migration `0000_greedy_major_mapleleaf.sql`
  declares only two UNIQUE indexes (`communities_slug_unique`,
  `users_username_unique`). The four performance indexes the plan commits to
  — `posts(community_id, created_at DESC)`, `comments(post_id)`,
  `notifications(user_id, read_at)`, `sessions(jti)` — were never created.
  (Sessions PK on `jti` is auto-indexed, so only three need to be added.)
  Additionally, the plan says `recipient_id` but the actual column is
  `user_id`.
- **Optimal fix:** Add migration `0001_add_performance_indexes.sql` with
  three CREATE INDEX statements; mirror them in
  `packages/db/src/schema/index.ts` so `drizzle-kit generate` stays in sync;
  add a regression test asserting the indexes exist after `openDb()`.
- **Confidence:** Verified
- **Type:** Code (TDD)

### F3 — `registerResponseSchema` does not exist; schema naming is inconsistent
- **Source:** `docs/session_11.md` M-2
- **Root cause:** `packages/shared/src/api/index.ts` exports
  `loginOutputSchema` and `refreshTokenOutputSchema` (using the `*OutputSchema`
  convention) but there is no `registerResponseSchema` / `registerOutputSchema`
  at all. The `RegisterResponse` type lives only in
  `apps/web/src/lib/api.ts:124-126` as a hand-written interface, breaking the
  "single source of truth in `@embers/shared`" property claimed by the plan.
- **Optimal fix:** Add `registerResponseSchema` to
  `packages/shared/src/api/index.ts` as the canonical Zod schema for the
  register response (`{ user: authUserSchema }`), export it from
  `@embers/shared`, add a test asserting it accepts a valid 201 response
  body and rejects malformed payloads. Keep the existing `*OutputSchema`
  naming convention (no churn to existing callers); just add the missing
  register schema.
- **Confidence:** Verified
- **Type:** Code (TDD)

### F4 — Refresh cookie `Path=` drift in plan §5.1
- **Source:** `docs/session_11.md` L-1; `docs/REMEDIATION_PLAN.md` §5.1 line 207
- **Root cause:** Plan says `Path=/api/auth/refresh`, code uses
  `path: "/api/auth"` (`apps/server/src/routes/auth.ts:314`). The code is
  correct — the broader path is needed so `/api/auth/logout` can also read
  the cookie.
- **Optimal fix:** Update plan §5.1 to `Path=/api/auth`.
- **Confidence:** Verified
- **Type:** Doc-only

### F5 — ID-generation strategy divergence across plan / schema comment / runtime
- **Source:** `docs/session_11.md` L-2
- **Root cause:** Three sources disagree:
  1. Plan §4.1 line 175: "branded string IDs … seeded as `u1`, `p1` in dev"
  2. `packages/db/src/schema/index.ts:8` comment: "UUIDs are generated
     application-side via `crypto.randomUUID()`"
  3. Runtime: `u-${randomUUID()}` (`auth.ts:96`), `p-${randomUUID()}` (`posts.ts:90`)
- **Optimal fix:** Pick one canonical description: IDs are TEXT; runtime
  uses `<prefix>-<uuid>` (e.g. `u-<uuid>`, `p-<uuid>`); seed script uses
  short readable IDs (`u1`, `p1`). Branded TS types provide compile-time
  nominal-typing only. Update plan §4.1 + schema comment to match.
- **Confidence:** Verified
- **Type:** Doc-only

### F6 — Postgres escape hatch §5.3 omits FTS5 → tsvector rewrite step
- **Source:** `docs/session_11.md` L-3
- **Root cause:** Plan §5.3 lists a 3-step SQLite → Postgres swap but
  doesn't address that `packages/db/src/fts5.ts` and the `searchPosts`
  call site use SQLite FTS5 syntax (`CREATE VIRTUAL TABLE … USING fts5`,
  `MATCH`, `bm25()`), which Postgres does not support.
- **Optimal fix:** Add a 4th step to §5.3: rewrite `fts5.ts` +
  `apps/server/src/routes/search.ts` to use Postgres `tsvector`/`tsquery`/
  `ts_rank`.
- **Confidence:** Reasoned
- **Type:** Doc-only

### F7 — `session_10.md` route-count breakdown is internally inconsistent
- **Source:** `docs/session_11.md` I-1; `docs/session_10.md` line 34
- **Root cause:** Says "auth × 5" but there are only 4 auth routes
  (register/login/refresh/logout). 1 + 4 + 5 + 2 + 1 + 2 + 1 + 1 = 17 ✓
  but the row says "auth × 5" implying 18.
- **Optimal fix:** Change "auth × 5" → "auth × 4".
- **Confidence:** Verified
- **Type:** Doc-only

### F8 — `REMEDIATION_PLAN.md` 5-Phase checkboxes inconsistent with B0–B24 backlog
- **Source:** `docs/audit_report_2.md` §3 (Discrepancies & Inconsistencies)
- **Root cause:** The 5-Phase ToDo list (Sections 3.1–3.8, 4.1–4.10, 5.1–5.8)
  was not updated when the B0–B24 backlog items completed. The following
  items are marked `[ ]` but correspond to `[x]` backlog items and exist
  in the codebase:
    - Phase 2 (2.1–2.6): DB scaffold, schema, WAL, migrations, seed, transactions — all Done (B3–B7)
    - Phase 4 (4.7): Real Login/Register UI — Done (B18)
    - Phase 4 (4.8): Real session destruction — Done (B18)
    - Phase 4 (4.9): AppShell auth state — Done (B18)
    - Phase 5 (5.2): Playwright install — Done (B24)
    - Phase 5 (5.3): E2E tests for critical flows — Done (B24)
    - Phase 5 (5.7): Dockerization + docker-compose — Done (B23)
- **Optimal fix:** Update these `[ ]` → `[x]` with a Done-marker referencing
  the corresponding B-phase.
- **Confidence:** Verified
- **Type:** Doc-only

### F9 — Prettier claim in Phase 1.4 is stale
- **Source:** `docs/audit_report_1.md` F6; `docs/REMEDIATION_PLAN.md` Phase 1.4
- **Root cause:** Phase 1.4 says "Prettier is still open per audit_report_1 F6".
  The project uses ESLint 9 flat config only (no Prettier). Whether this is
  intentional or pending is ambiguous.
- **Optimal fix:** Clarify Phase 1.4: ESLint 9 flat config
  (`eslint.config.mjs`) covers code-quality + import ordering; Prettier is
  intentionally omitted (ESLint's `--fix` is the project's formatter).
- **Confidence:** Verified
- **Type:** Doc-only

---

## 2. Sequenced ToDo List

Each task is atomic and tied to exactly one finding. Code tasks (F2, F3)
follow strict TDD: write failing test → implement → verify GREEN → run
full suite to confirm no regression.

### Phase A — TDD Code Changes (RED → GREEN → REFACTOR)

* [ ] **A.1 (F2-RED)** Add failing test in
  `packages/db/src/client.test.ts` that asserts the three performance
  indexes exist after `openDb({ path: ":memory:" })` via
  `SELECT name FROM sqlite_master WHERE type='index'`. Asserts
  `idx_posts_community_created`, `idx_comments_post_id`,
  `idx_notifications_user_read`. Run `npm test --workspace @embers/db`
  → expect RED (indexes absent).
* [ ] **A.2 (F2-GREEN)** Create
  `packages/db/src/migrations/0001_add_performance_indexes.sql` with:
  ```sql
  CREATE INDEX IF NOT EXISTS idx_posts_community_created
    ON posts (community_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_comments_post_id
    ON comments (post_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_user_read
    ON notifications (user_id, read);
  ```
  Append entry to `packages/db/src/migrations/meta/_journal.json`
  (`idx: 1, tag: "0001_add_performance_indexes"`). Mirror the indexes in
  `packages/db/src/schema/index.ts` via Drizzle's `index()` builder so
  `drizzle-kit generate` stays consistent. Run `npm test --workspace
  @embers/db` → expect GREEN.
* [ ] **A.3 (F3-RED)** Add failing test in
  `packages/shared/src/api.test.ts` that imports `registerResponseSchema`
  from `@embers/shared` and asserts it accepts `{ user: { ...authUserFields } }`
  and rejects `{}` (missing user). Run `npm test --workspace @embers/shared`
  → expect RED (import fails — schema not exported).
* [ ] **A.4 (F3-GREEN)** Add `registerResponseSchema` to
  `packages/shared/src/api/index.ts`:
  ```ts
  export const registerResponseSchema = z.object({
    user: authUserSchema,
  });
  export type RegisterResponse = z.infer<typeof registerResponseSchema>;
  ```
  Re-run shared tests → expect GREEN.
* [ ] **A.5 (Verify no regression)** Run full test suite:
  `npm test --workspaces --if-present`. Expected: 462 + 1 (F2) + 2 (F3) =
  **465 tests pass**, 0 failures. Run `npm run lint` + `npm run typecheck`
  → both clean.

### Phase B — Documentation Fixes

* [ ] **B.1 (F1)** Edit `docs/REMEDIATION_PLAN.md` §5.2 — remove
  "Double-submit cookie pattern for state-changing API calls" and replace
  with: "State-changing API calls use `Authorization: Bearer` tokens (not
  cookies), which are not sent cross-origin and are therefore inherently
  CSRF-resistant. The refresh cookie is `SameSite=Strict`."
* [ ] **B.2 (F4)** Edit `docs/REMEDIATION_PLAN.md` §5.1 line 207 — change
  `Path=/api/auth/refresh` → `Path=/api/auth`.
* [ ] **B.3 (F5)** Edit `docs/REMEDIATION_PLAN.md` §4.1 line 175 —
  reconcile ID strategy: "Primary keys are TEXT. Runtime code emits
  `<prefix>-<uuid>` (e.g. `u-<uuid>`, `p-<uuid>`) via `crypto.randomUUID()`.
  The seed script emits short readable IDs (`u1`, `p1`) for dev/test
  convenience. Branded TS types (`UserId`, `PostId` in
  `packages/shared/src/ids.ts`) provide compile-time nominal-typing only —
  the DB column is plain TEXT." Update the schema comment in
  `packages/db/src/schema/index.ts:8` to match.
* [ ] **B.4 (F6)** Edit `docs/REMEDIATION_PLAN.md` §5.3 — add a 4th step
  to the Postgres escape hatch: "Rewrite `packages/db/src/fts5.ts` and the
  `searchPosts` call site in `apps/server/src/routes/search.ts` — Postgres
  uses `tsvector` / `tsquery` / `ts_rank`, not FTS5 virtual tables."
* [ ] **B.5 (F7)** Edit `docs/session_10.md` line 34 — change
  "auth × 5" → "auth × 4".
* [ ] **B.6 (F8)** Edit `docs/REMEDIATION_PLAN.md` — update the following
  checkboxes from `[ ]` to `[x]` with a "(Done — Bn)" suffix:
  Phase 2 (2.1, 2.2, 2.3, 2.4, 2.5, 2.6), Phase 4 (4.7, 4.8, 4.9),
  Phase 5 (5.2, 5.3, 5.7). Add a top-of-section note clarifying that the
  B0–B24 backlog at §6 is the authoritative execution log; the 5-Phase
  list is the original proposal kept for historical context.
* [ ] **B.7 (F9)** Edit `docs/REMEDIATION_PLAN.md` Phase 1.4 — replace
  "Prettier is still open per audit_report_1 F6" with: "ESLint 9 flat
  config (`eslint.config.mjs`) covers code-quality + import ordering;
  Prettier is intentionally omitted (ESLint's `--fix` is the project's
  formatter)."

### Phase C — Companion Doc Updates

These docs must reflect the remediated codebase.

* [ ] **C.1** Update `AGENTS.md` — add a Round 11 banner describing the
  three new indexes (migration 0001), the new `registerResponseSchema`,
  the CSRF claim correction, and the bumped test counts
  (db=30, shared=69, total=465).
* [ ] **C.2** Update `CLAUDE.md` — mirror the Round 11 banner; update the
  test count table; add the new migration to the DB migrations list.
* [ ] **C.3** Update `README.md` — update the file tree comment for the
  new migration file; update the test-count table; add a one-line Round 11
  note in the Roadmap Status section.
* [ ] **C.4** Update `docs/Project-Architecture-Document.md` — add the
  three indexes to §4 Data Architecture; add `registerResponseSchema` to
  the API contracts section; correct the CSRF posture description in §6
  Security Architecture; add a "Last Updated: 2026-08-12 (Round 11)" line.

### Phase D — Validation Gates

* [ ] **D.1** `npm run lint` — 0 errors, 0 warnings
* [ ] **D.2** `npm run typecheck` — all 4 workspaces clean
* [ ] **D.3** `npm test --workspaces --if-present` — 465/465 pass
* [ ] **D.4** `npm run test:plan-alignment` — still passes (no forbidden
  tokens introduced)
* [ ] **D.5** `npm run test:build` — production build still clean
* [ ] **D.6** `npm run test:no-secrets` + `npm run test:gitignore` — clean

### Phase E — Commit + Push

* [ ] **E.1** `git add` all changed files (code + docs + new migration)
* [ ] **E.2** `git commit -m "fix(r11): audit-driven schema + doc reconciliation"`
  on `main` (no new branches)
* [ ] **E.3** `git push origin main` via the SSH wrapper script
  (`skills/how-to-git-push-using-ssh-wrapper/scripts/ssh_git_wrapper_v3.py`)
  using the key at `docs/ssh-key.txt`, per the
  `how-to-git-push-using-ssh-wrapper` skill.
* [ ] **E.4** Verify push succeeded: `git status -sb` shows
  `## main...origin/main` with no ahead/behind.

---

## 3. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|:---|:---|:---|:---|
| New migration 0001 fails to apply on existing DBs | Low | Medium | Use `CREATE INDEX IF NOT EXISTS` (idempotent); test against fresh `:memory:` DB |
| `registerResponseSchema` export breaks existing callers | Very Low | Low | Purely additive export; no existing code imports it (the web client uses the hand-written `RegisterResponse` interface) |
| Doc edits accidentally introduce forbidden tokens | Low | Low | `test:plan-alignment` gate catches; the plan edits don't use tRPC/pnpm/Turborepo/RS256/UUID |
| SSH wrapper fails (paramiko not installed) | Medium | High | Per skill: verify `python3 -c "import paramiko"` first; install with `pip install --break-system-packages paramiko` if missing |
| Test count bump from 462 → 465 breaks doc claims | Low | Low | Phase C explicitly updates all doc test-count tables |

---

## 4. Definition of Done

Round 11 is complete when:
1. All Phase A–E checkboxes above are ticked.
2. `npm test --workspaces --if-present` reports 465/465 passing.
3. `npm run test:plan-alignment` passes.
4. `git log --oneline origin/main..HEAD` shows exactly one new commit on
   `main` containing all changes.
5. `git status -sb` shows `## main...origin/main` (no ahead/behind).
6. AGENTS.md, CLAUDE.md, README.md, Project-Architecture-Document.md all
   reflect the new migration, the new schema, the corrected CSRF posture,
   and the bumped test counts.
