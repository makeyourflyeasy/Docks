import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { safeAppStorage } from './storage';

export interface CompanyBranding {
  customLogo: string | null;
  companyName: string;
  subtitle: string;
  address: string;
  phone: string;
  cell: string;
  email: string;
  web: string;
  directorName?: string;
  directorTitle?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_BRANDING: CompanyBranding = {
  customLogo: null,
  companyName: 'DOCKS PRIVATE LIMITED',
  subtitle: 'CUSTOMS BONDED CARRIER',
  address: 'Office No. 14-B, First Floor, State Life Building No. 7, G-Allana Road Tower, Karachi.',
  phone: '+92-21-32330103, +92-21-32330104',
  cell: '+92-321-9222883, +92-321-8496006',
  email: 'director@dockspk.com',
  web: 'www.dockspk.com',
  directorName: 'Arbab Khan',
  directorTitle: 'Director',
};

const STORAGE_KEY = 'dpl_company_branding_v1';
const BRANDING_EVENT = 'dpl_branding_changed';

/**
 * Returns current branding synchronously from cache/storage to prevent UI flickering.
 */
export function getStoredBranding(): CompanyBranding {
  const stored = safeAppStorage.getJSON<Partial<CompanyBranding>>(STORAGE_KEY, {});
  const rawCompanyName = stored.companyName || DEFAULT_BRANDING.companyName;
  const normalizedCompanyName = (!rawCompanyName || rawCompanyName.toLowerCase().includes('docks'))
    ? 'DOCKS PRIVATE LIMITED'
    : rawCompanyName;

  return {
    ...DEFAULT_BRANDING,
    ...stored,
    companyName: normalizedCompanyName,
    subtitle: stored.subtitle || DEFAULT_BRANDING.subtitle,
    address: stored.address || DEFAULT_BRANDING.address,
    phone: stored.phone || DEFAULT_BRANDING.phone,
    cell: stored.cell || DEFAULT_BRANDING.cell,
    email: stored.email || DEFAULT_BRANDING.email,
    web: stored.web || DEFAULT_BRANDING.web,
    directorName: stored.directorName || DEFAULT_BRANDING.directorName,
    directorTitle: stored.directorTitle || DEFAULT_BRANDING.directorTitle,
  };
}

// In-memory active branding cache
let activeBrandingCache: CompanyBranding = getStoredBranding();
const brandingListeners = new Set<(branding: CompanyBranding) => void>();
let firestoreUnsubscribe: (() => void) | null = null;

function ensureFirestoreSubscription() {
  if (firestoreUnsubscribe) return;
  try {
    const brandingRef = doc(db, 'settings', 'branding');
    firestoreUnsubscribe = onSnapshot(
      brandingRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const rawDocName = (data.companyName || '').trim();
          const normalizedDocName = (!rawDocName || rawDocName.toLowerCase() === 'docks (pvt.) ltd' || rawDocName.toLowerCase() === 'docks (pvt) ltd' || rawDocName.toLowerCase() === 'docks (pvt) ltd.')
            ? 'DOCKS PRIVATE LIMITED'
            : (data.companyName || DEFAULT_BRANDING.companyName);

          const merged: CompanyBranding = {
            customLogo: data.customLogo || null,
            companyName: normalizedDocName,
            subtitle: data.subtitle || DEFAULT_BRANDING.subtitle,
            address: data.address || DEFAULT_BRANDING.address,
            phone: data.phone || DEFAULT_BRANDING.phone,
            cell: data.cell || DEFAULT_BRANDING.cell,
            email: data.email || DEFAULT_BRANDING.email,
            web: data.web || DEFAULT_BRANDING.web,
            directorName: data.directorName || DEFAULT_BRANDING.directorName,
            directorTitle: data.directorTitle || DEFAULT_BRANDING.directorTitle,
            updatedAt: data.updatedAt,
            updatedBy: data.updatedBy,
          };

          // Only broadcast if content actually differs from current cache
          if (JSON.stringify(merged) !== JSON.stringify(activeBrandingCache)) {
            activeBrandingCache = merged;
            safeAppStorage.setJSON(STORAGE_KEY, merged);
            brandingListeners.forEach(fn => {
              try { fn(merged); } catch (_) {}
            });
          }
        }
      },
      (error) => {
        console.warn('Firestore branding subscription warning (using local cache):', error);
      }
    );
  } catch (err) {
    console.warn('Could not establish Firestore branding listener:', err);
  }
}

