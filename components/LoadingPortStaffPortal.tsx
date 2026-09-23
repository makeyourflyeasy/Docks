import React, { useState, useEffect } from 'react';
import { 
  Ship, CheckCircle2, ChevronDown, ChevronUp, Clock, MapPin, Plus, Save, 
  Trash2, Search, AlertCircle, RefreshCw, Layers, DollarSign, Key, UploadCloud, 
  Download, BookOpen, User, Phone, Check, LogOut, FileText, Camera
} from 'lucide-react';
import { Case, Container, CaseStatus, CaseCharge, UserRole } from '../types';
import { subscribeToCases, saveCaseToFirestore } from '../services/dbService';
import { compressAndPrepareFile } from '../services/fileUtils';
import { useBranding } from '../services/brandingService';

interface LoadingPortStaffPortalProps {
  onSignOut: () => void;
  userRoles?: UserRole[];
}

// Default standard port charge list options
const INITIAL_CHARGE_OPTIONS = [
  'Loading / Labor Handling Charges',
  'Customs Bullet Seal & E-Seal Tracking Fee',
  'Wharfage Terminal & Port Dues',
  'Weighbridge & Weighing Scale Charges',
  'Gate Pass & Port Terminal Entry Fee',
  'Detention / Demurrage Initial Fee'
];

