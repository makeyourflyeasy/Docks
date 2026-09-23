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
import { Case, FinanceEntry, Vehicle, AppNotification, AppUser, Client, UserRole, RecurringFinanceTemplate, DestinationStaff, StaffLedgerEntry, Vendor } from '../types';
import { safeAppStorage } from './storage';

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

export async function deleteFinanceFromFirestore(financeId: number | string): Promise<void> {
  const path = 'finances';
  try {
    await deleteDoc(doc(db, path, String(financeId)));
  } catch (error) {
    console.warn(`Firestore deleteFinance warning:`, error);
  }
}

/**
 * Automatically ensures that all staff members (regardless of their assigned role)
 * have their monthly base salary automatically posted to Payables on the 1st of every month.
 */
export async function syncMonthlyStaffSalariesToPayables(
  staffUsers: AppUser[],
  existingPayables?: FinanceEntry[]
): Promise<FinanceEntry[]> {
  if (!staffUsers || staffUsers.length === 0) return [];
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const firstOfMonthDate = `${currentMonthStr}-01`;

  const currentPayables = existingPayables && existingPayables.length > 0 
    ? existingPayables 
    : safeAppStorage.getJSON<FinanceEntry[]>('dpl_live_payables', []);

  const newlyCreated: FinanceEntry[] = [];

  for (const user of staffUsers) {
    // Skip external client or transporter entities
    if (user.role === UserRole.CLIENT || user.role === UserRole.TRANSPORTER) continue;
    const salary = Number(user.baseSalary || 0);
    if (salary <= 0) continue;

    const salaryRef = `SAL-${currentMonthStr}-${user.id}`;
    const alreadyExists = currentPayables.some(
      p => p.reference === salaryRef || (p.category === 'Staff Payroll & Salaries' && p.party?.trim().toLowerCase() === user.name?.trim().toLowerCase() && p.date === firstOfMonthDate)
    );

    if (!alreadyExists && !newlyCreated.some(p => p.reference === salaryRef)) {
      const netSalary = Math.max(0, salary - Number(user.loansAdvances || 0));
      const roleLabel = user.designation || (user.role === UserRole.OFFICE_STAFF ? 'Office Staff' : String(user.role).replace(/_/g, ' '));
      const salaryEntry: FinanceEntry = {
        id: Date.now() + Math.floor(Math.random() * 10000) + newlyCreated.length,
        date: firstOfMonthDate,
        description: `Monthly Salary - ${user.name} (${roleLabel}) [Gross: PKR ${salary.toLocaleString()}]`,
        party: user.name,
        amount: netSalary,
        type: 'PAYABLE',
        status: 'PENDING',
        category: 'Staff Payroll & Salaries',
        reference: salaryRef,
        paymentMethod: 'BANK',
        bankName: 'Meezan Bank'
      };

      try {
        await saveFinanceToFirestore(salaryEntry);
      } catch (err) {
        console.warn('Could not save auto salary payable to Firestore:', err);
      }
      newlyCreated.push(salaryEntry);
    }
  }

  if (newlyCreated.length > 0) {
    const updated = [...newlyCreated, ...currentPayables];
    safeAppStorage.setJSON('dpl_live_payables', updated);
  }

  return newlyCreated;
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

export async function updateVehicleInFirestore(vehicle: Vehicle): Promise<void> {
  const path = 'vehicles';
  const docId = String(vehicle.id);
  try {
    const payload = sanitizeForFirestore({ ...vehicle, updatedAt: new Date().toISOString() });
    await setDoc(doc(db, path, docId), payload, { merge: true });
  } catch (error) {
    console.warn(`Firestore updateVehicle warning:`, error);
  }
}

export async function deleteVehicleFromFirestore(vehicleId: number | string): Promise<void> {
  const path = 'vehicles';
  try {
    await deleteDoc(doc(db, path, String(vehicleId)));
  } catch (error) {
    console.warn(`Firestore deleteVehicle warning:`, error);
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
  { id: 1, userId: 'admin', password: 'dpl01234', name: 'System Administrator', role: UserRole.ADMIN, roles: [UserRole.ADMIN], designation: 'System Administrator', contact: '0300-1234567', email: 'admin@docks.com', status: 'ACTIVE', isAdmin: true, baseSalary: 150000 },
  { id: 2, userId: 'finance', password: 'dpl01234', name: 'Finance Manager', role: UserRole.FINANCE_MANAGER, roles: [UserRole.FINANCE_MANAGER], designation: 'Head of Finance & Accounts', contact: '0333-5554444', email: 'finance@docks.com', status: 'ACTIVE', isAdmin: false, baseSalary: 110000 },
  { id: 3, userId: 'casemanager', password: 'dpl01234', name: 'Case Manager', role: UserRole.OPERATIONS_MANAGER, roles: [UserRole.OPERATIONS_MANAGER], designation: 'Operations Manager', contact: '0321-9876543', email: 'casemanager@docks.com', status: 'ACTIVE', isAdmin: false, baseSalary: 95000 },
  { id: 4, userId: 'vehiclemanager', password: 'dpl01234', name: 'Vehicles Manager', role: UserRole.VEHICLE_MANAGER, roles: [UserRole.VEHICLE_MANAGER], designation: 'Fleet & Logistics Incharge', contact: '0301-2233445', email: 'transport@docks.com', status: 'ACTIVE', baseSalary: 85000 },
  { id: 5, userId: 'documentmanager', password: 'dpl01234', name: 'Documentation Incharge', role: UserRole.OPERATIONS_MANAGER, roles: [UserRole.OPERATIONS_MANAGER], designation: 'Documentation & Clearing Officer', contact: '0304-5566778', email: 'docs@docks.com', status: 'ACTIVE', baseSalary: 75000 },
  { id: 6, userId: 'loading01', password: 'dpl01234', name: 'Loading Staff', role: UserRole.LOADING_PORT_STAFF, roles: [UserRole.LOADING_PORT_STAFF], designation: 'Loading Port Supervisor', contact: '0302-3344556', email: 'loading@docks.com', status: 'ACTIVE', baseSalary: 65000 },
  { id: 7, userId: 'lahore', password: 'dpl01234', name: 'Destination Officer (Lahore)', role: UserRole.DESTINATION_PORT_STAFF, roles: [UserRole.DESTINATION_PORT_STAFF], designation: 'Destination Officer (Lahore)', contact: '0303-4455667', email: 'lahore.destination@docks.com', status: 'ACTIVE', baseSalary: 70000 },
  { id: 8, userId: 'peshawar', password: 'dpl01234', name: 'Destination Officer (Peshawar)', role: UserRole.DESTINATION_PORT_STAFF, roles: [UserRole.DESTINATION_PORT_STAFF], designation: 'Destination Officer (Peshawar)', contact: '0303-9988776', email: 'peshawar.destination@docks.com', status: 'ACTIVE', baseSalary: 70000 },
  { id: 10, userId: '', password: '', name: 'Tariq Mehmood', role: UserRole.OFFICE_STAFF, roles: [UserRole.OFFICE_STAFF], designation: 'Head Office Coordinator', contact: '0312-7788990', email: 'tariq.office@docks.com', status: 'ACTIVE', baseSalary: 55000 },
  { id: 9, userId: 'client01', password: 'dpl01234', name: 'Client User', role: UserRole.CLIENT, roles: [UserRole.CLIENT], designation: 'Corporate Importer', contact: '021-111-222-333', email: 'client01@docks.com', status: 'ACTIVE', clientName: 'Client Account' }
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
          matchedUser = { ...u, id: Number(docSnap.id) || Number(u.id) || (docSnap.id as any) };
        }
      });
    } catch (dbErr: any) {
      console.log('Firestore offline / unreachable, falling back to local credentials catalog.');
    }

    // 1.5. If not matched, query Firestore clients collection (if loginEnabled)
    if (!matchedUser) {
      try {
        const clientSnap = await getDocs(collection(db, 'clients'));
        clientSnap.forEach((docSnap) => {
          const client = docSnap.data();
          if (client.loginEnabled) {
            const matchUserId = client.userId && client.userId.toLowerCase() === cleanId;
            const matchEmail = client.email && client.email.toLowerCase() === cleanId;
            const matchName = client.name && client.name.toLowerCase() === cleanId;

            if (matchUserId || matchEmail || matchName) {
              matchedUser = {
                id: docSnap.id as any,
                userId: client.userId,
                password: client.password,
                name: client.name,
                role: UserRole.CLIENT,
                roles: [UserRole.CLIENT],
                designation: 'Corporate Importer',
                contact: client.contact || client.mobileNumber || '',
                email: client.email || '',
                status: 'ACTIVE',
                clientName: client.name,
                lastLogin: client.lastLogin || ''
              } as unknown as AppUser;
            }
          }
        });
      } catch (dbErr: any) {
        console.log('Error querying clients from Firestore:', dbErr);
      }
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
      if (updatedUser.role === UserRole.CLIENT) {
        await setDoc(
          doc(db, 'clients', String(updatedUser.id)),
          sanitizeForFirestore({
            lastLogin: updatedUser.lastLogin
          }),
          { merge: true }
        );
      } else {
        await setDoc(
          doc(db, 'users', String(updatedUser.id)),
          sanitizeForFirestore(updatedUser),
          { merge: true }
        );
      }
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
    isAdmin: role === UserRole.ADMIN
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
export const DEFAULT_CLIENTS: string[] = [];

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

export async function deleteClientFromFirestore(clientId: string): Promise<void> {
  const path = 'clients';
  try {
    await deleteDoc(doc(db, path, clientId));
  } catch (error) {
    console.warn(`Firestore deleteClient warning:`, error);
  }
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
      cnic: client.cnic || '',
      ntn: client.ntn || '',
      strn: client.strn || '',
      businessCardUrl: client.businessCardUrl || '',
      contractLetterUrl: client.contractLetterUrl || '',
      nicDocUrl: client.nicDocUrl || '',
      defaultCaseCategory: client.defaultCaseCategory || 'Bonded Carrier',
      defaultServiceArrangements: client.defaultServiceArrangements || {},
      defaultCharges: client.defaultCharges || [],
      openingBalance: client.openingBalance || 0,
      userId: client.userId || '',
      password: client.password || '',
      loginEnabled: client.loginEnabled ?? false,
      createdAt: client.createdAt || new Date().toISOString()
    });
    await setDoc(doc(db, path, docId), payload, { merge: true });
    return docId;
  } catch (error) {
    console.warn(`Firestore saveClient warning:`, error);
    return docId;
  }
}

