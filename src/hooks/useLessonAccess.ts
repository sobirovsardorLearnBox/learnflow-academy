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
    queryKey: ['lesson_access', lessonId, user?.user_id],
    queryFn: async () => {
      if (!lessonId || !user?.user_id) return null;

      const { data, error } = await supabase.rpc('check_lesson_access', {
        p_user_id: user.user_id,
        p_lesson_id: lessonId,
      });

      if (error) {
        console.error('Error checking lesson access:', error);
        throw error;
      }

      return data as unknown as LessonAccessResult;
    },
    enabled: !!lessonId && !!user?.user_id,
    staleTime: 30000, // 30 seconds
  });
}

export function useDailyLessonLimit() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['daily_lesson_limit', user?.user_id],
    queryFn: async () => {
      if (!user?.user_id) return null;

      const { data, error } = await supabase.rpc('can_complete_lesson_today', {
        p_user_id: user.user_id,
      });

      if (error) {
        console.error('Error checking daily limit:', error);
        throw error;
      }

      return data as unknown as DailyLimitResult;
    },
    enabled: !!user?.user_id,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: true,
  });
}
