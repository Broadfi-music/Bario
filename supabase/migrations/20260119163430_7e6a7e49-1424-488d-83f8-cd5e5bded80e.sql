-- Create atomic score increment function for battle double-tap sync
CREATE OR REPLACE FUNCTION public.increment_battle_score(
  battle_uuid UUID,
  score_side TEXT,
  increment_by INT DEFAULT 5
) RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  IF score_side = 'host' THEN
    UPDATE public.podcast_battles 
    SET host_score = host_score + increment_by,
        updated_at = now()
    WHERE id = battle_uuid
    RETURNING json_build_object('host_score', host_score, 'opponent_score', opponent_score) INTO result;
  ELSIF score_side = 'opponent' THEN
    UPDATE public.podcast_battles 
    SET opponent_score = opponent_score + increment_by,
        updated_at = now()
    WHERE id = battle_uuid
    RETURNING json_build_object('host_score', host_score, 'opponent_score', opponent_score) INTO result;
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;