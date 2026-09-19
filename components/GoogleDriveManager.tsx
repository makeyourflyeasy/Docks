import React, { useState, useEffect } from 'react';
import { 
  HardDrive, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  Download, 
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Trash2,
  Copy,
  Check,
  Database,
  Archive,
  CloudUpload,
  Clock,
  RotateCcw,
  Loader2,
  FileJson,
  Info
} from 'lucide-react';
import { 
  signInWithGoogleDrive, 
  disconnectDrive,
  getDriveAccessToken, 
  getSavedDriveUser,
  uploadDatabaseBackupToDrive,
  listDatabaseBackupsFromDrive,
  fetchBackupFileJson,
  deleteDriveFile,
  DriveFileItem 
} from '../services/googleDriveService';
import { 
  exportCompleteDatabaseSnapshot, 
  restoreDatabaseSnapshot 
} from '../services/dbService';
import { auth, onAuthStateChanged, FirebaseUser } from '../services/firebase';
import { safeAppStorage } from '../services/storage';

interface GoogleDriveManagerProps {
  onAttachFileToCase?: (file: DriveFileItem) => void;
  attachedMode?: boolean;
}

const FIREBASE_CONSOLE_URL = 'https://console.firebase.google.com/project/gen-lang-client-0135652581/authentication/settings';

