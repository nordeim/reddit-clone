Below is the refined, production-oriented architecture and implementation plan for the Reddit clone. This is a planning artifact: no code changes are included and nothing in this response has been executed. The plan assumes a static client-side React + TypeScript + Tailwind app unless your repository already defines a different runtime convention.

---

# Reddit Clone — Refined Architecture & Implementation Plan

## 1. Planning Assumptions

These assumptions are explicit so the implementation can proceed without repeated clarification.

1. **Runtime target**
   - Modern evergreen browsers.
   - Static hosting compatible with a client-side SPA.
   - `HashRouter` is preferred for maximum static-host compatibility unless the project already uses `BrowserRouter` with server fallback.

2. **Backend**
   - No real backend.
   - All content is generated deterministically on the client.
   - All mutations are local-only and persisted to `localStorage` where appropriate.

3. **UI stack**
   - React + TypeScript.
   - Tailwind CSS v4.
   - No existing component library is assumed. If one exists in the repository, it should be used instead of custom primitives.
   - Icons via `lucide-react`.
   - Micro-animations via `framer-motion`, respecting reduced-motion preferences.

4. **Data**
   - Realistic dummy data only.
   - No runtime network dependency for core content or images.
   - Category images are local assets.
   - Avatars and community icons use deterministic gradient initials rather than external image services.

5. **Quality bar**
   - TypeScript strict mode.
   - Accessible keyboard navigation.
   - Visible focus states.
   - Responsive mobile/tablet/desktop layout.
   - Loading, empty, error, and end-of-feed states.
   - No placeholder values in final UI.
   - Deterministic behavior for seeded data.

6. **Single-file constraint**
   - If the final deliverable must be a true single-file HTML artifact, local JPG images should be replaced with bundled data URIs or generated SVG/CSS placeholders.
   - If normal static hosting is acceptable, `public/images/*.jpg` is simpler and more maintainable.

---

## 2. Product Scope

### Core features

The application should include:

1. **Responsive app shell**
   - Top navbar.
   - Persistent left sidebar on desktop.
   - Mobile drawer navigation.
   - Optional right panel on large screens.

2. **Feed**
   - Home feed.
   - Popular feed.
   - All feed.
   - Community feed.
   - Infinite scrolling.
   - Skeleton loading states.
   - End-of-feed state.
   - Retry state for simulated load failure, if implemented.

3. **Posts**
   - Text posts.
   - Link posts.
   - Image posts.
   - Upvote/downvote.
   - Comment count.
   - Save post.
   - Share action.
   - Create post modal.
   - Post detail page.

4. **Comments**
   - Threaded comments.
   - Nested replies.
   - Collapse/expand comment subtrees.
   - Reply composer.
   - Comment voting.
   - Local insertion of new comments.

5. **Communities**
   - Community header.
   - Join/leave.
   - Community description and metadata.
   - Community post feed.
   - About panel.

6. **Profiles**
   - User profile page.
   - Karma.
   - Cake day.
   - Bio.
   - Tabs:
     - Posts.
     - Comments.
     - Saved, if viewing current user.

7. **Search**
   - Navbar live search dropdown.
   - Full search results page.
   - Results for:
     - Communities.
     - Posts.
     - Users.
   - Query parameter support.

8. **Notifications**
   - Navbar bell with unread badge.
   - Notifications dropdown panel.
   - Notifications page.
   - Mark individual notification read.
   - Mark all read.
   - Persist read state.

9. **Theme**
   - Light mode.
   - Dark mode.
   - Persistent theme preference.
   - No flash of incorrect theme on load.

10. **Polish**
   - Smooth but restrained animations.
   - Clean typography.
   - Consistent spacing.
   - Hover, active, focus, disabled states.
   - Reduced-motion support.

---

## 3. Recommended Stack

| Concern | Choice | Reason |
|---|---|---|
| Language | TypeScript strict | Safer domain modeling and refactors |
| Framework | React | Requested |
| Build tool | Vite or existing project bundler | Fast, static-friendly |
| Routing | `react-router-dom` with `HashRouter` | Works well on static hosts |
| Styles | Tailwind CSS v4 | Requested |
| Global state | `zustand` | Lightweight, easy persistence |
| Persistence | `zustand/persist` + `localStorage` | Simple client-side persistence |
| Icons | `lucide-react` | Clean icon set |
| Animation | `framer-motion` | Micro-interactions and transitions |
| Testing | Vitest + Testing Library, if available | Validates critical logic |

---

## 4. Final Codebase Architecture

### 4.1 Directory layout

```text
src/
  main.tsx
  App.tsx
  index.css

  types/
    index.ts

  utils/
    cn.ts
    format.ts
    random.ts
    search.ts
    score.ts

  data/
    images.ts
    users.ts
    communities.ts
    posts.ts
    comments.ts
    notifications.ts

  store/
    store.ts
    selectors.ts

  hooks/
    index.ts
    useInfiniteScroll.ts
    useDebounce.ts
    useOnClickOutside.ts
    useMediaQuery.ts
    useTheme.ts

  components/
    ui/
      Avatar.tsx
      Button.tsx
      IconButton.tsx
      Skeleton.tsx
      Dropdown.tsx
      Modal.tsx
      Toaster.tsx
      Tabs.tsx
      EmptyState.tsx
      ErrorState.tsx

    layout/
      AppShell.tsx
      Navbar.tsx
      Sidebar.tsx
      MobileNavDrawer.tsx
      RightPanel.tsx
      PageHeader.tsx

    feed/
      PostCard.tsx
      PostList.tsx
      PostSkeleton.tsx
      SortTabs.tsx
      VoteControl.tsx
      CreatePostModal.tsx
      FeedEndMessage.tsx

    post/
      PostDetail.tsx
      CommentThread.tsx
      CommentItem.tsx
      CommentComposer.tsx
      CommentSkeleton.tsx

    community/
      CommunityHeader.tsx
      CommunityAboutCard.tsx
      JoinButton.tsx

    profile/
      ProfileHeader.tsx
      ProfileTabs.tsx
      ProfilePostList.tsx
      ProfileCommentList.tsx

    search/
      SearchBar.tsx
      SearchResults.tsx
      SearchTabs.tsx

    notifications/
      NotificationsPanel.tsx
      NotificationItem.tsx
      NotificationsPageList.tsx

  pages/
    HomePage.tsx
    CommunityPage.tsx
    PostPage.tsx
    ProfilePage.tsx
    SearchPage.tsx
    NotificationsPage.tsx
    NotFoundPage.tsx
```

---

## 5. Domain Model

The domain model should be normalized where possible. Components should reference entities by stable IDs.

### 5.1 Core types

```ts
type ID = string;

type ThemeMode = "light" | "dark";

type SortMode = "best" | "hot" | "new" | "top" | "rising";

type VoteDirection = 1 | -1 | 0;

type PostType = "text" | "image" | "link";

interface User {
  id: ID;
  username: string;
  displayName: string;
  bio: string;
  avatarHue: number;
  karma: number;
  cakeDay: string;
  isAdmin?: boolean;
}

interface Community {
  id: ID;
  name: string;
  title: string;
  description: string;
  category: CategorySlug;
  iconHue: number;
  bannerHue: number;
  members: number;
  createdAt: string;
}

interface Post {
  id: ID;
  communityId: ID;
  authorId: ID;
  type: PostType;
  title: string;
  body?: string;
  url?: string;
  image?: string;
  flair?: string;
  createdAt: string;
  baseScore: number;
  upvoteRatio: number;
  commentCount: number;
}

interface Comment {
  id: ID;
  postId: ID;
  parentId: ID | null;
  authorId: ID;
  body: string;
  createdAt: string;
  baseScore: number;
}

interface Notification {
  id: ID;
  kind: "reply" | "upvote" | "mention" | "community" | "trending";
  actorId: ID;
  targetType: "post" | "comment" | "community" | "user";
  targetId: ID;
  excerpt?: string;
  createdAt: string;
}
```

