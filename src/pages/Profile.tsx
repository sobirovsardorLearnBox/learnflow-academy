import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Save, Loader2, Eye, EyeOff, Bell, BookOpen, Trophy, CreditCard, MessageSquare, Smartphone } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { PushNotificationToggle } from '@/components/notifications/PushNotificationToggle';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const { preferences, updatePreferences, isUpdating: isUpdatingPrefs } = useNotificationPreferences();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const notificationTypes = [
    { key: 'system_notifications', label: 'Tizim xabarlari', description: 'Tizim yangilanishlari va muhim e\'lonlar', icon: MessageSquare },
    { key: 'new_lesson_notifications', label: 'Yangi darslar', description: 'Yangi darslar qo\'shilganda xabar', icon: BookOpen },
    { key: 'reminder_notifications', label: 'Eslatmalar', description: 'O\'qituvchi eslatmalari va muhim sanalar', icon: Bell },
    { key: 'achievement_notifications', label: 'Yutuqlar', description: 'Dars va bo\'lim tugatilganda xabar', icon: Trophy },
    { key: 'payment_notifications', label: 'To\'lov xabarlari', description: 'To\'lov holati o\'zgarganda xabar', icon: CreditCard },
  ] as const;

  if (!user) return null;

  const handleUpdateProfile = async () => {
    if (!profileData.name.trim()) {
      toast.error('Ism kiritilishi shart');
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name: profileData.name.trim() })
        .eq('user_id', user.user_id);

      if (error) throw error;

      await refreshUser();
      toast.success('Profil muvaffaqiyatli yangilandi');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Profilni yangilashda xatolik');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Barcha maydonlarni to\'ldiring');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Yangi parol kamida 6 ta belgidan iborat bo\'lishi kerak');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Parollar mos kelmadi');
      return;
    }

    setIsChangingPassword(true);
    try {
      // Step 1: Verify current password by re-authenticating
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser?.email) {
        throw new Error('User email not found');
      }

      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: passwordData.currentPassword,
      });

      if (verifyError) {
        toast.error('Joriy parol noto\'g\'ri');
        return;
      }

      // Step 2: Only then update to new password
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      toast.success('Parol muvaffaqiyatli o\'zgartirildi');
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Parolni o\'zgartirishda xatolik');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const roleLabels: Record<string, string> = {
    admin: 'Administrator',
    teacher: 'O\'qituvchi',
    student: 'Talaba',
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Mening profilim</h1>
          <p className="text-muted-foreground mt-1">Akkaunt sozlamalarini boshqaring</p>
        </div>

        {/* Profile Card */}
        <Card variant="glass">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Avatar className="w-20 h-20">
                <AvatarFallback className="text-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-semibold">{user.name}</h2>
                <p className="text-muted-foreground">{user.email}</p>
                <span className="inline-block mt-2 px-3 py-1 text-xs font-medium rounded-full bg-primary/20 text-primary">
                  {roleLabels[user.role] || user.role}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile" className="gap-2">
              <User className="w-4 h-4" />
              Profil
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" />
              Xabarnomalar
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Lock className="w-4 h-4" />
              Xavfsizlik
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Profil ma'lumotlari</CardTitle>
                  <CardDescription>Shaxsiy ma'lumotlaringizni yangilang</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">To'liq ism</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="name"
                        value={profileData.name}
                        onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                        className="pl-10"
                        placeholder="Ismingizni kiriting"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        value={profileData.email}
                        disabled
                        className="pl-10 bg-secondary/50"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Emailni o'zgartirish mumkin emas</p>
                  </div>
                  <Button onClick={handleUpdateProfile} disabled={isUpdating} className="w-full">
                    {isUpdating ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    O'zgarishlarni saqlash
                  </Button>
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
                  <CardTitle>Xabarnoma sozlamalari</CardTitle>
                  <CardDescription>Qaysi turdagi xabarlarni olishni tanlang</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Push Notification Toggle */}
                  <div className="flex items-center justify-between gap-4 py-3 border-b bg-primary/5 -mx-6 px-6 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div>
                        <Label className="font-medium">Push bildirishnomalar</Label>
                        <p className="text-sm text-muted-foreground">Brauzer yopiq bo'lganda ham bildirishnomalar oling</p>
                      </div>
                    </div>
                    <PushNotificationToggle showLabel={false} />
                  </div>

                  {notificationTypes.map(({ key, label, description, icon: Icon }) => (
                    <div key={key} className="flex items-center justify-between gap-4 py-3 border-b last:border-0">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <Label htmlFor={key} className="font-medium cursor-pointer">{label}</Label>
                          <p className="text-sm text-muted-foreground">{description}</p>
                        </div>
                      </div>
                      <Switch
                        id={key}
                        checked={preferences[key as keyof typeof preferences] as boolean}
                        onCheckedChange={(checked) => updatePreferences({ [key]: checked })}
                        disabled={isUpdatingPrefs}
                      />
                    </div>
                  ))}
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
                  <CardTitle>Parolni o'zgartirish</CardTitle>
                  <CardDescription>Akkaunt parolingizni yangilang</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Joriy parol</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="currentPassword"
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        className="pl-10 pr-10"
                        placeholder="Joriy parolni kiriting"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Yangi parol</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="newPassword"
                        type={showNewPassword ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        className="pl-10 pr-10"
                        placeholder="Yangi parolni kiriting"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Yangi parolni tasdiqlang</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        className="pl-10"
                        placeholder="Yangi parolni qayta kiriting"
                      />
                    </div>
                  </div>
                  <Button onClick={handleChangePassword} disabled={isChangingPassword} className="w-full">
                    {isChangingPassword ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Lock className="w-4 h-4 mr-2" />
                    )}
                    Parolni o'zgartirish
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
