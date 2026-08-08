# Refined Production Plan — Reddit Clone

This is a refined, implementation-ready architecture and delivery plan based on your draft. It tightens the codebase structure, clarifies state boundaries, improves data consistency, and adds stronger accessibility, resilience, and verification gates.

Because no existing repository was provided, this plan assumes a greenfield SPA:

- Vite + React + TypeScript
- Tailwind CSS v4
- Client-side routing
- Deterministic dummy data
- Local persistence via `localStorage`
- Static hosting, with `HashRouter` unless an existing routing strategy is already established

If an existing codebase is present, existing project conventions take precedence over this plan.

---

## 1. Planning Position and Precedence

This is a planning artifact, not executed implementation.

### Precedence

1. Explicit user requirements in the current request.
2. Existing repository conventions, if any.
3. This refined plan.
4. General frontend best practices.

### Delivery assumption

The default implementation target is a normal static-hosted SPA, not a true single-file HTML artifact.

If a single-file artifact is required:

- Replace local image assets with inline SVG/CSS-generated visuals or bundled data URIs.
- Avoid binary JPG/PNG assets.
- Keep persistence guarded because sandboxed environments may block `localStorage`.

---

## 2. Key Refinements to the Draft Plan

The following improvements are introduced over the draft:

1. **Feature-sliced frontend architecture**
   - Clear separation between `core`, `state`, `data`, `ui`, `features`, and `pages`.
   - Reduces coupling as the app grows.

2. **Separation of persisted state and ephemeral UI state**
   - Persistent domain/user state in one store.
   - Ephemeral UI state, such as toasts, drawer visibility, and open modals, in a separate non-persisted store.

3. **Repository layer over seed data**
   - Data generation remains deterministic.
   - Components do not directly access raw seed arrays.
   - Makes future backend substitution easier.

4. **Stronger comment-count consistency**
   - Post seed data includes a deterministic base comment count.
   - Lazy comment generator must generate exactly that number of base comments.
   - Local comments are merged at read time.

5. **Explicit storage validation**
   - Persisted state is treated as untrusted.
   - Corrupt or stale storage falls back safely to defaults.

6. **Accessible overlay strategy**
   - Use vetted headless primitives where practical, for example Radix UI primitives, for dialogs, menus, tabs, and toasts.
   - If dependencies are restricted, equivalent custom primitives must meet the same keyboard and ARIA behavior.

7. **Explicit route and query-param contracts**
   - Feed sort, search query, search tab, and notification filter are URL-driven.
   - Improves deep linking, refresh behavior, and back/forward navigation.

8. **Stronger QA gates**
   - Accessibility pass, responsive pass, performance pass, and persistence pass are explicit phases.
   - Final delivery requires evidence or explicit verification notes.

---

# 3. Product Scope

## 3.1 Core product surfaces

The application includes:

1. App shell
   - Top navbar
   - Left sidebar on desktop
   - Mobile navigation drawer
   - Optional right panel on large screens

2. Feed
   - Home feed
   - Popular feed
   - All feed
   - Community feed
   - Infinite scrolling
   - Skeleton loading
   - End-of-feed state

3. Posts
   - Text posts
   - Image posts
   - Link posts
   - Upvote/downvote
   - Save
   - Share
   - Create post modal
   - Post detail page

4. Comments
   - Threaded comments
   - Nested replies
   - Collapse/expand
   - Reply composer
   - Local comment insertion
   - Comment voting

5. Communities
   - Community page
   - Join/leave
   - Community metadata
   - Community-scoped feed
   - About panel

6. Profiles
   - User profile
   - Karma
   - Cake day
   - Bio
   - Posts tab
   - Comments tab
   - Saved tab for current user only

7. Search
   - Navbar live search
   - Full search results page
   - Communities, posts, and users results
   - Query-param support

8. Notifications
   - Navbar bell
   - Unread badge
   - Dropdown panel
   - Full notifications page
   - Mark read
   - Mark all read
   - Persistent read state

9. Theme
   - Light mode
   - Dark mode
   - Persistent theme
   - No incorrect-theme flash

10. Polish
   - Smooth restrained animations
   - Loading states
   - Empty states
   - Error states
   - Reduced-motion support
   - Responsive layout

---

## 3.2 Explicit non-goals

Unless later requested, this build does not include:

- Real backend
- Real authentication
- Real file uploads
- Real-time updates
- Moderation tools
- Messaging
- Analytics
- Server-side rendering
- Internationalization
- End-to-end test automation

The app should still be architected so that a future backend can replace the local data layer with minimal UI changes.

---

# 4. Recommended Stack

| Concern | Choice | Notes |
|---|---|---|
| Language | TypeScript strict | No `any` in final code |
| Framework | React | Required |
| Build tool | Vite | Static-friendly, fast |
| Routing | `react-router-dom` | `HashRouter` default |
| Styling | Tailwind CSS v4 | Semantic tokens, dark variant |
| Global persisted state | `zustand` | With persistence middleware |
| Icons | `lucide-react` | Clean, tree-shakeable |
| Animation | `framer-motion` | Restrained micro-interactions |
| Accessible primitives | Radix UI or equivalent | Dialog, dropdown, tabs, toast |
| Utilities | `clsx`, `tailwind-merge` | Class composition helper |
| Testing | Vitest + Testing Library | If test setup is allowed |

### Suggested runtime dependencies

Use the project package manager. Do not hand-edit `package.json` or lockfiles.

Likely runtime dependencies:

```text
react
react-dom
react-router-dom
zustand
lucide-react
framer-motion
@radix-ui/react-dialog
@radix-ui/react-dropdown-menu
@radix-ui/react-tabs
@radix-ui/react-toast
clsx
tailwind-merge
```

If dependency count must be minimized, Radix packages can be replaced by carefully implemented custom primitives, but accessibility verification becomes more expensive.

---

# 5. Final Target Codebase Architecture

## 5.1 Architectural principles

The final codebase should be:

1. **Feature-sliced**
   - Features own their domain components.
   - Shared UI lives in a reusable UI layer.
   - Core utilities and types are isolated.

2. **Data-normalized**
   - Entities reference each other by stable IDs.
   - Components do not embed duplicated entity data.

3. **Read-model driven**
   - Seed data is immutable.
   - Local mutations are stored separately.
   - Read models merge seed and local data at selector/repository time.

4. **UI-state separated**
   - Persistent user/domain state is not mixed with transient UI state.

5. **Deterministic by default**
   - Generated content is stable across reloads.
   - Randomness is seeded.
   - IDs are stable.

6. **Resilient**
   - Corrupt persisted state is handled gracefully.
   - Missing entities render not-found states.
   - External links are safe.
   - Images have fallbacks.

---

## 5.2 Target directory structure

