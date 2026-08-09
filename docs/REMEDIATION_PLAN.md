# Remediation Plan — embers (Reddit Clone)

**Status:** VALIDATED AGAINST CODEBASE
**Author:** Coding agent (Mode A — Generation, with Mode C audit input)
**Companion documents:** `docs/IMPLEMENTATION_PLAN.md` (the enhancement plan being remediated), `AGENTS.md`, `CLAUDE.md`, `docs/Project-Architecture-Document.md`
**Last Updated:** 2026-08-09

---

## 1. Purpose and Scope

`docs/IMPLEMENTATION_PLAN.md` (3,464 lines) describes a refined, implementation-ready
architecture for a Reddit-style SPA. Because it was written generically ("If an
existing codebase is present, existing project conventions take precedence over
this plan" — §1, §21), it must be **reconciled** against the actual `embers`
codebase before any code changes are made.

This document records:

1. The audit of `IMPLEMENTATION_PLAN.md` against the actual codebase (§3).
2. The decision: which plan items are **adopted as-is**, which are **adapted**
   to existing conventions, and which are **rejected** because they would
   break the project's locked architecture.
3. A concrete, ordered, TDD-driven ToDo list (§5).
4. Re-validation against the codebase (§6) — performed before execution.

---

## 2. Audit Methodology

Every numbered claim in `IMPLEMENTATION_PLAN.md` was checked against the actual
source under `src/`. Findings are classified using the audit severity taxonomy
from the repo's coding-agent skill (Mode C — Audit):

- **OK** — Plan claim matches the codebase.
- **GAP** — Codebase is missing what the plan asks for; additive enhancement
  is feasible without breaking conventions.
- **CONFLICT** — Plan claim contradicts a locked codebase convention;
  plan must be adapted or rejected.
- **N/A** — Plan item does not apply to this project (e.g., greenfield
  scaffolding instructions).

The audit focused on the plan's *binding* sections (§5 architecture, §6 domain
model, §7 data, §8 state, §9 routing, §10 layout, §11 design, §12 features,
§13 accessibility, §14 performance, §15 security, §16 testing, §17 pre-mortem).
Sections §18–§20 (ToDo phases and commit grouping) are planning meta-structure
and are re-issued below as the remediation ToDo list (§5).

---

## 3. Audit Findings — IMPLEMENTATION_PLAN.md vs. Actual Codebase

### 3.1 Architecture (Plan §5) — mostly CONFLICT, partially adaptable

| Plan claim | Codebase reality | Verdict |
|---|---|---|
| Feature-sliced `src/{app,core,state,data,ui,features,pages,styles}/` (§5.2) | Existing flat layout: `src/{components,data,hooks,pages,store,types,utils}/` | **CONFLICT / REJECT** — Locked by AGENTS.md §"File Organization" and PAD §3.2. Rewriting the tree reshuffles every relative import and orphans the persisted `reddit-clone-state` keys indirectly. **Keep flat layout.** |
| `core` may not import from `features/pages/state/data` (§5.2 structural rules) | Existing `utils/` already follows this implicitly (no imports from `components/`) | **OK / CODIFY** — Document the existing implicit rule in `AGENTS.md` rather than restructure. |
| Lazy pages + Suspense + ErrorBoundary (§5.2, §9.4) | All pages are eagerly imported in `App.tsx`. `vite-plugin-singlefile` is locked (AGENTS.md §"Build & toolchain quirks"). | **CONFLICT / REJECT** — Single-file build prohibits code splitting. Error boundary, however, is additive and safe (see §5 ToDo). |

### 3.2 Domain Model (Plan §6) — partial GAP

| Plan claim | Codebase reality | Verdict |
|---|---|---|
| `User` has `avatarHue`, `cakeDay`, `isAdmin` (§6.1) | Existing `User` has `colorFrom`/`colorTo`/`createdAt` (used as cake day) | **CONFLICT / REJECT** — Avatar gradient is locked (AGENTS.md §"UI conventions"). `cakeDay` is already `createdAt`. `isAdmin` is unused. |
| `Community` has `iconHue`, `bannerHue`, `members` (§6.1) | Existing uses `colorFrom`/`colorTo`/`memberCount` | **CONFLICT / REJECT** — Banner gradient is locked. Renaming fields orphans persisted vote/save keys (which use `c1…c18` indirectly via `communityId`). |
| `Post` has `baseScore`, `upvoteRatio`, `commentCount` (§6.1) | Existing uses `score` (treated as base) and `commentCount` | **ADAPT** — Keep `score` as the immutable base. `upvoteRatio` is unused; do not add. |
| `CommentTreeNode` (§6.2) | Existing `Comment.children: Comment[]` already forms a tree | **OK** — Existing shape is equivalent and simpler. |
| `Notification` has `kind`, `actorId`, `targetType`, `targetId`, `excerpt` (§6.1) | Existing `AppNotification` has `type`, `actorId`, `postId`, `message`, `detail`, `read` | **ADAPT** — Existing shape is functionally equivalent. The plan's `targetType` field would let notifications point to communities/users, but the current `postId`-only routing is sufficient for the demo and not worth a breaking change. |
| `Toast` has `id`, `title`, `description`, `variant` (§6.3) | Existing `ToastMessage` has `id`, `text`, `tone` | **ADAPT** — Existing shape is sufficient. The `tone` covers `variant`. No change needed. |

### 3.3 Data Architecture (Plan §7) — partial GAP