### 5.2 Local mutation model

Generated content should remain immutable. User-created content should be stored separately and merged at read time.

Examples:

```ts
interface LocalPost extends Post {
  isLocal: true;
}

interface LocalComment extends Comment {
  isLocal: true;
}
```

This avoids mutating deterministic seed data and makes persistence easier to reason about.

---

## 6. Data Generation Strategy

### 6.1 Goals

- Deterministic across reloads.
- Stable IDs.
- No runtime network dependency.
- Realistic, topic-aware content.
- Efficient enough to generate once at startup.

### 6.2 Seed strategy

Use a small seeded RNG utility:

- `hashString(input: string): number`
- `mulberry32(seed: number): () => number`
- `pick<T>(rng, items): T`
- `pickInt(rng, min, max): number`
- `chance(rng, probability): boolean`

Use stable seeds per domain:

- Users: `"users"`
- Communities: `"communities"`
- Posts: `"posts"`
- Comments for a post: `comments:${postId}`
- Notifications: `"notifications"`

This ensures comment trees do not change when navigating between posts.

### 6.3 Entity counts

Recommended concrete volumes:

| Entity | Count |
|---|---:|
| Users | 48 |
| Communities | 18 |
| Posts | 320 |
| Notifications | 18–24 |
| Comments per post | 4–42 deterministic, depending on post seed |

These numbers are large enough to feel realistic while remaining performant.

### 6.4 Users

Each user should have:

- Unique `id`.
- Unique `username`.
- Human-readable `displayName`.
- Short realistic bio.
- Deterministic karma.
- Deterministic cake day.
- Deterministic avatar hue.

Avatar rendering should use initials plus hue-based gradient, not network images.

### 6.5 Communities

Each community should have:

- Name, such as `nature`, `typescript`, `space`, `food`, etc.
- Title, such as `r/typescript`.
- Description.
- Category.
- Member count.
- Creation date.
- Icon hue.
- Banner hue.
- Topic-specific content pools.

Recommended categories:

1. Nature
2. Technology
3. Gaming
4. Food
5. Space
6. Art
7. Animals
8. Sports
9. Programming
10. Science
11. Music
12. Movies
13. Books
14. Fitness
15. Travel
16. Photography
17. DIY
18. News/Discussion

### 6.6 Posts

Post generation should be community-aware.

Each post should include:

- Stable ID.
- Community ID.
- Author ID.
- Type:
  - `text`
  - `image`
  - `link`
- Title from a topic-specific pool.
- Body text for text posts.
- Image path for image posts.
- URL domain for link posts.
- Flair where appropriate.
- Timestamp distributed over the last 30 days.
- Base score.
- Upvote ratio.
- Comment count.

Image posts should use local category images:

```text
/images/cat-nature.jpg
/images/cat-tech.jpg
/images/cat-gaming.jpg
/images/cat-food.jpg
/images/cat-space.jpg
/images/cat-art.jpg
/images/cat-animals.jpg
/images/cat-sports.jpg
```

Use `import.meta.env.BASE_URL` or an equivalent asset helper so paths work when the app is served from a subpath.

### 6.7 Comments

Comment generation should be deterministic per post.

Rules:

- Generate comments only when a post page is opened, then cache them.
- Use `postId` as the RNG seed.
- Maximum depth: 5.
- Root comments: 3–12.
- Replies per comment: 0–4.
- Comment bodies drawn from community-aware content pools.
- Scores deterministic.
- Timestamps later than the post timestamp.

Recommended representation:

```ts
interface CommentTreeNode {
  comment: Comment;
  children: CommentTreeNode[];
}
```

Or a normalized map plus `childIds` if insertion and lookup need to be more efficient.

### 6.8 Notifications

Notifications should reference real generated entities.

Kinds:

- Reply to your post.
- Reply to your comment.
- Upvote on your post.
- Community activity.
- Trending post.
- Mention.

Notification targets must resolve to valid routes:

- Post notification → post page.
- Comment notification → post page, optionally with comment anchor.
- Community notification → community page.
- User notification → profile page.

---

## 7. State Architecture

### 7.1 Store responsibilities

The global store should own persistent user-local state only. Derived data should be computed with selectors or memoized helpers.

Store state:

```ts
interface AppState {
  theme: ThemeMode;

  postVotes: Record<ID, VoteDirection>;
  commentVotes: Record<ID, VoteDirection>;

  joinedCommunityIds: ID[];
  savedPostIds: ID[];

  localPosts: LocalPost[];
  localComments: LocalComment[];

  readNotificationIds: ID[];

  toasts: Toast[];
}
```

Actions:

```ts
setTheme(theme: ThemeMode): void;
toggleTheme(): void;

togglePostVote(postId: ID, direction: 1 | -1): void;
toggleCommentVote(commentId: ID, direction: 1 | -1): void;

toggleJoinCommunity(communityId: ID): void;
toggleSavePost(postId: ID): void;

addLocalPost(post: LocalPost): void;
addLocalComment(comment: LocalComment): void;

markNotificationRead(id: ID): void;
markAllNotificationsRead(ids: ID[]): void;

pushToast(toast: Omit<Toast, "id">): void;
dismissToast(id: ID): void;
```

### 7.2 Persistence

Use `zustand/middleware` `persist`.

Persist:

- `theme`
- `postVotes`
- `commentVotes`
- `joinedCommunityIds`
- `savedPostIds`
- `localPosts`
- `localComments`
- `readNotificationIds`

Do not persist:

- Toasts.
- Dropdown/menu open state.
- Modal transient state.
- Infinite scroll position.
- Search input text.
- Comment collapse state, unless explicitly desired.

Use a versioned storage key:

```text
reddit-clone-store-v1
```

Include a `migrate` hook even if initially trivial, so future schema changes are safe.

### 7.3 Derived selectors

Examples:

- `getVisibleScore(post, postVotes)`
- `isPostSaved(postId, savedPostIds)`
- `isCommunityJoined(communityId, joinedCommunityIds)`
- `getUnreadNotificationCount(notifications, readNotificationIds)`
- `getFeedPosts(sortMode, communityFilter)`
- `getPostById(postId)`
- `getCommunityByName(name)`
- `getUserByUsername(username)`

Selectors should be pure and stable.

---

## 8. Routing Architecture

Use a persistent `AppShell` layout around routed pages.

### 8.1 Routes

| Route | Page | Purpose |
|---|---|---|
| `/` | `HomePage` | Home/Popular/All feed |
| `/r/:communityName` | `CommunityPage` | Community feed and header |
| `/r/:communityName/comments/:postId` | `PostPage` | Post detail and comments |
| `/u/:username` | `ProfilePage` | User profile |
| `/search` | `SearchPage` | Full search results |
| `/notifications` | `NotificationsPage` | Notifications list |
| `*` | `NotFoundPage` | 404 |

### 8.2 Query params

Recommended query params:

- Home:
  - `sort=best|hot|new|top|rising`
- Search:
  - `q=term`
  - `tab=communities|posts|users`
- Notifications:
  - optional `filter=unread|all`

Using query params improves shareability and back-button behavior.

---

## 9. Layout Architecture

### 9.1 Desktop layout

```text
+--------------------------------------------------------------+
| Navbar                                                       |
+--------------+-----------------------------+----------------+
| Sidebar      | Main content                | Right panel    |
|              |                             |                |
|              |                             |                |
+--------------+-----------------------------+----------------+
```

Recommended grid:

