import { useState } from 'react';
import { Loader2, Search, Calendar, Users, UserCheck, UserX, Clock, Download } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTeacherStudentsAttendance, useTeacherStudentsProgress, useMarkAttendance, AttendanceStatus } from '@/hooks/useAttendance';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

export default function TeacherAttendance() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: studentsAttendance, isLoading: attendanceLoading } = useTeacherStudentsAttendance(user?.user_id, selectedDate);
  const { data: studentsProgress, isLoading: progressLoading } = useTeacherStudentsProgress(user?.user_id);
  const markAttendance = useMarkAttendance();

  const isLoading = attendanceLoading || progressLoading;

  const filteredAttendance = studentsAttendance?.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const filteredProgress = studentsProgress?.filter(student =>
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

  // Stats
  const totalStudents = studentsAttendance?.length || 0;
  const presentCount = studentsAttendance?.filter(s => s.attendance?.status === 'present').length || 0;
  const absentCount = studentsAttendance?.filter(s => s.attendance?.status === 'absent').length || 0;
  const notMarkedCount = studentsAttendance?.filter(s => !s.attendance).length || 0;

  const getStatusBadge = (status: string | null | undefined) => {
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

  const exportAttendanceCSV = () => {
    if (!filteredAttendance.length) return;

    const headers = ['Ism', 'Email', 'Davomat'];
    const rows = filteredAttendance.map(s => [
      s.name,
      s.email,
      s.attendance?.status || 'Belgilanmagan',
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `davomat_${selectedDate}.csv`;
    link.click();
  };

  const exportProgressCSV = () => {
    if (!filteredProgress.length) return;

    const headers = ['Ism', 'Email', 'Guruhlar', 'Progress %', 'Davomat %'];
    const rows = filteredProgress.map(s => [
      s.name,
      s.email,
      s.groups.join('; '),
      `${s.progressPercentage}%`,
      `${s.attendancePercentage}%`,
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `progress_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Talabalar davomati va progressi</h1>
          <p className="text-muted-foreground">Talabalaringiz davomatini belgilang va progressini kuzating</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Jami talabalar</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStudents}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Kelgan</CardTitle>
              <UserCheck className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{presentCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Kelmagan</CardTitle>
              <UserX className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{absentCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Belgilanmagan</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{notMarkedCount}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="attendance" className="space-y-4">
          <TabsList>
            <TabsTrigger value="attendance">Davomat</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
          </TabsList>

          <TabsContent value="attendance" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Talabalarni qidirish..."
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
              <Button variant="outline" onClick={exportAttendanceCSV}>
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
            </div>

            {/* Attendance Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Talaba</TableHead>
                      <TableHead>Holat ({format(new Date(selectedDate), 'dd.MM.yyyy')})</TableHead>
                      <TableHead>Amallar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAttendance.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                          Talabalar topilmadi
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAttendance.map((student) => (
                        <TableRow key={student.user_id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                                {student.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium">{student.name}</p>
                                <p className="text-sm text-muted-foreground">{student.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(student.attendance?.status)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant={student.attendance?.status === 'present' ? 'default' : 'outline'}
                                onClick={() => handleMarkAttendance(student.user_id, 'present')}
                                disabled={markAttendance.isPending}
                              >
                                <UserCheck className="h-4 w-4 mr-1" />
                                Keldi
                              </Button>
                              <Button
                                size="sm"
                                variant={student.attendance?.status === 'absent' ? 'destructive' : 'outline'}
                                onClick={() => handleMarkAttendance(student.user_id, 'absent')}
                                disabled={markAttendance.isPending}
                              >
                                <UserX className="h-4 w-4 mr-1" />
                                Kelmadi
                              </Button>
                              <Button
                                size="sm"
                                variant={student.attendance?.status === 'late' ? 'secondary' : 'outline'}
                                onClick={() => handleMarkAttendance(student.user_id, 'late')}
                                disabled={markAttendance.isPending}
                              >
                                <Clock className="h-4 w-4 mr-1" />
                                Kechikdi
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="progress" className="space-y-4">
            {/* Progress Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Talabalarni qidirish..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" onClick={exportProgressCSV}>
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
            </div>

            {/* Progress Table */}
            <Card>
              <CardContent className="p-0">
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
                    {filteredProgress.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Talabalar topilmadi
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProgress.map((student) => (
                        <TableRow key={student.user_id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
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
                            <div className="flex items-center gap-1">
                              <span className="font-medium">{student.attendancePercentage}%</span>
                              <span className="text-muted-foreground text-sm">
                                ({student.presentDays}/{student.totalAttendanceDays})
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
