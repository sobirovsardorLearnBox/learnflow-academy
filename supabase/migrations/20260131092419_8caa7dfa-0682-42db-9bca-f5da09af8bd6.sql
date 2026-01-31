-- =====================================================
-- FINAL CLEANUP: Remove all remaining problematic policies
-- =====================================================

-- Remove old "Block anonymous access" policies that still exist (with exact names)
DROP POLICY IF EXISTS "Block anonymous access to attendance" ON public.attendance;
DROP POLICY IF EXISTS "Block anonymous access to devices" ON public.devices;
DROP POLICY IF EXISTS "Block anonymous access to group_members" ON public.group_members;
DROP POLICY IF EXISTS "Block anonymous access to group_sections" ON public.group_sections;
DROP POLICY IF EXISTS "Block anonymous access to groups" ON public.groups;
DROP POLICY IF EXISTS "Block anonymous access to lesson_progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "Block anonymous access to payments" ON public.payments;
DROP POLICY IF EXISTS "Block anonymous access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Block anonymous access to quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Block anonymous access to user_progress" ON public.user_progress;
DROP POLICY IF EXISTS "Block anonymous access to user_roles" ON public.user_roles;

-- Remove "Thumbnails are publicly viewable" from storage
DROP POLICY IF EXISTS "Thumbnails are publicly viewable" ON storage.objects;

-- Remove "System can insert notifications" if exists (we already added the authenticated version)
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;