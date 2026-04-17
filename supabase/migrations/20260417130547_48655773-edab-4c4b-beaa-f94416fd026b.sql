ALTER TABLE public.vocal_projects
  ADD COLUMN IF NOT EXISTS vocal_bpm numeric,
  ADD COLUMN IF NOT EXISTS vocal_key text,
  ADD COLUMN IF NOT EXISTS vocal_energy numeric,
  ADD COLUMN IF NOT EXISTS vocal_phrases jsonb,
  ADD COLUMN IF NOT EXISTS vocal_duration_seconds numeric,
  ADD COLUMN IF NOT EXISTS variation_engines text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS variation_statuses text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS variation_prediction_ids text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS reference_track_url text,
  ADD COLUMN IF NOT EXISTS user_prompt text;