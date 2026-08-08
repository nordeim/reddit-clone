import type { User } from "../types";
import { createRng, gradientFor } from "../utils/random";

const FIRST = [
  "alex", "jordan", "sam", "taylor", "morgan", "casey", "riley", "quinn",
  "avery", "reese", "harper", "dakota", "skyler", "rowan", "emerson", "finley",
  "phoenix", "sage", "blair", "kai", "nova", "ellis", "shawn", "priya",
  "wei", "yuki", "carlos", "fatima", "lena", "omar", "ines", "theo",
];
const LAST = [
  "codes", "builds", "writes", "explores", "creates", "designs", "hacks",
  "wanders", "reads", "plays", "cooks", "runs", "draws", "ships", "tinkers",
  "dreams",
];
const SUFFIXES = ["", "", "", "42", "99", "_dev", "_", "x", "88", "07"];

const BIOS = [
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

function buildUsername(rng: ReturnType<typeof createRng>, index: number): string {
  const first = rng.pick(FIRST);
  const last = rng.pick(LAST);
  const suffix = rng.pick(SUFFIXES) || String(index);
  return `${first}_${last}${suffix}`;
}

function generateUsers(count: number): User[] {
  const rng = createRng("users-seed-v1");
  const users: User[] = [];
  const used = new Set<string>();

  for (let i = 0; i < count; i++) {
    let username = buildUsername(rng, i);
    while (used.has(username)) username = `${username}${rng.int(1, 999)}`;
    used.add(username);

    const [colorFrom, colorTo] = gradientFor(username);
    const daysAgo = rng.int(30, 2600);
    const createdAt = new Date(Date.now() - daysAgo * 86_400_000).toISOString();

    users.push({
      id: `u${i + 1}`,
      username,
      displayName: username
        .split("_")
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(" "),
      bio: rng.pick(BIOS),
      karma: rng.int(120, 185_000),
      createdAt,
      colorFrom,
      colorTo,
    });
  }
  return users;
}

export const USERS: User[] = generateUsers(48);

export const CURRENT_USER: User = {
  id: "u-me",
  username: "you",
  displayName: "You",
  bio: "Exploring the front page, one scroll at a time.",
  karma: 8421,
  createdAt: new Date(Date.now() - 640 * 86_400_000).toISOString(),
  colorFrom: "#6366f1",
  colorTo: "#06b6d4",
};

const usersById = new Map(USERS.map((u) => [u.id, u]));
usersById.set(CURRENT_USER.id, CURRENT_USER);

export function getUser(id: string): User {
  return usersById.get(id) ?? CURRENT_USER;
}

export function randomUser(rng: ReturnType<typeof createRng>): User {
  return rng.pick(USERS);
}
