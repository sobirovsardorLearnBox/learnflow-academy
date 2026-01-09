-- Fix infinite recursion in group_members RLS policies
-- The issue is that "Teachers can manage members of their groups" policy 
-- references groups table which then might reference group_members causing recursion

-- Drop the problematic policy
DROP POLICY IF EXISTS "Teachers can manage members of their groups" ON public.group_members;

-- Recreate the policy with a simpler check that doesn't cause recursion
-- Use a function to check if user is the teacher of the group
CREATE OR REPLACE FUNCTION public.is_teacher_of_group(_group_id uuid, _teacher_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.groups
    WHERE id = _group_id
      AND teacher_id = _teacher_id
  )
$$;

-- Recreate the policy using the function
CREATE POLICY "Teachers can manage members of their groups" 
ON public.group_members 
FOR ALL 
USING (is_teacher_of_group(group_id, auth.uid()));