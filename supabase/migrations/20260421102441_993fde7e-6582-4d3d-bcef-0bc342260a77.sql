-- User credits ledger (separate from coin_packages which are for live-room gifting)
CREATE TABLE IF NOT EXISTS public.user_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance integer NOT NULL DEFAULT 5,
  total_earned integer NOT NULL DEFAULT 5,
  total_spent integer NOT NULL DEFAULT 0,
  total_purchased integer NOT NULL DEFAULT 0,
  plan text NOT NULL DEFAULT 'free',
  monthly_allowance integer NOT NULL DEFAULT 0,
  daily_free_credits integer NOT NULL DEFAULT 5,
  last_daily_grant_at timestamptz,
  plan_renews_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own credits" ON public.user_credits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own credits" ON public.user_credits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own credits" ON public.user_credits FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER set_user_credits_updated_at
  BEFORE UPDATE ON public.user_credits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Credit transactions ledger
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  type text NOT NULL,
  description text,
  reference_id text,
  balance_after integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own credit txns" ON public.credit_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own credit txns" ON public.credit_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_credit_txns_user ON public.credit_transactions(user_id, created_at DESC);

-- Credit packs catalog
CREATE TABLE IF NOT EXISTS public.credit_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  credits integer NOT NULL,
  bonus_credits integer NOT NULL DEFAULT 0,
  price_usd numeric(10,2) NOT NULL,
  is_popular boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active credit packs" ON public.credit_packs FOR SELECT USING (is_active = true);

INSERT INTO public.credit_packs (name, credits, bonus_credits, price_usd, is_popular, sort_order) VALUES
  ('Starter Pack', 50, 0, 2.00, false, 1),
  ('Creator Pack', 250, 25, 8.00, true, 2),
  ('Pro Pack', 600, 100, 18.00, false, 3),
  ('Studio Pack', 1500, 300, 40.00, false, 4);

-- Atomic credit deduction RPC
CREATE OR REPLACE FUNCTION public.deduct_user_credits(_user_id uuid, _amount integer, _description text DEFAULT 'Music generation', _reference_id text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance integer;
  new_balance integer;
BEGIN
  -- Ensure row exists
  INSERT INTO public.user_credits (user_id, balance, total_earned)
  VALUES (_user_id, 5, 5)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance INTO current_balance FROM public.user_credits WHERE user_id = _user_id FOR UPDATE;

  IF current_balance < _amount THEN
    RETURN json_build_object('success', false, 'error', 'insufficient_credits', 'balance', current_balance, 'required', _amount);
  END IF;

  new_balance := current_balance - _amount;

  UPDATE public.user_credits
  SET balance = new_balance,
      total_spent = total_spent + _amount,
      updated_at = now()
  WHERE user_id = _user_id;

  INSERT INTO public.credit_transactions (user_id, amount, type, description, reference_id, balance_after)
  VALUES (_user_id, -_amount, 'spend', _description, _reference_id, new_balance);

  RETURN json_build_object('success', true, 'balance', new_balance, 'spent', _amount);
END;
$$;

-- Atomic add credits (purchase / grant / daily refill)
CREATE OR REPLACE FUNCTION public.add_user_credits(_user_id uuid, _amount integer, _type text DEFAULT 'purchase', _description text DEFAULT NULL, _reference_id text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_balance integer;
BEGIN
  INSERT INTO public.user_credits (user_id, balance, total_earned)
  VALUES (_user_id, _amount, _amount)
  ON CONFLICT (user_id) DO UPDATE
    SET balance = public.user_credits.balance + _amount,
        total_earned = CASE WHEN _type IN ('grant','daily','plan') THEN public.user_credits.total_earned + _amount ELSE public.user_credits.total_earned END,
        total_purchased = CASE WHEN _type = 'purchase' THEN public.user_credits.total_purchased + _amount ELSE public.user_credits.total_purchased END,
        updated_at = now()
  RETURNING balance INTO new_balance;

  INSERT INTO public.credit_transactions (user_id, amount, type, description, reference_id, balance_after)
  VALUES (_user_id, _amount, _type, _description, _reference_id, new_balance);

  RETURN json_build_object('success', true, 'balance', new_balance);
END;
$$;

-- Auto-create user_credits row on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, balance, total_earned, plan, daily_free_credits, last_daily_grant_at)
  VALUES (NEW.id, 5, 5, 'free', 5, now())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_credits ON auth.users;
CREATE TRIGGER on_auth_user_created_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_credits();