```text
src/
  main.tsx
  vite-env.d.ts

  app/
    App.tsx
    router.tsx
    routes.tsx
    AppShell.tsx
    ErrorBoundary.tsx
    LazyPageFallback.tsx
    ThemeBootstrap.tsx

  styles/
    index.css

  core/
    types/
      entities.ts
      feed.ts
      ui.ts
      index.ts

    constants/
      app.ts
      routes.ts
      layout.ts
      index.ts

    utils/
      cn.ts
      id.ts
      random.ts
      format.ts
      score.ts
      search.ts
      url.ts
      storage.ts
      asset.ts
      index.ts

    hooks/
      useDebouncedValue.ts
      useMediaQuery.ts
      useOnClickOutside.ts
      useInfiniteScroll.ts
      usePrefersReducedMotion.ts
      useCopyToClipboard.ts
      useTheme.ts
      index.ts

  state/
    persistedStore.ts
    uiStore.ts
    selectors.ts
    persistence.ts
    theme.ts

  data/
    content/
      categories.ts
      titles.ts
      bodies.ts
      comments.ts
      flairs.ts
      index.ts

    seed/
      users.ts
      communities.ts
      posts.ts
      comments.ts
      notifications.ts
      index.ts

    repositories/
      users.ts
      communities.ts
      posts.ts
      comments.ts
      notifications.ts
      search.ts
      index.ts

  ui/
    primitives/
      Avatar.tsx
      Badge.tsx
      Button.tsx
      Card.tsx
      IconButton.tsx
      Input.tsx
      Textarea.tsx
      Select.tsx
      Skeleton.tsx
      Tabs.tsx
      Spinner.tsx

    overlays/
      Modal.tsx
      Dropdown.tsx
      Toaster.tsx

    feedback/
      EmptyState.tsx
      ErrorState.tsx
      PageLoadingState.tsx

    navigation/
      NavLinkItem.tsx
      SkipLink.tsx

  features/
    layout/
      Navbar.tsx
      Sidebar.tsx
      MobileNavDrawer.tsx
      RightPanel.tsx
      UserMenu.tsx
      ThemeToggle.tsx

    feed/
      PostCard.tsx
      PostList.tsx
      PostSkeleton.tsx
      SortTabs.tsx
      VoteControl.tsx
      CreatePostModal.tsx
      FeedEndMessage.tsx
      FeedToolbar.tsx

    post/
      PostDetail.tsx
      PostActions.tsx
      PostMedia.tsx
      PostLinkPreview.tsx
      PostNotFound.tsx

    comments/
      CommentThread.tsx
      CommentItem.tsx
      CommentComposer.tsx
      CommentSkeleton.tsx
      CommentCollapsedSummary.tsx

    communities/
      CommunityHeader.tsx
      CommunityAboutCard.tsx
      JoinButton.tsx
      CommunityNotFound.tsx

    profiles/
      ProfileHeader.tsx
      ProfileTabs.tsx
      ProfilePostList.tsx
      ProfileCommentList.tsx
      ProfileNotFound.tsx

    search/
      SearchBar.tsx
      SearchDropdown.tsx
      SearchResults.tsx
      SearchTabs.tsx
      SearchEmptyState.tsx

    notifications/
      NotificationsBell.tsx
      NotificationsPanel.tsx
      NotificationItem.tsx
      NotificationsPageList.tsx
      NotificationEmptyState.tsx

  pages/
    HomePage.tsx
    CommunityPage.tsx
    PostPage.tsx
    ProfilePage.tsx
    SearchPage.tsx
    NotificationsPage.tsx
    NotFoundPage.tsx

  test/
    setup.ts
    utils.ts

public/
  images/
    category-nature.svg
    category-technology.svg
    category-gaming.svg
    category-food.svg
    category-space.svg
    category-art.svg
    category-animals.svg
    category-sports.svg
    fallback-post.svg
```

### Structural rules

- `core` may not import from `features`, `pages`, `state`, or `data`.
- `data` may import from `core`, but not from UI, state, or features.
- `state` may import from `core` and `data` types, but should not import feature components.
- `ui` may import from `core`, but not from feature logic.
- `features` may import from `core`, `state`, `data/repositories`, and `ui`.
- `pages` compose features and handle route-level concerns.

---

# 6. Domain Model

## 6.1 Core entity types

```ts
type ID = string;

type ThemeMode = "light" | "dark";

type FeedSource = "home" | "popular" | "all" | "community";

type SortMode = "best" | "hot" | "new" | "top" | "rising";

type VoteDirection = 1 | -1;

type StoredVote = VoteDirection | 0;

type PostType = "text" | "image" | "link";

type NotificationKind =
  | "reply"
  | "upvote"
  | "mention"
  | "community"
  | "trending";

type NotificationTargetType =
  | "post"
  | "comment"
  | "community"
  | "user";

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

interface LocalPost extends Post {
  isLocal: true;
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

interface LocalComment extends Comment {
  isLocal: true;
}

interface Notification {
  id: ID;
  kind: NotificationKind;
  actorId: ID;
  targetType: NotificationTargetType;
  targetId: ID;
  targetPostId?: ID;
  excerpt?: string;
  createdAt: string;
}
```

## 6.2 Comment tree type

```ts
interface CommentTreeNode {
  comment: Comment;
  children: CommentTreeNode[];
}
```

## 6.3 Toast type

```ts
type ToastVariant = "success" | "info" | "error";

interface Toast {
  id: ID;
  title: string;
  description?: string;
  variant: ToastVariant;
}
```

---

# 7. Data Architecture

## 7.1 Data strategy

All seed content is generated locally and deterministically.

There is no runtime network dependency for:

- Posts
- Users
- Communities
- Comments
- Notifications
- Images

Images should be local SVG/CSS-generated assets by default. If real JPG/PNG assets are available, they can be placed in `public/images`, but the UI must still handle missing images gracefully.

---

## 7.2 Deterministic generation

Use a seeded RNG utility with helpers such as:

```ts
hashString(input: string): number
mulberry32(seed: number): () => number
pick<T>(rng, items: readonly T[]): T
pickInt(rng, min: number, max: number): number
chance(rng, probability: number): boolean
shuffleStable<T>(rng, items: readonly T[]): T[]
```

### Seed domains

Use stable seed namespaces:

```text
users
communities
posts
comments:${postId}
notifications
search-demo
```

### Date handling

Use a runtime `now` anchor for relative timestamps.

For deterministic tests, utilities should allow injecting `now`.

Example:

```ts
formatTimeAgo(isoDate: string, now?: number): string
```

Seed posts should be distributed across the previous 30 days relative to the anchor.

---

## 7.3 Entity volumes

Recommended volumes:

| Entity | Count |
|---|---:|
| Users | 48 |
| Communities | 18 |
| Posts | 320 |
| Notifications | 18–24 |
| Comments per post | 4–42 deterministic |

These volumes are realistic while remaining performant.

---

## 7.4 Current user

Choose one seeded user as the viewer.

Example:

```ts
export const CURRENT_USER_ID = "u_001";
```

The current user is:

- Author of locally created posts
- Author of locally created comments
- Owner of saved posts
- Owner of the Saved profile tab

Do not implement real authentication.

---

## 7.5 Users

Each user must have:

- Stable ID
- Unique username
- Display name
- Realistic bio
- Deterministic karma
- Deterministic cake day
- Deterministic avatar hue

Avatar rendering should use initials and a deterministic hue-based gradient.

No external avatar image service should be used.

---

## 7.6 Communities

Each community must have:

- Stable ID
- URL-safe name, for example `typescript`
- Display title, for example `r/typescript`
- Description
- Category
- Deterministic member count
- Deterministic creation date
- Icon hue
- Banner hue

Recommended categories:

```text
nature
technology
gaming
food
space
art
animals
sports
programming
science
music
movies
books
fitness
travel
photography
diy
discussion
```

Each category should have:

- Label
- Icon
- Image or visual theme
- Topic-aware content pools

---

## 7.7 Posts

Post generation should be community-aware.

Each post must include:

- Stable ID
- Valid community ID
- Valid author ID
- Type: text, image, or link
- Title
- Optional body
- Optional URL
- Optional image
- Optional flair
- Timestamp within the past 30 days
- Base score
- Upvote ratio
- Base comment count

### Post type rules

#### Text posts

- Title required.
- Body required or strongly preferred.
- Body drawn from topic-aware pools.

#### Image posts

- Use local category image or generated SVG visual.
- Must have deterministic aspect ratio.
- Must include fallback if image fails.

#### Link posts

- Use safe demo domains.
- Do not depend on real external content.
- Display domain only or formatted URL.
- Validate protocol as `http:` or `https:` when user-created.

### Comment count consistency

Post seed data must include a deterministic `commentCount`.

The lazy comment generator must produce exactly that number of seed comments for the post.

Displayed comment count:

```ts
seedCommentCount + localCommentCountForPost
```

---

## 7.8 Comments

Comment generation rules:

- Generated lazily when a post page is opened.
- Cached in memory by `postId`.
- Deterministic per post.
- Uses `comments:${postId}` seed.
- Produces exactly the post’s base comment count.
- Maximum depth: 5.
- Root comments: reasonable subset.
- Replies distributed across available parents.
- Timestamps later than post timestamp.
- Authors are valid users.
- Bodies are topic-aware and realistic.

### Comment tree construction

Use a normalized intermediate representation:

```ts
Map<ID, Comment>
Map<ID, ID[]>
```

Then build:

```ts
CommentTreeNode[]
```

### Local comment merging

Local comments are stored separately and merged at read time.

Rules:

- Seed comments are immutable.
- Local comments are appended or sorted to appear near the top within their parent when newly created.
- Replies attach to the correct `parentId`.
- Local comments persist across reloads.
- Local comments count toward displayed comment total.

---

## 7.9 Notifications

Notifications must reference valid entities.

Kinds:

- Reply to your post
- Reply to your comment
- Upvote on your post
- Mention
- Community activity
- Trending post

Each notification needs:

- Stable ID
- Actor ID
- Kind
- Target type
- Target ID
- Optional `targetPostId` for comment targets
- Excerpt
- Timestamp

