/** Deterministic string hashing + seeded PRNG utilities for stable dummy data. */
export declare function hashString(input: string): number;
/** Mulberry32 seeded PRNG — returns a function producing floats in [0, 1). */
export declare function seededRandom(seed: number): () => number;
export declare function createRng(seedInput: string | number): {
    next: () => number;
    int: (min: number, max: number) => number;
    pick<T>(arr: T[]): T;
    picks<T>(arr: T[], count: number): T[];
    bool: (probability?: number) => boolean;
};
export declare function gradientFor(seed: string): [string, string];