| Plan claim | Codebase reality | Verdict |
|---|---|---|
| Seeded RNG `hashString → mulberry32` (§7.2) | Existing `src/utils/random.ts` implements exactly this | **OK** |
| Stable seed namespaces `users`, `communities`, `posts`, `comments:${postId}`, `notifications` (§7.2) | Existing uses `users-seed-v1`, `community-${name}`, `posts-seed-v2`, `comments-${postId}`, `notifications-seed-v1` | **OK** — Equivalent, just versioned. |
| Runtime `now` anchor + `formatTimeAgo(iso, now?)` (§7.2) | Existing `timeAgo(iso)` uses `Date.now()` directly | **GAP** — Easy additive fix: accept optional `now` parameter. Enables deterministic tests. |
| Entity volumes 48 users / 18 communities / 320 posts / 18–24 notifications / 4–42 comments per post (§7.3) | Existing: 48/18/320/18/3–7 | **OK** — Volumes match. |
| `CURRENT_USER_ID = "u_001"` (§7.4) | Existing `CURRENT_USER.id = "u-me"` | **CONFLICT / REJECT** — Renaming orphans every persisted `localPosts`/`localComments`/`savedPostIds` entry. Keep `"u-me"`. |
| `LocalPost extends Post { isLocal: true }` (§6.1) | Existing `Post.isLocal?: boolean` | **ADAPT** — Existing optional flag is sufficient. |
| Comment count consistency: post seed must include deterministic `commentCount`, generator must produce exactly that count (§7.7) | Existing `posts.ts:157` computes `commentCount` from a formula but `comments.ts:49` generates an unrelated 3–7 root comments | **GAP / HIGH** — Real bug. `post.commentCount` is often 30–60 but the displayed tree has 3–7 root comments + replies. Plan identifies this correctly. **Adopt**: derive displayed count from the actual tree (already done in `PostPage` via `countAll`) — but the **card-level** count (`PostCard.tsx:104`) shows the raw `post.commentCount`, which is wrong. Fix. |
| Search: normalize, tokenize, rank (§7.10) | Existing `SearchBar`/`SearchPage` do `.toLowerCase().includes()` only | **GAP / MEDIUM** — Additive: introduce `src/utils/search.ts` with `normalizeQuery`, `matchScore`, and use it in both call sites. |
| Local comment merging: "appended or sorted to appear near the top within their parent" (§7.8) | Existing `CommentThread` does this via `localChildren` prepended in component state and `addLocalComment` prepended in store | **OK** — Already implemented. |
| Local comments count toward displayed comment total (§7.8) | Existing `PostPage.tsx:48` does `comments.reduce(...)` over merged tree | **OK** |

### 3.4 State Architecture (Plan §8) — mostly CONFLICT, key GAP

| Plan claim | Codebase reality | Verdict |
|---|---|---|
| Two stores: persisted domain store + ephemeral UI store (§8.1) | Existing single `useAppStore` with `partialize` excluding `toasts` | **CONFLICT / REJECT** — Splitting stores is a major refactor that orphans persisted data and breaks every `useAppStore` call site (~25 files). The existing `partialize` whitelist achieves the same persistence boundary. **Document the boundary explicitly instead.** |
| `schemaVersion` field on persisted state (§8.1, §8.4) | Existing has none | **GAP / HIGH** — Real risk per AGENTS.md §"Persistence caveats" and PAD §10. Adopt: add `schemaVersion: number` to persisted state, add `version` + `migrate` to the `persist` middleware so future shape changes can be migrated. |
| `postVotes` / `commentVotes` as separate records (§8.1) | Existing `votes: Record<string, VoteValue>` with namespaced keys `post:`/`comment:` | **CONFLICT / REJECT** — Namespacing already prevents collisions (AGENTS.md §"State — one store, overlay pattern"). Splitting would orphan every existing vote. |
| `readNotificationIds: ID[]` (§8.1) | Existing `notificationReadOverrides: Record<string, boolean>` | **ADAPT** — Existing override map is more flexible (can also mark unread). Document equivalence. |
| `commentDrafts: Record<ID, string>` in ephemeral store (§8.1) | Existing `CommentComposer` keeps draft in component-local `useState` | **GAP / LOW** — Plan §17.3 mentions preserving drafts across collapse. Adopt as a small additive enhancement: store reply drafts in component state (already done) — leave as-is unless collapse-loses-draft bug is observed. |
| Storage key `reddit-clone-store-v1` (§8.4) | Existing `reddit-clone-state` | **CONFLICT / REJECT** — Renaming orphans all persisted data. Keep `reddit-clone-state`. Bump `schemaVersion` instead for forward migrations. |
| Persistence validation: parse safely, validate schema version, fall back to defaults, never throw (§8.5) | Existing `persist` middleware with no `migrate`/`merge` customization | **GAP / HIGH** — Corrupt localStorage currently hydrates whatever zustand's default `mergeJSON` produces, which can crash the app. Adopt: provide a custom `merge` function that validates shape and falls back. |
| `setMobileNavOpen`, `openCreatePost`, `closeCreatePost` actions in ephemeral store (§8.3) | Existing `Navbar` keeps `createOpen` in `useState`; `AppShell` keeps `mobileOpen` in `useState` | **OK** — Component-local state is appropriate for these. No need to globalize. |
| Derived selectors as pure functions (§8.6) | Existing `posts.ts` exports `sortPosts`, `getPost`; `users.ts` exports `getUser`; etc. | **GAP / MEDIUM** — Adopt: extract `getVisibleScore`, `isPostSaved`, `isCommunityJoined`, `getUnreadNotificationCount`, `getDerivedCommentCount` into `src/store/selectors.ts` as pure functions for testability. |

### 3.5 Routing (Plan §9) — partial GAP

| Plan claim | Codebase reality | Verdict |
|---|---|---|
| Routes table including `/r/:communityName/comments/:postId` (§9.1) | Existing uses `/comments/:postId` only (post is globally addressable, no community scope) | **CONFLICT / REJECT** — Existing flat route is simpler and matches the existing `getPost(id)` global lookup. Community-scoped URLs would break every existing `Link to={`/comments/${id}`}` call site. Keep `/comments/:postId`. |
| Route constants centralized (§9.2) | Existing routes are inline string literals throughout the codebase | **GAP / LOW** — Additive: introduce `src/utils/routes.ts` with `ROUTE` constants. Optional; not blocking. |
| Query params: `?sort=`, `?feed=`, `?q=`, `?tab=`, `?filter=` (§9.3) | Existing: SearchPage reads `q`, ProfilePage reads `tab`. Sort and feed are component-local `useState`. | **GAP / MEDIUM** — Adopt: sync sort with URL `?sort=` so deep links preserve ordering. Notifications `?filter=all|unread` is also additive. |
| Route-level code splitting + Suspense (§9.4) | Existing eager imports; single-file build | **CONFLICT / REJECT** — Same as §3.1. |
| Error boundary around router outlet (§9.4) | None present | **GAP / MEDIUM** — Adopt: add a class-based `ErrorBoundary` component wrapping `<Outlet/>` in `AppShell`. |

### 3.6 Layout (Plan §10) — mostly OK

| Plan claim | Codebase reality | Verdict |
|---|---|---|
| Desktop 260px sidebar + 1fr main + 320px right panel (§10.1) | Existing `AppShell` uses `max-w-[1400px]` + 16rem sidebar + flexible main; `RightPanelShell` is 320px and `xl:block` | **OK** — Close enough. |
| `lg:grid-cols-[260px_minmax(0,1fr)]` (§10.1) | Existing uses flex, not grid | **N/A** — Cosmetic; existing flex layout works. |
| Mobile: navbar visible, hamburger drawer, sidebar hidden, no horizontal overflow (§10.2) | Existing `MobileSidebar` does this | **OK** |
| Right panel: Home trending / Community about / Post about (§10.3) | Existing matches | **OK** |