Notification routing must resolve safely:

| Target | Route |
|---|---|
| Post | Post page |
| Comment | Post page, optionally anchored to comment |
| Community | Community page |
| User | Profile page |

If a notification target cannot be resolved, render a fallback item rather than crashing.

---

## 7.10 Search architecture

Search is client-side and in-memory.

### Searchable entities

#### Communities

Search fields:

- Name
- Title
- Description
- Category

#### Posts

Search fields:

- Title
- Body
- Flair
- Community name
- Author username

#### Users

Search fields:

- Username
- Display name
- Bio

### Normalization

Before matching:

- Lowercase
- Trim
- Collapse whitespace
- Remove simple punctuation where useful

### Ranking

Simple ranking is sufficient:

1. Exact match
2. Prefix match
3. Token match
4. Substring match

For deterministic UX, always use stable tie-breakers.

### Search performance

Because dataset size is bounded, direct filtering is acceptable.

However, precompute normalized search text per entity at startup or lazily cache it.

Example:

```ts
interface SearchDocument {
  id: ID;
  type: "community" | "post" | "user";
  text: string;
}
```

---

# 8. State Architecture

## 8.1 State separation

Use two stores.

### Persisted domain store

Persisted to `localStorage`.

Contains:

```ts
interface PersistedAppState {
  schemaVersion: number;
  theme: ThemeMode;
  postVotes: Record<ID, StoredVote>;
  commentVotes: Record<ID, StoredVote>;
  joinedCommunityIds: ID[];
  savedPostIds: ID[];
  localPosts: LocalPost[];
  localComments: LocalComment[];
  readNotificationIds: ID[];
}
```

### Ephemeral UI store

Not persisted.

Contains:

```ts
interface EphemeralUiState {
  toasts: Toast[];
  mobileNavOpen: boolean;
  createPostOpen: boolean;
  createPostCommunityId: ID | null;
  commentDrafts: Record<ID, string>;
}
```

This separation prevents transient UI state from polluting persistent storage.

---

## 8.2 Persisted store actions

Required actions:

```ts
setTheme(theme: ThemeMode): void;
toggleTheme(): void;

togglePostVote(postId: ID, direction: VoteDirection): void;
toggleCommentVote(commentId: ID, direction: VoteDirection): void;

toggleJoinCommunity(communityId: ID): void;
toggleSavePost(postId: ID): void;

addLocalPost(post: LocalPost): void;
addLocalComment(comment: LocalComment): void;

markNotificationRead(id: ID): void;
markAllNotificationsRead(ids: ID[]): void;
```

---

## 8.3 Ephemeral UI store actions

Required actions:

```ts
pushToast(toast: Omit<Toast, "id">): void;
dismissToast(id: ID): void;

setMobileNavOpen(open: boolean): void;

openCreatePost(communityId?: ID): void;
closeCreatePost(): void;

setCommentDraft(parentKey: ID, value: string): void;
clearCommentDraft(parentKey: ID): void;
```

---

## 8.4 Persistence rules

Storage key:

```text
reddit-clone-store-v1
```

Persist:

- Theme
- Post votes
- Comment votes
- Joined communities
- Saved posts
- Local posts
- Local comments
- Read notification IDs

Do not persist:

- Toasts
- Drawer open state
- Modal open state
- Search dropdown open state
- Infinite scroll position
- Comment collapse state
- Temporary loading state

---

## 8.5 Storage safety

Persisted state is untrusted.

On rehydration:

1. Parse raw JSON safely.
2. Validate schema version.
3. Validate field types.
4. Discard invalid fields.
5. Fall back to defaults if unrecoverable.
6. Never throw from hydration to crash the app.

Wrap storage writes in try/catch to handle quota or privacy-mode failures.

---

## 8.6 Derived selectors

Selectors should be pure and typed.

Examples:

```ts
getVisibleScore(baseScore: number, vote: StoredVote): number;

isPostSaved(postId: ID, savedPostIds: ID[]): boolean;

isCommunityJoined(communityId: ID, joinedCommunityIds: ID[]): boolean;

getUnreadNotificationCount(
  notifications: Notification[],
  readNotificationIds: ID[]
): number;

getDerivedCommentCount(
  post: Post,
  localComments: LocalComment[]
): number;
```

Feed selectors should combine:

- Seed posts
- Local posts
- Sort mode
- Community scope
- Vote state

Selectors should not mutate input arrays.

---

# 9. Routing Architecture

Use a persistent app shell around routed pages.

## 9.1 Routes

| Route | Page | Purpose |
|---|---|---|
| `/` | `HomePage` | Home/Popular/All feed |
| `/r/:communityName` | `CommunityPage` | Community feed and header |
| `/r/:communityName/comments/:postId` | `PostPage` | Post detail and comments |
| `/u/:username` | `ProfilePage` | User profile |
| `/search` | `SearchPage` | Search results |
| `/notifications` | `NotificationsPage` | Notifications |
| `*` | `NotFoundPage` | 404 |

## 9.2 Route constants

Define route paths centrally.

Example:

```ts
const ROUTES = {
  home: "/",
  community: "/r/:communityName",
  post: "/r/:communityName/comments/:postId",
  profile: "/u/:username",
  search: "/search",
  notifications: "/notifications",
} as const;
```

## 9.3 Query params

### Home

```text
/?sort=best
/?sort=hot
/?sort=new
/?sort=top
/?sort=rising
```

Optional feed source param:

```text
/?feed=popular
/?feed=all
```

### Search

```text
/search?q=typescript&tab=posts
/search?q=nature&tab=communities
/search?q=jane&tab=users
```

### Notifications

```text
/notifications?filter=all
/notifications?filter=unread
```

## 9.4 Route loading strategy

Use route-level code splitting:

- Shell loads eagerly.
- Pages load lazily.
- Suspense fallback is a lightweight page skeleton.
- Error boundary wraps router outlet.

---

# 10. Layout Architecture

## 10.1 Desktop layout

```text
+--------------------------------------------------------------+
| Navbar                                                       |
+--------------+-----------------------------+----------------+
| Sidebar      | Main content                | Right panel    |
+--------------+-----------------------------+----------------+
```

Recommended grid:

```css
lg:grid-cols-[260px_minmax(0,1fr)]
xl:grid-cols-[260px_minmax(0,1fr)_320px]
```

Main column must use `minmax(0,1fr)` to prevent long text or media from expanding layout width.

## 10.2 Mobile layout

Mobile behavior:

- Navbar remains visible.
- Hamburger opens drawer.
- Sidebar hidden.
- Right panel hidden.
- Cards stack vertically.
- Comment indentation reduced.
- Tap targets at least 44px where practical.
- No horizontal overflow.

## 10.3 Right panel behavior

### Home

- Trending communities
- Trending posts
- About app card

### Community

- Community about card
- Member count
- Creation date
- Join button
- Rules or moderators if content exists

### Post

- Community about card
- Related posts optional

### Other pages

Right panel may be hidden or show contextual info.

---

# 11. Design System

## 11.1 Visual direction

The UI should feel:

- Clean
- Modern
- Content-first
- Restrained
- High readability
- Not template-generic

Avoid:

- Purple gradient clichés
- Excessive glassmorphism
- Overuse of shadows
- Overly rounded cards everywhere
- Low-contrast decorative text

Prefer:

- Strong typographic hierarchy
- Neutral surfaces
- One primary accent
- Clear borders and elevation
- Reddit-like vote semantics, refined

---

## 11.2 Semantic theme tokens

Define CSS variables and map them into Tailwind.

Example semantic tokens:

```css
--surface
--surface-muted
--surface-raised
--border
--text-primary
--text-secondary
--text-muted
--accent
--accent-hover
--upvote
--downvote
--danger
--success
```

In Tailwind v4, map tokens through `@theme inline` where appropriate.

Example concept:

```css
@theme inline {
  --color-surface: var(--surface);
  --color-surface-muted: var(--surface-muted);
  --color-border: var(--border);
  --color-text-primary: var(--text-primary);
  --color-text-secondary: var(--text-secondary);
}
```

---

## 11.3 Dark mode strategy

Use class-based dark mode.

Tailwind v4:

```css
@custom-variant dark (&:where(.dark, .dark *));
```

Theme flow:

1. Blocking bootstrap reads persisted theme before first render.
2. Applies or removes `dark` class on `document.documentElement`.
3. Zustand store owns theme state.
4. Theme changes update document class.
5. Persistence stores theme.

