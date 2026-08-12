import { describe, it, expect } from "vitest";
import { openDb, listTables, backupDb } from "./client.js";
import { applyFts5, searchPosts } from "./fts5.js";
import { posts, users, communities, votes } from "./schema/index.js";
import { eq } from "drizzle-orm";
import { rmSync } from "node:fs";

describe("openDb", () => {
  it("opens an in-memory database without WAL", () => {
    const { raw, db } = openDb({ path: ":memory:", skipMigrate: true, skipFts5: true });
    expect(raw.open).toBe(true);
    expect(db).toBeDefined();
    raw.close();
  });

  it("enables foreign_keys pragma", () => {
    const { raw } = openDb({ path: ":memory:", skipMigrate: true, skipFts5: true });
    const result = raw.pragma("foreign_keys", { simple: true });
    expect(result).toBe(1);
    raw.close();
  });

  it("does NOT apply WAL on in-memory DBs", () => {
    const { raw } = openDb({ path: ":memory:", skipMigrate: true, skipFts5: true });
    const result = raw.pragma("journal_mode", { simple: true });
    // In-memory DBs use 'memory' journal, not 'wal'.
    expect(result).toBe("memory");
    raw.close();
  });

  it("applies WAL on file-based DBs", () => {
    const tmpFile = `/tmp/embers-test-wal-${Date.now()}.db`;
    const { raw } = openDb({
      path: tmpFile,
      skipMigrate: true,
      skipFts5: true,
    });
    const result = raw.pragma("journal_mode", { simple: true });
    expect(result).toBe("wal");
    raw.close();
    // Best-effort cleanup
    for (const suffix of ["", "-wal", "-shm", "-journal"]) {
      try {
        rmSync(`${tmpFile}${suffix}`, { force: true });
      } catch {
        // ignore
      }
    }
  });

  it("sets busy_timeout to 5000ms", () => {
    const { raw } = openDb({ path: ":memory:", skipMigrate: true, skipFts5: true });
    const result = raw.pragma("busy_timeout", { simple: true });
    expect(result).toBe(5000);
    raw.close();
  });
});