// DESTINATION STAFF
export function subscribeToDestinationStaff(
  onData: (staff: DestinationStaff[]) => void,
  onError?: (err: any) => void
) {
  const path = 'destination_staff';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const list: DestinationStaff[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ ...docSnap.data(), id: docSnap.id } as DestinationStaff);
      });
      onData(list);
    },
    (error) => {
      console.warn(`Firestore subscription notice on ${path}:`, error);
      if (onError) onError(error);
    }
  );
}

export async function saveDestinationStaffToFirestore(staff: Partial<DestinationStaff>): Promise<string> {
  const path = 'destination_staff';
  const docId = staff.id || `dst_${Date.now()}`;
  try {
    const payload = sanitizeForFirestore({
      id: docId,
      name: staff.name?.trim() || 'Staff Representative',
      station: staff.station || 'Karachi Port',
      role: staff.role || 'Station Supervisor',
      contact: staff.contact || '',
      cnic: staff.cnic || '',
      address: staff.address || '',
      commissionOrSalary: staff.commissionOrSalary || 0,
      paymentType: staff.paymentType || 'Monthly Salary',
      status: staff.status || 'Active',
      notes: staff.notes || '',
      createdAt: staff.createdAt || new Date().toISOString()
    });
    await setDoc(doc(db, path, docId), payload, { merge: true });
    return docId;
  } catch (error) {
    console.warn(`Firestore saveDestinationStaff warning:`, error);
    return docId;
  }
}

