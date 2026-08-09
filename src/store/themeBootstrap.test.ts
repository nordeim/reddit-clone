import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { applyPersistedTheme } from "./themeBootstrap";

const STORAGE_KEY = "reddit-clone-state";

describe("applyPersistedTheme", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    vi.restoreAllMocks();
  });

  it("applies .dark class when persisted theme is 'dark'", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ state: { theme: "dark" }, version: 1 }),
    );
    const applied = applyPersistedTheme();
    expect(applied).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("does not apply .dark class when persisted theme is 'light'", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ state: { theme: "light" }, version: 1 }),
    );
    const applied = applyPersistedTheme();
    expect(applied).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("defaults to light when no persisted state exists", () => {
    const applied = applyPersistedTheme();
    expect(applied).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("defaults to light when persisted state is null (empty string)", () => {
    localStorage.setItem(STORAGE_KEY, "");
    expect(applyPersistedTheme()).toBe("light");
  });

  it("defaults to light when persisted JSON is corrupt", () => {
    localStorage.setItem(STORAGE_KEY, "{not valid json");
    expect(applyPersistedTheme()).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("defaults to light when persisted state has an unexpected shape", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ unrelated: "blob" }));
    expect(applyPersistedTheme()).toBe("light");
  });

  it("ignores invalid theme values (e.g., 'purple')", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ state: { theme: "purple" }, version: 1 }),
    );
    expect(applyPersistedTheme()).toBe("light");
  });

  it("handles missing `state` wrapper gracefully", () => {
    // If a future migration accidentally writes the bare state without the
    // zustand persist envelope, we should still not crash.
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: "dark" }));
    expect(applyPersistedTheme()).toBe("light"); // not unwrapped → defaults
  });

  it("survives localStorage throwing on access (privacy mode)", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError: localStorage access denied");
    });
    expect(applyPersistedTheme()).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    spy.mockRestore();
  });

  it("survives document.documentElement.classList.toggle throwing", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ state: { theme: "dark" }, version: 1 }),
    );
    const spy = vi.spyOn(document.documentElement.classList, "toggle").mockImplementation(() => {
      throw new Error("DOMException");
    });
    // Should not throw — should fall through silently.
    expect(() => applyPersistedTheme()).not.toThrow();
    spy.mockRestore();
  });
});
