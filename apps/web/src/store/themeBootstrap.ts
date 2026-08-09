/**
 * Synchronous theme bootstrap.
 *
 * Runs **before** React mounts so that the persisted `.dark` class is on
 * `<html>` for the very first paint — preventing a flash of light theme
 * when dark mode is persisted. See `index.html` for the inline `<script>`
 * that calls `applyPersistedTheme`.
 *
 * The function is defensive: any storage error, parse error, or shape
 * mismatch falls back silently to light mode rather than crashing the page.
 */

const STORAGE_KEY = "reddit-clone-state";

/**
 * Read the persisted theme from localStorage and apply the `.dark` class
 * to `document.documentElement` if the persisted theme is `"dark"`.
 *
 * @returns The theme that was applied (`"light"` or `"dark"`).
 */
export function applyPersistedTheme(): "light" | "dark" {
  // Default to light mode if anything goes wrong.
  let theme: "light" | "dark" = "light";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      // Persisted state is wrapped by zustand persist as `{ state: {...}, version: N }`.
      // Be defensive: the shape may not be exactly what we expect if a future
      // schema change hasn't been migrated yet.
      const parsed = JSON.parse(raw) as { state?: { theme?: unknown } };
      const themeValue = parsed?.state?.theme;
      if (themeValue === "dark" || themeValue === "light") {
        theme = themeValue;
      }
    }
  } catch {
    // localStorage may be disabled (privacy mode), JSON may be corrupt,
    // or the parsed shape may be unexpected. All paths fall back to light.
    theme = "light";
  }

  try {
    document.documentElement.classList.toggle("dark", theme === "dark");
  } catch {
    // If we can't touch the DOM (e.g., running in a non-DOM environment),
    // there's nothing more we can do — fall through silently.
  }

  return theme;
}
