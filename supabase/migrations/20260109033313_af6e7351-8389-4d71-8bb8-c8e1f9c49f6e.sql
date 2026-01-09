-- Create table to link groups with units (content access)
CREATE TABLE public.group_units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(group_id, unit_id)
);

-- Enable RLS
ALTER TABLE public.group_units ENABLE ROW LEVEL SECURITY;

-- Admin can manage all group units
CREATE POLICY "Admins can manage group units" 
ON public.group_units 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Teachers can manage units for their own groups
CREATE POLICY "Teachers can manage their group units" 
ON public.group_units 
FOR ALL 
USING (is_teacher_of_group(group_id, auth.uid()));

-- Students can view units assigned to their groups
CREATE POLICY "Students can view their group units" 
ON public.group_units 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_units.group_id
    AND gm.user_id = auth.uid()
    AND gm.is_approved = true
  )
);

-- Create function to check if user has access to a unit
CREATE OR REPLACE FUNCTION public.user_has_unit_access(_user_id uuid, _unit_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Admins and teachers have access to all units
    has_role(_user_id, 'admin'::app_role) 
    OR has_role(_user_id, 'teacher'::app_role)
    OR EXISTS (
      -- Students have access if unit is assigned to their approved group
      SELECT 1 
      FROM group_units gu
      JOIN group_members gm ON gm.group_id = gu.group_id
      WHERE gu.unit_id = _unit_id
      AND gm.user_id = _user_id
      AND gm.is_approved = true
    )
$$;

-- Create function to check if user has access to a lesson
CREATE OR REPLACE FUNCTION public.user_has_lesson_access(_user_id uuid, _lesson_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Admins and teachers have access to all lessons
    has_role(_user_id, 'admin'::app_role) 
    OR has_role(_user_id, 'teacher'::app_role)
    OR EXISTS (
      -- Students have access if lesson's unit is assigned to their approved group
      SELECT 1 
      FROM lessons l
      JOIN group_units gu ON gu.unit_id = l.unit_id
      JOIN group_members gm ON gm.group_id = gu.group_id
      WHERE l.id = _lesson_id
      AND gm.user_id = _user_id
      AND gm.is_approved = true
    )
$$;