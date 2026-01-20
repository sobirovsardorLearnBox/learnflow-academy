import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, format, eachDayOfInterval, eachWeekOfInterval } from 'date-fns';
import { QUERY_STALE_TIMES, QUERY_GC_TIMES } from '@/lib/query-config';

export interface DailyProgress {
  date: string;
  lessons: number;
  units: number;
}

export interface WeeklyProgress {
  week: string;
  startDate: string;
  lessons: number;
  units: number;
}

export interface MonthlyProgress {
  month: string;
  lessons: number;
  units: number;
}

export interface ProgressSummary {
  totalLessons: number;
  totalUnits: number;
  thisWeekLessons: number;
  thisMonthLessons: number;
  streak: number;
  averageDailyLessons: number;
}

// Get daily progress for the last N days
export const useDailyProgress = (userId?: string, days: number = 7) => {
  return useQuery({
    queryKey: ['daily_progress', userId, days],
    queryFn: async () => {
      if (!userId) return [];

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days + 1);
      startDate.setHours(0, 0, 0, 0);

      // Use parallel queries for efficiency
      const [lessonProgress, unitProgress] = await Promise.all([
        supabase
          .from('lesson_progress')
          .select('completed_at')
          .eq('user_id', userId)
          .eq('completed', true)
          .gte('completed_at', startDate.toISOString())
          .lte('completed_at', endDate.toISOString()),
        supabase
          .from('user_progress')
          .select('completed_at')
          .eq('user_id', userId)
          .eq('completed', true)
          .gte('completed_at', startDate.toISOString())
          .lte('completed_at', endDate.toISOString()),
      ]);

      // Create daily buckets
      const dailyData: DailyProgress[] = eachDayOfInterval({ start: startDate, end: endDate }).map(date => ({
        date: format(date, 'yyyy-MM-dd'),
        lessons: 0,
        units: 0,
      }));

      // Count lessons per day
      lessonProgress.data?.forEach(p => {
        if (p.completed_at) {
          const day = format(new Date(p.completed_at), 'yyyy-MM-dd');
          const dayData = dailyData.find(d => d.date === day);
          if (dayData) dayData.lessons++;
        }
      });

      // Count units per day
      unitProgress.data?.forEach(p => {
        if (p.completed_at) {
          const day = format(new Date(p.completed_at), 'yyyy-MM-dd');
          const dayData = dailyData.find(d => d.date === day);
          if (dayData) dayData.units++;
        }
      });

      return dailyData;
    },
    enabled: !!userId,
    staleTime: QUERY_STALE_TIMES.userProgress,
    gcTime: QUERY_GC_TIMES.userSpecific,
  });
};

// Get weekly progress for the last N weeks
export const useWeeklyProgress = (userId?: string, weeks: number = 8) => {
  return useQuery({
    queryKey: ['weekly_progress', userId, weeks],
    queryFn: async () => {
      if (!userId) return [];

      const endDate = endOfWeek(new Date(), { weekStartsOn: 1 });
      const startDate = startOfWeek(subWeeks(new Date(), weeks - 1), { weekStartsOn: 1 });

      // Get lesson progress
      const { data: lessonProgress } = await supabase
        .from('lesson_progress')
        .select('completed_at')
        .eq('user_id', userId)
        .eq('completed', true)
        .gte('completed_at', startDate.toISOString())
        .lte('completed_at', endDate.toISOString());

      // Get unit progress
      const { data: unitProgress } = await supabase
        .from('user_progress')
        .select('completed_at')
        .eq('user_id', userId)
        .eq('completed', true)
        .gte('completed_at', startDate.toISOString())
        .lte('completed_at', endDate.toISOString());

      // Create weekly buckets
      const weekStarts = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 });
      const weeklyData: WeeklyProgress[] = weekStarts.map(weekStart => ({
        week: format(weekStart, 'MMM d'),
        startDate: format(weekStart, 'yyyy-MM-dd'),
        lessons: 0,
        units: 0,
      }));

      // Count lessons per week
      lessonProgress?.forEach(p => {
        if (p.completed_at) {
          const weekStart = startOfWeek(new Date(p.completed_at), { weekStartsOn: 1 });
          const weekKey = format(weekStart, 'yyyy-MM-dd');
          const weekData = weeklyData.find(w => w.startDate === weekKey);
          if (weekData) weekData.lessons++;
        }
      });

      // Count units per week
      unitProgress?.forEach(p => {
        if (p.completed_at) {
          const weekStart = startOfWeek(new Date(p.completed_at), { weekStartsOn: 1 });
          const weekKey = format(weekStart, 'yyyy-MM-dd');
          const weekData = weeklyData.find(w => w.startDate === weekKey);
          if (weekData) weekData.units++;
        }
      });

      return weeklyData;
    },
    enabled: !!userId,
  });
};

