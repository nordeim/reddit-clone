/**
 * URL validation + safe-domain extraction.
 *
 * Used by `CreatePostModal` (and any future user-input URL surface) to
 * reject unsafe protocols like `javascript:`, `data:`, `file:`, `vbscript:`,
 * etc. Only `http:` and `https:` URLs are accepted.
 */

/**
 * Returns true iff `url` parses as a valid http(s) URL.
 *
 * - Empty / whitespace-only strings → false
 * - Strings that throw under `new URL(...)` → false
 * - `javascript:alert(1)`, `data:text/html,...`, `file:///...`, `ftp://...` → false
 * - `https://example.com`, `http://localhost:3000/path?q=1` → true
 * - Protocol-relative `//example.com` → false (URL parser treats it as relative)
 */
export function isSafeUrl(url: string): boolean {
  const trimmed = url.trim();
  if (trimmed.length === 0) return false;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }
  return parsed.protocol === "http:" || parsed.protocol === "https:";
}

/**
 * Extracts a display-friendly hostname from a URL, stripping the leading
 * `www.` prefix. Falls back to the literal string `"link"` if the URL is
 * unparseable — matching the previous behaviour in `CreatePostModal`.
 */
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "link";
  }
}
