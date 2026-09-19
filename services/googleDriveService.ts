import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { auth } from './firebase';
import { safeAppStorage } from './storage';

// Google Drive scopes requested & configured in OAuth setup
export const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.activity',
  'https://www.googleapis.com/auth/drive.activity.readonly',
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/drive.apps.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.install',
  'https://www.googleapis.com/auth/drive.meet.readonly',
  'https://www.googleapis.com/auth/drive.metadata',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.photos.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.scripts'
];

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
  parents?: string[];
  shared?: boolean;
}

const STORAGE_KEY_TOKEN = 'dpl_drive_access_token';
const STORAGE_KEY_USER = 'dpl_drive_user_info';
const STORAGE_KEY_TIMESTAMP = 'dpl_drive_token_timestamp';

// Persistent token cache so user remains connected across page refreshes
let cachedAccessToken: string | null = safeAppStorage.getItem(STORAGE_KEY_TOKEN);
let isSigningIn = false;

// Initialize Drive Provider with scopes
const driveProvider = new GoogleAuthProvider();
DRIVE_SCOPES.forEach(scope => driveProvider.addScope(scope));

// Initialize Auth Listener
export const initDriveAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    const savedToken = safeAppStorage.getItem(STORAGE_KEY_TOKEN);
    if (savedToken) {
      cachedAccessToken = savedToken;
      if (user && onAuthSuccess) {
        onAuthSuccess(user, savedToken);
      }
    } else if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      if (!savedToken) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    }
  });
};

// Sign in with Google with Drive Scopes
export const signInWithGoogleDrive = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, driveProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Could not retrieve access token for Google Drive. Please approve the permissions.');
    }
    cachedAccessToken = credential.accessToken;
    
    // Save persistently so connection remains active
    safeAppStorage.setItem(STORAGE_KEY_TOKEN, credential.accessToken);
    safeAppStorage.setItem(STORAGE_KEY_TIMESTAMP, Date.now().toString());
    safeAppStorage.setItem(STORAGE_KEY_USER, JSON.stringify({
      displayName: result.user.displayName,
      email: result.user.email,
      photoURL: result.user.photoURL,
      uid: result.user.uid
    }));

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Drive sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getDriveAccessToken = (): string | null => {
  if (!cachedAccessToken) {
    cachedAccessToken = safeAppStorage.getItem(STORAGE_KEY_TOKEN);
  }
  return cachedAccessToken;
};

export const setDriveAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  if (token) {
    safeAppStorage.setItem(STORAGE_KEY_TOKEN, token);
    safeAppStorage.setItem(STORAGE_KEY_TIMESTAMP, Date.now().toString());
  } else {
    safeAppStorage.removeItem(STORAGE_KEY_TOKEN);
    safeAppStorage.removeItem(STORAGE_KEY_TIMESTAMP);
    safeAppStorage.removeItem(STORAGE_KEY_USER);
  }
};

export const getSavedDriveUser = (): any | null => {
  try {
    const data = safeAppStorage.getItem(STORAGE_KEY_USER);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

export const disconnectDrive = async () => {
  cachedAccessToken = null;
  safeAppStorage.removeItem(STORAGE_KEY_TOKEN);
  safeAppStorage.removeItem(STORAGE_KEY_TIMESTAMP);
  safeAppStorage.removeItem(STORAGE_KEY_USER);
};

// ==========================================
// Google Drive v3 REST API Client Functions
// ==========================================

/**
 * List files and folders from Google Drive
 */
export async function listDriveFiles(
  folderId: string = 'root', 
  searchQuery: string = ''
): Promise<{ files: DriveFileItem[]; nextPageToken?: string }> {
  const token = getDriveAccessToken();
  if (!token) {
    throw new Error('Google Drive is not connected. Please sign in with Google Drive first.');
  }

  let q = `'${folderId}' in parents and trashed = false`;
  if (searchQuery.trim()) {
    q += ` and name contains '${searchQuery.replace(/'/g, "\\'")}'`;
  }

  const fields = 'nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink, webContentLink, iconLink, thumbnailLink, parents, shared)';
  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.set('q', q);
  url.searchParams.set('fields', fields);
  url.searchParams.set('pageSize', '40');
  url.searchParams.set('orderBy', 'folder,modifiedTime desc,name');

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    if (response.status === 401) {
      cachedAccessToken = null;
      throw new Error('Google Drive session expired. Please reconnect.');
    }
    throw new Error(err.error?.message || `Failed to fetch Google Drive files (${response.status})`);
  }

  const data = await response.json();
  return {
    files: data.files || [],
    nextPageToken: data.nextPageToken
  };
}

/**
 * Create a new folder in Google Drive
 */
export async function createDriveFolder(name: string, parentId: string = 'root'): Promise<DriveFileItem> {
  const token = getDriveAccessToken();
  if (!token) throw new Error('Google Drive is not connected.');

  const metadata = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [parentId]
  };

  const response = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metadata)
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to create folder in Google Drive');
  }

  return response.json();
}

