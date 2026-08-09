import type { Community, Post, User } from "../types";

/**
 * Pure search utilities — extracted from `SearchBar.tsx` and `SearchPage.tsx`
 * so the normalization + ranking logic is testable in isolation.
 *
 * Ranking tiers (highest to lowest):
 *   1. Exact match       — `query === normalizedField`
 *   2. Prefix match      — `normalizedField.startsWith(query)`
 *   3. Token match       — every whitespace-separated query token appears as
 *                          a substring of the field, in any order
 *   4. Substring match   — `normalizedField.includes(query)`
 *   0. No match          — excluded from results
 *
 * Stable tie-breakers (id ascending) ensure deterministic ordering across
 * reloads — important so the same query produces the same dropdown every time.
 */

/** Lowercase, trim, collapse internal whitespace, strip simple punctuation. */
export function normalizeQuery(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Returns 0 (no match) through 4 (exact match). */
export function matchScore(field: string, normalizedQuery: string): number {
  if (normalizedQuery.length === 0) return 0;
  const f = normalizeQuery(field);
  if (f === normalizedQuery) return 4;
  if (f.startsWith(normalizedQuery)) return 3;
  const tokens = normalizedQuery.split(" ").filter(Boolean);
  if (tokens.length > 1 && tokens.every((t) => f.includes(t))) return 2;
  if (f.includes(normalizedQuery)) return 1;
  return 0;
}

export interface RankedResult<T> {
  item: T;
  score: number;
}

/** Rank a list of items by how well any of their `fields` match the query. */
export function rankByQuery<T>(
  items: readonly T[],
  fields: (item: T) => string[],
  query: string,
): RankedResult<T>[] {
  const q = normalizeQuery(query);
  if (q.length === 0) return [];
  const results: RankedResult<T>[] = [];
  for (const item of items) {
    const fieldValues = fields(item);
    let best = 0;
    for (const field of fieldValues) {
      const s = matchScore(field, q);
      if (s > best) best = s;
    }
    if (best > 0) results.push({ item, score: best });
  }
  // Sort: higher score first; tie-break by id ascending if the item has one.
  results.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    const aId = (a.item as { id?: string }).id ?? "";
    const bId = (b.item as { id?: string }).id ?? "";
    return aId < bId ? -1 : aId > bId ? 1 : 0;
  });
  return results;
}

export function searchPosts(posts: readonly Post[], query: string, limit = 50): Post[] {
  return rankByQuery(
    posts,
    (p) => [p.title, p.body ?? "", p.flair ?? ""],
    query,
  )
    .slice(0, limit)
    .map((r) => r.item);
}

export function searchCommunities(
  communities: readonly Community[],
  query: string,
  limit = 50,
): Community[] {
  return rankByQuery(
    communities,
    (c) => [c.name, c.title, c.description, c.category],
    query,
  )
    .slice(0, limit)
    .map((r) => r.item);
}

export function searchUsers(users: readonly User[], query: string, limit = 50): User[] {
  return rankByQuery(
    users,
    (u) => [u.username, u.displayName, u.bio],
    query,
  )
    .slice(0, limit)
    .map((r) => r.item);
}
