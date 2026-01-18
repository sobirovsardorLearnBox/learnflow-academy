import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, startOfMonth, subWeeks, eachWeekOfInterval, endOfWeek, format } from 'date-fns';

export interface AdminOverview {
  totalTeachers: number;
  totalGroups: number;
  totalStudents: number;
  activeStudents: number;
  totalLessonsCompleted: number;
  totalUnitsCompleted: number;
  thisWeekLessons: number;
  thisMonthLessons: number;
  averageAttendance: number;
}

export interface TeacherStats {
  teacherId: string;
  teacherName: string;
  avatarUrl: string | null;
  groupCount: number;
  studentCount: number;
  activeStudents: number;
  lessonsCompleted: number;
  unitsCompleted: number;
  thisWeekLessons: number;
  averageAttendance: number;
}

export interface GroupStats {
  groupId: string;
  groupName: string;
  teacherName: string;
  studentCount: number;
  activeStudents: number;
  lessonsCompleted: number;
  unitsCompleted: number;
  thisWeekLessons: number;
  thisMonthLessons: number;
}

export interface WeeklyProgress {
  week: string;
  lessons: number;
  units: number;
}

// Get admin overview stats
export const useAdminOverview = () => {
  return useQuery({
    queryKey: ['admin_overview'],
    queryFn: async (): Promise<AdminOverview> => {
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const monthStart = startOfMonth(now);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Get all teachers
      const { data: teachers } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'teacher');

      // Get all groups
      const { data: groups } = await supabase
        .from('groups')
        .select('id')
        .eq('is_active', true);

      // Get all students
      const { data: students } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'student');

      const studentIds = students?.map(s => s.user_id) || [];

      // Get lesson progress
      const { data: lessonProgress } = await supabase
        .from('lesson_progress')
        .select('user_id, completed_at')
        .in('user_id', studentIds.length > 0 ? studentIds : ['none'])
        .eq('completed', true);

      // Get unit progress
      const { data: unitProgress } = await supabase
        .from('user_progress')
        .select('user_id')
        .in('user_id', studentIds.length > 0 ? studentIds : ['none'])
        .eq('completed', true);

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

      // Get attendance for last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data: attendance } = await supabase
        .from('attendance')
        .select('status')
        .in('user_id', studentIds.length > 0 ? studentIds : ['none'])
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);

      const presentCount = attendance?.filter(a => a.status === 'present').length || 0;
      const totalAttendance = attendance?.length || 0;
      const averageAttendance = totalAttendance > 0 
        ? Math.round((presentCount / totalAttendance) * 100) 
        : 0;

      return {
        totalTeachers: teachers?.length || 0,
        totalGroups: groups?.length || 0,
        totalStudents: studentIds.length,
        activeStudents: activeStudentIds.size,
        totalLessonsCompleted: lessonProgress?.length || 0,
        totalUnitsCompleted: unitProgress?.length || 0,
        thisWeekLessons,
        thisMonthLessons,
        averageAttendance,
      };
    },
  });
};

// Get all teachers with their stats
export const useAdminTeacherStats = () => {
  return useQuery({
    queryKey: ['admin_teacher_stats'],
    queryFn: async (): Promise<TeacherStats[]> => {
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Get all teachers
      const { data: teacherRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'teacher');

      if (!teacherRoles || teacherRoles.length === 0) return [];

      const teacherIds = teacherRoles.map(t => t.user_id);

      // Get teacher profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, avatar_url')
        .in('user_id', teacherIds);

      // Get all groups
      const { data: groups } = await supabase
        .from('groups')
        .select('id, teacher_id, name')
        .eq('is_active', true);

      // Get all group members
      const { data: allMembers } = await supabase
        .from('group_members')
        .select('group_id, user_id')
        .eq('is_approved', true);

      const stats: TeacherStats[] = [];

      for (const teacherId of teacherIds) {
        const profile = profiles?.find(p => p.user_id === teacherId);
        const teacherGroups = groups?.filter(g => g.teacher_id === teacherId) || [];
        const groupIds = teacherGroups.map(g => g.id);
        
        const members = allMembers?.filter(m => groupIds.includes(m.group_id)) || [];
        const memberIds = [...new Set(members.map(m => m.user_id))];

        if (memberIds.length === 0) {
          stats.push({
            teacherId,
            teacherName: profile?.name || 'Unknown',
            avatarUrl: profile?.avatar_url || null,
            groupCount: teacherGroups.length,
            studentCount: 0,
            activeStudents: 0,
            lessonsCompleted: 0,
            unitsCompleted: 0,
            thisWeekLessons: 0,
            averageAttendance: 0,
          });
          continue;
        }

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

        // Active students
        const activeStudentIds = new Set(
          lessonProgress
            ?.filter(p => p.completed_at && new Date(p.completed_at) >= sevenDaysAgo)
            .map(p => p.user_id) || []
        );

        // This week lessons
        const thisWeekLessons = lessonProgress?.filter(
          p => p.completed_at && new Date(p.completed_at) >= weekStart
        ).length || 0;

        // Get attendance
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

        stats.push({
          teacherId,
          teacherName: profile?.name || 'Unknown',
          avatarUrl: profile?.avatar_url || null,
          groupCount: teacherGroups.length,
          studentCount: memberIds.length,
          activeStudents: activeStudentIds.size,
          lessonsCompleted: lessonProgress?.length || 0,
          unitsCompleted: unitProgress?.length || 0,
          thisWeekLessons,
          averageAttendance,
        });
      }

      return stats.sort((a, b) => b.lessonsCompleted - a.lessonsCompleted);
    },
  });
};

