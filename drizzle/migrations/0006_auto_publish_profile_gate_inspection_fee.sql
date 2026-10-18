CREATE OR REPLACE FUNCTION public.agent_profile_complete(_user uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id=_user AND length(trim(coalesce(full_name,'')))>=2 AND coalesce(phone,'') ~ '^\+?[0-9 ]{10,15}$' AND length(trim(coalesce(home_address,'')))>=5 AND length(trim(coalesce(email,'')))>3 AND length(trim(coalesce(avatar_url,'')))>0)
$$;
REVOKE ALL ON FUNCTION public.agent_profile_complete(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.agent_profile_complete(uuid) TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.publish_new_listing() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN
  IF auth.uid() IS NULL OR NEW.agent_id IS DISTINCT FROM auth.uid() OR NOT public.has_role(auth.uid(),'agent') THEN RAISE EXCEPTION 'Only agents can create listings'; END IF;
  IF NOT public.agent_profile_complete(auth.uid()) THEN RAISE EXCEPTION 'Complete your profile: full name, phone, email, home address and photo'; END IF;
 END IF;
 NEW.status := 'active';
 RETURN NEW;
END $$;
CREATE TRIGGER auto_publish_new_listing BEFORE INSERT ON public.properties FOR EACH ROW EXECUTE FUNCTION public.publish_new_listing();
ALTER POLICY "agent insert" ON public.properties WITH CHECK ((agent_id=auth.uid() AND status='active' AND public.has_role(auth.uid(),'agent') AND public.agent_profile_complete(auth.uid())) OR public.has_role(auth.uid(),'admin'));
ALTER POLICY "agent update pending" ON public.properties USING ((agent_id=auth.uid() AND status IN ('pending','active') AND public.has_role(auth.uid(),'agent') AND public.agent_profile_complete(auth.uid())) OR public.has_role(auth.uid(),'admin')) WITH CHECK ((agent_id=auth.uid() AND status IN ('pending','active') AND public.has_role(auth.uid(),'agent') AND public.agent_profile_complete(auth.uid())) OR public.has_role(auth.uid(),'admin'));
CREATE OR REPLACE FUNCTION public.notify_new_listing() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a record; agent_name text;
BEGIN
 SELECT full_name INTO agent_name FROM public.profiles WHERE id=NEW.agent_id;
 FOR a IN SELECT user_id FROM public.user_roles WHERE role='admin' LOOP
  INSERT INTO public.notifications(user_id,title,body) VALUES(a.user_id,'New property published',coalesce(agent_name,'Agent') || ' published "' || NEW.title || '". View Activity for agent details.');
 END LOOP;
 RETURN NEW;
END $$;
CREATE TRIGGER notify_listing_published AFTER INSERT ON public.properties FOR EACH ROW EXECUTE FUNCTION public.notify_new_listing();
CREATE OR REPLACE FUNCTION public.book_inspections(_property_ids uuid[], _scheduled_at timestamptz, _note text DEFAULT NULL) RETURNS numeric
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int; fee numeric; gid uuid := gen_random_uuid(); pid uuid; i int := 0;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in'; END IF;
 n := COALESCE(array_length(_property_ids,1),0);
 IF n = 0 OR n > 10 THEN RAISE EXCEPTION 'Choose between 1 and 10 homes'; END IF;
 IF _scheduled_at IS NULL OR _scheduled_at < now() THEN RAISE EXCEPTION 'Pick a future date'; END IF;
 IF EXISTS (SELECT 1 FROM unnest(_property_ids) x WHERE NOT EXISTS (SELECT 1 FROM public.properties WHERE id=x AND status='active')) THEN RAISE EXCEPTION 'One of the homes is no longer available'; END IF;
 fee := CASE WHEN n >= 2 THEN 3500 ELSE 0 END;
 FOREACH pid IN ARRAY _property_ids LOOP
  INSERT INTO public.bookings(property_id, tenant_id, kind, scheduled_at, note, group_id, inspection_fee)
  VALUES (pid, auth.uid(), 'inspection', _scheduled_at, left(_note, 500), gid, CASE WHEN i = 0 THEN fee ELSE 0 END);
  i := i + 1;
 END LOOP;
 DELETE FROM public.wishlist WHERE tenant_id = auth.uid() AND property_id = ANY(_property_ids);
 RETURN fee;
END $$;
GRANT EXECUTE ON FUNCTION public.book_inspections(uuid[], timestamptz, text) TO authenticated;