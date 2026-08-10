import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { NotFoundPage } from "./NotFoundPage";

/**
 * TDD test suite for NotFoundPage (Round 10, BUG-R10-3).
 *
 * Bug being fixed:
 *   The page previously rendered "Nothing here yet" / "This page drifted
 *   off into space" — neither "404" nor "not found" appeared anywhere
 *   on the page. This hurt UX (users couldn't immediately tell they hit
 *   a wrong URL), SEO (search engines couldn't identify the 404), and
 *   accessibility (screen readers had no semantic 404 marker).
 *
 * Fix:
 *   Update the h1 to "404 — Page not found" so the visible text contains
 *   both "404" and "not found".
 *
 * These tests assert the visible text contains a 404 marker AND the
 * "Back to Home" link is still present.
 */

function renderNotFound() {
  return render(
    <MemoryRouter>
      <NotFoundPage />
    </MemoryRouter>,
  );
}

describe("NotFoundPage (BUG-R10-3 — 404 marker)", () => {
  it("renders a heading containing '404'", () => {
    renderNotFound();
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent?.toLowerCase()).toContain("404");
  });

  it("renders visible text containing 'not found' (case-insensitive)", () => {
    const { container } = renderNotFound();
    const text = (container.textContent || "").toLowerCase();
    expect(text).toContain("not found");
  });

  it("renders a 'Back to Home' link pointing to /", () => {
    renderNotFound();
    const link = screen.getByRole("link", { name: /back to home/i });
    expect(link).toHaveAttribute("href", "/");
  });

  it("renders non-empty body (not a blank screen)", () => {
    const { container } = renderNotFound();
    const text = (container.textContent || "").trim();
    expect(text.length).toBeGreaterThan(0);
  });
});