```text
lg:grid-cols-[260px_minmax(0,1fr)]
xl:grid-cols-[260px_minmax(0,1fr)_320px]
```

The main column should always use `minmax(0,1fr)` to prevent long text or images from blowing out layout width.

### 9.2 Mobile layout

- Navbar with logo, search icon or compact search, create button, theme toggle, notifications, and avatar menu.
- Hamburger opens a slide-in navigation drawer.
- Right panel hidden on small screens.
- Feed cards stack vertically.
- Comment indentation reduced on small screens.
- Tap targets at least 44px where practical.

### 9.3 Right panel

Context-sensitive:

- On home:
  - Trending communities.
  - Trending posts.
  - App/about card.
- On community:
  - Community description.
  - Member count.
  - Creation date.
  - Join button.
  - Community rules or moderators.
- On post:
  - Community about card.
  - Related posts, optional.

---

## 10. Design System

### 10.1 Visual direction

The UI should feel modern but not gimmicky.

Avoid:

- Purple gradient clichés.
- Overly rounded everything.
- Fake glassmorphism everywhere.
- Excessive shadows.
- Decorative gradients that reduce readability.

Prefer:

- Clear typographic hierarchy.
- Muted neutral surfaces.
- One primary accent color.
- Reddit-like vote orange/red-blue semantics, but refined.
- Soft borders and subtle elevation.
- High-contrast text.

### 10.2 Theme tokens

Define semantic tokens rather than hardcoded component colors.

Examples:

```css
--color-surface
--color-surface-muted
--color-surface-raised
--color-border
--color-text-primary
--color-text-secondary
--color-text-muted
--color-accent
--color-accent-hover
--color-upvote
--color-downvote
--color-danger
--color-success
```

In Tailwind v4, map these into utility-friendly theme variables where appropriate.

### 10.3 Dark mode

Use class-based dark mode.

For Tailwind v4:

```css
@custom-variant dark (&:where(.dark, .dark *));
```

Theme synchronization:

1. Read persisted theme before first paint where possible.
2. Apply `dark` class to `document.documentElement`.
3. Store theme in zustand.
4. Update class whenever theme changes.
5. Respect only explicit light/dark; avoid system ambiguity unless a system option is added.

### 10.4 Typography

Use a clean system or bundled font stack.

Suggested hierarchy:

- Page title: `text-xl sm:text-2xl font-semibold`
- Post title: `text-base sm:text-lg font-semibold`
- Card metadata: `text-xs sm:text-sm text-muted`
- Body text: `text-sm sm:text-base`
- Comment body: `text-sm sm:text-[15px] leading-relaxed`

Line height should be comfortable for reading comments.

### 10.5 Spacing

Use consistent spacing scale:

- Card padding: `p-3 sm:p-4`
- Feed gap: `gap-3` or `gap-4`
- Sidebar section gap: `space-y-6`
- Comment thread indentation: `pl-3 sm:pl-5`
- Modal padding: `p-4 sm:p-6`

Preserve max content width:

```text
max-w-3xl for main feed column
max-w-2xl for post detail reading width
```

### 10.6 Motion

Use motion sparingly:

- Dropdown and modal enter/exit: 120–180ms.
- Vote count tick: subtle scale or y-shift.
- Toast enter/exit: 180–220ms.
- Skeleton shimmer: CSS animation.
- Page transitions optional and lightweight.

Respect:

```css
@media (prefers-reduced-motion: reduce)
```

Disable nonessential animation when reduced motion is preferred.

---

## 11. Feature Design Details

## 11.1 Feed

### Feed sources

Home page should support:

- `Best`
- `Hot`
- `New`
- `Top`
- `Rising`

Feeds can be scoped:

- Home: all posts.
- Popular: high-score posts across communities.
- All: all posts.
- Community: posts for a specific community.

### Sorting

Implement sorting utilities in `utils/score.ts`.

Recommended logic:

- `new`: sort by `createdAt` descending.
- `top`: sort by visible score descending.
- `hot`: combine score and recency.
- `rising`: recent posts with positive vote ratio.
- `best`: deterministic seeded quality plus score.

Always use stable tie-breakers, such as `id`, to prevent list reshuffling.

Example:

```ts
hotScore = visibleScore / Math.pow(ageInHours + 2, 1.4)
```

### Pagination

Use cursor or offset pagination:

- Page size: 10 or 12 posts.
- Maintain current page in component state.
- Reset page when feed source or sort changes.
- Use `hasMore = loadedCount < sortedPosts.length`.

### Infinite scroll

Use `IntersectionObserver`.

Hook requirements:

- Accept a callback.
- Observe a bottom sentinel.
- Disconnect on unmount.
- Avoid duplicate loads.
- Debounce or guard against rapid re-entry.
- Support `enabled` flag.

Loading behavior:

1. Show initial skeletons.
2. Load first page after simulated latency.
3. Show additional skeletons when loading next page.
4. Show end-of-feed message when no more posts.
5. Preserve scroll position when prepending local posts.

Simulated latency:

- Initial feed: 350–600ms.
- Infinite page: 450–750ms.

Do not make latency so long that the app feels broken.

### Post card

Each `PostCard` should show:

- Community icon and name.
- Author and timestamp.
- Flair if present.
- Title.
- Body preview for text posts.
- Image for image posts.
- External domain for link posts.
- Vote control.
- Comment count.
- Save button.
- Share button.

Behavior:

- Click title or card navigates to post page.
- Vote buttons do not trigger navigation.
- Save toggles with toast feedback.
- Share copies URL or shows toast fallback.
- Images use `loading="lazy"` and aspect-ratio boxes.
- Long titles wrap safely.
- Link domains are truncated.

---

## 11.2 Voting

### Vote model

Each post/comment vote is one of:

- Upvote: `1`
- Downvote: `-1`
- No vote: `0`

Toggle behavior:

- If current vote equals selected direction, remove vote.
- Otherwise set vote to selected direction.

### Visible score

```ts
visibleScore = baseScore + userVote
```

Do not mutate `baseScore`.

### UI states

Vote buttons should expose:

- `aria-label`
- `aria-pressed`
- Disabled visual state where appropriate.
- Distinct active upvote/downvote colors.
- Animated score transition.

### Persistence

Persist votes immediately.

No optimistic rollback is needed because there is no server, but the code should still be structured as an optimistic local update.

---

## 11.3 Create Post

### Entry points

- Navbar `Create` button.
- Sidebar button.
- Community header `Create Post` button, with community preselected.

### Modal fields

Required:

- Community selector.
- Post type tabs:
  - Text.
  - Image.
  - Link.
- Title.

Conditional:

- Text body for text posts.
- Image category picker for image posts.
- URL input for link posts.

Validation:

- Community required.
- Title required.
- Title length: 1–300 characters.
- Link URL must be valid URL.
- Text body optional but limited to 10,000 characters.
- Image category required for image posts.

### Submission

On submit:

1. Build a `LocalPost`.
2. Add to store.
3. Show success toast.
4. Close modal.
5. Navigate to new post page or prepend to feed.

New local posts should appear immediately in relevant feeds and community pages.

---

## 11.4 Post Detail Page

### Structure

```text
Post content
Action bar
Comment composer
Comment sort controls, optional
Comment thread
```

Post detail should render a richer version of `PostCard`:

- Full body for text posts.
- Full image.
- Link preview/domain.
- Community info.
- Author info.
- Vote control.
- Save/share.

### Loading states

- Show post skeleton if post is resolved asynchronously.
- Show comment skeleton while comment tree is generating/loading.
- Simulate comment fetch latency once per post.

### Empty states

- No comments: show empty state and composer focus.
- No search results: show helpful empty state.
- Unknown post: show not-found state.

