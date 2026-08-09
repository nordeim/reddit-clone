import { useMemo, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Search, Users, X } from "lucide-react";
import { useDebounce, useOnClickOutside } from "../../hooks";
import { POSTS } from "../../data/posts";
import { COMMUNITIES } from "../../data/communities";
import { USERS } from "../../data/users";
import { searchCommunities, searchPosts, searchUsers } from "../../utils/search";
import { Avatar } from "../ui/Avatar";
import { AnimatePresence, motion } from "framer-motion";
import type { Community, Post, User } from "../../types";

type FlatResult =
  | { kind: "community"; item: Community }
  | { kind: "user"; item: User }
  | { kind: "post"; item: Post };

export function SearchBar({ className }: { className?: string }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounced = useDebounce(query, 200);
  const navigate = useNavigate();
  const ref = useOnClickOutside<HTMLDivElement>(() => {
    setFocused(false);
    setActiveIndex(-1);
  }, focused);

  const results = useMemo(() => {
    const q = debounced.trim();
    if (q.length < 1) return { posts: [], communities: [], users: [] };
    return {
      posts: searchPosts(POSTS, q, 4),
      communities: searchCommunities(COMMUNITIES, q, 3),
      users: searchUsers(USERS, q, 3),
    };
  }, [debounced]);

  // Flat ordered list for keyboard navigation. Order matches the visual
  // order in the dropdown: communities → users → posts.
  const flat: FlatResult[] = useMemo(
    () => [
      ...results.communities.map((item) => ({ kind: "community" as const, item })),
      ...results.users.map((item) => ({ kind: "user" as const, item })),
      ...results.posts.map((item) => ({ kind: "post" as const, item })),
    ],
    [results],
  );

  const hasResults = flat.length > 0;

  function navigateTo(result: FlatResult) {
    // Race-fix (Plan §17.8): navigate using the *bound* result object,
    // never the raw `query` string. This avoids a stale debounce navigating
    // to the wrong target.
    if (result.kind === "community") navigate(`/r/${result.item.name}`);
    else if (result.kind === "user") navigate(`/u/${result.item.username}`);
    else navigate(`/comments/${result.item.id}`);
    setFocused(false);
    setQuery("");
    setActiveIndex(-1);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    // If an item is active, navigate to it; otherwise go to full results page.
    if (activeIndex >= 0 && activeIndex < flat.length) {
      navigateTo(flat[activeIndex]);
      return;
    }
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    setFocused(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!focused || !hasResults) {
      if (e.key === "Escape") {
        setFocused(false);
        setActiveIndex(-1);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % flat.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? flat.length - 1 : i - 1));
    } else if (e.key === "Escape") {
      e.preventDefault();
      setFocused(false);
      setActiveIndex(-1);
    } else if (e.key === "Enter" && activeIndex >= 0 && activeIndex < flat.length) {
      e.preventDefault();
      navigateTo(flat[activeIndex]);
    }
  }

  // Reset activeIndex when results change so it never points past the end.
  useMemo(() => {
    if (activeIndex >= flat.length) setActiveIndex(-1);
  }, [flat.length, activeIndex]);

  let runningIndex = -1;
  const indexOf = () => ++runningIndex;

  return (
    <div ref={ref} className={`relative w-full ${className ?? ""}`}>
      <form onSubmit={submit} className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search Reddit"
          aria-label="Search"
          role="combobox"
          aria-expanded={focused && hasResults}
          aria-controls="search-dropdown"
          aria-activedescendant={activeIndex >= 0 ? `search-result-${activeIndex}` : undefined}
          className="w-full rounded-full border border-transparent bg-zinc-100 py-2 pl-10 pr-9 text-sm text-zinc-800 outline-none transition-colors placeholder:text-zinc-400 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:bg-zinc-900 dark:focus:ring-orange-500/20"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setActiveIndex(-1);
            }}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </form>

      <AnimatePresence>
        {focused && query.trim().length > 0 && (
          <motion.div
            id="search-dropdown"
            role="listbox"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
          >
            {!hasResults ? (
              <p className="px-4 py-6 text-center text-sm text-zinc-500">No matches for &ldquo;{debounced}&rdquo;</p>
            ) : (
              <div className="max-h-96 overflow-y-auto py-2">
                {results.communities.length > 0 && (
                  <SearchSection label="Communities">
                    {results.communities.map((c) => {
                      const idx = indexOf();
                      const active = idx === activeIndex;
                      return (
                        <button
                          key={c.id}
                          id={`search-result-${idx}`}
                          role="option"
                          aria-selected={active}
                          onMouseEnter={() => setActiveIndex(idx)}
                          onClick={() => navigateTo({ kind: "community", item: c })}
                          className={`flex w-full items-center gap-2.5 px-4 py-2 text-left ${
                            active ? "bg-zinc-100 dark:bg-zinc-800" : ""
                          }`}
                        >
                          <Avatar seed={c.id} label={c.title} emoji={c.icon} size="sm" />
                          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100">r/{c.name}</span>
                        </button>
                      );
                    })}
                  </SearchSection>
                )}
                {results.users.length > 0 && (
                  <SearchSection label="People">
                    {results.users.map((u) => {
                      const idx = indexOf();
                      const active = idx === activeIndex;
                      return (
                        <button
                          key={u.id}
                          id={`search-result-${idx}`}
                          role="option"
                          aria-selected={active}
                          onMouseEnter={() => setActiveIndex(idx)}
                          onClick={() => navigateTo({ kind: "user", item: u })}
                          className={`flex w-full items-center gap-2.5 px-4 py-2 text-left ${
                            active ? "bg-zinc-100 dark:bg-zinc-800" : ""
                          }`}
                        >
                          <Users className="h-4 w-4 text-zinc-400" />
                          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100">u/{u.username}</span>
                        </button>
                      );
                    })}
                  </SearchSection>
                )}
                {results.posts.length > 0 && (
                  <SearchSection label="Posts">
                    {results.posts.map((p) => {
                      const idx = indexOf();
                      const active = idx === activeIndex;
                      return (
                        <button
                          key={p.id}
                          id={`search-result-${idx}`}
                          role="option"
                          aria-selected={active}
                          onMouseEnter={() => setActiveIndex(idx)}
                          onClick={() => navigateTo({ kind: "post", item: p })}
                          className={`flex w-full items-start gap-2.5 px-4 py-2 text-left ${
                            active ? "bg-zinc-100 dark:bg-zinc-800" : ""
                          }`}
                        >
                          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                          <span className="line-clamp-2 text-sm font-medium text-zinc-800 dark:text-zinc-100">
                            {p.title}
                          </span>
                        </button>
                      );
                    })}
                  </SearchSection>
                )}
                <button
                  onClick={submit}
                  className="mt-1 w-full border-t border-zinc-100 px-4 py-2.5 text-left text-sm font-semibold text-orange-600 hover:bg-orange-50 dark:border-zinc-800 dark:hover:bg-orange-500/10"
                >
                  See all results for &ldquo;{query}&rdquo;
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SearchSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <p className="px-4 pb-1 pt-1 text-[11px] font-bold uppercase tracking-wide text-zinc-400">{label}</p>
      {children}
    </div>
  );
}
