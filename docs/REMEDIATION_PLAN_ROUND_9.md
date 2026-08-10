# Round 9 — Secret Leak Remediation, CI Hardening, and Doc Alignment

**Date:** 2026-08-10
**Status:** Planned, in execution
**Scope:** Round 9 is a **security incident response + CI hardening + doc alignment** round. It was triggered by discovering that `.env` (containing real JWT signing secrets) was committed to git history and pushed to GitHub, and that the README "Live Deployment" section had gone stale (LIVE-CRIT-1 was fixed but the docs still said it was broken).

**Companion documents:**
- `docs/REMEDIATION_PLAN.md` — Master plan (B0–B24 backlog)
- `docs/REMEDIATION_PLAN_ROUND_8.md` — Round 8 (live-deployment audit + hardening)
- `docs/session_6.md` — Session 6 worklog (production scripts, dotenv, .env templates)
- `skills/skills-catalog.md` — Relevant skills: `security-and-hardening`, `trustskill`, `ci-cd-and-automation`, `code-quality-standards`

---

## 1. Trigger — Why Round 9 Exists

Round 9 exists because three issues were discovered during the post-session-6 validation:

### 1.1 CRITICAL SECURITY INCIDENT — `.env` with real secrets committed to git

**What happened:** In commits `89f1012` ("add .env") and `526a836` ("add prod start script"), the file `.env` was added to the repository. This file contains:
- `JWT_ACCESS_SECRET=e8cb1ac64de7d967577eccfa3c5ea8d249efac1f6f7c7a419bbb55f1f98cb1d1` (64 hex chars = 32 bytes)
- `JWT_REFRESH_SECRET=e8cb1ac64de7d967577eccfa3c5ea8d249efac1f6f7c7a419bbb55f1f98cb1d1` (same value — both secrets are identical, which is itself a cryptographic weakness)
- `CORS_ORIGIN=http://localhost:5173`

**Why this is critical:**
1. The secrets are in the git history on GitHub (public repo). Anyone with read access can extract them.
2. The JWT secrets are used to sign access tokens (15m TTL) and refresh tokens (7d TTL). An attacker who has the secret can forge tokens for any user.
3. Both secrets are the **same value** — if one leaks, both are compromised.
4. The `.gitignore` file already had `.env` listed (line 27), but `git add -f` (or `git add .` before the `.gitignore` rule was effective) bypassed the ignore.
5. `env.bak` (a backup of `.env`) was also committed in commit `526a836`.

**Evidence:**
```
$ git ls-files | grep -E '^\.env$|^env\.bak$'
.env
env.bak

$ git log --oneline -- .env
526a836 add prod start script
89f1012 add .env

$ grep '^JWT_ACCESS_SECRET=' .env | awk -F= '{print length($2)}'
64
```

### 1.2 DOC STALENESS — README "Live Deployment" section

The README "Live Deployment" section (lines 313–323) still says LIVE-CRIT-1 is unfixed:
> "LIVE-CRIT-1 | Critical | The live site serves the Vite **dev server**, not a production build..."

But the live audit on 2026-08-10 shows LIVE-CRIT-1 is **FIXED**:
- Homepage now returns 537,741 bytes (a real production build, not 1,579 bytes dev shell)
- No `/@react-refresh` or `/@vite/client` in the HTML
- The live audit test "homepage returns 200 and serves a built (non-dev) HTML" now PASSES

LIVE-CRIT-2 and LIVE-CRIT-3 are still unfixed.

### 1.3 DOC GAPS — AGENTS.md and CLAUDE.md missing session-6 changes

Session 6 added:
- `dotenv` dependency to `apps/server/package.json`
- `.env` / `.env.local` loading in `apps/server/src/config.ts`
- `server:prod` and `server:start-prod` scripts in root `package.json`
- `.env.example` and `.env.local.example` templates
- `start_production.sh` orchestrator script

None of these are mentioned in `AGENTS.md` or `CLAUDE.md`. The README mentions them (added in session 6), but the other two docs do not.

### 1.4 NO SECRET SCANNING IN CI

The `.github/workflows/ci.yml` workflow runs lint → typecheck → test → build → e2e. It does NOT run any secret-scanning step (e.g., `gitleaks`, `trufflehog`). If `.env` had been added after CI was set up, CI would not have caught it.

---

## 2. Round 9 ToDo List (TDD-Driven)