---

## 11.5 Threaded Comments

### Comment item

Each comment should show:

- Author avatar.
- Username.
- Timestamp.
- Body.
- Vote control.
- Reply button.
- Collapse/expand control.
- Nested children.

### Collapse behavior

Collapsing a comment should:

- Hide its entire subtree.
- Show a collapsed preview with author and child count.
- Preserve local state or use component key carefully to avoid losing reply drafts.

### Reply composer

Requirements:

- Appears inline under target comment.
- Supports Ctrl/Cmd+Enter submit.
- Disabled when empty.
- Shows character limit.
- Inserts reply locally and instantly.
- Persists local comment.
- Updates comment count locally if feasible.

### Local comment insertion

New comments should be merged into deterministic generated comments:

- Generated comments are read-only.
- Local comments are stored separately.
- Tree builder merges both by `postId` and `parentId`.
- New comments should sort to top within their parent when created in the current session.

### Comment voting

Same toggle model as post voting.

Persist comment votes.

---

## 11.6 Communities

### Community page

Route:

```text
/r/:communityName
```

Header should include:

- Banner gradient.
- Community icon.
- Title.
- Name.
- Member count.
- Join/leave button.
- Create post button.
- Description preview or full description in right panel.

Feed should be scoped to community posts.

### Join state

- Persist joined communities.
- Sidebar shows joined communities.
- Join button updates instantly.
- Toast feedback on join/leave.

### Unknown community

If route param does not match a community:

- Show `NotFoundPage` or community-specific empty state.

---

## 11.7 Profiles

Route:

```text
/u/:username
```

### Profile header

Show:

- Avatar.
- Display name.
- Username.
- Bio.
- Karma.
- Cake day.
- Follow button optional, not required.

### Tabs

For any user:

- Posts.
- Comments.

For current user:

- Saved.

If implementing a fixed current user, choose one seeded user as the viewer. Make this explicit in the data layer, for example `CURRENT_USER_ID`.

### Profile posts

List posts authored by the user, including local posts created by the viewer.

### Profile comments

List comments authored by the user.

Each comment item in profile should show:

- Comment body.
- Score.
- Timestamp.
- Link to originating post.

### Saved tab

Show saved posts only for current user.

If another user's profile is viewed, do not show Saved tab.

---

## 11.8 Search

### Search sources

Search should match:

- Communities:
  - name.
  - title.
  - description.
  - category.
- Posts:
  - title.
  - body.
  - flair.
  - community name.
  - author username.
- Users:
  - username.
  - display name.
  - bio.

### Normalization

Before matching:

- Lowercase.
- Trim.
- Collapse whitespace.
- Optionally strip punctuation.

Use simple substring or tokenized includes. No external search service needed.

### Navbar search dropdown

Behavior:

- Debounce input 200–250ms.
- Show grouped results.
- Show maximum 5–8 total results.
- Highlight active option.
- Support keyboard navigation:
  - ArrowUp/ArrowDown.
  - Enter.
  - Escape.
- Close on outside click.
- Close on navigation.

### Search page

Route:

```text
/search?q=term&tab=posts
```

Tabs:

- Communities.
- Posts.
- Users.

Requirements:

- Loading skeleton for simulated search latency.
- Empty state for no results.
- Query preserved in URL.
- Tab switch updates URL.
- Result click navigates to entity.

---

## 11.9 Notifications

### Navbar bell

Show:

- Bell icon.
- Unread count badge if greater than zero.
- Cap badge at `9+`.

### Notifications panel

Dropdown panel should show:

- Recent notifications.
- Unread visual distinction.
- Mark all read button.
- Link to full notifications page.

Each notification should show:

- Actor avatar.
- Action text.
- Excerpt or target label.
- Relative timestamp.
- Read/unread state.

Click behavior:

- Mark as read.
- Navigate to target.

### Notifications page

Full list with:

- Filter tabs: All / Unread.
- Mark individual read.
- Mark all read.
- Empty states.

### Persistence

Store `readNotificationIds`.

Unread count:

```ts
notifications.filter(n => !readNotificationIds.includes(n.id)).length
```

---

## 12. Component Inventory

### UI primitives

| Component | Responsibility |
|---|---|
| `Avatar` | Gradient initials, sizes, accessible label |
| `Button` | Variants, sizes, loading/disabled states |
| `IconButton` | Icon-only accessible button |
| `Skeleton` | Block, text, circle, card variants |
| `Dropdown` | Accessible popover menu |
| `Modal` | Focus-trapped dialog |
| `Toaster` | Ephemeral toast stack |
| `Tabs` | Accessible tab navigation |
| `EmptyState` | Friendly empty messages |
| `ErrorState` | Retry-aware error messages |

### Layout components

| Component | Responsibility |
|---|---|
| `AppShell` | Persistent navbar/sidebar/main/right panel |
| `Navbar` | Global top bar |
| `Sidebar` | Desktop nav and communities |
| `MobileNavDrawer` | Mobile nav |
| `RightPanel` | Contextual side information |
| `PageHeader` | Shared page title/header |

### Feed components

| Component | Responsibility |
|---|---|
| `PostCard` | Feed item |
| `PostList` | List rendering and pagination |
| `PostSkeleton` | Loading placeholder |
| `SortTabs` | Feed sort controls |
| `VoteControl` | Shared vote widget |
| `CreatePostModal` | Post creation dialog |
| `FeedEndMessage` | End-of-feed state |

### Post/comment components

| Component | Responsibility |
|---|---|
| `PostDetail` | Full post rendering |
| `CommentThread` | Recursive tree renderer |
| `CommentItem` | Single comment node |
| `CommentComposer` | Reply/create comment input |
| `CommentSkeleton` | Comment loading placeholder |

### Domain components

| Component | Responsibility |
|---|---|
| `CommunityHeader` | Community banner/meta |
| `CommunityAboutCard` | Community description card |
| `JoinButton` | Join/leave action |
| `ProfileHeader` | Profile identity |
| `ProfileTabs` | Profile content tabs |
| `SearchBar` | Navbar live search |
| `SearchResults` | Full search results |
| `NotificationsPanel` | Notifications dropdown |
| `NotificationItem` | Single notification row |

---

## 13. Accessibility Plan

### Required baseline

- WCAG 2.2 AA target.
- Semantic HTML.
- Labels for icon buttons.
- Visible focus states.
- Full keyboard operability.
- Sufficient contrast in both themes.
- Reduced-motion support.

### Specific requirements

1. **Navigation**
   - Skip link to main content.
   - Sidebar links keyboard accessible.
   - Mobile drawer closes on Escape.
   - Focus returns to trigger when drawer/modal closes.

2. **Menus and dropdowns**
   - `aria-expanded` on trigger.
   - `aria-haspopup` where appropriate.
   - Escape closes.
   - Arrow key navigation if menu-like.
   - Outside click closes.

3. **Modal**
   - `role="dialog"`.
   - `aria-modal="true"`.
   - Focus trap.
   - Close on Escape.
   - Prevent background scroll.

4. **Forms**
   - Labels associated with inputs.
   - Error messages linked with `aria-describedby`.
   - Disabled submit when invalid.

5. **Votes**
   - `aria-label="Upvote post"`, etc.
   - `aria-pressed` for active state.

6. **Infinite scroll**
   - Loading status announced politely if needed.
   - End-of-feed message accessible.

7. **Images**
   - Decorative images: `alt=""`.
   - Meaningful images: descriptive alt text.

---

## 14. Performance Plan

### Data generation

- Generate users/communities/posts once at module load.
- Generate comments lazily per post.
- Cache generated comments in memory.
- Avoid regenerating on unrelated renders.

### Rendering

