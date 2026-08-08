import type { AppNotification } from "../types";
import { POSTS } from "./posts";
import { USERS } from "./users";
import { createRng } from "../utils/random";
import { getCommunity } from "./communities";

function generateNotifications(count: number): AppNotification[] {
  const rng = createRng("notifications-seed-v1");
  const items: AppNotification[] = [];
  const types: AppNotification["type"][] = ["upvote", "reply", "mention", "community"];

  for (let i = 0; i < count; i++) {
    const type = rng.pick(types);
    const post = rng.pick(POSTS);
    const actor = rng.pick(USERS);
    const hoursAgo = rng.int(1, 24 * 14);
    const createdAt = new Date(Date.now() - hoursAgo * 3_600_000).toISOString();

    let message = "";
    let detail = "";
    switch (type) {
      case "upvote":
        message = `Your post is blowing up`;
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
        message = `New activity in r/${getCommunity(post.communityId).name}`;
        detail = `"${post.title}" is trending in a community you follow`;
        break;
    }

    items.push({
      id: `n${i + 1}`,
      type,
      message,
      detail,
      postId: post.id,
      actorId: actor.id,
      createdAt,
      read: rng.bool(0.35),
    });
  }

  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export const NOTIFICATIONS: AppNotification[] = generateNotifications(18);
