-- Create tracks table for audio remix processing
CREATE TABLE public.tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  original_audio_url TEXT,
  era TEXT,
  genre TEXT NOT NULL,
  description TEXT,
  stems_enabled BOOLEAN DEFAULT false,
  remix_audio_url TEXT,
  fx_config JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'error')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own tracks" 
ON public.tracks 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tracks" 
ON public.tracks 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tracks" 
ON public.tracks 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tracks" 
ON public.tracks 
FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_tracks_updated_at
BEFORE UPDATE ON public.tracks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage buckets for audio files
INSERT INTO storage.buckets (id, name, public) VALUES ('original-audio', 'original-audio', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('remixed-audio', 'remixed-audio', true);

-- Storage policies for original-audio
CREATE POLICY "Users can upload their own original audio" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'original-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Original audio is publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'original-audio');

CREATE POLICY "Users can delete their own original audio" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'original-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for remixed-audio
CREATE POLICY "Users can upload their own remixed audio" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'remixed-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Remixed audio is publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'remixed-audio');

CREATE POLICY "Users can delete their own remixed audio" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'remixed-audio' AND auth.uid()::text = (storage.foldername(name))[1]);