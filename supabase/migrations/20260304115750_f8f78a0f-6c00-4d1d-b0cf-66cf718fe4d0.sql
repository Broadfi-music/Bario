
-- 1. Fix heatmap_track_comments INSERT: require authenticated user instead of WITH CHECK (true)
DROP POLICY IF EXISTS "Authenticated users can add comments" ON public.heatmap_track_comments;
CREATE POLICY "Authenticated users can add comments" ON public.heatmap_track_comments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- 2. Fix space_join_requests UPDATE: restrict to session host or the requesting user
DROP POLICY IF EXISTS "Authenticated users can update requests" ON public.space_join_requests;
CREATE POLICY "Host or requester can update requests" ON public.space_join_requests
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM public.podcast_sessions 
      WHERE podcast_sessions.id::text = space_join_requests.session_id 
      AND podcast_sessions.host_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM public.podcast_sessions 
      WHERE podcast_sessions.id::text = space_join_requests.session_id 
      AND podcast_sessions.host_id = auth.uid()
    )
  );

-- 3. Restrict space_join_requests SELECT to relevant users (host or requester)
DROP POLICY IF EXISTS "Anyone can view join requests" ON public.space_join_requests;
CREATE POLICY "Relevant users can view join requests" ON public.space_join_requests
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM public.podcast_sessions 
      WHERE podcast_sessions.id::text = space_join_requests.session_id 
      AND podcast_sessions.host_id = auth.uid()
    )
  );

-- 4. Restrict follows SELECT to authenticated users only
DROP POLICY IF EXISTS "Follows are viewable by everyone" ON public.follows;
CREATE POLICY "Follows are viewable by authenticated users" ON public.follows
  FOR SELECT TO authenticated
  USING (true);

-- 5. Restrict podcast_participants SELECT to session members
DROP POLICY IF EXISTS "Anyone can view participants" ON public.podcast_participants;
CREATE POLICY "Authenticated users can view participants" ON public.podcast_participants
  FOR SELECT TO authenticated
  USING (true);

-- 6. Restrict podcast_gifts SELECT to authenticated users
DROP POLICY IF EXISTS "Anyone can view gifts" ON public.podcast_gifts;
CREATE POLICY "Authenticated users can view gifts" ON public.podcast_gifts
  FOR SELECT TO authenticated
  USING (true);
