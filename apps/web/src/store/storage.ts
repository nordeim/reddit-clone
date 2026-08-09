import type { VoteValue } from "../types";

/**
 * Storage safety + schema version utilities.
 *
 * The persisted state is treated as **untrusted** — corrupt JSON, missing
 * fields, or wrong schema versions must never crash the app. We layer three
 * defences:
 *
 * 1. `safeParseJSON` — never throws, returns `null` on parse failure.
 * 2. `validatePersistedState` — shape-checks each whitelisted field and
 *    drops anything that doesn't match (rather than rejecting the whole
 *    blob, which would nuke a user's persisted votes because of one bad
 *    field).
 * 3. `SCHEMA_VERSION` + zustand `persist`'s `version` + `migrate` — bumps
 *    the persisted state through versioned migrations so a future shape
 *    change can be migrated cleanly instead of silently hydrating stale
 *    data.
 */

export const STORAGE_KEY = "reddit-clone-state";
export const SCHEMA_VERSION = 1;

/** Whitelisted persisted fields. Must stay in sync with `partialize` in store.ts. */
export const PERSISTED_FIELDS = [
  "schemaVersion",
  "theme",
  "votes",
  "joinedCommunityIds",
  "savedPostIds",
  "localPosts",
  "localComments",
  "notificationReadOverrides",
] as const;

export interface PersistedState {
  schemaVersion: number;
  theme: "light" | "dark";
  votes: Record<string, VoteValue>;
  joinedCommunityIds: string[];
  savedPostIds: string[];
  localPosts: unknown[];
  localComments: Record<string, unknown[]>;
  notificationReadOverrides: Record<string, boolean>;
}

/** Defaults applied when no persisted state exists or validation fails entirely. */
export const DEFAULT_PERSISTED_STATE: PersistedState = {
  schemaVersion: SCHEMA_VERSION,
  theme: "light",
  votes: {},
  joinedCommunityIds: [],
  savedPostIds: [],
  localPosts: [],
  localComments: {},
  notificationReadOverrides: {},
};

/** Parse JSON without throwing. Returns null on any failure. */
export function safeParseJSON(input: string | null): unknown {
  if (typeof input !== "string" || input.length === 0) return null;
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function isVoteValue(v: unknown): v is VoteValue {
  return v === -1 || v === 0 || v === 1;
}

/**
 * Walks a votes record and drops any entry whose value isn't a valid
 * VoteValue (-1, 0, 1). Per-entry dropping matches the documented behaviour:
 * a single corrupt entry shouldn't wipe the whole votes map.
 */
function sanitizeVoteRecord(input: unknown): Record<string, VoteValue> {
  if (!isObject(input)) return {};
  const out: Record<string, VoteValue> = {};
  for (const [k, v] of Object.entries(input)) {
    if (isVoteValue(v)) out[k] = v;
  }
  return out;
}

/**
 * Walks a notification-read-overrides record and drops any entry whose value
 * isn't a boolean.
 */
function sanitizeBooleanRecord(input: unknown): Record<string, boolean> {
  if (!isObject(input)) return {};
  const out: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(input)) {
    if (typeof v === "boolean") out[k] = v;
  }
  return out;
}

/**
 * Validate an unknown value as a `PersistedState`. Drops invalid fields
 * rather than rejecting the whole blob — so a single corrupt `votes` entry
 * doesn't wipe the user's `savedPostIds`.
 *
 * Always returns a fully-populated `PersistedState` (defaults fill gaps).
 */
export function validatePersistedState(input: unknown): PersistedState {
  if (!isObject(input)) return { ...DEFAULT_PERSISTED_STATE };

  // Zustand persist wraps the state in { state: ..., version: ... } — unwrap.
  const candidate = isObject(input.state) && typeof input.version === "number" ? input.state : input;
  if (!isObject(candidate)) return { ...DEFAULT_PERSISTED_STATE };

  const result: PersistedState = { ...DEFAULT_PERSISTED_STATE };

  // Theme
  if (candidate.theme === "light" || candidate.theme === "dark") {
    result.theme = candidate.theme;
  }

  // Votes — drop invalid entries individually
  if (isObject(candidate.votes)) {
    result.votes = sanitizeVoteRecord(candidate.votes);
  }

  // Joined communities
  if (isStringArray(candidate.joinedCommunityIds)) {
    result.joinedCommunityIds = candidate.joinedCommunityIds;
  }

  // Saved posts
  if (isStringArray(candidate.savedPostIds)) {
    result.savedPostIds = candidate.savedPostIds;
  }

  // Local posts — accept any array; full structural validation is expensive
  // and not strictly necessary (consumers will gracefully handle missing
  // fields via optional chaining).
  if (Array.isArray(candidate.localPosts)) {
    result.localPosts = candidate.localPosts;
  }

  // Local comments
  if (isObject(candidate.localComments)) {
    const cleaned: Record<string, unknown[]> = {};
    for (const [k, v] of Object.entries(candidate.localComments)) {
      cleaned[k] = Array.isArray(v) ? v : [];
    }
    result.localComments = cleaned;
  }

  // Notification read overrides — drop invalid entries individually
  if (isObject(candidate.notificationReadOverrides)) {
    result.notificationReadOverrides = sanitizeBooleanRecord(candidate.notificationReadOverrides);
  }

  // schemaVersion is always set to the current version — older persisted
  // state without this field implicitly becomes version 0, which the
  // `migrate` function in store.ts upgrades to version 1.
  result.schemaVersion = SCHEMA_VERSION;

  return result;
}

/**
 * The `merge` function passed to zustand `persist`. Combines safe parsing
 * + validation + fallback. Never throws.
 *
 * If `persisted` is null, not an object, or doesn't unwrap to an object,
 * return `currentState` unchanged so ephemeral fields (toasts, etc.)
 * survive untouched. Otherwise overlay the validated persisted fields.
 */
export function mergePersistedState<T extends object>(persisted: unknown, currentState: T): T {
  if (persisted == null) return currentState;
  // Unwrap the zustand persist envelope if present.
  const candidate = isObject(persisted) ? (isObject((persisted as { state?: unknown }).state) ? (persisted as { state: Record<string, unknown> }).state : persisted) : null;
  if (!candidate) return currentState;
  const validated = validatePersistedState(persisted);
  return {
    ...currentState,
    ...validated,
  } as T;
}
