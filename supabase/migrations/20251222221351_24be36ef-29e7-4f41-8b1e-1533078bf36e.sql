-- Create podcast sessions table for live sessions
CREATE TABLE public.podcast_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, live, ended
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  listener_count INTEGER DEFAULT 0,
  is_recording BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create podcast episodes table (saved sessions)
CREATE TABLE public.podcast_episodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.podcast_sessions(id) ON DELETE SET NULL,
  host_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  audio_url TEXT,
  duration_ms INTEGER,
  play_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create podcast schedules table
CREATE TABLE public.podcast_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  reminder_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create podcast participants table
CREATE TABLE public.podcast_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.podcast_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'listener', -- host, co_host, speaker, listener
  is_muted BOOLEAN DEFAULT true,
  hand_raised BOOLEAN DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create podcast comments table
CREATE TABLE public.podcast_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.podcast_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_emoji BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create podcast gifts table
CREATE TABLE public.podcast_gifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.podcast_sessions(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  gift_type TEXT NOT NULL, -- fire, heart, star, diamond, crown
  points_value INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.podcast_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.podcast_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.podcast_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.podcast_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.podcast_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.podcast_gifts ENABLE ROW LEVEL SECURITY;

-- Podcast sessions policies (public read, authenticated create/update own)
CREATE POLICY "Anyone can view podcast sessions" ON public.podcast_sessions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create sessions" ON public.podcast_sessions FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Hosts can update their sessions" ON public.podcast_sessions FOR UPDATE USING (auth.uid() = host_id);

-- Podcast episodes policies
CREATE POLICY "Anyone can view podcast episodes" ON public.podcast_episodes FOR SELECT USING (true);
CREATE POLICY "Hosts can create episodes" ON public.podcast_episodes FOR INSERT WITH CHECK (auth.uid() = host_id);

-- Podcast schedules policies
CREATE POLICY "Users can view all schedules" ON public.podcast_schedules FOR SELECT USING (true);
CREATE POLICY "Users can create own schedules" ON public.podcast_schedules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own schedules" ON public.podcast_schedules FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own schedules" ON public.podcast_schedules FOR DELETE USING (auth.uid() = user_id);

-- Podcast participants policies
CREATE POLICY "Anyone can view participants" ON public.podcast_participants FOR SELECT USING (true);
CREATE POLICY "Authenticated users can join" ON public.podcast_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their participation" ON public.podcast_participants FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can leave sessions" ON public.podcast_participants FOR DELETE USING (auth.uid() = user_id);

-- Podcast comments policies
CREATE POLICY "Anyone can view comments" ON public.podcast_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can comment" ON public.podcast_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Podcast gifts policies
CREATE POLICY "Anyone can view gifts" ON public.podcast_gifts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can send gifts" ON public.podcast_gifts FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Enable realtime for comments and participants
ALTER PUBLICATION supabase_realtime ADD TABLE public.podcast_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.podcast_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.podcast_gifts;