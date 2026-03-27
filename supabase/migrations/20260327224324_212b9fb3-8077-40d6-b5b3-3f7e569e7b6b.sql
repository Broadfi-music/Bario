
-- Create host_posts table for social media style posts
CREATE TABLE public.host_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.host_posts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Posts viewable by everyone" ON public.host_posts FOR SELECT TO public USING (true);
CREATE POLICY "Users can create own posts" ON public.host_posts FOR INSERT TO public WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON public.host_posts FOR UPDATE TO public USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON public.host_posts FOR DELETE TO public USING (auth.uid() = user_id);
