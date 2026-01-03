import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { Loader2, TrendingUp, Users, CheckCircle, Clock } from 'lucide-react';

interface GroupProgressStatsProps {
  groupId: string;
  memberUserIds: string[];
}

export function GroupProgressStats({ groupId, memberUserIds }: GroupProgressStatsProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['group-progress-stats', groupId, memberUserIds],
    queryFn: async () => {
      if (memberUserIds.length === 0) {
        return {
          averageProgress: 0,
          totalCompleted: 0,
          totalLessons: 0,
          memberStats: [] as { userId: string; completed: number; total: number; percentage: number }[],
        };
      }

      // Fetch all active lessons
      const { data: lessons, error: lessonsError } = await supabase
        .from('lessons')
        .select('id')
        .eq('is_active', true);

      if (lessonsError) throw lessonsError;

      const totalLessons = lessons?.length || 0;

      if (totalLessons === 0) {
        return {
          averageProgress: 0,
          totalCompleted: 0,
          totalLessons: 0,
          memberStats: [],
        };
      }

      // Fetch lesson progress for all group members
      const { data: lessonProgress, error: lpError } = await supabase
        .from('lesson_progress')
        .select('user_id, lesson_id, completed')
        .in('user_id', memberUserIds)
        .eq('completed', true);

      if (lpError) throw lpError;

      // Calculate stats per member
      const memberStats = memberUserIds.map((userId) => {
        const userProgress = lessonProgress?.filter((lp) => lp.user_id === userId) || [];
        const completed = userProgress.length;
        const percentage = Math.round((completed / totalLessons) * 100);
        return { userId, completed, total: totalLessons, percentage };
      });

      // Calculate totals
      const totalCompleted = memberStats.reduce((sum, m) => sum + m.completed, 0);
      const averageProgress = memberStats.length > 0
        ? Math.round(memberStats.reduce((sum, m) => sum + m.percentage, 0) / memberStats.length)
        : 0;

      return {
        averageProgress,
        totalCompleted,
        totalLessons,
        memberStats,
      };
    },
    enabled: !!groupId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats || memberUserIds.length === 0) {
    return null;
  }

  const completedCount = stats.memberStats.filter((m) => m.percentage >= 100).length;
  const inProgressCount = stats.memberStats.filter((m) => m.percentage > 0 && m.percentage < 100).length;
  const notStartedCount = stats.memberStats.filter((m) => m.percentage === 0).length;

  return (
    <div className="bg-muted/50 rounded-lg p-4 mb-4 space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <TrendingUp className="w-4 h-4 text-primary" />
        Guruh statistikasi
      </div>

      {/* Average Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">O'rtacha progress</span>
          <span className="font-semibold">{stats.averageProgress}%</span>
        </div>
        <Progress value={stats.averageProgress} className="h-2" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-background rounded-md p-2">
          <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
            <CheckCircle className="w-3.5 h-3.5" />
            <span className="text-lg font-bold">{completedCount}</span>
          </div>
          <p className="text-xs text-muted-foreground">Tugatgan</p>
        </div>
        <div className="bg-background rounded-md p-2">
          <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-lg font-bold">{inProgressCount}</span>
          </div>
          <p className="text-xs text-muted-foreground">Jarayonda</p>
        </div>
        <div className="bg-background rounded-md p-2">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
            <Users className="w-3.5 h-3.5" />
            <span className="text-lg font-bold">{notStartedCount}</span>
          </div>
          <p className="text-xs text-muted-foreground">Boshlamagan</p>
        </div>
      </div>

      {/* Total lessons info */}
      <div className="text-xs text-muted-foreground text-center pt-1 border-t">
        Jami {stats.totalLessons} ta dars · {stats.totalCompleted} ta tugatilgan
      </div>
    </div>
  );
}
