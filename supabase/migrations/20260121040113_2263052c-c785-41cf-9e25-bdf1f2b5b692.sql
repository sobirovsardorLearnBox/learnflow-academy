-- Fix lessons RLS policy to restrict access to group members only
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view lessons" ON public.lessons;

-- Create proper RLS policy for lessons based on group membership
CREATE POLICY "Users can view lessons from their assigned groups"
ON public.lessons FOR SELECT
USING (
  -- Admins and teachers can view all lessons
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'teacher'::app_role) OR
  -- Students can only view lessons from units assigned to their approved groups
  EXISTS (
    SELECT 1 
    FROM units u
    JOIN group_units gu ON gu.unit_id = u.id
    JOIN group_members gm ON gm.group_id = gu.group_id
    WHERE u.id = lessons.unit_id
    AND gm.user_id = auth.uid()
    AND gm.is_approved = true
  )
);

-- Also update units policy for consistency
DROP POLICY IF EXISTS "Authenticated users can view units" ON public.units;

CREATE POLICY "Users can view units from their assigned groups"
ON public.units FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'teacher'::app_role) OR
  EXISTS (
    SELECT 1 
    FROM group_units gu
    JOIN group_members gm ON gm.group_id = gu.group_id
    WHERE gu.unit_id = units.id
    AND gm.user_id = auth.uid()
    AND gm.is_approved = true
  )
);

-- Update levels policy
DROP POLICY IF EXISTS "Authenticated users can view levels" ON public.levels;

CREATE POLICY "Users can view levels from their assigned groups"
ON public.levels FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'teacher'::app_role) OR
  EXISTS (
    SELECT 1 
    FROM units u
    JOIN group_units gu ON gu.unit_id = u.id
    JOIN group_members gm ON gm.group_id = gu.group_id
    WHERE u.level_id = levels.id
    AND gm.user_id = auth.uid()
    AND gm.is_approved = true
  )
);

-- Update sections policy
DROP POLICY IF EXISTS "Authenticated users can view sections" ON public.sections;

CREATE POLICY "Users can view sections from their assigned groups"
ON public.sections FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'teacher'::app_role) OR
  EXISTS (
    SELECT 1 
    FROM group_sections gs
    JOIN group_members gm ON gm.group_id = gs.group_id
    WHERE gs.section_id = sections.id
    AND gm.user_id = auth.uid()
    AND gm.is_approved = true
  )
);