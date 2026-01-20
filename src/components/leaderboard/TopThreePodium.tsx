import { memo } from 'react';
import { motion } from 'framer-motion';
import { Crown, Medal } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { LeaderboardEntry } from '@/hooks/useLeaderboard';

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Crown className="w-6 h-6 text-yellow-500" />;
    case 2:
      return <Medal className="w-6 h-6 text-gray-400" />;
    case 3:
      return <Medal className="w-6 h-6 text-amber-600" />;
    default:
      return <span className="w-6 h-6 flex items-center justify-center text-sm font-bold text-muted-foreground">{rank}</span>;
  }
};

interface TopThreePodiumProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
}

export const TopThreePodium = memo(function TopThreePodium({ entries, currentUserId }: TopThreePodiumProps) {
  if (entries.length < 3) return null;

  const podiumOrder = [entries[1], entries[0], entries[2]]; // 2nd, 1st, 3rd

  return (
    <div className="flex items-end justify-center gap-4 mb-8">
      {podiumOrder.map((entry, idx) => {
        const actualRank = idx === 0 ? 2 : idx === 1 ? 1 : 3;
        const height = idx === 1 ? 'h-32' : idx === 0 ? 'h-24' : 'h-20';
        const isCurrentUser = entry.user_id === currentUserId;
        
        return (
          <motion.div
            key={entry.user_id}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="flex flex-col items-center"
          >
            <Avatar className={cn(
              'w-16 h-16 mb-2 ring-4',
              actualRank === 1 && 'ring-yellow-500',
              actualRank === 2 && 'ring-gray-400',
              actualRank === 3 && 'ring-amber-600',
              isCurrentUser && 'ring-primary ring-offset-2'
            )}>
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-xl font-bold">
                {entry.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <p className="font-medium text-sm text-center mb-1 max-w-[80px] truncate">{entry.name}</p>
            <p className="text-xs text-muted-foreground mb-2">{entry.total_score || 0} ball</p>
            <div className={cn(
              'w-20 rounded-t-lg flex items-center justify-center',
              height,
              actualRank === 1 && 'bg-gradient-to-t from-yellow-500 to-yellow-400',
              actualRank === 2 && 'bg-gradient-to-t from-gray-400 to-gray-300',
              actualRank === 3 && 'bg-gradient-to-t from-amber-600 to-amber-500'
            )}>
              {getRankIcon(actualRank)}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
});
