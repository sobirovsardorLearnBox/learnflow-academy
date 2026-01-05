import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, CheckCircle2, XCircle, Smartphone, Monitor, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAdminDevices, useUpdateDeviceStatus } from '@/hooks/useAdminData';

export default function AdminDevices() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  const { data: devices, isLoading } = useAdminDevices();
  const updateDeviceStatus = useUpdateDeviceStatus();

  const filteredDevices = (devices || []).filter((device) => {
    const matchesSearch =
      device.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.userEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.device_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (selectedFilter === 'approved') return matchesSearch && device.is_approved;
    if (selectedFilter === 'pending') return matchesSearch && !device.is_approved;
    return matchesSearch;
  });

  const stats = [
    { label: 'Jami qurilmalar', value: devices?.length || 0, icon: Monitor, color: 'from-primary to-accent' },
    { label: 'Tasdiqlangan', value: devices?.filter((d) => d.is_approved).length || 0, icon: CheckCircle2, color: 'from-success to-emerald-400' },
    { label: 'Kutilmoqda', value: devices?.filter((d) => !d.is_approved).length || 0, icon: XCircle, color: 'from-warning to-orange-500' },
  ];

  const handleApprove = (deviceId: string) => {
    updateDeviceStatus.mutate({ deviceId, isApproved: true });
  };

  const handleReject = (deviceId: string) => {
    updateDeviceStatus.mutate({ deviceId, isApproved: false });
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
          <h1 className="text-2xl lg:text-3xl font-bold">Qurilmalarni boshqarish</h1>
          <p className="text-muted-foreground mt-1">Foydalanuvchi qurilmalarini boshqarish va tasdiqlash</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  placeholder="Qurilmalarni qidirish..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                {[
                  { value: 'all', label: 'Barchasi' },
                  { value: 'approved', label: 'Tasdiqlangan' },
                  { value: 'pending', label: 'Kutilmoqda' },
                ].map((filter) => (
                  <Button
                    key={filter.value}
                    variant={selectedFilter === filter.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedFilter(filter.value)}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Devices List */}
        {filteredDevices.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Qurilmalar topilmadi.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDevices.map((device, index) => (
              <motion.div
                key={device.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card variant="interactive">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          'w-12 h-12 rounded-xl flex items-center justify-center',
                          device.is_approved ? 'bg-success/20' : 'bg-warning/20'
                        )}>
                          <Smartphone className={cn(
                            'w-6 h-6',
                            device.is_approved ? 'text-success' : 'text-warning'
                          )} />
                        </div>
                        <div>
                          <p className="font-medium">{device.userName || "Noma'lum foydalanuvchi"}</p>
                          <p className="text-sm text-muted-foreground">{device.userEmail || "Noma'lum email"}</p>
                          <p className="text-xs text-muted-foreground mt-1 truncate max-w-xs">
                            {device.device_name || "Noma'lum qurilma"}
                          </p>
                        </div>
                      </div>

                      <div className="hidden md:block text-center">
                        <p className="text-sm">
                          {device.last_login ? new Date(device.last_login).toLocaleDateString() : "Hech qachon"}
                        </p>
                        <p className="text-xs text-muted-foreground">Oxirgi kirish</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={cn(
                          'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium',
                          device.is_approved ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                        )}>
                          {device.is_approved ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              Tasdiqlangan
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" />
                              Kutilmoqda
                            </>
                          )}
                        </span>

                        {!device.is_approved && (
                          <Button 
                            size="sm" 
                            className="bg-success hover:bg-success/90 text-success-foreground"
                            onClick={() => handleApprove(device.id)}
                            disabled={updateDeviceStatus.isPending}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Tasdiqlash
                          </Button>
                        )}

                        {device.is_approved && (
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleReject(device.id)}
                            disabled={updateDeviceStatus.isPending}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Bekor qilish
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}