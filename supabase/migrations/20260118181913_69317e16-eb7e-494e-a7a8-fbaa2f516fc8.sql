-- Add gift_count column to podcast_gifts table for tracking multiple gifts in one transaction
ALTER TABLE podcast_gifts ADD COLUMN IF NOT EXISTS gift_count INTEGER DEFAULT 1;