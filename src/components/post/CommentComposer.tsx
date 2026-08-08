import { useState } from "react";
import { Button } from "../ui/Button";
import { Avatar } from "../ui/Avatar";
import { CURRENT_USER } from "../../data/users";

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

  return (
    <div className="flex gap-2.5">
      <Avatar seed={CURRENT_USER.id} label={CURRENT_USER.displayName} size="sm" className="mt-0.5" />
      <div className="flex-1 space-y-2">
        <textarea
          autoFocus={autoFocus}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button variant="primary" size="sm" disabled={!text.trim()} onClick={submit}>
            Comment
          </Button>
        </div>
      </div>
    </div>
  );
}
