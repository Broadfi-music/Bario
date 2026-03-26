INSERT INTO storage.buckets (id, name, public) VALUES ('demo-audio', 'demo-audio', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read access for demo-audio" ON storage.objects FOR SELECT USING (bucket_id = 'demo-audio');

CREATE POLICY "Service role upload to demo-audio" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'demo-audio');

CREATE POLICY "Service role update demo-audio" ON storage.objects FOR UPDATE USING (bucket_id = 'demo-audio');

CREATE POLICY "Service role delete demo-audio" ON storage.objects FOR DELETE USING (bucket_id = 'demo-audio');