import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithRouter } from "../../test/utils";
import { VoteControl } from "../feed/VoteControl";
import { useAppStore } from "../../store/store";

describe("VoteControl (integration)", () => {
  beforeEach(() => {
    // Reset the store between tests so votes don't leak across.
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

  it("renders the base score when no vote is cast", () => {
    renderWithRouter(<VoteControl targetId="post:p1" baseScore={42} />);
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("upvotes on click and updates the visible score", async () => {
    const { user } = renderWithRouter(<VoteControl targetId="post:p1" baseScore={10} />);
    const upButton = screen.getByRole("button", { name: "Upvote post" });
    await user.click(upButton);
    // 10 + 1 = 11
    expect(screen.getByText("11")).toBeInTheDocument();
    // aria-pressed reflects the active state
    expect(upButton).toHaveAttribute("aria-pressed", "true");
  });

  it("downvotes on click and updates the visible score", async () => {
    const { user } = renderWithRouter(<VoteControl targetId="post:p1" baseScore={10} />);
    const downButton = screen.getByRole("button", { name: "Downvote post" });
    await user.click(downButton);
    expect(screen.getByText("9")).toBeInTheDocument();
    expect(downButton).toHaveAttribute("aria-pressed", "true");
  });

  it("toggles off when the same vote is clicked again", async () => {
    const { user } = renderWithRouter(<VoteControl targetId="post:p1" baseScore={10} />);
    const upButton = screen.getByRole("button", { name: "Upvote post" });
    await user.click(upButton); // 11
    await user.click(upButton); // back to 10
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(upButton).toHaveAttribute("aria-pressed", "false");
  });

  it("replaces an upvote with a downvote", async () => {
    const { user } = renderWithRouter(<VoteControl targetId="post:p1" baseScore={10} />);
    await user.click(screen.getByRole("button", { name: "Upvote post" }));
    expect(screen.getByText("11")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Downvote post" }));
    expect(screen.getByText("9")).toBeInTheDocument();
  });

  it("uses 'comment' label when label='comment' is passed", () => {
    renderWithRouter(
      <VoteControl targetId="comment:c1" baseScore={5} orientation="horizontal" size="sm" label="comment" />,
    );
    expect(screen.getByRole("button", { name: "Upvote comment" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Downvote comment" })).toBeInTheDocument();
  });

  it("persists the vote to the zustand store", async () => {
    const { user } = renderWithRouter(<VoteControl targetId="post:p1" baseScore={10} />);
    await user.click(screen.getByRole("button", { name: "Upvote post" }));
    expect(useAppStore.getState().votes["post:p1"]).toBe(1);
  });
});
