/**
 * Shared content banks ported verbatim from apps/web/src/data/{users,communities,posts,comments,notifications}.ts
 *
 * These arrays are the seed source for the deterministic content generator.
 * Changing a string here, the order of items, or the order of rng calls
 * will reshuffle the generated dataset.
 *
 * Kept as a single consolidated module to make the seed script self-contained
 * and to keep the content visible at the top level.
 */

// ---------- users.ts ----------

export const FIRST_NAMES = [
  "alex", "jordan", "sam", "taylor", "morgan", "casey", "riley", "quinn",
  "avery", "reese", "harper", "dakota", "skyler", "rowan", "emerson", "finley",
  "phoenix", "sage", "blair", "kai", "nova", "ellis", "shawn", "priya",
  "wei", "yuki", "carlos", "fatima", "lena", "omar", "ines", "theo",
];
export const LAST_NAMES = [
  "codes", "builds", "writes", "explores", "creates", "designs", "hacks",
  "wanders", "reads", "plays", "cooks", "runs", "draws", "ships", "tinkers",
  "dreams",
];
export const SUFFIXES = ["", "", "", "42", "99", "_dev", "_", "x", "88", "07"];
export const BIOS = [
  "Coffee-powered software engineer. Building things that (mostly) work.",
  "Amateur astronomer, professional overthinker.",
  "I make games nobody asked for.",
  "Trail runner, plant parent, occasional chef.",
  "Writing about tech, life, and everything in between.",
  "Full-time student, part-time meme curator.",
  "Trying to fix the world one pull request at a time.",
  "Music nerd. Synth collector. Bad dancer.",
  "Here for the discussions, staying for the cat pictures.",
  "Product designer who reads too much sci-fi.",
  "Just here to argue about the best programming language.",
  "Home cook experimenting with too many spices.",
  "Weekend hiker, weekday spreadsheet wrangler.",
  "Building a startup in my spare time. Send coffee.",
  "History buff with strong opinions about board games.",
];

// ---------- communities.ts ----------

export interface CommunitySeed {
  name: string;
  title: string;
  description: string;
  category: "nature" | "tech" | "gaming" | "food" | "space" | "art" | "animals" | "sports";
  icon: string;
  colorFrom: string;
  colorTo: string;
  rules: string[];
}

