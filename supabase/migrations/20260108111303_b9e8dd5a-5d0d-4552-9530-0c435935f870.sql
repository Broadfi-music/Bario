-- Clean up stale pending battles (older than 1 hour)
UPDATE public.podcast_battles 
SET status = 'ended', ended_at = NOW() 
WHERE status = 'pending' 
AND created_at < NOW() - INTERVAL '1 hour';

-- Clean up stale live sessions (older than 2 hours)  
UPDATE public.podcast_sessions 
SET status = 'ended', ended_at = NOW() 
WHERE status = 'live' 
AND started_at IS NOT NULL
AND started_at < NOW() - INTERVAL '2 hours';

-- Enable realtime for podcast_sessions table (if not already added)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'podcast_sessions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.podcast_sessions;
    END IF;
END $$;