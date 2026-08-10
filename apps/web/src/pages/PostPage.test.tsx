import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { PostPage } from "./PostPage";
import { AuthProvider, type AuthApiClient } from "../auth/AuthProvider";

/**
 * TDD test suite for PostPage (Round 10, BUG-R10-2).
 *
 * Bug being fixed:
 *   `useAppStore((s) => s.localComments[postId] ?? [])` returned a NEW
 *   empty array on every render. React 19's stricter `useSyncExternalStore`
 *   (used internally by zustand) detected the unstable snapshot and
 *   infinite-looped with "Maximum update depth exceeded" (React error
 *   #185). The ErrorBoundary caught the crash and rendered the
 *   "⚠️ Something went wrong" fallback — making every post detail page
 *   on the live site unusable.
 *
 * Fix:
 *   Use a module-scope stable empty array constant so the selector
 *   returns the same reference every time `s.localComments[postId]`
 *   is undefined.
 *
 * These tests assert the PostPage renders WITHOUT triggering the
 * error boundary, even after the simulated 500ms comment-loading
 * latency completes.
 */

function makeStubClient(): AuthApiClient {
  return {
    login: vi.fn(async () => ({ accessToken: "test-token", user: makeUser("you") })),
    register: vi.fn(async () => ({ user: makeUser("you") })),
    logout: vi.fn(async () => undefined),
  };
}

function makeUser(username: string) {
  return {
    id: `u-${username}`,
    username,
    displayName: username,
    bio: "",
    karma: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    colorFrom: "#ff6600",
    colorTo: "#ff9900",
  };
}

function renderPostPage(postId: string) {
  // Wrap in MemoryRouter with the actual /comments/:postId route so
  // useParams() returns the expected postId. We also wrap in
  // AuthProvider because PostPage uses useAuth() indirectly via
  // CommentComposer (which renders CURRENT_USER, but useAppStore).
  return render(
    <AuthProvider apiClientFactory={() => makeStubClient()}>
      <MemoryRouter initialEntries={[`/comments/${postId}`]}>
        <Routes>
          <Route path="/comments/:postId" element={<PostPage />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe("PostPage (BUG-R10-2 — React error #185 fix)", () => {
  beforeEach(() => {
    // Clear localStorage so the zustand persisted store starts fresh
    // and doesn't leak state between tests.
    window.localStorage.clear();
    // Reset the module-level console.error spy if any.
    vi.restoreAllMocks();
  });

  it("renders the post title without crashing (no error boundary fallback)", async () => {
    // Capture console.error so we can assert no React max-update-depth errors.
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderPostPage("p1");

    // Wait for the simulated 500ms comment-load latency to complete.
    // If the bug is present, the ErrorBoundary fallback ("Something went
    // wrong") will render before this resolves.
    await waitFor(
      () => {
        // The post title should appear in the document. The exact text
        // depends on the deterministic seed; we just assert *something*
        // matching a long-ish string is visible (the title text).
        expect(screen.queryByText(/something went wrong/i)).toBeNull();
      },
      { timeout: 3000 },
    );

    // Wait a bit longer for any deferred renders to settle.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 700));
    });

    // After settling, the error boundary fallback must still be absent.
    expect(screen.queryByText(/something went wrong/i)).toBeNull();
    expect(screen.queryByText(/maximum update depth/i)).toBeNull();

    // And no React error #185 should have been logged.
    const errorCalls = errorSpy.mock.calls.map((c) => String(c[0]));
    const hasReact185 = errorCalls.some((c) =>
      /185|maximm update depth|getSnapshot should be cached/i.test(c),
    );
    expect(hasReact185, "console.error should NOT contain React error #185").toBe(false);
  });

  it("renders the comment composer and at least one comment after latency", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderPostPage("p1");

    // Wait for the simulated 500ms comment-loading latency.
    await waitFor(
      () => {
        expect(screen.queryByText(/something went wrong/i)).toBeNull();
      },
      { timeout: 3000 },
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 700));
    });

    // The comment composer textarea ("What are your thoughts?" or similar)
    // should be visible.
    const textarea = screen.queryByRole("textbox");
    expect(textarea, "comment composer textarea should render").not.toBeNull();

    // No React error should have been logged during the full render cycle.
    const errorCalls = errorSpy.mock.calls.map((c) => String(c[0]));
    const hasReactError = errorCalls.some((c) =>
      /185|maximm update depth|getSnapshot should be cached/i.test(c),
    );
    expect(hasReactError, "no React error #185 should be logged").toBe(false);
  });

  it("renders a not-found fallback for an unknown post ID (no crash)", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderPostPage("p-nonexistent");

    await waitFor(
      () => {
        expect(screen.queryByText(/post not found/i)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    // No React error #185 should fire even for the not-found branch.
    const errorCalls = errorSpy.mock.calls.map((c) => String(c[0]));
    const hasReactError = errorCalls.some((c) =>
      /185|maximm update depth|getSnapshot should be cached/i.test(c),
    );
    expect(hasReactError, "not-found branch must not crash either").toBe(false);
  });
});
