-- Create podcast_battles table for tracking battle sessions
CREATE TABLE public.podcast_battles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES public.podcast_sessions(id) ON DELETE CASCADE,
    host_id UUID NOT NULL,
    opponent_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    duration_seconds INTEGER NOT NULL DEFAULT 300,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    winner_id UUID,
    host_score INTEGER NOT NULL DEFAULT 0,
    opponent_score INTEGER NOT NULL DEFAULT 0,
    rules JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.podcast_battles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view battles"
ON public.podcast_battles
FOR SELECT
USING (true);

CREATE POLICY "Hosts can create battles"
ON public.podcast_battles
FOR INSERT
WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Participants can update battles"
ON public.podcast_battles
FOR UPDATE
USING (auth.uid() = host_id OR auth.uid() = opponent_id);

-- Create battle_invites table for tracking invitations
CREATE TABLE public.battle_invites (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    battle_id UUID REFERENCES public.podcast_battles(id) ON DELETE CASCADE,
    from_user_id UUID NOT NULL,
    to_user_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.battle_invites ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can see their invites"
ON public.battle_invites
FOR SELECT
USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can create invites"
ON public.battle_invites
FOR INSERT
WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Invited users can update invites"
ON public.battle_invites
FOR UPDATE
USING (auth.uid() = to_user_id);

CREATE POLICY "Creators can delete their invites"
ON public.battle_invites
FOR DELETE
USING (auth.uid() = from_user_id);

-- Enable realtime for battles
ALTER PUBLICATION supabase_realtime ADD TABLE public.podcast_battles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_invites;