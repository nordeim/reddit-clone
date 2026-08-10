#!/usr/bin/env bash
# R9.1 — Verify no secret-bearing files are tracked by git.
#
# This script checks that files which should be gitignored (and therefore
# may contain secrets) are NOT tracked by git. It uses `git ls-files` to
# list tracked files and checks for known secret-bearing patterns.
#
# Exit codes:
#   0 — No secret-bearing files are tracked.
#   1 — One or more secret-bearing files are tracked (security incident).
#
# Usage:
#   bash scripts/verify-no-secrets-tracked.sh

set -uo pipefail

cd "$(dirname "$0")/.."

echo "[verify-no-secrets-tracked] Checking for tracked secret-bearing files..."

# Get all tracked files, then filter with a single grep pass.
# Patterns: .env, env.bak, .env.local, any *.env file.
# Then exclude allowed templates (.env.example, .env.local.example).
violations=$(git ls-files | grep -E '^(\.env|env\.bak|\.env\.local)$|\.env$' | grep -vE '^\.env\.(example|local\.example)$' || true)

if [ -z "$violations" ]; then
  echo "[verify-no-secrets-tracked] PASS — no secret-bearing files are tracked."
  exit 0
else
  echo "[verify-no-secrets-tracked] FAIL — secret-bearing file(s) are tracked:" >&2
  echo "$violations" | sed 's/^/  - /' >&2
  echo "" >&2
  echo "To fix: git rm --cached <file>  (then commit)" >&2
  echo "The .gitignore already lists these patterns — the files were force-added." >&2
  exit 1
fi