Each item below follows red → green → refactor.

### R9.1 — Remove `.env` and `env.bak` from git tracking (CRITICAL SECURITY FIX)

**Problem:** `.env` and `env.bak` are tracked by git and contain real secrets.

**Fix:**
1. `git rm --cached .env env.bak` (untrack but keep local files)
2. Verify `.gitignore` already covers them (it does — lines 27–29)
3. Commit the removal with a clear message explaining the security incident
4. **The secrets in git history remain exposed** — Round 9 documents this in the README and recommends the operator rotate the secrets. Full history rewriting (e.g., `git filter-repo`) is out of scope for Round 9 because it would force-push and rewrite commit hashes, breaking any downstream forks. The operator should rotate the JWT secrets as the primary remediation.

**Test (red):** A new `scripts/verify-no-secrets-tracked.sh` that:
1. Runs `git ls-files` and greps for `.env`, `env.bak`, and any file matching `*.env`.
2. Exits 1 if any are tracked, 0 otherwise.

**Files touched:**
- `.env` (untracked)
- `env.bak` (untracked)
- `scripts/verify-no-secrets-tracked.sh` (new)
- `package.json` (add `test:no-secrets` script)

### R9.2 — Add secret-scanning to CI (gitleaks)

**Problem:** CI has no step to catch secret leaks. The `.env` incident would not have been caught by CI.

**Fix:** Add a `security` job to `.github/workflows/ci.yml` that runs `gitleaks` (the industry-standard secret scanner) on every push and PR. Use the official `gitleaks/gitleaks-action` GitHub Action.

**Test (red):** A new `scripts/verify-ci-has-secret-scan.sh` that:
1. Reads `.github/workflows/ci.yml`.
2. Asserts it contains a `security` job with a gitleaks step.
3. Exits 1 if not found, 0 otherwise.

**Files touched:**
- `.github/workflows/ci.yml` (add security job)
- `scripts/verify-ci-has-secret-scan.sh` (new)
- `package.json` (add `test:ci-config` script)

### R9.3 — Add `.gitignore` enforcement check

**Problem:** `.gitignore` rules can be bypassed with `git add -f`. Nothing in CI catches this.

**Fix:** Add a `scripts/verify-gitignore-enforced.sh` that:
1. Reads `.gitignore`.
2. For each pattern in `.gitignore`, checks if any tracked file matches the pattern.
3. Exits 1 if any tracked file matches an ignored pattern, 0 otherwise.

This is a generalization of R9.1 — it catches `.env`, `env.bak`, and any future file that should be ignored but was force-added.

**Test (red):** The script itself is the test. Before R9.1, it would fail on `.env` and `env.bak`. After R9.1, it passes.

**Files touched:**
- `scripts/verify-gitignore-enforced.sh` (new)
- `package.json` (add `test:gitignore` script)

### R9.4 — Update README "Live Deployment" section to reflect current live state

**Problem:** The README "Live Deployment" section (lines 313–323) says LIVE-CRIT-1 is unfixed, but the live audit shows it's now fixed. LIVE-CRIT-2 and LIVE-CRIT-3 are still unfixed.

**Fix:** Update the "Known gaps" table:
- LIVE-CRIT-1: Mark as **FIXED** (2026-08-10) — the live site now serves a production build.
- LIVE-CRIT-2: Still unfixed — all API endpoints return 404/501.
- LIVE-CRIT-3: Still unfixed — no security headers.
- Add LIVE-CRIT-4 (new): `/api/auth/login` returns 501 (Not Implemented) — the backend may be partially deployed but the route is not working. This is a new finding from the Round 9 audit.

**Test (red):** Documentation-only. The "test" is that a reader can follow the README and reproduce the current live state.

**Files touched:**
- `README.md` (update Live Deployment section)

### R9.5 — Update AGENTS.md and CLAUDE.md with session-6 changes (dotenv, server:prod, start_production.sh)

**Problem:** AGENTS.md and CLAUDE.md do not mention:
- `dotenv` dependency and `.env` / `.env.local` loading in `config.ts`
- `server:prod` and `server:start-prod` scripts
- `.env.example` and `.env.local.example` templates
- `start_production.sh` orchestrator
- The security incident (R9.1) and the new CI secret-scan (R9.2)

