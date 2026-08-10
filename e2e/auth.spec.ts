import { test, expect } from "@playwright/test";

/**
 * embers — E2E auth lifecycle suite (Round 7, B18.9)
 *
 * Extends the smoke suite with tests that exercise the full auth
 * lifecycle through the REST API:
 *   1. Register a new user → login → access a protected endpoint → 200.
 *   2. Register → login → logout → access protected endpoint → 401.
 *   3. Register with a taken username → 409.
 *   4. Login with wrong password → 401.
 *   5. Access protected endpoint without auth → 401.
 *   6. Login → access protected endpoint with wrong token → 401.
 *
 * These tests verify the server-side auth contract that the React auth
 * flow (AuthProvider, LoginPage, RegisterPage, RequireAuth) depends on.
 * They don't render the React app — the E2E setup only starts the
 * Fastify server. Browser-level tests of the React auth flow would
 * require starting the Vite dev server in the webServer config, which
 * is out of scope for Round 7.
 *
 * The tests use unique usernames (`e2e-auth-${Date.now()}-${random}`) to
 * avoid collisions with the smoke suite's register test. The `workers: 1`
 * config in playwright.config.ts ensures sequential execution.
 */

function uniqueUsername(): string {
  return `e2e-auth-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const TEST_PASSWORD = "TestPassword123!";

test.describe("auth lifecycle", () => {
  test("register → login → access protected endpoint (GET /api/notifications) → 200", async ({ request }) => {
    const username = uniqueUsername();

    // Step 1: register
    const regRes = await request.post("/api/auth/register", {
      data: { username, password: TEST_PASSWORD, displayName: "E2E Auth" },
    });
    expect(regRes.status()).toBe(201);
    const regBody = await regRes.json();
    expect(regBody.user.username).toBe(username);
    expect(regBody.user.id).toBeTruthy();
    // Register does NOT return an access token — client must login.
    expect(regBody.accessToken).toBeUndefined();

    // Step 2: login
    const loginRes = await request.post("/api/auth/login", {
      data: { username, password: TEST_PASSWORD },
    });
    expect(loginRes.status()).toBe(200);
    const loginBody = await loginRes.json();
    expect(loginBody.accessToken).toBeTruthy();
    expect(loginBody.user.username).toBe(username);
    const accessToken = loginBody.accessToken;

    // Step 3: access a protected endpoint with the access token
    const notifRes = await request.get("/api/notifications", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(notifRes.status()).toBe(200);
    const notifBody = await notifRes.json();
    // New user has no notifications — empty list is valid.
    expect(Array.isArray(notifBody.data)).toBe(true);
  });

  test("register → login → logout → refresh fails (revoked) → 401", async ({ request }) => {
    const username = uniqueUsername();

    // Register + login
    await request.post("/api/auth/register", {
      data: { username, password: TEST_PASSWORD },
    });
    const loginRes = await request.post("/api/auth/login", {
      data: { username, password: TEST_PASSWORD },
    });
    const loginBody = await loginRes.json();
    const accessToken = loginBody.accessToken;

    // Verify the token works before logout
    const beforeLogout = await request.get("/api/notifications", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(beforeLogout.status()).toBe(200);

    // Extract the refresh cookie from the login response's Set-Cookie header.
    const setCookie = loginRes.headers()["set-cookie"];
    expect(setCookie).toBeTruthy();
    const refreshCookieMatch = setCookie.match(/embers_refresh=([^;]+)/);
    expect(refreshCookieMatch).not.toBeNull();
    const refreshTokenValue = refreshCookieMatch![1];

    // Logout — send the refresh token in the body (the endpoint accepts
    // both cookie and body). We use the body because Playwright's request
    // fixture doesn't automatically persist cookies across requests.
    const logoutRes = await request.post("/api/auth/logout", {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { refreshToken: refreshTokenValue },
    });
    expect(logoutRes.status()).toBe(204);

    // After logout, the refresh token is revoked. Attempting to refresh
    // should fail with 401.
    const refreshRes = await request.post("/api/auth/refresh", {
      data: { refreshToken: refreshTokenValue },
    });
    expect(refreshRes.status()).toBe(401);
  });

  test("register with a taken username → 409", async ({ request }) => {
    const username = uniqueUsername();

    // First registration succeeds
    const first = await request.post("/api/auth/register", {
      data: { username, password: TEST_PASSWORD },
    });
    expect(first.status()).toBe(201);

    // Second registration with the same username fails
    const second = await request.post("/api/auth/register", {
      data: { username, password: TEST_PASSWORD },
    });
    expect(second.status()).toBe(409);
    const body = await second.json();
    expect(body.error.code).toBe("CONFLICT");
  });

  test("login with wrong password → 401", async ({ request }) => {
    const username = uniqueUsername();
    await request.post("/api/auth/register", {
      data: { username, password: TEST_PASSWORD },
    });

    const res = await request.post("/api/auth/login", {
      data: { username, password: "WrongPassword123!" },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  test("access protected endpoint without auth → 401", async ({ request }) => {
    const res = await request.get("/api/notifications");
    expect(res.status()).toBe(401);
  });

  test("access protected endpoint with an invalid token → 401", async ({ request }) => {
    const res = await request.get("/api/notifications", {
      headers: { Authorization: "Bearer invalid-token-not-a-jwt" },
    });
    expect(res.status()).toBe(401);
  });

  test("register → login → refresh → new access token works", async ({ request }) => {
    const username = uniqueUsername();

    await request.post("/api/auth/register", {
      data: { username, password: TEST_PASSWORD },
    });
    const loginRes = await request.post("/api/auth/login", {
      data: { username, password: TEST_PASSWORD },
    });
    const loginBody = await loginRes.json();
    expect(loginBody.accessToken).toBeTruthy();

    // Extract the refresh token from the Set-Cookie header. Playwright's
    // request fixture doesn't automatically persist cookies, so we send
    // the refresh token in the body (the endpoint accepts both).
    const setCookie = loginRes.headers()["set-cookie"];
    const refreshCookieMatch = setCookie.match(/embers_refresh=([^;]+)/);
    const refreshTokenValue = refreshCookieMatch![1];

    // Refresh — should return a valid access token
    const refreshRes = await request.post("/api/auth/refresh", {
      data: { refreshToken: refreshTokenValue },
    });
    expect(refreshRes.status()).toBe(200);
    const refreshBody = await refreshRes.json();
    expect(refreshBody.accessToken).toBeTruthy();
    // NOTE: The new access token may be identical to the old one if
    // both are issued within the same second (JWT iat is in seconds).
    // We don't assert inequality — we just verify the refresh returns
    // a valid token and the user shape is correct.
    expect(refreshBody.user.username).toBe(username);

    // The refreshed access token works
    const notifRes = await request.get("/api/notifications", {
      headers: { Authorization: `Bearer ${refreshBody.accessToken}` },
    });
    expect(notifRes.status()).toBe(200);
  });

  test("register with invalid input (short username) → 422", async ({ request }) => {
    const res = await request.post("/api/auth/register", {
      data: { username: "ab", password: TEST_PASSWORD }, // username < 3 chars
    });
    expect(res.status()).toBe(422);
  });

  test("register with invalid input (short password) → 422", async ({ request }) => {
    const username = uniqueUsername();
    const res = await request.post("/api/auth/register", {
      data: { username, password: "short" }, // password < 8 chars
    });
    expect(res.status()).toBe(422);
  });
});
