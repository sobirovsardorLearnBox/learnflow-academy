import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UserPayment {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'blocked';
  amount: number | null;
  month: string;
  year: number;
  notes: string | null;
  created_at: string;
  approved_at: string | null;
}

export const useUserPayments = (userId?: string) => {
  return useQuery({
    queryKey: ['user_payments', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as UserPayment[];
    },
    enabled: !!userId,
  });
};
