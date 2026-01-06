-- Drop the existing policy that doesn't work for INSERT
DROP POLICY IF EXISTS "Teachers can manage their own groups" ON public.groups;

-- Create separate policies for teachers
CREATE POLICY "Teachers can insert their own groups"
ON public.groups
FOR INSERT
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their own groups"
ON public.groups
FOR UPDATE
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own groups"
ON public.groups
FOR DELETE
USING (auth.uid() = teacher_id);