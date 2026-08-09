import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithRouter } from "../../test/utils";
import { CreatePostModal } from "./CreatePostModal";
import { useAppStore } from "../../store/store";

describe("CreatePostModal (integration)", () => {
  beforeEach(() => {
    useAppStore.setState({
      votes: {},
      savedPostIds: [],
      joinedCommunityIds: [],
      localPosts: [],
      localComments: {},
      notificationReadOverrides: {},
      toasts: [],
      theme: "light",
    });
  });

  it("renders title input, body textarea, and post type tabs when open", () => {
    renderWithRouter(<CreatePostModal open={true} onClose={() => {}} />);
    expect(screen.getByLabelText(/Title/)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Text/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Image/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Link/ })).toBeInTheDocument();
  });

  it("submits a valid text post and calls onClose + addLocalPost", async () => {
    const onClose = vi.fn();
    const { user } = renderWithRouter(<CreatePostModal open={true} onClose={onClose} />);

    await user.type(screen.getByLabelText(/Title/), "My new post about TypeScript");
    await user.click(screen.getByRole("button", { name: "Post" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().localPosts).toHaveLength(1);
    expect(useAppStore.getState().localPosts[0].title).toBe("My new post about TypeScript");
    expect(useAppStore.getState().localPosts[0].type).toBe("text");
  });

  it("blocks submission when title is empty and surfaces the validation error", async () => {
    const onClose = vi.fn();
    const { user } = renderWithRouter(<CreatePostModal open={true} onClose={onClose} />);

    // Click Post with empty title — should show the error, not call onClose.
    await user.click(screen.getByRole("button", { name: "Post" }));
    expect(screen.getByText("Title is required")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(useAppStore.getState().localPosts).toHaveLength(0);
  });

  it("rejects a link post with a javascript: URL", async () => {
    const onClose = vi.fn();
    const { user } = renderWithRouter(<CreatePostModal open={true} onClose={onClose} />);

    await user.click(screen.getByRole("tab", { name: /Link/ }));
    await user.type(screen.getByLabelText(/Title/), "Malicious link post");
    await user.type(screen.getByLabelText(/URL/), "javascript:alert(1)");
    await user.click(screen.getByRole("button", { name: "Post" }));

    // Should show the protocol error message
    await waitFor(() => {
      expect(screen.getByText(/URL must start with http/i)).toBeInTheDocument();
    });
    expect(onClose).not.toHaveBeenCalled();
    expect(useAppStore.getState().localPosts).toHaveLength(0);
  });

  it("accepts a link post with a valid https URL", async () => {
    const onClose = vi.fn();
    const { user } = renderWithRouter(<CreatePostModal open={true} onClose={onClose} />);

    await user.click(screen.getByRole("tab", { name: /Link/ }));
    await user.type(screen.getByLabelText(/Title/), "A safe link post");
    await user.type(screen.getByLabelText(/URL/), "https://example.com/article");
    await user.click(screen.getByRole("button", { name: "Post" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().localPosts).toHaveLength(1);
    const post = useAppStore.getState().localPosts[0];
    expect(post.type).toBe("link");
    expect(post.linkUrl).toBe("https://example.com/article");
    expect(post.linkDomain).toBe("example.com");
  });

  it("rejects a link post with a data: URL", async () => {
    const onClose = vi.fn();
    const { user } = renderWithRouter(<CreatePostModal open={true} onClose={onClose} />);

    await user.click(screen.getByRole("tab", { name: /Link/ }));
    await user.type(screen.getByLabelText(/Title/), "XSS attempt");
    await user.type(screen.getByLabelText(/URL/), "data:text/html,<script>alert(1)</script>");
    await user.click(screen.getByRole("button", { name: "Post" }));

    await waitFor(() => {
      expect(screen.getByText(/URL must start with http/i)).toBeInTheDocument();
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("shows character counter for title", () => {
    renderWithRouter(<CreatePostModal open={true} onClose={() => {}} />);
    // 0/300 counter visible
    expect(screen.getByText("0/300")).toBeInTheDocument();
  });
});
