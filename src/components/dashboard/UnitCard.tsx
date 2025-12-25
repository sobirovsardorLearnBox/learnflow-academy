import { motion } from 'framer-motion';
import { Lock, CheckCircle2, Play } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Unit } from '@/data/courseData';
import { cn } from '@/lib/utils';

interface UnitCardProps {
  unit: Unit;
  index: number;
  onClick: () => void;
}

export function UnitCard({ unit, index, onClick }: UnitCardProps) {
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
          <div className="flex items-center gap-3">
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
              <h4 className="font-medium">{unit.title}</h4>
              <div className="flex gap-2 mt-1">
                {unit.subUnits.map((sub) => (
                  <span
                    key={sub}
                    className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground"
                  >
                    {sub}
                  </span>
                ))}
              </div>
            </div>

            {/* Progress */}
            {!unit.isLocked && (
              <div className="text-right">
                <span
                  className={cn(
                    'text-sm font-medium',
                    unit.isCompleted ? 'text-success' : 'text-primary'
                  )}
                >
                  {unit.progress}%
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
