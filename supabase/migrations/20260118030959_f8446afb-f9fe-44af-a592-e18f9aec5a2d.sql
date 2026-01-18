-- Create a function to get student leaderboard data
-- This aggregates lesson completion counts safely for leaderboard display
CREATE OR REPLACE FUNCTION public.get_student_leaderboard(limit_count integer DEFAULT 50)
RETURNS TABLE(
  user_id uuid,
  name text,
  avatar_url text,
  completed_lessons bigint,
  completed_units bigint,
  last_activity timestamp with time zone
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.name,
    p.avatar_url,
    COALESCE(lp.lesson_count, 0::bigint) as completed_lessons,
    COALESCE(up.unit_count, 0::bigint) as completed_units,
    GREATEST(lp.last_lesson, up.last_unit) as last_activity
  FROM profiles p
  INNER JOIN user_roles ur ON ur.user_id = p.user_id AND ur.role = 'student'
  LEFT JOIN (
    SELECT 
      lesson_progress.user_id,
      COUNT(*) as lesson_count,
      MAX(completed_at) as last_lesson
    FROM lesson_progress
    WHERE completed = true
    GROUP BY lesson_progress.user_id
  ) lp ON lp.user_id = p.user_id
  LEFT JOIN (
    SELECT 
      user_progress.user_id,
      COUNT(*) as unit_count,
      MAX(completed_at) as last_unit
    FROM user_progress
    WHERE completed = true
    GROUP BY user_progress.user_id
  ) up ON up.user_id = p.user_id
  WHERE COALESCE(lp.lesson_count, 0) > 0 OR COALESCE(up.unit_count, 0) > 0
  ORDER BY COALESCE(lp.lesson_count, 0) DESC, COALESCE(up.unit_count, 0) DESC
  LIMIT limit_count;
END;
$$;

-- Create a function to get group-specific leaderboard for students
CREATE OR REPLACE FUNCTION public.get_group_leaderboard(group_id_param uuid)
RETURNS TABLE(
  user_id uuid,
  name text,
  avatar_url text,
  completed_lessons bigint,
  completed_units bigint,
  last_activity timestamp with time zone
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.name,
    p.avatar_url,
    COALESCE(lp.lesson_count, 0::bigint) as completed_lessons,
    COALESCE(up.unit_count, 0::bigint) as completed_units,
    GREATEST(lp.last_lesson, up.last_unit) as last_activity
  FROM profiles p
  INNER JOIN group_members gm ON gm.user_id = p.user_id 
    AND gm.group_id = group_id_param 
    AND gm.is_approved = true
  LEFT JOIN (
    SELECT 
      lesson_progress.user_id,
      COUNT(*) as lesson_count,
      MAX(completed_at) as last_lesson
    FROM lesson_progress
    WHERE completed = true
    GROUP BY lesson_progress.user_id
  ) lp ON lp.user_id = p.user_id
  LEFT JOIN (
    SELECT 
      user_progress.user_id,
      COUNT(*) as unit_count,
      MAX(completed_at) as last_unit
    FROM user_progress
    WHERE completed = true
    GROUP BY user_progress.user_id
  ) up ON up.user_id = p.user_id
  ORDER BY COALESCE(lp.lesson_count, 0) DESC, COALESCE(up.unit_count, 0) DESC;
END;
$$;