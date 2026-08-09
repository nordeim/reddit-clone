import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vitest/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Separate Vitest config. Vitest picks this up automatically when present,
// and `vite build` ignores it entirely — so the single-file production
// output is unaffected. Keeping the test config out of `vite.config.ts`
// avoids a TypeScript type clash between the project's `vite` package and
// the `vite` bundled inside `vitest`.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist"],
  },
});
