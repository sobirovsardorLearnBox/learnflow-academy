import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

interface NotificationsResponse {
  success: boolean;
  data?: {
    notifications: Notification[];
    unreadCount: number;
  };
  error?: string;
}

const NOTIFICATIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notifications`;

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  
  return {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
  };
}

export function useNotifications(options: { enabled?: boolean; pollingInterval?: number } = {}) {
  const { enabled = true, pollingInterval = 30000 } = options;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [previousUnreadCount, setPreviousUnreadCount] = useState(0);

  // Fetch notifications
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      
      const response = await fetch(NOTIFICATIONS_URL, {
        method: 'GET',
        headers,
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      
      const result: NotificationsResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Unknown error');
      }
      
      return result.data;
    },
    enabled,
    refetchInterval: pollingInterval,
    staleTime: 10000,
  });

  // Show toast when new notifications arrive
  useEffect(() => {
    if (data?.unreadCount && data.unreadCount > previousUnreadCount && previousUnreadCount > 0) {
      const newNotifications = data.notifications
        .filter(n => !n.read)
        .slice(0, data.unreadCount - previousUnreadCount);
      
      newNotifications.forEach(n => {
        toast({
          title: n.title,
          description: n.message,
        });
      });
    }
    
    if (data?.unreadCount !== undefined) {
      setPreviousUnreadCount(data.unreadCount);
    }
  }, [data?.unreadCount, previousUnreadCount, data?.notifications, toast]);

  // Mark as read mutation
  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${NOTIFICATIONS_URL}/read`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ notification_id: notificationId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark as read');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mark all as read mutation
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${NOTIFICATIONS_URL}/read-all`, {
        method: 'POST',
        headers,
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark all as read');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Clear all notifications mutation
  const clearAll = useMutation({
    mutationFn: async () => {
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${NOTIFICATIONS_URL}/clear`, {
        method: 'DELETE',
        headers,
      });
      
      if (!response.ok) {
        throw new Error('Failed to clear notifications');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
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
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${NOTIFICATIONS_URL}/send`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          target_user_id: params.targetUserId,
          target_group_id: params.targetGroupId,
          type: params.type,
          title: params.title,
          message: params.message,
          data: params.data,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send notification');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Xabar yuborildi',
        description: `${data.data?.recipientCount || 0} ta foydalanuvchiga yuborildi`,
      });
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
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${NOTIFICATIONS_URL}/unread-count`, {
        method: 'GET',
        headers,
      });
      
      if (!response.ok) {
        return { unreadCount: 0 };
      }
      
      const result = await response.json();
      return { unreadCount: result.data?.unreadCount || 0 };
    },
    enabled,
    refetchInterval: 15000,
    staleTime: 5000,
  });
}
