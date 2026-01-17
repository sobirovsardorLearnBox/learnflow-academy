import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Search, Download, Calendar, UserCheck, UserX, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useMarkAttendance, AttendanceStatus } from '@/hooks/useAttendance';
import { useAuth } from '@/contexts/AuthContext';

interface TeacherStudentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher: {
    user_id: string;
    name: string;
    email: string;
  } | null;
}

export function TeacherStudentsDialog({ open, onOpenChange, teacher }: TeacherStudentsDialogProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const markAttendance = useMarkAttendance();

  // Fetch teacher's students with progress and attendance
  const { data: studentsData, isLoading } = useQuery({
    queryKey: ['teacher-students-full', teacher?.user_id, selectedDate],
    queryFn: async () => {
      if (!teacher?.user_id) return [];

      // Get teacher's groups
      const { data: groups, error: groupsError } = await supabase
        .from('groups')
        .select('id, name')
        .eq('teacher_id', teacher.user_id);

      if (groupsError) throw groupsError;
      if (!groups || groups.length === 0) return [];

      const groupIds = groups.map(g => g.id);

      // Get approved members
      const { data: members, error: membersError } = await supabase
        .from('group_members')
        .select('user_id, group_id')
        .in('group_id', groupIds)
        .eq('is_approved', true);

      if (membersError) throw membersError;
      if (!members || members.length === 0) return [];

      const studentUserIds = [...new Set(members.map(m => m.user_id))];

      // Get profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .in('user_id', studentUserIds);

      if (profilesError) throw profilesError;

      // Get total lessons
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id')
        .eq('is_active', true);
      const totalLessons = lessons?.length || 0;

      // Get lesson progress
      const { data: lessonProgress } = await supabase
        .from('lesson_progress')
        .select('user_id')
        .in('user_id', studentUserIds)
        .eq('completed', true);

      // Get attendance for selected date
      const { data: attendance } = await supabase
        .from('attendance')
        .select('*')
        .in('user_id', studentUserIds)
        .eq('date', selectedDate);

      // Get attendance stats (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: recentAttendance } = await supabase
        .from('attendance')
        .select('user_id, status')
        .in('user_id', studentUserIds)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);

      return (profiles || []).map(profile => {
        const studentGroups = members
          .filter(m => m.user_id === profile.user_id)
          .map(m => groups.find(g => g.id === m.group_id)?.name)
          .filter(Boolean);

        const completedLessons = lessonProgress?.filter(lp => lp.user_id === profile.user_id).length || 0;
        const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

        const studentAttendance = recentAttendance?.filter(a => a.user_id === profile.user_id) || [];
        const presentCount = studentAttendance.filter(a => a.status === 'present' || a.status === 'late').length;
        const totalAttendanceDays = studentAttendance.length;
        const attendancePercentage = totalAttendanceDays > 0 ? Math.round((presentCount / totalAttendanceDays) * 100) : 0;

        const todayAttendance = attendance?.find(a => a.user_id === profile.user_id);

        return {
          user_id: profile.user_id,
          name: profile.name,
          email: profile.email,
          groups: studentGroups,
          completedLessons,
          totalLessons,
          progressPercentage,
          attendancePercentage,
          totalAttendanceDays,
          presentCount,
          todayStatus: todayAttendance?.status || null,
        };
      });
    },
    enabled: !!teacher?.user_id && open,
  });

  const filteredStudents = studentsData?.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleMarkAttendance = (userId: string, status: AttendanceStatus) => {
    if (!user?.user_id) return;
    markAttendance.mutate({
      userId,
      date: selectedDate,
      status,
      markedBy: user.user_id,
    });
  };

  const exportToCSV = () => {
    if (!filteredStudents.length || !teacher) return;

    const headers = ['Ism', 'Email', 'Guruhlar', 'Progress %', 'Davomat %', 'Bugun'];
    const rows = filteredStudents.map(s => [
      s.name,
      s.email,
      s.groups.join('; '),
      `${s.progressPercentage}%`,
      `${s.attendancePercentage}%`,
      s.todayStatus || 'Belgilanmagan',
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${teacher.name}_students_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-500/20 text-green-600 border-green-500/30">Keldi</Badge>;
      case 'absent':
        return <Badge className="bg-red-500/20 text-red-600 border-red-500/30">Kelmadi</Badge>;
      case 'late':
        return <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">Kechikdi</Badge>;
      case 'excused':
        return <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30">Sababli</Badge>;
      default:
        return <Badge variant="outline">Belgilanmagan</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {teacher?.name} - Talabalar ro'yxati
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="progress" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="attendance">Davomat</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-4 py-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Qidirish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto"
              />
            </div>
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              <TabsContent value="progress" className="flex-1 overflow-auto m-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Talaba</TableHead>
                      <TableHead>Guruhlar</TableHead>
                      <TableHead>Darslar</TableHead>
                      <TableHead className="w-[200px]">Progress</TableHead>
                      <TableHead>Davomat</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Talabalar topilmadi
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStudents.map((student) => (
                        <TableRow key={student.user_id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                                {student.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium">{student.name}</p>
                                <p className="text-sm text-muted-foreground">{student.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {student.groups.map((group, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {group}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{student.completedLessons}</span>
                            <span className="text-muted-foreground">/{student.totalLessons}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={student.progressPercentage} className="flex-1" />
                              <span className="text-sm font-medium w-10">{student.progressPercentage}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{student.attendancePercentage}%</span>
                            <span className="text-muted-foreground text-sm"> ({student.presentCount}/{student.totalAttendanceDays})</span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="attendance" className="flex-1 overflow-auto m-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Talaba</TableHead>
                      <TableHead>Guruhlar</TableHead>
                      <TableHead>Holat ({format(new Date(selectedDate), 'dd.MM.yyyy')})</TableHead>
                      <TableHead>Amallar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          Talabalar topilmadi
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStudents.map((student) => (
                        <TableRow key={student.user_id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                                {student.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium">{student.name}</p>
                                <p className="text-sm text-muted-foreground">{student.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {student.groups.map((group, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {group}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(student.todayStatus)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant={student.todayStatus === 'present' ? 'default' : 'outline'}
                                className="h-8 w-8 p-0"
                                onClick={() => handleMarkAttendance(student.user_id, 'present')}
                                disabled={markAttendance.isPending}
                              >
                                <UserCheck className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant={student.todayStatus === 'absent' ? 'destructive' : 'outline'}
                                className="h-8 w-8 p-0"
                                onClick={() => handleMarkAttendance(student.user_id, 'absent')}
                                disabled={markAttendance.isPending}
                              >
                                <UserX className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant={student.todayStatus === 'late' ? 'secondary' : 'outline'}
                                className="h-8 w-8 p-0"
                                onClick={() => handleMarkAttendance(student.user_id, 'late')}
                                disabled={markAttendance.isPending}
                              >
                                <Clock className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>
            </>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