Do not allow incorrect-theme flash.

If storage is unavailable, default to light mode or system preference only if explicitly supported. For this plan, use explicit light/dark only.

---

## 11.4 Typography

Use a readable system font stack unless the project already bundles a font.

Suggested hierarchy:

| Element | Classes |
|---|---|
| Page title | `text-xl sm:text-2xl font-semibold` |
| Post title | `text-base sm:text-lg font-semibold` |
| Metadata | `text-xs sm:text-sm text-text-secondary` |
| Body | `text-sm sm:text-base` |
| Comment body | `text-sm sm:text-[15px] leading-relaxed` |

Long text must wrap safely.

Use line clamping for card body previews.

---

## 11.5 Spacing system

Use consistent spacing:

- Card padding: `p-3 sm:p-4`
- Feed gap: `gap-3 sm:gap-4`
- Sidebar sections: `space-y-6`
- Comment indentation: `pl-3 sm:pl-5`
- Modal padding: `p-4 sm:p-6`
- Main feed max width: `max-w-3xl`
- Post detail reading width: `max-w-2xl` or `max-w-3xl`

---

## 11.6 Motion rules

Use motion sparingly.

Recommended durations:

- Dropdown/modal enter/exit: 120–180ms
- Toast enter/exit: 180–220ms
- Vote score tick: 120–160ms
- Skeleton shimmer: CSS animation

Animate only:

- `transform`
- `opacity`
- Occasionally `background-color` where cheap

Respect reduced motion:

```css
@media (prefers-reduced-motion: reduce)
```

Also configure framer-motion:

```tsx
<MotionConfig reducedMotion="user">
```

---

# 12. Feature Design Details

## 12.1 Feed

### Feed sources

Home page supports:

- Home
- Popular
- All

Community pages support community-scoped feed.

### Sort modes

Supported:

- Best
- Hot
- New
- Top
- Rising

### Sorting logic

Use pure utilities.

#### New

```ts
createdAt descending
```

#### Top

```ts
visibleScore descending
createdAt descending
id ascending
```

#### Hot

Example:

```ts
hotScore = visibleScore / Math.pow(ageInHours + 2, 1.4)
```

#### Rising

Prefer recent posts with positive momentum:

```ts
risingScore = (visibleScore + 1) / Math.pow(ageInHours + 1, 0.8)
```

Prefer posts with upvote ratio above a threshold.

#### Best

Combine deterministic quality and recency:

```ts
bestScore = seededQuality + hotScoreComponent
```

Always include stable tie-breakers.

### Pagination

Use offset pagination:

- Page size: 12
- Component state controls loaded count
- Reset page when source or sort changes
- `hasMore = loadedCount < totalPosts`

### Infinite scroll

Use `IntersectionObserver`.

Requirements:

- Observe bottom sentinel
- Support enabled/disabled
- Guard duplicate loads
- Disconnect on unmount
- Reset when source/sort changes
- Use `rootMargin` to preload slightly before bottom

Loading behavior:

1. Show initial skeletons.
2. Load first page after simulated latency.
3. Show more skeletons while loading next page.
4. Show end-of-feed message when complete.
5. Preserve scroll position when local posts are prepended.

Suggested latency:

- Initial feed: 350–550ms
- Next page: 450–650ms
- Comments: 400–600ms
- Search: 250–450ms

Avoid random failures unless explicitly requested. Error states should come from invalid entities, not artificial network flakiness.

---

## 12.2 Post card

Each post card shows:

- Community icon
- Community name
- Author username
- Relative timestamp
- Flair if present
- Title
- Body preview for text posts
- Image for image posts
- External domain for link posts
- Vote control
- Comment count
- Save button
- Share button

Interaction rules:

- Clicking title or main card navigates to post page.
- Vote, save, and share buttons must not trigger card navigation.
- Save toggles with toast feedback.
- Share copies URL to clipboard with fallback toast.
- Images use lazy loading and aspect-ratio containers.
- Long titles wrap safely.
- Link domains truncate gracefully.

---

## 12.3 Voting

Vote states:

```ts
1   // upvoted
-1  // downvoted
0   // no vote
```

Toggle behavior:

- If current vote equals selected direction, remove vote.
- Otherwise replace vote.

Visible score:

```ts
visibleScore = baseScore + userVote
```

Do not mutate `baseScore`.

UI requirements:

- `aria-label` on buttons
- `aria-pressed` for active state
- Distinct active colors
- Subtle score animation
- Keyboard focus visible
- No navigation propagation

Persistence:

- Persist immediately.
- No server rollback required.

---

## 12.4 Create post

Entry points:

- Navbar Create button
- Sidebar Create button
- Community header Create Post button

Modal fields:

### Required

- Community selector
- Post type tabs
- Title

### Conditional

- Body for text posts
- Image category or visual picker for image posts
- URL for link posts

Validation:

- Community required
- Title required
- Title length: 1–300
- Text body optional but max 10,000
- Link URL must be valid
- Link protocol must be `http:` or `https:`
- Image post must have selected visual/category

Submission:

1. Build `LocalPost`.
2. Add to persisted store.
3. Show success toast.
4. Close modal.
5. Navigate to new post page or prepend to feed.

New local posts must appear in:

- Home feed
- Appropriate community feed
- Current user profile posts
- Saved only if saved explicitly

Default new post values:

```ts
baseScore: 1
upvoteRatio: 1
commentCount: 0
```

---

## 12.5 Post detail page

Structure:

```text
Post content
Action bar
Comment composer
Comment thread
```

Post detail should render:

- Full title
- Full body for text posts
- Full image for image posts
- Link preview/domain for link posts
- Community info
- Author info
- Timestamp
- Vote control
- Save/share actions
- Derived comment count

Loading states:

- Post skeleton if needed
- Comment skeletons while comments load

Error/empty states:

- Invalid post: not-found state
- No comments: empty state plus composer focus

---

## 12.6 Threaded comments

### Comment item contents

Each comment shows:

- Author avatar
- Username
- Timestamp
- Body
- Vote control
- Reply button
- Collapse/expand control
- Nested children

### Collapse behavior

Collapsing a comment:

- Hides its subtree
- Shows author and child count
- Preserves accessible semantics
- Does not corrupt tree state
- Should not permanently lose reply drafts if feasible

To preserve drafts, store reply drafts in ephemeral UI state keyed by parent comment ID or root composer key.

### Reply composer

Requirements:

- Appears inline under target comment
- Disabled when empty
- Supports Ctrl/Cmd+Enter submit
- Shows character limit
- Clears draft after submit
- Inserts local comment immediately
- Persists local comment
- Updates displayed comment count

### Depth rules

Maximum generated depth: 5.

At maximum depth:

- Disable reply button or show “Continue thread” placeholder if implementing advanced behavior.
- For initial implementation, disabling reply at max depth is acceptable if clearly labeled.

---

## 12.7 Communities

Route:

```text
/r/:communityName
```

Community header shows:

- Banner gradient
- Community icon
- Title
- Name
- Member count
- Join/leave button
- Create post button

Right panel shows:

- Description
- Member count
- Creation date
- Community rules or metadata

Feed is scoped to community posts.

Unknown community:

- Render not-found or empty state.
- Do not crash.

---

## 12.8 Profiles

Route:

```text
/u/:username
```

Profile header shows:

- Avatar
- Display name
- Username
- Bio
- Karma
- Cake day

Tabs:

### Any user

- Posts
- Comments

### Current user only

- Saved

Profile posts:

- Seed posts authored by user
- Local posts authored by current user

Profile comments:

- Seed comments authored by user
- Local comments authored by current user

Each profile comment item shows:

- Comment body
- Score
- Timestamp
- Link to originating post

Saved tab:

- Visible only on current user profile
- Shows saved posts
- Handles empty state

---

## 12.9 Search

### Navbar search dropdown

Behavior:

- Debounce input 200–250ms
- Show grouped results
- Maximum 5–8 total results
- Highlight active option
- Support ArrowUp/ArrowDown
- Enter selects active result
- Escape closes
- Outside click closes
- Close on navigation

### Search results page

Route:

```text
/search?q=term&tab=posts
```

Tabs:

- Communities
- Posts
- Users

Requirements:

- Query preserved in URL
- Tab switch updates URL
- Loading skeleton for simulated latency
- Empty state for no results
- Result click navigates to entity
- Invalid tab falls back to default

---

## 12.10 Notifications

### Navbar bell

