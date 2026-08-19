// Node built-in test runner for scripts/verify-prod-readiness.mjs
// Run via: node --test scripts/verify-prod-readiness.test.mjs
//
// Tests the pure helper functions exported from verify-prod-readiness.mjs.
// The script's main() entry (which makes real network calls) is NOT
// tested here — it's exercised via `npm run test:prod-readiness` against
// the live deployment.

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  REQUIRED_SECURITY_HEADERS,
  checkSecurityHeaders,
  checkApiReachable,
  formatSummary,
  parseSkipFlag,
} from "./verify-prod-readiness.mjs";

describe("REQUIRED_SECURITY_HEADERS", () => {
  test("contains the 5 headers required by REMEDIATION_PLAN_ROUND_8", () => {
    assert.deepEqual([...REQUIRED_SECURITY_HEADERS].sort(), [
      "content-security-policy",
      "referrer-policy",
      "strict-transport-security",
      "x-content-type-options",
      "x-frame-options",
    ]);
  });
});

describe("checkSecurityHeaders", () => {
  test("returns all 5 missing when no headers are provided", () => {
    const missing = checkSecurityHeaders({});
    assert.equal(missing.length, 5);
    // Sanity-check a couple of names
    assert.ok(missing.includes("content-security-policy"));
    assert.ok(missing.includes("strict-transport-security"));
  });

  test("returns only the missing ones when some are provided", () => {
    const missing = checkSecurityHeaders({
      "content-security-policy": "default-src 'self'",
      "strict-transport-security": "max-age=31536000",
    });
    assert.equal(missing.length, 3);
    assert.ok(!missing.includes("content-security-policy"));
    assert.ok(!missing.includes("strict-transport-security"));
    assert.ok(missing.includes("x-content-type-options"));
    assert.ok(missing.includes("x-frame-options"));
    assert.ok(missing.includes("referrer-policy"));
  });

  test("returns empty array when all 5 are present", () => {
    const missing = checkSecurityHeaders({
      "content-security-policy": "default-src 'self'",
      "strict-transport-security": "max-age=31536000",
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "referrer-policy": "strict-origin-when-cross-origin",
    });
    assert.deepEqual(missing, []);
  });

  test("header names are case-insensitive (HTTP headers are case-insensitive)", () => {
    const missing = checkSecurityHeaders({
      "Content-Security-Policy": "default-src 'self'",
    });
    assert.ok(!missing.includes("content-security-policy"));
    // The other 4 should still be missing
    assert.equal(missing.length, 4);
  });
});

describe("checkApiReachable", () => {
  test("returns ok=true when status is 200 and content-type is JSON", () => {
    const result = checkApiReachable({
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
    assert.equal(result.ok, true);
    assert.equal(result.reason, undefined);
  });

  test("returns ok=false with reason when status is not 200", () => {
    const result = checkApiReachable({
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
    assert.equal(result.ok, false);
    assert.match(result.reason ?? "", /404/);
  });

  test("returns ok=false with reason when content-type is not JSON", () => {
    const result = checkApiReachable({
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
    assert.equal(result.ok, false);
    assert.match(result.reason ?? "", /content-type/i);
  });

  test("returns ok=false with reason 'network error' when fetch throws", () => {
    const result = checkApiReachable(new TypeError("Failed to fetch"));
    assert.equal(result.ok, false);
    assert.match(result.reason ?? "", /network/i);
  });
});

describe("formatSummary", () => {
  test("returns an all-pass message when all probes succeeded", () => {
    const summary = formatSummary({
      baseUrl: "https://example.com/",
      api: [
        { name: "GET /health", ok: true, status: 200, contentType: "application/json" },
        { name: "GET /api/posts", ok: true, status: 200, contentType: "application/json" },
      ],
      security: {
        missing: [],
      },
    });
    assert.match(summary, /pass/i);
    assert.match(summary, /2\/2/i);
    assert.match(summary, /0 missing/i);
  });

  test("lists failed probes and missing headers when any failed", () => {
    const summary = formatSummary({
      baseUrl: "https://example.com/",
      api: [
        { name: "GET /health", ok: false, status: 404, contentType: "text/html" },
        { name: "GET /api/posts", ok: true, status: 200, contentType: "application/json" },
      ],
      security: {
        missing: ["content-security-policy", "strict-transport-security"],
      },
    });
    assert.match(summary, /fail/i);
    assert.match(summary, /1\/2/i);
    assert.match(summary, /GET \/health/);
    assert.match(summary, /content-security-policy/);
    assert.match(summary, /strict-transport-security/);
  });
});

describe("parseSkipFlag", () => {
  test("returns true when PROD_READINESS=skip", () => {
    assert.equal(parseSkipFlag({ PROD_READINESS: "skip" }), true);
  });

  test("returns false when PROD_READINESS is unset", () => {
    assert.equal(parseSkipFlag({}), false);
  });

  test("returns false when PROD_READINESS is any other value", () => {
    assert.equal(parseSkipFlag({ PROD_READINESS: "true" }), false);
    assert.equal(parseSkipFlag({ PROD_READINESS: "1" }), false);
    assert.equal(parseSkipFlag({ PROD_READINESS: "" }), false);
  });
});
