import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys, QUERY_STALE_TIMES, QUERY_GC_TIMES } from '@/lib/query-config';

export interface SectionCounts {
  [sectionId: string]: {
    levelsCount: number;
  };
}

export interface LevelCounts {
  [levelId: string]: {
    unitsCount: number;
  };
}

export function useSectionLevelCounts(sectionIds: string[]) {
  return useQuery({
    queryKey: ['section-level-counts', sectionIds],
    queryFn: async () => {
      if (sectionIds.length === 0) return {};

      const { data, error } = await supabase
        .from('levels')
        .select('id, section_id')
        .in('section_id', sectionIds)
        .eq('is_active', true);

      if (error) throw error;

      const counts: SectionCounts = {};
      sectionIds.forEach(id => {
        counts[id] = { levelsCount: 0 };
      });

      (data || []).forEach(level => {
        if (counts[level.section_id]) {
          counts[level.section_id].levelsCount++;
        }
      });

      return counts;
    },
    enabled: sectionIds.length > 0,
    staleTime: QUERY_STALE_TIMES.levels,
    gcTime: QUERY_GC_TIMES.default,
  });
}

export function useLevelUnitCounts(levelIds: string[]) {
  return useQuery({
    queryKey: ['level-unit-counts', levelIds],
    queryFn: async () => {
      if (levelIds.length === 0) return {};

      const { data, error } = await supabase
        .from('units')
        .select('id, level_id')
        .in('level_id', levelIds)
        .eq('is_active', true);

      if (error) throw error;

      const counts: LevelCounts = {};
      levelIds.forEach(id => {
        counts[id] = { unitsCount: 0 };
      });

      (data || []).forEach(unit => {
        if (counts[unit.level_id]) {
          counts[unit.level_id].unitsCount++;
        }
      });

      return counts;
    },
    enabled: levelIds.length > 0,
    staleTime: QUERY_STALE_TIMES.units,
    gcTime: QUERY_GC_TIMES.default,
  });
}
