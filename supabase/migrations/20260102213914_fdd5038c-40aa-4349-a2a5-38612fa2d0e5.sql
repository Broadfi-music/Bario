-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view bans for sessions they are in" ON public.podcast_banned_users;

-- Create a restrictive policy: only session host or the banned user can view ban records
CREATE POLICY "Only hosts and banned users can view bans"
ON public.podcast_banned_users
FOR SELECT
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM podcast_sessions
    WHERE podcast_sessions.id = podcast_banned_users.session_id
    AND podcast_sessions.host_id = auth.uid()
  )
);