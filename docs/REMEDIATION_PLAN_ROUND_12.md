# Round 12 Remediation Plan — Hygiene + Schema Naming Reconciliation

> **Round 12 (2026-08-13):** This plan executes the validated findings of
> `docs/session_12.md` (a Mode-C alignment audit of AGENTS.md / CLAUDE.md /
> README.md vs the codebase, plus a re-validation of the Round 11
> `session_11.md` audit), `docs/audit_report_3.md`, and
> `docs/audit_report_4.md`. All three audits converge on the same verdict:
> the documentation is **exceptionally well-aligned** with the codebase.
> The only actionable items are 1 doc-precision tightening, 1 stale
> package.json entry, 1 repo-hygiene untrack, 1 stray-file deletion, and
> 1 schema-naming consistency rename (the residual M-2 item from Round 11).
>
> Skills referenced (from `skills/skills-catalog.md`):
>   - `planning-and-task-breakdown` — structured this ToDo list
>   - `tdd-workflow` — RED-GREEN-REFACTOR cycle for the F5 schema rename
>   - `code-simplification` — removing stale entries + untracking bloat
>   - `code-review-checklist` — 12-category scan during validation

---

## 1. Consolidated Findings — Root Cause → Optimal Fix

Each finding was reproduced against the codebase at HEAD (`a828082`)
before being added here. Confidence levels follow the audit contract:
Verified / Reasoned / Assumed.

### F1 — `DATABASE_URL` doc-precision drift in README
- **Source:** `docs/session_12.md` §"Minor Nuances" #1 (line 81)
- **Root cause:** `README.md:194` says
  `| DATABASE_URL | No | Defaults to packages/db/dev.db |`. The actual
  code default in `apps/server/src/config.ts:53` is
  `z.string().default("./dev.db")`, which `loadEnv()` resolves to
  `<repo-root>/dev.db` (see `config.ts:114-116`). The documented
  `packages/db/dev.db` value actually comes from `.env.example`
  (`DATABASE_URL=packages/db/dev.db`), not from the code default. Without
  an `.env` file, the two would diverge: the server would use
  `<repo-root>/dev.db` while the seed script uses
  `packages/db/dev.db`.
- **Optimal fix:** Update `README.md:194` to clarify: the code default
  is `./dev.db` (resolved to repo-root); `.env.example` overrides this to
  `packages/db/dev.db` so server and seed agree.
- **Confidence:** Verified
- **Type:** Doc-only

### F2 — Stray `apps/server/dev.db` — already clean
- **Source:** `docs/session_12.md` §"Minor Nuances" #2 (line 85)
- **Root cause:** A stale `apps/server/dev.db` (+ `-shm` / `-wal`) existed
  on the auditor's disk from an earlier server run where the DB resolved
  under `apps/server/`. It's gitignored (`*.db`, `*.db-wal`, `*.db-shm`,
  `*.db-journal` in `.gitignore:21-24`) so untracked.
- **Current state:** **Not present in this checkout** — `ls` returns
  "No such file or directory" for all three files. No action needed.
- **Confidence:** Verified
- **Type:** No-op (already clean)

### F3 — Stale `allowScripts` entry in root `package.json`
- **Source:** `docs/session_12.md` §"Minor Nuances" #3 (line 87)
- **Root cause:** `package.json:41` has `"better-sqlite3@11.10.0": true`
  in the `allowScripts` map. The actual dependency is `better-sqlite3@13.0.3`
  (line 44). The `11.10.0` entry is a stale leftover from an earlier
  version upgrade — harmless (npm ignores it) but misleading.
- **Optimal fix:** Remove the `"better-sqlite3@11.10.0": true` line from
  `package.json` `allowScripts`.
- **Confidence:** Verified
- **Type:** Code (trivial)

### F4 — `skills/` directory has 13,926 tracked files despite `.gitignore`
- **Source:** `docs/session_12.md` §"Out-of-scope hygiene observation"
  (line 89)
- **Root cause:** `git ls-files skills/` returns 13,926 entries. The
  `.gitignore:13` has `skills/` — the directory was meant to be ignored.
  But the files were committed before the gitignore rule was added (or
  force-added), so git continues tracking them. Standard git behavior:
  adding a file to `.gitignore` does not untrack it if it's already
  tracked; `git rm --cached` is required.
- **Impact:** 13,926 tracked files bloat the repo, slow clones, and make
  `git status` / `git diff` noisy. The skills are a local development
  aid (the `skills/` directory is a symlink to
  `/home/pete/.pi/agent/skills`) and should not be version-controlled
  with the embers application code.
- **Optimal fix:** `git rm -r --cached skills/` to untrack the directory.
  Files stay on disk (local use unaffected); future clones won't include
  them. The existing `.gitignore:13` entry ensures they stay ignored.
