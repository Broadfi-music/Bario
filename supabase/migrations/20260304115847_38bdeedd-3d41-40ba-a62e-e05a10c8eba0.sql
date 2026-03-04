
-- 1. Restrict profiles SELECT to authenticated users
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles viewable by authenticated users" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

-- 2. Restrict podcast_comments SELECT to authenticated users
DROP POLICY IF EXISTS "Anyone can view comments" ON public.podcast_comments;
CREATE POLICY "Authenticated users can view comments" ON public.podcast_comments
  FOR SELECT TO authenticated
  USING (true);

-- 3. Restrict podcast_sessions SELECT to authenticated users
DROP POLICY IF EXISTS "Anyone can view podcast sessions" ON public.podcast_sessions;
CREATE POLICY "Authenticated users can view sessions" ON public.podcast_sessions
  FOR SELECT TO authenticated
  USING (true);

-- 4. Restrict podcast_battles SELECT to authenticated users
DROP POLICY IF EXISTS "Anyone can view battles" ON public.podcast_battles;
CREATE POLICY "Authenticated users can view battles" ON public.podcast_battles
  FOR SELECT TO authenticated
  USING (true);

-- 5. Restrict strike_votes SELECT to authenticated users
DROP POLICY IF EXISTS "Anyone can read votes" ON public.strike_votes;
CREATE POLICY "Authenticated users can read votes" ON public.strike_votes
  FOR SELECT TO authenticated
  USING (true);

-- 6. Restrict podcast_episodes SELECT to authenticated users
DROP POLICY IF EXISTS "Anyone can view podcast episodes" ON public.podcast_episodes;
CREATE POLICY "Authenticated users can view episodes" ON public.podcast_episodes
  FOR SELECT TO authenticated
  USING (true);

-- 7. Restrict podcast_schedules SELECT to authenticated users
DROP POLICY IF EXISTS "Users can view all schedules" ON public.podcast_schedules;
CREATE POLICY "Authenticated users can view schedules" ON public.podcast_schedules
  FOR SELECT TO authenticated
  USING (true);
