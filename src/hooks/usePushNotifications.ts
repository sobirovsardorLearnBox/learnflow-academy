import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission | 'unsupported';
  isSubscribed: boolean;
  isLoading: boolean;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: 'unsupported',
    isSubscribed: false,
    isLoading: true,
  });

  // Check if push notifications are supported
  useEffect(() => {
    const isSupported = 'serviceWorker' in navigator && 
                        'PushManager' in window && 
                        'Notification' in window;
    
    setState(prev => ({
      ...prev,
      isSupported,
      permission: isSupported ? Notification.permission : 'unsupported',
      isLoading: false,
    }));
  }, []);

  // Check subscription status when user logs in
  useEffect(() => {
    if (!user || !state.isSupported) return;

    const checkSubscription = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        setState(prev => ({
          ...prev,
          isSubscribed: !!subscription,
        }));
      } catch (error) {
        console.error('Error checking push subscription:', error);
      }
    };

    checkSubscription();
  }, [user, state.isSupported]);

  // Get VAPID public key from server
  const getVapidPublicKey = async (): Promise<string | null> => {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/push-notifications/vapid-public-key`);
      const data = await response.json();
      return data.publicKey;
    } catch (error) {
      console.error('Failed to get VAPID key:', error);
      return null;
    }
  };

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!state.isSupported || !user) {
      toast.error("Push bildirishnomalar qo'llab-quvvatlanmaydi");
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Request permission
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission }));

      if (permission !== 'granted') {
        toast.error("Bildirishnoma ruxsati berilmadi");
        setState(prev => ({ ...prev, isLoading: false }));
        return false;
      }

      // Get VAPID public key
      const vapidPublicKey = await getVapidPublicKey();
      if (!vapidPublicKey) {
        toast.error("Server bilan bog'lanishda xatolik");
        setState(prev => ({ ...prev, isLoading: false }));
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });

      // Send subscription to server
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/push-notifications/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
            auth: arrayBufferToBase64(subscription.getKey('auth')),
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription');
      }

      setState(prev => ({ ...prev, isSubscribed: true, isLoading: false }));
      toast.success("Push bildirishnomalar yoqildi!");
      return true;
    } catch (error) {
      console.error('Push subscription error:', error);
      toast.error("Bildirishnomalarni yoqishda xatolik");
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [state.isSupported, user]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!state.isSupported || !user) return false;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe locally
        await subscription.unsubscribe();

        // Notify server
        const { data: { session } } = await supabase.auth.getSession();
        
        await fetch(`${SUPABASE_URL}/functions/v1/push-notifications/unsubscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
      }

      setState(prev => ({ ...prev, isSubscribed: false, isLoading: false }));
      toast.success("Push bildirishnomalar o'chirildi");
      return true;
    } catch (error) {
      console.error('Push unsubscribe error:', error);
      toast.error("Bildirishnomalarni o'chirishda xatolik");
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [state.isSupported, user]);

  // Send push notification (for admin/teacher)
  const sendPushNotification = useCallback(async (params: {
    targetUserId?: string;
    targetGroupId?: string;
    title: string;
    message: string;
    type?: string;
    data?: Record<string, unknown>;
  }) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/push-notifications/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(params),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send');
      }

      return result;
    } catch (error) {
      console.error('Send push error:', error);
      throw error;
    }
  }, []);

  return {
    ...state,
    subscribe,
    unsubscribe,
    sendPushNotification,
  };
}

// Helper functions
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return '';
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
