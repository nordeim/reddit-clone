-- Round 11 (F2): Add performance indexes claimed by REMEDIATION_PLAN.md §4.1
-- but absent from migration 0000. These cover the three hot read paths:
--   1. Feed pagination by community + time: posts(community_id, created_at DESC)
--   2. Comment-tree fetch by post:          comments(post_id)
--   3. Unread-notification query:           notifications(user_id, read)
-- The sessions(jti) PK is already auto-indexed by SQLite (PRIMARY KEY).
-- Idempotent: uses IF NOT EXISTS so re-applying on an existing DB is safe.

CREATE INDEX IF NOT EXISTS `idx_posts_community_created` ON `posts` (`community_id`, `created_at` DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_comments_post_id` ON `comments` (`post_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_notifications_user_read` ON `notifications` (`user_id`, `read`);
