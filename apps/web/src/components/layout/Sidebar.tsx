import { NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Compass, Flame, Home, Sparkles, TrendingUp, X } from "lucide-react";
import { COMMUNITIES } from "../../data/communities";
import { useAppStore } from "../../store/store";
import { Avatar } from "../ui/Avatar";
import { cn } from "../../utils/cn";

const NAV_ITEMS = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/popular", label: "Popular", icon: Flame, end: false },
  { to: "/explore", label: "Explore", icon: Compass, end: false },
  { to: "/all", label: "All", icon: TrendingUp, end: false },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const joinedIds = useAppStore((s) => s.joinedCommunityIds);
  const joined = COMMUNITIES.filter((c) => joinedIds.includes(c.id));

  return (
    <div className="flex h-full flex-col gap-1 overflow-y-auto px-2 py-4">
      <nav className="space-y-0.5">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                isActive
                  ? "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400"
                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
              )
            }
          >
            <Icon className="h-[18px] w-[18px]" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="my-3 border-t border-zinc-200 dark:border-zinc-800" />

      <div className="px-3 pb-1">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-zinc-400">
          <Sparkles className="h-3.5 w-3.5" /> Your communities
        </p>
      </div>
      {joined.length === 0 ? (
        <p className="px-3 py-2 text-xs text-zinc-400">Join a community to see it here.</p>
      ) : (
        <div className="space-y-0.5">
          {joined.map((c) => (
            <NavLink
              key={c.id}
              to={`/r/${c.name}`}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400"
                    : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
                )
              }
            >
              <Avatar seed={c.id} label={c.title} emoji={c.icon} size="sm" />
              <span className="truncate">r/{c.name}</span>
            </NavLink>
          ))}
        </div>
      )}

      <div className="my-3 border-t border-zinc-200 dark:border-zinc-800" />

      <div className="px-3 pb-1">
        <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">All communities</p>
      </div>
      <div className="space-y-0.5 pb-4">
        {COMMUNITIES.map((c) => (
          <NavLink
            key={c.id}
            to={`/r/${c.name}`}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400"
                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
              )
            }
          >
            <Avatar seed={c.id} label={c.title} emoji={c.icon} size="sm" />
            <span className="truncate">r/{c.name}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-64 shrink-0 border-r border-zinc-200 dark:border-zinc-800 lg:block">
      <SidebarContent />
    </aside>
  );
}

export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl dark:bg-zinc-900 lg:hidden"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "tween", duration: 0.2 }}
          >
            <div className="flex h-14 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800">
              <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Menu</span>
              <button
                onClick={onClose}
                aria-label="Close menu"
                className="rounded-full p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarContent onNavigate={onClose} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