- Use stable `key` values.
- Memoize expensive sorted lists.
- Memoize `PostCard` where appropriate.
- Avoid passing unstable object props into memoized components.
- Keep feed page size bounded.

### Images

- Use local images.
- Set width/height or aspect-ratio to prevent layout shift.
- Use `loading="lazy"` for below-the-fold images.
- Avoid rendering full-size images in tiny thumbnails if separate sizes are available.

### State

- Do not store derived lists in global state.
- Avoid persisting large unnecessary payloads.
- Split persisted store if localStorage size becomes a concern.

### Animations

- Animate only `transform` and `opacity` where possible.
- Avoid layout-triggering animations.
- Respect reduced motion.

---

## 15. Security & Data Safety Plan

Even though this is a client-side demo, maintain secure defaults.

1. **No secrets**
   - Do not add API keys.
   - Do not store credentials.

2. **Input handling**
   - Treat user-entered post/comment text as plain text.
   - Do not use `dangerouslySetInnerHTML`.
   - React escaping is sufficient.

3. **Links**
   - External links should use:
     - `target="_blank"`
     - `rel="noopener noreferrer"`

4. **URL validation**
   - Validate link post URLs.
   - Allow only `http:` and `https:` protocols.

5. **Storage**
   - Do not store sensitive data in localStorage.
   - Version storage schema.
   - Handle corrupt persisted state gracefully.

6. **Images**
   - Avoid remote image fetches.
   - Use local assets or generated placeholders.

---

## 16. Testing & Validation Plan

If a test runner is available, add focused unit tests for high-risk logic.

### Recommended unit tests

1. **`utils/format.ts`**
   - Time ago formatting.
   - Number abbreviation.
   - Edge cases: now, minutes, hours, days, months.

2. **`utils/random.ts`**
   - Deterministic output for same seed.
   - Different output for different seed.
   - Range bounds for `pickInt`.

3. **`utils/score.ts`**
   - Sort stability.
   - Vote-adjusted score.
   - Hot/new/top ordering.

4. **Store vote logic**
   - Upvote toggles off when already upvoted.
   - Downvote replaces upvote.
   - Score adjusts correctly.

5. **Comment insertion**
   - Root comment inserts.
   - Reply inserts under correct parent.
   - Local comments merge with generated comments.

6. **Search utilities**
   - Finds communities by name.
   - Finds posts by title.
   - Finds users by username.
   - Handles empty query.

### Manual verification matrix

If tests cannot be run, use a manual checklist.

Key checks:

- Home feed loads with skeletons.
- Infinite scroll loads next page.
- End-of-feed appears.
- Sort tabs change order.
- Vote state persists after reload.
- Joined communities persist.
- Saved posts persist.
- Created post appears in feed and post page.
- Created reply appears in comment tree.
- Collapsing comment hides children.
- Search dropdown opens and navigates.
- Search page respects query and tab.
- Profile tabs render correct content.
- Notifications unread badge updates.
- Dark mode persists.
- No console errors.
- No horizontal overflow on mobile.
- Keyboard navigation works.

### Verification commands

Use the project’s actual package manager. If using pnpm:

```bash
pnpm install
pnpm exec tsc --noEmit
pnpm lint
pnpm test
pnpm build
pnpm preview
```

If tests are not configured, explicitly report that and provide the manual checklist.

---

## 17. Pre-Mortem: Likely Failure Modes and Mitigations

### 1. Tailwind v4 dark mode misconfiguration

**Risk:** Dark mode classes do not apply.

**Mitigation:**

- Use `@custom-variant dark`.
- Apply `.dark` class to `<html>`.
- Verify both themes manually.
- Avoid hardcoded light-only colors.

---

### 2. Infinite scroll loads duplicate pages

**Risk:** Observer fires multiple times.

**Mitigation:**

- Guard with `isLoading`.
- Disconnect observer while loading.
- Use a `requestId` or mounted flag.
- Reset pagination when sort/feed changes.

---

### 3. Comment tree becomes unstable after reply

**Risk:** New comments appear in wrong place or disappear on navigation.

**Mitigation:**

- Store local comments separately.
- Merge generated and local comments deterministically.
- Use stable IDs.
- Test reply at root, depth 1, and max depth.

---

### 4. Persistence shape changes break app

**Risk:** Old localStorage state crashes new code.

**Mitigation:**

- Version the persisted store.
- Partialize only known fields.
- Wrap rehydration in safe parsing.
- Provide fallback to default state on corruption.

---

### 5. Large generated data causes slow startup

**Risk:** App blocks during initial generation.

**Mitigation:**

- Keep counts bounded.
- Generate comments lazily.
- Avoid expensive repeated sorting.
- Memoize derived feeds.

---

### 6. Images break when served from subpath

**Risk:** `/images/foo.jpg` fails under nested static hosting.

**Mitigation:**

- Use `import.meta.env.BASE_URL`.
- Or import images from `src/assets` if bundler support is preferred.
- Verify built output paths.

---

### 7. Accessibility regressions in custom dropdowns/modals

**Risk:** Menus look fine but are keyboard-inaccessible.

**Mitigation:**

- Build one accessible `Dropdown` primitive.
- Reuse it everywhere.
- Test with keyboard only.
- Add Escape/outside-click/focus management.

---

## 18. Implementation Plan with Detailed ToDo List

The following phases are ordered. Do not move to the next phase until the current phase’s exit checklist is satisfied.

---

# Phase 0 — Workspace, Dependencies, and Tooling

## Objective

Establish a known-good project baseline.

## ToDo

- [ ] Confirm package manager and lockfile.
- [ ] Install required dependencies:
  - `react-router-dom`
  - `zustand`
  - `lucide-react`
  - `framer-motion`
- [ ] Confirm Tailwind CSS v4 setup.
- [ ] Confirm TypeScript strict mode.
- [ ] Confirm lint/format setup, if present.
- [ ] Add scripts if missing:
  - `dev`
  - `build`
  - `preview`
  - `typecheck`
  - `lint`
  - `test`, if adding tests
- [ ] Decide whether output is normal static hosting or true single-file artifact.
- [ ] If single-file, plan image inlining strategy.

## Exit checklist

- [ ] Dependencies installed through package manager.
- [ ] Lockfile updated by package manager only.
- [ ] App starts in dev mode.
- [ ] Build command succeeds or existing failure is documented.
- [ ] No manual edits to `package.json` or lockfile.
- [ ] Hosting strategy decided.

---

# Phase 1 — Global Styles, Theme Tokens, and Base CSS

## Objective

Create the visual foundation.

## ToDo

- [ ] Configure Tailwind entry.
- [ ] Add Tailwind v4 dark variant:
  - `@custom-variant dark (&:where(.dark, .dark *));`
- [ ] Define CSS variables for light theme.
- [ ] Define `.dark` overrides.
- [ ] Map semantic color variables into Tailwind theme if desired.
- [ ] Configure base typography.
- [ ] Configure body background and text color.
- [ ] Add global focus-visible styles.
- [ ] Add custom scrollbar styles, subtle and non-breaking.
- [ ] Add reduced-motion support.
- [ ] Add skeleton shimmer keyframes.
- [ ] Add toast animation keyframes if not using framer-motion for toasts.
- [ ] Ensure font stack is clean and readable.

## Exit checklist

- [ ] Light and dark variables exist.
- [ ] No hardcoded critical colors in components.
- [ ] Focus rings visible.
- [ ] Body uses semantic background/text tokens.
- [ ] Reduced-motion query present.
- [ ] CSS compiles without warnings.

---

# Phase 2 — Domain Types and Core Utilities

## Objective

Define stable contracts used everywhere else.

## ToDo

