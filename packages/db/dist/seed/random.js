/** Deterministic string hashing + seeded PRNG utilities for stable dummy data. */
export function hashString(input) {
    let hash = 2166136261;
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}
/** Mulberry32 seeded PRNG — returns a function producing floats in [0, 1). */
export function seededRandom(seed) {
    let a = seed || 1;
    return function random() {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
export function createRng(seedInput) {
    const seed = typeof seedInput === "string" ? hashString(seedInput) : seedInput;
    const rand = seededRandom(seed);
    return {
        next: () => rand(),
        int: (min, max) => Math.floor(rand() * (max - min + 1)) + min,
        pick(arr) {
            return arr[Math.floor(rand() * arr.length)];
        },
        picks(arr, count) {
            const pool = [...arr];
            const result = [];
            for (let i = 0; i < count && pool.length > 0; i++) {
                const idx = Math.floor(rand() * pool.length);
                result.push(pool.splice(idx, 1)[0]);
            }
            return result;
        },
        bool: (probability = 0.5) => rand() < probability,
    };
}
const AVATAR_GRADIENTS = [
    ["#f97316", "#db2777"],
    ["#6366f1", "#06b6d4"],
    ["#22c55e", "#0ea5e9"],
    ["#a855f7", "#ec4899"],
    ["#eab308", "#f97316"],
    ["#14b8a6", "#6366f1"],
    ["#ef4444", "#f59e0b"],
    ["#8b5cf6", "#3b82f6"],
    ["#10b981", "#84cc16"],
    ["#f43f5e", "#8b5cf6"],
];
export function gradientFor(seed) {
    const idx = hashString(seed) % AVATAR_GRADIENTS.length;
    return AVATAR_GRADIENTS[idx];
}
