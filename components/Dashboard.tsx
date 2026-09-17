import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine, CartesianGrid
} from 'recharts';
import { 
  AlertTriangle, Truck, Anchor, DollarSign, Activity, 
  FileText, CheckCircle, Clock, Sparkles, RefreshCw, AlertCircle, Calendar, TrendingUp, TrendingDown, Crosshair, ArrowRight, BarChart2, Filter, X,
  Building2, MapPin, Search, Printer, ShieldCheck, Globe, ChevronDown, ChevronUp,
  Layers, CheckCircle2, Boxes
} from 'lucide-react';
import { LogEntry, CaseStatus, Case } from '../types';
import { subscribeToCases } from '../services/dbService';
import { 
  calculateStationMovements, 
  StationMovementDetail, 
  StationAnalyticsSummary 
} from '../services/stationAnalytics';

// Standalone Data Generator based on dates
const generateGraphData = (startStr: string, endStr: string) => {
  const data = [];
  const end = new Date(endStr);
  const start = new Date(startStr);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays > 90) diffDays = 90; // Cap at 90 days for performance/looks
  const totalDays = diffDays + 1; // Inclusive

  let prevVal = 45; 

  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    
    // Random volatility
    const MathSign = Math.random() > 0.45 ? 1 : -1;
    const change = Math.floor(Math.random() * 18) * MathSign; 
    let val = prevVal + change;
    
    // Boundaries
    if (val < 2) val = 2; 
    if (val > 115) val = 115;

    // Determine Trend
    const isBullish = val >= prevVal;

    // Format Day Label
    const dayNumeric = d.getDate();
    const isFirstOfMonth = dayNumeric === 1;
    const dayLabelStr = isFirstOfMonth 
      ? d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }).toUpperCase()
      : `${dayNumeric}`;

    data.push({
      id: totalDays - i,
      dayLabel: dayLabelStr,
      fullDate: d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' }),
      containers: val,
      prevVal: prevVal,
      trend: isBullish ? 'UP' : 'DOWN',
      isToday: i === totalDays - 1, // Assume last point is the "end" target
      isCritical: val > 100
    });

    prevVal = val;
  }
  return data;
};

// Fixed Y-Axis scale constraints
const yAxisMax = 120;
const yAxisTicks = [0, 20, 40, 60, 80, 100, 120];

// Full Ports List Extracted
const INTERN_SEAPORTS = [
  "Karachi Port Trust (KPT)", "Port Qasim (QICT)", "South Asia Pakistan Terminals (SAPT)", 
  "Karachi International Container Terminal (KICT)", "Karachi Gateway Terminal (KGTL)", 
  "Karachi Gateway Terminal Multipurpose (KGTML)", "Al-Hamd International Container Terminal (AICT)", "Gwadar Port"
];
const DRY_PORTS = [
  "Faisalabad Dry Port", "Lahore Dry Port", "Lahore NLC Dry Port", "Lahore MICT Dry Port", 
  "Lahore DPW Dry Port", "Rawalpindi Dry Port", "Multan Dry Port", "Sialkot Dry Port (SICT)", 
  "Islamabad Dry Port", "Azakhel Dry Port", "Havelian Dry Port", "Peshawar Dry Port", 
  "Jamrud Dry Port", "Quetta Railway Dry Port", "Quetta NLC Dry Port", "Gilgit Dry Port", 
  "Sost Dry Port", "Muzaffarabad Dry Port", "Karachi Dry Port", "Karachi NLC Dry Port", 
  "NLC Sultanabad"
];
const BORDER_TERMINALS = [
  "Wagha Border Terminal", "Torkham Border Terminal", "Chaman Border Terminal", "Taftan Border Terminal", 
  "Angur Ada", "Badini", "Ghulam Khan", "Kharlachi", "Mand"
];
// Mock Activity Log
const INITIAL_LOGS: LogEntry[] = [
  { id: 1, action: 'User Login', user: 'Arbab Khan (Admin)', timestamp: 'Just Now', type: 'SUCCESS' },
  { id: 2, action: 'New Case Submitted: DPL-24-00042', user: 'Global Traders (Client)', timestamp: '10:42 AM', type: 'SUCCESS' },
  { id: 3, action: 'Vehicle Registration Expired: KLA-992', user: 'System Alert', timestamp: '09:15 AM', type: 'ERROR' },
  { id: 4, action: 'Payment Received: PKR 12,500', user: 'Finance Manager', timestamp: 'Yesterday', type: 'INFO' },
  { id: 5, action: 'Document Uploaded: TP Filing', user: 'Ops Manager', timestamp: 'Yesterday', type: 'INFO' },
];

const FULL_LOGS: LogEntry[] = [
    ...INITIAL_LOGS,
    { id: 6, action: 'Driver Assigned: Ahmed Ali', user: 'Transport Officer', timestamp: 'Yesterday', type: 'INFO' },
    { id: 7, action: 'Container Arrived at Port', user: 'Port Staff', timestamp: '2 days ago', type: 'SUCCESS' },
    { id: 8, action: 'Invoice Generated #8821', user: 'Finance Manager', timestamp: '2 days ago', type: 'INFO' },
    { id: 9, action: 'System Backup Completed', user: 'System', timestamp: '3 days ago', type: 'SUCCESS' },
    { id: 10, action: 'Login Failed (3 attempts)', user: 'Unknown IP', timestamp: '3 days ago', type: 'WARNING' },
];

const SectionHeader = ({ title, icon: Icon }: any) => (
  <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
    <div className="p-1.5 rounded-lg bg-brand-500/10 text-brand-400">
        <Icon size={16} />
    </div>
    <h3 className="text-gray-100 font-semibold text-base">{title}</h3>
  </div>
);