- **Confidence:** Verified
- **Type:** Hygiene (git untrack)

### F5 — Schema naming inconsistency (Round 11 M-2 residual)
- **Source:** `docs/session_12.md` §"One residual note" (line 286);
  `docs/session_11.md` M-2
- **Root cause:** Round 11 F3 added `registerResponseSchema` (using the
  `*ResponseSchema` convention) but did NOT rename the existing
  `loginOutputSchema`, `refreshTokenOutputSchema`, `castVoteOutputSchema`
  (which use the `*OutputSchema` convention). The shared API layer now
  uses mixed naming: `authUserSchema`, `registerResponseSchema`,
  `loginOutputSchema`, `refreshTokenOutputSchema`, `castVoteOutputSchema`,
  `errorResponseSchema`. This is exactly the inconsistency the Round 11
  audit flagged.
- **Blast radius:** The types `LoginOutput`, `RefreshTokenOutput`,
  `CastVoteOutput` are only used inside `packages/shared/src/api/index.ts`
  itself — **zero imports** from `apps/server` or `apps/web`. The schema
  names are referenced in `packages/shared/src/api.test.ts` and in doc
  files only. Rename is safe and non-breaking for downstream consumers.
- **Optimal fix:** Standardize on `*ResponseSchema` (matching
  `registerResponseSchema` and `errorResponseSchema`):
  - `loginOutputSchema` → `loginResponseSchema`
  - `refreshTokenOutputSchema` → `refreshTokenResponseSchema`
  - `castVoteOutputSchema` → `castVoteResponseSchema`
  - `LoginOutput` → `LoginResponse`
  - `RefreshTokenOutput` → `RefreshTokenResponse`
  - `CastVoteOutput` → `CastVoteResponse`
  - Update the naming-convention comment at `api/index.ts:14-16`
  - Update `api.test.ts` imports + references
- **Confidence:** Verified
- **Type:** Code (TDD — rename with test-first verification)

### F6 — Stray `session_11.md` at repo root
- **Source:** Observed during `git pull` — commit `a828082` created
  `session_11.md` at the repo root (76 lines, a transcript dump of the
  Round 11 agent conversation). The authoritative Round 11 audit report
  lives at `docs/session_11.md` (151 lines) and the plan at
  `docs/REMEDIATION_PLAN_ROUND_11.md`.
- **Root cause:** The root-level file was accidentally committed outside
  the `docs/` directory. It's a redundant transcript — the authoritative
  content is already in `docs/session_11.md` +
  `docs/REMEDIATION_PLAN_ROUND_11.md`.
- **Optimal fix:** Delete the root-level `session_11.md`.
- **Confidence:** Verified
- **Type:** Hygiene (file deletion)

---

## 2. Sequenced ToDo List

Each task is atomic and tied to exactly one finding. Code tasks (F5)
follow strict TDD: write failing test → implement → verify GREEN → run
full suite to confirm no regression.

### Phase A — TDD Code Change: Schema Naming Rename (F5)

