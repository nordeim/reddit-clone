import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for the embers backend E2E smoke suite.
 *
 * The tests run against a real Fastify server started by the `webServer`
 * config below. The server uses a fresh in-memory SQLite database, so each
 * CI run starts from a clean slate.
 *
 * Tests live in `e2e/*.spec.ts`. Run with `npx playwright test`.
 */

const PORT = process.env.PORT || "4000";
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // R8.3: live-deployment audit is opt-in (run via `npm run test:e2e:live`
  // with LIVE_BASE_URL set). Exclude it from the default `npm run test:e2e`
  // gate so it doesn't add 12 always-skipped tests to every CI run.
  testIgnore: /live\.spec\.ts|repro_r10_postpage\.spec\.ts/,
  fullyParallel: false, // sequential — single in-memory DB shared across tests
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // single worker — the server's in-memory DB is not isolated per worker
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  timeout: 30_000,
  expect: { timeout: 5_000 },

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    extraHTTPHeaders: {
      "Content-Type": "application/json",
    },
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    /**
     * Start the Fastify server with a pre-seeded in-memory DB.
     *
     * `e2e/start-server.ts` opens a fresh file-based SQLite DB at
     * /tmp/embers-e2e.db, runs migrations + the seed script (49 users,
     * 18 communities, 320 posts), then starts the server reusing the
     * same DB handle. NODE_ENV=test so rate-limiting is auto-disabled.
     *
     * Wait for /health to return 200 before running tests; kill the process
     * after the suite finishes.
     */
    command: "npx tsx e2e/start-server.ts",
    url: `${BASE_URL}/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      NODE_ENV: "test",
      PORT: PORT,
      HOST: "127.0.0.1",
      // File-based DB so the seed script and the server can share it.
      // (In-memory DBs in better-sqlite3 are per-connection — separate
      // processes would each get their own empty DB.)
      DATABASE_URL: process.env.E2E_DB_PATH || "/tmp/embers-e2e.db",
      // Test secrets (32+ chars, satisfying loadEnv()'s min-length check).
      JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || "e2e-test-access-secret-32-chars-minimum-length",
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "e2e-test-refresh-secret-32-chars-minimum-length",
      CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
      LOG_LEVEL: "warn",
    },
  },
});