// Get all groups with stats
export const useAdminGroupStats = () => {
  return useQuery({
    queryKey: ['admin_group_stats'],
    queryFn: async (): Promise<GroupStats[]> => {
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const monthStart = startOfMonth(now);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Get all groups with teacher info
      const { data: groups } = await supabase
        .from('groups')
        .select('id, name, teacher_id')
        .eq('is_active', true);

      if (!groups || groups.length === 0) return [];

      // Get teacher profiles
      const teacherIds = [...new Set(groups.map(g => g.teacher_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name')
        .in('user_id', teacherIds);

      // Get all members
      const { data: allMembers } = await supabase
        .from('group_members')
        .select('group_id, user_id')
        .eq('is_approved', true);

      const stats: GroupStats[] = [];

      for (const group of groups) {
        const teacher = profiles?.find(p => p.user_id === group.teacher_id);
        const members = allMembers?.filter(m => m.group_id === group.id) || [];
        const memberIds = members.map(m => m.user_id);

        if (memberIds.length === 0) {
          stats.push({
            groupId: group.id,
            groupName: group.name,
            teacherName: teacher?.name || 'Unknown',
            studentCount: 0,
            activeStudents: 0,
            lessonsCompleted: 0,
            unitsCompleted: 0,
            thisWeekLessons: 0,
            thisMonthLessons: 0,
          });
          continue;
        }

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

        stats.push({
          groupId: group.id,
          groupName: group.name,
          teacherName: teacher?.name || 'Unknown',
          studentCount: memberIds.length,
          activeStudents: activeStudentIds.size,
          lessonsCompleted: lessonProgress?.length || 0,
          unitsCompleted: unitProgress?.length || 0,
          thisWeekLessons,
          thisMonthLessons,
        });
      }

      return stats.sort((a, b) => b.lessonsCompleted - a.lessonsCompleted);
    },
  });
};

// Get weekly progress for admin charts
export const useAdminWeeklyProgress = (weeks: number = 8) => {
  return useQuery({
    queryKey: ['admin_weekly_progress', weeks],
    queryFn: async (): Promise<WeeklyProgress[]> => {
      const endDate = endOfWeek(new Date(), { weekStartsOn: 1 });
      const startDate = startOfWeek(subWeeks(new Date(), weeks - 1), { weekStartsOn: 1 });

      // Get all students
      const { data: students } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'student');

      const studentIds = students?.map(s => s.user_id) || [];

      if (studentIds.length === 0) return [];

      // Get lesson progress in date range
      const { data: lessonProgress } = await supabase
        .from('lesson_progress')
        .select('completed_at')
        .in('user_id', studentIds)
        .eq('completed', true)
        .gte('completed_at', startDate.toISOString())
        .lte('completed_at', endDate.toISOString());

      // Get unit progress in date range
      const { data: unitProgress } = await supabase
        .from('user_progress')
        .select('completed_at')
        .in('user_id', studentIds)
        .eq('completed', true)
        .gte('completed_at', startDate.toISOString())
        .lte('completed_at', endDate.toISOString());

      // Create weekly buckets
      const weekStarts = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 });
      const weeklyData: WeeklyProgress[] = weekStarts.map(weekStart => ({
        week: format(weekStart, 'MMM d'),
        lessons: 0,
        units: 0,
      }));

      // Count lessons per week
      lessonProgress?.forEach(p => {
        if (!p.completed_at) return;
        const completedDate = new Date(p.completed_at);
        const weekStart = startOfWeek(completedDate, { weekStartsOn: 1 });
        const weekKey = format(weekStart, 'MMM d');
        const weekData = weeklyData.find(w => w.week === weekKey);
        if (weekData) weekData.lessons++;
      });

      // Count units per week
      unitProgress?.forEach(p => {
        if (!p.completed_at) return;
        const completedDate = new Date(p.completed_at);
        const weekStart = startOfWeek(completedDate, { weekStartsOn: 1 });
        const weekKey = format(weekStart, 'MMM d');
        const weekData = weeklyData.find(w => w.week === weekKey);
        if (weekData) weekData.units++;
      });

      return weeklyData;
    },
  });
};
