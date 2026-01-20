import { motion } from 'framer-motion';
import { Clock, CheckCircle2, Timer, CalendarClock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useDailyLessonLimit } from '@/hooks/useLessonAccess';
import { Skeleton } from '@/components/ui/skeleton';
import { format, formatDistanceToNow, addDays, startOfDay } from 'date-fns';
import { uz } from 'date-fns/locale';

export function DailyLimitWidget() {
  const { data: limitData, isLoading } = useDailyLessonLimit();

  if (isLoading) {
    return (
      <Card variant="glass">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-full mb-2" />
          <Skeleton className="h-4 w-48" />
        </CardContent>
      </Card>
    );
  }

  if (!limitData) return null;

  const { can_complete, lessons_today, daily_limit, next_available } = limitData;
  const limitReached = !can_complete;
  const progressPercent = daily_limit ? (lessons_today / daily_limit) * 100 : 0;

  // Calculate when next lesson will be available
  const getNextAvailableTime = () => {
    if (next_available) {
      return new Date(next_available);
    }
    // Default: tomorrow at midnight
    return addDays(startOfDay(new Date()), 1);
  };

  const nextAvailableDate = getNextAvailableTime();
  const timeUntilNext = formatDistanceToNow(nextAvailableDate, { 
    addSuffix: true, 
    locale: uz 
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <Card variant="glass" className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-primary" />
              Kunlik dars limiti
            </CardTitle>
            {limitReached ? (
              <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-500 rounded-full flex items-center gap-1">
                <Timer className="w-3 h-3" />
                Limit tugadi
              </span>
            ) : (
              <span className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Mavjud
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Bugun tugatilgan</span>
              <span className="font-semibold">
                {lessons_today} / {daily_limit ?? '∞'}
              </span>
            </div>
            {daily_limit && (
              <Progress 
                value={progressPercent} 
                className="h-2" 
              />
            )}
          </div>

          {/* Next Lesson Info */}
          {limitReached && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="pt-3 border-t border-border"
            >
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Clock className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium">
                    Keyingi dars mavjud bo'ladi
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(nextAvailableDate, "d MMMM, EEEE", { locale: uz })}
                  </p>
                  <p className="text-xs text-primary mt-1 font-medium">
                    {timeUntilNext}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Available Message */}
          {!limitReached && daily_limit && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>
                Yana {daily_limit - lessons_today} ta dars tugatishingiz mumkin
              </span>
            </div>
          )}

          {/* Unlimited access message */}
          {!daily_limit && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Cheksiz dars tugatishingiz mumkin</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