// Get monthly progress for the last N months
export const useMonthlyProgress = (userId?: string, months: number = 6) => {
  return useQuery({
    queryKey: ['monthly_progress', userId, months],
    queryFn: async () => {
      if (!userId) return [];

      const endDate = endOfMonth(new Date());
      const startDate = startOfMonth(subMonths(new Date(), months - 1));

      // Get lesson progress
      const { data: lessonProgress } = await supabase
        .from('lesson_progress')
        .select('completed_at')
        .eq('user_id', userId)
        .eq('completed', true)
        .gte('completed_at', startDate.toISOString())
        .lte('completed_at', endDate.toISOString());

      // Get unit progress
      const { data: unitProgress } = await supabase
        .from('user_progress')
        .select('completed_at')
        .eq('user_id', userId)
        .eq('completed', true)
        .gte('completed_at', startDate.toISOString())
        .lte('completed_at', endDate.toISOString());

      // Create monthly buckets
      const monthlyData: MonthlyProgress[] = [];
      for (let i = 0; i < months; i++) {
        const monthDate = subMonths(new Date(), months - 1 - i);
        monthlyData.push({
          month: format(monthDate, 'MMM yyyy'),
          lessons: 0,
          units: 0,
        });
      }

      // Count lessons per month
      lessonProgress?.forEach(p => {
        if (p.completed_at) {
          const monthKey = format(new Date(p.completed_at), 'MMM yyyy');
          const monthData = monthlyData.find(m => m.month === monthKey);
          if (monthData) monthData.lessons++;
        }
      });

      // Count units per month
      unitProgress?.forEach(p => {
        if (p.completed_at) {
          const monthKey = format(new Date(p.completed_at), 'MMM yyyy');
          const monthData = monthlyData.find(m => m.month === monthKey);
          if (monthData) monthData.units++;
        }
      });

      return monthlyData;
    },
    enabled: !!userId,
  });
};

// Get progress summary
export const useProgressSummary = (userId?: string) => {
  return useQuery({
    queryKey: ['progress_summary', userId],
    queryFn: async (): Promise<ProgressSummary> => {
      if (!userId) {
        return {
          totalLessons: 0,
          totalUnits: 0,
          thisWeekLessons: 0,
          thisMonthLessons: 0,
          streak: 0,
          averageDailyLessons: 0,
        };
      }

      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const monthStart = startOfMonth(now);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Total counts
      const [totalLessonsResult, totalUnitsResult] = await Promise.all([
        supabase
          .from('lesson_progress')
          .select('id', { count: 'exact' })
          .eq('user_id', userId)
          .eq('completed', true),
        supabase
          .from('user_progress')
          .select('id', { count: 'exact' })
          .eq('user_id', userId)
          .eq('completed', true),
      ]);

      // This week lessons
      const { count: thisWeekLessons } = await supabase
        .from('lesson_progress')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('completed', true)
        .gte('completed_at', weekStart.toISOString());

      // This month lessons
      const { count: thisMonthLessons } = await supabase
        .from('lesson_progress')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('completed', true)
        .gte('completed_at', monthStart.toISOString());

      // Calculate streak (consecutive days with at least one lesson)
      const { data: recentProgress } = await supabase
        .from('lesson_progress')
        .select('completed_at')
        .eq('user_id', userId)
        .eq('completed', true)
        .order('completed_at', { ascending: false })
        .limit(100);

      let streak = 0;
      if (recentProgress && recentProgress.length > 0) {
        const uniqueDays = new Set(
          recentProgress
            .filter(p => p.completed_at)
            .map(p => format(new Date(p.completed_at!), 'yyyy-MM-dd'))
        );

        const today = format(now, 'yyyy-MM-dd');
        const yesterday = format(new Date(now.getTime() - 86400000), 'yyyy-MM-dd');
        
        // Start counting from today or yesterday
        let checkDate = uniqueDays.has(today) ? now : (uniqueDays.has(yesterday) ? new Date(now.getTime() - 86400000) : null);
        
        if (checkDate) {
          while (true) {
            const dayStr = format(checkDate, 'yyyy-MM-dd');
            if (uniqueDays.has(dayStr)) {
              streak++;
              checkDate = new Date(checkDate.getTime() - 86400000);
            } else {
              break;
            }
          }
        }
      }

      // Average daily lessons (last 30 days)
      const { count: last30DaysLessons } = await supabase
        .from('lesson_progress')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('completed', true)
        .gte('completed_at', thirtyDaysAgo.toISOString());

      return {
        totalLessons: totalLessonsResult.count || 0,
        totalUnits: totalUnitsResult.count || 0,
        thisWeekLessons: thisWeekLessons || 0,
        thisMonthLessons: thisMonthLessons || 0,
        streak,
        averageDailyLessons: Math.round(((last30DaysLessons || 0) / 30) * 10) / 10,
      };
    },
    enabled: !!userId,
  });
};
