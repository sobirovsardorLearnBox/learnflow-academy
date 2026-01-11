-- Block anonymous access to payments table
DROP POLICY IF EXISTS "Block anonymous access to payments" ON public.payments;
CREATE POLICY "Block anonymous access to payments"
ON public.payments
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Ensure profiles table also blocks anonymous access
DROP POLICY IF EXISTS "Block anonymous access to profiles" ON public.profiles;
CREATE POLICY "Block anonymous access to profiles"
ON public.profiles
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Block anonymous from quizzes as well
DROP POLICY IF EXISTS "Block anonymous access to quizzes" ON public.quizzes;
CREATE POLICY "Block anonymous access to quizzes"
ON public.quizzes
FOR ALL
TO anon
USING (false)
WITH CHECK (false);