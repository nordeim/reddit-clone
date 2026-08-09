import { describe, it, expect } from "vitest";
import {
  registerInputSchema,
  loginInputSchema,
  refreshTokenOutputSchema,
  createPostInputSchema,
  updatePostInputSchema,
  listPostsQuerySchema,
  castVoteInputSchema,
  createCommentInputSchema,
  searchQuerySchema,
  listNotificationsQuerySchema,
  paginateOutputSchema,
  errorResponseSchema,
} from "./api/index.js";
import { z } from "zod";

describe("auth API schemas", () => {
  it("registerInputSchema accepts valid input", () => {
    const r = registerInputSchema.safeParse({
      username: "alice",
      password: "supersecret123",
      displayName: "Alice",
    });
    expect(r.success).toBe(true);
  });

  it("registerInputSchema rejects short password", () => {
    expect(
      registerInputSchema.safeParse({ username: "alice", password: "abc" }).success,
    ).toBe(false);
  });

  it("registerInputSchema rejects short username", () => {
    expect(
      registerInputSchema.safeParse({ username: "ab", password: "supersecret123" })
        .success,
    ).toBe(false);
  });

  it("registerInputSchema rejects long username (>30 chars)", () => {
    expect(
      registerInputSchema.safeParse({
        username: "a".repeat(31),
        password: "supersecret123",
      }).success,
    ).toBe(false);
  });

  it("loginInputSchema accepts valid credentials", () => {
    expect(
      loginInputSchema.safeParse({
        username: "alice",
        password: "supersecret123",
      }).success,
    ).toBe(true);
  });

  it("refreshTokenOutputSchema accepts valid response", () => {
    const r = refreshTokenOutputSchema.safeParse({
      accessToken: "ey...",
      user: {
        id: "u-1",
        username: "alice",
        displayName: "Alice",
        bio: "",
        karma: 0,
        createdAt: "2024-01-01T00:00:00.000Z",
        colorFrom: "#f97316",
        colorTo: "#db2777",
      },
    });
    expect(r.success).toBe(true);
  });
});

describe("posts API schemas", () => {
  it("createPostInputSchema accepts a text post", () => {
    expect(
      createPostInputSchema.safeParse({
        communityId: "c-1",
        title: "Hello world",
        type: "text",
        body: "Body content",
      }).success,
    ).toBe(true);
  });

  it("createPostInputSchema rejects empty title", () => {
    expect(
      createPostInputSchema.safeParse({
        communityId: "c-1",
        title: "",
        type: "text",
        body: "Body",
      }).success,
    ).toBe(false);
  });

  it("createPostInputSchema rejects link post without linkUrl", () => {
    expect(
      createPostInputSchema.safeParse({
        communityId: "c-1",
        title: "Link",
        type: "link",
      }).success,
    ).toBe(false);
  });

  it("createPostInputSchema rejects javascript: URL", () => {
    expect(
      createPostInputSchema.safeParse({
        communityId: "c-1",
        title: "Link",
        type: "link",
        linkUrl: "javascript:alert(1)",
      }).success,
    ).toBe(false);
  });

  it("updatePostInputSchema accepts a partial title-only update", () => {
    expect(
      updatePostInputSchema.safeParse({ title: "Updated title" }).success,
    ).toBe(true);
  });

  it("updatePostInputSchema accepts an empty object (no-op update)", () => {
    expect(updatePostInputSchema.safeParse({}).success).toBe(true);
  });

  it("updatePostInputSchema accepts body, linkUrl, imageCategory, flair together", () => {
    expect(
      updatePostInputSchema.safeParse({
        body: "New body",
        linkUrl: "https://example.com/new",
        imageCategory: "tech",
        flair: "News",
      }).success,
    ).toBe(true);
  });

  it("updatePostInputSchema rejects empty title", () => {
    expect(
      updatePostInputSchema.safeParse({ title: "" }).success,
    ).toBe(false);
  });

  it("updatePostInputSchema rejects javascript: URL", () => {
    expect(
      updatePostInputSchema.safeParse({ linkUrl: "javascript:alert(1)" }).success,
    ).toBe(false);
  });

  it("updatePostInputSchema rejects unknown imageCategory", () => {
    expect(
      updatePostInputSchema.safeParse({ imageCategory: "flying" }).success,
    ).toBe(false);
  });

  it("listPostsQuerySchema accepts cursor + limit", () => {
    expect(
      listPostsQuerySchema.safeParse({
        cursor: "eyJjcmVhdGVkQXQiOiIyMDI0In0=",
        limit: 20,
        sort: "hot",
      }).success,
    ).toBe(true);
  });

  it("listPostsQuerySchema rejects limit > 100", () => {
    expect(
      listPostsQuerySchema.safeParse({ limit: 200 }).success,
    ).toBe(false);
  });

  it("listPostsQuerySchema rejects negative limit", () => {
    expect(listPostsQuerySchema.safeParse({ limit: -5 }).success).toBe(false);
  });

  it("listPostsQuerySchema rejects unknown sort", () => {
    expect(
      listPostsQuerySchema.safeParse({ sort: "trending" }).success,
    ).toBe(false);
  });
});