export async function deleteDestinationStaffFromFirestore(staffId: string): Promise<void> {
  const path = 'destination_staff';
  try {
    await deleteDoc(doc(db, path, staffId));
  } catch (error) {
    console.warn(`Firestore deleteDestinationStaff warning:`, error);
  }
}

// STAFF DUAL LEDGERS (Salary & Daily Routine / Petty Cash)
export function subscribeToStaffLedgers(
  onData: (entries: StaffLedgerEntry[]) => void,
  onError?: (err: any) => void
) {
  const path = 'staff_ledgers';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const list: StaffLedgerEntry[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ ...docSnap.data(), id: docSnap.id } as StaffLedgerEntry);
      });
      onData(list);
    },
    (error) => {
      console.warn(`Firestore subscription notice on ${path}:`, error);
      if (onError) onError(error);
    }
  );
}

export async function saveStaffLedgerEntryToFirestore(entry: Partial<StaffLedgerEntry>): Promise<string> {
  const path = 'staff_ledgers';
  const docId = entry.id || `sled_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  try {
    const payload = sanitizeForFirestore({
      id: docId,
      staffId: entry.staffId || '',
      staffName: entry.staffName || 'Staff Member',
      type: entry.type || 'SALARY',
      date: entry.date || new Date().toISOString().split('T')[0],
      description: entry.description || '',
      category: entry.category || 'General',
      debit: Number(entry.debit) || 0,
      credit: Number(entry.credit) || 0,
      balance: Number(entry.balance) || 0,
      receiptUrl: entry.receiptUrl || '',
      notes: entry.notes || '',
      settled: entry.settled ?? false
    });
    await setDoc(doc(db, path, docId), payload, { merge: true });
    return docId;
  } catch (error) {
    console.warn(`Firestore saveStaffLedger warning:`, error);
    return docId;
  }
}

export async function deleteStaffLedgerEntryFromFirestore(entryId: string): Promise<void> {
  const path = 'staff_ledgers';
  try {
    await deleteDoc(doc(db, path, entryId));
  } catch (error) {
    console.warn(`Firestore deleteStaffLedger warning:`, error);
  }
}

/**
 * Exports complete snapshot of all live collections from Firestore for cloud backup
 */
export async function exportCompleteDatabaseSnapshot(): Promise<any> {
  const [
    casesSnap,
    finSnap,
    finLegacySnap,
    vehSnap,
    clientSnap,
    userSnap,
    vendorSnap,
    recurringSnap,
    staffLedgerSnap,
    destStaffSnap,
    notifSnap,
    activitySnap,
    settingsSnap
  ] = await Promise.all([
    getDocs(collection(db, 'cases')).catch(() => ({ docs: [] } as any)),
    getDocs(collection(db, 'finances')).catch(() => ({ docs: [] } as any)),
    getDocs(collection(db, 'finance')).catch(() => ({ docs: [] } as any)),
    getDocs(collection(db, 'vehicles')).catch(() => ({ docs: [] } as any)),
    getDocs(collection(db, 'clients')).catch(() => ({ docs: [] } as any)),
    getDocs(collection(db, 'users')).catch(() => ({ docs: [] } as any)),
    getDocs(collection(db, 'vendors')).catch(() => ({ docs: [] } as any)),
    getDocs(collection(db, 'recurring_templates')).catch(() => ({ docs: [] } as any)),
    getDocs(collection(db, 'staff_ledgers')).catch(() => ({ docs: [] } as any)),
    getDocs(collection(db, 'destination_staff')).catch(() => ({ docs: [] } as any)),
    getDocs(collection(db, 'notifications')).catch(() => ({ docs: [] } as any)),
    getDocs(collection(db, 'activity_logs')).catch(() => ({ docs: [] } as any)),
    getDocs(collection(db, 'settings')).catch(() => ({ docs: [] } as any)),
  ]);

  let cases: Case[] = casesSnap.docs.map((d: any) => ({ ...d.data(), id: d.id }));
  if (cases.length === 0) {
    cases = safeAppStorage.getJSON<Case[]>('dpl_live_cases', []);
  }

  // Finance: merge finances + legacy finance + local storage fallback
  const firestoreFinance: FinanceEntry[] = [
    ...finSnap.docs.map((d: any) => ({ ...d.data(), id: d.id })),
    ...finLegacySnap.docs.map((d: any) => ({ ...d.data(), id: d.id }))
  ];
  let finance: FinanceEntry[] = firestoreFinance;
  if (finance.length === 0) {
    const cash = safeAppStorage.getJSON<FinanceEntry[]>('dpl_live_finance', []);
    const recv = safeAppStorage.getJSON<FinanceEntry[]>('dpl_live_receivables', []);
    const pay = safeAppStorage.getJSON<FinanceEntry[]>('dpl_live_payables', []);
    finance = [...cash, ...recv, ...pay];
  }

  let vehicles: Vehicle[] = vehSnap.docs.map((d: any) => ({ ...d.data(), id: d.id }));
  if (vehicles.length === 0) {
    vehicles = safeAppStorage.getJSON<Vehicle[]>('dpl_live_vehicles', safeAppStorage.getJSON<Vehicle[]>('dpl_cached_vehicles', []));
  }

  let clients: Client[] = clientSnap.docs.map((d: any) => ({ ...d.data(), id: d.id }));
  if (clients.length === 0) {
    clients = safeAppStorage.getJSON<Client[]>('dpl_cached_clients', []);
  }

  const users: AppUser[] = userSnap.docs.map((d: any) => ({ ...d.data(), id: d.id }));

  let vendors: Vendor[] = vendorSnap.docs.map((d: any) => ({ ...d.data(), id: d.id }));
  if (vendors.length === 0) {
    vendors = safeAppStorage.getJSON<Vendor[]>('dpl_vendors_list', []);
  }

  let recurringTemplates: RecurringFinanceTemplate[] = recurringSnap.docs.map((d: any) => ({ ...d.data(), id: d.id }));
  if (recurringTemplates.length === 0) {
    recurringTemplates = safeAppStorage.getJSON<RecurringFinanceTemplate[]>('dpl_recurring_templates', []);
  }

  let staffLedgers: StaffLedgerEntry[] = staffLedgerSnap.docs.map((d: any) => ({ ...d.data(), id: d.id }));
  if (staffLedgers.length === 0) {
    staffLedgers = safeAppStorage.getJSON<StaffLedgerEntry[]>('dpl_staff_ledgers', []);
  }

  let destinationStaff: DestinationStaff[] = destStaffSnap.docs.map((d: any) => ({ ...d.data(), id: d.id }));
  if (destinationStaff.length === 0) {
    destinationStaff = safeAppStorage.getJSON<DestinationStaff[]>('dpl_destination_staff', []);
  }

  const notifications: AppNotification[] = notifSnap.docs.map((d: any) => ({ ...d.data(), id: d.id }));

  let activityLogs = activitySnap.docs.map((d: any) => ({ ...d.data(), id: d.id }));
  if (activityLogs.length === 0) {
    activityLogs = safeAppStorage.getJSON<any[]>('dpl_system_activity_logs', []);
  }

  const settingsData = settingsSnap.docs.map((d: any) => ({ ...d.data(), id: d.id }));

  return {
    version: '3.0.0',
    timestamp: new Date().toISOString(),
    app: 'DOCKS (PVT) LTD - ERP & Logistics Management',
    backupType: 'COMPLETE',
    stats: {
      casesCount: cases.length,
      financeCount: finance.length,
      vehiclesCount: vehicles.length,
      clientsCount: clients.length,
      usersCount: users.length,
      vendorsCount: vendors.length,
      recurringTemplatesCount: recurringTemplates.length,
      staffLedgersCount: staffLedgers.length,
      destinationStaffCount: destinationStaff.length,
      notificationsCount: notifications.length,
      activityLogsCount: activityLogs.length
    },
    settings: settingsData,
    cases,
    finance,
    vehicles,
    clients,
    users,
    vendors,
    recurringTemplates,
    staffLedgers,
    destinationStaff,
    notifications,
    activityLogs
  };
}

/**
 * Selective export based on user-chosen modules:
 * Full Backup, All Cases, All Finance, All Vehicles, All Clients, Vendors, Recurring, Staff
 */
export async function exportSelectiveDatabaseBackup(options: {
  cases: boolean;
  finance: boolean;
  vehicles: boolean;
  clients: boolean;
  companyInfo?: any;
}): Promise<any> {
  const isFull = options.cases && options.finance && options.vehicles && options.clients;
  if (isFull) {
    const fullSnapshot = await exportCompleteDatabaseSnapshot();
    if (options.companyInfo) {
      fullSnapshot.companyInfo = options.companyInfo;
    }
    return fullSnapshot;
  }

  const promises: Promise<any>[] = [];

  promises.push(
    options.cases 
      ? getDocs(collection(db, 'cases')).catch(() => ({ docs: [] })) 
      : Promise.resolve({ docs: [] })
  );
  promises.push(
    options.finance 
      ? getDocs(collection(db, 'finances')).catch(() => ({ docs: [] })) 
      : Promise.resolve({ docs: [] })
  );
  promises.push(
    options.vehicles 
      ? getDocs(collection(db, 'vehicles')).catch(() => ({ docs: [] })) 
      : Promise.resolve({ docs: [] })
  );
  promises.push(
    options.clients 
      ? getDocs(collection(db, 'clients')).catch(() => ({ docs: [] })) 
      : Promise.resolve({ docs: [] })
  );

  const [casesSnap, finSnap, vehSnap, clientSnap] = await Promise.all(promises);

  let cases: Case[] = (casesSnap?.docs || []).map((d: any) => ({ ...d.data(), id: d.id }));
  if (options.cases && cases.length === 0) {
    cases = safeAppStorage.getJSON<Case[]>('dpl_live_cases', []);
  }

  let finance: FinanceEntry[] = (finSnap?.docs || []).map((d: any) => ({ ...d.data(), id: d.id }));
  if (options.finance && finance.length === 0) {
    const cash = safeAppStorage.getJSON<FinanceEntry[]>('dpl_live_finance', []);
    const recv = safeAppStorage.getJSON<FinanceEntry[]>('dpl_live_receivables', []);
    const pay = safeAppStorage.getJSON<FinanceEntry[]>('dpl_live_payables', []);
    finance = [...cash, ...recv, ...pay];
  }

  let vehicles: Vehicle[] = (vehSnap?.docs || []).map((d: any) => ({ ...d.data(), id: d.id }));
  if (options.vehicles && vehicles.length === 0) {
    vehicles = safeAppStorage.getJSON<Vehicle[]>('dpl_live_vehicles', safeAppStorage.getJSON<Vehicle[]>('dpl_cached_vehicles', []));
  }

  let clients: Client[] = (clientSnap?.docs || []).map((d: any) => ({ ...d.data(), id: d.id }));
  if (options.clients && clients.length === 0) {
    clients = safeAppStorage.getJSON<Client[]>('dpl_cached_clients', []);
  }

  return {
    version: '3.0.0',
    timestamp: new Date().toISOString(),
    backupType: 'SELECTIVE',
    app: 'DOCKS (PVT) LTD - ERP & Logistics Management',
    includedModules: {
      cases: options.cases,
      finance: options.finance,
      vehicles: options.vehicles,
      clients: options.clients
    },
    stats: {
      casesCount: cases.length,
      financeCount: finance.length,
      vehiclesCount: vehicles.length,
      clientsCount: clients.length
    },
    companyInfo: options.companyInfo || null,
    cases: options.cases ? cases : [],
    finance: options.finance ? finance : [],
    vehicles: options.vehicles ? vehicles : [],
    clients: options.clients ? clients : []
  };
}

/**
 * Permanently wipes live operational data from Firebase Firestore (Cases, Finance, Vehicles, Clients, Vendors, Templates, Ledgers, Notifications, Activity Logs).
 * Clears universal unified storage, localStorage, and sessionStorage completely.
 */
export async function wipeCompleteDatabase(): Promise<{
  success: boolean;
  deletedCounts: {
    cases: number;
    finances: number;
    vehicles: number;
    clients: number;
    vendors: number;
    recurringTemplates: number;
    staffLedgers: number;
    destinationStaff: number;
    notifications: number;
    activityLogs: number;
  };
}> {
  const deletedCounts = {
    cases: 0,
    finances: 0,
    vehicles: 0,
    clients: 0,
    vendors: 0,
    recurringTemplates: 0,
    staffLedgers: 0,
    destinationStaff: 0,
    notifications: 0,
    activityLogs: 0
  };

  const collectionsToWipe = [
    'cases',
    'finances',
    'finance',
    'vehicles',
    'clients',
    'vendors',
    'recurring_templates',
    'staff_ledgers',
    'destination_staff',
    'notifications',
    'activity_logs'
  ] as const;

  for (const colName of collectionsToWipe) {
    try {
      const snap = await getDocs(collection(db, colName));
      const deletePromises = snap.docs.map(async (docSnap) => {
        await deleteDoc(doc(db, colName, docSnap.id));
        if (colName === 'cases') deletedCounts.cases++;
        else if (colName === 'finances' || colName === 'finance') deletedCounts.finances++;
        else if (colName === 'vehicles') deletedCounts.vehicles++;
        else if (colName === 'clients') deletedCounts.clients++;
        else if (colName === 'vendors') deletedCounts.vendors++;
        else if (colName === 'recurring_templates') deletedCounts.recurringTemplates++;
        else if (colName === 'staff_ledgers') deletedCounts.staffLedgers++;
        else if (colName === 'destination_staff') deletedCounts.destinationStaff++;
        else if (colName === 'notifications') deletedCounts.notifications++;
        else if (colName === 'activity_logs') deletedCounts.activityLogs++;
      });
      await Promise.all(deletePromises);
    } catch (err) {
      console.warn(`Error wiping collection ${colName}:`, err);
    }
  }

  // 1. Wipe universal unified storage (all operational dpl_ keys in memory, localStorage, and sessionStorage)
  try {
    safeAppStorage.wipeAppOperationalData(true);
    safeAppStorage.setItem('dpl_cleanup_phantom_v3', 'done');
  } catch (e) {
    console.warn('Storage wipe notice:', e);
  }

  // 2. Explicitly remove all known keys to ensure complete wipe of general ledger, finance, cases, etc.
  const explicitKeys = [
    'dpl_live_finance', 'dpl_live_receivables', 'dpl_live_payables', 'dpl_live_cases',
    'dpl_live_transporters', 'dpl_live_vehicles', 'dpl_finance_client', 'dpl_finance_tab',
    'dpl_vendors_list', 'dpl_staff_ledgers', 'dpl_destination_staff', 'dpl_recurring_templates',
    'dpl_system_activity_logs', 'dpl_cached_cases', 'dpl_cached_finances', 'dpl_cached_vehicles',
    'dpl_cached_clients', 'dpl_cached_vendors', 'dpl_fleet_vehicles', 'dpl_all_cases', 'dpl_cases',
    'dpl_reg_draft_active', 'dpl_reg_step', 'dpl_reg_caseno', 'dpl_reg_formdata', 
    'dpl_reg_docs', 'dpl_reg_updated_at', 'dpl_reg_view', 'dpl_vehicles_data', 'dpl_registered_clients',
    'dpl_selected_case', 'dpl_selected_case_id', 'dpl_finance_active_tab', 'dpl_dashboard_timeframe',
    'dpl_ports', 'dpl_company_docs', 'dpl_custom_banks', 'dpl_last_cloud_backup_time'
  ];

  explicitKeys.forEach((k) => {
    safeAppStorage.removeItem(k);
    try { localStorage.removeItem(k); } catch (_) {}
    try { sessionStorage.removeItem(k); } catch (_) {}
  });

  // 3. Dispatch live update events so currently rendered views immediately flush state
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('dpl_cases_updated'));
    window.dispatchEvent(new Event('dpl_finance_updated'));
    window.dispatchEvent(new Event('dpl_branding_changed'));
    window.dispatchEvent(new Event('storage'));
  }

  return {
    success: true,
    deletedCounts
  };
}

/**
 * Restores database collections and local state from a complete snapshot
 */
export async function restoreDatabaseSnapshot(snapshot: any): Promise<{
  success: boolean;
  restoredCounts: {
    cases: number;
    finance: number;
    vehicles: number;
    clients: number;
    users: number;
    vendors: number;
    recurringTemplates: number;
    staffLedgers: number;
    destinationStaff: number;
    notifications: number;
    activityLogs: number;
  };
}> {
  if (!snapshot || typeof snapshot !== 'object') {
    throw new Error('Invalid snapshot structure');
  }

  let casesCount = 0;
  let finCount = 0;
  let vehCount = 0;
  let clientCount = 0;
  let userCount = 0;
  let vendorCount = 0;
  let recurringCount = 0;
  let staffLedgersCount = 0;
  let destStaffCount = 0;
  let notifCount = 0;
  let activityLogsCount = 0;

  // 1. Cases
  if (Array.isArray(snapshot.cases)) {
    for (const c of snapshot.cases) {
      if (c && c.id) {
        await setDoc(doc(db, 'cases', String(c.id)), sanitizeForFirestore(c), { merge: true });
        casesCount++;
      }
    }
    safeAppStorage.setJSON('dpl_live_cases', snapshot.cases);
  }

  // 2. Finance
  if (Array.isArray(snapshot.finance)) {
    for (const f of snapshot.finance) {
      if (f && f.id) {
        await setDoc(doc(db, 'finances', String(f.id)), sanitizeForFirestore(f), { merge: true });
        finCount++;
      }
    }
    // Partition finance entries for Finance.tsx states
    const cash = snapshot.finance.filter((f: any) => f.type === 'INFLOW' || f.type === 'OUTFLOW');
    const recv = snapshot.finance.filter((f: any) => f.type === 'RECEIVABLE');
    const pay = snapshot.finance.filter((f: any) => f.type === 'PAYABLE');

    safeAppStorage.setJSON('dpl_live_finance', cash.length > 0 ? cash : snapshot.finance);
    safeAppStorage.setJSON('dpl_live_receivables', recv);
    safeAppStorage.setJSON('dpl_live_payables', pay);
  }

  // 3. Vehicles
  if (Array.isArray(snapshot.vehicles)) {
    for (const v of snapshot.vehicles) {
      if (v && v.id) {
        await setDoc(doc(db, 'vehicles', String(v.id)), sanitizeForFirestore(v), { merge: true });
        vehCount++;
      }
    }
    safeAppStorage.setJSON('dpl_live_vehicles', snapshot.vehicles);
    safeAppStorage.setJSON('dpl_cached_vehicles', snapshot.vehicles);
  }

  // 4. Clients
  if (Array.isArray(snapshot.clients)) {
    for (const cl of snapshot.clients) {
      if (cl && cl.id) {
        await setDoc(doc(db, 'clients', String(cl.id)), sanitizeForFirestore(cl), { merge: true });
        clientCount++;
      }
    }
    safeAppStorage.setJSON('dpl_cached_clients', snapshot.clients);
  }

  // 5. Users
  if (Array.isArray(snapshot.users)) {
    for (const u of snapshot.users) {
      if (u && u.id) {
        await setDoc(doc(db, 'users', String(u.id)), sanitizeForFirestore(u), { merge: true });
        userCount++;
      }
    }
  }

  // 6. Vendors
  const vendorsList = snapshot.vendors || snapshot.vendorsList;
  if (Array.isArray(vendorsList)) {
    for (const vnd of vendorsList) {
      if (vnd && vnd.id) {
        await setDoc(doc(db, 'vendors', String(vnd.id)), sanitizeForFirestore(vnd), { merge: true });
        vendorCount++;
      }
    }
    safeAppStorage.setJSON('dpl_vendors_list', vendorsList);
  }

  // 7. Recurring Templates
  const recurringList = snapshot.recurringTemplates || snapshot.recurring_templates;
  if (Array.isArray(recurringList)) {
    for (const rec of recurringList) {
      if (rec && rec.id) {
        await setDoc(doc(db, 'recurring_templates', String(rec.id)), sanitizeForFirestore(rec), { merge: true });
        recurringCount++;
      }
    }
    safeAppStorage.setJSON('dpl_recurring_templates', recurringList);
  }

  // 8. Staff Ledgers
  const staffList = snapshot.staffLedgers || snapshot.staff_ledgers;
  if (Array.isArray(staffList)) {
    for (const st of staffList) {
      if (st && st.id) {
        await setDoc(doc(db, 'staff_ledgers', String(st.id)), sanitizeForFirestore(st), { merge: true });
        staffLedgersCount++;
      }
    }
    safeAppStorage.setJSON('dpl_staff_ledgers', staffList);
  }

  // 9. Destination Staff
  const destStaff = snapshot.destinationStaff || snapshot.destination_staff;
  if (Array.isArray(destStaff)) {
    for (const ds of destStaff) {
      if (ds && ds.id) {
        await setDoc(doc(db, 'destination_staff', String(ds.id)), sanitizeForFirestore(ds), { merge: true });
        destStaffCount++;
      }
    }
    safeAppStorage.setJSON('dpl_destination_staff', destStaff);
  }

  // 10. Notifications
  if (Array.isArray(snapshot.notifications)) {
    for (const notif of snapshot.notifications) {
      if (notif && notif.id) {
        await setDoc(doc(db, 'notifications', String(notif.id)), sanitizeForFirestore(notif), { merge: true });
        notifCount++;
      }
    }
  }

  // 11. Activity Logs
  const actLogs = snapshot.activityLogs || snapshot.activity_logs;
  if (Array.isArray(actLogs)) {
    for (const log of actLogs) {
      if (log && log.id) {
        await setDoc(doc(db, 'activity_logs', String(log.id)), sanitizeForFirestore(log), { merge: true });
        activityLogsCount++;
      }
    }
    safeAppStorage.setJSON('dpl_system_activity_logs', actLogs);
  }

  // 12. Company Info & Settings
  if (snapshot.companyInfo) {
    try {
      await setDoc(doc(db, 'settings', 'companyInfo'), sanitizeForFirestore(snapshot.companyInfo), { merge: true });
    } catch (_) {}
  }

  // Notify active components
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('dpl_cases_updated'));
    window.dispatchEvent(new Event('dpl_finance_updated'));
    window.dispatchEvent(new Event('dpl_branding_changed'));
    window.dispatchEvent(new Event('storage'));
  }

  return {
    success: true,
    restoredCounts: {
      cases: casesCount,
      finance: finCount,
      vehicles: vehCount,
      clients: clientCount,
      users: userCount,
      vendors: vendorCount,
      recurringTemplates: recurringCount,
      staffLedgers: staffLedgersCount,
      destinationStaff: destStaffCount,
      notifications: notifCount,
      activityLogs: activityLogsCount
    }
  };
}

// RECURRING FINANCE TEMPLATES (Monthly Fixed Expenses & Receivables)
export const DEFAULT_RECURRING_TEMPLATES: RecurringFinanceTemplate[] = [
  {
    id: 'rec_office_rent',
    title: 'Head Office Monthly Rent',
    type: 'PAYABLE',
    amount: 150000,
    party: 'Karachi Corporate Plaza Landlord',
    category: 'Rent & Facilities',
    frequency: 'MONTHLY_FIRST',
    active: true,
    notes: 'Payable automatically on 1st of every month'
  },
  {
    id: 'rec_vehicle_loan',
    title: 'Fleet Vehicle Financing (EMI)',
    type: 'PAYABLE',
    amount: 85000,
    party: 'Meezan Bank Ltd (Auto Ijarah)',
    category: 'Loan Repayment',
    frequency: 'MONTHLY_FIRST',
    active: true,
    notes: 'Monthly loan installment'
  },
  {
    id: 'rec_internet_util',
    title: 'High Speed Optical Internet & Telecom',
    type: 'PAYABLE',
    amount: 14500,
    party: 'PTCL Corporate Services',
    category: 'Utilities & Telecom',
    frequency: 'MONTHLY_FIRST',
    active: true,
    notes: 'Monthly broadband bill'
  },
  {
    id: 'rec_security_guard',
    title: 'Armed Security & Port Yard Retainer',
    type: 'PAYABLE',
    amount: 65000,
    party: 'Askari Security Guards (Pvt) Ltd',
    category: 'Security & Operations',
    frequency: 'MONTHLY_FIRST',
    active: true,
    notes: 'Monthly security guard services'
  }
];

export function subscribeToRecurringTemplates(
  onData: (items: RecurringFinanceTemplate[]) => void,
  onError?: (err: any) => void
) {
  const path = 'recurring_templates';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      if (snapshot.empty) {
        onData([]);
        return;
      }
      const items: RecurringFinanceTemplate[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ ...docSnap.data(), id: docSnap.id } as RecurringFinanceTemplate);
      });
      onData(items);
    },
    (error) => {
      console.warn(`Firestore subscription notice on ${path}:`, error);
      if (onError) onError(error);
      onData([]);
    }
  );
}

export async function saveRecurringTemplateToFirestore(tpl: RecurringFinanceTemplate): Promise<void> {
  const path = 'recurring_templates';
  const docId = tpl.id || `rec_${Date.now()}`;
  try {
    const payload = sanitizeForFirestore({
      ...tpl,
      id: docId,
      updatedAt: new Date().toISOString()
    });
    await setDoc(doc(db, path, docId), payload, { merge: true });
  } catch (error) {
    console.warn(`Firestore saveRecurringTemplate warning:`, error);
  }
}

export async function deleteRecurringTemplateFromFirestore(id: string): Promise<void> {
  const path = 'recurring_templates';
  try {
    await deleteDoc(doc(db, path, id));
  } catch (error) {
    console.warn(`Firestore deleteRecurringTemplate warning:`, error);
  }
}
