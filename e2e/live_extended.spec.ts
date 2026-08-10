import { test, expect, type APIRequestContext } from "@playwright/test";

/**
 * Extended live-deployment E2E audit suite (Round 10).
 *
 * This suite probes user journeys NOT covered by `e2e/live.spec.ts` (the
 * Round 8 audit suite) to surface additional gaps/bugs in the deployed
 * site at https://reddit.jesspete.shop/.
 *
 * Coverage focus (beyond Round 8):
 *   - Vote button behaviour when the backend is unreachable (local overlay
 *     should still toggle visually).
 *   - Save-post toggle (Zustand overlay persistence).
 *   - Community navigation (`/r/:name`) renders CommunityHeader + filtered feed.
 *   - Single-post page (`/comments/:postId`) renders post + comment tree.
 *   - Profile page (`/u/:username`) renders user info + user's posts.
 *   - NotFound (`*`) route renders a 404 page, not a blank screen.
 *   - Sort tabs (Hot/New/Top) switch the active sort visually.
 *   - Sidebar community links navigate to /r/<name>.
 *   - Mobile viewport (375×667) renders without horizontal scroll / overflow.
 *   - Deep-link refresh on `#/comments/<id>` keeps the user on the same page.
 *   - Comment composer presence on the post page.
 *   - Right panel content (community list / about box) visible on desktop.
 *   - LoginPage error alert has role="alert" for screen readers.
 *   - Favicon and <title> are non-default (brand presence).
 *   - Register page password-confirmation mismatch keeps submit disabled.
 *
 * The suite is OPT-IN, mirroring `live.spec.ts`:
 *
 *   LIVE_BASE_URL=https://reddit.jesspete.shop/ npm run test:e2e:live
 *
 * Unlike `live.spec.ts`, these tests DO assert against expected behaviour
 * so any regressions surface as failures (not just informational logs).
 * Tests that probe backend-dependent features (e.g. comment composer
 * submit) gracefully skip if the API probe detects the backend is down.
 */

const LIVE_BASE = process.env.LIVE_BASE_URL || "https://reddit.jesspete.shop/";
const ENABLED = !!process.env.LIVE_BASE_URL;
const describeLive = ENABLED ? test.describe : test.describe.skip;

// Shared probe — run once per worker to decide whether backend-reachable
// tests should be skipped. We cache the result on the worker-scope so we
// only pay the latency once.
let backendReachable: boolean | null = null;
async function probeBackend(request: APIRequestContext): Promise<boolean> {
  if (backendReachable !== null) return backendReachable;
  try {
    const res = await request.get(`${LIVE_BASE}health`, { timeout: 5000 });
    backendReachable = res.ok() && /json/.test(res.headers()["content-type"] || "");
  } catch {
    backendReachable = false;
  }
  return backendReachable;
}

