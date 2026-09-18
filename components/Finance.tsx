import React, { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, FileText, ArrowUpRight, ArrowDownLeft, Plus, 
  Search, Filter, Download, CreditCard, Banknote, Briefcase, X, Save, Calendar, Camera,
  BookOpen, ChevronDown, CheckCircle2, User, Layers, RefreshCw, AlertCircle, ArrowRight,
  Eye, Loader2, Share2, Upload
} from 'lucide-react';
import Logo from './Logo';
import { PdfViewerModal } from './PdfViewerModal';
import { FinanceEntry, Case, Client, LedgerEntry } from '../types';
import { 
  subscribeToFinances, 
  saveFinanceToFirestore, 
  updateFinanceInFirestore,
  subscribeToCases,
  subscribeToClients,
  saveClientToFirestore,
  DEFAULT_CLIENTS
} from '../services/dbService';
import { exportCSVFile, compressAndPrepareFile } from '../services/fileUtils';
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
  const [cases, setCases] = useState<Case[]>([]);

  // Registered Clients Management
  const [clientList, setClientList] = useState<string[]>(DEFAULT_CLIENTS);
  const [selectedLedgerClient, setSelectedLedgerClient] = useState<string>(() => {
    return safeAppStorage.getItem('dpl_finance_client') || 'Trial Client';
  });

  useEffect(() => {
    safeAppStorage.setItem('dpl_finance_client', selectedLedgerClient);
  }, [selectedLedgerClient]);
  const [glAccountFilter, setGlAccountFilter] = useState<string>('ALL');

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

  const [newTransaction, setNewTransaction] = useState<Partial<FinanceEntry>>({
    description: '', amount: 0, party: '', paymentMethod: 'CASH', bankId: '', transactionId: '', slipUrl: '', documentUrl: '', documentName: ''
  });

  const banks = [
    { id: '1', name: 'HBL Corporate' },
    { id: '2', name: 'Meezan Bank' },
    { id: '3', name: 'Bank Al Habib' },
    { id: '4', name: 'MCB Islamic' }
  ];

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
      if (casesFromDb && casesFromDb.length > 0) {
        setCases(casesFromDb);
      }
    });
    return () => unsubscribe();
  }, []);

  // 3. Synchronize clients from Firestore
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

  useEffect(() => {
    if (initialFilter) {
      if (initialFilter.tab) setActiveTab(initialFilter.tab);
      if (initialFilter.notificationId) setActiveNotificationId(initialFilter.notificationId);
    }
  }, [initialFilter]);

  const tabs = [
    { id: 'cashbook', label: 'Cashbook' },
    { id: 'receivables', label: 'Receivables' },
    { id: 'payables', label: 'Payables' },
    { id: 'client_ledger', label: 'Client Ledger' },
    { id: 'general_ledger', label: 'General Ledger' },
    { id: 'transporter_ledger', label: 'Transporter Ledger' },
    { id: 'staff_ledger', label: 'Staff Ledger' },
    { id: 'recurring', label: 'Recurring Amounts' },
  ];

  // Helper to calculate total charges for a case with Pakistan Customs accuracy
  const getCaseTotalCharges = (c: Case): { total: number; breakdown: string } => {
    if (c.charges && c.charges.length > 0) {
      const sum = c.charges.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
      const details = c.charges.map(ch => `${ch.description}: PKR ${Number(ch.amount || 0).toLocaleString()}`).join(', ');
      return { total: sum, breakdown: details };
    }
    // Calculate statutory/standard tariff charges based on category & container count
    const standardCharges = getStandardChargesForCategory(c.category, c.containers?.length || 1);
    const sum = standardCharges.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const details = standardCharges.map(ch => `${ch.description}: PKR ${Number(ch.amount || 0).toLocaleString()}`).join(', ');
    return { total: sum, breakdown: details };
  };

  // Build real-time dynamic Client Ledger for selected client
  const clientLedgerEntries = useMemo(() => {
    if (!selectedLedgerClient) return [];
    const entries: LedgerEntry[] = [];
    const targetClient = selectedLedgerClient.trim().toLowerCase();

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

    // 2. Add Debits from Cases (Charges automatically billed per container & case)
    cases.forEach((c) => {
      if (c.clientName && c.clientName.trim().toLowerCase() === targetClient) {
        const { total, breakdown } = getCaseTotalCharges(c);
        const cntrInfo = c.containers && c.containers.length > 0 
          ? `[${c.containers.length} Cntr: ${c.containers.map(cntr => cntr.number).join(', ')}]` 
          : '';
        entries.push({
          id: `case_${c.id}`,
          date: c.createdAt || '2026-04-10',
          reference: c.caseNo,
          description: `Case ${c.caseNo}: ${c.category} ${cntrInfo} - ${c.pol || 'KPT'} to ${c.pod || 'KDH'} (${breakdown})`,
          debit: total,
          credit: 0,
          balance: 0,
          type: 'DEBIT',
          party: selectedLedgerClient,
          relatedCaseId: c.id
        });
      }
    });

    // 3. Add Receivables billed directly (if not from cases)
    receivables.forEach((r) => {
      if (r.party && r.party.trim().toLowerCase() === targetClient) {
        entries.push({
          id: `recv_${r.id}`,
          date: r.date,
          reference: r.reference || `INV-${r.id}`,
          description: `Invoice: ${r.description} (${r.category})`,
          debit: r.amount,
          credit: 0,
          balance: 0,
          type: 'DEBIT',
          party: selectedLedgerClient
        });
      }
    });

    // 4. Add Credits from Payments Received (INCOME or Settled RECEIVABLES)
    financeData.forEach((f) => {
      if (f.party && f.party.trim().toLowerCase() === targetClient && f.type === 'INCOME') {
        const methodInfo = f.paymentMethod === 'BANK' 
          ? `Bank Transfer (${f.bankName || 'HBL'} Trx #${f.transactionId || 'Direct'})` 
          : 'Cash Receipt';
        entries.push({
          id: `pay_${f.id}`,
          date: f.date,
          reference: f.reference || f.transactionId || `REC-${f.id}`,
          description: `Payment Received: ${f.description} [${methodInfo}]`,
          debit: 0,
          credit: f.amount,
          balance: 0,
          type: 'CREDIT',
          party: selectedLedgerClient
        });
      }
    });

    // 5. Sort chronologically by date ascending
    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 6. Compute accurate running balance
    // Debit increases receivable (client owes DPL); Credit decreases receivable (client paid)
    let currentBalance = 0;
    entries.forEach((entry) => {
      currentBalance = currentBalance + entry.debit - entry.credit;
      entry.balance = currentBalance;
    });

    return entries;
  }, [selectedLedgerClient, cases, receivables, financeData]);

  // Client summary metrics
  const clientSummary = useMemo(() => {
    const totalDebits = clientLedgerEntries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredits = clientLedgerEntries.reduce((sum, e) => sum + e.credit, 0);
    const netBalance = totalDebits - totalCredits;
    const clientCases = cases.filter(c => c.clientName?.trim().toLowerCase() === selectedLedgerClient.trim().toLowerCase());
    const totalContainers = clientCases.reduce((sum, c) => sum + (c.containers?.length || 1), 0);

    return {
      totalDebits,
      totalCredits,
      netBalance,
      totalCases: clientCases.length,
      totalContainers
    };
  }, [clientLedgerEntries, cases, selectedLedgerClient]);

  // Master General Ledger Entries (All Parties & Accounts)
  const generalLedgerEntries = useMemo(() => {
    const glEntries: (LedgerEntry & { party: string; category: string })[] = [];

    // All Client Case charges (Debits)
    cases.forEach((c) => {
      const { total, breakdown } = getCaseTotalCharges(c);
      glEntries.push({
        id: `gl_case_${c.id}`,
        date: c.createdAt || '2026-04-10',
        reference: c.caseNo,
        description: `Case Billing: ${c.category} [${c.containers?.length || 1} Cntr] - ${breakdown}`,
        debit: total,
        credit: 0,
        balance: 0,
        type: 'DEBIT',
        party: c.clientName || 'General Client',
        category: 'Freight & Clearance'
      });
    });

    // All Cashbook Entries
    financeData.forEach((f) => {
      if (f.type === 'INCOME') {
        glEntries.push({
          id: `gl_inc_${f.id}`,
          date: f.date,
          reference: f.reference || `REC-${f.id}`,
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
      glEntries.push({
        id: `gl_recv_${r.id}`,
        date: r.date,
        reference: r.reference || `INV-${r.id}`,
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

  // Handle File upload for receipt/slip
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const processed = await compressAndPrepareFile(file);
        if (processed.dataUrl) {
          setNewTransaction(prev => ({ ...prev, slipUrl: processed.dataUrl }));
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

  // Handle Document upload for Payable / Receivable
  const handleDocumentChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const processed = await compressAndPrepareFile(file);
        if (processed.dataUrl) {
          setNewTransaction(prev => ({ 
            ...prev, 
            documentUrl: processed.dataUrl,
            documentName: file.name
          }));
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

  const confirmPayment = () => {
    if (!pendingPaymentEntry) return;
    const { id, list, setList } = pendingPaymentEntry;
    
    const updatedItem = { 
      ...list.find(item => item.id === id)!, 
      status: 'PAID' as const, 
      paymentMethod: newTransaction.paymentMethod as any,
      bankId: newTransaction.bankId,
      bankName: newTransaction.bankName,
      transactionId: newTransaction.transactionId
    };

    setList(list.map(item => item.id === id ? updatedItem : item));
    updateFinanceInFirestore(updatedItem).catch(() => {});

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

    const entry: FinanceEntry = {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      description: newTransaction.description?.trim() || (transactionType === 'INCOME' ? 'Payment Received' : transactionType === 'PAYABLE' ? 'Payable Bill' : transactionType === 'RECEIVABLE' ? 'Receivable Bill' : 'Transaction Entry'),
      amount: Number(newTransaction.amount),
      type: transactionType,
      status: isDirectPayment ? 'PAID' : 'PENDING',
      party: finalParty,
      category: transactionType === 'INCOME' ? 'Client Payment' : transactionType === 'EXPENSE' ? 'Operational Expense' : transactionType === 'PAYABLE' ? 'Payable Bill' : 'Receivable Bill',
      reference: newTransaction.transactionId || (transactionType === 'PAYABLE' ? `PAY-${Math.floor(1000 + Math.random() * 9000)}` : transactionType === 'RECEIVABLE' ? `INV-${Math.floor(1000 + Math.random() * 9000)}` : `REF-${Math.floor(1000 + Math.random() * 9000)}`),
      paymentMethod: isDirectPayment ? (newTransaction.paymentMethod as any || 'CASH') : undefined,
      bankId: isDirectPayment ? newTransaction.bankId : undefined,
      bankName: isDirectPayment ? newTransaction.bankName : undefined,
      transactionId: isDirectPayment ? newTransaction.transactionId : undefined,
      slipUrl: isDirectPayment ? newTransaction.slipUrl : undefined,
      documentUrl: newTransaction.documentUrl,
      documentName: newTransaction.documentName
    };

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
    if (!selectedLedgerClient || clientLedgerEntries.length === 0) {
      alert('No transactions to export for this client.');
      return;
    }
    setIsExportingPdf(true);
    setPdfSuccessMessage(null);
    setPdfErrorMessage(null);
    try {
      const res = await downloadClientLedgerPdf({
        clientName: selectedLedgerClient,
        statementDate: new Date().toLocaleDateString(),
        summary: clientSummary,
        entries: clientLedgerEntries.map(e => ({
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

  const StatCard = ({ title, amount, type, icon: Icon, subtitle }: any) => (
    <div className="glass-card p-5 rounded-2xl flex items-center justify-between hover:bg-white/5 transition-colors no-print">
      <div>
        <p className="text-gray-400 text-xs uppercase font-semibold mb-1 tracking-wider">{title}</p>
        <h4 className={`text-2xl font-bold font-mono drop-shadow-sm ${type === 'pos' ? 'text-green-400' : type === 'neg' ? 'text-red-400' : 'text-white'}`}>
          PKR {amount.toLocaleString()}
        </h4>
        {subtitle && <p className="text-[11px] text-gray-500 mt-1">{subtitle}</p>}
      </div>
      <div className={`p-3 rounded-xl backdrop-blur-md shadow-lg ${
        type === 'pos' ? 'bg-green-500/10 text-green-400 shadow-green-500/10' : 
        type === 'neg' ? 'bg-red-500/10 text-red-400 shadow-red-500/10' : 
        'bg-white/5 text-gray-300 shadow-white/5'
      }`}>
        <Icon size={24} />
      </div>
    </div>
  );

  const renderTableContent = () => {
    switch (activeTab) {
      case 'receivables': {
        const filteredReceivables = receivables.filter(entry => 
          !searchTerm || 
          entry.party.toLowerCase().includes(searchTerm.toLowerCase()) || 
          entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (entry.reference && entry.reference.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        return (
          <>
            {/* Mobile View: Compact, Zero-Horizontal Scroll, Smooth Touch Pan-Y */}
            <div className="block sm:hidden divide-y divide-white/10 touch-pan-y">
              {filteredReceivables.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-xs">No receivables found.</div>
              ) : (
                filteredReceivables.map((entry) => (
                  <div key={entry.id} className="p-3 hover:bg-white/5 transition-colors space-y-1.5">
                    {/* Top Row: Date, Party, Status */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[11px] font-mono text-gray-400 shrink-0">{entry.date}</span>
                        <span className="text-xs font-bold text-white truncate">{entry.party}</span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${
                        entry.status === 'PAID' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {entry.status}
                      </span>
                    </div>

                    {/* Middle: Description & Reference */}
                    <p className="text-[11px] text-gray-300 leading-snug line-clamp-2">
                      {entry.description}
                      {entry.reference && (
                        <span className="text-[10px] text-gray-500 block">Ref: {entry.reference}</span>
                      )}
                    </p>

                    {/* Bottom: Amount + Compact Action Buttons */}
                    <div className="flex items-center justify-between pt-1 border-t border-white/5">
                      <div className="text-xs font-bold font-mono text-green-400">
                        PKR {entry.amount.toLocaleString()}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => handleOpenInvoice(entry)}
                          className="text-brand-400 hover:text-white text-[11px] font-semibold px-2 py-0.5 rounded bg-brand-600/20 border border-brand-500/30 flex items-center gap-1"
                          title="View Official Invoice"
                        >
                          <Eye size={11} />
                          <span>Invoice</span>
                        </button>
                        <button 
                          onClick={() => handleDirectDownloadInvoice(entry)}
                          className="text-emerald-400 hover:text-white p-1 rounded bg-emerald-600/20 border border-emerald-500/30"
                          title="Direct Download Invoice PDF"
                        >
                          <Download size={11} />
                        </button>
                        {entry.status !== 'PAID' && (
                          <button 
                            onClick={() => handleStatusChange(entry.id, receivables, setReceivables)}
                            className="text-amber-300 hover:text-white text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-600/20 border border-amber-500/30"
                          >
                            Receive
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
                    <th className="p-4">Party</th>
                    <th className="p-4 text-right">Amount</th>
                    <th className="p-4">Ref No</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center no-print">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 print:divide-gray-300">
                  {filteredReceivables.map((entry) => (
                    <tr key={entry.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4">{entry.date}</td>
                      <td className="p-4">{entry.description}</td>
                      <td className="p-4 font-medium text-white print:text-black">{entry.party}</td>
                      <td className="p-4 text-right text-green-400 font-mono print:text-black">PKR {entry.amount.toLocaleString()}</td>
                      <td className="p-4 text-gray-400 print:text-black">{entry.reference}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${entry.status === 'PAID' ? 'bg-green-500/20 text-green-400 print:border print:border-black print:text-black' : 'bg-blue-500/20 text-blue-400 print:border print:border-black print:text-black'}`}>
                          {entry.status}
                        </span>
                      </td>
                      <td className="p-4 text-center no-print">
                        <div className="flex items-center justify-center gap-1.5">
                          <button 
                            onClick={() => handleOpenInvoice(entry)}
                            className="text-brand-400 hover:text-white transition-colors text-xs font-semibold px-2 py-1 rounded bg-brand-600/20 border border-brand-500/30 flex items-center gap-1"
                            title="View Official Invoice"
                          >
                            <Eye size={12} />
                            <span>Invoice</span>
                          </button>
                          <button 
                            onClick={() => handleDirectDownloadInvoice(entry)}
                            className="text-emerald-400 hover:text-white transition-colors text-xs font-semibold p-1.5 rounded bg-emerald-600/20 border border-emerald-500/30"
                            title="Direct Download Invoice PDF"
                          >
                            <Download size={13} />
                          </button>
                          {entry.status !== 'PAID' && (
                            <button 
                              onClick={() => handleStatusChange(entry.id, receivables, setReceivables)}
                              className="text-amber-300 hover:text-white transition-colors text-xs font-semibold px-2 py-1 rounded bg-amber-600/20 border border-amber-500/30"
                            >
                              Receive
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredReceivables.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-400">No receivables found.</td>
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
                  onClick={handleExportClientLedgerCSV}
                  className="px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all"
                  title="Download CSV spreadsheet"
                >
                  <Download size={14} className="text-emerald-400" />
                  <span>Export CSV</span>
                </button>
              </div>
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
              {clientLedgerEntries.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-xs">
                  No transactions found for {selectedLedgerClient}.
                </div>
              ) : (
                clientLedgerEntries
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
                  {clientLedgerEntries
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
                  onClick={handleExportGeneralLedgerCSV}
                  className="px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all"
                  title="Download GL CSV spreadsheet"
                >
                  <Download size={14} className="text-emerald-400" />
                  <span>Export GL (CSV)</span>
                </button>
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

      case 'transporter_ledger':
      case 'staff_ledger':
      case 'recurring':
        return (
          <div className="flex flex-col items-center justify-center p-12 text-center text-gray-500 no-print">
            <div className="bg-white/5 p-6 rounded-full mb-4">
              <FileText size={48} className="text-brand-600 opacity-50" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">{tabs.find(t => t.id === activeTab)?.label}</h3>
            <p className="max-w-xs mx-auto mb-6">No records found. Start by adding a new entry.</p>
            <button 
              onClick={() => { setTransactionType('INCOME'); setShowAddModal(true); }}
              className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Add First Entry
            </button>
          </div>
        );

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
        <StatCard title="Cash in Hand" amount={45200} type="neutral" icon={DollarSign} subtitle="Vault & Petty Cash" />
        <StatCard title="Total Receivables" amount={128500} type="pos" icon={ArrowDownLeft} subtitle="Pending client bills" />
        <StatCard title="Total Payables" amount={32100} type="neg" icon={ArrowUpRight} subtitle="Transporter & port dues" />
        <StatCard title="Client Ledger Dues" amount={clientSummary.netBalance} type="pos" icon={Briefcase} subtitle={`${selectedLedgerClient}`} />
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
