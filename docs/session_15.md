I've internalized the operating instructions. This is a multi-phase engineering task: clone repo → review docs → validate against codebase → E2E test live site → remediation planning → TDD execution → doc update → git push. Let me set up the todo list and begin.
Now I'll read the key docs in parallel for efficiency.
Good. Now let me read CLAUDE.md, REMEDIATION_PLAN.md, the architecture doc, the SKILL.md, and the skills catalog in parallel.
Now let me read the REMEDIATION_PLAN.md, the architecture document, and the SKILL.md, plus the skills catalog and the worklog.
Now let me read the architecture document, SKILL.md, skills catalog, and worklog.
Good. Now let me look at a couple key skills relevant to this work. Let me also check the key repo files quickly.
Now I have enough context. Let me update todos and verify codebase alignment before running E2E tests.
Let me do a quick validation of the codebase structure to confirm what is documented matches what's in the repo.
Let me run the test suite quickly to verify the current state (the docs claim 467 vitest + 18 e2e pass).
Codebase verification complete: **467 tests pass** (web 271 + db 31 + shared 70 + server 95) — matches documented count. Now let me run a quick lint check.
Clean. Now let me check the plan-alignment gate.
Codebase verification confirmed. Now let me move on to running E2E tests against the live deployment.
E2E tests confirm what the docs describe: 27 pass, 1 skipped (needs backend), 0 fail. Backend unreachable and security headers missing are **deployment-side** gaps (operator responsibility, documented in REMEDIATION_PLAN_ROUND_8/9), not codebase defects. Let me now look for **codebase-level** gaps to fix with TDD. Let me examine key files for actual code issues.
Let me check a few relevant skill briefs for guidance.
Good. Now I have enough planning context. Let me check a few more details before drafting the comprehensive remediation plan.
Now I have enough context. Let me write up the comprehensive Round 15 remediation plan. First, let me draft the plan document.
Good, I have the format. Now let me draft the Round 15 plan and write it.
Now let me re-review the plan against the codebase to validate alignment before executing.
Plan validation: All 6 findings confirmed against codebase. References to `Project-Architecture-Document.md` in SKILL.md lack path prefixes — I'll update those to `docs/Project-Architecture-Document.md` too. Now executing via TDD.
## R15-T1: LoginPage state.from redirect (RED tests first)
Now I understand the test structure. Let me update the test setup to support `state.from`, and add 3 RED tests:
Now add the 3 RED tests at the end of the LoginPage (Slice 6) describe block:
Now run the RED tests to confirm they fail for the right reason:
RED confirmed for F1a. Now implement the GREEN fix:
Now run the LoginPage tests to confirm GREEN:
All 13 LoginPage tests pass (was 10, +3 new). Now run the full web suite + lint + typecheck:
T1 complete: 274 web tests pass (was 271, +3 new). Commit T1:
## R15-T2: NETWORK_ERROR normalization in lib/api.ts (TDD)
Now let me write the RED tests for the network error handling. First, check the existing error tests:
Now I'll find the end of the "error handling" describe block to add the new tests:
Run RED phase:
RED confirmed for all 3 new tests. Now implement GREEN:
Now wrap the top-level fetchFn call with the network-error normalizer. Let me look at the request function context:
Now I'll add a `NETWORK_ERROR_MESSAGE` constant and wrap the top-level fetch + retry-fetch calls.
Now I need to add the `NETWORK_ERROR_MESSAGE` constant. Let me find a good place near the ApiError class:
Now run the api tests for GREEN:
All 35 api tests pass (was 32, +3 new). Run the full web suite + lint + typecheck:
I'll use a runtime-safe approach that doesn't require changing the lib version:
Typecheck clean, 277 web tests pass (was 274 → +3). Now run the full test suite + lint:
Total: 95 + 277 + 31 + 70 = **473 tests** (was 467 → +6 new: 3 LoginPage + 3 api). Commit T2:
## R15-T3: Prod-readiness gate (TDD)
Now write the RED test for `verify-prod-readiness.mjs` first. I'll use Node's built-in test runner pattern that other scripts follow. Let me first check how `verify-production-build.mjs` exits — it doesn't have a test file. Let me follow a simpler approach: write the script as a module that exports pure helpers + a `main()` function, and write a vitest test that imports and tests the helpers.
Let me first write the RED test file using vitest. I'll put the helper tests in `scripts/verify-prod-readiness.test.mjs` and use vitest to run it. But scripts/ is not part of any workspace's test glob — let me check:
I'll write the test using Node's built-in test runner since the existing scripts aren't covered by vitest. Test file first (RED):
Now run the RED test:
RED confirmed (module not found). Now implement the GREEN script:
All 14 tests pass. Now add the npm script and verify the actual script runs (skip mode + live mode):
Now verify the script actually works in both skip and live modes:
The gate fails (exit code is reported as 0 here due to the shell's `&&` after a process.exit(1) — npm run captures it but the shell continues). Let me verify the script returns 1:
Exit code 1 as expected. The script correctly fails when the deployment gaps are present. Now run lint + typecheck:
Need to remove the unused `join` import:
Lint clean, tests pass. Commit T3:
## R15-T4: Reconcile docs/Project-Architecture-Document.md, delete root duplicate
Now add a guard to `verify-plan-alignment.mjs` so the root duplicate doesn't sneak back:
I'll add a new section to verify-plan-alignment.mjs that asserts the root PAD doesn't exist:
Now add the actual check at the end of the script:
Let me also test the new check by temporarily re-creating the file:
Guard works correctly — fails when the root duplicate exists. (The `EXIT=0` from the shell is because of the `; rm` after, but the script itself exits 1.) Now run lint + final verify:
## R15-T5: Backfill worklog Round 11-14 entries
## R15-T6: Annotate Sentry phases in REMEDIATION_PLAN.md
## R15-T7: Update AGENTS.md, CLAUDE.md, README.md, reddit-clone_SKILL.md with Round 15 banners
Let me update each doc in parallel. First, AGENTS.md:
Now update the test-count references and pre-commit checklist in AGENTS.md:
Now update the pre-commit checklist test counts and opt-in checks in AGENTS.md:
Now update the test-count reference in AGENTS.md (line 374 mentions 467 total):
Now CLAUDE.md updates:
Now update CLAUDE.md test counts and pre-commit checklist:
Update the test-count breakdown blockquote in CLAUDE.md:
Also update the file-organization comment in CLAUDE.md that says `@embers/web (React SPA, Vite, 271 tests)`:
Now README.md updates:
Now update the test-status table in README.md to reflect 277 web tests + 473 total:
Update README quick-start verification line + repo layout tree comment (says `271 tests`):
Update the Quality Gates bash comment in README.md ("# 467 vitest tests"):
Now also update the README "How to verify the live deployment" section to mention the new prod-readiness gate:
Now update the README Documentation Map table to point at the new Round 15 plan + clarify canonical PAD location:
Also update the README's Project-Architecture-Document row to clarify it's the canonical location:
Now update the SKILL.md with Round 15 banner + fix the root-PAD path references:
Now fix the 3 root-PAD references in SKILL.md to point at docs/:
Now let me also add a Round 15 entry to the round-history audit trail at the end of the SKILL.md. Let me check the end of the file:
Now also add R15 lessons to the Lessons Learnt section. Let me check where they belong:
Now run the full pre-commit checklist to verify everything still passes:
All gates pass. Commit T7:
## R15-T8: Append Round 15 worklog entry
## R15-T9: Final verification + git push
All gates green. Now also run the build + e2e checks:
All checks green. Now set up SSH key + push:
Remote is HTTPS. Need to convert to SSH per the skill instructions:
**Push successful!** Let me verify:
All 8 commits pushed to `origin/main` on GitHub. Let me finalize the todo list:
Round 15 is complete and pushed to `main` on GitHub. Here's a summary of what was delivered:

## Summary

**8 commits pushed to `nordeim/reddit-clone` main branch** (commit `970e2e1` → `94b1f9e`), all on `main` (no branches created):

| # | Commit | Finding | What |
|---|--------|---------|------|
| 1 | `e80bdf9` | F1 | `LoginPage` now redirects to `state.from` after login, with open-redirect guard. +3 TDD tests. |
| 2 | `5c50989` | F2 | `lib/api.ts` normalizes network errors to `ApiError(0, "NETWORK_ERROR", …, cause)` (ES2022 `Error.cause`). +3 TDD tests. |
| 3 | `82cab1c` | F3 | New `scripts/verify-prod-readiness.mjs` strict gate + 14 `node:test` unit tests. |
| 4 | `0b1484a` | F4 | Synced `docs/Project-Architecture-Document.md` with root, deleted root duplicate, extended `verify-plan-alignment.mjs` to enforce absence. |
| 5 | `b15d02c` | F5 | Backfilled worklog entries for Rounds 11–14. |
| 6 | `538ad2a` | F6 | Annotated Sentry phases 5.4/5.5 in `REMEDIATION_PLAN.md` as "Deferred indefinitely (operator decision)". |
| 7 | `c95ba83` | T7 | Updated AGENTS/CLAUDE/README/SKILL.md with Round 15 banners + test-count updates (467→473) + new opt-in checks + 3 new Lessons. |
| 8 | `94b1f9e` | T8 | Appended Round 15 worklog entry. |

**Verification:** 473 vitest pass (web 277 + db 31 + shared 70 + server 95), 14 `node --test` pass, lint clean, typecheck clean, all gates green (plan-alignment, no-secrets, gitignore, ci-config, prod-readiness unit tests, production build), live E2E 27/28 pass (1 skip needs backend).

**Note on live deployment gaps:** LIVE-CRIT-2 (backend unreachable), LIVE-CRIT-3 (security headers), LIVE-CRIT-4 (501 on login) remain operator-side. The new `npm run test:prod-readiness` gate now surfaces them clearly (exit 1 with a summary table). Next step for the operator: start the Fastify backend + configure the reverse proxy to route `/api/*` and `/health` to port 5000, add the 5 security headers at the CDN, then re-run `npm run test:prod-readiness` until it goes green.

---

https://chat.z.ai/s/609f62b0-6052-476d-afe7-d4156ea614c9 
