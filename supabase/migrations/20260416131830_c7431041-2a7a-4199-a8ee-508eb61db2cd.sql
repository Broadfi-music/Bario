
-- Create vocal_projects table
CREATE TABLE public.vocal_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  original_vocal_url TEXT,
  clean_vocal_url TEXT,
  analysis_data JSONB,
  generated_prompt TEXT,
  beat_urls JSONB DEFAULT '[]'::jsonb,
  mixed_urls JSONB DEFAULT '[]'::jsonb,
  mastered_urls JSONB DEFAULT '[]'::jsonb,
  harmony_urls JSONB DEFAULT '[]'::jsonb,
  stem_urls JSONB DEFAULT '[]'::jsonb,
  final_urls JSONB DEFAULT '[]'::jsonb,
  current_prediction_id TEXT,
  selected_variation INTEGER,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  genre TEXT,
  description TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vocal_projects ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own vocal projects"
  ON public.vocal_projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own vocal projects"
  ON public.vocal_projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vocal projects"
  ON public.vocal_projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own vocal projects"
  ON public.vocal_projects FOR DELETE
  USING (auth.uid() = user_id);

-- Timestamp trigger
CREATE TRIGGER update_vocal_projects_updated_at
  BEFORE UPDATE ON public.vocal_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('vocal-projects', 'vocal-projects', true);

-- Storage policies
CREATE POLICY "Vocal project files are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'vocal-projects');

CREATE POLICY "Users can upload vocal project files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'vocal-projects' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update vocal project files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'vocal-projects' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete vocal project files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'vocal-projects' AND auth.uid()::text = (storage.foldername(name))[1]);
