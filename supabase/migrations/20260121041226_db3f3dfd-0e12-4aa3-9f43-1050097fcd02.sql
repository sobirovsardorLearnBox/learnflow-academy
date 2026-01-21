
-- Fix RLS policies for levels to use group_sections instead of group_units

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view levels from their assigned groups" ON levels;

-- Create correct policy using group_sections
CREATE POLICY "Users can view levels from their assigned groups" 
ON levels FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'teacher'::app_role)
  OR EXISTS (
    SELECT 1 
    FROM group_sections gs
    JOIN group_members gm ON gm.group_id = gs.group_id
    WHERE gs.section_id = levels.section_id
    AND gm.user_id = auth.uid()
    AND gm.is_approved = true
  )
);

-- Fix lessons RLS - needs to go through units -> levels -> sections -> group_sections
DROP POLICY IF EXISTS "Users can view lessons from their assigned groups" ON lessons;

CREATE POLICY "Users can view lessons from their assigned groups"
ON lessons FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'teacher'::app_role)
  OR EXISTS (
    SELECT 1 
    FROM units u
    JOIN levels l ON l.id = u.level_id
    JOIN group_sections gs ON gs.section_id = l.section_id
    JOIN group_members gm ON gm.group_id = gs.group_id
    WHERE u.id = lessons.unit_id
    AND gm.user_id = auth.uid()
    AND gm.is_approved = true
  )
);

-- Fix units RLS - needs to go through levels -> sections -> group_sections
DROP POLICY IF EXISTS "Users can view units from their assigned groups" ON units;

CREATE POLICY "Users can view units from their assigned groups"
ON units FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'teacher'::app_role)
  OR EXISTS (
    SELECT 1 
    FROM levels l
    JOIN group_sections gs ON gs.section_id = l.section_id
    JOIN group_members gm ON gm.group_id = gs.group_id
    WHERE l.id = units.level_id
    AND gm.user_id = auth.uid()
    AND gm.is_approved = true
  )
);
