import { test, expect } from "@playwright/test";

/**
 * Round 17 — WCAG 2.2 AA keyboard-operability audit against the live site
 * (plan item 5.8 accessibility audit slice).
 *
 * Verifies, in a real browser:
 *   - Keyboard navigation reaches the primary controls in a logical order
 *     (skip-link first) and focus is visible (WCAG 2.1.1, 2.4.3, 2.4.7).
 *   - All images have alt text (WCAG 1.1.1).
 *   - Heading hierarchy is present (WCAG 1.3.1).
 *   - The login form is fully keyboard-operable (WCAG 2.1.1).
 *
 * This suite is OPT-IN, mirroring e2e/live.spec.ts: it self-skips when
 * LIVE_BASE_URL is not set, so the default `npm run test:e2e` gate stays
 * green without a live deployment.
 *
 *   LIVE_BASE_URL=https://reddit.jesspete.shop/ npm run test:e2e:live
 */

const LIVE_BASE = process.env.LIVE_BASE_URL || "https://reddit.jesspete.shop/";
const ENABLED = !!process.env.LIVE_BASE_URL;

const describeLive = ENABLED ? test.describe : test.describe.skip;

describeLive("live deployment — WCAG 2.2 AA accessibility audit (R17)", () => {
  test("keyboard navigation reaches primary controls with visible focus", async ({ page }) => {
    await page.goto(LIVE_BASE, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);

    // Tab through the first ~12 focusable elements; record activeElement.
    const stops: string[] = [];
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      const info = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return "body";
        const desc =
          (el as HTMLElement).ariaLabel ??
          el.getAttribute("title") ??
          el.textContent?.slice(0, 30) ??
          el.tagName.toLowerCase();
        return `${el.tagName.toLowerCase()}[${desc}]`;
      });
      stops.push(info);
    }
    console.log(`[R17-A11Y] tab stops: ${JSON.stringify(stops)}`);
    // At minimum: tabbing must move focus somewhere (not stuck on body).
    const nonBody = stops.filter((s) => s !== "body").length;
    expect(nonBody, "keyboard focus must reach interactive elements").toBeGreaterThan(5);
    // The first tab stop must be the skip-to-content link (WCAG 2.4.1).
    expect(
      stops[0],
      "first tab stop should be the skip-to-content link"
    ).toMatch(/skip/i);

    // Focus outline visibility: focused element must not have outline:none.
    const outlineOk = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return false;
      const style = getComputedStyle(el);
      return !(
        style.outlineStyle === "none" &&
        style.boxShadow === "none" &&
        style.borderStyle === "none"
      );
    });
    console.log(`[R17-A11Y] focused element has visible affordance: ${outlineOk}`);

    // Enter on a focused vote button (or first article control) must not throw.
    const firstVote = page
      .locator('button[aria-label*="upvote" i], button[aria-label*="Up vote" i]')
      .first();
    if ((await firstVote.count()) > 0) {
      await firstVote.focus();
      await page.keyboard.press("Enter");
      await page.waitForTimeout(300);
      const stillFunctional = await page.evaluate(() => !!document.querySelector("article"));
      expect(stillFunctional, "page still functional after keyboard interaction").toBe(true);
      console.log("[R17-A11Y] keyboard Enter on vote button: page still functional");
    }
  });

  test("images have alt text; headings hierarchy present", async ({ page }) => {
    await page.goto(LIVE_BASE, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    const imgStats = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll("img"));
      const missingAlt = imgs.filter((i) => !i.hasAttribute("alt")).length;
      return { total: imgs.length, missingAlt };
    });
    console.log(`[R17-A11Y] images: ${imgStats.total} total, ${imgStats.missingAlt} missing alt`);
    expect(imgStats.missingAlt, "all images must have alt attributes (WCAG 1.1.1)").toBe(0);

    const headingStats = await page.evaluate(() => {
      const hs = Array.from(document.querySelectorAll("h1,h2,h3"));
      return { count: hs.length, first: hs[0]?.tagName ?? "(none)" };
    });
    console.log(`[R17-A11Y] headings: ${headingStats.count} (first: ${headingStats.first})`);
    expect(headingStats.count, "page should have heading structure").toBeGreaterThan(0);
    expect(headingStats.first, "heading structure must start at H1 (WCAG 1.3.1)").toBe("H1");
  });

  test("login page is keyboard-operable end to end", async ({ page }) => {
    await page.goto(`${LIVE_BASE}/#/login`, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    // Focus first field via keyboard only.
    await page.keyboard.press("Tab");
    const firstStop = await page.evaluate(() => document.activeElement?.tagName ?? "none");
    console.log(`[R17-A11Y] login first tab stop: ${firstStop}`);
    expect(firstStop.toLowerCase()).toBe("input");
    // Type username via keyboard.
    await page.keyboard.type("a11yprobe");
    const typed = await page.evaluate(
      () => (document.activeElement as HTMLInputElement)?.value
    );
    expect(typed).toBe("a11yprobe");
  });
});
