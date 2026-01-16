import { motion } from 'framer-motion';
import { CheckCircle2, Circle, PlayCircle, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { Lesson } from '@/hooks/useLessons';

interface LessonNavigationProps {
  lessons: Lesson[];
  currentLessonId?: string;
  completedLessons?: string[];
  onSelectLesson: (lesson: Lesson) => void;
}

export function LessonNavigation({ 
  lessons, 
  currentLessonId, 
  completedLessons = [],
  onSelectLesson 
}: LessonNavigationProps) {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-4">
        Lessons
      </h3>
      {lessons.map((lesson, index) => {
        const isCompleted = completedLessons.includes(lesson.id);
        const isCurrent = lesson.id === currentLessonId;
        const isLocked = false; // Can implement locking logic later

        return (
          <motion.button
            key={lesson.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => !isLocked && onSelectLesson(lesson)}
            disabled={isLocked}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all",
              isCurrent && "bg-primary/10 border border-primary/30",
              !isCurrent && !isLocked && "hover:bg-secondary/50",
              isLocked && "opacity-50 cursor-not-allowed",
              isCompleted && !isCurrent && "bg-success/5 border border-success/20"
            )}
          >
            <motion.div 
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                isCompleted && "bg-success/20 text-success",
                isCurrent && !isCompleted && "bg-primary/20 text-primary",
                !isCurrent && !isCompleted && !isLocked && "bg-secondary text-muted-foreground",
                isLocked && "bg-secondary text-muted-foreground"
              )}
              animate={isCompleted ? { 
                scale: [1, 1.1, 1],
              } : {}}
              transition={{ duration: 0.3 }}
            >
              {isLocked ? (
                <Lock className="w-4 h-4" />
              ) : isCompleted ? (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                >
                  <CheckCircle2 className="w-5 h-5" />
                </motion.div>
              ) : isCurrent ? (
                <PlayCircle className="w-5 h-5" />
              ) : (
                <Circle className="w-4 h-4" />
              )}
            </motion.div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className={cn(
                  "text-sm font-medium truncate",
                  isCurrent && "text-primary",
                  isCompleted && "text-success"
                )}>
                  {lesson.lesson_number}. {lesson.title}
                </p>
                {isCompleted && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <Badge 
                      variant="outline" 
                      className="bg-success/10 text-success border-success/30 text-[10px] px-1.5 py-0"
                    >
                      ✓ Tugallandi
                    </Badge>
                  </motion.div>
                )}
              </div>
              {lesson.duration_minutes && (
                <p className="text-xs text-muted-foreground">
                  {lesson.duration_minutes} min
                </p>
              )}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
