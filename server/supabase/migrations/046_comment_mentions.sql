-- 046_comment_mentions.sql
-- Track user mentions in comments + notify mentioned users.

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS mentioned_user_ids UUID[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_comments_mentioned_user_ids
  ON public.comments USING GIN (mentioned_user_ids);
