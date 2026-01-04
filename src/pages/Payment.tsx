import { motion } from 'framer-motion';
import { CreditCard, MessageSquare, ExternalLink, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { PaymentStatusBadge } from '@/components/dashboard/PaymentBanner';
import { useUserPayments } from '@/hooks/usePayments';
import { format } from 'date-fns';

export default function Payment() {
  const { user } = useAuth();
  const { data: payments, isLoading } = useUserPayments(user?.user_id);

  if (!user) return null;

  const statusLabels: Record<string, string> = {
    approved: 'Tasdiqlangan',
    pending: 'Kutilmoqda',
    blocked: 'Bloklangan',
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">To'lov va obuna</h1>
          <p className="text-muted-foreground mt-1">Obunangizni boshqaring va to'lov tarixini ko'ring</p>
        </div>

        {/* Current Status */}
        <Card variant="glass">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Joriy obuna</CardTitle>
              <PaymentStatusBadge status={user.paymentStatus} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 border border-border">
              <div>
                <p className="text-2xl font-bold">29.99$<span className="text-sm font-normal text-muted-foreground">/oy</span></p>
                <p className="text-sm text-muted-foreground mt-1">Barcha kurslarga to'liq kirish</p>
              </div>
              {user.paymentStatus === 'approved' && payments && payments.length > 0 && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Oxirgi to'lov</p>
                  <p className="font-medium">{payments[0].month} {payments[0].year}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment Instructions */}
        <Card className="border-primary/30 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5" />
          <CardHeader className="relative">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Qanday to'lash mumkin
            </CardTitle>
            <CardDescription>
              To'lovni amalga oshirish uchun quyidagi qadamlarni bajaring
            </CardDescription>
          </CardHeader>
          <CardContent className="relative space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border">
                <span className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">1</span>
                <div>
                  <p className="font-medium">Telegram orqali to'lov administratoriga murojaat qiling</p>
                  <p className="text-sm text-muted-foreground mt-1">To'lov jarayonini boshlash uchun xabar yuboring</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border">
                <span className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">2</span>
                <div>
                  <p className="font-medium">To'lovni amalga oshiring</p>
                  <p className="text-sm text-muted-foreground mt-1">Administrator tomonidan berilgan ko'rsatmalarga amal qiling</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border">
                <span className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">3</span>
                <div>
                  <p className="font-medium">Tasdiqlashni kuting</p>
                  <p className="text-sm text-muted-foreground mt-1">To'lovingiz tekshirilib, akkauntingiz faollashtiriladi</p>
                </div>
              </div>
            </div>

            <Button variant="premium" size="xl" className="w-full" asChild>
              <a href="https://t.me/config_player_admin" target="_blank" rel="noopener noreferrer">
                <MessageSquare className="w-5 h-5 mr-2" />
                @config_player_admin ga murojaat qiling
                <ExternalLink className="w-4 h-4 ml-2" />
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle>To'lov tarixi</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : !payments || payments.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Hali to'lov tarixi yo'q</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map((payment, index) => (
                  <motion.div
                    key={payment.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        payment.status === 'approved' ? 'bg-success/20' : 
                        payment.status === 'pending' ? 'bg-warning/20' : 'bg-destructive/20'
                      }`}>
                        <CreditCard className={`w-5 h-5 ${
                          payment.status === 'approved' ? 'text-success' : 
                          payment.status === 'pending' ? 'text-warning' : 'text-destructive'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium">{payment.month} {payment.year}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(payment.created_at), 'dd.MM.yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {payment.amount && <p className="font-semibold">{payment.amount}$</p>}
                      <PaymentStatusBadge status={payment.status} />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
