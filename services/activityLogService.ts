import { safeAppStorage } from './storage';
import { db } from './firebase';
import { collection, addDoc, onSnapshot, query, orderBy, limit } from 'firebase/firestore';

export interface ActivityLogItem {
  id: string;
  timestamp: string;
  userId: string;
  userRole: string;
  action: string;
  details: string;
  metadata?: any;
  title?: string;
  role?: string;
  description?: string;
  performedBy?: string;
}

export type ActivityLogRecord = ActivityLogItem;

const STORAGE_KEY = 'dpl_system_activity_logs';

export const logActivity = async (
  action: string,
  details: string,
  userRole: string = 'System',
  userId: string = 'SYS-01',
  metadata?: any
): Promise<void> => {
  const newLog: ActivityLogItem = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    timestamp: new Date().toISOString(),
    userId,
    userRole,
    action,
    details,
    metadata
  };

  // 1. Save locally
  try {
    const existing = safeAppStorage.getJSON<ActivityLogItem[]>(STORAGE_KEY, []) || [];
    const updated = [newLog, ...existing.slice(0, 199)]; // Keep latest 200
    safeAppStorage.setJSON(STORAGE_KEY, updated);
  } catch (err) {
    console.warn('Could not save log to local storage:', err);
  }

  // 2. Save to Firestore if available
  if (db) {
    try {
      await addDoc(collection(db, 'activity_logs'), newLog);
    } catch (err) {
      console.warn('Could not save activity log to Firestore:', err);
    }
  }
};

export const subscribeToActivityLogs = (
  callback: (logs: ActivityLogItem[]) => void
): (() => void) => {
  // Initial local state
  const localLogs = safeAppStorage.getJSON<ActivityLogItem[]>(STORAGE_KEY, []) || [];
  if (localLogs.length > 0) {
    callback(localLogs);
  }

  if (!db) {
    return () => {};
  }

  try {
    const q = query(collection(db, 'activity_logs'), orderBy('timestamp', 'desc'), limit(100));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const firestoreLogs: ActivityLogItem[] = [];
        snapshot.forEach((doc) => {
          firestoreLogs.push({ id: doc.id, ...(doc.data() as any) });
        });
        if (firestoreLogs.length > 0) {
          safeAppStorage.setJSON(STORAGE_KEY, firestoreLogs);
          callback(firestoreLogs);
        } else {
          callback(localLogs);
        }
      },
      (error) => {
        console.warn('Activity logs snapshot error:', error);
        callback(localLogs);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Could not listen to Firestore activity logs:', err);
    return () => {};
  }
};
