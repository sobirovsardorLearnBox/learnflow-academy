import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, MoreVertical, Mail, Shield, Trash2, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PaymentStatusBadge } from '@/components/dashboard/PaymentBanner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useAdminUsers, useUpdateUserRole, useDeleteUser } from '@/hooks/useAdminData';
import { CreateUserDialog } from '@/components/admin/CreateUserDialog';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';

export default function AdminUsers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; user_id: string; name: string; role: string } | null>(null);
  const [newRole, setNewRole] = useState<'admin' | 'teacher' | 'student'>('student');

  const { data: users, isLoading } = useAdminUsers();
  const updateRole = useUpdateUserRole();
  const deleteUser = useDeleteUser();

  const filteredUsers = (users || []).filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const stats = [
    { label: 'Jami foydalanuvchilar', value: users?.length || 0, color: 'text-primary' },
    { label: 'Talabalar', value: users?.filter((u) => u.role === 'student').length || 0, color: 'text-cyan-400' },
    { label: "O'qituvchilar", value: users?.filter((u) => u.role === 'teacher').length || 0, color: 'text-emerald-400' },
    { label: "Kutilayotgan to'lovlar", value: users?.filter((u) => u.paymentStatus === 'pending').length || 0, color: 'text-warning' },
  ];

  const handleOpenRoleDialog = (user: typeof selectedUser) => {
    setSelectedUser(user);
    setNewRole(user?.role as 'admin' | 'teacher' | 'student' || 'student');
    setRoleDialogOpen(true);
  };

  const handleOpenDeleteDialog = (user: typeof selectedUser) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const handleRoleChange = () => {
    if (selectedUser) {
      updateRole.mutate({ userId: selectedUser.user_id, role: newRole }, {
        onSuccess: () => {
          setRoleDialogOpen(false);
          setSelectedUser(null);
        }
      });
    }
  };

  const handleDeleteUser = () => {
    if (selectedUser) {
      deleteUser.mutate({ userId: selectedUser.user_id }, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setSelectedUser(null);
        }
      });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Foydalanuvchilar boshqaruvi</h1>
            <p className="text-muted-foreground mt-1">Barcha platformadagi foydalanuvchilarni boshqarish</p>
          </div>
          <CreateUserDialog />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card variant="glass">
                <CardContent className="p-4 text-center">
                  <p className={cn('text-3xl font-bold', stat.color)}>{stat.value}</p>
                  <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Foydalanuvchilarni qidirish..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                {[
                  { value: 'all', label: 'Barchasi' },
                  { value: 'student', label: 'Talaba' },
                  { value: 'teacher', label: "O'qituvchi" },
                  { value: 'admin', label: 'Admin' },
                ].map((role) => (
                  <Button
                    key={role.value}
                    variant={selectedRole === role.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedRole(role.value)}
                  >
                    {role.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Foydalanuvchilar topilmadi.</p>
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Foydalanuvchi</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Rol</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">To'lov</th>
                      <th className="text-right p-4 text-sm font-medium text-muted-foreground">Amallar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user, index) => (
                      <motion.tr
                        key={user.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-semibold">
                              {user.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium">{user.name}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                            user.role === 'admin' && 'bg-violet-500/20 text-violet-400',
                            user.role === 'teacher' && 'bg-emerald-500/20 text-emerald-400',
                            user.role === 'student' && 'bg-cyan-500/20 text-cyan-400'
                          )}>
                            {user.role === 'admin' && 'Admin'}
                            {user.role === 'teacher' && "O'qituvchi"}
                            {user.role === 'student' && 'Talaba'}
                          </span>
                        </td>
                        <td className="p-4">
                          <PaymentStatusBadge status={user.paymentStatus} />
                        </td>
                        <td className="p-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleOpenRoleDialog({
                                  id: user.id,
                                  user_id: user.user_id,
                                  name: user.name,
                                  role: user.role
                                })}
                              >
                                <Shield className="w-4 h-4 mr-2" />
                                Rolni o'zgartirish
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => handleOpenDeleteDialog({
                                  id: user.id,
                                  user_id: user.user_id,
                                  name: user.name,
                                  role: user.role
                                })}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                O'chirish
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Role Change Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rolni o'zgartirish</DialogTitle>
            <DialogDescription>
              {selectedUser?.name} uchun yangi rol tanlang
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={newRole} onValueChange={(value) => setNewRole(value as typeof newRole)}>
              <SelectTrigger>
                <SelectValue placeholder="Rol tanlang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Talaba</SelectItem>
                <SelectItem value="teacher">O'qituvchi</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
                Bekor qilish
              </Button>
              <Button onClick={handleRoleChange} disabled={updateRole.isPending}>
                {updateRole.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saqlanmoqda...
                  </>
                ) : (
                  'Saqlash'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Foydalanuvchini o'chirish"
        description={`${selectedUser?.name}ni o'chirishni tasdiqlaysizmi? Bu amalni qaytarib bo'lmaydi.`}
        onConfirm={handleDeleteUser}
        isLoading={deleteUser.isPending}
      />
    </DashboardLayout>
  );
}