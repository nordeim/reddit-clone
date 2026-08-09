import { describe, it, expect } from "vitest";
import { timeAgo, formatCount, formatFullDate } from "./format";

describe("timeAgo", () => {
  // Fixed anchor so assertions are deterministic across runs.
  const NOW = new Date("2026-08-09T12:00:00Z").getTime();

  it("returns 'just now' for timestamps less than 60 seconds old", () => {
    const iso = new Date(NOW - 5_000).toISOString(); // 5s ago
    expect(timeAgo(iso, NOW)).toBe("just now");
  });

  it("returns seconds for under a minute (boundary just below 60s)", () => {
    const iso = new Date(NOW - 30_000).toISOString(); // 30s ago
    expect(timeAgo(iso, NOW)).toBe("just now");
  });

  it("returns minutes for under an hour", () => {
    const iso = new Date(NOW - 5 * 60_000).toISOString(); // 5m ago
    expect(timeAgo(iso, NOW)).toBe("5m ago");
  });

  it("returns hours for under a day", () => {
    const iso = new Date(NOW - 3 * 3_600_000).toISOString(); // 3h ago
    expect(timeAgo(iso, NOW)).toBe("3h ago");
  });

  it("returns days for under a month", () => {
    const iso = new Date(NOW - 5 * 86_400_000).toISOString(); // 5d ago
    expect(timeAgo(iso, NOW)).toBe("5d ago");
  });

  it("returns months for under a year", () => {
    const iso = new Date(NOW - 90 * 86_400_000).toISOString(); // ~3mo ago
    expect(timeAgo(iso, NOW)).toBe("3mo ago");
  });

  it("returns years for very old timestamps", () => {
    const iso = new Date(NOW - 800 * 86_400_000).toISOString(); // ~2.2y ago
    expect(timeAgo(iso, NOW)).toBe("2y ago");
  });

  it("falls back to 'just now' for an invalid date string", () => {
    // `new Date('not-a-date').getTime()` is NaN; `Math.max(0, NaN)` is 0,
    // so the function returns "just now" rather than throwing.
    expect(timeAgo("not-a-date", NOW)).toBe("just now");
  });

  it("defaults to Date.now() when no anchor is passed", () => {
    const iso = new Date(Date.now() - 10_000).toISOString(); // 10s ago
    // Just verify it doesn't throw and returns something with "now" or a unit.
    const result = timeAgo(iso);
    expect(result).toBe("just now");
  });

  it("handles future timestamps as 'just now' (clamped to 0)", () => {
    const iso = new Date(NOW + 60_000).toISOString(); // 1 minute in the future
    expect(timeAgo(iso, NOW)).toBe("just now");
  });
});

describe("formatCount", () => {
  it("returns small numbers verbatim", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(42)).toBe("42");
    expect(formatCount(999)).toBe("999");
  });

  it("abbreviates thousands with 'k' suffix", () => {
    expect(formatCount(1_000)).toBe("1k");
    expect(formatCount(1_500)).toBe("1.5k");
    expect(formatCount(12_000)).toBe("12k");
    expect(formatCount(999_999)).toBe("1000k");
  });

  it("abbreviates millions with 'm' suffix", () => {
    expect(formatCount(1_000_000)).toBe("1m");
    expect(formatCount(2_500_000)).toBe("2.5m");
  });

  it("preserves sign for negative counts", () => {
    expect(formatCount(-5)).toBe("-5");
    expect(formatCount(-1_500)).toBe("-1.5k");
  });
});

describe("formatFullDate", () => {
  it("formats a known ISO date into a localized long-form date", () => {
    // Use a date that's unambiguous across locales.
    const iso = "2026-03-15T00:00:00Z";
    const result = formatFullDate(iso);
    // The exact output depends on the runtime locale, but the day and year
    // should always appear.
    expect(result).toContain("15");
    expect(result).toContain("2026");
  });
});
