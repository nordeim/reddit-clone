import { useMemo, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { CommunityHeader } from "../components/community/CommunityHeader";
import { PostList } from "../components/feed/PostList";
import { SortTabs } from "../components/feed/SortTabs";
import { Card, RightPanelShell } from "../components/layout/RightPanel";
import { getCommunityByName } from "../data/communities";
import { POSTS, sortPosts } from "../data/posts";
import { useAppStore } from "../store/store";
import type { SortMode } from "../types";

export function CommunityPage() {
  const { name = "" } = useParams();
  const community = getCommunityByName(name);
  const [sort, setSort] = useState<SortMode>("hot");
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
