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

export * from "./ids";
export * from "./schemas/index";
export * from "./api/index";
