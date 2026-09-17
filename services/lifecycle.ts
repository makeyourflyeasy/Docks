/**
 * Application Lifecycle & Multitasking Manager
 * Ensures smooth resumption when users switch apps, check gallery,
 * background the browser, or return to the application.
 */

type LifecycleListener = (state: 'foreground' | 'background') => void;

class AppLifecycleManager {
  private listeners: Set<LifecycleListener> = new Set();
  private isBackgrounded: boolean = false;
  private lastActiveTimestamp: number = Date.now();

  constructor() {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      this.init();
    }
  }

  private init() {
    // Visibility API
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.handleBackground();
      } else if (document.visibilityState === 'visible') {
        this.handleForeground();
      }
    });

    // Page hide / show (bfcache & mobile app switching)
    window.addEventListener('pagehide', () => this.handleBackground());
    window.addEventListener('pageshow', () => this.handleForeground());

    // Mobile freeze / resume
    window.addEventListener('freeze', () => this.handleBackground());
    window.addEventListener('resume', () => this.handleForeground());

    // Window focus / blur
    window.addEventListener('blur', () => {
      // User may be clicking another window or task switcher
      this.lastActiveTimestamp = Date.now();
    });

    window.addEventListener('focus', () => {
      this.handleForeground();
    });
  }

  private handleBackground() {
    if (this.isBackgrounded) return;
    this.isBackgrounded = true;
    this.lastActiveTimestamp = Date.now();
    this.listeners.forEach(fn => {
      try {
        fn('background');
      } catch (err) {
        console.warn('Lifecycle background listener error:', err);
      }
    });
  }

  private handleForeground() {
    if (!this.isBackgrounded) return;
    this.isBackgrounded = false;
    this.lastActiveTimestamp = Date.now();
    this.listeners.forEach(fn => {
      try {
        fn('foreground');
      } catch (err) {
        console.warn('Lifecycle foreground listener error:', err);
      }
    });
  }

  public subscribe(listener: LifecycleListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public isAppBackgrounded(): boolean {
    return this.isBackgrounded;
  }

  public getLastActive(): number {
    return this.lastActiveTimestamp;
  }
}

export const appLifecycle = new AppLifecycleManager();
