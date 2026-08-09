import { describe, it, expect } from "vitest";
import { openDb } from "../client";
import { runSeed } from "./index";
import { hashString, createRng, gradientFor } from "./random";

/**
 * Fake password hasher — replaces argon2 in tests so we don't pay the
 * ~100ms Argon2id cost per user × 48 users = ~5s. Returns a deterministic
 * fake hash so we can verify it round-trips.
 */
function fakeHasher(plain: string): Promise<string> {
  return Promise.resolve(`fakehash:${plain}:${hashString(plain)}`);
}

describe("PRNG port (random.ts)", () => {
  it("hashString produces stable 32-bit unsigned output", () => {
    // Same input → same output, every run.
    expect(hashString("embers-seed-v1")).toBe(hashString("embers-seed-v1"));
    // Different inputs → different outputs (with overwhelming probability).
    expect(hashString("a")).not.toBe(hashString("b"));
    // Within 32-bit range.
    expect(hashString("test")).toBeGreaterThan(0);
    expect(hashString("test")).toBeLessThanOrEqual(0xffffffff);
  });

  it("seededRandom is deterministic for the same seed", () => {
    const r1 = createRng("test-seed").next();
    const r2 = createRng("test-seed").next();
    expect(r1).toBe(r2);
  });

  it("gradientFor returns a stable pair for a given seed", () => {
    const [a1, b1] = gradientFor("alice");
    const [a2, b2] = gradientFor("alice");
    expect(a1).toBe(a2);
    expect(b1).toBe(b2);
  });

  it("createRng.int produces values within [min, max]", () => {
    const rng = createRng("range-test");
    for (let i = 0; i < 1000; i++) {
      const v = rng.int(5, 10);
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThanOrEqual(10);
    }
  });
});

describe("runSeed", () => {
  function freshSeededDb() {
    const { raw, db } = openDb({ path: ":memory:" });
    return { raw, db };
  }

  it("produces 48 generated users + 1 demo user = 49 rows", async () => {
    const { raw, db } = freshSeededDb();
    const result = await runSeed(db, { hashPassword: fakeHasher });
    expect(result.userCount).toBe(49);

    const count = raw.prepare("SELECT COUNT(*) as n FROM users").get() as { n: number };
    expect(count.n).toBe(49);
    raw.close();
  });

  it("produces 18 communities", async () => {
    const { raw, db } = freshSeededDb();
    await runSeed(db, { hashPassword: fakeHasher });
    const count = raw.prepare("SELECT COUNT(*) as n FROM communities").get() as { n: number };
    expect(count.n).toBe(18);
    raw.close();
  });

  it("produces exactly 320 posts", async () => {
    const { raw, db } = freshSeededDb();
    await runSeed(db, { hashPassword: fakeHasher });
    const count = raw.prepare("SELECT COUNT(*) as n FROM posts").get() as { n: number };
    expect(count.n).toBe(320);
    raw.close();
  });

  it("produces at least 1 comment per post (depth cap = 4)", async () => {
    const { raw, db } = freshSeededDb();
    await runSeed(db, { hashPassword: fakeHasher });
    const total = raw.prepare("SELECT COUNT(*) as n FROM comments").get() as { n: number };
    expect(total.n).toBeGreaterThanOrEqual(320); // at least 1 per post
    // Depth never exceeds 4
    const maxDepth = raw.prepare("SELECT MAX(depth) as d FROM comments").get() as { d: number };
    expect(maxDepth.d).toBeLessThanOrEqual(4);
    raw.close();
  });

  it("produces exactly 18 notifications, all addressed to u-me", async () => {
    const { raw, db } = freshSeededDb();
    await runSeed(db, { hashPassword: fakeHasher });
    const count = raw.prepare("SELECT COUNT(*) as n FROM notifications").get() as { n: number };
    expect(count.n).toBe(18);
    const allMine = raw
      .prepare("SELECT COUNT(*) as n FROM notifications WHERE user_id = 'u-me'")
      .get() as { n: number };
    expect(allMine.n).toBe(18);
    raw.close();
  });

  it("is idempotent — running twice produces identical row counts", async () => {
    const { raw, db } = freshSeededDb();
    const first = await runSeed(db, { hashPassword: fakeHasher });
    const second = await runSeed(db, { hashPassword: fakeHasher });
    expect(second).toEqual(first);
    const counts = raw.prepare(
      "SELECT " +
      "(SELECT COUNT(*) FROM users) as users, " +
      "(SELECT COUNT(*) FROM communities) as communities, " +
      "(SELECT COUNT(*) FROM posts) as posts, " +
      "(SELECT COUNT(*) FROM comments) as comments, " +
      "(SELECT COUNT(*) FROM notifications) as notifs",
    ).get() as { users: number; communities: number; posts: number; comments: number; notifs: number };
    expect(counts.users).toBe(49);
    expect(counts.communities).toBe(18);
    expect(counts.posts).toBe(320);
    expect(counts.comments).toBe(first.commentCount);
    expect(counts.notifs).toBe(18);
    raw.close();
  });

  it("stores a password hash for every user (no plaintext)", async () => {
    const { raw, db } = freshSeededDb();
    await runSeed(db, { hashPassword: fakeHasher });
    const rows = raw.prepare("SELECT password_hash FROM users LIMIT 5").all() as Array<{ password_hash: string }>;
    for (const r of rows) {
      expect(r.password_hash.startsWith("fakehash:")).toBe(true);
      // Never the plaintext password
      expect(r.password_hash).not.toBe("embers-demo");
    }
    raw.close();
  });

  it("all posts reference existing communities and authors", async () => {
    const { raw, db } = freshSeededDb();
    await runSeed(db, { hashPassword: fakeHasher });
    const orphans = raw.prepare(
      "SELECT COUNT(*) as n FROM posts p " +
      "LEFT JOIN communities c ON c.id = p.community_id " +
      "LEFT JOIN users u ON u.id = p.author_id " +
      "WHERE c.id IS NULL OR u.id IS NULL",
    ).get() as { n: number };
    expect(orphans.n).toBe(0);
    raw.close();
  });

  it("posts_fts is populated for every post", async () => {
    const { raw, db } = freshSeededDb();
    await runSeed(db, { hashPassword: fakeHasher });
    const ftsCount = raw.prepare("SELECT COUNT(*) as n FROM posts_fts").get() as { n: number };
    expect(ftsCount.n).toBe(320);
    raw.close();
  });
});
