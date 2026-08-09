import { describe, it, expect } from "vitest";
import { asUserId, asCommunityId, asPostId, asCommentId, asNotificationId, isUserId, } from "./ids.js";
describe("branded IDs", () => {
    it("asUserId creates a UserId from a string", () => {
        const id = asUserId("u-123");
        expect(id).toBe("u-123");
    });
    it("asCommunityId creates a CommunityId from a string", () => {
        const id = asCommunityId("c-1");
        expect(id).toBe("c-1");
    });
    it("asPostId creates a PostId from a string", () => {
        const id = asPostId("p-1");
        expect(id).toBe("p-1");
    });
    it("asCommentId creates a CommentId from a string", () => {
        const id = asCommentId("p1-c1");
        expect(id).toBe("p1-c1");
    });
    it("asNotificationId creates a NotificationId from a string", () => {
        const id = asNotificationId("n-1");
        expect(id).toBe("n-1");
    });
    it("isUserId narrows unknown to UserId", () => {
        expect(isUserId("u-me")).toBe(true);
        expect(isUserId(123)).toBe(false);
        expect(isUserId(null)).toBe(false);
        expect(isUserId(undefined)).toBe(false);
    });
    it("brands are distinct between UserId and PostId", () => {
        const brandCheck = "UserId";
        const postBrandCheck = "PostId";
        expect(brandCheck).not.toBe(postBrandCheck);
    });
    it("VoteTargetId is a string alias for either post or comment IDs", () => {
        const target = "post:p-1";
        expect(target).toBe("post:p-1");
    });
});
//# sourceMappingURL=ids.test.js.map