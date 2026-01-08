-- Add is_approved column to group_members for admin approval system
ALTER TABLE public.group_members
ADD COLUMN is_approved boolean NOT NULL DEFAULT false;

-- Add approved_at and approved_by columns
ALTER TABLE public.group_members
ADD COLUMN approved_at timestamp with time zone DEFAULT NULL;

ALTER TABLE public.group_members
ADD COLUMN approved_by uuid DEFAULT NULL;

-- Update RLS policy on groups table so teachers can only see their OWN groups (not all)
DROP POLICY IF EXISTS "Teachers can view all groups" ON public.groups;

CREATE POLICY "Teachers can view their own groups"
ON public.groups
FOR SELECT
USING (auth.uid() = teacher_id);

-- Add policy for students to view their group's teacher info
CREATE POLICY "Students can view groups they belong to"
ON public.groups
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = groups.id
    AND group_members.user_id = auth.uid()
    AND group_members.is_approved = true
  )
);

-- Allow teachers to view profiles of students in their groups (for displaying teacher info)
CREATE POLICY "Teachers can view profiles of their group members"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'teacher'::app_role) AND
  EXISTS (
    SELECT 1 FROM public.group_members gm
    JOIN public.groups g ON g.id = gm.group_id
    WHERE gm.user_id = profiles.user_id
    AND g.teacher_id = auth.uid()
  )
);

-- Allow students to view their teacher's profile
CREATE POLICY "Students can view their group teacher profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    JOIN public.groups g ON g.id = gm.group_id
    WHERE gm.user_id = auth.uid()
    AND gm.is_approved = true
    AND g.teacher_id = profiles.user_id
  )
);