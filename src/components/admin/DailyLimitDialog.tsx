import { useState } from 'react';
import { Loader2, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DailyLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    user_id: string;
    name: string;
    daily_lesson_limit?: number;
  } | null;
}

export function DailyLimitDialog({ open, onOpenChange, user }: DailyLimitDialogProps) {
  const [limit, setLimit] = useState<number>(user?.daily_lesson_limit ?? 1);
  const queryClient = useQueryClient();

  // Update limit when user changes
  useState(() => {
    if (user) {
      setLimit(user.daily_lesson_limit ?? 1);
    }
  });

  const updateLimit = useMutation({
    mutationFn: async ({ userId, newLimit }: { userId: string; newLimit: number }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ daily_lesson_limit: newLimit } as any)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Kunlik limit muvaffaqiyatli yangilandi');
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Error updating daily limit:', error);
      toast.error('Limitni yangilashda xatolik yuz berdi');
    },
  });

  const handleSubmit = () => {
    if (user && limit >= 1) {
      updateLimit.mutate({ userId: user.user_id, newLimit: limit });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Kunlik dars limitini o'zgartirish
          </DialogTitle>
          <DialogDescription>
            {user?.name} uchun kuniga nechta dars tugatishi mumkinligini belgilang
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="limit">Kunlik dars limiti</Label>
            <Input
              id="limit"
              type="number"
              min={1}
              max={100}
              value={limit}
              onChange={(e) => setLimit(Math.max(1, parseInt(e.target.value) || 1))}
              className="text-center text-lg font-semibold"
            />
            <p className="text-xs text-muted-foreground">
              Talaba har kuni {limit} ta dars tugatishi mumkin
            </p>
          </div>

          {/* Quick select buttons */}
          <div className="flex gap-2">
            {[1, 2, 3, 5, 10].map((value) => (
              <Button
                key={value}
                variant={limit === value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLimit(value)}
                className="flex-1"
              >
                {value}
              </Button>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Bekor qilish
            </Button>
            <Button onClick={handleSubmit} disabled={updateLimit.isPending}>
              {updateLimit.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saqlanmoqda...
                </>
              ) : (
                'Saqlash'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
