import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Users, Trash2, UserPlus, Loader2, BarChart3, Download } from 'lucide-react';
import { StudentProgressDialog } from '@/components/teacher/StudentProgressDialog';
import { GroupProgressStats } from '@/components/teacher/GroupProgressStats';
import { format } from 'date-fns';

interface Group {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  member_count?: number;
}

interface Student {
  id: string;
  user_id: string;
  name: string;
  email: string;
}

export default function TeacherGroups() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isProgressOpen, setIsProgressOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [newGroup, setNewGroup] = useState({ name: '', description: '' });
  const [selectedStudentId, setSelectedStudentId] = useState('');

  // Fetch groups
  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ['teacher-groups', user?.id],
    queryFn: async () => {
      const { data: groupsData, error } = await supabase
        .from('groups')
        .select('*')
        .eq('teacher_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get member counts
      const groupsWithCounts = await Promise.all(
        (groupsData || []).map(async (group) => {
          const { count } = await supabase
            .from('group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id);
          return { ...group, member_count: count || 0 };
        })
      );

      return groupsWithCounts as Group[];
    },
    enabled: !!user?.id,
  });

  // Fetch group members with progress
  const { data: groupMembers, isLoading: membersLoading } = useQuery({
    queryKey: ['group-members', selectedGroup?.id],
    queryFn: async () => {
      if (!selectedGroup) return [];

      const { data, error } = await supabase
        .from('group_members')
        .select('id, user_id, joined_at')
        .eq('group_id', selectedGroup.id);

      if (error) throw error;

      // Get total lessons count
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id')
        .eq('is_active', true);
      const totalLessons = lessons?.length || 0;

      // Get profile info and progress for each member
      const membersWithProfiles = await Promise.all(
        (data || []).map(async (member) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, email')
            .eq('user_id', member.user_id)
            .single();

          // Get completed lessons count for this member
          const { count: completedCount } = await supabase
            .from('lesson_progress')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', member.user_id)
            .eq('completed', true);

          const progress = totalLessons > 0 ? Math.round(((completedCount || 0) / totalLessons) * 100) : 0;

          return {
            ...member,
            name: profile?.name || 'Unknown',
            email: profile?.email || '',
            progress,
          };
        })
      );

      return membersWithProfiles as (Student & { progress: number })[];
    },
    enabled: !!selectedGroup?.id,
  });

  // Fetch available students
  const { data: availableStudents } = useQuery({
    queryKey: ['available-students', selectedGroup?.id],
    queryFn: async () => {
      // Get all students
      const { data: studentRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'student');

      if (rolesError) throw rolesError;

      const studentUserIds = studentRoles?.map((r) => r.user_id) || [];

      // Get existing members of this group
      const existingMemberIds = groupMembers?.map((m) => m.user_id) || [];

      // Filter out existing members
      const availableUserIds = studentUserIds.filter(
        (id) => !existingMemberIds.includes(id)
      );

      if (availableUserIds.length === 0) return [];

      // Get profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .in('user_id', availableUserIds);

      if (profilesError) throw profilesError;

      return profiles || [];
    },
    enabled: !!selectedGroup?.id && isAddMemberOpen,
  });

  // Create group mutation
  const createGroup = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('groups').insert({
        name: newGroup.name,
        description: newGroup.description || null,
        teacher_id: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-groups'] });
      setIsCreateOpen(false);
      setNewGroup({ name: '', description: '' });
      toast.success('Guruh yaratildi');
    },
    onError: () => toast.error('Guruh yaratishda xatolik'),
  });

  // Delete group mutation
  const deleteGroup = useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase.from('groups').delete().eq('id', groupId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-groups'] });
      setSelectedGroup(null);
      toast.success("Guruh o'chirildi");
    },
    onError: () => toast.error("Guruhni o'chirishda xatolik"),
  });

  // Add member mutation
  const addMember = useMutation({
    mutationFn: async () => {
      if (!selectedGroup || !selectedStudentId) return;
      const { error } = await supabase.from('group_members').insert({
        group_id: selectedGroup.id,
        user_id: selectedStudentId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members'] });
      queryClient.invalidateQueries({ queryKey: ['available-students'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-groups'] });
      setIsAddMemberOpen(false);
      setSelectedStudentId('');
      toast.success("Talaba qo'shildi");
    },
    onError: () => toast.error("Talabani qo'shishda xatolik"),
  });

  // Remove member mutation
  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-groups'] });
      toast.success("Talaba olib tashlandi");
    },
    onError: () => toast.error("Talabani olib tashlashda xatolik"),
  });

  const exportGroupToCSV = async () => {
    if (!selectedGroup || !groupMembers || groupMembers.length === 0) return;

    try {
      // Fetch all lessons
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id, title')
        .eq('is_active', true);

      const totalLessons = lessons?.length || 0;

      // Fetch progress for all group members
      const { data: allProgress } = await supabase
        .from('lesson_progress')
        .select('user_id, lesson_id, completed, completed_at')
        .in('user_id', groupMembers.map((m) => m.user_id))
        .eq('completed', true);

      // Build CSV data
      const headers = ['Ism', 'Email', 'Tugatilgan darslar', 'Jami darslar', 'Progress (%)'];
      const rows = groupMembers.map((member) => {
        const memberProgress = allProgress?.filter((p) => p.user_id === member.user_id) || [];
        const completedCount = memberProgress.length;
        const percentage = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
        return [
          member.name,
          member.email,
          completedCount.toString(),
          totalLessons.toString(),
          `${percentage}%`,
        ];
      });

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedGroup.name.replace(/\s+/g, '_')}_progress_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('CSV fayl yuklab olindi');
    } catch {
      toast.error('Eksport qilishda xatolik');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Mening Guruhlarim</h1>
            <p className="text-muted-foreground">
              Talabalar guruhlarini boshqaring
            </p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Yangi guruh
          </Button>
        </div>

        {groupsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groups?.map((group) => (
              <Card
                key={group.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedGroup(group)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                    <Badge variant={group.is_active ? 'default' : 'secondary'}>
                      {group.is_active ? 'Faol' : 'Nofaol'}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {group.description || "Ta'rif yo'q"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{group.member_count} ta talaba</span>
                  </div>
                </CardContent>
              </Card>
            ))}

            {groups?.length === 0 && (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Hali guruh yo'q</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setIsCreateOpen(true)}
                  >
                    Birinchi guruhni yarating
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Create Group Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yangi guruh yaratish</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Guruh nomi</label>
                <Input
                  value={newGroup.name}
                  onChange={(e) =>
                    setNewGroup({ ...newGroup, name: e.target.value })
                  }
                  placeholder="Masalan: Ingliz tili 101"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Ta'rif</label>
                <Textarea
                  value={newGroup.description}
                  onChange={(e) =>
                    setNewGroup({ ...newGroup, description: e.target.value })
                  }
                  placeholder="Guruh haqida qisqacha ma'lumot"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Bekor qilish
              </Button>
              <Button
                onClick={() => createGroup.mutate()}
                disabled={!newGroup.name || createGroup.isPending}
              >
                {createGroup.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Yaratish
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Group Details Dialog */}
        <Dialog
          open={!!selectedGroup}
          onOpenChange={() => setSelectedGroup(null)}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{selectedGroup?.name}</span>
                <div className="flex gap-2">
                  {groupMembers && groupMembers.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={exportGroupToCSV}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      CSV
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => setIsAddMemberOpen(true)}
                  >
                    <UserPlus className="w-4 h-4 mr-1" />
                    Talaba qo'shish
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (selectedGroup) deleteGroup.mutate(selectedGroup.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </DialogTitle>
            </DialogHeader>

            {/* Group Progress Stats */}
            {groupMembers && groupMembers.length > 0 && (
              <GroupProgressStats
                groupId={selectedGroup?.id || ''}
                memberUserIds={groupMembers.map((m) => m.user_id)}
              />
            )}

            {membersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : groupMembers?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Bu guruhda hali talaba yo'q</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ism</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="w-24 text-center">Progress</TableHead>
                    <TableHead className="w-32 text-center">Amallar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupMembers?.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>{member.name}</TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant={member.progress >= 100 ? 'default' : member.progress >= 50 ? 'secondary' : 'outline'}
                          className={member.progress >= 100 ? 'bg-green-500' : ''}
                        >
                          {member.progress}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 justify-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedStudent(member);
                              setIsProgressOpen(true);
                            }}
                            title="Progressni ko'rish"
                          >
                            <BarChart3 className="w-4 h-4 text-primary" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeMember.mutate(member.id)}
                            title="O'chirish"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </DialogContent>
        </Dialog>

        {/* Add Member Dialog */}
        <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Talaba qo'shish</DialogTitle>
            </DialogHeader>
            <div>
              <label className="text-sm font-medium">Talabani tanlang</label>
              <Select
                value={selectedStudentId}
                onValueChange={setSelectedStudentId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Talaba tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {availableStudents?.map((student) => (
                    <SelectItem key={student.user_id} value={student.user_id}>
                      {student.name} ({student.email})
                    </SelectItem>
                  ))}
                  {availableStudents?.length === 0 && (
                    <SelectItem value="none" disabled>
                      Qo'shish uchun talaba yo'q
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddMemberOpen(false)}
              >
                Bekor qilish
              </Button>
              <Button
                onClick={() => addMember.mutate()}
                disabled={!selectedStudentId || addMember.isPending}
              >
                Qo'shish
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Student Progress Dialog */}
        <StudentProgressDialog
          open={isProgressOpen}
          onOpenChange={setIsProgressOpen}
          student={selectedStudent}
        />
      </div>
    </DashboardLayout>
  );
}
