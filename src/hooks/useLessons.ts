import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type Lesson = Tables<'lessons'>;

export const useLessons = (unitId?: string) => {
  return useQuery({
    queryKey: ['lessons', unitId],
    queryFn: async () => {
      if (!unitId) return [];
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('unit_id', unitId)
        .eq('is_active', true)
        .order('lesson_number', { ascending: true });
      
      if (error) throw error;
      return data as Lesson[];
    },
    enabled: !!unitId,
  });
};

export const useLesson = (lessonId?: string) => {
  return useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: async () => {
      if (!lessonId) return null;
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', lessonId)
        .maybeSingle();
      
      if (error) throw error;
      return data as Lesson | null;
    },
    enabled: !!lessonId,
  });
};

export const useMarkLessonComplete = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ unitId, userId }: { unitId: string; userId: string }) => {
      const { data: existing, error: checkError } = await supabase
        .from('user_progress')
        .select('*')
        .eq('unit_id', unitId)
        .eq('user_id', userId)
        .maybeSingle();
      
      if (checkError) throw checkError;
      
      if (existing) {
        const { error } = await supabase
          .from('user_progress')
          .update({ completed: true, completed_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_progress')
          .insert({ unit_id: unitId, user_id: userId, completed: true, completed_at: new Date().toISOString() });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_progress'] });
    },
  });
};
