export type VoteValue = -1 | 0 | 1;

export interface User {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  karma: number;
  createdAt: string; // ISO date, "cake day"
  colorFrom: string;
  colorTo: string;
}

export type ImageCategory =
  | "nature"
  | "tech"
  | "gaming"
  | "food"
  | "space"
  | "art"
  | "animals"
  | "sports";

export interface Community {
  id: string;
  name: string; // without r/
  title: string;
  description: string;
  memberCount: number;
  onlineCount: number;
  createdAt: string;
  category: ImageCategory;
  colorFrom: string;
  colorTo: string;
  icon: string; // emoji
  rules: string[];
}

export type PostType = "text" | "link" | "image";

export interface Post {
  id: string;
  communityId: string;
  authorId: string;
  title: string;
  type: PostType;
  body?: string;
  linkUrl?: string;
  linkDomain?: string;
  imageCategory?: ImageCategory;
  flair?: string;
  score: number;
  commentCount: number;
  createdAt: string;
  isLocal?: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  parentId: string | null;
  body: string;
  score: number;
  createdAt: string;
  children: Comment[];
  isLocal?: boolean;
}

export type NotificationType = "upvote" | "reply" | "mention" | "community";

export interface AppNotification {
  id: string;
  type: NotificationType;
  message: string;
  detail: string;
  postId?: string;
  actorId?: string;
  createdAt: string;
  read: boolean;
}

export type SortMode = "best" | "hot" | "new" | "top" | "rising";