describe("schema (after migration)", () => {
  function freshDb() {
    return openDb({ path: ":memory:" });
  }

  it("creates all expected tables after migration", () => {
    const { raw } = freshDb();
    const tables = listTables(raw);
    expect(tables).toContain("users");
    expect(tables).toContain("communities");
    expect(tables).toContain("posts");
    expect(tables).toContain("comments");
    expect(tables).toContain("votes");
    expect(tables).toContain("notifications");
    expect(tables).toContain("sessions");
    expect(tables).toContain("posts_fts");
    raw.close();
  });

  it("enforces UNIQUE(username)", () => {
    const { raw, db } = freshDb();
    db.insert(users).values({
      id: "u-1",
      username: "alice",
      passwordHash: "hash",
      displayName: "Alice",
      colorFrom: "#fff",
      colorTo: "#000",
    }).run();
    expect(() =>
      db.insert(users).values({
        id: "u-2",
        username: "alice", // duplicate
        passwordHash: "hash",
        displayName: "Alice 2",
        colorFrom: "#fff",
        colorTo: "#000",
      }).run(),
    ).toThrowError(/UNIQUE constraint failed: users.username/);
    raw.close();
  });

  it("enforces UNIQUE(communities.slug)", () => {
    const { raw, db } = freshDb();
    db.insert(users).values({
      id: "u-1",
      username: "alice",
      passwordHash: "hash",
      displayName: "Alice",
      colorFrom: "#fff",
      colorTo: "#000",
    }).run();
    db.insert(communities).values({
      id: "c-1",
      slug: "rust",
      name: "rust",
      title: "Rust",
      category: "tech",
      colorFrom: "#fff",
      colorTo: "#000",
      icon: "🦀",
    }).run();
    expect(() =>
      db.insert(communities).values({
        id: "c-2",
        slug: "rust",
        name: "rust",
        title: "Rust 2",
        category: "tech",
        colorFrom: "#fff",
        colorTo: "#000",
        icon: "🦀",
      }).run(),
    ).toThrowError(/UNIQUE constraint failed: communities.slug/);
    raw.close();
  });

  it("enforces foreign key on posts.community_id", () => {
    const { raw, db } = freshDb();
    expect(() =>
      db.insert(posts).values({
        id: "p-1",
        communityId: "nonexistent",
        authorId: "nonexistent",
        title: "Test",
        type: "text",
      }).run(),
    ).toThrowError(/FOREIGN KEY constraint failed/);
    raw.close();
  });

  it("enforces composite PK on votes (user_id, target_id, target_type)", () => {
    const { raw, db } = freshDb();
    db.insert(users).values({
      id: "u-1",
      username: "alice",
      passwordHash: "hash",
      displayName: "Alice",
      colorFrom: "#fff",
      colorTo: "#000",
    }).run();
    db.insert(communities).values({
      id: "c-1",
      slug: "rust",
      name: "rust",
      title: "Rust",
      category: "tech",
      colorFrom: "#fff",
      colorTo: "#000",
      icon: "🦀",
    }).run();
    db.insert(posts).values({
      id: "p-1",
      communityId: "c-1",
      authorId: "u-1",
      title: "Post 1",
      type: "text",
    }).run();
    // First vote succeeds
    db.insert(votes).values({
      userId: "u-1",
      targetId: "p-1",
      targetType: "post",
      value: 1,
    }).run();
    // Second vote on same target/type fails (composite PK violation)
    expect(() =>
      db.insert(votes).values({
        userId: "u-1",
        targetId: "p-1",
        targetType: "post",
        value: -1,
      }).run(),
    ).toThrowError(/UNIQUE constraint failed: votes\.(user_id|target_id|target_type|user_id, target_id, target_type)/);
    raw.close();
  });

  // Round 11 (F2): The plan §4.1 commits to performance indexes on
  // posts(community_id, created_at), comments(post_id), and
  // notifications(user_id, read). Migration 0001 adds them.
  it("creates performance indexes after migration (Round 11, F2)", () => {
    const { raw } = freshDb();
    const indexRows = raw
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%' ORDER BY name",
      )
      .all() as Array<{ name: string }>;
    const indexNames = indexRows.map((r) => r.name);
    expect(indexNames).toContain("idx_posts_community_created");
    expect(indexNames).toContain("idx_comments_post_id");
    expect(indexNames).toContain("idx_notifications_user_read");
    raw.close();
  });
});

// Round 13 (F1): Database backup using better-sqlite3's online backup API.
// Tests that backupDb() creates a valid backup file with the same schema
// and data as the source.
describe("backupDb (Round 13, F1)", () => {
  it("creates a valid backup with the same tables and data", async () => {
    const sourcePath = `/tmp/embers-backup-test-source-${Date.now()}.db`;
    const destPath = `/tmp/embers-backup-test-dest-${Date.now()}.db`;

    // Create a source DB with migrations + a test row
    const { raw: srcRaw, db: srcDb } = openDb({ path: sourcePath });
    srcDb.insert(users).values({
      id: "u-backup-test",
      username: "backuptest",
      passwordHash: "hash",
      displayName: "Backup Test",
      colorFrom: "#fff",
      colorTo: "#000",
    }).run();
    srcRaw.close();

    // Back it up
    const result = await backupDb(sourcePath, destPath);
    expect(result.totalPages).toBeGreaterThan(0);
    expect(result.remainingPages).toBe(0);
    expect(result.destination).toBe(destPath);

    // Open the backup and verify schema + data
    const { raw: destRaw, db: destDb } = openDb({
      path: destPath,
      skipMigrate: true,
      skipFts5: true,
    });
    const tables = listTables(destRaw);
    expect(tables).toContain("users");
    expect(tables).toContain("communities");
    expect(tables).toContain("posts");
    expect(tables).toContain("comments");
    expect(tables).toContain("votes");
    expect(tables).toContain("notifications");
    expect(tables).toContain("sessions");

    const backupUser = destDb.select().from(users).where(eq(users.id, "u-backup-test")).all();
    expect(backupUser).toHaveLength(1);
    expect(backupUser[0].username).toBe("backuptest");
    destRaw.close();

    // Cleanup
    for (const f of [sourcePath, destPath, `${sourcePath}-wal`, `${sourcePath}-shm`]) {
      try { rmSync(f, { force: true }); } catch { /* ignore */ }
    }
  });
});

