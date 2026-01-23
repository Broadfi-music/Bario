-- Create strike_votes table for Three Strike page persistence
CREATE TABLE public.strike_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('strike', 'save')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(track_id, user_id)
);

-- Enable RLS
ALTER TABLE public.strike_votes ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to vote
CREATE POLICY "Users can create votes" ON public.strike_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own votes
CREATE POLICY "Users can update own votes" ON public.strike_votes
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to delete their own votes
CREATE POLICY "Users can delete own votes" ON public.strike_votes
  FOR DELETE USING (auth.uid() = user_id);

-- Allow anyone to read votes for aggregation
CREATE POLICY "Anyone can read votes" ON public.strike_votes
  FOR SELECT USING (true);