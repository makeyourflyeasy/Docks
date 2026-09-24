import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wallet, FileText, ArrowUpRight, ArrowDownLeft, Plus, 
  Search, Filter, Download, CreditCard, Banknote, Briefcase, X, Save, Calendar, Camera,
  BookOpen, ChevronDown, ChevronUp, CheckCircle2, User, Layers, RefreshCw, AlertCircle, ArrowRight,
  Eye, Loader2, Share2, Upload, Zap, Trash2, Building, Truck, Clock, ShieldCheck, ArrowLeft,
  ArrowLeftRight, FileSpreadsheet
} from 'lucide-react';
import Logo from './Logo';
import { PdfViewerModal } from './PdfViewerModal';
import { FinanceEntry, Case, Client, LedgerEntry, AppUser, RecurringFinanceTemplate, UserRole, Vendor, CaseStatus, CaseCharge } from '../types';
import { exportGeneralLedgerToExcel, exportClientLedgerToExcel } from '../services/excelExportService';
import { 
  getStoredVendors, 
  saveVendor, 
  subscribeToVendors, 
  VENDOR_CATEGORIES 
} from '../services/vendorService';
import { logActivity } from '../services/activityLogService';
import { 
  subscribeToFinances, 
  saveFinanceToFirestore, 
  updateFinanceInFirestore,
  deleteFinanceFromFirestore,
  subscribeToCases,
  subscribeToClients,
  subscribeToUsers,
  subscribeToRecurringTemplates,
  saveRecurringTemplateToFirestore,
  deleteRecurringTemplateFromFirestore,
  saveClientToFirestore,
  DEFAULT_CLIENTS,
  syncMonthlyStaffSalariesToPayables
} from '../services/dbService';
import { exportCSVFile, compressAndPrepareFile, convertImageToPdf } from '../services/fileUtils';
import { safeAppStorage } from '../services/storage';
import { useBranding } from '../services/brandingService';
import { 
  downloadPaymentReceiptPdf, 
  downloadReceivableInvoicePdf, 
  downloadClientLedgerPdf, 
  downloadGeneralLedgerPdf,
  numberToWordsRupees,
  PaymentReceiptData,
  ReceivableInvoiceData,
  sharePdfFile
} from '../services/pdfExportService';
import { getStandardChargesForCategory } from '../services/customsComplianceService';
import { getCategoryArrangements, getArrangementCharges } from '../services/categoryTariffService';

const INITIAL_FINANCE_DATA: FinanceEntry[] = [];

const INITIAL_RECEIVABLES: FinanceEntry[] = [];

const INITIAL_PAYABLES: FinanceEntry[] = [];

interface FinanceProps {
  initialFilter?: any;
  onActionComplete?: (notificationId: number) => void;
  customLogo?: string | null;
}

