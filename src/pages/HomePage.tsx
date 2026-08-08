import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { PostList } from "../components/feed/PostList";
import { SortTabs } from "../components/feed/SortTabs";
import { RightPanelShell, TrendingCommunitiesCard, AboutFooterCard, Card } from "../components/layout/RightPanel";
import { POSTS, sortPosts } from "../data/posts";
import { useAppStore } from "../store/store";
import type { SortMode } from "../types";

export function HomePage() {
  const [sort, setSort] = useState<SortMode>("best");
  const localPosts = useAppStore((s) => s.localPosts);
  const joinedIds = useAppStore((s) => s.joinedCommunityIds);
  const location = useLocation();

  const scope = location.pathname === "/all" ? "all" : location.pathname === "/popular" ? "popular" : "home";

  const combined = useMemo(() => [...localPosts, ...POSTS], [localPosts]);

  const scoped = useMemo(() => {
    if (scope === "home" && joinedIds.length > 0) {
      return combined.filter((p) => joinedIds.includes(p.communityId));
    }
    return combined;
  }, [combined, scope, joinedIds]);

  const sorted = useMemo(() => sortPosts(scoped, sort), [scoped, sort]);

  const heading = scope === "all" ? "All" : scope === "popular" ? "Popular" : "Home";

  return (
    <div className="mx-auto flex max-w-6xl gap-6">
      <div className="min-w-0 flex-1 space-y-4">
        <div>
          <h1 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-50">{heading}</h1>
          {scope === "home" && joinedIds.length === 0 && (
            <p className="mt-1 text-sm text-zinc-500">
              Showing posts from everywhere. Join communities from the sidebar to personalize your feed.
            </p>
          )}
        </div>
        <SortTabs value={sort} onChange={setSort} />
        <PostList posts={sorted} />
      </div>
      <RightPanelShell>
        <Card title="Home">
          <p className="text-sm text-zinc-500">
            Your personal front page. Built for you based on the communities you join.
          </p>
        </Card>
        <TrendingCommunitiesCard />
        <AboutFooterCard />
      </RightPanelShell>
    </div>
  );
}