### 3.7 Design System (Plan §11) — partial GAP

| Plan claim | Codebase reality | Verdict |
|---|---|---|
| Semantic theme tokens `--surface`, `--border`, `--accent`, etc. (§11.2) | Existing uses Tailwind built-in `zinc`/`orange`/`indigo` directly throughout | **CONFLICT / REJECT** — Refactoring every color usage to semantic tokens is a massive, low-value change that risks regressing the locked visual design (PAD §5.2 "uses Tailwind's built-in color scales" is documented as deliberate). Keep direct tokens. |
| `@custom-variant dark` (§11.3) | Existing `index.css:4` | **OK** |
| Blocking theme bootstrap before first paint (§11.3, §17.10) | Existing: theme is applied via `useEffect` in `App.tsx:16-18`, AFTER first render → causes a flash of light theme on reload when dark is persisted | **GAP / HIGH** — Real bug. Adopt: add a synchronous bootstrap script in `index.html` that reads `localStorage.getItem("reddit-clone-state")`, parses `state.theme`, and applies `.dark` class before React mounts. |
| Reduced motion support (§11.6) | Existing `index.css` has no `@media (prefers-reduced-motion: reduce)` rule. `framer-motion` is not wrapped in `MotionConfig reducedMotion="user"`. | **GAP / MEDIUM** — Adopt: add reduced-motion CSS + `<MotionConfig reducedMotion="user">` wrapper in `App.tsx`. |

### 3.8 Feature Design (Plan §12) — several GAPs

| Plan claim | Codebase reality | Verdict |
|---|---|---|
| Sort modes synced to URL `?sort=` (§12.1) | Existing `HomePage`/`CommunityPage` use `useState` | **GAP / MEDIUM** — Adopt. |
| Pagination PAGE_SIZE = 12 (§12.1) | Existing `PostList` uses `PAGE_SIZE = 8` | **CONFLICT / REJECT** — AGENTS.md §"UI conventions" documents 8 as locked. Keep 8. |
| Simulated latency: 350–650ms feed, 400–600ms comments, 250–450ms search (§12.1) | Existing: 650ms feed (`PostList:26`), 500ms comments (`PostPage:39`), 200ms search debounce | **OK** — Within or close to plan ranges. |
| Post card click navigation, inner actions don't propagate (§12.2) | Existing `PostCard` wraps title/body/image in `<Link>`; inner buttons call `e.preventDefault()` | **OK** |
| Voting: `aria-pressed`, distinct colors, score animation, no nav propagation (§12.3) | Existing `VoteControl` has `aria-pressed`, color classes, `motion.span` score animation | **OK** |
| Create post validation: title 1–300, body ≤10k, URL must be http(s) (§12.4) | Existing `CreatePostModal` only checks `title.trim().length > 3`; link URL has no protocol validation | **GAP / HIGH** — Real correctness gap. Adopt: stricter validation + `new URL()` parsing + protocol check. |
| Post detail not-found state (§12.5) | Existing `PostPage` does `<Navigate to="/" replace />` on missing post | **GAP / MEDIUM** — Adopt: render a "Post not found" empty state instead of silently redirecting. |
| Comment composer: Ctrl/Cmd+Enter submit, character limit, draft persistence (§12.6) | Existing `CommentComposer` has none of these | **GAP / MEDIUM** — Adopt: add keyboard shortcut and char counter. |
| Max comment depth = 5 (§12.6) | Existing `comments.ts:48` caps depth at 4 (root depth 0 + 4 children levels) | **CONFLICT / REJECT** — AGENTS.md §"Data layer — deterministic generation" documents max depth 4 as locked. Keep 4. |
| Disable reply at max depth (§12.6) | Existing `CommentThread` allows reply at any depth | **GAP / LOW** — Adopt: when `depth >= 4`, hide Reply button or show "Continue thread" hint. |
| Profile tabs (Posts/Comments/Saved) (§12.8) | Existing `ProfilePage` matches | **OK** |
| Saved tab only for current user (§12.8) | Existing `ProfilePage:91` does this via `isSelf` check | **OK** |
| Search: debounce 200–250ms, grouped dropdown, keyboard nav, Escape, outside click, close on nav (§12.9) | Existing `SearchBar` has debounce 200ms, grouped dropdown, outside click, close on nav. **Missing**: keyboard ArrowUp/ArrowDown navigation and Escape handler. | **GAP / MEDIUM** — Adopt: add arrow-key navigation and Escape close. |
| Search results page: tabs (Communities/Posts/Users), preserve query, invalid tab fallback (§12.9) | Existing `SearchPage` matches except no URL `?tab=` sync | **GAP / MEDIUM** — Adopt: sync tab to URL. |
| Notifications bell badge capped at `9+` (§12.10) | Existing `Navbar:81-83` shows raw count | **GAP / LOW** — Adopt: cap display. |
| Notifications page: All/Unread tabs, individual mark-read, mark all read, empty states, safe target resolution (§12.10) | Existing `NotificationsPage` just renders `NotificationsPanel`; no tabs, no individual mark-read on page | **GAP / MEDIUM** — Adopt: add All/Unread filter tabs and per-item mark-read button on the page. |
| Notification target resolution safety (§7.9, §17.9) | Existing `NotificationsPanel:48` does `n.postId ? \`/comments/${n.postId}\` : "#"` — if post is deleted/local-removed, link 404s | **GAP / MEDIUM** — Adopt: validate `getPost(id)` exists before linking; render fallback item if not. |

### 3.9 Accessibility (Plan §13) — multiple GAPs

