import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { QUERY_STALE_TIMES, QUERY_GC_TIMES } from '@/lib/query-config';

export interface SectionProgress {
  section_id: string;
  total_lessons: number;
  completed_lessons: number;
  progress_percent: number;
  levels_count: number;
}

export interface LevelProgress {
  level_id: string;
  total_lessons: number;
  completed_lessons: number;
  progress_percent: number;
  units_count: number;
}

export interface UnitProgress {
  unit_id: string;
  total_lessons: number;
  completed_lessons: number;
  progress_percent: number;
  is_completed: boolean;
  average_score: number;
}

// Batch fetch section progress using optimized database function
export function useSectionProgressBatch(sectionIds: string[], userId?: string) {
  return useQuery({
    queryKey: ['section-progress-batch', sectionIds, userId],
    queryFn: async () => {
      if (!userId || sectionIds.length === 0) return {};

      const { data, error } = await supabase.rpc('get_section_progress_batch', {
        p_user_id: userId,
        p_section_ids: sectionIds,
      });

      if (error) throw error;

      const progressMap: Record<string, SectionProgress> = {};
      (data || []).forEach((item: SectionProgress) => {
        progressMap[item.section_id] = item;
      });

      return progressMap;
    },
    enabled: !!userId && sectionIds.length > 0,
    staleTime: QUERY_STALE_TIMES.userProgress,
    gcTime: QUERY_GC_TIMES.userSpecific,
  });
}

// Batch fetch level progress using optimized database function
export function useLevelProgressBatch(levelIds: string[], userId?: string) {
  return useQuery({
    queryKey: ['level-progress-batch', levelIds, userId],
    queryFn: async () => {
      if (!userId || levelIds.length === 0) return {};

      const { data, error } = await supabase.rpc('get_level_progress_batch', {
        p_user_id: userId,
        p_level_ids: levelIds,
      });

      if (error) throw error;

      const progressMap: Record<string, LevelProgress> = {};
      (data || []).forEach((item: LevelProgress) => {
        progressMap[item.level_id] = item;
      });

      return progressMap;
    },
    enabled: !!userId && levelIds.length > 0,
    staleTime: QUERY_STALE_TIMES.userProgress,
    gcTime: QUERY_GC_TIMES.userSpecific,
  });
}

// Batch fetch unit progress using optimized database function
export function useUnitProgressBatch(unitIds: string[], userId?: string) {
  return useQuery({
    queryKey: ['unit-progress-batch', unitIds, userId],
    queryFn: async () => {
      if (!userId || unitIds.length === 0) return {};

      const { data, error } = await supabase.rpc('get_unit_progress_batch', {
        p_user_id: userId,
        p_unit_ids: unitIds,
      });

      if (error) throw error;

      const progressMap: Record<string, UnitProgress> = {};
      (data || []).forEach((item: UnitProgress) => {
        progressMap[item.unit_id] = item;
      });

      return progressMap;
    },
    enabled: !!userId && unitIds.length > 0,
    staleTime: QUERY_STALE_TIMES.userProgress,
    gcTime: QUERY_GC_TIMES.userSpecific,
  });
}

// Optimized user courses fetch using database function
export function useUserCoursesOptimized(userId?: string) {
  return useQuery({
    queryKey: ['user-courses-optimized', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase.rpc('get_user_courses_optimized', {
        p_user_id: userId,
      });

      if (error) throw error;

      return data || [];
    },
    enabled: !!userId,
    staleTime: QUERY_STALE_TIMES.userProgress,
    gcTime: QUERY_GC_TIMES.userSpecific,
  });
}
