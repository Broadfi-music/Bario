-- Enable REPLICA IDENTITY FULL for podcast_comments to fix realtime chat visibility
ALTER TABLE public.podcast_comments REPLICA IDENTITY FULL;

-- Also enable for podcast_gifts to ensure gift animations sync properly
ALTER TABLE public.podcast_gifts REPLICA IDENTITY FULL;

-- Ensure podcast_battles has REPLICA IDENTITY FULL for battle state updates
ALTER TABLE public.podcast_battles REPLICA IDENTITY FULL;