| Plan claim | Codebase reality | Verdict |
|---|---|---|
| Skip link to main content (§13.1, §13.2) | None present | **GAP / HIGH** — Adopt: add `<a href="#main" className="sr-only focus:not-sr-only…">Skip to content</a>` and `id="main"` on `<main>`. |
| Visible focus states (§13.1) | Existing `Button` has `focus-visible:ring-2`; raw `<button>` elements vary | **GAP / MEDIUM** — Adopt: global `:focus-visible` outline in `index.css`. |
| Modal: `role="dialog"`, `aria-modal`, focus trap, Escape close, scroll lock, overlay click close, focus return (§13.4) | Existing `Modal` has `role="dialog"`, `aria-modal`, overlay click close. **Missing**: focus trap, Escape close, scroll lock, focus return. | **GAP / HIGH** — Adopt. |
| Dropdown: `aria-expanded`, `aria-haspopup`, Escape, arrow keys (§13.3) | Existing `Dropdown` trigger is just a button with `onClick`; no `aria-expanded`/`aria-haspopup`, no Escape, no arrow keys | **GAP / MEDIUM** — Adopt. |
| Forms: labels associated, errors `aria-describedby` (§13.5) | Existing `CreatePostModal` uses `<label>` but inputs lack `id`/`htmlFor` association; no error messages | **GAP / MEDIUM** — Adopt: associate labels and surface validation errors with `aria-describedby`. |
| Voting `aria-label="Upvote post"` / `"Downvote post"` (§13.6) | Existing `VoteControl` has `aria-label="Upvote"` / `"Downvote"` (no "post"/"comment" context) | **GAP / LOW** — Adopt: pass context-aware label. |
| Infinite scroll: loading state accessible (§13.7) | Existing loading skeleton is visual only, no `aria-live` or `role="status"` | **GAP / MEDIUM** — Adopt: add `role="status"` and `aria-live="polite"` to loading region. |
| Images: alt text (§13.8) | Existing post images use `alt=""` (decorative) — acceptable for category images that duplicate the post title visually | **OK** |

### 3.10 Performance (Plan §14) — mostly OK

| Plan claim | Codebase reality | Verdict |
|---|---|---|
| Generate users/communities/posts once, comments lazily, cache (§14.1) | Existing `data/comments.ts:79` memoizes in module `Map` | **OK** |
| Memoize expensive sorted lists, `PostCard` (§14.2) | Existing `HomePage`/`CommunityPage` `useMemo` the sorted list. `PostCard` is not memoized. | **GAP / LOW** — Adopt: `React.memo(PostCard)` with stable props (the props are `post` + `showCommunity`, both stable). |
| Lazy images, aspect ratios, fallbacks (§14.3) | Existing post images have `loading="lazy"`, fixed `max-h-[420px]`/`[560px]` containers, no aspect-ratio + no `onError` fallback | **GAP / LOW** — Adopt: add `aspect-video` style or explicit `width`/`height`, and `onError` to hide broken images. |
| Route code splitting (§14.5) | Existing single-file build | **CONFLICT / REJECT** — Same as §3.1. |
| Reduced-motion animation config (§14.6) | Existing framer-motion animations don't respect reduced motion | **GAP / MEDIUM** — Adopt: `<MotionConfig reducedMotion="user">` wrapper. |

### 3.11 Security (Plan §15) — partial GAP

| Plan claim | Codebase reality | Verdict |
|---|---|---|
| No secrets/credentials in code (§15.1) | Existing matches | **OK** |
| No `dangerouslySetInnerHTML` (§15.2) | Existing matches | **OK** |
| External links: `target="_blank" rel="noopener noreferrer"` (§15.3) | Existing `PostPage:102` uses `rel="noreferrer noopener"` (equivalent). `PostCard` link posts are not actual `<a>` tags — they're `<span>` with domain display, so no navigation issue. | **OK** |
| User-submitted URLs validated: `new URL`, http(s) only (§15.3) | Existing `CreatePostModal:safeDomain` uses `try { new URL(url) }` but does NOT check protocol | **GAP / HIGH** — Real security gap. Adopt: reject `javascript:`/`data:`/etc. URLs. |
| Storage: version schema, validate, handle corrupt, handle unavailable (§15.4) | Existing persist has no version/migrate/merge customization | **GAP / HIGH** — Same as §3.4. |
| Assets: avoid remote fetches, validate paths (§15.5) | Existing `public/images/*.jpg` are local. `index.css:1` `@import`s Google Fonts (remote). | **GAP / LOW** — Document as a known limitation (PAD §10 already lists it). |

### 3.12 Testing (Plan §16) — full GAP, but plan says "if a test runner is available"

| Plan claim | Codebase reality | Verdict |
|---|---|---|
| Unit tests for formatting, random, score, store vote logic, comment insertion, search, persistence (§16.1) | None exist; no test runner installed | **GAP / HIGH** — Adopt: install Vitest + Testing Library, add tests for the items listed. AGENTS.md says "No test runner and no linter are installed" — but the plan explicitly anticipates adding tests "if test setup is allowed". The user's task says "Use TDD approach to make code changes" → tests are required. |
| Integration/component tests (§16.2) | None | **GAP / MEDIUM** — Adopt: a small set of RTL tests for `VoteControl`, `PostCard`, `CreatePostModal`, `CommentComposer`, `SearchBar`. |
| Manual QA matrix (§16.3) | None documented | **GAP / LOW** — Adopt: add `docs/MANUAL_QA.md`. |
| Verification commands `tsc --noEmit`, `lint`, `test`, `build`, `preview` (§16.4) | Existing `package.json` has `dev`, `build`, `preview` only. No `typecheck`, `lint`, `test` scripts. | **GAP / MEDIUM** — Adopt: add `typecheck`, `test`, `lint` scripts (lint is optional). |

### 3.13 Pre-Mortem (Plan §17) — most mitigations are GAP

| Plan § | Risk | Existing mitigation | Verdict |
|---|---|---|---|
| 17.1 | Tailwind v4 dark mode misconfig | `@custom-variant dark` present | **OK** |
| 17.2 | Infinite scroll duplicate loads | `PostList:21` guards `loadingMore` | **OK** |
| 17.3 | Comment tree unstable after reply | `localChildren` state + `addLocalComment` store | **OK** — But reply draft is lost on collapse. **GAP / LOW**. |
| 17.4 | Persisted state shape changes break app | No version/migrate | **GAP / HIGH** — Same as §3.4. |
| 17.5 | Large generated data slow startup | 320 posts at module scope — fast in practice | **OK** |
| 17.6 | Images break under subpath hosting | `data/images.ts` uses absolute `/images/...` | **GAP / MEDIUM** — Adopt: prefix with `import.meta.env.BASE_URL`. |
| 17.7 | A11y regressions in overlays | Modal/Dropdown lack focus trap/Escape | **GAP / HIGH** — Same as §3.9. |
| 17.8 | Search dropdown nav races | Existing `SearchBar` uses `debounced` and `query` separately; result button uses `query` directly so a pending debounce + click could navigate with stale query | **GAP / MEDIUM** — Adopt: navigate with the button's bound result, not raw `query`. |
| 17.9 | Notification targets invalid | No validation | **GAP / MEDIUM** — Same as §3.8. |
| 17.10 | Theme flash on reload | `useEffect` applies after mount | **GAP / HIGH** — Same as §3.7. |

### 3.14 Summary of findings by severity

