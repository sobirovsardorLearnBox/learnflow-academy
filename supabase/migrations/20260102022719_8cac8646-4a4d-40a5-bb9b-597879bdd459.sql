-- Create a secure function to get quizzes without exposing correct answers to non-admin users
CREATE OR REPLACE FUNCTION public.get_quiz_questions(p_lesson_id uuid)
RETURNS TABLE (
  id uuid,
  lesson_id uuid,
  question text,
  options jsonb,
  correct_answer integer,
  explanation text,
  question_order integer,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
BEGIN
  -- Get the current user's role
  user_role := get_user_role(auth.uid());
  
  -- Return full data for admins/teachers, hide correct_answer and explanation for students
  IF user_role IN ('admin', 'teacher') THEN
    RETURN QUERY
    SELECT 
      q.id,
      q.lesson_id,
      q.question,
      q.options,
      q.correct_answer,
      q.explanation,
      q.question_order,
      q.is_active,
      q.created_at,
      q.updated_at
    FROM quizzes q
    WHERE q.lesson_id = p_lesson_id AND q.is_active = true
    ORDER BY q.question_order ASC;
  ELSE
    -- For students, return -1 for correct_answer (they can only validate answers server-side)
    RETURN QUERY
    SELECT 
      q.id,
      q.lesson_id,
      q.question,
      q.options,
      -1 as correct_answer,
      NULL::text as explanation,
      q.question_order,
      q.is_active,
      q.created_at,
      q.updated_at
    FROM quizzes q
    WHERE q.lesson_id = p_lesson_id AND q.is_active = true
    ORDER BY q.question_order ASC;
  END IF;
END;
$$;

-- Create a function to validate quiz answer server-side
CREATE OR REPLACE FUNCTION public.check_quiz_answer(p_quiz_id uuid, p_selected_answer integer)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  quiz_record RECORD;
  is_correct boolean;
BEGIN
  -- Get the quiz record
  SELECT correct_answer, explanation INTO quiz_record
  FROM quizzes
  WHERE id = p_quiz_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Quiz not found');
  END IF;
  
  -- Check if answer is correct
  is_correct := (quiz_record.correct_answer = p_selected_answer);
  
  -- Return result with explanation (only after submission)
  RETURN jsonb_build_object(
    'is_correct', is_correct,
    'correct_answer', quiz_record.correct_answer,
    'explanation', quiz_record.explanation
  );
END;
$$;

-- Revoke direct SELECT on quizzes for authenticated users (admins keep access via RLS)
-- First drop the existing permissive SELECT policy for all authenticated users
DROP POLICY IF EXISTS "Authenticated users can view quizzes" ON public.quizzes;

-- Create new policy that only allows admins and teachers to directly query quizzes
CREATE POLICY "Admins and teachers can view quizzes"
ON public.quizzes
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));