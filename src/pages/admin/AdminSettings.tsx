import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Bell, Shield, Save, Loader2, Database, RefreshCw } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface PlatformStats {
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  totalLessons: number;
  totalSections: number;
  totalPayments: number;
  approvedPayments: number;
  pendingPayments: number;
}

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState({
    // General
    siteName: 'LearnBox',
    siteDescription: 'Onlayn o\'quv platformasi',
    // Notifications
    emailNotifications: true,
    paymentAlerts: true,
    newUserAlerts: true,
    // Security
    requireDeviceApproval: true,
    maxDevicesPerUser: 2,
    sessionTimeout: 30,
  });

  // Fetch platform statistics
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['platform-stats'],
    queryFn: async (): Promise<PlatformStats> => {
      // Get users count
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get students count
      const { count: totalStudents } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student');

      // Get teachers count
      const { count: totalTeachers } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'teacher');

      // Get lessons count
      const { count: totalLessons } = await supabase
        .from('lessons')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Get sections count
      const { count: totalSections } = await supabase
        .from('sections')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Get payments count
      const { count: totalPayments } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true });

      const { count: approvedPayments } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');

      const { count: pendingPayments } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      return {
        totalUsers: totalUsers || 0,
        totalStudents: totalStudents || 0,
        totalTeachers: totalTeachers || 0,
        totalLessons: totalLessons || 0,
        totalSections: totalSections || 0,
        totalPayments: totalPayments || 0,
        approvedPayments: approvedPayments || 0,
        pendingPayments: pendingPayments || 0,
      };
    },
  });

  const handleSave = async () => {
    setIsSaving(true);
    // Save settings to localStorage for now (can be extended to database later)
    localStorage.setItem('platform-settings', JSON.stringify(settings));
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsSaving(false);
    toast.success('Sozlamalar saqlandi');
  };

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('platform-settings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
    }
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Sozlamalar</h1>
            <p className="text-muted-foreground mt-1">Platforma sozlamalarini boshqaring</p>
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Saqlash
          </Button>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList>
            <TabsTrigger value="general" className="gap-2">
              <Settings className="w-4 h-4" />
              Umumiy
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-2">
              <Database className="w-4 h-4" />
              Statistika
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" />
              Bildirishnomalar
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="w-4 h-4" />
              Xavfsizlik
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Umumiy sozlamalar</CardTitle>
                  <CardDescription>Asosiy platforma konfiguratsiyasi</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="siteName">Sayt nomi</Label>
                    <Input
                      id="siteName"
                      value={settings.siteName}
                      onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="siteDescription">Sayt tavsifi</Label>
                    <Input
                      id="siteDescription"
                      value={settings.siteDescription}
                      onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="stats">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Platforma statistikasi</CardTitle>
                      <CardDescription>Umumiy ma'lumotlar va ko'rsatkichlar</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetchStats()}
                      disabled={statsLoading}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${statsLoading ? 'animate-spin' : ''}`} />
                      Yangilash
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                        <p className="text-sm text-muted-foreground">Jami foydalanuvchilar</p>
                        <p className="text-2xl font-bold">{stats?.totalUsers || 0}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <p className="text-sm text-muted-foreground">Talabalar</p>
                        <p className="text-2xl font-bold">{stats?.totalStudents || 0}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                        <p className="text-sm text-muted-foreground">O'qituvchilar</p>
                        <p className="text-2xl font-bold">{stats?.totalTeachers || 0}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                        <p className="text-sm text-muted-foreground">Jami darslar</p>
                        <p className="text-2xl font-bold">{stats?.totalLessons || 0}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                        <p className="text-sm text-muted-foreground">Bo'limlar</p>
                        <p className="text-2xl font-bold">{stats?.totalSections || 0}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                        <p className="text-sm text-muted-foreground">Jami to'lovlar</p>
                        <p className="text-2xl font-bold">{stats?.totalPayments || 0}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                        <p className="text-sm text-muted-foreground">Tasdiqlangan to'lovlar</p>
                        <p className="text-2xl font-bold text-success">{stats?.approvedPayments || 0}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                        <p className="text-sm text-muted-foreground">Kutilayotgan to'lovlar</p>
                        <p className="text-2xl font-bold text-warning">{stats?.pendingPayments || 0}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="notifications">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Bildirishnoma sozlamalari</CardTitle>
                  <CardDescription>Bildirishnomalarni qanday olishni sozlang</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email bildirishnomalari</Label>
                      <p className="text-sm text-muted-foreground">Email orqali bildirishnoma olish</p>
                    </div>
                    <Switch
                      checked={settings.emailNotifications}
                      onCheckedChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>To'lov xabarlari</Label>
                      <p className="text-sm text-muted-foreground">Yangi to'lov so'rovlari haqida xabar olish</p>
                    </div>
                    <Switch
                      checked={settings.paymentAlerts}
                      onCheckedChange={(checked) => setSettings({ ...settings, paymentAlerts: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Yangi foydalanuvchi xabarlari</Label>
                      <p className="text-sm text-muted-foreground">Yangi foydalanuvchilar ro'yxatdan o'tganda xabar olish</p>
                    </div>
                    <Switch
                      checked={settings.newUserAlerts}
                      onCheckedChange={(checked) => setSettings({ ...settings, newUserAlerts: checked })}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="security">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Xavfsizlik sozlamalari</CardTitle>
                  <CardDescription>Platforma xavfsizlik parametrlarini sozlang</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Qurilma tasdig'ini talab qilish</Label>
                      <p className="text-sm text-muted-foreground">Yangi qurilmalar admin tasdig'ini talab qiladi</p>
                    </div>
                    <Switch
                      checked={settings.requireDeviceApproval}
                      onCheckedChange={(checked) => setSettings({ ...settings, requireDeviceApproval: checked })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxDevices">Foydalanuvchi uchun maksimal qurilmalar</Label>
                    <Input
                      id="maxDevices"
                      type="number"
                      min={1}
                      max={10}
                      value={settings.maxDevicesPerUser}
                      onChange={(e) => setSettings({ ...settings, maxDevicesPerUser: parseInt(e.target.value) || 1 })}
                      className="w-32"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sessionTimeout">Sessiya vaqti (daqiqalar)</Label>
                    <Input
                      id="sessionTimeout"
                      type="number"
                      min={5}
                      max={120}
                      value={settings.sessionTimeout}
                      onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) || 30 })}
                      className="w-32"
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
