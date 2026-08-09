import { Users, Circle } from "lucide-react";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { useAppStore } from "../../store/store";
import { formatCount, formatFullDate } from "../../utils/format";
import type { Community } from "../../types";

export function CommunityHeader({ community }: { community: Community }) {
  const joined = useAppStore((s) => s.joinedCommunityIds.includes(community.id));
  const toggleJoin = useAppStore((s) => s.toggleJoin);
  const pushToast = useAppStore((s) => s.pushToast);

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div
        className="h-20 sm:h-28"
        style={{ backgroundImage: `linear-gradient(120deg, ${community.colorFrom}, ${community.colorTo})` }}
      />
      <div className="px-4 pb-4 sm:px-6">
        <div className="-mt-8 flex flex-wrap items-end justify-between gap-3 sm:-mt-10">
          <div className="flex items-end gap-3">
            <Avatar
              seed={community.id}
              label={community.title}
              emoji={community.icon}
              size="xl"
              className="ring-4 ring-white dark:ring-zinc-900"
            />
            <div className="pb-1">
              <h1 className="text-lg font-extrabold text-zinc-900 dark:text-zinc-50 sm:text-xl">r/{community.name}</h1>
              <p className="flex items-center gap-1 text-xs text-zinc-500">
                <Users className="h-3.5 w-3.5" /> {formatCount(community.memberCount)} members
                <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                {formatCount(community.onlineCount)} online
              </p>
            </div>
          </div>
          <Button
            variant={joined ? "outline" : "primary"}
            onClick={() => {
              toggleJoin(community.id);
              pushToast(joined ? `Left r/${community.name}` : `Joined r/${community.name}`, "success");
            }}
          >
            {joined ? "Joined" : "Join"}
          </Button>
        </div>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{community.description}</p>
        <p className="mt-2 text-xs text-zinc-400">Created {formatFullDate(community.createdAt)}</p>
      </div>
    </div>
  );
}
