import { useMemo, useState } from "react";
import { useParams, useSearchParams, Navigate } from "react-router-dom";
import { Cake, MessageSquare, FileText, Bookmark } from "lucide-react";
import { USERS, CURRENT_USER } from "../data/users";
import { POSTS } from "../data/posts";
import { getCommentsForPost } from "../data/comments";
import { PostList } from "../components/feed/PostList";
import { Avatar } from "../components/ui/Avatar";
import { Card, RightPanelShell } from "../components/layout/RightPanel";
import { useAppStore } from "../store/store";
import { formatFullDate, timeAgo } from "../utils/format";
import { cn } from "../utils/cn";
import type { Comment } from "../types";
import { Link } from "react-router-dom";

type Tab = "posts" | "comments" | "saved" | "about";

export function ProfilePage() {
  const { username = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab) ?? "posts";
  const [tab, setTab] = useState<Tab>(initialTab);

  const user = username === CURRENT_USER.username ? CURRENT_USER : USERS.find((u) => u.username === username);
  const localPosts = useAppStore((s) => s.localPosts);
  const savedPostIds = useAppStore((s) => s.savedPostIds);

  const allPosts = useMemo(() => [...localPosts, ...POSTS], [localPosts]);

  const userPosts = useMemo(
    () => (user ? allPosts.filter((p) => p.authorId === user.id) : []),
    [allPosts, user],
  );

  const savedPosts = useMemo(
    () => allPosts.filter((p) => savedPostIds.includes(p.id)),
    [allPosts, savedPostIds],
  );

  const userComments = useMemo(() => {
    if (!user) return [] as { comment: Comment; postTitle: string; postId: string }[];
    const results: { comment: Comment; postTitle: string; postId: string }[] = [];
    for (const post of POSTS.slice(0, 120)) {
      const walk = (nodes: Comment[]) => {
        for (const c of nodes) {
          if (c.authorId === user.id) results.push({ comment: c, postTitle: post.title, postId: post.id });
          walk(c.children);
        }
      };
      walk(getCommentsForPost(post.id));
    }
    return results.slice(0, 25);
  }, [user]);

  if (!user) return <Navigate to="/" replace />;

  function selectTab(next: Tab) {
    setTab(next);
    setSearchParams(next === "posts" ? {} : { tab: next });
  }

  const isSelf = user.id === CURRENT_USER.id;

  return (
    <div className="mx-auto flex max-w-6xl gap-6">
      <div className="min-w-0 flex-1 space-y-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-4">
            <Avatar seed={user.id} label={user.displayName} size="xl" />
            <div>
              <h1 className="text-lg font-extrabold text-zinc-900 dark:text-zinc-50">{user.displayName}</h1>
              <p className="text-sm text-zinc-500">u/{user.username}</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{user.bio}</p>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1.5">
              <Cake className="h-3.5 w-3.5" /> Joined {formatFullDate(user.createdAt)}
            </span>
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
              {user.karma.toLocaleString()} karma
            </span>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
          {(
            [
              ["posts", "Posts", FileText],
              ["comments", "Comments", MessageSquare],
              ...(isSelf ? [["saved", "Saved", Bookmark] as const] : []),
            ] as [Tab, string, typeof FileText][]
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              onClick={() => selectTab(value)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors",
                tab === value
                  ? "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400"
                  : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800",
              )}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        {tab === "posts" && <PostList posts={userPosts} />}
        {tab === "saved" && isSelf && <PostList posts={savedPosts} />}
        {tab === "comments" && (
          <div className="space-y-2">
            {userComments.length === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-300 bg-white py-12 text-center text-sm text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900">
                No comments yet.
              </p>
            ) : (
              userComments.map(({ comment, postTitle, postId }) => (
                <Link
                  key={comment.id}
                  to={`/comments/${postId}`}
                  className="block rounded-xl border border-zinc-200 bg-white p-4 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/60"
                >
                  <p className="text-xs text-zinc-400">
                    Commented on <span className="font-semibold text-zinc-600 dark:text-zinc-300">{postTitle}</span>{" "}
                    &bull; {timeAgo(comment.createdAt)}
                  </p>
                  <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{comment.body}</p>
                </Link>
              ))
            )}
          </div>
        )}
      </div>

      <RightPanelShell>
        <Card title="User info">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500">Karma</dt>
              <dd className="font-semibold text-zinc-800 dark:text-zinc-100">{user.karma.toLocaleString()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Posts</dt>
              <dd className="font-semibold text-zinc-800 dark:text-zinc-100">{userPosts.length}</dd>
            </div>
          </dl>
        </Card>
      </RightPanelShell>
    </div>
  );
}


