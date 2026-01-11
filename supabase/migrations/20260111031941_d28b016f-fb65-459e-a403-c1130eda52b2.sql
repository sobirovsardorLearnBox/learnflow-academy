-- Remove overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can access payments" ON public.payments;
DROP POLICY IF EXISTS "Authenticated users can access profiles" ON public.profiles;