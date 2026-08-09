/**
 * Render an ISO timestamp as a short relative-age string.
 *
 * @param iso ISO date string (e.g. `"2026-08-09T12:00:00Z"`)
 * @param now Optional anchor timestamp (epoch ms). Injecting `now` makes the
 *   function deterministic in tests. Defaults to `Date.now()`.
 * @returns Strings like `"just now"`, `"5m ago"`, `"3h ago"`, `"2d ago"`,
 *   `"3mo ago"`, `"2y ago"`. Invalid dates fall back to `"just now"`.
 */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime();
  // `new Date("garbage").getTime()` returns NaN; Math.max(0, NaN) is NaN,
  // so guard explicitly to avoid propagating NaN into comparisons.
  if (Number.isNaN(then)) return "just now";
  const seconds = Math.max(0, Math.floor((now - then) / 1000));
  const units: [number, string][] = [
    [60, "s"],
    [60, "m"],
    [24, "h"],
    [30, "d"],
    [12, "mo"],
    [Number.POSITIVE_INFINITY, "y"],
  ];
  let value = seconds;
  let unitLabel = "s";
  for (const [amount, label] of units) {
    if (value < amount) {
      unitLabel = label;
      break;
    }
    value = Math.floor(value / amount);
    unitLabel = label;
  }
  if (seconds < 60) return "just now";
  return `${value}${unitLabel} ago`;
}

export function formatCount(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs < 1000) return `${sign}${abs}`;
  if (abs < 1_000_000) {
    const v = abs / 1000;
    // Round to 1 decimal place, then drop a trailing ".0" so 1000k reads as
    // "1000k" instead of "1000.0k" (the previous behavior).
    const rounded = Number(v.toFixed(1));
    return `${sign}${rounded}k`;
  }
  const v = abs / 1_000_000;
  const rounded = Number(v.toFixed(1));
  return `${sign}${rounded}m`;
}

export function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
