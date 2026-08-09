import type { ImageCategory, Post, PostType, SortMode } from "../types";
import { COMMUNITIES } from "./communities";
import { USERS } from "./users";
import { createRng } from "../utils/random";
import { sortPosts as sortPostsPure } from "../utils/score";
import { getCommentsForPost, countComments } from "./comments";

const TITLE_BANK: Record<ImageCategory, string[]> = {
  nature: [
    "Caught this view three minutes from my front door, still can't believe it",
    "Spent the weekend camping off-grid, best decision I've made all year",
    "This trail humbled me but the summit view made it worth it",
    "First time seeing bioluminescent waves in person, absolutely surreal",
    "Planted a garden this spring, here's the six-month progress",
    "The fog rolled in right as I reached the overlook, perfect timing",
    "What's the most underrated hiking spot you've ever found?",
    "Woke up at 4am for this sunrise and would do it again in a heartbeat",
    "Found this hidden waterfall completely by accident",
    "Storm clouds rolling over the valley, no filter needed",
  ],
  tech: [
    "What's the one VS Code extension you can't live without?",
    "I built a tiny CLI tool to stop me from committing secrets — feedback welcome",
    "Unpopular opinion: tabs are objectively better than spaces",
    "Our team migrated 400k lines from JS to TypeScript in 6 weeks — AMA",
    "The new browser API for offline sync is a game changer",
    "Why does every job posting want 5 years of experience in a 2-year-old framework?",
    "Show off your home lab / dev setup",
    "I finally understand closures after 3 years of writing JS. Here's what clicked.",
    "PSA: rotate your API keys if you ever pasted them into a public repo",
    "Async/await vs promises — is there still a debate?",
    "What's the most over-engineered solution you've seen for a simple problem?",
    "Launched my side project after 8 months of nights and weekends",
    "Databases are hard: a postmortem on our worst outage",
    "Which static site generator are you using in 2025 and why?",
    "Code review etiquette: how blunt is too blunt?",
    "Refactored a 3,000-line component into hooks — here's the diff",
  ],
  gaming: [
    "Finally beat the final boss after 40 attempts, worth every death",
    "This indie game deserves way more attention than it's getting",
    "Unpopular opinion: escort missions aren't always bad",
    "What game has the best soundtrack you've ever heard?",
    "My co-op run with my brother turned into a 12-hour marathon",
    "Speedrunners are absolute wizards, change my mind",
    "New patch notes just dropped — thoughts?",
    "Built a whole gaming corner in my apartment, finally happy with it",
    "The plot twist in this game genuinely made me gasp out loud",
    "What's a game mechanic you wish more studios would copy?",
    "Controller vs keyboard and mouse for this genre — thoughts?",
    "This boss fight took me way longer than it should have",
  ],
  food: [
    "Made my grandmother's dumpling recipe for the first time, nailed it",
    "Weeknight dinner that takes 20 minutes and tastes like it took 2 hours",
    "What's your go-to comfort food when you're exhausted?",
    "Tried a new spice blend and now I put it on everything",
    "Homemade sourdough after 6 failed attempts, finally got the crumb right",
    "This hole-in-the-wall restaurant changed how I think about noodles",
    "Meal-prepped for the week and actually stuck to it",
    "What's an ingredient that instantly upgrades any dish?",
    "First attempt at croissants — laminating dough is no joke",
    "Found the perfect ratio for a smash burger, sharing the method",
  ],
  space: [
    "New images from the deep field survey are stunning",
    "ELI5: why does time move slower near a black hole?",
    "This week's meteor shower is visible from most of the northern hemisphere",
    "The math behind orbital mechanics still blows my mind",
    "What's the most underrated moon in our solar system?",
    "Just got my first decent shot of Saturn's rings with a budget telescope",
    "Explaining why the universe's expansion is accelerating",
    "If we found microbial life tomorrow, how would it actually change things?",
    "The James Webb data keeps rewriting the textbooks",
    "How close are we really to a crewed Mars mission?",
  ],
  art: [
    "Six months of practice, here's the improvement in my linework",
    "Finished this piece after staring at a blank canvas for a week",
    "What's a technique that took you forever to get right?",
    "Digital vs traditional — which do you reach for first?",
    "My professor said this composition breaks every rule, I love it anyway",
    "Redrew my first ever piece of art 5 years later",
    "Color theory finally clicked for me, sharing what helped",
    "This started as a warm-up sketch and spiraled into a full piece",
    "Critique welcome — trying to improve my anatomy",
    "Learned a book today about the history of pigments, wild stuff",
  ],
  animals: [
    "He waits by the window every day at this exact time",
    "Rescued her three years ago today, look at her now",
    "This is the most dramatic reaction to a bath I've ever seen",
    "He's convinced the vacuum is his mortal enemy",
    "First snow of the year and she has no idea what to do with it",
    "Introducing the newest, loudest member of the family",
    "He insists on supervising every single home repair",
    "She adopted the neighbor's cat and there was nothing we could do",
    "13 years old today and still acts like a puppy",
    "Caught him mid-yawn and it's the best photo I own",
  ],
  sports: [
    "That last-second shot will be replayed for years",
    "Breaking down the tactics that won them the match",
    "What's the most underrated comeback you've ever watched live?",
    "Rookie season stats are looking historic so far",
    "This rivalry never disappoints, what a game",
    "Training log: down 15 pounds and finally under my old PR",
    "Refs missed a huge call in the final minute, still salty",
    "The underdog story of the season just keeps getting better",
    "Which offseason move do you think pays off the most?",
    "Ran my first marathon today, legs are gone but heart is full",
  ],
};