**Fix:**
- `AGENTS.md`: Add a Round 9 changelog entry. Update the "Commands" table with `server:prod` and `server:start-prod`. Add a "Environment Files" subsection documenting `.env` / `.env.local` / `.env.example`. Update the "Backend Pitfalls" section to mention the dotenv loading. Add a "Security" subsection documenting the R9.1 incident and R9.2 CI scan.
- `CLAUDE.md`: Add a Round 9 banner block. Update the "Pre-commit checklist" with `npm run test:no-secrets` and `npm run test:gitignore`. Update the "Backend" section to mention dotenv. Add a pitfall about not committing `.env`.

**Test (red):** Documentation-only.

**Files touched:**
- `AGENTS.md`
- `CLAUDE.md`

### R9.6 — Add `.env.example` to the `.gitignore` enforcement check + document the secret-rotation requirement

**Problem:** Even after R9.1 removes `.env` from tracking, the secrets remain in git history. The operator must rotate them.

**Fix:**
1. Add a "Secret Rotation Required" section to the README "Live Deployment" section documenting:
   - What secrets leaked (JWT_ACCESS_SECRET, JWT_REFRESH_SECRET — both the same value)
   - Which commits contain them (89f1012, 526a836)
   - How to rotate them (generate new secrets with `openssl rand -hex 32`, update `.env`, restart the server)
   - Why history rewriting is out of scope (would force-push, break forks)
2. Add a `docs/SECRET_ROTATION_GUIDE.md` with step-by-step rotation instructions.

**Test (red):** Documentation-only.

**Files touched:**
- `README.md` (add Secret Rotation Required section)
- `docs/SECRET_ROTATION_GUIDE.md` (new)

---

## 3. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Removing `.env` from tracking breaks local dev for contributors who relied on the tracked file. | Medium | Low | The `.env.example` template is still tracked; contributors run `cp .env.example .env` and fill in their own values. Documented in README. |
| Gitleaks Action requires a GitHub Access Token for private repos; this is a public repo so the default token suffices. | Low | Low | Verified — `gitleaks/gitleaks-action` works on public repos without extra config. |
| The `verify-gitignore-enforced.sh` script has false positives (e.g., a file named `.env.example` matches the `.env` pattern). | Medium | Low | The script uses `git check-ignore` (the authoritative source) rather than pattern matching, so `.env.example` (which is NOT ignored) is correctly excluded. |
| The secret rotation guide is not followed by the operator. | Medium | Critical | The README "Live Deployment" section will have a prominent "SECRET ROTATION REQUIRED" callout. |
| History rewriting is out of scope — the secrets remain in git history. | High | Critical | Documented as a known limitation. The primary remediation is secret rotation, not history rewriting. |

---

## 4. Definition of Done (Round 9)

Round 9 is "Done" when:
1. **Security:** `.env` and `env.bak` are no longer tracked by git. `scripts/verify-no-secrets-tracked.sh` passes. `scripts/verify-gitignore-enforced.sh` passes.
2. **CI:** `.github/workflows/ci.yml` has a `security` job running gitleaks. `scripts/verify-ci-has-secret-scan.sh` passes.
3. **Documentation:** README "Live Deployment" section reflects the current live state (LIVE-CRIT-1 fixed, LIVE-CRIT-2/3 unfixed, LIVE-CRIT-4 new). AGENTS.md and CLAUDE.md mention dotenv, server:prod, server:start-prod, start_production.sh, and the R9.1 security incident. `docs/SECRET_ROTATION_GUIDE.md` exists.
4. **Quality Gates:** `npm run lint` passes. `npm run typecheck` passes. `npm test` passes (453 vitest). `npm run test:e2e` passes (18 local E2E). `npm run test:build` passes. `npm run test:fresh-clone` passes. `npm run test:no-secrets` passes (new). `npm run test:gitignore` passes (new).
5. **Commits:** Each R9.x item is a separate atomic commit. All on `main`. No new branches.
6. **Push:** All commits pushed to `origin/main` via the SSH wrapper.

---

## 4. Out of Scope (Deferred to Round 10+)

- **Rewriting git history to remove `.env` from all commits.** This would require `git filter-repo` and a force-push, which breaks downstream forks and is risky. The primary remediation is secret rotation (documented in R9.6).
- **Re-deploying the live site to fix LIVE-CRIT-2 and LIVE-CRIT-3.** This requires operator access to the hosting provider. Round 9 documents the gaps; the operator fixes them.
- **B17–B22 (deferred frontend integration).** Unchanged.
