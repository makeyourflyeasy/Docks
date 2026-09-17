import React, { useState, useEffect, useRef } from 'react';
import { 
  Folder, 
  FileText, 
  Image as ImageIcon, 
  FileArchive, 
  File, 
  Upload, 
  Plus, 
  Trash2, 
  ExternalLink, 
  RefreshCw, 
  Search, 
  ArrowLeft, 
  HardDrive, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  Download, 
  ShieldCheck,
  FolderPlus,
  X,
  Loader2
} from 'lucide-react';
import { 
  listDriveFiles, 
  createDriveFolder, 
  uploadFileToDrive, 
  deleteDriveFile, 
  signInWithGoogleDrive, 
  disconnectDrive,
  getDriveAccessToken, 
  DriveFileItem 
} from '../services/googleDriveService';
import { auth, onAuthStateChanged, FirebaseUser } from '../services/firebase';

interface GoogleDriveManagerProps {
  onAttachFileToCase?: (file: DriveFileItem) => void;
  attachedMode?: boolean;
}

interface BreadcrumbItem {
  id: string;
  name: string;
}

const GoogleDriveManager: React.FC<GoogleDriveManagerProps> = ({ 
  onAttachFileToCase,
  attachedMode = false
}) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [isConnected, setIsConnected] = useState<boolean>(!!getDriveAccessToken());
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string>('root');
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: 'root', name: 'My Google Drive' }
  ]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // New Folder Modal
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  // Uploading state
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Destructive Action Confirmation Modal
  const [itemToDelete, setItemToDelete] = useState<DriveFileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsConnected(!!getDriveAccessToken());
    });
    return () => unsub();
  }, []);

  const loadFiles = async (folderId: string = currentFolderId, query: string = searchQuery) => {
    if (!getDriveAccessToken()) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await listDriveFiles(folderId, query);
      setFiles(res.files);
    } catch (err: any) {
      console.error('Failed to load drive files:', err);
      setErrorMessage(err.message || 'Failed to fetch files from Google Drive');
      if (err.message?.includes('expired') || err.message?.includes('not connected')) {
        setIsConnected(false);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      loadFiles(currentFolderId, searchQuery);
    }
  }, [isConnected, currentFolderId]);

  const handleConnect = async () => {
    setIsAuthenticating(true);
    setErrorMessage(null);
    try {
      const res = await signInWithGoogleDrive();
      if (res) {
        setIsConnected(true);
        setCurrentUser(res.user);
        setSuccessMessage('Successfully connected to Google Drive!');
        setTimeout(() => setSuccessMessage(null), 4000);
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
    setFiles([]);
    setSuccessMessage('Disconnected from Google Drive.');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleFolderClick = (folder: DriveFileItem) => {
    setCurrentFolderId(folder.id);
    setBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name }]);
    setSearchQuery('');
  };

  const handleBreadcrumbClick = (index: number) => {
    const target = breadcrumbs[index];
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
    setCurrentFolderId(target.id);
    setSearchQuery('');
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    setErrorMessage(null);
    try {
      await createDriveFolder(newFolderName.trim(), currentFolderId);
      setNewFolderName('');
      setIsNewFolderOpen(false);
      setSuccessMessage(`Folder "${newFolderName}" created successfully.`);
      setTimeout(() => setSuccessMessage(null), 3500);
      loadFiles(currentFolderId);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create folder');
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    
    setIsUploading(true);
    setErrorMessage(null);
    try {
      for (let i = 0; i < fileList.length; i++) {
        const f = fileList[i];
        await uploadFileToDrive(f, currentFolderId);
      }
      setSuccessMessage(`Successfully uploaded ${fileList.length} file(s) to Google Drive.`);
      setTimeout(() => setSuccessMessage(null), 4000);
      loadFiles(currentFolderId);
    } catch (err: any) {
      setErrorMessage(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Explicit user confirmation for destructive delete operation
  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      await deleteDriveFile(itemToDelete.id);
      setSuccessMessage(`"${itemToDelete.name}" has been removed from Google Drive.`);
      setTimeout(() => setSuccessMessage(null), 3500);
      setItemToDelete(null);
      loadFiles(currentFolderId);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete file from Google Drive');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatFileSize = (bytes?: string) => {
    if (!bytes) return '--';
    const num = parseInt(bytes, 10);
    if (isNaN(num)) return '--';
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    return `${(num / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/vnd.google-apps.folder') {
      return <Folder className="text-amber-400 fill-amber-400/20" size={24} />;
    }
    if (mimeType.includes('pdf')) {
      return <FileText className="text-rose-400" size={24} />;
    }
    if (mimeType.includes('image')) {
      return <ImageIcon className="text-emerald-400" size={24} />;
    }
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('compressed')) {
      return <FileArchive className="text-purple-400" size={24} />;
    }
    return <File className="text-blue-400" size={24} />;
  };

  return (
    <div className={`flex flex-col h-full ${attachedMode ? '' : 'p-4 sm:p-6 max-w-7xl mx-auto w-full'}`}>
      {/* Top Header */}
      <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-4 sm:p-6 mb-4 shadow-xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 via-emerald-500/20 to-amber-500/20 border border-white/10 flex items-center justify-center shadow-inner">
              <HardDrive className="text-brand-400" size={26} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Google Drive Cloud Storage
                {isConnected && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 size={12} /> Connected
                  </span>
                )}
              </h2>
              <p className="text-xs text-gray-400">
                Directly browse, organize, and upload shipping documents, Bills of Lading, and invoices
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {!isConnected ? (
              <button
                onClick={handleConnect}
                disabled={isAuthenticating}
                className="gsi-material-button inline-flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl bg-white hover:bg-gray-100 text-gray-900 font-semibold text-sm shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                {isAuthenticating ? (
                  <Loader2 className="animate-spin text-gray-700" size={18} />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                )}
                <span>Sign in with Google Drive</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadFiles(currentFolderId)}
                  disabled={loading}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-colors"
                  title="Refresh Files"
                >
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
                <button
                  onClick={handleDisconnect}
                  className="text-xs px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 font-medium transition-colors"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Notifications */}
        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
      </div>

      {!isConnected ? (
        /* Not Connected Landing State */
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-900/60 border border-white/10 rounded-2xl text-center backdrop-blur-sm">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-brand-600/30 to-blue-500/20 border border-brand-500/30 flex items-center justify-center mb-5 shadow-xl">
            <HardDrive className="text-brand-400" size={40} />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Connect Your Google Drive Account</h3>
          <p className="text-sm text-gray-400 max-w-md mb-6 leading-relaxed">
            Link Google Drive to manage Bills of Lading, Good Declaration documents, and container invoices directly from your cloud storage with permission from your Google account.
          </p>
          <button
            onClick={handleConnect}
            disabled={isAuthenticating}
            className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-white hover:bg-gray-100 text-gray-900 font-semibold text-sm shadow-xl transition-all active:scale-95"
          >
            {isAuthenticating ? (
              <Loader2 className="animate-spin text-gray-700" size={20} />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
            )}
            <span>Sign in with Google</span>
          </button>
        </div>
      ) : (
        /* Connected Drive Explorer */
        <div className="flex-1 flex flex-col bg-slate-900/70 border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
          {/* Action Toolbar */}
          <div className="p-3 sm:p-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-slate-950/40">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs sm:text-sm py-1 max-w-full">
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={crumb.id}>
                  {idx > 0 && <span className="text-gray-500">/</span>}
                  <button
                    onClick={() => handleBreadcrumbClick(idx)}
                    className={`px-2 py-1 rounded-lg transition-colors whitespace-nowrap ${
                      idx === breadcrumbs.length - 1
                        ? 'text-brand-300 font-bold bg-brand-500/10 border border-brand-500/20'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {crumb.name}
                  </button>
                </React.Fragment>
              ))}
            </div>

            {/* Controls: Search, New Folder, Upload */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-56">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadFiles(currentFolderId, searchQuery)}
                  placeholder="Search in Drive..."
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-800/80 border border-white/10 text-white text-xs placeholder-gray-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <button
                onClick={() => setIsNewFolderOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-gray-200 text-xs font-semibold border border-white/10 transition-colors whitespace-nowrap"
              >
                <FolderPlus size={15} />
                <span className="hidden sm:inline">New Folder</span>
              </button>

              <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md cursor-pointer transition-all active:scale-95 whitespace-nowrap">
                {isUploading ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Upload size={15} />
                )}
                <span>{isUploading ? 'Uploading...' : 'Upload File'}</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Files List / Grid */}
          <div className="flex-1 p-4 overflow-y-auto min-h-[350px]">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-3 py-16">
                <Loader2 size={32} className="animate-spin text-brand-400" />
                <p className="text-xs">Loading items from Google Drive...</p>
              </div>
            ) : files.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-3 py-16">
                <Folder size={44} className="text-gray-600" />
                <p className="text-sm font-medium">This folder is empty</p>
                <p className="text-xs text-gray-500">Upload documents or create a new folder above.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {files.map((file) => {
                  const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                  return (
                    <div
                      key={file.id}
                      className="group bg-slate-800/60 hover:bg-slate-800 border border-white/5 hover:border-brand-500/30 rounded-xl p-3.5 flex flex-col justify-between transition-all duration-150 shadow-md hover:shadow-lg"
                    >
                      <div 
                        onClick={() => isFolder ? handleFolderClick(file) : null}
                        className={`flex items-start gap-3 ${isFolder ? 'cursor-pointer' : ''}`}
                      >
                        <div className="p-2 rounded-lg bg-slate-900/80 border border-white/5 shrink-0">
                          {getFileIcon(file.mimeType)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 
                            className={`text-xs font-semibold truncate ${
                              isFolder ? 'text-white group-hover:text-brand-300' : 'text-gray-200'
                            }`}
                            title={file.name}
                          >
                            {file.name}
                          </h4>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {isFolder ? 'Folder' : formatFileSize(file.size)}
                          </p>
                          {file.modifiedTime && (
                            <p className="text-[10px] text-gray-500 mt-0.5">
                              {new Date(file.modifiedTime).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* File Card Footer Actions */}
                      <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1">
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                              title="Open in Google Drive"
                            >
                              <ExternalLink size={14} />
                            </a>
                          )}
                          {onAttachFileToCase && !isFolder && (
                            <button
                              onClick={() => onAttachFileToCase(file)}
                              className="px-2 py-1 rounded bg-brand-600/20 hover:bg-brand-600/40 text-brand-300 text-[10px] font-semibold border border-brand-500/30 transition-colors"
                            >
                              Attach
                            </button>
                          )}
                        </div>

                        {/* Destructive Delete Button */}
                        <button
                          onClick={() => setItemToDelete(file)}
                          className="p-1.5 rounded-lg hover:bg-rose-500/20 text-gray-500 hover:text-rose-400 transition-colors"
                          title="Delete file"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {isNewFolderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-sm p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FolderPlus size={18} className="text-brand-400" />
                Create New Folder
              </h3>
              <button 
                onClick={() => setIsNewFolderOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateFolder}>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="e.g. Shipping BLs 2026"
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-white text-xs mb-4 focus:outline-none focus:border-brand-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewFolderOpen(false)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingFolder || !newFolderName.trim()}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md disabled:opacity-50"
                >
                  {creatingFolder ? 'Creating...' : 'Create Folder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANDATORY Confirmation Dialog for Destructive Operations */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-rose-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              Delete from Google Drive?
            </h3>
            <p className="text-xs text-gray-300 mb-4 leading-relaxed">
              Are you sure you want to permanently remove <strong className="text-white">"{itemToDelete.name}"</strong> from your Google Drive? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {isDeleting && <Loader2 size={14} className="animate-spin" />}
                <span>Delete File</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleDriveManager;