- [ ] Create `src/types/index.ts`.
- [ ] Define `User`.
- [ ] Define `Community`.
- [ ] Define `Post`.
- [ ] Define `Comment`.
- [ ] Define `Notification`.
- [ ] Define `SortMode`.
- [ ] Define `VoteDirection`.
- [ ] Define `Toast`.
- [ ] Define local post/comment variants.
- [ ] Create `src/utils/random.ts`.
- [ ] Implement seeded RNG.
- [ ] Implement string hash.
- [ ] Implement deterministic pick helpers.
- [ ] Implement hue/color helper for avatars/icons.
- [ ] Create `src/utils/format.ts`.
- [ ] Implement `formatTimeAgo`.
- [ ] Implement `formatNumber`.
- [ ] Implement `formatDate`.
- [ ] Create `src/utils/score.ts`.
- [ ] Implement visible score helper.
- [ ] Implement feed sort functions.
- [ ] Create `src/utils/search.ts`.
- [ ] Implement normalization helper.
- [ ] Implement entity search helpers.

## Exit checklist

- [ ] Types compile.
- [ ] No `any` used.
- [ ] RNG is deterministic.
- [ ] Formatting helpers handle empty/null values.
- [ ] Sort helpers are pure.
- [ ] Search normalization trims/lowercases input.
- [ ] Unit tests added or manual checks documented.

---

# Phase 3 — Deterministic Dummy Data Layer

## Objective

Generate realistic, stable content.

## ToDo

## Images

- [ ] Create `src/data/images.ts`.
- [ ] Map category slugs to local image paths.
- [ ] Use base URL helper for paths.
- [ ] Provide fallback image path.

## Users

- [ ] Create `src/data/users.ts`.
- [ ] Generate 48 users.
- [ ] Ensure unique usernames.
- [ ] Add realistic bios.
- [ ] Add karma and cake day.
- [ ] Export `CURRENT_USER_ID`.
- [ ] Export `getUserById` and `getUserByUsername`.

## Communities

- [ ] Create `src/data/communities.ts`.
- [ ] Generate 18 communities.
- [ ] Assign categories.
- [ ] Add descriptions.
- [ ] Add deterministic member counts.
- [ ] Export `getCommunityById` and `getCommunityByName`.

## Content pools

- [ ] Create content pools per category/community.
- [ ] Include post titles.
- [ ] Include post bodies.
- [ ] Include comment bodies.
- [ ] Avoid lorem ipsum.
- [ ] Keep tone realistic.

## Posts

- [ ] Create `src/data/posts.ts`.
- [ ] Generate 320 posts.
- [ ] Assign each post to a community.
- [ ] Assign author.
- [ ] Assign type:
  - text.
  - image.
  - link.
- [ ] Add community-aware titles.
- [ ] Add bodies for text posts.
- [ ] Add local image paths for image posts.
- [ ] Add safe link domains for link posts.
- [ ] Add flairs where appropriate.
- [ ] Generate timestamps across past 30 days.
- [ ] Generate base scores and upvote ratios.
- [ ] Generate comment counts.
- [ ] Export post lookup helpers.
- [ ] Export feed filtering/sorting helpers.

## Comments

- [ ] Create `src/data/comments.ts`.
- [ ] Generate comments deterministically per post.
- [ ] Cache generated comments by `postId`.
- [ ] Build threaded tree.
- [ ] Limit max depth to 5.
- [ ] Use stable comment IDs.
- [ ] Export `getCommentTreeForPost(postId)`.

## Notifications

- [ ] Create `src/data/notifications.ts`.
- [ ] Generate 18–24 notifications.
- [ ] Ensure actor IDs are valid.
- [ ] Ensure target IDs are valid.
- [ ] Create notification text snippets.
- [ ] Export notifications list and helpers.

## Exit checklist

- [ ] All entities have stable IDs.
- [ ] No dangling foreign keys.
- [ ] Post communities and authors resolve.
- [ ] Comment authors and posts resolve.
- [ ] Notifications resolve to valid targets.
- [ ] Same seed produces same data.
- [ ] Generated content feels realistic.
- [ ] No runtime image/network dependency.

---

# Phase 4 — Global Store and Persistence

## Objective

Implement persistent local app state.

## ToDo

- [ ] Create `src/store/store.ts`.
- [ ] Add theme state.
- [ ] Add post/comment vote maps.
- [ ] Add joined communities.
- [ ] Add saved posts.
- [ ] Add local posts.
- [ ] Add local comments.
- [ ] Add read notification IDs.
- [ ] Add ephemeral toasts.
- [ ] Implement vote toggle actions.
- [ ] Implement join/save toggles.
- [ ] Implement local post/comment insertion.
- [ ] Implement notification read actions.
- [ ] Implement toast push/dismiss.
- [ ] Configure `persist`.
- [ ] Partialize state to exclude toasts.
- [ ] Add storage version.
- [ ] Add migration placeholder.
- [ ] Create `src/store/selectors.ts`.
- [ ] Add derived selectors.

## Exit checklist

- [ ] Theme persists.
- [ ] Votes persist.
- [ ] Joins persist.
- [ ] Saved posts persist.
- [ ] Local posts persist.
- [ ] Local comments persist.
- [ ] Notification read state persists.
- [ ] Toasts are not persisted.
- [ ] Store uses typed actions.
- [ ] No mutation of generated seed entities.

---

# Phase 5 — Hooks

## Objective

Create reusable behavior hooks.

## ToDo

- [ ] Create `src/hooks/index.ts`.
- [ ] Implement `useDebounce`.
- [ ] Implement `useOnClickOutside`.
- [ ] Implement `useMediaQuery`.
- [ ] Implement `useInfiniteScroll`.
- [ ] Implement `useTheme`.
- [ ] Ensure cleanup on unmount.
- [ ] Ensure hooks are typed.

## Exit checklist

- [ ] Debounce cancels on unmount.
- [ ] Outside click ignores contained clicks.
- [ ] Infinite scroll supports enabled/disabled.
- [ ] Infinite scroll prevents duplicate fetches.
- [ ] Theme hook syncs document class.
- [ ] No memory leaks.

---

# Phase 6 — UI Primitives

## Objective

Build accessible shared components.

## ToDo

## Avatar

- [ ] Create `Avatar`.
- [ ] Support sizes:
  - xs.
  - sm.
  - md.
  - lg.
- [ ] Render initials.
- [ ] Use deterministic gradient from hue.
- [ ] Support accessible label.

## Button and IconButton

- [ ] Create `Button`.
- [ ] Variants:
  - primary.
  - secondary.
  - outline.
  - ghost.
  - danger.
- [ ] Sizes:
  - sm.
  - md.
  - lg.
- [ ] Disabled state.
- [ ] Loading state.
- [ ] Create `IconButton` with required `aria-label`.

## Skeleton

- [ ] Create `Skeleton`.
- [ ] Add shape variants.
- [ ] Add post skeleton composition.
- [ ] Add comment skeleton composition.

## Dropdown

- [ ] Create accessible dropdown primitive.
- [ ] Trigger state.
- [ ] Outside click.
- [ ] Escape close.
- [ ] Keyboard navigation if menu-like.
- [ ] Proper z-index.

## Modal

- [ ] Create accessible modal.
- [ ] Focus trap.
- [ ] Escape close.
- [ ] Overlay click close, if appropriate.
- [ ] Scroll lock.
- [ ] Prevent layout shift.

## Toaster

- [ ] Create toast stack.
- [ ] Support success/info/error.
- [ ] Auto-dismiss.
- [ ] Dismiss button.
- [ ] Accessible live region if practical.

## Tabs

- [ ] Create accessible tabs primitive.
- [ ] Keyboard arrow support.
- [ ] Active indicator.

