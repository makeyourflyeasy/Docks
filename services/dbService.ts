import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot,
  getDocs,
  getDoc,
  query,
  where,
} from 'firebase/firestore';
import { 
  db, 
  auth, 
  handleFirestoreError, 
  OperationType,
  saveActiveDbUserSession,
  getActiveDbUserSession,
  clearActiveDbUserSession
} from './firebase';
import { Case, FinanceEntry, Vehicle, AppNotification, AppUser, Client, UserRole } from '../types';

/**
 * Sanitizes an object recursively to ensure it is 100% compliant with Firestore:
 * - Replaces any browser File or Blob instances with clean JSON objects.
 * - Removes undefined keys or values that cause Firestore serialization exceptions.
 */
function sanitizeForFirestore(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;

  if (obj instanceof File || obj instanceof Blob) {
    return {
      name: (obj as File).name || 'document',
      type: (obj as File).type || 'application/octet-stream',
      size: (obj as File).size || 0,
      url: (obj as any).url || ''
    };
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item));
  }

  const clean: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      clean[key] = sanitizeForFirestore(val);
    }
  }
  return clean;
}

// CASES
export function subscribeToCases(
  onData: (cases: Case[]) => void,
  onError?: (err: any) => void
) {
  const path = 'cases';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const casesList: Case[] = [];
      snapshot.forEach((docSnap) => {
        casesList.push({ ...docSnap.data(), id: docSnap.id } as Case);
      });
      onData(casesList);
    },
    (error) => {
      console.warn(`Firestore subscription notice on ${path}:`, error);
      if (onError) onError(error);
    }
  );
}

export async function saveCaseToFirestore(newCase: Case): Promise<void> {
  const path = 'cases';
  const docId = newCase.id || String(Date.now());
  try {
    const payload = sanitizeForFirestore({
      ...newCase,
      id: docId,
      createdBy: auth.currentUser?.uid || 'guest',
      updatedAt: new Date().toISOString()
    });
    await setDoc(doc(db, path, docId), payload);
  } catch (error) {
    console.warn(`Firestore saveCase warning for ${docId}:`, error);
  }
}

export async function updateCaseInFirestore(caseItem: Case): Promise<void> {
  const path = 'cases';
  const docId = caseItem.id;
  try {
    const payload = sanitizeForFirestore({
      ...caseItem,
      updatedAt: new Date().toISOString()
    });
    await setDoc(doc(db, path, docId), payload, { merge: true });
  } catch (error) {
    console.warn(`Firestore updateCase warning for ${docId}:`, error);
  }
}

export async function deleteCaseFromFirestore(caseId: string): Promise<void> {
  const path = 'cases';
  try {
    await deleteDoc(doc(db, path, caseId));
  } catch (error) {
    console.warn(`Firestore deleteCase warning for ${caseId}:`, error);
  }
}

// FINANCES
export function subscribeToFinances(
  onData: (items: FinanceEntry[]) => void,
  onError?: (err: any) => void
) {
  const path = 'finances';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: FinanceEntry[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ ...docSnap.data(), id: Number(docSnap.id) || Number(docSnap.data().id) } as FinanceEntry);
      });
      onData(items);
    },
    (error) => {
      console.warn(`Firestore subscription notice on ${path}:`, error);
      if (onError) onError(error);
    }
  );
}

export async function saveFinanceToFirestore(entry: FinanceEntry): Promise<void> {
  const path = 'finances';
  const docId = String(entry.id || Date.now());
  try {
    const payload = sanitizeForFirestore({
      ...entry,
      id: Number(docId),
      createdBy: auth.currentUser?.uid || 'guest',
      updatedAt: new Date().toISOString()
    });
    await setDoc(doc(db, path, docId), payload);
  } catch (error) {
    console.warn(`Firestore saveFinance warning:`, error);
  }
}

export async function updateFinanceInFirestore(entry: FinanceEntry): Promise<void> {
  const path = 'finances';
  const docId = String(entry.id);
  try {
    const payload = sanitizeForFirestore({ ...entry, updatedAt: new Date().toISOString() });
    await setDoc(doc(db, path, docId), payload, { merge: true });
  } catch (error) {
    console.warn(`Firestore updateFinance warning:`, error);
  }
}

