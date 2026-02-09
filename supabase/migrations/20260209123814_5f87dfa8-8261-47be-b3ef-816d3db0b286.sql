CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, avatar_url, cover_image_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    COALESCE(
      NEW.raw_user_meta_data ->> 'avatar_url',
      'https://api.dicebear.com/9.x/adventurer/svg?seed=' || NEW.id::text
    ),
    'https://api.dicebear.com/9.x/shapes/svg?seed=' || NEW.id::text || '&size=800&backgroundColor=0a0a0a,1a1a2e,16213e'
  );
  RETURN NEW;
END;
$function$;