import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, BookOpen, CheckCircle, Clock, Download } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface StudentProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: {
    user_id: string;
    name: string;
    email: string;
  } | null;
}

interface LessonProgressItem {
  lesson_id: string;
  lesson_title: string;
  unit_name: string;
  level_name: string;
  section_name: string;
  completed: boolean;
  completed_at: string | null;
}

export function StudentProgressDialog({
  open,
  onOpenChange,
  student,
}: StudentProgressDialogProps) {
  const { data: progressData, isLoading } = useQuery({
    queryKey: ['student-detail-progress', student?.user_id],
    queryFn: async () => {
      if (!student?.user_id) return null;

      // Fetch all lessons with their hierarchy
      const { data: lessons, error: lessonsError } = await supabase
        .from('lessons')
        .select(`
          id,
          title,
          lesson_number,
          unit_id,
          is_active
        `)
        .eq('is_active', true)
        .order('lesson_number');

      if (lessonsError) throw lessonsError;

      // Fetch units
      const { data: units, error: unitsError } = await supabase
        .from('units')
        .select('id, name, level_id')
        .eq('is_active', true);

      if (unitsError) throw unitsError;

      // Fetch levels
      const { data: levels, error: levelsError } = await supabase
        .from('levels')
        .select('id, name, section_id')
        .eq('is_active', true);

      if (levelsError) throw levelsError;

      // Fetch sections
      const { data: sections, error: sectionsError } = await supabase
        .from('sections')
        .select('id, name')
        .eq('is_active', true);

      if (sectionsError) throw sectionsError;

      // Fetch student's lesson progress
      const { data: lessonProgress, error: lpError } = await supabase
        .from('lesson_progress')
        .select('lesson_id, completed, completed_at')
        .eq('user_id', student.user_id);

      if (lpError) throw lpError;

      // Build progress map
      const progressMap = new Map(
        lessonProgress?.map((lp) => [lp.lesson_id, lp]) || []
      );

      // Build hierarchy maps
      const unitMap = new Map(units?.map((u) => [u.id, u]) || []);
      const levelMap = new Map(levels?.map((l) => [l.id, l]) || []);
      const sectionMap = new Map(sections?.map((s) => [s.id, s]) || []);

      // Build lesson progress items
      const progressItems: LessonProgressItem[] = (lessons || []).map((lesson) => {
        const unit = unitMap.get(lesson.unit_id);
        const level = unit ? levelMap.get(unit.level_id) : null;
        const section = level ? sectionMap.get(level.section_id) : null;
        const progress = progressMap.get(lesson.id);

        return {
          lesson_id: lesson.id,
          lesson_title: lesson.title,
          unit_name: unit?.name || 'Unknown',
          level_name: level?.name || 'Unknown',
          section_name: section?.name || 'Unknown',
          completed: progress?.completed || false,
          completed_at: progress?.completed_at || null,
        };
      });

      const completedCount = progressItems.filter((p) => p.completed).length;
      const totalCount = progressItems.length;
      const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      return {
        items: progressItems,
        completedCount,
        totalCount,
        percentage,
      };
    },
    enabled: !!student?.user_id && open,
  });

  const exportToCSV = () => {
    if (!progressData || !student) return;

    const headers = ['Dars nomi', 'Bo\'lim', 'Daraja', 'Bo\'lim', 'Holati', 'Tugatilgan sana'];
    const rows = progressData.items.map((item) => [
      item.lesson_title,
      item.section_name,
      item.level_name,
      item.unit_name,
      item.completed ? 'Tugatilgan' : 'Tugatilmagan',
      item.completed_at ? format(new Date(item.completed_at), 'dd.MM.yyyy') : '-',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${student.name.replace(/\s+/g, '_')}_progress_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('CSV fayl yuklab olindi');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              {student?.name} - O'quv progressi
            </div>
            {progressData && progressData.items.length > 0 && (
              <Button size="sm" variant="outline" onClick={exportToCSV}>
                <Download className="w-4 h-4 mr-1" />
                CSV
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : progressData ? (
          <div className="space-y-4 overflow-hidden flex flex-col">
            {/* Summary */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">Umumiy progress</span>
                <Badge variant={progressData.percentage >= 100 ? 'default' : 'secondary'}>
                  {progressData.percentage}%
                </Badge>
              </div>
              <Progress value={progressData.percentage} className="h-2" />
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>{progressData.completedCount} ta tugatilgan</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{progressData.totalCount - progressData.completedCount} ta qolgan</span>
                </div>
              </div>
            </div>

            {/* Lessons list */}
            <div className="overflow-y-auto flex-1 space-y-2 pr-2">
              {progressData.items.map((item) => (
                <div
                  key={item.lesson_id}
                  className={`p-3 rounded-lg border ${
                    item.completed
                      ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800'
                      : 'bg-background border-border'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.lesson_title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.section_name} → {item.level_name} → {item.unit_name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {item.completed ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                          {item.completed_at && (
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {format(new Date(item.completed_at), 'dd.MM.yyyy')}
                            </span>
                          )}
                        </>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Tugatilmagan
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {progressData.items.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Darslar topilmadi
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Ma'lumot topilmadi
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