## Empty/Error states

- [ ] Create `EmptyState`.
- [ ] Create `ErrorState`.
- [ ] Support retry action.

## Exit checklist

- [ ] All primitives typed.
- [ ] No hardcoded theme colors.
- [ ] Focus visible.
- [ ] Buttons support disabled/loading.
- [ ] Dropdown closes correctly.
- [ ] Modal traps focus.
- [ ] Toasts auto-dismiss.
- [ ] Skeletons match final layout dimensions reasonably.

---

# Phase 7 — Layout Shell

## Objective

Build the persistent responsive app frame.

## ToDo

## Navbar

- [ ] Create `Navbar`.
- [ ] Add logo/home link.
- [ ] Add mobile hamburger.
- [ ] Add search entry point.
- [ ] Add create post button.
- [ ] Add theme toggle.
- [ ] Add notifications bell.
- [ ] Add avatar menu.
- [ ] Make navbar sticky.
- [ ] Ensure correct z-index.

## Sidebar

- [ ] Create `Sidebar`.
- [ ] Add Home.
- [ ] Add Popular.
- [ ] Add All.
- [ ] Add Notifications.
- [ ] Add Profile.
- [ ] Add joined communities list.
- [ ] Add empty state for no joined communities.
- [ ] Add create community button optional.
- [ ] Highlight active route.

## Mobile drawer

- [ ] Create `MobileNavDrawer`.
- [ ] Reuse sidebar navigation content.
- [ ] Add overlay.
- [ ] Add close button.
- [ ] Close on route change.
- [ ] Close on Escape.
- [ ] Trap focus or at least manage focus safely.

## Right panel

- [ ] Create `RightPanel`.
- [ ] Support home context.
- [ ] Support community context.
- [ ] Support post context.
- [ ] Hide below `xl`.

## AppShell

- [ ] Create `AppShell`.
- [ ] Render navbar.
- [ ] Render sidebar on desktop.
- [ ] Render drawer on mobile.
- [ ] Render main outlet.
- [ ] Render right panel conditionally.
- [ ] Add skip-to-content link.
- [ ] Ensure main content has max width and safe padding.

## Exit checklist

- [ ] Navbar responsive at mobile/tablet/desktop.
- [ ] Sidebar visible on desktop.
- [ ] Drawer works on mobile.
- [ ] Active route highlighted.
- [ ] Theme toggle accessible.
- [ ] Avatar menu accessible.
- [ ] No horizontal scroll.
- [ ] Layout remains stable with long content.

---

# Phase 8 — Feed, Voting, Infinite Scroll, Create Post

## Objective

Deliver the primary browsing experience.

## ToDo

## VoteControl

- [ ] Create shared `VoteControl`.
- [ ] Support horizontal and vertical layouts.
- [ ] Support post and comment modes.
- [ ] Connect to store.
- [ ] Animate score change subtly.
- [ ] Add `aria-pressed`.
- [ ] Prevent click propagation inside cards.

## PostCard

- [ ] Create `PostCard`.
- [ ] Show metadata.
- [ ] Show title.
- [ ] Show body preview.
- [ ] Show image.
- [ ] Show link domain.
- [ ] Show vote control.
- [ ] Show comment count.
- [ ] Show save button.
- [ ] Show share button.
- [ ] Make entire card clickable safely.
- [ ] Ensure vote/save/share do not trigger navigation.
- [ ] Add image aspect ratio.
- [ ] Add lazy loading.
- [ ] Add hover/focus states.

## SortTabs

- [ ] Create `SortTabs`.
- [ ] Support `best`, `hot`, `new`, `top`, `rising`.
- [ ] Sync with URL query param.
- [ ] Preserve selected tab across navigation where appropriate.

## PostList

- [ ] Create `PostList`.
- [ ] Accept sorted posts.
- [ ] Manage page state.
- [ ] Render first page.
- [ ] Render sentinel.
- [ ] Render skeletons.
- [ ] Render end-of-feed state.
- [ ] Reset when source/sort changes.

## useInfiniteScroll integration

- [ ] Hook observer to sentinel.
- [ ] Guard duplicate loads.
- [ ] Add simulated latency.
- [ ] Cleanup on unmount.

## CreatePostModal

- [ ] Create modal.
- [ ] Add community selector.
- [ ] Add post type tabs.
- [ ] Add title input.
- [ ] Add text body input.
- [ ] Add link URL input.
- [ ] Add image category picker.
- [ ] Validate form.
- [ ] Submit to store.
- [ ] Show toast.
- [ ] Navigate or prepend.
- [ ] Reset form after submit.

## Exit checklist

- [ ] Initial feed shows skeletons.
- [ ] Feed loads first page.
- [ ] Infinite scroll loads next page.
- [ ] No duplicate posts appear.
- [ ] End-of-feed appears.
- [ ] Sort modes change ordering.
- [ ] Votes update immediately.
- [ ] Votes persist after reload.
- [ ] Save toggles persist.
- [ ] Created post appears.
- [ ] Create post validation works.
- [ ] No layout overflow from long titles.

---

# Phase 9 — Post Detail and Threaded Comments

## Objective

Implement full post and comment experience.

## ToDo

## PostPage

- [ ] Resolve post by route param.
- [ ] Show not-found state for invalid post.
- [ ] Render full post.
- [ ] Render action bar.
- [ ] Render comment composer.
- [ ] Render comment thread.
- [ ] Add comment loading skeletons.
- [ ] Simulate comment load latency.

## CommentThread

- [ ] Build tree from generated + local comments.
- [ ] Render recursively.
- [ ] Support collapse/expand.
- [ ] Indent children.
- [ ] Limit excessive indentation on mobile.
- [ ] Show child count when collapsed.

## CommentItem

- [ ] Render avatar.
- [ ] Render author.
- [ ] Render timestamp.
- [ ] Render body.
- [ ] Render vote control.
- [ ] Render reply button.
- [ ] Render collapse control.

## CommentComposer

- [ ] Root composer at top.
- [ ] Inline reply composer.
- [ ] Disable when empty.
- [ ] Support Ctrl/Cmd+Enter.
- [ ] Add character limit.
- [ ] Clear after submit.
- [ ] Insert local comment.

## Exit checklist

- [ ] Post page loads valid post.
- [ ] Invalid post shows not-found.
- [ ] Comment tree renders nested correctly.
- [ ] Collapse hides subtree.
- [ ] Reply appears under correct parent.
- [ ] New comments persist after reload.
- [ ] Comment votes persist.
- [ ] Comment count updates reasonably.
- [ ] Mobile indentation remains usable.
- [ ] No console errors.

---

# Phase 10 — Communities, Profiles, Search, Notifications

## Objective

Complete secondary product surfaces.

## Communities

- [ ] Create `CommunityHeader`.
- [ ] Resolve community by route param.
- [ ] Show banner/icon/title/description.
- [ ] Show member count.
- [ ] Add join/leave button.
- [ ] Add create post button.
- [ ] Scope feed to community.
- [ ] Show empty state for no posts.
- [ ] Show not-found for invalid community.

## Profiles

- [ ] Create `ProfileHeader`.
- [ ] Resolve user by username.
- [ ] Show avatar, display name, username.
- [ ] Show bio.
- [ ] Show karma.
- [ ] Show cake day.
- [ ] Add tabs.
- [ ] Posts tab shows authored posts.
- [ ] Comments tab shows authored comments.
- [ ] Saved tab shows current user's saved posts.
- [ ] Hide saved tab for other users.
- [ ] Show empty states.

## Search