describe("votes API schemas", () => {
  it("castVoteInputSchema accepts value -1, 0, 1", () => {
    for (const v of [-1, 0, 1]) {
      expect(
        castVoteInputSchema.safeParse({
          targetType: "post",
          value: v,
        }).success,
      ).toBe(true);
    }
  });

  it("castVoteInputSchema rejects value 2", () => {
    expect(
      castVoteInputSchema.safeParse({ targetType: "post", value: 2 }).success,
    ).toBe(false);
  });

  it("castVoteInputSchema rejects unknown targetType", () => {
    expect(
      castVoteInputSchema.safeParse({ targetType: "user", value: 1 }).success,
    ).toBe(false);
  });
});

describe("comments API schemas", () => {
  it("createCommentInputSchema accepts a top-level comment", () => {
    expect(
      createCommentInputSchema.safeParse({
        body: "Great post!",
      }).success,
    ).toBe(true);
  });

  it("createCommentInputSchema accepts a reply with parentId", () => {
    expect(
      createCommentInputSchema.safeParse({
        body: "Reply",
        parentId: "p1-c1",
      }).success,
    ).toBe(true);
  });

  it("createCommentInputSchema rejects empty body", () => {
    expect(
      createCommentInputSchema.safeParse({ body: "" }).success,
    ).toBe(false);
  });

  it("createCommentInputSchema rejects body > 10000 chars", () => {
    expect(
      createCommentInputSchema.safeParse({ body: "x".repeat(10001) }).success,
    ).toBe(false);
  });
});

describe("search API schemas", () => {
  it("searchQuerySchema accepts a valid query", () => {
    expect(
      searchQuerySchema.safeParse({
        q: "rust async",
        type: "posts",
        limit: 10,
      }).success,
    ).toBe(true);
  });

  it("searchQuerySchema rejects empty q", () => {
    expect(searchQuerySchema.safeParse({ q: "" }).success).toBe(false);
  });

  it("searchQuerySchema rejects q longer than 200 chars", () => {
    expect(
      searchQuerySchema.safeParse({ q: "x".repeat(201) }).success,
    ).toBe(false);
  });

  it("searchQuerySchema accepts type posts, communities, users", () => {
    for (const t of ["posts", "communities", "users"]) {
      expect(
        searchQuerySchema.safeParse({ q: "test", type: t }).success,
      ).toBe(true);
    }
  });

  it("searchQuerySchema rejects unknown type", () => {
    expect(
      searchQuerySchema.safeParse({ q: "test", type: "comments" }).success,
    ).toBe(false);
  });
});

describe("notifications API schemas", () => {
  it("listNotificationsQuerySchema accepts filter=all", () => {
    expect(
      listNotificationsQuerySchema.safeParse({ filter: "all" }).success,
    ).toBe(true);
  });

  it("listNotificationsQuerySchema accepts filter=unread", () => {
    expect(
      listNotificationsQuerySchema.safeParse({ filter: "unread" }).success,
    ).toBe(true);
  });

  it("listNotificationsQuerySchema rejects unknown filter", () => {
    expect(
      listNotificationsQuerySchema.safeParse({ filter: "favorites" }).success,
    ).toBe(false);
  });
});

describe("shared API envelope schemas", () => {
  it("paginateOutputSchema accepts { data, nextCursor }", () => {
    expect(
      paginateOutputSchema(z.string()).safeParse({
        data: ["a", "b"],
        nextCursor: "eyJuZXh0IjoxfQ==",
      }).success,
    ).toBe(true);
  });

  it("paginateOutputSchema accepts null nextCursor (end of list)", () => {
    expect(
      paginateOutputSchema(z.string()).safeParse({
        data: [],
        nextCursor: null,
      }).success,
    ).toBe(true);
  });

  it("errorResponseSchema accepts { error: { code, message } }", () => {
    expect(
      errorResponseSchema.safeParse({
        error: {
          code: "VALIDATION_ERROR",
          message: "Bad input",
        },
      }).success,
    ).toBe(true);
  });

  it("errorResponseSchema accepts with details field", () => {
    expect(
      errorResponseSchema.safeParse({
        error: {
          code: "VALIDATION_ERROR",
          message: "Bad input",
          details: { field: "username" },
        },
      }).success,
    ).toBe(true);
  });

  it("errorResponseSchema rejects missing code", () => {
    expect(
      errorResponseSchema.safeParse({
        error: { message: "Bad input" },
      }).success,
    ).toBe(false);
  });
});
