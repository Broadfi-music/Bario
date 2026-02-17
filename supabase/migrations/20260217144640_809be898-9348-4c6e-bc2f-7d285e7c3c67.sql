
CREATE TABLE public.heatmap_engagement (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id text NOT NULL,
  country_code text NOT NULL DEFAULT 'GLOBAL',
  plays_count integer NOT NULL DEFAULT 0,
  saves_count integer NOT NULL DEFAULT 0,
  votes_count integer NOT NULL DEFAULT 0,
  score_boost double precision NOT NULL DEFAULT 0,
  last_played_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(track_id, country_code)
);

-- RLS: anyone can read, edge function (service role) handles writes
ALTER TABLE public.heatmap_engagement ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view engagement" ON public.heatmap_engagement FOR SELECT USING (true);

-- Index for fast lookups by country
CREATE INDEX idx_heatmap_engagement_country ON public.heatmap_engagement (country_code);
CREATE INDEX idx_heatmap_engagement_track ON public.heatmap_engagement (track_id);

-- Trigger for updated_at
CREATE TRIGGER update_heatmap_engagement_updated_at
  BEFORE UPDATE ON public.heatmap_engagement
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for live ranking updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.heatmap_engagement;
