
-- Allow anonymous users to view podcast sessions (fixes blank page for non-logged-in visitors)
CREATE POLICY "Sessions viewable by everyone" ON public.podcast_sessions FOR SELECT TO anon USING (true);

-- Allow anonymous users to view podcast episodes
CREATE POLICY "Episodes viewable by everyone" ON public.podcast_episodes FOR SELECT TO anon USING (true);

-- Allow anonymous users to view podcast schedules  
CREATE POLICY "Schedules viewable by everyone" ON public.podcast_schedules FOR SELECT TO anon USING (true);

-- Allow anonymous users to view battles
CREATE POLICY "Battles viewable by everyone" ON public.podcast_battles FOR SELECT TO anon USING (true);

-- Allow anonymous users to view comments
CREATE POLICY "Comments viewable by everyone" ON public.podcast_comments FOR SELECT TO anon USING (true);
