-- Add a PERMISSIVE policy for users to read their own profile
-- This is required because RESTRICTIVE policies only work when there's at least one PERMISSIVE policy
CREATE POLICY "Users can read own profile permissive" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);