-- =====================================================
-- PRODUCTION DATABASE OPTIMIZATION
-- Indexes for 10,000+ concurrent users
-- =====================================================

-- ==================== PROFILES TABLE ====================
-- Index for user lookups (most frequent query)
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- ==================== USER_ROLES TABLE ====================
-- Composite index for role checks (used in RLS)
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_role ON public.user_roles(user_id, role);

-- ==================== GROUPS TABLE ====================
-- Index for teacher lookups
CREATE INDEX IF NOT EXISTS idx_groups_teacher_id ON public.groups(teacher_id);
CREATE INDEX IF NOT EXISTS idx_groups_is_active ON public.groups(is_active) WHERE is_active = true;

-- ==================== GROUP_MEMBERS TABLE ====================
-- Composite indexes for membership queries
CREATE INDEX IF NOT EXISTS idx_group_members_group_user ON public.group_members(group_id, user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_approved ON public.group_members(user_id, is_approved) WHERE is_approved = true;
CREATE INDEX IF NOT EXISTS idx_group_members_group_approved ON public.group_members(group_id, is_approved) WHERE is_approved = true;

-- ==================== GROUP_SECTIONS TABLE ====================
CREATE INDEX IF NOT EXISTS idx_group_sections_group_id ON public.group_sections(group_id);
CREATE INDEX IF NOT EXISTS idx_group_sections_section_id ON public.group_sections(section_id);

-- ==================== GROUP_UNITS TABLE ====================
CREATE INDEX IF NOT EXISTS idx_group_units_group_id ON public.group_units(group_id);
CREATE INDEX IF NOT EXISTS idx_group_units_unit_id ON public.group_units(unit_id);

-- ==================== SECTIONS TABLE ====================
CREATE INDEX IF NOT EXISTS idx_sections_display_order ON public.sections(display_order);
CREATE INDEX IF NOT EXISTS idx_sections_active ON public.sections(is_active) WHERE is_active = true;

-- ==================== LEVELS TABLE ====================
CREATE INDEX IF NOT EXISTS idx_levels_section_id ON public.levels(section_id);
CREATE INDEX IF NOT EXISTS idx_levels_section_number ON public.levels(section_id, level_number);
CREATE INDEX IF NOT EXISTS idx_levels_active ON public.levels(is_active) WHERE is_active = true;

-- ==================== UNITS TABLE ====================
CREATE INDEX IF NOT EXISTS idx_units_level_id ON public.units(level_id);
CREATE INDEX IF NOT EXISTS idx_units_level_number ON public.units(level_id, unit_number);
CREATE INDEX IF NOT EXISTS idx_units_active ON public.units(is_active) WHERE is_active = true;

-- ==================== LESSONS TABLE ====================
CREATE INDEX IF NOT EXISTS idx_lessons_unit_id ON public.lessons(unit_id);
CREATE INDEX IF NOT EXISTS idx_lessons_unit_number ON public.lessons(unit_id, lesson_number);
CREATE INDEX IF NOT EXISTS idx_lessons_active ON public.lessons(is_active) WHERE is_active = true;

-- ==================== LESSON_PROGRESS TABLE ====================
-- Critical for leaderboard and progress tracking
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_id ON public.lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson_id ON public.lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_completed ON public.lesson_progress(user_id, completed) WHERE completed = true;
CREATE INDEX IF NOT EXISTS idx_lesson_progress_completed_at ON public.lesson_progress(completed_at DESC) WHERE completed = true;

-- ==================== USER_PROGRESS TABLE ====================
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON public.user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_unit_id ON public.user_progress(unit_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_completed ON public.user_progress(user_id, completed) WHERE completed = true;
CREATE INDEX IF NOT EXISTS idx_user_progress_completed_at ON public.user_progress(completed_at DESC) WHERE completed = true;

-- ==================== QUIZZES TABLE ====================
CREATE INDEX IF NOT EXISTS idx_quizzes_lesson_id ON public.quizzes(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_lesson_active ON public.quizzes(lesson_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_quizzes_order ON public.quizzes(lesson_id, question_order);

-- ==================== PAYMENTS TABLE ====================
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_user_status ON public.payments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_year_month ON public.payments(year, month);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);

-- ==================== ATTENDANCE TABLE ====================
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON public.attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON public.attendance(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_marked_by ON public.attendance(marked_by);

-- ==================== DEVICES TABLE ====================
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON public.devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_device_id ON public.devices(device_id);
CREATE INDEX IF NOT EXISTS idx_devices_user_approved ON public.devices(user_id, is_approved) WHERE is_approved = true;

-- =====================================================
-- OPTIMIZED DATABASE FUNCTIONS WITH CACHING HINTS
-- =====================================================

-- Optimized leaderboard function with LIMIT and better performance
CREATE OR REPLACE FUNCTION public.get_student_leaderboard_optimized(
  limit_count integer DEFAULT 50,
  offset_count integer DEFAULT 0
)
RETURNS TABLE(
  user_id uuid, 
  name text, 
  avatar_url text, 
  completed_lessons bigint, 
  completed_units bigint, 
  last_activity timestamp with time zone,
  rank bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH lesson_stats AS (
    SELECT 
      lp.user_id,
      COUNT(*) as lesson_count,
      MAX(lp.completed_at) as last_lesson
    FROM lesson_progress lp
    WHERE lp.completed = true
    GROUP BY lp.user_id
  ),
  unit_stats AS (
    SELECT 
      up.user_id,
      COUNT(*) as unit_count,
      MAX(up.completed_at) as last_unit
    FROM user_progress up
    WHERE up.completed = true
    GROUP BY up.user_id
  ),
  ranked_students AS (
    SELECT 
      p.user_id,
      p.name,
      p.avatar_url,
      COALESCE(ls.lesson_count, 0::bigint) as completed_lessons,
      COALESCE(us.unit_count, 0::bigint) as completed_units,
      GREATEST(ls.last_lesson, us.last_unit) as last_activity,
      ROW_NUMBER() OVER (
        ORDER BY COALESCE(ls.lesson_count, 0) DESC, 
                 COALESCE(us.unit_count, 0) DESC,
                 p.created_at ASC
      ) as rank
    FROM profiles p
    INNER JOIN user_roles ur ON ur.user_id = p.user_id AND ur.role = 'student'
    LEFT JOIN lesson_stats ls ON ls.user_id = p.user_id
    LEFT JOIN unit_stats us ON us.user_id = p.user_id
    WHERE COALESCE(ls.lesson_count, 0) > 0 OR COALESCE(us.unit_count, 0) > 0
  )
  SELECT 
    rs.user_id,
    rs.name,
    rs.avatar_url,
    rs.completed_lessons,
    rs.completed_units,
    rs.last_activity,
    rs.rank
  FROM ranked_students rs
  ORDER BY rs.rank
  LIMIT limit_count
  OFFSET offset_count;
END;
$function$;

-- Optimized group leaderboard with pagination
CREATE OR REPLACE FUNCTION public.get_group_leaderboard_optimized(
  group_id_param uuid,
  limit_count integer DEFAULT 50,
  offset_count integer DEFAULT 0
)
RETURNS TABLE(
  user_id uuid, 
  name text, 
  avatar_url text, 
  completed_lessons bigint, 
  completed_units bigint, 
  last_activity timestamp with time zone,
  rank bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH group_students AS (
    SELECT gm.user_id
    FROM group_members gm
    WHERE gm.group_id = group_id_param AND gm.is_approved = true
  ),
  lesson_stats AS (
    SELECT 
      lp.user_id,
      COUNT(*) as lesson_count,
      MAX(lp.completed_at) as last_lesson
    FROM lesson_progress lp
    WHERE lp.completed = true 
      AND lp.user_id IN (SELECT gs.user_id FROM group_students gs)
    GROUP BY lp.user_id
  ),
  unit_stats AS (
    SELECT 
      up.user_id,
      COUNT(*) as unit_count,
      MAX(up.completed_at) as last_unit
    FROM user_progress up
    WHERE up.completed = true
      AND up.user_id IN (SELECT gs.user_id FROM group_students gs)
    GROUP BY up.user_id
  ),
  ranked_students AS (
    SELECT 
      p.user_id,
      p.name,
      p.avatar_url,
      COALESCE(ls.lesson_count, 0::bigint) as completed_lessons,
      COALESCE(us.unit_count, 0::bigint) as completed_units,
      GREATEST(ls.last_lesson, us.last_unit) as last_activity,
      ROW_NUMBER() OVER (
        ORDER BY COALESCE(ls.lesson_count, 0) DESC, 
                 COALESCE(us.unit_count, 0) DESC
      ) as rank
    FROM profiles p
    INNER JOIN group_students gs ON gs.user_id = p.user_id
    LEFT JOIN lesson_stats ls ON ls.user_id = p.user_id
    LEFT JOIN unit_stats us ON us.user_id = p.user_id
  )
  SELECT 
    rs.user_id,
    rs.name,
    rs.avatar_url,
    rs.completed_lessons,
    rs.completed_units,
    rs.last_activity,
    rs.rank
  FROM ranked_students rs
  ORDER BY rs.rank
  LIMIT limit_count
  OFFSET offset_count;
END;
$function$;

-- Function to get user's rank efficiently
CREATE OR REPLACE FUNCTION public.get_user_rank(target_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_lessons bigint;
  user_units bigint;
  user_rank integer;
BEGIN
  -- Get user's stats
  SELECT COUNT(*) INTO user_lessons
  FROM lesson_progress
  WHERE user_id = target_user_id AND completed = true;
  
  SELECT COUNT(*) INTO user_units
  FROM user_progress
  WHERE user_id = target_user_id AND completed = true;
  
  -- Count users with more progress
  SELECT COUNT(*) + 1 INTO user_rank
  FROM (
    SELECT 
      p.user_id,
      COALESCE(lp.cnt, 0) as lessons,
      COALESCE(up.cnt, 0) as units
    FROM profiles p
    INNER JOIN user_roles ur ON ur.user_id = p.user_id AND ur.role = 'student'
    LEFT JOIN (
      SELECT user_id, COUNT(*) as cnt 
      FROM lesson_progress 
      WHERE completed = true 
      GROUP BY user_id
    ) lp ON lp.user_id = p.user_id
    LEFT JOIN (
      SELECT user_id, COUNT(*) as cnt 
      FROM user_progress 
      WHERE completed = true 
      GROUP BY user_id
    ) up ON up.user_id = p.user_id
    WHERE (COALESCE(lp.cnt, 0) > user_lessons)
       OR (COALESCE(lp.cnt, 0) = user_lessons AND COALESCE(up.cnt, 0) > user_units)
  ) better_users;
  
  RETURN user_rank;
END;
$function$;

-- Materialized stats for dashboard (can be refreshed periodically)
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS TABLE(
  total_students bigint,
  total_teachers bigint,
  total_groups bigint,
  total_lessons bigint,
  total_units bigint,
  active_students_today bigint,
  active_students_week bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM user_roles WHERE role = 'student')::bigint as total_students,
    (SELECT COUNT(*) FROM user_roles WHERE role = 'teacher')::bigint as total_teachers,
    (SELECT COUNT(*) FROM groups WHERE is_active = true)::bigint as total_groups,
    (SELECT COUNT(*) FROM lessons WHERE is_active = true)::bigint as total_lessons,
    (SELECT COUNT(*) FROM units WHERE is_active = true)::bigint as total_units,
    (SELECT COUNT(DISTINCT user_id) FROM lesson_progress 
     WHERE updated_at >= CURRENT_DATE)::bigint as active_students_today,
    (SELECT COUNT(DISTINCT user_id) FROM lesson_progress 
     WHERE updated_at >= CURRENT_DATE - INTERVAL '7 days')::bigint as active_students_week;
END;
$function$;