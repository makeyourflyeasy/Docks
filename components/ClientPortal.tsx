import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  FolderKanban, DollarSign, Plus, Search, Filter, Calendar, 
  Truck, ArrowRight, CheckCircle2, Clock, AlertCircle, FileText, 
  Camera, Upload, X, Eye, ChevronRight, ShieldCheck, 
  MapPin, Anchor, Box, ArrowUpRight, ArrowDownLeft, CreditCard,
  Building, RefreshCw, FileCheck, Layers, ExternalLink, User, Download, Loader2, LogOut, UserPlus,
  Receipt, Printer, Check, Phone, Info, Bell
} from 'lucide-react';
import Logo from './Logo';
import { useBranding } from '../services/brandingService';
import { 
  downloadContainerInvoicePdf, 
  downloadCasePdf, 
  downloadClientLedgerPdf,
  downloadLoadingBillPdf,
  downloadCustomsDeliveryOrderPdf,
  LoadingBillData
} from '../services/pdfExportService';
import { Case, CaseStatus, Container, FinanceEntry, ExtractedData, MockDocument, UserRole, Client, CaseCharge, AvailableVehicle } from '../types';
import { compressAndPrepareFile, convertImageToPdf } from '../services/fileUtils';
import TopModeSwitcher, { ModeOption } from './TopModeSwitcher';
import GoldenAmountWidget from './GoldenAmountWidget';
import { safeAppStorage } from '../services/storage';
import { logActivity } from '../services/activityLogService';
import { ClientRegistrationModal } from './ClientRegistrationModal';
import { 
  subscribeToCases, 
  saveCaseToFirestore, 
  subscribeToFinances, 
  saveFinanceToFirestore,
  subscribeToAvailableVehicles 
} from '../services/dbService';
import { AvailableVehiclesView } from './AvailableVehiclesView';

// Standard Route Pricing Matrix
export const DEFAULT_ROUTE_RATES: Record<string, number> = {
  "Karachi Port Trust -> Lahore Dry Port": 125000,
  "Karachi Port Trust -> Quetta Railway Dry Port": 185000,
  "Karachi Port Trust -> Peshawar Dry Port": 165000,
  "Karachi Port Trust -> Chaman Border Terminal": 220000,
  "Karachi Port Trust -> Taftan Border Terminal": 260000,
  "Port Qasim -> Lahore NLC Dry Port": 130000,
  "Port Qasim -> Faisalabad Dry Port": 115000,
  "Port Qasim -> Islamabad Dry Port": 170000,
  "Gwadar Port -> Quetta NLC Dry Port": 195000,
  "Gwadar Port -> Taftan Border Terminal": 240000,
  "Default Rate": 120000
};

export const getRouteRate = (pol: string, pod: string): number => {
  const key = `${pol} -> ${pod}`;
  return DEFAULT_ROUTE_RATES[key] || DEFAULT_ROUTE_RATES["Default Rate"];
};

export interface ClientPaymentEntry {
  id: number;
  date: string;
  amount: number;
  paymentMethod: 'ONLINE_TRANSFER' | 'BANK_DEPOSIT' | 'CHEQUE' | 'CASH';
  bankName: string;
  referenceNo: string;
  slipUrl?: string;
  status: 'CONFIRMED' | 'PENDING';
  remarks?: string;
  party?: string;
  caseNo?: string;
  category?: 'DPL Company Payment' | 'Loading Payment' | 'Vehicle Rent' | string;
  targetRecipient?: string;
  vehicleNo?: string;
}

const DEFAULT_COMPANY_BANKS = [
  'Meezan Bank Ltd (Corporate)',
  'Habib Bank Limited (HBL Corporate)',
  'Bank Al Habib Limited',
  'MCB Islamic Bank',
  'Standard Chartered Bank (Pakistan)',
  'Allied Bank Limited',
  'Faysal Bank Islamic'
];

interface ClientPortalProps {
  customLogo?: string | null;
  currentClientName?: string;
  onSwitchToAdmin?: () => void;
  onSwitchMode?: (mode: ModeOption) => void;
  onOpenAuthModal?: () => void;
  onSignOut?: () => void;
}

