import { useMemo } from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { CommunityHeader } from "../components/community/CommunityHeader";
import { PostList } from "../components/feed/PostList";
import { SortTabs } from "../components/feed/SortTabs";
import { Card, RightPanelShell } from "../components/layout/RightPanel";
import { getCommunityByName } from "../data/communities";
import { POSTS, sortPosts } from "../data/posts";
import { useAppStore } from "../store/store";
import type { SortMode } from "../types";

const VALID_SORTS: SortMode[] = ["best", "hot", "new", "top", "rising"];

export function CommunityPage() {
  const { name = "" } = useParams();
  const community = getCommunityByName(name);
  const [searchParams, setSearchParams] = useSearchParams();
  const rawSort = (searchParams.get("sort") ?? "hot") as SortMode;
  const sort: SortMode = VALID_SORTS.includes(rawSort) ? rawSort : "hot";
  const setSort = (next: SortMode) => {
    const params = new URLSearchParams(searchParams);
    if (next === "hot") params.delete("sort");
    else params.set("sort", next);
    setSearchParams(params, { replace: true });
  };

  const localPosts = useAppStore((s) => s.localPosts);

  const posts = useMemo(() => {
    if (!community) return [];
    const all = [...localPosts, ...POSTS].filter((p) => p.communityId === community.id);
    return sortPosts(all, sort);
  }, [community, localPosts, sort]);

  if (!community) return <Navigate to="/" replace />;

  return (
    <div className="mx-auto flex max-w-6xl gap-6">
      <div className="min-w-0 flex-1 space-y-4">
        <CommunityHeader community={community} />
        <SortTabs value={sort} onChange={setSort} />
        <PostList posts={posts} showCommunity={false} />
      </div>
      <RightPanelShell>
        <Card title={`About r/${community.name}`}>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{community.description}</p>
        </Card>
        <Card title="Community rules">
          <ol className="space-y-2.5">
            {community.rules.map((rule, i) => (
              <li key={rule} className="flex gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                <span className="font-bold text-zinc-400">{i + 1}.</span>
                {rule}
              </li>
            ))}
          </ol>
        </Card>
      </RightPanelShell>
    </div>
  );
}
