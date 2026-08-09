import { describe, it, expect } from "vitest";
import {
  normalizeQuery,
  matchScore,
  rankByQuery,
  searchPosts,
  searchCommunities,
  searchUsers,
} from "./search";
import type { Community, Post, User } from "../types";

describe("normalizeQuery", () => {
  it("lowercases the input", () => {
    expect(normalizeQuery("TypeScript")).toBe("typescript");
  });

  it("trims leading and trailing whitespace", () => {
    expect(normalizeQuery("  hello  ")).toBe("hello");
  });

  it("collapses internal whitespace runs into single spaces", () => {
    expect(normalizeQuery("hello    world")).toBe("hello world");
  });

  it("strips simple punctuation", () => {
    expect(normalizeQuery("hello, world!")).toBe("hello world");
    expect(normalizeQuery("r/typescript")).toBe("r typescript");
  });

  it("returns empty string for empty/whitespace-only input", () => {
    expect(normalizeQuery("")).toBe("");
    expect(normalizeQuery("   ")).toBe("");
  });
});

describe("matchScore", () => {
  it("returns 4 for exact match", () => {
    expect(matchScore("typescript", "typescript")).toBe(4);
  });

  it("returns 3 for prefix match", () => {
    expect(matchScore("typescript weekly", "typescript")).toBe(3);
  });

  it("returns 2 for token match (multi-word query, all tokens present)", () => {
    expect(matchScore("the quick brown fox", "brown fox")).toBe(2);
    // tokens in different order still match
    expect(matchScore("the quick brown fox", "fox brown")).toBe(2);
  });

  it("returns 1 for substring match", () => {
    expect(matchScore("r/typescript", "typescript")).toBe(1);
  });

  it("returns 0 for no match", () => {
    expect(matchScore("javascript", "typescript")).toBe(0);
  });

  it("returns 0 for empty query", () => {
    expect(matchScore("anything", "")).toBe(0);
  });

  it("normalizes the field before matching (punctuation, case)", () => {
    // "Hello, World" → "hello world"; query "hello" should prefix-match (3).
    expect(matchScore("Hello, World", "hello")).toBe(3);
  });
});

describe("rankByQuery", () => {
  interface Item {
    id: string;
    name: string;
  }
  const items: Item[] = [
    { id: "b", name: "typescript" }, // exact match for "typescript" → 4
    { id: "a", name: "typescript weekly" }, // prefix match → 3
    { id: "c", name: "javascript" }, // no match → 0
    { id: "d", name: "r/typescript" }, // substring → 1
  ];

  it("returns items sorted by match score descending", () => {
    const ranked = rankByQuery(items, (i) => [i.name], "typescript");
    expect(ranked.map((r) => r.item.id)).toEqual(["b", "a", "d"]);
  });

  it("tie-breaks by id ascending when scores are equal", () => {
    const tied: Item[] = [
      { id: "z", name: "typescript" },
      { id: "a", name: "typescript" },
      { id: "m", name: "typescript" },
    ];
    const ranked = rankByQuery(tied, (i) => [i.name], "typescript");
    expect(ranked.map((r) => r.item.id)).toEqual(["a", "m", "z"]);
  });

  it("returns empty array for empty query", () => {
    expect(rankByQuery(items, (i) => [i.name], "")).toEqual([]);
  });

  it("returns empty array when nothing matches", () => {
    expect(rankByQuery(items, (i) => [i.name], "rust")).toEqual([]);
  });
});

