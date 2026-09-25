import React, { useState, useEffect, useMemo } from 'react';
import { 
  Ship, FolderKanban, Clock, FileText, Search, Download, 
  CheckCircle2, Plus, LogOut, MapPin, Truck, AlertTriangle, 
  User, CreditCard, ChevronRight, RefreshCw, Filter, Layers, 
  ShieldCheck, ArrowUpRight, ArrowDownLeft, FileCheck, Receipt, Eye
} from 'lucide-react';
import { Case, CaseStatus, UserRole, StaffLoadingBill, StaffPrivateLedgerEntry, Container } from '../types';
import { subscribeToCases, subscribeToStaffBills, subscribeToStaffPrivateLedger, saveStaffPrivateLedgerEntryToFirestore, saveStaffBillToFirestore } from '../services/dbService';
import { useBranding } from '../services/brandingService';
import Logo from './Logo';
import { PortCaseDetailModal } from './PortCaseDetailModal';
import { PortSearchCaseModal } from './PortSearchCaseModal';
import { PortWorkflowModal } from './PortWorkflowModal';
import { DownloadLoadingBillSearchModal, DownloadClientLedgerModal, AddStaffPaymentModal } from './PortFinanceModals';
import { downloadLoadingBillPdf } from '../services/pdfExportService';

interface LoadingPortStaffPortalProps {
  onSignOut: () => void;
  userRole?: UserRole;
  userRoles?: UserRole[];
  staffUserId?: string;
  staffUserName?: string;
}

