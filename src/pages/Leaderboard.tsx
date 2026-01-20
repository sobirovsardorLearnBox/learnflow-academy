import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Trophy, 
  Medal, 
  Star, 
  Users,
  Loader2
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useLeaderboard, useGroupLeaderboard, useUserGroups } from '@/hooks/useLeaderboard';
import { LeaderboardCard } from '@/components/leaderboard/LeaderboardCard';
import { TopThreePodium } from '@/components/leaderboard/TopThreePodium';

export default function Leaderboard() {
  const { user } = useAuth();
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');

  const { data: globalLeaderboard, isLoading: globalLoading } = useLeaderboard(50);
  const { data: userGroups } = useUserGroups(user?.id);
  const { data: groupLeaderboard, isLoading: groupLoading } = useGroupLeaderboard(
    selectedGroupId !== 'all' ? selectedGroupId : undefined
  );

  // Memoize current leaderboard selection
  const { currentLeaderboard, isLoading } = useMemo(() => ({
    currentLeaderboard: selectedGroupId === 'all' ? globalLeaderboard : groupLeaderboard,
    isLoading: selectedGroupId === 'all' ? globalLoading : groupLoading
  }), [selectedGroupId, globalLeaderboard, groupLeaderboard, globalLoading, groupLoading]);

  // Find current user's rank
  const { currentUserRank, userRankDisplay } = useMemo(() => {
    const rank = currentLeaderboard?.findIndex(e => e.user_id === user?.id);
    return {
      currentUserRank: rank,
      userRankDisplay: rank !== undefined && rank >= 0 ? rank + 1 : null
    };
  }, [currentLeaderboard, user?.id]);

  if (!user) return null;

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
              Eng ko'p ball to'plagan talabalar ro'yxati
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
                    <p className="text-sm text-muted-foreground">Jami ball</p>
                    <p className="text-2xl font-bold text-yellow-500">
                      {currentLeaderboard?.[currentUserRank!]?.total_score || 0}
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
