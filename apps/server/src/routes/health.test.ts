import { describe, it, expect } from "vitest";
import { buildApp } from "../app";

describe("GET /health", () => {
  it("returns 200 with { status: 'ok', timestamp, uptime }", async () => {
    const app = await buildApp({ env: { NODE_ENV: "test" } });
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe("ok");
    expect(typeof body.timestamp).toBe("string");
    expect(typeof body.uptime).toBe("number");
    expect(body.uptime).toBeGreaterThanOrEqual(0);
    expect(() => new Date(body.timestamp)).not.toThrow();
    await app.close();
  });

  it("includes request-id header in response", async () => {
    const app = await buildApp({ env: { NODE_ENV: "test" } });
    const response = await app.inject({
      method: "GET",
      url: "/health",
      headers: { "x-request-id": "test-req-id-123" },
    });
    expect(response.headers["x-request-id"]).toBe("test-req-id-123");
    await app.close();
  });

  it("generates a request-id when not provided", async () => {
    const app = await buildApp({ env: { NODE_ENV: "test" } });
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });
    const requestId = response.headers["x-request-id"] as string | undefined;
    expect(typeof requestId).toBe("string");
    expect(requestId?.length ?? 0).toBeGreaterThan(10);
    await app.close();
  });
});

describe("error handling", () => {
  it("returns 404 with structured error for unknown routes", async () => {
    const app = await buildApp({ env: { NODE_ENV: "test" } });
    const response = await app.inject({
      method: "GET",
      url: "/api/this-route-does-not-exist",
    });
    expect(response.statusCode).toBe(404);
    const body = response.json();
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.message).toBe("Route not found");
    expect(body.error.requestId).toBeDefined();
    await app.close();
  });

  it("returns structured error for unhandled exceptions", async () => {
    const app = await buildApp({ env: { NODE_ENV: "test" } });
    // Inject a route that throws, then trigger it
    app.get("/__test-throw", async () => {
      throw new Error("deliberate test failure");
    });
    const response = await app.inject({
      method: "GET",
      url: "/__test-throw",
    });
    expect(response.statusCode).toBe(500);
    const body = response.json();
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.message).toBe("Internal server error");
    expect(body.error.requestId).toBeDefined();
    // Stack must NOT leak to client
    expect(JSON.stringify(body)).not.toContain("deliberate test failure");
    await app.close();
  });
});

describe("CORS preflight", () => {
  it("responds 204 to OPTIONS with configured origin", async () => {
    const app = await buildApp({ env: { NODE_ENV: "test", CORS_ORIGIN: "https://example.com" } });
    const response = await app.inject({
      method: "OPTIONS",
      url: "/health",
      headers: {
        origin: "https://example.com",
        "access-control-request-method": "GET",
      },
    });
    expect([204,200]).toContain(response.statusCode);
    expect(response.headers["access-control-allow-origin"]).toBe("https://example.com");
    await app.close();
  });
});
