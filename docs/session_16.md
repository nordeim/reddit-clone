I'll start by reading the uploaded instructions file, then set up a task plan.
Let me read the full instructions file:
I've internalized the operating instructions — evidence-backed, TDD-driven, root-cause-focused engineering with strict change management. This is a multi-phase code remediation task with explicit, detailed instructions from the user, so I'll proceed directly.
仓库已成功克隆。现在我来检查一下关键文档。首先，我会寻找 skills 文件夹，并阅读核心文档。
The repo contains a large `skills/` folder. Let me read the key documentation files. Starting with the project manifest and core docs:
The worklog reveals this repo has been through 15 remediation rounds — my task continues that legacy. Let me check document sizes and read the core docs:
The docs are extensive with 15 rounds of history. Let me parallelize: I'll dispatch Explore agents to review the large docs while I read the critical operational files myself.
太好了——已收到三份综合文档审查。现在让我亲自阅读整改计划和技能目录：
现在让我阅读技能目录、第16轮计划和 git-push wrapper 技能：
Round 16 的计划中有未验证的 Phase-E 项目和未检查的 C2。现在让我检查一下 git push wrapper 技能和 SSH 密钥：
I have a complete understanding of the docs and push mechanism. Now let me validate the codebase — install dependencies and run the test suite:
All 485 vitest tests pass (web 281 + server 103 + db 31 + shared 70) — matches docs exactly. Now let me run the remaining quality gates:
All gates green. Let me check skills/ git tracking status and run local E2E tests:
Chromium is already cached. Let me run the local E2E tests:
本地 E2E 测试：18 个通过，16 个自动跳过（需选择性开启的线上测试）——符合文档记录。现在让我针对线上网站运行基于浏览器的 E2E 测试：
16 passed but 11 failed with Chromium crashes (`Error loading V8 startup snapshot file`, `GPU process isn't usable`) — these look environmental, not site bugs. Let me verify with a retry and check the browser setup:
Live E2E now passes 27/28 (1 skip needs backend) — the earlier 11 failures were environmental (broken headless-shell). The live audit still reports **5/5 API probes failed**. Let me do a deeper manual probe of the live site to identify current gaps precisely:
The live site has changed since Round 16 — `/health` and `/api/posts` now return 200 but with `text/html` content-type (suspicious — Fastify would return JSON). Let me examine the actual bodies:
The live site **has been redeployed** with Round 15/16 changes (inline favicon comment present), but it's still NOT the unified Fastify origin — `/health` and `/api/*` GETs return the SPA HTML (SPA-fallback static host), and POST returns 404. Let me verify the deployed bundle behavior in a real browser:
The deployed bundle (539,190 bytes — newer than the documented 537,956) contains the R15 `state.from` redirect. The single `localhost:4000` match is likely the dev-default branch. Let me verify actual login behavior in the browser:
The existing test doesn't assert the specific login error. Let me write an ad-hoc browser probe to characterize the current live behavior precisely:
The live config only matches `live.*\.spec\.ts`. Let me rename the probe file:
**Key live findings (Verified 2026-08-23):**
1. R16 client fixes ARE deployed — login now POSTs same-origin (no more localhost:4000 / "Failed to fetch")
2. Backend still missing: GET `/api/*` + `/health` return **200 with SPA HTML** (SPA-fallback static host), POST returns **404 empty** — LIVE-CRIT-2/4 persist with **changed symptoms** (was: 404 Python HTML / 501)
3. All 5 security headers still missing — LIVE-CRIT-3 persists
4. Login/register surface a raw **"HTTP 404"** error to users — a UX gap worth investigating

