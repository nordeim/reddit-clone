import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password.js";

describe("password hashing (Argon2id)", () => {
  // Argon2id at default cost is ~50-100ms per hash — tests here are intentionally
  // minimal to keep the suite fast.

  it("hashPassword returns a hash that does not contain the plaintext", async () => {
    const hash = await hashPassword("supersecret123");
    expect(hash).not.toBe("supersecret123");
    expect(hash.length).toBeGreaterThan(40);
    expect(hash.startsWith("$argon2id$")).toBe(true);
  });

  it("verifyPassword accepts the correct password", async () => {
    const hash = await hashPassword("supersecret123");
    const result = await verifyPassword("supersecret123", hash);
    expect(result).toBe(true);
  });

  it("verifyPassword rejects the wrong password", async () => {
    const hash = await hashPassword("supersecret123");
    const result = await verifyPassword("wrong-password", hash);
    expect(result).toBe(false);
  });

  it("hashPassword produces different hashes for the same password (salt)", async () => {
    const hash1 = await hashPassword("same-password");
    const hash2 = await hashPassword("same-password");
    expect(hash1).not.toBe(hash2); // random salt
    // But both verify against the same plaintext
    expect(await verifyPassword("same-password", hash1)).toBe(true);
    expect(await verifyPassword("same-password", hash2)).toBe(true);
  });
});
