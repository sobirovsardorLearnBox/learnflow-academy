-- Allow teachers to create groups
CREATE POLICY "Teachers can create their own groups"
ON public.groups
FOR INSERT
TO authenticated
WITH CHECK (
  teacher_id = auth.uid() AND
  (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'teacher'::app_role))
);