import { motion } from 'framer-motion';
import { CheckCircle2, Circle, PlayCircle, Lock, Video, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import type { Lesson } from '@/hooks/useLessons';

interface LessonProgressInfo {
  lesson_id: string;
  score: number | null;
  video_completed: boolean | null;
  quiz_score: number | null;
}

interface LessonNavigationProps {
  lessons: Lesson[];
  currentLessonId?: string;
  completedLessons?: string[];
  lessonScores?: Record<string, number>;
  lessonProgressData?: LessonProgressInfo[];
  onSelectLesson: (lesson: Lesson) => void;
}

export function LessonNavigation({ 
  lessons, 
  currentLessonId, 
  completedLessons = [],
  lessonScores = {},
  lessonProgressData = [],
  onSelectLesson 
}: LessonNavigationProps) {
  // Get detailed progress for a lesson
  const getLessonProgress = (lessonId: string) => {
    return lessonProgressData.find(p => p.lesson_id === lessonId);
  };

  // Determine which lessons are locked based on previous lesson scores
  const getLessonLockStatus = (lessonIndex: number): { isLocked: boolean; reason?: string; score?: number } => {
    if (lessonIndex === 0) return { isLocked: false }; // First lesson is never locked
    
    const prevLesson = lessons[lessonIndex - 1];
    const prevCompleted = completedLessons.includes(prevLesson.id);
    const prevScore = lessonScores[prevLesson.id] || 0;
    
    if (!prevCompleted) {
      return { isLocked: true, reason: 'prev_not_completed' };
    }
    
    if (prevScore < 80) {
      return { isLocked: true, reason: 'prev_score_low', score: prevScore };
    }
    
    return { isLocked: false };
  };

  return (
    <TooltipProvider>
      <div className="space-y-2">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-4">
          Darslar
        </h3>
        {lessons.map((lesson, index) => {
          const isCompleted = completedLessons.includes(lesson.id);
          const isCurrent = lesson.id === currentLessonId;
          const lockStatus = getLessonLockStatus(index);
          const lessonScore = lessonScores[lesson.id];
          const progressInfo = getLessonProgress(lesson.id);
          
          // Calculate video and quiz progress
          const videoCompleted = progressInfo?.video_completed || false;
          const quizScore = progressInfo?.quiz_score || 0;
          const videoPoints = videoCompleted ? 20 : 0;
          const quizPoints = Math.round((quizScore / 100) * 80);

          const buttonContent = (
            <motion.button
              key={lesson.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => !lockStatus.isLocked && onSelectLesson(lesson)}
              disabled={lockStatus.isLocked}
              className={cn(
                "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all",
                isCurrent && "bg-primary/10 border border-primary/30",
                !isCurrent && !lockStatus.isLocked && "hover:bg-secondary/50",
                lockStatus.isLocked && "opacity-50 cursor-not-allowed",
                isCompleted && !isCurrent && "bg-success/5 border border-success/20"
              )}
            >
              <motion.div 
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                  isCompleted && lessonScore >= 80 && "bg-success/20 text-success",
                  isCompleted && lessonScore < 80 && "bg-amber-500/20 text-amber-600",
                  isCurrent && !isCompleted && "bg-primary/20 text-primary",
                  !isCurrent && !isCompleted && !lockStatus.isLocked && "bg-secondary text-muted-foreground",
                  lockStatus.isLocked && "bg-muted text-muted-foreground"
                )}
                animate={isCompleted && lessonScore >= 80 ? { 
                  scale: [1, 1.1, 1],
                } : {}}
                transition={{ duration: 0.3 }}
              >
                {lockStatus.isLocked ? (
                  <Lock className="w-4 h-4" />
                ) : isCompleted && lessonScore >= 80 ? (
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
                    isCompleted && lessonScore >= 80 && "text-success",
                    isCompleted && lessonScore < 80 && "text-amber-600",
                    lockStatus.isLocked && "text-muted-foreground"
                  )}>
                    {lesson.lesson_number}. {lesson.title}
                  </p>
                </div>
                
                {/* Duration and score */}
                <div className="flex items-center gap-2 mt-1">
                  {lesson.duration_minutes && (
                    <span className="text-xs text-muted-foreground">
                      {lesson.duration_minutes} min
                    </span>
                  )}
                  {isCompleted && lessonScore !== undefined && (
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-[10px] px-1.5 py-0",
                        lessonScore >= 80 
                          ? "bg-success/10 text-success border-success/30" 
                          : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                      )}
                    >
                      {lessonScore}%
                    </Badge>
                  )}
                  {lockStatus.isLocked && lockStatus.reason === 'prev_score_low' && (
                    <Badge 
                      variant="outline" 
                      className="bg-destructive/10 text-destructive border-destructive/30 text-[10px] px-1.5 py-0"
                    >
                      80% kerak
                    </Badge>
                  )}
                </div>

                {/* Video and Quiz progress breakdown */}
                {isCompleted && progressInfo && (
                  <div className="mt-2 space-y-1.5">
                    {/* Video progress */}
                    <div className="flex items-center gap-2">
                      <Video className="w-3 h-3 text-muted-foreground shrink-0" />
                      <div className="flex-1">
                        <Progress 
                          value={videoCompleted ? 100 : 0} 
                          className="h-1.5" 
                        />
                      </div>
                      <span className={cn(
                        "text-[10px] font-medium min-w-[28px] text-right",
                        videoCompleted ? "text-success" : "text-muted-foreground"
                      )}>
                        {videoPoints}/20
                      </span>
                    </div>
                    
                    {/* Quiz progress */}
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-3 h-3 text-muted-foreground shrink-0" />
                      <div className="flex-1">
                        <Progress 
                          value={quizScore} 
                          className="h-1.5" 
                        />
                      </div>
                      <span className={cn(
                        "text-[10px] font-medium min-w-[28px] text-right",
                        quizPoints >= 64 ? "text-success" : quizPoints >= 40 ? "text-amber-600" : "text-muted-foreground"
                      )}>
                        {quizPoints}/80
                      </span>
                    </div>
                  </div>
                )}

                {/* Show progress hint for current lesson */}
                {isCurrent && !isCompleted && (
                  <div className="mt-2 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Video className="w-3 h-3" /> 20% + 
                      <HelpCircle className="w-3 h-3" /> 80% = 100%
                    </span>
                  </div>
                )}
              </div>
            </motion.button>
          );

          if (lockStatus.isLocked) {
            return (
              <Tooltip key={lesson.id}>
                <TooltipTrigger asChild>
                  {buttonContent}
                </TooltipTrigger>
                <TooltipContent side="right">
                  {lockStatus.reason === 'prev_not_completed' && (
                    <p>Oldingi darsni tugatishingiz kerak</p>
                  )}
                  {lockStatus.reason === 'prev_score_low' && (
                    <p>Oldingi darsda 80% ball oling (hozirgi: {lockStatus.score}%)</p>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          }

          return buttonContent;
        })}
      </div>
    </TooltipProvider>
  );
}