export const GoogleDriveManager: React.FC<GoogleDriveManagerProps> = ({ 
  attachedMode = false 
}) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [savedUser, setSavedUser] = useState<any>(getSavedDriveUser());
  const [isConnected, setIsConnected] = useState<boolean>(!!getDriveAccessToken());
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [loadingBackups, setLoadingBackups] = useState<boolean>(false);
  const [backups, setBackups] = useState<DriveFileItem[]>([]);
  
  // Backup & Restore states
  const [isCreatingBackup, setIsCreatingBackup] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [restoreConfirmFile, setRestoreConfirmFile] = useState<DriveFileItem | null>(null);
  const [deleteConfirmFile, setDeleteConfirmFile] = useState<DriveFileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Status & Error Messages
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState<boolean>(false);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(
    safeAppStorage.getItem('dpl_last_cloud_backup_time')
  );

  // Check if current domain error is auth/unauthorized-domain
  const isUnauthorizedDomainError = errorMessage?.includes('auth/unauthorized-domain');
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'docks.live';

  useEffect(() => {
    // Listen to Firebase auth or restored saved session
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      const token = getDriveAccessToken();
      setIsConnected(!!token);
      if (!user && !token) {
        setSavedUser(null);
      } else {
        setSavedUser(getSavedDriveUser());
      }
    });

    // Check if token exists in persistent storage
    const token = getDriveAccessToken();
    if (token) {
      setIsConnected(true);
      setSavedUser(getSavedDriveUser());
      loadBackups();
    }

    return () => unsub();
  }, []);

  const loadBackups = async () => {
    if (!getDriveAccessToken()) return;
    setLoadingBackups(true);
    setErrorMessage(null);
    try {
      const items = await listDatabaseBackupsFromDrive();
      setBackups(items);
    } catch (err: any) {
      console.error('Failed to load database backups:', err);
      if (err.message?.includes('401') || err.message?.includes('expired') || err.message?.includes('invalid_grant')) {
        handleDisconnect();
        setErrorMessage('Google Drive connection session expired. Please sign in again.');
      } else {
        setErrorMessage(err.message || 'Failed to load backups from Google Drive');
      }
    } finally {
      setLoadingBackups(false);
    }
  };

  const handleConnect = async () => {
    setIsAuthenticating(true);
    setErrorMessage(null);
    try {
      const res = await signInWithGoogleDrive();
      if (res) {
        setIsConnected(true);
        setCurrentUser(res.user);
        setSavedUser({
          displayName: res.user.displayName,
          email: res.user.email,
          photoURL: res.user.photoURL,
          uid: res.user.uid
        });
        setSuccessMessage('Successfully connected Google Drive for Database Cloud Backups!');
        setTimeout(() => setSuccessMessage(null), 4000);
        loadBackups();
      }
    } catch (err: any) {
      console.error('Drive connection error:', err);
      setErrorMessage(err.message || 'Failed to authenticate with Google Drive');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnectDrive();
    setIsConnected(false);
    setSavedUser(null);
    setBackups([]);
    setSuccessMessage('Disconnected from Google Drive.');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleCreateInstantBackup = async () => {
    if (!isConnected) {
      setErrorMessage('Please connect Google Drive before creating a cloud backup.');
      return;
    }

    setIsCreatingBackup(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // 1. Gather all live collections from database
      const snapshot = await exportCompleteDatabaseSnapshot();
      
      // 2. Upload to dedicated DOCKS_LTD_SYSTEM_BACKUPS folder in Google Drive
      const uploadedFile = await uploadDatabaseBackupToDrive(snapshot);

      const timestampNow = new Date().toLocaleString();
      setLastBackupTime(timestampNow);
      safeAppStorage.setItem('dpl_last_cloud_backup_time', timestampNow);

      setSuccessMessage(
        `Database backup saved to Google Drive! (${snapshot.stats.casesCount} Cases, ${snapshot.stats.financeCount} Finance entries, ${snapshot.stats.vehiclesCount} Vehicles archived).`
      );
      setTimeout(() => setSuccessMessage(null), 6000);

      // Refresh backup list
      await loadBackups();
    } catch (err: any) {
      console.error('Backup creation error:', err);
      setErrorMessage(err.message || 'Failed to create and upload database backup');
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleDownloadLocalBackup = async () => {
    try {
      const snapshot = await exportCompleteDatabaseSnapshot();
      const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DOCKS_LTD_Database_Backup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccessMessage('Database snapshot downloaded to your device.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage('Failed to generate local database download.');
    }
  };

  const handleConfirmRestore = async () => {
    if (!restoreConfirmFile) return;
    setIsRestoring(true);
    setErrorMessage(null);

    try {
      // Fetch JSON from Google Drive
      const snapshot = await fetchBackupFileJson(restoreConfirmFile.id);
      
      // Restore into Firestore
      const result = await restoreDatabaseSnapshot(snapshot);

      setSuccessMessage(
        `Database successfully restored from Google Drive! (${result.restoredCounts.cases} Cases, ${result.restoredCounts.finance} Finance vouchers updated).`
      );
      setTimeout(() => setSuccessMessage(null), 7000);
      setRestoreConfirmFile(null);
    } catch (err: any) {
      console.error('Restore error:', err);
      setErrorMessage(err.message || 'Failed to restore database from backup file');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDeleteBackup = async () => {
    if (!deleteConfirmFile) return;
    setIsDeleting(true);
    try {
      await deleteDriveFile(deleteConfirmFile.id);
      setSuccessMessage('Backup archive deleted from Google Drive.');
      setTimeout(() => setSuccessMessage(null), 3000);
      setDeleteConfirmFile(null);
      await loadBackups();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete backup from Google Drive');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyDomain = () => {
    navigator.clipboard.writeText(currentHost);
    setCopiedDomain(true);
    setTimeout(() => setCopiedDomain(false), 3000);
  };

  return (
    <div className="w-full flex flex-col space-y-6 animate-fade-in text-gray-100">
      
      {/* Top Banner Header */}
      <div className="bg-slate-900/90 border border-amber-500/30 rounded-3xl p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        <div 
          className="absolute -right-10 -bottom-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"
        />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-inner shrink-0">
              <Database size={30} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                  Google Drive Cloud Database Vault
                </h2>
                {isConnected ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Always Connected & Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    <Lock size={12} /> Protected Vault
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-2xl leading-relaxed">
                Dedicated cloud repository for automated & manual backups of all DOCKS (PVT) LTD data. 
                All cases, financial ledgers, vehicles, and documents are securely mirrored.
              </p>
            </div>
          </div>

          {/* Connection Trigger Buttons */}
          <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
            {!isConnected ? (
              <button
                type="button"
                onClick={handleConnect}
                disabled={isAuthenticating}
                className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    <span>Connecting Drive...</span>
                  </>
                ) : (
                  <>
                    <HardDrive size={16} />
                    <span>Connect Google Drive</span>
                  </>
                )}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadBackups}
                  disabled={loadingBackups}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                  title="Refresh Cloud Backups"
                >
                  <RefreshCw size={16} className={loadingBackups ? 'animate-spin text-amber-400' : ''} />
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="text-xs px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold transition-colors cursor-pointer"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Connected User Account Info Strip */}
        {isConnected && (savedUser || currentUser) && (
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between flex-wrap gap-2 text-xs text-gray-400">
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Connected Google Account:</span>
              <span className="font-bold text-amber-300">
                {savedUser?.email || currentUser?.email || 'Authorized Administrator'}
              </span>
            </div>
            {lastBackupTime && (
              <div className="flex items-center gap-1.5 text-emerald-400">
                <Clock size={13} />
                <span>Last Cloud Backup: {lastBackupTime}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SPECIAL NOTICE: auth/unauthorized-domain Error Guide */}
      {isUnauthorizedDomainError && (
        <div className="bg-amber-950/50 border-2 border-amber-500/60 rounded-3xl p-6 shadow-2xl backdrop-blur-md animate-fade-in relative">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shrink-0">
              <AlertCircle size={28} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-lg font-black text-amber-300 tracking-wide">
                  Domain Authorization Required for "{currentHost}"
                </h3>
                <span className="text-[11px] bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full font-mono border border-amber-500/30">
                  Firebase Error: auth/unauthorized-domain
                </span>
              </div>

              <p className="text-xs sm:text-sm text-gray-300 mt-2 leading-relaxed">
                Google Firebase Authentication security rule requires custom domains like{' '}
                <strong className="text-white font-mono bg-black/40 px-1.5 py-0.5 rounded border border-white/10">{currentHost}</strong>{' '}
                to be registered in your Firebase Project’s <strong>Authorized Domains</strong> before Google Sign-In is allowed.
              </p>

              {/* Step-by-Step Instructions */}
              <div className="mt-4 p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2.5 text-xs">
                <div className="font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Info size={14} /> Quick 30-Second Fix in Firebase Console:
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-gray-300 leading-relaxed">
                  <li>
                    Open your Firebase Authentication settings in a new tab:
                    <a 
                      href={FIREBASE_CONSOLE_URL} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="ml-2 text-amber-400 hover:text-amber-300 underline font-bold inline-flex items-center gap-1"
                    >
                      Open Firebase Console Settings <ExternalLink size={11} />
                    </a>
                  </li>
                  <li>
                    Go to the <strong>"Settings"</strong> tab and scroll down to the <strong>"Authorized domains"</strong> (مجاز ڈومینز) section.
                  </li>
                  <li>
                    Click <strong>"Add domain"</strong> and enter:
                    <span className="inline-flex items-center gap-1.5 ml-1.5 bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono font-bold">
                      {currentHost}
                      <button
                        type="button"
                        onClick={handleCopyDomain}
                        className="text-gray-300 hover:text-white p-0.5"
                        title="Copy domain name"
                      >
                        {copiedDomain ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      </button>
                    </span>
                    <span className="text-gray-400 ml-1">(Also add <code className="text-amber-300">www.{currentHost}</code>)</span>
                  </li>
                  <li>
                    Click <strong>Save</strong>. After saving, click "Retry Google Drive Sign In" below!
                  </li>
                </ol>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <a
                  href={FIREBASE_CONSOLE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-2 transition shadow-md cursor-pointer"
                >
                  <span>1. Open Firebase Auth Settings</span>
                  <ExternalLink size={13} />
                </a>

                <button
                  type="button"
                  onClick={handleCopyDomain}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 border border-white/10 transition cursor-pointer"
                >
                  {copiedDomain ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copiedDomain ? 'Domain Copied!' : `Copy "${currentHost}"`}</span>
                </button>

                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={isAuthenticating}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-2 transition shadow-md cursor-pointer"
                >
                  {isAuthenticating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  <span>2. Retry Google Drive Sign In</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* General Notification Messages */}
      {errorMessage && !isUnauthorizedDomainError && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-center gap-3 animate-fade-in">
          <AlertCircle size={18} className="shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm flex items-center gap-3 animate-fade-in">
          <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Main Action Hub: 1-Click Database Cloud Backup */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Card 1: Instant Cloud Backup */}
        <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col justify-between backdrop-blur-md">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
              <CloudUpload size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">
              Live Cloud Backup
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed mb-4">
              Creates an encrypted, timestamped archive of all Cases, GD Documents, Ledgers, Vehicles, and Clients directly in your Google Drive.
            </p>
          </div>

          <div className="space-y-2.5 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={handleCreateInstantBackup}
              disabled={!isConnected || isCreatingBackup}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 active:scale-[0.99] text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              {isCreatingBackup ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving to Google Drive...</span>
                </>
              ) : (
                <>
                  <CloudUpload size={16} />
                  <span>Backup All Data to Drive</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadLocalBackup}
              className="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Download size={14} />
              <span>Download JSON to Device</span>
            </button>
          </div>
        </div>

        {/* Card 2: Automatic Sync & Redundancy Info */}
        <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col justify-between backdrop-blur-md">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">
              Data Security & Privacy
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed mb-3">
              Only database snapshots are stored in Google Drive inside the dedicated folder:
              <span className="block mt-1 font-mono text-[11px] text-amber-300">
                Google Drive &gt; DOCKS_LTD_SYSTEM_BACKUPS
              </span>
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-2 text-xs">
            <div className="flex items-center justify-between text-gray-300">
              <span>Primary Database:</span>
              <span className="text-emerald-400 font-bold font-mono">Firestore Cloud</span>
            </div>
            <div className="flex items-center justify-between text-gray-300">
              <span>Backup Redundancy:</span>
              <span className="text-amber-300 font-bold font-mono">Google Drive v3</span>
            </div>
            <div className="flex items-center justify-between text-gray-300">
              <span>Access Level:</span>
              <span className="text-purple-300 font-bold font-mono">Admin Only</span>
            </div>
          </div>
        </div>

        {/* Card 3: Database Restore Vault */}
        <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col justify-between backdrop-blur-md">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4">
              <RotateCcw size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">
              Instant System Recovery
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed mb-4">
              Restore the entire DOCKS system database state (cases, accounts, vehicles) from any previous Google Drive backup snapshot with zero downtime.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 text-xs text-gray-400">
            <p className="text-[11px] leading-snug">
              Select any archive from the table below to inspect records and trigger one-click restore.
            </p>
          </div>
        </div>
      </div>

      {/* Cloud Backup Archives Table */}
      <div className="bg-slate-900/90 border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md">
        <div className="p-5 border-b border-white/10 flex items-center justify-between flex-wrap gap-3 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Archive size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Google Drive Backup Archives</h3>
              <p className="text-xs text-gray-400">All saved system snapshots stored in your Google Drive</p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadBackups}
            disabled={loadingBackups || !isConnected}
            className="text-xs px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw size={13} className={loadingBackups ? 'animate-spin' : ''} />
            <span>Reload Archives</span>
          </button>
        </div>

        {/* Backups List */}
        {!isConnected ? (
          <div className="p-12 text-center">
            <HardDrive className="mx-auto text-gray-600 mb-3" size={40} />
            <h4 className="text-sm font-bold text-gray-300">Google Drive Not Connected</h4>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">
              Connect your Google Drive account above to view and synchronize database backups.
            </p>
            <button
              type="button"
              onClick={handleConnect}
              disabled={isAuthenticating}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer"
            >
              Connect Google Drive Now
            </button>
          </div>
        ) : loadingBackups ? (
          <div className="p-12 text-center">
            <Loader2 className="animate-spin mx-auto text-amber-400 mb-3" size={32} />
            <p className="text-xs text-gray-400">Loading backup archives from Google Drive...</p>
          </div>
        ) : backups.length === 0 ? (
          <div className="p-12 text-center">
            <FileJson className="mx-auto text-gray-600 mb-3" size={40} />
            <h4 className="text-sm font-bold text-gray-300">No Backups Found in Google Drive</h4>
            <p className="text-xs text-gray-500 max-w-md mx-auto mt-1 mb-4">
              You haven't created any database backups yet. Click "Backup All Data to Drive" above to create your first cloud snapshot.
            </p>
            <button
              type="button"
              onClick={handleCreateInstantBackup}
              disabled={isCreatingBackup}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer"
            >
              Create First Cloud Backup
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-white/5 uppercase font-semibold text-[10px] text-gray-400 tracking-wider border-b border-white/5">
                <tr>
                  <th className="py-3 px-4">Backup Archive Name</th>
                  <th className="py-3 px-4">Created Time</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Destination</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {backups.map((b) => (
                  <tr key={b.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-white flex items-center gap-2">
                      <FileJson size={16} className="text-amber-400 shrink-0" />
                      <span className="truncate max-w-xs">{b.name}</span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-400">
                      {b.modifiedTime ? new Date(b.modifiedTime).toLocaleString() : 'Recent'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-gray-300">
                      {b.size ? `${(parseInt(b.size, 10) / 1024).toFixed(1)} KB` : 'JSON Snapshot'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        Google Drive
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {b.webViewLink && (
                          <a
                            href={b.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition"
                            title="Open in Google Drive"
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => setRestoreConfirmFile(b)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-bold transition flex items-center gap-1 cursor-pointer text-[11px]"
                          title="Restore database from this backup"
                        >
                          <RotateCcw size={12} />
                          <span>Restore</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmFile(b)}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition cursor-pointer"
                          title="Delete backup archive"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal: Restore Database */}
      {restoreConfirmFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-4">
              <RotateCcw size={24} />
            </div>

            <h3 className="text-lg font-black text-center text-white mb-2">
              Restore Database from Backup?
            </h3>
            <p className="text-xs text-gray-300 text-center mb-4 leading-relaxed">
              Are you sure you want to restore the database from:
              <strong className="block text-amber-300 mt-1 font-mono">{restoreConfirmFile.name}</strong>
              This will update all cases, finance transactions, and vehicles with records from this backup.
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setRestoreConfirmFile(null)}
                disabled={isRestoring}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={isRestoring}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isRestoring ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Restoring Database...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw size={14} />
                    <span>Confirm & Restore</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Backup */}
      {deleteConfirmFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-red-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} />
            </div>

            <h3 className="text-lg font-black text-center text-white mb-2">
              Delete Backup Archive?
            </h3>
            <p className="text-xs text-gray-300 text-center mb-4 leading-relaxed">
              Are you sure you want to delete this backup from Google Drive?
              <strong className="block text-red-400 mt-1 font-mono">{deleteConfirmFile.name}</strong>
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setDeleteConfirmFile(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteBackup}
                disabled={isDeleting}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                <span>Delete Archive</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default GoogleDriveManager;
