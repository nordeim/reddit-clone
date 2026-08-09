import { communities } from "../schema/index.js";
import { createRng } from "./random.js";
import { COMMUNITY_SEEDS } from "./data.js";
/**
 * Generate 18 deterministic communities from the COMMUNITY_SEEDS bank.
 * Inserts all rows into the `communities` table.
 */
export function seedCommunities(db) {
    const generated = COMMUNITY_SEEDS.map((seed, i) => {
        const rng = createRng(`community-${seed.name}`);
        const daysAgo = rng.int(400, 5000);
        return {
            id: `c${i + 1}`,
            slug: seed.name,
            name: seed.name,
            title: seed.title,
            description: seed.description,
            ownerId: null,
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
    db.insert(communities)
        .values(generated.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        title: c.title,
        description: c.description,
        ownerId: c.ownerId,
        memberCount: c.memberCount,
        onlineCount: c.onlineCount,
        createdAt: c.createdAt,
        category: c.category,
        colorFrom: c.colorFrom,
        colorTo: c.colorTo,
        icon: c.icon,
        rules: JSON.stringify(c.rules),
    })))
        .run();
    return generated;
}
