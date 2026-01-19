-- Grant execute permission on increment_battle_score to all users for double-tap sync
GRANT EXECUTE ON FUNCTION public.increment_battle_score(UUID, TEXT, INT) TO anon, authenticated;