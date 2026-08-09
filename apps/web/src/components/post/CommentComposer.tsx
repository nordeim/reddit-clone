import { useState } from "react";
import { Button } from "../ui/Button";
import { Avatar } from "../ui/Avatar";
import { CURRENT_USER } from "../../data/users";

const MAX_COMMENT_LENGTH = 10_000;

export function CommentComposer({
  onSubmit,
  placeholder = "What are your thoughts?",
  autoFocus = false,
  onCancel,
}: {
  onSubmit: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  onCancel?: () => void;
}) {
  const [text, setText] = useState("");

  function submit() {
    if (!text.trim()) return;
    onSubmit(text.trim());
    setText("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Ctrl/Cmd+Enter submits. Plan §12.6 requires this keyboard shortcut.
    // Plain Enter inserts a newline as usual.
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submit();
    }
  }

  const remaining = MAX_COMMENT_LENGTH - text.length;
  const overLimit = remaining < 0;

  return (
    <div className="flex gap-2.5">
      <Avatar seed={CURRENT_USER.id} label={CURRENT_USER.displayName} size="sm" className="mt-0.5" />
      <div className="flex-1 space-y-2">
        <textarea
          autoFocus={autoFocus}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={3}
          maxLength={MAX_COMMENT_LENGTH}
          aria-label={placeholder}
          className="w-full resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-zinc-400">
            <kbd className="rounded border border-zinc-300 px-1 py-0.5 font-mono text-[10px] dark:border-zinc-700">⌘</kbd>
            +
            <kbd className="rounded border border-zinc-300 px-1 py-0.5 font-mono text-[10px] dark:border-zinc-700">Enter</kbd>
            <span className="ml-1.5 hidden sm:inline">to comment</span>
          </span>
          <div className="flex items-center gap-3">
            <span
              className={
                "text-[11px] tabular-nums " +
                (overLimit ? "text-red-600 dark:text-red-400" : "text-zinc-400")
              }
            >
              {remaining}
            </span>
            {onCancel && (
              <Button variant="ghost" size="sm" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button variant="primary" size="sm" disabled={!text.trim() || overLimit} onClick={submit}>
              Comment
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
