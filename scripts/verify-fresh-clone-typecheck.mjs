#!/usr/bin/env node
/**
 * R8.1 — Fresh-clone typecheck verification.
 *
 * Simulates a fresh clone by removing all generated `dist/` directories,
 * then runs `npm run typecheck`. The typecheck MUST succeed without
 * manually running `npm run build` first — the root `package.json`'s
 * `pretypecheck` script is responsible for building `@embers/shared` +
 * `@embers/db` (whose generated type declarations `@embers/server`
 * imports) before invoking `tsc --noEmit` on each workspace.
 *
 * Exit codes:
 *   0 — typecheck passed on the simulated fresh clone.
 *   1 — typecheck failed (either the pretypecheck hook is missing or
 *       a real type error exists).
 *
 * Usage:
 *   node scripts/verify-fresh-clone-typecheck.mjs
 */

import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");

const DIST_DIRS = [
  "packages/shared/dist",
  "packages/db/dist",
  "apps/server/dist",
  "apps/web/dist",
];

function log(msg) {
  console.log(`[verify-fresh-clone-typecheck] ${msg}`);
}

function fail(msg) {
  console.error(`[verify-fresh-clone-typecheck] FAIL: ${msg}`);
  process.exit(1);
}

// 1. Remove all generated dist/ directories to simulate a fresh clone.
log("Removing generated dist/ directories to simulate a fresh clone…");
for (const dir of DIST_DIRS) {
  const fullPath = join(REPO_ROOT, dir);
  if (existsSync(fullPath)) {
    rmSync(fullPath, { recursive: true, force: true });
    log(`  removed ${dir}`);
  } else {
    log(`  (already absent) ${dir}`);
  }
}

// 2. Verify that the root package.json has a `pretypecheck` script.
//    Without it, `npm run typecheck` will fail on a fresh clone because
//    @embers/server's typecheck imports types from @embers/db and
//    @embers/shared which haven't been built yet.
log("Verifying root package.json has a `pretypecheck` script…");
const pkgJsonPath = join(REPO_ROOT, "package.json");
const pkgJson = JSON.parse(await readFile(pkgJsonPath, "utf8"));
if (!pkgJson.scripts || !pkgJson.scripts.pretypecheck) {
  fail(
    "root package.json is missing a `pretypecheck` script. " +
      "Add: \"pretypecheck\": \"npm run build --workspace @embers/shared && npm run build --workspace @embers/db\"",
  );
}
log(`  pretypecheck = ${pkgJson.scripts.pretypecheck}`);

// 3. Run `npm run typecheck` and assert exit code 0.
log("Running `npm run typecheck` (this will trigger pretypecheck)…");
try {
  execSync("npm run typecheck", {
    cwd: REPO_ROOT,
    stdio: "inherit",
    env: { ...process.env },
  });
} catch (err) {
  fail(
    "typecheck failed on a simulated fresh clone. " +
      "Either the pretypecheck script is broken or there is a real type error. " +
      `Error: ${err.message}`,
  );
}

log("PASS — typecheck succeeds on a simulated fresh clone.");
process.exit(0);
