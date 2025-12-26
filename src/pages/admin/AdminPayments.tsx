import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, CheckCircle2, XCircle, Clock, MoreVertical, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAdminPayments, useUpdatePaymentStatus } from '@/hooks/useAdminData';

export default function AdminPayments() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const { data: payments, isLoading } = useAdminPayments();
  const updatePaymentStatus = useUpdatePaymentStatus();

  const filteredPayments = (payments || []).filter((payment) => {
    const matchesSearch =
      payment.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.userEmail.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || payment.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = [
    { label: 'Total Payments', value: payments?.length || 0, icon: CheckCircle2, color: 'from-primary to-accent' },
    { label: 'Pending', value: payments?.filter((p) => p.status === 'pending').length || 0, icon: Clock, color: 'from-warning to-orange-500' },
    { label: 'Approved', value: payments?.filter((p) => p.status === 'approved').length || 0, icon: CheckCircle2, color: 'from-success to-emerald-400' },
    { label: 'Blocked', value: payments?.filter((p) => p.status === 'blocked').length || 0, icon: XCircle, color: 'from-destructive to-rose-400' },
  ];

  const statusConfig = {
    pending: { icon: Clock, label: 'Pending', color: 'bg-warning/20 text-warning' },
    approved: { icon: CheckCircle2, label: 'Approved', color: 'bg-success/20 text-success' },
    blocked: { icon: XCircle, label: 'Blocked', color: 'bg-destructive/20 text-destructive' },
  };

  const handleApprove = (paymentId: string) => {
    updatePaymentStatus.mutate({ paymentId, status: 'approved' });
  };

  const handleReject = (paymentId: string) => {
    updatePaymentStatus.mutate({ paymentId, status: 'blocked' });
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
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Payment Management</h1>
          <p className="text-muted-foreground mt-1">Review and manage subscription payments</p>
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
                  placeholder="Search payments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                {['all', 'pending', 'approved', 'blocked'].map((status) => (
                  <Button
                    key={status}
                    variant={selectedStatus === status ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedStatus(status)}
                    className="capitalize"
                  >
                    {status}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payments List */}
        {filteredPayments.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No payments found.</p>
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
                          <p className="text-xs text-muted-foreground">Monthly</p>
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
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                              <DropdownMenuItem>Send Reminder</DropdownMenuItem>
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
      </div>
    </DashboardLayout>
  );
}
