import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useOnClickOutside } from "../../hooks";
import { cn } from "../../utils/cn";

interface DropdownProps {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
  panelClassName?: string;
}

export function Dropdown({ trigger, children, align = "right", panelClassName }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useOnClickOutside<HTMLDivElement>(() => setOpen(false), open);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  // Track the trigger's underlying button so we can return focus to it on close.
  function setTriggerRef(node: HTMLButtonElement | null) {
    triggerRef.current = node;
  }

  // Escape to close + arrow-key navigation between items.
  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
        // Return focus to the trigger so the user can re-open with Enter/Space.
        triggerRef.current?.focus();
        return;
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const panel = panelRef.current;
        if (!panel) return;
        const items = Array.from(panel.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
        if (items.length === 0) return;
        const currentIndex = items.findIndex((el) => el === document.activeElement);
        let nextIndex: number;
        if (event.key === "ArrowDown") {
          nextIndex = currentIndex < 0 || currentIndex === items.length - 1 ? 0 : currentIndex + 1;
        } else {
          nextIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
        }
        items[nextIndex]?.focus();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  function toggle() {
    setOpen((v) => !v);
  }
  function close() {
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      {/* Wrap the trigger so we can attach aria-expanded / aria-haspopup
          and capture the underlying button for focus restoration. */}
      <DropdownTriggerWrapper open={open} setRef={setTriggerRef} render={trigger({ open, toggle })} />
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={cn(
              "absolute top-full z-40 mt-2 min-w-[14rem] overflow-hidden rounded-xl border border-zinc-200 bg-white py-1.5 shadow-xl shadow-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900",
              align === "right" ? "right-0" : "left-0",
              panelClassName,
            )}
          >
            {children(close)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Wraps the trigger content to attach `aria-expanded` and `aria-haspopup`
 * to the underlying button element. React-clone-element lets us inject
 * these props without forcing callers to remember them at every call site.
 */
function DropdownTriggerWrapper({
  open,
  setRef,
  render,
}: {
  open: boolean;
  setRef: (node: HTMLButtonElement | null) => void;
  render: ReactNode;
}) {
  // Walk the rendered element and inject a11y props onto the first <button>.
  // If the trigger is not a button, the caller is responsible for a11y.
  if (
    render !== null &&
    typeof render === "object" &&
    "type" in render &&
    (render as { type: unknown }).type === "button"
  ) {
    const button = render as React.ReactElement<Record<string, unknown>>;
    const existingRef = button.props.ref as React.Ref<HTMLButtonElement> | undefined;
    const mergedRef = (node: HTMLButtonElement | null) => {
      setRef(node);
      if (typeof existingRef === "function") existingRef(node);
      else if (existingRef && "current" in existingRef) {
        (existingRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
      }
    };
    return {
      ...button,
      props: {
        ...button.props,
        "aria-expanded": open,
        "aria-haspopup": "menu",
        ref: mergedRef,
      },
    } as React.ReactElement;
  }
  return <>{render}</>;
}

export function DropdownItem({
  children,
  onClick,
  icon,
  danger,
}: {
  children: ReactNode;
  onClick?: () => void;
  icon?: ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm font-medium transition-colors",
        danger
          ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
          : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800",
      )}
    >
      {icon}
      {children}
    </button>
  );
}
