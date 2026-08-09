import { useEffect, type RefObject } from "react";

/**
 * Trap keyboard focus inside the element referenced by `containerRef`.
 *
 * - Tab / Shift+Tab cycle through focusable elements within the container
 *   instead of escaping to the page behind.
 * - When `active` is true, focus moves into the container on mount and the
 *   previously-focused element is restored on unmount.
 *
 * Designed for use by Modal / Drawer overlays. Plan §13.4 requires a focus
 * trap, Escape close, and focus return.
 */
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function useFocusTrap<T extends HTMLElement>(
  containerRef: RefObject<T | null>,
  active: boolean,
): void {
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    // Remember the element that had focus before the trap activated so we
    // can restore it on unmount.
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Move focus into the container — first focusable element if possible,
    // otherwise the container itself (it must have tabIndex=-1 to be
    // focusable programmatically).
    const focusables = getFocusables(container);
    if (focusables.length > 0) {
      focusables[0].focus();
    } else {
      container.setAttribute("tabindex", "-1");
      container.focus();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab") return;
      const currentContainer = containerRef.current;
      if (!currentContainer) return;
      const focusable = getFocusables(currentContainer);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey) {
        // Shift+Tab: if focus is on the first element, wrap to the last.
        if (document.activeElement === first || !currentContainer.contains(document.activeElement)) {
          event.preventDefault();
          last.focus();
        }
      } else {
        // Tab: if focus is on the last element, wrap to the first.
        if (document.activeElement === last || !currentContainer.contains(document.activeElement)) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      // Restore focus to the trigger element.
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}

function getFocusables(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  );
}
