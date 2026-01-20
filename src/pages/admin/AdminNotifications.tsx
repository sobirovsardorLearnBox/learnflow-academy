import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Bell, 
  Send, 
  Users, 
  User, 
  Search, 
  CheckCircle2, 
  AlertCircle,
  MessageSquare,
  Clock,
  Loader2
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSendNotification } from '@/hooks/useNotifications';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const notificationSchema = z.object({
  type: z.string().min(1, 'Xabar turini tanlang'),
  title: z.string().min(1, 'Sarlavhani kiriting').max(100, 'Sarlavha 100 ta belgidan oshmasin'),
  message: z.string().min(1, 'Xabar matnini kiriting').max(500, 'Xabar 500 ta belgidan oshmasin'),
});

const notificationTypes = [
  { value: 'system', label: 'Tizim xabari', icon: Bell, color: 'bg-gray-500' },
  { value: 'payment_reminder', label: "To'lov eslatmasi", icon: AlertCircle, color: 'bg-orange-500' },
  { value: 'new_lesson_available', label: 'Yangi dars', icon: MessageSquare, color: 'bg-cyan-500' },
  { value: 'group_joined', label: 'Guruhga qabul', icon: Users, color: 'bg-purple-500' },
  { value: 'achievement_unlocked', label: 'Yutuq', icon: CheckCircle2, color: 'bg-yellow-500' },
];

