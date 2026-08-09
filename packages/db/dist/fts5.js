/**
 * FTS5 virtual table + sync triggers for full-text search over posts
 * (ADR-109).
 *
 * Drizzle ORM doesn't model `CREATE VIRTUAL TABLE` so we apply these
 * statements as raw SQL during migration. The triggers keep `posts_fts`
 * in sync with `posts` on INSERT / UPDATE / DELETE.
 *
 * Schema:
 *   posts_fts(title, body, content='posts', content_rowid='rowid')
 *
 * The external-content table pattern means the FTS index doesn't store
 * its own copy of the data; it references `posts.rowid`. This halves
 * storage cost. The trade-off is that DELETE triggers must be careful
 * to delete the FTS row using the post's rowid.
 *
 * Search uses the BM25 ranking function (built into FTS5) which is
 * exposed via `rank` in MATCH queries.
 */
export const FTS5_SCHEMA_SQL = `
CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts USING fts5(
  title,
  body,
  content='posts',
  content_rowid='rowid'
);
`;
export const FTS5_TRIGGERS_SQL = `
CREATE TRIGGER IF NOT EXISTS posts_ai AFTER INSERT ON posts BEGIN
  INSERT INTO posts_fts(rowid, title, body)
  VALUES (new.rowid, new.title, COALESCE(new.body, ''));
END;

CREATE TRIGGER IF NOT EXISTS posts_ad AFTER DELETE ON posts BEGIN
  INSERT INTO posts_fts(posts_fts, rowid, title, body)
  VALUES ('delete', old.rowid, old.title, COALESCE(old.body, ''));
END;

CREATE TRIGGER IF NOT EXISTS posts_au AFTER UPDATE ON posts BEGIN
  INSERT INTO posts_fts(posts_fts, rowid, title, body)
  VALUES ('delete', old.rowid, old.title, COALESCE(old.body, ''));
  INSERT INTO posts_fts(rowid, title, body)
  VALUES (new.rowid, new.title, COALESCE(new.body, ''));
END;
`;
/**
 * Apply the FTS5 schema and triggers to an open database.
 * Idempotent — safe to run multiple times.
 */
export function applyFts5(db) {
    db.exec(FTS5_SCHEMA_SQL);
    db.exec(FTS5_TRIGGERS_SQL);
}
/**
 * Search posts by FTS5 MATCH query. Returns rows ordered by BM25 rank
 * (lower = better match, per SQLite FTS5 convention).
 *
 * @param db      Open database
 * @param query   FTS5 match expression (e.g. "rust async" — FTS5 parses
 *                AND/OR/NEAR operators)
 * @param limit   Max rows to return
 * @param offset  Offset for pagination
 */
export function searchPosts(db, query, limit, offset) {
    const stmt = db.prepare(`SELECT p.id, p.title, p.body, bm25(posts_fts) AS rank
     FROM posts_fts
     JOIN posts p ON p.rowid = posts_fts.rowid
     WHERE posts_fts MATCH ?
     ORDER BY rank
     LIMIT ? OFFSET ?`);
    return stmt.all(query, limit, offset);
}
