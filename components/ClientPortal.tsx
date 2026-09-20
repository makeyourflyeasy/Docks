import React, { useState, useRef, useEffect } from 'react';
import { 
  FolderKanban, DollarSign, Plus, Search, Filter, Calendar, 
  Truck, ArrowRight, CheckCircle2, Clock, AlertCircle, FileText, 
  Camera, Upload, X, Eye, ChevronRight, ShieldCheck, 
  MapPin, Anchor, Box, ArrowUpRight, ArrowDownLeft, CreditCard,
  Building, RefreshCw, FileCheck, Layers, ExternalLink, User, Download, Loader2, LogOut
} from 'lucide-react';
import Logo from './Logo';
import { useBranding } from '../services/brandingService';
import { downloadContainerInvoicePdf, downloadCasePdf, downloadClientLedgerPdf } from '../services/pdfExportService';
import { Case, CaseStatus, Container, FinanceEntry, ExtractedData, MockDocument, UserRole } from '../types';
import { compressAndPrepareFile } from '../services/fileUtils';
import TopModeSwitcher, { ModeOption } from './TopModeSwitcher';
import GoldenAmountWidget from './GoldenAmountWidget';
import { safeAppStorage } from '../services/storage';
import { 
  subscribeToCases, 
  saveCaseToFirestore, 
  subscribeToFinances, 
  saveFinanceToFirestore 
} from '../services/dbService';

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

// Initial Clean Cases for Client Portal
const INITIAL_CLIENT_CASES: Case[] = [];

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
}

const INITIAL_CLIENT_PAYMENTS: ClientPaymentEntry[] = [];

interface ClientPortalProps {
  customLogo?: string | null;
  onSwitchToAdmin?: () => void;
  onSwitchMode?: (mode: ModeOption) => void;
  onOpenAuthModal?: () => void;
  onSignOut?: () => void;
}

