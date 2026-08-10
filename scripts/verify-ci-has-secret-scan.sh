#!/usr/bin/env bash
# R9.2 — Verify CI workflow has a secret-scanning job.
#
# This script checks that .github/workflows/ci.yml contains a secret-scanning
# step (gitleaks). It catches the case where someone removes the security job
# or replaces gitleaks with a weaker scanner.
#
# Exit codes:
#   0 — CI has a secret-scanning job using gitleaks.
#   1 — CI does NOT have a secret-scanning job.
#
# Usage:
#   bash scripts/verify-ci-has-secret-scan.sh

set -euo pipefail

cd "$(dirname "$0")/.."

CI_FILE=".github/workflows/ci.yml"

echo "[verify-ci-has-secret-scan] Checking $CI_FILE for gitleaks secret-scanning job..."

if [ ! -f "$CI_FILE" ]; then
  echo "[verify-ci-has-secret-scan] FAIL — $CI_FILE does not exist" >&2
  exit 1
fi

# Check for gitleaks reference in the CI file.
if grep -qi "gitleaks" "$CI_FILE"; then
  echo "[verify-ci-has-secret-scan] PASS — gitleaks secret-scanning job found in CI."
  exit 0
else
  echo "[verify-ci-has-secret-scan] FAIL — no gitleaks reference found in $CI_FILE" >&2
  echo "" >&2
  echo "To fix: add a security job to .github/workflows/ci.yml that runs gitleaks/gitleaks-action." >&2
  exit 1
fi
