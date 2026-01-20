import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface LessonAccessResult {
  can_access: boolean;
  reason: string | null;
  prev_lesson_id?: string;
  required_score?: number;
  current_score?: number;
  lessons_today: number;
  daily_limit: number | null;
}

export interface DailyLimitResult {
  can_complete: boolean;
  lessons_today: number;
  daily_limit: number | null;
  next_available: string | null;
}

export function useLessonAccess(lessonId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['lesson_access', lessonId, user?.id],
    queryFn: async () => {
      if (!lessonId || !user?.id) return null;

      const { data, error } = await supabase.rpc('check_lesson_access', {
        p_user_id: user.id,
        p_lesson_id: lessonId,
      });

      if (error) {
        console.error('Error checking lesson access:', error);
        throw error;
      }

      return data as unknown as LessonAccessResult;
    },
    enabled: !!lessonId && !!user?.id,
    staleTime: 30000, // 30 seconds
  });
}

export function useDailyLessonLimit() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['daily_lesson_limit', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase.rpc('can_complete_lesson_today', {
        p_user_id: user.id,
      });

      if (error) {
        console.error('Error checking daily limit:', error);
        throw error;
      }

      return data as unknown as DailyLimitResult;
    },
    enabled: !!user?.id,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: true,
  });
}