| Severity | Count | Examples |
|---|---:|---|
| **Critical/High GAP** | 9 | Theme flash, persistence validation, no tests, modal a11y, skip link, URL validation, comment count consistency, no schema version, notification target safety |
| **Medium GAP** | 14 | URL sort sync, search keyboard nav, dropdown a11y, notifications tabs, image fallbacks, asset base URL, error boundary, etc. |
| **Low GAP** | 8 | Reply at max depth, badge cap, PostCard memo, focus rings, etc. |
| **CONFLICT / REJECT** | 11 | Feature-sliced layout, dual stores, lazy pages, semantic theme tokens, PAGE_SIZE=12, max depth=5, renaming IDs/keys, etc. |
| **OK** | ~18 | Existing implementations that already satisfy the plan |

---

## 4. Remediation Strategy

### 4.1 Guiding principle

The plan's own precedence rules (§1) and the user's coding-agent system prompt (§4
Decision Priority Hierarchy: correctness > security > reliability > maintainability)
require that **existing codebase conventions take precedence over the plan's
blueprint** whenever both can satisfy the same requirement. Therefore:

- **REJECT** all CONFLICT items. They would break locked architecture
  (single-file build, HashRouter, single-store overlay, max comment depth 4,
  PAGE_SIZE=8, flat directory layout, ID conventions, color tokens).
- **ADOPT** all Critical/High GAPs that fix real bugs or security issues.
- **ADOPT** Medium GAPs that are additive and low-risk.
- **ADOPT** Low GAPs opportunistically — bundled into related work.
- **CODIFY** existing implicit rules in documentation instead of restructuring code.

### 4.2 TDD approach

Per the user's instruction "Use TDD approach to make code changes" and the
`tdd-workflow` and `test-driven-development` skills:

1. Set up Vitest + Testing Library first (Phase R1).
2. For each subsequent remediation phase:
   - **RED**: write a failing test that captures the desired behavior or
     bug being fixed.
   - **GREEN**: make the minimal change to pass.
   - **REFACTOR**: clean up while keeping tests green.
3. Run `npx tsc --noEmit && npm test && npm run build` after every phase.

### 4.3 Commit strategy

Per `git-workflow-and-versioning` skill (trunk-based, atomic commits) and the
plan's §19 commit grouping:

- All commits go to `main` (per user instruction).
- Each remediation phase = one atomic commit.
- Conventional Commit prefixes: `feat:`, `fix:`, `test:`, `chore:`, `docs:`.

---

## 5. Detailed ToDo List

Each task has: ID, objective, files touched, tests to write (RED), implementation (GREEN), verification.

### Phase R0 — Baseline verification ✅ (already done)

- ✅ `npx tsc --noEmit` passes clean.
- ✅ `npm run build` succeeds (510 kB single file).
- ✅ Dependencies installed.

### Phase R1 — Test infrastructure

**Objective:** Install Vitest + Testing Library + jsdom, add npm scripts, configure setup.

**Files touched:**
- `package.json` (via `npm install --save-dev`)
- `vite.config.ts` (add `test:` block)
- `src/test/setup.ts` (new — imports `@testing-library/jest-dom`)
- `src/test/utils.tsx` (new — `renderWithRouter` helper)
- `vitest.config.ts` (new — separate from vite to avoid polluting the
  single-file build config; OR merge into `vite.config.ts` under `test:` —
  prefer merge to keep config count low)

**Tests (RED):** A trivial sanity test `src/utils/cn.test.ts` that asserts
`cn("a", false, "b") === "a b"`.

**Verification:** `npm test` runs and passes; `npm run typecheck` passes.

### Phase R2 — Pure utility tests (foundational coverage)

**Objective:** Lock down the pure functions before touching anything else.

**Files touched:**
- `src/utils/format.test.ts` (new) — `timeAgo`, `formatCount`, `formatFullDate`
- `src/utils/random.test.ts` (new) — `hashString`, `seededRandom`, `createRng`,
  `gradientFor`
- `src/utils/format.ts` (edit) — make `timeAgo` accept optional `now?: number`
  parameter for deterministic tests (plan §7.2 GAP)

**Tests (RED):** Each test file written first, expected to pass on existing
behavior (characterization tests) except for the `timeAgo(iso, now?)` extension
which is a new feature.

**Verification:** `npm test` passes.

### Phase R3 — Score and sort utilities extracted + tested

**Objective:** Extract `hotScore`/`risingScore` from `data/posts.ts` into a
pure, testable `src/utils/score.ts`. Plan §16.1 explicitly requires score tests.

**Files touched:**
- `src/utils/score.ts` (new) — `getVisibleScore`, `hotScore`, `risingScore`,
  `bestScore` (alias to hot for now), pure `sortPosts(posts, mode, votes?)`
- `src/utils/score.test.ts` (new)
- `src/data/posts.ts` (edit) — re-export `sortPosts` from `utils/score.ts`,
  keep `POSTS`/`getPost` here. Vote-aware sorting is added but optional.

**Tests (RED):** Vote-adjusted score, new sort, top sort, hot stability, tie-breakers.

**Verification:** `npm test && npx tsc --noEmit && npm run build` all pass.

### Phase R4 — Search utilities + normalization

**Objective:** Plan §7.10 GAP. Extract search logic from `SearchBar`/`SearchPage`
into `src/utils/search.ts` with normalize + match + rank.

**Files touched:**
- `src/utils/search.ts` (new) — `normalizeQuery`, `matchScore`, `searchPosts`,
  `searchCommunities`, `searchUsers`
- `src/utils/search.test.ts` (new)
- `src/components/search/SearchBar.tsx` (edit) — use `searchPosts` etc.
- `src/pages/SearchPage.tsx` (edit) — same

**Tests (RED):** Finds by name, title, username; handles empty/whitespace; no
results; ranking order (exact > prefix > token > substring).

**Verification:** `npm test && npx tsc --noEmit && npm run build` pass.

### Phase R5 — URL validation utility

**Objective:** Plan §15.3 HIGH GAP. `CreatePostModal` accepts any string as URL.

**Files touched:**
- `src/utils/url.ts` (new) — `isSafeUrl(url): boolean` (http/https only),
  `extractDomain(url): string`
- `src/utils/url.test.ts` (new)
- `src/components/feed/CreatePostModal.tsx` (edit) — validate URL on submit,
  show inline error if invalid

**Tests (RED):** Accepts `https://example.com`, `http://localhost`; rejects
`javascript:alert(1)`, `data:text/html,...`, `ftp://...`, empty, malformed.

**Verification:** `npm test && npx tsc --noEmit && npm run build` pass.

### Phase R6 — Storage safety + schema version