* [ ] **A.1 (F5-RED)** Update `packages/shared/src/api.test.ts` to
  import the new names (`loginResponseSchema`,
  `refreshTokenResponseSchema`, `castVoteResponseSchema`) instead of
  the old `*OutputSchema` names. Run
  `npx vitest run --workspace @embers/shared` → expect RED (imports
  fail — names don't exist yet).
* [ ] **A.2 (F5-GREEN)** In `packages/shared/src/api/index.ts`:
  - Rename `loginOutputSchema` → `loginResponseSchema` + type
    `LoginOutput` → `LoginResponse`
  - Rename `refreshTokenOutputSchema` → `refreshTokenResponseSchema` +
    type `RefreshTokenOutput` → `RefreshTokenResponse`
  - Rename `castVoteOutputSchema` → `castVoteResponseSchema` + type
    `CastVoteOutput` → `CastVoteResponse`
  - Update the naming-convention comment (lines 14-16) to use
    `*ResponseSchema` instead of `*OutputSchema`
  Run shared tests → expect GREEN.
* [ ] **A.3 (F5-Verify)** Rebuild `@embers/shared`, run full test suite
  `npm test --workspaces --if-present`. Expected: 466/466 pass (no test
  count change — pure rename). Run `npm run typecheck` → clean (no
  downstream type errors because no external code imports these names).

### Phase B — Doc + Hygiene Fixes

* [ ] **B.1 (F1)** Edit `README.md:194` — change
  `| DATABASE_URL | No | Defaults to \`packages/db/dev.db\` |`
  to:
  `| DATABASE_URL | No | Code default: \`./dev.db\` (resolved to repo-root). \`.env.example\` overrides to \`packages/db/dev.db\` so server + seed agree. |`
* [ ] **B.2 (F3)** Edit `package.json` — remove the line
  `"better-sqlite3@11.10.0": true,` from the `allowScripts` map (line 41).
* [ ] **B.3 (F4)** Run `git rm -r --cached skills/` to untrack the
  13,926 skill files. Files stay on disk; `.gitignore:13` keeps them
  ignored. Verify with `git ls-files skills/ | wc -l` → 0.
* [ ] **B.4 (F6)** Delete the stray root-level `session_11.md`:
  `git rm session_11.md`. The authoritative version at
  `docs/session_11.md` is unaffected.

### Phase C — Companion Doc Updates

* [ ] **C.1** Update `AGENTS.md` — add a Round 12 banner describing the
  schema-naming standardization (F5), the `allowScripts` cleanup (F3),
  the skills/ untrack (F4), the stray-file deletion (F6), and the
  DATABASE_URL doc-precision fix (F1). Note test count is unchanged
  (466 — pure rename).
* [ ] **C.2** Update `CLAUDE.md` — mirror the Round 12 banner; note the
  schema-naming convention is now `*ResponseSchema` for all response
  bodies.
* [ ] **C.3** Update `README.md` — add a Round 12 note in the changelog
  area; note the skills/ untrack (future clones won't include skills/).
* [ ] **C.4** Update `docs/Project-Architecture-Document.md` — update
  the "Last Updated" line to Round 12; note the schema-naming
  convention; note the skills/ untrack.

### Phase D — Validation Gates

* [ ] **D.1** `npm run lint` — 0 errors, 0 warnings
* [ ] **D.2** `npm run typecheck` — all 4 workspaces clean
* [ ] **D.3** `npm test --workspaces --if-present` — 466/466 pass
* [ ] **D.4** `npm run test:plan-alignment` — still passes
* [ ] **D.5** `npm run test:build` — production build still clean
* [ ] **D.6** `npm run test:no-secrets` + `npm run test:gitignore` — clean
* [ ] **D.7** `git ls-files skills/ | wc -l` → 0 (F4 verified)
* [ ] **D.8** `git ls-files session_11.md` → empty (F6 verified, root
  file deleted; `docs/session_11.md` still tracked)

### Phase E — Commit + Push

* [ ] **E.1** `git add` all changed files (code + docs)
* [ ] **E.2** `git rm -r --cached skills/` (already done in B.3, but
  ensure the staging area reflects it)
* [ ] **E.3** `git commit -m "fix(r12): schema naming + repo hygiene"`
  on `main` (no new branches)
* [ ] **E.4** `git push origin main` via the SSH wrapper script
  (`skills/how-to-git-push-using-ssh-wrapper/scripts/ssh_git_wrapper_v3.py`)
  using the key at `docs/ssh-key.txt`, per the
  `how-to-git-push-using-ssh-wrapper` skill.
* [ ] **E.5** Verify push succeeded: `git status -sb` shows
  `## main...origin/main` with no ahead/behind.

---

## 3. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|:---|:---|:---|:---|
| F5 rename breaks downstream importers | Very Low | Low | Verified: zero imports of `*OutputSchema` or `*Output` types from `apps/server` or `apps/web` — blast radius is 2 files inside `@embers/shared` |
| F4 skills/ untrack breaks agent skill lookups | Very Low | Low | Files stay on disk; only the git index changes. `.gitignore:13` already excludes `skills/` so the intent was always to not track them |
| F3 allowScripts removal triggers npm install prompt | Very Low | Very Low | The stale `11.10.0` entry is never matched (actual dep is `13.0.3`); removing it is a no-op for npm |
| F6 root session_11.md deletion loses data | Very Low | Very Low | The file is a transcript dump; authoritative content is in `docs/session_11.md` (151 lines) + `docs/REMEDIATION_PLAN_ROUND_11.md` |
| Doc edits introduce test:plan-alignment failures | Very Low | Low | The plan-alignment script only checks `docs/REMEDIATION_PLAN.md` for forbidden tokens (tRPC/pnpm/Turborepo/RS256/UUID); Round 12 edits don't touch that file |

---

## 4. Definition of Done

Round 12 is complete when:
1. All Phase A–E checkboxes above are ticked.
2. `npm test --workspaces --if-present` reports 466/466 passing (unchanged
   — pure rename + hygiene).
3. `npm run test:plan-alignment` passes.
4. `git ls-files skills/ | wc -l` returns 0.
5. `git ls-files session_11.md` returns empty (root file deleted).
6. `git log --oneline origin/main..HEAD` shows exactly one new commit on
   `main` containing all changes.
7. `git status -sb` shows `## main...origin/main` (no ahead/behind).
8. AGENTS.md, CLAUDE.md, README.md, Project-Architecture-Document.md all
   reflect the schema-naming convention, the skills/ untrack, and the
   Round 12 changes.
