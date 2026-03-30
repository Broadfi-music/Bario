-- DM conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL,
  dm_key TEXT UNIQUE,
  last_message_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- DM participants table
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);

ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

-- Direct messages table
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Feed engagement tables
CREATE TABLE IF NOT EXISTS public.host_post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.host_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

ALTER TABLE public.host_post_likes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.host_post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.host_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.host_post_comments ENABLE ROW LEVEL SECURITY;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_conversation_id_created_at ON public.direct_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_host_post_likes_post_id ON public.host_post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_host_post_comments_post_id_created_at ON public.host_post_comments(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_dm_key ON public.conversations(dm_key);

-- Keep conversation timestamps fresh
DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
CREATE TRIGGER update_conversations_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_direct_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at,
      updated_at = now()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_direct_message ON public.direct_messages;
CREATE TRIGGER on_new_direct_message
AFTER INSERT ON public.direct_messages
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_direct_message();

-- Keep host_posts counters accurate
CREATE OR REPLACE FUNCTION public.refresh_host_post_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_post UUID;
BEGIN
  target_post := COALESCE(NEW.post_id, OLD.post_id);

  UPDATE public.host_posts p
  SET like_count = (
        SELECT COUNT(*)::INT
        FROM public.host_post_likes l
        WHERE l.post_id = target_post
      ),
      comment_count = (
        SELECT COUNT(*)::INT
        FROM public.host_post_comments c
        WHERE c.post_id = target_post
      ),
      updated_at = now()
  WHERE p.id = target_post;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS on_host_post_like_change ON public.host_post_likes;
CREATE TRIGGER on_host_post_like_change
AFTER INSERT OR DELETE ON public.host_post_likes
FOR EACH ROW
EXECUTE FUNCTION public.refresh_host_post_counts();

DROP TRIGGER IF EXISTS on_host_post_comment_change ON public.host_post_comments;
CREATE TRIGGER on_host_post_comment_change
AFTER INSERT OR DELETE ON public.host_post_comments
FOR EACH ROW
EXECUTE FUNCTION public.refresh_host_post_counts();

-- RLS: conversations
DROP POLICY IF EXISTS "Participants can view conversations" ON public.conversations;
CREATE POLICY "Participants can view conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversations.id
      AND cp.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
CREATE POLICY "Users can create conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Participants can update conversations" ON public.conversations;
CREATE POLICY "Participants can update conversations"
ON public.conversations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversations.id
      AND cp.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversations.id
      AND cp.user_id = auth.uid()
  )
);

-- RLS: conversation participants
DROP POLICY IF EXISTS "Participants can view participant list" ON public.conversation_participants;
CREATE POLICY "Participants can view participant list"
ON public.conversation_participants
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Conversation owner or self can add participants" ON public.conversation_participants;
CREATE POLICY "Conversation owner or self can add participants"
ON public.conversation_participants
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = conversation_participants.conversation_id
      AND c.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "Conversation owner or self can remove participants" ON public.conversation_participants;
CREATE POLICY "Conversation owner or self can remove participants"
ON public.conversation_participants
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = conversation_participants.conversation_id
      AND c.created_by = auth.uid()
  )
);

-- RLS: direct messages
DROP POLICY IF EXISTS "Participants can view direct messages" ON public.direct_messages;
CREATE POLICY "Participants can view direct messages"
ON public.direct_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = direct_messages.conversation_id
      AND cp.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Participants can send direct messages" ON public.direct_messages;
CREATE POLICY "Participants can send direct messages"
ON public.direct_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = direct_messages.conversation_id
      AND cp.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete own direct messages" ON public.direct_messages;
CREATE POLICY "Users can delete own direct messages"
ON public.direct_messages
FOR DELETE
TO authenticated
USING (auth.uid() = sender_id);

-- RLS: post likes
DROP POLICY IF EXISTS "Likes are publicly visible" ON public.host_post_likes;
CREATE POLICY "Likes are publicly visible"
ON public.host_post_likes
FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Users can like posts" ON public.host_post_likes;
CREATE POLICY "Users can like posts"
ON public.host_post_likes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike own likes" ON public.host_post_likes;
CREATE POLICY "Users can unlike own likes"
ON public.host_post_likes
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- RLS: post comments
DROP POLICY IF EXISTS "Comments are publicly visible" ON public.host_post_comments;
CREATE POLICY "Comments are publicly visible"
ON public.host_post_comments
FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Users can create comments" ON public.host_post_comments;
CREATE POLICY "Users can create comments"
ON public.host_post_comments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own comments" ON public.host_post_comments;
CREATE POLICY "Users can update own comments"
ON public.host_post_comments
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON public.host_post_comments;
CREATE POLICY "Users can delete own comments"
ON public.host_post_comments
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);