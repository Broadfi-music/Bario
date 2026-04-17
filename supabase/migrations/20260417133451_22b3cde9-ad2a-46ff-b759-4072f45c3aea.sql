ALTER TABLE public.vocal_projects 
ADD COLUMN IF NOT EXISTS variation_errors text[] DEFAULT ARRAY[]::text[],
ADD COLUMN IF NOT EXISTS variation_launch_at timestamptz[] DEFAULT ARRAY[]::timestamptz[];