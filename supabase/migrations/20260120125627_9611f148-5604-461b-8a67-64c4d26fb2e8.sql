-- Drop the old function first
DROP FUNCTION IF EXISTS public.can_complete_lesson_today(uuid);

-- Create updated function with per-student limit support
CREATE OR REPLACE FUNCTION public.can_complete_lesson_today(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role app_role;
  v_lessons_today integer;
  v_daily_limit integer;
  v_next_available timestamp with time zone;
BEGIN
  -- Get user role
  SELECT role INTO v_role FROM user_roles WHERE user_id = p_user_id;
  
  -- Admins and teachers have unlimited access
  IF v_role IN ('admin', 'teacher') THEN
    RETURN json_build_object(
      'can_complete', true,
      'lessons_today', 0,
      'daily_limit', null,
      'next_available', null
    );
  END IF;
  
  -- Get per-student daily limit (default 1 if not set)
  SELECT COALESCE(daily_lesson_limit, 1) INTO v_daily_limit
  FROM profiles WHERE user_id = p_user_id;
  
  -- If no profile found, use default limit
  IF v_daily_limit IS NULL THEN
    v_daily_limit := 1;
  END IF;
  
  -- Count completed lessons today (using calendar day)
  SELECT COUNT(*) INTO v_lessons_today
  FROM lesson_progress
  WHERE user_id = p_user_id
    AND completed = true
    AND completed_at::date = CURRENT_DATE;
  
  -- Calculate next available time (tomorrow at midnight)
  v_next_available := (CURRENT_DATE + interval '1 day')::timestamp with time zone;
  
  RETURN json_build_object(
    'can_complete', v_lessons_today < v_daily_limit,
    'lessons_today', v_lessons_today,
    'daily_limit', v_daily_limit,
    'next_available', CASE WHEN v_lessons_today >= v_daily_limit THEN v_next_available ELSE null END
  );
END;
$$;

-- Also update check_lesson_access to use per-student limit
DROP FUNCTION IF EXISTS public.check_lesson_access(uuid, uuid);

CREATE OR REPLACE FUNCTION public.check_lesson_access(p_user_id uuid, p_lesson_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
  lesson_record RECORD;
  prev_lesson_record RECORD;
  prev_progress RECORD;
  lessons_completed_today integer;
  v_daily_limit integer;
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
  
  -- Get per-student daily limit
  SELECT COALESCE(daily_lesson_limit, 1) INTO v_daily_limit
  FROM profiles WHERE user_id = p_user_id;
  
  IF v_daily_limit IS NULL THEN
    v_daily_limit := 1;
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
      'daily_limit', v_daily_limit
    );
  END IF;
  
  -- Count lessons completed today (calendar day)
  SELECT COUNT(*)
  INTO lessons_completed_today
  FROM lesson_progress lp
  WHERE lp.user_id = p_user_id
    AND lp.completed = true
    AND DATE(lp.completed_at) = CURRENT_DATE;
  
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
    NULL;
  ELSIF prev_lesson_record IS NULL THEN
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
      'daily_limit', v_daily_limit
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
      'daily_limit', v_daily_limit
    );
  END IF;
  
  -- Check if video was completed and score >= 80
  IF NOT COALESCE(prev_progress.video_completed, false) THEN
    RETURN jsonb_build_object(
      'can_access', false,
      'reason', 'previous_video_not_watched',
      'prev_lesson_id', prev_lesson_record.id,
      'lessons_today', lessons_completed_today,
      'daily_limit', v_daily_limit
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
      'daily_limit', v_daily_limit
    );
  END IF;
  
  -- All checks passed
  RETURN jsonb_build_object(
    'can_access', true,
    'reason', null,
    'lessons_today', lessons_completed_today,
    'daily_limit', v_daily_limit
  );
END;
$$;