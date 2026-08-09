import type { DrizzleDB } from "../client.js";
export interface GeneratedCommunity {
    id: string;
    slug: string;
    name: string;
    title: string;
    description: string;
    ownerId: string | null;
    memberCount: number;
    onlineCount: number;
    createdAt: string;
    category: string;
    colorFrom: string;
    colorTo: string;
    icon: string;
    rules: string[];
}
/**
 * Generate 18 deterministic communities from the COMMUNITY_SEEDS bank.
 * Inserts all rows into the `communities` table.
 */
export declare function seedCommunities(db: DrizzleDB): GeneratedCommunity[];