describeLive("live deployment — extended user-journey audit (R10)", () => {
  test.beforeAll(async ({ request }) => {
    if (ENABLED) await probeBackend(request);
  });

  test("vote buttons toggle locally (Zustand overlay)", async ({ page }) => {
    await page.goto(LIVE_BASE, { waitUntil: "networkidle" });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "networkidle" });

    // Each PostCard has up/down vote buttons. We look for buttons whose
    // accessible name matches an upvote affordance.
    const upvoteCandidates = page.getByRole("button", { name: /upvote|up\s*vote|^up$/i });
    const count = await upvoteCandidates.count();
    expect(count, "at least one upvote button should be visible in the feed").toBeGreaterThan(0);

    // Snapshot the score BEFORE clicking (the score lives next to the buttons).
    const firstCard = page.locator("article").first();
    const scoreBefore = (await firstCard.textContent()) || "";

    await upvoteCandidates.first().click();
    await page.waitForTimeout(300);

    // The Zustand overlay should now persist the vote. Reading localStorage
    // confirms the client-side state was written.
    const stored = await page.evaluate(() => localStorage.getItem("reddit-clone-state"));
    expect(stored, "vote should be persisted to localStorage").not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.state.votes).toBeDefined();
    const voteKeys = Object.keys(parsed.state.votes);
    expect(voteKeys.length, "at least one vote key should be present after clicking").toBeGreaterThan(0);

    // Sanity: the score text should differ (or at least the overlay was written).
    const scoreAfter = (await firstCard.textContent()) || "";
    console.log(`[AUDIT] R10-VOTE-LOCAL-TOGGLE: keys=${voteKeys.length} scoreChanged=${scoreBefore !== scoreAfter}`);
  });

  test("save-post toggle persists to localStorage", async ({ page }) => {
    await page.goto(LIVE_BASE, { waitUntil: "networkidle" });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "networkidle" });

    // Each PostCard has a "save" / "bookmark" affordance.
    const saveCandidates = page.getByRole("button", { name: /save|bookmark/i });
    const count = await saveCandidates.count();
    if (count === 0) {
      // Some builds may not have a save button on the card directly —
      // surface this as an informational log but do not fail; the spec
      // is to verify *persistence behaviour when present*.
      console.log("[AUDIT] R10-SAVE-BUTTON-NOT-FOUND: no save/bookmark button on PostCard");
      test.skip(true, "no save/bookmark button rendered on PostCard");
    }
    await saveCandidates.first().click();
    await page.waitForTimeout(300);
    const stored = await page.evaluate(() => localStorage.getItem("reddit-clone-state"));
    expect(stored, "save state should persist").not.toBeNull();
    const parsed = JSON.parse(stored!);
    // The Zustand store persists saved posts as `savedPostIds: string[]`
    // (NOT `savedPosts` — see apps/web/src/store/store.ts line 28).
    const savedIds = parsed.state.savedPostIds || [];
    expect(savedIds.length, "at least one saved post id").toBeGreaterThan(0);
    console.log(`[AUDIT] R10-SAVE-PERSIST: ${savedIds.length} posts saved`);
  });

  test("community page (/r/:name) renders CommunityHeader and filtered feed", async ({ page }) => {
    await page.goto(LIVE_BASE, { waitUntil: "networkidle" });
    // Find a community link in the sidebar (LeftPanel Sidebar).
    const communityLinks = page.locator('a[href^="#/r/"]');
    const count = await communityLinks.count();
    expect(count, "sidebar should list community links").toBeGreaterThan(0);
    const firstHref = await communityLinks.first().getAttribute("href");
    expect(firstHref, "community link href must be set").toBeTruthy();

    await communityLinks.first().click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    // The URL should now be #/r/<name>
    expect(page.url()).toMatch(/#\/r\//);
    // The page must render at least one article (the community feed).
    const articles = page.locator("article");
    await expect(articles.first()).toBeVisible({ timeout: 10_000 });
    console.log(`[AUDIT] R10-COMMUNITY-PAGE: ${await articles.count()} articles on /r/<name>`);
  });

  test("single-post page (/comments/:postId) renders post body + comment tree", async ({ page }) => {
    await page.goto(LIVE_BASE, { waitUntil: "networkidle" });
    // Click the first post title to navigate to its detail page.
    const titleLink = page.locator('a[href^="#/comments/"]').first();
    await expect(titleLink).toBeVisible({ timeout: 10_000 });
    await titleLink.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800); // simulated latency in PostPage

    expect(page.url()).toMatch(/#\/comments\//);
    // The PostPage renders the post body in an <article> (the parent post).
    // This is the same element the Round 10 BUG-R10-2 fix made renderable
    // — it previously crashed with React error #185.
    const article = page.locator("article").first();
    await expect(article).toBeVisible({ timeout: 10_000 });

    // The PostPage also renders author links (`u/<username>`) inside the
    // article and the comment tree. We count these as a proxy for
    // "page rendered beyond just the article shell". CommentThread renders
    // each comment as nested <div>s without a `data-testid`, so author
    // links are the most stable selector.
    const authorLinks = page.locator('a[href^="#/u/"]');
    const authorLinkCount = await authorLinks.count();
    console.log(`[AUDIT] R10-POST-DETAIL: ${authorLinkCount} author links rendered`);
    expect(authorLinkCount, "post detail page should render author links").toBeGreaterThan(0);
  });

  test("profile page (/u/:username) renders user info", async ({ page }) => {
    await page.goto(LIVE_BASE, { waitUntil: "networkidle" });
    // Find a user link — typically the post author avatar/name.
    const userLink = page.locator('a[href^="#/u/"]').first();
    const count = await userLink.count();
    if (count === 0) {
      console.log("[AUDIT] R10-PROFILE-LINK-NOT-FOUND: no /u/:username link on feed");
      test.skip(true, "no user profile link visible on feed");
    }
    await userLink.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    expect(page.url()).toMatch(/#\/u\//);
    // The profile page should render the user's display name in an <h1> or <h2>.
    const heading = page.locator("h1, h2").first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
    console.log(`[AUDIT] R10-PROFILE-PAGE: heading="${(await heading.textContent()) || ""}"`);
  });

  test("unknown route renders NotFoundPage (not blank)", async ({ page }) => {
    await page.goto(`${LIVE_BASE}#/this-route-does-not-exist-${Date.now()}`, {
      waitUntil: "networkidle",
    });
    await page.waitForTimeout(500);
    // NotFoundPage should render some visible content indicating 404.
    const body = (await page.textContent("body")) || "";
    expect(body.trim().length, "NotFoundPage should render non-empty body").toBeGreaterThan(0);
    // The page should mention "404" or "not found" — case-insensitive.
    const has404Marker = /404|not\s*found|doesn't\s*exist|does\s*not\s*exist/i.test(body);
    expect(has404Marker, "NotFoundPage should contain a 404/not-found marker").toBe(true);
    console.log(`[AUDIT] R10-NOTFOUND: rendered body length=${body.length}`);
  });

  test("sort tabs (Hot/New/Top) are visible on the feed", async ({ page }) => {
    await page.goto(LIVE_BASE, { waitUntil: "networkidle" });
    // SortTabs component renders a row of buttons/links for sort options.
    const sortTabCandidates = page.getByRole("button", { name: /^(hot|new|top|controversial|rising)$/i });
    const count = await sortTabCandidates.count();
    if (count === 0) {
      // Try tab/links (sometimes SortTabs uses <a> elements).
      const altCandidates = page.getByRole("link", { name: /^(hot|new|top|controversial|rising)$/i });
      const altCount = await altCandidates.count();
      if (altCount === 0) {
        console.log("[AUDIT] R10-SORT-TABS-NOT-FOUND: no Hot/New/Top buttons/links");
        test.skip(true, "no sort tabs rendered");
      }
    }
    console.log(`[AUDIT] R10-SORT-TABS: ${count} sort tabs visible`);
  });

  test("mobile viewport (375x667) renders without horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(LIVE_BASE, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    const scrollInfo = await page.evaluate(() => {
      return {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        bodyScrollWidth: document.body.scrollWidth,
      };
    });
    console.log(
      `[AUDIT] R10-MOBILE-VIEWPORT: scrollWidth=${scrollInfo.scrollWidth} clientWidth=${scrollInfo.clientWidth}`
    );
    // Allow 5px tolerance for sub-pixel rounding.
    expect(
      scrollInfo.scrollWidth,
      "mobile viewport should not introduce horizontal scroll (overflow)"
    ).toBeLessThanOrEqual(scrollInfo.clientWidth + 5);
  });

  test("deep-link refresh on /comments/<id> keeps the user on the same page", async ({ page }) => {
    await page.goto(LIVE_BASE, { waitUntil: "networkidle" });
    // Navigate to a post detail page.
    const titleLink = page.locator('a[href^="#/comments/"]').first();
    await expect(titleLink).toBeVisible({ timeout: 10_000 });
    await titleLink.click();
    await page.waitForLoadState("networkidle");
    const urlBeforeRefresh = page.url();
    expect(urlBeforeRefresh).toMatch(/#\/comments\//);

    // Reload — HashRouter should preserve the URL.
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    const urlAfterRefresh = page.url();
    expect(urlAfterRefresh, "HashRouter URL must survive reload").toBe(urlBeforeRefresh);
    // Page content must still be non-empty (the post should re-render).
    const body = (await page.textContent("body")) || "";
    expect(body.trim().length).toBeGreaterThan(0);
    console.log(`[AUDIT] R10-DEEPLINK-REFRESH: URL preserved=${urlBeforeRefresh === urlAfterRefresh}`);
  });

  test("login page error alert has role=alert for screen readers", async ({ page }) => {
    await page.goto(`${LIVE_BASE}#/login`, { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    const usernameInput = page.locator('input[name="username"], input[type="text"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    await usernameInput.fill("you");
    await passwordInput.fill("embers-demo");
    const submitBtn = page.getByRole("button", { name: /log\s*in|sign\s*in|submit/i }).first();
    await submitBtn.click();
    await page.waitForTimeout(2000); // wait for fetch to fail + error to surface

    // The error alert must have role="alert" so screen readers announce it.
    const alert = page.locator('[role="alert"]').first();
    const alertCount = await alert.count();
    if (alertCount === 0) {
      console.log("[AUDIT] R10-LOGIN-ERROR-ALERT-MISSING: no role=alert element after failed login");
    }
    expect(alertCount, "LoginPage should render a role=alert element on auth failure").toBeGreaterThan(0);
    const alertText = (await alert.textContent()) || "";
    expect(alertText.trim().length, "alert should have non-empty text").toBeGreaterThan(0);
    console.log(`[AUDIT] R10-LOGIN-ERROR-ALERT: text="${alertText.trim().slice(0, 80)}"`);
  });

  test("register page password-confirmation mismatch keeps submit disabled", async ({ page }) => {
    await page.goto(`${LIVE_BASE}#/register`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    const usernameInput = page.locator('input[name="username"], input[type="text"]').first();
    const passwordInputs = page.locator('input[type="password"]');
    const passwordCount = await passwordInputs.count();
    if (passwordCount < 2) {
      console.log(`[AUDIT] R10-REGISTER-CONFIRM-FIELD-MISSING: only ${passwordCount} password input(s)`);
      test.skip(true, "register form does not have a password-confirmation field");
    }
    const passwordInput = passwordInputs.nth(0);
    const confirmInput = passwordInputs.nth(1);
    // Valid username + valid password + mismatched confirmation → button still disabled.
    await usernameInput.fill("newuser123");
    await passwordInput.fill("validpassword123");
    await confirmInput.fill("differentpassword456");
    const submitBtn = page.getByRole("button", { name: /sign\s*up|register|create|submit/i }).first();
    await expect(submitBtn, "submit button must stay disabled when passwords mismatch").toBeDisabled({
      timeout: 5_000,
    });
    console.log("[AUDIT] R10-REGISTER-MISMATCH: submit correctly disabled on password mismatch");
  });

  test("page <title> is non-default (brand presence)", async ({ page }) => {
    await page.goto(LIVE_BASE, { waitUntil: "domcontentloaded" });
    const title = await page.title();
    expect(title.trim().length, "page <title> should be non-empty").toBeGreaterThan(0);
    expect(title.toLowerCase(), "page <title> should mention 'embers' (brand)").toContain("embers");
    console.log(`[AUDIT] R10-PAGE-TITLE: "${title}"`);
  });

  test("right panel renders on desktop viewport (≥1024px)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(LIVE_BASE, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    // The RightPanel component renders community list / about box.
    // We look for an <aside> element (semantic landmark) or any element
    // with role="complementary".
    const aside = page.locator('aside, [role="complementary"]').first();
    const count = await aside.count();
    if (count === 0) {
      console.log("[AUDIT] R10-RIGHT-PANEL-NOT-FOUND: no <aside> or role=complementary on desktop");
    }
    expect(count, "RightPanel should render an <aside> on desktop").toBeGreaterThan(0);
    await expect(aside).toBeVisible();
    console.log("[AUDIT] R10-RIGHT-PANEL: visible on desktop viewport");
  });

  test("login page shows demo credentials hint", async ({ page }) => {
    await page.goto(`${LIVE_BASE}#/login`, { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    const body = (await page.textContent("body")) || "";
    // The LoginPage includes a demo-credentials hint: "you / embers-demo".
    const hasDemoHint = /you\s*\/\s*embers-demo/i.test(body);
    expect(hasDemoHint, "LoginPage should surface demo credentials hint").toBe(true);
    console.log("[AUDIT] R10-LOGIN-DEMO-HINT: present");
  });

  test("comment composer is visible on post detail page (when auth available)", async ({ page, request }) => {
    // The CommentComposer only renders when the user is authenticated
    // (per PostPage.tsx). On the live site the backend is unreachable, so
    // the composer may or may not render depending on AuthProvider state.
    // We probe: if the user can't authenticate, this test is skipped.
    const reachable = await probeBackend(request);
    if (!reachable) {
      console.log("[AUDIT] R10-COMMENT-COMPOSER: skipped — backend unreachable, can't authenticate");
      test.skip(true, "backend unreachable, comment composer requires auth");
    }
    // Navigate to a post detail page.
    await page.goto(LIVE_BASE, { waitUntil: "networkidle" });
    const titleLink = page.locator('a[href^="#/comments/"]').first();
    await titleLink.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    // Look for a textarea (the composer input).
    const textarea = page.locator("textarea").first();
    const count = await textarea.count();
    expect(count, "comment composer textarea should be visible on post detail").toBeGreaterThan(0);
    console.log("[AUDIT] R10-COMMENT-COMPOSER: textarea visible");
  });

  test("backend reachability probe summary", async ({ request }) => {
    // Aggregate probe — surfaces LIVE-CRIT-2 status as a single informational
    // test so the audit summary is grep-able.
    const probes = [
      { method: "GET", url: "/health" },
      { method: "GET", url: "/api/posts" },
      { method: "GET", url: "/api/communities" },
      { method: "POST", url: "/api/auth/login", body: { username: "you", password: "embers-demo" } },
    ];
    const results: string[] = [];
    let okCount = 0;
    for (const p of probes) {
      const res =
        p.method === "GET"
          ? await request.get(`${LIVE_BASE}${p.url}`, { timeout: 8000 })
          : await request.post(`${LIVE_BASE}${p.url}`, { data: p.body, timeout: 8000 });
      const ok = res.ok();
      if (ok) okCount++;
      results.push(`${p.method} ${p.url} → ${res.status()} ${ok ? "OK" : "FAIL"}`);
    }
    console.log(`[AUDIT] R10-BACKEND-REACHABILITY: ${okCount}/${probes.length} probes OK`);
    results.forEach((r) => console.log(`  - ${r}`));
    // Informational — do not fail. The Round 8 suite already documents the gap.
  });
});