const StatusRow = ({ label, count, color = "text-white", onClick }: any) => (
  <div 
    onClick={onClick}
    className={`flex justify-between items-center py-2 border-b border-white/5 last:border-0 hover:bg-white/10 px-2 rounded transition-colors group ${onClick ? 'cursor-pointer' : ''}`}
  >
    <div className="flex items-center gap-2">
        <span className="text-gray-400 text-sm group-hover:text-gray-200 transition-colors">{label}</span>
        {onClick && <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 text-gray-500 -ml-1 transition-all" />}
    </div>
    <span className={`font-bold font-mono ${color}`}>{count}</span>
  </div>
);

interface DashboardProps {
    onNavigate: (viewId: string, filterData: any) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Activity Log State
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS);
  const [showAllLogs, setShowAllLogs] = useState(false);

  // Live Cases from Firestore
  const [liveCases, setLiveCases] = useState<Case[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToCases(
      (cases) => {
        if (cases && cases.length > 0) {
          setLiveCases(cases);
        }
      },
      (err) => console.warn("Dashboard case subscription warning:", err)
    );
    return () => unsubscribe();
  }, []);

  // Drag to Scroll State for Graph (used in modal)
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);
  const [selectedData, setSelectedData] = useState<any>(null);

  // Stats Modal State
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [statsFilter, setStatsFilter] = useState({
      fromDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
      toDate: new Date().toISOString().split('T')[0],
      portOfLoading: 'ALL',
      portOfUnloading: 'ALL'
  });
  const [generatedGraphData, setGeneratedGraphData] = useState<any[]>([]);
  const [stationMovements, setStationMovements] = useState<StationMovementDetail[]>([]);
  const [stationSummary, setStationSummary] = useState<StationAnalyticsSummary | null>(null);

  // View tabs & filters inside Modal
  const [activeReportTab, setActiveReportTab] = useState<'details' | 'graph'>('details');
  const [stationSearchQuery, setStationSearchQuery] = useState('');
  const [stationCategoryFilter, setStationCategoryFilter] = useState<'ALL' | 'CLEARANCE' | 'AFGHAN_TRANSIT' | 'BONDED' | 'PRIVATE'>('ALL');
  const [stationTypeFilter, setStationTypeFilter] = useState<'ALL' | 'Sea Port' | 'Border Terminal' | 'Dry Port'>('ALL');
  const [expandedStationId, setExpandedStationId] = useState<string | null>(null);

  const handleOpenStats = () => {
    setIsStatsModalOpen(true);
    setGeneratedGraphData([]);
    setStationMovements([]);
    setStationSummary(null);
    setActiveReportTab('details');
    setStationSearchQuery('');
    setStationCategoryFilter('ALL');
    setStationTypeFilter('ALL');
    setExpandedStationId(null);
  };

  const handleGenerateStats = (e: React.FormEvent) => {
    e.preventDefault();
    const data = generateGraphData(statsFilter.fromDate, statsFilter.toDate);
    setGeneratedGraphData(data);

    const { movements, summary } = calculateStationMovements(
      statsFilter.fromDate,
      statsFilter.toDate,
      statsFilter.portOfLoading,
      statsFilter.portOfUnloading,
      liveCases
    );
    setStationMovements(movements);
    setStationSummary(summary);
    setActiveReportTab('details'); // Directly present the station detail report!
    
    // Auto-scroll to end after slight delay for render if switching to graph
    setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
        }
    }, 100);
  };


  const handleViewAllLogs = () => {
      if (showAllLogs) {
          setLogs(INITIAL_LOGS);
          setShowAllLogs(false);
      } else {
          setLogs(FULL_LOGS);
          setShowAllLogs(true);
      }
  };

  // Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeftState(scrollContainerRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Scroll speed multiplier
    scrollContainerRef.current.scrollLeft = scrollLeftState - walk;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* 1. Main Action Hero Section */}
      <div className="glass-card rounded-2xl p-8 border border-white/10 bg-[#0f172a] shadow-xl flex flex-col items-center justify-center text-center">
        <div className="bg-brand-500/20 p-4 rounded-full mb-4">
           <Building2 className="w-10 h-10 text-brand-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Completed Containers & Station Statistics</h2>
        <p className="text-slate-400 mb-6 max-w-2xl text-sm leading-relaxed">
          Comprehensive station-wise breakdown of containers moved, customs clearances completed, and Afghan Transit operations across all terminals.
        </p>
        <button 
          onClick={handleOpenStats}
          className="bg-brand-600 hover:bg-brand-500 text-white px-8 py-3.5 rounded-lg font-semibold flex items-center gap-2.5 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-brand-500/25"
        >
          <Filter size={18} />
          Check Station-Wise Containers Movement & Statistics
        </button>
      </div>

      {isStatsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
           <div className="bg-[#0f172a] border border-slate-700 w-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[96vh] animate-fade-in">
             {/* Header */}
             <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-[#020617]">
               <div className="flex items-center gap-2.5">
                 <div className="p-2 bg-brand-500/10 rounded-lg text-brand-400">
                   <Building2 size={22} />
                 </div>
                 <div>
                   <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                     Station-Wise Movement & Container Statistics
                   </h2>
                   <p className="text-xs text-slate-400 hidden sm:block">Detailed metrics for containers moved, customs clearances, and Afghan Transit</p>
                 </div>
               </div>
               <button 
                 onClick={() => setIsStatsModalOpen(false)}
                 className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                 title="Close"
               >
                 <X size={20} />
               </button>
             </div>
             
             {/* Content Area */}
             <div className="flex-1 overflow-y-auto w-full custom-scrollbar">
               
               {stationMovements.length === 0 && generatedGraphData.length === 0 ? (
                   // Filter Form View
                   <div className="p-6 sm:p-10 w-full max-w-2xl mx-auto">
                     <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex items-start gap-3 mb-8">
                        <CheckCircle size={20} className="text-emerald-500 mt-0.5 shrink-0" />
                        <div>
                          <h4 className="text-sm font-bold text-emerald-400 tracking-wide mb-1">COMPLETED & DELIVERED OPERATIONS</h4>
                          <p className="text-xs text-emerald-400/80 leading-relaxed">
                            This report calculates detailed station-by-station operational metrics for completed cargo: containers moved, customs clearances finalized, Afghan Transit dispatches, and bonded transshipments.
                          </p>
                        </div>
                     </div>
                     <form onSubmit={handleGenerateStats} className="space-y-6">
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-2">
                             <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">From Date</label>
                             <input 
                               type="date"
                               required
                               value={statsFilter.fromDate}
                               onChange={e => setStatsFilter({...statsFilter, fromDate: e.target.value})}
                               className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm"
                             />
                           </div>
                           <div className="space-y-2">
                             <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">To Date</label>
                             <input 
                               type="date"
                               required
                               value={statsFilter.toDate}
                               onChange={e => setStatsFilter({...statsFilter, toDate: e.target.value})}
                               className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm"
                             />
                           </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-2">
                             <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Port of Loading (POL)</label>
                             <select 
                                 value={statsFilter.portOfLoading}
                                 onChange={e => setStatsFilter({...statsFilter, portOfLoading: e.target.value})}
                                 className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 select-wrapper text-sm"
                             >
                                <option value="ALL" className="font-bold">ALL PORTS / ORIGINS</option>
                                <optgroup label="Sea Ports" className="text-brand-400 font-semibold bg-slate-800">
                                  {INTERN_SEAPORTS.map(port => <option key={port} value={port} className="text-white bg-slate-900 font-normal">{port}</option>)}
                                </optgroup>
                                <optgroup label="Dry Ports / Off-Dock Terminals" className="text-brand-400 font-semibold bg-slate-800">
                                  {DRY_PORTS.map(port => <option key={port} value={port} className="text-white bg-slate-900 font-normal">{port}</option>)}
                                </optgroup>
                                <optgroup label="Border Terminals / Crossings" className="text-brand-400 font-semibold bg-slate-800">
                                  {BORDER_TERMINALS.map(port => <option key={port} value={port} className="text-white bg-slate-900 font-normal">{port}</option>)}
                                </optgroup>
                             </select>
                           </div>

                           <div className="space-y-2">
                             <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Port of Unloading / Destination</label>
                             <select 
                                 value={statsFilter.portOfUnloading}
                                 onChange={e => setStatsFilter({...statsFilter, portOfUnloading: e.target.value})}
                                 className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 select-wrapper text-sm"
                             >
                                <option value="ALL" className="font-bold">ALL PORTS / DESTINATIONS</option>
                                <optgroup label="Sea Ports" className="text-brand-400 font-semibold bg-slate-800">
                                  {INTERN_SEAPORTS.map(port => <option key={port} value={port} className="text-white bg-slate-900 font-normal">{port}</option>)}
                                </optgroup>
                                <optgroup label="Dry Ports / Off-Dock Terminals" className="text-brand-400 font-semibold bg-slate-800">
                                  {DRY_PORTS.map(port => <option key={port} value={port} className="text-white bg-slate-900 font-normal">{port}</option>)}
                                </optgroup>
                                <optgroup label="Border Terminals / Crossings" className="text-brand-400 font-semibold bg-slate-800">
                                  {BORDER_TERMINALS.map(port => <option key={port} value={port} className="text-white bg-slate-900 font-normal">{port}</option>)}
                                </optgroup>
                             </select>
                           </div>
                        </div>

                        <div className="pt-6 border-t border-slate-800">
                           <button 
                             type="submit"
                             className="w-full bg-brand-600 hover:bg-brand-500 text-white rounded-lg py-4 font-bold text-base transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25 active:scale-98"
                           >
                              <Building2 size={20} />
                              Generate Station Movement & Analytics Report
                           </button>
                        </div>

                     </form>
                   </div>
               ) : (
                   // Generated Report View
                   <div className="p-4 sm:p-6 bg-[#0b1221] space-y-6">
                     
                     {/* 1. Report Header / Top Toolbar */}
                     <div className="p-4 sm:p-5 border border-slate-800 rounded-xl bg-[#0f172a] flex flex-wrap justify-between items-center gap-4">
                        <div className="flex items-center gap-3">
                           <div className="bg-brand-500/10 p-2.5 rounded-xl text-brand-400 border border-brand-500/20">
                              <Building2 size={22} />
                           </div>
                           <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-white font-bold text-base tracking-wide">
                                  STATION-WISE OPERATIONAL REPORT
                                </h3>
                                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider border border-emerald-500/20">
                                  Delivered Cargo
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-400">
                                 <span className="font-mono text-slate-300">
                                   {new Date(statsFilter.fromDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })} — {new Date(statsFilter.toDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                                 </span>
                                 <span className="text-slate-600">•</span>
                                 <span className="text-slate-300">
                                   Corridor: <span className="font-medium text-white">{statsFilter.portOfLoading === 'ALL' ? 'Any Origin' : statsFilter.portOfLoading}</span> → <span className="font-medium text-white">{statsFilter.portOfUnloading === 'ALL' ? 'Any Destination' : statsFilter.portOfUnloading}</span>
                                 </span>
                              </div>
                           </div>
                        </div>

                        <div className="flex items-center gap-3">
                           <button 
                             onClick={() => window.print()}
                             className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 border border-slate-700/60"
                           >
                              <Printer size={15} />
                              Print Report
                           </button>
                           <button 
                             onClick={() => {
                               setGeneratedGraphData([]);
                               setStationMovements([]);
                               setStationSummary(null);
                             }}
                             className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
                           >
                              Change Filters
                           </button>
                        </div>
                     </div>

                     {/* 2. Executive Metrics Strip (All Stations Combined) */}
                     {stationSummary && (
                       <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                         {/* Total Moved */}
                         <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors">
                            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                              <span className="font-semibold uppercase tracking-wider text-[11px]">Total Moved</span>
                              <Truck size={16} className="text-brand-400" />
                            </div>
                            <div className="text-2xl sm:text-3xl font-black font-mono text-white my-1">
                              {stationSummary.totalContainersMoved.toLocaleString()}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              20ft: <span className="text-slate-200 font-medium">{stationSummary.totalTwentyFt}</span> • 40ft: <span className="text-slate-200 font-medium">{stationSummary.totalFortyFt}</span>
                            </div>
                         </div>

                         {/* Customs Clearance */}
                         <div className="bg-[#0f172a] border border-emerald-900/40 rounded-xl p-4 flex flex-col justify-between hover:border-emerald-800/50 transition-colors">
                            <div className="flex items-center justify-between text-xs text-emerald-400 mb-1">
                              <span className="font-semibold uppercase tracking-wider text-[11px]">Customs Clearance</span>
                              <FileText size={16} className="text-emerald-400" />
                            </div>
                            <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 my-1">
                              {stationSummary.totalCustomsClearance.toLocaleString()}
                            </div>
                            <div className="text-[11px] text-emerald-500/80">
                              {stationSummary.totalContainersMoved > 0 ? Math.round((stationSummary.totalCustomsClearance / stationSummary.totalContainersMoved) * 100) : 0}% of overall volume
                            </div>
                         </div>

                         {/* Afghan Transit (ATT) */}
                         <div className="bg-[#0f172a] border border-amber-900/40 rounded-xl p-4 flex flex-col justify-between hover:border-amber-800/50 transition-colors">
                            <div className="flex items-center justify-between text-xs text-amber-400 mb-1">
                              <span className="font-semibold uppercase tracking-wider text-[11px]">Afghan Transit (ATT)</span>
                              <Globe size={16} className="text-amber-400" />
                            </div>
                            <div className="text-2xl sm:text-3xl font-black font-mono text-amber-400 my-1">
                              {stationSummary.totalAfghanTransit.toLocaleString()}
                            </div>
                            <div className="text-[11px] text-amber-500/80">
                              {stationSummary.totalContainersMoved > 0 ? Math.round((stationSummary.totalAfghanTransit / stationSummary.totalContainersMoved) * 100) : 0}% of overall volume
                            </div>
                         </div>

                         {/* Bonded Carrier */}
                         <div className="bg-[#0f172a] border border-purple-900/40 rounded-xl p-4 flex flex-col justify-between hover:border-purple-800/50 transition-colors">
                            <div className="flex items-center justify-between text-xs text-purple-400 mb-1">
                              <span className="font-semibold uppercase tracking-wider text-[11px]">Bonded Carrier</span>
                              <ShieldCheck size={16} className="text-purple-400" />
                            </div>
                            <div className="text-2xl sm:text-3xl font-black font-mono text-purple-400 my-1">
                              {stationSummary.totalBondedCarrier.toLocaleString()}
                            </div>
                            <div className="text-[11px] text-purple-500/80">
                              {stationSummary.totalContainersMoved > 0 ? Math.round((stationSummary.totalBondedCarrier / stationSummary.totalContainersMoved) * 100) : 0}% of overall volume
                            </div>
                         </div>

                         {/* Private Cargo */}
                         <div className="bg-[#0f172a] border border-sky-900/40 rounded-xl p-4 flex flex-col justify-between hover:border-sky-800/50 transition-colors col-span-2 sm:col-span-1">
                            <div className="flex items-center justify-between text-xs text-sky-400 mb-1">
                              <span className="font-semibold uppercase tracking-wider text-[11px]">Private Cargo</span>
                              <Anchor size={16} className="text-sky-400" />
                            </div>
                            <div className="text-2xl sm:text-3xl font-black font-mono text-sky-400 my-1">
                              {stationSummary.totalPrivateCargo.toLocaleString()}
                            </div>
                            <div className="text-[11px] text-sky-500/80">
                              {stationSummary.totalContainersMoved > 0 ? Math.round((stationSummary.totalPrivateCargo / stationSummary.totalContainersMoved) * 100) : 0}% of overall volume
                            </div>
                         </div>
                       </div>
                     )}

                     {/* 3. View Switcher Tabs & In-View Filtering */}
                     <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                        {/* Tab Switcher */}
                        <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800 w-fit">
                           <button
                             onClick={() => setActiveReportTab('details')}
                             className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                               activeReportTab === 'details'
                                 ? 'bg-brand-600 text-white shadow-md'
                                 : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                             }`}
                           >
                              <Building2 size={15} />
                              Station Detailed Breakdown
                              <span className="ml-1 bg-slate-950/60 text-slate-300 text-[10px] px-1.5 py-0.5 rounded-full">
                                {stationMovements.length}
                              </span>
                           </button>

                           <button
                             onClick={() => setActiveReportTab('graph')}
                             className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                               activeReportTab === 'graph'
                                 ? 'bg-brand-600 text-white shadow-md'
                                 : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                             }`}
                           >
                              <BarChart2 size={15} />
                              Visual Timeline Chart
                           </button>
                        </div>

                        {/* Search & Sub-Filter (shown when on Details tab) */}
                        {activeReportTab === 'details' && (
                          <div className="flex flex-wrap items-center gap-2">
                             <div className="relative min-w-[220px]">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input 
                                  type="text"
                                  placeholder="Search station or city (e.g. Torkham, KPT)..."
                                  value={stationSearchQuery}
                                  onChange={e => setStationSearchQuery(e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                                />
                             </div>

                             <select
                               value={stationTypeFilter}
                               onChange={e => setStationTypeFilter(e.target.value as any)}
                               className="bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                             >
                               <option value="ALL">All Hub Types</option>
                               <option value="Sea Port">Sea Ports</option>
                               <option value="Border Terminal">Border Terminals</option>
                               <option value="Dry Port">Dry Ports</option>
                             </select>
                          </div>
                        )}
                     </div>

                     {/* 4. Tab 1: Station Detailed Breakdown (Direct response to user request) */}
                     {activeReportTab === 'details' && (
                       <div className="space-y-4">
                          
                          {/* Quick Category Filter Pills */}
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                             <span className="text-slate-400 font-medium mr-1">Filter by Operations:</span>
                             <button
                               onClick={() => setStationCategoryFilter('ALL')}
                               className={`px-3 py-1 rounded-full border transition-all ${
                                 stationCategoryFilter === 'ALL'
                                   ? 'bg-slate-100 text-slate-900 font-bold border-white'
                                   : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white'
                               }`}
                             >
                               All Operations
                             </button>
                             <button
                               onClick={() => setStationCategoryFilter('CLEARANCE')}
                               className={`px-3 py-1 rounded-full border transition-all ${
                                 stationCategoryFilter === 'CLEARANCE'
                                   ? 'bg-emerald-500 text-white font-bold border-emerald-400'
                                   : 'bg-slate-900/60 text-emerald-400/90 border-emerald-900/40 hover:bg-emerald-950/30'
                               }`}
                             >
                               Customs Clearance
                             </button>
                             <button
                               onClick={() => setStationCategoryFilter('AFGHAN_TRANSIT')}
                               className={`px-3 py-1 rounded-full border transition-all ${
                                 stationCategoryFilter === 'AFGHAN_TRANSIT'
                                   ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                                   : 'bg-slate-900/60 text-amber-400/90 border-amber-900/40 hover:bg-amber-950/30'
                               }`}
                             >
                               Afghan Transit (ATT)
                             </button>
                             <button
                               onClick={() => setStationCategoryFilter('BONDED')}
                               className={`px-3 py-1 rounded-full border transition-all ${
                                 stationCategoryFilter === 'BONDED'
                                   ? 'bg-purple-500 text-white font-bold border-purple-400'
                                   : 'bg-slate-900/60 text-purple-400/90 border-purple-900/40 hover:bg-purple-950/30'
                               }`}
                             >
                               Bonded Carrier
                             </button>
                             <button
                               onClick={() => setStationCategoryFilter('PRIVATE')}
                               className={`px-3 py-1 rounded-full border transition-all ${
                                 stationCategoryFilter === 'PRIVATE'
                                   ? 'bg-sky-500 text-white font-bold border-sky-400'
                                   : 'bg-slate-900/60 text-sky-400/90 border-sky-900/40 hover:bg-sky-950/30'
                               }`}
                             >
                               Private Cargo
                             </button>
                          </div>

                          {/* Station Cards Grid */}
                          <div className="space-y-4">
                             {stationMovements
                               .filter(station => {
                                 if (stationSearchQuery.trim()) {
                                   const q = stationSearchQuery.toLowerCase();
                                   const match = `${station.stationName} ${station.city} ${station.code} ${station.stationType}`.toLowerCase();
                                   if (!match.includes(q)) return false;
                                 }
                                 if (stationTypeFilter !== 'ALL' && station.stationType !== stationTypeFilter) {
                                   return false;
                                 }
                                 if (stationCategoryFilter === 'CLEARANCE' && station.customsClearance === 0) return false;
                                 if (stationCategoryFilter === 'AFGHAN_TRANSIT' && station.afghanTransit === 0) return false;
                                 if (stationCategoryFilter === 'BONDED' && station.bondedCarrier === 0) return false;
                                 if (stationCategoryFilter === 'PRIVATE' && station.privateCargo === 0) return false;
                                 return true;
                               })
                               .map((station) => {
                                 const isExpanded = expandedStationId === station.id;
                                 const clearancePercent = Math.round((station.customsClearance / station.totalMoved) * 100);
                                 const transitPercent = Math.round((station.afghanTransit / station.totalMoved) * 100);
                                 const bondedPercent = Math.round((station.bondedCarrier / station.totalMoved) * 100);
                                 const privatePercent = Math.max(0, 100 - (clearancePercent + transitPercent + bondedPercent));

                                 return (
                                   <div 
                                     key={station.id} 
                                     className="bg-[#0f172a] border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 sm:p-6 transition-all shadow-md"
                                   >
                                      {/* Station Title & Badge Header */}
                                      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
                                         <div className="flex items-center gap-3">
                                            <div className={`p-2.5 rounded-xl border ${
                                              station.stationType === 'Sea Port'
                                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                : station.stationType === 'Border Terminal'
                                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                            }`}>
                                              {station.stationType === 'Sea Port' ? <Anchor size={20} /> : station.stationType === 'Border Terminal' ? <Globe size={20} /> : <Building2 size={20} />}
                                            </div>
                                            <div>
                                               <div className="flex flex-wrap items-center gap-2">
                                                 <h4 className="text-base sm:text-lg font-bold text-white tracking-wide">
                                                   {station.stationName}
                                                 </h4>
                                                 <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                                   {station.code}
                                                 </span>
                                                 <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                                                   station.stationType === 'Sea Port'
                                                     ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                                     : station.stationType === 'Border Terminal'
                                                     ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                                     : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                                 }`}>
                                                   {station.stationType}
                                                 </span>
                                               </div>
                                               <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                                                  <span className="flex items-center gap-1">
                                                    <MapPin size={12} className="text-slate-500" />
                                                    {station.city}
                                                  </span>
                                                  <span className="text-slate-600">•</span>
                                                  <span>Active Cargo Operations</span>
                                               </div>
                                            </div>
                                         </div>

                                         <div className="flex items-center gap-2 bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-300">
                                            <Boxes size={14} className="text-brand-400" />
                                            <span>20ft: <strong className="text-white font-mono">{station.twentyFtCount}</strong></span>
                                            <span className="text-slate-600">|</span>
                                            <span>40ft: <strong className="text-white font-mono">{station.fortyFtCount}</strong></span>
                                         </div>
                                      </div>

                                      {/* Prominent Operational Metrics Breakdown Cards (Exact user request) */}
                                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 my-4">
                                         
                                         {/* 1. Containers Moved */}
                                         <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-3.5 flex flex-col justify-between">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                              Containers Moved
                                            </span>
                                            <div className="text-2xl sm:text-3xl font-black font-mono text-white my-1">
                                              {station.totalMoved}
                                            </div>
                                            <span className="text-[10px] text-slate-400">
                                              Total units at this hub
                                            </span>
                                         </div>

                                         {/* 2. Customs Clearance */}
                                         <div className="bg-emerald-950/30 border border-emerald-800/50 rounded-xl p-3.5 flex flex-col justify-between">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                                              Customs Clearance
                                            </span>
                                            <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 my-1">
                                              {station.customsClearance}
                                            </div>
                                            <span className="text-[10px] text-emerald-400/80 font-medium">
                                              {clearancePercent}% of station volume
                                            </span>
                                         </div>

                                         {/* 3. Afghan Transit (ATT) */}
                                         <div className="bg-amber-950/30 border border-amber-800/50 rounded-xl p-3.5 flex flex-col justify-between">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                                              Afghan Transit (ATT)
                                            </span>
                                            <div className="text-2xl sm:text-3xl font-black font-mono text-amber-400 my-1">
                                              {station.afghanTransit}
                                            </div>
                                            <span className="text-[10px] text-amber-400/80 font-medium">
                                              {transitPercent}% of station volume
                                            </span>
                                         </div>

                                         {/* 4. Bonded Carrier */}
                                         <div className="bg-purple-950/30 border border-purple-800/50 rounded-xl p-3.5 flex flex-col justify-between">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">
                                              Bonded Carrier
                                            </span>
                                            <div className="text-2xl sm:text-3xl font-black font-mono text-purple-400 my-1">
                                              {station.bondedCarrier}
                                            </div>
                                            <span className="text-[10px] text-purple-400/80 font-medium">
                                              {bondedPercent}% of station volume
                                            </span>
                                         </div>

                                         {/* 5. Private Cargo */}
                                         <div className="bg-sky-950/30 border border-sky-800/50 rounded-xl p-3.5 flex flex-col justify-between col-span-2 sm:col-span-1">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400">
                                              Private Cargo
                                            </span>
                                            <div className="text-2xl sm:text-3xl font-black font-mono text-sky-400 my-1">
                                              {station.privateCargo}
                                            </div>
                                            <span className="text-[10px] text-sky-400/80 font-medium">
                                              {privatePercent}% of station volume
                                            </span>
                                         </div>

                                      </div>

                                      {/* Segmented Distribution Bar */}
                                      <div className="space-y-1.5 my-3">
                                         <div className="flex justify-between items-center text-[11px] text-slate-400">
                                            <span className="font-semibold text-slate-300">Operational Breakdown</span>
                                            <span>100% Verified Dispatches</span>
                                         </div>
                                         <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden flex">
                                            <div 
                                              style={{ width: `${clearancePercent}%` }} 
                                              className="bg-emerald-500 h-full transition-all" 
                                              title={`Customs Clearance: ${station.customsClearance} (${clearancePercent}%)`}
                                            />
                                            <div 
                                              style={{ width: `${transitPercent}%` }} 
                                              className="bg-amber-500 h-full transition-all" 
                                              title={`Afghan Transit: ${station.afghanTransit} (${transitPercent}%)`}
                                            />
                                            <div 
                                              style={{ width: `${bondedPercent}%` }} 
                                              className="bg-purple-500 h-full transition-all" 
                                              title={`Bonded Carrier: ${station.bondedCarrier} (${bondedPercent}%)`}
                                            />
                                            <div 
                                              style={{ width: `${privatePercent}%` }} 
                                              className="bg-sky-500 h-full transition-all" 
                                              title={`Private Cargo: ${station.privateCargo} (${privatePercent}%)`}
                                            />
                                         </div>
                                         <div className="flex flex-wrap items-center gap-4 text-[10px] text-slate-400 pt-1">
                                            <span className="flex items-center gap-1.5">
                                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                              Clearance: {station.customsClearance} ({clearancePercent}%)
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                              Afghan Transit: {station.afghanTransit} ({transitPercent}%)
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                              Bonded Carrier: {station.bondedCarrier} ({bondedPercent}%)
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                              <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                                              Private Cargo: {station.privateCargo} ({privatePercent}%)
                                            </span>
                                         </div>
                                      </div>

                                      {/* Corridors Strip */}
                                      {station.primaryCorridors && station.primaryCorridors.length > 0 && (
                                        <div className="bg-slate-900/60 rounded-lg p-2.5 border border-slate-800/80 text-xs text-slate-300 flex flex-wrap items-center gap-2 mt-3">
                                           <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Key Corridors:</span>
                                           {station.primaryCorridors.map((c, i) => (
                                             <span key={i} className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[11px] font-mono">
                                               {c}
                                             </span>
                                           ))}
                                        </div>
                                      )}

                                      {/* Expandable Case Dispatches Drawer */}
                                      <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col">
                                         <button
                                           onClick={() => setExpandedStationId(isExpanded ? null : station.id)}
                                           className="self-start text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1.5 py-1"
                                         >
                                            {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                            {isExpanded ? 'Hide Station Dispatches' : `View Itemized Dispatches at this Station (${station.recentCases.length} Cases)`}
                                         </button>

                                         {isExpanded && (
                                           <div className="mt-3 overflow-x-auto rounded-xl border border-slate-800 bg-[#070d18] animate-fade-in">
                                              <table className="w-full text-left text-xs">
                                                 <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider">
                                                    <tr>
                                                       <th className="px-4 py-2.5">Case No</th>
                                                       <th className="px-4 py-2.5">B/L Number</th>
                                                       <th className="px-4 py-2.5">Operation Type</th>
                                                       <th className="px-4 py-2.5">Container No & Size</th>
                                                       <th className="px-4 py-2.5">Destination / Route</th>
                                                       <th className="px-4 py-2.5">Completed Date</th>
                                                       <th className="px-4 py-2.5 text-right">Status</th>
                                                    </tr>
                                                 </thead>
                                                 <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                                                    {station.recentCases.map((c, idx) => (
                                                      <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                                                         <td className="px-4 py-2.5 font-bold text-white">{c.caseNo}</td>
                                                         <td className="px-4 py-2.5 text-brand-400">{c.blNumber}</td>
                                                         <td className="px-4 py-2.5">
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold ${
                                                              c.category === 'Afghan Transit'
                                                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                                                : c.category === 'Customs Clearance'
                                                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                                                : c.category === 'Bonded Carrier'
                                                                ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                                                                : 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                                                            }`}>
                                                              {c.category}
                                                            </span>
                                                         </td>
                                                         <td className="px-4 py-2.5 text-slate-300">
                                                            {c.containerNo} <span className="text-slate-500 font-sans">({c.size})</span>
                                                         </td>
                                                         <td className="px-4 py-2.5 font-sans text-slate-300">{c.destination}</td>
                                                         <td className="px-4 py-2.5 text-slate-400">{c.completionDate}</td>
                                                         <td className="px-4 py-2.5 text-right">
                                                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-sans font-bold">
                                                              DELIVERED
                                                            </span>
                                                         </td>
                                                      </tr>
                                                    ))}
                                                 </tbody>
                                              </table>
                                           </div>
                                         )}
                                      </div>

                                   </div>
                                 );
                               })}
                          </div>

                       </div>
                     )}

                     {/* 5. Tab 2: Visual Timeline Chart (Maintains full backward compatibility) */}
                     {activeReportTab === 'graph' && (
                       <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
                          
                          <div className="flex items-center justify-between">
                             <div>
                                <h4 className="text-sm font-bold text-white tracking-wide">
                                  DAILY CONTAINER DELIVERY TIMELINE
                                </h4>
                                <p className="text-xs text-slate-400">
                                  Volume trend for all completed dispatches over the filtered period
                                </p>
                             </div>
                             {selectedData && (
                               <div className="bg-brand-900/50 border border-brand-500/20 px-3 py-1.5 rounded-lg flex items-center gap-3 text-xs font-mono">
                                  <span className="text-slate-400">{selectedData.fullDate}</span>
                                  <span className="text-white font-bold">{selectedData.containers} Containers</span>
                               </div>
                             )}
                          </div>

                          <div 
                            ref={scrollContainerRef}
                            className={`h-[380px] w-full p-2 select-none overflow-x-auto overflow-y-hidden ${isDragging ? 'cursor-grabbing' : 'cursor-default'}`}
                            onMouseDown={handleMouseDown}
                            onMouseLeave={handleMouseLeave}
                            onMouseUp={handleMouseUp}
                            onMouseMove={handleMouseMove}
                          >
                            <div className="min-w-[1000px] w-full h-full relative" style={{ minWidth: `${Math.max(100, generatedGraphData.length * 2)}%` }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart 
                                  data={generatedGraphData} 
                                  barCategoryGap="20%"
                                  margin={{ top: 30, right: 40, left: -20, bottom: 20 }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" strokeOpacity={0.3} />
                                  
                                  <XAxis 
                                      dataKey="dayLabel" 
                                      stroke="#64748b" 
                                      tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 500, fontFamily: 'Inter, sans-serif'}} 
                                      tickLine={false} 
                                      axisLine={{ stroke: '#334155', strokeWidth: 1 }} 
                                      minTickGap={10}
                                      dy={12}
                                  />
                                  
                                  <YAxis 
                                      stroke="#64748b" 
                                      tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 500, fontFamily: 'Inter, sans-serif'}} 
                                      tickLine={false} 
                                      axisLine={false} 
                                      orientation="right"
                                      dx={10}
                                  />
                                  
                                  <Tooltip 
                                    cursor={{ fill: '#334155', opacity: 0.15 }}
                                    allowEscapeViewBox={{ x: true, y: true }}
                                    content={({ active, payload }) => {
                                      if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        const isTargetCritical = data.containers > 100;
                                        return (
                                          <div className="bg-[#18181b] border border-[#27272a] px-4 py-3 rounded-lg shadow-xl shrink-0">
                                            <p className="text-xs text-zinc-400 mb-2 font-medium">{data.fullDate}</p>
                                            <div className="flex items-end gap-2">
                                               <span className="text-xs text-zinc-500 font-medium">Delivered:</span>
                                               <span className={`text-[17px] leading-none font-semibold ${isTargetCritical ? 'text-rose-500' : 'text-zinc-100'}`}>
                                                 {data.containers}
                                               </span>
                                            </div>
                                          </div>
                                        );
                                      }
                                      return null;
                                    }}
                                  />
                  
                                  <Bar 
                                      dataKey="containers" 
                                      maxBarSize={28}
                                      radius={[4, 4, 0, 0]}
                                      animationDuration={1000}
                                  >
                                    {generatedGraphData.map((entry, index) => (
                                      <Cell 
                                          key={`cell-${index}`} 
                                          fill={entry.isToday ? '#eab308' : (entry.containers > 100 ? '#ef4444' : '#3b82f6')}
                                          className="transition-all hover:brightness-110" 
                                      />
                                    ))}
                                  </Bar>
                                  
                                  <ReferenceLine 
                                      y={100} 
                                      stroke="#ef4444" 
                                      strokeDasharray="4 4" 
                                      strokeOpacity={0.6}
                                      strokeWidth={1.5}
                                  />
                                  {generatedGraphData.length > 0 && (
                                    <ReferenceLine 
                                        x={generatedGraphData[generatedGraphData.length - 1].dayLabel} 
                                        stroke="#eab308" 
                                        strokeOpacity={0.4}
                                        strokeWidth={1}
                                    />
                                  )}
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                       </div>
                     )}

                   </div>
               )}
             </div>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* 2. Company Documents Status */}
        <div className="glass-card rounded-2xl p-5 hover:bg-white/5 transition-colors">
          <SectionHeader title="Company Documents" icon={FileText} />
          <div className="space-y-1">
            <StatusRow label="Expiring Soon (30 Days)" count="2" color="text-yellow-400" onClick={() => onNavigate('settings', { section: 'general' })} />
            <StatusRow label="Already Expired" count="1" color="text-red-400" onClick={() => onNavigate('settings', { section: 'general' })}/>
            <StatusRow label="Valid Documents" count="14" color="text-green-400" onClick={() => onNavigate('settings', { section: 'general' })}/>
            <StatusRow label="Pending Renewal" count="0" onClick={() => onNavigate('settings', { section: 'general' })}/>
          </div>
        </div>

        {/* 3. Case Overview */}
        <div className="glass-card rounded-2xl p-5 hover:bg-white/5 transition-colors">
          <SectionHeader title="Case Overview" icon={CheckCircle} />
          <div className="space-y-1">
            <StatusRow label="Case Approval Pending" count="5" color="text-brand-accent" onClick={() => onNavigate('cases', { status: CaseStatus.SHIPPING_LINE_DO })} />
            <StatusRow label="Loading Port Processing" count="12" color="text-yellow-400" onClick={() => onNavigate('cases', { status: CaseStatus.LOADING_PORT_PROCESSING })} />
            <StatusRow label="In Transit" count="8" color="text-blue-400" onClick={() => onNavigate('cases', { status: CaseStatus.IN_TRANSIT })} />
            <StatusRow label="Completed" count="3" color="text-green-400" onClick={() => onNavigate('cases', { status: CaseStatus.COMPLETED })} />
          </div>
        </div>

        {/* 4. Vehicles Status Overview */}
        <div className="glass-card rounded-2xl p-5 hover:bg-white/5 transition-colors">
          <SectionHeader title="Vehicles Status" icon={Truck} />
          <div className="space-y-1">
            <StatusRow label="Expiring Soon (5 days)" count="3" color="text-yellow-400" onClick={() => onNavigate('vehicles', { filter: 'expiring' })} />
            <StatusRow label="Expired" count="1" color="text-red-400" onClick={() => onNavigate('vehicles', { filter: 'expired' })} />
            <StatusRow label="Available" count="4" color="text-blue-400" onClick={() => onNavigate('vehicles', { status: 'AVAILABLE' })} />
            <StatusRow label="On Trip" count="2" color="text-orange-400" onClick={() => onNavigate('vehicles', { status: 'ON_TRIP' })} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 5. Finance Overview */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex justify-between items-center mb-4">
             <SectionHeader title="Finance Overview" icon={DollarSign} />
             <button onClick={() => onNavigate('finance', {})} className="text-xs text-brand-400 hover:text-white flex items-center gap-1">View Details <ArrowRight size={12}/></button>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div 
                onClick={() => onNavigate('finance', { tab: 'cashbook' })}
                className="glass-panel p-4 rounded-xl border-none bg-gradient-to-br from-white/5 to-white/0 hover:bg-white/10 transition-colors cursor-pointer group"
            >
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold group-hover:text-gray-200">Cash in Hand</p>
              <h4 className="text-2xl font-bold text-green-400 mt-2 font-mono drop-shadow">PKR 45,200</h4>
            </div>
            <div 
                onClick={() => onNavigate('finance', { tab: 'receivables' })}
                className="glass-panel p-4 rounded-xl border-none bg-gradient-to-br from-white/5 to-white/0 hover:bg-white/10 transition-colors cursor-pointer group"
            >
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold group-hover:text-gray-200">Total Receivables</p>
              <h4 className="text-2xl font-bold text-blue-400 mt-2 font-mono drop-shadow">PKR 128,500</h4>
            </div>
            <div 
                onClick={() => onNavigate('finance', { tab: 'payables' })}
                className="glass-panel p-4 rounded-xl border-none bg-gradient-to-br from-white/5 to-white/0 hover:bg-white/10 transition-colors cursor-pointer group"
            >
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold group-hover:text-gray-200">Expenses Today</p>
              <h4 className="text-2xl font-bold text-red-400 mt-2 font-mono drop-shadow">PKR 1,240</h4>
            </div>
            <div 
                onClick={() => onNavigate('finance', { tab: 'payables' })}
                className="glass-panel p-4 rounded-xl border-none bg-gradient-to-br from-white/5 to-white/0 hover:bg-white/10 transition-colors cursor-pointer group"
            >
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold group-hover:text-gray-200">Total Payables</p>
              <h4 className="text-2xl font-bold text-orange-400 mt-2 font-mono drop-shadow">PKR 32,100</h4>
            </div>
          </div>

          <div className="bg-black/20 rounded-xl p-4 border border-white/5">
             <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Cash Breakdown</h4>
             <div className="space-y-3">
               <div className="flex justify-between text-sm items-center">
                 <span className="text-gray-300 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-gray-500"></div> Office Cash</span>
                 <span className="text-white font-mono">PKR 12,000</span>
               </div>
               <div className="flex justify-between text-sm items-center">
                 <span className="text-gray-300 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-brand-500"></div> HBL Corporate</span>
                 <span className="text-white font-mono">PKR 25,000</span>
               </div>
               <div className="flex justify-between text-sm items-center">
                 <span className="text-gray-300 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div> Meezan Active</span>
                 <span className="text-white font-mono">PKR 8,200</span>
               </div>
             </div>
          </div>
        </div>

        {/* 6. Activity Log */}
        <div className="glass-card rounded-2xl p-6 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <SectionHeader title="Activity Log" icon={Clock} />
            <button 
                onClick={handleViewAllLogs}
                className="text-xs text-brand-400 hover:text-brand-300 transition-colors bg-brand-500/10 px-2 py-1 rounded flex items-center gap-1"
            >
                {showAllLogs ? 'Show Less' : 'View All'} {showAllLogs ? '' : <ArrowRight size={12}/>}
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar px-4 space-y-4 max-h-[400px]">
            {logs.map((log) => (
              <div key={log.id} className="flex gap-4 items-start border-l-2 border-white/10 pl-4 relative group animate-in fade-in slide-in-from-left-2">
                <div className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-brand-950
                  ${log.type === 'SUCCESS' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 
                    log.type === 'ERROR' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 
                    log.type === 'WARNING' ? 'bg-yellow-500' : 'bg-blue-500'}`} 
                />
                <div className="flex-1 -mt-1 group-hover:bg-white/5 p-2 rounded-lg transition-colors">
                  <p className="text-sm text-gray-200 font-medium leading-snug">{log.action}</p>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-brand-400">{log.user}</p>
                    <p className="text-[10px] text-gray-500">{log.timestamp}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;