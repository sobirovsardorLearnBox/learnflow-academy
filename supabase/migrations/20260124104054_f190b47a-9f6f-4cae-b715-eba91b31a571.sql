-- Batch function to get section progress for multiple sections at once
CREATE OR REPLACE FUNCTION get_section_progress_batch(
  p_user_id UUID,
  p_section_ids UUID[]
)
RETURNS TABLE(
  section_id UUID,
  total_lessons BIGINT,
  completed_lessons BIGINT,
  progress_percent INTEGER,
  levels_count INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH section_lessons AS (
    SELECT 
      l.section_id,
      les.id as lesson_id
    FROM levels l
    JOIN units u ON u.level_id = l.id AND u.is_active = true
    JOIN lessons les ON les.unit_id = u.id AND les.is_active = true
    WHERE l.section_id = ANY(p_section_ids) AND l.is_active = true
  ),
  section_level_counts AS (
    SELECT 
      l.section_id,
      COUNT(*)::INTEGER as levels_count
    FROM levels l
    WHERE l.section_id = ANY(p_section_ids) AND l.is_active = true
    GROUP BY l.section_id
  ),
  completed_lessons AS (
    SELECT 
      sl.section_id,
      COUNT(lp.id) as completed_count
    FROM section_lessons sl
    LEFT JOIN lesson_progress lp ON lp.lesson_id = sl.lesson_id 
      AND lp.user_id = p_user_id 
      AND lp.completed = true
    GROUP BY sl.section_id
  ),
  total_lessons AS (
    SELECT 
      section_id,
      COUNT(*) as total_count
    FROM section_lessons
    GROUP BY section_id
  )
  SELECT 
    s.id as section_id,
    COALESCE(tl.total_count, 0)::BIGINT as total_lessons,
    COALESCE(cl.completed_count, 0)::BIGINT as completed_lessons,
    CASE 
      WHEN COALESCE(tl.total_count, 0) = 0 THEN 0
      ELSE ROUND((COALESCE(cl.completed_count, 0)::NUMERIC / tl.total_count) * 100)::INTEGER
    END as progress_percent,
    COALESCE(slc.levels_count, 0) as levels_count
  FROM unnest(p_section_ids) s(id)
  LEFT JOIN total_lessons tl ON tl.section_id = s.id
  LEFT JOIN completed_lessons cl ON cl.section_id = s.id
  LEFT JOIN section_level_counts slc ON slc.section_id = s.id;
END;
$$;

-- Batch function to get level progress for multiple levels at once
CREATE OR REPLACE FUNCTION get_level_progress_batch(
  p_user_id UUID,
  p_level_ids UUID[]
)
RETURNS TABLE(
  level_id UUID,
  total_lessons BIGINT,
  completed_lessons BIGINT,
  progress_percent INTEGER,
  units_count INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH level_lessons AS (
    SELECT 
      u.level_id,
      les.id as lesson_id
    FROM units u
    JOIN lessons les ON les.unit_id = u.id AND les.is_active = true
    WHERE u.level_id = ANY(p_level_ids) AND u.is_active = true
  ),
  level_unit_counts AS (
    SELECT 
      u.level_id,
      COUNT(*)::INTEGER as units_count
    FROM units u
    WHERE u.level_id = ANY(p_level_ids) AND u.is_active = true
    GROUP BY u.level_id
  ),
  completed_lessons AS (
    SELECT 
      ll.level_id,
      COUNT(lp.id) as completed_count
    FROM level_lessons ll
    LEFT JOIN lesson_progress lp ON lp.lesson_id = ll.lesson_id 
      AND lp.user_id = p_user_id 
      AND lp.completed = true
    GROUP BY ll.level_id
  ),
  total_lessons AS (
    SELECT 
      level_id,
      COUNT(*) as total_count
    FROM level_lessons
    GROUP BY level_id
  )
  SELECT 
    l.id as level_id,
    COALESCE(tl.total_count, 0)::BIGINT as total_lessons,
    COALESCE(cl.completed_count, 0)::BIGINT as completed_lessons,
    CASE 
      WHEN COALESCE(tl.total_count, 0) = 0 THEN 0
      ELSE ROUND((COALESCE(cl.completed_count, 0)::NUMERIC / tl.total_count) * 100)::INTEGER
    END as progress_percent,
    COALESCE(luc.units_count, 0) as units_count
  FROM unnest(p_level_ids) l(id)
  LEFT JOIN total_lessons tl ON tl.level_id = l.id
  LEFT JOIN completed_lessons cl ON cl.level_id = l.id
  LEFT JOIN level_unit_counts luc ON luc.level_id = l.id;
END;
$$;

-- Batch function to get unit progress for multiple units at once
CREATE OR REPLACE FUNCTION get_unit_progress_batch(
  p_user_id UUID,
  p_unit_ids UUID[]
)
RETURNS TABLE(
  unit_id UUID,
  total_lessons BIGINT,
  completed_lessons BIGINT,
  progress_percent INTEGER,
  is_completed BOOLEAN,
  average_score INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH unit_lessons AS (
    SELECT 
      les.unit_id,
      les.id as lesson_id
    FROM lessons les
    WHERE les.unit_id = ANY(p_unit_ids) AND les.is_active = true
  ),
  lesson_stats AS (
    SELECT 
      ul.unit_id,
      COUNT(ul.lesson_id) as total_count,
      COUNT(lp.id) FILTER (WHERE lp.completed = true) as completed_count,
      COALESCE(AVG(lp.score) FILTER (WHERE lp.completed = true), 0) as avg_score
    FROM unit_lessons ul
    LEFT JOIN lesson_progress lp ON lp.lesson_id = ul.lesson_id AND lp.user_id = p_user_id
    GROUP BY ul.unit_id
  ),
  unit_completion AS (
    SELECT 
      up.unit_id,
      up.completed
    FROM user_progress up
    WHERE up.user_id = p_user_id AND up.unit_id = ANY(p_unit_ids)
  )
  SELECT 
    u.id as unit_id,
    COALESCE(ls.total_count, 0)::BIGINT as total_lessons,
    COALESCE(ls.completed_count, 0)::BIGINT as completed_lessons,
    CASE 
      WHEN COALESCE(ls.total_count, 0) = 0 THEN 0
      ELSE ROUND((COALESCE(ls.completed_count, 0)::NUMERIC / ls.total_count) * 100)::INTEGER
    END as progress_percent,
    COALESCE(uc.completed, false) as is_completed,
    COALESCE(ls.avg_score, 0)::INTEGER as average_score
  FROM unnest(p_unit_ids) u(id)
  LEFT JOIN lesson_stats ls ON ls.unit_id = u.id
  LEFT JOIN unit_completion uc ON uc.unit_id = u.id;
END;
$$;

-- Optimized function to get user's courses with full hierarchy
CREATE OR REPLACE FUNCTION get_user_courses_optimized(p_user_id UUID)
RETURNS TABLE(
  group_id UUID,
  group_name TEXT,
  group_description TEXT,
  teacher_id UUID,
  teacher_name TEXT,
  sections_count BIGINT,
  total_progress INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id as group_id,
    g.name as group_name,
    g.description as group_description,
    g.teacher_id,
    p.name as teacher_name,
    COUNT(DISTINCT gs.section_id)::BIGINT as sections_count,
    0::INTEGER as total_progress
  FROM groups g
  INNER JOIN group_members gm ON gm.group_id = g.id
  INNER JOIN profiles p ON p.user_id = g.teacher_id
  LEFT JOIN group_sections gs ON gs.group_id = g.id
  WHERE gm.user_id = p_user_id 
    AND gm.is_approved = true 
    AND g.is_active = true
  GROUP BY g.id, g.name, g.description, g.teacher_id, p.name
  ORDER BY g.name;
END;
$$;