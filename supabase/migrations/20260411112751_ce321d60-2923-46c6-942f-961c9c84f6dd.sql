
-- 1. Create security definer function to check conversation membership
CREATE OR REPLACE FUNCTION public.is_conversation_member(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants
    WHERE conversation_id = _conversation_id
      AND user_id = _user_id
  )
$$;

-- 2. Fix conversation_participants SELECT policy (recursive one)
DROP POLICY IF EXISTS "Participants can view participant list" ON public.conversation_participants;
CREATE POLICY "Participants can view participant list"
ON public.conversation_participants
FOR SELECT
TO authenticated
USING (public.is_conversation_member(conversation_id, auth.uid()));

-- 3. Fix conversations SELECT policy
DROP POLICY IF EXISTS "Participants can view conversations" ON public.conversations;
CREATE POLICY "Participants can view conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (public.is_conversation_member(id, auth.uid()));

-- 4. Fix conversations UPDATE policy
DROP POLICY IF EXISTS "Participants can update conversations" ON public.conversations;
CREATE POLICY "Participants can update conversations"
ON public.conversations
FOR UPDATE
TO authenticated
USING (public.is_conversation_member(id, auth.uid()))
WITH CHECK (public.is_conversation_member(id, auth.uid()));

-- 5. Fix direct_messages SELECT policy
DROP POLICY IF EXISTS "Participants can view direct messages" ON public.direct_messages;
CREATE POLICY "Participants can view direct messages"
ON public.direct_messages
FOR SELECT
TO authenticated
USING (public.is_conversation_member(conversation_id, auth.uid()));

-- 6. Fix direct_messages INSERT policy
DROP POLICY IF EXISTS "Participants can send direct messages" ON public.direct_messages;
CREATE POLICY "Participants can send direct messages"
ON public.direct_messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id AND public.is_conversation_member(conversation_id, auth.uid()));

-- 7. Fix conversation_participants INSERT policy
DROP POLICY IF EXISTS "Conversation owner or self can add participants" ON public.conversation_participants;
CREATE POLICY "Conversation owner or self can add participants"
ON public.conversation_participants
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_participants.conversation_id
      AND c.created_by = auth.uid()
  )
);

-- 8. Fix conversation_participants DELETE policy
DROP POLICY IF EXISTS "Conversation owner or self can remove participants" ON public.conversation_participants;
CREATE POLICY "Conversation owner or self can remove participants"
ON public.conversation_participants
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_participants.conversation_id
      AND c.created_by = auth.uid()
  )
);
