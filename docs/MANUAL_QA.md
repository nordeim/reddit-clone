# Manual QA Matrix

> Use this matrix when automated tests are unavailable or to verify behavior end-to-end in the browser. Each row is a discrete check; tick the box when verified.

## Setup

1. `npm install`
2. `npm run dev` (or `npm run build && npm run preview`)
3. Open `http://localhost:5173`

---

## Feed

- [ ] Home feed loads with skeleton placeholders (650 ms simulated latency)
- [ ] First page renders 8 posts
- [ ] Infinite scroll loads the next page when the sentinel enters the viewport
- [ ] No duplicate posts appear after multiple page loads
- [ ] End-of-feed message ("You've reached the end of the feed 🎉") appears when the source is exhausted
- [ ] Sort tabs change the ordering (Best / Hot / New / Top / Rising)
- [ ] Sort selection is preserved in the URL `?sort=` and survives reload
- [ ] Invalid `?sort=foo` falls back to "best"
- [ ] "Home" scope filters to joined communities when at least one is joined
- [ ] "Popular" and "All" scopes show every post
- [ ] Empty state appears when the scope has no posts

## Voting

- [ ] Upvote increments the visible score by 1
- [ ] Downvote decrements the visible score by 1
- [ ] Clicking the same vote again toggles it off (back to base score)
- [ ] Upvote → Downvote replaces the vote (no double-counting)
- [ ] Active vote shows distinct color (orange for upvote, indigo for downvote)
- [ ] Vote state persists across reload
- [ ] `aria-pressed` reflects active state
- [ ] `aria-label` is "Upvote post" / "Downvote post" (or "comment" for comment votes)

## Posts

- [ ] Clicking a post card title navigates to the post detail page
- [ ] Inner vote / save / share buttons do NOT trigger card navigation
- [ ] Save toggles with a toast confirmation
- [ ] Share copies the post URL to the clipboard with a toast confirmation
- [ ] Image posts render the category image with `loading="lazy"`
- [ ] Link posts display the domain only (no auto-embedding)
- [ ] Long titles wrap safely without horizontal overflow

## Create Post

- [ ] "Create" button in the navbar opens the modal
- [ ] Community selector pre-selects the first community
- [ ] Post type tabs (Text / Image / Link) switch the form fields
- [ ] Title field shows a live character counter (X / 300)
- [ ] Body field (text posts) shows a live character counter (X / 10000)
- [ ] Submit with empty title shows "Title is required" error
- [ ] Submit a link post with `javascript:alert(1)` shows "URL must start with http:// or https://"
- [ ] Submit a link post with `data:text/html,...` shows the same error
- [ ] Submit a link post with `https://example.com` succeeds
- [ ] Created post appears in the home feed, the community feed, and the user's profile
- [ ] Created post navigates to its detail page on submit

## Post Detail

- [ ] Valid post loads with full title, body / image / link
- [ ] Action bar shows vote control and comment count
- [ ] Comment composer is visible at the top of the comment section
- [ ] Comment tree renders nested correctly (indentation increases with depth)
- [ ] Invalid post ID (e.g. `/comments/p999999`) renders "Post not found" state instead of redirecting
- [ ] Comment count matches the actual rendered tree (no formula mismatch)
- [ ] Image `onError` hides the broken image container gracefully

## Comments

- [ ] Top-level comment inserts appear at the top of the thread
- [ ] Reply inserts appear under the correct parent
- [ ] New comments persist across reload
- [ ] Comment votes persist across reload
- [ ] Collapsing a comment hides its subtree and shows "N hidden"
- [ ] Expanding restores the subtree
- [ ] Reply composer supports Ctrl/Cmd+Enter to submit
- [ ] Reply composer shows a character counter
- [ ] At max depth (4), the Reply button is replaced with a "Continue thread" hint
- [ ] Mobile indentation remains usable (no horizontal scroll)

## Communities

- [ ] `/r/:name` page loads for a valid community
- [ ] Community header shows banner, icon, title, member count, online count, join button, create post button
- [ ] Feed is scoped to the community's posts
- [ ] Right panel shows the community about card + rules
- [ ] Join / leave toggles with a toast
- [ ] Joined community appears in the sidebar
- [ ] Invalid community name redirects home
- [ ] Sort tab syncs to `?sort=` URL param

