import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys, LeaderboardEntry } from '@/lib/api-client';
import { supabase } from '@/integrations/supabase/client';

interface UseOptimizedLeaderboardOptions {
  groupId?: string;
  limit?: number;
  offset?: number;
  enabled?: boolean;
}

export function useOptimizedLeaderboard(options: UseOptimizedLeaderboardOptions = {}) {
  const { groupId, limit = 50, offset = 0, enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.leaderboard(groupId, limit, offset),
    queryFn: async () => {
      // Try the optimized API gateway first
      const response = await apiClient.getLeaderboard({ groupId, limit, offset });
      
      if (response.success && response.data) {
        return response.data;
      }
      
      // Fallback to direct Supabase RPC call
      console.warn('API Gateway failed, falling back to direct RPC:', response.error);
      
      if (groupId) {
        const { data, error } = await supabase.rpc('get_group_leaderboard_optimized', {
          group_id_param: groupId,
          limit_count: limit,
          offset_count: offset,
        });
        if (error) throw error;
        return data as LeaderboardEntry[];
      } else {
        const { data, error } = await supabase.rpc('get_student_leaderboard_optimized', {
          limit_count: limit,
          offset_count: offset,
        });
        if (error) throw error;
        return data as LeaderboardEntry[];
      }
    },
    enabled,
    staleTime: 30000, // 30 seconds
    gcTime: 60000, // 1 minute (formerly cacheTime)
    refetchOnWindowFocus: false,
  });
}

export function useUserRank(userId?: string) {
  return useQuery({
    queryKey: queryKeys.userRank(userId),
    queryFn: async () => {
      const response = await apiClient.getUserRank(userId);
      
      if (response.success && response.data) {
        return response.data.rank;
      }
      
      // Fallback to direct RPC
      if (userId) {
        const { data, error } = await supabase.rpc('get_user_rank', {
          target_user_id: userId,
        });
        if (error) throw error;
        return data as number;
      }
      
      return null;
    },
    enabled: !!userId,
    staleTime: 60000,
  });
}

export function useDashboardStats(enabled = true) {
  return useQuery({
    queryKey: queryKeys.dashboardStats(),
    queryFn: async () => {
      const response = await apiClient.getDashboardStats();
      
      if (response.success && response.data) {
        return response.data;
      }
      
      // Fallback to direct RPC
      const { data, error } = await supabase.rpc('get_dashboard_stats');
      if (error) throw error;
      return (data as Array<typeof response.data>)?.[0] || data;
    },
    enabled,
    staleTime: 60000,
    gcTime: 120000,
  });
}

export function useHealthCheck(enabled = false) {
  return useQuery({
    queryKey: queryKeys.health(),
    queryFn: async () => {
      const response = await apiClient.getHealth();
      return response.data;
    },
    enabled,
    staleTime: 10000,
    refetchInterval: enabled ? 30000 : false,
  });
}
