# Round 13 Remediation Plan — Database Backup + Type Drift Detection + Doc Cleanup

> **Round 13 (2026-08-13):** This plan is self-scoped — there are no new
> audit reports to respond to. Instead, I surveyed the remaining
> non-breaking gaps in `docs/REMEDIATION_PLAN.md` and the codebase to
> identify the highest-value work that can be executed safely without
> breaking the "deploy anywhere" story or the deferred B17–B22 frontend
> integration. Three deliverables were identified, all validated against
> the codebase before this plan was written.
>
> Skills referenced (from `skills/skills-catalog.md`):
>   - `planning-and-task-breakdown` — structured this ToDo list
>   - `tdd-workflow` — RED-GREEN-REFACTOR for the backup script
>   - `testing-patterns` — unit test design for the backup function
>   - `code-review-checklist` — 12-category scan during validation

---

## 1. Consolidated Findings — Root Cause → Optimal Fix

Each finding was identified by surveying the codebase + REMEDIATION_PLAN.md
at HEAD (`3f0465a`) and validated before being added here.

### F1 — No database backup strategy (Phase 5.6)
- **Source:** `docs/REMEDIATION_PLAN.md` Phase 5.6 (line 95):
  `[ ] Add an automated database backup strategy (e.g., Litestream for
  continuous SQLite replication to S3, or cron-based snapshots).`
- **Root cause:** The `packages/db/scripts/` directory has `migrate.ts`
  and `seed.ts` but no `backup.ts`. The `@embers/db` package exports
  `openDb()`, `runSeed()`, `searchPosts()` etc. but no `backupDb()`
  function. In production, a SQLite database failure without a backup
  means total data loss.
- **Evidence:** `ls packages/db/scripts/` → `migrate.ts  seed.ts`.
  `grep -rn "backup" packages/db/src/` → 0 matches.
  `better-sqlite3` provides a `.backup()` method
  (`node_modules/@types/better-sqlite3/index.d.ts:87`:
  `backup(destinationFile: string, options?): Promise<BackupMetadata>`)
  that performs a safe online backup using SQLite's backup API — no
  read locks, no corruption risk, works while the server is running.
- **Optimal fix:**
  1. Add `backupDb(source, destination)` to `packages/db/src/client.ts`
     using `better-sqlite3`'s `.backup()` method.
  2. Export it from `packages/db/src/index.ts`.
  3. Add `packages/db/scripts/backup.ts` CLI script (following the
     `migrate.ts` pattern) that reads `DATABASE_URL` and writes to a
     timestamped backup file.
  4. Add `db:backup` script to `packages/db/package.json` + root
     `package.json`.
  5. TDD: write a test in `packages/db/src/client.test.ts` that creates
     a backup of an in-memory DB (to a temp file) and asserts the backup
     has the same tables + a row inserted before the backup.
- **Confidence:** Verified
- **Type:** Code (TDD)

### F2 — No type drift detection between web client and shared schemas
- **Source:** Round 11 "suggested next steps" + Round 12 F5 residual
  note. The web client's `apps/web/src/lib/api.ts` has hand-written
  `AuthUser`, `LoginResponse`, `RegisterResponse` interfaces that are
  structurally identical to the shared Zod schemas
  (`authUserSchema`, `loginResponseSchema`, `registerResponseSchema`).
  The file's own comment (line 91-93) says "intentionally loose here so
  this file has zero workspace deps" — a deliberate design decision to
  keep the web client decoupled. But there is NO mechanism to detect
  when these hand-written types drift from the shared schemas.
- **Root cause:** `@embers/shared` is not a dependency (or devDependency)
  of `@embers/web`. The web client cannot import shared types, so if the
  server adds a field to `authUserSchema` (e.g., `avatarUrl`), the web
  client's `AuthUser` interface silently stays out of sync until
  someone notices a runtime error.
- **Evidence:** `apps/web/package.json` — `@embers/shared` is absent
  from both `dependencies` and `devDependencies`. `apps/web/src/lib/api.ts`
  defines `AuthUser` (line 99), `LoginResponse` (line 110),
  `RegisterResponse` (line 124) as hand-written interfaces.
