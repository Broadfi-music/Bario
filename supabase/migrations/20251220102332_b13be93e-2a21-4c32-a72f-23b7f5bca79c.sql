-- Create user_uploads table for uploaded music
CREATE TABLE public.user_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  audio_url TEXT NOT NULL,
  genre TEXT,
  album_id UUID,
  duration_ms INTEGER,
  play_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  spotify_url TEXT,
  apple_url TEXT,
  soundcloud_url TEXT,
  youtube_url TEXT,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create albums table for multi-track uploads
CREATE TABLE public.user_albums (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  genre TEXT,
  track_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create favorites table for user favorites
CREATE TABLE public.user_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  track_id TEXT NOT NULL,
  track_title TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  cover_image_url TEXT,
  preview_url TEXT,
  source TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, track_id, source)
);

-- Enable RLS
ALTER TABLE public.user_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_uploads
CREATE POLICY "Published uploads are viewable by everyone" 
ON public.user_uploads FOR SELECT 
USING (is_published = true OR auth.uid() = user_id);

CREATE POLICY "Users can create their own uploads" 
ON public.user_uploads FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own uploads" 
ON public.user_uploads FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own uploads" 
ON public.user_uploads FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for user_albums
CREATE POLICY "Albums are viewable by everyone" 
ON public.user_albums FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own albums" 
ON public.user_albums FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own albums" 
ON public.user_albums FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own albums" 
ON public.user_albums FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for user_favorites
CREATE POLICY "Users can view their own favorites" 
ON public.user_favorites FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own favorites" 
ON public.user_favorites FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites" 
ON public.user_favorites FOR DELETE 
USING (auth.uid() = user_id);

-- Create storage bucket for user uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('user-uploads', 'user-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for user-uploads bucket
CREATE POLICY "User uploads are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'user-uploads');

CREATE POLICY "Users can upload their own files" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'user-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own files" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'user-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own files" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'user-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Trigger for updated_at
CREATE TRIGGER update_user_uploads_updated_at
BEFORE UPDATE ON public.user_uploads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_albums_updated_at
BEFORE UPDATE ON public.user_albums
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();