- [ ] Implement search utility.
- [ ] Create `SearchBar`.
- [ ] Add debounce.
- [ ] Add grouped dropdown results.
- [ ] Add keyboard navigation.
- [ ] Add outside click close.
- [ ] Navigate on result select.
- [ ] Create `SearchPage`.
- [ ] Read `q` and `tab` params.
- [ ] Add tabs:
  - Communities.
  - Posts.
  - Users.
- [ ] Add loading skeletons.
- [ ] Add empty states.
- [ ] Preserve query in URL.

## Notifications

- [ ] Add notifications selector.
- [ ] Compute unread count.
- [ ] Add navbar bell badge.
- [ ] Create `NotificationsPanel`.
- [ ] Show recent notifications.
- [ ] Mark read on click.
- [ ] Add mark all read.
- [ ] Link to notifications page.
- [ ] Create `NotificationsPage`.
- [ ] Add all/unread tabs.
- [ ] Add individual read action.
- [ ] Add mark all read.
- [ ] Add empty states.

## Exit checklist

- [ ] Community page feed is scoped correctly.
- [ ] Join state persists.
- [ ] Invalid community handled.
- [ ] Profile tabs show correct entities.
- [ ] Saved tab only for current user.
- [ ] Search dropdown works.
- [ ] Search page results match query.
- [ ] Search tabs update URL.
- [ ] Notifications unread badge updates.
- [ ] Mark all read works.
- [ ] Notification navigation works.

---

# Phase 11 — Animation, Polish, Empty/Error States

## Objective

Raise the UI to production polish.

## ToDo

- [ ] Add page transition subtlety if desired.
- [ ] Add dropdown/modal enter/exit animations.
- [ ] Add toast animations.
- [ ] Add vote count animation.
- [ ] Add hover states.
- [ ] Add active/pressed states.
- [ ] Add disabled states.
- [ ] Add skeleton shimmer.
- [ ] Verify empty states:
  - No posts.
  - No comments.
  - No saved posts.
  - No search results.
  - No notifications.
  - No joined communities.
- [ ] Verify error states:
  - Invalid route.
  - Invalid post.
  - Invalid community.
  - Invalid user.
- [ ] Add retry affordance where simulated failure exists.
- [ ] Ensure consistent spacing.
- [ ] Ensure consistent border radius.
- [ ] Ensure consistent typography.
- [ ] Ensure consistent icon sizes.
- [ ] Ensure dark mode parity.
- [ ] Ensure reduced-motion support.

## Exit checklist

- [ ] Animations are subtle and smooth.
- [ ] Reduced motion respected.
- [ ] Empty states are friendly and clear.
- [ ] Error states are clear.
- [ ] Spacing feels consistent.
- [ ] Typography hierarchy clear.
- [ ] Dark mode does not degrade contrast.
- [ ] No visual overflow.
- [ ] No dead buttons.

---

# Phase 12 — Accessibility, Responsiveness, and QA

## Objective

Validate the app as a real product.

## ToDo

## Accessibility pass

- [ ] Keyboard-only walkthrough.
- [ ] Focus visible everywhere.
- [ ] Skip link works.
- [ ] Labels on icon buttons.
- [ ] Modal focus trap.
- [ ] Drawer focus management.
- [ ] Dropdown accessibility.
- [ ] Form error association.
- [ ] Alt text checked.
- [ ] Contrast checked in light/dark.
- [ ] Reduced motion checked.

## Responsive pass

- [ ] Test 320px width.
- [ ] Test 375px width.
- [ ] Test 768px width.
- [ ] Test 1024px width.
- [ ] Test 1440px width.
- [ ] Test long usernames.
- [ ] Test long post titles.
- [ ] Test long comments.
- [ ] Test long community names.
- [ ] Test deep comment threads.
- [ ] Test no horizontal scroll.

## Functional QA

- [ ] Feed loads.
- [ ] Feed infinite scroll works.
- [ ] Sorts work.
- [ ] Votes persist.
- [ ] Saves persist.
- [ ] Joins persist.
- [ ] Create post works.
- [ ] Create comment works.
- [ ] Comment collapse works.
- [ ] Search dropdown works.
- [ ] Search page works.
- [ ] Profiles work.
- [ ] Notifications work.
- [ ] Theme persists.
- [ ] Reload preserves state.
- [ ] Deep links work.
- [ ] 404 works.

## Exit checklist

- [ ] No console errors.
- [ ] No type errors.
- [ ] No lint errors, or explicitly documented exceptions.
- [ ] Build succeeds.
- [ ] Manual QA matrix passes.
- [ ] Accessibility baseline passes.
- [ ] Responsive baseline passes.

---

# Phase 13 — Build, Documentation, and Delivery

## Objective

Close the loop cleanly.

## ToDo

- [ ] Run typecheck.
- [ ] Run lint.
- [ ] Run tests if present.
- [ ] Run build.
- [ ] Run preview and smoke test.
- [ ] Remove scratch files.
- [ ] Remove debug logs.
- [ ] Remove commented-out code.
- [ ] Verify no placeholder text.
- [ ] Verify no fake broken links.
- [ ] Update README if project expects it.
- [ ] Document storage schema version if relevant.
- [ ] Note any intentional limitations.

## Exit checklist

- [ ] Build output clean.
- [ ] No secrets.
- [ ] No TODOs.
- [ ] No console noise.
- [ ] README/docs updated where applicable.
- [ ] Final artifacts in correct location.
- [ ] Remaining known issues listed, if any.

---

## 19. Suggested Commit Grouping

If working in Git, keep commits atomic.

Suggested sequence:

1. `chore: add app dependencies and tooling`
2. `feat: add theme tokens and global styles`
3. `feat: add domain types and core utilities`
4. `feat: add deterministic users, communities, and posts`
5. `feat: add comment and notification generators`
6. `feat: add persisted app store`
7. `feat: add reusable hooks`
8. `feat: add accessible UI primitives`
9. `feat: add responsive app shell`
10. `feat: add feed with infinite scroll and voting`
11. `feat: add post detail and threaded comments`
12. `feat: add communities, profiles, search, and notifications`
13. `feat: add polish, animations, and accessibility improvements`
14. `chore: verify build and clean up delivery`

Avoid bundling unrelated changes into a single commit.

---

## 20. Final Definition of Done

The implementation is done when all of the following are true:

- [ ] App renders home feed with infinite scroll.
- [ ] Feed supports multiple sort modes.
- [ ] Post cards show realistic content and media.
- [ ] Voting works and persists.
- [ ] Saved posts work and persist.
- [ ] Joined communities work and persist.
- [ ] Post detail page loads correctly.
- [ ] Threaded comments render recursively.
- [ ] Replies can be added locally and persist.
- [ ] Comment collapse works.
- [ ] Community pages work.
- [ ] Profiles work.
- [ ] Search works across communities, posts, and users.
- [ ] Notifications panel and page work.
- [ ] Unread badge updates correctly.
- [ ] Dark mode works and persists.
- [ ] Mobile drawer navigation works.
- [ ] Skeleton loading states appear where needed.
- [ ] Empty and error states are handled.
- [ ] Animations are smooth and reduced-motion aware.
- [ ] Accessibility baseline passes.
- [ ] TypeScript strict compilation passes.
- [ ] Build passes.
- [ ] No console errors.
- [ ] No placeholder content remains.
- [ ] No secrets or debug artifacts remain.

---

## 21. Confidence and Verification Note

This is an implementation plan, not executed code.

- **Architecture confidence:** Reasoned.
- **Feature completeness confidence:** Reasoned.
- **Runtime/build verification:** Not performed in this planning response.

Before implementation begins, the actual repository state, package manager, Tailwind version, and existing project conventions should be inspected. If any existing convention conflicts with this plan, follow precedence in this order:

1. Explicit user instructions.
2. Existing project conventions.
3. This plan.
