
-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  icon_url text,
  action_url text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

-- Authenticated users can insert notifications (for triggers/edge functions)
CREATE POLICY "Authenticated can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE
USING (auth.uid() = user_id);

-- Create push_subscriptions table
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth_key text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view own subscriptions
CREATE POLICY "Users can view own push subscriptions"
ON public.push_subscriptions FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert own subscriptions
CREATE POLICY "Users can insert own push subscriptions"
ON public.push_subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete own subscriptions
CREATE POLICY "Users can delete own push subscriptions"
ON public.push_subscriptions FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime on notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create trigger function for new follower notifications
CREATE OR REPLACE FUNCTION public.notify_new_follower()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  follower_name text;
  follower_avatar text;
BEGIN
  SELECT full_name, avatar_url INTO follower_name, follower_avatar
  FROM public.profiles WHERE user_id = NEW.follower_id LIMIT 1;
  
  INSERT INTO public.notifications (user_id, type, title, message, icon_url, action_url)
  VALUES (
    NEW.following_id,
    'new_follower',
    'New Follower',
    COALESCE(follower_name, 'Someone') || ' started following you',
    follower_avatar,
    '/host/' || NEW.follower_id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_follower
AFTER INSERT ON public.follows
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_follower();

-- Create trigger function for gift received notifications
CREATE OR REPLACE FUNCTION public.notify_gift_received()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_name text;
  sender_avatar text;
BEGIN
  SELECT full_name, avatar_url INTO sender_name, sender_avatar
  FROM public.profiles WHERE user_id = NEW.sender_id LIMIT 1;
  
  INSERT INTO public.notifications (user_id, type, title, message, icon_url, action_url)
  VALUES (
    NEW.recipient_id,
    'gift_received',
    'Gift Received! 🎁',
    'You received ' || COALESCE(NEW.gift_count, 1) || ' ' || NEW.gift_type || ' from ' || COALESCE(sender_name, 'someone'),
    sender_avatar,
    '/podcasts'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_gift_received
AFTER INSERT ON public.podcast_gifts
FOR EACH ROW
EXECUTE FUNCTION public.notify_gift_received();

-- Create trigger function for battle invite notifications
CREATE OR REPLACE FUNCTION public.notify_battle_invite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  challenger_name text;
  challenger_avatar text;
BEGIN
  SELECT full_name, avatar_url INTO challenger_name, challenger_avatar
  FROM public.profiles WHERE user_id = NEW.from_user_id LIMIT 1;
  
  INSERT INTO public.notifications (user_id, type, title, message, icon_url, action_url)
  VALUES (
    NEW.to_user_id,
    'battle_invite',
    'Battle Challenge! ⚔️',
    COALESCE(challenger_name, 'Someone') || ' challenged you to a battle!',
    challenger_avatar,
    '/podcasts'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_battle_invite
AFTER INSERT ON public.battle_invites
FOR EACH ROW
EXECUTE FUNCTION public.notify_battle_invite();

-- Create trigger function for join request accepted
CREATE OR REPLACE FUNCTION public.notify_join_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    INSERT INTO public.notifications (user_id, type, title, message, icon_url, action_url)
    VALUES (
      NEW.user_id,
      'join_accepted',
      'Request Accepted! 🎤',
      'Your request to speak was accepted. Join the stage!',
      NEW.user_avatar,
      '/podcasts'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_join_request_accepted
AFTER UPDATE ON public.space_join_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_join_accepted();