- **Optimal fix:**
  1. Add `@embers/shared` as a `devDependency` of `@embers/web`
     (`"@embers/shared": "*"`) — devDependency only, so the production
     bundle is unaffected.
  2. Add compile-time type assertions in `apps/web/src/lib/api.ts` using
     **type-only imports** (erased at compile time, zero runtime/bundle
     cost):
     ```typescript
     import type { AuthUser as SharedAuthUser } from "@embers/shared";
     import type { LoginResponse as SharedLoginResponse } from "@embers/shared";
     import type { RegisterResponse as SharedRegisterResponse } from "@embers/shared";

     type AssertExact<T, U> =
       (<G>() => G extends T ? 1 : 2) extends
       (<G>() => G extends U ? 1 : 2) ? true : false;

     type _DriftCheckAuthUser = AssertExact<AuthUser, SharedAuthUser>;
     type _DriftCheckLoginResponse = AssertExact<LoginResponse, SharedLoginResponse>;
     type _DriftCheckRegisterResponse = AssertExact<RegisterResponse, SharedRegisterResponse>;
     ```
  3. If any of these types drift, `npm run typecheck` fails — catching
     the drift at CI time, not at runtime.
  4. The web client's architecture stays unchanged: the hand-written
     interfaces remain the runtime contract; the shared schemas remain
     the server-side source of truth; the type assertions bridge them at
     compile time only.
- **Confidence:** Verified
- **Type:** Code (compile-time TDD)

### F3 — 13 remaining `[ ]` checkboxes with `✅ Done` notes
- **Source:** `docs/REMEDIATION_PLAN.md` — same pattern as Round 11 F8
  (which ticked Phase 2, 4.7-4.9, 5.2-5.3, 5.7). Round 11 missed:
  - Phase 1: 1.1, 1.2, 1.3, 1.5 (4 items)
  - Phase 3: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8 (8 items)
  - Phase 5: 5.1 (1 item)
- **Root cause:** The 5-Phase ToDo list was not fully updated when the
  B0–B24 backlog items completed. Each of these 13 items has a `✅ Done`
  note citing the corresponding B-phase, but the checkbox is still `[ ]`.
- **Optimal fix:** Change `[ ]` → `[x]` for all 13 items. They already
  have `✅ Done` notes — no content changes needed.
- **Confidence:** Verified
- **Type:** Doc-only

---

## 2. Sequenced ToDo List

### Phase A — TDD: Database Backup Script (F1)

* [ ] **A.1 (F1-RED)** Add a failing test in
  `packages/db/src/client.test.ts` that calls `backupDb()` to back up a
  seeded in-memory DB to a temp file, opens the backup, and asserts:
  (a) the backup file exists, (b) it has the same tables as the source,
  (c) a row inserted before the backup is present in the backup.
  Run `npx vitest run --workspace @embers/db` → expect RED (`backupDb`
  is not exported).
* [ ] **A.2 (F1-GREEN)** Implement `backupDb` in
  `packages/db/src/client.ts`:
  ```typescript
  export async function backupDb(
    source: string,
    destination: string,
  ): Promise<{ totalPages: number; remainingPages: number }> {
    const { raw } = openDb({ path: source, skipMigrate: true, skipFts5: true });
    try {
      const result = await raw.backup(destination);
      return result;
    } finally {
      raw.close();
    }
  }
  ```
  Export it from `packages/db/src/index.ts`. Run db tests → expect GREEN.
* [ ] **A.3 (F1-CLI)** Create `packages/db/scripts/backup.ts` following
  the `migrate.ts` pattern — reads `DATABASE_URL`, writes to a
  timestamped backup file (default: `./backups/dev-YYYYMMDD-HHmmss.db`).
  Add `backup` script to `packages/db/package.json`:
  `"backup": "tsx scripts/backup.ts"`.
  Add `db:backup` delegating script to root `package.json`:
  `"db:backup": "npm run backup --workspace @embers/db --if-present"`.
* [ ] **A.4 (F1-Verify)** Run full test suite + typecheck. Expected:
  466 → 467 tests (db 30 → 31), all green.

### Phase B — TDD: Type Drift Detection (F2)

* [ ] **B.1 (F2-Setup)** Add `"@embers/shared": "*"` to
  `apps/web/package.json` `devDependencies`. Run `npm install` to
  symlink the workspace.
