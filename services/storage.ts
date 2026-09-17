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

