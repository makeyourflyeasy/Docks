import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, FileText, CalendarDays, Loader2, Save, X, Database, 
  RefreshCw, Trash2, Plus, CreditCard, Lock, Download, Eye, 
  Edit, Camera, Check, AlertCircle, Clock, Image as ImageIcon,
  Sparkles, CheckCircle2, RotateCcw, Building2, HelpCircle, HardDrive
} from 'lucide-react';
import { enhanceDocumentWithAI, fileToBase64, downloadFile } from '../services/geminiService';
import { CompanyDocument } from '../types';
import { useBranding, optimizeLogoImage } from '../services/brandingService';
import { 
  wipeCompleteDatabase, 
  exportSelectiveDatabaseBackup, 
  restoreDatabaseSnapshot,
  subscribeToCases,
  subscribeToFinances
} from '../services/dbService';
import { downloadTaxReportPdf } from '../services/pdfExportService';
import { 
  getDriveAccessToken, 
  uploadDatabaseBackupToDrive, 
  listDatabaseBackupsFromDrive, 
  deleteDriveFile 
} from '../services/googleDriveService';
import Logo from './Logo';
import GoogleDriveManager from './GoogleDriveManager';
import { convertImageToPdf } from '../services/fileUtils';

interface AppSettingsProps {
  onReplaySplash?: () => void;
}

