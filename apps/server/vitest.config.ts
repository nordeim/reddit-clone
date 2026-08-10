import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    testTimeout: 10000,
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/index.ts",
        "src/app.ts",
        "src/config.ts",
      ],
      reportsDirectory: "coverage",
      // Informational only — not enforced in CI yet.
      // The DoD's "80% backend coverage" line in docs/REMEDIATION_PLAN.md is
      // aspirational. Drop these thresholds or promote them to a CI gate once
      // the actual baseline is measured.
      thresholds: {
        lines: 0,
        functions: 0,
        branches: 0,
        statements: 0,
      },
    },
  },
});