Shows:

- Bell icon
- Unread badge when unread count > 0
- Badge capped at `9+`

### Notifications panel

Dropdown panel shows:

- Recent notifications
- Unread visual distinction
- Mark all read button
- Link to full notifications page

Each item shows:

- Actor avatar
- Action text
- Excerpt or target label
- Relative timestamp
- Read/unread state

Click behavior:

- Mark as read
- Navigate to target

### Notifications page

Shows:

- All/Unread tabs
- Full notification list
- Individual mark-read action
- Mark all read action
- Empty states

Persistence:

- `readNotificationIds`
- Unread count derived from notifications and read IDs

---

# 13. Accessibility Plan

Target: WCAG 2.2 AA baseline.

## 13.1 Global requirements

- Semantic HTML
- Skip link to main content
- Visible focus states
- Full keyboard operability
- Sufficient contrast in light and dark mode
- Reduced-motion support
- No keyboard traps except proper modal behavior
- Accessible labels for icon buttons

## 13.2 Navigation

- Skip link focuses main content
- Sidebar links keyboard accessible
- Active route indicated visually and semantically where practical
- Mobile drawer closes on Escape
- Focus returns to trigger when drawer closes

## 13.3 Menus and dropdowns

- Trigger has `aria-expanded`
- Trigger has `aria-haspopup` where appropriate
- Escape closes
- Outside click closes
- Arrow key navigation where menu-like
- Focus management is predictable

## 13.4 Modals

- `role="dialog"`
- `aria-modal="true"`
- Focus trap
- Close on Escape
- Overlay click closes where appropriate
- Background scroll locked
- Focus returns to trigger on close

## 13.5 Forms

- Labels associated with inputs
- Errors linked with `aria-describedby`
- Disabled submit only when appropriate
- Validation messages understandable

## 13.6 Voting

- `aria-label="Upvote post"`
- `aria-label="Downvote post"`
- `aria-pressed` for active state
- Score changes announced subtly if practical

## 13.7 Infinite scroll

- Loading state accessible
- End-of-feed message accessible
- No infinite spinner without status

## 13.8 Images

- Decorative images use `alt=""`
- Meaningful images use descriptive alt text
- Generated placeholders can be decorative if redundant with post title

---

# 14. Performance Plan

## 14.1 Data generation

- Generate users, communities, and posts once.
- Generate comments lazily.
- Cache generated comments in memory.
- Avoid regenerating comment trees on unrelated renders.

## 14.2 Rendering

- Use stable keys.
- Memoize expensive sorted lists.
- Memoize `PostCard` where beneficial.
- Avoid passing unstable object props into memoized components.
- Keep feed page size bounded.

## 14.3 Images

- Use local assets.
- Define aspect ratios.
- Use `loading="lazy"` for below-the-fold images.
- Prevent layout shift.
- Provide fallback visuals.

## 14.4 State

- Do not store derived lists in global state.
- Avoid persisting large unnecessary payloads.
- Keep persisted payload small and serializable.

## 14.5 Routing

- Route-level code splitting.
- Lazy pages.
- Shell remains responsive during page load.

## 14.6 Animation

- Animate transform and opacity.
- Avoid layout-triggering animations.
- Respect reduced motion.

---

# 15. Security and Data Safety Plan

Even though this is a client-side demo, maintain secure defaults.

## 15.1 Secrets

- No API keys.
- No credentials.
- No tokens.
- No sensitive environment variables exposed to client.

## 15.2 User content

- Treat user-entered post/comment text as plain text.
- Do not use `dangerouslySetInnerHTML`.
- React escaping is sufficient.

## 15.3 Links

External links must use:

```html
target="_blank"
rel="noopener noreferrer"
```

User-submitted URLs must be validated:

- Parse with `new URL`
- Allow only `http:` and `https:`
- Render domain safely

## 15.4 Storage

- Do not store sensitive data.
- Version storage schema.
- Validate persisted state.
- Handle corrupt state gracefully.
- Handle unavailable storage gracefully.

## 15.5 Assets

- Avoid remote image fetches.
- Use local assets or generated placeholders.
- Validate asset paths.

---

# 16. Testing and Validation Plan

## 16.1 Unit tests

If a test runner is available, add focused tests for high-risk logic.

### Formatting utilities

Test:

- Now
- Minutes ago
- Hours ago
- Days ago
- Months ago
- Invalid date fallback

### Random utilities

Test:

- Deterministic output for same seed
- Different output for different seeds
- Range bounds for integer picker
- Stable pick behavior

### Score utilities

Test:

- Vote-adjusted score
- New sort order
- Top sort order
- Hot sort stability
- Tie-breakers

### Store vote logic

Test:

- Upvote toggles off when already upvoted
- Downvote replaces upvote
- Downvote toggles off when already downvoted
- Score adjusts correctly

### Comment insertion

Test:

- Root comment inserts
- Reply inserts under correct parent
- Local comments merge with generated comments
- Comment count increments correctly

### Search utilities

Test:

- Finds communities by name
- Finds posts by title
- Finds users by username
- Handles empty query
- Handles whitespace-only query
- Handles no results

### Persistence validation

Test:

- Valid state parses
- Missing fields fall back safely
- Corrupt JSON falls back safely
- Wrong schema version handled

## 16.2 Integration/component tests

If feasible:

- PostCard renders metadata and actions
- Vote buttons update visible score
- Create post validation blocks invalid submission
- Comment composer adds local comment
- Search dropdown navigates on selection

Avoid over-mocking. Prefer asserting observable behavior.

## 16.3 Manual QA matrix

Use when automated tests are unavailable or insufficient.

Key checks:

- Home feed loads with skeletons
- Infinite scroll loads next page
- End-of-feed appears
- Sort tabs change order
- Vote state persists after reload
- Joined communities persist
- Saved posts persist
- Created post appears in feed and post page
- Created reply appears in comment tree
- Collapsing comment hides children
- Search dropdown opens and navigates
- Search page respects query and tab
- Profile tabs render correct content
- Saved tab only appears for current user
- Notifications unread badge updates
- Mark all read works
- Dark mode persists
- No console errors
- No horizontal overflow on mobile
- Keyboard navigation works

## 16.4 Verification commands

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

# 17. Pre-Mortem: Likely Failure Modes and Mitigations

## 17.1 Tailwind v4 dark mode misconfiguration

**Risk:** Dark mode classes do not apply.

**Mitigation:**

- Use `@custom-variant dark`.
- Apply `.dark` class to `<html>`.
- Verify both themes manually.
- Avoid hardcoded light-only colors.

---

## 17.2 Infinite scroll loads duplicate pages

**Risk:** Observer fires multiple times.

**Mitigation:**

- Guard with loading state.
- Disconnect observer while loading.
- Use request token or mounted flag.
- Reset pagination when sort/feed changes.

---

## 17.3 Comment tree becomes unstable after reply

**Risk:** New comments appear in wrong place or disappear.

**Mitigation:**

- Store local comments separately.
- Merge generated and local comments deterministically.
- Use stable IDs.
- Test root reply, depth-1 reply, and max-depth reply.

---

## 17.4 Persisted state shape changes break app

**Risk:** Old or corrupt localStorage crashes app.

**Mitigation:**

- Version storage schema.
- Partialize known fields only.
- Validate rehydrated state.
- Fall back to defaults when invalid.

---

## 17.5 Large generated data causes slow startup

**Risk:** Initial load blocks main thread.

**Mitigation:**

- Keep entity counts bounded.
- Generate comments lazily.
- Avoid repeated sorting of full datasets.
- Memoize derived feeds.

---

## 17.6 Images break under subpath hosting

**Risk:** `/images/foo.svg` fails under nested base URL.

**Mitigation:**

- Use `import.meta.env.BASE_URL`.
- Create asset helper.
- Verify built output paths.

---

## 17.7 Accessibility regressions in overlays

**Risk:** Menus and modals look fine but are keyboard-inaccessible.

**Mitigation:**

- Use vetted primitives where possible.
- Test keyboard-only flow.
- Verify Escape, focus return, and focus trap.
- Maintain one consistent overlay implementation.

---

## 17.8 Search dropdown navigation races

**Risk:** Selecting result while debounce is pending navigates incorrectly.

**Mitigation:**

- Cancel pending debounce on selection.
- Close dropdown before navigation.
- Use explicit result object, not raw text.

---

## 17.9 Notification targets become invalid

**Risk:** Notification points to missing post or comment.

