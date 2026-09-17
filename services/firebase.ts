import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut, 
  onAuthStateChanged,
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  setLogLevel,
  doc, 
  collection, 
  onSnapshot, 
  setDoc, 
  getDocs, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy 
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { safeAppStorage } from './storage';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);

// Set log level to 'silent' to silence harmless background offline-mode reconnect notices
setLogLevel('silent');

// CRITICAL: Initialize Firestore using auto-detect long polling and persistent cache to ensure 100% reliable
// backend connectivity across container reverse proxies, sandboxed iframes, and mobile networks.
const configWithDb = firebaseConfig as any;
const firestoreDbId = configWithDb.firestoreDatabaseId || '(default)';

function createFirestoreInstance() {
  try {
    return initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    }, firestoreDbId);
  } catch {
    try {
      return initializeFirestore(app, {
        experimentalAutoDetectLongPolling: true,
      }, firestoreDbId);
    } catch {
      return getFirestore(app, firestoreDbId);
    }
  }
}

export const db = createFirestoreInstance();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export { onAuthStateChanged };
export type { FirebaseUser };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection on boot
export async function testFirestoreConnection(): Promise<boolean> {
  // If the device reports offline, immediately run in offline cache mode without generating network errors
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }

  try {
    const checkPromise = getDoc(doc(db, 'test', 'connection'));
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500));
    const snap = await Promise.race([checkPromise, timeoutPromise]);
    if (snap && 'metadata' in snap) {
      return !snap.metadata.fromCache;
    }
    return false;
  } catch (error: any) {
    return false;
  }
}

// Auth Helpers
export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

export async function loginWithFirebaseEmail(email: string, pass: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    return userCredential.user;
  } catch (error) {
    console.warn('Firebase email auth notice:', error);
    throw error;
  }
}

export async function logoutUser() {
  try {
    clearActiveDbUserSession();
    await fbSignOut(auth);
  } catch (error) {
    console.error('Logout failed:', error);
    throw error;
  }
}

// Persistent Database User Session in safe storage
const DB_USER_SESSION_KEY = 'dpl_db_authenticated_user';

export function saveActiveDbUserSession(user: any): void {
  try {
    safeAppStorage.setItem(DB_USER_SESSION_KEY, JSON.stringify(user));
  } catch (err) {
    console.warn('Failed to persist db user session:', err);
  }
}

export function getActiveDbUserSession(): any | null {
  try {
    const raw = safeAppStorage.getItem(DB_USER_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

export function clearActiveDbUserSession(): void {
  try {
    safeAppStorage.removeItem(DB_USER_SESSION_KEY);
  } catch (err) {
    console.warn('Failed to clear db user session:', err);
  }
}

