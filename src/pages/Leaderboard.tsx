import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Trophy, 
  Medal, 
  Crown, 
  Star, 
  BookOpen, 
  Folder,
  Users,
  Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { uz } from 'date-fns/locale';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useLeaderboard, useGroupLeaderboard, useUserGroups, LeaderboardEntry } from '@/hooks/useLeaderboard';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface LeaderboardCardProps {
  entry: LeaderboardEntry;
  rank: number;
  isCurrentUser: boolean;
}

function LeaderboardCard({ entry, rank, isCurrentUser }: LeaderboardCardProps) {
  const isTopThree = rank <= 3;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.03 }}
    >
      <Card 
        variant="glass" 
        className={cn(
          'transition-all hover:shadow-lg',
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
    </motion.div>
  );
}

function TopThreePodium({ entries, currentUserId }: { entries: LeaderboardEntry[]; currentUserId?: string }) {
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
            <p className="text-xs text-muted-foreground mb-2">{entry.completed_lessons} dars</p>
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
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');

  const { data: globalLeaderboard, isLoading: globalLoading } = useLeaderboard(50);
  const { data: userGroups } = useUserGroups(user?.id);
  const { data: groupLeaderboard, isLoading: groupLoading } = useGroupLeaderboard(
    selectedGroupId !== 'all' ? selectedGroupId : undefined
  );

  if (!user) return null;

  const currentLeaderboard = selectedGroupId === 'all' ? globalLeaderboard : groupLeaderboard;
  const isLoading = selectedGroupId === 'all' ? globalLoading : groupLoading;

  // Find current user's rank
  const currentUserRank = currentLeaderboard?.findIndex(e => e.user_id === user.id);
  const userRankDisplay = currentUserRank !== undefined && currentUserRank >= 0 ? currentUserRank + 1 : null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl lg:text-3xl font-bold flex items-center gap-3"
            >
              <Trophy className="w-8 h-8 text-yellow-500" />
              Reyting
            </motion.h1>
            <p className="text-muted-foreground mt-1">
              Eng ko'p dars tugatgan talabalar ro'yxati
            </p>
          </div>

          {/* Group Filter */}
          {userGroups && userGroups.length > 0 && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Guruh tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barcha talabalar</SelectItem>
                  {userGroups.map(group => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* User's Current Rank Card */}
        {userRankDisplay && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Star className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Sizning o'rningiz</p>
                    <p className="text-2xl font-bold">#{userRankDisplay}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-sm text-muted-foreground">Tugatilgan darslar</p>
                    <p className="text-2xl font-bold text-primary">
                      {currentLeaderboard?.[currentUserRank!]?.completed_lessons || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Leaderboard Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !currentLeaderboard || currentLeaderboard.length === 0 ? (
          <Card variant="glass">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Trophy className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Hali hech kim dars tugatmagan</p>
              <p className="text-muted-foreground">Birinchi bo'ling!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Top 3 Podium */}
            {currentLeaderboard.length >= 3 && (
              <Card variant="glass">
                <CardContent className="pt-8 pb-4">
                  <TopThreePodium entries={currentLeaderboard} currentUserId={user.id} />
                </CardContent>
              </Card>
            )}

            {/* Full Leaderboard List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Medal className="w-5 h-5" />
                  To'liq reyting
                </CardTitle>
                <CardDescription>
                  {currentLeaderboard.length} ta faol talaba
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {currentLeaderboard.map((entry, index) => (
                  <LeaderboardCard
                    key={entry.user_id}
                    entry={entry}
                    rank={index + 1}
                    isCurrentUser={entry.user_id === user.id}
                  />
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
