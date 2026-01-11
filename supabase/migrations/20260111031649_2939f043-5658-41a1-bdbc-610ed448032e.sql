-- Drop the incorrect blocking policies
DROP POLICY IF EXISTS "Require authentication for profiles" ON public.profiles;
DROP POLICY IF EXISTS "Require authentication for payments" ON public.payments;

-- Create correct policies that require authentication (not block everyone)
CREATE POLICY "Authenticated users can access profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can access payments"
ON public.payments
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Add student access to quizzes (fixing another reported issue)
CREATE POLICY "Students can view active quizzes"
ON public.quizzes
FOR SELECT
TO authenticated
USING (is_active = true);