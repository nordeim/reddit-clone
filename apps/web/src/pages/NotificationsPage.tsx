import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowBigUp, AtSign, Bell, MessageSquare, Radio } from "lucide-react";
import { NOTIFICATIONS } from "../data/notifications";
import { getPost } from "../data/posts";
import { useAppStore } from "../store/store";
import { getUnreadNotificationCount } from "../store/selectors";
import { timeAgo } from "../utils/format";
import { cn } from "../utils/cn";

const ICONS = {
  upvote: ArrowBigUp,
  reply: MessageSquare,
  mention: AtSign,
  community: Radio,
};

type Filter = "all" | "unread";
const VALID_FILTERS: Filter[] = ["all", "unread"];

export function NotificationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawFilter = (searchParams.get("filter") ?? "all") as Filter;
  const filter: Filter = VALID_FILTERS.includes(rawFilter) ? rawFilter : "all";
  const setFilter = (next: Filter) => {
    const params = new URLSearchParams(searchParams);
    if (next === "all") params.delete("filter");
    else params.set("filter", next);
    setSearchParams(params, { replace: true });
  };

  const overrides = useAppStore((s) => s.notificationReadOverrides);
  const markRead = useAppStore((s) => s.markNotificationRead);
  const markAllRead = useAppStore((s) => s.markAllNotificationsRead);

  const all = useMemo(
    () => NOTIFICATIONS.map((n) => ({ ...n, read: overrides[n.id] ?? n.read })),
    [overrides],
  );
  const unreadCount = getUnreadNotificationCount(all, {});
  const visible = filter === "unread" ? all.filter((n) => !n.read) : all;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-extrabold text-zinc-900 dark:text-zinc-50">Notifications</h1>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => markAllRead(all.map((n) => n.id))}
            className="text-xs font-semibold text-orange-600 hover:underline"
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="mb-3 flex gap-1 rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
        {(["all", "unread"] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold capitalize transition-colors",
              filter === f
                ? "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400"
                : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800",
            )}
          >
            {f} {f === "unread" && unreadCount > 0 ? `(${unreadCount})` : ""}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <Bell className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
            <p className="text-sm text-zinc-500">
              {filter === "unread" ? "You're all caught up." : "No notifications yet."}
            </p>
          </div>
        ) : (
          visible.map((n) => {
            const Icon = ICONS[n.type];
            // Target safety (Plan §17.9): if the linked post doesn't exist
            // (e.g. it was a local post that got cleared), render a fallback
            // item instead of a dead link.
            const targetExists = !n.postId || getPost(n.postId) !== undefined;
            const content = (
              <>
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-orange-600 dark:bg-zinc-800">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold leading-snug text-zinc-800 dark:text-zinc-100">
                    {n.message}
                  </span>
                  <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">{n.detail}</span>
                  <span className="mt-0.5 block text-[11px] text-zinc-400">{timeAgo(n.createdAt)}</span>
                </span>
                {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-orange-500" />}
              </>
            );
            return (
              <div
                key={n.id}
                className={cn(
                  "flex items-center gap-3 border-b border-zinc-50 px-4 py-3 transition-colors dark:border-zinc-800/60",
                  !n.read && "bg-orange-50/60 dark:bg-orange-500/5",
                )}
              >
                {targetExists && n.postId ? (
                  <Link
                    to={`/comments/${n.postId}`}
                    onClick={() => markRead(n.id)}
                    className="flex min-w-0 flex-1 items-center gap-3"
                  >
                    {content}
                  </Link>
                ) : (
                  <div className="flex min-w-0 flex-1 items-center gap-3 opacity-60">{content}</div>
                )}
                {!n.read && (
                  <button
                    type="button"
                    onClick={() => markRead(n.id)}
                    className="shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-500/10"
                    aria-label="Mark as read"
                  >
                    Mark read
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
