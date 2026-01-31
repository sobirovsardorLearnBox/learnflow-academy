-- =====================================================
-- SECURITY FIX: Final cleanup of remaining policies
-- =====================================================

-- Fix storage policies - drop duplicates first then recreate
DROP POLICY IF EXISTS "Admins and teachers can upload thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload videos" ON storage.objects;

-- Create INSERT policies for storage
CREATE POLICY "Admins and teachers can upload thumbnails" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'thumbnails' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role)));

CREATE POLICY "Admins can upload videos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'videos' AND has_role(auth.uid(), 'admin'::app_role));