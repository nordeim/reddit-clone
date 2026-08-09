import { Clock, Flame, Sparkles, TrendingUp, Trophy } from "lucide-react";
import { cn } from "../../utils/cn";
import type { SortMode } from "../../types";

const TABS: { mode: SortMode; label: string; icon: typeof Flame }[] = [
  { mode: "best", label: "Best", icon: Sparkles },
  { mode: "hot", label: "Hot", icon: Flame },
  { mode: "new", label: "New", icon: Clock },
  { mode: "top", label: "Top", icon: Trophy },
  { mode: "rising", label: "Rising", icon: TrendingUp },
];

export function SortTabs({ value, onChange }: { value: SortMode; onChange: (mode: SortMode) => void }) {
  return (
    <div className="flex w-full gap-1 overflow-x-auto rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
      {TABS.map(({ mode, label, icon: Icon }) => (
        <button
          key={mode}
          onClick={() => onChange(mode)}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors",
            value === mode
              ? "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400"
              : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800",
          )}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
  );
}
