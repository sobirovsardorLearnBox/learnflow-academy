-- Create group_sections table to link groups with sections
CREATE TABLE public.group_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(group_id, section_id)
);

-- Enable RLS
ALTER TABLE public.group_sections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage group sections"
ON public.group_sections
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can manage their group sections"
ON public.group_sections
FOR ALL
TO authenticated
USING (is_teacher_of_group(group_id, auth.uid()));

CREATE POLICY "Students can view their group sections"
ON public.group_sections
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM group_members gm
  WHERE gm.group_id = group_sections.group_id
  AND gm.user_id = auth.uid()
  AND gm.is_approved = true
));

CREATE POLICY "Block anonymous access to group_sections"
ON public.group_sections
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Update user_has_unit_access function to check section access
CREATE OR REPLACE FUNCTION public.user_has_unit_access(_user_id uuid, _unit_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    -- Admins and teachers have access to all units
    has_role(_user_id, 'admin'::app_role) 
    OR has_role(_user_id, 'teacher'::app_role)
    OR EXISTS (
      -- Students have access if unit's section is assigned to their approved group
      SELECT 1 
      FROM units u
      JOIN levels l ON l.id = u.level_id
      JOIN group_sections gs ON gs.section_id = l.section_id
      JOIN group_members gm ON gm.group_id = gs.group_id
      WHERE u.id = _unit_id
      AND gm.user_id = _user_id
      AND gm.is_approved = true
    )
$function$;

-- Update user_has_lesson_access function to check section access
CREATE OR REPLACE FUNCTION public.user_has_lesson_access(_user_id uuid, _lesson_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    -- Admins and teachers have access to all lessons
    has_role(_user_id, 'admin'::app_role) 
    OR has_role(_user_id, 'teacher'::app_role)
    OR EXISTS (
      -- Students have access if lesson's unit's section is assigned to their approved group
      SELECT 1 
      FROM lessons les
      JOIN units u ON u.id = les.unit_id
      JOIN levels l ON l.id = u.level_id
      JOIN group_sections gs ON gs.section_id = l.section_id
      JOIN group_members gm ON gm.group_id = gs.group_id
      WHERE les.id = _lesson_id
      AND gm.user_id = _user_id
      AND gm.is_approved = true
    )
$function$;