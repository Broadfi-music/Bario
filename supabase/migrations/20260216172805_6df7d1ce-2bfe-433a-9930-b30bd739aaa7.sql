
-- Fix overly permissive INSERT policy on notifications
-- Triggers use SECURITY DEFINER so they bypass RLS
-- For direct inserts, restrict to own user_id
DROP POLICY "Authenticated can insert notifications" ON public.notifications;

CREATE POLICY "Users can insert own notifications"
ON public.notifications FOR INSERT
WITH CHECK (auth.uid() = user_id);
