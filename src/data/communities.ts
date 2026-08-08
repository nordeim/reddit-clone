import type { Community, ImageCategory } from "../types";
import { createRng } from "../utils/random";

interface CommunitySeed {
  name: string;
  title: string;
  description: string;
  category: ImageCategory;
  icon: string;
  colorFrom: string;
  colorTo: string;
  rules: string[];
}

const SEEDS: CommunitySeed[] = [
  {
    name: "programming",
    title: "Programming",
    description: "Discussion and news for software developers of all stripes.",
    category: "tech",
    icon: "💻",
    colorFrom: "#4f46e5",
    colorTo: "#0ea5e9",
    rules: ["Keep it civil", "No low-effort memes", "Cite sources for claims", "Use descriptive titles"],
  },
  {
    name: "webdev",
    title: "Web Development",
    description: "A community for web developers to share knowledge and get feedback.",
    category: "tech",
    icon: "🌐",
    colorFrom: "#06b6d4",
    colorTo: "#22c55e",
    rules: ["No unsolicited DMs", "Mark self-promo clearly", "Be constructive with feedback"],
  },
  {
    name: "reactjs",
    title: "React",
    description: "News, articles and tools covering the React ecosystem.",
    category: "tech",
    icon: "⚛️",
    colorFrom: "#0ea5e9",
    colorTo: "#6366f1",
    rules: ["Stay on topic", "No duplicate posts", "Tag breaking changes"],
  },
  {
    name: "technology",
    title: "Technology",
    description: "The latest in tech news, gadgets, and innovation.",
    category: "tech",
    icon: "📱",
    colorFrom: "#334155",
    colorTo: "#64748b",
    rules: ["Sources required for news", "No rumor spreading", "Respect differing opinions"],
  },
  {
    name: "science",
    title: "Science",
    description: "Peer-reviewed research and general science discussion.",
    category: "space",
    icon: "🔬",
    colorFrom: "#7c3aed",
    colorTo: "#2563eb",
    rules: ["Link primary sources", "No pseudoscience", "Keep discussion respectful"],
  },
  {
    name: "space",
    title: "Space",
    description: "Exploring the cosmos — news, images, and discoveries.",
    category: "space",
    icon: "🚀",
    colorFrom: "#4338ca",
    colorTo: "#7c3aed",
    rules: ["Credit image sources", "No conspiracy theories", "Stay on topic"],
  },
  {
    name: "movies",
    title: "Movies",
    description: "News and discussion for film buffs.",
    category: "art",
    icon: "🎬",
    colorFrom: "#b91c1c",
    colorTo: "#ea580c",
    rules: ["Mark spoilers clearly", "No piracy links", "Be respectful of opinions"],
  },
  {
    name: "gaming",
    title: "Gaming",
    description: "For discussion of gaming culture, news, and releases.",
    category: "gaming",
    icon: "🎮",
    colorFrom: "#7e22ce",
    colorTo: "#db2777",
    rules: ["No piracy discussion", "Spoiler tag new releases", "Keep console wars civil"],
  },
  {
    name: "sports",
    title: "Sports",
    description: "Scores, highlights, and hot takes from every league.",
    category: "sports",
    icon: "🏀",
    colorFrom: "#ea580c",
    colorTo: "#facc15",
    rules: ["No stream links", "Flair your team", "No brigading other fans"],
  },
  {
    name: "food",
    title: "Food",
    description: "Recipes, restaurant finds, and kitchen triumphs.",
    category: "food",
    icon: "🍜",
    colorFrom: "#d97706",
    colorTo: "#dc2626",
    rules: ["Include recipe if asked", "No restaurant spam", "Be kind about food pics"],
  },
  {
    name: "fitness",
    title: "Fitness",
    description: "Training tips, progress, and motivation.",
    category: "sports",
    icon: "🏋️",
    colorFrom: "#059669",
    colorTo: "#0d9488",
    rules: ["No medical advice", "Cite studies for claims", "Be supportive of beginners"],
  },
  {
    name: "personalfinance",
    title: "Personal Finance",
    description: "Budgeting, saving, and investing discussion.",
    category: "tech",
    icon: "💰",
    colorFrom: "#16a34a",
    colorTo: "#65a30d",
    rules: ["No financial advice as fact", "Disclose conflicts of interest", "Stay respectful"],
  },
  {
    name: "todayilearned",
    title: "Today I Learned",
    description: "Interesting facts you didn't know until today.",
    category: "art",
    icon: "🧠",
    colorFrom: "#9333ea",
    colorTo: "#c026d3",
    rules: ["Link a source", "No misleading titles", "Must be something learned today"],
  },
  {
    name: "askeverything",
    title: "Ask Everything",
    description: "Open-ended questions for the community to answer.",
    category: "art",
    icon: "❓",
    colorFrom: "#0284c7",
    colorTo: "#0ea5e9",
    rules: ["Search before posting", "No loaded questions", "Be genuine"],
  },
  {
    name: "art",
    title: "Art",
    description: "Share your creations and admire others'.",
    category: "art",
    icon: "🎨",
    colorFrom: "#db2777",
    colorTo: "#f59e0b",
    rules: ["Credit original artists", "OC tag your own work", "Constructive critique only"],
  },
  {
    name: "music",
    title: "Music",
    description: "For music lovers, makers, and critics.",
    category: "art",
    icon: "🎧",
    colorFrom: "#4f46e5",
    colorTo: "#db2777",
    rules: ["No streaming links spam", "Tag genre", "Respect all tastes"],
  },
  {
    name: "diy",
    title: "DIY",
    description: "Do-it-yourself projects, builds, and repairs.",
    category: "tech",
    icon: "🔨",
    colorFrom: "#92400e",
    colorTo: "#b45309",
    rules: ["Include materials list", "Safety first", "No unsafe electrical advice"],
  },
  {
    name: "aww",
    title: "Aww",
    description: "Cute and heartwarming animal moments.",
    category: "animals",
    icon: "🐾",
    colorFrom: "#f472b6",
    colorTo: "#fb923c",
    rules: ["Animals only", "No sales/rehoming posts", "Be nice"],
  },
];

function generateCommunities(): Community[] {
  return SEEDS.map((seed, i) => {
    const rng = createRng(`community-${seed.name}`);
    const daysAgo = rng.int(400, 5000);
    return {
      id: `c${i + 1}`,
      name: seed.name,
      title: seed.title,
      description: seed.description,
      memberCount: rng.int(4_200, 3_800_000),
      onlineCount: rng.int(12, 22_000),
      createdAt: new Date(Date.now() - daysAgo * 86_400_000).toISOString(),
      category: seed.category,
      colorFrom: seed.colorFrom,
      colorTo: seed.colorTo,
      icon: seed.icon,
      rules: seed.rules,
    };
  });
}

export const COMMUNITIES: Community[] = generateCommunities();

const byId = new Map(COMMUNITIES.map((c) => [c.id, c]));
const byName = new Map(COMMUNITIES.map((c) => [c.name, c]));

export function getCommunity(id: string): Community {
  const found = byId.get(id);
  if (!found) throw new Error(`Unknown community id: ${id}`);
  return found;
}

export function getCommunityByName(name: string): Community | undefined {
  return byName.get(name);
}
