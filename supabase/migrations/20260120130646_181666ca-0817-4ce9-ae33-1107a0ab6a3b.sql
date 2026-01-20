-- Add daily_lesson_limit column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_lesson_limit integer DEFAULT 1;

-- Drop and recreate functions with proper handling
DROP FUNCTION IF EXISTS public.can_complete_lesson_today(uuid);
DROP FUNCTION IF EXISTS public.check_lesson_access(uuid, uuid);

-- Recreate can_complete_lesson_today function
CREATE OR REPLACE FUNCTION public.can_complete_lesson_today(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_lessons_today integer;
  v_daily_limit integer;
  v_next_available timestamp with time zone;
BEGIN
  -- Get user role
  SELECT role INTO v_role
  FROM user_roles
  WHERE user_id = p_user_id;

  -- Admins and teachers have unlimited access
  IF v_role IN ('admin', 'teacher') THEN
    RETURN json_build_object(
      'can_complete', true,
      'lessons_today', 0,
      'daily_limit', 999,
      'next_available', null
    );
  END IF;

  -- Get user's individual daily limit (default to 1 if not set)
  SELECT COALESCE(daily_lesson_limit, 1) INTO v_daily_limit
  FROM profiles
  WHERE user_id = p_user_id;

  -- If no profile found, use default limit
  IF v_daily_limit IS NULL THEN
    v_daily_limit := 1;
  END IF;

  -- Count lessons completed today
  SELECT COUNT(*) INTO v_lessons_today
  FROM lesson_progress
  WHERE user_id = p_user_id
    AND completed = true
    AND completed_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Tashkent')
    AND completed_at < date_trunc('day', now() AT TIME ZONE 'Asia/Tashkent') + interval '1 day';

  -- Calculate next available time (start of next day in Tashkent timezone)
  v_next_available := date_trunc('day', now() AT TIME ZONE 'Asia/Tashkent') + interval '1 day';

  RETURN json_build_object(
    'can_complete', v_lessons_today < v_daily_limit,
    'lessons_today', v_lessons_today,
    'daily_limit', v_daily_limit,
    'next_available', v_next_available
  );
END;
$$;

-- Recreate check_lesson_access function
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
BEGIN
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
      'daily_limit', 999
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

  -- First lesson of a unit is always accessible
  IF v_lesson_number = 1 THEN
    RETURN json_build_object(
      'can_access', true,
      'reason', null,
      'current_score', null,
      'daily_limit', v_daily_limit
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
      'daily_limit', v_daily_limit
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
      'daily_limit', v_daily_limit
    );
  END IF;

  -- Video must be watched
  IF v_prev_progress.video_completed IS NOT TRUE THEN
    RETURN json_build_object(
      'can_access', false,
      'reason', 'previous_video_not_watched',
      'current_score', v_prev_progress.score,
      'daily_limit', v_daily_limit
    );
  END IF;

  -- Score must be at least 80%
  IF COALESCE(v_prev_progress.score, 0) < 80 THEN
    RETURN json_build_object(
      'can_access', false,
      'reason', 'previous_score_too_low',
      'current_score', v_prev_progress.score,
      'daily_limit', v_daily_limit
    );
  END IF;

  -- All checks passed
  RETURN json_build_object(
    'can_access', true,
    'reason', null,
    'current_score', v_prev_progress.score,
    'daily_limit', v_daily_limit
  );
END;
$$;