export const LoadingPortStaffPortal: React.FC<LoadingPortStaffPortalProps> = ({ onSignOut, userRoles = [] }) => {
  const { customLogo } = useBranding();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Port Selection: 'KICT', 'QICT' (Port Qasim), 'SAPT', 'KPT'
  const [activePort, setActivePort] = useState<'KICT' | 'QICT' | 'SAPT' | 'KPT'>('KICT');
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Dynamic custom charge types saved in local storage for this user session / ID
  const [availableChargeTypes, setAvailableChargeTypes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('dpl_dynamic_charge_types');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (_) {}
    return INITIAL_CHARGE_OPTIONS;
  });

  // Local state for editing charges inside the expanded container panel
  const [newChargeLabel, setNewChargeLabel] = useState('');
  const [newChargeAmount, setNewChargeAmount] = useState('');
  const [newChargeArrangedBy, setNewChargeArrangedBy] = useState<'DPL' | 'Client'>('DPL');
  const [customChargeInputActive, setCustomChargeInputActive] = useState(false);
  const [customChargeName, setCustomChargeName] = useState('');

  // Local state for uploading seal details in expanded container
  const [sealNoInput, setSealNoInput] = useState('');
  const [uploadedSealPhoto, setUploadedSealPhoto] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Success message feedback
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Subscribe to live cases
  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToCases((items) => {
      setCases(items || []);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Filter cases for the current loading staff portal
  // Rule 1: Case status must be at the loading step: CaseStatus.LOADING_PORT_PROCESSING
  // Rule 2: Case port must match activePort code
  const filteredCases = cases.filter(c => {
    // Check if status is Step 6 (Loading Port Processing)
    const isAtLoadingStep = c.status === CaseStatus.LOADING_PORT_PROCESSING;
    if (!isAtLoadingStep) return false;

    // Port match: checking pol (Port of Loading)
    const polUpper = (c.pol || '').toUpperCase();
    const portCode = activePort.toUpperCase();

    // QICT is the terminal code for Port Qasim
    const matchesPort = 
      polUpper.includes(portCode) || 
      (portCode === 'QICT' && polUpper.includes('QASIM')) ||
      (portCode === 'KICT' && polUpper.includes('KICT')) ||
      (portCode === 'SAPT' && polUpper.includes('SAPT')) ||
      (portCode === 'KPT' && (polUpper.includes('KPT') || polUpper.includes('KARACHI PORT')));

    if (!matchesPort) return false;

    // Search term filtering (case number, container number, driver, client name)
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchCaseNo = c.caseNo?.toLowerCase().includes(search);
      const matchClient = c.clientName?.toLowerCase().includes(search);
      const matchContainer = (c.containers || []).some(cn => cn.number?.toLowerCase().includes(search));
      const matchVehicle = (c.containers || []).some(cn => cn.vehicleNo?.toLowerCase().includes(search));
      return matchCaseNo || matchClient || matchContainer || matchVehicle;
    }

    return true;
  });

  const handleSelectPort = (port: 'KICT' | 'QICT' | 'SAPT' | 'KPT') => {
    setActivePort(port);
    setExpandedCaseId(null);
    clearEditStates();
  };

  const clearEditStates = () => {
    setNewChargeLabel('');
    setNewChargeAmount('');
    setNewChargeArrangedBy('DPL');
    setCustomChargeInputActive(false);
    setCustomChargeName('');
    setSealNoInput('');
    setUploadedSealPhoto('');
  };

  // Expand case row & populate its current data for editing
  const handleToggleExpand = (c: Case) => {
    if (expandedCaseId === c.id) {
      setExpandedCaseId(null);
      clearEditStates();
    } else {
      setExpandedCaseId(c.id);
      // Pre-fill fields if container exists
      const container = c.containers?.[0];
      setSealNoInput(container?.sealNo || '');
      setUploadedSealPhoto(container?.sealPhoto || '');
      setNewChargeLabel('');
      setNewChargeAmount('');
      setNewChargeArrangedBy('DPL');
      setCustomChargeInputActive(false);
      setCustomChargeName('');
    }
  };

  // Dynamic Add New Charge
  const handleAddCharge = async (caseItem: Case) => {
    const finalLabel = customChargeInputActive ? customChargeName.trim() : newChargeLabel;
    const amount = parseFloat(newChargeAmount);

    if (!finalLabel) {
      alert('Please select or specify a charge description.');
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid charge amount.');
      return;
    }

    // Save custom charge option to local storage if it's new
    if (customChargeInputActive && !availableChargeTypes.includes(finalLabel)) {
      const updatedList = [...availableChargeTypes, finalLabel];
      setAvailableChargeTypes(updatedList);
      localStorage.setItem('dpl_dynamic_charge_types', JSON.stringify(updatedList));
    }

    const newCharge: CaseCharge = {
      id: String(Date.now()),
      description: finalLabel,
      amount: amount,
      arrangedBy: newChargeArrangedBy
    };

    const currentCharges = caseItem.charges || [];
    const updatedCase = {
      ...caseItem,
      charges: [...currentCharges, newCharge]
    };

    try {
      await saveCaseToFirestore(updatedCase);
      showFeedback(`✓ Charge "${finalLabel}" of PKR ${amount.toLocaleString()} added successfully to Case ${caseItem.caseNo}`);
      
      // Reset charge inputs
      setNewChargeAmount('');
      setNewChargeLabel('');
      setCustomChargeName('');
      setCustomChargeInputActive(false);
    } catch (err) {
      console.error(err);
      alert('Failed to save charge to database.');
    }
  };

  const handleDeleteCharge = async (caseItem: Case, chargeId: string) => {
    if (!confirm('Are you sure you want to delete this charge?')) return;

    const updatedCharges = (caseItem.charges || []).filter(ch => String(ch.id) !== String(chargeId));
    const updatedCase = {
      ...caseItem,
      charges: updatedCharges
    };

    try {
      await saveCaseToFirestore(updatedCase);
      showFeedback('✓ Charge removed successfully.');
    } catch (err) {
      console.error(err);
      alert('Failed to delete charge.');
    }
  };

  // Process and convert uploaded photo to PDF / Base64 Data URL
  const handleSealPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploadingPhoto(true);
      try {
        const processed = await compressAndPrepareFile(file);
        if (processed.dataUrl) {
          setUploadedSealPhoto(processed.dataUrl);
        }
      } catch (err) {
        console.warn(err);
        alert('Failed to process image capture.');
      } finally {
        setIsUploadingPhoto(false);
      }
    }
  };

  // Complete Loading and release container into Transit/On the Way
  const handleCompleteLoading = async (caseItem: Case) => {
    if (!confirm(`Are you sure you want to complete loading for Case ${caseItem.caseNo}? This will post all charges to the client ledger and dispatch the shipment.`)) return;

    // Update container details (Seal number & Seal photo)
    const updatedContainers = (caseItem.containers || []).map((cntr, idx) => {
      if (idx === 0) {
        return {
          ...cntr,
          sealNo: sealNoInput.trim() || cntr.sealNo,
          sealPhoto: uploadedSealPhoto || cntr.sealPhoto
        };
      }
      return cntr;
    });

    const updatedCase: Case = {
      ...caseItem,
      status: CaseStatus.IN_TRANSIT, // Transition from Step 6 to Step 7
      containers: updatedContainers,
      workflowDetails: {
        ...(caseItem.workflowDetails || {}),
        [CaseStatus.LOADING_PORT_PROCESSING]: {
          status: 'COMPLETED',
          completed: true,
          date: new Date().toISOString(),
          officer: 'Loading Port Staff',
          remarks: `Loading completed at ${activePort}. Bullet seal verify: ${sealNoInput || 'N/A'}`
        }
      }
    };

    try {
      await saveCaseToFirestore(updatedCase);
      setExpandedCaseId(null);
      clearEditStates();
      showFeedback(`🎉 Loading complete for Case ${caseItem.caseNo}! Container dispatched to destination. Invoice charges are now officially posted to the Client Ledger.`);
    } catch (err) {
      console.error(err);
      alert('Failed to complete loading step in database.');
    }
  };

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 6000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* High-Fidelity Header */}
      <header className="bg-slate-900/90 border-b border-white/10 px-6 py-4 sticky top-0 z-20 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          {customLogo ? (
            <img src={customLogo} alt="DPL Logo" className="h-9 w-auto max-w-[150px] object-contain" />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-amber-500 flex items-center justify-center font-bold text-white shadow-lg">D</div>
          )}
          <div>
            <h1 className="text-base font-bold text-white tracking-wide">DPL Loading Staff Portal</h1>
            <span className="text-[10px] text-brand-300 font-mono tracking-widest uppercase">Karachi Port Terminals Node</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Active Station: Karachi Ports</span>
          </div>
          <button 
            onClick={onSignOut}
            className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Dynamic Toast Feedback Notification */}
        {feedbackMessage && (
          <div className="bg-gradient-to-r from-slate-900 to-slate-950 border-l-4 border-amber-400 text-amber-200 p-4 rounded-xl shadow-2xl flex items-start gap-3 animate-bounce">
            <CheckCircle2 className="text-amber-400 shrink-0 mt-0.5" size={18} />
            <div className="text-xs font-medium leading-relaxed flex-1">{feedbackMessage}</div>
            <button onClick={() => setFeedbackMessage(null)} className="text-gray-400 hover:text-white font-bold text-xs">✕</button>
          </div>
        )}

        {/* Port wise Selector Header & Search */}
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-slate-900/50 p-4 rounded-3xl border border-white/15 shadow-xl">
          {/* Port Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
            {[
              { id: 'KICT', label: 'KICT Port Terminal', count: cases.filter(c => c.status === CaseStatus.LOADING_PORT_PROCESSING && (c.pol?.toUpperCase().includes('KICT'))).length },
              { id: 'QICT', label: 'Port Qasim (QICT)', count: cases.filter(c => c.status === CaseStatus.LOADING_PORT_PROCESSING && (c.pol?.toUpperCase().includes('QICT') || c.pol?.toUpperCase().includes('QASIM'))).length },
              { id: 'SAPT', label: 'SAPT Port Terminal', count: cases.filter(c => c.status === CaseStatus.LOADING_PORT_PROCESSING && (c.pol?.toUpperCase().includes('SAPT'))).length },
              { id: 'KPT', label: 'KPT Karachi Port', count: cases.filter(c => c.status === CaseStatus.LOADING_PORT_PROCESSING && (c.pol?.toUpperCase().includes('KPT') || c.pol?.toUpperCase().includes('KARACHI'))).length }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => handleSelectPort(p.id as any)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl font-bold text-xs shrink-0 tracking-wide transition-all ${
                  activePort === p.id 
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30 border border-brand-500' 
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-transparent'
                }`}
              >
                <Ship size={14} />
                <span>{p.label}</span>
                <span className={`px-2 py-0.5 text-[10px] rounded-full font-mono ${activePort === p.id ? 'bg-white/20 text-white' : 'bg-black/30 text-gray-400'}`}>
                  {p.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative flex-1 md:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search by container #, case #, driver name or client..."
              className="w-full bg-black/40 border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-400 outline-none focus:border-brand-500 transition-all font-medium"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Container Loading Grid & list */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
            <RefreshCw size={32} className="animate-spin text-brand-500" />
            <p className="text-xs font-semibold">Loading live port container data...</p>
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/20 border border-dashed border-white/10 rounded-3xl space-y-3 shadow-inner">
            <Ship size={40} className="mx-auto text-gray-500 opacity-60" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">No containers pending loading</h3>
            <p className="text-xs text-gray-400 leading-relaxed max-w-md mx-auto">
              There are no shipments currently waiting at the <span className="text-brand-300 font-semibold">{activePort}</span> node for the Loading workflow step. As soon as dispatch officers complete Step 5 (Vehicle Assignment), containers will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-wider px-2">
              <span>Pending Shipment Containers ({filteredCases.length})</span>
              <span>Karachi Port Terminal: {activePort}</span>
            </div>

            {filteredCases.map(c => {
              const mainCntr = c.containers?.[0];
              const isExpanded = expandedCaseId === c.id;

              return (
                <div 
                  key={c.id} 
                  className={`bg-slate-900/80 rounded-3xl border transition-all overflow-hidden ${
                    isExpanded 
                      ? 'border-brand-500/40 shadow-xl shadow-brand-500/5 bg-slate-900/95' 
                      : 'border-white/10 hover:border-white/20 hover:bg-slate-900'
                  }`}
                >
                  {/* Summary Bar */}
                  <div 
                    onClick={() => handleToggleExpand(c)}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-brand-500/10 text-brand-400 flex items-center justify-center shrink-0 border border-brand-500/20 shadow-md">
                        <Ship size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-white tracking-tight">{mainCntr?.number || 'Container TBD'}</span>
                          <span className="bg-white/5 border border-white/10 text-[10px] text-gray-400 font-bold px-2 py-0.5 rounded">
                            {mainCntr?.size || '40ft'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1 text-[11px] text-gray-400 font-medium">
                          <span className="text-gray-300 font-semibold">{c.clientName}</span>
                          <span className="text-slate-600">•</span>
                          <span>Case ID: <span className="font-mono font-bold text-amber-300">{c.caseNo}</span></span>
                          <span className="text-slate-600">•</span>
                          <span className="flex items-center gap-1"><MapPin size={11} className="text-brand-400" /> {c.pol} → {c.pod}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-white/10">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] text-gray-500 uppercase block font-bold tracking-widest">Assigned Vehicle</span>
                        <span className="text-xs text-white font-semibold font-mono tracking-wide">{mainCntr?.vehicleNo || 'TBD Marker Vehicle'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="bg-amber-400/10 text-amber-300 border border-amber-400/20 text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-xl flex items-center gap-1">
                          <Clock size={12} /> Loading Pending
                        </span>
                        {isExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Detailed Panel */}
                  {isExpanded && (
                    <div className="border-t border-white/10 p-5 bg-black/40 space-y-6 animate-in slide-in-from-top-3 duration-200">
                      
                      {/* Sub-grid: Vehicle & Driver details */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        
                        {/* 1. Fleet & Driver verification */}
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-3">
                          <h4 className="text-xs font-bold text-brand-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                            <User size={13} />
                            1. Fleet Partner & Crew Verification
                          </h4>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Driver Name:</span>
                              <span className="text-white font-semibold">{mainCntr?.driverName || 'N/A Crew Name'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Driver Phone:</span>
                              <span className="text-brand-400 font-mono font-bold flex items-center gap-1">
                                <Phone size={11} /> {mainCntr?.driverContact || 'No Contact Number'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Driver CNIC / ID:</span>
                              <span className="text-white font-mono">{mainCntr?.driverCnic || 'N/A CNIC'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Truck / Plate No:</span>
                              <span className="text-amber-400 font-mono font-bold">{mainCntr?.vehicleNo || 'N/A Vehicle No'}</span>
                            </div>
                          </div>
                        </div>

                        {/* 2. Loading Operations: Seal Verification & Camera Capture */}
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-3.5">
                          <h4 className="text-xs font-bold text-brand-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                            <Camera size={13} />
                            2. Customs Bullet Seal & Camera
                          </h4>
                          <div className="space-y-3 text-xs">
                            <div>
                              <label className="text-gray-300 block mb-1">Customs Bullet Seal No / Tracking ID *</label>
                              <input 
                                type="text"
                                placeholder="e.g. SL-992834"
                                className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-white outline-none focus:border-brand-500 font-mono font-bold uppercase tracking-wider text-xs"
                                value={sealNoInput}
                                onChange={e => setSealNoInput(e.target.value)}
                              />
                            </div>

                            <div className="space-y-1">
                              <span className="text-gray-300 block mb-1">Verify Seal Photo (Converts to PDF scan)</span>
                              <div className="flex items-center gap-2">
                                <label className="flex-1 flex items-center justify-center gap-1.5 p-2 border border-dashed border-white/20 hover:border-brand-500 rounded-xl cursor-pointer bg-black/40 hover:bg-black/60 transition text-center text-xs">
                                  <input 
                                    type="file" 
                                    accept="image/*" 
                                    capture="environment"
                                    className="hidden" 
                                    onChange={handleSealPhotoUpload} 
                                  />
                                  <Camera size={14} className="text-brand-400" />
                                  <span>{uploadedSealPhoto ? 'Change Captured Photo' : 'Open Camera / Capture Seal'}</span>
                                </label>
                              </div>
                              {uploadedSealPhoto && (
                                <div className="mt-2 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-between text-[11px] text-emerald-300 font-medium">
                                  <span>Bullet Seal PDF Compiled ✅</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const link = document.createElement('a');
                                      link.href = uploadedSealPhoto;
                                      link.download = `Seal_Photo_Verification_${c.caseNo}.pdf`;
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                    }}
                                    className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-bold hover:underline"
                                  >
                                    <Download size={11} /> View / Save
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 3. Dynamic invoice charges setup inside expanded panel */}
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-3.5">
                          <h4 className="text-xs font-bold text-brand-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                            <DollarSign size={13} />
                            3. Record Wharfage & Handling Charges
                          </h4>
                          
                          <div className="space-y-3 text-xs">
                            {/* Toggle standard dropdown or custom input */}
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-gray-400 font-medium">Charge Description</span>
                              <button
                                type="button"
                                onClick={() => setCustomChargeInputActive(!customChargeInputActive)}
                                className="text-brand-400 hover:text-brand-300 font-bold hover:underline"
                              >
                                {customChargeInputActive ? 'Select standard dropdown' : 'Add custom charge type'}
                              </button>
                            </div>

                            {customChargeInputActive ? (
                              <input
                                type="text"
                                placeholder="Enter custom charge name..."
                                className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-white outline-none focus:border-brand-500 text-xs font-medium"
                                value={customChargeName}
                                onChange={e => setCustomChargeName(e.target.value)}
                              />
                            ) : (
                              <select
                                className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-white outline-none focus:border-brand-500 text-xs font-medium"
                                value={newChargeLabel}
                                onChange={e => setNewChargeLabel(e.target.value)}
                              >
                                <option value="">-- Select Charge Category --</option>
                                {availableChargeTypes.map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            )}

                            {/* Charge Amount & Billing Arranged By */}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-gray-400 block mb-1 text-[11px]">Amount (PKR) *</label>
                                <input
                                  type="number"
                                  placeholder="e.g. 15000"
                                  className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-brand-500 text-xs font-bold"
                                  value={newChargeAmount}
                                  onChange={e => setNewChargeAmount(e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="text-gray-400 block mb-1 text-[11px]">Bill To / Arrange</label>
                                <select
                                  className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-white outline-none focus:border-brand-500 text-xs font-medium"
                                  value={newChargeArrangedBy}
                                  onChange={e => setNewChargeArrangedBy(e.target.value as any)}
                                >
                                  <option value="DPL">Bill Client (DPL)</option>
                                  <option value="Client">Paid by Client Directly</option>
                                </select>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleAddCharge(c)}
                              className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition text-xs shadow-lg shadow-brand-600/20"
                            >
                              <Plus size={13} />
                              <span>Add Charge to Case Bill</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Display of currently added case charges */}
                      <div className="bg-black/60 p-4 rounded-2xl border border-white/5 space-y-3">
                        <h5 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                          <FileText size={13} className="text-emerald-400" />
                          Consolidated Loading Invoice Ledger ({c.charges?.length || 0} applied)
                        </h5>
                        <p className="text-[10px] text-amber-300 font-medium">
                          ⚠️ These charges are drafted under Case {c.caseNo}. They will officially post to the Client Ledger once you click complete loading and sail the container.
                        </p>
                        
                        {(!c.charges || c.charges.length === 0) ? (
                          <div className="text-center py-6 text-gray-500 text-xs">
                            No port charges added to this container yet. Select options above to add Wharfage, Handling, or Seal charges.
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="text-gray-500 border-b border-white/5">
                                  <th className="pb-1.5 font-bold">Charge Description</th>
                                  <th className="pb-1.5 font-bold">Arrangement</th>
                                  <th className="pb-1.5 font-bold text-right">Amount (PKR)</th>
                                  <th className="pb-1.5 text-right font-bold">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5">
                                {c.charges.map(ch => (
                                  <tr key={ch.id} className="hover:bg-white/5">
                                    <td className="py-2 text-white font-medium">{ch.description}</td>
                                    <td className="py-2 text-gray-400">
                                      {ch.arrangedBy === 'DPL' ? (
                                        <span className="text-brand-300 font-semibold bg-brand-500/10 px-1.5 py-0.5 rounded border border-brand-500/10">Billed to Client</span>
                                      ) : (
                                        <span className="text-gray-400 font-medium bg-white/5 px-1.5 py-0.5 rounded">Paid by Client Direct</span>
                                      )}
                                    </td>
                                    <td className="py-2 text-right font-mono font-bold text-gray-200">
                                      PKR {Number(ch.amount || 0).toLocaleString()}
                                    </td>
                                    <td className="py-2 text-right">
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteCharge(c, ch.id ? String(ch.id) : '')}
                                        className="text-red-400 hover:text-red-300 p-1 hover:bg-red-500/10 rounded"
                                        title="Delete charge"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* Main Dispatched Actions / Sail Container */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-white/5">
                        <div className="text-left text-xs">
                          <span className="text-gray-400 leading-relaxed block">
                            Verify all crew detail and bullet seal information. Completion is authoritative and irreversible.
                          </span>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          <button
                            type="button"
                            onClick={() => handleToggleExpand(c)}
                            className="w-full sm:w-auto px-4 py-2 text-xs text-gray-400 hover:text-white transition-colors"
                          >
                            Close Panel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCompleteLoading(c)}
                            className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black py-2.5 px-6 rounded-2xl flex items-center justify-center gap-2 transition shadow-xl shadow-emerald-600/20 text-xs uppercase tracking-wide"
                          >
                            <CheckCircle2 size={15} />
                            <span>Mark Loading Complete & Sail</span>
                          </button>
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};
