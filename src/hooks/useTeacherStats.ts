import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek, startOfMonth, format, subWeeks, eachWeekOfInterval } from 'date-fns';

export interface GroupStats {
  groupId: string;
  groupName: string;
  totalStudents: number;
  activeStudents: number;
  totalLessonsCompleted: number;
  totalUnitsCompleted: number;
  averageProgress: number;
  thisWeekLessons: number;
  thisMonthLessons: number;
}

export interface TeacherOverview {
  totalGroups: number;
  totalStudents: number;
  activeStudents: number;
  totalLessonsCompleted: number;
  totalUnitsCompleted: number;
  thisWeekLessons: number;
  thisMonthLessons: number;
  averageAttendance: number;
}

export interface WeeklyGroupProgress {
  week: string;
  [groupName: string]: string | number;
}

// Get teacher's groups with stats
export const useTeacherGroupStats = (teacherId?: string) => {
  return useQuery({
    queryKey: ['teacher_group_stats', teacherId],
    queryFn: async (): Promise<GroupStats[]> => {
      if (!teacherId) return [];

      // Get teacher's groups
      const { data: groups, error: groupsError } = await supabase
        .from('groups')
        .select('id, name')
        .eq('teacher_id', teacherId)
        .eq('is_active', true);

      if (groupsError) throw groupsError;
      if (!groups || groups.length === 0) return [];

      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const monthStart = startOfMonth(now);

      const groupStats: GroupStats[] = [];

      for (const group of groups) {
        // Get group members
        const { data: members } = await supabase
          .from('group_members')
          .select('user_id')
          .eq('group_id', group.id)
          .eq('is_approved', true);

        const memberIds = members?.map(m => m.user_id) || [];
        
        if (memberIds.length === 0) {
          groupStats.push({
            groupId: group.id,
            groupName: group.name,
            totalStudents: 0,
            activeStudents: 0,
            totalLessonsCompleted: 0,
            totalUnitsCompleted: 0,
            averageProgress: 0,
            thisWeekLessons: 0,
            thisMonthLessons: 0,
          });
          continue;
        }

        // Get lesson progress for group members
        const { data: lessonProgress } = await supabase
          .from('lesson_progress')
          .select('user_id, completed_at')
          .in('user_id', memberIds)
          .eq('completed', true);

        // Get unit progress for group members
        const { data: unitProgress } = await supabase
          .from('user_progress')
          .select('user_id, completed_at')
          .in('user_id', memberIds)
          .eq('completed', true);

        // Calculate stats
        const totalLessonsCompleted = lessonProgress?.length || 0;
        const totalUnitsCompleted = unitProgress?.length || 0;

        // Active students (completed at least one lesson in the last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const activeStudentIds = new Set(
          lessonProgress
            ?.filter(p => p.completed_at && new Date(p.completed_at) >= sevenDaysAgo)
            .map(p => p.user_id) || []
        );

        // This week lessons
        const thisWeekLessons = lessonProgress?.filter(
          p => p.completed_at && new Date(p.completed_at) >= weekStart
        ).length || 0;

        // This month lessons
        const thisMonthLessons = lessonProgress?.filter(
          p => p.completed_at && new Date(p.completed_at) >= monthStart
        ).length || 0;

        // Average lessons per student
        const averageProgress = memberIds.length > 0 
          ? Math.round((totalLessonsCompleted / memberIds.length) * 10) / 10 
          : 0;

        groupStats.push({
          groupId: group.id,
          groupName: group.name,
          totalStudents: memberIds.length,
          activeStudents: activeStudentIds.size,
          totalLessonsCompleted,
          totalUnitsCompleted,
          averageProgress,
          thisWeekLessons,
          thisMonthLessons,
        });
      }

      return groupStats;
    },
    enabled: !!teacherId,
  });
};

// Get teacher overview stats
export const useTeacherOverview = (teacherId?: string) => {
  return useQuery({
    queryKey: ['teacher_overview', teacherId],
    queryFn: async (): Promise<TeacherOverview> => {
      if (!teacherId) {
        return {
          totalGroups: 0,
          totalStudents: 0,
          activeStudents: 0,
          totalLessonsCompleted: 0,
          totalUnitsCompleted: 0,
          thisWeekLessons: 0,
          thisMonthLessons: 0,
          averageAttendance: 0,
        };
      }

      // Get teacher's groups
      const { data: groups } = await supabase
        .from('groups')
        .select('id')
        .eq('teacher_id', teacherId)
        .eq('is_active', true);

      const groupIds = groups?.map(g => g.id) || [];
      
      if (groupIds.length === 0) {
        return {
          totalGroups: 0,
          totalStudents: 0,
          activeStudents: 0,
          totalLessonsCompleted: 0,
          totalUnitsCompleted: 0,
          thisWeekLessons: 0,
          thisMonthLessons: 0,
          averageAttendance: 0,
        };
      }

      // Get all members from teacher's groups
      const { data: members } = await supabase
        .from('group_members')
        .select('user_id')
        .in('group_id', groupIds)
        .eq('is_approved', true);

      const memberIds = [...new Set(members?.map(m => m.user_id) || [])];

      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const monthStart = startOfMonth(now);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Get lesson progress
      const { data: lessonProgress } = await supabase
        .from('lesson_progress')
        .select('user_id, completed_at')
        .in('user_id', memberIds)
        .eq('completed', true);

      // Get unit progress
      const { data: unitProgress } = await supabase
        .from('user_progress')
        .select('user_id')
        .in('user_id', memberIds)
        .eq('completed', true);

      // Get attendance for last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data: attendance } = await supabase
        .from('attendance')
        .select('status')
        .in('user_id', memberIds)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);

      const presentCount = attendance?.filter(a => a.status === 'present').length || 0;
      const totalAttendance = attendance?.length || 0;
      const averageAttendance = totalAttendance > 0 
        ? Math.round((presentCount / totalAttendance) * 100) 
        : 0;

      // Active students
      const activeStudentIds = new Set(
        lessonProgress
          ?.filter(p => p.completed_at && new Date(p.completed_at) >= sevenDaysAgo)
          .map(p => p.user_id) || []
      );

      // This week/month lessons
      const thisWeekLessons = lessonProgress?.filter(
        p => p.completed_at && new Date(p.completed_at) >= weekStart
      ).length || 0;

      const thisMonthLessons = lessonProgress?.filter(
        p => p.completed_at && new Date(p.completed_at) >= monthStart
      ).length || 0;

      return {
        totalGroups: groupIds.length,
        totalStudents: memberIds.length,
        activeStudents: activeStudentIds.size,
        totalLessonsCompleted: lessonProgress?.length || 0,
        totalUnitsCompleted: unitProgress?.length || 0,
        thisWeekLessons,
        thisMonthLessons,
        averageAttendance,
      };
    },
    enabled: !!teacherId,
  });
};

