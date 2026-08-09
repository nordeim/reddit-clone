import type { ImageCategory } from "../types";

/**
 * Image asset path helper.
 *
 * All category image paths are prefixed with `import.meta.env.BASE_URL` so
 * the build works correctly when deployed under a subpath (e.g.
 * `https://user.github.io/repo/`). The Vite default base is `/`, which
 * preserves the previous behaviour for root-hosted deployments.
 *
 * Plan §17.6: "Images break under subpath hosting" — mitigation: use
 * `import.meta.env.BASE_URL` and create an asset helper.
 */
const BASE = import.meta.env.BASE_URL;
// Normalize trailing slash so `${BASE}images/foo.jpg` doesn't double-slash.
const ASSET_PREFIX = BASE.endsWith("/") ? BASE : `${BASE}/`;

export const CATEGORY_IMAGES: Record<ImageCategory, string> = {
  nature: `${ASSET_PREFIX}images/cat-nature.jpg`,
  tech: `${ASSET_PREFIX}images/cat-tech.jpg`,
  gaming: `${ASSET_PREFIX}images/cat-gaming.jpg`,
  food: `${ASSET_PREFIX}images/cat-food.jpg`,
  space: `${ASSET_PREFIX}images/cat-space.jpg`,
  art: `${ASSET_PREFIX}images/cat-art.jpg`,
  animals: `${ASSET_PREFIX}images/cat-animals.jpg`,
  sports: `${ASSET_PREFIX}images/cat-sports.jpg`,
};
