-- Fix profiles table: require authentication for all access
CREATE POLICY "Require authentication for profiles"
ON public.profiles
FOR SELECT
TO anon
USING (false);

-- Fix payments table: require authentication for all access
CREATE POLICY "Require authentication for payments"
ON public.payments
FOR SELECT
TO anon
USING (false);

-- Also block anonymous access on other sensitive tables
CREATE POLICY "Block anonymous access to devices"
ON public.devices
FOR ALL
TO anon
USING (false);

CREATE POLICY "Block anonymous access to user_roles"
ON public.user_roles
FOR ALL
TO anon
USING (false);

CREATE POLICY "Block anonymous access to group_members"
ON public.group_members
FOR ALL
TO anon
USING (false);

CREATE POLICY "Block anonymous access to groups"
ON public.groups
FOR ALL
TO anon
USING (false);

CREATE POLICY "Block anonymous access to lesson_progress"
ON public.lesson_progress
FOR ALL
TO anon
USING (false);

CREATE POLICY "Block anonymous access to user_progress"
ON public.user_progress
FOR ALL
TO anon
USING (false);

-- Remove duplicate policy on groups table
DROP POLICY IF EXISTS "Teachers can insert their own groups" ON public.groups;