**Mitigation:**

- Generate notifications after seed entities exist.
- Validate targets.
- Render fallback item when unresolved.

---

## 17.10 Theme flash on reload

**Risk:** Store loads too late, causing wrong background flash.

**Mitigation:**

- Use blocking theme bootstrap.
- Apply class before React renders.
- Keep theme parsing tiny and synchronous.

---

# 18. Implementation Plan with Detailed ToDo List

The phases below are ordered. Do not move to the next phase until the current phase’s exit checklist is satisfied.

---

# Phase 0 — Repository Discovery, Tooling, and Baseline

## Objective

Establish a verified project baseline.

## ToDo

- [ ] Inspect repository for existing conventions.
- [ ] Confirm package manager.
- [ ] Confirm lockfile presence and integrity.
- [ ] Confirm Node version.
- [ ] Confirm whether project is greenfield or existing.
- [ ] If existing:
  - [ ] Confirm React version.
  - [ ] Confirm TypeScript config.
  - [ ] Confirm Tailwind version.
  - [ ] Confirm router setup.
  - [ ] Confirm existing component library.
- [ ] If greenfield:
  - [ ] Scaffold Vite React TypeScript app.
  - [ ] Initialize pnpm or appropriate package manager.
  - [ ] Add Tailwind CSS v4.
  - [ ] Add TypeScript strict config.
  - [ ] Add ESLint and Prettier if appropriate.
- [ ] Install runtime dependencies through package manager.
- [ ] Install dev dependencies through package manager.
- [ ] Add scripts:
  - [ ] `dev`
  - [ ] `build`
  - [ ] `preview`
  - [ ] `typecheck`
  - [ ] `lint`
  - [ ] `test`, if test infrastructure is allowed
- [ ] Decide hosting strategy:
  - [ ] Normal static SPA
  - [ ] Single-file artifact
- [ ] If single-file:
  - [ ] Replace image strategy with inline/generated visuals.
  - [ ] Confirm localStorage availability assumptions.
- [ ] Verify baseline dev server starts.
- [ ] Verify baseline build succeeds.

## Exit checklist

- [ ] Package manager confirmed.
- [ ] Dependencies installed via package manager only.
- [ ] Lockfile updated by package manager only.
- [ ] Dev server starts.
- [ ] Build succeeds or existing failure documented.
- [ ] Hosting strategy decided.
- [ ] No manual manifest edits.

---

# Phase 1 — Global Styles, Theme Tokens, and Base CSS

## Objective

Create the visual foundation and theme system.

## ToDo

- [ ] Create `src/styles/index.css`.
- [ ] Import Tailwind.
- [ ] Add Tailwind v4 dark variant:
  - [ ] `@custom-variant dark (&:where(.dark, .dark *));`
- [ ] Define light theme CSS variables.
- [ ] Define `.dark` overrides.
- [ ] Map semantic variables into Tailwind theme utilities.
- [ ] Configure base typography.
- [ ] Configure body background and text color.
- [ ] Add global focus-visible styles.
- [ ] Add subtle scrollbar styles.
- [ ] Add reduced-motion CSS support.
- [ ] Add skeleton shimmer keyframes.
- [ ] Add overlay animation helpers if needed.
- [ ] Define reusable container widths.
- [ ] Verify no hardcoded critical colors.

## Exit checklist

- [ ] Light and dark variables exist.
- [ ] Dark variant works.
- [ ] Body uses semantic tokens.
- [ ] Focus rings visible.
- [ ] Reduced-motion query present.
- [ ] Skeleton animation exists.
- [ ] CSS compiles without warnings.

---

# Phase 2 — Core Types, Constants, and Utilities

## Objective

Create stable contracts and pure helper functions.

## ToDo

## Types

- [ ] Create `src/core/types/entities.ts`.
- [ ] Define `User`.
- [ ] Define `Community`.
- [ ] Define `Post`.
- [ ] Define `LocalPost`.
- [ ] Define `Comment`.
- [ ] Define `LocalComment`.
- [ ] Define `Notification`.
- [ ] Define `CommentTreeNode`.
- [ ] Create `src/core/types/feed.ts`.
- [ ] Define `SortMode`.
- [ ] Define `FeedSource`.
- [ ] Define `VoteDirection`.
- [ ] Define `StoredVote`.
- [ ] Create `src/core/types/ui.ts`.
- [ ] Define `Toast`.
- [ ] Define toast variants.

## Constants

- [ ] Create route constants.
- [ ] Create layout constants.
- [ ] Create pagination constants.
- [ ] Create storage key constants.
- [ ] Create latency constants.

## Utilities

- [ ] Create `cn.ts` using `clsx` and `tailwind-merge`.
- [ ] Create `id.ts` with stable local ID generator.
- [ ] Create `random.ts` with seeded RNG.
- [ ] Create `format.ts`:
  - [ ] `formatTimeAgo`
  - [ ] `formatNumber`
  - [ ] `formatDate`
- [ ] Create `score.ts`:
  - [ ] visible score
  - [ ] hot score
  - [ ] rising score
  - [ ] best score
  - [ ] feed sorter
- [ ] Create `search.ts`:
  - [ ] normalize query
  - [ ] match helpers
  - [ ] result ranking helpers
- [ ] Create `url.ts`:
  - [ ] safe URL validation
  - [ ] domain extraction
- [ ] Create `storage.ts`:
  - [ ] safe JSON parse
  - [ ] safe storage read/write
- [ ] Create `asset.ts`:
  - [ ] base URL-aware asset path helper

## Tests or manual verification

- [ ] Add utility unit tests if test runner exists.
- [ ] Otherwise document manual verification cases.

## Exit checklist

- [ ] Types compile.
- [ ] No `any` used.
- [ ] RNG deterministic.
- [ ] Formatting handles invalid values.
- [ ] Sorting is pure and stable.
- [ ] URL validation rejects unsafe protocols.
- [ ] Storage helpers do not throw unexpectedly.
- [ ] Asset helper respects base URL.

---

# Phase 3 — Content Pools and Deterministic Data Layer

## Objective

Generate realistic, stable seed content.

## ToDo

## Content pools

- [ ] Create category definitions.
- [ ] Create topic-aware title pools.
- [ ] Create topic-aware body pools.
- [ ] Create topic-aware comment pools.
- [ ] Create flair pools.
- [ ] Avoid lorem ipsum.
- [ ] Keep tone realistic and safe.

## Image/asset strategy

- [ ] Create category image mapping.
- [ ] Use local SVG/CSS-generated visuals by default.
- [ ] Add fallback post image.
- [ ] Ensure asset paths use base URL helper.

## Users

- [ ] Generate 48 users.
- [ ] Ensure unique usernames.
- [ ] Generate display names.
- [ ] Generate bios.
- [ ] Generate karma.
- [ ] Generate cake day.
- [ ] Generate avatar hue.
- [ ] Export current user ID.
- [ ] Export user lookup helpers.

## Communities

- [ ] Generate 18 communities.
- [ ] Assign categories.
- [ ] Generate names.
- [ ] Generate titles.
- [ ] Generate descriptions.
- [ ] Generate member counts.
- [ ] Generate creation dates.
- [ ] Generate icon and banner hues.
- [ ] Export community lookup helpers.

## Posts

- [ ] Generate 320 posts.
- [ ] Assign valid community IDs.
- [ ] Assign valid author IDs.
- [ ] Assign post type.
- [ ] Generate community-aware titles.
- [ ] Generate bodies for text posts.
- [ ] Generate image references for image posts.
- [ ] Generate safe URLs for link posts.
- [ ] Generate flairs where appropriate.
- [ ] Generate timestamps across past 30 days.
- [ ] Generate base scores.
- [ ] Generate upvote ratios.
- [ ] Generate deterministic comment counts.
- [ ] Export post lookup helpers.

## Comments

- [ ] Create lazy comment generator.
- [ ] Seed by `comments:${postId}`.
- [ ] Generate exactly post base comment count.
- [ ] Limit max depth to 5.
- [ ] Generate stable IDs.
- [ ] Generate valid authors.
- [ ] Generate realistic bodies.
- [ ] Generate timestamps after post timestamp.
- [ ] Cache generated comments by post ID.
- [ ] Export tree builder.

## Notifications

- [ ] Generate 18–24 notifications.
- [ ] Ensure actors exist.
- [ ] Ensure targets exist.
- [ ] Create excerpts.
- [ ] Generate timestamps.
- [ ] Export notification route resolver helper.

