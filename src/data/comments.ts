import type { Comment } from "../types";
import { USERS } from "./users";
import { createRng } from "../utils/random";

const OPENERS = [
  "This is exactly what I needed to read today.",
  "Honestly didn't expect this to hit so hard.",
  "Can confirm, went through something similar last year.",
  "Wait, this actually changes my whole perspective on it.",
  "Not sure I agree, but I see where you're coming from.",
  "This is underrated, more people need to see this.",
  "Same energy as that one post from last week, but way better.",
  "Okay this made me laugh way more than it should have.",
  "Following this thread closely, super curious how it plays out.",
  "Wish I'd known this sooner, would've saved me a lot of trouble.",
  "This is such a solid breakdown, thank you for taking the time.",
  "Respectfully, I think there's a bit more nuance here.",
  "The top comment always ages the worst, let's see.",
  "Been lurking for years just to comment on this.",
  "Genuinely one of the best threads I've seen on here.",
];

const REPLIES = [
  "Fair point, hadn't thought about it that way.",
  "Yeah exactly, that's what I was trying to say.",
  "Disagree, but I respect the take.",
  "Source? Not doubting you, just curious to read more.",
  "This happened to me too, small world.",
  "Underrated reply, take my upvote.",
  "Haha true, no notes.",
  "That's a really good way to put it actually.",
  "I mean, sure, but at what cost?",
  "Can you elaborate a bit more on this?",
  "This is the real answer, everyone stop scrolling.",
  "Lol I was NOT expecting that response.",
  "Solid point, changed my mind a little.",
  "Same boat here, still figuring it out.",
];

function buildCommentTree(
  rng: ReturnType<typeof createRng>,
  postId: string,
  parentId: string | null,
  depth: number,
  createdBase: number,
  idCounter: { n: number },
): Comment[] {
  if (depth > 4) return [];
  const count = depth === 0 ? rng.int(3, 7) : rng.bool(0.45) ? rng.int(1, 3) : 0;
  const comments: Comment[] = [];

  for (let i = 0; i < count; i++) {
    idCounter.n += 1;
    const author = rng.pick(USERS);
    const minutesAgo = rng.int(5, 60 * 24 * 10) + depth * 15;
    const createdAt = new Date(createdBase - minutesAgo * 60_000).toISOString();
    const body = rng.pick(depth === 0 ? OPENERS : REPLIES);
    const id = `${postId}-c${idCounter.n}`;

    const children = rng.bool(depth < 3 ? 0.55 : 0.2)
      ? buildCommentTree(rng, postId, id, depth + 1, createdBase, idCounter)
      : [];

    comments.push({
      id,
      postId,
      authorId: author.id,
      parentId,
      body,
      score: rng.int(-4, 320),
      createdAt,
      children,
    });
  }

  return comments.sort((a, b) => b.score - a.score);
}

const cache = new Map<string, Comment[]>();

export function getCommentsForPost(postId: string): Comment[] {
  if (cache.has(postId)) return cache.get(postId)!;
  const rng = createRng(`comments-${postId}`);
  const tree = buildCommentTree(rng, postId, null, 0, Date.now(), { n: 0 });
  cache.set(postId, tree);
  return tree;
}

export function countComments(comments: Comment[]): number {
  let total = 0;
  for (const c of comments) {
    total += 1 + countComments(c.children);
  }
  return total;
}
