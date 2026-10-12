CREATE TABLE public.property_contacts (
  property_id uuid PRIMARY KEY REFERENCES public.properties(id) ON DELETE CASCADE,
  landlord_name text, landlord_phone text, landlord_email text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_contacts TO authenticated;
GRANT ALL ON public.property_contacts TO service_role;
ALTER TABLE public.property_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contacts owner or admin" ON public.property_contacts FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.properties p WHERE p.id=property_id AND p.agent_id=auth.uid()))
WITH CHECK (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.properties p WHERE p.id=property_id AND p.agent_id=auth.uid()));
COMMENT ON COLUMN public.properties.landlord_name IS 'DEPRECATED: use property_contacts';
COMMENT ON COLUMN public.properties.landlord_phone IS 'DEPRECATED: use property_contacts';
CREATE POLICY "media upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='property-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "media read" ON storage.objects FOR SELECT USING (bucket_id='property-media');