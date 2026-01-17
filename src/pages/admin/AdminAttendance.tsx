import { useState } from 'react';
import { Loader2, Search, Calendar, Users, UserCheck, UserX, Clock, Eye, Download, ChevronDown } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTeachersAttendance, useMarkAttendance, AttendanceStatus } from '@/hooks/useAttendance';
import { TeacherStudentsDialog } from '@/components/admin/TeacherStudentsDialog';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

export default function AdminAttendance() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTeacher, setSelectedTeacher] = useState<{ user_id: string; name: string; email: string } | null>(null);
  const [isStudentsDialogOpen, setIsStudentsDialogOpen] = useState(false);

  const { data: teachers, isLoading } = useTeachersAttendance(selectedDate);
  const markAttendance = useMarkAttendance();

  const filteredTeachers = teachers?.filter(teacher =>
    teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    teacher.email.toLowerCase().includes(searchQuery.toLowerCase())
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

  const handleViewStudents = (teacher: { user_id: string; name: string; email: string }) => {
    setSelectedTeacher(teacher);
    setIsStudentsDialogOpen(true);
  };

  // Stats
  const totalTeachers = teachers?.length || 0;
  const presentCount = teachers?.filter(t => t.attendance?.status === 'present').length || 0;
  const absentCount = teachers?.filter(t => t.attendance?.status === 'absent').length || 0;
  const notMarkedCount = teachers?.filter(t => !t.attendance).length || 0;

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

  const exportToCSV = () => {
    if (!filteredTeachers.length) return;

    const headers = ['Ism', 'Email', 'Talabalar soni', 'Davomat'];
    const rows = filteredTeachers.map(t => [
      t.name,
      t.email,
      t.studentCount || 0,
      t.attendance?.status || 'Belgilanmagan',
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `teachers_attendance_${selectedDate}.csv`;
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">O'qituvchilar davomati</h1>
            <p className="text-muted-foreground">O'qituvchilarning davomatini belgilash va talabalarini ko'rish</p>
          </div>
          <Button onClick={exportToCSV} disabled={!filteredTeachers.length}>
            <Download className="w-4 h-4 mr-2" />
            CSV yuklash
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Jami o'qituvchilar</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTeachers}</div>
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

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="O'qituvchilarni qidirish..."
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
        </div>

        {/* Teachers Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>O'qituvchi</TableHead>
                  <TableHead>Talabalar soni</TableHead>
                  <TableHead>Davomat ({format(new Date(selectedDate), 'dd.MM.yyyy')})</TableHead>
                  <TableHead>Amallar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeachers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      O'qituvchilar topilmadi
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTeachers.map((teacher) => (
                    <TableRow key={teacher.user_id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                            {teacher.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{teacher.name}</p>
                            <p className="text-sm text-muted-foreground">{teacher.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {teacher.studentCount || 0} talaba
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(teacher.attendance?.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                Belgilash
                                <ChevronDown className="h-4 w-4 ml-1" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => handleMarkAttendance(teacher.user_id, 'present')}>
                                <UserCheck className="h-4 w-4 mr-2 text-green-500" />
                                Keldi
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleMarkAttendance(teacher.user_id, 'absent')}>
                                <UserX className="h-4 w-4 mr-2 text-red-500" />
                                Kelmadi
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleMarkAttendance(teacher.user_id, 'late')}>
                                <Clock className="h-4 w-4 mr-2 text-yellow-500" />
                                Kechikdi
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleViewStudents(teacher)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            To'liq ko'rish
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
      </div>

      <TeacherStudentsDialog
        open={isStudentsDialogOpen}
        onOpenChange={setIsStudentsDialogOpen}
        teacher={selectedTeacher}
      />
    </DashboardLayout>
  );
}
