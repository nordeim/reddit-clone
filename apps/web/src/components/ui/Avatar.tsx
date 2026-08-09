import { gradientFor } from "../../utils/random";
import { cn } from "../../utils/cn";

interface AvatarProps {
  seed: string;
  label: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  emoji?: string;
  className?: string;
}

const SIZES: Record<NonNullable<AvatarProps["size"]>, string> = {
  xs: "h-5 w-5 text-[10px]",
  sm: "h-7 w-7 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-20 w-20 text-2xl",
};

export function Avatar({ seed, label, size = "md", emoji, className }: AvatarProps) {
  const [from, to] = gradientFor(seed);
  const initial = label.trim().charAt(0).toUpperCase() || "?";

  return (
    <div
      className={cn(
        "flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white shadow-sm ring-1 ring-black/5",
        SIZES[size],
        className,
      )}
      style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}
      aria-hidden="true"
    >
      {emoji ?? initial}
    </div>
  );
}