/**
 * Broadcasts branding change across all subscribers without window event storming.
 */
function broadcastBranding(branding: CompanyBranding) {
  activeBrandingCache = branding;
  safeAppStorage.setJSON(STORAGE_KEY, branding);
  brandingListeners.forEach(fn => {
    try { fn(branding); } catch (_) {}
  });
}

/**
 * Subscribes to branding updates using a lightweight singleton listener.
 */
export function subscribeToBranding(onUpdate: (branding: CompanyBranding) => void): () => void {
  ensureFirestoreSubscription();
  onUpdate(activeBrandingCache);
  brandingListeners.add(onUpdate);
  return () => {
    brandingListeners.delete(onUpdate);
  };
}

/**
 * Compresses and scales an image to ensure it fits comfortably in Firestore document and localStorage.
 */
export async function optimizeLogoImage(file: File, maxWidth = 800, maxHeight = 400): Promise<string> {
  // If SVG (vector), preserve vector sharpness directly as Data URL
  const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
  if (isSvg) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Export as PNG to preserve transparent backgrounds
        const optimized = canvas.toDataURL('image/png', 0.95);
        resolve(optimized);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Persists updated branding to both Firestore and LocalStorage.
 */
export async function saveBranding(updates: Partial<CompanyBranding>): Promise<CompanyBranding> {
  const current = getStoredBranding();
  const next: CompanyBranding = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  // 1. Immediately cache locally
  broadcastBranding(next);

  // 2. Persist to Firestore
  try {
    const brandingRef = doc(db, 'settings', 'branding');
    await setDoc(brandingRef, next, { merge: true });
  } catch (error) {
    console.error('Failed to persist branding to Firestore:', error);
    // Still saved locally via broadcastBranding
  }

  return next;
}

/**
 * Resets custom logo back to default DPL system branding.
 */
export async function resetBrandingToDefault(): Promise<CompanyBranding> {
  const next: CompanyBranding = {
    ...DEFAULT_BRANDING,
    updatedAt: new Date().toISOString(),
  };

  // 1. Immediately cache locally
  broadcastBranding(next);

  // 2. Persist to Firestore
  try {
    const brandingRef = doc(db, 'settings', 'branding');
    await setDoc(brandingRef, { customLogo: null, updatedAt: next.updatedAt }, { merge: true });
  } catch (error) {
    console.error('Failed to reset branding in Firestore:', error);
  }

  return next;
}

/**
 * React Hook for consuming and updating branding anywhere in the app.
 */
export function useBranding() {
  const [branding, setBranding] = useState<CompanyBranding>(() => activeBrandingCache);

  useEffect(() => {
    return subscribeToBranding((data) => {
      setBranding(data);
    });
  }, []);

  return {
    branding,
    customLogo: branding.customLogo,
    activeLogo: branding.customLogo,
    companyName: branding.companyName || DEFAULT_BRANDING.companyName,
    subtitle: branding.subtitle || DEFAULT_BRANDING.subtitle,
    address: branding.address || DEFAULT_BRANDING.address,
    phone: branding.phone || DEFAULT_BRANDING.phone,
    cell: branding.cell || DEFAULT_BRANDING.cell,
    email: branding.email || DEFAULT_BRANDING.email,
    web: branding.web || DEFAULT_BRANDING.web,
    directorName: branding.directorName || DEFAULT_BRANDING.directorName,
    directorTitle: branding.directorTitle || DEFAULT_BRANDING.directorTitle,
    isCustomLogo: !!branding.customLogo,
    saveBranding,
    resetBrandingToDefault,
  };
}