## Repositories

- [ ] Create user repository.
- [ ] Create community repository.
- [ ] Create post repository.
- [ ] Create comment repository.
- [ ] Create notification repository.
- [ ] Create search repository.

## Exit checklist

- [ ] All IDs stable.
- [ ] No dangling foreign keys.
- [ ] Post communities and authors resolve.
- [ ] Comment authors and posts resolve.
- [ ] Notifications resolve to valid targets.
- [ ] Same seed produces same data.
- [ ] Comment count matches generated comment tree.
- [ ] No runtime network dependency.
- [ ] Content feels realistic.

---

# Phase 4 — State Stores, Persistence, and Selectors

## Objective

Implement safe persistent app state and derived read models.

## ToDo

## Persisted store

- [ ] Create persisted store.
- [ ] Add theme.
- [ ] Add post votes.
- [ ] Add comment votes.
- [ ] Add joined communities.
- [ ] Add saved posts.
- [ ] Add local posts.
- [ ] Add local comments.
- [ ] Add read notification IDs.
- [ ] Implement theme actions.
- [ ] Implement vote actions.
- [ ] Implement join/save toggles.
- [ ] Implement local post insertion.
- [ ] Implement local comment insertion.
- [ ] Implement notification read actions.

## Ephemeral UI store

- [ ] Create UI store.
- [ ] Add toasts.
- [ ] Add mobile drawer state.
- [ ] Add create post modal state.
- [ ] Add comment draft state.
- [ ] Implement toast actions.
- [ ] Implement drawer actions.
- [ ] Implement create post modal actions.
- [ ] Implement comment draft actions.

## Persistence

- [ ] Configure storage key.
- [ ] Configure version.
- [ ] Partialize persisted fields.
- [ ] Exclude ephemeral UI state.
- [ ] Add safe rehydration validation.
- [ ] Add fallback default state.
- [ ] Add migration hook.
- [ ] Handle unavailable storage.

## Theme bootstrap

- [ ] Add blocking theme bootstrap.
- [ ] Read persisted theme before first paint.
- [ ] Apply `dark` class to `<html>`.
- [ ] Sync store and document class.

## Selectors

- [ ] Add visible score selector.
- [ ] Add saved/joined selectors.
- [ ] Add unread notification count selector.
- [ ] Add derived comment count selector.
- [ ] Add feed selector.
- [ ] Add post lookup selector.
- [ ] Add community lookup selector.
- [ ] Add user lookup selector.

## Exit checklist

- [ ] Theme persists.
- [ ] Votes persist.
- [ ] Joins persist.
- [ ] Saved posts persist.
- [ ] Local posts persist.
- [ ] Local comments persist.
- [ ] Notification read state persists.
- [ ] Toasts do not persist.
- [ ] Corrupt storage does not crash app.
- [ ] No mutation of seed entities.
- [ ] Selectors are pure.

---

# Phase 5 — Reusable Hooks

## Objective

Create reusable behavior hooks with correct cleanup.

## ToDo

- [ ] Create `useDebouncedValue`.
- [ ] Create `useMediaQuery`.
- [ ] Create `useOnClickOutside`.
- [ ] Create `useInfiniteScroll`.
- [ ] Create `usePrefersReducedMotion`.
- [ ] Create `useCopyToClipboard`.
- [ ] Create `useTheme`.
- [ ] Ensure cleanup on unmount.
- [ ] Ensure typed APIs.
- [ ] Ensure no stale closures.

## Infinite scroll requirements

- [ ] Accept enabled flag.
- [ ] Accept callback.
- [ ] Observe sentinel element.
- [ ] Guard duplicate loads.
- [ ] Support loading state.
- [ ] Disconnect on unmount.
- [ ] Reset when dependency keys change.

## Exit checklist

- [ ] Debounce cancels on unmount.
- [ ] Outside click ignores contained clicks.
- [ ] Infinite scroll prevents duplicate loads.
- [ ] Media query updates correctly.
- [ ] Copy hook has fallback behavior.
- [ ] Theme hook syncs document class.
- [ ] No memory leaks.

---

# Phase 6 — UI Primitives

## Objective

Build accessible shared components.

## ToDo

## Primitives

- [ ] `Avatar`
  - [ ] Sizes xs/sm/md/lg
  - [ ] Initials
  - [ ] Deterministic gradient
  - [ ] Accessible label
- [ ] `Badge`
- [ ] `Button`
  - [ ] primary
  - [ ] secondary
  - [ ] outline
  - [ ] ghost
  - [ ] danger
  - [ ] sizes
  - [ ] disabled
  - [ ] loading
- [ ] `IconButton`
  - [ ] required `aria-label`
- [ ] `Card`
- [ ] `Input`
- [ ] `Textarea`
- [ ] `Select`
- [ ] `Skeleton`
  - [ ] block
  - [ ] text
  - [ ] circle
- [ ] `Spinner`
- [ ] `Tabs`
  - [ ] keyboard support
  - [ ] active indicator

## Overlays

- [ ] `Modal`
  - [ ] focus trap
  - [ ] Escape close
  - [ ] scroll lock
  - [ ] overlay click close
- [ ] `Dropdown`
  - [ ] outside click
  - [ ] Escape close
  - [ ] keyboard navigation
- [ ] `Toaster`
  - [ ] success/info/error
  - [ ] auto-dismiss
  - [ ] dismiss button
  - [ ] live region where practical

## Feedback

- [ ] `EmptyState`
- [ ] `ErrorState`
- [ ] `PageLoadingState`

## Exit checklist

- [ ] All primitives typed.
- [ ] No hardcoded critical colors.
- [ ] Focus visible.
- [ ] Buttons support disabled/loading.
- [ ] Dropdown closes correctly.
- [ ] Modal traps focus.
- [ ] Toasts auto-dismiss.
- [ ] Skeletons match final layout dimensions reasonably.

---

# Phase 7 — App Shell and Responsive Layout

## Objective

Build the persistent responsive app frame.

## ToDo

## Router

- [ ] Create route definitions.
- [ ] Use `HashRouter` unless project convention differs.
- [ ] Add lazy page loading.
- [ ] Add suspense fallback.
- [ ] Add error boundary.
- [ ] Add not-found route.

## AppShell

- [ ] Render navbar.
- [ ] Render desktop sidebar.
- [ ] Render mobile drawer.
- [ ] Render main outlet.
- [ ] Render right panel conditionally.
- [ ] Add skip link.
- [ ] Ensure main content max width.
- [ ] Ensure safe padding.
- [ ] Ensure no horizontal overflow.

## Navbar

- [ ] Logo/home link.
- [ ] Mobile hamburger.
- [ ] Search entry point.
- [ ] Create post button.
- [ ] Theme toggle.
- [ ] Notifications bell.
- [ ] User avatar menu.
- [ ] Sticky positioning.
- [ ] Correct z-index.

## Sidebar

- [ ] Home.
- [ ] Popular.
- [ ] All.
- [ ] Notifications.
- [ ] Profile.
- [ ] Joined communities list.
- [ ] Empty state for no joined communities.
- [ ] Active route highlight.

## Mobile drawer

- [ ] Reuse sidebar navigation.
- [ ] Overlay.
- [ ] Close button.
- [ ] Close on route change.
- [ ] Close on Escape.
- [ ] Manage focus safely.

## Right panel

- [ ] Home context.
- [ ] Community context.
- [ ] Post context.
- [ ] Hide below `xl`.

## Exit checklist

- [ ] Navbar responsive.
- [ ] Sidebar visible on desktop.
- [ ] Drawer works on mobile.
- [ ] Active route highlighted.
- [ ] Theme toggle accessible.
- [ ] Avatar menu accessible.
- [ ] No horizontal scroll.
- [ ] Layout stable with long content.

---

# Phase 8 — Feed, Voting, Infinite Scroll, Create Post

## Objective

Deliver the primary browsing experience.

## ToDo

## VoteControl

- [ ] Support horizontal and vertical layouts.
- [ ] Support post and comment modes.
- [ ] Connect to store.
- [ ] Show visible score.
- [ ] Animate score subtly.
- [ ] Add `aria-pressed`.
- [ ] Prevent click propagation inside cards.

## PostCard