const Finance: React.FC<FinanceProps> = ({ initialFilter, onActionComplete, customLogo }) => {
  const branding = useBranding();
  const { companyName, subtitle } = branding;
  const activeLogo = customLogo || branding.customLogo;
  const [activeTab, setActiveTab] = useState(() => {
    return safeAppStorage.getItem('dpl_finance_tab') || 'cashbook';
  });

  useEffect(() => {
    safeAppStorage.setItem('dpl_finance_tab', activeTab);
  }, [activeTab]);

  const [activeNotificationId, setActiveNotificationId] = useState<number | null>(null);
  const [financeData, setFinanceData] = useState<FinanceEntry[]>(() => {
    return safeAppStorage.getJSON<FinanceEntry[]>('dpl_live_finance', INITIAL_FINANCE_DATA);
  });
  const [receivables, setReceivables] = useState<FinanceEntry[]>(() => {
    return safeAppStorage.getJSON<FinanceEntry[]>('dpl_live_receivables', INITIAL_RECEIVABLES);
  });
  const [payables, setPayables] = useState<FinanceEntry[]>(() => {
    return safeAppStorage.getJSON<FinanceEntry[]>('dpl_live_payables', INITIAL_PAYABLES);
  });
  const [cases, setCases] = useState<Case[]>(() => {
    return safeAppStorage.getJSON<Case[]>('dpl_live_cases', []);
  });

  // Interactive Financial Counter Modal State
  const [statBreakdownModal, setStatBreakdownModal] = useState<'cash_in_hand' | 'receivables' | 'payables' | 'received_amount' | null>(null);
  const [statSearchQuery, setStatSearchQuery] = useState('');
  const [statFilterSubtab, setStatFilterSubtab] = useState<string>('ALL');

  const generateFinanceReference = (customList?: FinanceEntry[]) => {
    // Collect all entries from financeData, receivables, and payables to find the maximum serial globally
    const listToScan = customList || [...financeData, ...receivables, ...payables];
    let maxSeq = 0;
    listToScan.forEach(f => {
      if (f.reference) {
        const match = f.reference.match(/DPL-(\d+)/i);
        if (match) {
          const seq = parseInt(match[1], 10);
          if (seq > maxSeq) maxSeq = seq;
        } else {
          const parts = f.reference.split('-');
          const last = parts[parts.length - 1];
          const seq = parseInt(last, 10);
          if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
        }
      }
    });
    const nextSeq = maxSeq + 1;
    return `DPL-${String(nextSeq).padStart(4, '0')}`;
  };

  // Cross-component and cross-storage live sync
  useEffect(() => {
    const handleSync = () => {
      const storedCases = safeAppStorage.getJSON<Case[] | null>('dpl_live_cases', null);
      setCases(Array.isArray(storedCases) ? storedCases : []);

      const storedFinance = safeAppStorage.getJSON<FinanceEntry[] | null>('dpl_live_finance', null);
      setFinanceData(Array.isArray(storedFinance) ? storedFinance : []);

      const storedRecv = safeAppStorage.getJSON<FinanceEntry[] | null>('dpl_live_receivables', null);
      setReceivables(Array.isArray(storedRecv) ? storedRecv : []);

      const storedPay = safeAppStorage.getJSON<FinanceEntry[] | null>('dpl_live_payables', null);
      setPayables(Array.isArray(storedPay) ? storedPay : []);
    };

    window.addEventListener('dpl_cases_updated', handleSync);
    window.addEventListener('dpl_finance_updated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('dpl_cases_updated', handleSync);
      window.removeEventListener('dpl_finance_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Sync to safeAppStorage whenever state updates
  useEffect(() => {
    safeAppStorage.setJSON('dpl_live_finance', financeData);
  }, [financeData]);

  useEffect(() => {
    safeAppStorage.setJSON('dpl_live_receivables', receivables);
  }, [receivables]);

  useEffect(() => {
    safeAppStorage.setJSON('dpl_live_payables', payables);
  }, [payables]);

  // Registered Clients Management
  const [clientList, setClientList] = useState<string[]>(DEFAULT_CLIENTS);
  const [selectedLedgerClient, setSelectedLedgerClient] = useState<string>(() => {
    return safeAppStorage.getItem('dpl_finance_client') || '';
  });

  useEffect(() => {
    safeAppStorage.setItem('dpl_finance_client', selectedLedgerClient);
  }, [selectedLedgerClient]);
  const [glAccountFilter, setGlAccountFilter] = useState<string>('ALL');

  // Staff & Recurring Templates State
  const [users, setUsers] = useState<AppUser[]>([]);
  const [recurringTemplates, setRecurringTemplates] = useState<RecurringFinanceTemplate[]>([]);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [newRecurringForm, setNewRecurringForm] = useState<Partial<RecurringFinanceTemplate>>({
    title: '',
    type: 'PAYABLE',
    amount: 0,
    party: '',
    category: 'Rent & Facilities',
    frequency: 'MONTHLY_FIRST',
    active: true,
    notes: ''
  });
  const [isPostingRecurring, setIsPostingRecurring] = useState(false);
  const [recurringPostMessage, setRecurringPostMessage] = useState<string | null>(null);

  // Quick Payment Receive Modal for Invoice
  const [showReceivePaymentModal, setShowReceivePaymentModal] = useState(false);
  const [invoiceForReceive, setInvoiceForReceive] = useState<any>(null);
  const [receivePaymentAmount, setReceivePaymentAmount] = useState<string>('');
  const [receivePaymentMethod, setReceivePaymentMethod] = useState<'CASH' | 'BANK'>('BANK');
  const [receivePaymentBank, setReceivePaymentBank] = useState<string>('HBL Corporate');
  const [receivePaymentTrx, setReceivePaymentTrx] = useState<string>('');
  const [expandedReceivableClient, setExpandedReceivableClient] = useState<string | null>(null);

  // Recurring Template Modal State
  const [newRecurringTemplate, setNewRecurringTemplate] = useState<{
    title: string;
    amount: number | string;
    party: string;
    category: string;
    type: 'PAYABLE' | 'RECEIVABLE';
    dayOfMonth: number;
    notes?: string;
  }>({
    title: '',
    amount: '',
    party: '',
    category: 'Office Rent',
    type: 'PAYABLE',
    dayOfMonth: 1,
    notes: ''
  });

  // Staff & Transporter Ledger filters
  const [staffFilter, setStaffFilter] = useState('ALL');
  const [transporterFilter, setTransporterFilter] = useState('ALL');

  // Modals & Forms State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConfirmPaidModal, setShowConfirmPaidModal] = useState(false);
  const [pendingPaymentEntry, setPendingPaymentEntry] = useState<{id: number, list: FinanceEntry[], setList: React.Dispatch<React.SetStateAction<FinanceEntry[]>>} | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');
  const [transactionType, setTransactionType] = useState<'PAYABLE' | 'RECEIVABLE' | 'INCOME' | 'EXPENSE'>('INCOME');

  // PDF Export and Document Viewers State
  const [selectedReceiptData, setSelectedReceiptData] = useState<PaymentReceiptData | null>(null);
  const [selectedInvoiceData, setSelectedInvoiceData] = useState<ReceivableInvoiceData | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState<string | null>(null);
  const [pdfErrorMessage, setPdfErrorMessage] = useState<string | null>(null);
  const [directDownloadUrl, setDirectDownloadUrl] = useState<string | null>(null);
  const [directDownloadFilename, setDirectDownloadFilename] = useState<string>('Document.pdf');
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
  
  // Party selection inside modal
  const [isOtherClient, setIsOtherClient] = useState(false);
  const [otherClientName, setOtherClientName] = useState('');

  // Vendors & Utilities State
  const [vendors, setVendors] = useState<Vendor[]>(() => getStoredVendors());
  const [selectedVendorForLedger, setSelectedVendorForLedger] = useState<Vendor | null>(null);
  const [vendorCategoryFilter, setVendorCategoryFilter] = useState<string>('ALL');
  const [vendorSearchQuery, setVendorSearchQuery] = useState('');
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [newVendorForm, setNewVendorForm] = useState<Partial<Vendor>>({
    name: '',
    category: 'Drinking Water Charges',
    companyTitle: '',
    contactNumber: '',
    address: '',
    isRecurring: false
  });

  // Auto Vendor Detection Prompt when paying a non-staff party
  const [autoVendorPrompt, setAutoVendorPrompt] = useState<{
    isOpen: boolean;
    name: string;
    category: string;
    companyTitle: string;
    contactNumber: string;
    address: string;
    pendingEntry?: FinanceEntry;
  } | null>(null);

  // Date Range Filtering for Ledgers
  const [ledgerStartDate, setLedgerStartDate] = useState<string>('');
  const [ledgerEndDate, setLedgerEndDate] = useState<string>('');

  // All Invoices Directory Modal
  const [showAllInvoicesModal, setShowAllInvoicesModal] = useState(false);

  const [newTransaction, setNewTransaction] = useState<Partial<FinanceEntry>>({
    description: '', amount: 0, party: '', paymentMethod: 'CASH', bankId: '', transactionId: '', slipUrl: '', documentUrl: '', documentName: ''
  });

  const DEFAULT_BANKS = [
    { id: '1', name: 'HBL Corporate' },
    { id: '2', name: 'Meezan Bank' },
    { id: '3', name: 'Bank Al Habib' },
    { id: '4', name: 'MCB Islamic' }
  ];

  const [customBanks, setCustomBanks] = useState<{ id: string; name: string }[]>(() => {
    return safeAppStorage.getJSON<{ id: string; name: string }[]>('dpl_custom_banks', []);
  });

  const banks = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    DEFAULT_BANKS.forEach(b => map.set(b.name.trim().toLowerCase(), b));
    customBanks.forEach(b => map.set(b.name.trim().toLowerCase(), b));
    financeData.forEach(entry => {
      if (entry.paymentMethod === 'BANK' && entry.bankName && entry.bankName.trim()) {
        const trimmed = entry.bankName.trim();
        if (!map.has(trimmed.toLowerCase())) {
          map.set(trimmed.toLowerCase(), { id: `auto_${trimmed}`, name: trimmed });
        }
      }
    });
    return Array.from(map.values());
  }, [customBanks, financeData]);

  // Internal Transfer & Account Management State
  const [showInternalTransferModal, setShowInternalTransferModal] = useState(false);
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [transferSource, setTransferSource] = useState<string>('DRAWER');
  const [transferDestination, setTransferDestination] = useState<string>('HBL Corporate');
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [transferDescription, setTransferDescription] = useState<string>('');
  const [newBankNameInput, setNewBankNameInput] = useState<string>('');

  const handleExecuteInternalTransfer = async () => {
    const amt = Number(transferAmount) || 0;
    if (amt <= 0) {
      alert('Please enter a valid transfer amount.');
      return;
    }
    if (transferSource === transferDestination) {
      alert('Source and destination accounts cannot be the same.');
      return;
    }

    const now = new Date().toISOString().split('T')[0];
    const sourceLabel = transferSource === 'DRAWER' ? 'Cash in Drawer' : transferSource;
    const destLabel = transferDestination === 'DRAWER' ? 'Cash in Drawer' : transferDestination;
    const desc = transferDescription.trim() || `Internal Cash Transfer: ${sourceLabel} -> ${destLabel}`;
    const timestamp = Date.now();

    // 1. Outflow from source
    const outflowEntry: FinanceEntry = {
      id: timestamp,
      date: now,
      description: `${desc} (Debit/Outflow)`,
      amount: amt,
      type: 'EXPENSE',
      status: 'PAID',
      party: destLabel,
      category: 'Internal Transfer',
      reference: `TRF-OUT-${timestamp.toString().slice(-6)}`,
      paymentMethod: transferSource === 'DRAWER' ? 'CASH' : 'BANK',
      bankName: transferSource === 'DRAWER' ? undefined : transferSource
    };

    // 2. Inflow into destination
    const inflowEntry: FinanceEntry = {
      id: timestamp + 1,
      date: now,
      description: `${desc} (Credit/Inflow)`,
      amount: amt,
      type: 'INCOME',
      status: 'PAID',
      party: sourceLabel,
      category: 'Internal Transfer',
      reference: `TRF-IN-${timestamp.toString().slice(-6)}`,
      paymentMethod: transferDestination === 'DRAWER' ? 'CASH' : 'BANK',
      bankName: transferDestination === 'DRAWER' ? undefined : transferDestination
    };

    setFinanceData(prev => [inflowEntry, outflowEntry, ...prev]);
    await saveFinanceToFirestore(outflowEntry).catch(() => {});
    await saveFinanceToFirestore(inflowEntry).catch(() => {});
    logActivity(`Internal Transfer: PKR ${amt.toLocaleString()} from ${sourceLabel} to ${destLabel}`, 'FINANCE');

    setTransferAmount('');
    setTransferDescription('');
    setShowInternalTransferModal(false);
  };

  const handleAddCustomBank = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (banks.some(b => b.name.toLowerCase() === trimmed.toLowerCase())) {
      alert('This bank account already exists.');
      return;
    }
    const newBank = { id: `custom_${Date.now()}`, name: trimmed };
    const updated = [...customBanks, newBank];
    setCustomBanks(updated);
    safeAppStorage.setJSON('dpl_custom_banks', updated);
    setNewBankNameInput('');
    setShowAddBankModal(false);
  };

  // 1. Synchronize finances with Firestore
  useEffect(() => {
    const unsubscribe = subscribeToFinances((items) => {
      if (items) {
        const cashList = items.filter(i => i.type === 'INCOME' || i.type === 'EXPENSE');
        const recvList = items.filter(i => i.type === 'RECEIVABLE');
        const payList = items.filter(i => i.type === 'PAYABLE');

        setFinanceData(cashList);
        setReceivables(recvList);
        setPayables(payList);
        safeAppStorage.setJSON('dpl_live_finance', cashList);
        safeAppStorage.setJSON('dpl_live_receivables', recvList);
        safeAppStorage.setJSON('dpl_live_payables', payList);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Synchronize cases from Firestore for automatic container/case charges
  useEffect(() => {
    const unsubscribe = subscribeToCases((casesFromDb) => {
      setCases(casesFromDb || []);
    });
    return () => unsubscribe();
  }, []);

  // 3. Synchronize users from Firestore for staff payroll & salaries
  useEffect(() => {
    const unsubscribe = subscribeToUsers((usersFromDb) => {
      setUsers(usersFromDb || []);
    });
    return () => unsubscribe();
  }, []);

  // 4. Synchronize recurring templates (Monthly Fixed Expenses / Receivables)
  useEffect(() => {
    const unsubscribe = subscribeToRecurringTemplates((tpls) => {
      setRecurringTemplates(tpls || []);
    });
    return () => unsubscribe();
  }, []);

  // 5. Synchronize clients from Firestore
  useEffect(() => {
    const unsubscribe = subscribeToClients((clientsFromDb) => {
      const dbNames = (clientsFromDb || []).map(c => c.name?.trim()).filter(Boolean);
      const caseNames = cases.map(c => c.clientName?.trim()).filter(Boolean);
      const financeParties = [...financeData, ...receivables].map(f => f.party?.trim()).filter(Boolean);
      const combined = Array.from(new Set([...DEFAULT_CLIENTS, ...dbNames, ...caseNames, ...financeParties]));
      setClientList(combined);
      if (!selectedLedgerClient && combined.length > 0) {
        setSelectedLedgerClient(combined[0]);
      }
    });
    return () => unsubscribe();
  }, [cases, financeData, receivables]);

  // 6. Synchronize vendors from Firestore / Storage
  useEffect(() => {
    const unsubscribe = subscribeToVendors((vendorsFromDb) => {
      if (vendorsFromDb && Array.isArray(vendorsFromDb)) {
        setVendors(vendorsFromDb);
      }
    });
    return () => unsubscribe();
  }, []);

  // One-time purge for any previously auto-generated mock recurring/salary entries that were posted during reset
  useEffect(() => {
    const phantomEntries = payables.filter(p => p.reference?.startsWith('REC-') || p.reference?.startsWith('SAL-'));
    if (phantomEntries.length > 0 && safeAppStorage.getItem('dpl_cleanup_phantom_v3') !== 'done') {
      safeAppStorage.setItem('dpl_cleanup_phantom_v3', 'done');
      phantomEntries.forEach(p => {
        if (p.id) deleteFinanceFromFirestore(p.id).catch(() => {});
      });
      setPayables(prev => prev.filter(p => !p.reference?.startsWith('REC-') && !p.reference?.startsWith('SAL-')));
      safeAppStorage.setJSON('dpl_live_payables', []);
    }
  }, [payables]);

  // Automatic staff salary generation on the 1st of every month for all office staff members (regardless of role)
  useEffect(() => {
    if (!users || users.length === 0) return;
    syncMonthlyStaffSalariesToPayables(users, payables).then((created) => {
      if (created && created.length > 0) {
        setPayables(prev => {
          const combined = [...created, ...prev];
          safeAppStorage.setJSON('dpl_live_payables', combined);
          return combined;
        });
      }
    }).catch((e) => console.warn('Salary auto-sync notice:', e));
  }, [users]);

  // MANUAL POST ALL FIXED EXPENSES & SALARIES FOR CURRENT MONTH
  const handlePostAllMonthlyFixedExpenses = async () => {
    setIsPostingRecurring(true);
    setRecurringPostMessage(null);
    try {
      const now = new Date();
      const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const firstOfMonthDate = `${currentMonthStr}-01`;
      let addedCount = 0;

      // 1. Post recurring templates
      for (const tpl of recurringTemplates) {
        if (tpl.active) {
          const recRef = `REC-${currentMonthStr}-${tpl.id}`;
          const targetList = tpl.type === 'PAYABLE' ? payables : receivables;
          const alreadyExists = targetList.some(item => item.reference === recRef);
          if (!alreadyExists) {
            const recEntry: FinanceEntry = {
              id: Date.now() + Math.floor(Math.random() * 1000),
              date: firstOfMonthDate,
              description: `${tpl.title} (${tpl.category})`,
              party: tpl.party,
              amount: tpl.amount,
              type: tpl.type,
              status: 'PENDING',
              category: tpl.category,
              reference: recRef,
              recurringTemplateId: tpl.id,
              paymentMethod: 'BANK',
              bankName: 'HBL Corporate'
            };
            await saveFinanceToFirestore(recEntry);
            addedCount++;
          }
        }
      }

      // 2. Post staff salaries for all staff members (regardless of assigned role)
      for (const u of users) {
        if (u.role !== UserRole.CLIENT && u.role !== UserRole.TRANSPORTER && Number(u.baseSalary || 0) > 0) {
          const salaryRef = `SAL-${currentMonthStr}-${u.id}`;
          const alreadyExists = payables.some(p => p.reference === salaryRef || (p.category === 'Staff Payroll & Salaries' && p.party?.trim().toLowerCase() === u.name?.trim().toLowerCase() && p.date === firstOfMonthDate));
          if (!alreadyExists) {
            const netSalary = Math.max(0, Number(u.baseSalary || 0) - Number(u.loansAdvances || 0));
            const roleLabel = u.designation || (u.role === UserRole.OFFICE_STAFF ? 'Office Staff' : String(u.role).replace(/_/g, ' '));
            const salaryPayable: FinanceEntry = {
              id: Date.now() + Math.floor(Math.random() * 1000) + addedCount,
              date: firstOfMonthDate,
              description: `Monthly Salary - ${u.name} (${roleLabel}) [Gross: PKR ${Number(u.baseSalary).toLocaleString()}]`,
              party: u.name,
              amount: netSalary,
              type: 'PAYABLE',
              status: 'PENDING',
              category: 'Staff Payroll & Salaries',
              reference: salaryRef,
              paymentMethod: 'BANK',
              bankName: 'Meezan Bank'
            };
            await saveFinanceToFirestore(salaryPayable);
            addedCount++;
          }
        }
      }

      setRecurringPostMessage(`Successfully verified and posted ${addedCount} monthly entries for ${currentMonthStr}!`);
    } catch (err) {
      console.error(err);
      setRecurringPostMessage('Failed to post monthly fixed expenses.');
    } finally {
      setIsPostingRecurring(false);
    }
  };

  // Helper to toggle active/inactive for recurring templates
  const handleToggleRecurringActive = async (template: RecurringFinanceTemplate) => {
    const updated = { ...template, isActive: !template.isActive };
    setRecurringTemplates(prev => prev.map(t => t.id === template.id ? updated : t));
    await saveRecurringTemplateToFirestore(updated);
  };

  // Helper to delete recurring template
  const handleDeleteRecurringTemplate = async (templateId: string) => {
    if (!window.confirm("Are you sure you want to delete this recurring expense template?")) return;
    setRecurringTemplates(prev => prev.filter(t => t.id !== templateId));
    await deleteRecurringTemplateFromFirestore(templateId);
  };

  // Helper to save new recurring template
  const handleSaveNewRecurringTemplate = async () => {
    if (!newRecurringTemplate.title || !newRecurringTemplate.amount || !newRecurringTemplate.party) {
      alert("Please provide Title, Beneficiary/Party, and Amount.");
      return;
    }
    const template: RecurringFinanceTemplate = {
      id: `rec_${Date.now()}`,
      title: newRecurringTemplate.title.trim(),
      amount: Number(newRecurringTemplate.amount),
      party: newRecurringTemplate.party.trim(),
      category: newRecurringTemplate.category || 'Operational Expense',
      type: newRecurringTemplate.type || 'PAYABLE',
      dayOfMonth: Number(newRecurringTemplate.dayOfMonth) || 1,
      isActive: true,
      notes: newRecurringTemplate.notes?.trim() || ''
    };

    setRecurringTemplates(prev => [template, ...prev]);
    await saveRecurringTemplateToFirestore(template);
    setShowRecurringModal(false);
    setNewRecurringTemplate({
      title: '',
      amount: '',
      party: '',
      category: 'Office Rent',
      type: 'PAYABLE',
      dayOfMonth: 1,
      notes: ''
    });
  };

  useEffect(() => {
    if (initialFilter) {
      if (initialFilter.tab) setActiveTab(initialFilter.tab);
      if (initialFilter.notificationId) setActiveNotificationId(initialFilter.notificationId);
      if (initialFilter.openModal) setStatBreakdownModal(initialFilter.openModal);
    }
  }, [initialFilter]);

  const tabs = [
    { id: 'cashbook', label: 'Cashbook' },
    { id: 'receivables', label: 'Receivables' },
    { id: 'payables', label: 'Payables' },
    { id: 'client_ledger', label: 'Client Ledger' },
    { id: 'general_ledger', label: 'General Ledger' },
    { id: 'transporter_ledger', label: 'Transporter/Broker Ledger' },
    { id: 'staff_ledger', label: 'Staff Ledger' },
    { id: 'vendor_ledger', label: 'Vendors & Utilities' },
    { id: 'recurring', label: 'Monthly Fixed & Recurring' },
  ];

  // Helper to extract all valid invoiced charges for a case (explicit charges, arrangements, or default tariff)
  const getCaseChargesList = (c: Case): CaseCharge[] => {
    // 1. Direct explicit charges stored on the case
    if (c.charges && c.charges.length > 0) {
      const valid = c.charges.filter(ch => ch.arrangedBy !== 'Client' && (Number(ch.amount) || 0) > 0);
      if (valid.length > 0) return valid;
    }
    // 2. Service arrangements stored on the case
    if (c.serviceArrangements && typeof c.serviceArrangements === 'object') {
      const arrCharges: CaseCharge[] = Object.entries(c.serviceArrangements)
        .filter(([_, item]: [string, any]) => item && item.arrangedBy !== 'Client' && (Number(item.amount) || 0) > 0)
        .map(([key, item]: [string, any], idx) => ({
          id: `arr_${c.id}_${key}_${idx}`,
          description: item.label || key.replace(/_/g, ' ').toUpperCase(),
          amount: Number(item.amount) || 0,
          arrangedBy: 'DPL',
          category: c.category
        }));
      if (arrCharges.length > 0) return arrCharges;
    }
    // 3. Fallback to totalAmount / extractedData amount if specified
    const fallbackAmount = Number(c.totalAmount) || 
                           Number((c.extractedData as any)?.totalAmount) || 
                           Number((c.extractedData as any)?.invoiceAmount) || 0;
    if (fallbackAmount > 0) {
      return [{
        id: `fb_${c.id}`,
        description: `Case Invoiced Charges (${c.category || 'Transit'})`,
        amount: fallbackAmount,
        arrangedBy: 'DPL',
        category: c.category
      }];
    }
    // 4. Default tariff arrangements based on category
    try {
      const catArr = getCategoryArrangements(c.category || 'Bonded Carrier');
      if (catArr) {
        const dCharges = getArrangementCharges(catArr);
        if (dCharges.length > 0) return dCharges;
      }
    } catch {
      // fallback
    }
    return [];
  };

  // Helper to calculate total charges for a case (ONLY explicit charges arranged by DPL, excluding Client arranged)
  const getCaseTotalCharges = (c: Case): { total: number; breakdown: string } => {
    const charges = getCaseChargesList(c);
    if (charges.length > 0) {
      const sum = charges.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
      const details = charges.map(ch => `${ch.description}: PKR ${Number(ch.amount || 0).toLocaleString()}`).join(', ');
      return { total: sum, breakdown: details || 'Invoiced charges' };
    }
    return { total: 0, breakdown: 'No charges added' };
  };

  // Build real-time dynamic Client Ledger for selected client
  const clientLedgerEntries = useMemo(() => {
    if (!selectedLedgerClient) return [];
    const entries: LedgerEntry[] = [];
    const targetClient = selectedLedgerClient.trim().toLowerCase().replace(/\s+/g, ' ');

    const matchClient = (candidate?: string) => {
      if (!candidate) return false;
      const c = candidate.trim().toLowerCase().replace(/\s+/g, ' ');
      return c === targetClient || c.includes(targetClient) || targetClient.includes(c);
    };

    // 1. Initial Opening Balance entry
    entries.push({
      id: `open_${selectedLedgerClient}`,
      date: '2026-04-01',
      reference: 'OPN-BAL',
      description: 'Account Opening Balance',
      debit: 0,
      credit: 0,
      balance: 0,
      type: 'INFO',
      party: selectedLedgerClient
    });

    // 2. Add Debits from Cases (Charges explicitly added per case & container / tariff / invoice)
    cases.forEach((c) => {
      const clientCandidate = c.clientName || c.client || c.importer || (c.extractedData as any)?.cargoOwner || (c.extractedData as any)?.importerName;
      if (matchClient(clientCandidate)) {
        // Active cases have charges billed & recognized; only exclude cancelled
        if (c.status === 'CANCELLED') return;

        const charges = getCaseChargesList(c);
        // Rule: Case number is identical to invoice number
        const invNo = c.invoiceNo || c.caseNo || (c.extractedData && c.extractedData.blNumber ? `INV-${c.extractedData.blNumber}` : `INV-${c.id}`);
        const cntrNumbers = (c.containers || []).map(cntr => cntr.number).filter(Boolean).join(', ');
        const cntrInfo = cntrNumbers ? `[${(c.containers || []).length} Cntr: ${cntrNumbers}]` : '';

        if (charges.length > 1) {
          // Add each itemized charge line as its own debit entry so payments against specific charges (e.g. AGAINST TP CHARGES) reconcile cleanly
          charges.forEach((ch, idx) => {
            const chargeDate = (ch as any).date || c.createdAt || c.registrationDate || new Date().toISOString().split('T')[0];
            entries.push({
              id: `case_${c.id}_ch_${idx}_${ch.id || idx}`,
              date: chargeDate,
              reference: invNo,
              description: `Invoice: ${ch.description} - Case ${c.caseNo}${cntrInfo ? ' ' + cntrInfo : ''}`,
              debit: Number(ch.amount) || 0,
              credit: 0,
              balance: 0,
              type: 'DEBIT',
              party: selectedLedgerClient,
              relatedCaseId: c.id
            });
          });
        } else if (charges.length === 1) {
          const ch = charges[0];
          const chargeDate = (ch as any).date || c.createdAt || c.registrationDate || new Date().toISOString().split('T')[0];
          entries.push({
            id: `case_${c.id}`,
            date: chargeDate,
            reference: invNo,
            description: `Invoice: ${ch.description} - Case ${c.caseNo}${cntrInfo ? ' ' + cntrInfo : ''}`,
            debit: Number(ch.amount) || 0,
            credit: 0,
            balance: 0,
            type: 'DEBIT',
            party: selectedLedgerClient,
            relatedCaseId: c.id
          });
        }
      }
    });

    // 3. Add Receivables billed directly (if not from cases)
    receivables.forEach((r) => {
      if (matchClient(r.party)) {
        // Prevent duplicate if this receivable is already linked to a case that was added above
        const isAlreadyAdded = entries.some(e => 
          (r.relatedCaseId && (e as any).relatedCaseId === r.relatedCaseId) ||
          (r.caseNo && e.reference && e.reference.includes(r.caseNo)) ||
          (r.reference && e.reference && e.reference.includes(r.reference))
        );
        if (isAlreadyAdded) return;

        entries.push({
          id: `recv_${r.id}`,
          date: r.date,
          reference: r.reference || r.caseNo || `INV-${r.id}`,
          description: `Invoice: ${r.description}${r.caseNo ? ` - Case ${r.caseNo}` : ''} (${r.category})`,
          debit: Number(r.amount) || 0,
          credit: 0,
          balance: 0,
          type: 'DEBIT',
          party: selectedLedgerClient
        });
      }
    });

    // 4. Add Credits from Payments Received (INCOME or Settled RECEIVABLES)
    financeData.forEach((f) => {
      if (matchClient(f.party) && f.type === 'INCOME') {
        const methodInfo = f.paymentMethod === 'BANK' 
          ? `Bank Transfer (${f.bankName || 'HBL'} Trx #${f.transactionId || 'Direct'})` 
          : 'Cash Receipt';

        entries.push({
          id: `pay_${f.id}`,
          date: f.date,
          reference: f.reference || (f.transactionId ? `#${f.transactionId}` : `REC-${f.id}`),
          description: `Payment Received: ${f.description} [${methodInfo}]`,
          debit: 0,
          credit: Number(f.amount) || 0,
          balance: 0,
          type: 'CREDIT',
          party: selectedLedgerClient
        });
      }
    });

    // 5. Sort chronologically by date ascending, ensuring opening balance is always first
    entries.sort((a, b) => {
      if (a.reference === 'OPN-BAL') return -1;
      if (b.reference === 'OPN-BAL') return 1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    // 6. Compute accurate running balance
    // Debit increases receivable (client owes DPL); Credit decreases receivable (client paid)
    let currentBalance = 0;
    entries.forEach((entry) => {
      currentBalance = currentBalance + entry.debit - entry.credit;
      entry.balance = currentBalance;
    });

    return entries;
  }, [selectedLedgerClient, cases, receivables, financeData]);

  // Filtered Client Ledger Entries by Date Range
  const filteredClientLedgerEntries = useMemo(() => {
    return clientLedgerEntries.filter(entry => {
      if (ledgerStartDate && entry.date < ledgerStartDate) return false;
      if (ledgerEndDate && entry.date > ledgerEndDate) return false;
      return true;
    });
  }, [clientLedgerEntries, ledgerStartDate, ledgerEndDate]);

  // Client summary metrics
  const clientSummary = useMemo(() => {
    const entriesToSummarize = filteredClientLedgerEntries;
    const totalDebits = entriesToSummarize.reduce((sum, e) => sum + e.debit, 0);
    const totalCredits = entriesToSummarize.reduce((sum, e) => sum + e.credit, 0);
    const netBalance = entriesToSummarize.length > 0 ? entriesToSummarize[entriesToSummarize.length - 1].balance : 0;
    const target = (selectedLedgerClient || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const clientCases = cases.filter(c => {
      const cClient = (c.clientName || c.client || c.importer || (c.extractedData as any)?.cargoOwner || (c.extractedData as any)?.importerName || '').trim().toLowerCase().replace(/\s+/g, ' ');
      return cClient === target || cClient.includes(target) || target.includes(cClient);
    });
    const totalContainers = clientCases.reduce((sum, c) => sum + (c.containers?.length || 1), 0);

    return {
      totalDebits,
      totalCredits,
      netBalance,
      totalCases: clientCases.length,
      totalContainers
    };
  }, [filteredClientLedgerEntries, cases, selectedLedgerClient]);

  // Dynamic Vendor Ledger Calculations
  const vendorLedgerEntries = useMemo(() => {
    if (!selectedVendorForLedger) return [];
    const target = selectedVendorForLedger.name.trim().toLowerCase();
    const entries: LedgerEntry[] = [];

    // Opening balance entry
    entries.push({
      id: `open_vnd_${selectedVendorForLedger.id}`,
      date: selectedVendorForLedger.createdAt ? selectedVendorForLedger.createdAt.split('T')[0] : '2026-01-01',
      reference: 'OPN-BAL',
      description: `Opening Balance for ${selectedVendorForLedger.name}`,
      debit: 0,
      credit: 0,
      balance: 0,
      type: 'INFO',
      party: selectedVendorForLedger.name
    });

    // Payables (Debit to vendor ledger = bill incurred by DPL)
    payables.forEach((p) => {
      if (p.party && p.party.trim().toLowerCase() === target) {
        entries.push({
          id: `pay_${p.id}`,
          date: p.date,
          reference: p.reference || `BILL-${p.id}`,
          description: `${p.description} (${p.category})`,
          debit: p.amount,
          credit: 0,
          balance: 0,
          type: 'DEBIT',
          party: selectedVendorForLedger.name
        });
      }
    });

    // Cashbook Payments paid to vendor (Credit to vendor ledger = settlement/payment made)
    financeData.forEach((f) => {
      if (f.party && f.party.trim().toLowerCase() === target && f.type === 'EXPENSE') {
        entries.push({
          id: `exp_${f.id}`,
          date: f.date,
          reference: f.reference || `PAY-${f.id}`,
          description: `Payment Paid: ${f.description} [${f.paymentMethod || 'Cash'}]`,
          debit: 0,
          credit: f.amount,
          balance: 0,
          type: 'CREDIT',
          party: selectedVendorForLedger.name
        });
      }
    });

    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let running = 0;
    entries.forEach((e) => {
      running = running + e.debit - e.credit;
      e.balance = running;
    });

    return entries;
  }, [selectedVendorForLedger, payables, financeData]);

  // Filtered Vendor Ledger Entries
  const filteredVendorLedgerEntries = useMemo(() => {
    return vendorLedgerEntries.filter(entry => {
      if (ledgerStartDate && entry.date < ledgerStartDate) return false;
      if (ledgerEndDate && entry.date > ledgerEndDate) return false;
      return true;
    });
  }, [vendorLedgerEntries, ledgerStartDate, ledgerEndDate]);

  // Unified Receivables with automatic FIFO payment deduction per client
  const calculatedReceivables = useMemo(() => {
    // 1. Collect all invoice / billing items
    const allInvoices: (FinanceEntry & { isCaseInvoice?: boolean })[] = [];

    // A. Case Invoices
    cases.forEach((c) => {
      if (c.status === 'CANCELLED') return;

      const { total, breakdown } = getCaseTotalCharges(c);
      if (total > 0) {
        const cntrNumbers = (c.containers || []).map(cntr => cntr.number).filter(Boolean).join(', ');
        const invNo = c.invoiceNo || c.caseNo || (c.extractedData && c.extractedData.blNumber ? `INV-${c.extractedData.blNumber}` : `INV-${c.id}`);
        allInvoices.push({
          id: typeof c.id === 'number' ? c.id : Number(String(c.id).replace(/\D/g, '').slice(0, 9)) || 1000 + Math.floor(Math.random() * 8000),
          date: c.createdAt || c.registrationDate || new Date().toISOString().split('T')[0],
          party: (c.clientName || c.client || c.importer || (c.extractedData as any)?.cargoOwner || (c.extractedData as any)?.importerName || 'General Client').trim(),
          description: `Case ${c.caseNo}: ${c.category} [${(c.containers || []).length || 1} Cntr: ${cntrNumbers || 'N/A'}] - ${c.pol || 'POL'} to ${c.pod || 'POD'} (${breakdown})`,
          amount: total,
          type: 'RECEIVABLE',
          status: 'PENDING',
          category: 'Freight & Clearance',
          reference: invNo,
          caseNo: c.caseNo,
          containerNumber: cntrNumbers || 'N/A',
          relatedCaseId: String(c.id),
          isCaseInvoice: true
        });
      }
    });

    // B. Direct receivables from Firestore (avoid duplicate if exact reference matches)
    receivables.forEach((r) => {
      const existsInCases = allInvoices.some(inv => 
        Boolean(r.reference && inv.reference && inv.reference.trim().toLowerCase() === r.reference.trim().toLowerCase())
      );
      if (!existsInCases) {
        allInvoices.push({
          ...r,
          isCaseInvoice: false
        });
      }
    });

    // 2. FIFO Payment allocation per client
    const clientGroups: Record<string, typeof allInvoices> = {};
    allInvoices.forEach(inv => {
      const key = (inv.party || 'General Client').trim().toLowerCase();
      if (!clientGroups[key]) clientGroups[key] = [];
      clientGroups[key].push(inv);
    });

    const settledInvoices: (FinanceEntry & { isCaseInvoice?: boolean })[] = [];

    Object.entries(clientGroups).forEach(([clientKey, invList]) => {
      // Sort oldest first for FIFO payment matching
      invList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Sum all payments received from this client
      const totalPaid = financeData
        .filter(f => f.party?.trim().toLowerCase() === clientKey && f.type === 'INCOME')
        .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);

      let availablePayment = totalPaid;

      invList.forEach(inv => {
        if (availablePayment >= inv.amount) {
          inv.status = 'PAID';
          inv.paidAmount = inv.amount;
          inv.remainingAmount = 0;
          availablePayment -= inv.amount;
        } else if (availablePayment > 0) {
          inv.status = 'PARTIAL';
          inv.paidAmount = availablePayment;
          inv.remainingAmount = inv.amount - availablePayment;
          availablePayment = 0;
        } else {
          inv.status = 'PENDING';
          inv.paidAmount = 0;
          inv.remainingAmount = inv.amount;
        }
        settledInvoices.push(inv);
      });
    });

    // Sort descending by date for display
    settledInvoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return settledInvoices;
  }, [cases, receivables, financeData]);

  // Unified Client-Level Receivables: Single row per client showing Ledger Current Balance
  const clientReceivablesSummaries = useMemo(() => {
    const clientMap = new Map<string, {
      party: string;
      totalInvoiced: number;
      totalPaid: number;
      currentBalance: number;
      invoices: (FinanceEntry & { isCaseInvoice?: boolean })[];
      casesSet: Set<string>;
      containerCount: number;
      lastDate: string;
    }>();

    // 1. Accumulate all invoices/charges for each client
    calculatedReceivables.forEach((inv) => {
      const partyName = inv.party?.trim() || 'General Client';
      const key = partyName.toLowerCase();
      if (!clientMap.has(key)) {
        clientMap.set(key, {
          party: partyName,
          totalInvoiced: 0,
          totalPaid: 0,
          currentBalance: 0,
          invoices: [],
          casesSet: new Set(),
          containerCount: 0,
          lastDate: inv.date || ''
        });
      }
      const client = clientMap.get(key)!;
      client.totalInvoiced += (Number(inv.amount) || 0);
      client.invoices.push(inv);
      if (inv.caseNo) client.casesSet.add(inv.caseNo);
      if (inv.date && (!client.lastDate || inv.date > client.lastDate)) {
        client.lastDate = inv.date;
      }
    });

    // 2. Accumulate all income payments received from this client
    financeData.forEach((f) => {
      if (f.type === 'INCOME' && f.party) {
        const partyName = f.party.trim();
        const key = partyName.toLowerCase();
        if (!clientMap.has(key)) {
          clientMap.set(key, {
            party: partyName,
            totalInvoiced: 0,
            totalPaid: 0,
            currentBalance: 0,
            invoices: [],
            casesSet: new Set(),
            containerCount: 0,
            lastDate: f.date || ''
          });
        }
        const client = clientMap.get(key)!;
        client.totalPaid += (Number(f.amount) || 0);
        if (f.date && (!client.lastDate || f.date > client.lastDate)) {
          client.lastDate = f.date;
        }
      }
    });

    const results = Array.from(clientMap.values()).map((client) => {
      const key = client.party.toLowerCase();
      const clientCases = cases.filter(c => c.clientName?.trim().toLowerCase() === key);
      const totalContainers = clientCases.reduce((sum, c) => sum + (c.containers?.length || 1), 0);
      const currentBalance = client.totalInvoiced - client.totalPaid;

      let status: 'PAID' | 'PARTIAL' | 'PENDING' | 'ADVANCE' = 'PENDING';
      if (currentBalance <= 0) {
        status = currentBalance < 0 ? 'ADVANCE' : 'PAID';
      } else if (client.totalPaid > 0) {
        status = 'PARTIAL';
      } else {
        status = 'PENDING';
      }

      return {
        party: client.party,
        totalInvoiced: client.totalInvoiced,
        totalPaid: client.totalPaid,
        currentBalance,
        invoices: client.invoices,
        casesCount: client.casesSet.size,
        containerCount: totalContainers || client.casesSet.size,
        invoicesCount: client.invoices.length,
        lastDate: client.lastDate,
        status
      };
    });

    // Sort: clients with outstanding dues first (descending balance), then cleared
    results.sort((a, b) => b.currentBalance - a.currentBalance);
    return results;
  }, [calculatedReceivables, financeData, cases]);

  // Receivables Summary
  const receivablesSummary = useMemo(() => {
    const totalInvoiced = clientReceivablesSummaries.reduce((sum, r) => sum + r.totalInvoiced, 0);
    const totalPaid = clientReceivablesSummaries.reduce((sum, r) => sum + r.totalPaid, 0);
    const totalOutstanding = clientReceivablesSummaries.reduce((sum, r) => sum + Math.max(0, r.currentBalance), 0);
    const clearedCount = clientReceivablesSummaries.filter(r => r.currentBalance <= 0).length;
    const pendingCount = clientReceivablesSummaries.filter(r => r.currentBalance > 0).length;

    return {
      totalInvoiced,
      totalPaid,
      totalOutstanding,
      clearedCount,
      pendingCount
    };
  }, [clientReceivablesSummaries]);

  // Payables Summary
  const payablesSummary = useMemo(() => {
    const totalInvoiced = payables.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const totalPaid = payables.filter(p => p.status === 'PAID').reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const totalPending = payables.filter(p => p.status !== 'PAID').reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    return {
      totalInvoiced,
      totalPaid,
      totalPending,
      pendingCount: payables.filter(p => p.status !== 'PAID').length
    };
  }, [payables]);

  // Cashbook Summary
  const cashbookSummary = useMemo(() => {
    const totalIncome = financeData
      .filter(f => f.type === 'INCOME')
      .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
    const totalExpense = financeData
      .filter(f => f.type === 'EXPENSE')
      .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
    const netCashBalance = totalIncome - totalExpense;
    return {
      totalIncome,
      totalExpense,
      netCashBalance
    };
  }, [financeData]);

  // Real-time Liquidity & Treasury Breakdown: Drawer Cash + Individual Bank Accounts (HBL, Meezan, etc.)
  const treasuryBreakdown = useMemo(() => {
    // 1. Drawer Cash (Physical Cash in Office Drawer / Counter)
    const drawerEntries = financeData.filter(e => e.paymentMethod !== 'BANK');
    const drawerInflow = drawerEntries.filter(e => e.type === 'INCOME').reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const drawerOutflow = drawerEntries.filter(e => e.type === 'EXPENSE').reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const drawerNet = drawerInflow - drawerOutflow;

    // 2. Bank Accounts Breakdown
    const bankCards = banks.map(bank => {
      const bNameLower = bank.name.trim().toLowerCase();
      const bankEntries = financeData.filter(e => 
        e.paymentMethod === 'BANK' && 
        (
          (e.bankName && e.bankName.trim().toLowerCase() === bNameLower) ||
          (e.bankId && String(e.bankId) === String(bank.id))
        )
      );
      const inflow = bankEntries.filter(e => e.type === 'INCOME').reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const outflow = bankEntries.filter(e => e.type === 'EXPENSE').reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const net = inflow - outflow;
      return {
        id: bank.id,
        name: bank.name,
        inflow,
        outflow,
        net,
        count: bankEntries.length
      };
    });

    const registeredBankNames = new Set(banks.map(b => b.name.trim().toLowerCase()));
    const unassignedBankEntries = financeData.filter(e => 
      e.paymentMethod === 'BANK' && 
      (!e.bankName || !registeredBankNames.has(e.bankName.trim().toLowerCase()))
    );

    if (unassignedBankEntries.length > 0) {
      const uInflow = unassignedBankEntries.filter(e => e.type === 'INCOME').reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const uOutflow = unassignedBankEntries.filter(e => e.type === 'EXPENSE').reduce((s, e) => s + (Number(e.amount) || 0), 0);
      bankCards.push({
        id: 'other_bank',
        name: 'Other Bank Vouchers',
        inflow: uInflow,
        outflow: uOutflow,
        net: uInflow - uOutflow,
        count: unassignedBankEntries.length
      });
    }

    const totalBanksNet = bankCards.reduce((s, b) => s + b.net, 0);
    const totalBanksInflow = bankCards.reduce((s, b) => s + b.inflow, 0);
    const totalBanksOutflow = bankCards.reduce((s, b) => s + b.outflow, 0);
    const totalRemainingAmount = drawerNet + totalBanksNet;

    return {
      drawer: {
        inflow: drawerInflow,
        outflow: drawerOutflow,
        net: drawerNet,
        count: drawerEntries.length
      },
      banks: bankCards,
      totalBanksNet,
      totalBanksInflow,
      totalBanksOutflow,
      totalRemainingAmount
    };
  }, [banks, financeData]);

  // Total Received Amount Summary: All payments received from 1st of current month to today
  const currentMonthReceivedSummary = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const startOfMonthStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const todayStr = new Date().toISOString().split('T')[0];
    const monthName = now.toLocaleString('en-US', { month: 'long' });

    // Filter all income payments from the 1st of this month to today
    const receivedEntries = financeData.filter(f => {
      if (f.type !== 'INCOME') return false;
      const fDate = (f.date || '').slice(0, 10);
      return fDate >= startOfMonthStr;
    });

    // Also include any settled receivables payments from this month if not already in financeData
    calculatedReceivables.forEach(r => {
      if ((r.paidAmount || 0) > 0) {
        const rDate = (r.date || '').slice(0, 10);
        if (rDate >= startOfMonthStr) {
          const alreadyTracked = receivedEntries.some(e => 
            (e.reference && r.reference && e.reference === r.reference) ||
            (e.id === r.id)
          );
          if (!alreadyTracked && !r.isCaseInvoice) {
            receivedEntries.push({
              id: typeof r.id === 'number' ? r.id : 88000,
              date: r.date,
              description: `Payment Received: ${r.description}`,
              party: r.party,
              amount: r.paidAmount || r.amount,
              type: 'INCOME',
              status: 'PAID',
              category: 'Client Payment',
              reference: r.reference || `REC-${r.id}`,
              caseNo: r.caseNo,
              containerNumber: r.containerNumber,
              paymentMethod: r.paymentMethod || 'BANK'
            });
          }
        }
      }
    });

    receivedEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalAmount = receivedEntries.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
    const cashTotal = receivedEntries
      .filter(f => (f.paymentMethod || 'CASH') === 'CASH')
      .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
    const bankTotal = receivedEntries
      .filter(f => f.paymentMethod === 'BANK')
      .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);

    return {
      monthName,
      startOfMonthStr,
      todayStr,
      totalAmount,
      cashTotal,
      bankTotal,
      count: receivedEntries.length,
      entries: receivedEntries
    };
  }, [financeData, calculatedReceivables]);

  // Master General Ledger Entries (All Parties & Accounts)
  const generalLedgerEntries = useMemo(() => {
    const glEntries: (LedgerEntry & { party: string; category: string })[] = [];

    // All Client Case charges (Debits)
    cases.forEach((c) => {
      if (c.status === 'CANCELLED') return;

      const { total, breakdown } = getCaseTotalCharges(c);
      if (total > 0) {
        const cntrNumbers = (c.containers || []).map(cntr => cntr.number).filter(Boolean).join(', ');
        const invNo = c.invoiceNo || c.caseNo || (c.extractedData && c.extractedData.blNumber ? `INV-${c.extractedData.blNumber}` : `INV-${c.id}`);
        const refParts = [invNo, `Case: ${c.caseNo}`, cntrNumbers ? `Cntr: ${cntrNumbers}` : ''].filter(Boolean);

        glEntries.push({
          id: `gl_case_${c.id}`,
          date: c.createdAt || c.registrationDate || new Date().toISOString().split('T')[0],
          reference: refParts.join(' | '),
          description: `Case Billing: ${c.category} [${(c.containers || []).length || 1} Cntr] - ${breakdown}`,
          debit: total,
          credit: 0,
          balance: 0,
          type: 'DEBIT',
          party: c.clientName || c.client || 'General Client',
          category: 'Freight & Clearance'
        });
      }
    });

    // All Cashbook Entries
    financeData.forEach((f) => {
      if (f.type === 'INCOME') {
        const refParts = [
          f.reference || `REC-${f.id}`,
          f.caseNo ? `Case: ${f.caseNo}` : '',
          f.containerNumber ? `Cntr: ${f.containerNumber}` : ''
        ].filter(Boolean);

        glEntries.push({
          id: `gl_inc_${f.id}`,
          date: f.date,
          reference: refParts.join(' | '),
          description: `Income: ${f.description}`,
          debit: 0,
          credit: f.amount,
          balance: 0,
          type: 'CREDIT',
          party: f.party,
          category: f.category
        });
      } else if (f.type === 'EXPENSE') {
        glEntries.push({
          id: `gl_exp_${f.id}`,
          date: f.date,
          reference: f.reference || `EXP-${f.id}`,
          description: `Expense: ${f.description}`,
          debit: f.amount,
          credit: 0,
          balance: 0,
          type: 'DEBIT',
          party: f.party,
          category: f.category
        });
      }
    });

    // All Receivables (Debits)
    receivables.forEach((r) => {
      const refParts = [
        r.reference || `INV-${r.id}`,
        r.caseNo ? `Case: ${r.caseNo}` : '',
        r.containerNumber ? `Cntr: ${r.containerNumber}` : ''
      ].filter(Boolean);

      glEntries.push({
        id: `gl_recv_${r.id}`,
        date: r.date,
        reference: refParts.join(' | '),
        description: `Receivable Invoiced: ${r.description}`,
        debit: r.amount,
        credit: 0,
        balance: 0,
        type: 'DEBIT',
        party: r.party,
        category: r.category
      });
    });

    // All Payables (Credits / Commitments)
    payables.forEach((p) => {
      glEntries.push({
        id: `gl_pay_${p.id}`,
        date: p.date,
        reference: p.reference || `PAY-${p.id}`,
        description: `Payable Outflow: ${p.description}`,
        debit: p.amount,
        credit: 0,
        balance: 0,
        type: 'DEBIT',
        party: p.party,
        category: p.category
      });
    });

    // Filter by Account if selected
    let filtered = glEntries;
    if (glAccountFilter !== 'ALL') {
      filtered = filtered.filter(e => e.party?.trim().toLowerCase() === glAccountFilter.trim().toLowerCase());
    }

    // Sort chronologically
    filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate running balance
    let currentGlBalance = 0;
    filtered.forEach((entry) => {
      currentGlBalance = currentGlBalance + entry.debit - entry.credit;
      entry.balance = currentGlBalance;
    });

    return filtered;
  }, [cases, financeData, receivables, payables, glAccountFilter]);

  // Master GL Summary
  const glSummary = useMemo(() => {
    const totalDebits = generalLedgerEntries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredits = generalLedgerEntries.reduce((sum, e) => sum + e.credit, 0);
    const netBalance = totalDebits - totalCredits;
    return {
      totalDebits,
      totalCredits,
      netBalance,
      totalEntries: generalLedgerEntries.length
    };
  }, [generalLedgerEntries]);

  // Handle File upload for receipt/slip (scans image to PDF if from camera)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        if (!isPdf) {
          const converted = await convertImageToPdf(file, file.name || `Receipt_${Date.now()}.pdf`, true);
          setNewTransaction(prev => ({ ...prev, slipUrl: converted.pdfDataUrl }));
        } else {
          const processed = await compressAndPrepareFile(file);
          if (processed.dataUrl || processed.base64) {
            setNewTransaction(prev => ({ ...prev, slipUrl: processed.dataUrl || `data:application/pdf;base64,${processed.base64}` }));
          }
        }
      } catch (err) {
        console.warn("Slip processing notice:", err);
      } finally {
        try {
          e.target.value = '';
        } catch (_) {}
      }
    }
  };

  // Handle Document upload for Payable / Receivable (scans image to PDF if image)
  const handleDocumentChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        if (!isPdf) {
          const converted = await convertImageToPdf(file, file.name || `Document_${Date.now()}.pdf`, true);
          setNewTransaction(prev => ({ 
            ...prev, 
            documentUrl: converted.pdfDataUrl,
            documentName: converted.name
          }));
        } else {
          const processed = await compressAndPrepareFile(file);
          if (processed.dataUrl || processed.base64) {
            setNewTransaction(prev => ({ 
              ...prev, 
              documentUrl: processed.dataUrl || `data:application/pdf;base64,${processed.base64}`,
              documentName: file.name
            }));
          }
        }
      } catch (err) {
        console.warn("Document processing notice:", err);
      } finally {
        try {
          e.target.value = '';
        } catch (_) {}
      }
    }
  };

  const handleStatusChange = (id: number, list: FinanceEntry[], setList: React.Dispatch<React.SetStateAction<FinanceEntry[]>>) => {
    setPendingPaymentEntry({ id, list, setList });
    setNewTransaction({ ...newTransaction, paymentMethod: 'CASH', amount: list.find(e => e.id === id)?.amount || 0 });
    setShowConfirmPaidModal(true);
  };

  // CONFIRM PAYMENT: Settles a Payable or Receivable and automatically posts into Cash Book
  const confirmPayment = () => {
    if (!pendingPaymentEntry) return;
    const { id, list, setList } = pendingPaymentEntry;
    const target = list.find(item => item.id === id);
    if (!target) return;

    const paymentMethod = (newTransaction.paymentMethod as any) || 'CASH';
    const bankName = paymentMethod === 'BANK' ? (newTransaction.bankName || 'HBL Corporate') : undefined;
    const transactionId = newTransaction.transactionId || (paymentMethod === 'BANK' ? `TRX-${Date.now().toString().slice(-6)}` : undefined);
    const paidDate = new Date().toISOString().split('T')[0];

    const updatedItem: FinanceEntry = { 
      ...target, 
      status: 'PAID', 
      paidAmount: target.amount,
      remainingAmount: 0,
      paymentMethod,
      bankId: newTransaction.bankId,
      bankName,
      transactionId
    };

    setList(list.map(item => item.id === id ? updatedItem : item));
    updateFinanceInFirestore(updatedItem).catch(() => {});

    // If it's a PAYABLE being paid -> Auto-record an EXPENSE in Cash Book
    if (target.type === 'PAYABLE') {
      const expenseEntry: FinanceEntry = {
        id: Date.now(),
        date: paidDate,
        description: `Payment Paid: ${target.description}`,
        party: target.party,
        amount: target.amount,
        type: 'EXPENSE',
        status: 'PAID',
        category: target.category || 'Operational Expense',
        reference: target.reference || `PAY-OUT-${target.id}`,
        paymentMethod,
        bankName,
        transactionId
      };
      setFinanceData(prev => [expenseEntry, ...prev]);
      saveFinanceToFirestore(expenseEntry).catch(() => {});
    }

    // If it's a RECEIVABLE being received -> Auto-record an INCOME in Cash Book
    if (target.type === 'RECEIVABLE') {
      const incomeEntry: FinanceEntry = {
        id: Date.now(),
        date: paidDate,
        description: `Payment Received: ${target.description}`,
        party: target.party,
        amount: target.amount,
        type: 'INCOME',
        status: 'PAID',
        category: 'Client Payment',
        reference: target.reference || `REC-IN-${target.id}`,
        caseNo: target.caseNo,
        containerNumber: target.containerNumber,
        paymentMethod,
        bankName,
        transactionId
      };
      setFinanceData(prev => [incomeEntry, ...prev]);
      saveFinanceToFirestore(incomeEntry).catch(() => {});
    }

    if (activeNotificationId && onActionComplete) {
      onActionComplete(activeNotificationId);
      setActiveNotificationId(null);
    }
    setShowConfirmPaidModal(false);
    setPendingPaymentEntry(null);
    setNewTransaction({ description: '', amount: 0, party: '', paymentMethod: 'CASH', bankId: '', transactionId: '' });

    // Open receipt view/download modal immediately
    handleOpenReceipt(updatedItem);
  };

  // QUICK RECEIVE PAYMENT MODAL TRIGGER FROM RECEIVABLES TABLE
  const handleOpenQuickReceiveModal = (invoice: any) => {
    setInvoiceForReceive(invoice);
    const balance = invoice.currentBalance !== undefined 
      ? invoice.currentBalance 
      : (invoice.remainingAmount !== undefined ? invoice.remainingAmount : invoice.amount);
    setReceivePaymentAmount(String(Math.max(0, balance || 0)));
    setReceivePaymentMethod('BANK');
    setReceivePaymentBank('HBL Corporate');
    setReceivePaymentTrx(`TRX-${Date.now().toString().slice(-6)}`);
    setShowReceivePaymentModal(true);
  };

  // SUBMIT QUICK RECEIVE PAYMENT
  const handleConfirmQuickReceive = async () => {
    if (!invoiceForReceive) return;
    const amt = parseFloat(receivePaymentAmount);
    if (!amt || amt <= 0) {
      alert("Please enter a valid received amount.");
      return;
    }

    const paidDate = new Date().toISOString().split('T')[0];
    const isSummary = Boolean(invoiceForReceive.isClientSummary);
    const incomeEntry: FinanceEntry = {
      id: Date.now(),
      date: paidDate,
      description: isSummary
        ? `Ledger Settlement Received from ${invoiceForReceive.party}`
        : `Payment Received against ${invoiceForReceive.reference || 'Invoice'} (${invoiceForReceive.party})`,
      party: invoiceForReceive.party,
      amount: amt,
      type: 'INCOME',
      status: 'PAID',
      category: 'Client Payment',
      reference: invoiceForReceive.reference || `REC-${Date.now()}`,
      caseNo: invoiceForReceive.caseNo,
      containerNumber: invoiceForReceive.containerNumber,
      paymentMethod: receivePaymentMethod,
      bankName: receivePaymentMethod === 'BANK' ? receivePaymentBank : undefined,
      transactionId: receivePaymentTrx || undefined
    };

    setFinanceData(prev => [incomeEntry, ...prev]);
    await saveFinanceToFirestore(incomeEntry);

    // If it's a direct receivable entry in Firestore, update it
    if (!invoiceForReceive.isCaseInvoice && !isSummary && invoiceForReceive.id) {
      const updatedRecv: FinanceEntry = {
        ...invoiceForReceive,
        status: amt >= invoiceForReceive.amount ? 'PAID' : 'PARTIAL',
        paidAmount: (invoiceForReceive.paidAmount || 0) + amt,
        remainingAmount: Math.max(0, (invoiceForReceive.remainingAmount || invoiceForReceive.amount) - amt)
      };
      setReceivables(prev => prev.map(r => r.id === updatedRecv.id ? updatedRecv : r));
      updateFinanceInFirestore(updatedRecv).catch(() => {});
    }

    setShowReceivePaymentModal(false);
    setInvoiceForReceive(null);
    handleOpenReceipt(incomeEntry);
  };

  // ADD TRANSACTION HANDLER (Payment Received, Payment Paid, Receivable, Payable)
  const handleAddTransaction = () => {
    const finalParty = isOtherClient ? otherClientName.trim() : (newTransaction.party || '').trim();
    if (!newTransaction.amount || !finalParty) {
      alert("Please provide both Party Name and Amount.");
      return;
    }

    // Persist new client if entered via "Others"
    if (isOtherClient && finalParty) {
      saveClientToFirestore({ name: finalParty }).catch(() => {});
      if (!clientList.includes(finalParty)) {
        setClientList(prev => [...prev, finalParty]);
      }
    }

    const isDirectPayment = transactionType === 'INCOME' || transactionType === 'EXPENSE';

    const isStaff = users.some(u => u.name && u.name.trim().toLowerCase() === finalParty.toLowerCase() && u.role !== UserRole.CLIENT);
    const isVendor = vendors.some(v => v.name && v.name.trim().toLowerCase() === finalParty.toLowerCase());
    const isClient = clientList.some(c => c && c.trim().toLowerCase() === finalParty.toLowerCase());

    const matchedVendor = vendors.find(v => v.name && v.name.trim().toLowerCase() === finalParty.toLowerCase());

    const entry: FinanceEntry = {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      description: newTransaction.description?.trim() || (transactionType === 'INCOME' ? 'Payment Received' : transactionType === 'PAYABLE' ? 'Payable Bill' : transactionType === 'RECEIVABLE' ? 'Receivable Bill' : 'Transaction Entry'),
      amount: Number(newTransaction.amount),
      type: transactionType,
      status: isDirectPayment ? 'PAID' : 'PENDING',
      party: finalParty,
      category: matchedVendor ? matchedVendor.category : (transactionType === 'INCOME' ? 'Client Payment' : transactionType === 'EXPENSE' ? 'Operational Expense' : transactionType === 'PAYABLE' ? 'Payable Bill' : 'Receivable Bill'),
      reference: newTransaction.transactionId || generateFinanceReference(),
      paymentMethod: isDirectPayment ? (newTransaction.paymentMethod as any || 'CASH') : undefined,
      bankId: isDirectPayment ? newTransaction.bankId : undefined,
      bankName: isDirectPayment ? newTransaction.bankName : undefined,
      transactionId: isDirectPayment ? newTransaction.transactionId : undefined,
      slipUrl: isDirectPayment ? newTransaction.slipUrl : undefined,
      documentUrl: newTransaction.documentUrl,
      documentName: newTransaction.documentName
    };

    // Auto-Vendor detection prompt when non-staff payee is entered in cashbook/payables
    if ((transactionType === 'EXPENSE' || transactionType === 'PAYABLE') && !isStaff && !isVendor && !isClient) {
      setAutoVendorPrompt({
        isOpen: true,
        name: finalParty,
        category: 'Drinking Water Charges',
        companyTitle: finalParty,
        contactNumber: '',
        address: '',
        pendingEntry: entry
      });
      setShowAddModal(false);
      return;
    }

    if (transactionType === 'PAYABLE') setPayables([entry, ...payables]);
    else if (transactionType === 'RECEIVABLE') setReceivables([entry, ...receivables]);
    else setFinanceData([entry, ...financeData]);

    saveFinanceToFirestore(entry).catch((e) => console.warn("Firestore saveFinance error:", e));

    setShowAddModal(false);
    setIsOtherClient(false);
    setOtherClientName('');
    setNewTransaction({ description: '', amount: 0, party: '', paymentMethod: 'CASH', bankId: '', transactionId: '', slipUrl: '', documentUrl: '', documentName: '' });

    // If we're on client ledger, switch selected client to this party
    if (activeTab === 'client_ledger') {
      setSelectedLedgerClient(finalParty);
    }

    // Immediately prompt receipt or invoice generation
    if (transactionType === 'RECEIVABLE') {
      handleOpenInvoice(entry);
    } else if (transactionType === 'INCOME' || transactionType === 'EXPENSE') {
      handleDirectDownloadReceipt(entry);
    }
  };

  // Confirm Auto Vendor Registration and finalize transaction
  const handleConfirmAutoVendor = async () => {
    if (!autoVendorPrompt) return;
    const { name, category, companyTitle, contactNumber, address, pendingEntry } = autoVendorPrompt;
    
    const newVendor: Vendor = {
      id: Date.now().toString(),
      name: name.trim(),
      category: category as any,
      companyTitle: companyTitle?.trim() || name.trim(),
      contactNumber: contactNumber?.trim() || '',
      address: address?.trim() || '',
      isRecurring: false,
      createdAt: new Date().toISOString()
    };
    await saveVendor(newVendor);
    setVendors(prev => [...prev.filter(v => v.id !== newVendor.id), newVendor]);

    if (pendingEntry) {
      const updatedEntry: FinanceEntry = {
        ...pendingEntry,
        category: category as any
      };
      if (updatedEntry.type === 'PAYABLE') {
        setPayables(prev => [updatedEntry, ...prev]);
      } else {
        setFinanceData(prev => [updatedEntry, ...prev]);
      }
      await saveFinanceToFirestore(updatedEntry).catch(() => {});
      logActivity(`New Vendor registered and payment recorded for ${newVendor.name} under ${newVendor.category}`, 'FINANCE');

      if (updatedEntry.type === 'EXPENSE') {
        handleDirectDownloadReceipt(updatedEntry);
      }
    }

    setAutoVendorPrompt(null);
    setIsOtherClient(false);
    setOtherClientName('');
    setNewTransaction({ description: '', amount: 0, party: '', paymentMethod: 'CASH', bankId: '', transactionId: '', slipUrl: '', documentUrl: '', documentName: '' });
  };

  // Save new vendor manually from UI
  const handleSaveNewVendor = async () => {
    if (!newVendorForm.name?.trim()) {
      alert('Vendor Name is required.');
      return;
    }
    const vendor: Vendor = {
      id: Date.now().toString(),
      name: newVendorForm.name.trim(),
      category: (newVendorForm.category as any) || 'Miscellaneous Payments',
      companyTitle: newVendorForm.companyTitle?.trim() || newVendorForm.name.trim(),
      contactNumber: newVendorForm.contactNumber?.trim() || '',
      address: newVendorForm.address?.trim() || '',
      isRecurring: !!newVendorForm.isRecurring,
      createdAt: new Date().toISOString()
    };
    await saveVendor(vendor);
    setVendors(prev => [...prev.filter(v => v.id !== vendor.id), vendor]);
    logActivity(`Vendor registered: ${vendor.name} (${vendor.category})`, 'FINANCE');
    setShowAddVendorModal(false);
    setNewVendorForm({
      name: '',
      category: 'Drinking Water Charges',
      companyTitle: '',
      contactNumber: '',
      address: '',
      isRecurring: false
    });
  };

  // Open Receipt Modal
  const handleOpenReceipt = (entry: FinanceEntry) => {
    setSelectedInvoiceData(null);
    setPdfSuccessMessage(null);
    setPdfErrorMessage(null);
    setDirectDownloadUrl(null);

    const receipt: PaymentReceiptData = {
      receiptNo: entry.reference || `REC-2026-${entry.id}`,
      date: entry.date,
      party: entry.party,
      type: entry.type,
      amount: entry.amount,
      paymentMethod: entry.paymentMethod || 'Cash',
      bankName: entry.bankName,
      transactionId: entry.transactionId,
      description: entry.description,
      reference: entry.reference,
      category: entry.category,
      companyName,
      customLogo: activeLogo,
      branding
    };
    setSelectedReceiptData(receipt);
  };

  // Direct Download Receipt PDF
  const handleDirectDownloadReceipt = async (entry: FinanceEntry) => {
    setIsExportingPdf(true);
    setPdfSuccessMessage(null);
    setPdfErrorMessage(null);
    try {
      const receipt: PaymentReceiptData = {
        receiptNo: entry.reference || `REC-2026-${entry.id}`,
        date: entry.date,
        party: entry.party,
        type: entry.type,
        amount: entry.amount,
        paymentMethod: entry.paymentMethod || 'Cash',
        bankName: entry.bankName,
        transactionId: entry.transactionId,
        description: entry.description,
        reference: entry.reference,
        category: entry.category,
        companyName,
        customLogo: activeLogo,
        branding
      };
      const res = await downloadPaymentReceiptPdf(receipt);
      setPdfSuccessMessage(`Receipt downloaded: ${res.filename}`);
      setDirectDownloadFilename(res.filename);
      setDirectDownloadUrl(res.blobUrl);
    } catch (err) {
      console.error(err);
      setPdfErrorMessage('Failed to generate receipt PDF.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Open Invoice Modal
  const handleOpenInvoice = (entry: FinanceEntry) => {
    setSelectedReceiptData(null);
    setPdfSuccessMessage(null);
    setPdfErrorMessage(null);
    setDirectDownloadUrl(null);

    const invoice: ReceivableInvoiceData = {
      invoiceNo: entry.reference || `INV-2026-${entry.id}`,
      date: entry.date,
      dueDate: entry.date,
      clientName: entry.party,
      description: entry.description,
      amount: entry.amount,
      reference: entry.reference,
      category: entry.category,
      status: entry.status,
      companyName,
      customLogo: activeLogo,
      branding
    };
    setSelectedInvoiceData(invoice);
  };

  // Direct Download Invoice PDF
  const handleDirectDownloadInvoice = async (entry: FinanceEntry) => {
    setIsExportingPdf(true);
    setPdfSuccessMessage(null);
    setPdfErrorMessage(null);
    try {
      const invoice: ReceivableInvoiceData = {
        invoiceNo: entry.reference || `INV-2026-${entry.id}`,
        date: entry.date,
        dueDate: entry.date,
        clientName: entry.party,
        description: entry.description,
        amount: entry.amount,
        reference: entry.reference,
        category: entry.category,
        status: entry.status,
        companyName,
        customLogo: activeLogo,
        branding
      };
      const res = await downloadReceivableInvoicePdf(invoice);
      setPdfSuccessMessage(`Invoice downloaded: ${res.filename}`);
      setDirectDownloadFilename(res.filename);
      setDirectDownloadUrl(res.blobUrl);
    } catch (err) {
      console.error(err);
      setPdfErrorMessage('Failed to generate invoice PDF.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Download Client Ledger PDF
  const handleDownloadClientLedger = async () => {
    const entriesToExport = filteredClientLedgerEntries;
    if (!selectedLedgerClient || entriesToExport.length === 0) {
      alert('No transactions to export for this client in the selected date range.');
      return;
    }
    setIsExportingPdf(true);
    setPdfSuccessMessage(null);
    setPdfErrorMessage(null);
    try {
      const dateRangeStr = (ledgerStartDate || ledgerEndDate)
        ? `${ledgerStartDate || 'Start'} to ${ledgerEndDate || 'Today'}`
        : 'Full History to Date';
      const res = await downloadClientLedgerPdf({
        clientName: selectedLedgerClient,
        statementDate: `${new Date().toLocaleDateString()} (Period: ${dateRangeStr})`,
        summary: clientSummary,
        entries: entriesToExport.map(e => ({
          date: e.date,
          reference: e.reference || '',
          description: e.description,
          debit: e.debit,
          credit: e.credit,
          balance: e.balance
        })),
        companyName,
        customLogo: activeLogo,
        branding
      });
      setPdfSuccessMessage(`Client Ledger downloaded: ${res.filename}`);
      setDirectDownloadFilename(res.filename);
      setDirectDownloadUrl(res.blobUrl);
    } catch (err) {
      console.error(err);
      setPdfErrorMessage('Failed to generate client ledger PDF.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Download Vendor Ledger PDF
  const handleDownloadVendorLedger = async () => {
    if (!selectedVendorForLedger || filteredVendorLedgerEntries.length === 0) {
      alert('No transactions to export for this vendor.');
      return;
    }
    setIsExportingPdf(true);
    setPdfSuccessMessage(null);
    setPdfErrorMessage(null);
    try {
      const dateRangeStr = (ledgerStartDate || ledgerEndDate)
        ? `${ledgerStartDate || 'Start'} to ${ledgerEndDate || 'Today'}`
        : 'Full History to Date';
      const res = await downloadClientLedgerPdf({
        clientName: `${selectedVendorForLedger.name} [${selectedVendorForLedger.category}]`,
        statementDate: `${new Date().toLocaleDateString()} (Period: ${dateRangeStr})`,
        summary: {
          totalDebits: filteredVendorLedgerEntries.reduce((s, e) => s + e.debit, 0),
          totalCredits: filteredVendorLedgerEntries.reduce((s, e) => s + e.credit, 0),
          netBalance: filteredVendorLedgerEntries.length > 0 ? filteredVendorLedgerEntries[filteredVendorLedgerEntries.length - 1].balance : 0,
          totalContainers: 0
        },
        entries: filteredVendorLedgerEntries.map(e => ({
          date: e.date,
          reference: e.reference || '',
          description: e.description,
          debit: e.debit,
          credit: e.credit,
          balance: e.balance
        })),
        companyName,
        customLogo: activeLogo,
        branding
      });
      setPdfSuccessMessage(`Vendor Ledger downloaded: ${res.filename}`);
      setDirectDownloadFilename(res.filename);
      setDirectDownloadUrl(res.blobUrl);
    } catch (err) {
      console.error(err);
      setPdfErrorMessage('Failed to generate vendor ledger PDF.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Download General Ledger PDF
  const handleDownloadGeneralLedger = async () => {
    if (generalLedgerEntries.length === 0) {
      alert('No general ledger records found to export.');
      return;
    }
    setIsExportingPdf(true);
    setPdfSuccessMessage(null);
    setPdfErrorMessage(null);
    try {
      const res = await downloadGeneralLedgerPdf({
        accountFilter: glAccountFilter === 'ALL' ? 'All Ledger Accounts' : glAccountFilter,
        generatedDate: new Date().toLocaleDateString(),
        totalDebits: glSummary.totalDebits,
        totalCredits: glSummary.totalCredits,
        closingBalance: glSummary.netBalance,
        entries: generalLedgerEntries.map(e => ({
          date: e.date,
          party: e.party,
          category: e.category,
          reference: e.reference,
          description: e.description,
          debit: e.debit,
          credit: e.credit,
          balance: e.balance
        })),
        companyName,
        customLogo: activeLogo,
        branding
      });
      setPdfSuccessMessage(`General Ledger downloaded: ${res.filename}`);
      setDirectDownloadFilename(res.filename);
      setDirectDownloadUrl(res.blobUrl);
    } catch (err) {
      console.error(err);
      setPdfErrorMessage('Failed to generate General Ledger PDF.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Export Client Ledger to Excel (.xlsx)
  const handleExportClientLedgerExcel = () => {
    if (!selectedLedgerClient || filteredClientLedgerEntries.length === 0) return;
    exportClientLedgerToExcel(selectedLedgerClient, filteredClientLedgerEntries, clientSummary);
  };

  // Export Client Ledger to CSV
  const handleExportClientLedgerCSV = () => {
    if (!selectedLedgerClient || clientLedgerEntries.length === 0) return;
    const headers = ['Date', 'Reference / Case No', 'Party', 'Description', 'Debit (PKR)', 'Credit (PKR)', 'Running Balance (PKR)'];
    const rows = clientLedgerEntries.map(e => [
      e.date,
      e.reference || '',
      e.party,
      e.description,
      e.debit > 0 ? e.debit : 0,
      e.credit > 0 ? e.credit : 0,
      e.balance
    ]);
    const filename = `Client_Ledger_${selectedLedgerClient.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}`;
    exportCSVFile(filename, headers, rows);
  };

  // Export General Ledger to native Excel (.xlsx)
  const handleExportGeneralLedgerExcel = () => {
    if (generalLedgerEntries.length === 0) return;
    exportGeneralLedgerToExcel(generalLedgerEntries, glSummary, glAccountFilter);
  };

  // Export General Ledger to CSV
  const handleExportGeneralLedgerCSV = () => {
    if (generalLedgerEntries.length === 0) return;
    const headers = ['Date', 'Account / Party', 'Category', 'Reference', 'Description', 'Debit (PKR)', 'Credit (PKR)', 'Running Balance (PKR)'];
    const rows = generalLedgerEntries.map(e => [
      e.date,
      e.party,
      e.category || '',
      e.reference || '',
      e.description,
      e.debit > 0 ? e.debit : 0,
      e.credit > 0 ? e.credit : 0,
      e.balance
    ]);
    const filename = `General_Ledger_DPL_${glAccountFilter.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}`;
    exportCSVFile(filename, headers, rows);
  };

  // Clear all General Ledger vouchers
  const handleClearGeneralLedger = async () => {
    if (!window.confirm("Are you sure you want to clear all General Ledger vouchers? This will delete all pending/posted finance entries and reset the ledger balance to PKR 0.")) {
      return;
    }
    try {
      const allEntries = [...financeData, ...receivables, ...payables];
      for (const entry of allEntries) {
        if (entry.id) {
          await deleteFinanceFromFirestore(entry.id).catch(() => {});
        }
      }
      setFinanceData([]);
      setReceivables([]);
      setPayables([]);
      safeAppStorage.setJSON('dpl_live_finance', []);
      safeAppStorage.setJSON('dpl_live_receivables', []);
      safeAppStorage.setJSON('dpl_live_payables', []);
      window.dispatchEvent(new Event('dpl_finance_updated'));
      alert("General Ledger cleared successfully. Balance is now PKR 0.");
    } catch (err: any) {
      alert("Error clearing General Ledger: " + (err.message || String(err)));
    }
  };

  const StatCard = ({ title, amount, type, icon: Icon, subtitle, badge, onClick }: any) => (
    <div 
      onClick={onClick}
      className={`glass-card p-5 rounded-2xl flex items-center justify-between hover:bg-white/10 active:scale-[0.99] transition-all cursor-pointer no-print group border ${
        type === 'pos' 
          ? 'hover:border-emerald-500/40 border-white/5' 
          : type === 'neg' 
          ? 'hover:border-red-500/40 border-white/5' 
          : 'hover:border-purple-500/40 border-white/5'
      }`}
      title="Click to view full breakdown list and details"
    >
      <div className="min-w-0 flex-1 pr-2">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-gray-400 text-xs uppercase font-semibold tracking-wider truncate">{title}</p>
          {badge && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-purple-300 border border-white/10 font-bold uppercase tracking-wider">
              {badge}
            </span>
          )}
        </div>
        <h4 className={`text-2xl font-bold font-mono drop-shadow-sm truncate ${type === 'pos' ? 'text-green-400' : type === 'neg' ? 'text-red-400' : 'text-white'}`}>
          PKR {(Number(amount) || 0).toLocaleString()}
        </h4>
        <div className="flex items-center justify-between gap-2 mt-1">
          {subtitle && <p className="text-[11px] text-gray-400 truncate">{subtitle}</p>}
          <span className="text-[10px] text-purple-400 font-semibold group-hover:underline flex items-center gap-0.5 shrink-0">
            View list →
          </span>
        </div>
      </div>
      <div className={`p-3 rounded-xl backdrop-blur-md shadow-lg shrink-0 transition-transform group-hover:scale-110 ${
        type === 'pos' ? 'bg-green-500/10 text-green-400 shadow-green-500/10' : 
        type === 'neg' ? 'bg-red-500/10 text-red-400 shadow-red-500/10' : 
        'bg-white/5 text-gray-300 shadow-white/5'
      }`}>
        <Icon size={24} />
      </div>
    </div>
  );

  // Render Interactive Breakdown Modal for the 4 Counters
  const renderStatBreakdownModal = () => {
    if (!statBreakdownModal) return null;

    let modalTitle = '';
    let modalSubtitle = '';
    let modalBadge = '';
    let totalCount = 0;
    let totalDisplayedAmount = 0;

    let content: React.ReactNode = null;

    if (statBreakdownModal === 'cash_in_hand') {
      modalTitle = 'Cash in Hand & Treasury Status';
      modalSubtitle = 'Real-time status of Total Remaining Balance: Cash in Drawer & Individual Bank Balances';
      modalBadge = 'Live Treasury';

      const filtered = financeData.filter(entry => {
        if (statFilterSubtab === 'INCOME' && entry.type !== 'INCOME') return false;
        if (statFilterSubtab === 'EXPENSE' && entry.type !== 'EXPENSE') return false;
        if (statFilterSubtab === 'CASH' && entry.paymentMethod === 'BANK') return false;
        if (statFilterSubtab === 'BANK' && entry.paymentMethod !== 'BANK') return false;
        if (statFilterSubtab.startsWith('BANK_')) {
          const targetBank = statFilterSubtab.replace('BANK_', '').toLowerCase();
          if (entry.paymentMethod !== 'BANK') return false;
          if (!entry.bankName || entry.bankName.trim().toLowerCase() !== targetBank) return false;
        }
        if (statSearchQuery) {
          const q = statSearchQuery.toLowerCase();
          return (
            entry.party?.toLowerCase().includes(q) ||
            entry.description?.toLowerCase().includes(q) ||
            entry.reference?.toLowerCase().includes(q) ||
            entry.category?.toLowerCase().includes(q) ||
            entry.bankName?.toLowerCase().includes(q) ||
            entry.transactionId?.toLowerCase().includes(q)
          );
        }
        return true;
      });

      totalCount = filtered.length;
      totalDisplayedAmount = filtered.reduce((acc, curr) => {
        return curr.type === 'INCOME' ? acc + (Number(curr.amount) || 0) : acc - (Number(curr.amount) || 0);
      }, 0);

      const totalPositivePool = Math.max(0, treasuryBreakdown.drawer.net) + treasuryBreakdown.banks.reduce((s, b) => s + Math.max(0, b.net), 0);
      const drawerPercent = totalPositivePool > 0 ? Math.round((Math.max(0, treasuryBreakdown.drawer.net) / totalPositivePool) * 100) : 0;
      const banksPercent = 100 - drawerPercent;

      content = (
        <div className="space-y-5">
          {/* 1. Master Status Banner: Total Net Available Balance */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950/40 border border-emerald-500/30 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-wrap items-start justify-between gap-4 relative z-10">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                    MASTER TREASURY STATUS &bull; OVERVIEW
                  </span>
                  {treasuryBreakdown.totalRemainingAmount >= 0 ? (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-300 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Sufficient Liquidity Available
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-red-300 bg-red-500/15 px-2.5 py-0.5 rounded-full border border-red-500/30">
                      <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                      Deficit Warning / Liquidity Alert
                    </span>
                  )}
                </div>
                <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
                  Total Net Treasury Balance Available
                </h2>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white drop-shadow">
                    PKR {treasuryBreakdown.totalRemainingAmount.toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-400 font-medium">Net Liquid Capital</span>
                </div>
              </div>

              {/* Quick Actions: Internal Transfer & Add Bank */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    setShowInternalTransferModal(!showInternalTransferModal);
                    setShowAddBankModal(false);
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 flex items-center gap-1.5 transition-all shadow-sm"
                  title="Transfer cash between Drawer and Bank accounts"
                >
                  <ArrowLeftRight size={14} />
                  <span>Internal Transfer (Drawer ⇄ Bank)</span>
                </button>
                <button
                  onClick={() => {
                    setShowAddBankModal(!showAddBankModal);
                    setShowInternalTransferModal(false);
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 flex items-center gap-1.5 transition-all"
                  title="Add a new bank account"
                >
                  <Plus size={14} />
                  <span>+ Add Bank</span>
                </button>
              </div>
            </div>

            {/* Split Metrics Summary Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-4 border-t border-white/10 relative z-10">
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wider">Cash in Drawer</span>
                <span className="text-base font-bold font-mono text-amber-300">
                  PKR {treasuryBreakdown.drawer.net.toLocaleString()}
                </span>
                <span className="text-[10px] text-gray-400 block mt-0.5">Physical Counter</span>
              </div>
              <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-blue-400 block tracking-wider">Total in Bank Accounts</span>
                <span className="text-base font-bold font-mono text-blue-300">
                  PKR {treasuryBreakdown.totalBanksNet.toLocaleString()}
                </span>
                <span className="text-[10px] text-gray-400 block mt-0.5">{treasuryBreakdown.banks.length} Bank Accounts</span>
              </div>
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">Total Inflow</span>
                <span className="text-base font-bold font-mono text-emerald-300">
                  + PKR {cashbookSummary.totalIncome.toLocaleString()}
                </span>
                <span className="text-[10px] text-gray-400 block mt-0.5">All Income Vouchers</span>
              </div>
              <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-red-400 block tracking-wider">Total Outflow</span>
                <span className="text-base font-bold font-mono text-red-300">
                  - PKR {cashbookSummary.totalExpense.toLocaleString()}
                </span>
                <span className="text-[10px] text-gray-400 block mt-0.5">All Expense Vouchers</span>
              </div>
            </div>

            {/* Visual Distribution Bar */}
            {totalPositivePool > 0 && (
              <div className="mt-3 relative z-10">
                <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                  <span>Balance Distribution: <strong>Drawer ({drawerPercent}%)</strong></span>
                  <span><strong>Banks ({banksPercent}%)</strong></span>
                </div>
                <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden flex">
                  <div 
                    style={{ width: `${drawerPercent}%` }} 
                    className="bg-amber-400 h-full transition-all duration-300"
                    title={`Cash Drawer: ${drawerPercent}%`}
                  />
                  <div 
                    style={{ width: `${banksPercent}%` }} 
                    className="bg-blue-500 h-full transition-all duration-300"
                    title={`Bank Accounts: ${banksPercent}%`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 2. Interactive Internal Cash Transfer Form (Drawer ⇄ Bank) */}
          {showInternalTransferModal && (
            <div className="p-4 bg-slate-950/90 border border-emerald-500/40 rounded-2xl shadow-xl space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <ArrowLeftRight size={16} className="text-emerald-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Internal Cash Transfer (Drawer & Bank Accounts)
                  </h4>
                </div>
                <button 
                  onClick={() => setShowInternalTransferModal(false)}
                  className="text-gray-400 hover:text-white text-xs"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
                <div>
                  <label className="text-gray-400 block mb-1">Source Account (From)</label>
                  <select
                    value={transferSource}
                    onChange={(e) => setTransferSource(e.target.value)}
                    className="w-full bg-slate-900 border border-white/15 rounded-xl p-2 text-white outline-none focus:border-emerald-500"
                  >
                    <option value="DRAWER">💵 Cash in Drawer (Physical Cash)</option>
                    {banks.map(b => (
                      <option key={`src_${b.id}`} value={b.name}>🏦 {b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-gray-400 block mb-1">Destination Account (To)</label>
                  <select
                    value={transferDestination}
                    onChange={(e) => setTransferDestination(e.target.value)}
                    className="w-full bg-slate-900 border border-white/15 rounded-xl p-2 text-white outline-none focus:border-emerald-500"
                  >
                    <option value="DRAWER">💵 Cash in Drawer (Physical Cash)</option>
                    {banks.map(b => (
                      <option key={`dst_${b.id}`} value={b.name}>🏦 {b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-gray-400 block mb-1">Transfer Amount (PKR)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 50000"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    className="w-full bg-slate-900 border border-white/15 rounded-xl p-2 text-white font-mono outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-gray-400 block mb-1">Description / Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Bank deposit or drawer cash refill"
                    value={transferDescription}
                    onChange={(e) => setTransferDescription(e.target.value)}
                    className="w-full bg-slate-900 border border-white/15 rounded-xl p-2 text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowInternalTransferModal(false)}
                  className="px-3 py-1.5 rounded-xl text-xs bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteInternalTransfer}
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md flex items-center gap-1.5"
                >
                  <CheckCircle2 size={13} />
                  <span>Execute Transfer</span>
                </button>
              </div>
            </div>
          )}

          {/* 3. Inline Add New Bank Form */}
          {showAddBankModal && (
            <div className="p-4 bg-slate-950/90 border border-blue-500/40 rounded-2xl shadow-xl space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <Building size={16} className="text-blue-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Add New Bank Account
                  </h4>
                </div>
                <button 
                  onClick={() => setShowAddBankModal(false)}
                  className="text-gray-400 hover:text-white text-xs"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  placeholder="Enter bank name (e.g. Askari Bank, Allied Bank, Faysal Bank, etc.)"
                  value={newBankNameInput}
                  onChange={(e) => setNewBankNameInput(e.target.value)}
                  className="flex-1 min-w-[240px] bg-slate-900 border border-white/15 rounded-xl p-2 text-xs text-white outline-none focus:border-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddCustomBank(newBankNameInput);
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleAddCustomBank(newBankNameInput)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md flex items-center gap-1"
                >
                  <Plus size={13} />
                  <span>Save Bank</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddBankModal(false)}
                  className="px-3 py-2 rounded-xl text-xs bg-white/5 hover:bg-white/10 text-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* 4. Accounts Breakdown Grid: Drawer + Every Bank (HBL, Meezan, Bank Al Habib, MCB Islamic, etc.) */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span>Accounts Liquidity Breakdown</span>
                  <span className="text-gray-400 normal-case font-normal">(Drawer Cash & Bank Balances)</span>
                </h3>
                <p className="text-[11px] text-gray-400">
                  Click on any card to filter its vouchers directly in the table below.
                </p>
              </div>
              {statFilterSubtab !== 'ALL' && (
                <button
                  onClick={() => setStatFilterSubtab('ALL')}
                  className="text-[11px] text-purple-400 hover:underline flex items-center gap-1"
                >
                  <RefreshCw size={11} /> Reset Filter (Show All)
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Card 1: Cash in Drawer */}
              <div 
                onClick={() => setStatFilterSubtab(statFilterSubtab === 'CASH' ? 'ALL' : 'CASH')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                  statFilterSubtab === 'CASH'
                    ? 'bg-amber-500/20 border-amber-500 ring-2 ring-amber-500/30 shadow-lg'
                    : 'bg-slate-900/90 border-amber-500/30 hover:bg-amber-500/10 hover:border-amber-500/60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/30 group-hover:scale-110 transition-transform">
                      <Wallet size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Cash in Drawer</h4>
                      <span className="text-[10px] text-amber-300/90 font-medium">Physical Cash Reserve</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold uppercase">
                    Physical Cash
                  </span>
                </div>

                <div className="mt-2">
                  <div className="text-[10px] text-gray-400 uppercase font-semibold">Net Available Balance</div>
                  <div className={`text-xl font-bold font-mono ${treasuryBreakdown.drawer.net >= 0 ? 'text-amber-300' : 'text-red-400'}`}>
                    PKR {treasuryBreakdown.drawer.net.toLocaleString()}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-white/10 text-[10px]">
                  <div>
                    <span className="text-gray-400 block">Total Inflow:</span>
                    <span className="text-emerald-400 font-mono font-bold">+PKR {treasuryBreakdown.drawer.inflow.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Total Outflow:</span>
                    <span className="text-red-400 font-mono font-bold">-PKR {treasuryBreakdown.drawer.outflow.toLocaleString()}</span>
                  </div>
                </div>

                <div className="mt-2 text-[10px] text-gray-400 flex items-center justify-between">
                  <span>{treasuryBreakdown.drawer.count} cash vouchers</span>
                  <span className={`font-semibold ${statFilterSubtab === 'CASH' ? 'text-amber-300' : 'text-gray-400 group-hover:text-white'}`}>
                    {statFilterSubtab === 'CASH' ? 'Active Filter ✓' : 'Click to Filter →'}
                  </span>
                </div>
              </div>

              {/* Cards for each Bank: HBL, Meezan, Bank Al Habib, MCB Islamic, etc. */}
              {treasuryBreakdown.banks.map(bank => {
                const isSelected = statFilterSubtab === `BANK_${bank.name}`;
                return (
                  <div
                    key={bank.id}
                    onClick={() => setStatFilterSubtab(isSelected ? 'ALL' : `BANK_${bank.name}`)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                      isSelected
                        ? 'bg-blue-500/20 border-blue-500 ring-2 ring-blue-500/30 shadow-lg'
                        : 'bg-slate-900/90 border-blue-500/25 hover:bg-blue-500/10 hover:border-blue-500/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center border border-blue-500/30 group-hover:scale-110 transition-transform">
                          <Building size={16} />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white truncate max-w-[140px]">{bank.name}</h4>
                          <span className="text-[10px] text-blue-300/90 font-medium">Bank Account</span>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold uppercase">
                        Bank
                      </span>
                    </div>

                    <div className="mt-2">
                      <div className="text-[10px] text-gray-400 uppercase font-semibold">Net Available Balance</div>
                      <div className={`text-xl font-bold font-mono ${bank.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        PKR {bank.net.toLocaleString()}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-white/10 text-[10px]">
                      <div>
                        <span className="text-gray-400 block">Total Deposits:</span>
                        <span className="text-emerald-400 font-mono font-bold">+PKR {bank.inflow.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Total Withdrawals:</span>
                        <span className="text-red-400 font-mono font-bold">-PKR {bank.outflow.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="mt-2 text-[10px] text-gray-400 flex items-center justify-between">
                      <span>{bank.count} transactions</span>
                      <span className={`font-semibold ${isSelected ? 'text-blue-300' : 'text-gray-400 group-hover:text-white'}`}>
                        {isSelected ? 'Active Filter ✓' : 'Click to Filter →'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. Sub-tabs & Search Filter */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'ALL', label: `All Accounts (${financeData.length})` },
                { id: 'CASH', label: `Drawer Cash (${treasuryBreakdown.drawer.count})` },
                ...treasuryBreakdown.banks.map(b => ({
                  id: `BANK_${b.name}`,
                  label: `${b.name} (${b.count})`
                })),
                { id: 'INCOME', label: 'Inflows Only (+)' },
                { id: 'EXPENSE', label: 'Outflows Only (-)' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setStatFilterSubtab(tab.id)}
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
                    statFilterSubtab === tab.id
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-white/5 hover:bg-white/10 text-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search party, voucher, bank, ref..."
                value={statSearchQuery}
                onChange={(e) => setStatSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-black/40 border border-white/10 rounded-lg text-white outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* 6. Vouchers Table */}
          <div className="overflow-x-auto rounded-xl border border-white/10 max-h-[380px] overflow-y-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-slate-900 sticky top-0 uppercase text-[10px] text-gray-400 border-b border-white/10 font-semibold z-10">
                <tr>
                  <th className="p-3">Date / Ref</th>
                  <th className="p-3">Party / Account</th>
                  <th className="p-3">Category & Details</th>
                  <th className="p-3">Account Location</th>
                  <th className="p-3 text-right">Inflow / Outflow</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map(entry => (
                  <tr key={entry.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-3">
                      <span className="font-mono text-white block">{entry.date}</span>
                      <span className="text-[10px] text-gray-400 font-mono">{entry.reference || `REF-${entry.id}`}</span>
                    </td>
                    <td className="p-3 font-medium text-white">{entry.party}</td>
                    <td className="p-3">
                      <span className="text-gray-200 block truncate max-w-[220px]">{entry.description}</span>
                      <span className="text-[10px] text-purple-300">{entry.category || 'General'}</span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                        entry.paymentMethod === 'BANK'
                          ? 'bg-blue-500/15 border-blue-500/30 text-blue-300'
                          : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                      }`}>
                        {entry.paymentMethod === 'BANK' ? (entry.bankName || 'Bank') : '💵 Cash in Drawer'}
                      </span>
                      {entry.transactionId && (
                        <span className="text-[9px] text-gray-400 font-mono block mt-0.5">Trx #{entry.transactionId}</span>
                      )}
                    </td>
                    <td className="p-3 text-right font-mono font-bold">
                      <span className={entry.type === 'INCOME' ? 'text-emerald-400' : 'text-red-400'}>
                        {entry.type === 'INCOME' ? '+' : '-'} PKR {(Number(entry.amount) || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleOpenReceipt(entry)}
                        className="px-2 py-1 bg-white/5 hover:bg-white/10 text-gray-200 rounded border border-white/10 text-[10px] flex items-center gap-1 mx-auto"
                      >
                        <Eye size={12} /> Voucher
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400">
                      No transactions found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      );
    } else if (statBreakdownModal === 'receivables') {
      modalTitle = 'Total Receivables - Client Invoices Breakdown';
      modalSubtitle = 'Detailed list of outstanding and unpaid client bills and invoices';
      modalBadge = 'Receivables';

      const filtered = calculatedReceivables.filter(entry => {
        if (statFilterSubtab === 'PENDING' && entry.status === 'PAID') return false;
        if (statFilterSubtab === 'PAID' && entry.status !== 'PAID') return false;
        if (statSearchQuery) {
          const q = statSearchQuery.toLowerCase();
          return (
            entry.party?.toLowerCase().includes(q) ||
            entry.description?.toLowerCase().includes(q) ||
            entry.reference?.toLowerCase().includes(q) ||
            entry.caseNo?.toLowerCase().includes(q) ||
            entry.containerNumber?.toLowerCase().includes(q)
          );
        }
        return true;
      });

      totalCount = filtered.length;
      totalDisplayedAmount = filtered.reduce((acc, curr) => {
        return acc + (curr.remainingAmount !== undefined ? curr.remainingAmount : (curr.status === 'PAID' ? 0 : curr.amount));
      }, 0);

      content = (
        <div className="space-y-4">
          {/* Metric Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
              <span className="text-[10px] uppercase text-gray-400 font-semibold block">Total Invoiced</span>
              <span className="text-base font-bold font-mono text-white">
                PKR {receivablesSummary.totalInvoiced.toLocaleString()}
              </span>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <span className="text-[10px] uppercase text-emerald-400 font-semibold block">Collected to Date</span>
              <span className="text-base font-bold font-mono text-emerald-300">
                PKR {receivablesSummary.totalPaid.toLocaleString()}
              </span>
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <span className="text-[10px] uppercase text-amber-400 font-semibold block">Outstanding Dues</span>
              <span className="text-base font-bold font-mono text-amber-300">
                PKR {receivablesSummary.totalOutstanding.toLocaleString()}
              </span>
            </div>
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <span className="text-[10px] uppercase text-blue-400 font-semibold block">Unpaid Bills</span>
              <span className="text-base font-bold font-mono text-blue-300">
                {receivablesSummary.pendingCount} Invoices
              </span>
            </div>
          </div>

          {/* Subtabs & Search */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
            <div className="flex items-center gap-1.5">
              {[
                { id: 'ALL', label: 'All Invoices' },
                { id: 'PENDING', label: 'Pending Dues Only' },
                { id: 'PAID', label: 'Settled & Cleared' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setStatFilterSubtab(tab.id)}
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
                    statFilterSubtab === tab.id
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-white/5 hover:bg-white/10 text-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search client, case, container, invoice #..."
                value={statSearchQuery}
                onChange={(e) => setStatSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-black/40 border border-white/10 rounded-lg text-white outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* List Table */}
          <div className="overflow-x-auto rounded-xl border border-white/10 max-h-[380px] overflow-y-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-slate-900 sticky top-0 uppercase text-[10px] text-gray-400 border-b border-white/10 font-semibold">
                <tr>
                  <th className="p-3">Date / Invoice #</th>
                  <th className="p-3">Client Name</th>
                  <th className="p-3">Case & Service</th>
                  <th className="p-3 text-right">Invoiced</th>
                  <th className="p-3 text-right">Collected</th>
                  <th className="p-3 text-right">Outstanding Due</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map(entry => {
                  const remaining = entry.remainingAmount !== undefined ? entry.remainingAmount : (entry.status === 'PAID' ? 0 : entry.amount);
                  return (
                    <tr key={entry.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3">
                        <span className="font-mono text-white block">{entry.date}</span>
                        <span className="text-[10px] text-purple-300 font-mono">{entry.reference || `INV-${entry.id}`}</span>
                      </td>
                      <td className="p-3 font-semibold text-white">{entry.party}</td>
                      <td className="p-3">
                        <span className="text-gray-200 block truncate max-w-[200px]">{entry.description}</span>
                        {entry.caseNo && <span className="text-[10px] text-gray-400">Case: {entry.caseNo}</span>}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-white">
                        PKR {entry.amount.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-mono text-emerald-400">
                        PKR {(entry.paidAmount || 0).toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-amber-300">
                        PKR {remaining.toLocaleString()}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          entry.status === 'PAID' 
                            ? 'bg-emerald-500/20 text-emerald-300' 
                            : entry.status === 'PARTIAL' 
                            ? 'bg-amber-500/20 text-amber-300' 
                            : 'bg-red-500/20 text-red-300'
                        }`}>
                          {entry.status || 'PENDING'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenInvoice(entry)}
                            className="px-2 py-1 bg-white/5 hover:bg-white/10 text-gray-200 rounded border border-white/10 text-[10px] flex items-center gap-1"
                            title="View Invoice"
                          >
                            <FileText size={12} />
                          </button>
                          {entry.status !== 'PAID' && (
                            <button
                              onClick={() => {
                                setStatBreakdownModal(null);
                                handleOpenQuickReceiveModal(entry);
                              }}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-semibold flex items-center gap-1 shadow"
                              title="Receive Payment"
                            >
                              <ArrowDownLeft size={12} /> Receive
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-400">
                      No invoices found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      );
    } else if (statBreakdownModal === 'payables') {
      modalTitle = 'Total Payables - Outstanding Dues Breakdown';
      modalSubtitle = 'All pending obligations to transporters, shipping lines, terminals, staff, and vendors';
      modalBadge = 'Payables';

      const filtered = payables.filter(entry => {
        if (statFilterSubtab === 'PENDING' && entry.status === 'PAID') return false;
        if (statFilterSubtab === 'PAID' && entry.status !== 'PAID') return false;
        if (statSearchQuery) {
          const q = statSearchQuery.toLowerCase();
          return (
            entry.party?.toLowerCase().includes(q) ||
            entry.description?.toLowerCase().includes(q) ||
            entry.reference?.toLowerCase().includes(q) ||
            entry.category?.toLowerCase().includes(q)
          );
        }
        return true;
      });

      totalCount = filtered.length;
      totalDisplayedAmount = filtered.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

      content = (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
              <span className="text-[10px] uppercase text-gray-400 font-semibold block">Total Billed Payables</span>
              <span className="text-base font-bold font-mono text-white">
                PKR {payablesSummary.totalInvoiced.toLocaleString()}
              </span>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <span className="text-[10px] uppercase text-emerald-400 font-semibold block">Settled to Date</span>
              <span className="text-base font-bold font-mono text-emerald-300">
                PKR {payablesSummary.totalPaid.toLocaleString()}
              </span>
            </div>
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <span className="text-[10px] uppercase text-red-400 font-semibold block">Total Pending Dues</span>
              <span className="text-base font-bold font-mono text-red-300">
                PKR {payablesSummary.totalPending.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Subtabs & Search */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
            <div className="flex items-center gap-1.5">
              {[
                { id: 'ALL', label: 'All Bills' },
                { id: 'PENDING', label: 'Pending Dues Only' },
                { id: 'PAID', label: 'Paid Bills' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setStatFilterSubtab(tab.id)}
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
                    statFilterSubtab === tab.id
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-white/5 hover:bg-white/10 text-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search vendor, description, category..."
                value={statSearchQuery}
                onChange={(e) => setStatSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-black/40 border border-white/10 rounded-lg text-white outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* List Table */}
          <div className="overflow-x-auto rounded-xl border border-white/10 max-h-[380px] overflow-y-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-slate-900 sticky top-0 uppercase text-[10px] text-gray-400 border-b border-white/10 font-semibold">
                <tr>
                  <th className="p-3">Date / Ref</th>
                  <th className="p-3">Vendor / Party</th>
                  <th className="p-3">Category & Details</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map(entry => (
                  <tr key={entry.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-3">
                      <span className="font-mono text-white block">{entry.date}</span>
                      <span className="text-[10px] text-gray-400 font-mono">{entry.reference || `PAY-${entry.id}`}</span>
                    </td>
                    <td className="p-3 font-semibold text-white">{entry.party}</td>
                    <td className="p-3">
                      <span className="text-gray-200 block truncate max-w-[220px]">{entry.description}</span>
                      <span className="text-[10px] text-red-300">{entry.category || 'Operational'}</span>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-red-300">
                      PKR {entry.amount.toLocaleString()}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        entry.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                      }`}>
                        {entry.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenReceipt(entry)}
                          className="px-2 py-1 bg-white/5 hover:bg-white/10 text-gray-200 rounded border border-white/10 text-[10px]"
                          title="View Voucher"
                        >
                          <Eye size={12} />
                        </button>
                        {entry.status !== 'PAID' && (
                          <button
                            onClick={() => {
                              setStatBreakdownModal(null);
                              handleStatusChange(entry.id, payables, setPayables);
                            }}
                            className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-[10px] font-semibold flex items-center gap-1 shadow"
                          >
                            <ArrowUpRight size={12} /> Pay
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400">
                      No payable bills found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      );
    } else if (statBreakdownModal === 'received_amount') {
      modalTitle = 'Total Received Amount - Month to Date';
      modalSubtitle = `Payments and income collected from 1st ${currentMonthReceivedSummary.monthName} to Today (${currentMonthReceivedSummary.startOfMonthStr} to ${currentMonthReceivedSummary.todayStr})`;
      modalBadge = 'Received This Month';

      const filtered = currentMonthReceivedSummary.entries.filter(entry => {
        if (statFilterSubtab === 'CASH' && entry.paymentMethod === 'BANK') return false;
        if (statFilterSubtab === 'BANK' && entry.paymentMethod !== 'BANK') return false;
        if (statSearchQuery) {
          const q = statSearchQuery.toLowerCase();
          return (
            entry.party?.toLowerCase().includes(q) ||
            entry.description?.toLowerCase().includes(q) ||
            entry.reference?.toLowerCase().includes(q) ||
            entry.bankName?.toLowerCase().includes(q) ||
            entry.transactionId?.toLowerCase().includes(q) ||
            entry.caseNo?.toLowerCase().includes(q)
          );
        }
        return true;
      });

      totalCount = filtered.length;
      totalDisplayedAmount = filtered.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

      content = (
        <div className="space-y-4">
          {/* Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <span className="text-[10px] uppercase text-emerald-400 font-semibold block">Total Received This Month</span>
              <span className="text-base font-bold font-mono text-emerald-300">
                PKR {currentMonthReceivedSummary.totalAmount.toLocaleString()}
              </span>
            </div>
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <span className="text-[10px] uppercase text-blue-400 font-semibold block">Bank Transfers</span>
              <span className="text-base font-bold font-mono text-blue-300">
                PKR {currentMonthReceivedSummary.bankTotal.toLocaleString()}
              </span>
            </div>
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
              <span className="text-[10px] uppercase text-purple-400 font-semibold block">Cash Receipts</span>
              <span className="text-base font-bold font-mono text-purple-300">
                PKR {currentMonthReceivedSummary.cashTotal.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Subtabs & Search */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
            <div className="flex items-center gap-1.5">
              {[
                { id: 'ALL', label: 'All Receipts' },
                { id: 'BANK', label: 'Bank Transfers' },
                { id: 'CASH', label: 'Cash Receipts' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setStatFilterSubtab(tab.id)}
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
                    statFilterSubtab === tab.id
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-white/5 hover:bg-white/10 text-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search payer, receipt #, bank, case..."
                value={statSearchQuery}
                onChange={(e) => setStatSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-black/40 border border-white/10 rounded-lg text-white outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* List Table */}
          <div className="overflow-x-auto rounded-xl border border-white/10 max-h-[380px] overflow-y-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-slate-900 sticky top-0 uppercase text-[10px] text-gray-400 border-b border-white/10 font-semibold">
                <tr>
                  <th className="p-3">Date / Receipt #</th>
                  <th className="p-3">Client / Payer</th>
                  <th className="p-3">Details & Case</th>
                  <th className="p-3">Method & Bank</th>
                  <th className="p-3 text-right">Amount Received</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map(entry => (
                  <tr key={entry.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-3">
                      <span className="font-mono text-white block">{entry.date}</span>
                      <span className="text-[10px] text-purple-300 font-mono">{entry.reference || `REC-${entry.id}`}</span>
                    </td>
                    <td className="p-3 font-semibold text-white">{entry.party}</td>
                    <td className="p-3">
                      <span className="text-gray-200 block truncate max-w-[220px]">{entry.description}</span>
                      {entry.caseNo && <span className="text-[10px] text-gray-400">Case: {entry.caseNo}</span>}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-white/5 border border-white/10 text-gray-300 block w-fit">
                        {entry.paymentMethod === 'BANK' ? `${entry.bankName || 'Bank'}` : 'Cash'}
                      </span>
                      {entry.transactionId && (
                        <span className="text-[9px] text-gray-400 font-mono mt-0.5 block">{entry.transactionId}</span>
                      )}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-400">
                      PKR {(Number(entry.amount) || 0).toLocaleString()}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleOpenReceipt(entry)}
                        className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-gray-200 rounded border border-white/10 text-[10px] flex items-center gap-1 mx-auto"
                        title="View Official Receipt"
                      >
                        <Eye size={12} /> Receipt
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400">
                      No payments received this month yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
        <div className={`bg-slate-900 border border-white/10 rounded-2xl w-full ${statBreakdownModal === 'cash_in_hand' ? 'max-w-5xl' : 'max-w-4xl'} max-h-[90vh] flex flex-col shadow-2xl overflow-hidden`}>
          {/* Modal Header */}
          <div className="p-5 border-b border-white/10 flex items-center justify-between bg-slate-950/60">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">{modalTitle}</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold uppercase">
                  {modalBadge}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{modalSubtitle}</p>
            </div>
            <button
              onClick={() => {
                setStatBreakdownModal(null);
                setStatSearchQuery('');
                setStatFilterSubtab('ALL');
              }}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-5 overflow-y-auto flex-1 space-y-4">
            {content}
          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-white/10 bg-slate-950/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="text-gray-400">
              Showing <span className="text-white font-bold">{totalCount}</span> items &bull; Total Value:{' '}
              <span className="text-white font-mono font-bold">PKR {Math.abs(totalDisplayedAmount).toLocaleString()}</span>
            </div>
            <button
              onClick={() => {
                setStatBreakdownModal(null);
                setStatSearchQuery('');
                setStatFilterSubtab('ALL');
              }}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-all"
            >
              Close Window
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderTableContent = () => {
    switch (activeTab) {
      case 'receivables': {
        const filteredClientReceivables = clientReceivablesSummaries.filter(client => {
          if (!searchTerm) return true;
          const q = searchTerm.toLowerCase();
          return (
            client.party.toLowerCase().includes(q) ||
            client.invoices.some(inv => 
              (inv.reference && inv.reference.toLowerCase().includes(q)) ||
              (inv.caseNo && inv.caseNo.toLowerCase().includes(q)) ||
              (inv.containerNumber && inv.containerNumber.toLowerCase().includes(q)) ||
              (inv.description && inv.description.toLowerCase().includes(q))
            )
          );
        });

        return (
          <>
            {/* Receivables High-Level Settlement Summary Bar */}
            <div className="p-4 bg-slate-900/60 border-b border-white/5 flex flex-wrap items-center justify-between gap-3 no-print">
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase">Total Invoiced</span>
                  <span className="text-white font-mono font-bold text-sm">PKR {receivablesSummary.totalInvoiced.toLocaleString()}</span>
                </div>
                <div className="h-6 w-px bg-white/10 hidden sm:block" />
                <div>
                  <span className="text-emerald-400 block text-[10px] uppercase">Received to Date</span>
                  <span className="text-emerald-400 font-mono font-bold text-sm">PKR {receivablesSummary.totalPaid.toLocaleString()}</span>
                </div>
                <div className="h-6 w-px bg-white/10 hidden sm:block" />
                <div>
                  <span className="text-amber-400 block text-[10px] uppercase">Total Ledger Outstanding</span>
                  <span className="text-amber-300 font-mono font-bold text-sm">PKR {receivablesSummary.totalOutstanding.toLocaleString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-400 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                  {receivablesSummary.clearedCount} Clients Cleared • {receivablesSummary.pendingCount} Clients Pending Dues
                </span>
                <button
                  onClick={() => setShowAllInvoicesModal(true)}
                  className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border border-white/10"
                  title="View complete invoices registry"
                >
                  <Layers size={13} />
                  <span>All Invoices Registry</span>
                </button>
              </div>
            </div>

            {/* Mobile View: Compact, Single-Row per Client Card */}
            <div className="block sm:hidden divide-y divide-white/10 touch-pan-y">
              {filteredClientReceivables.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-xs">No client ledger accounts found.</div>
              ) : (
                filteredClientReceivables.map((client) => {
                  const isExpanded = expandedReceivableClient === client.party;
                  return (
                    <div key={client.party} className="p-3 hover:bg-white/5 transition-colors space-y-2">
                      {/* Top Row: Client Name, Volumes, Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-white block truncate">{client.party}</span>
                          <span className="text-[10px] text-gray-400">
                            {client.invoicesCount} Invoices • {client.casesCount} Cases • {client.containerCount} Cntrs
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold shrink-0 ${
                          client.status === 'PAID' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 
                          client.status === 'PARTIAL' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                          client.status === 'ADVANCE' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                          'bg-red-500/20 text-red-300 border border-red-500/30'
                        }`}>
                          {client.status === 'PAID' ? 'SETTLED' : client.status === 'ADVANCE' ? 'ADVANCE' : `${client.status} DUE`}
                        </span>
                      </div>

                      {/* Amounts Grid */}
                      <div className="grid grid-cols-3 gap-2 bg-white/5 p-2 rounded-lg border border-white/5 text-[11px]">
                        <div>
                          <span className="text-gray-400 block text-[9px] uppercase">Billed</span>
                          <span className="font-mono text-gray-200 font-semibold text-[10px]">PKR {client.totalInvoiced.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-emerald-400 block text-[9px] uppercase">Received</span>
                          <span className="font-mono text-emerald-400 font-semibold text-[10px]">PKR {client.totalPaid.toLocaleString()}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-amber-400 block text-[9px] uppercase">Ledger Balance</span>
                          <span className={`font-mono font-bold text-xs ${
                            client.currentBalance > 0 ? 'text-amber-300' : client.currentBalance === 0 ? 'text-emerald-400' : 'text-blue-300'
                          }`}>
                            PKR {Math.abs(client.currentBalance).toLocaleString()} {client.currentBalance < 0 ? '(Adv)' : ''}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between gap-1.5 pt-1">
                        <button
                          onClick={() => setExpandedReceivableClient(isExpanded ? null : client.party)}
                          className="text-gray-400 hover:text-white text-[11px] font-medium flex items-center gap-1 px-2 py-1 rounded bg-white/5"
                        >
                          <span>{client.invoicesCount} Invoices</span>
                          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedLedgerClient(client.party);
                              setActiveTab('client_ledger');
                            }}
                            className="text-brand-300 hover:text-white text-[11px] font-semibold px-2 py-1 rounded bg-brand-600/20 border border-brand-500/30 flex items-center gap-1"
                            title="Open detailed Client Ledger"
                          >
                            <BookOpen size={11} />
                            <span>Ledger</span>
                          </button>
                          {client.currentBalance > 0 && (
                            <button
                              onClick={() => handleOpenQuickReceiveModal({
                                party: client.party,
                                currentBalance: client.currentBalance,
                                amount: client.currentBalance,
                                isClientSummary: true,
                                reference: `LEDGER-${client.party.replace(/[^a-zA-Z0-9]/g, '')}`
                              })}
                              className="text-amber-300 hover:text-white text-[11px] font-semibold px-2 py-1 rounded bg-amber-600/20 border border-amber-500/30 flex items-center gap-1"
                            >
                              <Banknote size={11} />
                              <span>Receive</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expanded Invoices List */}
                      {isExpanded && (
                        <div className="mt-2 pt-2 border-t border-white/10 space-y-2 bg-slate-950/60 p-2 rounded-lg">
                          <span className="text-[10px] text-gray-400 font-semibold uppercase block">
                            Billing Breakdown ({client.invoices.length} Invoices)
                          </span>
                          <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar">
                            {client.invoices.map((inv) => (
                              <div key={inv.id} className="p-2 bg-white/5 rounded border border-white/5 flex items-center justify-between gap-2 text-xs">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-brand-300 font-bold text-[11px]">{inv.reference}</span>
                                    {inv.caseNo && <span className="text-[10px] text-gray-400">({inv.caseNo})</span>}
                                  </div>
                                  <span className="text-[10px] text-gray-400 block truncate">{inv.description}</span>
                                </div>
                                <div className="text-right shrink-0 flex items-center gap-2">
                                  <span className="font-mono font-bold text-white text-xs">PKR {inv.amount.toLocaleString()}</span>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleOpenInvoice(inv)}
                                      className="p-1 bg-brand-600/20 hover:bg-brand-600 text-brand-300 hover:text-white rounded border border-brand-500/30"
                                      title="View Invoice"
                                    >
                                      <Eye size={11} />
                                    </button>
                                    <button
                                      onClick={() => handleDirectDownloadInvoice(inv)}
                                      className="p-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded border border-emerald-500/30"
                                      title="Download PDF"
                                    >
                                      <Download size={11} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table: One Line Per Client with Ledger Current Balance */}
            <div className="hidden sm:block overflow-x-auto touch-pan-y">
              <table className="w-full text-left text-sm text-gray-300 print:table print:text-black">
                <thead className="bg-white/5 uppercase text-xs font-semibold text-gray-400 border-b border-white/5 print:text-black print:border-black">
                  <tr>
                    <th className="p-4">Client / Account Party</th>
                    <th className="p-4">Billing Volumes</th>
                    <th className="p-4">Last Activity</th>
                    <th className="p-4 text-right">Total Invoiced</th>
                    <th className="p-4 text-right">Total Received</th>
                    <th className="p-4 text-right">Current Ledger Balance</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center no-print">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 print:divide-gray-300">
                  {filteredClientReceivables.map((client) => {
                    const isExpanded = expandedReceivableClient === client.party;
                    return (
                      <React.Fragment key={client.party}>
                        <tr className="hover:bg-white/5 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 shrink-0">
                                <Briefcase size={16} />
                              </div>
                              <div>
                                <span className="font-bold text-white print:text-black block text-sm">{client.party}</span>
                                <span className="text-xs text-gray-400">Client Ledger Account</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-xs">
                            <div className="space-y-0.5">
                              <span className="text-white font-medium block">
                                {client.invoicesCount} Invoices • {client.casesCount} Cases
                              </span>
                              <span className="text-gray-400 block">{client.containerCount} Total Containers</span>
                            </div>
                          </td>
                          <td className="p-4 text-xs font-mono text-gray-400">
                            {client.lastDate || '-'}
                          </td>
                          <td className="p-4 text-right font-mono text-white print:text-black font-semibold">
                            PKR {client.totalInvoiced.toLocaleString()}
                          </td>
                          <td className="p-4 text-right font-mono text-emerald-400 print:text-black font-semibold">
                            PKR {client.totalPaid.toLocaleString()}
                          </td>
                          <td className="p-4 text-right">
                            <div className="space-y-0.5">
                              <span className={`font-mono font-bold text-base block ${
                                client.currentBalance > 0 ? 'text-amber-300' : client.currentBalance === 0 ? 'text-emerald-400' : 'text-blue-300'
                              }`}>
                                PKR {Math.abs(client.currentBalance).toLocaleString()}
                              </span>
                              <span className="text-[10px] text-gray-400 block uppercase font-medium">
                                {client.currentBalance > 0 ? 'Outstanding Due' : client.currentBalance === 0 ? 'Fully Cleared' : 'Advance Credit'}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`px-2.5 py-1 rounded text-xs font-semibold inline-block ${
                              client.status === 'PAID' ? 'bg-green-500/20 text-green-300 border border-green-500/30 print:border print:border-black print:text-black' : 
                              client.status === 'PARTIAL' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 print:border print:border-black print:text-black' :
                              client.status === 'ADVANCE' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 print:border print:border-black print:text-black' :
                              'bg-red-500/20 text-red-300 border border-red-500/30 print:border print:border-black print:text-black'
                            }`}>
                              {client.status === 'PAID' ? 'CLEARED' : client.status === 'ADVANCE' ? 'ADVANCE' : `${client.status} DUE`}
                            </span>
                          </td>
                          <td className="p-4 text-center no-print">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  setSelectedLedgerClient(client.party);
                                  setActiveTab('client_ledger');
                                }}
                                className="text-brand-300 hover:text-white transition-colors text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-brand-600/20 border border-brand-500/30 flex items-center gap-1.5 shadow-sm"
                                title="Open Full Client Ledger"
                              >
                                <BookOpen size={13} />
                                <span>Open Ledger</span>
                              </button>

                              {client.currentBalance > 0 && (
                                <button
                                  onClick={() => handleOpenQuickReceiveModal({
                                    party: client.party,
                                    currentBalance: client.currentBalance,
                                    amount: client.currentBalance,
                                    isClientSummary: true,
                                    reference: `LEDGER-${client.party.replace(/[^a-zA-Z0-9]/g, '')}`
                                  })}
                                  className="text-amber-300 hover:text-white transition-colors text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-amber-600/20 border border-amber-500/30 flex items-center gap-1.5 shadow-sm"
                                  title="Receive settlement against client ledger balance"
                                >
                                  <Banknote size={13} />
                                  <span>Receive</span>
                                </button>
                              )}

                              <button
                                onClick={() => setExpandedReceivableClient(isExpanded ? null : client.party)}
                                className={`text-xs font-semibold px-2 py-1.5 rounded-lg transition-colors flex items-center gap-1 border ${
                                  isExpanded
                                    ? 'bg-white/20 text-white border-white/30'
                                    : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
                                }`}
                                title="Toggle Invoices Breakdown"
                              >
                                <span>Invoices ({client.invoicesCount})</span>
                                {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expandable Breakdown of Invoices for this Client */}
                        {isExpanded && (
                          <tr className="bg-slate-950/80">
                            <td colSpan={8} className="p-4 border-t border-b border-white/10">
                              <div className="bg-slate-900/90 rounded-xl p-4 border border-white/10 space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <FileText size={16} className="text-brand-400" />
                                    <span className="text-xs font-bold text-white uppercase tracking-wide">
                                      Billing Invoices Registry for {client.party}
                                    </span>
                                  </div>
                                  <span className="text-xs text-gray-400 font-mono">
                                    {client.invoices.length} Registered Bills / Charges
                                  </span>
                                </div>

                                <table className="w-full text-left text-xs text-gray-300">
                                  <thead className="bg-white/5 uppercase font-semibold text-gray-400 border-b border-white/10">
                                    <tr>
                                      <th className="p-2.5">Date</th>
                                      <th className="p-2.5">Invoice #</th>
                                      <th className="p-2.5">Case / Cntr</th>
                                      <th className="p-2.5">Particulars / Description</th>
                                      <th className="p-2.5 text-right">Invoiced Amount</th>
                                      <th className="p-2.5 text-center">Status</th>
                                      <th className="p-2.5 text-center">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-white/5">
                                    {client.invoices.map((inv) => (
                                      <tr key={inv.id} className="hover:bg-white/5 transition">
                                        <td className="p-2.5 font-mono text-gray-400">{inv.date}</td>
                                        <td className="p-2.5 font-mono font-bold text-brand-300">{inv.reference}</td>
                                        <td className="p-2.5 text-gray-400">
                                          {inv.caseNo ? `Case: ${inv.caseNo}` : '-'}
                                          {inv.containerNumber && inv.containerNumber !== 'N/A' && ` [${inv.containerNumber}]`}
                                        </td>
                                        <td className="p-2.5 text-gray-300 max-w-sm truncate">{inv.description}</td>
                                        <td className="p-2.5 text-right font-mono font-bold text-white">
                                          PKR {inv.amount.toLocaleString()}
                                        </td>
                                        <td className="p-2.5 text-center">
                                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                            inv.status === 'PAID' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'
                                          }`}>
                                            {inv.status}
                                          </span>
                                        </td>
                                        <td className="p-2.5 text-center">
                                          <div className="flex items-center justify-center gap-1.5">
                                            <button
                                              onClick={() => handleOpenInvoice(inv)}
                                              className="px-2 py-1 rounded bg-brand-600/20 hover:bg-brand-600 text-brand-300 hover:text-white border border-brand-500/30 text-[11px] font-semibold flex items-center gap-1 transition"
                                              title="View Official Invoice"
                                            >
                                              <Eye size={11} />
                                              <span>View</span>
                                            </button>
                                            <button
                                              onClick={() => handleDirectDownloadInvoice(inv)}
                                              className="p-1 rounded bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 transition"
                                              title="Direct Download PDF"
                                            >
                                              <Download size={12} />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {filteredClientReceivables.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-gray-400">No client ledger accounts found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        );
      }

      case 'payables': {
        const filteredPayables = payables.filter(entry => 
          !searchTerm || 
          entry.party.toLowerCase().includes(searchTerm.toLowerCase()) || 
          entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (entry.reference && entry.reference.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        return (
          <>
            {/* Monthly Fixed & Recurring Expenses Quick Bar */}
            <div className="p-4 bg-slate-900/60 border-b border-white/5 flex flex-wrap items-center justify-between gap-3 no-print">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <RefreshCw size={18} className={isPostingRecurring ? 'animate-spin' : ''} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    Monthly Fixed Expenses & Salaries
                    <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      Auto-posts on 1st
                    </span>
                  </h4>
                  <p className="text-[11px] text-gray-400">
                    Office rent, vehicle loans, internet, security, and staff base salaries.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handlePostAllMonthlyFixedExpenses}
                  disabled={isPostingRecurring}
                  className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg border border-purple-500/40 flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                  title="Verify and post all monthly fixed expenses for the 1st of the month into Payables"
                >
                  <Zap size={13} />
                  <span>{isPostingRecurring ? 'Posting Expenses...' : 'Post 1st-of-Month Expenses'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('recurring')}
                  className="bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-1.5 transition-all"
                >
                  <Calendar size={13} />
                  <span>Manage Templates</span>
                </button>
              </div>
            </div>

            {/* Mobile View: Compact, Zero-Horizontal Scroll, Smooth Touch Pan-Y */}
            <div className="block sm:hidden divide-y divide-white/10 touch-pan-y">
              {filteredPayables.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-xs">No payables found.</div>
              ) : (
                filteredPayables.map((entry) => (
                  <div key={entry.id} className="p-3 hover:bg-white/5 transition-colors space-y-1.5">
                    {/* Top Row: Date, Payee, Status */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[11px] font-mono text-gray-400 shrink-0">{entry.date}</span>
                        <span className="text-xs font-bold text-white truncate">{entry.party}</span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${
                        entry.status === 'PAID' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {entry.status}
                      </span>
                    </div>

                    {/* Middle: Description & Reference */}
                    <p className="text-[11px] text-gray-300 leading-snug line-clamp-2">
                      {entry.description}
                      {entry.reference && (
                        <span className="text-[10px] text-gray-500 block">Ref / Due: {entry.reference}</span>
                      )}
                    </p>

                    {/* Bottom: Amount + Compact Action Buttons */}
                    <div className="flex items-center justify-between pt-1 border-t border-white/5">
                      <div className="text-xs font-bold font-mono text-red-400">
                        PKR {entry.amount.toLocaleString()}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => handleOpenReceipt(entry)}
                          className="text-brand-400 hover:text-white text-[11px] font-semibold px-2 py-0.5 rounded bg-brand-600/20 border border-brand-500/30 flex items-center gap-1"
                          title="View Payment Voucher"
                        >
                          <Eye size={11} />
                          <span>Voucher</span>
                        </button>
                        <button 
                          onClick={() => handleDirectDownloadReceipt(entry)}
                          className="text-emerald-400 hover:text-white p-1 rounded bg-emerald-600/20 border border-emerald-500/30"
                          title="Direct Download Voucher PDF"
                        >
                          <Download size={11} />
                        </button>
                        {entry.status !== 'PAID' && (
                          <button 
                            onClick={() => handleStatusChange(entry.id, payables, setPayables)}
                            className="text-red-400 hover:text-white text-[11px] font-semibold px-2 py-0.5 rounded bg-red-600/20 border border-red-500/30"
                          >
                            Pay Now
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table: Full View */}
            <div className="hidden sm:block overflow-x-auto touch-pan-y">
              <table className="w-full text-left text-sm text-gray-300 print:table print:text-black">
                <thead className="bg-white/5 uppercase text-xs font-semibold text-gray-400 border-b border-white/5 print:text-black print:border-black">
                  <tr>
                    <th className="p-4">Date</th>
                    <th className="p-4">Description</th>
                    <th className="p-4">Payee</th>
                    <th className="p-4 text-right">Amount</th>
                    <th className="p-4">Ref / Due</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center no-print">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 print:divide-gray-300">
                  {filteredPayables.map((entry) => (
                    <tr key={entry.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4">{entry.date}</td>
                      <td className="p-4">{entry.description}</td>
                      <td className="p-4 font-medium text-white print:text-black">{entry.party}</td>
                      <td className="p-4 text-right text-red-400 font-mono print:text-black">PKR {entry.amount.toLocaleString()}</td>
                      <td className="p-4 text-gray-400 print:text-black">{entry.reference || 'Due on File'}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${entry.status === 'PAID' ? 'bg-green-500/20 text-green-400 print:border print:border-black print:text-black' : 'bg-yellow-500/20 text-yellow-400 print:border print:border-black print:text-black'}`}>
                          {entry.status}
                        </span>
                      </td>
                      <td className="p-4 text-center no-print">
                        <div className="flex items-center justify-center gap-1.5">
                          <button 
                            onClick={() => handleOpenReceipt(entry)}
                            className="text-brand-400 hover:text-white transition-colors text-xs font-semibold px-2 py-1 rounded bg-brand-600/20 border border-brand-500/30 flex items-center gap-1"
                            title="View Payment Voucher"
                          >
                            <Eye size={12} />
                            <span>Voucher</span>
                          </button>
                          <button 
                            onClick={() => handleDirectDownloadReceipt(entry)}
                            className="text-emerald-400 hover:text-white transition-colors text-xs font-semibold p-1.5 rounded bg-emerald-600/20 border border-emerald-500/30"
                            title="Direct Download Voucher PDF"
                          >
                            <Download size={13} />
                          </button>
                          {entry.status !== 'PAID' && (
                            <button 
                              onClick={() => handleStatusChange(entry.id, payables, setPayables)}
                              className="text-red-400 hover:text-white transition-colors text-xs font-semibold px-2 py-1 rounded bg-red-600/20 border border-red-500/30"
                            >
                              Pay Now
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredPayables.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-400">No payables found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        );
      }

      case 'client_ledger':
        return (
          <div className="p-4 space-y-4">
            {/* Client Selector & Overview Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10 no-print">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Briefcase className="text-brand-400" size={20} />
                  <span className="text-xs uppercase font-bold text-gray-400">Select Client:</span>
                </div>
                <div className="relative min-w-[260px]">
                  <select 
                    value={selectedLedgerClient}
                    onChange={(e) => setSelectedLedgerClient(e.target.value)}
                    className="w-full bg-slate-900 border border-brand-500/40 text-white text-sm font-semibold rounded-xl px-4 py-2.5 appearance-none focus:outline-none focus:border-brand-400 cursor-pointer shadow-lg shadow-brand-500/10"
                  >
                    {clientList.map(c => (
                      <option key={c} value={c} className="bg-slate-900 text-white">
                        {c}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>

                <button
                  onClick={() => {
                    setTransactionType('INCOME');
                    setNewTransaction({
                      description: `Payment Received from ${selectedLedgerClient}`,
                      amount: 0,
                      party: selectedLedgerClient,
                      paymentMethod: 'CASH',
                      bankId: '',
                      transactionId: ''
                    });
                    setIsOtherClient(false);
                    setShowAddModal(true);
                  }}
                  className="bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-3 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-brand-600/20"
                >
                  <Plus size={14} />
                  <span>Receive Payment for {selectedLedgerClient.split(' ')[0]}</span>
                </button>
              </div>

              {/* Export Buttons */}
              <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
                <button 
                  onClick={handleDownloadClientLedger}
                  disabled={isExportingPdf}
                  className="px-3.5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-brand-600/20"
                  title="Download Client Ledger Statement as PDF to Device"
                >
                  <Download size={14} className="text-white" />
                  <span>Download PDF Statement</span>
                </button>
                <button 
                  onClick={handleExportClientLedgerExcel}
                  className="px-3.5 py-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                  title="Download Client Statement as formatted Excel (.xlsx) workbook"
                >
                  <FileSpreadsheet size={14} className="text-emerald-400 group-hover:text-white" />
                  <span>Export Excel (.xlsx)</span>
                </button>
                <button 
                  onClick={handleExportClientLedgerCSV}
                  className="px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all"
                  title="Download CSV spreadsheet"
                >
                  <Download size={14} className="text-gray-400" />
                  <span>CSV</span>
                </button>
              </div>
            </div>

            {/* Date Range Selection Bar */}
            <div className="bg-slate-900/60 p-3.5 rounded-xl border border-white/10 flex flex-wrap items-center justify-between gap-3 no-print">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-gray-400 font-medium flex items-center gap-1">
                  <Calendar size={14} className="text-brand-400" /> Date Range:
                </span>
                <input
                  type="date"
                  value={ledgerStartDate}
                  onChange={(e) => setLedgerStartDate(e.target.value)}
                  className="bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-brand-500"
                  placeholder="Start Date"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  value={ledgerEndDate}
                  onChange={(e) => setLedgerEndDate(e.target.value)}
                  className="bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-brand-500"
                  placeholder="End Date"
                />
                <button
                  type="button"
                  onClick={() => {
                    setLedgerStartDate('');
                    setLedgerEndDate(new Date().toISOString().split('T')[0]);
                  }}
                  className="px-3 py-1.5 bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/30 rounded-lg text-xs font-semibold transition"
                >
                  From Start to Today
                </button>
                {(ledgerStartDate || ledgerEndDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setLedgerStartDate('');
                      setLedgerEndDate('');
                    }}
                    className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg text-xs"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
              <span className="text-xs text-gray-400 font-mono">
                Showing {filteredClientLedgerEntries.length} of {clientLedgerEntries.length} records
              </span>
            </div>

            {/* Client Stats Highlights */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 no-print">
              <div className="glass-panel p-3.5 rounded-xl border border-white/10">
                <p className="text-[11px] text-gray-400 uppercase font-semibold">Total Debits (Charges)</p>
                <p className="text-lg font-bold text-red-400 font-mono mt-1">
                  PKR {clientSummary.totalDebits.toLocaleString()}
                </p>
                <p className="text-[10px] text-gray-500">Case fees & container freight</p>
              </div>
              <div className="glass-panel p-3.5 rounded-xl border border-white/10">
                <p className="text-[11px] text-gray-400 uppercase font-semibold">Total Credits (Paid)</p>
                <p className="text-lg font-bold text-green-400 font-mono mt-1">
                  PKR {clientSummary.totalCredits.toLocaleString()}
                </p>
                <p className="text-[10px] text-gray-500">Payments received & settled</p>
              </div>
              <div className="glass-panel p-3.5 rounded-xl border border-white/10 col-span-2 md:col-span-1 bg-brand-500/5">
                <p className="text-[11px] text-brand-300 uppercase font-bold">Outstanding Balance</p>
                <p className={`text-xl font-bold font-mono mt-1 ${clientSummary.netBalance > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  PKR {clientSummary.netBalance.toLocaleString()}
                </p>
                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold mt-1 ${clientSummary.netBalance > 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                  {clientSummary.netBalance > 0 ? 'Receivable Due' : 'Account Settled'}
                </span>
              </div>
              <div className="glass-panel p-3.5 rounded-xl border border-white/10">
                <p className="text-[11px] text-gray-400 uppercase font-semibold">Registered Cases</p>
                <p className="text-lg font-bold text-white font-mono mt-1">
                  {clientSummary.totalCases}
                </p>
                <p className="text-[10px] text-gray-500">Active & completed cases</p>
              </div>
              <div className="glass-panel p-3.5 rounded-xl border border-white/10">
                <p className="text-[11px] text-gray-400 uppercase font-semibold">Containers Handled</p>
                <p className="text-lg font-bold text-blue-400 font-mono mt-1">
                  {clientSummary.totalContainers}
                </p>
                <p className="text-[10px] text-gray-500">20ft / 40ft containers</p>
              </div>
            </div>

            {/* Print Header Banner for Client */}
            <div className="hidden print:block mb-4 p-4 border border-black rounded-lg bg-gray-50">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-black">{selectedLedgerClient} - Client Ledger Statement</h2>
                  <p className="text-xs text-gray-600 mt-1">Statement Period: Full History to {new Date().toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase font-bold text-gray-600">Net Closing Balance</p>
                  <p className="text-xl font-bold text-black font-mono">PKR {clientSummary.netBalance.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Dynamic Ledger Table */}
            {/* Mobile View: Compact, Zero-Horizontal Scroll, Smooth Touch Pan-Y */}
            <div className="block sm:hidden divide-y divide-white/10 touch-pan-y border-t border-white/10">
              {filteredClientLedgerEntries.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-xs">
                  No transactions found for {selectedLedgerClient} in the selected period.
                </div>
              ) : (
                filteredClientLedgerEntries
                  .filter(entry => !searchTerm || entry.description.toLowerCase().includes(searchTerm.toLowerCase()) || (entry.reference || '').toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((entry) => (
                    <div key={entry.id} className="p-3 hover:bg-white/5 transition-colors space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[11px] font-mono text-gray-400 shrink-0">{entry.date}</span>
                          <span className="font-mono text-[10px] text-brand-300 bg-brand-500/10 px-1.5 py-0.5 rounded border border-brand-500/20 truncate">
                            {entry.reference || '-'}
                          </span>
                        </div>
                        {entry.credit > 0 ? (
                          <button 
                            onClick={() => handleOpenReceipt({
                              id: entry.id,
                              date: entry.date,
                              party: selectedLedgerClient,
                              type: 'INCOME',
                              amount: entry.credit,
                              description: entry.description,
                              reference: entry.reference || 'REC-LEDGER',
                              status: 'PAID'
                            } as any)}
                            className="text-brand-400 hover:text-white text-[10px] font-semibold px-2 py-0.5 rounded bg-brand-600/20 border border-brand-500/30 flex items-center gap-1 shrink-0"
                            title="View Receipt"
                          >
                            <Eye size={10} />
                            <span>Receipt</span>
                          </button>
                        ) : entry.debit > 0 ? (
                          <button 
                            onClick={() => handleOpenInvoice({
                              id: entry.id,
                              date: entry.date,
                              party: selectedLedgerClient,
                              type: 'RECEIVABLE',
                              amount: entry.debit,
                              description: entry.description,
                              reference: entry.reference || 'INV-LEDGER',
                              status: 'PENDING'
                            } as any)}
                            className="text-emerald-400 hover:text-white text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-600/20 border border-emerald-500/30 flex items-center gap-1 shrink-0"
                            title="View Invoice"
                          >
                            <Eye size={10} />
                            <span>Invoice</span>
                          </button>
                        ) : null}
                      </div>

                      <p className="text-[11px] text-gray-200 leading-snug">
                        {entry.description}
                      </p>

                      <div className="flex items-center justify-between pt-1 border-t border-white/5 text-xs font-mono">
                        <div className="flex items-center gap-2">
                          {entry.debit > 0 && (
                            <span className="text-red-400 font-medium">Dr: PKR {entry.debit.toLocaleString()}</span>
                          )}
                          {entry.credit > 0 && (
                            <span className="text-green-400 font-medium">Cr: PKR {entry.credit.toLocaleString()}</span>
                          )}
                        </div>
                        <div className="font-bold">
                          <span className={entry.balance > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                            Bal: PKR {entry.balance.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>

            {/* Desktop Ledger Table */}
            <div className="hidden sm:block overflow-x-auto touch-pan-y">
              <table className="w-full text-left text-sm text-gray-300 border-t border-white/10 print:table print:text-black print:border-black">
                <thead className="bg-white/5 uppercase text-xs font-semibold text-gray-400 border-b border-white/5 print:text-black print:border-black">
                  <tr>
                    <th className="p-4 w-28">Date</th>
                    <th className="p-4 w-36">Voucher / Ref</th>
                    <th className="p-4">Particulars & Description</th>
                    <th className="p-4 text-right w-36">Debit (Charges)</th>
                    <th className="p-4 text-right w-36">Credit (Paid)</th>
                    <th className="p-4 text-right w-40">Running Balance</th>
                    <th className="p-4 text-center w-28 no-print">Receipt / Inv</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 print:divide-gray-300">
                  {filteredClientLedgerEntries
                    .filter(entry => !searchTerm || entry.description.toLowerCase().includes(searchTerm.toLowerCase()) || (entry.reference || '').toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((entry) => (
                    <tr key={entry.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 whitespace-nowrap text-xs text-gray-400 print:text-black">{entry.date}</td>
                      <td className="p-4 whitespace-nowrap">
                        <span className="font-mono text-xs text-brand-300 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20 print:border-none print:text-black print:bg-transparent">
                          {entry.reference || '-'}
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="font-medium text-white text-xs sm:text-sm print:text-black leading-snug">
                          {entry.description}
                        </p>
                      </td>
                      <td className="p-4 text-right text-red-400 font-mono text-xs sm:text-sm print:text-black">
                        {entry.debit > 0 ? `PKR ${entry.debit.toLocaleString()}` : '-'}
                      </td>
                      <td className="p-4 text-right text-green-400 font-mono text-xs sm:text-sm print:text-black">
                        {entry.credit > 0 ? `PKR ${entry.credit.toLocaleString()}` : '-'}
                      </td>
                      <td className="p-4 text-right font-bold font-mono text-xs sm:text-sm print:text-black">
                        <span className={entry.balance > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                          PKR {entry.balance.toLocaleString()}
                        </span>
                      </td>
                      <td className="p-4 text-center no-print">
                        {entry.credit > 0 ? (
                          <button 
                            onClick={() => handleOpenReceipt({
                              id: entry.id,
                              date: entry.date,
                              party: selectedLedgerClient,
                              type: 'INCOME',
                              amount: entry.credit,
                              description: entry.description,
                              reference: entry.reference || 'REC-LEDGER',
                              status: 'PAID'
                            } as any)}
                            className="text-brand-400 hover:text-white transition-colors text-xs font-semibold px-2 py-1 rounded bg-brand-600/20 border border-brand-500/30 flex items-center gap-1 mx-auto"
                            title="View / Download Payment Receipt"
                          >
                            <Eye size={12} />
                            <span>Receipt</span>
                          </button>
                        ) : entry.debit > 0 ? (
                          <button 
                            onClick={() => handleOpenInvoice({
                              id: entry.id,
                              date: entry.date,
                              party: selectedLedgerClient,
                              type: 'RECEIVABLE',
                              amount: entry.debit,
                              description: entry.description,
                              reference: entry.reference || 'INV-LEDGER',
                              status: 'PENDING'
                            } as any)}
                            className="text-emerald-400 hover:text-white transition-colors text-xs font-semibold px-2 py-1 rounded bg-emerald-600/20 border border-emerald-500/30 flex items-center gap-1 mx-auto"
                            title="View / Download Commercial Invoice"
                          >
                            <Eye size={12} />
                            <span>Invoice</span>
                          </button>
                        ) : (
                          <span className="text-gray-600 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {clientLedgerEntries.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center p-8 text-gray-500">
                        No transactions found for {selectedLedgerClient}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'general_ledger':
        return (
          <div className="p-4 space-y-4">
            {/* General Ledger Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10 no-print">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="text-brand-400" size={20} />
                  <span className="text-xs uppercase font-bold text-gray-400">Account Filter:</span>
                </div>
                <div className="relative min-w-[240px]">
                  <select 
                    value={glAccountFilter}
                    onChange={(e) => setGlAccountFilter(e.target.value)}
                    className="w-full bg-slate-900 border border-brand-500/40 text-white text-sm font-semibold rounded-xl px-4 py-2.5 appearance-none focus:outline-none focus:border-brand-400 cursor-pointer shadow-lg shadow-brand-500/10"
                  >
                    <option value="ALL" className="bg-slate-900 text-white">All Accounts (General Master)</option>
                    {clientList.map(c => (
                      <option key={c} value={c} className="bg-slate-900 text-white">
                        Client: {c}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
                <button 
                  onClick={handleDownloadGeneralLedger}
                  disabled={isExportingPdf}
                  className="px-3.5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-brand-600/20"
                  title="Download General Ledger Statement as PDF to Device"
                >
                  <Download size={14} className="text-white" />
                  <span>Download GL PDF</span>
                </button>
                <button 
                  onClick={handleExportGeneralLedgerExcel}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20"
                  title="Download General Ledger formatted Excel (.xlsx) workbook without data loss warnings"
                >
                  <FileSpreadsheet size={14} className="text-white" />
                  <span>Export GL (Excel .xlsx)</span>
                </button>
                <button 
                  onClick={handleExportGeneralLedgerCSV}
                  className="px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all"
                  title="Download legacy CSV spreadsheet"
                >
                  <Download size={14} className="text-gray-400" />
                  <span>CSV</span>
                </button>
                {generalLedgerEntries.length > 0 && (
                  <button 
                    onClick={handleClearGeneralLedger}
                    className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md"
                    title="Clear all general ledger vouchers and reset balance to PKR 0"
                  >
                    <Trash2 size={14} className="text-red-400" />
                    <span>Clear Ledger</span>
                  </button>
                )}
              </div>
            </div>

            {/* General Ledger Stats Highlights */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 no-print">
              <div className="glass-panel p-3.5 rounded-xl border border-white/10">
                <p className="text-[11px] text-gray-400 uppercase font-semibold">Total Debits</p>
                <p className="text-lg font-bold text-red-400 font-mono mt-1">
                  PKR {glSummary.totalDebits.toLocaleString()}
                </p>
                <p className="text-[10px] text-gray-500">Billings, charges & payables</p>
              </div>
              <div className="glass-panel p-3.5 rounded-xl border border-white/10">
                <p className="text-[11px] text-gray-400 uppercase font-semibold">Total Credits</p>
                <p className="text-lg font-bold text-green-400 font-mono mt-1">
                  PKR {glSummary.totalCredits.toLocaleString()}
                </p>
                <p className="text-[10px] text-gray-500">Payments & inflows received</p>
              </div>
              <div className="glass-panel p-3.5 rounded-xl border border-white/10 bg-brand-500/5">
                <p className="text-[11px] text-brand-300 uppercase font-bold">General Net Position</p>
                <p className="text-xl font-bold font-mono mt-1 text-white">
                  PKR {glSummary.netBalance.toLocaleString()}
                </p>
                <p className="text-[10px] text-gray-400">Total net book balance</p>
              </div>
              <div className="glass-panel p-3.5 rounded-xl border border-white/10">
                <p className="text-[11px] text-gray-400 uppercase font-semibold">Total Vouchers</p>
                <p className="text-lg font-bold text-blue-400 font-mono mt-1">
                  {glSummary.totalEntries}
                </p>
                <p className="text-[10px] text-gray-500">General ledger postings</p>
              </div>
            </div>

            {/* Master General Ledger Table */}
            {/* Mobile View: Compact, Zero-Horizontal Scroll, Smooth Touch Pan-Y */}
            <div className="block sm:hidden divide-y divide-white/10 touch-pan-y border-t border-white/10">
              {generalLedgerEntries.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-xs">
                  No general ledger entries recorded.
                </div>
              ) : (
                generalLedgerEntries
                  .filter(entry => !searchTerm || entry.party.toLowerCase().includes(searchTerm.toLowerCase()) || entry.description.toLowerCase().includes(searchTerm.toLowerCase()) || (entry.reference || '').toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((entry) => (
                    <div key={entry.id} className="p-3 hover:bg-white/5 transition-colors space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[11px] font-mono text-gray-400 shrink-0">{entry.date}</span>
                          <span className="text-xs font-bold text-white truncate">{entry.party}</span>
                        </div>
                        <span className="font-mono text-[10px] text-brand-300 bg-brand-500/10 px-1.5 py-0.5 rounded border border-brand-500/20 shrink-0">
                          {entry.reference || '-'}
                        </span>
                      </div>

                      <p className="text-[11px] text-gray-200 leading-snug">
                        {entry.description}
                      </p>

                      <div className="flex items-center justify-between pt-1 border-t border-white/5 text-xs font-mono">
                        <div className="flex items-center gap-2">
                          {entry.debit > 0 && (
                            <span className="text-red-400 font-medium">Dr: PKR {entry.debit.toLocaleString()}</span>
                          )}
                          {entry.credit > 0 && (
                            <span className="text-green-400 font-medium">Cr: PKR {entry.credit.toLocaleString()}</span>
                          )}
                        </div>
                        <div className="font-bold text-white">
                          PKR {entry.balance.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>

            {/* Desktop Table: Full View */}
            <div className="hidden sm:block overflow-x-auto touch-pan-y">
              <table className="w-full text-left text-sm text-gray-300 border-t border-white/10 print:table print:text-black print:border-black">
                <thead className="bg-white/5 uppercase text-xs font-semibold text-gray-400 border-b border-white/5 print:text-black print:border-black">
                  <tr>
                    <th className="p-4 w-28">Date</th>
                    <th className="p-4 w-44">Account / Entity</th>
                    <th className="p-4 w-32">Ref / Voucher</th>
                    <th className="p-4">Description</th>
                    <th className="p-4 text-right w-36">Debit (PKR)</th>
                    <th className="p-4 text-right w-36">Credit (PKR)</th>
                    <th className="p-4 text-right w-40">GL Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 print:divide-gray-300">
                  {generalLedgerEntries
                    .filter(entry => !searchTerm || entry.party.toLowerCase().includes(searchTerm.toLowerCase()) || entry.description.toLowerCase().includes(searchTerm.toLowerCase()) || (entry.reference || '').toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((entry) => (
                    <tr key={entry.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 whitespace-nowrap text-xs text-gray-400 print:text-black">{entry.date}</td>
                      <td className="p-4 whitespace-nowrap">
                        <span className="font-semibold text-white text-xs print:text-black">
                          {entry.party}
                        </span>
                        <p className="text-[10px] text-gray-500 print:hidden">{entry.category}</p>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className="font-mono text-xs text-brand-300 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20 print:border-none print:text-black print:bg-transparent">
                          {entry.reference || '-'}
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="text-xs sm:text-sm text-gray-200 print:text-black leading-snug">
                          {entry.description}
                        </p>
                      </td>
                      <td className="p-4 text-right text-red-400 font-mono text-xs sm:text-sm print:text-black">
                        {entry.debit > 0 ? `PKR ${entry.debit.toLocaleString()}` : '-'}
                      </td>
                      <td className="p-4 text-right text-green-400 font-mono text-xs sm:text-sm print:text-black">
                        {entry.credit > 0 ? `PKR ${entry.credit.toLocaleString()}` : '-'}
                      </td>
                      <td className="p-4 text-right font-bold text-white font-mono text-xs sm:text-sm print:text-black">
                        PKR {entry.balance.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {generalLedgerEntries.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center p-8 text-gray-500">
                        No general ledger entries recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'recurring': {
        const totalFixedOverhead = recurringTemplates
          .filter(t => t.isActive && t.type === 'PAYABLE')
          .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

        const activeStaffList = users.filter(u => u.role !== UserRole.CLIENT && (u.status || 'ACTIVE') === 'ACTIVE');
        const totalMonthlySalaries = activeStaffList.reduce((sum, u) => sum + (Number(u.baseSalary) || 0), 0);
        const totalMonthlyOutflow = totalFixedOverhead + totalMonthlySalaries;

        const currentMonthKey = new Date().toISOString().slice(0, 7);

        return (
          <div className="p-4 space-y-6">
            {/* Header & Controls */}
            <div className="bg-slate-900/60 p-5 rounded-2xl border border-white/5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Building size={18} className="text-purple-400" />
                    Monthly Fixed Expenses & Recurring Payments
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[11px] border border-purple-500/30">
                    Automated on 1st of Month
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1 max-w-xl">
                  Office rent, loan installments, security, utilities, and staff base salaries are verified and scheduled to log into <strong>Payables</strong> on the 1st of every month automatically.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handlePostAllMonthlyFixedExpenses}
                  disabled={isPostingRecurring}
                  className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2.5 rounded-xl border border-purple-500/40 flex items-center gap-2 shadow-lg shadow-purple-950/40 transition-all active:scale-95"
                  title="Verify and post all monthly recurring templates and salaries for the 1st of the month"
                >
                  <Zap size={14} className={isPostingRecurring ? 'animate-spin' : ''} />
                  <span>{isPostingRecurring ? 'Posting to Payables...' : 'Post 1st-of-Month Payables Now'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowRecurringModal(true)}
                  className="bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl border border-brand-500/40 flex items-center gap-2 transition-all active:scale-95"
                >
                  <Plus size={14} />
                  <span>Add Fixed Expense</span>
                </button>
              </div>
            </div>

            {/* Notification message */}
            {recurringPostMessage && (
              <div className="p-3 bg-purple-500/20 border border-purple-500/40 rounded-xl flex items-center justify-between text-xs text-purple-200">
                <span className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-purple-400" />
                  {recurringPostMessage}
                </span>
                <button 
                  onClick={() => setRecurringPostMessage(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Monthly Outflow Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <span className="text-[11px] uppercase tracking-wider text-gray-400 block font-medium">Monthly Fixed Overhead</span>
                <div className="text-xl font-mono font-bold text-white mt-1">
                  PKR {totalFixedOverhead.toLocaleString()}
                </div>
                <span className="text-[11px] text-gray-500 mt-1 block">
                  {recurringTemplates.filter(t => t.isActive).length} active fixed templates
                </span>
              </div>

              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <span className="text-[11px] uppercase tracking-wider text-gray-400 block font-medium">Monthly Staff Payroll</span>
                <div className="text-xl font-mono font-bold text-purple-300 mt-1">
                  PKR {totalMonthlySalaries.toLocaleString()}
                </div>
                <span className="text-[11px] text-gray-500 mt-1 block">
                  {activeStaffList.length} active team members
                </span>
              </div>

              <div className="p-4 bg-purple-950/30 rounded-2xl border border-purple-500/20">
                <span className="text-[11px] uppercase tracking-wider text-purple-300 block font-medium">Total Monthly Commitment</span>
                <div className="text-xl font-mono font-bold text-emerald-400 mt-1">
                  PKR {totalMonthlyOutflow.toLocaleString()}
                </div>
                <span className="text-[11px] text-gray-400 mt-1 block">
                  Due on 1st of every month
                </span>
              </div>
            </div>

            {/* Section 1: Configured Recurring Templates */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs uppercase font-bold text-gray-400 tracking-wider">
                  Configured Recurring Templates ({recurringTemplates.length})
                </h4>
              </div>

              {recurringTemplates.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-xs bg-white/5 rounded-2xl border border-white/5">
                  No recurring expense templates configured yet. Click "Add Fixed Expense" to add office rent, loan repayments, or utility bills.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {recurringTemplates.map((template) => {
                    const isPostedThisMonth = payables.some(p => 
                      p.reference && p.reference.toLowerCase().includes(`${template.id}_${currentMonthKey}`.toLowerCase())
                    );

                    return (
                      <div 
                        key={template.id} 
                        className={`p-4 rounded-2xl border transition-all space-y-3 ${
                          template.isActive 
                            ? 'bg-white/5 border-white/10 hover:border-purple-500/40' 
                            : 'bg-black/40 border-white/5 opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-[10px] uppercase font-semibold text-purple-400 block tracking-wider">
                              {template.category}
                            </span>
                            <h5 className="text-sm font-bold text-white truncate">{template.title}</h5>
                            <span className="text-xs text-gray-400 block mt-0.5">Payee: {template.party}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                            template.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {template.isActive ? 'Active' : 'Paused'}
                          </span>
                        </div>

                        <div className="flex items-baseline justify-between pt-2 border-t border-white/5">
                          <span className="text-xs text-gray-400">Scheduled: 1st of month</span>
                          <span className="text-base font-bold font-mono text-white">
                            PKR {Number(template.amount).toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                          <span className={`text-[11px] flex items-center gap-1 ${isPostedThisMonth ? 'text-emerald-400' : 'text-gray-400'}`}>
                            {isPostedThisMonth ? (
                              <>
                                <CheckCircle2 size={12} />
                                <span>Logged in {currentMonthKey}</span>
                              </>
                            ) : (
                              <>
                                <Clock size={12} />
                                <span>Pending for {currentMonthKey}</span>
                              </>
                            )}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleToggleRecurringActive(template)}
                              className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] text-gray-300 border border-white/10 transition-colors"
                            >
                              {template.isActive ? 'Pause' : 'Activate'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRecurringTemplate(template.id)}
                              className="p-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors"
                              title="Delete template"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section 2: Automated Monthly Staff Payroll Preview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs uppercase font-bold text-gray-400 tracking-wider">
                  Automated Monthly Staff Payroll Preview (1st of Month)
                </h4>
                <span className="text-xs text-purple-400 font-medium">
                  {activeStaffList.length} Active Employees
                </span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-white/5 bg-white/5">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="bg-white/5 uppercase text-[10px] text-gray-400 border-b border-white/5 font-semibold">
                    <tr>
                      <th className="p-3">Staff Name</th>
                      <th className="p-3">Designation / Role</th>
                      <th className="p-3">Schedule</th>
                      <th className="p-3 text-right">Base Salary</th>
                      <th className="p-3 text-center">{currentMonthKey} Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {activeStaffList.map((user) => {
                      const salaryRef = `SAL-${user.id}-${currentMonthKey}`;
                      const isPosted = payables.some(p => p.reference === salaryRef);
                      const isPaid = payables.some(p => p.reference === salaryRef && p.status === 'PAID');

                      return (
                        <tr key={user.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-3 font-semibold text-white flex items-center gap-2">
                            <User size={14} className="text-purple-400" />
                            <span>{user.name}</span>
                          </td>
                          <td className="p-3 text-gray-400">{user.role}</td>
                          <td className="p-3 text-gray-400">1st of Every Month</td>
                          <td className="p-3 text-right font-mono font-bold text-white">
                            PKR {(Number(user.baseSalary) || 0).toLocaleString()}
                          </td>
                          <td className="p-3 text-center">
                            {isPaid ? (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-medium">
                                Paid
                              </span>
                            ) : isPosted ? (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-medium">
                                In Payables
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-gray-500/20 text-gray-400 font-medium">
                                Scheduled
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      }

      case 'staff_ledger': {
        const staffPayables = payables.filter(p => 
          p.category === 'Payroll / Salary' || 
          (p.reference && p.reference.startsWith('SAL-')) ||
          p.description.toLowerCase().includes('salary')
        );

        const staffExpenses = financeData.filter(f => 
          f.type === 'EXPENSE' && 
          (f.category === 'Payroll / Salary' || f.description.toLowerCase().includes('salary'))
        );

        const allStaffMembers = Array.from(new Set([
          ...users.filter(u => u.role !== UserRole.CLIENT).map(u => u.name),
          ...staffPayables.map(p => p.party),
          ...staffExpenses.map(e => e.party)
        ])).filter(Boolean);

        const filteredStaffRecords = staffPayables.filter(p => 
          staffFilter === 'ALL' || p.party.trim().toLowerCase() === staffFilter.trim().toLowerCase()
        );

        const totalSalaryBilled = filteredStaffRecords.reduce((sum, p) => sum + p.amount, 0);
        const totalSalaryPaid = filteredStaffRecords.filter(p => p.status === 'PAID').reduce((sum, p) => sum + p.amount, 0);
        const totalSalaryPending = filteredStaffRecords.filter(p => p.status !== 'PAID').reduce((sum, p) => sum + p.amount, 0);

        return (
          <div className="p-4 space-y-4">
            {/* Filter & Summary Header */}
            <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <User size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Staff & Employee Payroll Ledger</h4>
                  <p className="text-xs text-gray-400">Monthly salaries, advances, and payment records.</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-xs text-gray-400 font-medium">Filter Employee:</label>
                <select
                  value={staffFilter}
                  onChange={(e) => setStaffFilter(e.target.value)}
                  className="bg-white/5 text-white text-xs border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-purple-500"
                >
                  <option value="ALL">All Staff Members</option>
                  {allStaffMembers.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <span className="text-[10px] uppercase text-gray-400 block font-medium">Total Salaries Invoiced</span>
                <span className="text-lg font-bold font-mono text-white mt-1 block">PKR {totalSalaryBilled.toLocaleString()}</span>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <span className="text-[10px] uppercase text-gray-400 block font-medium">Salaries Paid to Date</span>
                <span className="text-lg font-bold font-mono text-emerald-400 mt-1 block">PKR {totalSalaryPaid.toLocaleString()}</span>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <span className="text-[10px] uppercase text-gray-400 block font-medium">Pending Unpaid Salaries</span>
                <span className="text-lg font-bold font-mono text-red-400 mt-1 block">PKR {totalSalaryPending.toLocaleString()}</span>
              </div>
            </div>

            {/* Staff Ledger Table */}
            <div className="overflow-x-auto rounded-2xl border border-white/5 bg-white/5">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-white/5 uppercase text-[10px] text-gray-400 border-b border-white/5 font-semibold">
                  <tr>
                    <th className="p-3">Month / Date</th>
                    <th className="p-3">Staff Member</th>
                    <th className="p-3">Description & Ref</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-center no-print">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredStaffRecords.map((entry) => (
                    <tr key={entry.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3 font-mono text-gray-400">{entry.date}</td>
                      <td className="p-3 font-semibold text-white">{entry.party}</td>
                      <td className="p-3 text-gray-300">
                        <span>{entry.description}</span>
                        {entry.reference && <span className="block text-[10px] text-gray-500 font-mono">Ref: {entry.reference}</span>}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-white">
                        PKR {entry.amount.toLocaleString()}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          entry.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {entry.status}
                        </span>
                      </td>
                      <td className="p-3 text-center no-print">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenReceipt(entry)}
                            className="p-1 rounded bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10"
                            title="View Voucher"
                          >
                            <Eye size={12} />
                          </button>
                          {entry.status !== 'PAID' && (
                            <button
                              onClick={() => handleStatusChange(entry.id, payables, setPayables)}
                              className="px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-[10px] font-semibold"
                            >
                              Pay Salary
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredStaffRecords.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-400">No staff salary records found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      case 'transporter_ledger': {
        const transporterPayables = payables.filter(p => 
          p.category === 'Fleet & Transportation' || 
          p.category === 'Transporter' ||
          p.category === 'Vehicle Rent' ||
          p.description.toLowerCase().includes('transporter') ||
          p.description.toLowerCase().includes('freight')
        );

        const allTransporters = Array.from(new Set(transporterPayables.map(p => p.party))).filter(Boolean);

        const filteredTransporters = transporterPayables.filter(p => 
          transporterFilter === 'ALL' || p.party.trim().toLowerCase() === transporterFilter.trim().toLowerCase()
        );

        const totalTransBilled = filteredTransporters.reduce((sum, p) => sum + p.amount, 0);
        const totalTransPaid = filteredTransporters.filter(p => p.status === 'PAID').reduce((sum, p) => sum + p.amount, 0);
        const totalTransPending = filteredTransporters.filter(p => p.status !== 'PAID').reduce((sum, p) => sum + p.amount, 0);

        return (
          <div className="p-4 space-y-4">
            {/* Filter & Summary Header */}
            <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Truck size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Transporter/Broker & Fleet Logistics Ledger</h4>
                  <p className="text-xs text-gray-400">Trucking charges, broker commission, container haulage, and carrier payables.</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-xs text-gray-400 font-medium">Filter Transporter/Broker:</label>
                <select
                  value={transporterFilter}
                  onChange={(e) => setTransporterFilter(e.target.value)}
                  className="bg-white/5 text-white text-xs border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                >
                  <option value="ALL">All Transporters/Brokers & Fleets</option>
                  {allTransporters.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <span className="text-[10px] uppercase text-gray-400 block font-medium">Total Freight Billed</span>
                <span className="text-lg font-bold font-mono text-white mt-1 block">PKR {totalTransBilled.toLocaleString()}</span>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <span className="text-[10px] uppercase text-gray-400 block font-medium">Freight Paid to Date</span>
                <span className="text-lg font-bold font-mono text-emerald-400 mt-1 block">PKR {totalTransPaid.toLocaleString()}</span>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <span className="text-[10px] uppercase text-gray-400 block font-medium">Outstanding Carrier Dues</span>
                <span className="text-lg font-bold font-mono text-red-400 mt-1 block">PKR {totalTransPending.toLocaleString()}</span>
              </div>
            </div>

            {/* Transporter Ledger Table */}
            <div className="overflow-x-auto rounded-2xl border border-white/5 bg-white/5">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-white/5 uppercase text-[10px] text-gray-400 border-b border-white/5 font-semibold">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Transporter/Broker / Fleet</th>
                    <th className="p-3">Description & Route</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-center no-print">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredTransporters.map((entry) => (
                    <tr key={entry.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3 font-mono text-gray-400">{entry.date}</td>
                      <td className="p-3 font-semibold text-white">{entry.party}</td>
                      <td className="p-3 text-gray-300">
                        <span>{entry.description}</span>
                        {entry.reference && <span className="block text-[10px] text-gray-500 font-mono">Ref: {entry.reference}</span>}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-white">
                        PKR {entry.amount.toLocaleString()}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          entry.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {entry.status}
                        </span>
                      </td>
                      <td className="p-3 text-center no-print">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenReceipt(entry)}
                            className="p-1 rounded bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10"
                            title="View Voucher"
                          >
                            <Eye size={12} />
                          </button>
                          {entry.status !== 'PAID' && (
                            <button
                              onClick={() => handleStatusChange(entry.id, payables, setPayables)}
                              className="px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-[10px] font-semibold"
                            >
                              Pay Now
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredTransporters.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-400">No transporter ledger records found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      case 'vendor_ledger': {
        const vendorCategoriesList = [
          'ALL',
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

        // If a specific vendor is selected, display their detailed ledger!
        if (selectedVendorForLedger) {
          const totalDebits = filteredVendorLedgerEntries.reduce((s, e) => s + e.debit, 0);
          const totalCredits = filteredVendorLedgerEntries.reduce((s, e) => s + e.credit, 0);
          const netBalance = filteredVendorLedgerEntries.length > 0 ? filteredVendorLedgerEntries[filteredVendorLedgerEntries.length - 1].balance : 0;

          return (
            <div className="p-4 space-y-4 animate-fade-in">
              {/* Back to Vendor Directory & Top Controls */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10 no-print">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedVendorForLedger(null)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition-colors flex items-center gap-1.5 text-xs font-semibold"
                  >
                    <ArrowLeft size={16} />
                    <span>Back to Vendors List</span>
                  </button>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>{selectedVendorForLedger.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
                        {selectedVendorForLedger.category}
                      </span>
                    </h3>
                    <p className="text-xs text-gray-400">
                      {selectedVendorForLedger.companyTitle || selectedVendorForLedger.name} • {selectedVendorForLedger.contactNumber || 'No Contact'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      setTransactionType('EXPENSE');
                      setNewTransaction({
                        description: `Payment to ${selectedVendorForLedger.name} for ${selectedVendorForLedger.category}`,
                        amount: 0,
                        party: selectedVendorForLedger.name,
                        paymentMethod: 'CASH',
                        bankId: '',
                        transactionId: ''
                      });
                      setIsOtherClient(false);
                      setShowAddModal(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20"
                  >
                    <Plus size={14} />
                    <span>Pay Bill / Add Payment</span>
                  </button>

                  <button
                    onClick={() => {
                      setTransactionType('PAYABLE');
                      setNewTransaction({
                        description: `${selectedVendorForLedger.category} Bill - ${selectedVendorForLedger.name}`,
                        amount: 0,
                        party: selectedVendorForLedger.name,
                        paymentMethod: 'CASH',
                        bankId: '',
                        transactionId: ''
                      });
                      setIsOtherClient(false);
                      setShowAddModal(true);
                    }}
                    className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-amber-600/20"
                  >
                    <Plus size={14} />
                    <span>Add Payable Bill</span>
                  </button>

                  <button
                    onClick={handleDownloadVendorLedger}
                    disabled={isExportingPdf}
                    className="bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-brand-600/20"
                  >
                    <Download size={14} />
                    <span>Download PDF Statement</span>
                  </button>
                </div>
              </div>

              {/* Date Range Selection Bar */}
              <div className="bg-slate-900/60 p-3.5 rounded-xl border border-white/10 flex flex-wrap items-center justify-between gap-3 no-print">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-gray-400 font-medium flex items-center gap-1">
                    <Calendar size={14} className="text-brand-400" /> Date Range:
                  </span>
                  <input
                    type="date"
                    value={ledgerStartDate}
                    onChange={(e) => setLedgerStartDate(e.target.value)}
                    className="bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-brand-500"
                    placeholder="Start Date"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="date"
                    value={ledgerEndDate}
                    onChange={(e) => setLedgerEndDate(e.target.value)}
                    className="bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-brand-500"
                    placeholder="End Date"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setLedgerStartDate('');
                      setLedgerEndDate(new Date().toISOString().split('T')[0]);
                    }}
                    className="px-3 py-1.5 bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/30 rounded-lg text-xs font-semibold transition"
                  >
                    From Start to Today
                  </button>
                  {(ledgerStartDate || ledgerEndDate) && (
                    <button
                      type="button"
                      onClick={() => {
                        setLedgerStartDate('');
                        setLedgerEndDate('');
                      }}
                      className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg text-xs"
                    >
                      Clear Filter
                    </button>
                  )}
                </div>
                <span className="text-xs text-gray-400 font-mono">
                  Showing {filteredVendorLedgerEntries.length} of {vendorLedgerEntries.length} records
                </span>
              </div>

              {/* Vendor Stats Highlights */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 no-print">
                <div className="glass-panel p-3.5 rounded-xl border border-white/10">
                  <p className="text-[11px] text-gray-400 uppercase font-semibold">Total Incurred / Billed</p>
                  <p className="text-lg font-bold text-red-400 font-mono mt-1">
                    PKR {totalDebits.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-gray-500">Utility bills & vendor payables</p>
                </div>
                <div className="glass-panel p-3.5 rounded-xl border border-white/10">
                  <p className="text-[11px] text-gray-400 uppercase font-semibold">Total Paid to Vendor</p>
                  <p className="text-lg font-bold text-green-400 font-mono mt-1">
                    PKR {totalCredits.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-gray-500">Cashbook settled payments</p>
                </div>
                <div className="glass-panel p-3.5 rounded-xl border border-white/10 bg-brand-500/5">
                  <p className="text-[11px] text-brand-300 uppercase font-bold">Net Balance (Payable Due)</p>
                  <p className={`text-xl font-bold font-mono mt-1 ${netBalance > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    PKR {netBalance.toLocaleString()}
                  </p>
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold mt-1 ${netBalance > 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                    {netBalance > 0 ? 'Payable Due' : 'Account Settled'}
                  </span>
                </div>
              </div>

              {/* Mobile View */}
              <div className="block sm:hidden divide-y divide-white/10 touch-pan-y border-t border-white/10">
                {filteredVendorLedgerEntries.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 text-xs">
                    No transactions recorded for this vendor.
                  </div>
                ) : (
                  filteredVendorLedgerEntries.map((entry) => (
                    <div key={entry.id} className="p-3 hover:bg-white/5 transition-colors space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[11px] font-mono text-gray-400 shrink-0">{entry.date}</span>
                          <span className="font-mono text-[10px] text-brand-300 bg-brand-500/10 px-1.5 py-0.5 rounded border border-brand-500/20 truncate">
                            {entry.reference || '-'}
                          </span>
                        </div>
                        {entry.credit > 0 && (
                          <button
                            onClick={() => handleOpenReceipt({
                              id: entry.id,
                              date: entry.date,
                              party: selectedVendorForLedger.name,
                              type: 'EXPENSE',
                              amount: entry.credit,
                              description: entry.description,
                              reference: entry.reference || 'VND-EXP',
                              status: 'PAID'
                            } as any)}
                            className="text-brand-400 hover:text-white text-[10px] font-semibold px-2 py-0.5 rounded bg-brand-600/20 border border-brand-500/30 flex items-center gap-1 shrink-0"
                          >
                            <Eye size={10} /> Voucher
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-200 leading-snug">{entry.description}</p>
                      <div className="flex items-center justify-between pt-1 border-t border-white/5 text-xs font-mono">
                        <div className="flex items-center gap-2">
                          {entry.debit > 0 && <span className="text-red-400">Dr: PKR {entry.debit.toLocaleString()}</span>}
                          {entry.credit > 0 && <span className="text-green-400">Cr: PKR {entry.credit.toLocaleString()}</span>}
                        </div>
                        <div className="font-bold">
                          <span className={entry.balance > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                            Bal: PKR {entry.balance.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto touch-pan-y">
                <table className="w-full text-left text-sm text-gray-300 border-t border-white/10">
                  <thead className="bg-white/5 uppercase text-xs font-semibold text-gray-400 border-b border-white/5">
                    <tr>
                      <th className="p-4 w-28">Date</th>
                      <th className="p-4 w-36">Voucher / Ref</th>
                      <th className="p-4">Particulars & Description</th>
                      <th className="p-4 text-right w-36">Debit (Bill)</th>
                      <th className="p-4 text-right w-36">Credit (Paid)</th>
                      <th className="p-4 text-right w-40">Running Balance</th>
                      <th className="p-4 text-center w-28 no-print">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredVendorLedgerEntries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 whitespace-nowrap text-xs text-gray-400">{entry.date}</td>
                        <td className="p-4 whitespace-nowrap">
                          <span className="font-mono text-xs text-brand-300 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
                            {entry.reference || '-'}
                          </span>
                        </td>
                        <td className="p-4">
                          <p className="font-medium text-white text-xs sm:text-sm">{entry.description}</p>
                        </td>
                        <td className="p-4 text-right text-red-400 font-mono text-xs sm:text-sm">
                          {entry.debit > 0 ? `PKR ${entry.debit.toLocaleString()}` : '-'}
                        </td>
                        <td className="p-4 text-right text-green-400 font-mono text-xs sm:text-sm">
                          {entry.credit > 0 ? `PKR ${entry.credit.toLocaleString()}` : '-'}
                        </td>
                        <td className="p-4 text-right font-bold font-mono text-xs sm:text-sm">
                          <span className={entry.balance > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                            PKR {entry.balance.toLocaleString()}
                          </span>
                        </td>
                        <td className="p-4 text-center no-print">
                          {entry.credit > 0 && (
                            <button
                              onClick={() => handleOpenReceipt({
                                id: entry.id,
                                date: entry.date,
                                party: selectedVendorForLedger.name,
                                type: 'EXPENSE',
                                amount: entry.credit,
                                description: entry.description,
                                reference: entry.reference || 'VND-EXP',
                                status: 'PAID'
                              } as any)}
                              className="text-brand-400 hover:text-white text-xs font-semibold px-2 py-1 rounded bg-brand-600/20 border border-brand-500/30 inline-flex items-center gap-1"
                            >
                              <Eye size={12} /> Voucher
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredVendorLedgerEntries.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-gray-500">
                          No ledger records found for this vendor.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        }

        // Otherwise, render All Vendors Directory
        const filteredVendorsList = vendors.filter(v => {
          const matchesCat = vendorCategoryFilter === 'ALL' || v.category === vendorCategoryFilter;
          const matchesSearch = !vendorSearchQuery || 
            v.name.toLowerCase().includes(vendorSearchQuery.toLowerCase()) || 
            (v.companyTitle && v.companyTitle.toLowerCase().includes(vendorSearchQuery.toLowerCase())) ||
            v.category.toLowerCase().includes(vendorSearchQuery.toLowerCase());
          return matchesCat && matchesSearch;
        });

        // Compute summary metrics for all vendors
        const totalVendorPaid = financeData
          .filter(f => f.type === 'EXPENSE' && vendors.some(v => v.name.toLowerCase() === (f.party || '').toLowerCase()))
          .reduce((sum, f) => sum + f.amount, 0);

        const totalVendorPending = payables
          .filter(p => p.status !== 'PAID' && vendors.some(v => v.name.toLowerCase() === (p.party || '').toLowerCase()))
          .reduce((sum, p) => sum + p.amount, 0);

        return (
          <div className="p-4 space-y-4 animate-fade-in">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Building className="text-brand-400" size={20} />
                  <span>Vendors & Utility Accounts</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Drinking water, electric bills, gas, internet, office rent, stationery, maintenance, legal & misc vendors
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowAddVendorModal(true)}
                  className="bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-brand-600/20"
                >
                  <Plus size={16} />
                  <span>Register New Vendor</span>
                </button>
              </div>
            </div>

            {/* Summary Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="glass-panel p-4 rounded-xl border border-white/10">
                <p className="text-xs text-gray-400 uppercase font-semibold">Total Registered Vendors</p>
                <p className="text-2xl font-bold text-white font-mono mt-1">{vendors.length}</p>
                <p className="text-[10px] text-gray-500">Utilities, maintenance, services</p>
              </div>
              <div className="glass-panel p-4 rounded-xl border border-white/10">
                <p className="text-xs text-gray-400 uppercase font-semibold">Total Bills Settled / Paid</p>
                <p className="text-2xl font-bold text-emerald-400 font-mono mt-1">PKR {totalVendorPaid.toLocaleString()}</p>
                <p className="text-[10px] text-gray-500">Paid from cashbook accounts</p>
              </div>
              <div className="glass-panel p-4 rounded-xl border border-white/10">
                <p className="text-xs text-gray-400 uppercase font-semibold">Pending Vendor Bills</p>
                <p className="text-2xl font-bold text-amber-400 font-mono mt-1">PKR {totalVendorPending.toLocaleString()}</p>
                <p className="text-[10px] text-gray-500">Awaiting payment voucher</p>
              </div>
            </div>

            {/* Category Filter Pills & Search */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-white/5">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                <Filter size={14} className="text-gray-400 shrink-0 ml-1" />
                <div className="flex gap-1.5 flex-nowrap">
                  {vendorCategoriesList.slice(0, 7).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setVendorCategoryFilter(cat)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                        vendorCategoryFilter === cat
                          ? 'bg-brand-600 text-white shadow-sm'
                          : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {cat === 'ALL' ? 'All Categories' : cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative min-w-[220px]">
                <Search className="absolute left-3 top-2.5 text-gray-500" size={14} />
                <input
                  type="text"
                  placeholder="Search vendor or utility..."
                  value={vendorSearchQuery}
                  onChange={(e) => setVendorSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white outline-none focus:border-brand-500"
                />
              </div>
            </div>

            {/* Vendors Table */}
            <div className="glass-card rounded-xl border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-200">
                  <thead className="bg-slate-950 uppercase font-semibold text-gray-400 border-b border-white/10">
                    <tr>
                      <th className="p-3.5">Vendor Name</th>
                      <th className="p-3.5">Category</th>
                      <th className="p-3.5">Company / Title</th>
                      <th className="p-3.5">Contact & Address</th>
                      <th className="p-3.5 text-right">Total Paid</th>
                      <th className="p-3.5 text-right">Pending Bills</th>
                      <th className="p-3.5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 bg-slate-900/40">
                    {filteredVendorsList.map((v) => {
                      const vPaid = financeData
                        .filter(f => f.type === 'EXPENSE' && f.party && f.party.toLowerCase() === v.name.toLowerCase())
                        .reduce((sum, f) => sum + f.amount, 0);
                      const vPending = payables
                        .filter(p => p.status !== 'PAID' && p.party && p.party.toLowerCase() === v.name.toLowerCase())
                        .reduce((sum, p) => sum + p.amount, 0);

                      return (
                        <tr key={v.id} className="hover:bg-white/5 transition">
                          <td className="p-3.5">
                            <span className="font-bold text-white text-sm">{v.name}</span>
                            {v.isRecurring && (
                              <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                Monthly Recurring
                              </span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <span className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-gray-300 font-medium">
                              {v.category}
                            </span>
                          </td>
                          <td className="p-3.5 text-gray-300 font-medium">{v.companyTitle || '-'}</td>
                          <td className="p-3.5 text-gray-400">
                            <div>{v.contactNumber || '-'}</div>
                            <div className="text-[10px] text-gray-500 truncate max-w-xs">{v.address || '-'}</div>
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold text-emerald-400">
                            PKR {vPaid.toLocaleString()}
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold text-amber-400">
                            PKR {vPending.toLocaleString()}
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedVendorForLedger(v);
                                  setLedgerStartDate('');
                                  setLedgerEndDate('');
                                }}
                                className="px-2.5 py-1.5 bg-brand-600/20 hover:bg-brand-600 text-brand-300 hover:text-white border border-brand-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                                title="Check detailed ledger for this vendor"
                              >
                                <FileText size={12} />
                                <span>Check Ledger</span>
                              </button>
                              <button
                                onClick={() => {
                                  setTransactionType('EXPENSE');
                                  setNewTransaction({
                                    description: `Payment to ${v.name} for ${v.category}`,
                                    amount: 0,
                                    party: v.name,
                                    paymentMethod: 'CASH',
                                    bankId: '',
                                    transactionId: ''
                                  });
                                  setIsOtherClient(false);
                                  setShowAddModal(true);
                                }}
                                className="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 rounded-lg text-xs font-semibold transition"
                                title="Record payment in Cashbook"
                              >
                                Pay Bill
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredVendorsList.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-gray-500 text-xs">
                          No vendors found matching criteria. Click "+ Register New Vendor" to add one.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      }

      case 'cashbook':
      default: {
        const filteredFinance = financeData.filter(entry => 
          !searchTerm || 
          entry.party.toLowerCase().includes(searchTerm.toLowerCase()) || 
          entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (entry.reference && entry.reference.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        return (
          <>
            {/* Mobile View: Compact, Zero-Horizontal Scroll, Smooth Touch Pan-Y */}
            <div className="block sm:hidden divide-y divide-white/10 touch-pan-y">
              {filteredFinance.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-xs">No records found.</div>
              ) : (
                filteredFinance.map((entry) => (
                  <div key={entry.id} className="p-3 hover:bg-white/5 transition-colors space-y-1.5">
                    {/* Top Row: Date, Party, Type & Status */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[11px] font-mono text-gray-400 shrink-0">{entry.date}</span>
                        <span className="text-xs font-bold text-white truncate">{entry.party}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          entry.type === 'INCOME' || entry.type === 'RECEIVABLE' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {entry.type}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          entry.status === 'PAID' ? 'bg-green-500/20 text-green-400' : 
                          entry.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {entry.status}
                        </span>
                      </div>
                    </div>

                    {/* Middle: Description & Category / Ref */}
                    <p className="text-[11px] text-gray-300 leading-snug line-clamp-2">
                      {entry.description}
                      <span className="text-[10px] text-gray-500 block">
                        {entry.category} • {entry.reference} {entry.bankName ? `• ${entry.bankName}` : ''}
                      </span>
                    </p>

                    {/* Bottom: Amount + Compact Action Buttons */}
                    <div className="flex items-center justify-between pt-1 border-t border-white/5">
                      <div className="text-xs font-bold font-mono text-white">
                        PKR {entry.amount.toLocaleString()}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => handleOpenReceipt(entry)}
                          className="text-brand-400 hover:text-white text-[11px] font-semibold px-2 py-0.5 rounded bg-brand-600/20 border border-brand-500/30 flex items-center gap-1"
                          title="View Official Receipt"
                        >
                          <Eye size={11} />
                          <span>Receipt</span>
                        </button>
                        <button 
                          onClick={() => handleDirectDownloadReceipt(entry)}
                          className="text-emerald-400 hover:text-white p-1 rounded bg-emerald-600/20 border border-emerald-500/30"
                          title="Direct Download Receipt PDF"
                        >
                          <Download size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table: Full View */}
            <div className="hidden sm:block overflow-x-auto touch-pan-y">
              <table className="w-full text-left text-sm text-gray-300 print:table print:text-black">
                <thead className="bg-white/5 uppercase text-xs font-semibold text-gray-400 border-b border-white/5 print:text-black print:border-black">
                  <tr>
                    <th className="p-4">Date</th>
                    <th className="p-4">Description</th>
                    <th className="p-4">Party</th>
                    <th className="p-4">Type</th>
                    <th className="p-4 text-right">Amount</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center no-print">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 print:divide-gray-300">
                  {filteredFinance.map((entry) => (
                    <tr key={entry.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4">{entry.date}</td>
                      <td className="p-4">
                        <p className="font-medium text-white print:text-black">{entry.description}</p>
                        <p className="text-xs text-gray-500 print:text-black">
                          {entry.category} • {entry.reference} {entry.bankName ? `• ${entry.bankName}` : ''}
                        </p>
                      </td>
                      <td className="p-4 font-medium text-white print:text-black">{entry.party}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium 
                          ${entry.type === 'INCOME' || entry.type === 'RECEIVABLE' ? 'bg-green-500/20 text-green-400 print:text-black print:border print:border-black' : 'bg-red-500/20 text-red-400 print:text-black print:border print:border-black'}`}>
                          {entry.type}
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono text-white print:text-black">PKR {entry.amount.toLocaleString()}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium 
                          ${entry.status === 'PAID' ? 'bg-green-500/20 text-green-400 print:text-black print:border print:border-black' : 
                            entry.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400 print:text-black print:border print:border-black' : 'bg-blue-500/20 text-blue-400 print:text-black print:border print:border-black'}`}>
                          {entry.status}
                        </span>
                      </td>
                      <td className="p-4 text-center no-print">
                        <div className="flex items-center justify-center gap-1.5">
                          <button 
                            onClick={() => handleOpenReceipt(entry)}
                            className="text-brand-400 hover:text-white transition-colors text-xs font-semibold px-2.5 py-1 rounded bg-brand-600/20 border border-brand-500/30 flex items-center gap-1"
                            title="View Official Receipt"
                          >
                            <Eye size={12} />
                            <span>Receipt</span>
                          </button>
                          <button 
                            onClick={() => handleDirectDownloadReceipt(entry)}
                            className="text-emerald-400 hover:text-white transition-colors text-xs font-semibold p-1.5 rounded bg-emerald-600/20 border border-emerald-500/30"
                            title="Direct Download Receipt PDF"
                          >
                            <Download size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredFinance.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-400">No records found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        );
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 printable-content">
      {/* Print Header */}
      <div className="hidden print:block mb-8 border-b-2 border-black pb-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Logo className="h-16 w-auto max-w-[210px] object-contain shrink-0" customSrc={activeLogo} />
            <div className="flex flex-col justify-center text-left">
              <h1 className="text-2xl font-bold text-black uppercase tracking-wider leading-tight">{companyName}</h1>
              {subtitle && <p className="text-xs text-gray-700 font-medium">{subtitle}</p>}
              <p className="text-[11px] text-gray-600 mt-0.5">{branding.address} • Tel: {branding.phone} • Cell: {branding.cell} • Email: {branding.email}</p>
              <p className="text-xs font-semibold text-black mt-1 uppercase">Financial Book & Statement: {tabs.find(t => t.id === activeTab)?.label}</p>
            </div>
          </div>
          <div className="text-right text-xs text-gray-700 shrink-0">
            <p className="font-semibold text-black">Date: {new Date().toLocaleDateString()}</p>
            <p>Active View: {tabs.find(t => t.id === activeTab)?.label}</p>
          </div>
        </div>
      </div>

      {/* Mobile-Friendly PDF Download Alert / Notification Banner */}
      {(isExportingPdf || pdfSuccessMessage || pdfErrorMessage) && (
        <div className="no-print animate-fade-in">
          {isExportingPdf && (
            <div className="p-3.5 bg-brand-500/15 border border-brand-500/40 rounded-xl flex items-center gap-3 text-brand-300 text-xs sm:text-sm shadow-lg">
              <Loader2 size={18} className="animate-spin text-brand-400 shrink-0" />
              <span>Generating PDF statement...</span>
            </div>
          )}
          {pdfSuccessMessage && (
            <div className="p-4 bg-emerald-950/80 border border-emerald-500/40 rounded-xl space-y-2 shadow-2xl backdrop-blur-md">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                  <CheckCircle2 size={18} className="shrink-0" />
                  <span>{pdfSuccessMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPdfSuccessMessage(null)}
                  className="text-xs text-gray-400 hover:text-white px-2 py-1"
                >
                  ✕ Close
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {directDownloadUrl && (
                  <>
                    <a
                      href={directDownloadUrl}
                      download={directDownloadFilename}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow active:scale-95 transition-all"
                    >
                      <Download size={14} /> Download File
                    </a>
                    <button
                      type="button"
                      onClick={() => setIsPdfViewerOpen(true)}
                      className="bg-white/10 hover:bg-white/20 text-white font-medium text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 border border-white/20 active:scale-95 transition-all"
                    >
                      <Eye size={14} /> View PDF
                    </button>
                    {typeof navigator !== 'undefined' && 'share' in navigator && (
                      <button
                        type="button"
                        onClick={() => sharePdfFile(directDownloadUrl, directDownloadFilename, directDownloadFilename)}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow active:scale-95 transition-all"
                      >
                        <Share2 size={14} /> Save to Mobile
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
          {pdfErrorMessage && (
            <div className="p-3.5 bg-red-500/20 border border-red-500/40 rounded-xl flex items-center justify-between gap-2 text-red-300 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <AlertCircle size={18} className="text-red-400 shrink-0" />
                <span>{pdfErrorMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setPdfErrorMessage(null)}
                className="text-xs text-gray-400 hover:text-white px-2 py-1"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 no-print">
        <StatCard 
          title="Cash in Hand" 
          amount={cashbookSummary.netCashBalance} 
          type={cashbookSummary.netCashBalance >= 0 ? 'pos' : 'neg'} 
          icon={Wallet} 
          subtitle="Real-time Cash & Bank Balance" 
          badge="Live"
          onClick={() => {
            setStatSearchQuery('');
            setStatFilterSubtab('ALL');
            setStatBreakdownModal('cash_in_hand');
          }}
        />
        <StatCard 
          title="Total Receivables" 
          amount={receivablesSummary.totalOutstanding} 
          type="pos" 
          icon={ArrowDownLeft} 
          subtitle={`${receivablesSummary.pendingCount} unpaid client bills`} 
          badge="Live"
          onClick={() => {
            setStatSearchQuery('');
            setStatFilterSubtab('ALL');
            setStatBreakdownModal('receivables');
          }}
        />
        <StatCard 
          title="Total Payables" 
          amount={payablesSummary.totalPending} 
          type="neg" 
          icon={ArrowUpRight} 
          subtitle={`${payablesSummary.pendingCount} pending expense & dues`} 
          badge="Live"
          onClick={() => {
            setStatSearchQuery('');
            setStatFilterSubtab('ALL');
            setStatBreakdownModal('payables');
          }}
        />
        <StatCard 
          title="Total Received Amount" 
          amount={currentMonthReceivedSummary.totalAmount} 
          type="pos" 
          icon={Banknote} 
          subtitle={`1st ${currentMonthReceivedSummary.monthName} to Today (${currentMonthReceivedSummary.count} receipts)`} 
          badge="This Month"
          onClick={() => {
            setStatSearchQuery('');
            setStatFilterSubtab('ALL');
            setStatBreakdownModal('received_amount');
          }}
        />
      </div>

      {/* Action Buttons: Payable, Receivable, Payment Received, Payment Paid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 no-print">
        <button 
          onClick={() => { setTransactionType('PAYABLE'); setShowAddModal(true); }}
          className="glass-panel hover:bg-red-500/10 border-red-500/20 text-red-400 p-4 rounded-2xl flex flex-col items-center gap-2 transition-all shadow-sm"
        >
          <ArrowUpRight size={24} />
          <span className="font-medium text-sm">Add Payable</span>
        </button>
        <button 
          onClick={() => { setTransactionType('RECEIVABLE'); setShowAddModal(true); }}
          className="glass-panel hover:bg-green-500/10 border-green-500/20 text-green-400 p-4 rounded-2xl flex flex-col items-center gap-2 transition-all shadow-sm"
        >
          <ArrowDownLeft size={24} />
          <span className="font-medium text-sm">Add Receivable</span>
        </button>
        <button 
          onClick={() => { 
            setTransactionType('INCOME'); 
            setNewTransaction({
              description: 'Payment Received',
              amount: 0,
              party: activeTab === 'client_ledger' ? selectedLedgerClient : '',
              paymentMethod: 'CASH',
              bankId: '',
              transactionId: ''
            });
            setIsOtherClient(false);
            setOtherClientName('');
            setShowAddModal(true); 
          }}
          className="glass-panel bg-brand-600/25 hover:bg-brand-600/40 border-brand-500/40 text-white p-4 rounded-2xl flex flex-col items-center gap-2 transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)] hover:scale-[1.02]"
        >
          <Banknote size={24} className="text-emerald-400" />
          <span className="font-semibold text-sm">Payment Received</span>
        </button>
        <button 
          onClick={() => { 
            setTransactionType('EXPENSE'); 
            setNewTransaction({
              description: 'Payment Paid',
              amount: 0,
              party: '',
              paymentMethod: 'CASH',
              bankId: '',
              transactionId: ''
            });
            setIsOtherClient(false);
            setOtherClientName('');
            setShowAddModal(true); 
          }}
          className="glass-panel bg-brand-600/20 hover:bg-brand-600/30 border-brand-500/30 text-white p-4 rounded-2xl flex flex-col items-center gap-2 transition-all shadow-sm"
        >
          <CreditCard size={24} className="text-brand-400" />
          <span className="font-medium text-sm">Payment Paid</span>
        </button>
      </div>

      {/* Quick Action Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-900/80 border border-white/10 rounded-2xl no-print">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setTransactionType('INCOME');
              setNewTransaction({
                description: 'Bank Deposit Payment Received',
                amount: 0,
                party: activeTab === 'client_ledger' ? selectedLedgerClient : '',
                paymentMethod: 'BANK',
                bankId: '',
                bankName: 'Meezan Bank Ltd',
                transactionId: '',
                slipUrl: ''
              });
              setIsOtherClient(false);
              setOtherClientName('');
              setShowAddModal(true);
            }}
            className="px-3.5 py-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Banknote size={15} />
            <span>Add Payment (Deposit Proof Only)</span>
          </button>

          <button
            onClick={() => setActiveTab('client_ledger')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              activeTab === 'client_ledger'
                ? 'bg-brand-600 border-brand-500 text-white shadow-sm'
                : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Briefcase size={15} />
            <span>Check Ledger</span>
          </button>

          <button
            onClick={() => setActiveTab('receivables')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              activeTab === 'receivables'
                ? 'bg-brand-600 border-brand-500 text-white shadow-sm'
                : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <FileText size={15} />
            <span>Check Invoice</span>
          </button>

          <button
            onClick={() => setShowAllInvoicesModal(true)}
            className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Layers size={15} className="text-amber-400" />
            <span>All Invoices (Table & Download)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('vendor_ledger');
              setSelectedVendorForLedger(null);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              activeTab === 'vendor_ledger'
                ? 'bg-brand-600 border-brand-500 text-white shadow-sm'
                : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Building size={15} className="text-purple-400" />
            <span>Vendor Details</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddVendorModal(true)}
            className="px-3 py-2 bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Plus size={14} />
            <span>+ Add Vendor</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="glass-card rounded-2xl overflow-hidden min-h-[500px] flex flex-col print:border-none print:shadow-none">
        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto border-b border-white/5 bg-black/20 custom-scrollbar no-print">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex-shrink-0
                ${activeTab === tab.id ? 'border-brand-500 text-white bg-white/5 font-semibold' : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5'}
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-white/5 flex flex-wrap gap-3 justify-between items-center bg-white/5 backdrop-blur-sm no-print relative z-20">
          <div className="flex items-center gap-2 glass-input rounded-lg px-3 py-2 w-full sm:w-72">
            <Search size={18} className="text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by party, case no, ref..." 
              className="bg-transparent border-none text-white text-sm focus:outline-none w-full placeholder-gray-500" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="text-gray-400 hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex gap-2 relative">
            <button 
              onClick={() => setShowFilter(!showFilter)}
              className={`flex items-center gap-2 px-3.5 py-2 border text-gray-300 rounded-lg text-sm transition-colors
                ${showFilter ? 'bg-brand-600 border-brand-500 text-white' : 'bg-white/5 border-white/10 hover:bg-white/10'}
              `}
            >
              <Filter size={16} /> Date Filter
            </button>
            <button 
              onClick={handleDownloadGeneralLedger}
              className="flex items-center gap-2 px-3.5 py-2 bg-white/5 border border-white/10 text-gray-300 rounded-lg text-sm hover:bg-white/10 transition-colors"
              title="Download Statement (PDF)"
            >
              <Download size={16} className="text-emerald-400" /> Download Statement (PDF)
            </button>

            {/* Dropdown Filter */}
            {showFilter && (
              <div className="absolute top-full right-0 mt-2 w-60 bg-slate-900 border border-white/15 rounded-xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95">
                <p className="text-xs font-bold text-gray-400 uppercase mb-3">Filter By Date</p>
                <div className="space-y-1.5">
                  <button 
                    onClick={() => { setDateFilter('ALL'); setShowFilter(false); }}
                    className={`w-full text-left text-xs p-2 rounded transition-colors ${dateFilter === 'ALL' ? 'bg-brand-600 text-white' : 'text-gray-300 hover:bg-white/10'}`}
                  >
                    All History
                  </button>
                  <button 
                    onClick={() => { setDateFilter('TODAY'); setShowFilter(false); }}
                    className={`w-full text-left text-xs p-2 rounded transition-colors ${dateFilter === 'TODAY' ? 'bg-brand-600 text-white' : 'text-gray-300 hover:bg-white/10'}`}
                  >
                    Today
                  </button>
                  <button 
                    onClick={() => { setDateFilter('WEEK'); setShowFilter(false); }}
                    className={`w-full text-left text-xs p-2 rounded transition-colors ${dateFilter === 'WEEK' ? 'bg-brand-600 text-white' : 'text-gray-300 hover:bg-white/10'}`}
                  >
                    This Week
                  </button>
                  <button 
                    onClick={() => { setDateFilter('MONTH'); setShowFilter(false); }}
                    className={`w-full text-left text-xs p-2 rounded transition-colors ${dateFilter === 'MONTH' ? 'bg-brand-600 text-white' : 'text-gray-300 hover:bg-white/10'}`}
                  >
                    This Month
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Table / List Content - Touch-Optimized for Mobile Vertical Scrolling */}
        <div className="w-full overflow-x-hidden sm:overflow-x-auto custom-scrollbar flex-1 touch-pan-y">
          {renderTableContent()}
        </div>
      </div>

      {/* Add Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200 no-print">
          <div className="glass-card p-6 rounded-2xl w-full max-w-md shadow-2xl border border-white/15 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-white/10">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {transactionType === 'INCOME' ? 'Receive Payment' : 
                   transactionType === 'EXPENSE' ? 'Make Payment' : 
                   transactionType === 'RECEIVABLE' ? 'Add Receivable' : 'Add Payable'}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {transactionType === 'INCOME' ? 'Record received payment & generate instant official receipt' : 
                   transactionType === 'EXPENSE' ? 'Record expense payment' :
                   transactionType === 'RECEIVABLE' ? 'Record receivable bill & generate invoice' : 'Record payable bill amount to be settled'}
                </p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white p-1">
                <X size={20}/>
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Payment Method (Dropdown for Payments only) */}
              {(transactionType === 'INCOME' || transactionType === 'EXPENSE') && (
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-300 font-medium">Payment Mode</label>
                  <select
                    className="w-full glass-input rounded-xl p-2.5 outline-none text-sm text-white bg-slate-900 border border-white/15"
                    value={newTransaction.paymentMethod || 'CASH'}
                    onChange={(e) => setNewTransaction({ ...newTransaction, paymentMethod: e.target.value as 'CASH' | 'BANK' })}
                  >
                    <option value="CASH">Cash In Hand</option>
                    <option value="BANK">Bank Deposit / Transfer</option>
                  </select>
                </div>
              )}

              {/* Bank Details (if Bank selected for Payments) */}
              {(transactionType === 'INCOME' || transactionType === 'EXPENSE') && newTransaction.paymentMethod === 'BANK' && (
                <div className="space-y-3 bg-brand-500/5 p-3.5 rounded-xl border border-brand-500/20 animate-in fade-in slide-in-from-top-2">
                  <div>
                    <label className="text-xs text-gray-300 font-medium block mb-1">Deposit Bank Account</label>
                    <select 
                      className="w-full glass-input rounded-xl p-2.5 outline-none text-sm text-white bg-slate-900 border border-white/15"
                      value={newTransaction.bankId}
                      onChange={(e) => {
                        const bank = banks.find(b => b.id === e.target.value);
                        setNewTransaction({...newTransaction, bankId: e.target.value, bankName: bank?.name});
                      }}
                    >
                      <option value="">Select Bank Account</option>
                      {banks.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-300 font-medium block mb-1">Transaction Ref / Cheque No</label>
                    <input 
                      type="text" 
                      placeholder="e.g. DEP-998842 or Cheque #0045" 
                      className="w-full glass-input rounded-xl p-2.5 outline-none text-sm text-white border border-white/15"
                      value={newTransaction.transactionId}
                      onChange={(e) => setNewTransaction({...newTransaction, transactionId: e.target.value})}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-gray-400 font-medium">Upload Deposit Slip / Cheque Photo</label>
                    <label className="flex items-center justify-center gap-2 p-2.5 border-2 border-dashed border-white/15 rounded-xl hover:bg-brand-500/10 hover:border-brand-500/50 transition-all cursor-pointer">
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                      <Camera size={16} className="text-brand-400" />
                      <span className="text-xs text-gray-300">{newTransaction.slipUrl ? 'Slip Attached ✅' : 'Choose Receipt / Image'}</span>
                    </label>
                  </div>
                </div>
              )}

              {/* PAYEE / PAYER SELECTION */}
              <div className="space-y-1.5">
                <label className="text-xs text-gray-300 font-medium flex items-center justify-between">
                  <span>
                    {transactionType === 'PAYABLE' ? 'Payee' : 
                     transactionType === 'RECEIVABLE' ? 'Payer' : 
                     transactionType === 'INCOME' ? 'Payer' : 'Payee'}
                  </span>
                  <span className="text-[11px] text-brand-400">Registered Directory</span>
                </label>
                <div className="relative">
                  <select
                    className="w-full glass-input rounded-xl p-3 outline-none appearance-none cursor-pointer text-sm text-white bg-slate-900 border border-white/15 focus:border-brand-400"
                    value={isOtherClient ? '__OTHERS__' : (newTransaction.party || '')}
                    onChange={(e) => {
                      if (e.target.value === '__OTHERS__') {
                        setIsOtherClient(true);
                        setNewTransaction({ ...newTransaction, party: otherClientName.trim() });
                      } else {
                        setIsOtherClient(false);
                        setNewTransaction({ ...newTransaction, party: e.target.value });
                      }
                    }}
                  >
                    <option value="" className="bg-slate-900 text-gray-400">
                      -- Select {transactionType === 'PAYABLE' ? 'Payee' : transactionType === 'RECEIVABLE' ? 'Payer' : transactionType === 'INCOME' ? 'Payer' : 'Payee'} --
                    </option>
                    {clientList.map((client) => (
                      <option key={client} value={client} className="bg-slate-900 text-white">
                        {client}
                      </option>
                    ))}
                    <option value="__OTHERS__" className="bg-slate-900 text-amber-300 font-bold">
                      ➕ Others (Add New {transactionType === 'PAYABLE' ? 'Payee' : transactionType === 'RECEIVABLE' ? 'Payer' : transactionType === 'INCOME' ? 'Payer' : 'Payee'})
                    </option>
                  </select>
                  <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>

                {/* Others text input when selected */}
                {isOtherClient && (
                  <div className="mt-2 space-y-1.5 animate-in fade-in slide-in-from-top-1 bg-amber-500/10 p-3 rounded-xl border border-amber-500/40">
                    <label className="block text-xs text-amber-300 font-semibold">
                      Enter New {transactionType === 'PAYABLE' ? 'Payee' : transactionType === 'RECEIVABLE' ? 'Payer' : transactionType === 'INCOME' ? 'Payer' : 'Payee'} Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Al-Madina Trading Co..."
                      className="w-full glass-input rounded-lg p-2.5 outline-none text-sm text-white border border-amber-500/50 bg-slate-900 placeholder-gray-400 focus:border-amber-400"
                      value={otherClientName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setOtherClientName(val);
                        setNewTransaction({ ...newTransaction, party: val.trim() });
                      }}
                      autoFocus
                    />
                    <p className="text-[11px] text-amber-300/80">
                      ⚡ This new party will be added to the directory and will be available for future case registrations and transactions.
                    </p>
                  </div>
                )}
              </div>

              {/* Amount */}
              <div className="space-y-1">
                <label className="text-xs text-gray-300 font-medium">Amount (PKR)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-sm">PKR</span>
                  <input 
                    type="number" 
                    placeholder="0" 
                    className="w-full glass-input rounded-xl pl-14 p-3 outline-none text-white font-mono font-bold text-base border border-white/15 focus:border-brand-400"
                    value={newTransaction.amount || ''}
                    onChange={(e) => setNewTransaction({...newTransaction, amount: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs text-gray-300 font-medium">Description / Remarks</label>
                <input 
                  type="text" 
                  placeholder={transactionType === 'INCOME' ? 'e.g. Part payment against Case DPL-26-000004' : transactionType === 'PAYABLE' ? 'e.g. Port Wharfage & Handling Charges' : 'e.g. Logistics Service Fee'}
                  className="w-full glass-input rounded-xl p-3 outline-none text-sm text-white border border-white/15 focus:border-brand-400"
                  value={newTransaction.description}
                  onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})}
                />
              </div>

              {/* Document Upload Button for Payable & Receivable */}
              {(transactionType === 'PAYABLE' || transactionType === 'RECEIVABLE') && (
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-300 font-medium">Upload Document / Bill (Optional)</label>
                  <label className="flex items-center justify-center gap-2 p-2.5 border-2 border-dashed border-white/15 rounded-xl hover:bg-brand-500/10 hover:border-brand-500/50 transition-all cursor-pointer bg-slate-900/50">
                    <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleDocumentChange} />
                    <Upload size={16} className="text-brand-400" />
                    <span className="text-xs text-gray-300">
                      {newTransaction.documentName ? `Document: ${newTransaction.documentName} ✅` : newTransaction.documentUrl ? 'Document Attached ✅' : 'Choose Bill / Document'}
                    </span>
                  </label>
                </div>
              )}

              {/* Uploaded Files Summary List with Download Option (SRS) */}
              {(newTransaction.slipUrl || newTransaction.documentUrl) && (
                <div className="p-3 bg-black/40 rounded-xl border border-white/10 space-y-1.5 mt-3 animate-in fade-in">
                  <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <Download size={11} className="text-brand-400" />
                    Uploaded Transaction Documents / Receipts
                  </h5>
                  <div className="grid grid-cols-1 gap-2">
                    {newTransaction.slipUrl && (
                      <div className="flex items-center justify-between text-xs p-1.5 rounded bg-black/20 border border-white/5">
                        <span className="text-gray-200 font-medium truncate max-w-[150px]">Deposit Slip / Receipt Photo</span>
                        <button
                          type="button"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = newTransaction.slipUrl!;
                            const ext = newTransaction.slipUrl!.startsWith('data:application/pdf') ? '.pdf' : '.jpg';
                            link.download = `Deposit_Slip${ext}`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          className="text-brand-400 hover:text-brand-300 font-bold hover:underline flex items-center gap-1 bg-brand-500/10 border border-brand-500/20 px-2 py-0.5 rounded text-[10px]"
                        >
                          <Download size={11} /> Download
                        </button>
                      </div>
                    )}
                    {newTransaction.documentUrl && (
                      <div className="flex items-center justify-between text-xs p-1.5 rounded bg-black/20 border border-white/5">
                        <span className="text-gray-200 font-medium truncate max-w-[150px]">
                          {newTransaction.documentName || 'Supporting Bill/Document'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = newTransaction.documentUrl!;
                            const ext = newTransaction.documentUrl!.startsWith('data:application/pdf') ? '.pdf' : '.jpg';
                            const defaultName = newTransaction.documentName || 'supporting_doc';
                            link.download = defaultName.endsWith('.pdf') || defaultName.endsWith('.jpg') ? defaultName : `${defaultName}${ext}`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          className="text-brand-400 hover:text-brand-300 font-bold hover:underline flex items-center gap-1 bg-brand-500/10 border border-brand-500/20 px-2 py-0.5 rounded text-[10px]"
                        >
                          <Download size={11} /> Download
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-2.5 mt-6 pt-3 border-t border-white/10">
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setIsOtherClient(false);
                  setOtherClientName('');
                }} 
                className="text-gray-400 hover:text-white px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddTransaction} 
                className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-brand-600/30 flex items-center gap-1.5 transition-all"
              >
                <Save size={16} />
                <span>Save Transaction</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Payment Modal */}
      {showConfirmPaidModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200 no-print">
          <div className="glass-card p-6 rounded-2xl w-full max-w-md shadow-2xl border border-white/10">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Confirm Payment</h3>
                <p className="text-xs text-gray-400 mt-1">Select payment destination for this transaction</p>
              </div>
              <button onClick={() => setShowConfirmPaidModal(false)} className="text-gray-400 hover:text-white"><X size={20}/></button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-brand-500/10 p-4 rounded-xl border border-brand-500/20 mb-4 text-center">
                <p className="text-xs text-brand-300 uppercase font-bold">Amount to Settle</p>
                <h4 className="text-2xl font-bold text-white font-mono mt-1">PKR {newTransaction.amount?.toLocaleString()}</h4>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setNewTransaction({...newTransaction, paymentMethod: 'CASH'})}
                  className={`p-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 border transition-all ${newTransaction.paymentMethod === 'CASH' ? 'bg-brand-600 border-brand-500 text-white' : 'bg-white/5 border-white/10 text-gray-400'}`}
                >
                  <Banknote size={16} /> Cash
                </button>
                <button 
                  onClick={() => setNewTransaction({...newTransaction, paymentMethod: 'BANK'})}
                  className={`p-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 border transition-all ${newTransaction.paymentMethod === 'BANK' ? 'bg-brand-600 border-brand-500 text-white' : 'bg-white/5 border-white/10 text-gray-400'}`}
                >
                  <CreditCard size={16} /> Bank
                </button>
              </div>

              {newTransaction.paymentMethod === 'BANK' && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                  <select 
                    className="w-full glass-input rounded p-2 outline-none text-sm text-white bg-slate-900 border border-white/15"
                    value={newTransaction.bankId}
                    onChange={(e) => {
                      const bank = banks.find(b => b.id === e.target.value);
                      setNewTransaction({...newTransaction, bankId: e.target.value, bankName: bank?.name});
                    }}
                  >
                    <option value="">Select Bank Account</option>
                    {banks.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                  <input 
                    type="text" 
                    placeholder="Transaction ID / Reference" 
                    className="w-full glass-input rounded p-2 outline-none text-sm text-white"
                    value={newTransaction.transactionId}
                    onChange={(e) => setNewTransaction({...newTransaction, transactionId: e.target.value})}
                  />
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowConfirmPaidModal(false)} className="text-gray-400 hover:text-white px-3">Cancel</button>
              <button onClick={confirmPayment} className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-medium shadow-lg shadow-green-600/20">Mark as Paid</button>
            </div>
          </div>
        </div>
      )}

      {/* OFFICIAL PAYMENT RECEIPT / VOUCHER MODAL */}
      {selectedReceiptData && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="glass-card w-full max-w-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-slate-900/90">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-brand-500/10 rounded-xl text-brand-400 border border-brand-500/20">
                  <Banknote size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Payment Receipt</h3>
                  <p className="text-xs text-gray-400 font-mono">{selectedReceiptData.receiptNo}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedReceiptData(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Receipt Preview Card */}
              <div className="p-5 rounded-xl border border-brand-500/30 bg-gradient-to-br from-brand-950/40 via-slate-900/60 to-slate-950/80 space-y-4 shadow-inner">
                <div className="flex justify-between items-start border-b border-white/10 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">{companyName}</h4>
                    <p className="text-[11px] text-gray-400">Payment Receipt</p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                    selectedReceiptData.type === 'INCOME' || selectedReceiptData.type === 'RECEIVABLE'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-red-500/20 text-red-300 border border-red-500/30'
                  }`}>
                    {selectedReceiptData.type === 'INCOME' ? 'PAYMENT RECEIVED' : 'PAYMENT DISBURSED'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase">Date</span>
                    <span className="text-white font-medium">{selectedReceiptData.date}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase">Payment Method</span>
                    <span className="text-brand-300 font-semibold">{selectedReceiptData.paymentMethod} {selectedReceiptData.bankName ? `(${selectedReceiptData.bankName})` : ''}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-400 block text-[10px] uppercase">Party / Client</span>
                    <span className="text-white font-bold text-sm">{selectedReceiptData.party}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-400 block text-[10px] uppercase">Particulars / Description</span>
                    <span className="text-gray-200">{selectedReceiptData.description}</span>
                  </div>
                </div>

                <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase block">Total Net Amount</span>
                    <span className="text-xs text-gray-400 italic">
                      {numberToWordsRupees(selectedReceiptData.amount)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-extrabold font-mono text-emerald-400">
                      PKR {selectedReceiptData.amount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* In-progress status banner */}
              {isExportingPdf && (
                <div className="p-3 bg-brand-500/10 border border-brand-500/30 rounded-xl flex items-center gap-3 text-brand-300 text-xs animate-pulse">
                  <Loader2 size={18} className="animate-spin text-brand-400 shrink-0" />
                  <span>Generating & downloading PDF...</span>
                </div>
              )}

              {/* Success notification banner */}
              {pdfSuccessMessage && (
                <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl space-y-1.5 text-xs text-emerald-300 animate-fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                    <span className="font-semibold text-white">{pdfSuccessMessage}</span>
                  </div>
                  <p className="text-gray-300 text-[11px] pl-6">
                    File successfully downloaded! (Saved in your mobile Downloads folder)
                  </p>
                  {directDownloadUrl && (
                    <div className="pl-6 pt-1 flex items-center gap-3">
                      <a 
                        href={directDownloadUrl} 
                        download={directDownloadFilename}
                        className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 underline font-bold"
                      >
                        <Download size={13} /> Tap here to download again
                      </a>
                      <button
                        type="button"
                        onClick={() => setIsPdfViewerOpen(true)}
                        className="inline-flex items-center gap-1 text-white bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-white/20"
                      >
                        <Eye size={12} /> View PDF
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Error notification banner */}
              {pdfErrorMessage && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-300 text-xs">
                  <AlertCircle size={18} className="text-red-400 shrink-0" />
                  <span>{pdfErrorMessage}</span>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-950/80 border-t border-white/10 flex flex-wrap justify-between items-center gap-2">
              <button 
                type="button"
                onClick={() => setSelectedReceiptData(null)}
                className="px-4 py-2 text-xs text-gray-400 hover:text-white transition-colors"
              >
                Close
              </button>
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  disabled={isExportingPdf}
                  onClick={async () => {
                    if (!selectedReceiptData) return;
                    setIsExportingPdf(true);
                    setPdfSuccessMessage(null);
                    setPdfErrorMessage(null);
                    try {
                      const res = await downloadPaymentReceiptPdf({
                        ...selectedReceiptData,
                        customLogo: activeLogo,
                        branding
                      });
                      setPdfSuccessMessage(`Receipt downloaded: ${res.filename}`);
                      setDirectDownloadFilename(res.filename);
                      setDirectDownloadUrl(res.blobUrl);
                    } catch (err) {
                      console.error(err);
                      setPdfErrorMessage('Failed to generate receipt PDF.');
                    } finally {
                      setIsExportingPdf(false);
                    }
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all"
                >
                  {isExportingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  <span>Download PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COMMERCIAL INVOICE PREVIEW MODAL */}
      {selectedInvoiceData && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="glass-card w-full max-w-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-slate-900/90">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-brand-500/10 rounded-xl text-brand-400 border border-brand-500/20">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Invoice</h3>
                  <p className="text-xs text-gray-400 font-mono">{selectedInvoiceData.invoiceNo}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedInvoiceData(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Invoice Card */}
              <div className="p-5 rounded-xl border border-brand-500/30 bg-gradient-to-br from-brand-950/40 via-slate-900/60 to-slate-950/80 space-y-4 shadow-inner">
                <div className="flex justify-between items-start border-b border-white/10 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">{companyName}</h4>
                    <p className="text-[11px] text-gray-400">Invoice</p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                    selectedInvoiceData.status === 'PAID'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {selectedInvoiceData.status || 'UNPAID'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase">Invoice Date</span>
                    <span className="text-white font-medium">{selectedInvoiceData.date}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase">Reference</span>
                    <span className="text-brand-300 font-mono font-semibold">{selectedInvoiceData.reference || '-'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-400 block text-[10px] uppercase">Bill To (Client)</span>
                    <span className="text-white font-bold text-sm">{selectedInvoiceData.clientName}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-400 block text-[10px] uppercase">Description & Charges</span>
                    <span className="text-gray-200">{selectedInvoiceData.description}</span>
                  </div>
                </div>

                <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase block">Total Payable Amount</span>
                    <span className="text-xs text-gray-400 italic">
                      {numberToWordsRupees(selectedInvoiceData.amount)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-extrabold font-mono text-brand-300">
                      PKR {selectedInvoiceData.amount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* In-progress status banner */}
              {isExportingPdf && (
                <div className="p-3 bg-brand-500/10 border border-brand-500/30 rounded-xl flex items-center gap-3 text-brand-300 text-xs animate-pulse">
                  <Loader2 size={18} className="animate-spin text-brand-400 shrink-0" />
                  <span>Generating & downloading PDF...</span>
                </div>
              )}

              {/* Success notification banner */}
              {pdfSuccessMessage && (
                <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl space-y-1.5 text-xs text-emerald-300 animate-fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                    <span className="font-semibold text-white">{pdfSuccessMessage}</span>
                  </div>
                  <p className="text-gray-300 text-[11px] pl-6">
                    File successfully downloaded! (Saved in your mobile Downloads folder)
                  </p>
                  {directDownloadUrl && (
                    <div className="pl-6 pt-1 flex items-center gap-3">
                      <a 
                        href={directDownloadUrl} 
                        download={directDownloadFilename}
                        className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 underline font-bold"
                      >
                        <Download size={13} /> Tap here to download again
                      </a>
                      <button
                        type="button"
                        onClick={() => setIsPdfViewerOpen(true)}
                        className="inline-flex items-center gap-1 text-white bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-white/20"
                      >
                        <Eye size={12} /> View PDF
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Error notification banner */}
              {pdfErrorMessage && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-300 text-xs">
                  <AlertCircle size={18} className="text-red-400 shrink-0" />
                  <span>{pdfErrorMessage}</span>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-950/80 border-t border-white/10 flex flex-wrap justify-between items-center gap-2">
              <button 
                type="button"
                onClick={() => setSelectedInvoiceData(null)}
                className="px-4 py-2 text-xs text-gray-400 hover:text-white transition-colors"
              >
                Close
              </button>
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  disabled={isExportingPdf}
                  onClick={async () => {
                    if (!selectedInvoiceData) return;
                    setIsExportingPdf(true);
                    setPdfSuccessMessage(null);
                    setPdfErrorMessage(null);
                    try {
                      const res = await downloadReceivableInvoicePdf({
                        ...selectedInvoiceData,
                        customLogo: activeLogo,
                        branding
                      });
                      setPdfSuccessMessage(`Invoice downloaded: ${res.filename}`);
                      setDirectDownloadFilename(res.filename);
                      setDirectDownloadUrl(res.blobUrl);
                    } catch (err) {
                      console.error(err);
                      setPdfErrorMessage('Failed to generate invoice PDF.');
                    } finally {
                      setIsExportingPdf(false);
                    }
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all"
                >
                  {isExportingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  <span>Download PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Recurring Expense Template Modal */}
      {showRecurringModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                  <Building size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Add Monthly Fixed Expense</h3>
                  <p className="text-[11px] text-gray-400">Will automatically post to Payables on the 1st of every month</p>
                </div>
              </div>
              <button 
                onClick={() => setShowRecurringModal(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div>
                <label className="block text-gray-400 font-medium mb-1">Expense Title / Description *</label>
                <input
                  type="text"
                  placeholder="e.g. Office Rent, Vehicle Loan Installment, PTCL Internet"
                  value={newRecurringTemplate.title}
                  onChange={(e) => setNewRecurringTemplate(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 font-medium mb-1">Payee / Beneficiary *</label>
                  <input
                    type="text"
                    placeholder="e.g. Landlord, Bank Name, Vendor"
                    value={newRecurringTemplate.party}
                    onChange={(e) => setNewRecurringTemplate(prev => ({ ...prev, party: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-medium mb-1">Monthly Amount (PKR) *</label>
                  <input
                    type="number"
                    placeholder="e.g. 150000"
                    value={newRecurringTemplate.amount}
                    onChange={(e) => setNewRecurringTemplate(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 font-medium mb-1">Category</label>
                  <select
                    value={newRecurringTemplate.category}
                    onChange={(e) => setNewRecurringTemplate(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-purple-500"
                  >
                    <option value="Office Rent">Office Rent</option>
                    <option value="Vehicle Loan / Lease">Vehicle Loan / Lease</option>
                    <option value="Utilities & Internet">Utilities & Internet</option>
                    <option value="Building & Security">Building & Security</option>
                    <option value="Legal & Retainers">Legal & Retainers</option>
                    <option value="IT & Software Subscriptions">IT & Subscriptions</option>
                    <option value="Operational Expense">Operational Expense</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 font-medium mb-1">Posting Schedule</label>
                  <div className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-purple-300 font-medium flex items-center gap-1.5">
                    <Calendar size={13} />
                    <span>1st of Every Month</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 font-medium mb-1">Notes / Agreement Details (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Account number, contract period, voucher instructions"
                  value={newRecurringTemplate.notes || ''}
                  onChange={(e) => setNewRecurringTemplate(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-purple-500 resize-none"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-950/60 border-t border-white/10 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRecurringModal(false)}
                className="px-4 py-2 text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNewRecurringTemplate}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-lg shadow-purple-950/50 transition-all"
              >
                <Save size={14} />
                <span>Save Recurring Expense</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Financial Counter Breakdown Modal */}
      {renderStatBreakdownModal()}

      {/* AUTOMATIC VENDOR REGISTRATION POPUP PROMPT */}
      {autoVendorPrompt && autoVendorPrompt.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="glass-card w-full max-w-lg rounded-2xl border border-brand-500/40 shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-brand-950/80 to-slate-900">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-brand-500/20 text-brand-300 rounded-xl border border-brand-500/30">
                  <Building size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Automatic Vendor Registration</h3>
                  <p className="text-xs text-brand-300">Office policy: Non-staff payee auto-registration</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAutoVendorPrompt(null)}
                className="text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-gray-200 max-h-[75vh] overflow-y-auto">
              <div className="p-3 bg-brand-500/10 border border-brand-500/30 rounded-xl text-brand-200 text-xs">
                <strong>Payee "{autoVendorPrompt.name}"</strong> is not found in the office staff list. As per system rules, this party is being registered as a vendor so all future payments automatically consolidate into their personal ledger.
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1">Vendor / Payee Name *</label>
                <input
                  type="text"
                  value={autoVendorPrompt.name}
                  onChange={(e) => setAutoVendorPrompt(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-brand-500 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1">Vendor / Utility Category *</label>
                <select
                  value={autoVendorPrompt.category}
                  onChange={(e) => setAutoVendorPrompt(prev => prev ? ({ ...prev, category: e.target.value }) : null)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-brand-500 text-sm font-medium"
                >
                  <option value="Drinking Water Charges">Drinking Water Charges</option>
                  <option value="Electric Bill">Electric Bill</option>
                  <option value="Gas Cylinder Refill">Gas Cylinder Refill</option>
                  <option value="Internet Bill">Internet Bill</option>
                  <option value="Office Rent">Office Rent</option>
                  <option value="Stationery">Stationery</option>
                  <option value="Photocopy & Printer Maintenance">Photocopy & Printer Maintenance</option>
                  <option value="Computer Repair">Computer Repair</option>
                  <option value="Office Maintenance">Office Maintenance</option>
                  <option value="Legal Payments">Legal Payments</option>
                  <option value="Miscellaneous Payments">Miscellaneous Payments</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Company / Business Title</label>
                  <input
                    type="text"
                    value={autoVendorPrompt.companyTitle}
                    onChange={(e) => setAutoVendorPrompt(prev => prev ? ({ ...prev, companyTitle: e.target.value }) : null)}
                    placeholder="e.g. Al-Madina Water Supplies"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Contact Number</label>
                  <input
                    type="text"
                    value={autoVendorPrompt.contactNumber}
                    onChange={(e) => setAutoVendorPrompt(prev => prev ? ({ ...prev, contactNumber: e.target.value }) : null)}
                    placeholder="0300-1234567"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1">Address / Location</label>
                <input
                  type="text"
                  value={autoVendorPrompt.address}
                  onChange={(e) => setAutoVendorPrompt(prev => prev ? ({ ...prev, address: e.target.value }) : null)}
                  placeholder="Shop / Office address"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-brand-500"
                />
              </div>

              {autoVendorPrompt.pendingEntry && (
                <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex justify-between items-center text-xs">
                  <span className="text-gray-400">Payment to be recorded:</span>
                  <span className="text-emerald-400 font-bold font-mono text-sm">
                    PKR {autoVendorPrompt.pendingEntry.amount.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-950/80 border-t border-white/10 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setAutoVendorPrompt(null)}
                className="px-4 py-2 text-xs text-gray-400 hover:text-white"
              >
                Cancel Entry
              </button>
              <button
                type="button"
                onClick={handleConfirmAutoVendor}
                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-lg shadow-brand-600/30 transition-all"
              >
                <CheckCircle2 size={16} />
                <span>Register Vendor & Save Entry</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL REGISTER VENDOR MODAL */}
      {showAddVendorModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="glass-card w-full max-w-lg rounded-2xl border border-purple-500/30 shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-500/20 text-purple-300 rounded-xl border border-purple-500/30">
                  <Building size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Register New Vendor / Utility</h3>
                  <p className="text-xs text-gray-400">Add service vendor for ledger and cashbook billing</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddVendorModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-gray-400 font-semibold mb-1">Vendor / Contact Person Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Muhammad Aslam (Water Supplier)"
                  value={newVendorForm.name || ''}
                  onChange={(e) => setNewVendorForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-purple-500 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1">Vendor / Utility Category *</label>
                <select
                  value={newVendorForm.category}
                  onChange={(e) => setNewVendorForm(prev => ({ ...prev, category: e.target.value as any }))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-purple-500 text-sm font-medium"
                >
                  <option value="Drinking Water Charges">Drinking Water Charges</option>
                  <option value="Electric Bill">Electric Bill</option>
                  <option value="Gas Cylinder Refill">Gas Cylinder Refill</option>
                  <option value="Internet Bill">Internet Bill</option>
                  <option value="Office Rent">Office Rent</option>
                  <option value="Stationery">Stationery</option>
                  <option value="Photocopy & Printer Maintenance">Photocopy & Printer Maintenance</option>
                  <option value="Computer Repair">Computer Repair</option>
                  <option value="Office Maintenance">Office Maintenance</option>
                  <option value="Legal Payments">Legal Payments</option>
                  <option value="Miscellaneous Payments">Miscellaneous Payments</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Company / Store Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Aquafresh Water Supplies"
                    value={newVendorForm.companyTitle || ''}
                    onChange={(e) => setNewVendorForm(prev => ({ ...prev, companyTitle: e.target.value }))}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="0300-0000000"
                    value={newVendorForm.contactNumber || ''}
                    onChange={(e) => setNewVendorForm(prev => ({ ...prev, contactNumber: e.target.value }))}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1">Office / Shop Address</label>
                <input
                  type="text"
                  placeholder="Street / Plaza address"
                  value={newVendorForm.address || ''}
                  onChange={(e) => setNewVendorForm(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-purple-500"
                />
              </div>

              <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="chkIsRecurring"
                  checked={!!newVendorForm.isRecurring}
                  onChange={(e) => setNewVendorForm(prev => ({ ...prev, isRecurring: e.target.checked }))}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="chkIsRecurring" className="text-xs text-gray-300 font-medium cursor-pointer">
                  Mark as regular monthly recurring expense (e.g. rent, internet, water)
                </label>
              </div>
            </div>

            <div className="p-4 bg-slate-950/80 border-t border-white/10 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddVendorModal(false)}
                className="px-4 py-2 text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNewVendor}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-lg shadow-purple-600/30 transition-all"
              >
                <Save size={14} />
                <span>Save Vendor</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ALL INVOICES MODAL (TABLE VIEW & INSTANT DOWNLOAD) */}
      {showAllInvoicesModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="glass-card w-full max-w-5xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-500/30">
                  <Layers size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">All Commercial Invoices</h3>
                  <p className="text-xs text-gray-400">Complete registry of billing invoices, status & downloadable statements</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAllInvoicesModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-950/60 border-b border-white/10">
              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <span className="text-[10px] text-gray-400 uppercase font-semibold block">Total Invoices</span>
                <span className="text-xl font-bold text-white font-mono">{calculatedReceivables.length}</span>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <span className="text-[10px] text-emerald-400 uppercase font-semibold block">Settled / Collected</span>
                <span className="text-xl font-bold text-emerald-300 font-mono">
                  PKR {calculatedReceivables.filter(r => r.status === 'PAID').reduce((s, r) => s + r.amount, 0).toLocaleString()}
                </span>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                <span className="text-[10px] text-amber-400 uppercase font-semibold block">Outstanding Receivables</span>
                <span className="text-xl font-bold text-amber-300 font-mono">
                  PKR {calculatedReceivables.filter(r => r.status !== 'PAID').reduce((s, r) => s + r.amount, 0).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Invoice Table */}
            <div className="p-4 overflow-y-auto flex-1">
              <table className="w-full text-left text-xs text-gray-200">
                <thead className="bg-slate-950 uppercase font-semibold text-gray-400 border-b border-white/10 sticky top-0">
                  <tr>
                    <th className="p-3">Invoice #</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Client</th>
                    <th className="p-3">Particulars</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {calculatedReceivables.map((inv) => (
                    <tr key={inv.id} className="hover:bg-white/5 transition">
                      <td className="p-3 font-mono font-bold text-brand-300">
                        {inv.reference || `INV-${inv.id}`}
                      </td>
                      <td className="p-3 text-gray-400 whitespace-nowrap">{inv.date}</td>
                      <td className="p-3 font-medium text-white">{inv.party}</td>
                      <td className="p-3 text-gray-300 max-w-xs truncate">{inv.description}</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                        PKR {inv.amount.toLocaleString()}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          inv.status === 'PAID' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenInvoice(inv)}
                            className="px-2 py-1 rounded bg-brand-600/20 hover:bg-brand-600 text-brand-300 hover:text-white border border-brand-500/30 text-xs font-semibold flex items-center gap-1 transition"
                            title="View Invoice"
                          >
                            <Eye size={12} />
                            <span>View</span>
                          </button>
                          <button
                            onClick={() => handleDirectDownloadInvoice(inv)}
                            className="p-1 rounded bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 transition"
                            title="Download PDF Invoice"
                          >
                            <Download size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {calculatedReceivables.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-500">
                        No invoices on record.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-slate-950 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAllInvoicesModal(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App PDF Viewer Modal for Receipts & Invoices */}
      <PdfViewerModal
        isOpen={isPdfViewerOpen}
        onClose={() => setIsPdfViewerOpen(false)}
        pdfUrl={directDownloadUrl}
        filename={directDownloadFilename}
        title={directDownloadFilename.toLowerCase().includes('invoice') ? 'Invoice' : 'Payment Receipt'}
      />
    </div>
  );
};

export default Finance;
