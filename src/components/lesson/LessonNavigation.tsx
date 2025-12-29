import { motion } from 'framer-motion';
import { CheckCircle2, Circle, PlayCircle, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
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
              isLocked && "opacity-50 cursor-not-allowed"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
              isCompleted && "bg-emerald-500/20 text-emerald-500",
              isCurrent && !isCompleted && "bg-primary/20 text-primary",
              !isCurrent && !isCompleted && !isLocked && "bg-secondary text-muted-foreground",
              isLocked && "bg-secondary text-muted-foreground"
            )}>
              {isLocked ? (
                <Lock className="w-4 h-4" />
              ) : isCompleted ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : isCurrent ? (
                <PlayCircle className="w-5 h-5" />
              ) : (
                <Circle className="w-4 h-4" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm font-medium truncate",
                isCurrent && "text-primary"
              )}>
                {lesson.lesson_number}. {lesson.title}
              </p>
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