## Profiles

- [ ] `/u/:username` loads for a valid user
- [ ] Profile header shows avatar, display name, username, bio, karma, cake day
- [ ] Posts tab shows authored posts (seed + local)
- [ ] Comments tab shows authored comments with link to originating post
- [ ] Saved tab appears ONLY on the current user's profile
- [ ] Saved tab shows saved posts
- [ ] Empty state appears for users with no posts / comments / saved

## Search

- [ ] Navbar search dropdown opens on focus
- [ ] Debounce ~200 ms before results appear
- [ ] Results grouped by Communities / People / Posts
- [ ] ArrowDown moves highlight to the first result
- [ ] ArrowUp / ArrowDown cycle through results
- [ ] Enter navigates to the active result
- [ ] Escape closes the dropdown
- [ ] Outside click closes the dropdown
- [ ] Clicking a result navigates and closes the dropdown
- [ ] "See all results" link navigates to `/search?q=...`
- [ ] Search page tabs (Posts / Communities / Users) sync to `?tab=` URL param
- [ ] Invalid `?tab=foo` falls back to "posts"
- [ ] Empty / whitespace-only query shows the "Type something" prompt

## Notifications

- [ ] Bell icon shows an unread badge when unread count > 0
- [ ] Badge is capped at "9+" for counts > 9
- [ ] Dropdown panel shows recent notifications
- [ ] Unread notifications have an orange background tint
- [ ] "Mark all as read" button appears when unread > 0
- [ ] Clicking a notification marks it read + navigates to the target
- [ ] `/notifications` page renders the All / Unread tabs
- [ ] `?filter=unread` shows only unread
- [ ] Per-item "Mark read" button works
- [ ] Notification pointing to a deleted post renders a fallback item (no dead link)

## Theme

- [ ] Light / dark toggle works
- [ ] Theme persists across reload
- [ ] **No theme flash on reload** — the correct background is visible from first paint
- [ ] Dark mode has parity with light mode (no missing styles, no contrast issues)
- [ ] `prefers-reduced-motion: reduce` disables framer-motion animations

## Persistence

- [ ] Votes persist across reload
- [ ] Saved posts persist across reload
- [ ] Joined communities persist across reload
- [ ] Local posts persist across reload
- [ ] Local comments persist across reload
- [ ] Notification read state persists across reload
- [ ] Theme persists across reload
- [ ] Toasts do NOT persist (ephemeral)
- [ ] Corrupt `reddit-clone-state` in localStorage falls back to defaults without crashing

## Accessibility

- [ ] Skip link is focusable from the URL bar (Tab → "Skip to content" appears)
- [ ] Skip link moves focus to `#main` on Enter
- [ ] All interactive elements have visible focus rings
- [ ] Modal traps Tab focus within itself
- [ ] Escape closes the modal
- [ ] Background scroll is locked while modal is open
- [ ] Focus returns to the trigger when the modal closes
- [ ] Dropdown trigger has `aria-expanded` reflecting open state
- [ ] Dropdown supports arrow-key navigation between items
- [ ] Form labels are associated with inputs (`for` / `id`)
- [ ] Form errors are linked via `aria-describedby`
- [ ] Vote buttons have `aria-pressed` reflecting active state
- [ ] Infinite scroll loading region has `role="status"` + `aria-live="polite"`

## Responsiveness

- [ ] 320 px width: no horizontal overflow, cards stack, comment indentation reduced
- [ ] 375 px width: mobile drawer opens via hamburger
- [ ] 768 px width: sidebar appears
- [ ] 1024 px width: full layout with sidebar
- [ ] 1440 px width: right panel appears on home / community / post pages
- [ ] Long usernames, post titles, community names wrap safely
- [ ] Deep comment threads don't overflow horizontally

## Build

- [ ] `npm run typecheck` passes clean
- [ ] `npm test` all green
- [ ] `npm run build` succeeds
- [ ] `npm run preview` serves the build
- [ ] No `console.error` or `console.warn` in the browser console during normal use
- [ ] No placeholder / debug text remains
