-- Create attendance table
CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  marked_by UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Admins can manage all attendance
CREATE POLICY "Admins can manage all attendance"
ON public.attendance
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Teachers can manage attendance for their group members
CREATE POLICY "Teachers can manage their students attendance"
ON public.attendance
FOR ALL
USING (
  has_role(auth.uid(), 'teacher'::app_role) AND
  EXISTS (
    SELECT 1 FROM group_members gm
    JOIN groups g ON g.id = gm.group_id
    WHERE gm.user_id = attendance.user_id
    AND g.teacher_id = auth.uid()
  )
);

-- Users can view their own attendance
CREATE POLICY "Users can view their own attendance"
ON public.attendance
FOR SELECT
USING (auth.uid() = user_id);

-- Block anonymous access
CREATE POLICY "Block anonymous access to attendance"
ON public.attendance
FOR ALL
USING (false)
WITH CHECK (false);

-- Add trigger for updated_at
CREATE TRIGGER update_attendance_updated_at
BEFORE UPDATE ON public.attendance
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();