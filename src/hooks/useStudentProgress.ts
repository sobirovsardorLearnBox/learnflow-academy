import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StudentProgress {
  userId: string;
  name: string;
  email: string;
  completedLessons: number;
  totalLessons: number;
  completedUnits: number;
  totalUnits: number;
  progressPercentage: number;
  lastActivity: string | null;
}

export function useStudentProgress() {
  return useQuery({
    queryKey: ['student-progress'],
    queryFn: async () => {
      // Fetch all students (profiles with student role)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('role', 'student');

      if (rolesError) throw rolesError;

      const studentUserIds = roles?.map(r => r.user_id) || [];

      // Fetch all lessons and units for totals
      const { data: lessons, error: lessonsError } = await supabase
        .from('lessons')
        .select('id, unit_id')
        .eq('is_active', true);

      if (lessonsError) throw lessonsError;

      const { data: units, error: unitsError } = await supabase
        .from('units')
        .select('id')
        .eq('is_active', true);

      if (unitsError) throw unitsError;

      const totalLessons = lessons?.length || 0;
      const totalUnits = units?.length || 0;

      // Fetch lesson progress for all users
      const { data: lessonProgress, error: lpError } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('completed', true);

      if (lpError) throw lpError;

      // Fetch unit progress for all users
      const { data: unitProgress, error: upError } = await supabase
        .from('user_progress')
        .select('*')
        .eq('completed', true);

      if (upError) throw upError;

      // Build progress data for each student
      const studentProgress: StudentProgress[] = studentUserIds
        .map(userId => {
          const profile = profiles?.find(p => p.user_id === userId);
          if (!profile) return null;

          const userLessonProgress = lessonProgress?.filter(lp => lp.user_id === userId) || [];
          const userUnitProgress = unitProgress?.filter(up => up.user_id === userId) || [];

          const completedLessons = userLessonProgress.length;
          const completedUnits = userUnitProgress.length;

          // Find last activity
          const lastLessonActivity = userLessonProgress
            .map(lp => lp.completed_at)
            .filter(Boolean)
            .sort()
            .reverse()[0];

          const lastUnitActivity = userUnitProgress
            .map(up => up.completed_at)
            .filter(Boolean)
            .sort()
            .reverse()[0];

          const lastActivity = [lastLessonActivity, lastUnitActivity]
            .filter(Boolean)
            .sort()
            .reverse()[0] || null;

          const progressPercentage = totalLessons > 0 
            ? Math.round((completedLessons / totalLessons) * 100) 
            : 0;

          return {
            userId,
            name: profile.name,
            email: profile.email,
            completedLessons,
            totalLessons,
            completedUnits,
            totalUnits,
            progressPercentage,
            lastActivity,
          };
        })
        .filter((p): p is StudentProgress => p !== null);

      return studentProgress;
    },
  });
}
