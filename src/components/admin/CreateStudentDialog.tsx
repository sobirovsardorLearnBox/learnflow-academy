import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, AlertCircle, Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';

const userSchema = z.object({
  name: z.string().min(2, 'Ism kamida 2 belgidan iborat bo\'lishi kerak'),
  email: z.string().email('To\'g\'ri email kiriting'),
  password: z.string().min(6, 'Parol kamida 6 belgidan iborat bo\'lishi kerak'),
});

interface CreateStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
}

export function CreateStudentDialog({ open, onOpenChange, groupId, groupName }: CreateStudentDialogProps) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate input
    const validation = userSchema.safeParse({ name, email, password });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('Tizimga kirish kerak');
        return;
      }

      // Create user with student role
      const response = await supabase.functions.invoke('create-user', {
        body: { email, password, name, role: 'student' },
      });

      if (response.error) {
        setError(response.error.message || 'Foydalanuvchi yaratishda xatolik');
        return;
      }

      if (response.data?.error) {
        setError(response.data.error);
        return;
      }

      const newUserId = response.data?.user?.id;

      if (newUserId) {
        // Add student to the group as approved member
        const { error: memberError } = await supabase.from('group_members').insert({
          group_id: groupId,
          user_id: newUserId,
          is_approved: true,
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
        });

        if (memberError) {
          console.error('Error adding student to group:', memberError);
          // User created but not added to group
          toast({
            title: 'Talaba yaratildi',
            description: `${name} yaratildi, lekin guruhga qo'shishda xatolik yuz berdi.`,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Talaba yaratildi!',
            description: `${name} "${groupName}" guruhiga qo'shildi.`,
          });
        }
      }

      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-group-members'] });
      queryClient.invalidateQueries({ queryKey: ['admin-groups'] });
      
      // Close dialog and reset form
      onOpenChange(false);
      resetForm();
    } catch (err) {
      setError('Xatolik yuz berdi. Qaytadan urinib ko\'ring.');
      console.error('Create student error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Yangi talaba yaratish</DialogTitle>
          <DialogDescription>
            "{groupName}" guruhiga yangi talaba qo'shing.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </motion.div>
          )}

          <div className="space-y-2">
            <Label htmlFor="student-name">To'liq ism</Label>
            <Input
              id="student-name"
              type="text"
              placeholder="Ism Familiya"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="student-email">Email</Label>
            <Input
              id="student-email"
              type="email"
              placeholder="talaba@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="student-password">Parol</Label>
            <div className="relative">
              <Input
                id="student-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Bekor qilish
            </Button>
            <Button
              type="submit"
              variant="premium"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Yaratilmoqda...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Yaratish
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
