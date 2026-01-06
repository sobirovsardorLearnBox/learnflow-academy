import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, CheckCircle2, XCircle, Clock, MoreVertical, Loader2, Plus, Trash2, Eye } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useAdminPayments, useUpdatePaymentStatus, useCreatePayment, useDeletePayment, useAdminUsers } from '@/hooks/useAdminData';

const MONTHS = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
];

export default function AdminPayments() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);

  // Create form state
  const [selectedUserId, setSelectedUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [notes, setNotes] = useState('');

  const { data: payments, isLoading } = useAdminPayments();
  const { data: users } = useAdminUsers();
  const updatePaymentStatus = useUpdatePaymentStatus();
  const createPayment = useCreatePayment();
  const deletePayment = useDeletePayment();

  const filteredPayments = (payments || []).filter((payment) => {
    const matchesSearch =
      payment.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.userEmail.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || payment.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = [
    { label: "Jami to'lovlar", value: payments?.length || 0, icon: CheckCircle2, color: 'from-primary to-accent' },
    { label: 'Kutilmoqda', value: payments?.filter((p) => p.status === 'pending').length || 0, icon: Clock, color: 'from-warning to-orange-500' },
    { label: 'Tasdiqlangan', value: payments?.filter((p) => p.status === 'approved').length || 0, icon: CheckCircle2, color: 'from-success to-emerald-400' },
    { label: 'Bloklangan', value: payments?.filter((p) => p.status === 'blocked').length || 0, icon: XCircle, color: 'from-destructive to-rose-400' },
  ];

  const statusConfig = {
    pending: { icon: Clock, label: 'Kutilmoqda', color: 'bg-warning/20 text-warning' },
    approved: { icon: CheckCircle2, label: 'Tasdiqlangan', color: 'bg-success/20 text-success' },
    blocked: { icon: XCircle, label: 'Bloklangan', color: 'bg-destructive/20 text-destructive' },
  };

  const handleApprove = (paymentId: string) => {
    updatePaymentStatus.mutate({ paymentId, status: 'approved' });
  };

  const handleReject = (paymentId: string) => {
    updatePaymentStatus.mutate({ paymentId, status: 'blocked' });
  };

  const handleCreatePayment = () => {
    if (!selectedUserId || !amount || !month || !year) return;
    
    createPayment.mutate({
      userId: selectedUserId,
      amount: parseFloat(amount),
      month,
      year: parseInt(year),
      notes: notes || undefined,
    }, {
      onSuccess: () => {
        setIsCreateOpen(false);
        resetForm();
      }
    });
  };

  const handleDeletePayment = () => {
    if (!deletePaymentId) return;
    deletePayment.mutate({ paymentId: deletePaymentId }, {
      onSuccess: () => setDeletePaymentId(null)
    });
  };

  const resetForm = () => {
    setSelectedUserId('');
    setAmount('');
    setMonth('');
    setYear(new Date().getFullYear().toString());
    setNotes('');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('uz-UZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">To'lovlarni boshqarish</h1>
            <p className="text-muted-foreground mt-1">Obuna to'lovlarini ko'rib chiqish va boshqarish</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Yangi to'lov
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Yangi to'lov qo'shish</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Foydalanuvchi</Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Foydalanuvchini tanlang" />
                    </SelectTrigger>
                    <SelectContent>
                      {users?.map((user) => (
                        <SelectItem key={user.user_id} value={user.user_id}>
                          {user.name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Summa (USD)</Label>
                    <Input
                      type="number"
                      placeholder="29.99"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Yil</Label>
                    <Input
                      type="number"
                      placeholder="2024"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Oy</Label>
                  <Select value={month} onValueChange={setMonth}>
                    <SelectTrigger>
                      <SelectValue placeholder="Oyni tanlang" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Izoh (ixtiyoriy)</Label>
                  <Textarea
                    placeholder="Qo'shimcha izohlar..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button variant="outline" className="flex-1" onClick={() => setIsCreateOpen(false)}>
                    Bekor qilish
                  </Button>
                  <Button 
                    className="flex-1" 
                    onClick={handleCreatePayment}
                    disabled={!selectedUserId || !amount || !month || !year || createPayment.isPending}
                  >
                    {createPayment.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Qo'shish"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center', stat.color)}>
                      <stat.icon className="w-5 h-5 text-foreground" />
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

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="To'lovlarni qidirish..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                {[
                  { value: 'all', label: 'Barchasi' },
                  { value: 'pending', label: 'Kutilmoqda' },
                  { value: 'approved', label: 'Tasdiqlangan' },
                  { value: 'blocked', label: 'Bloklangan' },
                ].map((status) => (
                  <Button
                    key={status.value}
                    variant={selectedStatus === status.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedStatus(status.value)}
                  >
                    {status.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payments List */}
        {filteredPayments.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">To'lovlar topilmadi.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPayments.map((payment, index) => {
              const config = statusConfig[payment.status];
              return (
                <motion.div
                  key={payment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card variant="interactive">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-semibold">
                            {payment.userName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{payment.userName}</p>
                            <p className="text-sm text-muted-foreground">{payment.userEmail}</p>
                          </div>
                        </div>

                        <div className="hidden md:block text-center">
                          <p className="font-semibold text-lg">${payment.amount || '29.99'}</p>
                          <p className="text-xs text-muted-foreground">Oylik</p>
                        </div>

                        <div className="hidden md:block text-center">
                          <p className="text-sm">{payment.month} {payment.year}</p>
                          <p className="text-xs text-muted-foreground">Telegram</p>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium', config.color)}>
                            <config.icon className="w-3 h-3" />
                            {config.label}
                          </span>

                          {payment.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                className="bg-success hover:bg-success/90 text-success-foreground"
                                onClick={() => handleApprove(payment.id)}
                                disabled={updatePaymentStatus.isPending}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => handleReject(payment.id)}
                                disabled={updatePaymentStatus.isPending}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </div>
                          )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setSelectedPayment(payment);
                                setIsDetailOpen(true);
                              }}>
                                <Eye className="w-4 h-4 mr-2" />
                                Batafsil ko'rish
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => setDeletePaymentId(payment.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                O'chirish
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Payment Detail Dialog */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>To'lov tafsilotlari</DialogTitle>
            </DialogHeader>
            {selectedPayment && (
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Foydalanuvchi</p>
                    <p className="font-medium">{selectedPayment.userName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedPayment.userEmail}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Summa</p>
                    <p className="font-medium">${selectedPayment.amount || '0.00'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Holat</p>
                    <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium', statusConfig[selectedPayment.status as keyof typeof statusConfig].color)}>
                      {statusConfig[selectedPayment.status as keyof typeof statusConfig].label}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Davr</p>
                    <p className="font-medium">{selectedPayment.month} {selectedPayment.year}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Yaratilgan</p>
                    <p className="font-medium">{formatDate(selectedPayment.created_at)}</p>
                  </div>
                  {selectedPayment.approved_at && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Tasdiqlangan vaqt</p>
                      <p className="font-medium">{formatDate(selectedPayment.approved_at)}</p>
                    </div>
                  )}
                  {selectedPayment.notes && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Izoh</p>
                      <p className="font-medium">{selectedPayment.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deletePaymentId} onOpenChange={() => setDeletePaymentId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>To'lovni o'chirishni tasdiqlang</AlertDialogTitle>
              <AlertDialogDescription>
                Bu amalni qaytarib bo'lmaydi. To'lov ma'lumotlari butunlay o'chiriladi.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeletePayment}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deletePayment.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "O'chirish"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}