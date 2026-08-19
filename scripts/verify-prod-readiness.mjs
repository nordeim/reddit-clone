#!/usr/bin/env node
/**
 * verify-prod-readiness.mjs — Round 15 F3 strict prod-readiness gate.
 *
 * Probes a deployed embers instance and FAILS (exits 1) when any of
 * the LIVE-CRIT-2 / LIVE-CRIT-3 / LIVE-CRIT-4 gaps from
 * `docs/REMEDIATION_PLAN_ROUND_8.md` are detected:
 *
 *   - GET /health must return 200 + JSON.
 *   - GET /api/posts must return 200 + JSON.
 *   - GET /api/communities must return 200 + JSON.
 *   - POST /api/auth/login with demo creds must return 200 + JSON.
 *   - The homepage response must include all 5 required security
 *     headers: content-security-policy, strict-transport-security,
 *     x-content-type-options, x-frame-options, referrer-policy.
 *
 * This gate is OPT-IN. It is excluded from the default `npm test`
 * and `npm run test:e2e` gates (which run the local API-only smoke
 * + auth suites). Operators opt in via:
 *
 *   npm run test:prod-readiness
 *
 * To skip when no live deployment exists (local dev, CI without a
 * deployed instance), set `PROD_READINESS=skip`:
 *
 *   PROD_READINESS=skip npm run test:prod-readiness
 *
 * Default target: https://reddit.jesspete.shop/ (override via
 * `PROD_BASE_URL`).
 *
 * Exit codes:
 *   0 — all probes passed.
 *   1 — one or more probes failed.
 *   0 — skipped (PROD_READINESS=skip).
 *
 * Round 15 F3. Plan: docs/REMEDIATION_PLAN_ROUND_15.md.
 */

import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Pure helpers — exported for unit testing.
// ---------------------------------------------------------------------------

/**
 * The 5 required security headers per REMEDIATION_PLAN_ROUND_8
 * LIVE-CRIT-3. Stored as a Set for O(1) lookup.
 */
export const REQUIRED_SECURITY_HEADERS = new Set([
  "content-security-policy",
  "strict-transport-security",
  "x-content-type-options",
  "x-frame-options",
  "referrer-policy",
]);

/**
 * Check whether a Headers-like object contains all required security
 * headers. Header names are case-insensitive (HTTP semantics).
 *
 * @param {Record<string, string>} headers — lowercase-keyed headers
 *        (the Fetch API normalizes to lowercase).
 * @returns {string[]} — array of MISSING header names (lowercase).
 *          Empty array when all 5 are present.
 */
export function checkSecurityHeaders(headers) {
  // Normalize the input keys to lowercase for case-insensitive
  // comparison. The Fetch API already returns lowercase keys, but
  // this guards against direct test inputs.
  const normalized = {};
  for (const [k, v] of Object.entries(headers ?? {})) {
    normalized[k.toLowerCase()] = v;
  }
  const missing = [];
  for (const required of REQUIRED_SECURITY_HEADERS) {
    if (!(required in normalized)) missing.push(required);
  }
  return missing;
}

/**
 * Inspect a fetch Response (or a fetch error, or a plain fixture for
 * testing) and decide whether the API endpoint was reachable and
 * returned a JSON response.
 *
 * Accepts three input shapes:
 *   1. A `Response` object (with `status` number and `headers.get(k)`
 *      method) — the real fetch result at runtime.
 *   2. An `Error` instance (e.g. `TypeError("Failed to fetch")`) —
 *      thrown by `fetch` when the network is unreachable.
 *   3. A plain test fixture: `{ status: number, headers: Record<string,string> }`
 *      — used by the unit tests in
 *      `scripts/verify-prod-readiness.test.mjs`. The fixture shape
 *      mirrors how the existing `mockFetch` helper in
 *      `apps/web/src/lib/api.test.ts` constructs fixtures.
 *
 * @param {Response | Error | { status: number, headers: Record<string,string> }} resOrErr
 * @returns {{ ok: boolean, reason?: string, status?: number, contentType?: string }}
 */
export function checkApiReachable(resOrErr) {
  if (resOrErr instanceof Error) {
    return {
      ok: false,
      reason: `network error: ${resOrErr.message}`,
    };
  }
  const status = resOrErr.status;
  // Support both Response (with headers.get) and plain fixture objects
  // (with headers as a Record). Normalize to a single lookup.
  let contentType;
  if (typeof resOrErr.headers?.get === "function") {
    contentType = resOrErr.headers.get("content-type") ?? "";
  } else {
    // Plain fixture: case-insensitive lookup.
    const h = resOrErr.headers ?? {};
    const key = Object.keys(h).find(
      (k) => k.toLowerCase() === "content-type"
    );
    contentType = key ? h[key] : "";
  }
  if (status !== 200) {
    return {
      ok: false,
      reason: `expected 200, got ${status}`,
      status,
      contentType,
    };
  }
  if (!contentType.includes("json")) {
    return {
      ok: false,
      reason: `expected JSON content-type, got ${contentType}`,
      status,
      contentType,
    };
  }
  return { ok: true, status, contentType };
}

