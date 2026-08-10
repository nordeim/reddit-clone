import { z } from "zod";
import dotenv from "dotenv";
import { resolve, join, isAbsolute } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Server configuration — zod-validated environment loader (ADR-101).
 *
 * Behaviour:
 *   - In development/test: every required var has a safe default.
 *   - In production: DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET,
 *     CORS_ORIGIN are required and the loader refuses to start without them.
 *   - Environment files (.env, .env.local) are loaded from the repo root
 *     before validation. Precedence (highest → lowest):
 *       1. Shell env vars (process.env from command line)
 *       2. .env.local (local dev overrides)
 *       3. .env (base values / production secrets)
 *       4. loadEnv() defaults (dev/test safe defaults)
 *
 * The schema is the single source of truth for what the server reads from
 * the environment; no other code path should read process.env directly.
 */

// Resolve repo root from this file's location.
//   Compiled: apps/server/dist/config.js → ../../../ = repo root
//   tsx dev:  apps/server/src/config.ts  → ../../../ = repo root
const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../../");

// Load .env (base values) — does not override existing process.env vars.
dotenv.config({ path: join(REPO_ROOT, ".env") });

// Load .env.local (local overrides) — overrides .env but not shell vars.
const envLocalPath = join(REPO_ROOT, ".env.local");
if (existsSync(envLocalPath)) {
  const parsed = dotenv.parse(readFileSync(envLocalPath, "utf8"));
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default("0.0.0.0"),

  LOG_LEVEL: z.string().optional(),

  DATABASE_URL: z.string().default("./dev.db"),

  JWT_ACCESS_SECRET: z.string().min(32).optional(),
  JWT_REFRESH_SECRET: z.string().min(32).optional(),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("7d"),

  COOKIE_DOMAIN: z.string().optional(),
  CORS_ORIGIN: z.string().default("*"),

  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW: z.string().default("1 minute"),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
  AUTH_RATE_LIMIT_WINDOW: z.string().default("1 minute"),
})
  .superRefine((env, ctx) => {
    // Set log level default based on environment if not explicitly provided.
    if (env.LOG_LEVEL === undefined) {
      env.LOG_LEVEL =
        env.NODE_ENV === "production" ? "info" :
        env.NODE_ENV === "test" ? "silent" :
        "debug";
    }
    if (env.NODE_ENV === "production") {
      const missing: string[] = [];
      if (!env.JWT_ACCESS_SECRET) missing.push("JWT_ACCESS_SECRET");
      if (!env.JWT_REFRESH_SECRET) missing.push("JWT_REFRESH_SECRET");
      if (env.DATABASE_URL === "./dev.db") missing.push("DATABASE_URL");
      if (env.CORS_ORIGIN === "*") missing.push("CORS_ORIGIN");
      for (const m of missing) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [m],
          message: `${m} is required in production`,
        });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

/**
 * Load and validate the environment. Accepts an optional override map
 * (used in tests to inject values without touching `process.env`).
 *
 * @throws {z.ZodError} if the env is invalid (production missing required vars).
 */
export function loadEnv(overrides: Partial<Record<string, string | undefined>> = {}): Env {
  const merged = { ...process.env, ...overrides };
  // Strip undefined so zod applies defaults rather than rejecting empty string.
  const cleaned: Record<string, string> = {};
  for (const [k, v] of Object.entries(merged)) {
    if (v !== undefined) cleaned[k] = v;
  }
  const env = envSchema.parse(cleaned);

  // Resolve DATABASE_URL relative to the repo root (where .env lives),
  // not the CWD. This makes the path work regardless of where the server
  // is started from (repo root via npm scripts, or apps/server/ via
  // `npm run start --workspace @embers/server`). Absolute paths and the
  // special `:memory:` value are passed through unchanged.
  if (env.DATABASE_URL && !isAbsolute(env.DATABASE_URL) && env.DATABASE_URL !== ":memory:") {
    env.DATABASE_URL = resolve(REPO_ROOT, env.DATABASE_URL);
  }

  return env;
}

export { envSchema };
