import { motion } from 'framer-motion';
import { Lock, CheckCircle2, Play, BookOpen, Trophy, Target } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface UnitData {
  id: string;
  title: string;
  isLocked: boolean;
  isCompleted: boolean;
  progress: number;
  subUnits: string[];
  unlockProgressNeeded?: number;
  totalLessons?: number;
  completedLessons?: number;
  averageScore?: number;
  passedCount?: number;
}

interface UnitCardProps {
  unit: UnitData;
  index: number;
  onClick: () => void;
}

export function UnitCard({ unit, index, onClick }: UnitCardProps) {
  const hasDetailedProgress = unit.totalLessons !== undefined && unit.totalLessons > 0;
  const scoreColor = unit.averageScore !== undefined 
    ? unit.averageScore >= 80 
      ? 'text-success' 
      : unit.averageScore >= 50 
        ? 'text-amber-500' 
        : 'text-destructive'
    : 'text-muted-foreground';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: unit.isLocked ? 1 : 1.02 }}
    >
      <Card
        variant={unit.isLocked ? 'default' : 'interactive'}
        className={cn(
          'relative overflow-hidden',
          unit.isLocked && 'opacity-50 cursor-not-allowed'
        )}
        onClick={unit.isLocked ? undefined : onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Status Icon */}
            <div
              className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                unit.isLocked
                  ? 'bg-muted'
                  : unit.isCompleted
                  ? 'bg-success/20'
                  : 'bg-primary/20'
              )}
            >
              {unit.isLocked ? (
                <Lock className="w-4 h-4 text-muted-foreground" />
              ) : unit.isCompleted ? (
                <CheckCircle2 className="w-4 h-4 text-success" />
              ) : (
                <Play className="w-4 h-4 text-primary" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="font-medium leading-tight">{unit.title}</h4>
              
              {/* Lock message */}
              {unit.isLocked && unit.unlockProgressNeeded && unit.unlockProgressNeeded > 0 ? (
                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1 block">
                  🔒 Ochish uchun yana {unit.unlockProgressNeeded}% kerak
                </span>
              ) : hasDetailedProgress ? (
                <div className="mt-2 space-y-2">
                  {/* Lessons count */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>
                      {unit.completedLessons}/{unit.totalLessons} dars tugatildi
                    </span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="space-y-1">
                    <Progress 
                      value={unit.progress} 
                      className="h-1.5"
                    />
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-muted-foreground">
                        Progress
                      </span>
                      <span className={cn(
                        "text-[10px] font-medium",
                        unit.progress >= 80 ? 'text-success' : 'text-primary'
                      )}>
                        {unit.progress}%
                      </span>
                    </div>
                  </div>
                  
                  {/* Stats row */}
                  {(unit.completedLessons || 0) > 0 && (
                    <div className="flex items-center gap-3 pt-1 border-t border-border/50">
                      {/* Average score */}
                      <div className="flex items-center gap-1">
                        <Trophy className={cn("w-3.5 h-3.5", scoreColor)} />
                        <span className={cn("text-xs font-medium", scoreColor)}>
                          {unit.averageScore}%
                        </span>
                        <span className="text-[10px] text-muted-foreground">o'rtacha</span>
                      </div>
                      
                      {/* Passed count */}
                      <div className="flex items-center gap-1">
                        <Target className="w-3.5 h-3.5 text-success" />
                        <span className="text-xs font-medium text-success">
                          {unit.passedCount}/{unit.totalLessons}
                        </span>
                        <span className="text-[10px] text-muted-foreground">80%+</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex gap-2 mt-1 flex-wrap">
                  {unit.subUnits.map((sub) => (
                    <span
                      key={sub}
                      className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground"
                    >
                      {sub}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