// VEHICLES
export function subscribeToVehicles(
  onData: (items: Vehicle[]) => void,
  onError?: (err: any) => void
) {
  const path = 'vehicles';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: Vehicle[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ ...docSnap.data(), id: Number(docSnap.id) || Number(docSnap.data().id) } as Vehicle);
      });
      onData(items);
    },
    (error) => {
      console.warn(`Firestore subscription notice on ${path}:`, error);
      if (onError) onError(error);
    }
  );
}

export async function saveVehicleToFirestore(vehicle: Vehicle): Promise<void> {
  const path = 'vehicles';
  const docId = String(vehicle.id || Date.now());
  try {
    const payload = sanitizeForFirestore({
      ...vehicle,
      id: Number(docId),
      createdBy: auth.currentUser?.uid || 'guest',
      updatedAt: new Date().toISOString()
    });
    await setDoc(doc(db, path, docId), payload);
  } catch (error) {
    console.warn(`Firestore saveVehicle warning:`, error);
  }
}

// NOTIFICATIONS
export function subscribeToNotifications(
  onData: (items: AppNotification[]) => void,
  onError?: (err: any) => void
) {
  const path = 'notifications';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: AppNotification[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ ...docSnap.data(), id: Number(docSnap.id) || Number(docSnap.data().id) } as AppNotification);
      });
      onData(items);
    },
    (error) => {
      console.warn(`Firestore subscription notice on ${path}:`, error);
      if (onError) onError(error);
    }
  );
}

export async function saveNotificationToFirestore(notif: AppNotification): Promise<void> {
  const path = 'notifications';
  const docId = String(notif.id || Date.now());
  try {
    const payload = sanitizeForFirestore({
      ...notif,
      id: Number(docId),
      updatedAt: new Date().toISOString()
    });
    await setDoc(doc(db, path, docId), payload);
  } catch (error) {
    console.warn(`Firestore saveNotification warning:`, error);
  }
}

export async function updateNotificationInFirestore(notif: AppNotification): Promise<void> {
  const path = 'notifications';
  const docId = String(notif.id);
  try {
    const payload = sanitizeForFirestore({ ...notif, updatedAt: new Date().toISOString() });
    await setDoc(doc(db, path, docId), payload, { merge: true });
  } catch (error) {
    console.warn(`Firestore updateNotification warning:`, error);
  }
}

// ==========================================
// DATABASE AUTHENTICATION & USER MANAGEMENT
// ==========================================

export const DEFAULT_DATABASE_USERS: AppUser[] = [
  { id: 1, userId: 'admin', password: 'dpl01234', name: 'System Administrator', role: UserRole.ADMIN, contact: '0300-1234567', email: 'admin@docks.com', status: 'ACTIVE', isAdmin: true },
  { id: 2, userId: 'finance', password: 'dpl01234', name: 'Finance Manager', role: UserRole.FINANCE_MANAGER, contact: '0333-5554444', email: 'finance@docks.com', status: 'ACTIVE', isAdmin: true },
  { id: 3, userId: 'casemanager', password: 'dpl01234', name: 'Case Manager', role: UserRole.OPERATIONS_MANAGER, contact: '0321-9876543', email: 'casemanager@docks.com', status: 'ACTIVE', isAdmin: true },
  { id: 4, userId: 'vehiclemanager', password: 'dpl01234', name: 'Vehicles Manager', role: UserRole.VEHICLE_MANAGER, contact: '0301-2233445', email: 'transport@docks.com', status: 'ACTIVE' },
  { id: 5, userId: 'documentmanager', password: 'dpl01234', name: 'Documentation Manager', role: UserRole.DOCUMENTATION_OFFICER, contact: '0304-5566778', email: 'docs@docks.com', status: 'ACTIVE' },
  { id: 6, userId: 'loading01', password: 'dpl01234', name: 'Loading Staff', role: UserRole.LOADING_PORT_STAFF, contact: '0302-3344556', email: 'loading@docks.com', status: 'ACTIVE' },
  { id: 7, userId: 'lahore', password: 'dpl01234', name: 'Destination Officer (Lahore)', role: UserRole.UNLOADING_PORT_STAFF, contact: '0303-4455667', email: 'lahore.destination@docks.com', status: 'ACTIVE' },
  { id: 8, userId: 'peshawar', password: 'dpl01234', name: 'Destination Officer (Peshawar)', role: UserRole.UNLOADING_PORT_STAFF, contact: '0303-9988776', email: 'peshawar.destination@docks.com', status: 'ACTIVE' },
  { id: 9, userId: 'client01', password: 'dpl01234', name: 'Trial Client', role: UserRole.CLIENT, contact: '021-111-222-333', email: 'client01@docks.com', status: 'ACTIVE', clientName: 'Trial Client' }
];

