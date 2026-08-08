import { NotificationsPanel } from "../components/notifications/NotificationsPanel";

export function NotificationsPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-lg font-extrabold text-zinc-900 dark:text-zinc-50">Notifications</h1>
      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <NotificationsPanel />
      </div>
    </div>
  );
}
