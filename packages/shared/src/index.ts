/**
 * @embers/shared — Zod schemas, branded IDs, and API contracts shared by
 * `apps/web` (client) and `apps/server` (backend).
 *
 * Exports:
 *   - Branded ID types + constructors (`asUserId`, `isUserId`, …)
 *   - Entity Zod schemas (`userSchema`, `postSchema`, …) + inferred types
 *   - API input/output schemas per endpoint (`registerInputSchema`, …)
 *   - Generic envelope schemas (`paginateOutputSchema`, `errorResponseSchema`)
 */

export * from "./ids.js";
export * from "./schemas/index.js";
export * from "./api/index.js";
