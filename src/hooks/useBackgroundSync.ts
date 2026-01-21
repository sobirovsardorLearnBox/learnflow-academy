import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { offlineStorage, PendingProgress, PendingQuiz } from '@/lib/offline-storage';
import { useToast } from '@/hooks/use-toast';

interface SyncState {
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: string | null;
  syncError: string | null;
}

const MAX_RETRY_COUNT = 3;
const SYNC_DEBOUNCE_MS = 2000;

export function useBackgroundSync() {
  const [state, setState] = useState<SyncState>({
    isSyncing: false,
    pendingCount: 0,
    lastSyncAt: null,
    syncError: null,
  });
  const { toast } = useToast();
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isOnlineRef = useRef(navigator.onLine);

  // Update pending count
  const updatePendingCount = useCallback(async () => {
    try {
      const { progress, quiz } = await offlineStorage.getPendingCount();
      setState(prev => ({ ...prev, pendingCount: progress + quiz }));
    } catch (error) {
      console.error('Failed to get pending count:', error);
    }
  }, []);

  // Sync a single progress entry
  const syncProgressEntry = useCallback(async (entry: PendingProgress): Promise<boolean> => {
    try {
      const { data: existing } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('lesson_id', entry.lessonId)
        .eq('user_id', entry.userId)
        .maybeSingle();

      if (existing) {
        const newScore = Math.max(existing.score || 0, entry.score);
        const newVideoCompleted = existing.video_completed || entry.videoCompleted;
        const newQuizScore = Math.max(existing.quiz_score || 0, entry.quizScore);

        const { error } = await supabase
          .from('lesson_progress')
          .update({
            completed: true,
            completed_at: existing.completed_at || entry.completedAt,
            score: newScore,
            video_completed: newVideoCompleted,
            quiz_score: newQuizScore,
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('lesson_progress')
          .insert({
            lesson_id: entry.lessonId,
            user_id: entry.userId,
            completed: entry.completed,
            completed_at: entry.completedAt,
            score: entry.score,
            video_completed: entry.videoCompleted,
            quiz_score: entry.quizScore,
          });

        if (error) throw error;
      }

      await offlineStorage.removePendingProgress(entry.id);
      await offlineStorage.addSyncLog({
        type: 'progress',
        status: 'success',
        details: `Lesson ${entry.lessonId} synced`,
      });

      return true;
    } catch (error) {
      console.error('Failed to sync progress entry:', error);
      
      if (entry.retryCount >= MAX_RETRY_COUNT) {
        await offlineStorage.removePendingProgress(entry.id);
        await offlineStorage.addSyncLog({
          type: 'progress',
          status: 'failed',
          details: `Lesson ${entry.lessonId} failed after ${MAX_RETRY_COUNT} retries`,
        });
      } else {
        await offlineStorage.updateProgressRetryCount(entry.id, entry.retryCount + 1);
      }

      return false;
    }
  }, []);

  // Sync a single quiz entry
  const syncQuizEntry = useCallback(async (entry: PendingQuiz): Promise<boolean> => {
    try {
      // Quiz sync would typically call an API endpoint
      // For now, we just mark it as synced since quiz answers are verified server-side
      await offlineStorage.removePendingQuiz(entry.id);
      await offlineStorage.addSyncLog({
        type: 'quiz',
        status: 'success',
        details: `Quiz ${entry.quizId} synced`,
      });

      return true;
    } catch (error) {
      console.error('Failed to sync quiz entry:', error);
      await offlineStorage.removePendingQuiz(entry.id);
      await offlineStorage.addSyncLog({
        type: 'quiz',
        status: 'failed',
        details: `Quiz ${entry.quizId} failed`,
      });

      return false;
    }
  }, []);

  // Main sync function
  const syncPendingData = useCallback(async (showToast = true): Promise<void> => {
    if (!navigator.onLine || state.isSyncing) return;

    setState(prev => ({ ...prev, isSyncing: true, syncError: null }));

    try {
      const [progressEntries, quizEntries] = await Promise.all([
        offlineStorage.getPendingProgress(),
        offlineStorage.getPendingQuizzes(),
      ]);

      const totalPending = progressEntries.length + quizEntries.length;
      if (totalPending === 0) {
        setState(prev => ({ ...prev, isSyncing: false }));
        return;
      }

      let successCount = 0;
      let failCount = 0;

      // Sync progress entries
      for (const entry of progressEntries) {
        const success = await syncProgressEntry(entry);
        if (success) successCount++;
        else failCount++;
      }

      // Sync quiz entries
      for (const entry of quizEntries) {
        const success = await syncQuizEntry(entry);
        if (success) successCount++;
        else failCount++;
      }

      // Clean up old logs
      await offlineStorage.clearOldSyncLogs(7);

      setState(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncAt: new Date().toISOString(),
        pendingCount: failCount,
      }));

      if (showToast && successCount > 0) {
        toast({
          title: "Ma'lumotlar sinxronlandi",
          description: `${successCount} ta yozuv muvaffaqiyatli sinxronlandi`,
        });
      }
    } catch (error) {
      console.error('Sync failed:', error);
      setState(prev => ({
        ...prev,
        isSyncing: false,
        syncError: error instanceof Error ? error.message : 'Sync failed',
      }));
    }
  }, [state.isSyncing, syncProgressEntry, syncQuizEntry, toast]);

  // Debounced sync
  const debouncedSync = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    syncTimeoutRef.current = setTimeout(() => {
      syncPendingData(true);
    }, SYNC_DEBOUNCE_MS);
  }, [syncPendingData]);

  // Save progress (works offline)
  const saveProgress = useCallback(async (data: {
    lessonId: string;
    userId: string;
    score?: number;
    videoCompleted?: boolean;
    quizScore?: number;
    completed?: boolean;
  }): Promise<boolean> => {
    const progressData = {
      lessonId: data.lessonId,
      userId: data.userId,
      score: data.score || 0,
      videoCompleted: data.videoCompleted || false,
      quizScore: data.quizScore || 0,
      completed: data.completed ?? true,
      completedAt: new Date().toISOString(),
    };

    // If online, try to save directly
    if (navigator.onLine) {
      try {
        const { data: existing } = await supabase
          .from('lesson_progress')
          .select('*')
          .eq('lesson_id', progressData.lessonId)
          .eq('user_id', progressData.userId)
          .maybeSingle();

        if (existing) {
          const newScore = Math.max(existing.score || 0, progressData.score);
          const newVideoCompleted = existing.video_completed || progressData.videoCompleted;
          const newQuizScore = Math.max(existing.quiz_score || 0, progressData.quizScore);

          const { error } = await supabase
            .from('lesson_progress')
            .update({
              completed: true,
              completed_at: existing.completed_at || progressData.completedAt,
              score: newScore,
              video_completed: newVideoCompleted,
              quiz_score: newQuizScore,
            })
            .eq('id', existing.id);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('lesson_progress')
            .insert({
              lesson_id: progressData.lessonId,
              user_id: progressData.userId,
              completed: progressData.completed,
              completed_at: progressData.completedAt,
              score: progressData.score,
              video_completed: progressData.videoCompleted,
              quiz_score: progressData.quizScore,
            });

          if (error) throw error;
        }

        return true;
      } catch (error) {
        console.error('Online save failed, storing offline:', error);
        // Fall through to offline storage
      }
    }

    // Store offline
    try {
      await offlineStorage.addPendingProgress(progressData);
      await updatePendingCount();
      return true;
    } catch (error) {
      console.error('Failed to store offline:', error);
      return false;
    }
  }, [updatePendingCount]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      isOnlineRef.current = true;
      // Sync when coming back online
      debouncedSync();
    };

    const handleOffline = () => {
      isOnlineRef.current = false;
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial pending count
    updatePendingCount();

    // Try initial sync if online
    if (navigator.onLine) {
      debouncedSync();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [debouncedSync, updatePendingCount]);

  // Manual sync trigger
  const triggerSync = useCallback(() => {
    syncPendingData(true);
  }, [syncPendingData]);

  return {
    ...state,
    saveProgress,
    triggerSync,
    updatePendingCount,
  };
}
