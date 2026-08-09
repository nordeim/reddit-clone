I have enough context from the system prompt. Let me now set up the workspace, clone the repo, and start the workflow.
Let me set up the workflow with a TODO list and start cloning the repo.
Now let me read the IMPLEMENTATION_PLAN.md and skills catalog.
Let me now read the IMPLEMENTATION_PLAN.md (3464 lines). I'll dispatch a subagent to read it in parallel with examining the source code.
Now I have a clear picture of the IMPLEMENTATION_PLAN.md. The plan proposes a **complete feature-sliced rewrite** with dual stores, repositories layer, etc. But its own precedence rules say existing codebase conventions take precedence. Let me audit the existing source code to validate each claim and identify feasible enhancements that don't break conventions.
Now I have a comprehensive view of the codebase. Let me check the git history and confirm the baseline (tsc + build status).
Baseline confirmed: tsc clean, build succeeds. Let me quickly check a few of the most relevant skill files for our remediation plan.
I have enough context. Now let me consolidate findings into a comprehensive remediation plan. First, let me update the TODO and write the plan document.
Now I'll write the comprehensive remediation plan document. Based on my audit, the IMPLEMENTATION_PLAN.md proposes a full feature-sliced rewrite that **conflicts** with the existing codebase's conventions (single-store overlay, flat `data/`, HashRouter+singlefile). The plan itself says existing conventions take precedence, so the remediation must be **additive**, not a rewrite.
Now executing Phase R1 — Test infrastructure. I'll install Vitest + Testing Library and write the sanity test first (RED), then implement.
Now add test scripts to package.json and configure Vitest in vite.config.ts:
Now create the test setup file and a sanity test (RED):
Now write the sanity test (RED):
Phase R1 complete — Vitest + RTL + jsdom working, sanity test passes. Also need to update tsconfig so vitest globals type-check:
The vitest/vite version mismatch causes a tsc error. The cleanest fix is to keep `defineConfig` from `vite` and use a triple-slash reference for vitest types:
The triple-slash isn't merging types. Splitting into a separate `vitest.config.ts` is the officially recommended approach:
Phase R1 complete: tsc ✅, test ✅, build ✅. Now Phase R2 — utility tests (format, random) and the `timeAgo(now?)` enhancement.
RED achieved. Now implement GREEN — add `now?` parameter to `timeAgo`, and adjust the `999_999` test case to match the characterization behavior:
Now write the random.ts characterization tests:
Phase R2 done. Now Phase R3 — extract score utilities into `src/utils/score.ts`:
I miscalculated the expected hot-sort order. Let me fix the test (the implementation is correct — p4 with 200 score at 5h beats p1 with 50 score at 1h):
Now wire `data/posts.ts` to use the new `utils/score.ts` (so the existing exports still work and the codebase stops duplicating the algorithm):
Phase R3 complete. Now Phase R4 — search utilities:
Bug in my normalizer — punctuation replacement leaves trailing space. Fix:
Now wire `SearchBar` and `SearchPage` to use the new search utilities:
Phase R4 complete. Now Phase R5 — URL validation utility:
Now wire `CreatePostModal` to use `isSafeUrl` + `extractDomain` (and harden validation — Phase R13's validation requirements can be merged here for efficiency):
Phases R4, R5, R13 done. Now Phase R6 — storage safety + schema version:
Now fix `mergePersistedState` to return current unchanged when persisted is null/corrupt:
All 127 tests pass. Now wire the store to use the new storage helpers:
Phase R6 complete. Now Phase R7 — selectors + Phase R8 — theme bootstrap. I'll do both in parallel since they're independent.
Now wire `NotificationsPanel`, `VoteControl`, and `Navbar` to use the new selectors:
Now update `VoteControl` to use `getVisibleScore` and add context-aware aria-labels:
Now update CommentThread to pass `label="comment"`:
Now Phase R8 — theme bootstrap (no flash on reload). I'll extract a testable function and add the inline script to `index.html`:
Now add the bootstrap script to `index.html`:
Phase R7 + R8 done. Now Phase R9 (Modal a11y) and R10 (Dropdown a11y) and R12 (MotionConfig) and R11 (skip link + global focus). I'll create a focus trap hook first:
Now update Modal to add focus trap, Escape close, scroll lock:
Now Phase R10 — Dropdown a11y (aria-expanded, aria-haspopup, Escape, arrow keys):
Now Phase R11 (skip link + global focus + reduced motion) + R12 (MotionConfig). I'll do these together since they all touch global CSS / App / AppShell:
Now update App.tsx for MotionConfig (Phase R12) and AppShell for skip link (Phase R11):
Now AppShell skip link + ErrorBoundary:
Now create the ErrorBoundary (Phase R23):
Tailwind v4 doesn't support `theme(--color-orange.500)` syntax. Use CSS variables directly:
Build succeeds. Now let me run all gates and proceed to remaining phases:
Now Phase R14 — CommentComposer improvements (Cmd+Enter, char counter):
Now Phase R15 — SearchBar keyboard nav + Escape + race fix:
Now Phase R16 — Notifications page tabs + per-item mark-read + target safety:
Now Phase R17 — Navbar bell badge cap. And Phase R18 — URL sort sync for HomePage and CommunityPage. And Phase R19 — Post not-found state. Let me do these in batch:
Now Phase R18 — URL sort sync for HomePage and CommunityPage:
Now Phase R19 — Post detail not-found state + Phase R20 (image BASE_URL + onError) + Phase R22 (PostList a11y) + Phase R24 (max depth reply disable) + Phase R21 (PostCard memo). Let me do these in batch:
Now Phase R20 — image BASE_URL helper. Update `data/images.ts`:
Now Phase R22 — PostList a11y (role=status + aria-live):
Now Phase R24 — CommentThread max-depth reply disable + Phase R21 — PostCard memo:
Now Phase R21 — PostCard memo + onError fallback:
Now Phase R25 — comment count consistency. Update `data/posts.ts` to derive `commentCount` from actual generated tree:
Need a `vite-env.d.ts` for Vite's `import.meta.env` types:
All gates pass. Now write integration tests for VoteControl and CreatePostModal to satisfy Phase R13's test requirement:
Now write CreatePostModal integration tests:
The submit button is `disabled` when URL is invalid, so the click never fires `setShowErrors`. Let me change to always enable the button but block submission with error display:
Now update the URL error display logic + change button disabled behavior:
Now update the failing test:
All 176 tests pass. Let me also run tsc + build to confirm:
All 176 tests pass, tsc clean, build succeeds. Let me update the TODO and proceed with documentation:
Now Phase R26 — documentation updates. Let me update AGENTS.md, CLAUDE.md, README.md, and PAD in parallel via a subagent for efficiency. But first, since I have full context, I'll do these myself for accuracy. Starting with AGENTS.md:
Now update the State section to mention schemaVersion + merge + theme bootstrap + selectors + error boundary:
Now update CLAUDE.md commands and add a Testing section:
Now update the "No test runner" line and add a Testing section + State Management section:
Now add a Testing section to CLAUDE.md and update the State Management section:
Now update README.md to mention testing:
Now update the tech stack table to include testing libraries:
Now update README's file hierarchy to add new files:
Now update the Project-Architecture-Document.md (PAD) — specifically §7 (Testing Strategy), §8 (Build), §10 (Known Issues), and add an ADR for the remediation. Let me make focused edits:
Now update §8 Build & Deployment commands + §10 Known Issues:
Now update §9.2 Common Commands and §10 Known Issues:
Now create the MANUAL_QA.md (plan §16.3):
Now run final verification:
All gates green: 176 tests pass, tsc clean, build succeeds. Now Phase R28 — git commit + push. First clean dist/ (per AGENTS.md):
Now let me commit all changes. Per the plan, I'll use atomic commits grouped by phase. First, set up the SSH key + wrapper script. Let me check the wrapper script:
Good, I have the full procedure. Let me set up the SSH key + wrapper:
Paramiko is now installed in the venv python. Now set up the SSH key:
Now switch the remote to SSH URL and check git config:
Good — git is configured. Now I'll commit all changes as a series of atomic commits. Let me stage them by phase:
10 atomic commits ready. All gates green. Now push using the SSH wrapper:
Push successful. Let me verify:
`## main...origin/main` with no "ahead" or "behind" — push is fully synced.
All done. Here's what I accomplished:

## Summary

**Workflow executed end-to-end**: cloned `nordeim/reddit-clone`, reviewed `AGENTS.md` / `CLAUDE.md` / `README.md` / `docs/Project-Architecture-Document.md` / `docs/IMPLEMENTATION_PLAN.md` / `skills/skills-catalog.md`, audited every claim in the 3,464-line plan against the actual codebase, then wrote a validated `docs/REMEDIATION_PLAN.md` that adopts ~30 additive enhancements while explicitly rejecting 11 plan items that would break locked conventions (single-file build, HashRouter, single-store overlay, flat directory layout, PAGE_SIZE=8, max comment depth 4, ID conventions, color tokens).

**TDD remediation (10 atomic commits on `main`)**: Vitest + Testing Library + jsdom harness; 176 tests across 11 files covering pure utilities (format, random, score, search, url), store (storage safety, selectors, theme bootstrap), and integration (VoteControl, CreatePostModal); schema-versioned persisted state with shape validation; synchronous theme bootstrap (no flash); Modal focus trap + Escape + scroll lock; Dropdown aria-expanded + arrow keys; skip link + global focus styles + reduced-motion `MotionConfig`; URL `?sort=` / `?tab=` / `?filter=` sync; hardened Create Post validation (rejects `javascript:` / `data:` URLs); SearchBar keyboard nav + race-fix; Notifications page tabs + target safety; `capBadgeCount("9+")`; `ErrorBoundary` around router outlet; comment count consistency fix; image `BASE_URL` + `onError` fallback; reply disabled at max depth; PostCard `React.memo`. All gates green: `tsc` clean, 176/176 tests pass, `vite build` succeeds.

**Documentation updated**: AGENTS.md, CLAUDE.md, README.md, PAD §7/§8/§9/§10 rewritten with new commands, test layout, and a resolution ledger; new `docs/MANUAL_QA.md` matrix.

**Push**: 10 atomic commits pushed to `origin/main` via the SSH wrapper script + the attached SSH key (`87656ca..5b57db0`).

**Next steps for you**: smoke-test in the browser (`npm run dev`) against `docs/MANUAL_QA.md`; consider adding ESLint + Prettier (still listed as open in PAD §10); if you later change the persisted state shape, bump `SCHEMA_VERSION` in `src/store/storage.ts` and add a `migrate` branch in `store.ts`.

---

https://chat.z.ai/s/034a8849-96b2-4fdc-aa48-f895c8dc6e8e 
