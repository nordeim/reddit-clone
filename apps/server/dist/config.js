import { z } from "zod";
/**
 * Server configuration — zod-validated environment loader (ADR-101).
 *
 * Behaviour:
 *   - In development/test: every required var has a safe default.
 *   - In production: DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET,
 *     CORS_ORIGIN are required and the loader refuses to start without them.
 *
 * The schema is the single source of truth for what the server reads from
 * the environment; no other code path should read process.env directly.
 */
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
        const missing = [];
        if (!env.JWT_ACCESS_SECRET)
            missing.push("JWT_ACCESS_SECRET");
        if (!env.JWT_REFRESH_SECRET)
            missing.push("JWT_REFRESH_SECRET");
        if (env.DATABASE_URL === "./dev.db")
            missing.push("DATABASE_URL");
        if (env.CORS_ORIGIN === "*")
            missing.push("CORS_ORIGIN");
        for (const m of missing) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: [m],
                message: `${m} is required in production`,
            });
        }
    }
});
/**
 * Load and validate the environment. Accepts an optional override map
 * (used in tests to inject values without touching `process.env`).
 *
 * @throws {z.ZodError} if the env is invalid (production missing required vars).
 */
export function loadEnv(overrides = {}) {
    const merged = { ...process.env, ...overrides };
    // Strip undefined so zod applies defaults rather than rejecting empty string.
    const cleaned = {};
    for (const [k, v] of Object.entries(merged)) {
        if (v !== undefined)
            cleaned[k] = v;
    }
    return envSchema.parse(cleaned);
}
export { envSchema };
