import { memo } from 'react';
import { motion } from 'framer-motion';
import { Lock, CheckCircle2, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Level } from '@/data/courseData';
import { cn } from '@/lib/utils';

interface LevelCardProps {
  level: Level;
  index: number;
  onClick: () => void;
}

export const LevelCard = memo(function LevelCard({ level, index, onClick }: LevelCardProps) {
  const isCompleted = level.progress === 100;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ scale: level.isLocked ? 1 : 1.01 }}
    >
      <Card
        variant={level.isLocked ? 'default' : 'interactive'}
        className={cn(
          'relative overflow-hidden',
          level.isLocked && 'opacity-50 cursor-not-allowed'
        )}
        onClick={level.isLocked ? undefined : onClick}
      >
        <CardContent className="p-4 flex items-center gap-4">
          {/* Level Number */}
          <div
            className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shrink-0',
              level.isLocked
                ? 'bg-muted text-muted-foreground'
                : isCompleted
                ? 'bg-success/20 text-success'
                : 'bg-primary/20 text-primary'
            )}
          >
            {level.isLocked ? (
              <Lock className="w-5 h-5" />
            ) : isCompleted ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              index + 1
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{level.title}</h3>
            <p className="text-sm text-muted-foreground truncate">
              {level.description}
            </p>
            
            {level.isLocked && (level as any).unlockProgressNeeded > 0 ? (
              <div className="mt-2">
                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  🔒 Ochish uchun yana {(level as any).unlockProgressNeeded}% kerak
                </span>
              </div>
            ) : !level.isLocked && level.progress !== undefined && (
              <div className="mt-2 flex items-center gap-3">
                <div className="progress-bar h-1.5 flex-1">
                  <div
                    className={level.progress >= 80 ? 'progress-bar-fill-success' : 'progress-bar-fill'}
                    style={{ width: `${level.progress}%` }}
                  />
                </div>
                <span className={cn(
                  'text-xs whitespace-nowrap',
                  level.progress >= 80 ? 'text-success' : 'text-muted-foreground'
                )}>
                  {level.progress}%
                </span>
              </div>
            )}
          </div>

          {/* Arrow */}
          {!level.isLocked && (
            <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
});
