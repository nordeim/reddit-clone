import { describe, it, expect } from "vitest";
import { envSchema, type Env } from "./config";

describe("env config", () => {
  it("provides safe dev defaults when NODE_ENV != production", () => {
    const env: Env = envSchema.parse({
      NODE_ENV: "development",
    });
    expect(env.NODE_ENV).toBe("development");
    expect(env.PORT).toBe(4000);
    expect(env.HOST).toBe("0.0.0.0");
    expect(env.LOG_LEVEL).toBe("debug");
    expect(env.DATABASE_URL).toBe("./dev.db");
    expect(env.JWT_ACCESS_TTL).toBe("15m");
    expect(env.JWT_REFRESH_TTL).toBe("7d");
    expect(env.CORS_ORIGIN).toBe("*");
    expect(env.RATE_LIMIT_MAX).toBe(100);
    expect(env.RATE_LIMIT_WINDOW).toBe("1 minute");
  });

  it("requires DATABASE_URL in production", () => {
    const result = envSchema.safeParse({ NODE_ENV: "production" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i: { path: (string | number)[] }) => i.path.includes("DATABASE_URL"))).toBe(true);
    }
  });

  it("requires JWT_ACCESS_SECRET in production", () => {
    const result = envSchema.safeParse({
      NODE_ENV: "production",
      DATABASE_URL: "/var/lib/embers/prod.db",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i: { path: (string | number)[] }) => i.path.includes("JWT_ACCESS_SECRET"))).toBe(true);
    }
  });

  it("requires JWT_REFRESH_SECRET in production", () => {
    const result = envSchema.safeParse({
      NODE_ENV: "production",
      DATABASE_URL: "/var/lib/embers/prod.db",
      JWT_ACCESS_SECRET: "a-very-strong-access-secret-key-32+chars-long",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i: { path: (string | number)[] }) => i.path.includes("JWT_REFRESH_SECRET"))).toBe(true);
    }
  });

  it("requires CORS_ORIGIN in production", () => {
    const result = envSchema.safeParse({
      NODE_ENV: "production",
      DATABASE_URL: "/var/lib/embers/prod.db",
      JWT_ACCESS_SECRET: "a-very-strong-access-secret-key-32+chars-long",
      JWT_REFRESH_SECRET: "a-very-strong-refresh-secret-key-32+chars-long",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i: { path: (string | number)[] }) => i.path.includes("CORS_ORIGIN"))).toBe(true);
    }
  });

  it("accepts a complete production env", () => {
    const result = envSchema.safeParse({
      NODE_ENV: "production",
      DATABASE_URL: "/var/lib/embers/prod.db",
      JWT_ACCESS_SECRET: "a-very-strong-access-secret-key-32+chars-long",
      JWT_REFRESH_SECRET: "a-very-strong-refresh-secret-key-32+chars-long",
      CORS_ORIGIN: "https://embers.example.com",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NODE_ENV).toBe("production");
      expect(result.data.LOG_LEVEL).toBe("info");
    }
  });

  it("rejects unknown NODE_ENV values", () => {
    expect(envSchema.safeParse({ NODE_ENV: "staging-x" }).success).toBe(false);
  });

  it("accepts NODE_ENV=test", () => {
    const env: Env = envSchema.parse({ NODE_ENV: "test" });
    expect(env.NODE_ENV).toBe("test");
    expect(env.LOG_LEVEL).toBe("silent");
  });
});
