-- Create host_playlists table for persistent playlist storage
CREATE TABLE public.host_playlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create host_playlist_tracks table for tracks in playlists
CREATE TABLE public.host_playlist_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID NOT NULL REFERENCES public.host_playlists(id) ON DELETE CASCADE,
  audio_url TEXT NOT NULL,
  title TEXT NOT NULL,
  duration_ms INTEGER,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.host_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.host_playlist_tracks ENABLE ROW LEVEL SECURITY;

-- RLS policies for host_playlists
CREATE POLICY "Users can view their own playlists" 
ON public.host_playlists 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own playlists" 
ON public.host_playlists 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own playlists" 
ON public.host_playlists 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own playlists" 
ON public.host_playlists 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for host_playlist_tracks
CREATE POLICY "Users can view tracks in their playlists" 
ON public.host_playlist_tracks 
FOR SELECT 
USING (
  playlist_id IN (
    SELECT id FROM public.host_playlists WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can add tracks to their playlists" 
ON public.host_playlist_tracks 
FOR INSERT 
WITH CHECK (
  playlist_id IN (
    SELECT id FROM public.host_playlists WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update tracks in their playlists" 
ON public.host_playlist_tracks 
FOR UPDATE 
USING (
  playlist_id IN (
    SELECT id FROM public.host_playlists WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete tracks from their playlists" 
ON public.host_playlist_tracks 
FOR DELETE 
USING (
  playlist_id IN (
    SELECT id FROM public.host_playlists WHERE user_id = auth.uid()
  )
);

-- Create trigger for updating timestamps
CREATE TRIGGER update_host_playlists_updated_at
BEFORE UPDATE ON public.host_playlists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();