import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  useAdminOverview, 
  useAdminTeacherStats, 
  useAdminGroupStats,
  useAdminWeeklyProgress 
} from '@/hooks/useAdminStats';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  Target, 
  TrendingUp, 
  Calendar,
  UserCheck,
  Activity,
  Award,
  UsersRound,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(142, 76%, 36%)',
  'hsl(38, 92%, 50%)',
  'hsl(280, 65%, 60%)',
];

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  description,
  trend 
}: { 
  title: string; 
  value: number | string; 
  icon: React.ElementType;
  description?: string;
  trend?: { value: number; label: string };
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="text-3xl font-bold">{value}</p>
              {description && (
                <p className="text-xs text-muted-foreground">{description}</p>
              )}
              {trend && (
                <div className="flex items-center gap-1 text-xs">
                  <TrendingUp className="w-3 h-3 text-green-500" />
                  <span className="text-green-500">+{trend.value}</span>
                  <span className="text-muted-foreground">{trend.label}</span>
                </div>
              )}
            </div>
            <div className="p-3 rounded-xl bg-primary/10">
              <Icon className="w-6 h-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function TeacherCard({ 
  teacher 
}: { 
  teacher: {
    teacherId: string;
    teacherName: string;
    avatarUrl: string | null;
    groupCount: number;
    studentCount: number;
    activeStudents: number;
    lessonsCompleted: number;
    unitsCompleted: number;
    thisWeekLessons: number;
    averageAttendance: number;
  };
}) {
  const activityRate = teacher.studentCount > 0 
    ? Math.round((teacher.activeStudents / teacher.studentCount) * 100) 
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="h-full">
        <CardContent className="p-6">
          <div className="flex items-start gap-4 mb-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={teacher.avatarUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {teacher.teacherName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{teacher.teacherName}</h3>
              <p className="text-sm text-muted-foreground">
                {teacher.groupCount} guruh • {teacher.studentCount} talaba
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Faol talabalar</span>
                <span className="font-medium">{activityRate}%</span>
              </div>
              <Progress value={activityRate} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                <span>{teacher.lessonsCompleted} dars</span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-muted-foreground" />
                <span>{teacher.unitsCompleted} bo'lim</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span>+{teacher.thisWeekLessons} bu hafta</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>{teacher.averageAttendance}% davomat</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function GroupRow({ 
  group, 
  rank 
}: { 
  group: {
    groupId: string;
    groupName: string;
    teacherName: string;
    studentCount: number;
    activeStudents: number;
    lessonsCompleted: number;
    unitsCompleted: number;
    thisWeekLessons: number;
    thisMonthLessons: number;
  };
  rank: number;
}) {
  const activityRate = group.studentCount > 0 
    ? Math.round((group.activeStudents / group.studentCount) * 100) 
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.05 }}
      className="flex items-center gap-4 p-4 rounded-lg bg-card border hover:bg-accent/5 transition-colors"
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
        rank === 1 ? 'bg-yellow-100 text-yellow-700' :
        rank === 2 ? 'bg-gray-100 text-gray-700' :
        rank === 3 ? 'bg-amber-100 text-amber-700' :
        'bg-muted text-muted-foreground'
      }`}>
        {rank}
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-medium truncate">{group.groupName}</h4>
        <p className="text-sm text-muted-foreground">{group.teacherName}</p>
      </div>

      <div className="hidden md:flex items-center gap-6">
        <div className="text-center">
          <p className="text-lg font-semibold">{group.studentCount}</p>
          <p className="text-xs text-muted-foreground">Talaba</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold">{group.lessonsCompleted}</p>
          <p className="text-xs text-muted-foreground">Dars</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-green-600">+{group.thisWeekLessons}</p>
          <p className="text-xs text-muted-foreground">Bu hafta</p>
        </div>
      </div>

      <Badge variant={activityRate >= 70 ? 'default' : activityRate >= 40 ? 'secondary' : 'outline'}>
        {activityRate}% faol
      </Badge>
    </motion.div>
  );
}

export default function AdminStatistics() {
  const { data: overview, isLoading: overviewLoading } = useAdminOverview();
  const { data: teacherStats, isLoading: teachersLoading } = useAdminTeacherStats();
  const { data: groupStats, isLoading: groupsLoading } = useAdminGroupStats();
  const { data: weeklyProgress, isLoading: weeklyLoading } = useAdminWeeklyProgress();

  const isLoading = overviewLoading || teachersLoading || groupsLoading || weeklyLoading;

  // Prepare pie chart data for teacher distribution
  const teacherDistribution = teacherStats?.map(t => ({
    name: t.teacherName,
    value: t.studentCount,
  })) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Umumiy Statistika</h1>
          <p className="text-muted-foreground">Barcha o'qituvchilar va guruhlar bo'yicha ko'rsatkichlar</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-muted rounded w-1/2" />
                    <div className="h-8 bg-muted rounded w-3/4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Jami O'qituvchilar"
                value={overview?.totalTeachers || 0}
                icon={Users}
                description="Faol o'qituvchilar soni"
              />
              <StatCard
                title="Jami Guruhlar"
                value={overview?.totalGroups || 0}
                icon={UsersRound}
                description="Faol guruhlar soni"
              />
              <StatCard
                title="Jami Talabalar"
                value={overview?.totalStudents || 0}
                icon={GraduationCap}
                description={`${overview?.activeStudents || 0} ta faol`}
              />
              <StatCard
                title="Tugatilgan Darslar"
                value={overview?.totalLessonsCompleted || 0}
                icon={BookOpen}
                trend={{ 
                  value: overview?.thisWeekLessons || 0, 
                  label: 'bu hafta' 
                }}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Tugatilgan Bo'limlar"
                value={overview?.totalUnitsCompleted || 0}
                icon={Target}
              />
              <StatCard
                title="Bu Hafta Darslar"
                value={overview?.thisWeekLessons || 0}
                icon={Activity}
              />
              <StatCard
                title="Bu Oy Darslar"
                value={overview?.thisMonthLessons || 0}
                icon={Calendar}
              />
              <StatCard
                title="O'rtacha Davomat"
                value={`${overview?.averageAttendance || 0}%`}
                icon={UserCheck}
              />
            </div>

            <Tabs defaultValue="teachers" className="space-y-6">
              <TabsList>
                <TabsTrigger value="teachers">O'qituvchilar</TabsTrigger>
                <TabsTrigger value="groups">Guruhlar</TabsTrigger>
                <TabsTrigger value="charts">Grafiklar</TabsTrigger>
              </TabsList>

              <TabsContent value="teachers" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teacherStats?.map((teacher, index) => (
                    <TeacherCard key={teacher.teacherId} teacher={teacher} />
                  ))}
                </div>

                {(!teacherStats || teacherStats.length === 0) && (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">O'qituvchilar topilmadi</h3>
                      <p className="text-muted-foreground">Hozircha o'qituvchilar mavjud emas</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="groups" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="w-5 h-5" />
                      Guruhlar Reytingi
                    </CardTitle>
                    <CardDescription>
                      Tugatilgan darslar soni bo'yicha tartiblangan
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {groupStats?.map((group, index) => (
                      <GroupRow 
                        key={group.groupId} 
                        group={group} 
                        rank={index + 1} 
                      />
                    ))}

                    {(!groupStats || groupStats.length === 0) && (
                      <div className="p-12 text-center">
                        <UsersRound className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">Guruhlar topilmadi</h3>
                        <p className="text-muted-foreground">Hozircha guruhlar mavjud emas</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="charts" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Weekly Progress Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Haftalik Progress</CardTitle>
                      <CardDescription>So'nggi 8 hafta davomida tugatilgan darslar va bo'limlar</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={weeklyProgress || []}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="week" className="text-xs" />
                            <YAxis className="text-xs" />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px'
                              }}
                            />
                            <Legend />
                            <Area 
                              type="monotone" 
                              dataKey="lessons" 
                              name="Darslar"
                              stroke="hsl(var(--primary))" 
                              fill="hsl(var(--primary) / 0.2)" 
                            />
                            <Area 
                              type="monotone" 
                              dataKey="units" 
                              name="Bo'limlar"
                              stroke="hsl(var(--accent))" 
                              fill="hsl(var(--accent) / 0.2)" 
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Teacher Distribution Pie Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Talabalar Taqsimoti</CardTitle>
                      <CardDescription>O'qituvchilar bo'yicha talabalar soni</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={teacherDistribution}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              paddingAngle={5}
                              dataKey="value"
                              label={({ name, percent }) => 
                                `${name}: ${(percent * 100).toFixed(0)}%`
                              }
                            >
                              {teacherDistribution.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={COLORS[index % COLORS.length]} 
                                />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px'
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Teacher Comparison Bar Chart */}
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle>O'qituvchilar Taqqoslash</CardTitle>
                      <CardDescription>O'qituvchilar bo'yicha tugatilgan darslar va bo'limlar</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={teacherStats?.slice(0, 10) || []}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="teacherName" className="text-xs" />
                            <YAxis className="text-xs" />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px'
                              }}
                            />
                            <Legend />
                            <Bar 
                              dataKey="lessonsCompleted" 
                              name="Darslar" 
                              fill="hsl(var(--primary))" 
                              radius={[4, 4, 0, 0]}
                            />
                            <Bar 
                              dataKey="unitsCompleted" 
                              name="Bo'limlar" 
                              fill="hsl(var(--accent))" 
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
