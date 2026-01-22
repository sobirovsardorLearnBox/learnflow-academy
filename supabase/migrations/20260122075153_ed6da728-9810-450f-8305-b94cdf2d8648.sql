-- Create thumbnails storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('thumbnails', 'thumbnails', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Add RLS policies for thumbnails bucket
-- Allow admins and teachers to upload thumbnails
CREATE POLICY "Admins and teachers can upload thumbnails"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'thumbnails' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'teacher')
  )
);

-- Allow admins and teachers to update thumbnails
CREATE POLICY "Admins and teachers can update thumbnails"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'thumbnails' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'teacher')
  )
);

-- Allow admins and teachers to delete thumbnails
CREATE POLICY "Admins and teachers can delete thumbnails"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'thumbnails' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'teacher')
  )
);

-- Allow public access to view thumbnails
CREATE POLICY "Thumbnails are publicly viewable"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'thumbnails');

-- Add thumbnail_url column to lessons table
ALTER TABLE public.lessons
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;