describe("FTS5 search", () => {
  function seedTestPosts() {
    const { raw, db } = openDb({ path: ":memory:" });
    db.insert(users).values({
      id: "u-1",
      username: "alice",
      passwordHash: "hash",
      displayName: "Alice",
      colorFrom: "#fff",
      colorTo: "#000",
    }).run();
    db.insert(communities).values({
      id: "c-1",
      slug: "rust",
      name: "rust",
      title: "Rust",
      category: "tech",
      colorFrom: "#fff",
      colorTo: "#000",
      icon: "🦀",
    }).run();
    db.insert(posts).values([
      {
        id: "p-1",
        communityId: "c-1",
        authorId: "u-1",
        title: "Learning Rust async programming",
        body: "An introduction to async/await in Rust using tokio.",
        type: "text",
      },
      {
        id: "p-2",
        communityId: "c-1",
        authorId: "u-1",
        title: "Cooking recipes for pasta night",
        body: "Five delicious pasta dishes for weeknight dinners.",
        type: "text",
      },
      {
        id: "p-3",
        communityId: "c-1",
        authorId: "u-1",
        title: "Async patterns in JavaScript",
        body: "Promises and async/await compared with Rust's tokio runtime.",
        type: "text",
      },
    ]).run();
    return { raw, db };
  }

  it("returns matching posts ranked by BM25", () => {
    const { raw } = seedTestPosts();
    const results = searchPosts(raw, "rust", 10, 0);
    expect(results.length).toBe(2);
    // Both results mention "rust" — p-1 in title, p-3 in body. Either could
    // rank first; we just assert both are returned.
    const ids = results.map((r) => r.id).sort();
    expect(ids).toEqual(["p-1", "p-3"]);
    raw.close();
  });

  it("returns empty array for query with no matches", () => {
    const { raw } = seedTestPosts();
    const results = searchPosts(raw, "nonexistentword", 10, 0);
    expect(results).toEqual([]);
    raw.close();
  });

  it("respects LIMIT and OFFSET", () => {
    const { raw } = seedTestPosts();
    const all = searchPosts(raw, "rust OR async OR pasta", 100, 0);
    expect(all.length).toBe(3);
    const firstPage = searchPosts(raw, "rust OR async OR pasta", 2, 0);
    expect(firstPage.length).toBe(2);
    const secondPage = searchPosts(raw, "rust OR async OR pasta", 2, 2);
    expect(secondPage.length).toBe(1);
    raw.close();
  });

  it("keeps posts_fts in sync after DELETE", () => {
    const { raw, db } = seedTestPosts();
    db.delete(posts).where(eq(posts.id, "p-1")).run();
    const results = searchPosts(raw, "rust", 10, 0);
    expect(results.map((r) => r.id)).toEqual(["p-3"]);
    raw.close();
  });

  it("keeps posts_fts in sync after UPDATE", () => {
    const { raw, db } = seedTestPosts();
    db.update(posts)
      .set({
        title: "Python programming language",
        body: "An introduction to Python's asyncio library.",
      })
      .where(eq(posts.id, "p-1"))
      .run();
    const results = searchPosts(raw, "rust", 10, 0);
    expect(results.map((r) => r.id)).toEqual(["p-3"]);
    raw.close();
  });

  it("applyFts5 is idempotent (safe to call multiple times)", () => {
    const { raw } = seedTestPosts();
    expect(() => applyFts5(raw)).not.toThrow();
    expect(() => applyFts5(raw)).not.toThrow();
    // Search still works
    const results = searchPosts(raw, "rust", 10, 0);
    expect(results.length).toBe(2);
    raw.close();
  });
});
