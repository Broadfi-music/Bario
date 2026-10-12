CREATE TYPE public.app_role AS ENUM ('admin','agent','tenant');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text, email text, phone text, occupation text, institution text,
  next_of_kin text, id_number text, bio text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role)
$$;

CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own profile write" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- signup trigger: role from metadata limited to tenant/agent; admin for owner email
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r text := coalesce(NEW.raw_user_meta_data->>'role','tenant');
BEGIN
  INSERT INTO public.profiles(id, full_name, email, phone)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email, NEW.raw_user_meta_data->>'phone');
  IF lower(NEW.email) = 'adewaleayomide619@gmail.com' THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id,'admin');
  ELSIF r = 'agent' THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id,'agent');
  ELSE
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id,'tenant');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid,
  title text NOT NULL, description text, property_type text DEFAULT 'Self-contain',
  address text, city text DEFAULT 'Lagos', area text, near_institution text,
  bedrooms int DEFAULT 1, bathrooms int DEFAULT 1,
  rent numeric NOT NULL DEFAULT 0, agency_fee numeric NOT NULL DEFAULT 0,
  agreement_fee numeric NOT NULL DEFAULT 0, caution_fee numeric NOT NULL DEFAULT 0,
  images text[] NOT NULL DEFAULT '{}', videos text[] NOT NULL DEFAULT '{}',
  amenities text[] NOT NULL DEFAULT '{}',
  landlord_name text, landlord_phone text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','rented','rejected')),
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.properties TO authenticated;
GRANT ALL ON public.properties TO service_role;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view active or own" ON public.properties FOR SELECT TO authenticated USING (status='active' OR agent_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "agent insert" ON public.properties FOR INSERT TO authenticated WITH CHECK ((agent_id=auth.uid() AND status='pending' AND public.has_role(auth.uid(),'agent')) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "agent update pending" ON public.properties FOR UPDATE TO authenticated USING ((agent_id=auth.uid() AND status='pending') OR public.has_role(auth.uid(),'admin')) WITH CHECK ((agent_id=auth.uid() AND status='pending') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin delete" ON public.properties FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- landlord contact hidden from tenants: safe view
CREATE VIEW public.property_catalog WITH (security_invoker = on) AS
SELECT id, agent_id, title, description, property_type, address, city, area, near_institution, bedrooms, bathrooms,
 rent, agency_fee, agreement_fee, caution_fee, images, videos, amenities, status, created_at FROM public.properties;
GRANT SELECT ON public.property_catalog TO authenticated;
REVOKE SELECT (landlord_name, landlord_phone) ON public.properties FROM authenticated;

CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL, agent_id uuid,
  kind text NOT NULL DEFAULT 'inspection' CHECK (kind IN ('inspection','checkout')),
  scheduled_at timestamptz, note text,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','confirmed','completed','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "booking read" ON public.bookings FOR SELECT TO authenticated USING (tenant_id=auth.uid() OR agent_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "booking insert" ON public.bookings FOR INSERT TO authenticated WITH CHECK (tenant_id=auth.uid());
CREATE POLICY "booking update" ON public.bookings FOR UPDATE TO authenticated USING (tenant_id=auth.uid() OR agent_id=auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL, agent_id uuid,
  rent numeric NOT NULL DEFAULT 0, agency_fee numeric NOT NULL DEFAULT 0, agreement_fee numeric NOT NULL DEFAULT 0, caution_fee numeric NOT NULL DEFAULT 0,
  platform_fee numeric NOT NULL DEFAULT 0, total numeric NOT NULL DEFAULT 0,
  agent_commission numeric NOT NULL DEFAULT 0, landlord_payout numeric NOT NULL DEFAULT 0,
  reference text UNIQUE,
  status text NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated','in_escrow','keys_handed','released','refunded','disputed')),
  dispute_reason text,
  paid_at timestamptz, released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment read" ON public.payments FOR SELECT TO authenticated USING (tenant_id=auth.uid() OR agent_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "payment admin update" ON public.payments FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL, agent_id uuid,
  body text NOT NULL,
  tenant_signature text, signed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.agreements TO authenticated;
GRANT ALL ON public.agreements TO service_role;
ALTER TABLE public.agreements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agreement read" ON public.agreements FOR SELECT TO authenticated USING (tenant_id=auth.uid() OR agent_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "agreement sign" ON public.agreements FOR UPDATE TO authenticated USING (tenant_id=auth.uid() AND signed_at IS NULL);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, title text NOT NULL, body text, read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif read" ON public.notifications FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE POLICY "notif update" ON public.notifications FOR UPDATE TO authenticated USING (user_id=auth.uid());

-- notify agent when booking created
CREATE OR REPLACE FUNCTION public.on_booking_created() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record;
BEGIN
  SELECT title, agent_id INTO p FROM public.properties WHERE id = NEW.property_id;
  NEW.agent_id := p.agent_id;
  IF p.agent_id IS NOT NULL THEN
    INSERT INTO public.notifications(user_id,title,body) VALUES (p.agent_id,
      CASE WHEN NEW.kind='inspection' THEN 'New inspection request' ELSE 'New fast-track checkout' END,
      'A verified tenant requested ' || NEW.kind || ' for "' || p.title || '"');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER booking_created BEFORE INSERT ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.on_booking_created();