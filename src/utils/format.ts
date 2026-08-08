export function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
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
  let divisor = 1;
  for (const [amount, label] of units) {
    if (value < amount) {
      unitLabel = label;
      break;
    }
    value = Math.floor(value / amount);
    divisor *= amount;
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
    return `${sign}${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}k`;
  }
  const v = abs / 1_000_000;
  return `${sign}${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}m`;
}

export function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