/**
 * Format the probe summary into a human-readable multi-line string.
 *
 * @param {{
 *   baseUrl: string,
 *   api: Array<{ name: string, ok: boolean, status?: number, contentType?: string, reason?: string }>,
 *   security: { missing: string[] },
 * }} result
 * @returns {string}
 */
export function formatSummary(result) {
  const apiPassed = result.api.filter((p) => p.ok).length;
  const apiTotal = result.api.length;
  const headersMissing = result.security.missing.length;

  const allPassed = apiPassed === apiTotal && headersMissing === 0;
  const header = allPassed
    ? `✅ prod-readiness PASSED — ${apiPassed}/${apiTotal} API probes OK, ${headersMissing} missing security headers`
    : `❌ prod-readiness FAILED — ${apiPassed}/${apiTotal} API probes OK, ${headersMissing} missing security headers`;

  const lines = [header, `Base URL: ${result.baseUrl}`, ""];

  lines.push("API probes:");
  for (const p of result.api) {
    const mark = p.ok ? "✓" : "✗";
    const detail = p.ok
      ? `status=${p.status} ctype=${p.contentType}`
      : `reason=${p.reason}`;
    lines.push(`  ${mark} ${p.name} — ${detail}`);
  }
  lines.push("");

  lines.push("Security headers:");
  if (headersMissing === 0) {
    lines.push("  ✓ all 5 required headers present");
  } else {
    for (const h of result.security.missing) {
      lines.push(`  ✗ missing: ${h}`);
    }
  }

  if (!allPassed) {
    lines.push("");
    lines.push(
      "Remediation: see docs/REMEDIATION_PLAN_ROUND_8.md (LIVE-CRIT-2/3) and docs/REMEDIATION_PLAN_ROUND_9.md (LIVE-CRIT-4)."
    );
  }

  return lines.join("\n");
}

/**
 * Decide whether to skip the suite based on env.
 *
 * @param {NodeJS.ProcessEnv | Record<string, string | undefined>} env
 * @returns {boolean}
 */
export function parseSkipFlag(env) {
  return env.PROD_READINESS === "skip";
}

// ---------------------------------------------------------------------------
// Live probe logic — only runs when invoked as a script.
// ---------------------------------------------------------------------------

async function probeApi(baseUrl, method, path, body) {
  const url = `${baseUrl}${path}`;
  try {
    const opts = { method, headers: {} };
    if (body !== undefined) {
      opts.method = "POST";
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(url, opts);
    return { name: `${method} ${path}`, ...checkApiReachable(res) };
  } catch (err) {
    return {
      name: `${method} ${path}`,
      ...checkApiReachable(err),
    };
  }
}

async function probeSecurityHeaders(baseUrl) {
  try {
    const res = await fetch(baseUrl);
    const headers = {};
    res.headers.forEach((v, k) => {
      headers[k.toLowerCase()] = v;
    });
    return { missing: checkSecurityHeaders(headers) };
  } catch (err) {
    // If we can't even reach the homepage, treat ALL headers as missing
    // so the summary clearly shows the failure.
    return {
      missing: [...REQUIRED_SECURITY_HEADERS],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function main() {
  const env = process.env;
  if (parseSkipFlag(env)) {
    console.log("[prod-readiness] SKIPPED (PROD_READINESS=skip)");
    return 0;
  }

  const baseUrl = env.PROD_BASE_URL ?? "https://reddit.jesspete.shop/";

  console.log(`[prod-readiness] probing ${baseUrl} ...`);

  // Run all probes in parallel for speed.
  const [health, posts, communities, login, security] = await Promise.all([
    probeApi(baseUrl, "GET", "/health"),
    probeApi(baseUrl, "GET", "/api/posts"),
    probeApi(baseUrl, "GET", "/api/communities"),
    probeApi(baseUrl, "POST", "/api/auth/login", {
      username: "you",
      password: "embers-demo",
    }),
    probeSecurityHeaders(baseUrl),
  ]);

  const result = {
    baseUrl,
    api: [health, posts, communities, login],
    security,
  };

  const summary = formatSummary(result);
  console.log(summary);

  const apiPassed = result.api.filter((p) => p.ok).length;
  const apiTotal = result.api.length;
  const headersMissing = result.security.missing.length;
  const allPassed = apiPassed === apiTotal && headersMissing === 0;

  return allPassed ? 0 : 1;
}

// Only run main() when invoked as a script, not when imported by a test.
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  main().then((exitCode) => {
    process.exit(exitCode);
  });
}
