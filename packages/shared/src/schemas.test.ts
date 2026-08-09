import { describe, it, expect } from "vitest";
import {
  userSchema,
  communitySchema,
  postSchema,
  commentSchema,
  notificationSchema,
  voteValueSchema,
  postTypeSchema,
  sortModeSchema,
  imageCategorySchema,
  notificationTypeSchema,
} from "./schemas/index.js";
import type { User, Community, Post, Comment, AppNotification } from "./schemas/index.js";

describe("entity schemas", () => {
  const validUser = {
    id: "u-1",
    username: "alice",
    displayName: "Alice",
    bio: "Hello",
    karma: 100,
    createdAt: "2024-01-01T00:00:00.000Z",
    colorFrom: "#f97316",
    colorTo: "#db2777",
  };

  it("userSchema accepts a valid user", () => {
    const result = userSchema.safeParse(validUser);
    expect(result.success).toBe(true);
    if (result.success) {
      const u: User = result.data;
      expect(u.username).toBe("alice");
    }
  });

  it("userSchema rejects missing username", () => {
    const { username, ...rest } = validUser;
    void username;
    expect(userSchema.safeParse(rest).success).toBe(false);
  });

  it("userSchema rejects empty username", () => {
    expect(userSchema.safeParse({ ...validUser, username: "" }).success).toBe(false);
  });

  it("userSchema rejects negative karma", () => {
    expect(userSchema.safeParse({ ...validUser, karma: -1 }).success).toBe(false);
  });

  const validCommunity = {
    id: "c-1",
    name: "rust",
    title: "Rust",
    description: "Rust programming language",
    memberCount: 1000,
    onlineCount: 50,
    createdAt: "2024-01-01T00:00:00.000Z",
    category: "tech",
    colorFrom: "#6366f1",
    colorTo: "#06b6d4",
    icon: "rust",
    rules: ["Be nice", "No spam"],
  };

  it("communitySchema accepts a valid community", () => {
    const result = communitySchema.safeParse(validCommunity);
    expect(result.success).toBe(true);
    if (result.success) {
      const c: Community = result.data;
      expect(c.name).toBe("rust");
    }
  });

  it("communitySchema rejects unknown category", () => {
    expect(
      communitySchema.safeParse({ ...validCommunity, category: "flying" }).success,
    ).toBe(false);
  });

  it("imageCategorySchema exposes all 8 categories", () => {
    const all = imageCategorySchema.options;
    expect(all).toEqual([
      "nature",
      "tech",
      "gaming",
      "food",
      "space",
      "art",
      "animals",
      "sports",
    ]);
  });

  const validPost = {
    id: "p-1",
    communityId: "c-1",
    authorId: "u-1",
    title: "Hello world",
    type: "text",
    body: "Body content",
    score: 10,
    commentCount: 5,
    createdAt: "2024-01-01T00:00:00.000Z",
  };

  it("postSchema accepts a valid text post", () => {
    const result = postSchema.safeParse(validPost);
    expect(result.success).toBe(true);
    if (result.success) {
      const p: Post = result.data;
      expect(p.type).toBe("text");
    }
  });

  it("postSchema accepts a link post with linkUrl and linkDomain", () => {
    const result = postSchema.safeParse({
      ...validPost,
      type: "link",
      linkUrl: "https://example.com",
      linkDomain: "example.com",
      body: undefined,
    });
    expect(result.success).toBe(true);
  });

  it("postSchema rejects empty title", () => {
    expect(postSchema.safeParse({ ...validPost, title: "" }).success).toBe(false);
  });

  it("postTypeSchema exposes three types", () => {
    expect(postTypeSchema.options).toEqual(["text", "link", "image"]);
  });

  const validComment = {
    id: "p1-c1",
    postId: "p-1",
    authorId: "u-1",
    parentId: null,
    body: "Comment body",
    score: 5,
    createdAt: "2024-01-01T00:00:00.000Z",
    children: [],
  };

  it("commentSchema accepts a valid comment with empty children", () => {
    const result = commentSchema.safeParse(validComment);
    expect(result.success).toBe(true);
    if (result.success) {
      const c: Comment = result.data;
      expect(c.children).toEqual([]);
    }
  });

  it("commentSchema accepts nested children", () => {
    const nested = {
      ...validComment,
      id: "p1-c2",
      children: [{ ...validComment, id: "p1-c3", parentId: "p1-c2" }],
    };
    expect(commentSchema.safeParse(nested).success).toBe(true);
  });

  it("commentSchema rejects missing body", () => {
    const { body, ...rest } = validComment;
    void body;
    expect(commentSchema.safeParse(rest).success).toBe(false);
  });

  const validNotification = {
    id: "n-1",
    type: "upvote",
    message: "Someone upvoted your post",
    detail: "Post: Hello world",
    postId: "p-1",
    actorId: "u-2",
    createdAt: "2024-01-01T00:00:00.000Z",
    read: false,
  };

  it("notificationSchema accepts a valid notification", () => {
    const result = notificationSchema.safeParse(validNotification);
    expect(result.success).toBe(true);
    if (result.success) {
      const n: AppNotification = result.data;
      expect(n.type).toBe("upvote");
    }
  });

  it("notificationTypeSchema exposes 4 types", () => {
    expect(notificationTypeSchema.options).toEqual([
      "upvote",
      "reply",
      "mention",
      "community",
    ]);
  });

  it("notificationSchema rejects missing message", () => {
    const { message, ...rest } = validNotification;
    void message;
    expect(notificationSchema.safeParse(rest).success).toBe(false);
  });

  it("voteValueSchema only accepts -1, 0, 1", () => {
    expect(voteValueSchema.safeParse(-1).success).toBe(true);
    expect(voteValueSchema.safeParse(0).success).toBe(true);
    expect(voteValueSchema.safeParse(1).success).toBe(true);
    expect(voteValueSchema.safeParse(2).success).toBe(false);
    expect(voteValueSchema.safeParse(-2).success).toBe(false);
    expect(voteValueSchema.safeParse(0.5).success).toBe(false);
  });

  it("sortModeSchema exposes 5 modes", () => {
    expect(sortModeSchema.options).toEqual([
      "best",
      "hot",
      "new",
      "top",
      "rising",
    ]);
  });
});