let hasSeededInitialUsers = false;

/**
 * Subscribes to live Firestore users collection.
 * Automatically seeds default organization accounts if Firestore users collection is empty.
 */
export function subscribeToUsers(
  onData: (users: AppUser[]) => void,
  onError?: (err: any) => void
) {
  const path = 'users';
  return onSnapshot(
    collection(db, path),
    async (snapshot) => {
      if (snapshot.empty && !hasSeededInitialUsers) {
        hasSeededInitialUsers = true;
        console.log('Seeding default organizational accounts to Firestore database...');
        try {
          for (const user of DEFAULT_DATABASE_USERS) {
            const docId = String(user.id);
            const payload = sanitizeForFirestore({
              ...user,
              id: Number(user.id),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
            await setDoc(doc(db, path, docId), payload);
          }
          onData(DEFAULT_DATABASE_USERS);
          return;
        } catch (seedErr) {
          console.warn('Failed to seed default users:', seedErr);
        }
      }

      const list: AppUser[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          ...data,
          id: Number(docSnap.id) || Number(data.id) || Date.now()
        } as AppUser);
      });

      // Sort by id
      list.sort((a, b) => Number(a.id) - Number(b.id));
      onData(list.length > 0 ? list : DEFAULT_DATABASE_USERS);
    },
    (error) => {
      console.warn(`Firestore subscription notice on ${path}:`, error);
      if (onError) onError(error);
      onData(DEFAULT_DATABASE_USERS);
    }
  );
}

/**
 * Authenticates credentials directly against Firestore database records.
 * Supports matching by User ID (e.g. 'ADMIN', 'EMP-0001', 'CLT-001'), Email, or Name.
 */
export async function authenticateDatabaseUser(
  identifier: string,
  pass: string
): Promise<AppUser> {
  const cleanId = identifier.trim().toLowerCase();
  const cleanPass = pass.trim();

  if (!cleanId || !cleanPass) {
    throw new Error('Please provide both user identification and password.');
  }

  try {
    // 1. Query Firestore users collection (with safe offline fallback)
    let matchedUser: AppUser | null = null;
    try {
      const snap = await getDocs(collection(db, 'users'));
      snap.forEach((docSnap) => {
        const u = docSnap.data() as AppUser;
        const matchUserId = u.userId && u.userId.toLowerCase() === cleanId;
        const matchEmail = u.email && u.email.toLowerCase() === cleanId;
        const matchName = u.name && u.name.toLowerCase() === cleanId;

        if (matchUserId || matchEmail || matchName) {
          matchedUser = { ...u, id: Number(docSnap.id) || Number(u.id) };
        }
      });
    } catch (dbErr: any) {
      console.log('Firestore offline / unreachable, falling back to local credentials catalog.');
    }

  // 2. Fallback to default catalog if database is offline or user not yet in Firestore
  if (!matchedUser) {
    const foundInDefault = DEFAULT_DATABASE_USERS.find(
      (u) =>
        u.userId?.toLowerCase() === cleanId ||
        u.email?.toLowerCase() === cleanId ||
        u.name?.toLowerCase() === cleanId
    );
    if (foundInDefault) {
      matchedUser = foundInDefault;
    }
  }

  if (!matchedUser) {
    throw new Error(`No database account found matching "${identifier}".`);
  }

    // 3. Verify status
    if (matchedUser.status === 'INACTIVE') {
      throw new Error('This database account is currently marked as INACTIVE. Please contact administration.');
    }

    // 4. Verify password
    if (matchedUser.password && matchedUser.password !== cleanPass) {
      throw new Error('Incorrect password. Please verify your credentials.');
    }

    // 5. Update lastLogin and persist active database session
    const updatedUser: AppUser = {
      ...matchedUser,
      lastLogin: new Date().toISOString(),
      authProvider: 'database'
    };

    try {
      await setDoc(
        doc(db, 'users', String(updatedUser.id)),
        sanitizeForFirestore(updatedUser),
        { merge: true }
      );
    } catch (saveErr) {
      console.warn('Could not record lastLogin in Firestore:', saveErr);
    }

    saveActiveDbUserSession(updatedUser);
    return updatedUser;
  } catch (err: any) {
    console.error('Database authentication error:', err);
    throw err;
  }
}

