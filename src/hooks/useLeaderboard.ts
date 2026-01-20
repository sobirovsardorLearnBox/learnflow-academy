import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { QUERY_STALE_TIMES, QUERY_GC_TIMES, queryKeys } from '@/lib/query-config';

export interface LeaderboardEntry {
  user_id: string;
  name: string;
  avatar_url: string | null;
  completed_lessons: number;
  completed_units: number;
  total_score: number;
  last_activity: string | null;
}

// Get global student leaderboard - prefer useOptimizedLeaderboard for production
export const useLeaderboard = (limit: number = 50) => {
  return useQuery({
    queryKey: queryKeys.leaderboard(undefined, limit),
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_student_leaderboard', { limit_count: limit });

      if (error) throw error;
      return (data || []) as LeaderboardEntry[];
    },
    staleTime: QUERY_STALE_TIMES.leaderboard,
    gcTime: QUERY_GC_TIMES.realtime,
    refetchOnWindowFocus: false,
  });
};

// Get group-specific leaderboard - prefer useOptimizedLeaderboard for production
export const useGroupLeaderboard = (groupId?: string) => {
  return useQuery({
    queryKey: queryKeys.groupLeaderboard(groupId),
    queryFn: async () => {
      if (!groupId) return [];
      
      const { data, error } = await supabase
        .rpc('get_group_leaderboard', { group_id_param: groupId });

      if (error) throw error;
      return (data || []) as LeaderboardEntry[];
    },
    enabled: !!groupId,
    staleTime: QUERY_STALE_TIMES.leaderboard,
    gcTime: QUERY_GC_TIMES.realtime,
    refetchOnWindowFocus: false,
  });
};

// Get user's groups for filtering
export const useUserGroups = (userId?: string) => {
  return useQuery({
    queryKey: queryKeys.userGroups(userId),
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('group_members')
        .select(`
          group_id,
          groups (
            id,
            name
          )
        `)
        .eq('user_id', userId)
        .eq('is_approved', true);

      if (error) throw error;
      return data?.map(d => ({
        id: (d.groups as any)?.id,
        name: (d.groups as any)?.name,
      })).filter(g => g.id) || [];
    },
    enabled: !!userId,
    staleTime: QUERY_STALE_TIMES.userProgress,
    gcTime: QUERY_GC_TIMES.userSpecific,
  });
};