export const COMMUNITY_SEEDS: CommunitySeed[] = [
  { name: "programming", title: "Programming", description: "Discussion and news for software developers of all stripes.", category: "tech", icon: "💻", colorFrom: "#4f46e5", colorTo: "#0ea5e9", rules: ["Keep it civil", "No low-effort memes", "Cite sources for claims", "Use descriptive titles"] },
  { name: "webdev", title: "Web Development", description: "A community for web developers to share knowledge and get feedback.", category: "tech", icon: "🌐", colorFrom: "#06b6d4", colorTo: "#22c55e", rules: ["No unsolicited DMs", "Mark self-promo clearly", "Be constructive with feedback"] },
  { name: "reactjs", title: "React", description: "News, articles and tools covering the React ecosystem.", category: "tech", icon: "⚛️", colorFrom: "#0ea5e9", colorTo: "#6366f1", rules: ["Stay on topic", "No duplicate posts", "Tag breaking changes"] },
  { name: "technology", title: "Technology", description: "The latest in tech news, gadgets, and innovation.", category: "tech", icon: "📱", colorFrom: "#334155", colorTo: "#64748b", rules: ["Sources required for news", "No rumor spreading", "Respect differing opinions"] },
  { name: "science", title: "Science", description: "Peer-reviewed research and general science discussion.", category: "space", icon: "🔬", colorFrom: "#7c3aed", colorTo: "#2563eb", rules: ["Link primary sources", "No pseudoscience", "Keep discussion respectful"] },
  { name: "space", title: "Space", description: "Exploring the cosmos — news, images, and discoveries.", category: "space", icon: "🚀", colorFrom: "#4338ca", colorTo: "#7c3aed", rules: ["Credit image sources", "No conspiracy theories", "Stay on topic"] },
  { name: "movies", title: "Movies", description: "News and discussion for film buffs.", category: "art", icon: "🎬", colorFrom: "#b91c1c", colorTo: "#ea580c", rules: ["Mark spoilers clearly", "No piracy links", "Be respectful of opinions"] },
  { name: "gaming", title: "Gaming", description: "For discussion of gaming culture, news, and releases.", category: "gaming", icon: "🎮", colorFrom: "#7e22ce", colorTo: "#db2777", rules: ["No piracy discussion", "Spoiler tag new releases", "Keep console wars civil"] },
  { name: "sports", title: "Sports", description: "Scores, highlights, and hot takes from every league.", category: "sports", icon: "🏀", colorFrom: "#ea580c", colorTo: "#facc15", rules: ["No stream links", "Flair your team", "No brigading other fans"] },
  { name: "food", title: "Food", description: "Recipes, restaurant finds, and kitchen triumphs.", category: "food", icon: "🍜", colorFrom: "#d97706", colorTo: "#dc2626", rules: ["Include recipe if asked", "No restaurant spam", "Be kind about food pics"] },
  { name: "fitness", title: "Fitness", description: "Training tips, progress, and motivation.", category: "sports", icon: "🏋️", colorFrom: "#059669", colorTo: "#0d9488", rules: ["No medical advice", "Cite studies for claims", "Be supportive of beginners"] },
  { name: "personalfinance", title: "Personal Finance", description: "Budgeting, saving, and investing discussion.", category: "tech", icon: "💰", colorFrom: "#16a34a", colorTo: "#65a30d", rules: ["No financial advice as fact", "Disclose conflicts of interest", "Stay respectful"] },
  { name: "todayilearned", title: "Today I Learned", description: "Interesting facts you didn't know until today.", category: "art", icon: "🧠", colorFrom: "#9333ea", colorTo: "#c026d3", rules: ["Link a source", "No misleading titles", "Must be something learned today"] },
  { name: "askeverything", title: "Ask Everything", description: "Open-ended questions for the community to answer.", category: "art", icon: "❓", colorFrom: "#0284c7", colorTo: "#0ea5e9", rules: ["Search before posting", "No loaded questions", "Be genuine"] },
  { name: "art", title: "Art", description: "Share your creations and admire others'.", category: "art", icon: "🎨", colorFrom: "#db2777", colorTo: "#f59e0b", rules: ["Credit original artists", "OC tag your own work", "Constructive critique only"] },
  { name: "music", title: "Music", description: "For music lovers, makers, and critics.", category: "art", icon: "🎧", colorFrom: "#4f46e5", colorTo: "#db2777", rules: ["No streaming links spam", "Tag genre", "Respect all tastes"] },
  { name: "diy", title: "DIY", description: "Do-it-yourself projects, builds, and repairs.", category: "tech", icon: "🔨", colorFrom: "#92400e", colorTo: "#b45309", rules: ["Include materials list", "Safety first", "No unsafe electrical advice"] },
  { name: "aww", title: "Aww", description: "Cute and heartwarming animal moments.", category: "animals", icon: "🐾", colorFrom: "#f472b6", colorTo: "#fb923c", rules: ["Animals only", "No sales/rehoming posts", "Be nice"] },
];

// ---------- posts.ts ----------

export const TITLE_BANK: Record<CommunitySeed["category"], string[]> = {
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

export const SELF_TEXT_POOL = [
  "Wanted to share this with people who'd actually appreciate it. Curious what everyone thinks — am I overreacting, or is this as big a deal as it feels?",
  "Long time lurker, first time posting. This community has taught me more than I expected, so figured I'd finally contribute something back.",
  "Been sitting on this for a while and finally decided to write it up properly. Happy to answer questions in the comments.",
  "Not sure if this belongs here, but I couldn't find a better place for it. Feedback — good or bad — is welcome.",
  "Quick update from my last post: things have changed a lot since then, so here's where things stand now.",
  "Spent way too long on this, but I regret nothing. Let me know what you'd have done differently.",
  "This took multiple attempts to get right. Sharing the process in case it helps someone else avoid my mistakes.",
];

export const LINK_DOMAINS = [
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

export const FLAIRS = ["Discussion", "News", "Question", "Guide", "Showcase", "Update", "Analysis", undefined, undefined, undefined];

// ---------- comments.ts ----------

export const OPENERS = [
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

export const REPLIES = [
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