export const LoadingPortStaffPortal: React.FC<LoadingPortStaffPortalProps> = ({
  onSignOut,
  userRole = UserRole.LOADING_PORT_STAFF,
  userRoles = [],
  staffUserId = 'mohsin',
  staffUserName = 'Mohsin Khan'
}) => {
  const { customLogo, companyName } = useBranding();
  
  // Navigation State: 'cases' | 'current' | 'finance'
  // User explicitly specified:
  // - "cases" (instead of case management)
  // - "current cases"
  // - "finance"
  const [activeTab, setActiveTab] = useState<'cases' | 'current' | 'finance'>('cases');

  const [cases, setCases] = useState<Case[]>([]);
  const [loadingCases, setLoadingCases] = useState(true);
  const [staffBills, setStaffBills] = useState<StaffLoadingBill[]>([]);
  const [staffLedger, setStaffLedger] = useState<StaffPrivateLedgerEntry[]>([]);

  // Modals state
  const [selectedCaseForDetail, setSelectedCaseForDetail] = useState<Case | null>(null);
  const [selectedCaseForWorkflow, setSelectedCaseForWorkflow] = useState<Case | null>(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showDownloadBillModal, setShowDownloadBillModal] = useState(false);
  const [showDownloadLedgerModal, setShowDownloadLedgerModal] = useState(false);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);

  // Dynamic feedback toast
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Check if destination staff
  const isDestinationStaff = 
    userRole === UserRole.DESTINATION_PORT_STAFF || 
    userRole === UserRole.UNLOADING_PORT_STAFF || 
    userRoles.includes(UserRole.DESTINATION_PORT_STAFF) || 
    userRoles.includes(UserRole.UNLOADING_PORT_STAFF);

  // Quick station label
  const staffStation = isDestinationStaff ? 'Destination / Offloading Station' : 'Karachi Port Terminals Node';

  // Port filtering for Current Cases
  const [activePortFilter, setActivePortFilter] = useState<string>('ALL');

  // Subscribe to live cases
  useEffect(() => {
    setLoadingCases(true);
    const unsubCases = subscribeToCases((items) => {
      setCases(items || []);
      setLoadingCases(false);
    });
    return () => unsubCases();
  }, []);

  // Subscribe to staff private bills & ledgers isolated by staffUserId
  useEffect(() => {
    const unsubBills = subscribeToStaffBills(staffUserId, (billsList) => {
      setStaffBills(billsList || []);
    });

    const unsubLedger = subscribeToStaffPrivateLedger(staffUserId, (entries) => {
      setStaffLedger(entries || []);
    });

    return () => {
      unsubBills();
      unsubLedger();
    };
  }, [staffUserId]);

  const showToast = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 6000);
  };

  // 1. Pending Cases (loading workflow not yet completed)
  // For loading staff: all cases where loading workflow is not completed
  // For destination staff: all cases destination-bound or arrived
  const pendingCases = useMemo(() => {
    return cases.filter(c => {
      if (isDestinationStaff) {
        // Destination staff: sees in-transit or arrived at destination
        const isDestPending = c.status === CaseStatus.IN_TRANSIT || c.status === CaseStatus.DESTINATION_PORT_ARRIVAL;
        return isDestPending;
      }

      // Loading staff: Pending loading processing (Step 5 or 6, not yet departed/completed)
      const isPendingLoading = 
        c.status === CaseStatus.LOADING_PORT_PROCESSING || 
        c.status === CaseStatus.VEHICLE_ASSIGNMENT ||
        c.status === CaseStatus.WHARFAGE_PAYMENT ||
        (c.status !== CaseStatus.IN_TRANSIT && c.status !== CaseStatus.DESTINATION_PORT_ARRIVAL && c.status !== CaseStatus.COMPLETED);

      return isPendingLoading;
    });
  }, [cases, isDestinationStaff]);

  // 2. Completed Cases in the last 1 week (7 days)
  const completedCasesLastWeek = useMemo(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    return cases.filter(c => {
      const isCompleted = c.status === CaseStatus.COMPLETED || c.status === CaseStatus.IN_TRANSIT;
      if (!isCompleted) return false;

      const completionDateStr = 
        c.workflowDetails?.[CaseStatus.LOADING_PORT_PROCESSING]?.date || 
        c.workflowDetails?.[CaseStatus.DESTINATION_PORT_ARRIVAL]?.date || 
        c.updatedAt || 
        c.createdAt;

      if (!completionDateStr) return false;
      const compDate = new Date(completionDateStr);
      return compDate >= oneWeekAgo;
    });
  }, [cases]);

  // Current Cases filtered by Port
  const currentFilteredCases = useMemo(() => {
    return pendingCases.filter(c => {
      if (activePortFilter === 'ALL') return true;
      const pol = (c.pol || '').toUpperCase();
      const pod = (c.pod || '').toUpperCase();
      const target = activePortFilter.toUpperCase();

      if (isDestinationStaff) {
        return pod.includes(target);
      }
      return pol.includes(target);
    });
  }, [pendingCases, activePortFilter, isDestinationStaff]);

  // 3. Finance: Bills created in the last 1 week
  const billsLastWeek = useMemo(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    return staffBills.filter(b => {
      if (!b.date && !b.createdAt) return true;
      const dateToCheck = new Date(b.date || b.createdAt);
      return dateToCheck >= oneWeekAgo;
    }).sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
  }, [staffBills]);

  // 4. Finance: Containers with Pending Payments
  // Checks which bills have unpaid balance or containers with charges pending collection
  const pendingPaymentContainers = useMemo(() => {
    // List bills that have balanceDue > 0
    return staffBills.filter(b => {
      const remaining = Number(b.totalAmount) - (Number(b.paidAmount) || 0);
      return remaining > 0;
    });
  }, [staffBills]);

  // Unique clients list for Add Payment modal
  const uniqueClients = useMemo(() => {
    const set = new Set<string>();
    cases.forEach(c => { if (c.clientName) set.add(c.clientName); });
    staffBills.forEach(b => { if (b.clientName) set.add(b.clientName); });
    staffLedger.forEach(e => { if (e.clientName) set.add(e.clientName); });
    return Array.from(set).sort();
  }, [cases, staffBills, staffLedger]);

  return (
    <div className="flex h-screen h-[100dvh] w-full bg-slate-950 text-slate-100 font-sans overflow-hidden">
      
      {/* ============================================================ */}
      {/* SIDEBAR: Dedicated Loading & Offloading Staff Navigation */}
      {/* ============================================================ */}
      <aside className="w-64 bg-slate-900/95 border-r border-white/10 flex flex-col justify-between shrink-0 z-20">
        <div className="p-4 space-y-6">
          {/* Logo & Portal Identity */}
          <div className="px-2 pt-1">
            <Logo className="h-9 w-auto max-w-[150px] mb-2" />
            <div className="space-y-0.5">
              <span className="text-xs font-black text-white tracking-wider uppercase block">
                {isDestinationStaff ? 'Destination Staff Portal' : 'Loading Staff Portal'}
              </span>
              <span className="text-[10px] text-amber-400 font-mono tracking-wider block">
                {staffStation}
              </span>
            </div>
          </div>

          {/* Navigation Links (Cases, Current Cases, Finance) */}
          <nav className="space-y-1.5">
            {/* 1. Cases */}
            <button
              type="button"
              onClick={() => setActiveTab('cases')}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl font-bold text-xs transition-all ${
                activeTab === 'cases'
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 font-black'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <FolderKanban size={17} />
                <span>Cases</span>
              </div>
              <span className={`px-2 py-0.5 text-[10px] rounded-full font-mono font-bold ${
                activeTab === 'cases' ? 'bg-black/20 text-slate-950' : 'bg-white/10 text-gray-400'
              }`}>
                {cases.length}
              </span>
            </button>

            {/* 2. Current Cases */}
            <button
              type="button"
              onClick={() => setActiveTab('current')}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl font-bold text-xs transition-all ${
                activeTab === 'current'
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 font-black'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <Clock size={17} />
                <span>Current Cases</span>
              </div>
              <span className={`px-2 py-0.5 text-[10px] rounded-full font-mono font-bold ${
                activeTab === 'current' ? 'bg-black/20 text-slate-950' : 'bg-amber-500/20 text-amber-300'
              }`}>
                {pendingCases.length}
              </span>
            </button>

            {/* 3. Finance */}
            <button
              type="button"
              onClick={() => setActiveTab('finance')}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl font-bold text-xs transition-all ${
                activeTab === 'finance'
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 font-black'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <CreditCard size={17} />
                <span>Finance</span>
              </div>
              <span className={`px-2 py-0.5 text-[10px] rounded-full font-mono font-bold ${
                activeTab === 'finance' ? 'bg-black/20 text-slate-950' : 'bg-white/10 text-gray-400'
              }`}>
                {staffBills.length}
              </span>
            </button>
          </nav>
        </div>

        {/* Staff User Card & Sign Out */}
        <div className="p-4 border-t border-white/10 bg-slate-950/40 space-y-3">
          <div className="flex items-center gap-2.5 px-2 py-1">
            <div className="w-8 h-8 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 flex items-center justify-center font-bold text-xs shrink-0">
              {staffUserName.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-white block truncate">{staffUserName}</span>
              <span className="text-[10px] text-gray-400 block font-mono">ID: {staffUserId}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onSignOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 rounded-xl text-xs font-bold transition"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* MAIN VIEW CONTENT CONTAINER */}
      {/* ============================================================ */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto custom-scrollbar">
        
        {/* Dynamic Toast Feedback Notification */}
        {feedbackMessage && (
          <div className="fixed top-5 right-5 z-50 bg-gradient-to-r from-slate-900 to-slate-950 border-l-4 border-amber-400 text-amber-200 p-4 rounded-2xl shadow-2xl flex items-start gap-3 max-w-md animate-in slide-in-from-top-3">
            <CheckCircle2 className="text-amber-400 shrink-0 mt-0.5" size={18} />
            <div className="text-xs font-medium leading-relaxed flex-1">{feedbackMessage}</div>
            <button onClick={() => setFeedbackMessage(null)} className="text-gray-400 hover:text-white font-bold text-xs">✕</button>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 1: CASES (Search Case + Pending Section + 1-Week Completed Section) */}
        {/* ============================================================ */}
        {activeTab === 'cases' && (
          <div className="p-6 max-w-7xl w-full mx-auto space-y-6">
            
            {/* Top Bar: Search Case Button */}
            <div className="bg-slate-900/60 p-4 sm:p-5 rounded-3xl border border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shadow-xl">
              <div>
                <h2 className="text-base font-bold text-white tracking-wide">Cases & Shipments Ledger</h2>
                <p className="text-xs text-gray-400">Inspect historical records, pending loading cases, and completed shipments</p>
              </div>

              {/* Big "Search Case" Button */}
              <button
                type="button"
                onClick={() => setShowSearchModal(true)}
                className="bg-brand-600 hover:bg-brand-500 text-white font-bold px-5 py-2.5 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-600/25 transition active:scale-95"
              >
                <Search size={15} />
                <span>Search Case (Filters & Keyword)</span>
              </button>
            </div>

            {/* Section 1: Pending Cases with Required English Notice */}
            <div className="space-y-3">
              {/* English Warning / Prompt Message requested by user */}
              <div className="p-4 bg-amber-500/10 border-l-4 border-amber-400 rounded-2xl flex items-start gap-3 shadow-md">
                <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5">
                  <span className="font-bold text-amber-300 block">
                    Important Notice: Pending Operations Requiring Immediate Attention
                  </span>
                  <p className="text-amber-200/90 leading-relaxed">
                    Please complete these cases promptly and finalize their port loading operations without delay. Ensure bullet seals are verified, photos captured, and charges recorded before dispatch.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock size={14} className="text-amber-400" />
                  Pending Cases ({pendingCases.length})
                </h3>
                <span className="text-[11px] text-gray-400">Click any card to inspect particulars</span>
              </div>

              {loadingCases ? (
                <div className="text-center py-12 text-gray-400 flex flex-col items-center gap-2">
                  <RefreshCw size={24} className="animate-spin text-brand-400" />
                  <span className="text-xs">Loading pending shipments...</span>
                </div>
              ) : pendingCases.length === 0 ? (
                <div className="p-8 text-center bg-slate-900/30 rounded-2xl border border-dashed border-white/10 text-gray-400 text-xs">
                  No cases currently pending loading operations at this time. All containers are up to date!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {pendingCases.map(c => {
                    const cntr = c.containers?.[0];
                    return (
                      <div
                        key={c.id}
                        onClick={() => setSelectedCaseForDetail(c)}
                        className="bg-slate-900/80 hover:bg-slate-900 border border-white/10 hover:border-amber-500/40 rounded-2xl p-4 cursor-pointer transition-all space-y-3 group shadow-md"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-black text-amber-300 text-xs">{c.caseNo}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Loading Pending
                          </span>
                        </div>

                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Container:</span>
                            <span className="text-white font-mono font-bold">{cntr?.number || 'TBD'} ({cntr?.size || '40ft'})</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Client:</span>
                            <span className="text-gray-200 font-medium truncate max-w-[150px]">{c.clientName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Assigned Truck:</span>
                            <span className="text-gray-300 font-mono">{cntr?.vehicleNo || 'Awaiting Marker'}</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-400">
                          <span className="flex items-center gap-1">
                            <MapPin size={11} className="text-brand-400" /> {c.pol} → {c.pod}
                          </span>
                          <span className="text-brand-300 font-bold group-hover:underline flex items-center gap-0.5">
                            Inspect <ChevronRight size={12} />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section 2: Completed Cases (Within Past 1 Week) */}
            <div className="space-y-3 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  Completed Cases (Past 1 Week: {completedCasesLastWeek.length})
                </h3>
                <span className="text-[11px] text-gray-400">Historical shipments completed within last 7 days</span>
              </div>

              {completedCasesLastWeek.length === 0 ? (
                <div className="p-8 text-center bg-slate-900/30 rounded-2xl border border-dashed border-white/10 text-gray-400 text-xs">
                  No cases completed in the past 7 days. Use "Search Case" above to search all historical cases across any timeframe.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {completedCasesLastWeek.map(c => {
                    const cntr = c.containers?.[0];
                    return (
                      <div
                        key={c.id}
                        onClick={() => setSelectedCaseForDetail(c)}
                        className="bg-slate-900/60 hover:bg-slate-900 border border-white/10 hover:border-emerald-500/40 rounded-2xl p-4 cursor-pointer transition-all space-y-3 group shadow-md"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-black text-white text-xs">{c.caseNo}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                            <CheckCircle2 size={10} /> Dispatched / Completed
                          </span>
                        </div>

                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Container:</span>
                            <span className="text-gray-200 font-mono">{cntr?.number || 'TBD'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Client:</span>
                            <span className="text-gray-300 font-medium truncate max-w-[150px]">{c.clientName}</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-400">
                          <span className="flex items-center gap-1">
                            <MapPin size={11} className="text-brand-400" /> {c.pol} → {c.pod}
                          </span>
                          <span className="text-emerald-400 font-bold group-hover:underline flex items-center gap-0.5">
                            View <ChevronRight size={12} />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 2: CURRENT CASES (Pending Cases list -> Opens Workflow + Create Bill) */}
        {/* ============================================================ */}
        {activeTab === 'current' && (
          <div className="p-6 max-w-7xl w-full mx-auto space-y-6">
            
            {/* Header & Terminal Filter */}
            <div className="bg-slate-900/60 p-4 sm:p-5 rounded-3xl border border-white/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-xl">
              <div>
                <h2 className="text-base font-bold text-white tracking-wide">
                  {isDestinationStaff ? 'Current Destination Offloading Operations' : 'Current Pending Loading Cases'}
                </h2>
                <p className="text-xs text-gray-400">
                  Select any pending container to open workflow, verify seals, create loading bills, or dispatch
                </p>
              </div>

              {/* Port Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
                {[
                  { id: 'ALL', label: 'All Terminals' },
                  { id: 'KICT', label: 'KICT' },
                  { id: 'QICT', label: 'Port Qasim' },
                  { id: 'SAPT', label: 'SAPT' },
                  { id: 'KPT', label: 'KPT' }
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setActivePortFilter(p.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${
                      activePortFilter === p.id
                        ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                        : 'bg-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List of Pending Containers for Updating */}
            {currentFilteredCases.length === 0 ? (
              <div className="p-12 text-center bg-slate-900/30 rounded-3xl border border-dashed border-white/10 space-y-2">
                <Ship size={36} className="mx-auto text-gray-500 opacity-60" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">No pending cases under this terminal</h3>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  All containers under this filter have completed their workflow. Switch terminal tabs to view other active cases.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  <span>Pending Container Shipments ({currentFilteredCases.length})</span>
                  <span>Click to open workflow & bill generator</span>
                </div>

                {currentFilteredCases.map(c => {
                  const mainCntr = c.containers?.[0];
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedCaseForWorkflow(c)}
                      className="p-4 sm:p-5 bg-slate-900/80 hover:bg-slate-900 border border-white/10 hover:border-amber-500/50 rounded-3xl cursor-pointer transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group shadow-md"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20 font-bold">
                          <Ship size={18} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-white font-mono">{mainCntr?.number || 'Container TBD'}</span>
                            <span className="bg-white/5 border border-white/10 text-[10px] text-gray-400 font-bold px-2 py-0.5 rounded">
                              {mainCntr?.size || '40ft'}
                            </span>
                            <span className="font-mono text-amber-400 text-xs font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                              {c.caseNo}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1 text-[11px] text-gray-400 font-medium">
                            <span className="text-gray-300 font-semibold">{c.clientName}</span>
                            <span className="text-slate-600">•</span>
                            <span className="flex items-center gap-1"><MapPin size={11} className="text-brand-400" /> {c.pol} → {c.pod}</span>
                            <span className="text-slate-600">•</span>
                            <span>Assigned Truck: <span className="text-gray-200 font-mono font-bold">{mainCntr?.vehicleNo || 'TBD'}</span></span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-white/10">
                        <span className="bg-amber-400/10 text-amber-300 border border-amber-400/20 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1">
                          <Clock size={12} /> Update Workflow
                        </span>
                        <ChevronRight size={18} className="text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 3: FINANCE (Download Loading Bill + Download Ledger + Add Payment + 2 Sections) */}
        {/* ============================================================ */}
        {activeTab === 'finance' && (
          <div className="p-6 max-w-7xl w-full mx-auto space-y-6">
            
            {/* Top Bar with 3 Main Actions: Download Loading Bill, Download Client Ledger, Add Payment */}
            <div className="bg-slate-900/60 p-4 sm:p-5 rounded-3xl border border-white/10 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 shadow-xl">
              <div>
                <h2 className="text-base font-bold text-white tracking-wide">Port Operations Private Finance Desk</h2>
                <p className="text-xs text-gray-400">
                  Manage port loading bills, client ledgers, and disbursement payments for ID <span className="text-amber-400 font-mono font-bold">{staffUserId}</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* 1. Download Loading Bill Button */}
                <button
                  type="button"
                  onClick={() => setShowDownloadBillModal(true)}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2.5 rounded-2xl text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition active:scale-95"
                >
                  <Download size={14} />
                  <span>Download Loading Bill</span>
                </button>

                {/* 2. Download Client Ledger Button */}
                <button
                  type="button"
                  onClick={() => setShowDownloadLedgerModal(true)}
                  className="bg-brand-600 hover:bg-brand-500 text-white font-bold px-4 py-2.5 rounded-2xl text-xs flex items-center gap-1.5 shadow-lg shadow-brand-600/20 transition active:scale-95"
                >
                  <FileText size={14} />
                  <span>Download Client Ledger</span>
                </button>

                {/* 3. Add Payment Button */}
                <button
                  type="button"
                  onClick={() => setShowAddPaymentModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-2xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition active:scale-95"
                >
                  <Plus size={14} />
                  <span>Add Payment</span>
                </button>
              </div>
            </div>

            {/* Section 1: Bills Created in Past 1 Week */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt size={14} className="text-amber-400" />
                  Recent Loading Bills (Past 1 Week: {billsLastWeek.length})
                </h3>
                <span className="text-[11px] text-gray-400">Official bills created under ID: {staffUserId}</span>
              </div>

              {billsLastWeek.length === 0 ? (
                <div className="p-8 text-center bg-slate-900/30 rounded-2xl border border-dashed border-white/10 text-gray-400 text-xs">
                  No loading bills generated in the past 7 days. Click "Download Loading Bill" above to search older bills, or create one in Current Cases.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {billsLastWeek.map(b => (
                    <div
                      key={b.id || b.billNo}
                      className="bg-slate-900/80 border border-white/10 rounded-2xl p-4 space-y-3 shadow-md"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-amber-300 text-xs">{b.billNo}</span>
                        <span className="text-[10px] font-mono text-gray-400">{b.date}</span>
                      </div>

                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Client:</span>
                          <span className="text-white font-semibold truncate max-w-[160px]">{b.clientName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Case / Container:</span>
                          <span className="text-gray-200 font-mono">{b.caseNo} • {b.containerNo}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total Charges:</span>
                          <span className="text-emerald-400 font-mono font-bold">
                            PKR {b.totalAmount.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                        <span className="text-[10px] text-gray-400">
                          {b.charges?.length || 0} itemized heads
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            downloadLoadingBillPdf({
                              billNo: b.billNo,
                              caseNo: b.caseNo,
                              clientName: b.clientName,
                              containerNo: b.containerNo,
                              vehicleNo: b.vehicleNo,
                              driverName: b.driverName,
                              portTerminal: b.portTerminal,
                              date: b.date,
                              items: (b.charges || []).map(ch => ({
                                head: ch.head,
                                amount: ch.amount,
                                receiptName: ch.receiptName,
                                receiptUrl: ch.receiptUrl,
                                remarks: ch.description
                              })),
                              totalAmount: b.totalAmount,
                              remarks: b.remarks,
                              officerName: staffUserName,
                              branding: { companyName, customLogo }
                            }).catch(console.error);
                          }}
                          className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold px-3 py-1 rounded-xl text-[11px] flex items-center gap-1 transition"
                        >
                          <Download size={11} /> Download PDF
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 2: Containers with Pending Payments */}
            <div className="space-y-3 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard size={14} className="text-red-400" />
                  Containers with Pending Payments ({pendingPaymentContainers.length})
                </h3>
                <span className="text-[11px] text-gray-400">Containers awaiting client settlement</span>
              </div>

              {pendingPaymentContainers.length === 0 ? (
                <div className="p-8 text-center bg-slate-900/30 rounded-2xl border border-dashed border-white/10 text-gray-400 text-xs">
                  🎉 Great job! No containers have pending outstanding payments at this time.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {pendingPaymentContainers.map(b => {
                    const balance = Number(b.totalAmount) - (Number(b.paidAmount) || 0);
                    return (
                      <div
                        key={b.id || b.billNo}
                        className="bg-slate-900/80 border border-red-500/20 rounded-2xl p-4 space-y-3 shadow-md"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-white text-xs">{b.containerNo}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                            Unpaid Balance
                          </span>
                        </div>

                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Client:</span>
                            <span className="text-gray-200 font-semibold truncate max-w-[160px]">{b.clientName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Bill No:</span>
                            <span className="text-amber-400 font-mono">{b.billNo}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Total Billed:</span>
                            <span className="text-gray-300 font-mono">PKR {b.totalAmount.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Outstanding:</span>
                            <span className="text-red-400 font-mono font-bold">PKR {balance.toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                          <span className="text-[10px] text-gray-400">Case: {b.caseNo}</span>
                          <button
                            type="button"
                            onClick={() => setShowAddPaymentModal(true)}
                            className="bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-bold px-3 py-1 rounded-xl text-[11px] flex items-center gap-1 transition"
                          >
                            <Plus size={11} /> Record Payment
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

      </main>

      {/* ============================================================ */}
      {/* MODALS */}
      {/* ============================================================ */}

      {/* 1. Case Details Modal (Particulars + Documents Read-only) */}
      {selectedCaseForDetail && (
        <PortCaseDetailModal
          isOpen={!!selectedCaseForDetail}
          onClose={() => setSelectedCaseForDetail(null)}
          targetCase={selectedCaseForDetail}
          isDestinationStaff={isDestinationStaff}
          staffName={staffUserName}
        />
      )}

      {/* 2. Search Case Modal */}
      {showSearchModal && (
        <PortSearchCaseModal
          isOpen={showSearchModal}
          onClose={() => setShowSearchModal(false)}
          cases={cases}
          onSelectCase={(c) => {
            setSelectedCaseForDetail(c);
          }}
        />
      )}

      {/* 3. Workflow & Update Modal for Current Cases */}
      {selectedCaseForWorkflow && (
        <PortWorkflowModal
          isOpen={!!selectedCaseForWorkflow}
          onClose={() => setSelectedCaseForWorkflow(null)}
          targetCase={selectedCaseForWorkflow}
          staffUserId={staffUserId}
          staffName={staffUserName}
          isDestinationStaff={isDestinationStaff}
          onSuccess={showToast}
        />
      )}

      {/* 4. Download Loading Bill Search Modal */}
      {showDownloadBillModal && (
        <DownloadLoadingBillSearchModal
          isOpen={showDownloadBillModal}
          onClose={() => setShowDownloadBillModal(false)}
          bills={staffBills}
          staffName={staffUserName}
        />
      )}

      {/* 5. Download Client Ledger Modal */}
      {showDownloadLedgerModal && (
        <DownloadClientLedgerModal
          isOpen={showDownloadLedgerModal}
          onClose={() => setShowDownloadLedgerModal(false)}
          ledgerEntries={staffLedger}
          bills={staffBills}
          staffUserId={staffUserId}
          staffName={staffUserName}
        />
      )}

      {/* 6. Add Payment Modal */}
      {showAddPaymentModal && (
        <AddStaffPaymentModal
          isOpen={showAddPaymentModal}
          onClose={() => setShowAddPaymentModal(false)}
          staffUserId={staffUserId}
          staffName={staffUserName}
          clients={uniqueClients}
          onPaymentAdded={(entry) => {
            showToast(`✓ Payment of PKR ${entry.credit.toLocaleString()} added to ${entry.clientName}'s ledger.`);
          }}
        />
      )}

    </div>
  );
};
