import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, MessageSquare } from "lucide-react";
import { getUser, CURRENT_USER } from "../../data/users";
import { VoteControl } from "../feed/VoteControl";
import { Avatar } from "../ui/Avatar";
import { CommentComposer } from "./CommentComposer";
import { useAppStore } from "../../store/store";
import { timeAgo } from "../../utils/format";
import type { Comment } from "../../types";

export function CommentThread({ comment, postId, depth = 0 }: { comment: Comment; postId: string; depth?: number }) {
  const [collapsed, setCollapsed] = useState(false);
  const [replying, setReplying] = useState(false);
  const [localChildren, setLocalChildren] = useState<Comment[]>([]);
  const addLocalComment = useAppStore((s) => s.addLocalComment);
  const author = getUser(comment.authorId);

  const allChildren = [...localChildren, ...comment.children];

  function handleReply(text: string) {
    const reply: Comment = {
      id: `${comment.id}-r${Date.now()}`,
      postId,
      authorId: CURRENT_USER.id,
      parentId: comment.id,
      body: text,
      score: 1,
      createdAt: new Date().toISOString(),
      children: [],
      isLocal: true,
    };
    setLocalChildren((c) => [reply, ...c]);
    addLocalComment(postId, reply);
    setReplying(false);
  }

  return (
    <div className={depth > 0 ? "border-l-2 border-zinc-100 pl-3 dark:border-zinc-800" : ""}>
      <div className="group py-2.5">
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expand comment" : "Collapse comment"}
            className="rounded p-0.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          <Avatar seed={author.id} label={author.displayName} size="xs" />
          <Link to={`/u/${author.username}`} className="font-bold text-zinc-800 hover:underline dark:text-zinc-100">
            u/{author.username}
          </Link>
          <span className="text-zinc-400">&bull;</span>
          <span className="text-zinc-400">{timeAgo(comment.createdAt)}</span>
          {collapsed && <span className="text-zinc-400">({1 + countDescendants(allChildren)} hidden)</span>}
        </div>

        {!collapsed && (
          <>
            <p className="mt-1 pl-6 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{comment.body}</p>
            <div className="mt-1.5 flex items-center gap-1 pl-5">
              <VoteControl targetId={`comment:${comment.id}`} baseScore={comment.score} orientation="horizontal" size="sm" />
              <button
                onClick={() => setReplying((v) => !v)}
                className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <MessageSquare className="h-3.5 w-3.5" /> Reply
              </button>
            </div>

            {replying && (
              <div className="mt-2 pl-5">
                <CommentComposer
                  autoFocus
                  placeholder={`Replying to u/${author.username}`}
                  onSubmit={handleReply}
                  onCancel={() => setReplying(false)}
                />
              </div>
            )}

            {allChildren.length > 0 && (
              <div className="mt-1 pl-4">
                {allChildren.map((child) => (
                  <CommentThread key={child.id} comment={child} postId={postId} depth={depth + 1} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function countDescendants(children: Comment[]): number {
  let total = 0;
  for (const c of children) total += 1 + countDescendants(c.children);
  return total;
}