* [ ] **B.2 (F2-RED)** Add type-only imports + `AssertExact` type
  assertions to `apps/web/src/lib/api.ts`. Run `npm run typecheck
  --workspace @embers/web` → expect GREEN (types already match — this
  is a characterization test, not traditional RED).
  To verify the assertion WORKS: temporarily remove a field from
  `AuthUser` in `api.ts`, run typecheck → expect FAILURE. Restore the
  field.
* [ ] **B.3 (F2-Verify)** Run full typecheck + test suite. Expected:
  467 tests pass (no new runtime tests — this is compile-time only).
  `npm run test:build` still passes (type-only imports are erased, no
  bundle impact).

### Phase C — Doc Fix: Tick Remaining Checkboxes (F3)

* [ ] **C.1 (F3)** Edit `docs/REMEDIATION_PLAN.md` — change `[ ]` →
  `[x]` for these 13 items (all already have `✅ Done` notes):
  - Phase 1: 1.1, 1.2, 1.3, 1.5
  - Phase 3: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
  - Phase 5: 5.1

### Phase D — Companion Doc Updates

* [ ] **D.1** Update `AGENTS.md` — add a Round 13 banner describing
  the backup script (F1), the type drift detection (F2), and the
  checkbox cleanup (F3). Note test count: 466 → 467 (db 30 → 31).
* [ ] **D.2** Update `CLAUDE.md` — mirror the Round 13 banner; note
  the `db:backup` command; note the type drift detection mechanism.
* [ ] **D.3** Update `README.md` — add `db:backup` to the commands
  list; add a Round 13 changelog entry.
* [ ] **D.4** Update `docs/Project-Architecture-Document.md` — update
  "Last Updated" to Round 13; add `backupDb` to §13.5; note the type
  drift detection in the web client section.

### Phase E — Validation Gates

* [ ] **E.1** `npm run lint` — 0 errors, 0 warnings
* [ ] **E.2** `npm run typecheck` — all 4 workspaces clean
* [ ] **E.3** `npm test --workspaces --if-present` — 467/467 pass
* [ ] **E.4** `npm run test:plan-alignment` — still passes
* [ ] **E.5** `npm run test:build` — production build still clean
  (type-only imports erased, no bundle impact)
* [ ] **E.6** `npm run test:no-secrets` + `npm run test:gitignore` — clean

### Phase F — Commit + Push

* [ ] **F.1** `git add` all changed files
* [ ] **F.2** `git commit -m "fix(r13): db backup + type drift detection + doc cleanup"`
  on `main`
* [ ] **F.3** `git push origin main` via the SSH wrapper script
* [ ] **F.4** Verify push: `git status -sb` shows `## main...origin/main`

---

## 3. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|:---|:---|:---|:---|
| F1 backup corrupts live DB | Very Low | High | `better-sqlite3`'s `.backup()` uses SQLite's official online backup API — read-only on source, never corrupts |
| F1 backup test leaves temp files | Low | Very Low | Test uses `:memory:` source + temp file destination with `rmSync` cleanup |
| F2 `@embers/shared` devDep breaks build | Very Low | Low | devDeps not in production bundle; `pretypecheck` already builds shared first; type-only imports erased |
| F2 type assertion is too strict | Low | Low | `AssertExact` uses the standard bidirectional check; if it fails, it means real drift that should be fixed |
| F3 checkbox ticks introduce forbidden tokens | Very Low | Low | `test:plan-alignment` only checks for tRPC/pnpm/Turborepo/RS256/UUID; checkbox ticks don't add content |

---

## 4. Definition of Done

Round 13 is complete when:
1. All Phase A–F checkboxes above are ticked.
2. `npm test --workspaces --if-present` reports 467/467 passing.
3. `npm run typecheck` passes (type drift assertions active).
4. `npm run test:build` passes (no bundle impact from type-only imports).
5. `npm run db:backup` creates a valid backup file (manually verified).
6. `git log --oneline origin/main..HEAD` shows exactly one new commit.
7. `git status -sb` shows `## main...origin/main` (no ahead/behind).
8. AGENTS.md, CLAUDE.md, README.md, Project-Architecture-Document.md all
   reflect the backup script, the type drift detection, and the checkbox
   cleanup.
