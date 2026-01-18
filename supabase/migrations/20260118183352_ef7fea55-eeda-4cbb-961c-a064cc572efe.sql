-- Allow hosts to update their own episodes (including play count)
CREATE POLICY "Hosts can update their own episodes" 
ON public.podcast_episodes 
FOR UPDATE 
USING (auth.uid() = host_id);