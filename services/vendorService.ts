import { Vendor } from '../types';
import { safeAppStorage } from './storage';
import { db } from './firebase';
import { collection, doc, setDoc, onSnapshot, getDocs } from 'firebase/firestore';

const VENDORS_STORAGE_KEY = 'dpl_vendors_list';

export const VENDOR_CATEGORIES = [
  'Drinking Water Charges',
  'Electric Bill',
  'Gas Cylinder Refill',
  'Internet Bill',
  'Office Rent',
  'Stationery',
  'Photocopy & Printer Maintenance',
  'Computer Repair',
  'Office Maintenance',
  'Legal Payments',
  'Miscellaneous Payments'
];

export const INITIAL_DEFAULT_VENDORS: Vendor[] = [
  {
    id: 'VND-001',
    name: 'K-Electric Limited',
    companyTitle: 'K-Electric (Power Utility)',
    contactNumber: '118',
    address: 'KE House, 39-B Sunset Boulevard, Phase-II, DHA, Karachi',
    category: 'Electric Bill',
    isRecurring: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'VND-002',
    name: 'Pakistan Telecommunication Company Ltd (PTCL)',
    companyTitle: 'PTCL & Flash Fiber Broadband',
    contactNumber: '1218',
    address: 'PTCL Headquarters, G-8/4, Islamabad / Regional Office Karachi',
    category: 'Internet Bill',
    isRecurring: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'VND-003',
    name: 'Aquafina / Al-Safa Mineral Water',
    companyTitle: 'Drinking Water Supplier',
    contactNumber: '0300-1234567',
    address: 'Plot 42, Korangi Industrial Area, Karachi',
    category: 'Drinking Water Charges',
    isRecurring: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'VND-004',
    name: 'Sui Southern Gas Company (SSGC)',
    companyTitle: 'SSGC LPG & Gas Supply',
    contactNumber: '1199',
    address: 'SSGC House, Sir Shah Suleman Road, Gulshan-e-Iqbal, Karachi',
    category: 'Gas Cylinder Refill',
    isRecurring: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'VND-005',
    name: 'Building Estate Landlord',
    companyTitle: 'Commercial Property Rental',
    contactNumber: '0321-9876543',
    address: 'Suite 401, Business Avenue, Main Shahrah-e-Faisal, Karachi',
    category: 'Office Rent',
    isRecurring: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'VND-006',
    name: 'Al-Madina Stationery & Printing',
    companyTitle: 'Paper & Office Stationery Mart',
    contactNumber: '0333-5551234',
    address: 'Urdu Bazaar, Saddar, Karachi',
    category: 'Stationery',
    isRecurring: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  }
];

export const getStoredVendors = (): Vendor[] => {
  return safeAppStorage.getJSON<Vendor[]>(VENDORS_STORAGE_KEY, INITIAL_DEFAULT_VENDORS);
};

export const saveVendor = async (vendor: Vendor): Promise<Vendor[]> => {
  const current = getStoredVendors();
  const existingIdx = current.findIndex(v => v.id === vendor.id || v.name.toLowerCase().trim() === vendor.name.toLowerCase().trim());
  let updated: Vendor[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = { ...updated[existingIdx], ...vendor };
  } else {
    updated = [vendor, ...current];
  }
  safeAppStorage.setJSON(VENDORS_STORAGE_KEY, updated);

  if (db) {
    try {
      await setDoc(doc(db, 'vendors', vendor.id), vendor, { merge: true });
    } catch (err) {
      console.warn('Could not save vendor to Firestore:', err);
    }
  }

  return updated;
};

export const subscribeToVendors = (callback: (vendors: Vendor[]) => void): (() => void) => {
  const local = getStoredVendors();
  callback(local);

  if (!db) return () => {};

  try {
    const unsub = onSnapshot(collection(db, 'vendors'), (snapshot) => {
      if (!snapshot.empty) {
        const firestoreVendors: Vendor[] = [];
        snapshot.forEach(docSnap => {
          firestoreVendors.push(docSnap.data() as Vendor);
        });
        safeAppStorage.setJSON(VENDORS_STORAGE_KEY, firestoreVendors);
        callback(firestoreVendors);
      }
    });
    return unsub;
  } catch (err) {
    console.warn('Vendors subscription error:', err);
    return () => {};
  }
};
