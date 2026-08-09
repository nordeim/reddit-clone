import type { DrizzleDB } from "../client";
import { users } from "../schema/index";
import { createRng, gradientFor } from "./random";
import { FIRST_NAMES, LAST_NAMES, SUFFIXES, BIOS } from "./data";

export interface GeneratedUser {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  karma: number;
  createdAt: string;
  colorFrom: string;
  colorTo: string;
}

function buildUsername(rng: ReturnType<typeof createRng>, index: number): string {
  const first = rng.pick(FIRST_NAMES);
  const last = rng.pick(LAST_NAMES);
  const suffix = rng.pick(SUFFIXES) || String(index);
  return `${first}_${last}${suffix}`;
}

/**
 * Generate 48 deterministic users + a single "demo" current user.
 * Returns the array AND inserts all rows into the `users` table.
 *
 * The demo user (id "u-me") has a known password — "embers-demo" —
 * hashed with Argon2id at seed time. This is the user used by the
 * auth flow integration tests and the smoke test endpoint.
 */
export async function seedUsers(
  db: DrizzleDB,
  hashPassword: (plain: string) => Promise<string>,
): Promise<GeneratedUser[]> {
  const rng = createRng("users-seed-v1");
  const generated: GeneratedUser[] = [];
  const used = new Set<string>();
  const demoPasswordHash = await hashPassword("embers-demo");

  for (let i = 0; i < 48; i++) {
    let username = buildUsername(rng, i);
    while (used.has(username)) username = `${username}${rng.int(1, 999)}`;
    used.add(username);

    const [colorFrom, colorTo] = gradientFor(username);
    const daysAgo = rng.int(30, 2600);
    const createdAt = new Date(Date.now() - daysAgo * 86_400_000).toISOString();

    const user: GeneratedUser = {
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
    };
    generated.push(user);

    db.insert(users).values({
      id: user.id,
      username: user.username,
      passwordHash: demoPasswordHash,
      displayName: user.displayName,
      bio: user.bio,
      karma: user.karma,
      createdAt: user.createdAt,
      colorFrom: user.colorFrom,
      colorTo: user.colorTo,
    }).run();
  }

  // Insert the demo CURRENT_USER (matches apps/web's CURRENT_USER shape).
  db.insert(users).values({
    id: "u-me",
    username: "you",
    passwordHash: demoPasswordHash,
    displayName: "You",
    bio: "Exploring the front page, one scroll at a time.",
    karma: 8421,
    createdAt: new Date(Date.now() - 640 * 86_400_000).toISOString(),
    colorFrom: "#6366f1",
    colorTo: "#06b6d4",
  }).run();

  return generated;
}
