import { defineConfig } from "drizzle-kit";

/**
 * Drizzle-Kit config — SQLite dialect.
 *
 * `drizzle-kit generate` reads the schema from `./src/schema/index.ts` and
 * emits SQL migration files into `./src/migrations/`. The migrations are
 * committed (auditable artifacts), and applied at runtime by
 * `scripts/migrate.ts` via drizzle-orm's `migrate()`.
 *
 * Run:
 *   pnpm --filter @embers/db db:generate
 *   pnpm --filter @embers/db migrate
 */
export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./src/migrations",
  dialect: "sqlite",
  verbose: true,
});