// Get weekly progress by group for charts
export const useTeacherWeeklyProgress = (teacherId?: string, weeks: number = 8) => {
  return useQuery({
    queryKey: ['teacher_weekly_progress', teacherId, weeks],
    queryFn: async (): Promise<{ data: WeeklyGroupProgress[]; groups: string[] }> => {
      if (!teacherId) return { data: [], groups: [] };

      // Get teacher's groups
      const { data: groups } = await supabase
        .from('groups')
        .select('id, name')
        .eq('teacher_id', teacherId)
        .eq('is_active', true);

      if (!groups || groups.length === 0) return { data: [], groups: [] };

      const endDate = endOfWeek(new Date(), { weekStartsOn: 1 });
      const startDate = startOfWeek(subWeeks(new Date(), weeks - 1), { weekStartsOn: 1 });

      // Get all members from all groups
      const groupMemberMap: Record<string, string[]> = {};
      for (const group of groups) {
        const { data: members } = await supabase
          .from('group_members')
          .select('user_id')
          .eq('group_id', group.id)
          .eq('is_approved', true);
        
        groupMemberMap[group.id] = members?.map(m => m.user_id) || [];
      }

      // Get all lesson progress in date range
      const allMemberIds = [...new Set(Object.values(groupMemberMap).flat())];
      const { data: lessonProgress } = await supabase
        .from('lesson_progress')
        .select('user_id, completed_at')
        .in('user_id', allMemberIds)
        .eq('completed', true)
        .gte('completed_at', startDate.toISOString())
        .lte('completed_at', endDate.toISOString());

      // Create weekly buckets
      const weekStarts = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 });
      const weeklyData: WeeklyGroupProgress[] = weekStarts.map(weekStart => {
        const weekData: WeeklyGroupProgress = {
          week: format(weekStart, 'MMM d'),
        };
        
        // Initialize all groups with 0
        for (const group of groups) {
          weekData[group.name] = 0;
        }
        
        return weekData;
      });

      // Count lessons per week per group
      lessonProgress?.forEach(p => {
        if (!p.completed_at) return;
        
        const completedDate = new Date(p.completed_at);
        const weekStart = startOfWeek(completedDate, { weekStartsOn: 1 });
        const weekKey = format(weekStart, 'MMM d');
        
        const weekData = weeklyData.find(w => w.week === weekKey);
        if (!weekData) return;

        // Find which group this user belongs to
        for (const group of groups) {
          if (groupMemberMap[group.id].includes(p.user_id)) {
            weekData[group.name] = (weekData[group.name] as number) + 1;
          }
        }
      });

      return {
        data: weeklyData,
        groups: groups.map(g => g.name),
      };
    },
    enabled: !!teacherId,
  });
};

// Get top performing students for teacher
export const useTeacherTopStudents = (teacherId?: string, limit: number = 10) => {
  return useQuery({
    queryKey: ['teacher_top_students', teacherId, limit],
    queryFn: async () => {
      if (!teacherId) return [];

      // Get teacher's groups
      const { data: groups } = await supabase
        .from('groups')
        .select('id, name')
        .eq('teacher_id', teacherId)
        .eq('is_active', true);

      if (!groups || groups.length === 0) return [];

      const groupIds = groups.map(g => g.id);

      // Get all members
      const { data: members } = await supabase
        .from('group_members')
        .select('user_id, group_id')
        .in('group_id', groupIds)
        .eq('is_approved', true);

      if (!members || members.length === 0) return [];

      const memberIds = members.map(m => m.user_id);

      // Get profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, avatar_url')
        .in('user_id', memberIds);

      // Get lesson counts
      const { data: lessonProgress } = await supabase
        .from('lesson_progress')
        .select('user_id')
        .in('user_id', memberIds)
        .eq('completed', true);

      // Count lessons per user
      const lessonCounts: Record<string, number> = {};
      lessonProgress?.forEach(p => {
        lessonCounts[p.user_id] = (lessonCounts[p.user_id] || 0) + 1;
      });

      // Build result
      const result = profiles?.map(p => {
        const member = members.find(m => m.user_id === p.user_id);
        const group = groups.find(g => g.id === member?.group_id);
        
        return {
          userId: p.user_id,
          name: p.name,
          avatarUrl: p.avatar_url,
          groupName: group?.name || '',
          completedLessons: lessonCounts[p.user_id] || 0,
        };
      }) || [];

      return result
        .sort((a, b) => b.completedLessons - a.completedLessons)
        .slice(0, limit);
    },
    enabled: !!teacherId,
  });
};