export default function AdminNotifications() {
  const [targetType, setTargetType] = useState<'user' | 'group'>('user');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [notificationType, setNotificationType] = useState<string>('system');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { toast } = useToast();
  const sendNotification = useSendNotification();

  // Fetch students
  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ['admin-students-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          user_id,
          name,
          email,
          avatar_url
        `)
        .order('name');
      
      if (error) throw error;
      
      // Filter to only students
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('role', 'student');
      
      const studentUserIds = new Set(roles?.map(r => r.user_id) || []);
      return data?.filter(p => studentUserIds.has(p.user_id)) || [];
    },
  });

  // Fetch groups
  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ['admin-groups-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select(`
          id,
          name,
          description,
          is_active,
          group_members(count)
        `)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Recent notifications sent (simulated for now - could be stored in a table)
  const [recentNotifications, setRecentNotifications] = useState<Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    targetType: 'user' | 'group';
    targetName: string;
    sentAt: string;
    recipientCount: number;
  }>>([]);

  const filteredStudents = students?.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const filteredGroups = groups?.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const validateForm = () => {
    const result = notificationSchema.safeParse({
      type: notificationType,
      title,
      message,
    });

    if (!result.success) {
      const formattedErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        formattedErrors[err.path[0]] = err.message;
      });
      setErrors(formattedErrors);
      return false;
    }

    if (targetType === 'user' && !selectedUserId) {
      setErrors({ target: 'Foydalanuvchini tanlang' });
      return false;
    }

    if (targetType === 'group' && !selectedGroupId) {
      setErrors({ target: 'Guruhni tanlang' });
      return false;
    }

    setErrors({});
    return true;
  };

  const handleSend = async () => {
    if (!validateForm()) return;

    try {
      const result = await sendNotification.mutateAsync({
        targetUserId: targetType === 'user' ? selectedUserId : undefined,
        targetGroupId: targetType === 'group' ? selectedGroupId : undefined,
        type: notificationType,
        title,
        message,
      });

      // Add to recent
      const targetName = targetType === 'user' 
        ? students?.find(s => s.user_id === selectedUserId)?.name || 'Noma\'lum'
        : groups?.find(g => g.id === selectedGroupId)?.name || 'Noma\'lum';

      setRecentNotifications(prev => [{
        id: crypto.randomUUID(),
        type: notificationType,
        title,
        message,
        targetType,
        targetName,
        sentAt: new Date().toISOString(),
        recipientCount: result?.recipientCount || 1,
      }, ...prev].slice(0, 10));

      // Reset form
      setTitle('');
      setMessage('');
      setSelectedUserId('');
      setSelectedGroupId('');
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  };

  const selectedTypeInfo = notificationTypes.find(t => t.value === notificationType);

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Xabarnomalar</h1>
            <p className="text-muted-foreground">Talabalar va guruhlarga xabar yuborish</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Send Form */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Yangi xabar yuborish
              </CardTitle>
              <CardDescription>
                Individual talabaga yoki butun guruhga xabar yuboring
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Target Type Selection */}
              <div className="space-y-2">
                <Label>Qabul qiluvchi turi</Label>
                <Tabs value={targetType} onValueChange={(v) => setTargetType(v as 'user' | 'group')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="user" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Individual talaba
                    </TabsTrigger>
                    <TabsTrigger value="group" className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Guruh
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="user" className="space-y-3 pt-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Talabani qidirish..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <ScrollArea className="h-48 border rounded-md">
                      {studentsLoading ? (
                        <div className="flex items-center justify-center h-full">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                      ) : filteredStudents.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          Talabalar topilmadi
                        </div>
                      ) : (
                        <div className="p-2 space-y-1">
                          {filteredStudents.map((student) => (
                            <div
                              key={student.user_id}
                              className={cn(
                                "flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors",
                                selectedUserId === student.user_id 
                                  ? "bg-primary/10 border border-primary" 
                                  : "hover:bg-muted"
                              )}
                              onClick={() => setSelectedUserId(student.user_id)}
                            >
                              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium">
                                {student.name.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{student.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                              </div>
                              {selectedUserId === student.user_id && (
                                <CheckCircle2 className="h-4 w-4 text-primary" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="group" className="space-y-3 pt-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Guruhni qidirish..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <ScrollArea className="h-48 border rounded-md">
                      {groupsLoading ? (
                        <div className="flex items-center justify-center h-full">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                      ) : filteredGroups.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          Guruhlar topilmadi
                        </div>
                      ) : (
                        <div className="p-2 space-y-1">
                          {filteredGroups.map((group) => (
                            <div
                              key={group.id}
                              className={cn(
                                "flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors",
                                selectedGroupId === group.id 
                                  ? "bg-primary/10 border border-primary" 
                                  : "hover:bg-muted"
                              )}
                              onClick={() => setSelectedGroupId(group.id)}
                            >
                              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                <Users className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{group.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {(group.group_members as any)?.[0]?.count || 0} ta a'zo
                                </p>
                              </div>
                              {selectedGroupId === group.id && (
                                <CheckCircle2 className="h-4 w-4 text-primary" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
                {errors.target && (
                  <p className="text-sm text-destructive">{errors.target}</p>
                )}
              </div>

              {/* Notification Type */}
              <div className="space-y-2">
                <Label>Xabar turi</Label>
                <Select value={notificationType} onValueChange={setNotificationType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {notificationTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", type.color)} />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.type && (
                  <p className="text-sm text-destructive">{errors.type}</p>
                )}
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label>Sarlavha</Label>
                <Input
                  placeholder="Xabar sarlavhasi..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                />
                <div className="flex justify-between">
                  {errors.title && (
                    <p className="text-sm text-destructive">{errors.title}</p>
                  )}
                  <p className="text-xs text-muted-foreground ml-auto">{title.length}/100</p>
                </div>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <Label>Xabar matni</Label>
                <Textarea
                  placeholder="Xabar matnini yozing..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={500}
                  rows={4}
                />
                <div className="flex justify-between">
                  {errors.message && (
                    <p className="text-sm text-destructive">{errors.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground ml-auto">{message.length}/500</p>
                </div>
              </div>

              {/* Preview */}
              {(title || message) && (
                <div className="p-4 border rounded-lg bg-muted/30 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Ko'rinishi:</p>
                  <div className="flex items-start gap-3">
                    <div className={cn("w-2 h-2 rounded-full mt-2 shrink-0", selectedTypeInfo?.color || 'bg-gray-500')} />
                    <div>
                      <p className="font-medium text-sm">{title || 'Sarlavha'}</p>
                      <p className="text-xs text-muted-foreground">{message || 'Xabar matni'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Send Button */}
              <Button 
                className="w-full" 
                onClick={handleSend}
                disabled={sendNotification.isPending}
              >
                {sendNotification.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Yuborilmoqda...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Xabar yuborish
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Recent Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5" />
                So'nggi yuborilganlar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {recentNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <Bell className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">Hozircha xabarlar yo'q</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentNotifications.map((notif) => {
                      const typeInfo = notificationTypes.find(t => t.value === notif.type);
                      return (
                        <div 
                          key={notif.id} 
                          className="p-3 border rounded-lg space-y-2"
                        >
                          <div className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full", typeInfo?.color || 'bg-gray-500')} />
                            <span className="font-medium text-sm truncate">{notif.title}</span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{notif.message}</p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              {notif.targetType === 'user' ? (
                                <User className="h-3 w-3" />
                              ) : (
                                <Users className="h-3 w-3" />
                              )}
                              <span className="truncate max-w-20">{notif.targetName}</span>
                            </div>
                            <Badge variant="secondary" className="text-[10px]">
                              {notif.recipientCount} qabul qildi
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}