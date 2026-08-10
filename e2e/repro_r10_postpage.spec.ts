import { test, expect } from "@playwright/test";

/**
 * Regression guard for BUG-R10-2 (Round 10).
 *
 * Originally written as a reproduction harness for the React error #185
 * (Maximum update depth exceeded) that crashed the PostPage on every
 * navigation to /comments/:postId. The fix in `apps/web/src/pages/PostPage.tsx`
 * uses a module-scope stable empty array (`EMPTY_COMMENTS`) so the
 * zustand selector returns a referentially-stable snapshot.
 *
 * This test now asserts the FIX is in place — the post detail page
 * renders the article (post body) without triggering the ErrorBoundary
 * fallback. Run it against a locally-served production build:
 *
 *   PROD_BASE_URL=http://localhost:8765/ npx playwright test \\
 *     --config=playwright.repro.config.ts
 *
 * If this test fails, the regression has reappeared.
 */

const BASE = process.env.PROD_BASE_URL || "http://localhost:8765/";

test("regression: post detail page renders without React error #185", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
  });

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  // Click the first post title link to navigate to /comments/<id>.
  const titleLink = page.locator('a[href^="#/comments/"]').first();
  await expect(titleLink).toBeVisible({ timeout: 10_000 });
  await titleLink.click();

  // Give the PostPage time to render (including the simulated 500ms
  // comment-loading latency).
  await page.waitForTimeout(1500);

  // The post detail page MUST render at least one <article> (the post body).
  const articleCount = await page.locator("article").count();
  expect(articleCount, "post detail page should render an <article>").toBeGreaterThan(0);

  // The ErrorBoundary fallback MUST NOT be visible.
  const body = (await page.textContent("body")) || "";
  expect(body, "ErrorBoundary fallback must not render").not.toMatch(/something went wrong/i);
  expect(body, "React error #185 must not appear").not.toMatch(/minified react error #185/i);
  expect(body, "Maximum update depth must not appear").not.toMatch(/maximum update depth/i);

  // No React max-update-depth errors should have been logged.
  const hasReact185 = errors.some((e) => /185|maximum update depth|getSnapshot should be cached/i.test(e));
  expect(hasReact185, "no React error #185 should be logged").toBe(false);

  console.log(
    `[REGRESSION] post detail rendered ${articleCount} articles, ${errors.length} errors observed`
  );
});

test("control: homepage feed renders articles without crashing", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const articles = page.locator("article");
  await expect(articles.first()).toBeVisible({ timeout: 10_000 });
  const count = await articles.count();
  console.log(`[CONTROL] Homepage articles: ${count}, errors: ${errors.length}`);
  expect(count).toBeGreaterThan(0);
  expect(errors.length, "homepage should not produce pageerror events").toBe(0);
});
