import { defineConfig } from "@playwright/test";

/**
 * Round 8 — Live-deployment audit config.
 *
 * Runs e2e/live.spec.ts against a deployed instance. The target URL is
 * taken from `LIVE_BASE_URL` (default: https://reddit.jesspete.shop/).
 *
 * This config is intentionally separate from `playwright.config.ts`:
 *   - `playwright.config.ts` starts a local Fastify server and runs the
 *     API-only smoke + auth suites. It is the default `npm run test:e2e`
 *     gate.
 *   - `playwright.live.config.ts` does NOT start a server. It targets a
 *     pre-deployed URL. It is opt-in via `npm run test:e2e:live`.
 *
 * The suite is skipped automatically when `LIVE_BASE_URL` is not set —
 * see e2e/live.spec.ts for the `test.describe.skip` guard.
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: /live\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
