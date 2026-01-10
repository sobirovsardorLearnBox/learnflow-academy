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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Users, Trash2, UserPlus, Loader2, BarChart3, Download, Pencil, Search, Clock, UserCheck, UserRoundPlus, BookOpen, Check } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { StudentProgressDialog } from '@/components/teacher/StudentProgressDialog';
import { GroupProgressStats } from '@/components/teacher/GroupProgressStats';
import { CreateStudentDialog } from '@/components/admin/CreateStudentDialog';
import { useGroupUnits, useAddGroupUnit, useRemoveGroupUnit } from '@/hooks/useGroupUnits';
import { useSections, useLevels, useUnits } from '@/hooks/useSections';
import { format } from 'date-fns';

interface Group {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  teacher_id: string;
  teacher_name?: string;
  member_count?: number;
  pending_count?: number;
}

interface Student {
  id: string;
  user_id: string;
  name: string;
  email: string;
  is_approved?: boolean;
}

export default function TeacherGroups() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isProgressOpen, setIsProgressOpen] = useState(false);
  const [isCreateStudentOpen, setIsCreateStudentOpen] = useState(false);
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('members');
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [newGroup, setNewGroup] = useState({ name: '', description: '' });
  const [editGroup, setEditGroup] = useState({ name: '', description: '' });
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  
  // Unit selection state
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedLevelId, setSelectedLevelId] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');

  // Group units hooks
  const { data: groupUnits, isLoading: groupUnitsLoading } = useGroupUnits(selectedGroup?.id);
  const addGroupUnit = useAddGroupUnit();
  const removeGroupUnit = useRemoveGroupUnit();
  
  // Content hooks for unit selection
  const { data: sections } = useSections();
  const { data: levels } = useLevels(selectedSectionId || undefined);
  const { data: allUnits } = useUnits(selectedLevelId || undefined);

  // Fetch groups with teacher info
  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ['teacher-groups', user?.id],
    queryFn: async () => {
      const { data: groupsData, error } = await supabase
        .from('groups')
        .select('*')
        .eq('teacher_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get member counts (approved only) and pending counts
      const groupsWithCounts = await Promise.all(
        (groupsData || []).map(async (group) => {
          const { count: approvedCount } = await supabase
            .from('group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id)
            .eq('is_approved', true);

          const { count: pendingCount } = await supabase
            .from('group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id)
            .eq('is_approved', false);

          return {
            ...group,
            member_count: approvedCount || 0,
            pending_count: pendingCount || 0,
          };
        })
      );

      return groupsWithCounts as Group[];
    },
    enabled: !!user?.id,
  });

  // Fetch group members with progress (only approved members shown, pending visible separately)
  const { data: groupMembers, isLoading: membersLoading } = useQuery({
    queryKey: ['group-members', selectedGroup?.id],
    queryFn: async () => {
      if (!selectedGroup) return [];

      const { data, error } = await supabase
        .from('group_members')
        .select('id, user_id, joined_at, is_approved')
        .eq('group_id', selectedGroup.id)
        .order('is_approved', { ascending: true })
        .order('joined_at', { ascending: false });

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
            is_approved: member.is_approved,
          };
        })
      );

      return membersWithProfiles as (Student & { progress: number; is_approved: boolean })[];
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

  // Update group mutation
  const updateGroup = useMutation({
    mutationFn: async () => {
      if (!editingGroup) return;
      const { error } = await supabase
        .from('groups')
        .update({
          name: editGroup.name,
          description: editGroup.description || null,
        })
        .eq('id', editingGroup.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-groups'] });
      setIsEditOpen(false);
      setEditingGroup(null);
      if (selectedGroup && editingGroup && selectedGroup.id === editingGroup.id) {
        setSelectedGroup({ ...selectedGroup, name: editGroup.name, description: editGroup.description });
      }
      toast.success('Guruh yangilandi');
    },
    onError: () => toast.error('Guruhni yangilashda xatolik'),
  });

  // Toggle group active status
  const toggleGroupStatus = useMutation({
    mutationFn: async ({ groupId, isActive }: { groupId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('groups')
        .update({ is_active: isActive })
        .eq('id', groupId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-groups'] });
      toast.success('Guruh holati yangilandi');
    },
    onError: () => toast.error('Guruh holatini yangilashda xatolik'),
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

  // Add member mutation (teacher can add and approve directly)
  const addMember = useMutation({
    mutationFn: async () => {
      if (!selectedGroup || !selectedStudentId) return;
      const { error } = await supabase.from('group_members').insert({
        group_id: selectedGroup.id,
        user_id: selectedStudentId,
        is_approved: true,
        approved_at: new Date().toISOString(),
        approved_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members'] });
      queryClient.invalidateQueries({ queryKey: ['available-students'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-groups'] });
      setIsAddMemberOpen(false);
      setSelectedStudentId('');
      toast.success("Talaba qo'shildi va tasdiqlandi");
    },
    onError: () => toast.error("Talabani qo'shishda xatolik"),
  });

  // Approve member mutation
  const approveMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('group_members')
        .update({
          is_approved: true,
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
        })
        .eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-groups'] });
      toast.success("Talaba tasdiqlandi");
    },
    onError: () => toast.error("Talabani tasdiqlashda xatolik"),
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
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={group.is_active}
                        onCheckedChange={(checked) => {
                          toggleGroupStatus.mutate({ groupId: group.id, isActive: checked });
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingGroup(group);
                          setEditGroup({ name: group.name, description: group.description || '' });
                          setIsEditOpen(true);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {group.description || "Ta'rif yo'q"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Users className="w-4 h-4" />
                        <span>{group.member_count} ta</span>
                      </div>
                      {(group.pending_count ?? 0) > 0 && (
                        <Badge variant="secondary" className="text-xs bg-yellow-500 text-white">
                          <Clock className="w-3 h-3 mr-1" />
                          {group.pending_count} kutilmoqda
                        </Badge>
                      )}
                    </div>
                    <Badge variant={group.is_active ? 'default' : 'secondary'}>
                      {group.is_active ? 'Faol' : 'Nofaol'}
                    </Badge>
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
          onOpenChange={() => {
            setSelectedGroup(null);
            setActiveTab('members');
          }}
        >
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
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

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="members" className="gap-2">
                  <Users className="w-4 h-4" />
                  Talabalar ({groupMembers?.filter(m => m.is_approved).length || 0})
                </TabsTrigger>
                <TabsTrigger value="units" className="gap-2">
                  <BookOpen className="w-4 h-4" />
                  Darslar ({groupUnits?.length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="members" className="mt-4">
                {/* Group Progress Stats */}
                {groupMembers && groupMembers.filter(m => m.is_approved).length > 0 && (
                  <GroupProgressStats
                    groupId={selectedGroup?.id || ''}
                    memberUserIds={groupMembers.filter(m => m.is_approved).map((m) => m.user_id)}
                  />
                )}

                <div className="flex justify-end gap-2 mb-4">
                  <Button size="sm" variant="outline" onClick={() => setIsCreateStudentOpen(true)}>
                    <UserRoundPlus className="w-4 h-4 mr-1" />
                    Yangi talaba
                  </Button>
                  <Button size="sm" onClick={() => setIsAddMemberOpen(true)}>
                    <UserPlus className="w-4 h-4 mr-1" />
                    Mavjud talaba
                  </Button>
                </div>

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
                        <TableHead className="w-24 text-center">Holat</TableHead>
                        <TableHead className="w-24 text-center">Progress</TableHead>
                        <TableHead className="w-32 text-center">Amallar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupMembers?.map((member) => (
                        <TableRow key={member.id} className={!member.is_approved ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''}>
                          <TableCell>{member.name}</TableCell>
                          <TableCell>{member.email}</TableCell>
                          <TableCell className="text-center">
                            {member.is_approved ? (
                              <Badge variant="default" className="bg-green-500 text-xs">
                                <UserCheck className="w-3 h-3 mr-1" />
                                Tasdiqlangan
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-yellow-500 text-white text-xs">
                                <Clock className="w-3 h-3 mr-1" />
                                Kutilmoqda
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {member.is_approved ? (
                              <Badge 
                                variant={member.progress >= 100 ? 'default' : member.progress >= 50 ? 'secondary' : 'outline'}
                                className={member.progress >= 100 ? 'bg-green-500' : ''}
                              >
                                {member.progress}%
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 justify-center">
                              {!member.is_approved && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => approveMember.mutate(member.id)}
                                  title="Tasdiqlash"
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                              )}
                              {member.is_approved && (
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
                              )}
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
              </TabsContent>

              <TabsContent value="units" className="mt-4">
                <div className="flex justify-end mb-4">
                  <Button size="sm" onClick={() => setIsAddUnitOpen(true)}>
                    <Plus className="w-4 h-4 mr-1" />
                    Dars qo'shish
                  </Button>
                </div>

                {groupUnitsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : groupUnits?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Bu guruhga hali dars biriktirilmagan</p>
                    <p className="text-sm mt-2">Dars qo'shib, talabalar uchun ochiq qiling</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bo'lim</TableHead>
                        <TableHead>Daraja</TableHead>
                        <TableHead>Dars nomi</TableHead>
                        <TableHead className="w-20 text-center">Amallar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupUnits?.map((gu) => (
                        <TableRow key={gu.id}>
                          <TableCell>{gu.unit?.level?.section?.name || '-'}</TableCell>
                          <TableCell>{gu.unit?.level?.name || '-'}</TableCell>
                          <TableCell>{gu.unit?.name || '-'}</TableCell>
                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (selectedGroup) {
                                  removeGroupUnit.mutate({
                                    groupId: selectedGroup.id,
                                    unitId: gu.unit_id,
                                  });
                                  toast.success("Dars olib tashlandi");
                                }
                              }}
                              title="O'chirish"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        {/* Add Member Dialog */}
        <Dialog open={isAddMemberOpen} onOpenChange={(open) => {
          setIsAddMemberOpen(open);
          if (!open) setStudentSearchQuery('');
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Talaba qo'shish</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Talabani qidirish..."
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
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
                    {availableStudents
                      ?.filter((student) =>
                        student.name?.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
                        student.email?.toLowerCase().includes(studentSearchQuery.toLowerCase())
                      )
                      .map((student) => (
                        <SelectItem key={student.user_id} value={student.user_id}>
                          {student.name} ({student.email})
                        </SelectItem>
                      ))}
                    {availableStudents?.filter((student) =>
                      student.name?.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
                      student.email?.toLowerCase().includes(studentSearchQuery.toLowerCase())
                    ).length === 0 && (
                      <SelectItem value="none" disabled>
                        Qo'shish uchun talaba yo'q
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
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

        {/* Edit Group Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Guruhni tahrirlash</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Guruh nomi</label>
                <Input
                  value={editGroup.name}
                  onChange={(e) =>
                    setEditGroup({ ...editGroup, name: e.target.value })
                  }
                  placeholder="Guruh nomi"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Ta'rif</label>
                <Textarea
                  value={editGroup.description}
                  onChange={(e) =>
                    setEditGroup({ ...editGroup, description: e.target.value })
                  }
                  placeholder="Guruh haqida qisqacha ma'lumot"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Bekor qilish
              </Button>
              <Button
                onClick={() => updateGroup.mutate()}
                disabled={!editGroup.name || updateGroup.isPending}
              >
                {updateGroup.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Saqlash
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Unit Dialog */}
        <Dialog open={isAddUnitOpen} onOpenChange={(open) => {
          setIsAddUnitOpen(open);
          if (!open) {
            setSelectedSectionId('');
            setSelectedLevelId('');
            setSelectedUnitId('');
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dars qo'shish</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Bo'limni tanlang</label>
                <Select
                  value={selectedSectionId}
                  onValueChange={(value) => {
                    setSelectedSectionId(value);
                    setSelectedLevelId('');
                    setSelectedUnitId('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Bo'lim tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    {sections?.map((section) => (
                      <SelectItem key={section.id} value={section.id}>
                        {section.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedSectionId && (
                <div>
                  <label className="text-sm font-medium">Darajani tanlang</label>
                  <Select
                    value={selectedLevelId}
                    onValueChange={(value) => {
                      setSelectedLevelId(value);
                      setSelectedUnitId('');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Daraja tanlang" />
                    </SelectTrigger>
                    <SelectContent>
                      {levels?.map((level) => (
                        <SelectItem key={level.id} value={level.id}>
                          {level.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedLevelId && (
                <div>
                  <label className="text-sm font-medium">Darsni tanlang</label>
                  <Select
                    value={selectedUnitId}
                    onValueChange={setSelectedUnitId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Dars tanlang" />
                    </SelectTrigger>
                    <SelectContent>
                      {allUnits
                        ?.filter((unit) => !groupUnits?.some((gu) => gu.unit_id === unit.id))
                        .map((unit) => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.name}
                          </SelectItem>
                        ))}
                      {allUnits?.filter((unit) => !groupUnits?.some((gu) => gu.unit_id === unit.id)).length === 0 && (
                        <SelectItem value="none" disabled>
                          Barcha darslar allaqachon qo'shilgan
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddUnitOpen(false)}>
                Bekor qilish
              </Button>
              <Button
                onClick={() => {
                  if (selectedGroup && selectedUnitId) {
                    addGroupUnit.mutate({
                      groupId: selectedGroup.id,
                      unitId: selectedUnitId,
                    });
                    setIsAddUnitOpen(false);
                    setSelectedSectionId('');
                    setSelectedLevelId('');
                    setSelectedUnitId('');
                    toast.success("Dars qo'shildi");
                  }
                }}
                disabled={!selectedUnitId || addGroupUnit.isPending}
              >
                {addGroupUnit.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
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

        {/* Create Student Dialog */}
        {selectedGroup && (
          <CreateStudentDialog
            open={isCreateStudentOpen}
            onOpenChange={setIsCreateStudentOpen}
            groupId={selectedGroup.id}
            groupName={selectedGroup.name}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
