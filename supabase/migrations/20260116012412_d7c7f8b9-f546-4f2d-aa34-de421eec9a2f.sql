-- Add DELETE policy for podcast_episodes so hosts can delete their own episodes
CREATE POLICY "Hosts can delete their own episodes" 
ON public.podcast_episodes 
FOR DELETE 
USING (auth.uid() = host_id);