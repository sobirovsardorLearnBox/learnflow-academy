import { useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

interface DbNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  read: boolean;
  created_at: string;
}

function mapDbToNotification(db: DbNotification): Notification {
  return {
    id: db.id,
    type: db.type,
    title: db.title,
    message: db.message,
    data: db.data || undefined,
    read: db.read,
    createdAt: db.created_at,
  };
}

export function useNotifications(options: { enabled?: boolean; pollingInterval?: number } = {}) {
  const { enabled = true, pollingInterval = 30000 } = options;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const previousUnreadCountRef = useRef(0);

  // Fetch notifications from database
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return { notifications: [], unreadCount: 0 };

      const { data: notifications, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const mapped = (notifications as DbNotification[] || []).map(mapDbToNotification);
      const unreadCount = mapped.filter(n => !n.read).length;

      return { notifications: mapped, unreadCount };
    },
    enabled: enabled && !!user?.id,
    refetchInterval: pollingInterval,
    staleTime: 10000,
  });

  // Realtime subscription for new notifications
  useEffect(() => {
    if (!user?.id || !enabled) return;

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = mapDbToNotification(payload.new as DbNotification);
          
          // Show toast for new notification
          toast({
            title: newNotification.title,
            description: newNotification.message,
          });

          // Invalidate query to refetch
          queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, enabled, queryClient, toast]);

  // Mark as read mutation
  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  // Mark all as read mutation
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  // Clear all notifications mutation
  const clearAll = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  return {
    notifications: data?.notifications || [],
    unreadCount: data?.unreadCount || 0,
    isLoading,
    error,
    refetch,
    markAsRead: markAsRead.mutateAsync,
    markAllAsRead: markAllAsRead.mutateAsync,
    clearAll: clearAll.mutateAsync,
    isMarkingAsRead: markAsRead.isPending,
    isMarkingAllAsRead: markAllAsRead.isPending,
    isClearing: clearAll.isPending,
  };
}

// Hook to send notifications (for admin/teacher)
export function useSendNotification() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      targetUserId?: string;
      targetGroupId?: string;
      type: string;
      title: string;
      message: string;
      data?: Record<string, unknown>;
    }) => {
      let recipientIds: string[] = [];

      // If targeting a specific user
      if (params.targetUserId) {
        recipientIds = [params.targetUserId];
      }
      // If targeting a group
      else if (params.targetGroupId) {
        const { data: members, error } = await supabase
          .from('group_members')
          .select('user_id')
          .eq('group_id', params.targetGroupId)
          .eq('is_approved', true);

        if (error) throw error;
        recipientIds = members?.map(m => m.user_id) || [];
      }

      if (recipientIds.length === 0) {
        throw new Error('No recipients found');
      }

      // Insert notifications for all recipients
      const notifications = recipientIds.map(userId => ({
        user_id: userId,
        type: params.type,
        title: params.title,
        message: params.message,
        data: params.data ? JSON.parse(JSON.stringify(params.data)) : null,
      }));

      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) throw error;

      return { recipientCount: recipientIds.length };
    },
    onSuccess: (data) => {
      toast({
        title: 'Xabar yuborildi',
        description: `${data?.recipientCount || 0} ta foydalanuvchiga yuborildi`,
      });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => {
      toast({
        title: 'Xatolik',
        description: error instanceof Error ? error.message : 'Xabar yuborishda xatolik',
        variant: 'destructive',
      });
    },
  });
}

// Unread count only (lighter query)
export function useUnreadCount(enabled = true) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['notifications', 'unread-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return { unreadCount: 0 };

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) return { unreadCount: 0 };
      return { unreadCount: count || 0 };
    },
    enabled: enabled && !!user?.id,
    refetchInterval: 15000,
    staleTime: 5000,
  });
}
