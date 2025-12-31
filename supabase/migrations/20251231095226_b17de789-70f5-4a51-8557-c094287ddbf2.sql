-- Create radio_stations table for user-created radio stations
CREATE TABLE public.radio_stations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  station_name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  logo_url TEXT,
  website_url TEXT,
  stream_url TEXT,
  is_live BOOLEAN DEFAULT false,
  listener_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.radio_stations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Radio stations are viewable by everyone" 
ON public.radio_stations FOR SELECT USING (true);

CREATE POLICY "Users can create their own radio station" 
ON public.radio_stations FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own radio station" 
ON public.radio_stations FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own radio station" 
ON public.radio_stations FOR DELETE USING (auth.uid() = user_id);

-- Create unique constraint so each user can only have one station
CREATE UNIQUE INDEX idx_radio_stations_user_id ON public.radio_stations(user_id);

-- Create radio_chats table for live chat messages
CREATE TABLE public.radio_chats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  station_id UUID NOT NULL REFERENCES public.radio_stations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_voicenote BOOLEAN DEFAULT false,
  voicenote_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.radio_chats ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Radio chats are viewable by everyone" 
ON public.radio_chats FOR SELECT USING (true);

CREATE POLICY "Authenticated users can send chat messages" 
ON public.radio_chats FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages" 
ON public.radio_chats FOR DELETE USING (auth.uid() = user_id);

-- Create radio_gifts table
CREATE TABLE public.radio_gifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  station_id UUID NOT NULL REFERENCES public.radio_stations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  gift_type TEXT NOT NULL,
  points_value INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.radio_gifts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Radio gifts are viewable by everyone" 
ON public.radio_gifts FOR SELECT USING (true);

CREATE POLICY "Authenticated users can send gifts" 
ON public.radio_gifts FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Create radio_subscriptions table
CREATE TABLE public.radio_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  station_id UUID NOT NULL REFERENCES public.radio_stations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.radio_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Subscriptions are viewable by everyone" 
ON public.radio_subscriptions FOR SELECT USING (true);

CREATE POLICY "Users can subscribe to stations" 
ON public.radio_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsubscribe" 
ON public.radio_subscriptions FOR DELETE USING (auth.uid() = user_id);

-- Create unique constraint for one subscription per user per station
CREATE UNIQUE INDEX idx_radio_subscriptions_unique ON public.radio_subscriptions(station_id, user_id);

-- Enable realtime for radio tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.radio_stations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.radio_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.radio_gifts;

-- Create function to automatically create radio station for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_radio_station()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.radio_stations (user_id, station_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'My Radio Station'));
  RETURN NEW;
END;
$$;

-- Create trigger for auto-creating radio station
CREATE TRIGGER on_auth_user_created_radio
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_radio_station();

-- Create updated_at trigger for radio_stations
CREATE TRIGGER update_radio_stations_updated_at
  BEFORE UPDATE ON public.radio_stations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();