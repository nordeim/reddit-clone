import { defineConfig } from "@playwright/test";

/**
 * Round 10 reproduction config — runs against an already-served
 * production build (default http://localhost:8765/) without starting
 * any local server. Used to reproduce the React error #185 reported
 * by the live E2E audit.
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: /repro_r10_postpage\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.PROD_BASE_URL || "http://localhost:8765/",
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