describe("searchPosts", () => {
  const posts: Post[] = [
    {
      id: "p1",
      communityId: "c1",
      authorId: "u1",
      title: "TypeScript Tips and Tricks",
      type: "text",
      score: 100,
      commentCount: 5,
      createdAt: "2026-08-01T00:00:00Z",
    },
    {
      id: "p2",
      communityId: "c1",
      authorId: "u2",
      title: "Why I love Rust",
      type: "text",
      body: "Memory safety without garbage collection",
      score: 50,
      commentCount: 2,
      createdAt: "2026-08-02T00:00:00Z",
    },
    {
      id: "p3",
      communityId: "c2",
      authorId: "u3",
      title: "Weekly TypeScript roundup",
      type: "link",
      score: 200,
      commentCount: 10,
      createdAt: "2026-08-03T00:00:00Z",
      flair: "News",
    },
  ];

  it("finds posts by title", () => {
    const results = searchPosts(posts, "typescript");
    expect(results.map((p) => p.id)).toEqual(["p1", "p3"]);
  });

  it("finds posts by body", () => {
    const results = searchPosts(posts, "memory safety");
    expect(results.map((p) => p.id)).toEqual(["p2"]);
  });

  it("finds posts by flair", () => {
    const results = searchPosts(posts, "news");
    expect(results.map((p) => p.id)).toEqual(["p3"]);
  });

  it("returns empty array for no matches", () => {
    expect(searchPosts(posts, "java")).toEqual([]);
  });

  it("returns empty array for empty query", () => {
    expect(searchPosts(posts, "")).toEqual([]);
  });

  it("returns empty array for whitespace-only query", () => {
    expect(searchPosts(posts, "   ")).toEqual([]);
  });

  it("respects the limit parameter", () => {
    const many: Post[] = Array.from({ length: 20 }, (_, i) => ({
      id: `p${i}`,
      communityId: "c1",
      authorId: "u1",
      title: `typescript post ${i}`,
      type: "text" as const,
      score: 1,
      commentCount: 0,
      createdAt: "2026-08-01T00:00:00Z",
    }));
    expect(searchPosts(many, "typescript", 5)).toHaveLength(5);
  });
});

describe("searchCommunities", () => {
  const communities: Community[] = [
    {
      id: "c1",
      name: "typescript",
      title: "TypeScript",
      description: "TS discussions",
      memberCount: 1000,
      onlineCount: 10,
      createdAt: "2024-01-01T00:00:00Z",
      category: "tech",
      colorFrom: "#000",
      colorTo: "#fff",
      icon: "📘",
      rules: [],
    },
    {
      id: "c2",
      name: "programming",
      title: "Programming",
      description: "All languages welcome",
      memberCount: 5000,
      onlineCount: 50,
      createdAt: "2024-01-02T00:00:00Z",
      category: "tech",
      colorFrom: "#000",
      colorTo: "#fff",
      icon: "💻",
      rules: [],
    },
  ];

  it("finds communities by name", () => {
    expect(searchCommunities(communities, "typescript").map((c) => c.id)).toEqual(["c1"]);
  });

  it("finds communities by description", () => {
    expect(searchCommunities(communities, "languages").map((c) => c.id)).toEqual(["c2"]);
  });

  it("finds communities by category", () => {
    // Both communities are in "tech"
    expect(searchCommunities(communities, "tech")).toHaveLength(2);
  });
});

describe("searchUsers", () => {
  const users: User[] = [
    {
      id: "u1",
      username: "alice_dev",
      displayName: "Alice Dev",
      bio: " TypeScript enthusiast",
      karma: 1000,
      createdAt: "2024-01-01T00:00:00Z",
      colorFrom: "#000",
      colorTo: "#fff",
    },
    {
      id: "u2",
      username: "bob",
      displayName: "Bob",
      bio: "Rustacean",
      karma: 500,
      createdAt: "2024-01-02T00:00:00Z",
      colorFrom: "#000",
      colorTo: "#fff",
    },
  ];

  it("finds users by username", () => {
    expect(searchUsers(users, "alice").map((u) => u.id)).toEqual(["u1"]);
  });

  it("finds users by display name", () => {
    expect(searchUsers(users, "alice dev").map((u) => u.id)).toEqual(["u1"]);
  });

  it("finds users by bio", () => {
    expect(searchUsers(users, "typescript").map((u) => u.id)).toEqual(["u1"]);
  });

  it("returns empty array for no matches", () => {
    expect(searchUsers(users, "charlie")).toEqual([]);
  });
});
