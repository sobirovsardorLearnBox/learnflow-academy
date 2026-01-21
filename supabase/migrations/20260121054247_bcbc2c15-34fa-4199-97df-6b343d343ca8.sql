-- Create videos storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'videos', 
  'videos', 
  true,
  524288000, -- 500MB limit
  ARRAY['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- Allow admins to upload videos
CREATE POLICY "Admins can upload videos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'videos' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to update videos
CREATE POLICY "Admins can update videos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'videos' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to delete videos
CREATE POLICY "Admins can delete videos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'videos' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow authenticated users to view videos (for students)
CREATE POLICY "Authenticated users can view videos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'videos');