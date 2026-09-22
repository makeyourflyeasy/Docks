/**
 * Safe browser storage wrapper that handles sandboxed iframes,
 * private browsing, and quota limit errors without crashing.
 */

/**
 * Safe browser storage wrapper that handles sandboxed iframes,
 * private browsing, and quota limit errors without crashing.
 */

// In-memory memory cache for bulletproof resilience when multitasking
const memoryCache: Record<string, string> = {};

export const safeSessionStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        return window.sessionStorage.getItem(key);
      }
    } catch (_) {}
    return memoryCache[key] ?? null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(key, value);
      }
    } catch (_) {}
    memoryCache[key] = value;
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.removeItem(key);
      }
    } catch (_) {}
    delete memoryCache[key];
  }
};

export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (_) {}
    return memoryCache[key] ?? null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (_) {}
    memoryCache[key] = value;
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (_) {}
    delete memoryCache[key];
  }
};

/**
 * Universal Unified Storage:
 * Reads from in-memory, localStorage, or sessionStorage.
 * Writes to BOTH localStorage and sessionStorage as well as memoryCache.
 * Ensures state is NEVER lost if user switches to gallery, another app,
 * or if OS freezes / restores the browser tab.
 */
export const safeAppStorage = {
  getItem: (key: string): string | null => {
    if (memoryCache[key] !== undefined) {
      return memoryCache[key];
    }
    const fromLocal = safeLocalStorage.getItem(key);
    if (fromLocal !== null) {
      memoryCache[key] = fromLocal;
      return fromLocal;
    }
    const fromSession = safeSessionStorage.getItem(key);
    if (fromSession !== null) {
      memoryCache[key] = fromSession;
      return fromSession;
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    memoryCache[key] = value;
    safeLocalStorage.setItem(key, value);
    safeSessionStorage.setItem(key, value);
  },
  removeItem: (key: string): void => {
    delete memoryCache[key];
    safeLocalStorage.removeItem(key);
    safeSessionStorage.removeItem(key);
  },
  clear: (): void => {
    Object.keys(memoryCache).forEach((k) => delete memoryCache[k]);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    } catch (_) {}
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.clear();
      }
    } catch (_) {}
  },
  wipeAppOperationalData: (preserveAuth: boolean = true): void => {
    const authUser = preserveAuth ? safeAppStorage.getItem('dpl_auth_user') : null;
    const userRole = preserveAuth ? safeAppStorage.getItem('dpl_user_role') : null;

    // 1. Clear memory cache for all dpl keys
    Object.keys(memoryCache).forEach((k) => {
      if (k.startsWith('dpl_') || k.startsWith('dpl-')) {
        delete memoryCache[k];
      }
    });

    // 2. Clear localStorage keys
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key && (key.startsWith('dpl_') || key.startsWith('dpl-'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => window.localStorage.removeItem(k));
      }
    } catch (_) {}

    // 3. Clear sessionStorage keys
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const key = window.sessionStorage.key(i);
          if (key && (key.startsWith('dpl_') || key.startsWith('dpl-'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => window.sessionStorage.removeItem(k));
      }
    } catch (_) {}

    // 4. Restore auth session if requested
    if (preserveAuth) {
      if (authUser) safeAppStorage.setItem('dpl_auth_user', authUser);
      if (userRole) safeAppStorage.setItem('dpl_user_role', userRole);
    }
  },
  getJSON: <T>(key: string, fallback: T): T => {
    try {
      const val = safeAppStorage.getItem(key);
      if (val) return JSON.parse(val) as T;
    } catch (_) {}
    return fallback;
  },
  setJSON: <T>(key: string, value: T): void => {
    try {
      safeAppStorage.setItem(key, JSON.stringify(value));
    } catch (_) {}
  }
};

