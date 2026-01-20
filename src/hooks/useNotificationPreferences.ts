import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface NotificationPreferences {
  id: string;
  user_id: string;
  system_notifications: boolean;
  new_lesson_notifications: boolean;
  reminder_notifications: boolean;
  achievement_notifications: boolean;
  payment_notifications: boolean;
  created_at: string;
  updated_at: string;
}

const defaultPreferences: Omit<NotificationPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  system_notifications: true,
  new_lesson_notifications: true,
  reminder_notifications: true,
  achievement_notifications: true,
  payment_notifications: true,
};

export function useNotificationPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['notification-preferences', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      // Return data or null (user hasn't set preferences yet)
      return data as NotificationPreferences | null;
    },
    enabled: !!user?.id,
  });

  const updatePreferences = useMutation({
    mutationFn: async (updates: Partial<Omit<NotificationPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Check if preferences exist
      const { data: existing } = await supabase
        .from('notification_preferences')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('notification_preferences')
          .update(updates)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Insert new with defaults
        const { error } = await supabase
          .from('notification_preferences')
          .insert({
            user_id: user.id,
            ...defaultPreferences,
            ...updates,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences', user?.id] });
      toast.success("Notification sozlamalari saqlandi");
    },
    onError: (error) => {
      console.error('Failed to update preferences:', error);
      toast.error("Sozlamalarni saqlashda xatolik");
    },
  });

  // Get effective preferences (with defaults if not set)
  const effectivePreferences = preferences || {
    ...defaultPreferences,
    id: '',
    user_id: user?.id || '',
    created_at: '',
    updated_at: '',
  };

  return {
    preferences: effectivePreferences,
    isLoading,
    updatePreferences: updatePreferences.mutate,
    isUpdating: updatePreferences.isPending,
  };
}
