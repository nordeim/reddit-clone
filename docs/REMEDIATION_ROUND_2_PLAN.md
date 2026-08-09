# embers — Build-Error Remediation Plan (Round 2)

**Status:** ACTIVE EXECUTION PLAN
**Trigger:** `npm run build` fails with 40 TypeScript errors in `apps/server`
**Date:** 2026-08-09 (round 2)
**Branch policy:** `main` only — no feature branches

---

## 1. Root-Cause Analysis of the Build Error

The build log (`upload/npm_build_error.txt`) shows 40 errors in 17 files. They
fall into **two distinct categories** with different root causes.

### 1.1 Category A — Build-ordering failures (32 of 40 errors)

**Symptom:** `Cannot find module '@embers/db'` / `'@embers/shared'` across
every file in `apps/server/src/` that imports from these packages.

**Root cause:** The root `package.json` `build` script is:
```json
"build": "npm run build --workspaces --if-present"
```
npm runs this in **alphabetical order by workspace name**: `@embers/db` →
`@embers/root` → `@embers/server` → `@embers/shared`. Wait — actually npm
runs them in *parallel* (or in the order they appear in `workspaces` array:
`apps/*` first, then `packages/*`). Either way, `@embers/server` starts its
`tsc` before `@embers/shared` and `@embers/db` have emitted their `dist/`
folders.

The `@embers/db` and `@embers/shared` `package.json` files declare:
```json
"main": "./dist/index.js",
"types": "./dist/index.d.ts"
```
So TypeScript can only resolve them when `dist/` exists. When the server
builds first, the imports fail.

