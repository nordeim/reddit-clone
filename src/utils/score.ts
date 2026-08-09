import type { Post, SortMode, VoteValue } from "../types";

/**
 * Pure score + sort utilities, extracted from `data/posts.ts` for testability.
 *
 * These functions never mutate their inputs. Vote-aware variants accept a
 * `votes` overlay (matching the store's namespaced-key shape) so callers can
 * sort posts by *visible* score without mutating `post.score`.
 */

/** Get the user-visible score for a target (post or comment). */
export function getVisibleScore(baseScore: number, vote: VoteValue): number {
  return baseScore + vote;
}

/** Hot-ranking score: high score + recent ages to the top. */
export function hotScore(post: Post, now: number = Date.now()): number {
  const ageHours = (now - new Date(post.createdAt).getTime()) / 3_600_000;
  return post.score / Math.pow(ageHours + 2, 1.35);
}

/** Rising score: favours recent posts with positive momentum. */
export function risingScore(post: Post, now: number = Date.now()): number {
  const ageHours = Math.max(1, (now - new Date(post.createdAt).getTime()) / 3_600_000);
  if (ageHours > 30) return -Infinity;
  return post.commentCount / ageHours + post.score / (ageHours * 4);
}

/**
 * Best score — for now, identical to hot. Kept as a separate function so a
 * future "best" algorithm (e.g. seeded quality + hot component) can swap in
 * without touching the sortPosts dispatch.
 */
export function bestScore(post: Post, now: number = Date.now()): number {
  return hotScore(post, now);
}

/**
 * Sort a copy of `posts` by the given mode. The input array is never mutated.
 *
 * Tie-breakers:
 * - `new`   : createdAt desc, id asc
 * - `top`   : score desc, createdAt desc, id asc
 * - `rising`: risingScore desc, createdAt desc, id asc
 * - `hot`   : hotScore desc, createdAt desc, id asc
 * - `best`  : bestScore desc, createdAt desc, id asc
 *
 * Stable tie-breakers (id asc) ensure deterministic ordering across reloads.
 */
export function sortPosts(posts: Post[], mode: SortMode, now: number = Date.now()): Post[] {
  const copy = [...posts];

  const byCreatedAtDesc = (a: Post, b: Post) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  const byIdAsc = (a: Post, b: Post) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const byScoreDesc = (a: Post, b: Post) => b.score - a.score;

  switch (mode) {
    case "new":
      return copy.sort((a, b) => byCreatedAtDesc(a, b) || byIdAsc(a, b));
    case "top":
      return copy.sort((a, b) => byScoreDesc(a, b) || byCreatedAtDesc(a, b) || byIdAsc(a, b));
    case "rising":
      return copy.sort(
        (a, b) => risingScore(b, now) - risingScore(a, now) || byCreatedAtDesc(a, b) || byIdAsc(a, b),
      );
    case "hot":
    case "best":
    default:
      return copy.sort(
        (a, b) => bestScore(b, now) - bestScore(a, now) || byCreatedAtDesc(a, b) || byIdAsc(a, b),
      );
  }
}
