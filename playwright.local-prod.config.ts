import { defineConfig } from "@playwright/test";

/**
 * Round 10 — Local prod-build audit config.
 *
 * Runs `e2e/live_extended.spec.ts` against a locally-served production
 * build (default http://localhost:8765/) instead of the live deployment.
 * This lets us verify the Round 10 bug fixes work end-to-end before
 * the operator redeploys.
 *
 * Usage:
 *   cd apps/web && npm run build
 *   python3 -m http.server 8765 --directory apps/web/dist &
 *   PROD_BASE_URL=http://localhost:8765/ npm run test:e2e:local-prod
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: /live_extended\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.PROD_BASE_URL || "http://localhost:8765/",
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