- [ ] Render metadata.
- [ ] Render title.
- [ ] Render body preview.
- [ ] Render image.
- [ ] Render link domain.
- [ ] Render vote control.
- [ ] Render comment count.
- [ ] Render save button.
- [ ] Render share button.
- [ ] Make card clickable safely.
- [ ] Ensure inner actions do not navigate.
- [ ] Add image aspect ratio.
- [ ] Add lazy loading.
- [ ] Add hover/focus states.

## SortTabs

- [ ] Support best/hot/new/top/rising.
- [ ] Sync with URL query param.
- [ ] Handle invalid sort fallback.

## PostList

- [ ] Accept sorted posts.
- [ ] Manage loaded page state.
- [ ] Render first page.
- [ ] Render sentinel.
- [ ] Render skeletons.
- [ ] Render end-of-feed state.
- [ ] Reset when source/sort changes.

## Infinite scroll integration

- [ ] Hook observer to sentinel.
- [ ] Guard duplicate loads.
- [ ] Add simulated latency.
- [ ] Cleanup on unmount.

## CreatePostModal

- [ ] Community selector.
- [ ] Post type tabs.
- [ ] Title input.
- [ ] Text body input.
- [ ] Link URL input.
- [ ] Image category picker.
- [ ] Validation.
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

- [ ] Resolve post by route params.
- [ ] Validate community and post relationship if needed.
- [ ] Show not-found state for invalid post.
- [ ] Render full post.
- [ ] Render action bar.
- [ ] Render comment composer.
- [ ] Render comment thread.
- [ ] Add comment loading skeletons.
- [ ] Simulate comment load latency.

## CommentTree

- [ ] Build tree from generated + local comments.
- [ ] Render recursively.
- [ ] Support collapse/expand.
- [ ] Indent children.
- [ ] Limit indentation on mobile.
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
- [ ] Store draft in ephemeral state.
- [ ] Clear draft after submit.
- [ ] Insert local comment.
- [ ] Update derived comment count.

## Exit checklist

- [ ] Post page loads valid post.
- [ ] Invalid post shows not-found.
- [ ] Comment tree renders nested correctly.
- [ ] Collapse hides subtree.
- [ ] Reply appears under correct parent.
- [ ] New comments persist after reload.
- [ ] Comment votes persist.
- [ ] Comment count updates correctly.
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
- [ ] Add community about card.

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

- [ ] Implement search repository.
- [ ] Create `SearchBar`.
- [ ] Add debounce.
- [ ] Add grouped dropdown results.
- [ ] Add keyboard navigation.
- [ ] Add outside click close.
- [ ] Navigate on result select.
- [ ] Create `SearchPage`.
- [ ] Read `q` and `tab` params.
- [ ] Add tabs:
  - [ ] Communities
  - [ ] Posts
  - [ ] Users
- [ ] Add loading skeletons.
- [ ] Add empty states.
- [ ] Preserve query in URL.
- [ ] Handle invalid tab fallback.

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
- [ ] Handle unresolved notification targets safely.

## Exit checklist

- [ ] Community feed scoped correctly.
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

## Motion

- [ ] Add dropdown/modal enter/exit animations.
- [ ] Add drawer animation.
- [ ] Add toast animations.
- [ ] Add vote count animation.
- [ ] Add subtle page transition only if cheap.
- [ ] Wrap app in reduced-motion-aware motion config.

## States

- [ ] Verify empty states:
  - [ ] No posts
  - [ ] No comments
  - [ ] No saved posts
  - [ ] No search results
  - [ ] No notifications
  - [ ] No joined communities
- [ ] Verify error states:
  - [ ] Invalid route
  - [ ] Invalid post
  - [ ] Invalid community
  - [ ] Invalid user
  - [ ] Corrupt storage fallback

## Visual polish

- [ ] Hover states.
- [ ] Active/pressed states.
- [ ] Disabled states.
- [ ] Consistent spacing.
- [ ] Consistent border radius.
- [ ] Consistent typography.
- [ ] Consistent icon sizes.
- [ ] Dark mode parity.
- [ ] Skeleton layout parity.
- [ ] No dead buttons.

## Exit checklist

- [ ] Animations subtle and smooth.
- [ ] Reduced motion respected.
- [ ] Empty states clear.
- [ ] Error states clear.
- [ ] Spacing consistent.
- [ ] Typography hierarchy clear.
- [ ] Dark mode contrast acceptable.
- [ ] No visual overflow.
- [ ] No placeholder content.

---

# Phase 12 — Accessibility, Responsiveness, and Performance Audit

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
- [ ] ARIA misuse removed.

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

## Performance pass

- [ ] No unnecessary rerenders in feed.
- [ ] Memoized sorted lists.
- [ ] Lazy images.
- [ ] Route code splitting.
- [ ] No large objects persisted.
- [ ] No blocking data generation.
- [ ] No layout shift from images.

## Functional QA

- [ ] Feed loads.
- [ ] Infinite scroll works.
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
- [ ] No lint errors, or documented exceptions.
- [ ] Accessibility baseline passes.
- [ ] Responsive baseline passes.
- [ ] Performance baseline passes.

---

# Phase 13 — Tests, Build, Documentation, and Delivery

## Objective

Close the loop cleanly.

## ToDo

## Tests

- [ ] Run unit tests if present.
- [ ] Add missing tests for critical utilities if feasible.
- [ ] Do not weaken tests to make build pass.

## Build

- [ ] Run typecheck.
- [ ] Run lint.
- [ ] Run build.
- [ ] Run preview.
- [ ] Smoke test preview build.

## Cleanup

- [ ] Remove scratch files.
- [ ] Remove debug logs.
- [ ] Remove commented-out code.
- [ ] Remove TODOs or explicitly document them.
- [ ] Verify no placeholder text.
- [ ] Verify no fake broken links.
- [ ] Verify no secrets.

## Documentation

- [ ] Update README if project expects it.
- [ ] Document scripts.
- [ ] Document storage schema version.
- [ ] Document known limitations.
- [ ] Document single-file adaptation if applicable.

## Delivery

- [ ] Final artifacts in correct location.
- [ ] Commits atomic if using Git.
- [ ] Remaining known issues listed.
- [ ] Verification notes included.

## Exit checklist

- [ ] Build output clean.
- [ ] No secrets.
- [ ] No TODO placeholders.
- [ ] No console noise.
- [ ] README/docs updated where applicable.
- [ ] Final artifacts in correct location.
- [ ] Remaining known issues listed.

---

# 19. Suggested Commit Grouping

If using Git, keep commits atomic.

Suggested sequence:

1. `chore: add app dependencies and tooling`
2. `feat: add theme tokens and global styles`
3. `feat: add domain types and core utilities`
4. `feat: add deterministic users, communities, and posts`
5. `feat: add comment and notification generators`
6. `feat: add persisted app store and ui store`
7. `feat: add reusable hooks`
8. `feat: add accessible UI primitives`
9. `feat: add responsive app shell`
10. `feat: add feed with infinite scroll and voting`
11. `feat: add post detail and threaded comments`
12. `feat: add communities, profiles, search, and notifications`
13. `feat: add polish, animations, and accessibility improvements`
14. `chore: verify build and clean up delivery`

Avoid bundling unrelated changes into one commit.

---

# 20. Final Definition of Done

The implementation is done when all of the following are true:

## Core functionality

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

## States

- [ ] Skeleton loading states appear where needed.
- [ ] Empty states are handled.
- [ ] Error states are handled.
- [ ] End-of-feed state appears.
- [ ] Not-found states appear for invalid entities.

## Quality

- [ ] Animations are smooth and reduced-motion aware.
- [ ] Accessibility baseline passes.
- [ ] Responsive baseline passes.
- [ ] TypeScript strict compilation passes.
- [ ] Build passes.
- [ ] No console errors.
- [ ] No placeholder content remains.
- [ ] No secrets or debug artifacts remain.

## Evidence

- [ ] Verification commands were run where possible.
- [ ] Any unverifiable items are explicitly listed.
- [ ] Known limitations are documented.

---

# 21. Confidence and Verification Note

This is an implementation plan, not executed code.

- **Architecture confidence:** Reasoned.
- **Feature completeness confidence:** Reasoned.
- **Runtime/build verification:** Not performed in this planning response.

Before implementation begins, inspect the actual repository state, package manager, Tailwind version, existing dependencies, and project conventions. If an existing convention conflicts with this plan, resolve using:

1. Explicit user instructions.
2. Existing project conventions.
3. This plan.

---

https://chat.qwen.ai/s/ff0aa8a5-6c6a-4c01-8670-66d0f4647f57?fev=0.2.83 
