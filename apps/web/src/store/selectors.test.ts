import { describe, it, expect } from "vitest";
import {
  getVisibleScore,
  isPostSaved,
  isCommunityJoined,
  getUnreadNotificationCount,
  getDerivedCommentCount,
  capBadgeCount,
} from "./selectors";
import type { AppNotification, Comment } from "../types";

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

  it("handles zero base score", () => {
    expect(getVisibleScore(0, 1)).toBe(1);
    expect(getVisibleScore(0, -1)).toBe(-1);
  });

  it("handles negative base scores", () => {
    expect(getVisibleScore(-5, 1)).toBe(-4);
    expect(getVisibleScore(-5, -1)).toBe(-6);
  });
});

describe("isPostSaved", () => {
  it("returns true when the post id is in the saved list", () => {
    expect(isPostSaved("p1", ["p1", "p2"])).toBe(true);
    expect(isPostSaved("p2", ["p1", "p2"])).toBe(true);
  });

  it("returns false when the post id is not in the saved list", () => {
    expect(isPostSaved("p3", ["p1", "p2"])).toBe(false);
  });

  it("returns false for an empty saved list", () => {
    expect(isPostSaved("p1", [])).toBe(false);
  });
});

describe("isCommunityJoined", () => {
  it("returns true when the community id is in the joined list", () => {
    expect(isCommunityJoined("c1", ["c1", "c2"])).toBe(true);
  });

  it("returns false when the community id is not in the joined list", () => {
    expect(isCommunityJoined("c3", ["c1", "c2"])).toBe(false);
  });

  it("returns false for an empty joined list", () => {
    expect(isCommunityJoined("c1", [])).toBe(false);
  });
});

describe("getUnreadNotificationCount", () => {
  const baseNotifications: AppNotification[] = [
    { id: "n1", type: "upvote", message: "m1", detail: "d1", postId: "p1", actorId: "u1", createdAt: "2026-01-01T00:00:00Z", read: false },
    { id: "n2", type: "reply", message: "m2", detail: "d2", postId: "p1", actorId: "u1", createdAt: "2026-01-02T00:00:00Z", read: true },
    { id: "n3", type: "mention", message: "m3", detail: "d3", postId: "p1", actorId: "u1", createdAt: "2026-01-03T00:00:00Z", read: false },
  ];

  it("counts notifications whose read flag is false", () => {
    expect(getUnreadNotificationCount(baseNotifications, {})).toBe(2);
  });

  it("returns 0 when all notifications are read", () => {
    const allRead = baseNotifications.map((n) => ({ ...n, read: true }));
    expect(getUnreadNotificationCount(allRead, {})).toBe(0);
  });

  it("returns 0 for an empty notification list", () => {
    expect(getUnreadNotificationCount([], {})).toBe(0);
  });

  it("honours override marking a notification as read even if seed says unread", () => {
    // n1 was unread in the seed, but the user has marked it read.
    expect(getUnreadNotificationCount(baseNotifications, { n1: true })).toBe(1);
  });

  it("honours override marking a notification as unread even if seed says read", () => {
    // n2 was read in the seed, but the user has explicitly marked it unread.
    expect(getUnreadNotificationCount(baseNotifications, { n2: false })).toBe(3);
  });

  it("ignores overrides for non-existent notification ids", () => {
    expect(getUnreadNotificationCount(baseNotifications, { n999: true })).toBe(2);
  });
});

describe("getDerivedCommentCount", () => {
  function makeComment(id: string, children: Comment[] = []): Comment {
    return {
      id,
      postId: "p1",
      authorId: "u1",
      parentId: null,
      body: "body",
      score: 0,
      createdAt: "2026-01-01T00:00:00Z",
      children,
    };
  }

  it("returns 0 for empty base and local comment lists", () => {
    expect(getDerivedCommentCount([], [])).toBe(0);
  });

  it("counts a flat list of root comments", () => {
    const base = [makeComment("c1"), makeComment("c2"), makeComment("c3")];
    expect(getDerivedCommentCount(base, [])).toBe(3);
  });

  it("counts nested children recursively", () => {
    const base = [
      makeComment("c1", [makeComment("c1-r1"), makeComment("c1-r2", [makeComment("c1-r2-r1")])]),
      makeComment("c2"),
    ];
    // c1, c1-r1, c1-r2, c1-r2-r1, c2 → 5
    expect(getDerivedCommentCount(base, [])).toBe(5);
  });

  it("adds local comments to the total", () => {
    const base = [makeComment("c1")];
    const local = [makeComment("local-1"), makeComment("local-2", [makeComment("local-2-r1")])];
    // base: 1, local: 2 + 1 nested = 3, total = 4
    expect(getDerivedCommentCount(base, local)).toBe(4);
  });

  it("handles local comments only (no base)", () => {
    const local = [makeComment("local-1"), makeComment("local-2")];
    expect(getDerivedCommentCount([], local)).toBe(2);
  });
});

describe("capBadgeCount", () => {
  it("returns empty string for zero or negative counts", () => {
    expect(capBadgeCount(0)).toBe("");
    expect(capBadgeCount(-1)).toBe("");
  });

  it("returns the count as a string for 1-9", () => {
    expect(capBadgeCount(1)).toBe("1");
    expect(capBadgeCount(5)).toBe("5");
    expect(capBadgeCount(9)).toBe("9");
  });

  it("returns '9+' for counts greater than 9", () => {
    expect(capBadgeCount(10)).toBe("9+");
    expect(capBadgeCount(99)).toBe("9+");
    expect(capBadgeCount(1000)).toBe("9+");
  });
});
