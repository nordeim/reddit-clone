import type { comments } from "@embers/db";

type CommentRow = typeof comments.$inferSelect;

export interface CommentTreeNode extends CommentRow {
  children: CommentTreeNode[];
}

/**
 * Build a tree from a flat list of comments via parentId pointers.
 * O(n) time, O(n) space. Orphan comments (parent deleted) are attached
 * at the root level (defensive — the seed script never produces orphans
 * but a future "delete comment" feature might).
 *
 * Depth cap: enforced at INSERT time (depth column), not here — the tree
 * builder trusts the depth field. Display-time depth limiting (e.g. "continue
 * thread" hint at depth > 4) is a UI concern, not a data concern.
 */
export function buildCommentTree(flat: CommentRow[]): CommentTreeNode[] {
  const byId = new Map<string, CommentTreeNode>();
  const roots: CommentTreeNode[] = [];

  // First pass: index every comment
  for (const row of flat) {
    byId.set(row.id, { ...row, children: [] });
  }

  // Second pass: attach children to parents
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Sort siblings by score (desc) for display
  const sortByScore = (a: CommentTreeNode, b: CommentTreeNode) =>
    (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes);
  const sortRecursive = (nodes: CommentTreeNode[]) => {
    nodes.sort(sortByScore);
    for (const n of nodes) sortRecursive(n.children);
  };
  sortRecursive(roots);

  return roots;
}