export const ClientPortal: React.FC<ClientPortalProps> = ({ 
  customLogo, 
  currentClientName,
  onSwitchToAdmin,
  onSwitchMode,
  onOpenAuthModal,
  onSignOut
}) => {
  const { companyName, subtitle, activeLogo, branding } = useBranding();

  // Navigation: 'cases' | 'case_status' | 'finance' | 'available_vehicles'
  const [activeTab, setActiveTab] = useState<'cases' | 'case_status' | 'finance' | 'available_vehicles'>('cases');
  const [isClientRegModalOpen, setIsClientRegModalOpen] = useState(false);
  
  // Data States
  const [casesList, setCasesList] = useState<Case[]>([]);
  const [financesList, setFinancesList] = useState<FinanceEntry[]>([]);
  const [availableVehiclesList, setAvailableVehiclesList] = useState<AvailableVehicle[]>([]);

  // Active Client Identity State
  const [selectedClientName, setSelectedClientName] = useState<string>(() => {
    return currentClientName || safeAppStorage.getItem('dpl_client_name') || 'Al-Khaleej Importers & Shipping Lines';
  });

  useEffect(() => {
    if (currentClientName) {
      setSelectedClientName(currentClientName);
    }
  }, [currentClientName]);

  useEffect(() => {
    if (selectedClientName) {
      safeAppStorage.setItem('dpl_client_name', selectedClientName);
    }
  }, [selectedClientName]);

  // Synchronize with live Firestore data
  useEffect(() => {
    const unsubCases = subscribeToCases((cases) => {
      if (cases) setCasesList(cases);
    });
    const unsubFinances = subscribeToFinances((finances) => {
      if (finances) setFinancesList(finances);
    });
    const unsubVehicles = subscribeToAvailableVehicles((items) => {
      if (items) setAvailableVehiclesList(items);
    });
    return () => {
      unsubCases();
      unsubFinances();
      unsubVehicles();
    };
  }, []);

  // Client matcher helper
  const isMatchClient = (name?: string) => {
    if (!name) return false;
    const a = name.toLowerCase().trim();
    const b = selectedClientName.toLowerCase().trim();
    return a === b || a.includes(b) || b.includes(a);
  };

  // Filtered Client Cases
  const clientCases = useMemo(() => {
    const list = casesList.filter(c => {
      const cClient = c.clientName || c.client || (c.extractedData as any)?.cargoOwner || (c.extractedData as any)?.consigneeName || '';
      return isMatchClient(cClient);
    });
    return list.length > 0 ? list : casesList;
  }, [casesList, selectedClientName]);

  // Partition cases into Pending and Complete
  const pendingCases = useMemo(() => {
    return clientCases.filter(c => c.status !== CaseStatus.COMPLETED && (c.status as any) !== 'Cancelled');
  }, [clientCases]);

  const completeCases = useMemo(() => {
    return clientCases.filter(c => c.status === CaseStatus.COMPLETED || (c.status as any) === 'Cancelled');
  }, [clientCases]);

  // Client Payments List derived from finances collection
  const paymentsList = useMemo(() => {
    return financesList
      .filter(f => f.type === 'INCOME' && isMatchClient(f.party))
      .map((f, idx) => ({
        id: Number(f.id) || idx + 1,
        date: f.date,
        amount: Number(f.amount) || 0,
        paymentMethod: f.paymentMethod === 'CASH' ? 'CASH' : 'ONLINE_TRANSFER',
        bankName: f.bankName || (typeof f.bankId === 'string' ? f.bankId : 'Meezan Bank Ltd'),
        referenceNo: f.reference || f.transactionId || '',
        slipUrl: f.slipUrl,
        status: f.status === 'PAID' ? 'CONFIRMED' : 'PENDING',
        remarks: f.description,
        party: f.party,
        caseNo: f.caseNo,
        category: f.category,
        targetRecipient: (f as any).targetRecipient || (f as any).targetStaff || (f as any).targetTransporter,
        vehicleNo: (f as any).vehicleNo
      })) as ClientPaymentEntry[];
  }, [financesList, selectedClientName]);

  // Search filter for Cases & Case Status Views
  const [caseSearchQuery, setCaseSearchQuery] = useState('');
  const [statusSearchQuery, setStatusSearchQuery] = useState('');

  const filteredPendingCases = useMemo(() => {
    if (!caseSearchQuery.trim()) return pendingCases;
    const q = caseSearchQuery.toLowerCase();
    return pendingCases.filter(c => 
      c.caseNo.toLowerCase().includes(q) ||
      (c.extractedData?.blNumber || '').toLowerCase().includes(q) ||
      (c.containers || []).some(cntr => cntr.number.toLowerCase().includes(q)) ||
      c.pol.toLowerCase().includes(q) ||
      c.pod.toLowerCase().includes(q) ||
      (c.extractedData?.itemName || '').toLowerCase().includes(q)
    );
  }, [pendingCases, caseSearchQuery]);

  const filteredCompleteCases = useMemo(() => {
    if (!caseSearchQuery.trim()) return completeCases;
    const q = caseSearchQuery.toLowerCase();
    return completeCases.filter(c => 
      c.caseNo.toLowerCase().includes(q) ||
      (c.extractedData?.blNumber || '').toLowerCase().includes(q) ||
      (c.containers || []).some(cntr => cntr.number.toLowerCase().includes(q)) ||
      c.pol.toLowerCase().includes(q) ||
      c.pod.toLowerCase().includes(q) ||
      (c.extractedData?.itemName || '').toLowerCase().includes(q)
    );
  }, [completeCases, caseSearchQuery]);

  const filteredStatusPendingCases = useMemo(() => {
    if (!statusSearchQuery.trim()) return pendingCases;
    const q = statusSearchQuery.toLowerCase();
    return pendingCases.filter(c => 
      c.caseNo.toLowerCase().includes(q) ||
      (c.extractedData?.blNumber || '').toLowerCase().includes(q) ||
      (c.containers || []).some(cntr => cntr.number.toLowerCase().includes(q)) ||
      c.pol.toLowerCase().includes(q) ||
      c.pod.toLowerCase().includes(q)
    );
  }, [pendingCases, statusSearchQuery]);

  // Selected Case for Full Detail Modal (Opens exactly like in Case Manager)
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [showCaseManagerViewModal, setShowCaseManagerViewModal] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Selected Case for Workflow Only Short Modal
  const [selectedWorkflowCase, setSelectedWorkflowCase] = useState<Case | null>(null);

  // =========================================================================
  // FINANCIAL CALCULATIONS: 3 COUNTERS (PAYABLE TO DPL, LOADING, VEHICLE RENT)
  // =========================================================================
  // 1. Payable to DPL: Commercial freight & documentation charges billed minus paid
  const billedToDpl = useMemo(() => {
    return clientCases.reduce((acc, c) => {
      const cTotal = (c.charges || []).reduce((sum, ch) => sum + (Number(ch.amount) || 0), 0);
      if (cTotal > 0) return acc + cTotal;
      const rate = getRouteRate(c.pol, c.pod);
      return acc + (rate * (c.containers?.length || 1));
    }, 0);
  }, [clientCases]);

  const paidToDpl = useMemo(() => {
    return paymentsList
      .filter(p => p.status === 'CONFIRMED' && (p.category === 'DPL Company Payment' || !p.category || p.category === 'Client Payment'))
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [paymentsList]);

  const payableToDpl = Math.max(0, billedToDpl - paidToDpl);

  // 2. Payable to Loading (Port loading bills)
  const billedToLoading = useMemo(() => {
    return clientCases.reduce((acc, c) => {
      let lbSum = 0;
      if (Array.isArray(c.loadingBills)) {
        lbSum += c.loadingBills.reduce((s, b) => s + (Number(b.totalAmount) || 0), 0);
      }
      // Also check charges for port loading fees
      (c.charges || []).forEach(ch => {
        const d = (ch.description || '').toLowerCase();
        if (d.includes('loading') || d.includes('port handling')) {
          lbSum += Number(ch.amount || 0);
        }
      });
      return acc + lbSum;
    }, 0);
  }, [clientCases]);

  const paidToLoading = useMemo(() => {
    return paymentsList
      .filter(p => p.status === 'CONFIRMED' && (p.category === 'Loading Payment' || (p.remarks || '').toLowerCase().includes('loading')))
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [paymentsList]);

  const payableToLoading = Math.max(0, billedToLoading - paidToLoading);

  // 3. Payable to Vehicle Rent (Transporters)
  const billedToVehicleRent = useMemo(() => {
    return clientCases.reduce((acc, c) => {
      return acc + (c.containers || []).reduce((cSum, cntr) => {
        // Default rent per container if not specified
        return cSum + (cntr.rentAmount || 120000);
      }, 0);
    }, 0);
  }, [clientCases]);

  const paidToVehicleRent = useMemo(() => {
    return paymentsList
      .filter(p => p.status === 'CONFIRMED' && (p.category === 'Vehicle Rent' || (p.remarks || '').toLowerCase().includes('vehicle rent') || (p.remarks || '').toLowerCase().includes('transporter')))
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [paymentsList]);

  const payableToVehicleRent = Math.max(0, billedToVehicleRent - paidToVehicleRent);

  // =========================================================================
  // FINANCE MODALS & FORMS
  // =========================================================================
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [showInvoicesModal, setShowInvoicesModal] = useState(false);
  const [showLoadingBillsModal, setShowLoadingBillsModal] = useState(false);
  const [showPaidPaymentModal, setShowPaidPaymentModal] = useState(false);

  // Paid Payment Form State
  const [paymentForm, setPaymentForm] = useState({
    mode: 'BANK' as 'CASH' | 'BANK',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: 'Company Payment (DPL)' as 'Company Payment (DPL)' | 'Loading Payment' | 'Vehicle Rent',
    bankName: 'Meezan Bank Ltd (Corporate)',
    customBankName: '',
    slipUrl: '',
    caseNo: '',
    remarks: '',
    selectedContainerIndex: 0
  });

  const [paymentCaseSearch, setPaymentCaseSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Eligible cases for payment selection (pending + recent completed)
  const paymentEligibleCases = useMemo(() => {
    const list = [...pendingCases, ...completeCases.slice(0, 5)];
    if (!paymentCaseSearch.trim()) return list;
    const q = paymentCaseSearch.toLowerCase();
    return list.filter(c => c.caseNo.toLowerCase().includes(q) || (c.extractedData?.blNumber || '').toLowerCase().includes(q));
  }, [pendingCases, completeCases, paymentCaseSearch]);

  const selectedCaseForPayment = useMemo(() => {
    return paymentEligibleCases.find(c => c.caseNo === paymentForm.caseNo) || paymentEligibleCases[0];
  }, [paymentEligibleCases, paymentForm.caseNo]);

  // Submit Payment Handler
  const handleConfirmPaidPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    const activeClient = selectedClientName;
    const caseItem = selectedCaseForPayment;
    const assignedContainer = caseItem?.containers?.[paymentForm.selectedContainerIndex] || caseItem?.containers?.[0];

    // Determine target recipient based on category
    let targetRecipient = 'DPL Billing Department';
    let targetRole = 'ADMIN';
    if (paymentForm.category === 'Loading Payment') {
      targetRecipient = (caseItem as any)?.loadingStaffName || (caseItem?.loadingBills?.[0]?.staffName) || 'Mohsin Khan';
      targetRole = 'LOADING_PORT_STAFF';
    } else if (paymentForm.category === 'Vehicle Rent') {
      targetRecipient = assignedContainer?.transporterName || (caseItem as any)?.transporterName || 'Bilal Goods Transport Co.';
      targetRole = 'TRANSPORTER';
    }

    const finalBank = paymentForm.bankName === 'Other Bank' ? (paymentForm.customBankName || 'Direct Bank Deposit') : paymentForm.bankName;

    const newPaymentEntry: Partial<FinanceEntry> = {
      id: Date.now(),
      date: paymentForm.date,
      type: 'INCOME',
      category: paymentForm.category,
      description: `${paymentForm.category} payment from ${activeClient} (${caseItem ? `Case ${caseItem.caseNo}` : 'Account'})`,
      amount: parseFloat(paymentForm.amount),
      party: activeClient,
      paymentMethod: paymentForm.mode === 'CASH' ? 'CASH' : 'BANK',
      bankName: paymentForm.mode === 'CASH' ? 'Drawer Cash' : finalBank,
      reference: paymentForm.mode === 'CASH' ? 'Cash Voucher' : `SLIP-${Date.now().toString().slice(-6)}`,
      status: 'PENDING',
      slipUrl: paymentForm.slipUrl || 'https://placehold.co/600x800/png?text=Payment+Receipt+Proof',
      caseNo: caseItem?.caseNo || '',
      vehicleNo: assignedContainer?.vehicleNo || '',
      targetRecipient: targetRecipient,
      targetRole: targetRole,
      remarks: paymentForm.remarks
    } as any;

    saveFinanceToFirestore(newPaymentEntry as FinanceEntry);

    logActivity(
      `Payment Submitted: PKR ${parseFloat(paymentForm.amount).toLocaleString()} for ${paymentForm.category}`,
      `Client "${activeClient}" submitted payment request. Routed to ${targetRecipient} for approval.`,
      'CLIENT',
      activeClient,
      { caseNo: caseItem?.caseNo, amount: paymentForm.amount }
    );

    setShowPaidPaymentModal(false);
    setPaymentForm({
      mode: 'BANK',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      category: 'Company Payment (DPL)',
      bankName: 'Meezan Bank Ltd (Corporate)',
      customBankName: '',
      slipUrl: '',
      caseNo: '',
      remarks: '',
      selectedContainerIndex: 0
    });

    alert(
      `Payment Request of PKR ${parseFloat(paymentForm.amount).toLocaleString()} submitted successfully!\n` +
      `Category: ${paymentForm.category}\n` +
      `Recipient: ${targetRecipient}\n` +
      `Status: Awaiting approval. Once approved by ${targetRecipient}, it will be credited to their ledger.`
    );
  };

  // Camera slip capture
  const startCamera = async () => {
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert("Unable to access camera. Please upload slip file directly.");
      setIsCameraActive(false);
    }
  };

  const capturePhoto = async () => {
    if (videoRef.current) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth || 1280;
        canvas.height = videoRef.current.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const rawDataUrl = canvas.toDataURL('image/jpeg', 0.9);
          setPaymentForm(prev => ({ ...prev, slipUrl: rawDataUrl }));
          stopCamera();
        }
      } catch (err) {
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Passbook Filter State
  const [passbookFilter, setPassbookFilter] = useState<'ALL' | 'PAYMENTS' | 'INVOICES' | 'LOADING_BILLS' | 'VEHICLE_RENT'>('ALL');

  // Unified Passbook Entries
  const passbookEntries = useMemo(() => {
    const list: Array<{
      id: string;
      date: string;
      type: 'PAYMENT' | 'INVOICE' | 'LOADING_BILL' | 'VEHICLE_RENT';
      typeName: string;
      recipient: string;
      caseNo?: string;
      containerNo?: string;
      amount: number;
      status: 'CONFIRMED' | 'PENDING' | 'GENERATED';
      slipUrl?: string;
      pdfAction?: () => void;
    }> = [];

    // 1. Add Payments Made
    paymentsList.forEach(p => {
      let tName = 'Payment Paid (DPL)';
      if (p.category === 'Loading Payment') tName = 'Loading Payment Paid';
      if (p.category === 'Vehicle Rent') tName = 'Vehicle Rent Paid';

      list.push({
        id: `pay_${p.id}`,
        date: p.date,
        type: 'PAYMENT',
        typeName: tName,
        recipient: p.targetRecipient || (p.category === 'Loading Payment' ? 'Port Loading Staff' : p.category === 'Vehicle Rent' ? 'Transporter' : 'DPL Company'),
        caseNo: p.caseNo,
        amount: p.amount,
        status: p.status,
        slipUrl: p.slipUrl
      });
    });

    // 2. Add Generated Invoices from Cases
    clientCases.forEach(c => {
      const rate = getRouteRate(c.pol, c.pod);
      (c.containers || [{ number: 'MSKU-DEFAULT' } as any]).forEach((cntr, idx) => {
        list.push({
          id: `inv_${c.id}_${idx}`,
          date: c.createdAt || new Date().toISOString().split('T')[0],
          type: 'INVOICE',
          typeName: 'Freight Commercial Invoice',
          recipient: 'DPL Company Billing',
          caseNo: c.caseNo,
          containerNo: cntr.number,
          amount: rate + 15000,
          status: 'GENERATED',
          pdfAction: () => downloadContainerInvoicePdf({
            invoiceNo: `INV-26-${(cntr.number || '0000').slice(-4)}`,
            clientName: selectedClientName,
            containerNo: cntr.number,
            size: (cntr as any).size || '40ft',
            route: `${c.pol} -> ${c.pod}`,
            rate: rate,
            date: c.createdAt,
            companyName: companyName
          })
        });
      });
    });

    // 3. Add Generated Loading Bills from Cases
    clientCases.forEach(c => {
      if (Array.isArray(c.loadingBills) && c.loadingBills.length > 0) {
        c.loadingBills.forEach((b, bIdx) => {
          list.push({
            id: `lb_${b.id || bIdx}`,
            date: b.date || c.createdAt,
            type: 'LOADING_BILL',
            typeName: 'Port Loading Bill',
            recipient: b.staffName || 'Port Loading Officer',
            caseNo: c.caseNo,
            containerNo: b.containerNo,
            amount: b.totalAmount || 25000,
            status: 'GENERATED',
            pdfAction: () => downloadLoadingBillPdf({
              billNo: b.billNo || `LB-${bIdx + 1}`,
              caseNo: c.caseNo,
              clientName: c.clientName,
              containerNo: b.containerNo || 'MSKU-DEFAULT',
              portTerminal: c.pol || 'Port Terminal',
              date: b.date || c.createdAt,
              items: [{ head: 'Terminal Handling & Loading', amount: b.totalAmount || 25000 }],
              totalAmount: b.totalAmount || 25000,
              officerName: b.staffName || 'Port Officer'
            })
          });
        });
      }
    });

    // Sort by date descending
    list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    // Apply Filter Tab
    if (passbookFilter === 'PAYMENTS') return list.filter(i => i.type === 'PAYMENT');
    if (passbookFilter === 'INVOICES') return list.filter(i => i.type === 'INVOICE');
    if (passbookFilter === 'LOADING_BILLS') return list.filter(i => i.type === 'LOADING_BILL');
    if (passbookFilter === 'VEHICLE_RENT') return list.filter(i => i.typeName.includes('Vehicle Rent'));

    return list;
  }, [paymentsList, clientCases, passbookFilter, selectedClientName, companyName]);

  // Client Action Needed in Workflow Detection
  const clientActionNeededCount = useMemo(() => {
    return pendingCases.filter(c => {
      return (
        c.status === CaseStatus.SHIPPING_LINE_DO || 
        c.status === CaseStatus.TP_FILING ||
        Boolean(c.charges?.some(ch => !ch.receiptUrl))
      );
    }).length;
  }, [pendingCases]);

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-950 text-gray-100 font-sans">

      {/* ========================================================================= */}
      {/* 1. LEFT SIDEBAR NAVIGATION (REQUESTED BY USER) */}
      {/* ========================================================================= */}
      <aside className="w-full lg:w-64 bg-slate-900/95 border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col shrink-0 no-print">
        
        {/* Brand Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-slate-950 p-1.5 rounded-xl border border-white/10">
              <Logo className="h-7 w-auto" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-wide">Client Portal</h1>
              <p className="text-[10px] text-amber-400 font-medium">Importer & Logistics Desk</p>
            </div>
          </div>
        </div>

        {/* Client Identity Display */}
        <div className="p-3.5 mx-3 my-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-600/20 text-amber-300 font-bold text-xs flex items-center justify-center border border-amber-500/30 uppercase">
              {selectedClientName.slice(0, 2)}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-white truncate" title={selectedClientName}>
                {selectedClientName}
              </h4>
              <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                <ShieldCheck size={11} /> Verified Corporate Client
              </span>
            </div>
          </div>

          <div className="pt-1 flex items-center justify-between text-[11px] border-t border-white/10">
            <button
              onClick={() => setIsClientRegModalOpen(true)}
              className="text-purple-300 hover:text-white flex items-center gap-1 text-[10px] font-semibold"
            >
              <UserPlus size={11} /> Profile & Universal Rates
            </button>
          </div>
        </div>

        {/* 3 Main Sidebar Options Requested by User */}
        <nav className="flex-1 p-3 space-y-1.5">
          
          {/* Option 1: Cases */}
          <button
            onClick={() => setActiveTab('cases')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'cases'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FolderKanban size={17} />
            <span>Cases</span>
            <span className="ml-auto text-[11px] font-mono font-bold bg-black/30 px-2 py-0.5 rounded-full">
              {clientCases.length}
            </span>
          </button>

          {/* Option 2: Check Case Status */}
          <button
            onClick={() => setActiveTab('case_status')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all relative ${
              activeTab === 'case_status'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Clock size={17} />
            <span>Check Case Status</span>
            {clientActionNeededCount > 0 && (
              <span className="ml-auto bg-amber-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                Action Req
              </span>
            )}
          </button>

          {/* Option 3: Finance */}
          <button
            onClick={() => setActiveTab('finance')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'finance'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <DollarSign size={17} />
            <span>Finance</span>
            {payableToDpl + payableToLoading + payableToVehicleRent > 0 && (
              <span className="ml-auto text-[10px] font-mono font-bold text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded">
                Due
              </span>
            )}
          </button>

          {/* Option 4: Available & Ready Vehicles (Transporters) */}
          <button
            onClick={() => setActiveTab('available_vehicles')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'available_vehicles'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Truck size={17} />
            <span>Available / Ready Fleet</span>
            <span className="ml-auto text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">
              {availableVehiclesList.length}
            </span>
          </button>

        </nav>

        {/* Quick Amount Widget */}
        <div className="p-3 border-t border-white/10">
          <GoldenAmountWidget onOpenFinance={() => setActiveTab('finance')} />
        </div>

        {/* Sign Out Button */}
        <div className="p-3 border-t border-white/10 flex items-center justify-between">
          <button
            onClick={onSignOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-semibold transition"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>

      </aside>

      {/* ========================================================================= */}
      {/* 2. MAIN CLIENT CONTENT AREA */}
      {/* ========================================================================= */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">

        {/* ======================================================================= */}
        {/* PAGE 1: CASES VIEW (SEARCH + PENDING SECTION + COMPLETE SECTION) */}
        {/* ======================================================================= */}
        {activeTab === 'cases' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Header & Case Search Field as Requested */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-white/10 space-y-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <FolderKanban className="text-amber-400" size={22} />
                    <span>Client Shipment Cases</span>
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Search and track all active, in-transit, and completed consignments
                  </p>
                </div>

                <button
                  onClick={() => setIsClientRegModalOpen(true)}
                  className="bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <UserPlus size={14} />
                  <span>Client Profile</span>
                </button>
              </div>

              {/* Case Search Input Field */}
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by Case No (e.g. DPL-26-0001), B/L No, Container No, Port, Goods..."
                  value={caseSearchQuery}
                  onChange={(e) => setCaseSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 shadow-inner"
                />
              </div>
            </div>

            {/* SECTION 1: PENDING CASES (IN-PROGRESS) */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Clock className="text-amber-400" size={18} />
                  <span>Pending / In-Progress Cases</span>
                  <span className="bg-amber-500/20 text-amber-300 text-xs px-2 py-0.5 rounded-full border border-amber-500/30 font-semibold font-mono">
                    {filteredPendingCases.length}
                  </span>
                </h3>
              </div>

              {filteredPendingCases.length === 0 ? (
                <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 text-center text-gray-400">
                  <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-2 opacity-80" />
                  <p className="text-sm font-semibold text-white">No Pending Cases</p>
                  <p className="text-xs text-gray-500">All your active consignments have completed their journey.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredPendingCases.map((c) => (
                    <div 
                      key={c.id}
                      onClick={() => {
                        setSelectedCase(c);
                        setShowCaseManagerViewModal(true);
                      }}
                      className="bg-slate-900 border border-white/10 hover:border-amber-500/50 rounded-2xl p-5 space-y-3.5 cursor-pointer transition-all hover:shadow-xl group"
                    >
                      <div className="flex justify-between items-start border-b border-white/10 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-base text-white group-hover:text-amber-300 transition-colors">
                              {c.caseNo}
                            </span>
                            <span className="bg-brand-500/20 text-brand-300 text-[10px] px-2 py-0.5 rounded font-semibold">
                              {c.category}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            B/L: <span className="font-mono text-gray-200">{c.extractedData?.blNumber || 'N/A'}</span> &bull; {c.extractedData?.itemName || 'General Cargo'}
                          </p>
                        </div>
                        <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[11px] px-2.5 py-0.5 rounded-full font-medium">
                          {c.status}
                        </span>
                      </div>

                      {/* Route */}
                      <div className="bg-white/5 rounded-xl p-2.5 flex items-center justify-between text-xs text-gray-300">
                        <div className="flex items-center gap-1.5">
                          <Anchor size={13} className="text-amber-400" />
                          <span>{c.pol}</span>
                        </div>
                        <ArrowRight size={13} className="text-gray-500" />
                        <div className="flex items-center gap-1.5">
                          <MapPin size={13} className="text-emerald-400" />
                          <span>{c.pod}</span>
                        </div>
                      </div>

                      {/* Containers Preview */}
                      <div className="text-xs text-gray-400 flex justify-between items-center pt-1">
                        <span>Containers: <strong className="text-white font-mono">{c.containers?.length || 1}</strong></span>
                        <span className="text-amber-400 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                          Open Full Details <ChevronRight size={14} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECTION 2: COMPLETE CASES */}
            <div className="space-y-3 pt-4 border-t border-white/10">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="text-emerald-400" size={18} />
                  <span>Complete / Delivered Cases</span>
                  <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2 py-0.5 rounded-full border border-emerald-500/30 font-semibold font-mono">
                    {filteredCompleteCases.length}
                  </span>
                </h3>
              </div>

              {filteredCompleteCases.length === 0 ? (
                <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 text-center text-gray-400">
                  <p className="text-xs text-gray-500">No completed cases in archive yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredCompleteCases.map((c) => (
                    <div 
                      key={c.id}
                      onClick={() => {
                        setSelectedCase(c);
                        setShowCaseManagerViewModal(true);
                      }}
                      className="bg-slate-900/80 border border-white/10 hover:border-emerald-500/50 rounded-2xl p-5 space-y-3.5 cursor-pointer transition-all hover:shadow-xl group"
                    >
                      <div className="flex justify-between items-start border-b border-white/10 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-base text-white group-hover:text-emerald-300 transition-colors">
                              {c.caseNo}
                            </span>
                            <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded font-semibold">
                              Delivered
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            B/L: <span className="font-mono text-gray-200">{c.extractedData?.blNumber || 'N/A'}</span> &bull; {c.extractedData?.itemName || 'Delivered Cargo'}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400 font-mono">
                          {c.createdAt}
                        </span>
                      </div>

                      <div className="bg-white/5 rounded-xl p-2.5 flex items-center justify-between text-xs text-gray-300">
                        <span>{c.pol} &rarr; {c.pod}</span>
                        <span className="font-mono text-emerald-400">{c.containers?.length || 1} Containers</span>
                      </div>

                      <div className="text-xs text-emerald-400 font-semibold flex justify-end items-center gap-1 group-hover:translate-x-1 transition-transform">
                        <span>View Archive & Documents</span>
                        <ChevronRight size={14} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ======================================================================= */}
        {/* PAGE 2: CHECK CASE STATUS (WORKFLOW ONLY POPUP) */}
        {/* ======================================================================= */}
        {activeTab === 'case_status' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Top Search Bar */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-white/10 space-y-3">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Clock className="text-amber-400" size={22} />
                  <span>Live Case Workflow & Stage Progress</span>
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Click on any pending case below to view its visual 8-step workflow pipeline with completion ticks and client required actions
                </p>
              </div>

              {/* Client Action Alert Banner */}
              {clientActionNeededCount > 0 && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs text-amber-300">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} className="text-amber-400 shrink-0" />
                    <span>
                      <strong>Action Required:</strong> You have {clientActionNeededCount} case(s) with pending actions managed by client. Please check and complete.
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-bold bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                    Client Action Pending
                  </span>
                </div>
              )}

              {/* Status Search Input */}
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search case status by Case No, B/L No, Route..."
                  value={statusSearchQuery}
                  onChange={(e) => setStatusSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Pending Cases Status List */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                Pending Shipments ({filteredStatusPendingCases.length}):
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredStatusPendingCases.map((c) => {
                  const isClientAction = c.status === CaseStatus.SHIPPING_LINE_DO || c.status === CaseStatus.TP_FILING;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedWorkflowCase(c)}
                      className="bg-slate-900 border border-white/10 hover:border-amber-500/50 rounded-2xl p-5 space-y-3 cursor-pointer transition-all hover:shadow-xl group"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-base text-white group-hover:text-amber-300 transition-colors">
                              {c.caseNo}
                            </span>
                            <span className="bg-brand-500/20 text-brand-300 text-[10px] px-2 py-0.5 rounded font-semibold">
                              {c.category}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Route: {c.pol} &rarr; {c.pod} &bull; B/L: {c.extractedData?.blNumber || 'N/A'}
                          </p>
                        </div>
                        <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs px-2.5 py-0.5 rounded-full font-medium">
                          {c.status}
                        </span>
                      </div>

                      {/* Managed by Client Badge */}
                      {isClientAction && (
                        <div className="bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl flex items-center gap-2 text-xs text-amber-300">
                          <AlertCircle size={14} className="text-amber-400 shrink-0" />
                          <span className="font-medium">
                            ⚠️ MANAGED BY CLIENT: Document / Clearance action required by client
                          </span>
                        </div>
                      )}

                      <div className="pt-2 border-t border-white/10 flex justify-between items-center text-xs">
                        <span className="text-gray-400">Containers: {c.containers?.length || 1}</span>
                        <span className="text-amber-400 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                          <span>View Workflow Pipeline</span>
                          <ChevronRight size={14} />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* ======================================================================= */}
        {/* PAGE 3: FINANCE VIEW (DOWNLOAD BUTTONS + PAID MODAL + 3 COUNTERS + PASSBOOK) */}
        {/* ======================================================================= */}
        {activeTab === 'finance' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Top Download Buttons & Paid Button (Requested by User) */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-900 p-5 rounded-2xl border border-white/10">
              
              {/* 1. Download Ledger */}
              <button
                type="button"
                onClick={() => setShowLedgerModal(true)}
                className="bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/30 p-3.5 rounded-xl flex items-center gap-3 transition shadow-sm"
              >
                <div className="w-9 h-9 rounded-lg bg-brand-600/20 text-brand-400 flex items-center justify-center shrink-0">
                  <FileText size={18} />
                </div>
                <div className="text-left min-w-0">
                  <h4 className="text-xs font-bold text-white truncate">Download Ledger</h4>
                  <p className="text-[10px] text-gray-400 truncate">Account Statement PDF</p>
                </div>
              </button>

              {/* 2. Download Invoice */}
              <button
                type="button"
                onClick={() => setShowInvoicesModal(true)}
                className="bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 p-3.5 rounded-xl flex items-center gap-3 transition shadow-sm"
              >
                <div className="w-9 h-9 rounded-lg bg-amber-600/20 text-amber-400 flex items-center justify-center shrink-0">
                  <Receipt size={18} />
                </div>
                <div className="text-left min-w-0">
                  <h4 className="text-xs font-bold text-white truncate">Download Invoice</h4>
                  <p className="text-[10px] text-gray-400 truncate">Case & Container Bills</p>
                </div>
              </button>

              {/* 3. Download Loading Bill */}
              <button
                type="button"
                onClick={() => setShowLoadingBillsModal(true)}
                className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 p-3.5 rounded-xl flex items-center gap-3 transition shadow-sm"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <FileCheck size={18} />
                </div>
                <div className="text-left min-w-0">
                  <h4 className="text-xs font-bold text-white truncate">Download Loading Bill</h4>
                  <p className="text-[10px] text-gray-400 truncate">Port Staff Terminal Bills</p>
                </div>
              </button>

              {/* 4. Prominent Paid Button */}
              <button
                type="button"
                onClick={() => setShowPaidPaymentModal(true)}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white p-3.5 rounded-xl flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-600/30 font-bold text-xs transition active:scale-95"
              >
                <CreditCard size={18} />
                <span>+ Make Payment (Paid)</span>
              </button>

            </div>

            {/* =================================================================== */}
            {/* TOP 3 COUNTERS REQUESTED BY USER */}
            {/* 1. Payable to DPL | 2. Payable to Loading | 3. Payable to Vehicle Rent */}
            {/* =================================================================== */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Counter 1: Payable to DPL */}
              <div className="bg-slate-900 border border-amber-500/30 p-5 rounded-2xl space-y-1 shadow-lg">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-amber-400">Payable to DPL</span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30 font-medium">
                    Company Balance
                  </span>
                </div>
                <p className="text-2xl font-mono font-bold text-white">
                  PKR {payableToDpl.toLocaleString()}
                </p>
                <span className="text-[11px] text-gray-400 block">
                  Remaining balance due to DPL company (0 if nil)
                </span>
              </div>

              {/* Counter 2: Payable to Loading */}
              <div className="bg-slate-900 border border-blue-500/30 p-5 rounded-2xl space-y-1 shadow-lg">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-blue-400">Payable to Loading</span>
                  <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30 font-medium">
                    Port Handling
                  </span>
                </div>
                <p className="text-2xl font-mono font-bold text-white">
                  PKR {payableToLoading.toLocaleString()}
                </p>
                <span className="text-[11px] text-gray-400 block">
                  Port loading fees pending to loading staff (0 if nil)
                </span>
              </div>

              {/* Counter 3: Payable to Vehicle Rent */}
              <div className="bg-slate-900 border border-emerald-500/30 p-5 rounded-2xl space-y-1 shadow-lg">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-emerald-400">Payable to Vehicle Rent</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30 font-medium">
                    Transporter Freight
                  </span>
                </div>
                <p className="text-2xl font-mono font-bold text-white">
                  PKR {payableToVehicleRent.toLocaleString()}
                </p>
                <span className="text-[11px] text-gray-400 block">
                  Vehicle rent pending to transporters (0 if nil)
                </span>
              </div>

            </div>

            {/* Passbook / Recent Transactions Stream Requested by User */}
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-4">
                <div>
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <Receipt size={18} className="text-amber-400" />
                    <span>Recent Transactions & Financial Passbook</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    History of payments made, generated invoices, loading bills, and vehicle rent
                  </p>
                </div>

                {/* Passbook Sub-Filter Tabs */}
                <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-white/10 text-xs">
                  <button
                    onClick={() => setPassbookFilter('ALL')}
                    className={`px-3 py-1 rounded-lg transition ${passbookFilter === 'ALL' ? 'bg-amber-600 text-white font-bold' : 'text-gray-400 hover:text-white'}`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setPassbookFilter('PAYMENTS')}
                    className={`px-3 py-1 rounded-lg transition ${passbookFilter === 'PAYMENTS' ? 'bg-amber-600 text-white font-bold' : 'text-gray-400 hover:text-white'}`}
                  >
                    Payments
                  </button>
                  <button
                    onClick={() => setPassbookFilter('INVOICES')}
                    className={`px-3 py-1 rounded-lg transition ${passbookFilter === 'INVOICES' ? 'bg-amber-600 text-white font-bold' : 'text-gray-400 hover:text-white'}`}
                  >
                    Invoices
                  </button>
                  <button
                    onClick={() => setPassbookFilter('LOADING_BILLS')}
                    className={`px-3 py-1 rounded-lg transition ${passbookFilter === 'LOADING_BILLS' ? 'bg-amber-600 text-white font-bold' : 'text-gray-400 hover:text-white'}`}
                  >
                    Loading Bills
                  </button>
                  <button
                    onClick={() => setPassbookFilter('VEHICLE_RENT')}
                    className={`px-3 py-1 rounded-lg transition ${passbookFilter === 'VEHICLE_RENT' ? 'bg-amber-600 text-white font-bold' : 'text-gray-400 hover:text-white'}`}
                  >
                    Vehicle Rent
                  </button>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-left text-xs text-gray-200">
                  <thead className="bg-slate-950 uppercase font-semibold text-gray-400 border-b border-white/10">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Recipient / Party</th>
                      <th className="p-3">Case / Container</th>
                      <th className="p-3">Amount (PKR)</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 bg-slate-900/40">
                    {passbookEntries.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-gray-500">
                          No transactions found for this filter.
                        </td>
                      </tr>
                    ) : (
                      passbookEntries.map((row) => (
                        <tr key={row.id} className="hover:bg-white/5 transition">
                          <td className="p-3 font-mono text-gray-300">{row.date}</td>
                          <td className="p-3">
                            <span className="font-semibold text-white">{row.typeName}</span>
                          </td>
                          <td className="p-3 text-amber-300">{row.recipient}</td>
                          <td className="p-3 font-mono text-gray-300">
                            {row.caseNo || '-'} {row.containerNo ? `(${row.containerNo})` : ''}
                          </td>
                          <td className="p-3 font-mono font-bold text-white text-sm">
                            PKR {row.amount.toLocaleString()}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              row.status === 'CONFIRMED' || row.status === 'GENERATED'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            }`}>
                              {row.status === 'CONFIRMED' ? 'Confirmed / Settled' : row.status === 'PENDING' ? 'Pending Approval' : 'Generated'}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            {row.slipUrl && (
                              <button
                                onClick={() => setLightboxImage(row.slipUrl!)}
                                className="text-amber-400 hover:text-amber-300 underline inline-flex items-center gap-1 mr-2"
                              >
                                <Eye size={12} /> View Slip
                              </button>
                            )}
                            {row.pdfAction && (
                              <button
                                onClick={row.pdfAction}
                                className="bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 px-2 py-1 rounded text-[11px] inline-flex items-center gap-1"
                              >
                                <Download size={11} /> PDF
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>

          </div>
        )}

        {/* ======================================================================= */}
        {/* PAGE 4: AVAILABLE & READY FLEET (TRANSPORTERS) */}
        {/* ======================================================================= */}
        {activeTab === 'available_vehicles' && (
          <div className="animate-fade-in">
            <AvailableVehiclesView userRole="CLIENT" />
          </div>
        )}

      </main>

      {/* ========================================================================= */}
      {/* MODAL: SHORT WORKFLOW PIPELINE POPUP (FOR CHECK CASE STATUS) */}
      {/* ========================================================================= */}
      {selectedWorkflowCase && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center pt-3 sm:pt-6 pb-6 px-3 sm:px-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 rounded-3xl max-w-xl w-full border border-white/10 shadow-2xl p-6 mb-8 space-y-5 animate-fade-in">
            
            {/* Header */}
            <div className="flex justify-between items-start border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xl font-bold text-white">{selectedWorkflowCase.caseNo}</span>
                  <span className="bg-brand-500/20 text-brand-300 text-xs px-2.5 py-0.5 rounded font-semibold">
                    {selectedWorkflowCase.category}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Route: {selectedWorkflowCase.pol} &rarr; {selectedWorkflowCase.pod} &bull; B/L: {selectedWorkflowCase.extractedData?.blNumber || 'N/A'}
                </p>
              </div>
              <button 
                onClick={() => setSelectedWorkflowCase(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            {/* 8-Step Streamlined Workflow Pipeline */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Consignment Workflow Stages:
              </p>

              {(() => {
                const stages = [
                  { id: '1', title: 'Case Registration & B/L Upload', isClientAction: false },
                  { id: '2', title: 'Shipping Line Delivery Order (DO) & Terminal Fee Settlement', isClientAction: true, clientInstruction: 'Please complete this action: Ensure shipping line clearance & settlement.' },
                  { id: '3', title: 'Goods Declaration (GD) Filing & Customs Clearance', isClientAction: false },
                  { id: '4', title: 'Port Terminal Handling & Container Loading', isClientAction: false },
                  { id: '5', title: 'Transporter Allocation & Gate-Out Clearance', isClientAction: false },
                  { id: '6', title: 'In-Transit Transport & Route Dispatch', isClientAction: false },
                  { id: '7', title: 'Destination Dry Port Arrival & Offloading', isClientAction: false },
                  { id: '8', title: 'Final Customs Release & Consignment Delivery', isClientAction: false }
                ];

                // Determine active step index based on case status
                let activeIdx = 2;
                if (selectedWorkflowCase.status === CaseStatus.COMPLETED) activeIdx = 8;
                else if (selectedWorkflowCase.status === CaseStatus.IN_TRANSIT) activeIdx = 6;
                else if (selectedWorkflowCase.status === CaseStatus.LOADING_PORT_PROCESSING) activeIdx = 4;
                else if (selectedWorkflowCase.status === CaseStatus.SHIPPING_LINE_DO) activeIdx = 2;

                return (
                  <div className="space-y-2.5">
                    {stages.map((st, sIdx) => {
                      const isComplete = sIdx < activeIdx;
                      const isCurrent = sIdx === activeIdx - 1;
                      const isPending = sIdx >= activeIdx;

                      return (
                        <div 
                          key={st.id} 
                          className={`p-3 rounded-xl border transition-all ${
                            isComplete 
                              ? 'bg-emerald-500/10 border-emerald-500/30' 
                              : isCurrent 
                                ? 'bg-amber-500/15 border-amber-500/50 shadow-md' 
                                : 'bg-slate-950 border-white/5 opacity-60'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              {isComplete ? (
                                <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
                                  <Check size={14} />
                                </div>
                              ) : isCurrent ? (
                                <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xs animate-pulse">
                                  {sIdx + 1}
                                </div>
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-white/10 text-gray-400 flex items-center justify-center text-xs">
                                  {sIdx + 1}
                                </div>
                              )}
                              <span className={`text-xs font-semibold ${isComplete ? 'text-emerald-300' : isCurrent ? 'text-white' : 'text-gray-400'}`}>
                                {st.title}
                              </span>
                            </div>

                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              isComplete 
                                ? 'bg-emerald-500/20 text-emerald-300' 
                                : isCurrent 
                                  ? 'bg-amber-500/20 text-amber-300 animate-pulse' 
                                  : 'text-gray-500'
                            }`}>
                              {isComplete ? 'Complete' : isCurrent ? 'Active' : 'Pending'}
                            </span>
                          </div>

                          {/* Managed by Client Prompt in English */}
                          {st.isClientAction && isCurrent && (
                            <div className="mt-2.5 p-2.5 bg-amber-500/20 border border-amber-500/40 rounded-lg text-xs text-amber-200 space-y-1">
                              <p className="font-bold flex items-center gap-1.5">
                                <AlertCircle size={13} className="text-amber-400" />
                                <span>⚠️ MANAGED BY CLIENT: Action Required by Client</span>
                              </p>
                              <p className="text-[11px] text-gray-200">
                                {st.clientInstruction}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedWorkflowCase(null)}
                className="bg-amber-600 hover:bg-amber-500 text-white px-5 py-2 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: FULL CASE DETAILS MODAL (MATCHING CASE MANAGER VIEW & DOWNLOADS) */}
      {/* ========================================================================= */}
      {showCaseManagerViewModal && selectedCase && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-start justify-center pt-3 sm:pt-6 pb-6 px-3 sm:px-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 rounded-3xl max-w-3xl w-full border border-white/10 shadow-2xl overflow-hidden mb-8 p-6 space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-2xl font-bold text-white">{selectedCase.caseNo}</span>
                  <span className="bg-brand-500/20 text-brand-300 text-xs px-2.5 py-0.5 rounded font-semibold">
                    {selectedCase.category}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Route: {selectedCase.pol} &rarr; {selectedCase.pod} &bull; Created: {selectedCase.createdAt}
                </p>
              </div>

              <button 
                onClick={() => {
                  setShowCaseManagerViewModal(false);
                  setSelectedCase(null);
                }}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            {/* Shipping & Goods Specs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/5 p-4 rounded-2xl text-xs border border-white/5">
              <div>
                <span className="text-gray-400 block text-[11px]">B/L Number:</span>
                <span className="font-mono text-white font-bold">{selectedCase.extractedData?.blNumber || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Vessel Name:</span>
                <span className="text-white font-medium">{selectedCase.extractedData?.vesselName || 'Cosco Express'}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Total Weight:</span>
                <span className="font-mono text-white font-medium">{selectedCase.extractedData?.totalWeight || 28000} Kg</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Item Description:</span>
                <span className="text-white font-medium">{selectedCase.extractedData?.itemName || 'General Cargo'}</span>
              </div>
            </div>

            {/* Containers List with Assigned Vehicles */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Assigned Containers & Fleet Carriers ({selectedCase.containers?.length || 1}):
              </h4>
              <div className="space-y-2">
                {(selectedCase.containers || []).map((cntr, idx) => (
                  <div key={cntr.id || idx} className="bg-slate-950 p-3.5 rounded-xl border border-white/10 flex flex-col sm:flex-row justify-between sm:items-center gap-2 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white text-sm">{cntr.number}</span>
                        <span className="bg-brand-500/20 text-brand-300 text-[10px] px-2 py-0.5 rounded">{cntr.size}</span>
                        <span className="bg-blue-500/20 text-blue-300 text-[10px] px-2 py-0.5 rounded">{cntr.status}</span>
                      </div>
                      <p className="text-gray-400 text-[11px] mt-1">
                        🚗 Vehicle: <strong className="text-white font-mono">{cntr.vehicleNo || 'TL-8842'}</strong> &bull; Driver: {cntr.driverName || 'Muhammad Ismail'} ({cntr.driverContact || '0300-8877665'})
                      </p>
                    </div>
                    <div className="text-right font-mono text-gray-300">
                      {cntr.weight} Kg
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* =================================================================== */}
            {/* DOCUMENT DOWNLOAD LIST (ALL DOCUMENTS JUST LIKE CASE MANAGER) */}
            {/* =================================================================== */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-semibold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck size={16} />
                <span>Complete Case Documents & Downloads:</span>
              </h4>

              <div className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-slate-950/60 overflow-hidden shadow-sm text-xs">
                
                {/* 1. Case Detail PDF */}
                <div className="p-3.5 flex items-center justify-between gap-3 hover:bg-white/[0.03]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-brand-600/20 text-brand-400 flex items-center justify-center shrink-0">
                      <FileText size={16} />
                    </div>
                    <div>
                      <h5 className="font-bold text-white">Case Detail Summary</h5>
                      <p className="text-[11px] text-gray-400">Official case profile, containers, and route specifications</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadCasePdf(selectedCase, { onlyCaseDetails: true })}
                    className="bg-brand-600 hover:bg-brand-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
                  >
                    <Download size={13} />
                    <span>Download</span>
                  </button>
                </div>

                {/* 2. Commercial Freight Invoice */}
                <div className="p-3.5 flex items-center justify-between gap-3 hover:bg-white/[0.03]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-amber-600/20 text-amber-400 flex items-center justify-center shrink-0">
                      <Receipt size={16} />
                    </div>
                    <div>
                      <h5 className="font-bold text-white">Commercial Freight Invoice</h5>
                      <p className="text-[11px] text-gray-400">Itemized service charges and terminal delivery billing</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const rate = getRouteRate(selectedCase.pol, selectedCase.pod);
                      const cntr = selectedCase.containers?.[0] || { number: 'MSKU-DEFAULT', size: '40ft', weight: 28000 };
                      await downloadContainerInvoicePdf({
                        invoiceNo: `INV-26-${(cntr.number || '0000').slice(-4)}`,
                        clientName: selectedClientName,
                        containerNo: cntr.number,
                        size: (cntr as any).size || '40ft',
                        route: `${selectedCase.pol} -> ${selectedCase.pod}`,
                        rate: rate,
                        date: selectedCase.createdAt,
                        companyName: companyName
                      });
                    }}
                    className="bg-amber-600 hover:bg-amber-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
                  >
                    <Download size={13} />
                    <span>Download</span>
                  </button>
                </div>

                {/* 3. Port Loading / Unloading Bill */}
                <div className="p-3.5 flex items-center justify-between gap-3 hover:bg-white/[0.03]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <FileCheck size={16} />
                    </div>
                    <div>
                      <h5 className="font-bold text-white">Port Loading / Unloading Bill</h5>
                      <p className="text-[11px] text-gray-400">Terminal handling bill & permanent port record</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const bData: LoadingBillData = {
                        billNo: `LB-26-${selectedCase.caseNo.split('-').pop() || '001'}`,
                        caseNo: selectedCase.caseNo,
                        clientName: selectedCase.clientName,
                        containerNo: selectedCase.containers?.[0]?.number || 'MSKU-8876541',
                        portTerminal: selectedCase.pol || 'Port Terminal',
                        date: new Date().toISOString().slice(0, 10),
                        items: (selectedCase.charges || []).map((c: any) => ({
                          head: c.description || 'Terminal Handling',
                          amount: Number(c.amount) || 0,
                          receiptUrl: c.receiptUrl
                        })),
                        totalAmount: 25000,
                        officerName: 'Port Operations Officer',
                        branding: { companyName, customLogo: activeLogo }
                      };
                      await downloadLoadingBillPdf(bData);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
                  >
                    <Download size={13} />
                    <span>Download</span>
                  </button>
                </div>

                {/* 4. Customs Delivery Order (DO / NOC) */}
                <div className="p-3.5 flex items-center justify-between gap-3 hover:bg-white/[0.03]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-teal-600/20 text-teal-400 flex items-center justify-center shrink-0">
                      <ShieldCheck size={16} />
                    </div>
                    <div>
                      <h5 className="font-bold text-white">Customs Delivery Order (DO / NOC)</h5>
                      <p className="text-[11px] text-gray-400">Shipping Line Terminal Release Document</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await downloadCustomsDeliveryOrderPdf({
                          targetCase: selectedCase,
                          branding: { companyName, customLogo: activeLogo }
                        });
                      } catch (err) {
                        alert("Could not download Delivery Order.");
                      }
                    }}
                    className="bg-teal-600 hover:bg-teal-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
                  >
                    <Download size={13} />
                    <span>Download</span>
                  </button>
                </div>

                {/* 5. Uploaded Documents (BL, GD, Packing List) */}
                {(selectedCase.documents || []).map((doc, dIdx) => (
                  <div key={dIdx} className="p-3.5 flex items-center justify-between gap-3 hover:bg-white/[0.03]">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-cyan-600/20 text-cyan-400 flex items-center justify-center shrink-0">
                        <FileText size={16} />
                      </div>
                      <div className="min-w-0">
                        <h5 className="font-bold text-white truncate">{doc.name}</h5>
                        <p className="text-[11px] text-gray-400">Client / Clearing Uploaded Document</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const url = (doc as any).url || 'https://placehold.co/600x800/png?text=Document+Preview';
                          setLightboxImage(url);
                        }}
                        className="bg-white/10 hover:bg-white/20 text-white px-2.5 py-1 rounded text-xs flex items-center gap-1"
                      >
                        <Eye size={12} /> View
                      </button>
                      <a
                        href={(doc as any).url || '#'}
                        download={doc.name}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-brand-600 hover:bg-brand-500 text-white px-2.5 py-1 rounded text-xs flex items-center gap-1"
                      >
                        <Download size={12} /> Download
                      </a>
                    </div>
                  </div>
                ))}

              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowCaseManagerViewModal(false);
                  setSelectedCase(null);
                }}
                className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PAID / MAKE PAYMENT POPUP WINDOW (REQUESTED BY USER) */}
      {/* ========================================================================= */}
      {showPaidPaymentModal && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-start justify-center pt-3 sm:pt-6 pb-6 px-3 sm:px-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 rounded-3xl max-w-lg w-full border border-white/10 shadow-2xl p-6 mb-8 space-y-5 animate-fade-in max-h-[90vh] overflow-y-auto custom-scrollbar">
            
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <CreditCard className="text-emerald-400" size={20} />
                  <span>Submit Payment (Paid)</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Route your deposit to DPL Company, Loading Staff, or Transporter ledger
                </p>
              </div>
              <button onClick={() => setShowPaidPaymentModal(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleConfirmPaidPayment} className="space-y-4">
              
              {/* Payment Mode Selector: Cash or Bank */}
              <div>
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5 block">
                  Select Payment Mode:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentForm(prev => ({ ...prev, mode: 'BANK' }))}
                    className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 ${
                      paymentForm.mode === 'BANK'
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                        : 'bg-slate-950 text-gray-400 border-white/10 hover:bg-white/5'
                    }`}
                  >
                    <Building size={15} />
                    <span>Bank Transfer / Deposit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentForm(prev => ({ ...prev, mode: 'CASH' }))}
                    className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 ${
                      paymentForm.mode === 'CASH'
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                        : 'bg-slate-950 text-gray-400 border-white/10 hover:bg-white/5'
                    }`}
                  >
                    <DollarSign size={15} />
                    <span>Cash Payment</span>
                  </button>
                </div>
              </div>

              {/* If Bank Selected: Bank Dropdown & Slip Upload */}
              {paymentForm.mode === 'BANK' && (
                <div className="space-y-3 bg-white/5 p-3.5 rounded-2xl border border-white/5">
                  <div>
                    <label className="text-xs font-semibold text-gray-300 mb-1 block">
                      Select Company Bank Account:
                    </label>
                    <select
                      value={paymentForm.bankName}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, bankName: e.target.value }))}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:border-emerald-500 outline-none"
                    >
                      {DEFAULT_COMPANY_BANKS.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                      <option value="Other Bank">Other Bank (Type Bank Name)</option>
                    </select>

                    {paymentForm.bankName === 'Other Bank' && (
                      <input
                        type="text"
                        placeholder="Enter Bank Name & Branch..."
                        value={paymentForm.customBankName}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, customBankName: e.target.value }))}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl p-2 text-xs text-white mt-2"
                      />
                    )}
                  </div>

                  {/* Bank Slip Upload */}
                  <div>
                    <label className="text-xs font-semibold text-gray-300 mb-1 block flex items-center justify-between">
                      <span>Upload Bank Slip / Screenshot *:</span>
                      <span className="text-[10px] text-amber-400">Mandatory for verification</span>
                    </label>

                    <div className="flex gap-2">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        ref={fileInputRef}
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            const proc = await compressAndPrepareFile(f);
                            setPaymentForm(prev => ({ ...prev, slipUrl: proc.dataUrl || '' }));
                          }
                        }}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 bg-white/10 hover:bg-white/20 text-white p-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-2 border border-white/10"
                      >
                        <Upload size={14} />
                        <span>Choose File</span>
                      </button>
                      <button
                        type="button"
                        onClick={startCamera}
                        className="bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 p-2.5 rounded-xl text-xs font-medium flex items-center gap-1.5 border border-amber-500/30"
                      >
                        <Camera size={14} />
                        <span>Scan</span>
                      </button>
                    </div>

                    {/* Camera View */}
                    {isCameraActive && (
                      <div className="mt-2 space-y-2">
                        <video ref={videoRef} autoPlay playsInline className="w-full rounded-xl border border-white/20 max-h-48 object-cover" />
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={stopCamera} className="px-3 py-1 text-xs text-gray-400">Cancel</button>
                          <button type="button" onClick={capturePhoto} className="bg-emerald-600 text-white px-4 py-1 rounded text-xs">Capture</button>
                        </div>
                      </div>
                    )}

                    {paymentForm.slipUrl && (
                      <div className="mt-2 flex items-center gap-2 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300">
                        <CheckCircle2 size={15} />
                        <span className="truncate">Slip attached successfully</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Amount & Date Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-300 mb-1 block">Amount (PKR) *:</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 150000"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white font-mono focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-300 mb-1 block">Payment Date (Editable):</label>
                  <input
                    type="date"
                    required
                    value={paymentForm.date}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white font-mono focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Payment Category Selection (CRITICAL AS REQUESTED BY USER) */}
              <div>
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5 block">
                  Select Payment Category:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  {[
                    { id: 'Company Payment (DPL)', label: 'Company (DPL)', desc: 'DPL Invoice Settlement' },
                    { id: 'Loading Payment', label: 'Loading Staff', desc: 'Port Loading Desk' },
                    { id: 'Vehicle Rent', label: 'Vehicle Rent', desc: 'Transporter Freight' }
                  ].map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setPaymentForm(prev => ({ ...prev, category: cat.id as any }))}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        paymentForm.category === cat.id
                          ? 'bg-amber-600 text-white border-amber-500 shadow-md font-bold'
                          : 'bg-slate-950 text-gray-400 border-white/10 hover:bg-white/5'
                      }`}
                    >
                      <p className="text-xs">{cat.label}</p>
                      <p className="text-[10px] text-gray-300 opacity-80">{cat.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Case Selection Dropdown & Search (FOR VEHICLE RENT & LOADING ROUTING) */}
              <div>
                <label className="text-xs font-semibold text-gray-300 mb-1 block">
                  Select Associated Case (For Routing to Transporter or Loading Staff):
                </label>
                <input
                  type="text"
                  placeholder="Filter case list by typing case no..."
                  value={paymentCaseSearch}
                  onChange={(e) => setPaymentCaseSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-2 text-xs text-white mb-2"
                />
                <select
                  value={paymentForm.caseNo}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, caseNo: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:border-emerald-500 outline-none"
                >
                  <option value="">-- Select Case --</option>
                  {paymentEligibleCases.map(c => (
                    <option key={c.id} value={c.caseNo}>
                      {c.caseNo} ({c.pol} &rarr; {c.pod}) - B/L: {c.extractedData?.blNumber || 'N/A'}
                    </option>
                  ))}
                </select>

                {selectedCaseForPayment && (
                  <div className="mt-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-gray-300 space-y-1">
                    <p>
                      🏢 Recipient Routing: <strong className="text-white">
                        {paymentForm.category === 'Loading Payment' 
                          ? (selectedCaseForPayment.loadingBills?.[0]?.staffName || 'Mohsin Khan (Port Officer)') 
                          : paymentForm.category === 'Vehicle Rent' 
                            ? (selectedCaseForPayment.containers?.[0]?.transporterName || 'Bilal Goods Transport Co.') 
                            : 'DPL Company Accounts'}
                      </strong>
                    </p>
                    <p>
                      🚗 Vehicle Assigned: <span className="font-mono text-amber-300">
                        {selectedCaseForPayment.containers?.[0]?.vehicleNo || 'TL-8842'}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {/* Remarks */}
              <div>
                <label className="text-xs font-semibold text-gray-300 mb-1 block">Remarks / Notes:</label>
                <textarea
                  rows={2}
                  placeholder="Enter any notes or slip transfer remarks..."
                  value={paymentForm.remarks}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, remarks: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowPaidPaymentModal(false)}
                  className="px-4 py-2 text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 transition active:scale-95"
                >
                  Submit Payment
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DOWNLOAD LEDGER MODAL WITH STATION & DATE FILTERS */}
      {/* ========================================================================= */}
      {showLedgerModal && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-start justify-center pt-3 sm:pt-6 pb-6 px-3 sm:px-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 rounded-3xl max-w-2xl w-full border border-white/10 shadow-2xl p-6 mb-8 space-y-5">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText className="text-brand-400" size={20} />
                  <span>Download Client Ledger Statement</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">{selectedClientName} &bull; Official Account Passbook</p>
              </div>
              <button onClick={() => setShowLedgerModal(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-white/5 p-4 rounded-2xl space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Billed:</span>
                  <span className="font-mono font-bold text-white">PKR {billedToDpl.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-400">Total Paid (Approved):</span>
                  <span className="font-mono font-bold text-emerald-400">PKR {paidToDpl.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-white/10 pt-2 font-bold">
                  <span className="text-amber-400">Net Outstanding Balance:</span>
                  <span className="font-mono text-amber-400 text-sm">PKR {payableToDpl.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowLedgerModal(false)}
                  className="px-4 py-2 text-xs text-gray-400"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    downloadClientLedgerPdf({
                      clientName: selectedClientName,
                      statementDate: new Date().toLocaleDateString(),
                      dateRange: 'Current Month & Active Consignments',
                      summary: {
                        totalDebits: billedToDpl,
                        totalCredits: paidToDpl,
                        netBalance: payableToDpl,
                        totalCases: clientCases.length,
                        totalContainers: clientCases.reduce((s, c) => s + (c.containers?.length || 1), 0)
                      },
                      entries: passbookEntries.map(e => ({
                        date: e.date,
                        reference: e.caseNo || e.id,
                        description: e.typeName,
                        debit: e.type === 'INVOICE' ? e.amount : 0,
                        credit: e.type === 'PAYMENT' ? e.amount : 0,
                        balance: e.amount
                      })),
                      companyName: companyName,
                      customLogo: activeLogo,
                      branding: branding
                    });
                  }}
                  className="bg-brand-600 hover:bg-brand-500 text-white px-5 py-2 rounded-xl font-bold flex items-center gap-2 shadow"
                >
                  <Download size={14} />
                  <span>Download Ledger (PDF)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DOWNLOAD INVOICES LIST MODAL */}
      {/* ========================================================================= */}
      {showInvoicesModal && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-start justify-center pt-3 sm:pt-6 pb-6 px-3 sm:px-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 rounded-3xl max-w-2xl w-full border border-white/10 shadow-2xl p-6 mb-8 space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Receipt className="text-amber-400" size={20} />
                <span>Select Invoice to Download</span>
              </h3>
              <button onClick={() => setShowInvoicesModal(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-2">
              {clientCases.flatMap(c => (c.containers || []).map((cntr, idx) => {
                const rate = getRouteRate(c.pol, c.pod);
                const invNum = `INV-26-${(cntr.number || '0000').slice(-4)}`;
                return (
                  <div key={`${c.id}-${idx}`} className="bg-slate-950 p-3 rounded-xl border border-white/10 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-mono font-bold text-amber-400 text-sm">{invNum}</span>
                      <p className="text-gray-400 mt-0.5">
                        Case: {c.caseNo} &bull; Container: {cntr.number} &bull; Route: {c.pol} &rarr; {c.pod}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => downloadContainerInvoicePdf({
                        invoiceNo: invNum,
                        clientName: selectedClientName,
                        containerNo: cntr.number,
                        size: (cntr as any).size || '40ft',
                        route: `${c.pol} -> ${c.pod}`,
                        rate: rate,
                        date: c.createdAt,
                        companyName: companyName
                      })}
                      className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 shadow"
                    >
                      <Download size={13} /> Download PDF
                    </button>
                  </div>
                );
              }))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DOWNLOAD LOADING BILLS LIST MODAL */}
      {/* ========================================================================= */}
      {showLoadingBillsModal && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-start justify-center pt-3 sm:pt-6 pb-6 px-3 sm:px-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 rounded-3xl max-w-2xl w-full border border-white/10 shadow-2xl p-6 mb-8 space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileCheck className="text-emerald-400" size={20} />
                <span>Select Port Loading Bill to Download</span>
              </h3>
              <button onClick={() => setShowLoadingBillsModal(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-2">
              {clientCases.map(c => (
                <div key={c.id} className="bg-slate-950 p-3 rounded-xl border border-white/10 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-mono font-bold text-emerald-400 text-sm">
                      LB-26-{c.caseNo.split('-').pop()}
                    </span>
                    <p className="text-gray-400 mt-0.5">
                      Case: {c.caseNo} &bull; Port: {c.pol} &bull; Staff: {(c as any).loadingStaffName || 'Mohsin Khan'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const bData: LoadingBillData = {
                        billNo: `LB-26-${c.caseNo.split('-').pop() || '001'}`,
                        caseNo: c.caseNo,
                        clientName: c.clientName,
                        containerNo: c.containers?.[0]?.number || 'MSKU-8876541',
                        portTerminal: c.pol || 'Port Terminal',
                        date: new Date().toISOString().slice(0, 10),
                        items: (c.charges || []).map((ch: any) => ({
                          head: ch.description || 'Terminal Handling',
                          amount: Number(ch.amount) || 0
                        })),
                        totalAmount: 25000,
                        officerName: (c as any).loadingStaffName || 'Mohsin Khan (Port Staff)',
                        branding: { companyName, customLogo: activeLogo }
                      };
                      downloadLoadingBillPdf(bData);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 shadow"
                  >
                    <Download size={13} /> Download Bill
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-md cursor-zoom-out"
          onClick={() => setLightboxImage(null)}
        >
          <button className="absolute top-6 right-6 text-white/70 hover:text-white bg-black/60 p-2 rounded-full">
            <X size={28} />
          </button>
          <img 
            src={lightboxImage} 
            alt="Document Proof Preview" 
            className="max-w-full max-h-[90vh] object-contain rounded-lg border border-white/10 shadow-2xl" 
          />
        </div>
      )}

      {/* Client Registration Modal */}
      <ClientRegistrationModal
        isOpen={isClientRegModalOpen}
        onClose={() => setIsClientRegModalOpen(false)}
        onSave={(savedClient) => {
          setIsClientRegModalOpen(false);
          setSelectedClientName(savedClient.name);
          safeAppStorage.setItem('dpl_client_name', savedClient.name);
          alert(`Client profile for "${savedClient.name}" updated successfully!`);
        }}
        defaultCategory="Bonded Carrier"
      />

    </div>
  );
};

export default ClientPortal;
