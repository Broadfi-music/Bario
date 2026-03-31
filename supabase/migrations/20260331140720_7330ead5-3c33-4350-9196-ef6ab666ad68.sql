CREATE OR REPLACE FUNCTION public.start_direct_conversation(other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  conversation_uuid uuid;
  conversation_key text;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF other_user_id IS NULL THEN
    RAISE EXCEPTION 'Recipient is required';
  END IF;

  IF current_user_id = other_user_id THEN
    RAISE EXCEPTION 'Cannot start a conversation with yourself';
  END IF;

  conversation_key := CASE
    WHEN current_user_id::text < other_user_id::text THEN current_user_id::text || '_' || other_user_id::text
    ELSE other_user_id::text || '_' || current_user_id::text
  END;

  SELECT id
  INTO conversation_uuid
  FROM public.conversations
  WHERE dm_key = conversation_key
  LIMIT 1;

  IF conversation_uuid IS NOT NULL THEN
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (conversation_uuid, current_user_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (conversation_uuid, other_user_id)
    ON CONFLICT DO NOTHING;

    RETURN conversation_uuid;
  END IF;

  INSERT INTO public.conversations (created_by, dm_key)
  VALUES (current_user_id, conversation_key)
  RETURNING id INTO conversation_uuid;

  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES (conversation_uuid, current_user_id), (conversation_uuid, other_user_id)
  ON CONFLICT DO NOTHING;

  RETURN conversation_uuid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_direct_conversation(uuid) TO authenticated;