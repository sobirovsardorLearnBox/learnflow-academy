-- Create a function to check if a lesson is accessible to a student
CREATE OR REPLACE FUNCTION public.check_lesson_access(
  p_user_id uuid,
  p_lesson_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role app_role;
  lesson_record RECORD;
  prev_lesson_record RECORD;
  prev_progress RECORD;
  lessons_completed_today integer;
  result jsonb;
BEGIN
  -- Get user's role
  user_role := get_user_role(p_user_id);
  
  -- Admins and teachers have unlimited access
  IF user_role IN ('admin', 'teacher') THEN
    RETURN jsonb_build_object(
      'can_access', true,
      'reason', null,
      'lessons_today', 0,
      'daily_limit', null
    );
  END IF;
  
  -- Get the lesson info
  SELECT l.*, u.level_id, l.lesson_number as lesson_num
  INTO lesson_record
  FROM lessons l
  JOIN units u ON u.id = l.unit_id
  WHERE l.id = p_lesson_id AND l.is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'can_access', false,
      'reason', 'lesson_not_found',
      'lessons_today', 0,
      'daily_limit', 1
    );
  END IF;
  
  -- Count lessons completed today (calendar day)
  SELECT COUNT(*)
  INTO lessons_completed_today
  FROM lesson_progress lp
  WHERE lp.user_id = p_user_id
    AND lp.completed = true
    AND DATE(lp.completed_at) = CURRENT_DATE;
  
  -- Check if already completed 1 lesson today and trying to complete another
  -- (Allow access to view lessons, but limit completion - handled in mark_lesson_complete)
  
  -- Get the previous lesson in the same unit
  SELECT l.id, l.lesson_number
  INTO prev_lesson_record
  FROM lessons l
  WHERE l.unit_id = lesson_record.unit_id
    AND l.lesson_number = lesson_record.lesson_num - 1
    AND l.is_active = true
  ORDER BY l.lesson_number DESC
  LIMIT 1;
  
  -- First lesson in unit - check previous unit's last lesson
  IF prev_lesson_record IS NULL AND lesson_record.lesson_num > 1 THEN
    -- This shouldn't happen if lessons are numbered correctly
    NULL;
  ELSIF prev_lesson_record IS NULL THEN
    -- First lesson, check if there's a previous unit
    SELECT l.id
    INTO prev_lesson_record
    FROM lessons l
    JOIN units u ON u.id = l.unit_id
    JOIN units current_unit ON current_unit.id = lesson_record.unit_id
    WHERE u.level_id = lesson_record.level_id
      AND u.unit_number < current_unit.unit_number
      AND l.is_active = true
    ORDER BY u.unit_number DESC, l.lesson_number DESC
    LIMIT 1;
  END IF;
  
  -- If no previous lesson exists (very first lesson), allow access
  IF prev_lesson_record IS NULL THEN
    RETURN jsonb_build_object(
      'can_access', true,
      'reason', null,
      'lessons_today', lessons_completed_today,
      'daily_limit', 1
    );
  END IF;
  
  -- Check if user passed previous lesson with 80%+
  SELECT lp.score, lp.video_completed, lp.completed
  INTO prev_progress
  FROM lesson_progress lp
  WHERE lp.user_id = p_user_id
    AND lp.lesson_id = prev_lesson_record.id;
  
  -- If no progress on previous lesson
  IF prev_progress IS NULL THEN
    RETURN jsonb_build_object(
      'can_access', false,
      'reason', 'previous_lesson_not_completed',
      'prev_lesson_id', prev_lesson_record.id,
      'lessons_today', lessons_completed_today,
      'daily_limit', 1
    );
  END IF;
  
  -- Check if video was completed and score >= 80
  IF NOT COALESCE(prev_progress.video_completed, false) THEN
    RETURN jsonb_build_object(
      'can_access', false,
      'reason', 'previous_video_not_watched',
      'prev_lesson_id', prev_lesson_record.id,
      'lessons_today', lessons_completed_today,
      'daily_limit', 1
    );
  END IF;
  
  IF COALESCE(prev_progress.score, 0) < 80 THEN
    RETURN jsonb_build_object(
      'can_access', false,
      'reason', 'previous_score_too_low',
      'prev_lesson_id', prev_lesson_record.id,
      'required_score', 80,
      'current_score', COALESCE(prev_progress.score, 0),
      'lessons_today', lessons_completed_today,
      'daily_limit', 1
    );
  END IF;
  
  -- All checks passed
  RETURN jsonb_build_object(
    'can_access', true,
    'reason', null,
    'lessons_today', lessons_completed_today,
    'daily_limit', 1
  );
END;
$$;

-- Create a function to check if user can complete a lesson (daily limit check)
CREATE OR REPLACE FUNCTION public.can_complete_lesson_today(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role app_role;
  lessons_completed_today integer;
BEGIN
  -- Get user's role
  user_role := get_user_role(p_user_id);
  
  -- Admins and teachers have unlimited access
  IF user_role IN ('admin', 'teacher') THEN
    RETURN jsonb_build_object(
      'can_complete', true,
      'lessons_today', 0,
      'daily_limit', null,
      'next_available', null
    );
  END IF;
  
  -- Count lessons completed today
  SELECT COUNT(*)
  INTO lessons_completed_today
  FROM lesson_progress lp
  WHERE lp.user_id = p_user_id
    AND lp.completed = true
    AND DATE(lp.completed_at) = CURRENT_DATE;
  
  IF lessons_completed_today >= 1 THEN
    RETURN jsonb_build_object(
      'can_complete', false,
      'lessons_today', lessons_completed_today,
      'daily_limit', 1,
      'next_available', (CURRENT_DATE + INTERVAL '1 day')::text
    );
  END IF;
  
  RETURN jsonb_build_object(
    'can_complete', true,
    'lessons_today', lessons_completed_today,
    'daily_limit', 1,
    'next_available', null
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_lesson_access(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_complete_lesson_today(uuid) TO authenticated;