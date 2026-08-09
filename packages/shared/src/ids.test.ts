import { describe, it, expect } from "vitest";
import {
  type UserId,
  type CommunityId,
  type PostId,
  type CommentId,
  type NotificationId,
  type VoteTargetId,
  asUserId,
  asCommunityId,
  asPostId,
  asCommentId,
  asNotificationId,
  isUserId,
} from "./ids";

describe("branded IDs", () => {
  it("asUserId creates a UserId from a string", () => {
    const id: UserId = asUserId("u-123");
    expect(id as string).toBe("u-123");
  });

  it("asCommunityId creates a CommunityId from a string", () => {
    const id: CommunityId = asCommunityId("c-1");
    expect(id as string).toBe("c-1");
  });

  it("asPostId creates a PostId from a string", () => {
    const id: PostId = asPostId("p-1");
    expect(id as string).toBe("p-1");
  });

  it("asCommentId creates a CommentId from a string", () => {
    const id: CommentId = asCommentId("p1-c1");
    expect(id as string).toBe("p1-c1");
  });

  it("asNotificationId creates a NotificationId from a string", () => {
    const id: NotificationId = asNotificationId("n-1");
    expect(id as string).toBe("n-1");
  });

  it("isUserId narrows unknown to UserId", () => {
    expect(isUserId("u-me")).toBe(true);
    expect(isUserId(123)).toBe(false);
    expect(isUserId(null)).toBe(false);
    expect(isUserId(undefined)).toBe(false);
  });

  it("brands are distinct between UserId and PostId", () => {
    type UserIdBrand = UserId extends string & { readonly __brand: infer B }
      ? B
      : never;
    type PostIdBrand = PostId extends string & { readonly __brand: infer B }
      ? B
      : never;
    const brandCheck: UserIdBrand = "UserId";
    const postBrandCheck: PostIdBrand = "PostId";
    expect(brandCheck).not.toBe(postBrandCheck);
  });

  it("VoteTargetId is a string alias for either post or comment IDs", () => {
    const target: VoteTargetId = "post:p-1";
    expect(target).toBe("post:p-1");
  });
});
