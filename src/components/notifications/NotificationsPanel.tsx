import { Link } from "react-router-dom";
import { ArrowBigUp, AtSign, MessageSquare, Radio } from "lucide-react";
import { NOTIFICATIONS } from "../../data/notifications";
import { useAppStore } from "../../store/store";
import { timeAgo } from "../../utils/format";
import { cn } from "../../utils/cn";

const ICONS = {
  upvote: ArrowBigUp,
  reply: MessageSquare,
  mention: AtSign,
  community: Radio,
};

export function useNotifications() {
  const overrides = useAppStore((s) => s.notificationReadOverrides);
  return NOTIFICATIONS.map((n) => ({ ...n, read: overrides[n.id] ?? n.read }));
}

export function NotificationsPanel({ onNavigate }: { onNavigate?: () => void }) {
  const notifications = useNotifications();
  const markRead = useAppStore((s) => s.markNotificationRead);
  const markAllRead = useAppStore((s) => s.markAllNotificationsRead);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="flex max-h-[28rem] flex-col">
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
        <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Notifications</p>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead(notifications.map((n) => n.id))}
            className="text-xs font-semibold text-orange-600 hover:underline"
          >
            Mark all as read
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-zinc-500">You're all caught up.</p>
        ) : (
          notifications.map((n) => {
            const Icon = ICONS[n.type];
            return (
              <Link
                key={n.id}
                to={n.postId ? `/comments/${n.postId}` : "#"}
                onClick={() => {
                  markRead(n.id);
                  onNavigate?.();
                }}
                className={cn(
                  "flex gap-3 border-b border-zinc-50 px-4 py-3 transition-colors hover:bg-zinc-50 dark:border-zinc-800/60 dark:hover:bg-zinc-800/60",
                  !n.read && "bg-orange-50/60 dark:bg-orange-500/5",
                )}
              >
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
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
