import { describe, it, expect } from "vitest";
import { cn } from "./cn";

describe("cn (sanity test — Vitest + Tailwind-merge integration)", () => {
  it("joins truthy string args with a space", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("drops falsy values", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });

  it("lets tailwind-merge resolve conflicting tailwind classes (last wins)", () => {
    // tailwind-merge should keep `px-3` and drop `px-2`.
    expect(cn("px-2", "px-3")).toBe("px-3");
  });

  it("preserves non-conflicting classes verbatim", () => {
    expect(cn("font-bold", "text-orange-600")).toBe("font-bold text-orange-600");
  });
});
