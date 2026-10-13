ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text, ADD COLUMN IF NOT EXISTS alt_phone text, ADD COLUMN IF NOT EXISTS home_address text;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS other_fees jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS other_fees numeric NOT NULL DEFAULT 0;

CREATE OR REPLACE VIEW public.property_catalog WITH (security_invoker = on) AS
SELECT id, agent_id, title, description, property_type, address, city, area, near_institution, bedrooms, bathrooms,
 rent, agency_fee, agreement_fee, caution_fee, images, videos, amenities, status, created_at, other_fees FROM public.properties;
GRANT SELECT ON public.property_catalog TO authenticated;

CREATE TABLE public.bank_accounts (
  user_id uuid PRIMARY KEY,
  bank_name text NOT NULL, account_number text NOT NULL CHECK (account_number ~ '^[0-9]{10}$'), account_name text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.bank_accounts TO authenticated;
GRANT ALL ON public.bank_accounts TO service_role;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bank read" ON public.bank_accounts FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "bank insert" ON public.bank_accounts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "bank update" ON public.bank_accounts FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL, amount numeric NOT NULL CHECK (amount > 0),
  bank_name text, account_number text, account_name text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz
);
GRANT SELECT, UPDATE ON public.withdrawals TO authenticated;
GRANT ALL ON public.withdrawals TO service_role;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wd read" ON public.withdrawals FOR SELECT TO authenticated USING (agent_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "wd admin update" ON public.withdrawals FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.agent_available_balance(_agent uuid) RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT sum(agent_commission) FROM public.payments WHERE agent_id=_agent AND status='released'),0)
       - COALESCE((SELECT sum(amount) FROM public.withdrawals WHERE agent_id=_agent AND status<>'rejected'),0)
$$;
GRANT EXECUTE ON FUNCTION public.agent_available_balance(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.request_withdrawal(_amount numeric) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b record; new_id uuid; a record;
BEGIN
  IF NOT public.has_role(auth.uid(),'agent') THEN RAISE EXCEPTION 'Only agents can withdraw'; END IF;
  SELECT * INTO b FROM public.bank_accounts WHERE user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Add your bank details first'; END IF;
  IF _amount IS NULL OR _amount < 1000 THEN RAISE EXCEPTION 'Minimum withdrawal is ₦1,000'; END IF;
  IF _amount > public.agent_available_balance(auth.uid()) THEN RAISE EXCEPTION 'Amount is more than your available balance'; END IF;
  INSERT INTO public.withdrawals(agent_id, amount, bank_name, account_number, account_name)
    VALUES (auth.uid(), _amount, b.bank_name, b.account_number, b.account_name) RETURNING id INTO new_id;
  FOR a IN SELECT user_id FROM public.user_roles WHERE role='admin' LOOP
    INSERT INTO public.notifications(user_id,title,body) VALUES (a.user_id,'New withdrawal request','An agent requested ₦' || to_char(_amount,'FM999,999,999,990') || ' to ' || b.bank_name);
  END LOOP;
  RETURN new_id;
END $$;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(numeric) TO authenticated;

CREATE TABLE public.wishlist (
  tenant_id uuid NOT NULL, property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (tenant_id, property_id)
);
GRANT SELECT, INSERT, DELETE ON public.wishlist TO authenticated;
GRANT ALL ON public.wishlist TO service_role;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wish read" ON public.wishlist FOR SELECT TO authenticated USING (tenant_id = auth.uid());
CREATE POLICY "wish insert" ON public.wishlist FOR INSERT TO authenticated WITH CHECK (tenant_id = auth.uid());
CREATE POLICY "wish delete" ON public.wishlist FOR DELETE TO authenticated USING (tenant_id = auth.uid());

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS inspection_fee numeric NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS group_id uuid;

CREATE OR REPLACE FUNCTION public.on_booking_created() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; a record; t text;
BEGIN
  SELECT title, agent_id INTO p FROM public.properties WHERE id = NEW.property_id;
  NEW.agent_id := p.agent_id;
  t := CASE WHEN NEW.kind='inspection' THEN 'New inspection request' ELSE 'New fast-track checkout' END;
  IF p.agent_id IS NOT NULL THEN
    INSERT INTO public.notifications(user_id,title,body) VALUES (p.agent_id, t,
      'A verified tenant requested ' || NEW.kind || ' for "' || p.title || '"' ||
      COALESCE(' on ' || to_char(NEW.scheduled_at AT TIME ZONE 'Africa/Lagos','DD Mon YYYY, HH24:MI'), ''));
  END IF;
  FOR a IN SELECT user_id FROM public.user_roles WHERE role='admin' AND user_id IS DISTINCT FROM p.agent_id LOOP
    INSERT INTO public.notifications(user_id,title,body) VALUES (a.user_id, t, 'Tenant booked ' || NEW.kind || ' for "' || p.title || '"');
  END LOOP;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.book_inspections(_property_ids uuid[], _scheduled_at timestamptz, _note text DEFAULT NULL) RETURNS numeric
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int; fee numeric; gid uuid := gen_random_uuid(); pid uuid; i int := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in'; END IF;
  n := COALESCE(array_length(_property_ids,1),0);
  IF n = 0 OR n > 10 THEN RAISE EXCEPTION 'Choose between 1 and 10 homes'; END IF;
  IF _scheduled_at IS NULL OR _scheduled_at < now() THEN RAISE EXCEPTION 'Pick a future date'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(_property_ids) x WHERE NOT EXISTS (SELECT 1 FROM public.properties WHERE id=x AND status='active')) THEN
    RAISE EXCEPTION 'One of the homes is no longer available'; END IF;
  fee := CASE WHEN n >= 2 THEN 2000 ELSE 0 END;
  FOREACH pid IN ARRAY _property_ids LOOP
    INSERT INTO public.bookings(property_id, tenant_id, kind, scheduled_at, note, group_id, inspection_fee)
      VALUES (pid, auth.uid(), 'inspection', _scheduled_at, left(_note, 500), gid, CASE WHEN i = 0 THEN fee ELSE 0 END);
    i := i + 1;
  END LOOP;
  DELETE FROM public.wishlist WHERE tenant_id = auth.uid() AND property_id = ANY(_property_ids);
  RETURN fee;
END $$;
GRANT EXECUTE ON FUNCTION public.book_inspections(uuid[], timestamptz, text) TO authenticated;