#!/usr/bin/env bash
# R9.3 — Verify no tracked file matches a .gitignore pattern.
#
# This script catches the case where a file was force-added (`git add -f`)
# despite being listed in .gitignore. It uses `git check-ignore` (the
# authoritative source) to determine if a tracked file should be ignored.
#
# Scope: This check is SECURITY-FOCUSED. It checks all tracked files
# against .gitignore, but excludes the `skills/` directory (which is
# intentionally tracked despite being in .gitignore -- see commit 5386de9
# "add skills"). The `skills/` directory contains reference material, not
# secrets. A separate general-purpose gitignore enforcement check can be
# added in a future round if needed.
#
# Exit codes:
#   0 — No tracked file (excluding skills/) is ignored by .gitignore.
#   1 — One or more tracked files match a .gitignore pattern (security/health risk).
#
# Usage:
#   bash scripts/verify-gitignore-enforced.sh

set -uo pipefail

cd "$(dirname "$0")/.."

echo "[verify-gitignore-enforced] Checking that no tracked file is gitignored (excluding skills/)..."

# `git check-ignore` processes multiple files at once via stdin, which is
# far faster than calling it once per file. We pipe `git ls-files` output
# into `git check-ignore --stdin` which prints only the files that ARE ignored.
# Then we exclude the `skills/` directory (intentionally tracked) and
# `packages/db/dev.db` (intentionally tracked development database).
violations=$(git ls-files -z | git check-ignore --stdin --no-index -z 2>/dev/null | tr '\0' '\n' | grep -v '^skills/' | grep -v '^packages/db/dev\.db$' || true)

if [ -z "$violations" ]; then
  echo "[verify-gitignore-enforced] PASS — no tracked file is gitignored (excluding skills/)."
  exit 0
else
  echo "[verify-gitignore-enforced] FAIL — tracked file(s) match a .gitignore pattern:" >&2
  echo "$violations" | sed 's/^/  - /' >&2
  echo "" >&2
  echo "To fix: git rm --cached <file>  (then commit)" >&2
  echo "These files were force-added (git add -f) despite being gitignored." >&2
  exit 1
fi
