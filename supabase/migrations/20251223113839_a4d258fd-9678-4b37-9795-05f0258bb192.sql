-- Add banned_users table for podcast sessions
CREATE TABLE public.podcast_banned_users (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES public.podcast_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    banned_by UUID NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(session_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.podcast_banned_users ENABLE ROW LEVEL SECURITY;

-- Policies for banned users table
CREATE POLICY "Anyone can view bans for sessions they are in"
ON public.podcast_banned_users
FOR SELECT
USING (true);

CREATE POLICY "Hosts can ban users"
ON public.podcast_banned_users
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.podcast_sessions
        WHERE id = session_id AND host_id = auth.uid()
    )
);

CREATE POLICY "Hosts can unban users"
ON public.podcast_banned_users
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.podcast_sessions
        WHERE id = session_id AND host_id = auth.uid()
    )
);

-- Add current_session_id to track user's active session
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS current_session_id UUID REFERENCES public.podcast_sessions(id) ON DELETE SET NULL;