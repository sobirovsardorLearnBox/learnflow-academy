import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { cn } from '@/lib/utils';

interface PushNotificationToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function PushNotificationToggle({ 
  className,
  showLabel = true 
}: PushNotificationToggleProps) {
  const { 
    isSupported, 
    permission, 
    isSubscribed, 
    isLoading, 
    subscribe, 
    unsubscribe 
  } = usePushNotifications();

  // Don't render if not supported
  if (!isSupported) {
    return null;
  }

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const isBlocked = permission === 'denied';

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {showLabel && (
        <div className="flex items-center gap-2">
          {isSubscribed ? (
            <Bell className="h-4 w-4 text-primary" />
          ) : (
            <BellOff className="h-4 w-4 text-muted-foreground" />
          )}
          <Label 
            htmlFor="push-notifications" 
            className="text-sm font-medium cursor-pointer"
          >
            Push bildirishnomalar
          </Label>
        </div>
      )}
      
      <div className="flex items-center gap-2">
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <Switch
            id="push-notifications"
            checked={isSubscribed}
            onCheckedChange={handleToggle}
            disabled={isBlocked || isLoading}
          />
        )}
      </div>

      {isBlocked && (
        <span className="text-xs text-destructive">
          Bloklangan
        </span>
      )}
    </div>
  );
}
