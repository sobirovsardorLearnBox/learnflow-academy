import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';
import { Button } from '@/components/ui/button';

export const OfflineIndicator = memo(function OfflineIndicator() {
  const { isOnline, isUpdateAvailable, updateApp } = usePWA();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-50 bg-warning/90 backdrop-blur-sm text-warning-foreground px-4 py-2"
        >
          <div className="container mx-auto flex items-center justify-center gap-2 text-sm">
            <WifiOff className="w-4 h-4" />
            <span>Internet aloqasi yo'q. Offline rejimda ishlayapsiz.</span>
          </div>
        </motion.div>
      )}

      {isUpdateAvailable && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-50 bg-primary/90 backdrop-blur-sm text-primary-foreground px-4 py-2"
        >
          <div className="container mx-auto flex items-center justify-center gap-3 text-sm">
            <RefreshCw className="w-4 h-4" />
            <span>Yangi versiya mavjud!</span>
            <Button
              size="sm"
              variant="secondary"
              onClick={updateApp}
              className="h-7 text-xs"
            >
              Yangilash
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
