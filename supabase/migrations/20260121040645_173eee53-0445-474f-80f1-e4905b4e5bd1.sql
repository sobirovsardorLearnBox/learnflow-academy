
-- Fix lesson access to require previous lesson completed on a PREVIOUS day (not today)
-- Using Asia/Tashkent timezone for Uzbekistan

CREATE OR REPLACE FUNCTION public.check_lesson_access(p_lesson_id uuid, p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_lesson_number integer;
  v_unit_id uuid;
  v_prev_lesson_id uuid;
  v_prev_progress record;
  v_daily_limit integer;
  v_today_start timestamp with time zone;
  v_prev_completed_date date;
  v_today_date date;
BEGIN
  -- Get current day start in Tashkent timezone
  v_today_start := date_trunc('day', now() AT TIME ZONE 'Asia/Tashkent');
  v_today_date := (now() AT TIME ZONE 'Asia/Tashkent')::date;

  -- Get user role
  SELECT role INTO v_role
  FROM user_roles
  WHERE user_id = p_user_id;

  -- Admins and teachers have full access
  IF v_role IN ('admin', 'teacher') THEN
    RETURN json_build_object(
      'can_access', true,
      'reason', null,
      'current_score', null,
      'daily_limit', 999,
      'next_available', null
    );
  END IF;

  -- Get user's individual daily limit
  SELECT COALESCE(daily_lesson_limit, 1) INTO v_daily_limit
  FROM profiles
  WHERE user_id = p_user_id;

  IF v_daily_limit IS NULL THEN
    v_daily_limit := 1;
  END IF;

  -- Get lesson info
  SELECT lesson_number, unit_id INTO v_lesson_number, v_unit_id
  FROM lessons
  WHERE id = p_lesson_id;

  -- First lesson of a unit is always accessible (unless daily limit reached)
  IF v_lesson_number = 1 THEN
    RETURN json_build_object(
      'can_access', true,
      'reason', null,
      'current_score', null,
      'daily_limit', v_daily_limit,
      'next_available', null
    );
  END IF;

  -- Find the previous lesson in the same unit
  SELECT id INTO v_prev_lesson_id
  FROM lessons
  WHERE unit_id = v_unit_id
    AND lesson_number = v_lesson_number - 1
    AND is_active = true;

  -- If no previous lesson found, allow access
  IF v_prev_lesson_id IS NULL THEN
    RETURN json_build_object(
      'can_access', true,
      'reason', null,
      'current_score', null,
      'daily_limit', v_daily_limit,
      'next_available', null
    );
  END IF;

  -- Check previous lesson progress
  SELECT * INTO v_prev_progress
  FROM lesson_progress
  WHERE lesson_id = v_prev_lesson_id
    AND user_id = p_user_id;

  -- Previous lesson must be completed
  IF v_prev_progress IS NULL OR NOT v_prev_progress.completed THEN
    RETURN json_build_object(
      'can_access', false,
      'reason', 'previous_lesson_not_completed',
      'current_score', null,
      'daily_limit', v_daily_limit,
      'next_available', null
    );
  END IF;

  -- Video must be watched
  IF v_prev_progress.video_completed IS NOT TRUE THEN
    RETURN json_build_object(
      'can_access', false,
      'reason', 'previous_video_not_watched',
      'current_score', v_prev_progress.score,
      'daily_limit', v_daily_limit,
      'next_available', null
    );
  END IF;

  -- Score must be at least 80%
  IF COALESCE(v_prev_progress.score, 0) < 80 THEN
    RETURN json_build_object(
      'can_access', false,
      'reason', 'previous_score_too_low',
      'prev_lesson_id', v_prev_lesson_id,
      'required_score', 80,
      'current_score', v_prev_progress.score,
      'daily_limit', v_daily_limit,
      'next_available', null
    );
  END IF;

  -- NEW: Check if previous lesson was completed TODAY - if so, lock until tomorrow
  v_prev_completed_date := (v_prev_progress.completed_at AT TIME ZONE 'Asia/Tashkent')::date;
  
  IF v_prev_completed_date = v_today_date THEN
    -- Previous lesson was completed today, next lesson opens tomorrow
    RETURN json_build_object(
      'can_access', false,
      'reason', 'wait_until_tomorrow',
      'prev_lesson_id', v_prev_lesson_id,
      'current_score', v_prev_progress.score,
      'daily_limit', v_daily_limit,
      'next_available', v_today_start + interval '1 day'
    );
  END IF;

  -- All checks passed - access granted
  RETURN json_build_object(
    'can_access', true,
    'reason', null,
    'prev_lesson_id', v_prev_lesson_id,
    'current_score', v_prev_progress.score,
    'daily_limit', v_daily_limit,
    'next_available', null
  );
END;
$$;
