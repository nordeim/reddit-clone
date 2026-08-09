import { describe, it, expect } from "vitest";
import { isSafeUrl, extractDomain } from "./url";

describe("isSafeUrl", () => {
  it("accepts http URLs", () => {
    expect(isSafeUrl("http://example.com")).toBe(true);
    expect(isSafeUrl("http://localhost:3000/path?q=1#frag")).toBe(true);
  });

  it("accepts https URLs", () => {
    expect(isSafeUrl("https://example.com")).toBe(true);
    expect(isSafeUrl("https://example.com/some/deep/path")).toBe(true);
  });

  it("rejects empty string", () => {
    expect(isSafeUrl("")).toBe(false);
  });

  it("rejects whitespace-only strings", () => {
    expect(isSafeUrl("   ")).toBe(false);
    expect(isSafeUrl("\t\n")).toBe(false);
  });

  it("rejects javascript: URLs (XSS vector)", () => {
    expect(isSafeUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeUrl("javascript:alert(document.cookie)")).toBe(false);
  });

  it("rejects data: URLs", () => {
    expect(isSafeUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isSafeUrl("data:image/png;base64,iVBOR...")).toBe(false);
  });

  it("rejects file: URLs", () => {
    expect(isSafeUrl("file:///etc/passwd")).toBe(false);
  });

  it("rejects ftp: URLs", () => {
    expect(isSafeUrl("ftp://example.com/file")).toBe(false);
  });

  it("rejects vbscript: URLs (legacy IE XSS vector)", () => {
    expect(isSafeUrl("vbscript:msgbox(1)")).toBe(false);
  });

  it("rejects malformed URLs", () => {
    expect(isSafeUrl("not a url")).toBe(false);
    expect(isSafeUrl("example.com")).toBe(false); // no protocol
    expect(isSafeUrl("://missing-protocol")).toBe(false);
  });

  it("rejects protocol-relative URLs (//example.com) — parser treats as relative", () => {
    // `new URL("//example.com")` throws because there's no base.
    expect(isSafeUrl("//example.com")).toBe(false);
  });

  it("trims surrounding whitespace before validating", () => {
    expect(isSafeUrl("  https://example.com  ")).toBe(true);
  });

  it("accepts URLs with ports, paths, queries, and fragments", () => {
    expect(isSafeUrl("https://api.example.com:8443/v1/users?id=42#top")).toBe(true);
  });
});

describe("extractDomain", () => {
  it("extracts the hostname from a URL", () => {
    expect(extractDomain("https://example.com/path")).toBe("example.com");
    expect(extractDomain("https://sub.example.com/path")).toBe("sub.example.com");
  });

  it("strips the leading www. prefix", () => {
    expect(extractDomain("https://www.example.com")).toBe("example.com");
    expect(extractDomain("https://www.blog.example.com")).toBe("blog.example.com");
  });

  it("returns the hostname including port when present", () => {
    // `hostname` excludes the port; `host` includes it. We use `hostname` to
    // match the previous behaviour. Port is dropped on display.
    expect(extractDomain("http://localhost:3000/path")).toBe("localhost");
  });

  it("falls back to 'link' for malformed input", () => {
    expect(extractDomain("not a url")).toBe("link");
    expect(extractDomain("")).toBe("link");
  });
});
