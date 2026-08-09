import type { DrizzleDB } from "../client";
import { posts } from "../schema/index";
import { createRng, hashString } from "./random";
import { TITLE_BANK, SELF_TEXT_POOL, LINK_DOMAINS, FLAIRS } from "./data";
import type { GeneratedCommunity } from "./communities";
import type { GeneratedUser } from "./users";

export interface GeneratedPost {
  id: string;
  communityId: string;
  authorId: string;
  title: string;
  type: "text" | "link" | "image";
  body: string | null;
  linkUrl: string | null;
  linkDomain: string | null;
  imageCategory: string | null;
  flair: string | null;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  createdAt: string;
}

function pickPostType(rng: ReturnType<typeof createRng>): "text" | "link" | "image" {
  const r = rng.next();
  if (r < 0.42) return "text";
  if (r < 0.72) return "image";
  return "link";
}

function hashSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 6)
    .join("-");
}

/**
 * Generate 320 deterministic posts from the seed `posts-seed-v2`.
 *
 * Note: the `commentCount` field is initially derived from a formula
 * (matching the original apps/web behaviour) and is NOT later adjusted
 * to match the actual comment tree count. This is a known divergence
 * from the apps/web client behaviour (which walks the comment tree
 * after generation to fix the count) — for the backend, comment counts
 * are derived at query time from the `comments` table.
 */
export function seedPosts(
  db: DrizzleDB,
  generatedCommunities: GeneratedCommunity[],
  generatedUsers: GeneratedUser[],
): GeneratedPost[] {
  const rng = createRng("posts-seed-v2");
  const generated: GeneratedPost[] = [];

  for (let i = 0; i < 320; i++) {
    const community = rng.pick(generatedCommunities);
    const author = rng.pick(generatedUsers);
    const type = pickPostType(rng);
    const title = rng.pick(TITLE_BANK[community.category as keyof typeof TITLE_BANK]);
    const hoursAgo = rng.int(1, 24 * 30);
    const createdAt = new Date(Date.now() - hoursAgo * 3_600_000).toISOString();
    const score = Math.round(rng.int(-40, 100) + (30 - Math.min(hoursAgo, 30)) * rng.int(2, 40));
    const commentCount = Math.max(0, Math.round(rng.int(0, 60) + score / 12));

    // Split score into upvotes/downvotes (rough approximation — net = score).
    const upvotes = Math.max(0, score);
    const downvotes = Math.max(0, -score);

    const post: GeneratedPost = {
      id: `p${i + 1}`,
      communityId: community.id,
      authorId: author.id,
      title,
      type,
      body: null,
      linkUrl: null,
      linkDomain: null,
      imageCategory: null,
      flair: rng.pick(FLAIRS) ?? null,
      upvotes,
      downvotes,
      commentCount,
      createdAt,
    };

    if (type === "text") {
      post.body = rng.pick(SELF_TEXT_POOL);
    } else if (type === "link") {
      const domain = rng.pick(LINK_DOMAINS);
      post.linkDomain = domain;
      post.linkUrl = `https://${domain}/article/${hashSlug(title)}`;
    } else {
      post.imageCategory = community.category;
    }

    generated.push(post);

    db.insert(posts).values({
      id: post.id,
      communityId: post.communityId,
      authorId: post.authorId,
      title: post.title,
      type: post.type,
      body: post.body,
      linkUrl: post.linkUrl,
      linkDomain: post.linkDomain,
      imageCategory: post.imageCategory,
      flair: post.flair,
      upvotes: post.upvotes,
      downvotes: post.downvotes,
      commentCount: post.commentCount,
      createdAt: post.createdAt,
    }).run();
  }

  // Sort newest first for downstream consumers (matches apps/web behaviour)
  return generated.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

// Re-export for downstream seed modules
export { hashString };
