I'll execute this systematically. Starting with refreshing the workspace and gathering all the inputs in parallel.
Pulled. New commit `f473db9` updated `audit_report_2.md` and added `session_11.md`. Let me read all the inputs in parallel.
I have all inputs. Let me check the existing test patterns and migration journal so I can plan TDD properly.
Let me check the plan-alignment script to make sure my doc edits won't break that gate, plus check the project-architecture doc structure.
I have all the context. Now let me create the comprehensive remediation plan as a document, using the `planning-and-task-breakdown` skill structure.
Now let me **validate the plan against the codebase** before executing — verify each claim one more time at the exact line numbers I'm about to edit.
Plan validated — every cited line number is correct. Let me also peek at §5.3 to plan the exact edit.
Plan validated. Now executing **Phase A (TDD code changes)** — starting with F2 (RED test first).
### F2 — RED: Add failing index test
Now run the test to confirm RED.
Dependencies not installed. Need `npm install` first.
**RED confirmed** — index array is empty `[]`. Now F2-GREEN: create migration 0001 + journal entry + schema indexes.
Now mirror the indexes in the Drizzle schema so `drizzle-kit generate` would produce them. Need to import `index` from drizzle-orm/sqlite-core and add to each table's secondary return.
Trailing blank line — let me clean it up, then rebuild + run.
Now rebuild @embers/db and re-run the test → expect GREEN.
Drizzle migrator requires `--> statement-breakpoint` between statements. Fix the migration:
**F2 GREEN.** Run full db suite to confirm no regression.
**F2 complete: db 29 → 30 tests, all green.** Now F3 (RED → GREEN).
### F3 — RED: Add failing registerResponseSchema test
Now add the test cases at the end of the `auth API schemas` describe block:
**RED confirmed** — `registerResponseSchema` is `undefined`. Now F3-GREEN: add the schema.
**F3 GREEN.** Run full shared suite to confirm no regression.
**F3 complete: shared 67 → 70 tests, all green.** Now Phase B — documentation fixes (F1, F4, F5, F6, F7, F8, F9).
### Phase B — Documentation fixes in `docs/REMEDIATION_PLAN.md` (F1, F4, F5, F6, F8, F9) and `docs/session_10.md` (F7)
The 4.7/4.8 edits succeeded but the 4.9 line failed because my old_str had wrong whitespace. Let me check current state and patch the remaining edits individually.
MultiEdit is atomic — none of the edits applied. Let me redo them with the correct whitespace on 4.9.
Line 48 (1.4) is already updated! Let me check all the other lines to see what state we're in:
MultiEdit applied 1.4 + 2.1-2.6, then stopped at the 4.7-4.9 block. Let me apply the remaining edits one by one:
Now F5 (ID strategy line 175), F4 (cookie path line 207), F1 (CSRF line 216), F6 (Postgres line 226):
Now F7 — fix `session_10.md` route count "auth × 5" → "auth × 4":
Phase B done. Now Phase C — update the four companion docs. Let me check the current Round banners to match style:
Now insert Round 11 banner in both files:
Now CLAUDE.md:
Now let me also find and update the test-count tables in CLAUDE.md (search for "95 tests" or "67 tests" or "29 tests"):
Wait — I miscounted in the banners. db +1, shared +3, total = 462 + 1 + 3 = **466**, not 465. Let me fix the banners first.
Now update the test-count tables/lines in all three docs:
Now AGENTS.md test count line + comment:
Now README.md — multiple count updates:
Now add the Round 11 line to README's "Roadmap" / Round changelog area:
Now update Project-Architecture-Document.md — fix "Last Updated" line and add Round 11 ADR/index/schema notes:
Now let me find the §4 Data Architecture and §6 Security sections to add the index/schema/CSRF details:
Now let me find the shared package total in §13.4 and update it (was 67 → 70):
Now add a CSRF-posture note to §6.3:
Phase C complete. Now Phase D — run all the CI gates.
Lint clean. Now typecheck:
Typecheck clean. Now full test suite:
**466/466 tests pass** (db 30 + shared 70 + server 95 + web 271). Now run the other gates:
All gates green. Let me also run `test:build` to verify the production build still works:
All gates green. Now Phase E — commit + push.
Good — only the 2 intended new files are untracked, dist/ is properly gitignored. Now stage and commit:
Commit `0987bd5` on main. Now Phase E.3 — push using the SSH wrapper. First, set up the prerequisites per the skill:
Need to (a) switch remote to SSH, (b) install paramiko, (c) chmod the key. Per the skill:
Classic venv/system python mismatch (skill's Lesson #1). Install paramiko into the venv's python:
Now set up the SSH key per the skill (chmod 600 is non-negotiable):
Good — file contains real OpenSSH key (3369 bytes, starts with `-----BEGIN OPENSSH PRIVATE KEY-----`). The earlier `[REDACTED:ssh_private_key]` was just tool-level output redaction. Now push:
**Push succeeded.** Verify with `git status -sb`:
All phases complete. `## main...origin/main` confirms the push landed cleanly with no ahead/behind.

## Summary

Round 11 (audit-driven doc + schema reconciliation) is complete and pushed to `main` as commit `0987bd5`.

**What was done**
- Refreshed workspace with `git pull` (got new `audit_report_2.md` + `session_11.md`).
- Consolidated 9 validated findings from `session_11.md` (Mode-C audit), `audit_report_1.md` F6, and `audit_report_2.md` §3 into `docs/REMEDIATION_PLAN_ROUND_11.md` with a sequenced ToDo list and risk assessment.
- **TDD code changes (RED → GREEN):**
  - **F2** — added `packages/db/src/migrations/0001_add_performance_indexes.sql` (3 indexes: `posts(community_id, created_at DESC)`, `comments(post_id)`, `notifications(user_id, read)`), mirrored in `schema/index.ts` via Drizzle `index()` builders, +1 regression test in `client.test.ts`.
  - **F3** — added `registerResponseSchema` to `packages/shared/src/api/index.ts` (canonical Zod schema for `POST /api/auth/register` 201 responses), +3 tests in `api.test.ts`.
- **7 doc fixes** to `REMEDIATION_PLAN.md` (F1 CSRF, F4 cookie path, F5 ID strategy, F6 Postgres FTS5 step, F8 11 checkboxes ticked, F9 Prettier) and `session_10.md` (F7 route-count math).
- Updated `AGENTS.md`, `CLAUDE.md`, `README.md`, `docs/Project-Architecture-Document.md` with Round 11 banners, bumped test counts (462 → 466: db 29→30, shared 67→70), new migration, new schema, corrected CSRF posture.
- All 8 CI gates green: lint, typecheck, 466/466 tests, `test:plan-alignment`, `test:build`, `test:no-secrets`, `test:gitignore`, `test:ci-config`.
- Committed 13 files (11 modified + 2 new) to `main` and pushed via the SSH wrapper skill (paramiko into venv python, key at `~/.ssh/id_github` mode 600, `StrictHostKeyChecking=accept-new`).

**Skills referenced** (per `skills/skills-catalog.md`): `planning-and-task-breakdown`, `tdd-workflow`, `code-review-checklist`, `how-to-git-push-using-ssh-wrapper`.

**Suggested next steps**: (1) Verify the push at `https://github.com/nordeim/reddit-clone/commit/0987bd5`; (2) If you want to action the deferred Phase 4 / 5 items still marked `[ ]` (BrowserRouter, React Query, Sentry, Litestream backups, OWASP/WCAG final audit), I can scope a Round 12 plan; (3) The `registerResponseSchema` is now available in `@embers/shared` — the web client's hand-written `RegisterResponse` interface in `apps/web/src/lib/api.ts:124-126` could be replaced by importing the shared schema in a future refactor.
