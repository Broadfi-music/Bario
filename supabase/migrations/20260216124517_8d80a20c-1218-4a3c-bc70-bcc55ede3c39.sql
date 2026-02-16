
-- Create space_join_requests table (no FK to podcast_sessions to support demo sessions)
CREATE TABLE public.space_join_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  user_name TEXT,
  user_avatar TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.space_join_requests ENABLE ROW LEVEL SECURITY;

-- Anyone in session can see requests
CREATE POLICY "Anyone can view join requests"
  ON public.space_join_requests FOR SELECT
  USING (true);

-- Authenticated users can create their own requests
CREATE POLICY "Users can create join requests"
  ON public.space_join_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own requests (cancel)
CREATE POLICY "Users can cancel own requests"
  ON public.space_join_requests FOR UPDATE
  USING (auth.uid() = user_id);

-- Hosts can update any request (accept/reject) - we'll handle host check in app logic
CREATE POLICY "Anyone authenticated can update requests"
  ON public.space_join_requests FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Users can delete their own requests
CREATE POLICY "Users can delete own requests"
  ON public.space_join_requests FOR DELETE
  USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.space_join_requests;
