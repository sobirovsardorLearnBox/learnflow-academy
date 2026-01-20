import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  role: 'admin' | 'teacher' | 'student';
  paymentStatus: 'pending' | 'approved' | 'blocked';
  lastActive?: string;
  daily_lesson_limit?: number;
}

export interface AdminPayment {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'blocked';
  amount: number | null;
  month: string;
  year: number;
  approved_at: string | null;
  created_at: string;
  notes: string | null;
  userName: string;
  userEmail: string;
}

export interface Device {
  id: string;
  user_id: string;
  device_id: string;
  device_name: string | null;
  is_approved: boolean;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  userName?: string;
  userEmail?: string;
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      // Fetch roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Fetch latest payments for each user
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Combine data
      const users: AdminUser[] = (profiles || []).map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.user_id);
        const latestPayment = payments?.find(p => p.user_id === profile.user_id);

        return {
          id: profile.id,
          user_id: profile.user_id,
          email: profile.email,
          name: profile.name,
          avatar_url: profile.avatar_url,
          role: (userRole?.role as 'admin' | 'teacher' | 'student') || 'student',
          paymentStatus: (latestPayment?.status as 'pending' | 'approved' | 'blocked') || 'pending',
          daily_lesson_limit: (profile as any).daily_lesson_limit ?? 1,
        };
      });

      return users;
    },
  });
}

export function useAdminPayments() {
  return useQuery({
    queryKey: ['admin-payments'],
    queryFn: async () => {
      // Fetch payments with profile info
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      const result: AdminPayment[] = (payments || []).map(payment => {
        const profile = profiles?.find(p => p.user_id === payment.user_id);
        return {
          id: payment.id,
          user_id: payment.user_id,
          status: payment.status as 'pending' | 'approved' | 'blocked',
          amount: payment.amount,
          month: payment.month,
          year: payment.year,
          approved_at: payment.approved_at,
          created_at: payment.created_at,
          notes: payment.notes,
          userName: profile?.name || 'Unknown',
          userEmail: profile?.email || 'Unknown',
        };
      });

      return result;
    },
  });
}

export function useUpdatePaymentStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ paymentId, status }: { paymentId: string; status: 'approved' | 'blocked' }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('payments')
        .update({ 
          status, 
          approved_at: status === 'approved' ? new Date().toISOString() : null,
          approved_by: user?.id 
        })
        .eq('id', paymentId);

      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({
        title: "To'lov yangilandi",
        description: status === 'approved' 
          ? "To'lov muvaffaqiyatli tasdiqlandi." 
          : "To'lov bloklandi.",
      });
    },
    onError: (error) => {
      toast({
        title: 'Xatolik',
        description: "To'lov holatini yangilab bo'lmadi.",
        variant: 'destructive',
      });
      console.error('Error updating payment:', error);
    },
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, amount, month, year, notes }: { 
      userId: string; 
      amount: number; 
      month: string; 
      year: number;
      notes?: string;
    }) => {
      const { error } = await supabase
        .from('payments')
        .insert({ 
          user_id: userId,
          amount,
          month,
          year,
          notes,
          status: 'pending'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({
        title: "To'lov qo'shildi",
        description: "Yangi to'lov muvaffaqiyatli qo'shildi.",
      });
    },
    onError: (error) => {
      toast({
        title: 'Xatolik',
        description: "To'lovni qo'shib bo'lmadi.",
        variant: 'destructive',
      });
      console.error('Error creating payment:', error);
    },
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ paymentId }: { paymentId: string }) => {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', paymentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({
        title: "To'lov o'chirildi",
        description: "To'lov muvaffaqiyatli o'chirildi.",
      });
    },
    onError: (error) => {
      toast({
        title: 'Xatolik',
        description: "To'lovni o'chirib bo'lmadi.",
        variant: 'destructive',
      });
      console.error('Error deleting payment:', error);
    },
  });
}

export function useAdminDevices() {
  return useQuery({
    queryKey: ['admin-devices'],
    queryFn: async () => {
      const { data: devices, error: devicesError } = await supabase
        .from('devices')
        .select('*')
        .order('created_at', { ascending: false });

      if (devicesError) throw devicesError;

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      const result: Device[] = (devices || []).map(device => {
        const profile = profiles?.find(p => p.user_id === device.user_id);
        return {
          ...device,
          userName: profile?.name,
          userEmail: profile?.email,
        };
      });

      return result;
    },
  });
}

export function useUpdateDeviceStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ deviceId, isApproved }: { deviceId: string; isApproved: boolean }) => {
      const { error } = await supabase
        .from('devices')
        .update({ is_approved: isApproved })
        .eq('id', deviceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-devices'] });
      toast({
        title: 'Device Updated',
        description: 'Device status has been updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update device status.',
        variant: 'destructive',
      });
      console.error('Error updating device:', error);
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'teacher' | 'student' }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({
        title: "Rol o'zgartirildi",
        description: "Foydalanuvchi roli muvaffaqiyatli yangilandi.",
      });
    },
    onError: (error) => {
      toast({
        title: 'Xatolik',
        description: "Rolni o'zgartirib bo'lmadi.",
        variant: 'destructive',
      });
      console.error('Error updating role:', error);
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      // Delete from profiles (this will cascade to other tables if FK is set)
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (profileError) throw profileError;

      // Delete from user_roles
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (roleError) throw roleError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({
        title: "Foydalanuvchi o'chirildi",
        description: "Foydalanuvchi muvaffaqiyatli o'chirildi.",
      });
    },
    onError: (error) => {
      toast({
        title: 'Xatolik',
        description: "Foydalanuvchini o'chirib bo'lmadi.",
        variant: 'destructive',
      });
      console.error('Error deleting user:', error);
    },
  });
}
