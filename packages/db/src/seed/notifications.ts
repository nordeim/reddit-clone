import type { DrizzleDB } from "../client.js";
import { notifications } from "../schema/index.js";
import { createRng } from "./random.js";
import type { GeneratedPost } from "./posts.js";
import type { GeneratedUser } from "./users.js";
import type { GeneratedCommunity } from "./communities.js";

export interface GeneratedNotification {
  id: string;
  userId: string;
  type: "upvote" | "reply" | "mention" | "community";
  message: string;
  detail: string;
  postId: string | null;
  actorId: string | null;
  read: boolean;
  createdAt: string;
}

/**
 * Generate 18 deterministic notifications addressed to the demo user (u-me).
 * Mirrors the apps/web generator: picks a type, post, actor, builds a
 * message + detail string, timestamps within the last 14 days.
 */
export function seedNotifications(
  db: DrizzleDB,
  generatedPosts: GeneratedPost[],
  generatedUsers: GeneratedUser[],
  generatedCommunities: GeneratedCommunity[],
): GeneratedNotification[] {
  const rng = createRng("notifications-seed-v1");
  const types: GeneratedNotification["type"][] = ["upvote", "reply", "mention", "community"];
  const items: GeneratedNotification[] = [];

  for (let i = 0; i < 18; i++) {
    const type = rng.pick(types);
    const post = rng.pick(generatedPosts);
    const actor = rng.pick(generatedUsers);
    const community = generatedCommunities.find((c) => c.id === post.communityId);
    const hoursAgo = rng.int(1, 24 * 14);
    const createdAt = new Date(Date.now() - hoursAgo * 3_600_000).toISOString();

    let message = "";
    let detail = "";
    switch (type) {
      case "upvote":
        message = "Your post is blowing up";
        detail = `"${post.title}" just passed ${rng.int(50, 900)} upvotes`;
        break;
      case "reply":
        message = `u/${actor.username} replied to your comment`;
        detail = `"${rng.pick(["Totally agree with this.", "Wait, source?", "This is underrated.", "Same thing happened to me."])}"`;
        break;
      case "mention":
        message = `u/${actor.username} mentioned you`;
        detail = `in a comment on "${post.title}"`;
        break;
      case "community":
        message = `New activity in r/${community?.name ?? "unknown"}`;
        detail = `"${post.title}" is trending in a community you follow`;
        break;
    }

    items.push({
      id: `n${i + 1}`,
      userId: "u-me",
      type,
      message,
      detail,
      postId: post.id,
      actorId: actor.id,
      read: rng.bool(0.35),
      createdAt,
    });
  }

  items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  if (items.length > 0) {
    db.insert(notifications)
      .values(
        items.map((n) => ({
          id: n.id,
          userId: n.userId,
          type: n.type,
          message: n.message,
          detail: n.detail,
          postId: n.postId,
          actorId: n.actorId,
          read: n.read,
          createdAt: n.createdAt,
        })),
      )
      .run();
  }

  return items;
}