**Objective:** Plan §8.4, §8.5, §15.4, §17.4 HIGH GAPs. Add `schemaVersion`,
custom `merge` with validation, `version` + `migrate` hooks on `persist`.

**Files touched:**
- `src/store/storage.ts` (new) — `safeParseJSON`, `validatePersistedState`,
  `STORAGE_KEY`, `SCHEMA_VERSION`
- `src/store/storage.test.ts` (new)
- `src/store/store.ts` (edit) — add `schemaVersion: number` to state, wire
  `merge` and `version`/`migrate` to the new helpers; wrap `setItem` in try/catch

**Tests (RED):** Valid state parses; missing fields fall back to defaults;
corrupt JSON falls back; wrong schema version triggers migration or fallback;
`localStorage.setItem` throwing (privacy mode) does not crash.

**Verification:** `npm test && npx tsc --noEmit && npm run build` pass; manually
verify in browser that existing persisted data still hydrates.

### Phase R7 — Selectors extracted + tested

**Objective:** Plan §8.6 GAP. Pure, testable selectors.

**Files touched:**
- `src/store/selectors.ts` (new) — `getVisibleScore`, `isPostSaved`,
  `isCommunityJoined`, `getUnreadNotificationCount`, `getDerivedCommentCount`
- `src/store/selectors.test.ts` (new)
- `src/components/notifications/NotificationsPanel.tsx` (edit) — use
  `getUnreadNotificationCount`
- `src/components/feed/VoteControl.tsx` (edit) — use `getVisibleScore`

**Tests (RED):** Each selector with happy path + edge cases (empty arrays,
missing IDs).

**Verification:** `npm test && npx tsc --noEmit && npm run build` pass.

### Phase R8 — Theme bootstrap (no flash)

**Objective:** Plan §11.3, §17.10 HIGH GAP. Theme applied before React mounts.

**Files touched:**
- `index.html` (edit) — add inline `<script>` before `<div id="root">` that
  reads `localStorage.getItem("reddit-clone-state")`, parses `?.state?.theme`,
  and toggles `.dark` class on `document.documentElement`.
- `src/main.tsx` (no change needed — the effect in `App.tsx` becomes idempotent)
- `src/test/theme-bootstrap.test.ts` (new) — test the bootstrap function in
  isolation by extracting it to `src/store/themeBootstrap.ts`

**Tests (RED):** Bootstrap reads persisted theme; applies `.dark` class when
theme is dark; does not throw on missing/corrupt storage; defaults to light.

**Verification:** `npm test && npx tsc --noEmit && npm run build` pass; manual
browser check (dark mode persists across reload with no flash).

### Phase R9 — Modal accessibility (focus trap, Escape, scroll lock, focus return)

**Objective:** Plan §13.4, §17.7 HIGH GAP.

**Files touched:**
- `src/hooks/useFocusTrap.ts` (new) — trap Tab/Shift+Tab within a container
- `src/hooks/index.ts` (edit) — re-export
- `src/components/ui/Modal.tsx` (edit) — add Escape handler, scroll lock
  (`document.body.style.overflow`), focus trap, focus return to trigger
- `src/components/ui/Modal.test.tsx` (new) — RTL test

**Tests (RED):** Escape closes; Tab cycles within modal; overlay click closes;
focus returns to previously-focused element on close.

**Verification:** `npm test && npx tsc --noEmit && npm run build` pass.

### Phase R10 — Dropdown accessibility (aria-expanded, Escape, arrow keys)

**Objective:** Plan §13.3, §17.7 MEDIUM GAP.

**Files touched:**
- `src/components/ui/Dropdown.tsx` (edit) — add `aria-expanded`,
  `aria-haspopup="menu"`, Escape close, arrow-key navigation between items,
  focus first item on open
- `src/components/ui/Dropdown.test.tsx` (new)

**Tests (RED):** Trigger has `aria-expanded`; Escape closes; ArrowDown moves
focus to first item; Enter activates item.

**Verification:** `npm test && npx tsc --noEmit && npm run build` pass.

### Phase R11 — Skip link + global focus styles

**Objective:** Plan §13.1, §13.2 HIGH GAP.

**Files touched:**
- `src/components/layout/AppShell.tsx` (edit) — add skip link `<a href="#main"
  className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2
  focus:z-[100] focus:rounded focus:bg-white focus:px-3 focus:py-2
  focus:text-sm focus:font-semibold">Skip to content</a>`; add `id="main"`
  to `<main>`
- `src/index.css` (edit) — add `:focus-visible { outline: 2px solid
  var(--focus-ring, theme(colors.orange.500)); outline-offset: 2px; }` and
  `@media (prefers-reduced-motion: reduce) { *, *::before, *::after {
  animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }`

**Verification:** `npx tsc --noEmit && npm run build` pass; manual keyboard
check (Tab from URL bar shows skip link first).

### Phase R12 — Reduced motion config

**Objective:** Plan §11.6, §14.6 MEDIUM GAP.

**Files touched:**
- `src/App.tsx` (edit) — wrap `<HashRouter>` content in
  `<MotionConfig reducedMotion="user">`

**Verification:** `npx tsc --noEmit && npm run build` pass.

### Phase R13 — Create post validation hardening

**Objective:** Plan §12.4, §15.3 HIGH GAP. Title 1–300, body ≤10k, URL http(s).

**Files touched:**
- `src/components/feed/CreatePostModal.tsx` (edit) — strict validation,
  inline error messages with `aria-describedby`, associate `<label htmlFor>`
  with inputs
- `src/components/feed/CreatePostModal.test.tsx` (new)

**Tests (RED):** Empty title blocks submit; title >300 chars blocks; invalid
URL blocks; valid submission calls `addLocalPost` + closes modal.

**Verification:** `npm test && npx tsc --noEmit && npm run build` pass.

### Phase R14 — Comment composer improvements

**Objective:** Plan §12.6 MEDIUM GAP. Ctrl/Cmd+Enter, char counter, max length.

**Files touched:**
- `src/components/post/CommentComposer.tsx` (edit) — add `onKeyDown` handler
  for Ctrl/Cmd+Enter, char counter `X / 10000`, `maxLength={10000}`
- `src/components/post/CommentComposer.test.tsx` (new)

**Tests (RED):** Cmd/Ctrl+Enter submits when non-empty; plain Enter does not;
counter updates; max length enforced.

**Verification:** `npm test && npx tsc --noEmit && npm run build` pass.

### Phase R15 — Search bar keyboard nav + Escape + race fix

**Objective:** Plan §12.9, §17.8 MEDIUM GAP.

