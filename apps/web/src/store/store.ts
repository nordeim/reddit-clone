import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Comment, Post, VoteValue } from "../types";
import {
  STORAGE_KEY,
  SCHEMA_VERSION,
  mergePersistedState,
  type PersistedState,
} from "./storage";

export interface ToastMessage {
  id: string;
  text: string;
  tone?: "default" | "success" | "error";
}

interface AppState {
  schemaVersion: number;
  theme: "light" | "dark";
  toggleTheme: () => void;

  votes: Record<string, VoteValue>;
  setVote: (targetId: string, value: VoteValue) => void;

  joinedCommunityIds: string[];
  toggleJoin: (communityId: string) => void;

  savedPostIds: string[];
  toggleSave: (postId: string) => void;

  localPosts: Post[];
  addLocalPost: (post: Post) => void;

  localComments: Record<string, Comment[]>; // postId -> extra top-level/nested comments to merge
  addLocalComment: (postId: string, comment: Comment) => void;

  notificationReadOverrides: Record<string, boolean>;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (ids: string[]) => void;

  toasts: ToastMessage[];
  pushToast: (text: string, tone?: ToastMessage["tone"]) => void;
  dismissToast: (id: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      schemaVersion: SCHEMA_VERSION,
      theme: "light",
      toggleTheme: () => set((s) => ({ theme: s.theme === "light" ? "dark" : "light" })),

      votes: {},
      setVote: (targetId, value) =>
        set((s) => ({ votes: { ...s.votes, [targetId]: value } })),

      joinedCommunityIds: [],
      toggleJoin: (communityId) =>
        set((s) => ({
          joinedCommunityIds: s.joinedCommunityIds.includes(communityId)
            ? s.joinedCommunityIds.filter((id) => id !== communityId)
            : [...s.joinedCommunityIds, communityId],
        })),

      savedPostIds: [],
      toggleSave: (postId) =>
        set((s) => ({
          savedPostIds: s.savedPostIds.includes(postId)
            ? s.savedPostIds.filter((id) => id !== postId)
            : [...s.savedPostIds, postId],
        })),

      localPosts: [],
      addLocalPost: (post) => set((s) => ({ localPosts: [post, ...s.localPosts] })),

      localComments: {},
      addLocalComment: (postId, comment) =>
        set((s) => ({
          localComments: {
            ...s.localComments,
            [postId]: [comment, ...(s.localComments[postId] ?? [])],
          },
        })),

      notificationReadOverrides: {},
      markNotificationRead: (id) =>
        set((s) => ({ notificationReadOverrides: { ...s.notificationReadOverrides, [id]: true } })),
      markAllNotificationsRead: (ids) =>
        set((s) => {
          const next = { ...s.notificationReadOverrides };
          for (const id of ids) next[id] = true;
          return { notificationReadOverrides: next };
        }),

      toasts: [],
      pushToast: (text, tone = "default") => {
        const id = `t${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        set((s) => ({ toasts: [...s.toasts, { id, text, tone }] }));
        setTimeout(() => get().dismissToast(id), 3200);
      },
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
    }),
    {
      name: STORAGE_KEY,
      version: SCHEMA_VERSION,
      // Custom merge: validate persisted state shape, drop corrupt fields,
      // never throw. See `src/store/storage.ts` for the full strategy.
      merge: (persisted, currentState) =>
        mergePersistedState<PersistedState & typeof currentState>(persisted, currentState),
      // Whitelist exactly the persisted fields. `schemaVersion` is included
      // so future migrations can detect old shapes on hydration.
      partialize: (s): PersistedState => ({
        schemaVersion: s.schemaVersion,
        theme: s.theme,
        votes: s.votes,
        joinedCommunityIds: s.joinedCommunityIds,
        savedPostIds: s.savedPostIds,
        localPosts: s.localPosts,
        localComments: s.localComments,
        notificationReadOverrides: s.notificationReadOverrides,
      }),
      // Migration hook — currently a no-op since SCHEMA_VERSION === 1.
      // Future versions will switch on `version` here and transform persisted
      // state into the current shape.
      migrate: (persistedState, _version) => {
        // For now, just re-validate via mergePersistedState.
        return mergePersistedState(persistedState, persistedState as object);
      },
    },
  ),
);
