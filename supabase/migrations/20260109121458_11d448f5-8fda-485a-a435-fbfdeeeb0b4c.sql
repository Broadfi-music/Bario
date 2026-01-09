-- Clean up all stale "live" sessions older than 1 hour
UPDATE podcast_sessions 
SET status = 'ended', ended_at = NOW() 
WHERE status = 'live' 
AND (started_at IS NULL OR started_at < NOW() - INTERVAL '1 hour')
AND ended_at IS NULL;

-- Clean up any sessions that were created but never properly ended (older than 2 hours)
UPDATE podcast_sessions 
SET status = 'ended', ended_at = NOW() 
WHERE status = 'live' 
AND ended_at IS NULL 
AND created_at < NOW() - INTERVAL '2 hours';

-- End any stale pending battles older than 1 hour
UPDATE podcast_battles 
SET status = 'ended', ended_at = NOW() 
WHERE status IN ('pending', 'active')
AND started_at IS NULL 
AND created_at < NOW() - INTERVAL '1 hour';

-- End any active battles older than 2 hours (safety cleanup)
UPDATE podcast_battles 
SET status = 'ended', ended_at = NOW() 
WHERE status = 'active'
AND ended_at IS NULL 
AND created_at < NOW() - INTERVAL '2 hours';