const SELF_TEXT_POOL = [
  "Wanted to share this with people who'd actually appreciate it. Curious what everyone thinks — am I overreacting, or is this as big a deal as it feels?",
  "Long time lurker, first time posting. This community has taught me more than I expected, so figured I'd finally contribute something back.",
  "Been sitting on this for a while and finally decided to write it up properly. Happy to answer questions in the comments.",
  "Not sure if this belongs here, but I couldn't find a better place for it. Feedback — good or bad — is welcome.",
  "Quick update from my last post: things have changed a lot since then, so here's where things stand now.",
  "Spent way too long on this, but I regret nothing. Let me know what you'd have done differently.",
  "This took multiple attempts to get right. Sharing the process in case it helps someone else avoid my mistakes.",
];

const LINK_DOMAINS = [
  "arstechnica.com",
  "theverge.com",
  "nature.com",
  "nytimes.com",
  "youtube.com",
  "github.com",
  "medium.com",
  "bbc.com",
  "wired.com",
  "espn.com",
];

const FLAIRS = ["Discussion", "News", "Question", "Guide", "Showcase", "Update", "Analysis", undefined, undefined, undefined];

function pickPostType(rng: ReturnType<typeof createRng>): PostType {
  const r = rng.next();
  if (r < 0.42) return "text";
  if (r < 0.72) return "image";
  return "link";
}

function generatePosts(count: number): Post[] {
  const posts: Post[] = [];
  const rng = createRng("posts-seed-v2");

  for (let i = 0; i < count; i++) {
    const community = rng.pick(COMMUNITIES);
    const author = rng.pick(USERS);
    const type = pickPostType(rng);
    const title = rng.pick(TITLE_BANK[community.category]);
    const hoursAgo = rng.int(1, 24 * 30);
    const createdAt = new Date(Date.now() - hoursAgo * 3_600_000).toISOString();
    const score = Math.round(rng.int(-40, 100) + (30 - Math.min(hoursAgo, 30)) * rng.int(2, 40));
    const commentCount = Math.max(0, Math.round(rng.int(0, 60) + score / 12));

    const post: Post = {
      id: `p${i + 1}`,
      communityId: community.id,
      authorId: author.id,
      title,
      type,
      score,
      commentCount,
      createdAt,
      flair: rng.pick(FLAIRS),
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

    posts.push(post);
  }

  return posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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

export const POSTS: Post[] = generatePosts(320);

// Plan §7.7 ("Comment count consistency"): the post's `commentCount` field
// must equal the number of comments the lazy generator actually produces.
// The original `generatePosts` derived commentCount from a formula unrelated
// to the actual tree, so cards displayed e.g. "42 comments" while the post
// detail page rendered 5. We fix it here by walking each post's generated
// tree once at module scope (comments are memoised in a Map by postId, so
// this is cheap — ~5k comments total, ~50ms one-time cost).
for (const post of POSTS) {
  post.commentCount = countComments(getCommentsForPost(post.id));
}

const postsById = new Map(POSTS.map((p) => [p.id, p]));

export function getPost(id: string): Post | undefined {
  return postsById.get(id);
}

/**
 * Sort wrapper that delegates to the pure `utils/score.ts` implementation.
 * The previous hot/rising formulas lived inline here; they have been
 * extracted so they can be unit-tested in isolation.
 *
 * Behavioural note: the new pure sorter adds stable id-ascending tie-breakers
 * for deterministic ordering across reloads. This is a subtle improvement over
 * the previous Array.prototype.sort which used unstable comparison results.
 */
export function sortPosts(posts: Post[], mode: SortMode): Post[] {
  return sortPostsPure(posts, mode);
}
