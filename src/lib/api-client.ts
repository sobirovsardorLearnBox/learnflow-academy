import { supabase } from "@/integrations/supabase/client";

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
  timestamp: string;
  cached?: boolean;
}

export interface LeaderboardEntry {
  user_id: string;
  name: string;
  avatar_url: string | null;
  completed_lessons: number;
  completed_units: number;
  total_score: number;
  last_activity: string | null;
  rank: number;
}

export interface DashboardStats {
  total_students: number;
  total_teachers: number;
  total_groups: number;
  total_lessons: number;
  total_units: number;
  active_students_today: number;
  active_students_week: number;
}

// API Client class with caching and retry logic
class ApiClient {
  private baseUrl: string;
  private cache = new Map<string, { data: unknown; expiry: number }>();

  constructor() {
    this.baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-gateway`;
  }

  private async getAuthHeader(): Promise<Record<string, string>> {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` };
    }
    return {};
  }

  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached || Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }
    return cached.data as T;
  }

  private setCache(key: string, data: unknown, ttlMs: number) {
    this.cache.set(key, { data, expiry: Date.now() + ttlMs });
  }

  async request<T>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      body?: unknown;
      useCache?: boolean;
      cacheTtl?: number;
    } = {}
  ): Promise<ApiResponse<T>> {
    const { method = 'GET', body, useCache = true, cacheTtl = 30000 } = options;
    
    // Check client-side cache for GET requests
    const cacheKey = `${method}:${endpoint}:${JSON.stringify(body || {})}`;
    if (method === 'GET' && useCache) {
      const cached = this.getCached<ApiResponse<T>>(cacheKey);
      if (cached) {
        return { ...cached, cached: true };
      }
    }

    try {
      const authHeaders = await this.getAuthHeader();
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json() as ApiResponse<T>;

      // Cache successful GET responses
      if (method === 'GET' && data.success && useCache) {
        this.setCache(cacheKey, data, cacheTtl);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Request failed',
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Leaderboard endpoints
  async getLeaderboard(params: { limit?: number; offset?: number; groupId?: string } = {}) {
    const { limit = 50, offset = 0, groupId } = params;
    const queryParams = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      ...(groupId && { group_id: groupId }),
    });
    
    return this.request<LeaderboardEntry[]>(`/leaderboard?${queryParams}`);
  }

  async getUserRank(userId?: string) {
    const params = userId ? `?user_id=${userId}` : '';
    return this.request<{ rank: number }>(`/user-rank${params}`);
  }

  // Dashboard stats
  async getDashboardStats() {
    return this.request<DashboardStats>('/dashboard-stats', { cacheTtl: 60000 });
  }

  // Health check
  async getHealth() {
    return this.request<{
      status: string;
      database: string;
      cache_size: number;
      rate_limit_entries: number;
      timestamp: string;
    }>('/health', { useCache: false });
  }

  // Progress sync
  async syncProgress(lessonId: string, completed: boolean) {
    return this.request<{ synced: boolean }>('/progress/sync', {
      method: 'POST',
      body: { lesson_id: lessonId, completed },
      useCache: false,
    });
  }

  // Quiz check
  async checkQuizAnswer(quizId: string, selectedAnswer: number) {
    return this.request<{
      is_correct: boolean;
      correct_answer: number;
      explanation: string;
    }>('/quiz/check', {
      method: 'POST',
      body: { quiz_id: quizId, selected_answer: selectedAnswer },
      useCache: false,
    });
  }

  // Clear client-side cache
  clearCache() {
    this.cache.clear();
  }

  // Invalidate cache entries matching a pattern
  invalidateCache(pattern: string) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

// Singleton instance
export const apiClient = new ApiClient();

// React Query helpers
export const queryKeys = {
  leaderboard: (groupId?: string, limit?: number, offset?: number) => 
    ['leaderboard', groupId, limit, offset] as const,
  userRank: (userId?: string) => ['userRank', userId] as const,
  dashboardStats: () => ['dashboardStats'] as const,
  health: () => ['health'] as const,
};