Let me examine how the API client constructs that error message:
The error-message construction is clear. Let me check a few more alignment items — the E2E live test count discrepancy and git history for Round 16:
Config landscape is clear: `test:e2e:live` actually runs 28 tests (12+16), not 12 as README's table claims. Let me run the build gate and check the production build:
The production build (539,190 bytes) **exactly matches the live deployed bundle** — confirming the live site runs the current main-branch build. Validation is complete. Now let me consult the repo's own planning skills as the user instructed:
I've internalized the planning skills (vertical slicing, S/M task sizing, RED-GREEN-REFACTOR). Before finalizing the plan, let me perform the plan-item 5.8 audit (OWASP/WCAG scan) to see what real findings exist:
Server hardening is solid. Let me complete the WCAG audit with a keyboard-navigation probe on the live site:
**WCAG audit: PASS** — skip-link, tab order, focus visibility, alt text, headings, keyboard operability all verified on live. The 5.8 audit surfaces are clean. Now let me examine the LoginPage error display to design the "HTTP 404" fix:
I have all the evidence needed. Let me check the default Playwright config's ignore pattern to design my new spec file correctly:
The `live_extended` spec uses a `describeLive` skip guard — my a11y spec will follow the same convention. Let me quickly examine the existing api.test.ts conventions to design the TDD tests:
I now have complete evidence. Let me author the comprehensive Round 17 remediation plan:
Plan created. Now re-validating the plan against the codebase before execution — checking for any callers that string-match the old "HTTP" message:
Plan validated — only `api.ts` produces the message; all consumers render it verbatim. Now executing **Phase A (TDD)** — writing the RED tests first:
Now writing the RED tests (Phase A: A1, A2, A3):
Now let's verify the RED phase — tests must FAIL before implementation:
**RED confirmed** — exactly 6 tests fail (R17-F1c correctly passes already since structured messages win today). Now the GREEN phase — implementing the fix:
Now verify GREEN phase:
GREEN confirmed — 286 web tests pass (281 + 5 new). Total will be 490. Let me update the plan's expected counts and run lint/typecheck:
Now **Phase B** — finalize the a11y spec with the opt-in guard and delete the probe spec:
Now I need to close the describe block and fix indentation for the remaining tests:
Default gate unaffected (18 passed, 19 self-skipped). Now verify the live run with the new a11y suite:
**Live E2E: 30 passed, 1 skipped** — exactly as planned. Phase B complete. Now **Phase C** — backfilling the missing Round 16 worklog entry. Let me examine the Round 16 commits first:
Now writing the Round 16 worklog backfill (Phase C):
Phase C complete. Now **Phase D** — documentation reconciliation. Starting with AGENTS.md:
Now making all AGENTS.md edits (D1):
Let me fix the E2E spec count and check the pre-commit checklist region:
AGENTS.md complete. Now D2 — CLAUDE.md. Reading the key regions:
CLAUDE.md complete. Now D3 — README.md. Reading key regions:
Now making all README.md edits (D3):
README 已基本完成。让我用第 17 轮计划更新文档映射：
README 已完成。现在进行 D4 — reddit-clone_SKILL.md。正在读取关键区域：
Now making all SKILL.md edits (D4):
SKILL.md done (now 14 lessons). Updating the lesson counts in AGENTS.md and README.md to match:
Now D5 — the PAD. Reading the regions needing fixes:
Now making all PAD edits (D5):
Let me fix the remaining PAD items — the api.ts description and the imprecise route paths:
PAD complete. Now D6 — tick plan item 5.8 in REMEDIATION_PLAN.md:
Now updating the Round 17 plan's checkboxes to reflect execution status:
Now **Phase E** — the full verification ledger. Running all gates:
All gates green. Now writing the Round 17 worklog entry (D7) and checking the final change set:
Ticking the Phase E verification ledger in the plan doc, then committing:
Now committing with logical, atomic commits to main:
The Round 17 worklog entry appears truncated. Let me check and fix it:
Both worklog entries were committed together in 57a2154, but the message only describes the Round 16 backfill. Since nothing is pushed yet, let me amend that commit message for accuracy:
Commit stack rebuilt cleanly. Final sanity check on the exact tree that will be pushed:
All 490 tests pass on the final tree. Now the final step — push via the SSH wrapper. Following the skill's procedure:
**Round 17 complete — all 5 commits pushed to `main` (`864c9f7..c1064c1`), verified in sync with origin.**

## What was done

**Validation** — Cloned the repo, reviewed all 5 docs (via parallel review agents + direct reads), and validated against the codebase: 485 vitest, lint/typecheck, and all 8 CI gates passed exactly as documented.

**Live E2E audit (browser-based)** — Key findings:
- The operator **redeployed with the R15/16 fixes** (live bundle = 539,190 B = exact fresh build; login now POSTs same-origin)
- **LIVE-CRIT-2/3/4 persist with changed symptoms**: the origin is now a static host with SPA fallback — `GET /api/*` + `/health` return 200 SPA HTML, POST returns empty 404, all 5 security headers absent
- **New UX bug found**: login/register showed raw `"HTTP 404"` errors

**Remediation (TDD)** — Authored `docs/REMEDIATION_PLAN_ROUND_17.md` (6 findings, re-validated against code), then executed:
- **F1**: `unexpectedResponseMessage()` friendly fallback in `api.ts` — RED (6 failing tests) → GREEN (web 281→286)
- **F2**: New permanent `e2e/live_a11y_r17.spec.ts` (3 WCAG tests); live suite now 31 tests, 30 pass + 1 skip
- **5.8 executed**: OWASP Top 10 audit PASS + WCAG 2.2 AA audit PASS (both with evidence) — ticked in the master plan
- **F3–F6**: Round 16 worklog backfill + full doc reconciliation (~20 stale claims fixed across AGENTS/CLAUDE/README/SKILL/PAD)

**Final state**: 490 vitest + 18 local E2E + 31 live E2E + 14 node:test, all green.

## Suggested next steps
1. **Operator action**: repoint the live origin at Fastify (`./start_production.sh` or `docker compose up` with `STATIC_DIR`) — this closes LIVE-CRIT-2/3/4, the last open gaps
2. **B17 decision**: BrowserRouter/single-file removal still awaits your explicit confirmation (per ADR-003/004)
3. Once the backend is live, the deferred B19–B22 (React Query hybrid data strategy) becomes the next major round
