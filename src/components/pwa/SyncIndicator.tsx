import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, CloudOff, RefreshCw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useOptionalBackgroundSync } from '@/contexts/BackgroundSyncContext';
import { usePWA } from '@/hooks/usePWA';

export const SyncIndicator = memo(function SyncIndicator() {
  const syncContext = useOptionalBackgroundSync();
  const { isOnline } = usePWA();

  // If no sync context or no data, don't render
  if (!syncContext) {
    return null;
  }

  const { isSyncing, pendingCount, lastSyncAt, triggerSync } = syncContext;

  // Don't show if online and no pending data
  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null;
  }

  const getStatusIcon = () => {
    if (isSyncing) {
      return <RefreshCw className="w-4 h-4 animate-spin" />;
    }
    if (!isOnline) {
      return <CloudOff className="w-4 h-4" />;
    }
    if (pendingCount === 0) {
      return <Check className="w-4 h-4" />;
    }
    return <Cloud className="w-4 h-4" />;
  };

  const getStatusText = () => {
    if (isSyncing) {
      return "Sinxronlanmoqda...";
    }
    if (!isOnline) {
      return `${pendingCount} ta yozuv kutmoqda`;
    }
    if (pendingCount > 0) {
      return `${pendingCount} ta sinxronlanmagan`;
    }
    return "Hammasi sinxronlangan";
  };

  const formatLastSync = () => {
    if (!lastSyncAt) return null;
    const date = new Date(lastSyncAt);
    return date.toLocaleTimeString('uz-UZ', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed bottom-4 right-4 z-40"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={pendingCount > 0 && isOnline ? "default" : "outline"}
              size="sm"
              className="gap-2 shadow-lg"
              onClick={isOnline && pendingCount > 0 ? triggerSync : undefined}
              disabled={isSyncing || !isOnline}
            >
              {getStatusIcon()}
              <span className="hidden sm:inline text-xs">
                {getStatusText()}
              </span>
              {pendingCount > 0 && (
                <span className="flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full bg-destructive text-destructive-foreground">
                  {pendingCount}
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <div className="text-sm">
              <p className="font-medium">{getStatusText()}</p>
              {lastSyncAt && (
                <p className="text-muted-foreground text-xs">
                  Oxirgi sinxronlash: {formatLastSync()}
                </p>
              )}
              {!isOnline && (
                <p className="text-warning text-xs mt-1">
                  Internet qaytganda avtomatik sinxronlanadi
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </motion.div>
    </AnimatePresence>
  );
});
