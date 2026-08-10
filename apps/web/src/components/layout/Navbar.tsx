import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, LogOut, Menu, Moon, Plus, Sun, User as UserIcon, Bookmark } from "lucide-react";
import { SearchBar } from "../search/SearchBar";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { Dropdown, DropdownItem } from "../ui/Dropdown";
import { NotificationsPanel, useNotifications } from "../notifications/NotificationsPanel";
import { CreatePostModal } from "../feed/CreatePostModal";
import { useAppStore } from "../../store/store";
import { capBadgeCount } from "../../store/selectors";
import { useAuth } from "../../auth/AuthProvider";

export function Navbar({ onMenuClick }: { onMenuClick: () => void }) {
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const [createOpen, setCreateOpen] = useState(false);
  const notifications = useNotifications();
  const unreadCount = notifications.filter((n) => !n.read).length;
  const badgeLabel = capBadgeCount(unreadCount);
  const navigate = useNavigate();
  const auth = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-zinc-200 bg-white/95 px-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95 sm:gap-4 sm:px-4">
      <button
        onClick={onMenuClick}
        aria-label="Toggle sidebar menu"
        className="rounded-full p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <Link to="/" className="flex shrink-0 items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-lg shadow-sm">
          🔥
        </span>
        <span className="hidden text-lg font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 sm:block">
          embers
        </span>
      </Link>

      <div className="mx-auto w-full max-w-xl flex-1">
        <SearchBar />
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="hidden sm:inline-flex"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4" /> Create
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="sm:hidden"
          aria-label="Create post"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>

        <button
          onClick={toggleTheme}
          aria-label="Toggle dark mode"
          className="rounded-full p-2 text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </button>

        {auth.status === "authenticated" && (
          <Dropdown
            align="right"
            trigger={({ toggle }) => (
              <button onClick={toggle} aria-label="Notifications" className="relative rounded-full p-2 text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800">
                <Bell className="h-5 w-5" />
                {badgeLabel && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-600 px-1 text-[10px] font-bold text-white">
                    {badgeLabel}
                  </span>
                )}
              </button>
            )}
            panelClassName="w-80"
          >
            {(close) => <NotificationsPanel onNavigate={close} />}
          </Dropdown>
        )}

        {auth.status === "authenticated" && auth.user ? (
          <Dropdown
            align="right"
            trigger={({ toggle }) => (
              <button onClick={toggle} aria-label="Account menu" className="rounded-full">
                <Avatar seed={auth.user!.id} label={auth.user!.displayName} size="sm" />
              </button>
            )}
          >
            {(close) => (
              <>
                <div className="border-b border-zinc-100 px-3.5 py-2.5 dark:border-zinc-800">
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">u/{auth.user!.username}</p>
                  <p className="text-xs text-zinc-500">{auth.user!.karma.toLocaleString()} karma</p>
                </div>
                <DropdownItem
                  icon={<UserIcon className="h-4 w-4" />}
                  onClick={() => {
                    navigate(`/u/${auth.user!.username}`);
                    close();
                  }}
                >
                  My profile
                </DropdownItem>
                <DropdownItem
                  icon={<Bookmark className="h-4 w-4" />}
                  onClick={() => {
                    navigate(`/u/${auth.user!.username}?tab=saved`);
                    close();
                  }}
                >
                  Saved posts
                </DropdownItem>
                <DropdownItem
                  icon={<LogOut className="h-4 w-4" />}
                  onClick={() => {
                    void auth.logout();
                    close();
                  }}
                >
                  Log out
                </DropdownItem>
              </>
            )}
          </Dropdown>
        ) : (
          <div className="flex items-center gap-1.5">
            <Link
              to="/login"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="rounded-md bg-orange-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-orange-700"
            >
              Sign up
            </Link>
          </div>
        )}
      </div>

      <CreatePostModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </header>
  );
}
