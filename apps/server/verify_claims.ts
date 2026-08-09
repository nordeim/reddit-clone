import { buildApp } from "./src/app";
import { openDb, runSeed } from "@embers/db";

async function main() {
  const { raw, db } = openDb({ path: ":memory:" });
  await runSeed(db, {
    hashPassword: (plain: string) => import("argon2").then(a => a.hash(plain, { type: a.argon2id, timeCost: 2, memoryCost: 1024, parallelism: 1 })),
  });
  const app = await buildApp({
    env: { NODE_ENV: "test", JWT_ACCESS_SECRET: "test-access-secret-32-chars-minimum!", JWT_REFRESH_SECRET: "test-refresh-secret-32-chars-min!", JWT_ACCESS_TTL: "15m", JWT_REFRESH_TTL: "7d", CORS_ORIGIN: "*" },
    skipHelmet: false, db, rawDb: raw,
  });

  const login = await app.inject({ method: "POST", url: "/api/auth/login", payload: { username: "you", password: "embers-demo" } });
  process.stdout.write("LOGIN_STATUS=" + login.statusCode + "\n");
  process.stdout.write("HAS_ACCESS_TOKEN=" + (!!login.json().accessToken) + "\n");

  const health = await app.inject({ method: "GET", url: "/health" });
  const csp = health.headers["content-security-policy"];
  process.stdout.write("CSP_HEADER=" + (csp ? "PRESENT" : "MISSING") + "\n");

  const rateLimit = await app.inject({ method: "POST", url: "/api/auth/login", payload: { username: "nonexistent", password: "wrong" } });
  process.stdout.write("RATE_LIMIT_HEADERS=" + (rateLimit.headers["x-ratelimit-limit"] ? "PRESENT" : "MISSING") + "\n");

  await app.close();
  raw.close();
}
main().catch(e => { process.stderr.write("ERROR: " + e.message + "\n"); process.exit(1); });
