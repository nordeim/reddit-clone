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
export declare const FIRST_NAMES: string[];
export declare const LAST_NAMES: string[];
export declare const SUFFIXES: string[];
export declare const BIOS: string[];
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
export declare const COMMUNITY_SEEDS: CommunitySeed[];
export declare const TITLE_BANK: Record<CommunitySeed["category"], string[]>;
export declare const SELF_TEXT_POOL: string[];
export declare const LINK_DOMAINS: string[];
export declare const FLAIRS: (string | undefined)[];
export declare const OPENERS: string[];
export declare const REPLIES: string[];
