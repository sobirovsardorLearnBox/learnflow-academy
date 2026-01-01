import { useState } from 'react';
import { Loader2, Search, TrendingUp, Users, BookOpen, Trophy, Download, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useStudentProgress, StudentProgress } from '@/hooks/useStudentProgress';
import { format } from 'date-fns';

type ProgressRange = 'all' | '0-25' | '25-50' | '50-75' | '75-100';
type SortColumn = 'name' | 'progress' | 'lastActivity';
type SortDirection = 'asc' | 'desc';

const progressRanges: { value: ProgressRange; label: string; min: number; max: number }[] = [
  { value: 'all', label: 'All', min: 0, max: 100 },
  { value: '0-25', label: '0-25%', min: 0, max: 25 },
  { value: '25-50', label: '25-50%', min: 25, max: 50 },
  { value: '50-75', label: '50-75%', min: 50, max: 75 },
  { value: '75-100', label: '75-100%', min: 75, max: 100 },
];

export default function AdminProgress() {
  const [searchQuery, setSearchQuery] = useState('');
  const [progressFilter, setProgressFilter] = useState<ProgressRange>('all');
  const [sortColumn, setSortColumn] = useState<SortColumn>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const { data: students, isLoading } = useStudentProgress();

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) return <ArrowUpDown className="w-4 h-4 ml-1" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4 ml-1" /> 
      : <ArrowDown className="w-4 h-4 ml-1" />;
  };

  const filteredStudents = students?.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (progressFilter === 'all') return true;
    
    const range = progressRanges.find(r => r.value === progressFilter);
    if (!range) return true;
    
    return student.progressPercentage >= range.min && student.progressPercentage <= range.max;
  }) || [];

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    const multiplier = sortDirection === 'asc' ? 1 : -1;
    
    switch (sortColumn) {
      case 'name':
        return multiplier * a.name.localeCompare(b.name);
      case 'progress':
        return multiplier * (a.progressPercentage - b.progressPercentage);
      case 'lastActivity':
        const dateA = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
        const dateB = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
        return multiplier * (dateA - dateB);
      default:
        return 0;
    }
  });

  // Calculate aggregate stats
  const totalStudents = students?.length || 0;
  const avgProgress = totalStudents > 0
    ? Math.round(students!.reduce((sum, s) => sum + s.progressPercentage, 0) / totalStudents)
    : 0;
  const completedCourse = students?.filter(s => s.progressPercentage === 100).length || 0;
  const activeThisWeek = students?.filter(s => {
    if (!s.lastActivity) return false;
    const lastDate = new Date(s.lastActivity);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return lastDate > weekAgo;
  }).length || 0;

  const exportToCSV = () => {
    if (!sortedStudents.length) return;

    const headers = ['Name', 'Email', 'Completed Lessons', 'Total Lessons', 'Completed Units', 'Total Units', 'Progress %', 'Last Activity'];
    const rows = sortedStudents.map(s => [
      s.name,
      s.email,
      s.completedLessons,
      s.totalLessons,
      s.completedUnits,
      s.totalUnits,
      s.progressPercentage,
      s.lastActivity ? format(new Date(s.lastActivity), 'yyyy-MM-dd') : 'Never'
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `student-progress-${format(new Date(), 'yyyy-MM-dd')}.csv`;
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
            <h1 className="text-3xl font-bold">Student Progress</h1>
            <p className="text-muted-foreground">Track student completion status across all courses</p>
          </div>
          <Button onClick={exportToCSV} disabled={!sortedStudents.length}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStudents}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg. Progress</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgProgress}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Course Completed</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedCourse}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active This Week</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeThisWeek}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {progressRanges.map((range) => (
              <Button
                key={range.value}
                variant={progressFilter === range.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setProgressFilter(range.value)}
              >
                {range.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Progress Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center">
                      Student
                      {getSortIcon('name')}
                    </div>
                  </TableHead>
                  <TableHead>Lessons</TableHead>
                  <TableHead>Units</TableHead>
                  <TableHead 
                    className="w-[200px] cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('progress')}
                  >
                    <div className="flex items-center">
                      Progress
                      {getSortIcon('progress')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('lastActivity')}
                  >
                    <div className="flex items-center">
                      Last Activity
                      {getSortIcon('lastActivity')}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No students found
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedStudents.map((student) => (
                    <TableRow key={student.userId}>
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
                        <span className="font-medium">{student.completedLessons}</span>
                        <span className="text-muted-foreground">/{student.totalLessons}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{student.completedUnits}</span>
                        <span className="text-muted-foreground">/{student.totalUnits}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={student.progressPercentage} className="flex-1" />
                          <span className="text-sm font-medium w-10">{student.progressPercentage}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {student.lastActivity
                          ? format(new Date(student.lastActivity), 'MMM d, yyyy')
                          : 'Never'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
