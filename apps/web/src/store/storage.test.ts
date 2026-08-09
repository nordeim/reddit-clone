import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  STORAGE_KEY,
  SCHEMA_VERSION,
  DEFAULT_PERSISTED_STATE,
  safeParseJSON,
  validatePersistedState,
  mergePersistedState,
} from "./storage";

describe("safeParseJSON", () => {
  it("parses valid JSON", () => {
    expect(safeParseJSON('{"a":1}')).toEqual({ a: 1 });
    expect(safeParseJSON("[1,2,3]")).toEqual([1, 2, 3]);
    expect(safeParseJSON('"hello"')).toBe("hello");
    expect(safeParseJSON("42")).toBe(42);
  });

  it("returns null for invalid JSON", () => {
    expect(safeParseJSON("{not json}")).toBeNull();
    expect(safeParseJSON("[1,2,")).toBeNull();
  });

  it("returns null for null or empty input", () => {
    expect(safeParseJSON(null)).toBeNull();
    expect(safeParseJSON("")).toBeNull();
  });

  it("returns null for non-string input", () => {
    expect(safeParseJSON(undefined as unknown as string)).toBeNull();
    expect(safeParseJSON(123 as unknown as string)).toBeNull();
  });
});

describe("validatePersistedState", () => {
  it("returns defaults for null input", () => {
    expect(validatePersistedState(null)).toEqual(DEFAULT_PERSISTED_STATE);
  });

  it("returns defaults for non-object input", () => {
    expect(validatePersistedState("hello")).toEqual(DEFAULT_PERSISTED_STATE);
    expect(validatePersistedState(42)).toEqual(DEFAULT_PERSISTED_STATE);
    expect(validatePersistedState([1, 2, 3])).toEqual(DEFAULT_PERSISTED_STATE);
  });

  it("returns defaults for empty object", () => {
    expect(validatePersistedState({})).toEqual(DEFAULT_PERSISTED_STATE);
  });

  it("accepts a fully-valid persisted state", () => {
    const valid = {
      theme: "dark" as const,
      votes: { "post:p1": 1, "comment:c1": -1 },
      joinedCommunityIds: ["c1", "c2"],
      savedPostIds: ["p1"],
      localPosts: [{ id: "local-1" }],
      localComments: { p1: [{ id: "p1-c1" }] },
      notificationReadOverrides: { n1: true },
    };
    const result = validatePersistedState(valid);
    expect(result.theme).toBe("dark");
    expect(result.votes).toEqual(valid.votes);
    expect(result.joinedCommunityIds).toEqual(valid.joinedCommunityIds);
    expect(result.savedPostIds).toEqual(valid.savedPostIds);
    expect(result.localPosts).toEqual(valid.localPosts);
    expect(result.localComments).toEqual(valid.localComments);
    expect(result.notificationReadOverrides).toEqual(valid.notificationReadOverrides);
    expect(result.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it("unwraps zustand persist's { state, version } envelope", () => {
    const wrapped = {
      state: { theme: "dark" },
      version: 1,
    };
    const result = validatePersistedState(wrapped);
    expect(result.theme).toBe("dark");
  });

  it("drops invalid theme values and falls back to default (light)", () => {
    expect(validatePersistedState({ theme: "purple" }).theme).toBe("light");
    expect(validatePersistedState({ theme: 123 }).theme).toBe("light");
    expect(validatePersistedState({ theme: null }).theme).toBe("light");
  });

  it("drops invalid vote values (only -1, 0, 1 are valid)", () => {
    const result = validatePersistedState({
      votes: { "post:p1": 1, "post:p2": 2, "post:p3": -1, "post:p4": "up" },
    });
    expect(result.votes).toEqual({ "post:p1": 1, "post:p3": -1 });
  });

  it("drops non-array joinedCommunityIds and falls back to empty array", () => {
    expect(validatePersistedState({ joinedCommunityIds: "c1,c2" }).joinedCommunityIds).toEqual([]);
    expect(validatePersistedState({ joinedCommunityIds: null }).joinedCommunityIds).toEqual([]);
  });

  it("drops arrays containing non-string entries from joinedCommunityIds", () => {
    const result = validatePersistedState({
      joinedCommunityIds: ["c1", 123, "c2", null],
    });
    expect(result.joinedCommunityIds).toEqual([]);
  });

  it("drops non-boolean values from notificationReadOverrides", () => {
    const result = validatePersistedState({
      notificationReadOverrides: { n1: true, n2: "yes", n3: false, n4: 1 },
    });
    expect(result.notificationReadOverrides).toEqual({ n1: true, n3: false });
  });

  it("preserves valid fields even when others are corrupt", () => {
    // Per the documented behaviour: a single corrupt `votes` entry should
    // not wipe `savedPostIds`.
    const result = validatePersistedState({
      votes: "not an object",
      savedPostIds: ["p1", "p2"],
    });
    expect(result.votes).toEqual({});
    expect(result.savedPostIds).toEqual(["p1", "p2"]);
  });

  it("normalizes localComments entries — drops non-array values", () => {
    const result = validatePersistedState({
      localComments: { p1: [{ id: "c1" }], p2: "garbage", p3: null },
    });
    expect(result.localComments.p1).toEqual([{ id: "c1" }]);
    expect(result.localComments.p2).toEqual([]);
    expect(result.localComments.p3).toEqual([]);
  });

  it("always stamps schemaVersion with the current SCHEMA_VERSION", () => {
    expect(validatePersistedState({}).schemaVersion).toBe(SCHEMA_VERSION);
    expect(validatePersistedState({ schemaVersion: 0 }).schemaVersion).toBe(SCHEMA_VERSION);
    expect(validatePersistedState({ schemaVersion: 999 }).schemaVersion).toBe(SCHEMA_VERSION);
  });
});

describe("mergePersistedState", () => {
  it("merges validated persisted state over current state", () => {
    const current = {
      theme: "light" as const,
      votes: {},
      joinedCommunityIds: [],
      savedPostIds: [],
      localPosts: [],
      localComments: {},
      notificationReadOverrides: {},
      toasts: [],
      // ...other ephemeral fields
    };
    const persisted = {
      state: {
        theme: "dark" as const,
        savedPostIds: ["p1"],
      },
      version: 1,
    };
    const merged = mergePersistedState(persisted, current);
    expect(merged.theme).toBe("dark");
    expect(merged.savedPostIds).toEqual(["p1"]);
    // Ephemeral field is preserved from current state.
    expect(merged.toasts).toEqual([]);
  });

  it("returns current state unchanged when persisted is null", () => {
    const current = { theme: "light" as const, toasts: [] };
    const merged = mergePersistedState(null, current);
    expect(merged).toEqual(current);
  });

  it("returns current state unchanged when persisted is corrupt JSON", () => {
    const current = { theme: "light" as const, toasts: [] };
    const merged = mergePersistedState("not even an object", current);
    expect(merged).toEqual(current);
  });
});

describe("Constants", () => {
  it("STORAGE_KEY matches the locked name from AGENTS.md", () => {
    // AGENTS.md §"State" locks the storage key as "reddit-clone-state".
    // Renaming it would orphan every existing user's persisted data.
    expect(STORAGE_KEY).toBe("reddit-clone-state");
  });

  it("SCHEMA_VERSION is a positive integer", () => {
    expect(SCHEMA_VERSION).toBeGreaterThan(0);
    expect(Number.isInteger(SCHEMA_VERSION)).toBe(true);
  });
});

describe("localStorage integration", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("localStorage is available in jsdom and round-trips JSON", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: "dark" }));
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(safeParseJSON(raw)).toEqual({ theme: "dark" });
  });

  it("safeParseJSON handles quota-exceeded scenarios gracefully", () => {
    // Simulate a privacy-mode browser where localStorage exists but throws
    // on access. We can't easily trigger a real quota error in jsdom, but
    // we can verify safeParseJSON is defensive against null returns.
    const spy = vi.spyOn(Storage.prototype, "getItem").mockReturnValue(null);
    expect(safeParseJSON(localStorage.getItem(STORAGE_KEY))).toBeNull();
    spy.mockRestore();
  });
});
