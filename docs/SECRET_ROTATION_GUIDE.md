# Secret Rotation Guide (R9.6)

**Date:** 2026-08-10
**Incident:** `.env` with real JWT signing secrets was committed to git history (commits `89f1012` and `526a836`) and pushed to GitHub.
**Severity:** Critical
**Status:** Secrets removed from the current commit (R9.1), but **remain in git history**. Secret rotation is mandatory.

---

## 1. What Leaked

The following secrets were committed to the repository in plain text:

| Secret | Value (first 8 chars) | Length | Used for |
|--------|----------------------|--------|----------|
| `JWT_ACCESS_SECRET` | `e8cb1ac6...` | 64 hex chars (32 bytes) | Signing 15-minute JWT access tokens |
| `JWT_REFRESH_SECRET` | `e8cb1ac6...` (same as above) | 64 hex chars (32 bytes) | Signing 7-day JWT refresh tokens |

**Additional concern:** Both secrets were the **same value**. This is a cryptographic weakness -- if one leaks, both are compromised. The rotation below generates two independent secrets.

The `CORS_ORIGIN` value (`http://localhost:5173`) was also committed, but this is not a secret -- it's a public configuration value.

---

## 2. Why Rotation Is Required

1. **The secrets are in the git history on GitHub.** Anyone with read access to the repository can extract them by cloning and running `git log -p -- .env`.
2. **JWT secrets are signing keys, not encryption keys.** An attacker who has the secret can forge valid JWT tokens for any user, bypassing authentication entirely.
3. **The access token TTL is 15 minutes** -- an attacker can generate fresh tokens indefinitely as long as they have the secret.
4. **The refresh token TTL is 7 days** -- forged refresh tokens would allow an attacker to maintain access for up to 7 days per token, and mint new access tokens continuously.
5. **Removing `.env` from the current commit (R9.1) does NOT remove it from history.** The secrets are still in commits `89f1012` and `526a836`, which are part of the `main` branch history.

---

## 3. Step-by-Step Rotation Procedure

### Step 1: Generate new secrets

Run this command **twice** to generate two independent secrets:

```bash
openssl rand -hex 32
# Example output: a1b2c3d4e5f6... (64 hex chars)
```

**Important:** Use a **different** value for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`. Do not reuse the same value (which was the original weakness).

### Step 2: Update the local `.env` file

Edit `.env` (in the repo root -- this file is gitignored and will NOT be committed):

```bash
# .env (local, gitignored)
JWT_ACCESS_SECRET=<paste-first-secret-from-step-1>
JWT_REFRESH_SECRET=<paste-second-secret-from-step-1>
CORS_ORIGIN=https://reddit.jesspete.shop
```

### Step 3: Restart the Fastify backend

```bash
# Stop the current server (if running)
# (use your deployment's stop command, e.g., ./start_production.sh stop)

# Start with the new secrets (they're loaded from .env automatically)
npm run server:start-prod
# OR
./start_production.sh
```

### Step 4: Verify the new secrets are in use

```bash
# The server should start without errors.
# Check the health endpoint:
curl https://reddit.jesspete.shop/health
# Expected: {"status":"ok",...}

# Try logging in with the demo user:
curl -X POST https://reddit.jesspete.shop/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"you","password":"embers-demo"}'
# Expected: {"accessToken":"<new-jwt>","user":{...}}
```

### Step 5: Verify old tokens are invalidated

Any JWT tokens issued before the rotation are now invalid (they were signed with the old secret). Users will be logged out and must log in again. This is expected and correct.

```bash
# An old token (from before rotation) should now return 401:
curl -H "Authorization: Bearer <old-token>" https://reddit.jesspete.shop/api/notifications
# Expected: HTTP 401 Unauthorized
```

---

## 4. Why We Did NOT Rewrite Git History

Rewriting git history (e.g., with `git filter-repo` or BFG Repo-Cleaner) to remove `.env` from all commits is technically possible but was **intentionally not done** in Round 9 because:

1. **Force-push required.** Rewriting history changes commit hashes, which requires a force-push to `main`. This is risky on a shared branch.
2. **Breaks downstream forks.** Anyone who has forked or cloned the repo would have a divergent history after a force-push.
3. **The secrets are already exposed.** Once a secret is pushed to a public GitHub repo, it should be considered compromised regardless of whether the history is rewritten. Rotation is the primary remediation.
4. **GitHub's secret scanning may have already notified GitHub.** If GitHub's built-in secret scanning detected the JWT secrets, it may have already notified the user and/or revoked any GitHub tokens (not applicable here, but relevant for other secret types).

If history rewriting is desired despite the above, the procedure is:

```bash
# Install git-filter-repo (NOT BFG -- filter-repo is the recommended modern tool)
pip install git-filter-repo

# Create a fresh clone (do NOT run this on your working repo)
git clone https://github.com/nordeim/reddit-clone.git reddit-clone-clean
cd reddit-clone-clean

# Remove .env and env.bak from ALL commits
git filter-repo --invert-paths --path .env --path env.bak

# Force-push (DANGEROUS -- coordinate with all contributors first)
git remote set-url origin git@github.com:nordeim/reddit-clone.git
git push --force origin main
```

**This is NOT recommended unless all contributors are aware and have stashed their work.**

---

## 5. Preventing Recurrence

Round 9 added the following guardrails to prevent this from happening again:

1. **`scripts/verify-no-secrets-tracked.sh`** (R9.1) -- checks that no secret-bearing files are tracked by git. Run via `npm run test:no-secrets`.
2. **`scripts/verify-gitignore-enforced.sh`** (R9.3) -- checks that no tracked file matches a `.gitignore` pattern. Run via `npm run test:gitignore`.
3. **`scripts/verify-ci-has-secret-scan.sh`** (R9.2) -- checks that CI has a gitleaks secret-scanning job. Run via `npm run test:ci-config`.
4. **Gitleaks in CI** (R9.2) -- the `security` job in `.github/workflows/ci.yml` runs gitleaks on every push and PR, catching any new secret leaks before they merge.

Add these to the pre-commit checklist:

```bash
npm run test:no-secrets   # R9.1
npm run test:gitignore    # R9.3
npm run test:ci-config    # R9.2
```
