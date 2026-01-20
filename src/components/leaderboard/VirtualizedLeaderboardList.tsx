import { memo, useCallback, CSSProperties } from 'react';
import { 
  Crown, 
  Medal, 
  BookOpen, 
  Folder,
  Clock,
  Zap
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { uz } from 'date-fns/locale';
import { List } from 'react-window';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { LeaderboardEntry } from '@/hooks/useLeaderboard';

const ITEM_HEIGHT = 100; // Approximate height of each leaderboard card

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

const getRankBadgeColor = (rank: number) => {
  switch (rank) {
    case 1:
      return 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black';
    case 2:
      return 'bg-gradient-to-r from-gray-300 to-gray-400 text-black';
    case 3:
      return 'bg-gradient-to-r from-amber-500 to-orange-600 text-white';
    default:
      return 'bg-secondary text-secondary-foreground';
  }
};

interface RowData {
  entries: LeaderboardEntry[];
  currentUserId: string;
}

interface VirtualizedLeaderboardListProps {
  entries: LeaderboardEntry[];
  currentUserId: string;
  maxHeight?: number;
}

type LeaderboardRowProps = {
  ariaAttributes: {
    "aria-posinset": number;
    "aria-setsize": number;
    role: "listitem";
  };
  index: number;
  style: CSSProperties;
} & RowData;

function LeaderboardRowComponent({
  index,
  style,
  entries,
  currentUserId,
}: LeaderboardRowProps) {
  const entry = entries[index];
  const rank = index + 1;
  const isCurrentUser = entry.user_id === currentUserId;
  const isTopThree = rank <= 3;

  return (
    <div style={{ ...style, paddingBottom: 12, paddingRight: 8 }}>
      <Card 
        variant="glass" 
        className={cn(
          'transition-all hover:shadow-lg h-full',
          isCurrentUser && 'ring-2 ring-primary',
          isTopThree && 'border-2',
          rank === 1 && 'border-yellow-500/50 bg-yellow-500/5',
          rank === 2 && 'border-gray-400/50 bg-gray-400/5',
          rank === 3 && 'border-amber-600/50 bg-amber-600/5'
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Rank */}
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
              getRankBadgeColor(rank)
            )}>
              {getRankIcon(rank)}
            </div>

            {/* Avatar */}
            <Avatar className={cn(
              'w-12 h-12 shrink-0',
              isTopThree && 'ring-2',
              rank === 1 && 'ring-yellow-500',
              rank === 2 && 'ring-gray-400',
              rank === 3 && 'ring-amber-600'
            )}>
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-lg font-bold">
                {entry.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold truncate">{entry.name}</p>
                {isCurrentUser && (
                  <Badge variant="secondary" className="text-xs">Siz</Badge>
                )}
              </div>
              {entry.last_activity && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(new Date(entry.last_activity), { 
                    addSuffix: true,
                    locale: uz 
                  })}
                </p>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 shrink-0">
              <div className="text-center">
                <div className="flex items-center gap-1 text-yellow-500">
                  <Zap className="w-4 h-4" />
                  <span className="font-bold text-lg">{entry.total_score || 0}</span>
                </div>
                <p className="text-xs text-muted-foreground">Ball</p>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-1 text-primary">
                  <BookOpen className="w-4 h-4" />
                  <span className="font-bold text-lg">{entry.completed_lessons}</span>
                </div>
                <p className="text-xs text-muted-foreground">Darslar</p>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-1 text-accent">
                  <Folder className="w-4 h-4" />
                  <span className="font-bold text-lg">{entry.completed_units}</span>
                </div>
                <p className="text-xs text-muted-foreground">Unitlar</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export const VirtualizedLeaderboardList = memo(function VirtualizedLeaderboardList({ 
  entries, 
  currentUserId,
  maxHeight = 600 
}: VirtualizedLeaderboardListProps) {
  const listHeight = Math.min(Math.max(entries.length * ITEM_HEIGHT, 200), maxHeight);

  const rowData: RowData = {
    entries,
    currentUserId,
  };

  return (
    <div style={{ height: listHeight }}>
      <List
        rowCount={entries.length}
        rowHeight={ITEM_HEIGHT}
        rowProps={rowData}
        rowComponent={LeaderboardRowComponent}
        overscanCount={5}
        style={{ height: '100%', width: '100%' }}
      />
    </div>
  );
});
