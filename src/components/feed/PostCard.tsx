import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Bookmark, ExternalLink, Link2, MessageSquare, Share2 } from "lucide-react";
import { getUser } from "../../data/users";
import { getCommunity } from "../../data/communities";
import { CATEGORY_IMAGES } from "../../data/images";
import { VoteControl } from "./VoteControl";
import { Avatar } from "../ui/Avatar";
import { useAppStore } from "../../store/store";
import { timeAgo, formatCount } from "../../utils/format";
import { cn } from "../../utils/cn";
import type { Post } from "../../types";

export function PostCard({ post, showCommunity = true }: { post: Post; showCommunity?: boolean }) {
  const author = getUser(post.authorId);
  const community = getCommunity(post.communityId);
  const isSaved = useAppStore((s) => s.savedPostIds.includes(post.id));
  const toggleSave = useAppStore((s) => s.toggleSave);
  const pushToast = useAppStore((s) => s.pushToast);

  function share(e: React.MouseEvent) {
    e.preventDefault();
    navigator.clipboard?.writeText(`${window.location.origin}${window.location.pathname}#/comments/${post.id}`).catch(() => {});
    pushToast("Link copied to clipboard", "success");
  }

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex gap-1 rounded-xl border border-zinc-200 bg-white transition-shadow hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:gap-2"
    >
      <div className="hidden shrink-0 items-start p-2 sm:flex">
        <VoteControl targetId={`post:${post.id}`} baseScore={post.score} />
      </div>

      <div className="min-w-0 flex-1 p-3 sm:py-3 sm:pl-1 sm:pr-3">
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          {showCommunity && (
            <>
              <Link
                to={`/r/${community.name}`}
                className="flex items-center gap-1.5 font-bold text-zinc-800 hover:underline dark:text-zinc-100"
              >
                <Avatar seed={community.id} label={community.title} emoji={community.icon} size="xs" />
                r/{community.name}
              </Link>
              <span>&bull;</span>
            </>
          )}
          <span>
            Posted by{" "}
            <Link to={`/u/${author.username}`} className="hover:underline">
              u/{author.username}
            </Link>
          </span>
          <span>&bull;</span>
          <span>{timeAgo(post.createdAt)}</span>
          {post.flair && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {post.flair}
            </span>
          )}
        </div>

        <Link to={`/comments/${post.id}`} className="block">
          <h2 className="text-[15px] font-semibold leading-snug text-zinc-900 hover:text-zinc-700 dark:text-zinc-50 dark:hover:text-zinc-200 sm:text-base">
            {post.title}
          </h2>

          {post.type === "text" && post.body && (
            <p className="mt-1.5 line-clamp-3 text-sm text-zinc-600 dark:text-zinc-400">{post.body}</p>
          )}

          {post.type === "link" && post.linkUrl && (
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              <Link2 className="h-3.5 w-3.5" /> {post.linkDomain}
              <ExternalLink className="h-3 w-3" />
            </span>
          )}

          {post.type === "image" && post.imageCategory && (
            <div className="mt-2 max-h-[420px] overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <img
                src={CATEGORY_IMAGES[post.imageCategory]}
                alt=""
                loading="lazy"
                className="max-h-[420px] w-full object-cover"
              />
            </div>
          )}
        </Link>

        <div className="mt-2.5 flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center gap-1 sm:hidden">
            <VoteControl targetId={`post:${post.id}`} baseScore={post.score} orientation="horizontal" size="sm" />
          </div>
          <Link
            to={`/comments/${post.id}`}
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <MessageSquare className="h-4 w-4" /> {formatCount(post.commentCount)}
          </Link>
          <button
            onClick={share}
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <Share2 className="h-4 w-4" /> <span className="hidden sm:inline">Share</span>
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              toggleSave(post.id);
              pushToast(isSaved ? "Removed from saved" : "Saved post", "success");
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800",
              isSaved && "text-orange-600",
            )}
          >
            <Bookmark className="h-4 w-4" fill={isSaved ? "currentColor" : "none"} />
            <span className="hidden sm:inline">{isSaved ? "Saved" : "Save"}</span>
          </button>
        </div>
      </div>
    </motion.article>
  );
}
