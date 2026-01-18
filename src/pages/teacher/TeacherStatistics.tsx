import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  BookOpen, 
  Folder, 
  TrendingUp,
  Calendar,
  Trophy,
  UserCheck,
  BarChart3,
  PieChart as PieChartIcon,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useTeacherGroupStats, 
  useTeacherOverview, 
  useTeacherWeeklyProgress,
  useTeacherTopStudents
} from '@/hooks/useTeacherStats';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function TeacherStatistics() {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState('overview');

  const { data: overview, isLoading: overviewLoading } = useTeacherOverview(user?.id);
  const { data: groupStats, isLoading: groupsLoading } = useTeacherGroupStats(user?.id);
  const { data: weeklyProgress, isLoading: weeklyLoading } = useTeacherWeeklyProgress(user?.id);
  const { data: topStudents, isLoading: studentsLoading } = useTeacherTopStudents(user?.id, 10);

  if (!user) return null;

  const isLoading = overviewLoading || groupsLoading;

  const overviewStats = [
    { 
      label: "Jami guruhlar", 
      value: overview?.totalGroups || 0, 
      icon: Users, 
      color: 'from-blue-500 to-cyan-600'
    },
    { 
      label: "Jami talabalar", 
      value: overview?.totalStudents || 0, 
      icon: UserCheck, 
      color: 'from-emerald-500 to-teal-600'
    },
    { 
      label: "Faol talabalar", 
      value: overview?.activeStudents || 0, 
      icon: TrendingUp, 
      color: 'from-violet-500 to-purple-600',
      subtext: 'So\'nggi 7 kun'
    },
    { 
      label: "Bu hafta darslar", 
      value: overview?.thisWeekLessons || 0, 
      icon: Calendar, 
      color: 'from-orange-500 to-amber-600'
    },
    { 
      label: "Jami darslar", 
      value: overview?.totalLessonsCompleted || 0, 
      icon: BookOpen, 
      color: 'from-pink-500 to-rose-600'
    },
    { 
      label: "Davomat", 
      value: `${overview?.averageAttendance || 0}%`, 
      icon: Trophy, 
      color: 'from-indigo-500 to-blue-600',
      subtext: 'So\'nggi 30 kun'
    },
  ];

  // Pie chart data for group distribution
  const pieData = groupStats?.map((g, i) => ({
    name: g.groupName,
    value: g.totalStudents,
    color: COLORS[i % COLORS.length],
  })) || [];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl lg:text-3xl font-bold"
          >
            Statistika
          </motion.h1>
          <p className="text-muted-foreground mt-1">
            Guruhlaringiz va talabalaringiz faoliyati
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Overview Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {overviewStats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card variant="glass" className="h-full">
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                          <stat.icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{stat.value}</p>
                          <p className="text-xs text-muted-foreground">{stat.label}</p>
                          {stat.subtext && (
                            <p className="text-[10px] text-muted-foreground/70">{stat.subtext}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Main Content */}
            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
              <TabsList>
                <TabsTrigger value="overview" className="gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Umumiy
                </TabsTrigger>
                <TabsTrigger value="groups" className="gap-2">
                  <Users className="w-4 h-4" />
                  Guruhlar
                </TabsTrigger>
                <TabsTrigger value="students" className="gap-2">
                  <Trophy className="w-4 h-4" />
                  Top talabalar
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6 mt-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Weekly Progress Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Haftalik progress
                      </CardTitle>
                      <CardDescription>Guruhlar bo'yicha tugatilgan darslar</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {weeklyLoading ? (
                        <div className="flex items-center justify-center h-[300px]">
                          <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                      ) : weeklyProgress?.data.length === 0 ? (
                        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                          Ma'lumotlar mavjud emas
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={weeklyProgress?.data}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis 
                              dataKey="week"
                              tick={{ fill: 'hsl(var(--muted-foreground))' }}
                            />
                            <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            {weeklyProgress?.groups.map((groupName, idx) => (
                              <Bar 
                                key={groupName}
                                dataKey={groupName}
                                name={groupName}
                                fill={COLORS[idx % COLORS.length]}
                                radius={[4, 4, 0, 0]}
                              />
                            ))}
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>

                  {/* Student Distribution Pie */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <PieChartIcon className="w-5 h-5" />
                        Talabalar taqsimoti
                      </CardTitle>
                      <CardDescription>Guruhlar bo'yicha talabalar soni</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {pieData.length === 0 ? (
                        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                          Guruhlar mavjud emas
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                              outerRadius={100}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="groups" className="space-y-4 mt-6">
                {!groupStats || groupStats.length === 0 ? (
                  <Card variant="glass">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                      <Users className="w-16 h-16 text-muted-foreground mb-4" />
                      <p className="text-lg font-medium">Guruhlar mavjud emas</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {groupStats.map((group, index) => (
                      <motion.div
                        key={group.groupId}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Card variant="glass">
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg">{group.groupName}</CardTitle>
                              <Badge variant="secondary">
                                {group.totalStudents} talaba
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Activity indicator */}
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                'w-2 h-2 rounded-full',
                                group.activeStudents > 0 ? 'bg-green-500' : 'bg-gray-400'
                              )} />
                              <span className="text-sm text-muted-foreground">
                                {group.activeStudents} faol talaba
                              </span>
                            </div>

                            {/* Progress bars */}
                            <div className="space-y-3">
                              <div>
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="text-muted-foreground">Tugatilgan darslar</span>
                                  <span className="font-medium">{group.totalLessonsCompleted}</span>
                                </div>
                                <Progress 
                                  value={Math.min((group.totalLessonsCompleted / Math.max(group.totalStudents * 10, 1)) * 100, 100)} 
                                  className="h-2"
                                />
                              </div>

                              <div>
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="text-muted-foreground">Tugatilgan unitlar</span>
                                  <span className="font-medium">{group.totalUnitsCompleted}</span>
                                </div>
                                <Progress 
                                  value={Math.min((group.totalUnitsCompleted / Math.max(group.totalStudents * 2, 1)) * 100, 100)} 
                                  className="h-2"
                                />
                              </div>
                            </div>

                            {/* Stats grid */}
                            <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                              <div className="text-center">
                                <p className="text-lg font-bold text-primary">{group.thisWeekLessons}</p>
                                <p className="text-[10px] text-muted-foreground">Bu hafta</p>
                              </div>
                              <div className="text-center">
                                <p className="text-lg font-bold text-accent">{group.thisMonthLessons}</p>
                                <p className="text-[10px] text-muted-foreground">Bu oy</p>
                              </div>
                              <div className="text-center">
                                <p className="text-lg font-bold">{group.averageProgress}</p>
                                <p className="text-[10px] text-muted-foreground">O'rtacha</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="students" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-yellow-500" />
                      Eng faol talabalar
                    </CardTitle>
                    <CardDescription>Eng ko'p dars tugatgan talabalar</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {studentsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      </div>
                    ) : !topStudents || topStudents.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Hali hech kim dars tugatmagan
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {topStudents.map((student, index) => (
                          <motion.div
                            key={student.userId}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={cn(
                              'flex items-center gap-4 p-3 rounded-lg',
                              index < 3 ? 'bg-primary/5' : 'bg-secondary/50'
                            )}
                          >
                            <div className={cn(
                              'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm',
                              index === 0 && 'bg-yellow-500 text-black',
                              index === 1 && 'bg-gray-400 text-black',
                              index === 2 && 'bg-amber-600 text-white',
                              index > 2 && 'bg-secondary text-muted-foreground'
                            )}>
                              {index + 1}
                            </div>

                            <Avatar>
                              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
                                {student.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{student.name}</p>
                              <p className="text-xs text-muted-foreground">{student.groupName}</p>
                            </div>

                            <div className="text-right">
                              <p className="text-lg font-bold text-primary">{student.completedLessons}</p>
                              <p className="text-xs text-muted-foreground">dars</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
