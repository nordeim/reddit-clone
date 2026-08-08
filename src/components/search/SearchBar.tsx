import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Search, Users, X } from "lucide-react";
import { useDebounce, useOnClickOutside } from "../../hooks";
import { POSTS } from "../../data/posts";
import { COMMUNITIES } from "../../data/communities";
import { USERS } from "../../data/users";
import { Avatar } from "../ui/Avatar";
import { AnimatePresence, motion } from "framer-motion";

export function SearchBar({ className }: { className?: string }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const debounced = useDebounce(query, 200);
  const navigate = useNavigate();
  const ref = useOnClickOutside<HTMLDivElement>(() => setFocused(false), focused);

  const results = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    if (q.length < 1) return { posts: [], communities: [], users: [] };
    return {
      posts: POSTS.filter((p) => p.title.toLowerCase().includes(q)).slice(0, 4),
      communities: COMMUNITIES.filter(
        (c) => c.name.toLowerCase().includes(q) || c.title.toLowerCase().includes(q),
      ).slice(0, 3),
      users: USERS.filter((u) => u.username.toLowerCase().includes(q)).slice(0, 3),
    };
  }, [debounced]);

  const hasResults = results.posts.length + results.communities.length + results.users.length > 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    setFocused(false);
  }

  return (
    <div ref={ref} className={`relative w-full ${className ?? ""}`}>
      <form onSubmit={submit} className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder="Search Reddit"
          aria-label="Search"
          className="w-full rounded-full border border-transparent bg-zinc-100 py-2 pl-10 pr-9 text-sm text-zinc-800 outline-none transition-colors placeholder:text-zinc-400 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:bg-zinc-900 dark:focus:ring-orange-500/20"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
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
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
          >
            {!hasResults ? (
              <p className="px-4 py-6 text-center text-sm text-zinc-500">No matches for "{debounced}"</p>
            ) : (
              <div className="max-h-96 overflow-y-auto py-2">
                {results.communities.length > 0 && (
                  <SearchSection label="Communities">
                    {results.communities.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          navigate(`/r/${c.name}`);
                          setFocused(false);
                          setQuery("");
                        }}
                        className="flex w-full items-center gap-2.5 px-4 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        <Avatar seed={c.id} label={c.title} emoji={c.icon} size="sm" />
                        <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100">r/{c.name}</span>
                      </button>
                    ))}
                  </SearchSection>
                )}
                {results.users.length > 0 && (
                  <SearchSection label="People">
                    {results.users.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          navigate(`/u/${u.username}`);
                          setFocused(false);
                          setQuery("");
                        }}
                        className="flex w-full items-center gap-2.5 px-4 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        <Users className="h-4 w-4 text-zinc-400" />
                        <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100">u/{u.username}</span>
                      </button>
                    ))}
                  </SearchSection>
                )}
                {results.posts.length > 0 && (
                  <SearchSection label="Posts">
                    {results.posts.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          navigate(`/comments/${p.id}`);
                          setFocused(false);
                          setQuery("");
                        }}
                        className="flex w-full items-start gap-2.5 px-4 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                        <span className="line-clamp-2 text-sm font-medium text-zinc-800 dark:text-zinc-100">
                          {p.title}
                        </span>
                      </button>
                    ))}
                  </SearchSection>
                )}
                <button
                  onClick={submit}
                  className="mt-1 w-full border-t border-zinc-100 px-4 py-2.5 text-left text-sm font-semibold text-orange-600 hover:bg-orange-50 dark:border-zinc-800 dark:hover:bg-orange-500/10"
                >
                  See all results for "{query}"
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
