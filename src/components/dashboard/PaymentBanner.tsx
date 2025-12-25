import { motion } from 'framer-motion';
import { AlertTriangle, CreditCard, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PaymentStatus } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface PaymentBannerProps {
  status: PaymentStatus;
}

export function PaymentBanner({ status }: PaymentBannerProps) {
  if (status === 'approved') return null;

  const statusConfig = {
    pending: {
      icon: AlertTriangle,
      title: 'Payment Pending',
      description: 'Your payment is being reviewed. Content will be unlocked once approved.',
      color: 'from-warning/20 to-warning/10',
      borderColor: 'border-warning/30',
      iconColor: 'text-warning',
    },
    blocked: {
      icon: XCircle,
      title: 'Account Blocked',
      description: 'Your account has been blocked. Please contact admin to resolve.',
      color: 'from-destructive/20 to-destructive/10',
      borderColor: 'border-destructive/30',
      iconColor: 'text-destructive',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <Card className={cn('border overflow-hidden', config.borderColor)}>
        <div className={cn('absolute inset-0 bg-gradient-to-r', config.color)} />
        <CardContent className="relative p-4 flex items-center gap-4">
          <div className={cn('p-3 rounded-xl bg-background/50', config.iconColor)}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">{config.title}</h3>
            <p className="text-sm text-muted-foreground">{config.description}</p>
          </div>
          <div className="text-right space-y-2">
            <p className="text-sm text-muted-foreground">Contact for payment:</p>
            <Button variant="outline" size="sm" asChild>
              <a href="https://t.me/config_player_admin" target="_blank" rel="noopener noreferrer">
                <CreditCard className="w-4 h-4 mr-2" />
                @config_player_admin
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
}

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  const config = {
    approved: { icon: CheckCircle2, label: 'Approved', color: 'bg-success/20 text-success' },
    pending: { icon: AlertTriangle, label: 'Pending', color: 'bg-warning/20 text-warning' },
    blocked: { icon: XCircle, label: 'Blocked', color: 'bg-destructive/20 text-destructive' },
  };

  const { icon: Icon, label, color } = config[status];

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', color)}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}