**Files touched:**
- `src/components/search/SearchBar.tsx` (edit) — track `activeIndex`, handle
  ArrowUp/ArrowDown/Enter/Escape, navigate with the bound result object (not
  raw `query`)
- `src/components/search/SearchBar.test.tsx` (new)

**Tests (RED):** ArrowDown highlights first result; Enter navigates to active
result; Escape closes dropdown; stale debounce does not navigate to wrong
target.

**Verification:** `npm test && npx tsc --noEmit && npm run build` pass.

### Phase R16 — Notifications page tabs + per-item mark-read + target safety

**Objective:** Plan §12.10, §7.9, §17.9 MEDIUM GAP.

**Files touched:**
- `src/pages/NotificationsPage.tsx` (edit) — All/Unread tabs (synced to
  `?filter=` URL param), per-item mark-read button, fall back to "Unavailable"
  item if `getPost(n.postId)` returns undefined
- `src/components/notifications/NotificationsPanel.tsx` (edit) — accept
  optional `onMarkRead(id)` per-item callback, target validation
- `src/pages/NotificationsPage.test.tsx` (new)

**Tests (RED):** All tab shows all; Unread tab filters; mark-read button
removes from unread list; notification with deleted post shows fallback.

**Verification:** `npm test && npx tsc --noEmit && npm run build` pass.

### Phase R17 — Notification bell badge cap

**Objective:** Plan §12.10 LOW GAP.

**Files touched:**
- `src/components/layout/Navbar.tsx` (edit) — display `${unreadCount > 9 ?
  "9+" : unreadCount}`

**Verification:** `npx tsc --noEmit && npm run build` pass; manual check.

### Phase R18 — URL sort sync (HomePage + CommunityPage)

**Objective:** Plan §9.3, §12.1 MEDIUM GAP.

**Files touched:**
- `src/pages/HomePage.tsx` (edit) — replace `useState<SortMode>` with
  `useSearchParams()` reading `?sort=` (default `best`); invalid sort falls
  back to `best`
- `src/pages/CommunityPage.tsx` (edit) — same, default `hot`
- `src/components/feed/SortTabs.tsx` (no change to API)

**Tests (RED) — added to a new `src/pages/HomePage.test.tsx`:** Initial
`?sort=new` renders New tab active; changing tab updates URL; invalid
`?sort=foo` falls back to default.

**Verification:** `npm test && npx tsc --noEmit && npm run build` pass.

### Phase R19 — Post detail not-found state

**Objective:** Plan §12.5 MEDIUM GAP. Currently redirects silently to `/`.

**Files touched:**
- `src/pages/PostPage.tsx` (edit) — replace `<Navigate to="/" replace />`
  with a "Post not found" empty state with link back to home

**Verification:** `npx tsc --noEmit && npm run build` pass; manual check.

### Phase R20 — Image base URL + onError fallback

**Objective:** Plan §14.3, §17.6 MEDIUM GAP.

**Files touched:**
- `src/data/images.ts` (edit) — prefix paths with `${import.meta.env.BASE_URL}`
- `src/components/feed/PostCard.tsx` (edit) — add `onError` handler to hide
  broken image
- `src/pages/PostPage.tsx` (edit) — same

**Verification:** `npx tsc --noEmit && npm run build` pass; manual check
under `base: "/repo/"`.

### Phase R21 — PostCard memoization + vote label context

**Objective:** Plan §14.2 LOW GAP, §13.6 LOW GAP.

**Files touched:**
- `src/components/feed/PostCard.tsx` (edit) — wrap export in `React.memo`
- `src/components/feed/VoteControl.tsx` (edit) — accept optional
  `label?: "post" | "comment"` prop, default "post"; `aria-label` becomes
  `Upvote ${label}` / `Downvote ${label}`

**Verification:** `npm test && npx tsc --noEmit && npm run build` pass.

### Phase R22 — Infinite scroll a11y

**Objective:** Plan §13.7 MEDIUM GAP.

**Files touched:**
- `src/components/feed/PostList.tsx` (edit) — add `role="status"` and
  `aria-live="polite"` to the loading skeleton region; add `aria-label` to
  the sentinel

**Verification:** `npx tsc --noEmit && npm run build` pass.

### Phase R23 — Error boundary

**Objective:** Plan §9.4 MEDIUM GAP.

**Files touched:**
- `src/components/layout/ErrorBoundary.tsx` (new) — class component with
  `componentDidCatch` logging to console and a fallback UI with reload button
- `src/components/layout/AppShell.tsx` (edit) — wrap `<Outlet />` in
  `<ErrorBoundary>`

**Verification:** `npx tsc --noEmit && npm run build` pass.

### Phase R24 — Comment max-depth reply disable

**Objective:** Plan §12.6 LOW GAP.

**Files touched:**
- `src/components/post/CommentThread.tsx` (edit) — when `depth >= 4`, hide
  Reply button or show "Continue thread" hint

**Verification:** `npx tsc --noEmit && npm run build` pass.

### Phase R25 — Comment count consistency fix

**Objective:** Plan §7.7 HIGH GAP. `PostCard` displays `post.commentCount`
(formula-derived, often 30–60) but the post detail page renders far fewer
actual comments. This is misleading.