**Fix:** Update the root `build` script to build dependencies in topological
order:
```json
"build": "npm run build --workspace @embers/shared && npm run build --workspace @embers/db && npm run build --workspace @embers/server && npm run build --workspace @embers/web"
```
This guarantees `shared` → `db` → `server` → `web` ordering. (`web` doesn't
depend on the others, but it's listed last for consistency.)

Also add the missing `@embers/db` dependency to `apps/server/package.json`
(it's imported by every repository + service file but not declared in
`dependencies` — only `@embers/shared` is). The workspace symlink makes
this work at runtime, but it should be explicit for correctness.

### 1.2 Category B — Real TypeScript source bugs (8 of 40 errors)

These are genuine bugs that would fail even with correct build ordering.

#### Bug B-1: `services/commentTreeService.ts:1` — wrong `import type`

```ts
// BROKEN:
import type { comments } from "@embers/db";
type CommentRow = typeof comments.$inferSelect;
```

`comments` is a Drizzle **table value** (a runtime object), not a type.
`import type { comments }` erases the value at compile time, so
`typeof comments.$inferSelect` evaluates to `any` — and every property
access on `CommentTreeNode` (`parentId`, `upvotes`, `downvotes`) fails
with TS2339.

**Fix:** Use a regular import:
```ts
import { comments } from "@embers/db";
type CommentRow = typeof comments.$inferSelect;
```

#### Bug B-2: `services/voteService.ts:45` — untyped transaction callback

```ts
// BROKEN:
return db.transaction((_tx) => { ... });
```

Drizzle's `BetterSQLite3Database.transaction()` callback parameter has a
specific type (`BetterSQLite3Transaction`), but TypeScript can't infer it
when the parameter is unused (`_tx`). With `noImplicitAny: true` (set via
`strict: true` in `tsconfig.base.json`), the unused-but-untyped parameter
triggers TS7006.

**Fix:** Type it explicitly as `BetterSQLite3Transaction<typeof schema>`:
```ts
import type { BetterSQLite3Transaction } from "drizzle-orm/better-sqlite3";
import type * as schema from "@embers/db";
// ...
return db.transaction((_tx: BetterSQLite3Transaction<typeof schema>) => { ... });
```

#### Bug B-3: `repositories/notificationRepository.ts:64` — implicit `any` map callback

```ts
// BROKEN:
return query.all().map((r) => ({ ... }));
```

The `query` is built conditionally via two branches that return different
Drizzle query builder types. The union type isn't narrowable, so `r` is
`any`. With `strict: true`, this fails.

**Fix:** Type the callback parameter explicitly via the `notifications`
table's inferred select type:
```ts
type NotificationRow = typeof notifications.$inferSelect;
return query.all().map((r: NotificationRow) => ({ ... }));
```

#### Bug B-4: `routes/search.ts:32,55,80` — three implicit `any` map callbacks

```ts
// BROKEN (3 occurrences):
data: results.map((r) => ({ ... }));   // line 32 — searchPosts result
data: rows.map((c) => ({ ... }));     // line 55 — communities query result
data: rows.map((u) => ({ ... }));     // line 80 — users query result
```

Same root cause as B-3. The `searchPosts()` return type is inferred but the
map callback's parameter isn't.

**Fix:** Add explicit types to each callback, sourced from either the
`searchPosts` return signature or the inferred Drizzle select type.

---

## 2. Gaps Identified in `REMEDIATION_PLAN_2.md`

Cross-referencing the plan's acceptance criteria against the actual codebase
reveals three gaps beyond the build error:

### 2.1 Gap G-1: B10 — Missing PATCH/DELETE endpoints with authorization

**Plan says:**
> B10: Post/Community API. Implement CRUD with authorization checks
> (only author can edit). *Test: Integration tests verify 403 Forbidden
> on unauthorized edits.*

**Codebase has:**
- `GET /api/posts` (list)
- `GET /api/posts/:id` (single)
- `POST /api/posts` (create, auth required)
- `GET /api/communities` (list)
- `GET /api/communities/:slug` (single)

**Missing:**
- `PATCH /api/posts/:id` (edit, author-only → 403 if not author)
- `DELETE /api/posts/:id` (delete, author-only → 403 if not author)
- The 403 test case

**Severity:** High — the plan's acceptance criterion is unmet.

### 2.2 Gap G-2: B11 — Missing concurrency test

**Plan says:**
> B11: Transactional Votes. Implement `PUT /votes`. *Test: Concurrent
> load test (100 simultaneous votes) results in exactly 100 incremented
> upvotes without race conditions.*

**Codebase has:**
- `PUT /api/votes/:targetId` with atomic `UPDATE … SET col = col + delta`
- Tests for toggle/flip/zero lifecycle (5 tests)
- A claim in the commit message: "Verified via atomic SQL UPDATE"

**Missing:**
- An actual test that casts 100 votes and verifies the final score is
  exactly base+100. (Even though Node is single-threaded and SQLite is
  synchronous, the test verifies the *logic* of the atomic counter —
  that 100 sequential upvote calls produce exactly +100, not +99 or +101
  due to off-by-one in the toggle logic.)

**Severity:** Medium — the implementation is correct but the explicit
verification called for in the plan is missing.

### 2.3 Gap G-3: `@embers/db` not declared in `apps/server/package.json`

**Codebase has:**
- `apps/server/package.json` `dependencies` lists `@embers/shared` but
  NOT `@embers/db`.
- Every repository + service file imports from `@embers/db`.
- The npm workspace symlink makes this work at runtime (the package is
  hoisted to root `node_modules/@embers/db`).

**Problem:** If anyone runs `npm install --workspace @embers/server` in
isolation (e.g. a Docker build that only copies `apps/server/`), the
build breaks because `@embers/db` isn't a declared dependency.

**Fix:** Add `"@embers/db": "*"` to `apps/server/package.json` dependencies.

---

## 3. Execution Plan (TDD)

### Phase R1 — Fix build ordering + declare missing dep

**R1.1.** Update root `package.json` `build` script to build in
topological order: `shared → db → server → web`. Same for `typecheck`
(though typecheck doesn't strictly require ordering, doing it consistently
avoids confusion).

**R1.2.** Add `"@embers/db": "*"` to `apps/server/package.json` dependencies.

**R1.3.** Verify: `npm run build` from a clean state (`rm -rf packages/*/dist apps/server/dist apps/web/dist`) succeeds end-to-end.

### Phase R2 — Fix the 4 TypeScript source bugs (RED → GREEN)

For each bug, the existing test suite already covers the behaviour (the
tests pass because vitest uses tsx which doesn't type-check). So these
fixes are pure type-level — no behaviour change, no new tests needed.
The verification is `npm run typecheck --workspace @embers/server` exits 0.

**R2.1.** Fix `commentTreeService.ts` import (B-1).

**R2.2.** Fix `voteService.ts` transaction callback type (B-2).

**R2.3.** Fix `notificationRepository.ts` map callback type (B-3).

**R2.4.** Fix `search.ts` three map callbacks (B-4).

### Phase R3 — Implement B10 PATCH/DELETE with authorization (TDD)

**R3.1 (RED).** Write failing tests:
- `PATCH /api/posts/:id` returns 200 with updated title when caller is author
- `PATCH /api/posts/:id` returns 403 when caller is not the author
- `PATCH /api/posts/:id` returns 401 without auth
- `PATCH /api/posts/:id` returns 404 for unknown post id
- `PATCH /api/posts/:id` returns 422 for empty title
- `DELETE /api/posts/:id` returns 204 when caller is author
- `DELETE /api/posts/:id` returns 403 when caller is not the author
- `DELETE /api/posts/:id` returns 401 without auth
- `DELETE /api/posts/:id` returns 404 for unknown post id
- After DELETE, `GET /api/posts/:id` returns 404
- After DELETE, the post's row is gone from `posts_fts` (trigger fires)

**R3.2 (GREEN).** Implement:
- `postRepository.update(id, patch)` — partial update
- `postRepository.delete(id)` — delete
- `PATCH /api/posts/:id` route — auth + author check (403 if `post.authorId !== req.user.id`)
- `DELETE /api/posts/:id` route — auth + author check
- Add Zod schemas `updatePostInputSchema` to `@embers/shared`

**R3.3.** Verify: new tests pass; existing tests still pass.

### Phase R4 — Add B11 concurrency test

**R4.1 (RED).** Write failing test:
- Cast 100 upvotes on the same post from 100 different users (use the
  48 seeded users + register 52 more, or just use the first 100 users
  by re-registering with unique usernames). Verify final score is
  exactly base + 100.

Actually simpler: since SQLite is synchronous and Node is single-threaded,
"100 simultaneous votes" is really "100 sequential votes from different
users on the same target". The test verifies the atomic counter logic
accumulates correctly without off-by-one.

**R4.2 (GREEN).** The implementation already supports this — the test
should pass without code changes. If it doesn't, fix the bug.

### Phase R5 — Full verification

**R5.1.** `npm run typecheck --workspaces --if-present` → exit 0
**R5.2.** `npm test --workspaces --if-present` → all green
**R5.3.** `npm run build` from clean state → all 4 workspaces produce `dist/`
**R5.4.** `npm run build --workspace @embers/web` → single-file build intact

### Phase R6 — Documentation update

**R6.1.** Update `docs/REMEDIATION_EXECUTION_PLAN.md`:
- Add a new section "Round 2 — Build-Error Remediation" documenting the
  root cause analysis and fixes.
- Update the verification ledger to reflect the new test counts.

**R6.2.** Update `docs/REMEDIATION_PLAN_2.md`:
- Mark B10's authorization gap as closed (PATCH/DELETE + 403 tests added).
- Mark B11's concurrency test gap as closed.
- Add a note about the build-ordering fix.

### Phase R7 — Commit + push

**R7.1.** Stage all changes.
**R7.2.** Commit with descriptive message covering all phases.
**R7.3.** Push to `origin/main` via SSH wrapper.

---

## 4. Pre-Mortem

| Failure mode | Mitigation |
|---|---|
| Fixing `commentTreeService.ts` import changes runtime behaviour | No — `import type` vs `import` only differs at compile time. Runtime is identical (the value is used either way). |
| Adding `@embers/db` to server deps creates a circular dependency | No — `@embers/db` depends on `@embers/shared`, not on `@embers/server`. The dependency graph is: `shared ← db ← server`, `shared ← server`, no cycles. |
| PATCH/DELETE routes break existing tests | New routes are additive — existing GET/POST routes unchanged. The only shared code is `app.authenticate` (already used by POST). |
| 100-vote concurrency test is slow (Argon2id hashing for 100 users) | Use the 48 seeded users + register 52 more with the fast hasher (timeCost=2, memoryCost=1024) — same as the existing auth tests. Total runtime ~2s. |
| Build-ordering fix breaks `npm run dev` | `dev` script unchanged (still `--workspaces --if-present`). Only `build` and `typecheck` are reordered. Dev servers don't need `dist/`. |

---

## 5. Verification Ledger

| Check | Method | Pass criterion |
|---|---|---|
| Build from clean state | `rm -rf packages/*/dist apps/*/dist && npm run build` | All 4 workspaces emit `dist/`, exit 0 |
| Typecheck all workspaces | `npm run typecheck --workspaces --if-present` | Exit 0 |
| All tests pass | `npm test --workspaces --if-present` | All green, no skipped |
| New B10 tests pass | `npm test --workspace @embers/server` | 9+ new tests green |
| New B11 concurrency test passes | `npm test --workspace @embers/server` | Final score == base + 100 |
| Web single-file build intact | `npm run build --workspace @embers/web` | `apps/web/dist/index.html` exists, ~525 KB |
| No regressions in existing 346 tests | `npm test --workspaces --if-present` | 346 + new tests all green |

End of plan.
