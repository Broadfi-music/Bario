-- Add proper storage policies for user-uploads bucket to fix avatar/cover uploads
-- First, make sure the bucket is public
UPDATE storage.buckets SET public = true WHERE id = 'user-uploads';

-- Drop existing policies if any (to recreate properly)
DROP POLICY IF EXISTS "Give users authenticated access to folder" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload files" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to user-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to user-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own uploads" ON storage.objects;

-- Create comprehensive policies for user-uploads bucket
CREATE POLICY "Public read access for user-uploads"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-uploads');

CREATE POLICY "Authenticated users can upload to user-uploads"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'user-uploads' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update own files in user-uploads"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'user-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own files in user-uploads"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'user-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);