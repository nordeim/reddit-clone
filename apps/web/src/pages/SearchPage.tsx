import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Users } from "lucide-react";
import { POSTS } from "../data/posts";
import { COMMUNITIES } from "../data/communities";
import { USERS } from "../data/users";
import { searchCommunities, searchPosts, searchUsers } from "../utils/search";
import { PostList } from "../components/feed/PostList";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { formatCount } from "../utils/format";
import { cn } from "../utils/cn";
import { useAppStore } from "../store/store";

type Tab = "posts" | "communities" | "users";

const VALID_TABS: Tab[] = ["posts", "communities", "users"];

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawQuery = (searchParams.get("q") ?? "").trim();
  const rawTab = (searchParams.get("tab") ?? "posts") as Tab;
  // Invalid tab falls back to "posts" (Plan §12.9 requirement).
  const tab: Tab = VALID_TABS.includes(rawTab) ? rawTab : "posts";
  const setTab = (next: Tab) => {
    const params = new URLSearchParams(searchParams);
    if (next === "posts") params.delete("tab");
    else params.set("tab", next);
    setSearchParams(params, { replace: true });
  };
  const localPosts = useAppStore((s) => s.localPosts);
  const joinedIds = useAppStore((s) => s.joinedCommunityIds);
  const toggleJoin = useAppStore((s) => s.toggleJoin);

  const posts = useMemo(
    () => (rawQuery ? searchPosts([...localPosts, ...POSTS], rawQuery) : []),
    [rawQuery, localPosts],
  );
  const communities = useMemo(
    () => (rawQuery ? searchCommunities(COMMUNITIES, rawQuery) : []),
    [rawQuery],
  );
  const users = useMemo(() => (rawQuery ? searchUsers(USERS, rawQuery) : []), [rawQuery]);

  if (!rawQuery) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center text-sm text-zinc-400">
        Type something in the search bar above to get started.
      </div>
    );
  }

  const query = rawQuery.toLowerCase(); // for display only

  const counts: Record<Tab, number> = { posts: posts.length, communities: communities.length, users: users.length };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
        Results for <span className="text-orange-600">"{query}"</span>
      </h1>

      <div className="flex gap-1 rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
        {(["posts", "communities", "users"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold capitalize transition-colors",
              tab === t
                ? "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400"
                : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800",
            )}
          >
            {t} ({counts[t]})
          </button>
        ))}
      </div>

      {tab === "posts" && <PostList posts={posts} />}

      {tab === "communities" && (
        <div className="space-y-2">
          {communities.length === 0 && <EmptyResult label="communities" />}
          {communities.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <Avatar seed={c.id} label={c.title} emoji={c.icon} size="lg" />
              <div className="min-w-0 flex-1">
                <Link to={`/r/${c.name}`} className="font-bold text-zinc-800 hover:underline dark:text-zinc-100">
                  r/{c.name}
                </Link>
                <p className="line-clamp-1 text-xs text-zinc-500">{c.description}</p>
                <p className="text-xs text-zinc-400">{formatCount(c.memberCount)} members</p>
              </div>
              <Button
                size="sm"
                variant={joinedIds.includes(c.id) ? "outline" : "primary"}
                onClick={() => toggleJoin(c.id)}
              >
                {joinedIds.includes(c.id) ? "Joined" : "Join"}
              </Button>
            </div>
          ))}
        </div>
      )}

      {tab === "users" && (
        <div className="space-y-2">
          {users.length === 0 && <EmptyResult label="users" />}
          {users.map((u) => (
            <Link
              key={u.id}
              to={`/u/${u.username}`}
              className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/60"
            >
              <Avatar seed={u.id} label={u.displayName} size="lg" />
              <div>
                <p className="font-bold text-zinc-800 dark:text-zinc-100">u/{u.username}</p>
                <p className="flex items-center gap-1 text-xs text-zinc-500">
                  <Users className="h-3 w-3" /> {u.karma.toLocaleString()} karma
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyResult({ label }: { label: string }) {
  return (
    <p className="rounded-xl border border-dashed border-zinc-300 bg-white py-12 text-center text-sm text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900">
      No {label} found.
    </p>
  );
}
