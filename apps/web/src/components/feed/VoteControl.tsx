import { ArrowBigDown, ArrowBigUp } from "lucide-react";
import { motion } from "framer-motion";
import { useAppStore } from "../../store/store";
import { getVisibleScore } from "../../store/selectors";
import { formatCount } from "../../utils/format";
import { cn } from "../../utils/cn";
import type { VoteValue } from "../../types";

interface VoteControlProps {
  targetId: string;
  baseScore: number;
  orientation?: "vertical" | "horizontal";
  size?: "sm" | "md";
  /** Used to build the `aria-label` — "Upvote post" vs "Upvote comment". */
  label?: "post" | "comment";
}

export function VoteControl({
  targetId,
  baseScore,
  orientation = "vertical",
  size = "md",
  label = "post",
}: VoteControlProps) {
  const vote = useAppStore((s) => s.votes[targetId] ?? 0) as VoteValue;
  const setVote = useAppStore((s) => s.setVote);

  const score = getVisibleScore(baseScore, vote);
  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  function cast(next: VoteValue) {
    setVote(targetId, vote === next ? 0 : next);
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-full",
        orientation === "vertical" ? "flex-col py-1" : "flex-row bg-zinc-100 px-1 dark:bg-zinc-800",
      )}
    >
      <button
        type="button"
        aria-label={`Upvote ${label}`}
        aria-pressed={vote === 1}
        onClick={() => cast(1)}
        className={cn(
          "flex items-center justify-center rounded-full p-1 transition-colors hover:bg-orange-100 dark:hover:bg-orange-500/10",
          vote === 1 ? "text-orange-600" : "text-zinc-400 dark:text-zinc-500",
        )}
      >
        <motion.span whileTap={{ scale: 1.3 }}>
          <ArrowBigUp className={iconSize} fill={vote === 1 ? "currentColor" : "none"} />
        </motion.span>
      </button>

      <motion.span
        key={score}
        initial={{ scale: 1.25 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.18 }}
        className={cn(
          "min-w-[1.5rem] text-center text-xs font-bold tabular-nums",
          vote === 1 ? "text-orange-600" : vote === -1 ? "text-indigo-600" : "text-zinc-600 dark:text-zinc-300",
        )}
      >
        {formatCount(score)}
      </motion.span>

      <button
        type="button"
        aria-label={`Downvote ${label}`}
        aria-pressed={vote === -1}
        onClick={() => cast(-1)}
        className={cn(
          "flex items-center justify-center rounded-full p-1 transition-colors hover:bg-indigo-100 dark:hover:bg-indigo-500/10",
          vote === -1 ? "text-indigo-600" : "text-zinc-400 dark:text-zinc-500",
        )}
      >
        <motion.span whileTap={{ scale: 1.3 }}>
          <ArrowBigDown className={iconSize} fill={vote === -1 ? "currentColor" : "none"} />
        </motion.span>
      </button>
    </div>
  );
}
