import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { PostCard } from "./PostCard";
import { PostCardSkeleton } from "../ui/Skeleton";
import { useInfiniteScroll } from "../../hooks";
import type { Post } from "../../types";

const PAGE_SIZE = 8;

export function PostList({ posts, showCommunity = true }: { posts: Post[]; showCommunity?: boolean }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [posts]);

  const hasMore = visibleCount < posts.length;

  function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((c) => Math.min(c + PAGE_SIZE, posts.length));
      setLoadingMore(false);
    }, 650);
  }

  const sentinelRef = useInfiniteScroll(loadMore, hasMore);
  const visible = posts.slice(0, visibleCount);

  if (posts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-white py-16 text-center dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">No posts to show</p>
        <p className="mt-1 text-sm text-zinc-400">Try a different sort, or check back later.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <AnimatePresence initial={false}>
        {visible.map((post) => (
          <PostCard key={post.id} post={post} showCommunity={showCommunity} />
        ))}
      </AnimatePresence>

      {loadingMore && (
        <div className="flex flex-col gap-3">
          <PostCardSkeleton />
          <PostCardSkeleton />
        </div>
      )}

      {hasMore ? (
        <div ref={sentinelRef} className="h-4" />
      ) : (
        <p className="py-8 text-center text-sm text-zinc-400">You've reached the end of the feed 🎉</p>
      )}
    </div>
  );
}