const AppSettings: React.FC<AppSettingsProps> = ({ onReplaySplash }) => {
  const [activeSection, setActiveSection] = useState('general');

  // Tax Report State
  const [taxStartDate, setTaxStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // First day of current month
    return d.toISOString().split('T')[0];
  });
  const [taxEndDate, setTaxEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [taxCases, setTaxCases] = useState<any[]>([]);
  const [taxFinances, setTaxFinances] = useState<any[]>([]);
  const [isGeneratingTaxReport, setIsGeneratingTaxReport] = useState(false);
  const [taxReportError, setTaxReportError] = useState<string | null>(null);
  const [taxReportSuccess, setTaxReportSuccess] = useState<string | null>(null);

  // Subscribe to Cases and Finances for Tax Reporting
  useEffect(() => {
    let unsubscribeCases: (() => void) | undefined;
    let unsubscribeFinances: (() => void) | undefined;

    if (activeSection === 'tax') {
      unsubscribeCases = subscribeToCases((items) => {
        setTaxCases(items);
      });
      unsubscribeFinances = subscribeToFinances((items) => {
        setTaxFinances(items);
      });
    }

    return () => {
      if (unsubscribeCases) unsubscribeCases();
      if (unsubscribeFinances) unsubscribeFinances();
    };
  }, [activeSection]);

  const handleDownloadTaxReport = async () => {
    if (!taxStartDate || !taxEndDate) {
      alert("Please select both start and end dates.");
      return;
    }
    setIsGeneratingTaxReport(true);
    setTaxReportError(null);
    setTaxReportSuccess(null);
    try {
      await downloadTaxReportPdf({
        startDate: taxStartDate,
        endDate: taxEndDate,
        cases: taxCases,
        finances: taxFinances,
        branding
      });
      setTaxReportSuccess("Tax report generated and downloaded successfully!");
    } catch (err) {
      console.error(err);
      setTaxReportError("Failed to generate tax report. Please try again.");
    } finally {
      setIsGeneratingTaxReport(false);
    }
  };

  // Branding & Logo State
  const { branding, saveBranding, resetBrandingToDefault, isCustomLogo } = useBranding();
  const [brandCompanyName, setBrandCompanyName] = useState(branding.companyName);
  const [brandSubtitle, setBrandSubtitle] = useState(branding.subtitle || '');
  const [logoPreview, setLogoPreview] = useState<string | null>(branding.customLogo);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isOptimizingLogo, setIsOptimizingLogo] = useState(false);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [brandingSuccess, setBrandingSuccess] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setBrandCompanyName(branding.companyName);
    setBrandSubtitle(branding.subtitle || '');
    if (!logoFile) {
      setLogoPreview(branding.customLogo);
    }
  }, [branding.companyName, branding.subtitle, branding.customLogo, logoFile]);

  // General
  const companyName = branding.companyName || 'Docks Private Limited';
  const [adminUsername, setAdminUsername] = useState('Arbab Khan');
  const [adminUserId, setAdminUserId] = useState('AK001');
  const [adminPassword, setAdminPassword] = useState('******');

  // New Document Management
  const [companyDocuments, setCompanyDocuments] = useState<CompanyDocument[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  
  // New Doc Form
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocUnlimited, setNewDocUnlimited] = useState(false);
  const [newDocExpiry, setNewDocExpiry] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Banks
  const [banks, setBanks] = useState([
    { id: 1, name: 'HBL Corporate', acct: '0011-2233-4455', iban: 'PK36HABB001122334455', branch: 'Clifton' }
  ]);
  const [newBank, setNewBank] = useState({ id: 0, name: '', acct: '', iban: '', branch: '' });
  const [showAddBank, setShowAddBank] = useState(false);

  // Check for expired documents or soon to expire (10 days)
  const checkExpiry = (doc: CompanyDocument) => {
    if (doc.unlimitedValidity || !doc.expiryDate) return { isSoon: false, isExpired: false };
    
    const today = new Date();
    const expiry = new Date(doc.expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      isSoon: diffDays <= 10 && diffDays > 0,
      isExpired: diffDays <= 0
    };
  };

  const [saveLoading, setSaveLoading] = useState(false);

  const handleSaveSettings = () => {
    setSaveLoading(true);
    setTimeout(() => {
      setSaveLoading(false);
      alert("Settings Saved Successfully!");
    }, 1000);
  };

  const handleUploadDocument = async () => {
    if (!newDocTitle || (!selectedFile && !uploadLoading)) {
      alert("Please provide a title and select a file.");
      return;
    }

    setUploadLoading(true);
    try {
      const base64 = await fileToBase64(selectedFile!);
      const url = `data:${selectedFile!.type};base64,${base64}`;
      
      const newDoc: CompanyDocument = {
        id: Math.random().toString(36).substr(2, 9),
        title: newDocTitle,
        url: url,
        fileType: selectedFile!.type.includes('pdf') ? 'PDF' : 'IMAGE',
        uploadDate: new Date().toISOString().split('T')[0],
        unlimitedValidity: newDocUnlimited,
        expiryDate: newDocUnlimited ? undefined : newDocExpiry
      };

      setCompanyDocuments(prev => [...prev, newDoc]);
      setShowUploadModal(false);
      resetDocForm();
    } catch (err) {
      alert("Failed to upload document");
    } finally {
      setUploadLoading(false);
    }
  };

  const resetDocForm = () => {
    setNewDocTitle('');
    setNewDocUnlimited(false);
    setNewDocExpiry('');
    setSelectedFile(null);
  };

  const handleDeleteDocument = (id: string) => {
    if (window.confirm("Delete this document?")) {
      setCompanyDocuments(prev => prev.filter(d => d.id !== id));
    }
  };

  const handleAddBank = () => {
    if (!newBank.name || !newBank.acct) return;
    
    if (newBank.id) {
        setBanks(banks.map(b => b.id === newBank.id ? { ...newBank, id: newBank.id } : b));
    } else {
        setBanks([...banks, { id: Date.now(), ...newBank }]);
    }
    
    setShowAddBank(false);
    setNewBank({ id: 0, name: '', acct: '', iban: '', branch: '' });
  };

  const handleEditBank = (bank: any) => {
    setNewBank(bank);
    setShowAddBank(true);
  };

  const handleDeleteBank = (id: number) => {
    if(window.confirm('Remove this bank account?')) {
        setBanks(banks.filter(b => b.id !== id));
    }
  };

  const restoreInputRef = useRef<HTMLInputElement>(null);

  // Dedicated Selective Backup Modal State
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [backupOptions, setBackupOptions] = useState({
    full: true,
    cases: true,
    finance: true,
    vehicles: true,
    clients: true
  });
  const [isExportingBackup, setIsExportingBackup] = useState(false);

  // Dedicated Factory Reset Warning Modal State
  const [showResetWarningModal, setShowResetWarningModal] = useState(false);
  const [resetConfirmInput, setResetConfirmInput] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const [backupSuccessMessage, setBackupSuccessMessage] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Toggle selection for backup items
  const handleToggleBackupOption = (key: 'full' | 'cases' | 'finance' | 'vehicles' | 'clients') => {
    if (key === 'full') {
      const nextVal = !backupOptions.full;
      setBackupOptions({
        full: nextVal,
        cases: nextVal,
        finance: nextVal,
        vehicles: nextVal,
        clients: nextVal
      });
    } else {
      const next = { ...backupOptions, [key]: !backupOptions[key] };
      next.full = next.cases && next.finance && next.vehicles && next.clients;
      setBackupOptions(next);
    }
  };

  // Open Backup Modal
  const handleOpenBackupModal = () => {
    setBackupSuccessMessage(null);
    setShowBackupModal(true);
  };

  // Download chosen backup JSON file and mirror to Google Drive if connected
  const handleDownloadSelectedBackup = async () => {
    try {
      setIsExportingBackup(true);
      const snapshot = await exportSelectiveDatabaseBackup({
        cases: backupOptions.cases,
        finance: backupOptions.finance,
        vehicles: backupOptions.vehicles,
        clients: backupOptions.clients,
        companyInfo: {
          companyName,
          adminUsername,
          adminUserId,
          banks,
          companyDocuments
        }
      });

      const jsonString = JSON.stringify(snapshot, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const dateStr = new Date().toISOString().split('T')[0];
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `DOCKS_LTD_Backup_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Also mirror to Google Drive if connected
      const driveToken = getDriveAccessToken();
      if (driveToken) {
        try {
          await uploadDatabaseBackupToDrive(snapshot);
        } catch (driveErr) {
          console.warn("Drive backup auto-sync notice:", driveErr);
        }
      }

      setBackupSuccessMessage("Backup file created and downloaded successfully! Keep this file safe.");
      setShowBackupModal(false);
    } catch (err: any) {
      alert("Error generating backup: " + (err.message || String(err)));
    } finally {
      setIsExportingBackup(false);
    }
  };

  const handleRestoreBackupClick = () => {
    restoreInputRef.current?.click();
  };

  const onRestoreFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data && (Array.isArray(data.cases) || Array.isArray(data.finance) || Array.isArray(data.vehicles) || Array.isArray(data.clients) || data.companyName)) {
          const result = await restoreDatabaseSnapshot(data);

          // Upload restored snapshot to Google Drive if connected
          const driveToken = getDriveAccessToken();
          if (driveToken) {
            uploadDatabaseBackupToDrive(data).catch(() => {});
          }

          if (data.companyInfo) {
            if (data.companyInfo.companyName) setBrandCompanyName(data.companyInfo.companyName);
            if (data.companyInfo.adminUsername) setAdminUsername(data.companyInfo.adminUsername);
            if (data.companyInfo.adminUserId) setAdminUserId(data.companyInfo.adminUserId);
            if (data.companyInfo.companyDocuments) setCompanyDocuments(data.companyInfo.companyDocuments);
            if (data.companyInfo.banks) setBanks(data.companyInfo.banks);
          }

          alert(
            `Data Restored Successfully!\n\n` +
            `• Cases Restored: ${result.restoredCounts.cases}\n` +
            `• Finance & General Ledger Entries: ${result.restoredCounts.finance}\n` +
            `• Vehicles: ${result.restoredCounts.vehicles}\n` +
            `• Clients: ${result.restoredCounts.clients}\n` +
            `• Vendors: ${result.restoredCounts.vendors || 0}\n` +
            `• Recurring Templates: ${result.restoredCounts.recurringTemplates || 0}\n` +
            `• Staff Ledgers: ${result.restoredCounts.staffLedgers || 0}\n\n` +
            `Database, General Ledger, and local storage are synchronized. The application will now refresh.`
          );
          window.location.reload();
        } else {
          alert("Invalid backup file format. Please upload a valid DOCKS JSON backup file.");
        }
      } catch (err: any) {
        alert("Error restoring data from backup: " + (err.message || String(err)));
      } finally {
        setIsRestoring(false);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Open Factory Reset Warning Window
  const handleOpenResetWarning = () => {
    setResetConfirmInput('');
    setShowResetWarningModal(true);
  };

  // Execute complete factory reset
  const handleExecuteFactoryReset = async () => {
    try {
      setIsResetting(true);

      // 1. Wipe Firebase Firestore live operational data (cases, finances, vehicles, clients, notifications)
      const wipeResult = await wipeCompleteDatabase();

      // 2. If Google Drive is connected, delete backup archives from Drive as well
      const driveToken = getDriveAccessToken();
      if (driveToken) {
        try {
          const driveFiles = await listDatabaseBackupsFromDrive();
          for (const file of driveFiles) {
            if (file.id) {
              await deleteDriveFile(file.id).catch(() => {});
            }
          }
        } catch (driveCleanupErr) {
          console.warn("Drive cleanup notice:", driveCleanupErr);
        }
      }

      // 3. Reset local settings state
      setCompanyDocuments([]);
      setBanks([{ id: 1, name: 'HBL Corporate', acct: '0011-2233-4455', iban: 'PK36HABB001122334455', branch: 'Clifton' }]);

      setShowResetWarningModal(false);
      setResetSuccessMessage(
        `System Factory Reset Successful: All ${wipeResult.deletedCounts.cases} cases, ${wipeResult.deletedCounts.finances} finance entries, ${wipeResult.deletedCounts.vehicles} vehicles, ${wipeResult.deletedCounts.clients} clients, and all general ledger caches were completely wiped from Firebase Firestore and local storage.`
      );

      // Reload window after brief delay so state starts 100% clean
      setTimeout(() => {
        window.location.reload();
      }, 1600);
    } catch (err: any) {
      alert("Error executing factory reset: " + (err.message || String(err)));
      setIsResetting(false);
    }
  };

  const InputField = ({ label, value, onChange, type = 'text', readOnly = false }: {
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    readOnly?: boolean;
  }) => (
    <div className="mb-4 text-left font-sans">
      <label className="block text-sm text-gray-400 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        min={type === 'date' ? new Date().toISOString().split('T')[0] : undefined}
        className={`w-full glass-input rounded-lg p-2 outline-none
                  ${readOnly ? 'opacity-70 cursor-not-allowed bg-black/40' : ''}`}
      />
    </div>
  );

  const renderGeneralSettings = () => (
     <div className="glass-card rounded-2xl p-6 shadow-2xl animate-fade-in text-left">
        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-3">
            <h3 className="text-xl font-semibold text-white uppercase tracking-wider">{companyName}</h3>
            <span className="text-[10px] bg-brand-500/20 text-brand-400 px-2 py-1 rounded-full font-bold uppercase tracking-widest border border-brand-500/30">System Registered</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField 
            label="Admin Username" 
            value={adminUsername} 
            onChange={(e) => setAdminUsername(e.target.value)} 
          />
          <InputField 
            label="Admin User ID" 
            value={adminUserId} 
            onChange={(e) => setAdminUserId(e.target.value)} 
            readOnly
          />
        </div>
        <InputField 
          label="Admin Password" 
          value={adminPassword} 
          onChange={(e) => setAdminPassword(e.target.value)} 
          type="password"
        />

        {/* New Advanced Document Management Section */}
        <div className="mt-8 border-t border-white/10 pt-6">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-lg font-semibold text-white">Company Documents</h3>
             <button 
                onClick={() => setShowUploadModal(true)}
                className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all hover:scale-105 shadow-lg shadow-brand-600/20"
             >
                <Plus size={18} /> Upload Document
             </button>
          </div>

          <div className="space-y-4">
            {companyDocuments.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-white/5 rounded-2xl bg-white/5">
                    <FileText className="mx-auto text-gray-600 mb-2" size={40} />
                    <p className="text-gray-400 text-sm font-sans">No documents uploaded yet.</p>
                </div>
            ) : (
                companyDocuments.map((doc) => {
                    const expiry = checkExpiry(doc);
                    return (
                        <div key={doc.id} className="glass-panel p-4 rounded-xl border border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-white/5 md:hover:translate-x-1 transition-all">
                            <div className="flex items-center gap-4 flex-1">
                                <div className={`p-3 rounded-xl ${expiry.isExpired ? 'bg-red-500/10 text-red-400' : 'bg-brand-500/10 text-brand-400'}`}>
                                    <FileText size={24} />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-white font-medium truncate font-sans">{doc.title}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Clock size={12} className="text-gray-500" />
                                        <p className="text-xs text-gray-400 font-sans">Uploaded: {doc.uploadDate}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <p className="text-xs text-gray-500 uppercase tracking-wider font-bold font-sans">Validity</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        {doc.unlimitedValidity ? (
                                            <span className="text-xs text-green-400 font-medium font-sans">Unlimited</span>
                                        ) : (
                                            <div className="flex flex-col items-end">
                                                <span className={`text-sm font-mono ${expiry.isExpired ? 'text-red-400' : expiry.isSoon ? 'text-orange-400' : 'text-gray-300'}`}>
                                                    {doc.expiryDate}
                                                </span>
                                                {expiry.isExpired && (
                                                    <div className="flex items-center gap-1 text-[10px] text-red-400 font-bold animate-pulse font-sans">
                                                        <AlertCircle size={10} /> EXPIRED
                                                    </div>
                                                )}
                                                {expiry.isSoon && (
                                                    <div className="flex items-center gap-1 text-[10px] text-orange-400 font-bold animate-pulse font-sans">
                                                        <Clock size={10} /> EXPIRING SOON
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-2 font-sans">
                                    <button 
                                        onClick={() => window.open(doc.url, '_blank')}
                                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                    >
                                        <Eye size={18} />
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteDocument(doc.id)}
                                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })
            )}
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button 
            disabled={saveLoading}
            onClick={handleSaveSettings} 
            className="w-full sm:w-auto bg-brand-600 hover:bg-brand-500 text-white px-6 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 shadow-lg shadow-brand-600/30 transition-all hover:scale-105 font-sans disabled:opacity-50"
          >
            {saveLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {saveLoading ? 'Saving...' : 'Save General Settings'}
          </button>
        </div>

        {/* Upload Modal */}
        {showUploadModal && (
            <div className="fixed inset-0 z-[100] flex items-start justify-center pt-3 sm:pt-6 pb-6 px-3 sm:px-4 overflow-y-auto bg-black/80 backdrop-blur-sm">
                <div className="glass-card w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 mb-6">
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                        <h3 className="text-lg font-bold text-white font-sans">Upload Company Document</h3>
                        <button onClick={() => { setShowUploadModal(false); resetDocForm(); }} className="text-gray-400 hover:text-white"><X size={20}/></button>
                    </div>

                    <div className="p-6 space-y-4">
                        <InputField label="Document Title" value={newDocTitle} onChange={e => setNewDocTitle(e.target.value)} />

                        <div className="space-y-2">
                            <label className="block text-sm text-gray-400 font-medium font-sans">Capture or Upload</label>
                            <div className="grid grid-cols-2 gap-3">
                                <label className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-white/10 rounded-xl hover:bg-brand-500/5 hover:border-brand-500/50 transition-all cursor-pointer group">
                                   <input 
                                     type="file" 
                                     accept="image/*" 
                                     capture="environment" 
                                     className="hidden" 
                                     onChange={async (e) => {
                                       const file = e.target.files?.[0];
                                       if (file) {
                                         try {
                                           const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
                                           if (!isPdf) {
                                             const converted = await convertImageToPdf(file, file.name || 'Company_Document.pdf', true);
                                             setSelectedFile(converted.file);
                                           } else {
                                             setSelectedFile(file);
                                           }
                                         } catch (err) {
                                           console.warn("Scan notice:", err);
                                           setSelectedFile(file);
                                         }
                                       }
                                     }}
                                   />
                                   <Camera className="text-brand-400 group-hover:scale-110 transition-transform" size={24} />
                                   <span className="text-[10px] text-center text-gray-300 font-sans">Camera / Photo</span>
                                </label>
                                <label className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-white/10 rounded-xl hover:bg-brand-500/5 hover:border-brand-500/50 transition-all cursor-pointer group">
                                   <input 
                                     type="file" 
                                     accept=".pdf,.jpg,.jpeg,.png" 
                                     className="hidden" 
                                     onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                                   />
                                   <FileText className="text-brand-400 group-hover:scale-110 transition-transform" size={24} />
                                   <span className="text-[10px] text-center text-gray-300 font-sans">Browse Files / PDF</span>
                                </label>
                            </div>
                            {selectedFile && (
                                <div className="flex items-center justify-between bg-brand-500/10 p-2 rounded-lg border border-brand-500/20 animate-in slide-in-from-top-1">
                                    <div className="flex items-center gap-2 truncate">
                                        <Check className="text-green-400 min-w-4" size={14} />
                                        <span className="text-xs text-brand-300 truncate font-sans">{selectedFile.name}</span>
                                    </div>
                                    <button onClick={() => setSelectedFile(null)} className="text-gray-400 hover:text-white"><X size={14}/></button>
                                </div>
                            )}
                        </div>

                        <div className="pt-2">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div 
                                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${newDocUnlimited ? 'bg-brand-500 border-brand-500 shadow-lg shadow-brand-500/40' : 'border-white/20'}`}
                                    onClick={() => setNewDocUnlimited(!newDocUnlimited)}
                                >
                                    {newDocUnlimited && <Check size={14} className="text-white" />}
                                </div>
                                <input 
                                    type="checkbox" 
                                    className="hidden" 
                                    checked={newDocUnlimited} 
                                    onChange={e => setNewDocUnlimited(e.target.checked)} 
                                />
                                <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors font-sans">Unlimited Validity</span>
                            </label>

                            {!newDocUnlimited && (
                                <div className="mt-4 animate-in slide-in-from-top-2 duration-300">
                                    <InputField 
                                        label="Expiry Date" 
                                        type="date" 
                                        value={newDocExpiry} 
                                        onChange={e => setNewDocExpiry(e.target.value)} 
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-6 bg-white/5 border-t border-white/10 flex gap-3 font-sans">
                        <button 
                            disabled={uploadLoading}
                            onClick={() => { setShowUploadModal(false); resetDocForm(); }} 
                            className="flex-1 px-4 py-2 border border-white/10 rounded-lg text-gray-300 hover:bg-white/5 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            disabled={uploadLoading || (!selectedFile && !uploadLoading)}
                            onClick={handleUploadDocument}
                            className="flex-1 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-medium shadow-lg shadow-brand-600/20 transition-all flex items-center justify-center gap-2"
                        >
                            {uploadLoading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                            {uploadLoading ? 'Uploading...' : 'Save Document'}
                        </button>
                    </div>
                </div>
            </div>
        )}
     </div>
  );

  const renderTaxSettings = () => {
    const start = new Date(taxStartDate);
    const end = new Date(taxEndDate);
    end.setHours(23, 59, 59, 999);

    const periodFinances = taxFinances.filter(f => {
      const d = new Date(f.date);
      return d >= start && d <= end;
    });

    const periodCases = taxCases.filter(c => {
      const d = new Date(c.createdAt || c.date || Date.now());
      return d >= start && d <= end;
    });

    let periodIncome = 0;
    let periodExpense = 0;
    periodFinances.forEach(f => {
      if (f.type === 'INCOME') periodIncome += f.amount;
      else if (f.type === 'EXPENSE') periodExpense += f.amount;
    });

    return (
      <div className="glass-card rounded-2xl p-6 shadow-2xl animate-fade-in text-left space-y-6 font-sans">
        <div>
          <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <FileText className="text-brand-400" size={20} />
            Tax & Finance Performance Statements
          </h3>
          <p className="text-gray-400 text-xs">
            Generate and export complete tax-compliant logistics performance reports for all ledger transactions and active fleet operations within a specific date range. Modeled on professional tax report standard layouts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Start Date</label>
            <input 
              type="date" 
              value={taxStartDate} 
              onChange={(e) => setTaxStartDate(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-500 font-sans"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">End Date</label>
            <input 
              type="date" 
              value={taxEndDate} 
              onChange={(e) => setTaxEndDate(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-500 font-sans"
            />
          </div>
        </div>

        {/* Live Preview Stats */}
        <div className="bg-slate-950/50 border border-white/5 rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase">Revenue (Period)</span>
            <p className="text-base font-semibold text-emerald-400 mt-1">PKR {Math.round(periodIncome).toLocaleString()}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase">Expenses (Period)</span>
            <p className="text-base font-semibold text-rose-400 mt-1">PKR {Math.round(periodExpense).toLocaleString()}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase">Matching Transactions</span>
            <p className="text-base font-semibold text-white mt-1">{periodFinances.length} Entries</p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase">Operational Cases</span>
            <p className="text-base font-semibold text-brand-400 mt-1">{periodCases.length} Cases</p>
          </div>
        </div>

        {taxReportError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle size={16} />
            {taxReportError}
          </div>
        )}

        {taxReportSuccess && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 size={16} />
            {taxReportSuccess}
          </div>
        )}

        <div className="pt-2">
          <button
            onClick={handleDownloadTaxReport}
            disabled={isGeneratingTaxReport}
            className="w-full sm:w-auto px-6 py-3 bg-brand-600 hover:bg-brand-500 disabled:bg-brand-800 text-white font-medium rounded-lg text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-brand-600/20"
          >
            {isGeneratingTaxReport ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Compiling Report...
              </>
            ) : (
              <>
                <Download size={16} />
                Download Tax & Finance PDF
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  const renderBackupSystem = () => (
     <div className="glass-card rounded-2xl p-6 shadow-2xl animate-fade-in text-left font-sans">
        <h3 className="text-xl font-semibold text-white mb-6 border-b border-white/10 pb-3 flex items-center gap-2">
           <Database className="text-brand-400"/> Backup & Restoration
        </h3>

        {/* Success / Info Alerts */}
        {backupSuccessMessage && (
           <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-3">
              <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
              <span>{backupSuccessMessage}</span>
           </div>
        )}

        {resetSuccessMessage && (
           <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center gap-3">
              <AlertCircle size={18} className="text-red-400 shrink-0" />
              <span>{resetSuccessMessage}</span>
           </div>
        )}

        {/* Hidden File Input for Restore */}
        <input 
           ref={restoreInputRef}
           type="file" 
           accept=".json" 
           className="hidden" 
           onChange={onRestoreFileChange}
        />
        
        <div className="space-y-6">
           <div className="glass-panel p-6 rounded-xl border border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                 <h4 className="text-lg font-medium text-white">Create Custom Backup</h4>
                 <p className="text-sm text-gray-400 font-sans">Choose which modules to export (Full, Cases, Finance, Vehicles, Clients).</p>
              </div>
              <button 
                  onClick={handleOpenBackupModal}
                  className="bg-brand-600 hover:bg-brand-500 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 shadow-lg shadow-brand-600/20 transition-all"
              >
                 <Save size={16} /> Create Backup
              </button>
           </div>

           <div className="glass-panel p-6 rounded-xl border border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                 <h4 className="text-lg font-medium text-white">Restore from Backup</h4>
                 <p className="text-sm text-gray-400 font-sans">Upload a previously generated backup file (.json) to restore Firestore & Drive.</p>
              </div>
              <button 
                  disabled={isRestoring}
                  onClick={handleRestoreBackupClick}
                  className="bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 border border-white/10 font-sans transition-all disabled:opacity-50"
              >
                 {isRestoring ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                 {isRestoring ? 'Restoring Data...' : 'Upload & Restore'}
              </button>
           </div>

           <div className="glass-panel p-6 rounded-xl border border-red-500/20 bg-red-500/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                 <h4 className="text-lg font-medium text-red-400">Factory Reset</h4>
                 <p className="text-sm text-red-400/70 font-sans">Wipe all data (Cases, Finance, Vehicles, Clients) and restore to default empty state.</p>
              </div>
              <button 
                  onClick={handleOpenResetWarning}
                  className="bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white px-5 py-2.5 rounded-lg flex items-center gap-2 border border-red-500/30 transition-all font-sans"
              >
                 <Trash2 size={16} /> Reset Application
              </button>
           </div>
        </div>

        {/* 1. Dedicated Selective Backup Modal */}
        {showBackupModal && (
           <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-start justify-center pt-3 sm:pt-6 pb-6 px-3 sm:px-4 overflow-y-auto z-50 animate-in fade-in duration-200">
              <div className="bg-slate-900 border border-white/15 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl mb-6">
                 <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center text-brand-400 border border-brand-500/30">
                          <Database size={20} />
                       </div>
                       <div>
                          <h3 className="text-lg font-bold text-white">Export System Backup</h3>
                          <p className="text-xs text-gray-400">Tick which modules you want to include in the backup</p>
                       </div>
                    </div>
                    <button onClick={() => setShowBackupModal(false)} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10">
                       <X size={18} />
                    </button>
                 </div>

                 <div className="p-6 space-y-4">
                    {/* Full Backup Master Checkbox */}
                    <div 
                       onClick={() => handleToggleBackupOption('full')}
                       className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          backupOptions.full ? 'bg-brand-500/10 border-brand-500/40' : 'bg-white/5 border-white/10 hover:bg-white/10'
                       }`}
                    >
                       <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                             backupOptions.full ? 'bg-brand-500 border-brand-500 text-white' : 'border-white/30'
                          }`}>
                             {backupOptions.full && <Check size={14} />}
                          </div>
                          <div>
                             <p className="text-sm font-bold text-white">Full Backup (All Data)</p>
                             <p className="text-xs text-gray-400">Selects everything across all ERP logistics modules</p>
                          </div>
                       </div>
                       <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">All</span>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 pt-2">
                       {/* All Cases */}
                       <div 
                          onClick={() => handleToggleBackupOption('cases')}
                          className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                             backupOptions.cases ? 'bg-white/10 border-white/20' : 'bg-black/20 border-white/5 hover:bg-white/5'
                          }`}
                       >
                          <div className="flex items-center gap-3">
                             <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                                backupOptions.cases ? 'bg-brand-500 border-brand-500 text-white' : 'border-white/30'
                             }`}>
                                {backupOptions.cases && <Check size={12} />}
                             </div>
                             <span className="text-sm font-medium text-white">All Cases</span>
                          </div>
                          <span className="text-xs text-gray-400">Shipments, BLs & Containers</span>
                       </div>

                       {/* All Finance */}
                       <div 
                          onClick={() => handleToggleBackupOption('finance')}
                          className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                             backupOptions.finance ? 'bg-white/10 border-white/20' : 'bg-black/20 border-white/5 hover:bg-white/5'
                          }`}
                       >
                          <div className="flex items-center gap-3">
                             <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                                backupOptions.finance ? 'bg-brand-500 border-brand-500 text-white' : 'border-white/30'
                             }`}>
                                {backupOptions.finance && <Check size={12} />}
                             </div>
                             <span className="text-sm font-medium text-white">All Finance</span>
                          </div>
                          <span className="text-xs text-gray-400">Ledgers, Receivables, Payables</span>
                       </div>

                       {/* All Vehicles */}
                       <div 
                          onClick={() => handleToggleBackupOption('vehicles')}
                          className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                             backupOptions.vehicles ? 'bg-white/10 border-white/20' : 'bg-black/20 border-white/5 hover:bg-white/5'
                          }`}
                       >
                          <div className="flex items-center gap-3">
                             <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                                backupOptions.vehicles ? 'bg-brand-500 border-brand-500 text-white' : 'border-white/30'
                             }`}>
                                {backupOptions.vehicles && <Check size={12} />}
                             </div>
                             <span className="text-sm font-medium text-white">All Vehicles</span>
                          </div>
                          <span className="text-xs text-gray-400">Fleet, Drivers, Tracking</span>
                       </div>

                       {/* All Clients */}
                       <div 
                          onClick={() => handleToggleBackupOption('clients')}
                          className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                             backupOptions.clients ? 'bg-white/10 border-white/20' : 'bg-black/20 border-white/5 hover:bg-white/5'
                          }`}
                       >
                          <div className="flex items-center gap-3">
                             <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                                backupOptions.clients ? 'bg-brand-500 border-brand-500 text-white' : 'border-white/30'
                             }`}>
                                {backupOptions.clients && <Check size={12} />}
                             </div>
                             <span className="text-sm font-medium text-white">All Clients</span>
                          </div>
                          <span className="text-xs text-gray-400">Customer directory & default tariffs</span>
                       </div>
                    </div>
                 </div>

                 <div className="p-6 bg-white/5 border-t border-white/10 flex gap-3">
                    <button 
                       onClick={() => setShowBackupModal(false)}
                       className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 text-gray-300 hover:bg-white/10 transition-colors text-sm"
                    >
                       Cancel
                    </button>
                    <button 
                       disabled={isExportingBackup || (!backupOptions.cases && !backupOptions.finance && !backupOptions.vehicles && !backupOptions.clients)}
                       onClick={handleDownloadSelectedBackup}
                       className="flex-1 px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-600/30 transition-all disabled:opacity-50"
                    >
                       {isExportingBackup ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                       {isExportingBackup ? 'Preparing Backup...' : 'Download Backup File (.json)'}
                    </button>
                 </div>
              </div>
           </div>
        )}

        {/* 2. Dedicated Factory Reset Warning Window */}
        {showResetWarningModal && (
           <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-start justify-center pt-3 sm:pt-6 pb-6 px-3 sm:px-4 overflow-y-auto z-50 animate-in fade-in duration-200">
              <div className="bg-slate-900 border border-red-500/30 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl mb-6">
                 <div className="p-6 bg-red-500/10 border-b border-red-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400 border border-red-500/40">
                          <AlertCircle size={22} />
                       </div>
                       <div>
                          <h3 className="text-lg font-bold text-red-300">Warning: Factory Reset</h3>
                          <p className="text-xs text-red-300/80">Permanent erasure of operational data</p>
                       </div>
                    </div>
                    <button onClick={() => setShowResetWarningModal(false)} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10">
                       <X size={18} />
                    </button>
                 </div>

                 <div className="p-6 space-y-4 text-left">
                    <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/20 text-xs text-red-200/90 leading-relaxed space-y-2">
                       <p className="font-semibold text-red-300">This action will delete:</p>
                       <ul className="list-disc pl-5 space-y-1">
                          <li>All registered Cases, B/Ls, and Containers</li>
                          <li>All Finance records, Client Ledgers, and Vouchers</li>
                          <li>All Registered Vehicles and Fleet Drivers</li>
                          <li>All Saved Clients and Custom Tariffs</li>
                          <li>Google Drive backup archives and local storage cache</li>
                       </ul>
                    </div>

                    {/* Prominent Backup Now Option before Reset */}
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
                       <div className="space-y-0.5">
                          <p className="text-xs font-bold text-amber-300">Backup your data before reset?</p>
                          <p className="text-[11px] text-amber-300/80">Download a backup file now so you can restore your data later.</p>
                       </div>
                       <button 
                          onClick={() => {
                             setShowResetWarningModal(false);
                             handleOpenBackupModal();
                          }}
                          className="shrink-0 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
                       >
                          <Download size={14} /> Backup Now
                       </button>
                    </div>

                    <div className="pt-2">
                       <label className="block text-xs font-medium text-gray-300 mb-1.5">
                          To confirm permanent factory reset, type <span className="text-red-400 font-mono font-bold">RESET</span> below:
                       </label>
                       <input 
                          type="text" 
                          placeholder="Type RESET to confirm"
                          value={resetConfirmInput}
                          onChange={e => setResetConfirmInput(e.target.value)}
                          className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500/60 font-mono uppercase"
                       />
                    </div>
                 </div>

                 <div className="p-6 bg-white/5 border-t border-white/10 flex gap-3">
                    <button 
                       onClick={() => setShowResetWarningModal(false)}
                       className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 text-gray-300 hover:bg-white/10 transition-colors text-sm"
                    >
                       Cancel
                    </button>
                    <button 
                       disabled={isResetting || resetConfirmInput.trim().toUpperCase() !== 'RESET'}
                       onClick={handleExecuteFactoryReset}
                       className="flex-1 px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                       {isResetting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                       {isResetting ? 'Wiping All Data...' : 'Confirm Factory Reset'}
                    </button>
                 </div>
              </div>
           </div>
        )}
     </div>
  );

  const renderBanksManagement = () => (
     <div className="glass-card rounded-2xl p-6 shadow-2xl animate-fade-in text-left font-sans">
        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-3">
           <h3 className="text-xl font-semibold text-white flex items-center gap-2 uppercase tracking-wide">
             <CreditCard className="text-brand-400"/> Banks Management
           </h3>
           <button onClick={() => { setNewBank({ id: 0, name: '', acct: '', iban: '', branch: '' }); setShowAddBank(true); }} className="bg-brand-600 hover:bg-brand-500 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 font-sans transition-all hover:scale-105">
              <Plus size={16} /> Add Bank
           </button>
        </div>

        {showAddBank && (
            <div className="bg-white/5 p-4 rounded-xl border border-white/10 mb-6 animate-in slide-in-from-top-2 font-sans">
                <h4 className="text-sm font-bold text-gray-300 mb-3">{newBank.id ? 'Edit Bank' : 'Add New Bank'}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <input type="text" placeholder="Bank Name" className="glass-input rounded p-2" value={newBank.name} onChange={e => setNewBank({...newBank, name: e.target.value})} />
                    <input type="text" placeholder="Branch Name" className="glass-input rounded p-2" value={newBank.branch} onChange={e => setNewBank({...newBank, branch: e.target.value})} />
                    <input type="text" placeholder="Account Number" className="glass-input rounded p-2" value={newBank.acct} onChange={e => setNewBank({...newBank, acct: e.target.value})} />
                    <input type="text" placeholder="IBAN" className="glass-input rounded p-2" value={newBank.iban} onChange={e => setNewBank({...newBank, iban: e.target.value})} />
                </div>
                <div className="flex justify-end gap-2">
                    <button onClick={() => setShowAddBank(false)} className="text-gray-400 hover:text-white px-3">Cancel</button>
                    <button onClick={handleAddBank} className="bg-brand-600 text-white px-4 py-2 rounded hover:bg-brand-500 shadow-lg shadow-brand-600/20">{newBank.id ? 'Update' : 'Save'}</button>
                </div>
            </div>
        )}

        <div className="space-y-4">
           {banks.map(bank => (
              <div key={bank.id} className="glass-panel p-4 rounded-xl border border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-white/5 transition-all">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center shadow-lg border border-white/10">
                       <span className="text-black font-bold text-xs">{bank.name.substring(0,3).toUpperCase()}</span>
                    </div>
                    <div>
                       <h4 className="text-white font-medium font-sans">{bank.name}</h4>
                       <p className="text-sm text-gray-400 font-sans">{bank.branch} Branch</p>
                    </div>
                 </div>
                 <div className="text-right">
                    <p className="text-sm text-gray-300 font-mono tracking-tight">{bank.acct}</p>
                    <p className="text-xs text-gray-500 font-mono truncate max-w-[150px]">{bank.iban}</p>
                 </div>
                 <div className="flex gap-2">
                    <button onClick={() => handleEditBank(bank)} className="text-brand-400 hover:text-white p-2 bg-white/5 rounded-lg transition-colors"><Edit size={16}/></button>
                    <button onClick={() => handleDeleteBank(bank.id)} className="text-red-400 hover:text-white p-2 bg-white/5 rounded-lg transition-colors"><Trash2 size={16}/></button>
                 </div>
              </div>
           ))}
        </div>
     </div>
  );

  const handleLogoFileSelect = async (file: File) => {
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    const isSupported = ['png', 'svg', 'jpg', 'jpeg', 'webp'].includes(ext || '') || 
                        file.type.startsWith('image/');
    
    if (!isSupported) {
      alert("Unsupported file format. Please select a PNG, SVG, or JPG image.");
      return;
    }

    setIsOptimizingLogo(true);
    try {
      const optimizedBase64 = await optimizeLogoImage(file);
      setLogoFile(file);
      setLogoPreview(optimizedBase64);
    } catch (err) {
      console.error("Failed to process logo image:", err);
      alert("Could not process this image. Please ensure the file is a valid PNG, SVG, or JPG.");
    } finally {
      setIsOptimizingLogo(false);
    }
  };

  const handleSaveBranding = async () => {
    setBrandingSaving(true);
    setBrandingSuccess(false);
    try {
      await saveBranding({
        customLogo: logoPreview,
        companyName: brandCompanyName.trim() || 'Docks Private Limited',
        subtitle: brandSubtitle.trim() || 'Customs Clearance, Bonded Carrier & Freight Terminal Operations'
      });
      setLogoFile(null);
      setBrandingSuccess(true);
      setTimeout(() => setBrandingSuccess(false), 3500);
    } catch (err) {
      console.error("Failed to save branding:", err);
      alert("Failed to save branding settings.");
    } finally {
      setBrandingSaving(false);
    }
  };

  const handleResetLogo = async () => {
    if (window.confirm("Are you sure you want to remove your uploaded logo and restore the default Docks (Pvt.) Ltd logo?")) {
      setBrandingSaving(true);
      try {
        await resetBrandingToDefault();
        setLogoFile(null);
        setLogoPreview(null);
        setBrandingSuccess(true);
        setTimeout(() => setBrandingSuccess(false), 3500);
      } catch (err) {
        alert("Failed to reset logo.");
      } finally {
        setBrandingSaving(false);
      }
    }
  };

  const renderLogoSettings = () => (
    <div className="glass-card rounded-2xl p-6 sm:p-8 shadow-2xl animate-fade-in text-left font-sans space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h3 className="text-xl sm:text-2xl font-semibold text-white flex items-center gap-2.5">
            <ImageIcon className="text-brand-400" size={24} />
            Company Logo & Branding
          </h3>
          <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-2xl">
            Upload your official company logo. Once saved, this logo will instantly replace the default branding across all screens, headers, sidebars, customer portals, invoices, and customs clearing print documents. It remains permanently active until you modify or remove it.
          </p>
        </div>
        
        {/* Status Badge */}
        <div className="self-start sm:self-auto">
          {isCustomLogo || (logoPreview && logoPreview !== branding.customLogo) ? (
            <div className="flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-3 py-1.5 rounded-full text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Active Custom Logo
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-brand-500/15 border border-brand-500/30 text-brand-300 px-3 py-1.5 rounded-full text-xs font-semibold">
              <Sparkles size={13} className="text-brand-400" />
              Default System Logo (DPL Metallic Gold)
            </div>
          )}
        </div>
      </div>

      {/* Live Dual Previews */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
          <Eye size={16} className="text-brand-400" />
          Live Dual Preview
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Dark Mode Screen Preview */}
          <div className="p-5 rounded-xl bg-slate-950/80 border border-white/10 flex flex-col justify-between min-h-[160px]">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wide">
                App UI (Dark Mode Header & Sidebar)
              </span>
              <span className="text-[10px] bg-white/10 text-gray-300 px-2 py-0.5 rounded">Digital Screen</span>
            </div>
            <div className="flex items-center justify-center py-4 bg-slate-900/60 rounded-lg border border-white/5">
              <Logo customSrc={logoPreview} className="h-12 w-auto max-w-[220px]" />
            </div>
            <div className="mt-3 text-center">
              <p className="text-xs text-white font-medium">{brandCompanyName || 'Docks (Pvt.) Ltd'}</p>
              <p className="text-[10px] text-gray-400 truncate">{brandSubtitle || 'Customs Clearance, Bonded Carrier & Freight Terminal Operations'}</p>
            </div>
          </div>

          {/* Light Mode / Print Document Preview */}
          <div className="p-5 rounded-xl bg-white border border-gray-300 flex flex-col justify-between min-h-[160px] text-black shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-mono text-gray-600 uppercase tracking-wide">
                Official Document & Invoice Print (A4 Paper)
              </span>
              <span className="text-[10px] bg-gray-200 text-gray-800 px-2 py-0.5 rounded font-semibold">Print Output</span>
            </div>
            <div className="flex flex-col items-center justify-center py-3 bg-gray-50 rounded-lg border border-gray-200">
              <Logo customSrc={logoPreview} className="h-12 w-auto max-w-[220px] mb-2" />
              <h5 className="text-sm font-bold uppercase text-black tracking-wide">
                {brandCompanyName || 'Docks (Pvt.) Ltd'}
              </h5>
              <p className="text-[10px] text-gray-600 font-medium">
                {brandSubtitle || 'Customs Clearance, Bonded Carrier & Freight Terminal Operations'}
              </p>
            </div>
            <div className="mt-2 text-right text-[10px] text-gray-500 font-mono">
              CONFIDENTIAL LOGISTICS & INVOICE VOUCHER
            </div>
          </div>
        </div>
      </div>

      {/* Upload Dropzone */}
      <div className="space-y-4 border-t border-white/10 pt-6">
        <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
          <Upload size={16} className="text-brand-400" />
          Upload Logo Image
        </h4>

        <input 
          type="file" 
          ref={logoInputRef}
          accept="image/png,image/svg+xml,image/jpeg,image/jpg,image/webp,.png,.svg,.jpg,.jpeg,.webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleLogoFileSelect(file);
          }}
        />

        <div 
          onClick={() => logoInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDraggingLogo(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDraggingLogo(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDraggingLogo(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleLogoFileSelect(file);
          }}
          className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all group ${
            isDraggingLogo 
              ? 'border-brand-400 bg-brand-500/10 scale-[1.01]' 
              : 'border-white/15 hover:border-brand-500/60 hover:bg-white/5'
          }`}
        >
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 transition-transform shadow-inner ${
            isDraggingLogo ? 'bg-brand-500/20 text-brand-300 scale-110' : 'bg-brand-500/10 text-brand-400 group-hover:scale-110'
          }`}>
            <Upload size={28} />
          </div>
          <p className="text-sm sm:text-base font-medium text-white mb-1">
            Click to upload or drag and drop your company logo
          </p>
          <p className="text-xs text-gray-400 max-w-md mb-3">
            Supports PNG, SVG, and JPG / JPEG formats. Transparent PNG or SVG is recommended for optimal rendering on both dark app headers and white invoice prints.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 text-[11px]">
            <span className="bg-brand-500/10 text-brand-300 border border-brand-500/20 px-2.5 py-1 rounded-md font-medium flex items-center gap-1">
              ✓ PNG Supported
            </span>
            <span className="bg-brand-500/10 text-brand-300 border border-brand-500/20 px-2.5 py-1 rounded-md font-medium flex items-center gap-1">
              ✓ SVG Supported
            </span>
            <span className="bg-brand-500/10 text-brand-300 border border-brand-500/20 px-2.5 py-1 rounded-md font-medium flex items-center gap-1">
              ✓ JPG / JPEG Supported
            </span>
          </div>

          {isOptimizingLogo && (
            <div className="mt-4 flex items-center gap-2 text-xs text-brand-300 bg-brand-500/10 px-3 py-1.5 rounded-lg border border-brand-500/20 animate-pulse">
              <Loader2 size={14} className="animate-spin" />
              Optimizing image for high-definition rendering and cloud synchronization...
            </div>
          )}
        </div>

        {logoFile && (
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-xs">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={16} className="text-green-400" />
              <div>
                <p className="text-white font-medium">{logoFile.name}</p>
                <p className="text-gray-400 text-[11px]">Ready to save ({Math.round(logoFile.size / 1024)} KB)</p>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => logoInputRef.current?.click()}
              className="text-brand-300 hover:text-white underline text-xs font-semibold"
            >
              Choose Different Image
            </button>
          </div>
        )}
      </div>

      {/* Company Name & Details */}
      <div className="space-y-4 border-t border-white/10 pt-6">
        <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
          <Building2 size={16} className="text-brand-400" />
          Company Text & Headings
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Company Legal Name</label>
            <input 
              type="text"
              value={brandCompanyName}
              onChange={(e) => setBrandCompanyName(e.target.value)}
              placeholder="e.g. Docks (Pvt.) Ltd"
              className="w-full glass-input rounded-lg p-2.5 outline-none text-sm text-white"
            />
            <p className="text-[11px] text-gray-500 mt-1">Displayed alongside your logo on reports and invoices.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Company Subtitle / Operations</label>
            <input 
              type="text"
              value={brandSubtitle}
              onChange={(e) => setBrandSubtitle(e.target.value)}
              placeholder="e.g. Customs Clearance, Bonded Carrier & Freight Terminal Operations"
              className="w-full glass-input rounded-lg p-2.5 outline-none text-sm text-white"
            />
            <p className="text-[11px] text-gray-500 mt-1">Appears below the logo on print letterheads.</p>
          </div>
        </div>
      </div>

      {/* Persistence Note */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 flex items-start gap-3 text-xs text-gray-300">
        <CheckCircle2 size={16} className="text-brand-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-white">Guaranteed Permanent Persistence</p>
          <p className="text-gray-400 mt-0.5">
            Your uploaded logo is synchronized with your cloud database and preserved in browser storage. It will remain active across page reloads, tab switches, and all computers until you explicitly click &quot;Reset to Default Logo&quot;.
          </p>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/10 pt-6">
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {onReplaySplash && (
            <button 
              type="button"
              onClick={onReplaySplash}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-amber-500/30 text-amber-300 hover:bg-amber-500/10 transition-colors text-xs sm:text-sm font-semibold flex items-center justify-center gap-2"
              title="Preview the full animated welcome splash screen"
            >
              <Sparkles size={15} className="text-amber-400" />
              Preview Splash Screen
            </button>
          )}

          <button 
            type="button"
            disabled={brandingSaving || (!isCustomLogo && !logoPreview)}
            onClick={handleResetLogo}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RotateCcw size={15} />
            Reset to Default Logo
          </button>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {brandingSuccess && (
            <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 size={16} /> Logo & Branding Saved!
            </span>
          )}
          <button 
            type="button"
            disabled={brandingSaving || isOptimizingLogo}
            onClick={handleSaveBranding}
            className="w-full sm:w-auto bg-brand-600 hover:bg-brand-500 text-white px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-brand-600/30 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {brandingSaving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving to Cloud...
              </>
            ) : (
              <>
                <Save size={16} />
                Save & Apply Logo
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-36 sm:pb-16">
      <h2 className="text-3xl font-bold text-white mb-6 drop-shadow-md uppercase tracking-tight font-sans">Settings</h2>

      <div className="flex gap-4 border-b border-white/10 pb-1 overflow-x-auto no-scrollbar">
        <button onClick={() => setActiveSection('general')} className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 font-sans ${activeSection === 'general' ? 'border-brand-500 text-white font-bold' : 'border-transparent text-gray-400 hover:text-white'}`}>General</button>
        <button onClick={() => setActiveSection('logo')} className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 font-sans flex items-center gap-2 ${activeSection === 'logo' ? 'border-brand-500 text-white font-bold' : 'border-transparent text-gray-400 hover:text-white'}`}>
          <ImageIcon size={15} />
          Logo & Branding
          {isCustomLogo && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
        </button>
        <button onClick={() => setActiveSection('tax')} className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 font-sans flex items-center gap-2 ${activeSection === 'tax' ? 'border-brand-500 text-white font-bold' : 'border-transparent text-gray-400 hover:text-white'}`}>
          <FileText size={15} />
          Tax & Finance
        </button>
        <button onClick={() => setActiveSection('drive')} className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 font-sans flex items-center gap-2 ${activeSection === 'drive' ? 'border-brand-500 text-white font-bold' : 'border-transparent text-gray-400 hover:text-white'}`}>
          <HardDrive size={15} />
          Google Drive
        </button>
        <button onClick={() => setActiveSection('banks')} className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 font-sans ${activeSection === 'banks' ? 'border-brand-500 text-white font-bold' : 'border-transparent text-gray-400 hover:text-white'}`}>Banks</button>
        <button onClick={() => setActiveSection('backup')} className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 font-sans ${activeSection === 'backup' ? 'border-brand-500 text-white font-bold' : 'border-transparent text-gray-400 hover:text-white'}`}>Backup</button>
      </div>

      <div className="mt-6">
        {activeSection === 'general' && renderGeneralSettings()}
        {activeSection === 'logo' && renderLogoSettings()}
        {activeSection === 'tax' && renderTaxSettings()}
        {activeSection === 'drive' && (
          <div className="glass-card rounded-2xl p-6 shadow-2xl animate-fade-in text-left">
            <GoogleDriveManager attachedMode={true} />
          </div>
        )}
        {activeSection === 'banks' && renderBanksManagement()}
        {activeSection === 'backup' && renderBackupSystem()}
      </div>
    </div>
  );
};

export default AppSettings;
