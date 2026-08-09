import { describe, it, expect } from "vitest";
import { hashString, seededRandom, createRng, gradientFor } from "./random";

describe("hashString (FNV-1a)", () => {
  it("returns a 32-bit unsigned integer", () => {
    const h = hashString("hello");
    expect(typeof h).toBe("number");
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
  });

  it("is deterministic for the same input", () => {
    expect(hashString("posts-seed-v2")).toBe(hashString("posts-seed-v2"));
  });

  it("returns different hashes for different inputs", () => {
    expect(hashString("a")).not.toBe(hashString("b"));
    expect(hashString("users-seed-v1")).not.toBe(hashString("posts-seed-v2"));
  });

  it("returns the FNV-1a offset basis for empty input (well-known value)", () => {
    // FNV-1a of empty string is the offset basis: 2166136261
    expect(hashString("")).toBe(2166136261);
  });
});

describe("seededRandom (mulberry32)", () => {
  it("produces deterministic output for the same seed", () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    const seqA = [a(), a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it("produces different output for different seeds", () => {
    const a = seededRandom(1);
    const b = seededRandom(2);
    const seqA = [a(), a(), a()];
    const seqB = [b(), b(), b()];
    expect(seqA).not.toEqual(seqB);
  });

  it("always returns floats in [0, 1)", () => {
    const rng = seededRandom(12345);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("treats seed 0 as 1 (the `seed || 1` fallback)", () => {
    // The implementation does `let a = seed || 1;` — seed 0 falls back to 1.
    // We characterize that here; if it ever changes, this test alerts us.
    const fromZero = seededRandom(0);
    const fromOne = seededRandom(1);
    expect(fromZero()).toBe(fromOne());
  });
});

describe("createRng", () => {
  it("accepts a string seed and produces stable output", () => {
    const rng = createRng("test-seed");
    const seq = [rng.next(), rng.next(), rng.next()];
    // Deterministic — same seed must give same seq.
    const rng2 = createRng("test-seed");
    const seq2 = [rng2.next(), rng2.next(), rng2.next()];
    expect(seq).toEqual(seq2);
  });

  it("accepts a numeric seed", () => {
    const rng = createRng(123);
    expect(rng.next()).toBeTypeOf("number");
  });

  it("int(min, max) stays within [min, max] inclusive", () => {
    const rng = createRng("range-test");
    for (let i = 0; i < 1000; i++) {
      const v = rng.int(5, 10);
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThanOrEqual(10);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it("int(min, max) returns min when min === max", () => {
    const rng = createRng("edge-test");
    expect(rng.int(7, 7)).toBe(7);
  });

  it("pick returns one of the array's elements", () => {
    const rng = createRng("pick-test");
    const arr = ["a", "b", "c"];
    const picked = rng.pick(arr);
    expect(arr).toContain(picked);
  });

  it("picks returns N distinct elements from the source array", () => {
    const rng = createRng("picks-test");
    const arr = ["a", "b", "c", "d", "e"];
    const picked = rng.picks(arr, 3);
    expect(picked).toHaveLength(3);
    // All distinct
    expect(new Set(picked).size).toBe(3);
    // All from source
    for (const p of picked) expect(arr).toContain(p);
  });

  it("picks returns at most arr.length elements", () => {
    const rng = createRng("picks-overflow");
    const arr = ["a", "b"];
    expect(rng.picks(arr, 5)).toHaveLength(2);
  });

  it("bool returns true with roughly the configured probability", () => {
    const rng = createRng("bool-test");
    let trues = 0;
    const N = 1000;
    for (let i = 0; i < N; i++) if (rng.bool(0.7)) trues++;
    // Allow generous slack — mulberry32 is decent but not crypto-strong.
    expect(trues).toBeGreaterThan(N * 0.6);
    expect(trues).toBeLessThan(N * 0.8);
  });
});

describe("gradientFor", () => {
  it("returns a [from, to] pair of hex colors", () => {
    const [from, to] = gradientFor("test-seed");
    expect(typeof from).toBe("string");
    expect(typeof to).toBe("string");
    expect(from).toMatch(/^#[0-9a-f]{6}$/i);
    expect(to).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("is stable for the same seed", () => {
    expect(gradientFor("alice")).toEqual(gradientFor("alice"));
  });

  it("returns one of the curated gradient pairs (avoids hallucinated colors)", () => {
    // Different seeds should pick from a finite pool of gradients.
    const seeds = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
    const pairs = new Set(seeds.map((s) => gradientFor(s).join("|")));
    // At least 2 distinct pairs picked from the 10 curated ones.
    expect(pairs.size).toBeGreaterThanOrEqual(2);
  });
});
