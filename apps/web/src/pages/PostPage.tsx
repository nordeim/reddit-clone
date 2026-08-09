import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ExternalLink, Link2 } from "lucide-react";
import { getPost } from "../data/posts";
import { getUser } from "../data/users";
import { getCommunity } from "../data/communities";
import { getCommentsForPost } from "../data/comments";
import { CATEGORY_IMAGES } from "../data/images";
import { VoteControl } from "../components/feed/VoteControl";
import { CommentThread } from "../components/post/CommentThread";
import { CommentComposer } from "../components/post/CommentComposer";
import { CommentSkeleton } from "../components/ui/Skeleton";
import { Avatar } from "../components/ui/Avatar";
import { Card, RightPanelShell } from "../components/layout/RightPanel";
import { Button } from "../components/ui/Button";
import { useAppStore } from "../store/store";
import { timeAgo } from "../utils/format";
import { CURRENT_USER } from "../data/users";
import type { Comment } from "../types";

export function PostPage() {
  const { postId = "" } = useParams();
  const localPosts = useAppStore((s) => s.localPosts);
  const localComments = useAppStore((s) => s.localComments[postId] ?? []);
  const addLocalComment = useAppStore((s) => s.addLocalComment);

  const post = useMemo(
    () => localPosts.find((p) => p.id === postId) ?? getPost(postId),
    [localPosts, postId],
  );

  const [loadingComments, setLoadingComments] = useState(true);
  const [baseComments, setBaseComments] = useState<Comment[]>([]);

  useEffect(() => {
    setLoadingComments(true);
    const timer = setTimeout(() => {
      setBaseComments(post ? getCommentsForPost(post.id) : []);
      setLoadingComments(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [post]);

  // Plan §12.5: render a not-found state instead of silently redirecting.
  if (!post) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-24 text-center">
        <span className="text-5xl">🗑️</span>
        <h1 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-50">Post not found</h1>
        <p className="text-sm text-zinc-500">
          This post may have been removed, or the link is broken.
        </p>
        <Link to="/">
          <Button variant="primary">Back to Home</Button>
        </Link>
      </div>
    );
  }

  const author = getUser(post.authorId);
  const community = getCommunity(post.communityId);
  const comments = [...localComments, ...baseComments];
  const totalCount = comments.reduce((n, c) => n + 1 + countAll(c.children), 0);

  function handleTopLevelReply(text: string) {
    const comment: Comment = {
      id: `${post!.id}-c${Date.now()}`,
      postId: post!.id,
      authorId: CURRENT_USER.id,
      parentId: null,
      body: text,
      score: 1,
      createdAt: new Date().toISOString(),
      children: [],
      isLocal: true,
    };
    addLocalComment(post!.id, comment);
  }

  return (
    <div className="mx-auto flex max-w-6xl gap-6">
      <div className="min-w-0 flex-1 space-y-4">
        <article className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
          <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <Link
              to={`/r/${community.name}`}
              className="flex items-center gap-1.5 font-bold text-zinc-800 hover:underline dark:text-zinc-100"
            >
              <Avatar seed={community.id} label={community.title} emoji={community.icon} size="xs" />
              r/{community.name}
            </Link>
            <span>&bull;</span>
            <span>
              Posted by{" "}
              <Link to={`/u/${author.username}`} className="hover:underline">
                u/{author.username}
              </Link>
            </span>
            <span>&bull;</span>
            <span>{timeAgo(post.createdAt)}</span>
          </div>

          <h1 className="text-lg font-extrabold leading-snug text-zinc-900 dark:text-zinc-50 sm:text-xl">
            {post.title}
          </h1>

          {post.type === "text" && post.body && (
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              {post.body}
            </p>
          )}

          {post.type === "link" && post.linkUrl && (
            <a
              href={post.linkUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            >
              <Link2 className="h-4 w-4" /> {post.linkDomain} <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}

          {post.type === "image" && post.imageCategory && (
            <div className="mt-3 max-h-[560px] overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <img
                src={CATEGORY_IMAGES[post.imageCategory]}
                alt={`Image for ${post.title}`}
                loading="lazy"
                onError={(e) => {
                  // Hide the broken image container gracefully.
                  (e.currentTarget.parentElement as HTMLElement).style.display = "none";
                }}
                className="max-h-[560px] w-full object-cover"
              />
            </div>
          )}

          <div className="mt-4 flex items-center gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
            <VoteControl targetId={`post:${post.id}`} baseScore={post.score} orientation="horizontal" />
            <span className="text-sm font-semibold text-zinc-500">{totalCount} comments</span>
          </div>
        </article>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
          <h2 className="mb-3 text-sm font-bold text-zinc-900 dark:text-zinc-50">Add a comment</h2>
          <CommentComposer onSubmit={handleTopLevelReply} />

          <div className="mt-5 divide-y divide-zinc-50 dark:divide-zinc-800/60">
            {loadingComments ? (
              <div className="space-y-4 pt-2">
                <CommentSkeleton />
                <CommentSkeleton depth={1} />
                <CommentSkeleton />
              </div>
            ) : comments.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-400">No comments yet — be the first to share your thoughts.</p>
            ) : (
              comments.map((c) => <CommentThread key={c.id} comment={c} postId={post.id} />)
            )}
          </div>
        </div>
      </div>

      <RightPanelShell>
        <Card title={`About r/${community.name}`}>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{community.description}</p>
        </Card>
      </RightPanelShell>
    </div>
  );
}

function countAll(children: Comment[]): number {
  let total = 0;
  for (const c of children) total += 1 + countAll(c.children);
  return total;
}
