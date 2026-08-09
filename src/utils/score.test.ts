import { describe, it, expect } from "vitest";
import { getVisibleScore, hotScore, risingScore, sortPosts } from "./score";
import type { Post } from "../types";

const NOW = new Date("2026-08-09T12:00:00Z").getTime();
const HOUR = 3_600_000;
const DAY = 86_400_000;

function makePost(overrides: Partial<Post> & { id: string }): Post {
  return {
    id: overrides.id,
    communityId: overrides.communityId ?? "c1",
    authorId: overrides.authorId ?? "u1",
    title: overrides.title ?? `Post ${overrides.id}`,
    type: overrides.type ?? "text",
    body: overrides.body,
    linkUrl: overrides.linkUrl,
    linkDomain: overrides.linkDomain,
    imageCategory: overrides.imageCategory,
    flair: overrides.flair,
    score: overrides.score ?? 0,
    commentCount: overrides.commentCount ?? 0,
    createdAt: overrides.createdAt ?? new Date(NOW - HOUR).toISOString(),
    isLocal: overrides.isLocal,
  };
}

describe("getVisibleScore", () => {
  it("adds an upvote to the base score", () => {
    expect(getVisibleScore(10, 1)).toBe(11);
  });

  it("subtracts a downvote from the base score", () => {
    expect(getVisibleScore(10, -1)).toBe(9);
  });

  it("returns the base score when no vote is cast", () => {
    expect(getVisibleScore(10, 0)).toBe(10);
  });

  it("handles zero base score with upvote", () => {
    expect(getVisibleScore(0, 1)).toBe(1);
  });

  it("handles negative base scores", () => {
    expect(getVisibleScore(-5, 1)).toBe(-4);
    expect(getVisibleScore(-5, -1)).toBe(-6);
  });
});

describe("hotScore", () => {
  it("returns a higher score for newer posts with the same base score", () => {
    const oldPost = makePost({ id: "p1", score: 100, createdAt: new Date(NOW - 7 * DAY).toISOString() });
    const newPost = makePost({ id: "p2", score: 100, createdAt: new Date(NOW - 1 * HOUR).toISOString() });
    expect(hotScore(newPost, NOW)).toBeGreaterThan(hotScore(oldPost, NOW));
  });

  it("returns a higher score for higher-scored posts of the same age", () => {
    const low = makePost({ id: "p1", score: 10, createdAt: new Date(NOW - HOUR).toISOString() });
    const high = makePost({ id: "p2", score: 1000, createdAt: new Date(NOW - HOUR).toISOString() });
    expect(hotScore(high, NOW)).toBeGreaterThan(hotScore(low, NOW));
  });

  it("returns a finite number for any post within a reasonable age", () => {
    const post = makePost({ id: "p1", score: 50, createdAt: new Date(NOW - 30 * DAY).toISOString() });
    const s = hotScore(post, NOW);
    expect(Number.isFinite(s)).toBe(true);
  });
});

describe("risingScore", () => {
  it("returns -Infinity for posts older than 30 days", () => {
    const old = makePost({ id: "p1", score: 100, createdAt: new Date(NOW - 31 * DAY).toISOString() });
    expect(risingScore(old, NOW)).toBe(-Infinity);
  });

  it("returns a finite score for posts within 30 days", () => {
    const recent = makePost({ id: "p1", score: 100, createdAt: new Date(NOW - 2 * HOUR).toISOString() });
    expect(Number.isFinite(risingScore(recent, NOW))).toBe(true);
  });
});

describe("sortPosts", () => {
  const posts: Post[] = [
    makePost({ id: "p1", score: 50, createdAt: new Date(NOW - 1 * HOUR).toISOString() }),
    makePost({ id: "p2", score: 200, createdAt: new Date(NOW - 2 * HOUR).toISOString() }),
    makePost({ id: "p3", score: 10, createdAt: new Date(NOW - 30 * HOUR).toISOString() }),
    makePost({ id: "p4", score: 200, createdAt: new Date(NOW - 5 * HOUR).toISOString() }),
  ];

  it("does not mutate the input array", () => {
    const copy = [...posts];
    sortPosts(posts, "hot", NOW);
    expect(posts).toEqual(copy);
  });

  it("'new' sorts by createdAt descending", () => {
    const sorted = sortPosts(posts, "new", NOW);
    expect(sorted.map((p) => p.id)).toEqual(["p1", "p2", "p4", "p3"]);
  });

  it("'top' sorts by score descending, then createdAt descending", () => {
    const sorted = sortPosts(posts, "top", NOW);
    // p2 and p4 both have score 200; p2 is newer (1h vs 5h ago), so p2 first.
    expect(sorted.map((p) => p.id)).toEqual(["p2", "p4", "p1", "p3"]);
  });

  it("'hot' favours recent + high-score", () => {
    const sorted = sortPosts(posts, "hot", NOW);
    // Hot score = score / (ageHours + 2)^1.35
    //   p1: 50 / (1+2)^1.35  ≈ 12.0
    //   p2: 200 / (2+2)^1.35 ≈ 31.0  ← highest
    //   p3: 10 / (30+2)^1.35 ≈ 0.11  ← lowest
    //   p4: 200 / (5+2)^1.35 ≈ 14.9
    // Expected order: p2 > p4 > p1 > p3
    expect(sorted.map((p) => p.id)).toEqual(["p2", "p4", "p1", "p3"]);
  });

  it("'rising' drops posts older than 30 days to the end", () => {
    const sorted = sortPosts(posts, "rising", NOW);
    // p3 is 30h old → still under 30 days, so it should not be -Infinity,
    // but it will rank lowest because of low score + old age.
    expect(sorted[sorted.length - 1].id).toBe("p3");
  });

  it("uses stable tie-breakers (id ascending) for posts with identical score+createdAt", () => {
    const t = new Date(NOW - HOUR).toISOString();
    const tied: Post[] = [
      makePost({ id: "pB", score: 100, createdAt: t }),
      makePost({ id: "pA", score: 100, createdAt: t }),
      makePost({ id: "pC", score: 100, createdAt: t }),
    ];
    const sorted = sortPosts(tied, "top", NOW);
    expect(sorted.map((p) => p.id)).toEqual(["pA", "pB", "pC"]);
  });

  it("falls back to hot/best for unknown sort modes", () => {
    const sorted = sortPosts(posts, "best", NOW);
    // best === hot for now
    expect(sorted.map((p) => p.id)).toEqual(["p2", "p4", "p1", "p3"]);
  });

  it("handles an empty input array", () => {
    expect(sortPosts([], "hot", NOW)).toEqual([]);
  });
});
