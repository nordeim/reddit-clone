import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { COMMUNITIES } from "../../data/communities";
import { Avatar } from "../ui/Avatar";
import { formatCount } from "../../utils/format";

export function RightPanelShell({ children }: { children: ReactNode }) {
  return (
    <aside className="sticky top-[4.5rem] hidden h-fit w-80 shrink-0 space-y-4 xl:block">{children}</aside>
  );
}

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      {title && (
        <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{title}</h3>
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

export function TrendingCommunitiesCard() {
  const trending = [...COMMUNITIES].sort((a, b) => b.memberCount - a.memberCount).slice(0, 6);
  return (
    <Card title="Trending communities">
      <ol className="space-y-3">
        {trending.map((c, i) => (
          <li key={c.id}>
            <Link to={`/r/${c.name}`} className="flex items-center gap-3 group">
              <span className="w-4 text-sm font-bold text-zinc-400">{i + 1}</span>
              <Avatar seed={c.id} label={c.title} emoji={c.icon} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-zinc-800 group-hover:underline dark:text-zinc-100">
                  r/{c.name}
                </span>
                <span className="block text-xs text-zinc-500">{formatCount(c.memberCount)} members</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  );
}

export function AboutFooterCard() {
  return (
    <Card>
      <p className="text-xs leading-relaxed text-zinc-500">
        This is a self-contained demo product built with React, Tailwind CSS, and generated sample data. All
        usernames, posts, and communities are fictional.
      </p>
      <p className="mt-3 text-xs text-zinc-400">embers demo &copy; {new Date().getFullYear()}</p>
    </Card>
  );
}
