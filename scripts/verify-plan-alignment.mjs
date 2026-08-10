#!/usr/bin/env node
/**
 * verify-plan-alignment.mjs — Round 10 plan-alignment CI gate.
 *
 * Asserts that `docs/REMEDIATION_PLAN.md` does NOT contain forbidden
 * tokens that contradict the implemented codebase. The audit reports
 * (audit_report_1.md §2.1, audit_report_2.md F1-F4) flagged these
 * drift points:
 *
 *   - "tRPC"             — plan says tRPC, codebase uses REST + Zod (ADR-101)
 *   - "pnpm"             — plan says pnpm, codebase uses npm-workspaces (ADR-107)
 *   - "Turborepo"        — plan says Turborepo, codebase has no Turborepo
 *   - "RS256"            — plan says RS256, codebase uses HS256 via `jose`
 *   - "Asymmetric JWT"   — same as RS256
 *   - "id (UUID)"        — plan says UUID, codebase uses branded string IDs
 *
 * Allowed contexts (NOT flagged):
 *   - "Postgres escape hatch" — the plan legitimately mentions UUIDs as
 *     a Postgres migration note. The allowed context is the literal
 *     phrase "Postgres escape hatch" or "PostgreSQL" near the UUID
 *     reference.
 *
 * Exits 1 with a clear error if any forbidden token is found, 0 if the
 * plan is clean.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const planPath = join(__dirname, "..", "docs", "REMEDIATION_PLAN.md");

const FORBIDDEN_TOKENS = [
  // Audit F1: tRPC vs REST+Zod
  { token: "tRPC", reason: "plan proposes tRPC; codebase uses REST + Zod (ADR-101)" },
  // Audit F2: pnpm/Turborepo vs npm-workspaces
  { token: "pnpm", reason: "plan proposes pnpm; codebase uses npm-workspaces (ADR-107)" },
  { token: "Turborepo", reason: "plan proposes Turborepo; codebase has no Turborepo" },
  // Audit F3: RS256 vs HS256
  // Allowed: lines that explicitly mention HS256 as the chosen algorithm
  // AND reference RS256 only as the alternative ("not RS256", "instead of
  // RS256", "switch to RS256"). The forbidden pattern is specifying RS256
  // as the algorithm to USE.
  {
    token: "RS256",
    reason: "plan specifies RS256; codebase uses HS256 via `jose`",
    allowIfContextMatches: /HS256|symmetric|escape hatch|switch to/i,
  },
  {
    token: "Asymmetric JWT",
    reason: "plan specifies asymmetric JWT; codebase uses symmetric HS256",
    allowIfContextMatches: /symmetric|HS256|avoid/i,
  },
];

// `id (UUID)` is forbidden unless the surrounding context mentions
// "Postgres" or "PostgreSQL" (the escape-hatch note in §5.3).
function isForbiddenUUID(line) {
  if (!/id\s*\(UUID\)|id:\s*UUID/i.test(line)) return false;
  // Allowed: the line is in a Postgres-escape-hatch context.
  return !/postgres|postgresql|escape hatch/i.test(line);
}

try {
  const plan = readFileSync(planPath, "utf8");
  const lines = plan.split("\n");
  const failures = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const { token, reason, allowIfContextMatches } of FORBIDDEN_TOKENS) {
      // Case-insensitive match for "tRPC", "pnpm", "RS256", etc.
      const re = new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      if (re.test(line)) {
        // If the token has an "allowIfContextMatches" regex, skip the
        // failure when the surrounding line contains that context.
        // E.g., "RS256" is allowed on a line that also mentions HS256
        // (because the line is documenting the escape hatch, not
        // specifying RS256 as the algorithm to use).
        if (allowIfContextMatches && allowIfContextMatches.test(line)) {
          continue;
        }
        failures.push({
          line: i + 1,
          content: line.trim().slice(0, 120),
          token,
          reason,
        });
      }
    }
    // UUID check (context-sensitive).
    if (isForbiddenUUID(line)) {
      failures.push({
        line: i + 1,
        content: line.trim().slice(0, 120),
        token: "id (UUID)",
        reason: "plan says UUID; codebase uses branded string IDs (UserId, PostId, etc.) seeded as u1/p1 in dev",
      });
    }
  }

  if (failures.length > 0) {
    console.error(
      `❌ docs/REMEDIATION_PLAN.md contains ${failures.length} forbidden token(s) that contradict the codebase:`
    );
    console.error("");
    for (const f of failures) {
      console.error(`  line ${f.line}: "${f.content}"`);
      console.error(`    forbidden token: ${f.token}`);
      console.error(`    reason: ${f.reason}`);
      console.error("");
    }
    console.error(
      "These tokens cause implementation drift (audit_report_1.md F1-F2, audit_report_2.md F1-F4)."
    );
    console.error(
      "Update docs/REMEDIATION_PLAN.md to reflect the actual stack: REST + Zod, npm-workspaces, HS256, branded string IDs."
    );
    process.exit(1);
  }

  console.log("✅ docs/REMEDIATION_PLAN.md is aligned with the codebase (no forbidden tokens).");
} catch (err) {
  if (err.code === "ENOENT") {
    console.error(`❌ docs/REMEDIATION_PLAN.md not found at ${planPath}`);
    process.exit(1);
  }
  throw err;
}
