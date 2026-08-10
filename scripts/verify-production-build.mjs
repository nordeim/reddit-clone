#!/usr/bin/env node
/**
 * R8.4 — Production-build verification.
 *
 * Builds the @embers/web workspace and asserts that the resulting
 * `dist/index.html` is a production build, not a Vite dev-server
 * output. This catches the LIVE-CRIT-1 regression (deploying a dev
 * build to production) at CI time rather than at audit time.
 *
 * Checks:
 *   1. `apps/web/dist/index.html` exists after `npm run build`.
 *   2. The file does NOT contain Vite dev-only modules:
 *      - `/@react-refresh`
 *      - `/@vite/client`
 *      - `import.meta.hot`
 *   3. The file is larger than 100 KB (the singlefile plugin inlines
 *      all JS + CSS into one HTML file; a dev build would be much
 *      smaller because it loads modules separately).
 *
 * Exit codes:
 *   0 — production build is valid.
 *   1 — production build is missing or contains dev-only modules.
 *
 * Usage:
 *   node scripts/verify-production-build.mjs
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const DIST_HTML = join(REPO_ROOT, "apps/web/dist/index.html");

const MIN_SIZE_BYTES = 100 * 1024; // 100 KB

const FORBIDDEN_SUBSTRINGS = [
  "/@react-refresh",
  "/@vite/client",
  "import.meta.hot",
];

function log(msg) {
  console.log(`[verify-production-build] ${msg}`);
}

function fail(msg) {
  console.error(`[verify-production-build] FAIL: ${msg}`);
  process.exit(1);
}

// 1. Build the web workspace.
log("Building @embers/web…");
try {
  execSync("npm run build --workspace @embers/web", {
    cwd: REPO_ROOT,
    stdio: "inherit",
    env: { ...process.env },
  });
} catch (err) {
  fail(`npm run build --workspace @embers/web failed: ${err.message}`);
}

// 2. Verify dist/index.html exists.
if (!existsSync(DIST_HTML)) {
  fail(`expected build output not found: ${DIST_HTML}`);
}
log(`  built: ${DIST_HTML}`);

// 3. Read the file and check for forbidden dev-only substrings.
const html = readFileSync(DIST_HTML, "utf8");
const found = FORBIDDEN_SUBSTRINGS.filter((s) => html.includes(s));
if (found.length > 0) {
  fail(
    "production build contains Vite dev-only modules: " +
      found.join(", ") +
      ". This means `npm run build` did not produce a production bundle. " +
      "Check apps/web/vite.config.ts — the singlefile plugin should be active " +
      "and `vite build` (not `vite dev`) should be invoked.",
  );
}
log("  no Vite dev-only modules found in the built HTML.");

// 4. Verify the file is large enough to be a real production bundle.
const sizeBytes = Buffer.byteLength(html, "utf8");
if (sizeBytes < MIN_SIZE_BYTES) {
  fail(
    `production build is suspiciously small: ${sizeBytes} bytes (expected >= ${MIN_SIZE_BYTES}). ` +
      "This suggests the singlefile plugin did not inline the JS/CSS.",
  );
}
log(`  size: ${(sizeBytes / 1024).toFixed(1)} KB (>= ${(MIN_SIZE_BYTES / 1024).toFixed(0)} KB required).`);

log("PASS — production build is valid.");
process.exit(0);