/**
 * Upload a file directly to Google Drive (Multipart upload)
 */
export async function uploadFileToDrive(
  file: File, 
  parentId: string = 'root',
  onProgress?: (percent: number) => void
): Promise<DriveFileItem> {
  const token = getDriveAccessToken();
  if (!token) throw new Error('Google Drive is not connected.');

  const metadata = {
    name: file.name,
    parents: [parentId]
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;

  const reader = new FileReader();
  const fileDataPromise = new Promise<ArrayBuffer>((resolve, reject) => {
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });

  const fileData = await fileDataPromise;
  const contentType = file.type || 'application/octet-stream';

  const multipartRequestBody = new Blob([
    delimiter,
    'Content-Type: application/json; charset=UTF-8\r\n\r\n',
    JSON.stringify(metadata),
    delimiter,
    `Content-Type: ${contentType}\r\n`,
    'Content-Transfer-Encoding: base64\r\n\r\n',
    arrayBufferToBase64(fileData),
    closeDelim
  ], { type: `multipart/related; boundary=${boundary}` });

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime,webViewLink,webContentLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: multipartRequestBody
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to upload file to Google Drive (${response.status})`);
  }

  if (onProgress) onProgress(100);
  return response.json();
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Delete a file or folder from Google Drive
 * NOTE: Always preceded by explicit user confirmation modal.
 */
export async function deleteDriveFile(fileId: string): Promise<void> {
  const token = getDriveAccessToken();
  if (!token) throw new Error('Google Drive is not connected.');

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok && response.status !== 204) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to delete file from Google Drive');
  }
}

// ==========================================
// DOCKS Cloud Database Backup Helpers
// ==========================================

const DOCKS_BACKUP_FOLDER_NAME = 'DOCKS_LTD_SYSTEM_BACKUPS';
let cachedBackupFolderId: string | null = null;

/**
 * Finds or creates the dedicated DOCKS database backup folder in Google Drive
 */
export async function getOrCreateDocksBackupFolder(): Promise<string> {
  if (cachedBackupFolderId) return cachedBackupFolderId;
  const token = getDriveAccessToken();
  if (!token) throw new Error('Google Drive is not connected.');

  // Search for folder
  const query = `name = '${DOCKS_BACKUP_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`;
  
  const searchRes = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      cachedBackupFolderId = data.files[0].id;
      return cachedBackupFolderId!;
    }
  }

  // If not found, create it
  const created = await createDriveFolder(DOCKS_BACKUP_FOLDER_NAME, 'root');
  cachedBackupFolderId = created.id;
  return cachedBackupFolderId;
}

/**
 * Uploads complete JSON snapshot directly to Google Drive in DOCKS backup vault
 */
export async function uploadDatabaseBackupToDrive(snapshotData: any): Promise<DriveFileItem> {
  const folderId = await getOrCreateDocksBackupFolder();
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `DOCKS_LTD_Database_Backup_${dateStr}.json`;

  const jsonString = JSON.stringify(snapshotData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const file = new File([blob], fileName, { type: 'application/json' });

  return uploadFileToDrive(file, folderId);
}

/**
 * Lists all database backup archives from Google Drive
 */
export async function listDatabaseBackupsFromDrive(): Promise<DriveFileItem[]> {
  const token = getDriveAccessToken();
  if (!token) return [];

  try {
    const folderId = await getOrCreateDocksBackupFolder();
    const query = `'${folderId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`;
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&orderBy=createdTime desc&fields=files(id,name,mimeType,size,modifiedTime,webViewLink,webContentLink)`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    return data.files || [];
  } catch (err) {
    console.warn('Failed to list backups from Drive:', err);
    return [];
  }
}

/**
 * Reads JSON content of a database backup file from Google Drive
 */
export async function fetchBackupFileJson(fileId: string): Promise<any> {
  const token = getDriveAccessToken();
  if (!token) throw new Error('Google Drive is not connected.');

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    throw new Error(`Failed to download backup file content (${res.status})`);
  }

  return res.json();
}
