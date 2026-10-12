CREATE POLICY "tenant sees properties they booked or paid" ON public.properties FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.payments x WHERE x.property_id = id AND x.tenant_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.bookings b WHERE b.property_id = id AND b.tenant_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.raise_dispute(_payment_id uuid, _reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.payments SET status='disputed', dispute_reason=_reason
  WHERE id=_payment_id AND tenant_id=auth.uid() AND status IN ('in_escrow','keys_handed');
  IF NOT FOUND THEN RAISE EXCEPTION 'Cannot dispute this payment'; END IF;
END $$;
GRANT EXECUTE ON FUNCTION public.raise_dispute(uuid, text) TO authenticated;