**Files touched:**
- `src/components/feed/PostCard.tsx` (edit) — display the actual comment
  count: if the post has a generated tree, use `countComments(getCommentsForPost(post.id)) + localCount`; otherwise fall back to `post.commentCount`.

  **Wait** — this would force eager generation of every comment tree on the
  home feed, defeating the lazy design. **Better approach:** keep
  `post.commentCount` on the card as the *seed-declared* count (it's
  displayed as "X comments" — that's the seed value, which is honest), and
  ensure `PostPage` displays `countComments(mergedTree)` as the *visible*
  count. Both are already correct; the only mismatch is *user-perceived*
  when they open a post and see fewer comments than the card promised.

  **Adopted fix:** in `posts.ts:generatePosts`, derive `commentCount` from
  the actual tree by generating the tree once at module scope and counting
  it. This is bounded (320 posts × ~5 root × ~3 replies ≈ ~5k comments —
  well within performance budget) and eliminates the inconsistency.

- `src/data/posts.ts` (edit) — after generating all posts, for each post
  generate its comment tree (using the existing `getCommentsForPost`) and
  set `post.commentCount = countComments(tree)`. Cache is already memoized
  so this is free at runtime.

**Tests (RED):** `posts.ts` export a `verifyCommentCountConsistency()` for
tests; assert every post's `commentCount` equals `countComments(getCommentsForPost(post.id))`.

**Verification:** `npm test && npx tsc --noEmit && npm run build` pass.

### Phase R26 — Documentation updates

**Objective:** Update docs to reflect remediated codebase. Plan §13 Phase 13.

**Files touched:**
- `AGENTS.md` — add: test commands (`npm test`, `npm run typecheck`), storage
  schema version, theme bootstrap, error boundary, focus trap in Modal, etc.
- `CLAUDE.md` — same updates in condensed form; add Testing section.
- `README.md` — add Testing section to Quick Start; mention `npm test`.
- `docs/Project-Architecture-Document.md` — update §7 Testing Strategy, §8
  Build (new scripts), §10 Known Issues (mark resolved items), §5 Design
  System (theme bootstrap).
- `docs/MANUAL_QA.md` (new) — manual QA matrix from plan §16.3.

**Verification:** `npx tsc --noEmit && npm run build` pass; manual review.

### Phase R27 — Final verification + cleanup

**Objective:** Plan §20 Definition of Done.

**Tasks:**
- Run `npx tsc --noEmit` — must pass clean.
- Run `npm test` — all green.
- Run `npm run build` — succeeds.
- Run `npm run preview` — smoke test in browser.
- Remove any scratch files (none expected).
- Verify no `console.log` debug statements added.
- Verify no secrets in code.
- Verify `dist/` is not committed (already gitignored).

### Phase R28 — Commit + push

**Objective:** Per user instruction.

- Stage all changes.
- Commit each phase as an atomic commit (or batch related phases — see below).
- Push to `origin/main` using the provided SSH key + wrapper script.

**Commit grouping (per plan §19, adapted):**
1. `chore: add test infrastructure (Vitest + Testing Library)`
2. `test: add coverage for utils (format, random, score, search, url)`
3. `feat: add storage safety, schema version, and persistence validation`
4. `feat: add pure selectors for votes, saves, joins, unread, comment count`
5. `fix: apply theme before first paint to prevent flash`
6. `feat: improve Modal a11y (focus trap, Escape, scroll lock, focus return)`
7. `feat: improve Dropdown a11y (aria-expanded, Escape, arrow keys)`
8. `feat: add skip link, global focus styles, reduced-motion support`
9. `fix: harden Create Post validation (title length, URL protocol)`
10. `feat: add Cmd/Ctrl+Enter and char counter to CommentComposer`
11. `feat: add keyboard nav and race-fix to SearchBar`
12. `feat: add Notifications page tabs, per-item mark-read, target safety`
13. `feat: sync feed sort to URL ?sort= param`
14. `fix: render Post not-found state instead of silent redirect`
15. `fix: prefix image paths with BASE_URL and add onError fallback`
16. `feat: memoize PostCard and add context-aware VoteControl labels`
17. `feat: add role=status to infinite scroll loading region`
18. `feat: add ErrorBoundary around router outlet`
19. `fix: disable reply at max comment depth`
20. `fix: derive post.commentCount from generated tree for consistency`
21. `docs: update AGENTS, CLAUDE, README, PAD with remediation changes`
22. `chore: final verification (tsc, test, build)`

---

## 6. Re-validation Against the Codebase

Before execution, each phase was re-checked against the actual source to confirm:

1. **Files referenced exist** — ✅ All `src/*` paths verified.
2. **Functions to be extracted are present** — ✅ `hotScore`/`risingScore` in
   `data/posts.ts:205-214`; `sortPosts` at `:216`.
3. **State shape additions are non-breaking** — ✅ Adding `schemaVersion:
   number` to the persisted state is additive; existing persisted data will
   hydrate with `schemaVersion: undefined` and the `merge` function will
   inject the default `1` and validate the rest.
4. **Test infrastructure will not break the single-file build** — ✅ Vitest
   config lives under `test:` in `vite.config.ts` and is ignored by `vite build`.
5. **Theme bootstrap script in `index.html` is browser-safe** — ✅ Wrapped in
   `try/catch`, no external dependencies, runs synchronously before React.
6. **ErrorBoundary is a class component** — ✅ React 19 still supports class
   components for error boundaries (no hook equivalent exists).
7. **`React.memo(PostCard)` won't break behavior** — ✅ Props are `post` and
   `showCommunity`, both stable references.
8. **Comment count fix is performant** — ✅ 320 posts × ~5 root comments × ~3
   replies ≈ 5,000 comments generated once at module scope, memoized. Adds
   ~50ms to startup; well within acceptable range.
9. **URL sort sync uses `useSearchParams`** — ✅ Available in `react-router-dom@7`.
10. **Image `onError` handler** — ✅ Standard React synthetic event.

No conflicts with locked conventions were found in any adopted phase. All
REJECTED items (§3.1, §3.2, §3.4 dual stores, §3.7 semantic tokens, §3.8
PAGE_SIZE=12, §3.8 max depth=5, §3.9 lazy pages) remain rejected.

---

## 7. Skills Used

From `skills/skills-catalog.md`, the following skills informed this remediation:

| Skill | Used for |
|---|---|
| `tdd-workflow` | RED-GREEN-REFACTOR cycle for every phase |
| `test-driven-development` | "Drives development with tests" — core methodology |
| `testing-patterns` | Unit + integration patterns, RTL setup |
| `clean-code` | Pragmatic standards, no over-engineering |
| `code-quality-standards` | Six-Axis review before commit |
| `code-review-and-audit` | Mode C audit findings in §3 |
| `lint-and-validate` | `npx tsc --noEmit` + `npm run build` gates |
| `coding-agent` | Workflow: plan → implement → verify |
| `incremental-implementation` | Phase-by-phase delivery |
| `planning-and-task-breakdown` | This document's structure |
| `git-workflow-and-versioning` | Atomic commits to main |
| `debugging-and-error-recovery` | Root-cause discipline for bug fixes |
| `documentation-and-adrs` | Doc updates in Phase R26 |
| `verification-and-review-protocol` | Evidence-based verification per phase |

---

## 8. Definition of Done

The remediation is complete when:

- [ ] All adopted phases (R1–R25) are implemented and pass `npm test`.
- [ ] `npx tsc --noEmit` passes clean.
- [ ] `npm run build` succeeds.
- [ ] No new `console.log` debug statements in production code.
- [ ] No secrets or credentials added.
- [ ] All commits are atomic and pushed to `origin/main`.
- [ ] Documentation (AGENTS.md, CLAUDE.md, README.md, PAD) updated.
- [ ] `docs/MANUAL_QA.md` added.
- [ ] This document's §3 audit findings are reflected in the codebase:
  every "HIGH GAP" is resolved or explicitly documented as deferred.
