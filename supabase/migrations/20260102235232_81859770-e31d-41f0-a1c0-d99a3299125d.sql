-- Drop radio-related tables and their foreign key constraints
DROP TABLE IF EXISTS public.radio_gifts CASCADE;
DROP TABLE IF EXISTS public.radio_chats CASCADE;
DROP TABLE IF EXISTS public.radio_subscriptions CASCADE;
DROP TABLE IF EXISTS public.radio_stations CASCADE;

-- Drop the trigger for auto-creating radio stations for new users
DROP TRIGGER IF EXISTS on_auth_user_created_radio ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_radio_station();