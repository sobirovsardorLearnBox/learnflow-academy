import React, { createContext, useContext, ReactNode } from 'react';
import { useBackgroundSync } from '@/hooks/useBackgroundSync';

interface BackgroundSyncContextType {
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: string | null;
  syncError: string | null;
  saveProgress: (data: {
    lessonId: string;
    userId: string;
    score?: number;
    videoCompleted?: boolean;
    quizScore?: number;
    completed?: boolean;
  }) => Promise<boolean>;
  triggerSync: () => void;
  updatePendingCount: () => Promise<void>;
}

const BackgroundSyncContext = createContext<BackgroundSyncContextType | null>(null);

export function BackgroundSyncProvider({ children }: { children: ReactNode }) {
  const syncState = useBackgroundSync();

  return (
    <BackgroundSyncContext.Provider value={syncState}>
      {children}
    </BackgroundSyncContext.Provider>
  );
}

export function useBackgroundSyncContext() {
  const context = useContext(BackgroundSyncContext);
  if (!context) {
    throw new Error('useBackgroundSyncContext must be used within a BackgroundSyncProvider');
  }
  return context;
}

// Optional: Hook that returns null if not within provider (for use in non-authenticated contexts)
export function useOptionalBackgroundSync() {
  return useContext(BackgroundSyncContext);
}
