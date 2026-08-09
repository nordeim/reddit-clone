import type { AppNotification, Comment } from "../types";

/**
 * Pure, testable selectors extracted from ad-hoc useAppStore call sites.
 *
 * These functions take plain state slices as input — they do NOT call
 * `useAppStore` themselves. That keeps them pure, deterministic, and
 * unit-testable without mocking zustand.
 */

/** Compute the user-visible score for a post or comment. */
export function getVisibleScore(baseScore: number, vote: -1 | 0 | 1): number {
  return baseScore + vote;
}

/** Is the given post in the user's saved list? */
export function isPostSaved(postId: string, savedPostIds: readonly string[]): boolean {
  return savedPostIds.includes(postId);
}

/** Has the user joined the given community? */
export function isCommunityJoined(communityId: string, joinedCommunityIds: readonly string[]): boolean {
  return joinedCommunityIds.includes(communityId);
}

/**
 * Count unread notifications, given the full notification list and the
 * user's read-override map. The override map can also mark a notification
 * unread explicitly (value `false`); we honour that.
 */
export function getUnreadNotificationCount(
  notifications: readonly AppNotification[],
  readOverrides: Record<string, boolean>,
): number {
  let n = 0;
  for (const notif of notifications) {
    const read = readOverrides[notif.id] ?? notif.read;
    if (!read) n += 1;
  }
  return n;
}

/**
 * Compute the *displayed* comment count for a post: the count of all
 * comments in the generated tree (recursively, including nested replies)
 * plus the count of all locally-added comments for that post.
 *
 * This is the value `PostPage` shows as "X comments" and matches what the
 * user actually sees in the rendered tree.
 */
export function getDerivedCommentCount(
  baseComments: readonly Comment[],
  localComments: readonly Comment[],
): number {
  function countAll(nodes: readonly Comment[]): number {
    let total = 0;
    for (const c of nodes) total += 1 + countAll(c.children);
    return total;
  }
  return countAll(baseComments) + countAll(localComments);
}

/**
 * Cap a numeric badge count at "9+" so the navbar bell doesn't render a
 * two-digit number into a tiny circular badge.
 */
export function capBadgeCount(count: number): string {
  if (count <= 0) return "";
  if (count > 9) return "9+";
  return String(count);
}