/**
 * Links and synchronizes a Google Firebase Auth user with a Firestore Database User record.
 */
export async function syncFirebaseUserToDatabase(
  firebaseUser: any,
  assignedRole?: UserRole
): Promise<AppUser> {
  const email = (firebaseUser.email || '').toLowerCase();
  const isAdminEmail = email === 'makeyourflyeasy@gmail.com' || email.includes('admin') || email.includes('ceo');
  const role = assignedRole || (isAdminEmail ? UserRole.ADMIN : UserRole.CLIENT);
  
  const dbUser: AppUser = {
    id: Date.now(),
    uid: firebaseUser.uid,
    userId: isAdminEmail ? 'ADMIN-GOOGLE' : `USR-${firebaseUser.uid.slice(0, 6).toUpperCase()}`,
    name: firebaseUser.displayName || 'Google User',
    email: firebaseUser.email || '',
    contact: firebaseUser.phoneNumber || '',
    role,
    status: 'ACTIVE',
    profilePicture: firebaseUser.photoURL || undefined,
    lastLogin: new Date().toISOString(),
    authProvider: 'google',
    isAdmin: role === UserRole.ADMIN || role === UserRole.CEO
  };

  try {
    const docId = `auth_${firebaseUser.uid}`;
    await setDoc(doc(db, 'users', docId), sanitizeForFirestore(dbUser), { merge: true });
  } catch (err) {
    console.warn('Could not persist Google user to Firestore users:', err);
  }

  saveActiveDbUserSession(dbUser);
  return dbUser;
}

export async function saveUserToFirestore(user: AppUser): Promise<void> {
  const path = 'users';
  const docId = String(user.id || Date.now());
  try {
    const payload = sanitizeForFirestore({
      ...user,
      id: Number(docId),
      updatedAt: new Date().toISOString()
    });
    await setDoc(doc(db, path, docId), payload, { merge: true });
  } catch (error) {
    console.warn(`Firestore saveUser warning:`, error);
  }
}

export async function deleteUserFromFirestore(userId: number | string): Promise<void> {
  const path = 'users';
  try {
    await deleteDoc(doc(db, path, String(userId)));
  } catch (error) {
    console.warn(`Firestore deleteUser warning:`, error);
  }
}

export async function saveUserProfile(user: AppUser): Promise<void> {
  return saveUserToFirestore(user);
}

export async function getUserProfile(userId: string): Promise<AppUser | null> {
  const path = 'users';
  try {
    const docSnap = await getDoc(doc(db, path, String(userId)));
    if (docSnap.exists()) {
      return docSnap.data() as AppUser;
    }
    return null;
  } catch (error) {
    return null;
  }
}

// CLIENTS
export const DEFAULT_CLIENTS: string[] = [
  'Trial Client'
];

export function subscribeToClients(
  onData: (clients: Client[]) => void,
  onError?: (err: any) => void
) {
  const path = 'clients';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const list: Client[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ ...docSnap.data(), id: docSnap.id } as Client);
      });
      onData(list);
    },
    (error) => {
      console.warn(`Firestore subscription notice on ${path}:`, error);
      if (onError) onError(error);
    }
  );
}

export async function saveClientToFirestore(client: Partial<Client>): Promise<string> {
  const path = 'clients';
  const docId = client.id || `client_${Date.now()}`;
  try {
    const payload = sanitizeForFirestore({
      id: docId,
      name: client.name?.trim() || 'New Client',
      ownerName: client.ownerName || '',
      contact: client.contact || '',
      officeAddress: client.officeAddress || '',
      mobileNumber: client.mobileNumber || '',
      whatsappNumber: client.whatsappNumber || '',
      email: client.email || '',
      ntn: client.ntn || '',
      strn: client.strn || '',
      defaultCaseCategory: client.defaultCaseCategory || 'Afghan Transit',
      defaultCharges: client.defaultCharges || [],
      openingBalance: client.openingBalance || 0,
      createdAt: client.createdAt || new Date().toISOString()
    });
    await setDoc(doc(db, path, docId), payload, { merge: true });
    return docId;
  } catch (error) {
    console.warn(`Firestore saveClient warning:`, error);
    return docId;
  }
}
