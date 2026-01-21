/**
 * IndexedDB-based offline storage for background sync
 * Stores pending changes when offline and syncs when connection returns
 */

const DB_NAME = 'learnbox-offline';
const DB_VERSION = 1;
const STORES = {
  PENDING_PROGRESS: 'pending_progress',
  PENDING_QUIZ: 'pending_quiz',
  SYNC_LOG: 'sync_log',
} as const;

interface PendingProgress {
  id: string;
  lessonId: string;
  userId: string;
  score: number;
  videoCompleted: boolean;
  quizScore: number;
  completed: boolean;
  completedAt: string;
  createdAt: string;
  retryCount: number;
}

interface PendingQuiz {
  id: string;
  quizId: string;
  userId: string;
  selectedAnswer: number;
  createdAt: string;
  retryCount: number;
}

interface SyncLogEntry {
  id: string;
  type: 'progress' | 'quiz';
  status: 'success' | 'failed';
  timestamp: string;
  details?: string;
}

class OfflineStorage {
  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;

  private async openDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Pending progress store
        if (!db.objectStoreNames.contains(STORES.PENDING_PROGRESS)) {
          const progressStore = db.createObjectStore(STORES.PENDING_PROGRESS, { keyPath: 'id' });
          progressStore.createIndex('userId', 'userId', { unique: false });
          progressStore.createIndex('lessonId', 'lessonId', { unique: false });
          progressStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Pending quiz store
        if (!db.objectStoreNames.contains(STORES.PENDING_QUIZ)) {
          const quizStore = db.createObjectStore(STORES.PENDING_QUIZ, { keyPath: 'id' });
          quizStore.createIndex('userId', 'userId', { unique: false });
          quizStore.createIndex('quizId', 'quizId', { unique: false });
        }

        // Sync log store
        if (!db.objectStoreNames.contains(STORES.SYNC_LOG)) {
          const logStore = db.createObjectStore(STORES.SYNC_LOG, { keyPath: 'id' });
          logStore.createIndex('timestamp', 'timestamp', { unique: false });
          logStore.createIndex('type', 'type', { unique: false });
        }
      };
    });

    return this.dbPromise;
  }

  // Generate unique ID
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  // Progress operations
  async addPendingProgress(data: Omit<PendingProgress, 'id' | 'createdAt' | 'retryCount'>): Promise<string> {
    const db = await this.openDB();
    const id = this.generateId();
    
    const entry: PendingProgress = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.PENDING_PROGRESS, 'readwrite');
      const store = transaction.objectStore(STORES.PENDING_PROGRESS);
      const request = store.add(entry);

      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingProgress(): Promise<PendingProgress[]> {
    const db = await this.openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.PENDING_PROGRESS, 'readonly');
      const store = transaction.objectStore(STORES.PENDING_PROGRESS);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async removePendingProgress(id: string): Promise<void> {
    const db = await this.openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.PENDING_PROGRESS, 'readwrite');
      const store = transaction.objectStore(STORES.PENDING_PROGRESS);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateProgressRetryCount(id: string, retryCount: number): Promise<void> {
    const db = await this.openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.PENDING_PROGRESS, 'readwrite');
      const store = transaction.objectStore(STORES.PENDING_PROGRESS);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        if (getRequest.result) {
          const updated = { ...getRequest.result, retryCount };
          const putRequest = store.put(updated);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Quiz operations
  async addPendingQuiz(data: Omit<PendingQuiz, 'id' | 'createdAt' | 'retryCount'>): Promise<string> {
    const db = await this.openDB();
    const id = this.generateId();
    
    const entry: PendingQuiz = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.PENDING_QUIZ, 'readwrite');
      const store = transaction.objectStore(STORES.PENDING_QUIZ);
      const request = store.add(entry);

      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingQuizzes(): Promise<PendingQuiz[]> {
    const db = await this.openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.PENDING_QUIZ, 'readonly');
      const store = transaction.objectStore(STORES.PENDING_QUIZ);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async removePendingQuiz(id: string): Promise<void> {
    const db = await this.openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.PENDING_QUIZ, 'readwrite');
      const store = transaction.objectStore(STORES.PENDING_QUIZ);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Sync log operations
  async addSyncLog(entry: Omit<SyncLogEntry, 'id' | 'timestamp'>): Promise<void> {
    const db = await this.openDB();

    const logEntry: SyncLogEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.SYNC_LOG, 'readwrite');
      const store = transaction.objectStore(STORES.SYNC_LOG);
      const request = store.add(logEntry);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getSyncLogs(limit = 50): Promise<SyncLogEntry[]> {
    const db = await this.openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.SYNC_LOG, 'readonly');
      const store = transaction.objectStore(STORES.SYNC_LOG);
      const index = store.index('timestamp');
      const request = index.openCursor(null, 'prev');
      const results: SyncLogEntry[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor && results.length < limit) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clearOldSyncLogs(daysOld = 7): Promise<void> {
    const db = await this.openDB();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.SYNC_LOG, 'readwrite');
      const store = transaction.objectStore(STORES.SYNC_LOG);
      const index = store.index('timestamp');
      const range = IDBKeyRange.upperBound(cutoffDate.toISOString());
      const request = index.openCursor(range);

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Get pending count
  async getPendingCount(): Promise<{ progress: number; quiz: number }> {
    const [progress, quizzes] = await Promise.all([
      this.getPendingProgress(),
      this.getPendingQuizzes(),
    ]);
    return { progress: progress.length, quiz: quizzes.length };
  }

  // Clear all pending data (for testing/reset)
  async clearAllPending(): Promise<void> {
    const db = await this.openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [STORES.PENDING_PROGRESS, STORES.PENDING_QUIZ],
        'readwrite'
      );
      
      transaction.objectStore(STORES.PENDING_PROGRESS).clear();
      transaction.objectStore(STORES.PENDING_QUIZ).clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

// Singleton instance
export const offlineStorage = new OfflineStorage();

// Export types
export type { PendingProgress, PendingQuiz, SyncLogEntry };
