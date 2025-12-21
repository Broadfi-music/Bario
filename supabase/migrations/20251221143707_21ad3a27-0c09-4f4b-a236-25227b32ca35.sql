-- Create user predictions table for storing user-created predictions
CREATE TABLE public.user_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  song_id TEXT,
  song_title TEXT,
  artist_name TEXT,
  song_artwork TEXT,
  song_source TEXT,
  yes_votes INTEGER DEFAULT 0,
  no_votes INTEGER DEFAULT 0,
  total_votes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_predictions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Predictions are viewable by everyone" 
ON public.user_predictions 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own predictions" 
ON public.user_predictions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own predictions" 
ON public.user_predictions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own predictions" 
ON public.user_predictions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create prediction votes table
CREATE TABLE public.prediction_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prediction_id UUID NOT NULL REFERENCES public.user_predictions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  vote TEXT NOT NULL CHECK (vote IN ('yes', 'no')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(prediction_id, user_id)
);

-- Enable RLS
ALTER TABLE public.prediction_votes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Votes are viewable by everyone" 
ON public.prediction_votes 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own votes" 
ON public.prediction_votes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own votes" 
ON public.prediction_votes 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes" 
ON public.prediction_votes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for updating vote counts
CREATE OR REPLACE FUNCTION public.update_prediction_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.user_predictions 
    SET 
      yes_votes = yes_votes + CASE WHEN NEW.vote = 'yes' THEN 1 ELSE 0 END,
      no_votes = no_votes + CASE WHEN NEW.vote = 'no' THEN 1 ELSE 0 END,
      total_votes = total_votes + 1,
      updated_at = now()
    WHERE id = NEW.prediction_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.user_predictions 
    SET 
      yes_votes = yes_votes - CASE WHEN OLD.vote = 'yes' THEN 1 ELSE 0 END,
      no_votes = no_votes - CASE WHEN OLD.vote = 'no' THEN 1 ELSE 0 END,
      total_votes = total_votes - 1,
      updated_at = now()
    WHERE id = OLD.prediction_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_vote_counts
AFTER INSERT OR DELETE ON public.prediction_votes
FOR EACH ROW
EXECUTE FUNCTION public.update_prediction_vote_counts();