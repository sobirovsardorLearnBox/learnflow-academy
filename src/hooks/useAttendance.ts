import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface Attendance {
  id: string;
  user_id: string;
  marked_by: string;
  date: string;
  status: AttendanceStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserWithAttendance {
  user_id: string;
  name: string;
  email: string;
  role?: string;
  attendance?: Attendance | null;
}

// Fetch attendance for a specific date
export function useAttendance(date: string, userIds?: string[]) {
  return useQuery({
    queryKey: ['attendance', date, userIds],
    queryFn: async () => {
      let query = supabase
        .from('attendance')
        .select('*')
        .eq('date', date);
      
      if (userIds && userIds.length > 0) {
        query = query.in('user_id', userIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Attendance[];
    },
    enabled: !!date,
  });
}

// Fetch attendance for teacher's students
export function useTeacherStudentsAttendance(teacherId: string | undefined, date: string) {
  return useQuery({
    queryKey: ['teacher-students-attendance', teacherId, date],
    queryFn: async () => {
      if (!teacherId) return [];

      // Get all groups where this teacher is the owner
      const { data: groups, error: groupsError } = await supabase
        .from('groups')
        .select('id')
        .eq('teacher_id', teacherId);

      if (groupsError) throw groupsError;
      if (!groups || groups.length === 0) return [];

      const groupIds = groups.map(g => g.id);

      // Get all approved members from these groups
      const { data: members, error: membersError } = await supabase
        .from('group_members')
        .select('user_id')
        .in('group_id', groupIds)
        .eq('is_approved', true);

      if (membersError) throw membersError;
      if (!members || members.length === 0) return [];

      const studentUserIds = [...new Set(members.map(m => m.user_id))];

      // Get profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .in('user_id', studentUserIds);

      if (profilesError) throw profilesError;

      // Get attendance for this date
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .in('user_id', studentUserIds)
        .eq('date', date);

      if (attendanceError) throw attendanceError;

      // Combine data
      return (profiles || []).map(profile => ({
        ...profile,
        attendance: attendance?.find(a => a.user_id === profile.user_id) || null,
      })) as UserWithAttendance[];
    },
    enabled: !!teacherId && !!date,
  });
}

// Fetch teachers with attendance for admin
export function useTeachersAttendance(date: string) {
  return useQuery({
    queryKey: ['teachers-attendance', date],
    queryFn: async () => {
      // Get all teachers
      const { data: teacherRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'teacher');

      if (rolesError) throw rolesError;
      if (!teacherRoles || teacherRoles.length === 0) return [];

      const teacherUserIds = teacherRoles.map(r => r.user_id);

      // Get profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .in('user_id', teacherUserIds);

      if (profilesError) throw profilesError;

      // Get attendance for this date
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .in('user_id', teacherUserIds)
        .eq('date', date);

      if (attendanceError) throw attendanceError;

      // Get student counts for each teacher
      const teachersWithData = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: groups } = await supabase
            .from('groups')
            .select('id')
            .eq('teacher_id', profile.user_id);

          let studentCount = 0;
          if (groups && groups.length > 0) {
            const { count } = await supabase
              .from('group_members')
              .select('*', { count: 'exact', head: true })
              .in('group_id', groups.map(g => g.id))
              .eq('is_approved', true);
            studentCount = count || 0;
          }

          return {
            ...profile,
            role: 'teacher',
            studentCount,
            attendance: attendance?.find(a => a.user_id === profile.user_id) || null,
          };
        })
      );

      return teachersWithData;
    },
    enabled: !!date,
  });
}

// Mark attendance mutation
export function useMarkAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      userId, 
      date, 
      status, 
      markedBy,
      notes 
    }: { 
      userId: string; 
      date: string; 
      status: AttendanceStatus;
      markedBy: string;
      notes?: string;
    }) => {
      // Check if attendance already exists for this user and date
      const { data: existing } = await supabase
        .from('attendance')
        .select('id')
        .eq('user_id', userId)
        .eq('date', date)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('attendance')
          .update({ status, notes: notes || null, marked_by: markedBy })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('attendance')
          .insert({ 
            user_id: userId, 
            date, 
            status, 
            marked_by: markedBy,
            notes: notes || null 
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-students-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['teachers-attendance'] });
      toast.success('Davomat belgilandi');
    },
    onError: () => {
      toast.error('Davomatni belgilashda xatolik');
    },
  });
}

// Fetch teacher's students with progress
export function useTeacherStudentsProgress(teacherId: string | undefined) {
  return useQuery({
    queryKey: ['teacher-students-progress', teacherId],
    queryFn: async () => {
      if (!teacherId) return [];

      // Get all groups where this teacher is the owner
      const { data: groups, error: groupsError } = await supabase
        .from('groups')
        .select('id, name')
        .eq('teacher_id', teacherId);

      if (groupsError) throw groupsError;
      if (!groups || groups.length === 0) return [];

      const groupIds = groups.map(g => g.id);

      // Get all approved members from these groups
      const { data: members, error: membersError } = await supabase
        .from('group_members')
        .select('user_id, group_id')
        .in('group_id', groupIds)
        .eq('is_approved', true);

      if (membersError) throw membersError;
      if (!members || members.length === 0) return [];

      const studentUserIds = [...new Set(members.map(m => m.user_id))];

      // Get profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .in('user_id', studentUserIds);

      if (profilesError) throw profilesError;

      // Get total lessons
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id')
        .eq('is_active', true);
      const totalLessons = lessons?.length || 0;

      // Get lesson progress for all students
      const { data: lessonProgress } = await supabase
        .from('lesson_progress')
        .select('user_id, lesson_id')
        .in('user_id', studentUserIds)
        .eq('completed', true);

      // Get recent attendance (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: recentAttendance } = await supabase
        .from('attendance')
        .select('user_id, date, status')
        .in('user_id', studentUserIds)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);

      // Build student data
      return (profiles || []).map(profile => {
        const studentGroups = members
          .filter(m => m.user_id === profile.user_id)
          .map(m => groups.find(g => g.id === m.group_id)?.name)
          .filter(Boolean);

        const completedLessons = lessonProgress?.filter(lp => lp.user_id === profile.user_id).length || 0;
        const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

        const studentAttendance = recentAttendance?.filter(a => a.user_id === profile.user_id) || [];
        const presentCount = studentAttendance.filter(a => a.status === 'present' || a.status === 'late').length;
        const totalAttendance = studentAttendance.length;
        const attendancePercentage = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

        return {
          user_id: profile.user_id,
          name: profile.name,
          email: profile.email,
          groups: studentGroups,
          completedLessons,
          totalLessons,
          progressPercentage,
          attendancePercentage,
          totalAttendanceDays: totalAttendance,
          presentDays: presentCount,
        };
      });
    },
    enabled: !!teacherId,
  });
}
