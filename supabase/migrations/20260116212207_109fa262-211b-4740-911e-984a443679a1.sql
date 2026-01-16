-- Enable FULL replica identity for real-time gift display to work properly
ALTER TABLE podcast_gifts REPLICA IDENTITY FULL;

-- Ensure table is in realtime publication (ignore if already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'podcast_gifts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE podcast_gifts;
  END IF;
END $$;