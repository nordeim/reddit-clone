import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import globals from 'globals';

/**
 * embers — Root ESLint flat config (Round 4)
 *
 * Adapted from the sample Next.js config provided by the user, with the
 * following changes for this monorepo:
 *
 *   1. `@next/eslint-plugin-next` is NOT used — `apps/web` is Vite + React,
 *      not Next.js. The `nextPlugin` import and `nextPlugin.configs.recommended`
 *      spread are removed.
 *   2. The "5-layer architecture enforcement" block (domain layer must not
 *      import Next.js / React / DB) is removed — that pattern belongs to the
 *      Next.js skills reference architecture, not to this repo's
 *      `apps/server` + `packages/{shared,db}` composition-root layout.
 *   3. The React rules only apply to `apps/web/` source files (globs use the
 *      pattern `apps/web/src/` followed by a wildcard and a `.{ts,tsx}`
 *      extension). The server and packages have no JSX, so loading the
 *      React plugin there would produce false positives.
 *   4. `@typescript-eslint/no-explicit-any: error` and
 *      `@typescript-eslint/consistent-type-imports: error` apply everywhere.
 *   5. Ignores include `dist/`, `node_modules/`, `skills/`, `docs/`,
 *      `playwright-report/`, `test-results/`, and `e2e/start-server.ts`
 *      (which intentionally uses workspace-relative imports).
 *
 * Workspaces:
 *   - apps/web     — React 19 + Vite + Tailwind v4 (browser globals + JSX)
 *   - apps/server  — Fastify 5 + Node 20 (node globals, no JSX)
 *   - packages/shared — Zod schemas + branded IDs (no runtime, no JSX)
 *   - packages/db  — Drizzle ORM + better-sqlite3 (node globals, no JSX)
 *
 * Run: `npm run lint` (from root) or `npx eslint <path>`.
 */

export default tseslint.config(
  // ---------------------------------------------------------------------------
  // 1. Global ignores — never lint these
  // ---------------------------------------------------------------------------
  {
    ignores: [
      'node_modules/**',
      '**/dist/**',
      '**/node_modules/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'blob-report/**',
      'playwright/.cache/**',
      '.cache/**',
      'e2e/.auth/**',
      'public/**',
      'skills/**',
      'docs/**',
      'apps/web/dist/**',
      'apps/server/dist/**',
      'packages/*/dist/**',
      '*.config.{ts,js,mjs,cjs}',
      'tsconfig.base.json',
      '.github/**',
      '.audit-report.md',
    ],
  },

  // ---------------------------------------------------------------------------
  // 2. Base configs — JS recommended + TS recommended (all workspaces)
  // ---------------------------------------------------------------------------
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // ---------------------------------------------------------------------------
  // 3. All TypeScript / JavaScript source files (server, shared, db, e2e)
  // ---------------------------------------------------------------------------
  {
    files: ['apps/server/src/**/*.{ts,tsx,js,jsx,mjs,cjs}',
            'packages/shared/src/**/*.{ts,tsx,js,jsx,mjs,cjs}',
            'packages/db/src/**/*.{ts,tsx,js,jsx,mjs,cjs}',
            'packages/db/scripts/**/*.{ts,js,mjs,cjs}',
            'e2e/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'no-unused-vars': 'off', // handled by @typescript-eslint/no-unused-vars
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
    },
  },

  // ---------------------------------------------------------------------------
  // 4. React workspace (apps/web) — browser globals + JSX + React rules
  // ---------------------------------------------------------------------------
  {
    files: ['apps/web/src/**/*.{ts,tsx,js,jsx,mjs,cjs}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',       // jsx: react-jsx handles this
      'react/prop-types': 'off',                // TS handles prop types
      'react/no-unescaped-entities': 'off',     // overly strict for prose
      'react-hooks/exhaustive-deps': 'error',   // strict: must be error
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
    },
  },

  // ---------------------------------------------------------------------------
  // 5. Test files — allow describe/it/expect globals + relax some rules
  // ---------------------------------------------------------------------------
  {
    files: ['**/*.test.{ts,tsx,js,jsx}', '**/*.spec.{ts,tsx,js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
        // Vitest globals (when configured) — declare explicitly so ESLint
        // doesn't flag describe/it/expect/beforeAll/afterAll as undefined.
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        vi: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
    },
  },

  // ---------------------------------------------------------------------------
  // 6. E2E bootstrap script — allow workspace-relative imports + node globals
  // ---------------------------------------------------------------------------
  {
    files: ['e2e/start-server.ts', 'e2e/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': 'off', // E2E bootstrap logs are intentional
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
    },
  },

  // ---------------------------------------------------------------------------
  // 7. CLI scripts (packages/db/scripts/) — console.log is primary user output
  // ---------------------------------------------------------------------------
  {
    files: ['packages/db/scripts/**/*.ts', 'apps/server/scripts/**/*.ts'],
    rules: {
      'no-console': 'off', // CLI scripts use console.log for user-facing output
    },
  },

  // ---------------------------------------------------------------------------
  // 8. Repo-root scripts/ (R8.1, R8.4) — Node.js ESM verification scripts
  // ---------------------------------------------------------------------------
  {
    files: ['scripts/**/*.{mjs,js,cjs,ts}'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': 'off', // verification scripts log to stdout
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
    },
  },
);
