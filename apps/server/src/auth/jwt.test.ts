import { describe, it, expect, beforeEach } from "vitest";
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken, decodeRefreshToken } from "./jwt.js";

const ACCESS_SECRET = "test-access-secret-32-chars-minimum-length!";
const REFRESH_SECRET = "test-refresh-secret-32-chars-minimum-length!";

describe("JWT (jose HS256)", () => {
  beforeEach(() => {
    // jose reads secrets from the function arguments, not env — but if any
    // test sets process.env, we clear it here for safety.
    delete process.env.JWT_ACCESS_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
  });

  it("signAccessToken produces a 3-part JWT", async () => {
    const token = await signAccessToken(
      { id: "u-1", username: "alice" },
      ACCESS_SECRET,
      "1s",
    );
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
  });

  it("verifyAccessToken round-trips the payload", async () => {
    const token = await signAccessToken(
      { id: "u-1", username: "alice" },
      ACCESS_SECRET,
      "1m",
    );
    const payload = await verifyAccessToken(token, ACCESS_SECRET);
    expect(payload.id).toBe("u-1");
    expect(payload.username).toBe("alice");
  });

  it("verifyAccessToken rejects a token signed with the wrong secret", async () => {
    const token = await signAccessToken(
      { id: "u-1", username: "alice" },
      "wrong-secret-not-the-same-as-the-other-one-32+",
      "1m",
    );
    await expect(verifyAccessToken(token, ACCESS_SECRET)).rejects.toThrow();
  });

  it("verifyAccessToken rejects an expired token", async () => {
    // 0 seconds — expires immediately (jose allows "0s" but we use a tiny
    // workaround with negative-time via "0s" which jose treats as expired
    // after issue).
    const token = await signAccessToken(
      { id: "u-1", username: "alice" },
      ACCESS_SECRET,
      "1s",
    );
    // Wait 1.5s to ensure expiry
    await new Promise((r) => setTimeout(r, 1500));
    await expect(verifyAccessToken(token, ACCESS_SECRET)).rejects.toThrow();
  });

  it("signRefreshToken includes a unique jti", async () => {
    const token1 = await signRefreshToken({ id: "u-1" }, REFRESH_SECRET, "7d");
    const token2 = await signRefreshToken({ id: "u-1" }, REFRESH_SECRET, "7d");
    const payload1 = await decodeRefreshToken(token1);
    const payload2 = await decodeRefreshToken(token2);
    expect(payload1?.jti).toBeTruthy();
    expect(payload2?.jti).toBeTruthy();
    expect(payload1?.jti).not.toBe(payload2?.jti);
  });

  it("verifyRefreshToken round-trips", async () => {
    const token = await signRefreshToken({ id: "u-1" }, REFRESH_SECRET, "7d");
    const payload = await verifyRefreshToken(token, REFRESH_SECRET);
    expect(payload.id).toBe("u-1");
    expect(payload.jti).toBeTruthy();
  });

  it("decodeRefreshToken returns null for a malformed token", async () => {
    const payload = await decodeRefreshToken("not-a-jwt");
    expect(payload).toBeNull();
  });
});
