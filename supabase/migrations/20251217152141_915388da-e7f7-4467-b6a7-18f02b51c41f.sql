-- Create artists table
CREATE TABLE public.heatmap_artists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  spotify_id TEXT,
  deezer_id TEXT,
  itunes_id TEXT,
  lastfm_mbid TEXT,
  audius_id TEXT,
  image_url TEXT,
  country TEXT,
  followers INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tracks table
CREATE TABLE public.heatmap_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  artist_id UUID REFERENCES public.heatmap_artists(id) ON DELETE CASCADE,
  artist_name TEXT NOT NULL,
  album_name TEXT,
  cover_image_url TEXT,
  preview_url TEXT,
  isrc TEXT,
  spotify_id TEXT,
  deezer_id TEXT,
  itunes_id TEXT,
  lastfm_mbid TEXT,
  audius_id TEXT,
  primary_genre TEXT,
  duration_ms INTEGER,
  spotify_url TEXT,
  deezer_url TEXT,
  apple_url TEXT,
  audius_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create track metrics snapshots (time-series)
CREATE TABLE public.heatmap_track_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id UUID REFERENCES public.heatmap_tracks(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  spotify_popularity INTEGER,
  deezer_chart_position_global INTEGER,
  deezer_chart_position_country INTEGER,
  country_code TEXT,
  lastfm_listeners INTEGER,
  lastfm_playcount INTEGER,
  audius_trending_rank INTEGER,
  youtube_view_count INTEGER,
  attention_score FLOAT DEFAULT 0,
  attention_score_change_24h FLOAT DEFAULT 0,
  attention_score_change_7d FLOAT DEFAULT 0,
  mindshare FLOAT DEFAULT 0
);

-- Create smart feed events
CREATE TABLE public.heatmap_smart_feed_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id UUID REFERENCES public.heatmap_tracks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create track comments for sentiment
CREATE TABLE public.heatmap_track_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id UUID REFERENCES public.heatmap_tracks(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_avatar TEXT,
  content TEXT NOT NULL,
  sentiment TEXT DEFAULT 'positive',
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create top voices/fans table
CREATE TABLE public.heatmap_top_voices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  avatar_url TEXT,
  score FLOAT DEFAULT 0,
  delta FLOAT DEFAULT 0,
  type TEXT DEFAULT 'fan',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.heatmap_artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.heatmap_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.heatmap_track_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.heatmap_smart_feed_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.heatmap_track_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.heatmap_top_voices ENABLE ROW LEVEL SECURITY;

-- Public read access for all heatmap tables
CREATE POLICY "Heatmap artists are viewable by everyone" ON public.heatmap_artists FOR SELECT USING (true);
CREATE POLICY "Heatmap tracks are viewable by everyone" ON public.heatmap_tracks FOR SELECT USING (true);
CREATE POLICY "Heatmap metrics are viewable by everyone" ON public.heatmap_track_metrics FOR SELECT USING (true);
CREATE POLICY "Heatmap events are viewable by everyone" ON public.heatmap_smart_feed_events FOR SELECT USING (true);
CREATE POLICY "Heatmap comments are viewable by everyone" ON public.heatmap_track_comments FOR SELECT USING (true);
CREATE POLICY "Heatmap voices are viewable by everyone" ON public.heatmap_top_voices FOR SELECT USING (true);

-- Allow authenticated users to add comments
CREATE POLICY "Authenticated users can add comments" ON public.heatmap_track_comments FOR INSERT WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_heatmap_tracks_artist ON public.heatmap_tracks(artist_id);
CREATE INDEX idx_heatmap_tracks_spotify ON public.heatmap_tracks(spotify_id);
CREATE INDEX idx_heatmap_metrics_track ON public.heatmap_track_metrics(track_id);
CREATE INDEX idx_heatmap_metrics_timestamp ON public.heatmap_track_metrics(timestamp);
CREATE INDEX idx_heatmap_events_track ON public.heatmap_smart_feed_events(track_id);

-- Enable realtime for metrics
ALTER PUBLICATION supabase_realtime ADD TABLE public.heatmap_track_metrics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.heatmap_smart_feed_events;