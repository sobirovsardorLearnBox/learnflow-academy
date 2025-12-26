import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Section {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  display_order: number;
  is_active: boolean;
}

export interface Level {
  id: string;
  section_id: string;
  name: string;
  level_number: number;
  description: string | null;
  is_active: boolean;
}

export interface Unit {
  id: string;
  level_id: string;
  name: string;
  unit_number: number;
  description: string | null;
  is_active: boolean;
}

export function useSections() {
  return useQuery({
    queryKey: ['sections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as Section[];
    },
  });
}

export function useLevels(sectionId?: string) {
  return useQuery({
    queryKey: ['levels', sectionId],
    queryFn: async () => {
      let query = supabase
        .from('levels')
        .select('*')
        .eq('is_active', true)
        .order('level_number', { ascending: true });

      if (sectionId) {
        query = query.eq('section_id', sectionId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Level[];
    },
    enabled: !!sectionId,
  });
}

export function useUnits(levelId?: string) {
  return useQuery({
    queryKey: ['units', levelId],
    queryFn: async () => {
      let query = supabase
        .from('units')
        .select('*')
        .eq('is_active', true)
        .order('unit_number', { ascending: true });

      if (levelId) {
        query = query.eq('level_id', levelId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Unit[];
    },
    enabled: !!levelId,
  });
}
