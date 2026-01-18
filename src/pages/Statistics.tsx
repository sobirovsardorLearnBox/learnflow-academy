import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  BookOpen, 
  Trophy, 
  Flame, 
  Target, 
  Calendar,
  BarChart3,
  LineChart as LineChartIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useDailyProgress, 
  useWeeklyProgress, 
  useMonthlyProgress, 
  useProgressSummary 
} from '@/hooks/useProgressStats';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { Loader2 } from 'lucide-react';

export default function Statistics() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  const { data: dailyProgress, isLoading: dailyLoading } = useDailyProgress(user?.id, 14);
  const { data: weeklyProgress, isLoading: weeklyLoading } = useWeeklyProgress(user?.id, 8);
  const { data: monthlyProgress, isLoading: monthlyLoading } = useMonthlyProgress(user?.id, 6);
  const { data: summary, isLoading: summaryLoading } = useProgressSummary(user?.id);

  if (!user) return null;

  const isLoading = dailyLoading || weeklyLoading || monthlyLoading || summaryLoading;

  const stats = [
    { 
      label: "Jami darslar", 
      value: summary?.totalLessons || 0, 
      icon: BookOpen, 
      color: 'from-cyan-500 to-blue-600',
      description: 'Tugatilgan darslar'
    },
    { 
      label: "Jami unitlar", 
      value: summary?.totalUnits || 0, 
      icon: Trophy, 
      color: 'from-violet-500 to-purple-600',
      description: 'Tugatilgan unitlar'
    },
    { 
      label: "Bu hafta", 
      value: summary?.thisWeekLessons || 0, 
      icon: Calendar, 
      color: 'from-emerald-500 to-teal-600',
      description: 'Darslar tugatildi'
    },
    { 
      label: "Streak", 
      value: `${summary?.streak || 0} kun`, 
      icon: Flame, 
      color: 'from-orange-500 to-red-600',
      description: 'Ketma-ket kunlar'
    },
    { 
      label: "Bu oy", 
      value: summary?.thisMonthLessons || 0, 
      icon: Target, 
      color: 'from-pink-500 to-rose-600',
      description: 'Darslar tugatildi'
    },
    { 
      label: "O'rtacha", 
      value: summary?.averageDailyLessons || 0, 
      icon: TrendingUp, 
      color: 'from-amber-500 to-yellow-600',
      description: 'Kunlik darslar'
    },
  ];

  const getChartData = () => {
    switch (timeRange) {
      case 'daily':
        return (dailyProgress || []).map(d => ({
          ...d,
          name: format(new Date(d.date), 'EEE'),
        }));
      case 'weekly':
        return weeklyProgress || [];
      case 'monthly':
        return monthlyProgress || [];
      default:
        return [];
    }
  };

  const chartData = getChartData();

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
            O'quv jarayonidagi yutuqlaringizni kuzating
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {stats.map((stat, index) => (
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
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Progress Over Time */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Progress vaqt davomida
                    </CardTitle>
                    <CardDescription>Tugatilgan darslar va unitlar</CardDescription>
                  </div>
                  <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
                    <TabsList className="grid grid-cols-3">
                      <TabsTrigger value="daily" className="text-xs">Kunlik</TabsTrigger>
                      <TabsTrigger value="weekly" className="text-xs">Haftalik</TabsTrigger>
                      <TabsTrigger value="monthly" className="text-xs">Oylik</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : chartData.length === 0 ? (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    Ma'lumotlar mavjud emas
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis 
                        dataKey={timeRange === 'daily' ? 'name' : timeRange === 'weekly' ? 'week' : 'month'}
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis 
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar 
                        dataKey="lessons" 
                        name="Darslar" 
                        fill="hsl(var(--primary))" 
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar 
                        dataKey="units" 
                        name="Unitlar" 
                        fill="hsl(var(--accent))" 
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Trend Line */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChartIcon className="w-5 h-5" />
                  O'sish trendi
                </CardTitle>
                <CardDescription>Haftalik darslar dinamikasi</CardDescription>
              </CardHeader>
              <CardContent>
                {weeklyLoading ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : (weeklyProgress || []).length === 0 ? (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    Ma'lumotlar mavjud emas
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={weeklyProgress}>
                      <defs>
                        <linearGradient id="colorLessons" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis 
                        dataKey="week"
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis 
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="lessons"
                        name="Darslar"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorLessons)"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="units" 
                        name="Unitlar"
                        stroke="hsl(var(--accent))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--accent))' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Daily Activity (Last 14 days) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                So'nggi 14 kun faoliyati
              </CardTitle>
              <CardDescription>Kunlik tugatilgan darslar</CardDescription>
            </CardHeader>
            <CardContent>
              {dailyLoading ? (
                <div className="flex items-center justify-center h-20">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="flex gap-2 flex-wrap">
                  {(dailyProgress || []).map((day, index) => {
                    const intensity = day.lessons === 0 ? 0 : 
                                     day.lessons <= 2 ? 1 : 
                                     day.lessons <= 4 ? 2 : 3;
                    return (
                      <motion.div
                        key={day.date}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.02 }}
                        className="relative group"
                      >
                        <div 
                          className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-medium transition-transform group-hover:scale-110 ${
                            intensity === 0 ? 'bg-secondary text-muted-foreground' :
                            intensity === 1 ? 'bg-primary/30 text-primary' :
                            intensity === 2 ? 'bg-primary/60 text-primary-foreground' :
                            'bg-primary text-primary-foreground'
                          }`}
                        >
                          {day.lessons}
                        </div>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover border rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          {format(new Date(day.date), 'MMM d')} - {day.lessons} dars
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