const ClientPortal: React.FC<ClientPortalProps> = ({ 
  customLogo, 
  onSwitchToAdmin,
  onSwitchMode,
  onOpenAuthModal,
  onSignOut
}) => {
  const { companyName, subtitle, activeLogo, branding } = useBranding();
  // Navigation: 'cases' or 'finance'
  const [activeTab, setActiveTab] = useState<'cases' | 'finance'>('cases');
  const [casesSubView, setCasesSubView] = useState<'overview' | 'all_cases' | 'register'>('overview');
  
  // Data States
  const [casesList, setCasesList] = useState<Case[]>(INITIAL_CLIENT_CASES);
  const [paymentsList, setPaymentsList] = useState<ClientPaymentEntry[]>(INITIAL_CLIENT_PAYMENTS);

  // Synchronize Client Portal with live Firestore data
  useEffect(() => {
    const unsubCases = subscribeToCases((cases) => {
      if (cases) {
        setCasesList(cases);
      }
    });
    const unsubFinances = subscribeToFinances((finances) => {
      if (finances) {
        const clientPayments: ClientPaymentEntry[] = finances
          .filter(f => f.type === 'INCOME')
          .map((f, idx) => ({
            id: Number(f.id) || idx + 1,
            date: f.date,
            amount: f.amount,
            paymentMethod: f.paymentMethod === 'CASH' ? 'CASH' : 'ONLINE_TRANSFER',
            bankName: typeof f.bankId === 'string' ? f.bankId : String(f.bankId || 'Bank'),
            referenceNo: f.reference || '',
            slipUrl: f.slipUrl,
            status: f.status === 'PAID' ? 'CONFIRMED' : 'PENDING',
            remarks: f.description
          }));
        setPaymentsList(clientPayments);
      }
    });
    return () => {
      unsubCases();
      unsubFinances();
    };
  }, []);
  
  // Selected Case for Modal / Details
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Search & Filter for All Cases View
  const [searchQuery, setSearchQuery] = useState('');
  const [searchContainerNo, setSearchContainerNo] = useState('');
  const [searchBlNo, setSearchBlNo] = useState('');
  const [searchCaseNo, setSearchCaseNo] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterStation, setFilterStation] = useState('ALL');

  // Finance Modals
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [showInvoicesModal, setShowInvoicesModal] = useState(false);
  const [selectedInvoiceContainer, setSelectedInvoiceContainer] = useState<{
    caseNo: string;
    container: Container;
    pol: string;
    pod: string;
    date: string;
    clientName: string;
    rate: number;
    blNo?: string;
  } | null>(null);

  // Ledger Filter States
  const [ledgerRangeType, setLedgerRangeType] = useState<'CURRENT_MONTH' | 'CUSTOM'>('CURRENT_MONTH');
  const [ledgerStartDate, setLedgerStartDate] = useState('2026-04-01');
  const [ledgerEndDate, setLedgerEndDate] = useState('2026-04-30');
  const [ledgerStationFilter, setLedgerStationFilter] = useState('ALL');

  // Add Payment Form States
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'ONLINE_TRANSFER' as ClientPaymentEntry['paymentMethod'],
    bankName: 'Meezan Bank Ltd',
    referenceNo: '',
    remarks: '',
    slipUrl: ''
  });
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Case Registration Wizard States
  const [newCaseCategory, setNewCaseCategory] = useState('Afghan Transit');
  const [newCasePol, setNewCasePol] = useState('Karachi Port Trust');
  const [newCasePod, setNewCasePod] = useState('Chaman Border Terminal');
  const [newCaseBl, setNewCaseBl] = useState('');
  const [newCaseVessel, setNewCaseVessel] = useState('');
  const [newCaseWeight, setNewCaseWeight] = useState('');
  const [newCaseItem, setNewCaseItem] = useState('');
  const [newCaseContainers, setNewCaseContainers] = useState<{ number: string; size: '20ft' | '40ft'; weight: number }[]>([
    { number: '', size: '40ft', weight: 28000 }
  ]);
  const [newCaseDocs, setNewCaseDocs] = useState<{ name: string; url: string; type: string }[]>([]);

  // Calculate Financial Metrics
  const totalBilled = casesList.reduce((acc, c) => {
    const cTotal = (c.charges || []).reduce((sum, ch) => sum + ch.amount, 0);
    // If no explicit charges, fallback to route rate
    if (cTotal > 0) return acc + cTotal;
    const rate = getRouteRate(c.pol, c.pod);
    const containerCount = c.containers.length || 1;
    return acc + (rate * containerCount);
  }, 0);

  const totalPaid = paymentsList
    .filter(p => p.status === 'CONFIRMED')
    .reduce((acc, p) => acc + p.amount, 0);

  const pendingPaymentsTotal = paymentsList
    .filter(p => p.status === 'PENDING')
    .reduce((acc, p) => acc + p.amount, 0);

  const remainingBalance = totalBilled - totalPaid;

  // Containers count
  const allContainers = casesList.flatMap(c => c.containers.map(cntr => ({ ...cntr, caseData: c })));
  const thisMonthContainers = allContainers.filter(cntr => cntr.caseData.createdAt >= '2026-04-01').length;
  const previousMonthContainers = 22; // historical baseline

  // In-Transit / Active Cases
  const inTransitCases = casesList.filter(c => 
    c.status === CaseStatus.IN_TRANSIT || 
    c.status === CaseStatus.LOADING_PORT_PROCESSING ||
    c.status === CaseStatus.SHIPPING_LINE_DO
  );

  // Available Stations / Routes
  const availableRoutes = Array.from(new Set(casesList.map(c => `${c.pol} -> ${c.pod}`)));

  // Filtered Cases for All Cases List
  const filteredCases = casesList.filter(c => {
    // General Search
    const matchesSearch = !searchQuery || 
      c.caseNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.extractedData?.blNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.containers.some(cnt => cnt.number.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.pod.toLowerCase().includes(searchQuery.toLowerCase());

    // Specific Multi-Parameter Search
    const matchesContainer = !searchContainerNo || 
      c.containers.some(cnt => cnt.number.toLowerCase().includes(searchContainerNo.toLowerCase()));
    
    const matchesBl = !searchBlNo || 
      (c.extractedData?.blNumber && c.extractedData.blNumber.toLowerCase().includes(searchBlNo.toLowerCase()));

    const matchesCaseNo = !searchCaseNo || 
      c.caseNo.toLowerCase().includes(searchCaseNo.toLowerCase());

    const matchesStatus = filterStatus === 'ALL' || c.status === filterStatus;
    const matchesStation = filterStation === 'ALL' || `${c.pol} -> ${c.pod}` === filterStation || c.pod === filterStation;

    const matchesDate = (!filterStartDate || c.createdAt >= filterStartDate) && 
      (!filterEndDate || c.createdAt <= filterEndDate);

    return matchesSearch && matchesContainer && matchesBl && matchesCaseNo && matchesStatus && matchesStation && matchesDate;
  });

  // Handle Camera
  const startCamera = async () => {
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert("Unable to access camera. Please check permissions or upload file directly.");
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      try {
        const canvas = document.createElement('canvas');
        const maxDim = 1200;
        let w = videoRef.current.videoWidth || 640;
        let h = videoRef.current.videoHeight || 480;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          setPaymentForm(prev => ({ ...prev, slipUrl: dataUrl }));
          stopCamera();
        }
      } catch (err) {
        console.warn("Camera photo capture warning:", err);
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const processed = await compressAndPrepareFile(file);
        setPaymentForm(prev => ({ ...prev, slipUrl: processed.dataUrl }));
      } catch (err) {
        console.warn("Slip upload warning:", err);
      } finally {
        try {
          e.target.value = '';
        } catch (_) {}
      }
    }
  };

  // Submit Payment
  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    if (!paymentForm.referenceNo) {
      alert("Please enter transaction ID or deposit slip number.");
      return;
    }

    const activeClient = safeAppStorage.getItem('dpl_client_name') || 'Client Account';
    const newPayment: ClientPaymentEntry = {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      amount: parseFloat(paymentForm.amount),
      paymentMethod: paymentForm.paymentMethod,
      bankName: paymentForm.bankName,
      referenceNo: paymentForm.referenceNo,
      slipUrl: paymentForm.slipUrl || 'https://placehold.co/600x800/png?text=Deposit+Slip+Proof',
      status: 'PENDING',
      remarks: paymentForm.remarks || 'Client online portal deposit'
    };

    setPaymentsList([newPayment, ...paymentsList]);
    
    // Save to Firestore finances collection
    const financeEntry: Partial<FinanceEntry> = {
      id: newPayment.id,
      date: newPayment.date,
      type: 'INCOME',
      category: 'Client Payment',
      description: `Client Deposit - ${newPayment.referenceNo || 'Direct Deposit'}`,
      amount: newPayment.amount,
      party: activeClient,
      paymentMethod: newPayment.paymentMethod === 'CASH' ? 'CASH' : 'BANK',
      bankId: newPayment.bankName,
      reference: newPayment.referenceNo,
      status: 'PENDING',
      slipUrl: newPayment.slipUrl
    };
    saveFinanceToFirestore(financeEntry as FinanceEntry);

    setShowAddPaymentModal(false);
    setPaymentForm({
      amount: '',
      paymentMethod: 'ONLINE_TRANSFER',
      bankName: 'Meezan Bank Ltd',
      referenceNo: '',
      remarks: '',
      slipUrl: ''
    });

    alert("Payment request submitted successfully!\nStatus: Confirmation Pending\nThe finance manager will verify and credit your account ledger.");
  };

  // Submit New Case Registration from Client
  const handleRegisterCaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const activeClient = safeAppStorage.getItem('dpl_client_name') || 'Client Account';
    const caseYear = '26';
    const serialStr = String(casesList.length + 1).padStart(6, '0');
    const autoCaseNo = `DPL-${caseYear}-${serialStr}`;

    const newRate = getRouteRate(newCasePol, newCasePod);
    const newCase: Case = {
      id: `case-${Date.now()}`,
      caseNo: autoCaseNo,
      clientName: activeClient,
      category: newCaseCategory,
      pol: newCasePol,
      pod: newCasePod,
      status: CaseStatus.SHIPPING_LINE_DO,
      createdAt: new Date().toISOString().split('T')[0],
      charges: [
        { description: `Freight & Logistics (${newCasePol} to ${newCasePod})`, amount: newRate },
        { description: 'Customs Clearance & Documentation', amount: 30000 }
      ],
      documents: newCaseDocs.length > 0 ? newCaseDocs : [
        { name: `BL-${newCaseBl || 'Pending'}.pdf`, type: 'application/pdf', url: 'https://placehold.co/600x800/png?text=Client+Uploaded+BL' }
      ],
      containers: newCaseContainers.filter(c => c.number.trim()).map((cnt, idx) => ({
        id: Date.now() + idx,
        number: cnt.number.toUpperCase(),
        size: cnt.size,
        weight: cnt.weight,
        status: 'Pending'
      })),
      extractedData: {
        blNumber: newCaseBl,
        vesselName: newCaseVessel,
        totalWeight: parseFloat(newCaseWeight) || 28000,
        itemName: newCaseItem || 'General Cargo',
        consigneeName: activeClient
      }
    };

    setCasesList([newCase, ...casesList]);
    saveCaseToFirestore(newCase);
    setCasesSubView('overview');
    alert(`Case registration submitted successfully!\nCase No: ${autoCaseNo}\nStatus: Submitted for admin approval.`);
  };

  const isPrintModalOpen = showLedgerModal || (showInvoicesModal && Boolean(selectedInvoiceContainer)) || Boolean(selectedCase);

  return (
    <div className="space-y-6 animate-fade-in text-gray-100 font-sans pb-12">
      
      {/* Top Banner / Client Identity Header */}
      <div className="glass-card p-4 sm:p-6 rounded-2xl border border-brand-500/20 bg-gradient-to-r from-brand-950/60 via-slate-900/80 to-slate-950/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div className="flex flex-wrap items-center gap-4">
          <div className="bg-slate-950/60 p-2 rounded-xl border border-white/10 flex items-center">
            <Logo className="h-10 w-auto" />
          </div>
          <div className="h-8 w-px bg-white/10 hidden sm:block"></div>
          <div className="w-12 h-12 rounded-xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-brand-400 font-bold text-lg shadow-lg shadow-brand-600/20">
            GT
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-white">Global Traders Ltd</h1>
              <span className="bg-brand-500/20 text-brand-300 text-xs px-2.5 py-0.5 rounded-full border border-brand-500/30 font-medium flex items-center gap-1">
                <ShieldCheck size={14} /> Client Portal (CLT-001)
              </span>
            </div>
            <p className="text-gray-400 text-xs sm:text-sm mt-0.5">
              Dedicated Logistics, Afghan Transit & Customs Clearance Client Dashboard
            </p>
          </div>
        </div>

        {/* Tab Navigation & Role Switcher */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
          <div className="flex bg-slate-950/80 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => { setActiveTab('cases'); setCasesSubView('overview'); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                activeTab === 'cases' 
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <FolderKanban size={17} />
              <span>Cases</span>
            </button>
            <button
              onClick={() => setActiveTab('finance')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                activeTab === 'finance' 
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <DollarSign size={17} />
              <span>Finance</span>
            </button>
          </div>

          {/* Sone se Amount Option (Golden Amount Display & Quick Ledger) */}
          <GoldenAmountWidget 
            onOpenFinance={() => setActiveTab('finance')}
          />

          {/* Small Squircle (rounded-square) Sign Out Button with LogOut Logo */}
          <button
            type="button"
            id="client-portal-signout-btn"
            onClick={() => {
              if (onSignOut) {
                onSignOut();
              } else if (onSwitchToAdmin) {
                onSwitchToAdmin();
              }
            }}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/50 flex items-center justify-center transition-all duration-200 shadow-md hover:shadow-red-500/20 active:scale-95 cursor-pointer flex-shrink-0"
            title="Sign Out"
          >
            <LogOut size={17} className="text-red-400" />
          </button>
        </div>
      </div>

      {/* Main Portal Content Views - Hidden during modal printing */}
      <div className={`space-y-6 ${isPrintModalOpen ? 'print:hidden' : ''}`}>
        {/* ========================================================================= */}
        {/* 1. CASES VIEW */}
        {/* ========================================================================= */}
        {activeTab === 'cases' && (
        <div className="space-y-6">

          {/* Sub-Header / Quick Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 p-4 rounded-xl border border-white/5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-300">Quick Navigation:</span>
              <button
                onClick={() => setCasesSubView('overview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  casesSubView === 'overview' ? 'bg-brand-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                In-Transit Live
              </button>
              <button
                onClick={() => setCasesSubView('all_cases')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  casesSubView === 'all_cases' ? 'bg-brand-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                View All Cases
              </button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setCasesSubView('register')}
                className="w-full sm:w-auto bg-brand-600 hover:bg-brand-500 text-white px-5 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-600/30 transition-all hover:scale-105"
              >
                <Plus size={18} />
                <span>Register New Case</span>
              </button>
            </div>
          </div>

          {/* View 1: Overview & In-Transit Live Shipments */}
          {casesSubView === 'overview' && (
            <div className="space-y-6">
              
              {/* In-Transit Cases Section */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Truck className="text-brand-400" size={20} />
                      Current Shipments (In-Transit Live)
                    </h2>
                    <p className="text-gray-400 text-xs mt-0.5">
                      Live status of all active containers en route to destination
                    </p>
                  </div>
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-medium animate-pulse">
                    {inTransitCases.length} Active Shipments On Route
                  </span>
                </div>

                {inTransitCases.length === 0 ? (
                  <div className="glass-card p-8 rounded-2xl text-center text-gray-400">
                    <CheckCircle2 size={48} className="mx-auto text-green-500 mb-2 opacity-80" />
                    <p className="text-base font-semibold text-white">No shipments currently in transit</p>
                    <p className="text-xs text-gray-500 mt-1">All registered shipments have reached their destination.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {inTransitCases.map((c) => (
                      <div 
                        key={c.id} 
                        className="glass-card rounded-2xl p-5 border border-white/10 hover:border-brand-500/40 transition-all hover:shadow-xl hover:shadow-brand-500/5 group cursor-pointer"
                        onClick={() => setSelectedCase(c)}
                      >
                        <div className="flex justify-between items-start border-b border-white/10 pb-3 mb-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-lg text-white group-hover:text-brand-300 transition-colors">
                                {c.caseNo}
                              </span>
                              <span className="bg-brand-500/20 text-brand-300 text-xs px-2 py-0.5 rounded border border-brand-500/30 font-medium">
                                {c.category}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                              BL No: <span className="font-mono text-gray-200">{c.extractedData?.blNumber || 'N/A'}</span> • Vessel: {c.extractedData?.vesselName || 'Cosco Line'}
                            </p>
                          </div>
                          <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs px-3 py-1 rounded-full font-medium">
                            {c.status}
                          </span>
                        </div>

                        {/* Route POL -> POD */}
                        <div className="bg-white/5 rounded-xl p-3 mb-4 border border-white/5">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 text-gray-300">
                              <Anchor size={14} className="text-brand-400" />
                              <span className="font-medium">{c.pol}</span>
                            </div>
                            <div className="flex items-center gap-1 text-brand-400 font-mono">
                              <span className="text-[10px] uppercase">En Route</span>
                              <ArrowRight size={14} />
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-300">
                              <MapPin size={14} className="text-emerald-400" />
                              <span className="font-medium">{c.pod}</span>
                            </div>
                          </div>
                        </div>

                        {/* Live Containers inside this shipment */}
                        <div className="space-y-2 mb-4">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Assigned Containers & Vehicles ({c.containers.length}):
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {c.containers.map((cntr) => (
                              <div key={cntr.id} className="bg-slate-950/70 p-2.5 rounded-lg border border-white/5 text-xs">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-mono font-bold text-white">{cntr.number}</span>
                                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">
                                    {cntr.status}
                                  </span>
                                </div>
                                <div className="text-gray-400 text-[11px] space-y-0.5">
                                  <p>🚗 Vehicle: <span className="text-gray-200">{cntr.vehicleNo || 'TL-8842'}</span></p>
                                  <p>👨‍✈️ Driver: <span className="text-gray-200">{cntr.driverName || 'Muhammad Ismail'}</span> ({cntr.driverContact || '0300-8877665'})</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Card Footer */}
                        <div className="flex justify-between items-center pt-3 border-t border-white/10 text-xs">
                          <span className="text-gray-400">Date: {c.createdAt}</span>
                          <span className="text-brand-400 group-hover:translate-x-1 transition-transform flex items-center gap-1 font-medium">
                            View Details & Tracking <ChevronRight size={14} />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Quick Jump Bar */}
              <div className="glass-card p-5 rounded-2xl border border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gradient-to-r from-slate-900 to-brand-950/40">
                <div>
                  <h3 className="font-bold text-white text-base">Looking for completed or archived cases?</h3>
                  <p className="text-gray-400 text-xs mt-0.5">Search by Case No, Container No, B/L No, or Date Range</p>
                </div>
                <button
                  onClick={() => setCasesSubView('all_cases')}
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/15 px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition"
                >
                  <Search size={16} className="text-brand-400" />
                  <span>View All Cases Table</span>
                </button>
              </div>

            </div>
          )}

          {/* View 2: All Cases Table View with Multi-Search */}
          {casesSubView === 'all_cases' && (
            <div className="glass-card rounded-2xl p-5 sm:p-6 border border-white/10 space-y-6">
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <FolderKanban className="text-brand-400" size={22} />
                    All Registered Cases
                  </h2>
                  <p className="text-gray-400 text-xs mt-0.5">
                    Complete historical record of client shipments and clearances
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-brand-500/20 text-brand-300 px-3 py-1 rounded-full border border-brand-500/30">
                    Total: {filteredCases.length} Cases Found
                  </span>
                </div>
              </div>

              {/* Multi-Search & Filter Panel */}
              <div className="bg-slate-950/80 p-4 rounded-xl border border-white/10 space-y-3">
                <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Filter size={14} className="text-brand-400" />
                  Search & Filters:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Container No */}
                  <div>
                    <label className="text-[11px] text-gray-400 mb-1 block">Container No:</label>
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-2.5 text-gray-500" />
                      <input
                        type="text"
                        placeholder="e.g. MSKU-8876541"
                        value={searchContainerNo}
                        onChange={(e) => setSearchContainerNo(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500 font-mono"
                      />
                    </div>
                  </div>

                  {/* BL Number */}
                  <div>
                    <label className="text-[11px] text-gray-400 mb-1 block">B/L No:</label>
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-2.5 text-gray-500" />
                      <input
                        type="text"
                        placeholder="e.g. MSK-998877"
                        value={searchBlNo}
                        onChange={(e) => setSearchBlNo(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500 font-mono"
                      />
                    </div>
                  </div>

                  {/* DPL Case No */}
                  <div>
                    <label className="text-[11px] text-gray-400 mb-1 block">DPL Case No:</label>
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-2.5 text-gray-500" />
                      <input
                        type="text"
                        placeholder="e.g. DPL-26-000004"
                        value={searchCaseNo}
                        onChange={(e) => setSearchCaseNo(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500 font-mono"
                      />
                    </div>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label className="text-[11px] text-gray-400 mb-1 block">Status Filter:</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
                    >
                      <option value="ALL">All Statuses</option>
                      {Object.values(CaseStatus).map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Second Filter Row: Dates & Stations */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/5">
                  <div>
                    <label className="text-[11px] text-gray-400 mb-1 block">Date From:</label>
                    <input
                      type="date"
                      value={filterStartDate}
                      onChange={(e) => setFilterStartDate(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 mb-1 block">Date To:</label>
                    <input
                      type="date"
                      value={filterEndDate}
                      onChange={(e) => setFilterEndDate(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 mb-1 block">Route / Station:</label>
                    <select
                      value={filterStation}
                      onChange={(e) => setFilterStation(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
                    >
                      <option value="ALL">All Routes</option>
                      {availableRoutes.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {(searchContainerNo || searchBlNo || searchCaseNo || filterStartDate || filterEndDate || filterStatus !== 'ALL' || filterStation !== 'ALL') && (
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => {
                        setSearchContainerNo('');
                        setSearchBlNo('');
                        setSearchCaseNo('');
                        setFilterStartDate('');
                        setFilterEndDate('');
                        setFilterStatus('ALL');
                        setFilterStation('ALL');
                      }}
                      className="text-xs text-brand-400 hover:text-brand-300 underline"
                    >
                      Clear All Filters
                    </button>
                  </div>
                )}
              </div>

              {/* Cases Records - Mobile Compact & Desktop Table */}
              <div className="rounded-xl border border-white/10 overflow-hidden">
                {/* Mobile View: High Density, Compact, Zero Horizontal Scroll */}
                <div className="block sm:hidden divide-y divide-white/10 touch-pan-y bg-slate-900/40">
                  {filteredCases.map((c) => (
                    <div key={c.id} className="p-3 hover:bg-white/5 space-y-1.5" onClick={() => setSelectedCase(c)}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-xs text-white">{c.caseNo}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                          c.status === CaseStatus.COMPLETED ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                          c.status === CaseStatus.IN_TRANSIT ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                          'bg-blue-500/20 text-blue-300 border-blue-500/30'
                        }`}>
                          {c.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-gray-300">
                        <span className="bg-brand-500/15 text-brand-300 px-1.5 py-0.5 rounded border border-brand-500/20 text-[10px]">
                          {c.category}
                        </span>
                        <span className="text-gray-400 text-[10px]">{c.createdAt}</span>
                      </div>
                      <div className="text-[11px] text-gray-300 font-mono">
                        {c.pol} → <span className="text-brand-300">{c.pod}</span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-white/5">
                        <span className="text-[10px] text-gray-400">
                          {c.containers.length} container(s)
                        </span>
                        <button
                          onClick={() => setSelectedCase(c)}
                          className="bg-brand-600/20 hover:bg-brand-600/40 text-brand-300 border border-brand-500/30 px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1"
                        >
                          <Eye size={11} /> View
                        </button>
                      </div>
                    </div>
                  ))}
                  {filteredCases.length === 0 && (
                    <div className="p-6 text-center text-gray-400 text-xs italic">
                      No cases found matching your search filter criteria.
                    </div>
                  )}
                </div>

                {/* Desktop View */}
                <div className="hidden sm:block overflow-x-auto touch-pan-y">
                  <table className="w-full text-left text-xs text-gray-200">
                    <thead className="bg-slate-950 uppercase font-semibold text-gray-400 border-b border-white/10">
                      <tr>
                        <th className="p-3.5">Case No</th>
                        <th className="p-3.5">Category</th>
                        <th className="p-3.5">B/L No</th>
                        <th className="p-3.5">Containers</th>
                        <th className="p-3.5">Route (POL &rarr; POD)</th>
                        <th className="p-3.5">Date</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 bg-slate-900/40">
                      {filteredCases.map((c) => (
                        <tr key={c.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-3.5 font-mono font-bold text-white">{c.caseNo}</td>
                          <td className="p-3.5">
                            <span className="bg-brand-500/15 text-brand-300 px-2 py-0.5 rounded border border-brand-500/20">
                              {c.category}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono text-gray-300">{c.extractedData?.blNumber || 'N/A'}</td>
                          <td className="p-3.5">
                            <div className="space-y-1">
                              {c.containers.map(cnt => (
                                <div key={cnt.id} className="font-mono text-[11px] text-gray-300">
                                  {cnt.number} ({cnt.size})
                                </div>
                              ))}
                              {c.containers.length === 0 && <span className="text-gray-500 italic">No container</span>}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <div className="text-[11px] text-gray-300">
                              <span>{c.pol}</span>
                              <span className="text-gray-500 mx-1">→</span>
                              <span className="text-brand-300 font-medium">{c.pod}</span>
                            </div>
                          </td>
                          <td className="p-3.5 text-gray-400">{c.createdAt}</td>
                          <td className="p-3.5">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                              c.status === CaseStatus.COMPLETED ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                              c.status === CaseStatus.IN_TRANSIT ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                              'bg-blue-500/20 text-blue-300 border-blue-500/30'
                            }`}>
                              {c.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => setSelectedCase(c)}
                              className="bg-brand-600/20 hover:bg-brand-600/40 text-brand-300 border border-brand-500/30 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 ml-auto transition"
                            >
                              <Eye size={14} /> View
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredCases.length === 0 && (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-gray-400 italic">
                            No cases found matching your search filter criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* View 3: Client New Case Registration Form */}
          {casesSubView === 'register' && (
            <div className="glass-card rounded-2xl p-6 border border-white/10 max-w-4xl mx-auto space-y-6">
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Plus className="text-brand-400" size={22} />
                    Register New Case
                  </h2>
                  <p className="text-gray-400 text-xs mt-0.5">
                    Enter your container and cargo details for customs clearance and transit approval
                  </p>
                </div>
                <button
                  onClick={() => setCasesSubView('overview')}
                  className="text-gray-400 hover:text-white text-xs px-3 py-1.5 rounded bg-white/5 border border-white/10"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleRegisterCaseSubmit} className="space-y-6">
                
                {/* 1. Category & Ports */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-gray-300 mb-1 block font-medium">Category:</label>
                    <select
                      value={newCaseCategory}
                      onChange={(e) => setNewCaseCategory(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-brand-500 outline-none"
                    >
                      <option value="Import & Export Services">Import & Export Services</option>
                      <option value="Afghan Transit">Afghan Transit</option>
                      <option value="Bonded Carrier">Bonded Carrier</option>
                      <option value="Customs Clearance">Customs Clearance</option>
                      <option value="TIR">TIR</option>
                      <option value="Transportation of Private Cargo">Transportation of Private Cargo</option>
                      <option value="Warehousing & Distribution">Warehousing & Distribution</option>
                      <option value="Car Carrier">Car Carrier</option>
                      <option value="ISO Tank Service">ISO Tank Service</option>
                      <option value="Liner & NVOCC">Liner & NVOCC</option>
                      <option value="Breakbulk / Chartering Services">Breakbulk / Chartering Services</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-gray-300 mb-1 block font-medium">Port of Loading (POL):</label>
                    <select
                      value={newCasePol}
                      onChange={(e) => setNewCasePol(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-brand-500 outline-none"
                    >
                      <option value="Karachi Port Trust">Karachi Port Trust (KPT)</option>
                      <option value="Port Qasim">Port Qasim (QICT)</option>
                      <option value="South Asia Pakistan Terminals">SAPT</option>
                      <option value="Gwadar Port">Gwadar Port</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-gray-300 mb-1 block font-medium">Port of Discharge (POD):</label>
                    <select
                      value={newCasePod}
                      onChange={(e) => setNewCasePod(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-brand-500 outline-none"
                    >
                      <option value="Chaman Border Terminal">Chaman Border Terminal</option>
                      <option value="Taftan Border Terminal">Taftan Border Terminal</option>
                      <option value="Torkham Border Terminal">Torkham Border Terminal</option>
                      <option value="Lahore Dry Port">Lahore Dry Port</option>
                      <option value="Lahore NLC Dry Port">Lahore NLC Dry Port</option>
                      <option value="Quetta Railway Dry Port">Quetta Railway Dry Port</option>
                      <option value="Peshawar Dry Port">Peshawar Dry Port</option>
                      <option value="Islamabad Dry Port">Islamabad Dry Port</option>
                    </select>
                  </div>
                </div>

                {/* 2. Shipping Details */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">B/L No:</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. MSK-112233"
                      value={newCaseBl}
                      onChange={(e) => setNewCaseBl(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-sm text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Vessel Name:</label>
                    <input
                      type="text"
                      placeholder="e.g. Maersk Sealand"
                      value={newCaseVessel}
                      onChange={(e) => setNewCaseVessel(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Item Description:</label>
                    <input
                      type="text"
                      placeholder="e.g. Solar Equipment"
                      value={newCaseItem}
                      onChange={(e) => setNewCaseItem(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Total Weight (Kg):</label>
                    <input
                      type="number"
                      placeholder="e.g. 28000"
                      value={newCaseWeight}
                      onChange={(e) => setNewCaseWeight(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-sm text-white font-mono"
                    />
                  </div>
                </div>

                {/* 3. Containers List */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-white">Containers Information:</label>
                    <button
                      type="button"
                      onClick={() => setNewCaseContainers([...newCaseContainers, { number: '', size: '40ft', weight: 28000 }])}
                      className="text-xs bg-brand-600/30 hover:bg-brand-600/50 text-brand-300 border border-brand-500/30 px-3 py-1 rounded-lg"
                    >
                      + Add Another Container
                    </button>
                  </div>

                  {newCaseContainers.map((cnt, idx) => (
                    <div key={idx} className="flex flex-wrap sm:flex-nowrap gap-3 items-center bg-slate-950 p-3 rounded-lg border border-white/10">
                      <div className="flex-1 min-w-[140px]">
                        <input
                          type="text"
                          required
                          placeholder="Container No (e.g. MSKU-998811)"
                          value={cnt.number}
                          onChange={(e) => {
                            const updated = [...newCaseContainers];
                            updated[idx].number = e.target.value;
                            setNewCaseContainers(updated);
                          }}
                          className="w-full bg-slate-900 border border-white/10 rounded p-2 text-xs font-mono text-white"
                        />
                      </div>
                      <div className="w-28">
                        <select
                          value={cnt.size}
                          onChange={(e) => {
                            const updated = [...newCaseContainers];
                            updated[idx].size = e.target.value as any;
                            setNewCaseContainers(updated);
                          }}
                          className="w-full bg-slate-900 border border-white/10 rounded p-2 text-xs text-white"
                        >
                          <option value="20ft">20ft</option>
                          <option value="40ft">40ft</option>
                          <option value="45ft">45ft</option>
                        </select>
                      </div>
                      <div className="w-32">
                        <input
                          type="number"
                          placeholder="Weight (Kg)"
                          value={cnt.weight}
                          onChange={(e) => {
                            const updated = [...newCaseContainers];
                            updated[idx].weight = parseFloat(e.target.value) || 0;
                            setNewCaseContainers(updated);
                          }}
                          className="w-full bg-slate-900 border border-white/10 rounded p-2 text-xs font-mono text-white"
                        />
                      </div>
                      {newCaseContainers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setNewCaseContainers(newCaseContainers.filter((_, i) => i !== idx))}
                          className="text-red-400 p-2 hover:bg-red-500/20 rounded"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* 4. Estimated Default Rate Note */}
                <div className="p-3 bg-brand-500/10 border border-brand-500/20 rounded-xl text-xs flex items-center justify-between">
                  <div className="text-gray-300">
                    <span>Default Route Charges ({newCasePol} → {newCasePod}):</span>
                    <span className="font-bold text-brand-300 ml-2 font-mono">
                      PKR {getRouteRate(newCasePol, newCasePod).toLocaleString()} / Container
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-400">Invoice generated automatically on arrival</span>
                </div>

                {/* Submit Action */}
                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setCasesSubView('overview')}
                    className="px-5 py-2.5 text-gray-400 hover:text-white text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-brand-600 hover:bg-brand-500 text-white px-8 py-2.5 rounded-lg font-medium text-sm shadow-lg shadow-brand-600/30 transition-all hover:scale-105"
                  >
                    Submit Case for Admin Approval
                  </button>
                </div>

              </form>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. FINANCE VIEW */}
      {/* ========================================================================= */}
      {activeTab === 'finance' && (
        <div className="space-y-6">

          {/* Top 3 Action Buttons requested by user */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* 1. View Ledger Button */}
            <button
              onClick={() => setShowLedgerModal(true)}
              className="glass-card p-5 rounded-2xl border border-brand-500/30 hover:border-brand-400 bg-gradient-to-br from-slate-900 to-brand-950/40 text-left transition-all hover:scale-[1.02] shadow-lg group"
            >
              <div className="w-12 h-12 rounded-xl bg-brand-600/20 text-brand-400 flex items-center justify-center mb-3 group-hover:bg-brand-600 group-hover:text-white transition-colors">
                <FileText size={24} />
              </div>
              <h3 className="text-lg font-bold text-white flex items-center justify-between">
                <span>View Ledger</span>
                <ChevronRight size={18} className="text-brand-400 group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="text-gray-400 text-xs mt-1">
                Check station-wise and date-wise complete account statement
              </p>
            </button>

            {/* 2. Add Payment Button */}
            <button
              onClick={() => setShowAddPaymentModal(true)}
              className="glass-card p-5 rounded-2xl border border-emerald-500/30 hover:border-emerald-400 bg-gradient-to-br from-slate-900 to-emerald-950/40 text-left transition-all hover:scale-[1.02] shadow-lg group"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center mb-3 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <CreditCard size={24} />
              </div>
              <h3 className="text-lg font-bold text-white flex items-center justify-between">
                <span>Add Payment</span>
                <ChevronRight size={18} className="text-emerald-400 group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="text-gray-400 text-xs mt-1">
                Upload bank transfer screenshot or bank deposit slip
              </p>
            </button>

            {/* 3. View Invoices Button */}
            <button
              onClick={() => setShowInvoicesModal(true)}
              className="glass-card p-5 rounded-2xl border border-blue-500/30 hover:border-blue-400 bg-gradient-to-br from-slate-900 to-blue-950/40 text-left transition-all hover:scale-[1.02] shadow-lg group"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <FileCheck size={24} />
              </div>
              <h3 className="text-lg font-bold text-white flex items-center justify-between">
                <span>View Invoices</span>
                <ChevronRight size={18} className="text-blue-400 group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="text-gray-400 text-xs mt-1">
                View and print container-wise auto-generated bills and invoices
              </p>
            </button>

          </div>

          {/* Financial Summary & Overview Analytics Section */}
          <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <DollarSign className="text-emerald-400" size={20} />
                Current Account Overview
              </h2>
              <p className="text-gray-400 text-xs mt-0.5">
                Real-time financial summary of billed charges, payments, outstanding balance, and monthly container volumes
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              
              {/* Card 1: Total Billed */}
              <div className="bg-slate-950/70 p-4 rounded-xl border border-white/5 space-y-1">
                <p className="text-xs text-gray-400">Total Billed Amount:</p>
                <p className="text-xl font-mono font-bold text-white">
                  PKR {totalBilled.toLocaleString()}
                </p>
                <span className="text-[10px] text-gray-500">Based on all active and completed cases</span>
              </div>

              {/* Card 2: Total Paid */}
              <div className="bg-slate-950/70 p-4 rounded-xl border border-emerald-500/20 space-y-1">
                <p className="text-xs text-emerald-400 font-medium">Total Paid:</p>
                <p className="text-xl font-mono font-bold text-emerald-400">
                  PKR {totalPaid.toLocaleString()}
                </p>
                <span className="text-[10px] text-emerald-500/80">Bank verified payments</span>
              </div>

              {/* Card 3: Remaining Balance */}
              <div className="bg-slate-950/70 p-4 rounded-xl border border-amber-500/30 space-y-1">
                <p className="text-xs text-amber-400 font-medium">Outstanding Balance:</p>
                <p className="text-xl font-mono font-bold text-amber-400">
                  PKR {remainingBalance.toLocaleString()}
                </p>
                <span className="text-[10px] text-amber-500/80">Payable amount</span>
              </div>

              {/* Card 4: This Month Containers */}
              <div className="bg-slate-950/70 p-4 rounded-xl border border-blue-500/20 space-y-1">
                <p className="text-xs text-blue-400 font-medium">Containers This Month:</p>
                <p className="text-xl font-mono font-bold text-white">
                  {thisMonthContainers} <span className="text-xs font-normal text-gray-400">Containers</span>
                </p>
                <span className="text-[10px] text-blue-400">Dispatched in current month</span>
              </div>

              {/* Card 5: Previous Month Containers */}
              <div className="bg-slate-950/70 p-4 rounded-xl border border-white/5 space-y-1">
                <p className="text-xs text-gray-400">Containers Last Month:</p>
                <p className="text-xl font-mono font-bold text-gray-300">
                  {previousMonthContainers} <span className="text-xs font-normal text-gray-400">Containers</span>
                </p>
                <span className="text-[10px] text-gray-500">Previous month volume</span>
              </div>

            </div>

            {/* Pending Payments Alert */}
            {pendingPaymentsTotal > 0 && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-amber-300">
                  <Clock size={16} className="animate-spin" />
                  <span>
                    Your payment of <strong>PKR {pendingPaymentsTotal.toLocaleString()}</strong> is currently pending verification by the finance team.
                  </span>
                </div>
                <span className="text-[11px] text-amber-400/80">Verification in Progress</span>
              </div>
            )}

          </div>

          {/* Recent Payments Stream */}
          <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <CreditCard size={18} className="text-brand-400" />
                Recent Payments & Deposit Proofs
              </h3>
              <button
                onClick={() => setShowAddPaymentModal(true)}
                className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 font-medium transition"
              >
                <Plus size={14} /> + New Payment
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-left text-xs text-gray-200">
                <thead className="bg-slate-950 uppercase font-semibold text-gray-400 border-b border-white/10">
                  <tr>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Method</th>
                    <th className="p-3.5">Bank</th>
                    <th className="p-3.5">TxID / Slip Reference</th>
                    <th className="p-3.5">Amount (PKR)</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Proof Slip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-slate-900/40">
                  {paymentsList.map((p) => (
                    <tr key={p.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3.5 text-gray-300 font-mono">{p.date}</td>
                      <td className="p-3.5">
                        <span className="bg-white/5 px-2 py-0.5 rounded text-gray-300">
                          {p.paymentMethod.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3.5 text-white font-medium">{p.bankName}</td>
                      <td className="p-3.5 font-mono text-brand-300">{p.referenceNo}</td>
                      <td className="p-3.5 font-mono font-bold text-emerald-400 text-sm">
                        PKR {p.amount.toLocaleString()}
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                          p.status === 'CONFIRMED' 
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}>
                          {p.status === 'CONFIRMED' ? 'Confirmed' : 'Pending Verification'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        {p.slipUrl ? (
                          <button
                            onClick={() => setLightboxImage(p.slipUrl!)}
                            className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 ml-auto underline"
                          >
                            <Eye size={14} /> View Slip
                          </button>
                        ) : (
                          <span className="text-gray-500 italic">No slip</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>

        </div>
      )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: VIEW LEDGER MODAL WITH STATION & DATE FILTERS */}
      {/* ========================================================================= */}
      {showLedgerModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto" data-printable-modal="true">
          <div className="bg-slate-900 rounded-2xl max-w-4xl w-full border border-white/10 shadow-2xl overflow-hidden my-8 print-sheet">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-brand-600/20 text-brand-400 no-print">
                  <FileText size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white print:text-black">Client Account Ledger</h3>
                  <p className="text-gray-400 print:text-gray-600 text-xs">Global Traders Ltd • Docks (Pvt.) Ltd Financial Statement</p>
                </div>
              </div>
              <button 
                onClick={() => setShowLedgerModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 no-print"
              >
                <X size={20} />
              </button>
            </div>

            {/* Official Print Header for Ledger (Only visible on paper) */}
            <div className="hidden print:block p-4 border-b-2 border-black">
              <div className="flex justify-between items-start">
                <div>
                  <Logo className="h-12 w-auto max-w-[200px] mb-2" />
                  <h2 className="text-xl font-bold text-black uppercase">{companyName}</h2>
                  <p className="text-xs text-gray-700">{subtitle || "Customs Clearance, Bonded Carrier & Freight Terminal Services"}</p>
                  <p className="text-[11px] text-gray-600 mt-1">Client: Global Traders Ltd (CLT-001)</p>
                </div>
                <div className="text-right text-xs text-gray-700">
                  <p className="font-semibold text-black">OFFICIAL CLIENT LEDGER</p>
                  <p>Station: {ledgerStationFilter === 'ALL' ? 'All Stations' : ledgerStationFilter}</p>
                  <p>Period: {ledgerRangeType === 'CUSTOM' ? `${ledgerStartDate || 'Start'} to ${ledgerEndDate || 'End'}` : ledgerRangeType.replace('_', ' ')}</p>
                </div>
              </div>
            </div>

            {/* Ledger Filters as Requested */}
            <div className="p-5 bg-slate-950/60 border-b border-white/10 space-y-4 no-print">
              <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Select Date Range & Station:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* 1. Date Range Selector */}
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Timeframe:</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setLedgerRangeType('CURRENT_MONTH')}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium border transition ${
                        ledgerRangeType === 'CURRENT_MONTH'
                          ? 'bg-brand-600 text-white border-brand-500'
                          : 'bg-slate-900 text-gray-300 border-white/10 hover:bg-white/5'
                      }`}
                    >
                      Current Month
                    </button>
                    <button
                      type="button"
                      onClick={() => setLedgerRangeType('CUSTOM')}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium border transition ${
                        ledgerRangeType === 'CUSTOM'
                          ? 'bg-brand-600 text-white border-brand-500'
                          : 'bg-slate-900 text-gray-300 border-white/10 hover:bg-white/5'
                      }`}
                    >
                      Custom Date Range
                    </button>
                  </div>

                  {ledgerRangeType === 'CUSTOM' && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <input
                        type="date"
                        value={ledgerStartDate}
                        onChange={(e) => setLedgerStartDate(e.target.value)}
                        className="bg-slate-900 border border-white/10 rounded p-1.5 text-xs text-white"
                      />
                      <input
                        type="date"
                        value={ledgerEndDate}
                        onChange={(e) => setLedgerEndDate(e.target.value)}
                        className="bg-slate-900 border border-white/10 rounded p-1.5 text-xs text-white"
                      />
                    </div>
                  )}
                </div>

                {/* 2. Station / Route Filter */}
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Station / Route Filter:</label>
                  {availableRoutes.length === 1 ? (
                    <div className="bg-slate-900 border border-white/10 rounded-lg p-2 text-xs text-gray-300">
                      Auto-Selected: <span className="font-semibold text-white">{availableRoutes[0]}</span>
                    </div>
                  ) : (
                    <select
                      value={ledgerStationFilter}
                      onChange={(e) => setLedgerStationFilter(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-xs text-white focus:border-brand-500 outline-none"
                    >
                      <option value="ALL">All Stations Combined</option>
                      {availableRoutes.map((route) => (
                        <option key={route} value={route}>{route}</option>
                      ))}
                    </select>
                  )}
                </div>

              </div>
            </div>

            {/* Printable Ledger Sheet */}
            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              
              {/* Header Letterhead for Print */}
              <div className="flex justify-between items-start border-b-2 border-brand-500 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-white">DOCKS (PVT.) LTD</h2>
                  <p className="text-xs text-gray-400">Customs Clearance, Bonded Carrier & Freight Management</p>
                  <p className="text-xs text-brand-300 font-medium mt-1">Client Statement: Global Traders Ltd (CLT-001)</p>
                </div>
                <div className="text-right text-xs text-gray-400 space-y-0.5">
                  <p>Statement Date: {new Date().toLocaleDateString()}</p>
                  <p>Route Filter: {ledgerStationFilter}</p>
                  <p>Period: {ledgerRangeType === 'CURRENT_MONTH' ? 'Current Month (April 2026)' : `${ledgerStartDate} to ${ledgerEndDate}`}</p>
                </div>
              </div>

              {/* Ledger Entries Table */}
              <table className="w-full text-left text-xs text-gray-200 border border-white/10">
                <thead className="bg-slate-950 uppercase font-semibold text-gray-400 border-b border-white/10">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Description / Route</th>
                    <th className="p-3">Container No</th>
                    <th className="p-3">Invoice No</th>
                    <th className="p-3 text-right">Debit (PKR)</th>
                    <th className="p-3 text-right">Credit (PKR)</th>
                    <th className="p-3 text-right">Balance (PKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {/* Row 1: Opening Balance */}
                  <tr className="bg-white/5 font-medium">
                    <td className="p-3 font-mono">2026-04-01</td>
                    <td className="p-3">Opening Balance Brought Forward</td>
                    <td className="p-3 font-mono">-</td>
                    <td className="p-3 font-mono">-</td>
                    <td className="p-3 text-right font-mono">-</td>
                    <td className="p-3 text-right font-mono">-</td>
                    <td className="p-3 text-right font-mono font-bold text-white">PKR 0</td>
                  </tr>

                  {/* Row 2: Invoice DPL-26-000004 C1 */}
                  <tr>
                    <td className="p-3 font-mono">2026-04-12</td>
                    <td className="p-3">Karachi to Chaman Freight & Handling</td>
                    <td className="p-3 font-mono text-brand-300">MSKU-8876541</td>
                    <td className="p-3 font-mono text-blue-400">INV-26-0004A</td>
                    <td className="p-3 text-right font-mono text-amber-300">220,000</td>
                    <td className="p-3 text-right font-mono">-</td>
                    <td className="p-3 text-right font-mono font-bold">220,000</td>
                  </tr>

                  {/* Row 3: Invoice DPL-26-000004 C2 */}
                  <tr>
                    <td className="p-3 font-mono">2026-04-12</td>
                    <td className="p-3">Karachi to Chaman Freight & Handling</td>
                    <td className="p-3 font-mono text-brand-300">MSKU-8876542</td>
                    <td className="p-3 font-mono text-blue-400">INV-26-0004B</td>
                    <td className="p-3 text-right font-mono text-amber-300">220,000</td>
                    <td className="p-3 text-right font-mono">-</td>
                    <td className="p-3 text-right font-mono font-bold">440,000</td>
                  </tr>

                  {/* Row 4: Payment Received */}
                  <tr className="bg-emerald-500/5">
                    <td className="p-3 font-mono">2026-04-13</td>
                    <td className="p-3 text-emerald-300">Bank Deposit (HBL #DEP-884210)</td>
                    <td className="p-3 font-mono">-</td>
                    <td className="p-3 font-mono text-emerald-400">REC-8842</td>
                    <td className="p-3 text-right font-mono">-</td>
                    <td className="p-3 text-right font-mono text-emerald-400 font-bold">100,000</td>
                    <td className="p-3 text-right font-mono font-bold text-white">340,000</td>
                  </tr>

                  {/* Row 5: Bonded Carrier Case 3 */}
                  <tr>
                    <td className="p-3 font-mono">2026-04-14</td>
                    <td className="p-3">Port Qasim to Lahore Bonded Transport</td>
                    <td className="p-3 font-mono text-brand-300">HLCU-1122334</td>
                    <td className="p-3 font-mono text-blue-400">INV-26-0003</td>
                    <td className="p-3 text-right font-mono text-amber-300">130,000</td>
                    <td className="p-3 text-right font-mono">-</td>
                    <td className="p-3 text-right font-mono font-bold">470,000</td>
                  </tr>

                  {/* Summary Totals */}
                  <tr className="bg-slate-950 font-bold border-t-2 border-brand-500 text-sm">
                    <td colSpan={4} className="p-3 text-right text-white uppercase">Net Summary:</td>
                    <td className="p-3 text-right text-amber-400 font-mono">570,000</td>
                    <td className="p-3 text-right text-emerald-400 font-mono">100,000</td>
                    <td className="p-3 text-right text-brand-400 font-mono text-base">PKR 470,000</td>
                  </tr>
                </tbody>
              </table>

              {/* Official Ledger Signatures for Print */}
              <div className="hidden print:flex justify-between items-end pt-8 pb-4 print-avoid-break">
                <div className="text-xs text-gray-600">
                  <p className="font-semibold text-black">Docks (Pvt.) Ltd — Client Accounts</p>
                  <p className="text-[10px]">Computer generated ledger statement • Valid without physical signature</p>
                  <p className="text-[9px] text-gray-500 mt-0.5">Printed on: {new Date().toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <div className="border-t border-dashed border-gray-600 pt-1 w-44 text-center">
                    <p className="text-[11px] font-semibold text-black">Accounts Officer</p>
                    <p className="text-[10px] text-gray-600">Finance & Terminal Billing</p>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950 border-t border-white/10 flex justify-between items-center no-print">
              <span className="text-xs text-gray-500">Auto-Generated Client Ledger Sheet</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowLedgerModal(false)}
                  className="px-4 py-2 text-xs text-gray-400 hover:text-white"
                >
                  Close
                </button>
                <button
                  onClick={async () => {
                    await downloadClientLedgerPdf({
                      clientName: 'Al-Khaleej Importers & Shipping Lines',
                      statementDate: new Date().toLocaleDateString(),
                      summary: {
                        totalDebits: 570000,
                        totalCredits: 100000,
                        netBalance: 470000,
                        totalContainers: 3
                      },
                      entries: [
                        { date: '2026-04-01', reference: 'OPN-BAL', description: 'Opening Balance', debit: 0, credit: 0, balance: 0 },
                        { date: '2026-04-05', reference: 'DPL-26-0001', description: 'Customs Clearance & Handling - [MSKU-9988221]', debit: 180000, credit: 0, balance: 180000 },
                        { date: '2026-04-08', reference: 'DPL-26-0002', description: 'Afghan Transit Clearance - [TGHU-4455667]', debit: 260000, credit: 0, balance: 440000 },
                        { date: '2026-04-10', reference: 'REC-8842', description: 'Bank Transfer Payment via Meezan Bank', debit: 0, credit: 100000, balance: 340000 },
                        { date: '2026-04-14', reference: 'INV-26-0003', description: 'Port Qasim to Lahore Bonded Transport - [HLCU-1122334]', debit: 130000, credit: 0, balance: 470000 }
                      ],
                      companyName,
                      customLogo: activeLogo,
                      branding
                    });
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-600/30"
                >
                  <Download size={15} />
                  <span>Download Ledger (PDF)</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD PAYMENT MODAL (WITH CAMERA & FILE UPLOAD) */}
      {/* ========================================================================= */}
      {showAddPaymentModal && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 rounded-2xl max-w-lg w-full border border-white/10 shadow-2xl overflow-hidden my-8">
            
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-600/20 text-emerald-400">
                  <CreditCard size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Add Payment Slip</h3>
                  <p className="text-gray-400 text-xs">Upload bank transfer screenshot or bank deposit slip</p>
                </div>
              </div>
              <button 
                onClick={() => { setShowAddPaymentModal(false); stopCamera(); }}
                className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="p-6 space-y-4">
              
              {/* Amount */}
              <div>
                <label className="text-xs text-gray-300 font-medium mb-1 block">Payment Amount (PKR):</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-gray-400 font-mono">PKR</span>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 150000"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg pl-12 pr-4 py-2.5 text-sm text-white font-mono font-bold focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Payment Method:</label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value as any })}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-xs text-white focus:border-emerald-500 outline-none"
                  >
                    <option value="ONLINE_TRANSFER">Online Bank Transfer</option>
                    <option value="BANK_DEPOSIT">Bank Deposit Slip</option>
                    <option value="CHEQUE">Bank Cheque</option>
                    <option value="CASH">Cash Payment</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Bank Name:</label>
                  <select
                    value={paymentForm.bankName}
                    onChange={(e) => setPaymentForm({ ...paymentForm, bankName: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-xs text-white focus:border-emerald-500 outline-none"
                  >
                    <option value="Meezan Bank Ltd">Meezan Bank Ltd</option>
                    <option value="Habib Bank Limited (HBL)">Habib Bank Limited (HBL)</option>
                    <option value="Bank Al Habib Ltd">Bank Al Habib Ltd</option>
                    <option value="Bank Alfalah">Bank Alfalah</option>
                    <option value="Faysal Bank">Faysal Bank</option>
                  </select>
                </div>
              </div>

              {/* Reference / TxID */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Transaction ID / Deposit Slip No:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FT-20260413-8899 or Slip #44210"
                  value={paymentForm.referenceNo}
                  onChange={(e) => setPaymentForm({ ...paymentForm, referenceNo: e.target.value })}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-xs text-white font-mono"
                />
              </div>

              {/* Upload Proof Slip (File or Camera) */}
              <div>
                <label className="text-xs text-gray-300 font-medium mb-1.5 block">
                  Deposit Proof Slip (Photo or PDF):
                </label>
                
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 p-3 rounded-xl flex items-center justify-center gap-2 text-xs text-gray-300 transition"
                  >
                    <Upload size={16} className="text-brand-400" />
                    <span>Upload File (PDF / Image)</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={startCamera}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 p-3 rounded-xl flex items-center justify-center gap-2 text-xs text-gray-300 transition"
                  >
                    <Camera size={16} className="text-emerald-400" />
                    <span>Take Photo with Camera</span>
                  </button>
                </div>

                {/* Camera View */}
                {isCameraActive && (
                  <div className="bg-black rounded-xl p-3 border border-white/20 space-y-2">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-48 object-cover rounded-lg bg-black" />
                    <div className="flex justify-between items-center">
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="text-xs text-gray-400 hover:text-white px-3 py-1"
                      >
                        Cancel Camera
                      </button>
                      <button
                        type="button"
                        onClick={capturePhoto}
                        className="bg-emerald-600 text-white text-xs px-4 py-1.5 rounded-lg font-medium"
                      >
                        Capture Slip Photo
                      </button>
                    </div>
                  </div>
                )}

                {/* Preview Uploaded Slip */}
                {paymentForm.slipUrl && !isCameraActive && (
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img src={paymentForm.slipUrl} alt="Slip Preview" className="w-12 h-12 object-cover rounded border border-white/10" />
                      <span className="text-xs text-gray-300 font-medium">Proof Slip Attached</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPaymentForm({ ...paymentForm, slipUrl: '' })}
                      className="text-red-400 text-xs hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Remarks */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Additional Remarks (Optional):</label>
                <input
                  type="text"
                  placeholder="e.g. Clearance charges for Case DPL-26-000004"
                  value={paymentForm.remarks}
                  onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-xs text-white"
                />
              </div>

              {/* Info Notification */}
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-300 flex items-start gap-2">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
                <span>
                  Once submitted, this payment will be marked as "Pending Verification". After finance team confirmation, it will be credited immediately to your account ledger.
                </span>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddPaymentModal(false)}
                  className="px-4 py-2 text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg text-xs font-medium shadow-lg shadow-emerald-600/30"
                >
                  Submit Payment
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: VIEW CONTAINER-WISE INVOICES MODAL */}
      {/* ========================================================================= */}
      {showInvoicesModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto" data-printable-modal="true">
          <div className="bg-slate-900 rounded-2xl max-w-4xl w-full border border-white/10 shadow-2xl overflow-hidden my-8 print-sheet">
            
            <div className={`p-5 border-b border-white/10 flex justify-between items-center bg-slate-950 ${selectedInvoiceContainer ? 'no-print' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400">
                  <FileCheck size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Container-Wise Invoices</h3>
                  <p className="text-gray-400 text-xs">Container-wise auto-generated bills and shipment invoices</p>
                </div>
              </div>
              <button 
                onClick={() => { setShowInvoicesModal(false); setSelectedInvoiceContainer(null); }}
                className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 no-print"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              
              {!selectedInvoiceContainer ? (
                <div className="space-y-4">
                  <p className="text-xs text-gray-400">
                    Click "View Invoice" on any container below to view or print its detailed invoice:
                  </p>

                  <div className="overflow-x-auto rounded-xl border border-white/10">
                    <table className="w-full text-left text-xs text-gray-200">
                      <thead className="bg-slate-950 uppercase font-semibold text-gray-400 border-b border-white/10">
                        <tr>
                          <th className="p-3">Invoice No</th>
                          <th className="p-3">Case No</th>
                          <th className="p-3">Container No</th>
                          <th className="p-3">Route</th>
                          <th className="p-3">Invoice Amount</th>
                          <th className="p-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 bg-slate-900/40">
                        {casesList.flatMap(c => c.containers.map((cntr, idx) => {
                          const rate = getRouteRate(c.pol, c.pod);
                          const invNum = `INV-26-${c.caseNo.split('-').pop()}${String.fromCharCode(65 + idx)}`;
                          return (
                            <tr key={`${c.id}-${cntr.id}`} className="hover:bg-white/5 transition">
                              <td className="p-3 font-mono font-bold text-blue-400">{invNum}</td>
                              <td className="p-3 font-mono text-gray-300">{c.caseNo}</td>
                              <td className="p-3 font-mono font-bold text-white">{cntr.number} ({cntr.size})</td>
                              <td className="p-3 text-gray-300">{c.pol} → {c.pod}</td>
                              <td className="p-3 font-mono font-bold text-amber-400">PKR {rate.toLocaleString()}</td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => setSelectedInvoiceContainer({
                                    caseNo: c.caseNo,
                                    container: cntr,
                                    pol: c.pol,
                                    pod: c.pod,
                                    date: c.createdAt,
                                    clientName: c.clientName,
                                    rate: rate,
                                    blNo: c.extractedData?.blNumber
                                  })}
                                  className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 px-3 py-1 rounded-lg text-xs font-medium ml-auto flex items-center gap-1 transition"
                                >
                                  <Eye size={13} /> View Invoice
                                </button>
                              </td>
                            </tr>
                          );
                        }))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* Detailed Single Container Invoice Sheet */
                <div className="bg-slate-950 p-6 rounded-2xl border border-white/10 space-y-6" id="container-invoice-sheet">
                  <div className="flex justify-between items-start border-b-2 border-brand-500 pb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-white">DOCKS (PVT.) LTD</h2>
                      <p className="text-xs text-gray-400">Freight Forwarding, Logistics & Customs Terminal Operator</p>
                      <p className="text-xs text-brand-300 font-semibold mt-1">CONTAINER FREIGHT INVOICE</p>
                    </div>
                    <div className="text-right text-xs text-gray-300 space-y-1">
                      <p className="font-mono text-sm font-bold text-white">INV-26-{selectedInvoiceContainer.container.number.slice(-4)}</p>
                      <p>Date: {selectedInvoiceContainer.date}</p>
                      <p>Due Date: Immediate / On Delivery</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs bg-white/5 p-4 rounded-xl">
                    <div>
                      <p className="text-gray-400 font-semibold uppercase text-[10px]">Billed To (Client):</p>
                      <p className="font-bold text-white text-sm">{selectedInvoiceContainer.clientName}</p>
                      <p className="text-gray-300">Account ID: CLT-001</p>
                      <p className="text-gray-300">B/L No: {selectedInvoiceContainer.blNo || 'N/A'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-400 font-semibold uppercase text-[10px]">Shipment & Route:</p>
                      <p className="font-bold text-brand-300">{selectedInvoiceContainer.pol} → {selectedInvoiceContainer.pod}</p>
                      <p className="font-mono text-white">Container: {selectedInvoiceContainer.container.number}</p>
                      <p className="text-gray-300">Size: {selectedInvoiceContainer.container.size} | Wt: {selectedInvoiceContainer.container.weight} Kg</p>
                    </div>
                  </div>

                  <table className="w-full text-left text-xs border border-white/10">
                    <thead className="bg-slate-900 uppercase font-semibold text-gray-300 border-b border-white/10">
                      <tr>
                        <th className="p-3">Description</th>
                        <th className="p-3 text-right">Amount (PKR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      <tr>
                        <td className="p-3">Freight & Destination Delivery Charges ({selectedInvoiceContainer.container.number})</td>
                        <td className="p-3 text-right font-mono font-medium">PKR {selectedInvoiceContainer.rate.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td className="p-3">Terminal Wharfage & Port Documentation Fee</td>
                        <td className="p-3 text-right font-mono font-medium">PKR 15,000</td>
                      </tr>
                      <tr className="bg-white/5 font-bold border-t-2 border-brand-500 text-sm">
                        <td className="p-3 text-white">TOTAL PAYABLE AMOUNT:</td>
                        <td className="p-3 text-right font-mono text-brand-400 text-base">
                          PKR {(selectedInvoiceContainer.rate + 15000).toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Payment Instructions & Official Signatures - Formatted for Print */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-4 border-t border-white/10 print:border-gray-300 print-avoid-break">
                    <div className="space-y-1">
                      <p className="font-semibold text-gray-300 print:text-black">Payment Terms & Bank Details:</p>
                      <p className="text-gray-400 print:text-gray-700">Bank: Meezan Bank Ltd (Corporate Branch)</p>
                      <p className="text-gray-400 print:text-gray-700">Account Title: {companyName}</p>
                      <p className="font-mono text-gray-400 print:text-gray-700">IBAN: PK65MEZN0000001234567801</p>
                      <p className="text-[10px] text-gray-500 mt-1">Please reference Container & Invoice No. when depositing.</p>
                    </div>
                    <div className="flex flex-col justify-end items-start sm:items-end">
                      <div className="border-t border-dashed border-gray-400 print:border-black pt-1 w-48 text-center mt-6">
                        <p className="font-semibold text-gray-300 print:text-black text-[11px]">Authorized Signatory</p>
                        <p className="text-[10px] text-gray-400 print:text-gray-600">DPL Billing & Terminal Accounts</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-white/10 no-print flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedInvoiceContainer(null)}
                      className="text-xs text-gray-400 hover:text-white"
                    >
                      ← Back to All Invoices
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          if (!selectedInvoiceContainer) return;
                          try {
                            await downloadContainerInvoicePdf({
                              invoiceNo: `INV-26-${selectedInvoiceContainer.container.number.slice(-4)}`,
                              clientName: selectedInvoiceContainer.clientName,
                              containerNo: selectedInvoiceContainer.container.number,
                              size: selectedInvoiceContainer.container.size || '40ft',
                              weight: selectedInvoiceContainer.container.weight,
                              sealNo: selectedInvoiceContainer.container.sealNo,
                              route: `${selectedInvoiceContainer.pol} -> ${selectedInvoiceContainer.pod}`,
                              rate: selectedInvoiceContainer.rate,
                              date: selectedInvoiceContainer.date,
                              blNo: selectedInvoiceContainer.blNo,
                              companyName: companyName
                            });
                          } catch (e) {
                            console.error("PDF download failed:", e);
                          }
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all"
                      >
                        <Download size={14} /> Download PDF
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>

            <div className="p-4 bg-slate-950 border-t border-white/10 flex justify-end no-print">
              <button
                onClick={() => { setShowInvoicesModal(false); setSelectedInvoiceContainer(null); }}
                className="px-4 py-2 text-xs text-gray-400 hover:text-white"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CASE DETAILS MODAL (WHEN A CASE IS CLICKED) */}
      {/* ========================================================================= */}
      {selectedCase && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto" data-printable-modal="true">
          <div className="bg-slate-900 rounded-2xl max-w-3xl w-full border border-white/10 shadow-2xl overflow-hidden my-8 print-sheet">
            
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-slate-950">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xl font-bold text-white print:text-black">{selectedCase.caseNo}</span>
                  <span className="bg-brand-500/20 text-brand-300 text-xs px-2.5 py-0.5 rounded border border-brand-500/30">
                    {selectedCase.category}
                  </span>
                </div>
                <p className="text-gray-400 text-xs mt-0.5 print:text-gray-600">Route: {selectedCase.pol} → {selectedCase.pod}</p>
              </div>
              <div className="flex items-center gap-2 no-print">
                <button
                  type="button"
                  onClick={() => downloadCasePdf(selectedCase, { onlyInvoice: true })}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-medium flex items-center gap-1.5 transition-colors"
                  title="Download Invoice as PDF"
                >
                  <Download size={14} />
                  <span>Download Invoice (PDF)</span>
                </button>
                <button 
                  onClick={() => setSelectedCase(null)}
                  className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 no-print"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              
              {/* Status Stepper */}
              <div className="bg-slate-950 p-4 rounded-xl border border-white/5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Current Shipment Status:
                </p>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-brand-300 text-sm flex items-center gap-1.5">
                    <CheckCircle2 size={16} className="text-brand-400" />
                    {selectedCase.status}
                  </span>
                  <span className="text-gray-400">Created: {selectedCase.createdAt}</span>
                </div>
              </div>

              {/* Shipping & Goods Specs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-white/5 p-4 rounded-xl border border-white/5">
                <div>
                  <span className="text-gray-400 block">B/L Number:</span>
                  <span className="font-mono text-white font-bold">{selectedCase.extractedData?.blNumber || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Vessel:</span>
                  <span className="text-white font-medium">{selectedCase.extractedData?.vesselName || 'Cosco Express'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Total Weight:</span>
                  <span className="font-mono text-white font-medium">{selectedCase.extractedData?.totalWeight || 28000} Kg</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Item Description:</span>
                  <span className="text-white font-medium">{selectedCase.extractedData?.itemName || 'General Cargo'}</span>
                </div>
              </div>

              {/* Containers Info */}
              <div>
                <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                  Containers Details ({selectedCase.containers.length} Containers):
                </h4>
                <div className="space-y-2">
                  {selectedCase.containers.map((cntr) => (
                    <div key={cntr.id} className="bg-slate-950 p-3 rounded-xl border border-white/10 flex flex-col sm:flex-row justify-between sm:items-center gap-2 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white text-sm">{cntr.number}</span>
                          <span className="bg-brand-500/20 text-brand-300 px-2 py-0.5 rounded text-[10px]">{cntr.size}</span>
                          <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded text-[10px]">{cntr.status}</span>
                        </div>
                        <p className="text-gray-400 text-[11px] mt-1">
                          Vehicle: <span className="text-gray-200">{cntr.vehicleNo || 'TL-8842'}</span> • Driver: <span className="text-gray-200">{cntr.driverName || 'Muhammad Ismail'}</span> ({cntr.driverContact || '0300-8877665'})
                        </p>
                      </div>
                      <div className="text-right font-mono text-gray-300">
                        {cntr.weight} Kg
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Billing Charges & Receipts */}
              {selectedCase.charges && selectedCase.charges.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>Billing Charges & Receipts:</span>
                    <span className="text-emerald-400 font-mono font-bold">
                      Total: PKR {selectedCase.charges.reduce((sum, ch) => sum + (Number(ch.amount) || 0), 0).toLocaleString()}
                    </span>
                  </h4>
                  <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-900/60">
                    <table className="w-full text-left text-xs text-gray-200">
                      <thead className="bg-white/5 uppercase font-semibold text-gray-300 border-b border-white/10">
                        <tr>
                          <th className="p-2.5 w-8 text-center">#</th>
                          <th className="p-2.5">Service Description</th>
                          <th className="p-2.5 text-right">Amount (PKR)</th>
                          <th className="p-2.5 text-center">Payment Receipt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {selectedCase.charges.map((ch, cIdx) => (
                          <tr key={cIdx} className="hover:bg-white/5 transition-colors">
                            <td className="p-2.5 text-gray-400 text-center">{cIdx + 1}</td>
                            <td className="p-2.5 font-medium text-white">{ch.description}</td>
                            <td className="p-2.5 text-right font-mono font-semibold text-emerald-400">
                              PKR {Number(ch.amount || 0).toLocaleString()}
                            </td>
                            <td className="p-2.5 text-center">
                              {ch.receiptUrl ? (
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setLightboxImage(ch.receiptUrl!)}
                                    className="px-2 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-medium flex items-center gap-1 transition-colors"
                                    title="View Receipt"
                                  >
                                    <Eye size={12} />
                                    <span>View Receipt</span>
                                  </button>
                                  <a
                                    href={ch.receiptUrl}
                                    download={ch.receiptName || `Receipt_${ch.description.replace(/\s+/g, '_')}.png`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 rounded bg-brand-500/15 hover:bg-brand-500/25 text-brand-300 border border-brand-500/30 text-[11px] transition-colors"
                                    title="Download Receipt"
                                  >
                                    <Download size={12} />
                                  </a>
                                </div>
                              ) : (
                                <span className="text-gray-500 text-[11px] italic">No receipt</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Attached Documents */}
              {selectedCase.documents && selectedCase.documents.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                    Attached Documents (Click to Preview):
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedCase.documents.map((doc, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          const url = (doc as any).url || 'https://placehold.co/600x800/png?text=Document+Preview';
                          setLightboxImage(url);
                        }}
                        className="bg-white/5 hover:bg-white/10 p-3 rounded-xl border border-white/10 cursor-pointer flex items-center justify-between transition group"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText size={16} className="text-brand-400 shrink-0" />
                          <span className="text-xs text-gray-200 truncate group-hover:text-brand-300">{doc.name}</span>
                        </div>
                        <Eye size={14} className="text-gray-400 group-hover:text-white" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            <div className="p-4 bg-slate-950 border-t border-white/10 flex justify-between items-center no-print">
              <button
                onClick={() => setSelectedCase(null)}
                className="px-4 py-2 text-xs text-gray-400 hover:text-white"
              >
                Close
              </button>
              <button
                onClick={() => downloadCasePdf(selectedCase)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg text-xs font-medium flex items-center gap-2 shadow-lg shadow-emerald-600/30"
              >
                <Download size={15} /> Download Case Summary (PDF)
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Lightbox / Document Zoom Modal */}
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
            alt="Document Preview" 
            className="max-w-full max-h-[90vh] object-contain rounded-lg border border-white/10 shadow-2xl" 
          />
        </div>
      )}

    </div>
  );
};

export default ClientPortal;
