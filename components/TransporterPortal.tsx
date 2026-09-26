import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Truck, DollarSign, Plus, RefreshCw, X, CheckCircle2, Clock, AlertCircle, 
  MapPin, Phone, User, FileText, Upload, ChevronRight, LogOut, ShieldCheck, 
  ArrowRight, Search, Filter, Calendar, Building, Eye, Camera, Check
} from 'lucide-react';
import Logo from './Logo';
import { useBranding } from '../services/brandingService';
import { Vehicle, Case, FinanceEntry, AvailableVehicle, TransporterRequest, Container } from '../types';
import { 
  subscribeToVehicles, 
  subscribeToCases, 
  subscribeToFinances, 
  saveFinanceToFirestore, 
  saveVehicleToFirestore,
  updateVehicleInFirestore,
  subscribeToAvailableVehicles,
  saveAvailableVehicleToFirestore,
  deleteAvailableVehicleFromFirestore,
  saveTransporterRequestToFirestore,
  subscribeToTransporterRequests,
  saveCaseToFirestore
} from '../services/dbService';
import { safeAppStorage } from '../services/storage';
import { compressAndPrepareFile } from '../services/fileUtils';
import { AvailableVehiclesView } from './AvailableVehiclesView';

interface TransporterPortalProps {
  onSignOut?: () => void;
  onSwitchMode?: (mode: any) => void;
  transporterId?: string | number;
  transporterName?: string;
}

export const TransporterPortal: React.FC<TransporterPortalProps> = ({
  onSignOut,
  onSwitchMode,
  transporterId: initialId,
  transporterName: initialName
}) => {
  const { companyName, subtitle, activeLogo } = useBranding();

  // Navigation
  const [activeTab, setActiveTab] = useState<'vehicles' | 'ready_vehicles' | 'finance' | 'assigned_cases'>('vehicles');

  // Transporter Identity State
  const [selectedTransporterName, setSelectedTransporterName] = useState<string>(() => {
    return initialName || safeAppStorage.getItem('dpl_transporter_name') || 'Bilal Goods Transport Co.';
  });

  const [vehiclesList, setVehiclesList] = useState<Vehicle[]>([]);
  const [casesList, setCasesList] = useState<Case[]>([]);
  const [financesList, setFinancesList] = useState<FinanceEntry[]>([]);
  const [availableVehicles, setAvailableVehicles] = useState<AvailableVehicle[]>([]);
  const [transporterRequests, setTransporterRequests] = useState<TransporterRequest[]>([]);

  // Modals
  const [showReadyModal, setShowReadyModal] = useState(false);
  const [selectedVehicleForReady, setSelectedVehicleForReady] = useState<Vehicle | null>(null);
  const [readyForm, setReadyForm] = useState({
    currentCity: 'Karachi',
    destinations: ['Lahore Dry Port', 'Chaman Border Terminal'],
    customDestination: '',
    estimatedRent: '185000',
    availableFromDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Request Modals
  const [showNewRegModal, setShowNewRegModal] = useState(false);
  const [newRegForm, setNewRegForm] = useState({
    vehicleNo: '',
    make: 'Hino 500 Prime Mover',
    model: '2022',
    engineNo: '',
    chassisNo: '',
    driverName: '',
    driverContact: '',
    driverCnic: '',
    vehicleType: '40ft Flatbed Trailer',
    trackerProvider: 'Trakker Pakistan',
    registrationBookDoc: '',
    fitnessDoc: ''
  });

  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [selectedVehicleForRenewal, setSelectedVehicleForRenewal] = useState<Vehicle | null>(null);
  const [renewalForm, setRenewalForm] = useState({
    validationStartDate: new Date().toISOString().split('T')[0],
    reason: '6-Month Routine Bonded Route Renewal',
    documentUrl: ''
  });

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedVehicleForCancel, setSelectedVehicleForCancel] = useState<Vehicle | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Driver Update Modal on Assigned Case
  const [showDriverUpdateModal, setShowDriverUpdateModal] = useState(false);
  const [selectedCaseForDriver, setSelectedCaseForDriver] = useState<{ caseItem: Case; containerIndex: number } | null>(null);
  const [driverUpdateForm, setDriverUpdateForm] = useState({
    driverName: '',
    driverContact: '',
    driverCnic: '',
    vehicleNo: ''
  });

  // Data Subscriptions
  useEffect(() => {
    const unsubV = subscribeToVehicles((items) => setVehiclesList(items || []));
    const unsubC = subscribeToCases((items) => setCasesList(items || []));
    const unsubF = subscribeToFinances((items) => setFinancesList(items || []));
    const unsubA = subscribeToAvailableVehicles((items) => setAvailableVehicles(items || []));
    const unsubR = subscribeToTransporterRequests((items) => setTransporterRequests(items || []));
    return () => {
      unsubV();
      unsubC();
      unsubF();
      unsubA();
      unsubR();
    };
  }, []);

  // Filter vehicles belonging to this transporter
  const myVehicles = useMemo(() => {
    return vehiclesList.filter(v => {
      const vTrans = (v.transporterName || '').toLowerCase().trim();
      const myTrans = selectedTransporterName.toLowerCase().trim();
      return vTrans === myTrans || vTrans.includes(myTrans) || myTrans.includes(vTrans);
    });
  }, [vehiclesList, selectedTransporterName]);

  // Transporter's Assigned Cases
  const myAssignedCases = useMemo(() => {
    const myTrans = selectedTransporterName.toLowerCase().trim();
    return casesList.filter(c => {
      return (c.containers || []).some(cntr => {
        const cTrans = (cntr.transporterName || (c as any).transporterName || '').toLowerCase().trim();
        const cVeh = cntr.vehicleNo?.trim();
        const matchesVeh = myVehicles.some(v => v.registrationNumber?.toLowerCase() === cVeh?.toLowerCase());
        return cTrans === myTrans || matchesVeh;
      });
    });
  }, [casesList, selectedTransporterName, myVehicles]);

  // Transporter's Financials (Earned freight, pending approval slips, approved receipts)
  const myFinances = useMemo(() => {
    const myTrans = selectedTransporterName.toLowerCase().trim();
    return financesList.filter(f => {
      const p = (f.party || '').toLowerCase();
      const target = (f as any).targetTransporter?.toLowerCase() || '';
      const desc = (f.description || '').toLowerCase();
      const isVehicleRent = f.category === 'Vehicle Rent' || (f as any).paymentCategory === 'VEHICLE_RENT';
      return (p === myTrans || target === myTrans || desc.includes(myTrans)) || (isVehicleRent && (p === myTrans || target === myTrans));
    });
  }, [financesList, selectedTransporterName]);

  const totalEarned = useMemo(() => {
    return myAssignedCases.reduce((acc, c) => {
      return acc + (c.containers || []).reduce((cSum, cntr) => {
        return cSum + (cntr.rentAmount || 120000);
      }, 0);
    }, 0);
  }, [myAssignedCases]);

  const totalReceived = useMemo(() => {
    return myFinances
      .filter(f => f.status === 'PAID')
      .reduce((acc, f) => acc + (Number(f.amount) || 0), 0);
  }, [myFinances]);

  const pendingReceivables = Math.max(0, totalEarned - totalReceived);

  // Ready For Loading Submission
  const handleMarkReadyForLoading = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleForReady) return;

    const availableItem: AvailableVehicle = {
      id: `ready_${selectedVehicleForReady.registrationNumber.replace(/\s+/g, '_')}`,
      vehicleNo: selectedVehicleForReady.registrationNumber,
      transporterId: selectedVehicleForReady.transporterId || 1,
      transporterName: selectedTransporterName,
      currentCity: readyForm.currentCity,
      allowableDestinations: readyForm.destinations,
      estimatedRent: parseFloat(readyForm.estimatedRent) || 150000,
      availableFromDate: readyForm.availableFromDate,
      driverName: selectedVehicleForReady.driverName,
      driverContact: selectedVehicleForReady.driverContact,
      vehicleType: selectedVehicleForReady.type,
      readyStatus: 'READY',
      notes: readyForm.notes,
      createdAt: new Date().toISOString()
    };

    await saveAvailableVehicleToFirestore(availableItem);

    // Update vehicle locally & in Firestore
    const updatedVehicle: Vehicle = {
      ...selectedVehicleForReady,
      isReadyForLoading: true,
      readyCity: readyForm.currentCity,
      readyDestinations: readyForm.destinations,
      estimatedRent: parseFloat(readyForm.estimatedRent) || 150000,
      readySince: new Date().toISOString()
    };
    await updateVehicleInFirestore(updatedVehicle);

    setShowReadyModal(false);
    setSelectedVehicleForReady(null);
    alert(`Vehicle ${selectedVehicleForReady.registrationNumber} is now marked "Ready for Loading" in ${readyForm.currentCity}! It is now visible to all Case Managers, Clients, and Admins.`);
  };

  // Submit New Registration Request to Vehicle Manager
  const handleSubmitNewRegRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRegForm.vehicleNo.trim()) {
      alert("Please enter Vehicle Registration Number.");
      return;
    }

    const req: TransporterRequest = {
      id: `req_reg_${Date.now()}`,
      transporterId: 1,
      transporterName: selectedTransporterName,
      type: 'NEW_REGISTRATION',
      vehicleNo: newRegForm.vehicleNo.toUpperCase(),
      vehicleData: {
        registrationNumber: newRegForm.vehicleNo.toUpperCase(),
        make: newRegForm.make,
        model: newRegForm.model,
        type: newRegForm.vehicleType as any,
        driverName: newRegForm.driverName,
        driverContact: newRegForm.driverContact,
        driverCnic: newRegForm.driverCnic,
        transporterName: selectedTransporterName,
        status: 'AVAILABLE'
      },
      documents: [
        { name: 'Registration Book', url: newRegForm.registrationBookDoc || 'https://placehold.co/600x800/png?text=Registration+Book', type: 'application/pdf' },
        { name: 'Fitness Certificate', url: newRegForm.fitnessDoc || 'https://placehold.co/600x800/png?text=Fitness+Certificate', type: 'application/pdf' }
      ],
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    await saveTransporterRequestToFirestore(req);
    setShowNewRegModal(false);
    setNewRegForm({
      vehicleNo: '',
      make: 'Hino 500 Prime Mover',
      model: '2022',
      engineNo: '',
      chassisNo: '',
      driverName: '',
      driverContact: '',
      driverCnic: '',
      vehicleType: '40ft Flatbed Trailer',
      trackerProvider: 'Trakker Pakistan',
      registrationBookDoc: '',
      fitnessDoc: ''
    });
    alert("New Vehicle Registration request submitted successfully! Your Vehicle Manager has received this request for document verification and approval.");
  };

  // Submit Renewal Request
  const handleSubmitRenewalRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleForRenewal) return;

    const req: TransporterRequest = {
      id: `req_ren_${Date.now()}`,
      transporterId: selectedVehicleForRenewal.transporterId || 1,
      transporterName: selectedTransporterName,
      type: 'RENEWAL',
      vehicleNo: selectedVehicleForRenewal.registrationNumber,
      reason: renewalForm.reason,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      documents: renewalForm.documentUrl ? [{ name: 'Renewal Document', url: renewalForm.documentUrl, type: 'application/pdf' }] : []
    };

    await saveTransporterRequestToFirestore(req);
    setShowRenewalModal(false);
    setSelectedVehicleForRenewal(null);
    alert(`Renewal request for ${req.vehicleNo} sent to Vehicle Manager for verification!`);
  };

  // Submit Cancellation Request
  const handleSubmitCancelRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleForCancel) return;

    const req: TransporterRequest = {
      id: `req_can_${Date.now()}`,
      transporterId: selectedVehicleForCancel.transporterId || 1,
      transporterName: selectedTransporterName,
      type: 'CANCELLATION',
      vehicleNo: selectedVehicleForCancel.registrationNumber,
      reason: cancelReason,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    await saveTransporterRequestToFirestore(req);
    setShowCancelModal(false);
    setSelectedVehicleForCancel(null);
    setCancelReason('');
    alert(`Vehicle cancellation request for ${req.vehicleNo} submitted to Vehicle Manager.`);
  };

  // Approve Vehicle Assignment & Update Driver Details
  const handleApproveCaseAssignment = async (c: Case, containerIdx: number) => {
    const updatedCase = { ...c };
    if (updatedCase.containers && updatedCase.containers[containerIdx]) {
      updatedCase.containers[containerIdx].transporterApproved = true;
      await saveCaseToFirestore(updatedCase);
      alert(`Assignment confirmed for Container ${updatedCase.containers[containerIdx].number}! You can now update the driver credentials.`);
    }
  };

  const handleSaveDriverDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseForDriver) return;
    const { caseItem, containerIndex } = selectedCaseForDriver;
    const updatedCase = { ...caseItem };
    if (updatedCase.containers && updatedCase.containers[containerIndex]) {
      updatedCase.containers[containerIndex].driverName = driverUpdateForm.driverName;
      updatedCase.containers[containerIndex].driverContact = driverUpdateForm.driverContact;
      updatedCase.containers[containerIndex].driverCnic = driverUpdateForm.driverCnic;
      if (driverUpdateForm.vehicleNo) {
        updatedCase.containers[containerIndex].vehicleNo = driverUpdateForm.vehicleNo;
      }
      await saveCaseToFirestore(updatedCase);
      setShowDriverUpdateModal(false);
      setSelectedCaseForDriver(null);
      alert("Driver information updated successfully!");
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-950 text-gray-100 font-sans">
      
      {/* ========================================================================= */}
      {/* TRANSPORTER SIDEBAR */}
      {/* ========================================================================= */}
      <aside className="w-full lg:w-64 bg-slate-900/90 border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col shrink-0 no-print">
        
        {/* Brand Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-slate-950 p-1.5 rounded-xl border border-white/10">
              <Logo className="h-7 w-auto" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-wide">Transporter Desk</h1>
              <p className="text-[10px] text-amber-400 font-medium">Fleet & Transport Hub</p>
            </div>
          </div>
        </div>

        {/* Transporter Identity Card */}
        <div className="p-3.5 mx-3 my-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-xs">
              🚛
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-white truncate">{selectedTransporterName}</h4>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                <ShieldCheck size={11} /> Verified Fleet Carrier
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-3 space-y-1.5">
          <button
            onClick={() => setActiveTab('vehicles')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'vehicles'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Truck size={17} />
            <span>Vehicles Management</span>
            <span className="ml-auto text-[11px] font-mono font-bold bg-black/30 px-2 py-0.5 rounded-full">
              {myVehicles.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ready_vehicles')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'ready_vehicles'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <MapPin size={17} />
            <span>Available / Ready Fleet</span>
            <span className="ml-auto text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">
              {availableVehicles.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('assigned_cases')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'assigned_cases'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Building size={17} />
            <span>Assigned Shipments</span>
            <span className="ml-auto text-[11px] font-mono font-bold bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">
              {myAssignedCases.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('finance')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'finance'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <DollarSign size={17} />
            <span>Finance & Ledger</span>
          </button>
        </nav>

        {/* Sign Out Button */}
        <div className="p-3 border-t border-white/10">
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
      {/* MAIN VIEW AREA */}
      {/* ========================================================================= */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">

        {/* ======================================================================= */}
        {/* VIEW 1: VEHICLES MANAGEMENT */}
        {/* ======================================================================= */}
        {activeTab === 'vehicles' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Top Action Requests Bar */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Truck className="text-amber-400" size={24} />
                  <span>Fleet & Vehicle Operations</span>
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Manage registered vehicles, submit new vehicle addition, renewal & cancellation requests
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                <button
                  onClick={() => setShowNewRegModal(true)}
                  className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-amber-600/30 transition active:scale-95"
                >
                  <Plus size={15} />
                  <span>+ Request New Registration</span>
                </button>
              </div>
            </div>

            {/* Pending Requests Notice */}
            {transporterRequests.filter(r => r.status === 'PENDING').length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-2">
                <h4 className="text-xs font-bold text-amber-300 flex items-center gap-2">
                  <Clock size={16} className="animate-spin" />
                  <span>Requests Pending Approval from Vehicle Manager:</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {transporterRequests.filter(r => r.status === 'PENDING').map(req => (
                    <div key={req.id} className="bg-slate-950 p-2.5 rounded-xl border border-white/10 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-white font-mono">{req.vehicleNo}</span>
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded">
                          {req.type.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">Submitted on {req.createdAt?.slice(0, 10)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Registered Vehicles List */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Registered Fleet Vehicles ({myVehicles.length})</span>
                </h3>
              </div>

              {myVehicles.length === 0 ? (
                <div className="bg-slate-900 border border-white/10 rounded-2xl p-8 text-center text-gray-400 space-y-3">
                  <Truck size={42} className="mx-auto text-gray-600" />
                  <p className="text-sm font-semibold text-white">No Vehicles Registered Yet</p>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto">
                    Click "Request New Registration" above to add your prime movers and trailers to the system.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myVehicles.map((v) => {
                    const isReady = availableVehicles.some(av => av.vehicleNo === v.registrationNumber && av.readyStatus === 'READY');
                    return (
                      <div 
                        key={v.id}
                        className="bg-slate-900 border border-white/10 hover:border-amber-500/40 rounded-2xl p-5 space-y-4 transition-all shadow-lg"
                      >
                        {/* Top: Reg & Status */}
                        <div className="flex justify-between items-start border-b border-white/10 pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-lg text-white">
                                {v.registrationNumber}
                              </span>
                              {isReady && (
                                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">
                                  READY FOR LOADING
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {v.make} • {v.type || 'Trailer'}
                            </p>
                          </div>
                          <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold border ${
                            v.status === 'AVAILABLE' 
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                          }`}>
                            {v.status}
                          </span>
                        </div>

                        {/* Driver & Fitness Info */}
                        <div className="space-y-1.5 text-xs text-gray-300 bg-white/5 p-3 rounded-xl">
                          <p>👤 Driver: <strong className="text-white">{v.driverName || 'N/A'}</strong></p>
                          <p>📞 Phone: <span className="font-mono text-amber-300">{v.driverContact || 'N/A'}</span></p>
                          <p>📄 Fitness Expiry: <span className="font-mono text-gray-200">{v.validationExpiryDate || 'Active'}</span></p>
                          {isReady && (
                            <p className="text-emerald-400 text-[11px] pt-1 border-t border-white/10">
                              📍 Location: {v.readyCity || 'Karachi'} &bull; Est. Rent: PKR {Number(v.estimatedRent || 150000).toLocaleString()}
                            </p>
                          )}
                        </div>

                        {/* Actions for this vehicle */}
                        <div className="space-y-2 pt-2 border-t border-white/10">
                          {/* Ready for Loading Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedVehicleForReady(v);
                              setShowReadyModal(true);
                            }}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition active:scale-95"
                          >
                            <MapPin size={14} />
                            <span>Mark Ready for Loading</span>
                          </button>

                          {/* Secondary actions: Renewal & Cancellation */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedVehicleForRenewal(v);
                                setShowRenewalModal(true);
                              }}
                              className="bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white py-1.5 rounded-lg border border-white/10 flex items-center justify-center gap-1"
                            >
                              <RefreshCw size={12} />
                              <span>Request Renewal</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedVehicleForCancel(v);
                                setShowCancelModal(true);
                              }}
                              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 py-1.5 rounded-lg border border-red-500/20 flex items-center justify-center gap-1"
                            >
                              <X size={12} />
                              <span>Request Cancel</span>
                            </button>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ======================================================================= */}
        {/* VIEW 2: AVAILABLE FLEET (ALL TRANSPORTERS' READY VEHICLES) */}
        {/* ======================================================================= */}
        {activeTab === 'ready_vehicles' && (
          <div className="animate-fade-in">
            <AvailableVehiclesView userRole="TRANSPORTER" />
          </div>
        )}

        {/* ======================================================================= */}
        {/* VIEW 3: ASSIGNED SHIPMENTS */}
        {/* ======================================================================= */}
        {activeTab === 'assigned_cases' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-slate-900 p-5 rounded-2xl border border-white/10 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Building className="text-blue-400" size={24} />
                  <span>Assigned Shipments & Container Dispatches</span>
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Cases allocated to your vehicles by Vehicle Manager or Operations Manager. Review and update driver details.
                </p>
              </div>
            </div>

            {myAssignedCases.length === 0 ? (
              <div className="bg-slate-900 border border-white/10 rounded-2xl p-10 text-center text-gray-400 space-y-2">
                <Building size={42} className="mx-auto text-gray-600" />
                <h4 className="text-white font-bold text-sm">No Active Shipments Assigned</h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  When your vehicles are assigned to containers by the fleet dispatcher, they will appear here with rent breakdown and driver assignment options.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {myAssignedCases.map((c) => (
                  <div key={c.id} className="bg-slate-900 border border-white/10 rounded-2xl p-5 space-y-4">
                    <div className="flex flex-wrap justify-between items-start gap-2 border-b border-white/10 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-lg text-white">{c.caseNo}</span>
                          <span className="bg-brand-500/20 text-brand-300 text-xs px-2 py-0.5 rounded border border-brand-500/30">
                            {c.category}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Client: <strong className="text-white">{c.clientName}</strong> &bull; Route: {c.pol} &rarr; {c.pod}
                        </p>
                      </div>
                      <span className="bg-blue-500/20 text-blue-300 text-xs px-3 py-1 rounded-full border border-blue-500/30 font-medium">
                        {c.status}
                      </span>
                    </div>

                    {/* Containers List inside this case */}
                    <div className="space-y-2.5">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Assigned Containers & Transport Terms:
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(c.containers || []).map((cntr, idx) => (
                          <div key={cntr.id || idx} className="bg-slate-950 p-3.5 rounded-xl border border-white/10 space-y-2 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="font-mono font-bold text-white text-sm">{cntr.number}</span>
                              <span className="font-mono font-bold text-amber-400">
                                PKR {Number(cntr.rentAmount || 120000).toLocaleString()}
                              </span>
                            </div>
                            <div className="text-gray-300 space-y-0.5 text-[11px]">
                              <p>🚗 Vehicle: <span className="font-mono text-white">{cntr.vehicleNo || 'TL-8842'}</span></p>
                              <p>👨‍✈️ Driver: <span className="text-white">{cntr.driverName || 'Not Assigned'}</span> ({cntr.driverContact || 'N/A'})</p>
                              <p>💳 Rent Payment By: <strong className="text-amber-300">{cntr.rentPaymentBy || 'Client'}</strong></p>
                            </div>

                            <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                              {!cntr.transporterApproved ? (
                                <button
                                  type="button"
                                  onClick={() => handleApproveCaseAssignment(c, idx)}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                                >
                                  <Check size={13} />
                                  <span>Approve Assignment</span>
                                </button>
                              ) : (
                                <span className="text-emerald-400 text-[11px] font-semibold flex items-center gap-1">
                                  <CheckCircle2 size={13} /> Approved
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCaseForDriver({ caseItem: c, containerIndex: idx });
                                  setDriverUpdateForm({
                                    driverName: cntr.driverName || '',
                                    driverContact: cntr.driverContact || '',
                                    driverCnic: cntr.driverCnic || '',
                                    vehicleNo: cntr.vehicleNo || ''
                                  });
                                  setShowDriverUpdateModal(true);
                                }}
                                className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-lg text-xs font-medium transition"
                              >
                                <span>Update Driver</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

        {/* ======================================================================= */}
        {/* VIEW 4: FINANCE & TRANSPORTER LEDGER */}
        {/* ======================================================================= */}
        {activeTab === 'finance' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Top Counters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-900 border border-white/10 p-5 rounded-2xl space-y-1">
                <span className="text-xs text-gray-400">Total Billed Freight:</span>
                <p className="text-2xl font-mono font-bold text-white">
                  PKR {totalEarned.toLocaleString()}
                </p>
                <span className="text-[11px] text-gray-500">From all assigned container trips</span>
              </div>

              <div className="bg-slate-900 border border-emerald-500/20 p-5 rounded-2xl space-y-1">
                <span className="text-xs text-emerald-400 font-medium">Total Received / Settled:</span>
                <p className="text-2xl font-mono font-bold text-emerald-400">
                  PKR {totalReceived.toLocaleString()}
                </p>
                <span className="text-[11px] text-emerald-500/80">Approved & received funds</span>
              </div>

              <div className="bg-slate-900 border border-amber-500/30 p-5 rounded-2xl space-y-1">
                <span className="text-xs text-amber-400 font-medium">Pending Freight Dues:</span>
                <p className="text-2xl font-mono font-bold text-amber-400">
                  PKR {pendingReceivables.toLocaleString()}
                </p>
                <span className="text-[11px] text-amber-500/80">Receivable from Client & DPL</span>
              </div>
            </div>

            {/* Transactions Passbook */}
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <DollarSign size={18} className="text-amber-400" />
                  <span>Freight Receipts & Payment Passbook</span>
                </h3>
              </div>

              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-left text-xs text-gray-200">
                  <thead className="bg-slate-950 uppercase font-semibold text-gray-400 border-b border-white/10">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Payer / Source</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Reference / Slip</th>
                      <th className="p-3">Amount (PKR)</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 bg-slate-900/40">
                    {myFinances.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-gray-500">
                          No direct payment transactions recorded yet. Payments deposited by clients or DPL will show here.
                        </td>
                      </tr>
                    ) : (
                      myFinances.map((f) => (
                        <tr key={f.id} className="hover:bg-white/5 transition">
                          <td className="p-3 font-mono text-gray-300">{f.date}</td>
                          <td className="p-3 font-medium text-white">{f.party || 'Client / DPL'}</td>
                          <td className="p-3 text-gray-300">{f.category || 'Vehicle Rent'}</td>
                          <td className="p-3 font-mono text-amber-300">{f.reference || f.transactionId || 'Direct'}</td>
                          <td className="p-3 font-mono font-bold text-emerald-400 text-sm">
                            PKR {Number(f.amount || 0).toLocaleString()}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              f.status === 'PAID'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            }`}>
                              {f.status === 'PAID' ? 'Confirmed / Settled' : 'Pending Verification'}
                            </span>
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

      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: MARK READY FOR LOADING POPUP */}
      {/* ========================================================================= */}
      {showReadyModal && selectedVehicleForReady && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center pt-3 sm:pt-6 pb-6 px-3 sm:px-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 rounded-3xl max-w-lg w-full border border-white/10 shadow-2xl overflow-hidden p-6 mb-8 space-y-5">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <MapPin className="text-emerald-400" size={20} />
                  <span>Mark Ready for Loading</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Vehicle: <strong className="font-mono text-white">{selectedVehicleForReady.registrationNumber}</strong>
                </p>
              </div>
              <button 
                onClick={() => setShowReadyModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleMarkReadyForLoading} className="space-y-4">
              <div>
                <label className="text-xs text-gray-300 font-semibold mb-1 block">
                  Current City / Station (Where Vehicle Is Present):
                </label>
                <select
                  value={readyForm.currentCity}
                  onChange={(e) => setReadyForm(prev => ({ ...prev, currentCity: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:border-amber-500 outline-none"
                >
                  <option value="Karachi">Karachi (KPT / Port Qasim / Terminals)</option>
                  <option value="Port Qasim">Port Qasim (QICT)</option>
                  <option value="Lahore">Lahore (Dry Port / NLC)</option>
                  <option value="Quetta">Quetta (Railway Dry Port)</option>
                  <option value="Gwadar">Gwadar Port Terminal</option>
                  <option value="Chaman">Chaman Border Terminal</option>
                  <option value="Peshawar">Peshawar Dry Port</option>
                  <option value="Faisalabad">Faisalabad Dry Port</option>
                  <option value="Islamabad">Islamabad Dry Port</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-300 font-semibold mb-1 block">
                  Allowable Destinations (Where Vehicle Can Deliver):
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    'Lahore Dry Port',
                    'Chaman Border Terminal',
                    'Taftan Border Terminal',
                    'Quetta Railway Dry Port',
                    'Peshawar Dry Port',
                    'Islamabad Dry Port',
                    'Faisalabad Dry Port'
                  ].map((dest) => {
                    const checked = readyForm.destinations.includes(dest);
                    return (
                      <label 
                        key={dest} 
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition ${
                          checked ? 'bg-amber-500/10 border-amber-500/40 text-white' : 'bg-slate-950 border-white/5 text-gray-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setReadyForm(prev => ({ ...prev, destinations: [...prev.destinations, dest] }));
                            } else {
                              setReadyForm(prev => ({ ...prev, destinations: prev.destinations.filter(d => d !== dest) }));
                            }
                          }}
                          className="rounded text-amber-500 focus:ring-0"
                        />
                        <span className="text-[11px] truncate">{dest}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-300 font-semibold mb-1 block">
                  Estimated Freight / Rent (PKR):
                </label>
                <input
                  type="number"
                  required
                  value={readyForm.estimatedRent}
                  onChange={(e) => setReadyForm(prev => ({ ...prev, estimatedRent: e.target.value }))}
                  placeholder="e.g. 185000"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white font-mono focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-gray-300 font-semibold mb-1 block">
                  Available From Date:
                </label>
                <input
                  type="date"
                  value={readyForm.availableFromDate}
                  onChange={(e) => setReadyForm(prev => ({ ...prev, availableFromDate: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white font-mono focus:border-amber-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowReadyModal(false)}
                  className="px-4 py-2 text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/30 transition"
                >
                  Submit Ready Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: REQUEST NEW VEHICLE REGISTRATION */}
      {/* ========================================================================= */}
      {showNewRegModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center pt-3 sm:pt-6 pb-6 px-3 sm:px-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 rounded-3xl max-w-xl w-full border border-white/10 shadow-2xl overflow-hidden p-6 mb-8 space-y-5">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Plus className="text-amber-400" size={20} />
                  <span>Request New Vehicle Registration</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Submit vehicle and driver documentation to Vehicle Manager for inspection & clearance
                </p>
              </div>
              <button 
                onClick={() => setShowNewRegModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitNewRegRequest} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-300 font-semibold mb-1 block">Vehicle Reg Number *:</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TL-8899"
                    value={newRegForm.vehicleNo}
                    onChange={(e) => setNewRegForm(prev => ({ ...prev, vehicleNo: e.target.value }))}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-300 font-semibold mb-1 block">Make & Model:</label>
                  <input
                    type="text"
                    placeholder="e.g. Hino 500 Prime Mover (2022)"
                    value={newRegForm.make}
                    onChange={(e) => setNewRegForm(prev => ({ ...prev, make: e.target.value }))}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-300 font-semibold mb-1 block">Driver Name:</label>
                  <input
                    type="text"
                    placeholder="e.g. Muhammad Ismail"
                    value={newRegForm.driverName}
                    onChange={(e) => setNewRegForm(prev => ({ ...prev, driverName: e.target.value }))}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-300 font-semibold mb-1 block">Driver Mobile:</label>
                  <input
                    type="text"
                    placeholder="e.g. 0300-1122334"
                    value={newRegForm.driverContact}
                    onChange={(e) => setNewRegForm(prev => ({ ...prev, driverContact: e.target.value }))}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-300 font-semibold mb-1 block">Driver CNIC:</label>
                  <input
                    type="text"
                    placeholder="42101-1234567-1"
                    value={newRegForm.driverCnic}
                    onChange={(e) => setNewRegForm(prev => ({ ...prev, driverCnic: e.target.value }))}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white font-mono"
                  />
                </div>
              </div>

              {/* Document Uploads */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white/5 p-3.5 rounded-xl">
                <div>
                  <label className="text-xs text-gray-300 font-semibold mb-1 block">Registration Book (PDF/Scan):</label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        const proc = await compressAndPrepareFile(f);
                        setNewRegForm(prev => ({ ...prev, registrationBookDoc: proc.dataUrl || '' }));
                      }
                    }}
                    className="w-full text-xs text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-amber-600 file:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-300 font-semibold mb-1 block">Fitness Certificate:</label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        const proc = await compressAndPrepareFile(f);
                        setNewRegForm(prev => ({ ...prev, fitnessDoc: proc.dataUrl || '' }));
                      }
                    }}
                    className="w-full text-xs text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-amber-600 file:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowNewRegModal(false)}
                  className="px-4 py-2 text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-500 text-white px-5 py-2 rounded-xl text-xs font-semibold shadow-lg shadow-amber-600/30 transition"
                >
                  Send Registration Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: REQUEST RENEWAL */}
      {/* ========================================================================= */}
      {showRenewalModal && selectedVehicleForRenewal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center pt-3 sm:pt-6 pb-6 px-3 sm:px-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 rounded-3xl max-w-md w-full border border-white/10 shadow-2xl p-6 mb-8 space-y-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <RefreshCw size={18} className="text-amber-400" />
                <span>Renewal Request: {selectedVehicleForRenewal.registrationNumber}</span>
              </h3>
              <button onClick={() => setShowRenewalModal(false)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmitRenewalRequest} className="space-y-4">
              <div>
                <label className="text-xs text-gray-300 font-semibold mb-1 block">Renewal Reason / Type:</label>
                <input
                  type="text"
                  required
                  value={renewalForm.reason}
                  onChange={(e) => setRenewalForm(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button type="button" onClick={() => setShowRenewalModal(false)} className="px-3 py-1.5 text-xs text-gray-400">Cancel</button>
                <button type="submit" className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-1.5 rounded-lg text-xs font-semibold">Submit Renewal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: REQUEST CANCELLATION */}
      {/* ========================================================================= */}
      {showCancelModal && selectedVehicleForCancel && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center pt-3 sm:pt-6 pb-6 px-3 sm:px-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 rounded-3xl max-w-md w-full border border-white/10 shadow-2xl p-6 mb-8 space-y-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <X size={18} className="text-red-400" />
                <span>Cancel Vehicle: {selectedVehicleForCancel.registrationNumber}</span>
              </h3>
              <button onClick={() => setShowCancelModal(false)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmitCancelRequest} className="space-y-4">
              <div>
                <label className="text-xs text-gray-300 font-semibold mb-1 block">Reason for Cancellation *:</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Vehicle sold / transferred / out of service"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button type="button" onClick={() => setShowCancelModal(false)} className="px-3 py-1.5 text-xs text-gray-400">Cancel</button>
                <button type="submit" className="bg-red-600 hover:bg-red-500 text-white px-4 py-1.5 rounded-lg text-xs font-semibold">Submit Cancellation</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: UPDATE DRIVER INFORMATION ON CASE */}
      {/* ========================================================================= */}
      {showDriverUpdateModal && selectedCaseForDriver && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center pt-3 sm:pt-6 pb-6 px-3 sm:px-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 rounded-3xl max-w-md w-full border border-white/10 shadow-2xl p-6 mb-8 space-y-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <User size={18} className="text-blue-400" />
                <span>Update Driver Credentials</span>
              </h3>
              <button onClick={() => setShowDriverUpdateModal(false)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveDriverDetails} className="space-y-3 text-xs">
              <div>
                <label className="text-gray-300 font-semibold mb-1 block">Vehicle Number:</label>
                <input
                  type="text"
                  value={driverUpdateForm.vehicleNo}
                  onChange={(e) => setDriverUpdateForm(prev => ({ ...prev, vehicleNo: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white font-mono uppercase"
                />
              </div>
              <div>
                <label className="text-gray-300 font-semibold mb-1 block">Driver Name:</label>
                <input
                  type="text"
                  required
                  value={driverUpdateForm.driverName}
                  onChange={(e) => setDriverUpdateForm(prev => ({ ...prev, driverName: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white"
                />
              </div>
              <div>
                <label className="text-gray-300 font-semibold mb-1 block">Driver Contact Number:</label>
                <input
                  type="text"
                  required
                  value={driverUpdateForm.driverContact}
                  onChange={(e) => setDriverUpdateForm(prev => ({ ...prev, driverContact: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-gray-300 font-semibold mb-1 block">Driver CNIC:</label>
                <input
                  type="text"
                  value={driverUpdateForm.driverCnic}
                  onChange={(e) => setDriverUpdateForm(prev => ({ ...prev, driverCnic: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button type="button" onClick={() => setShowDriverUpdateModal(false)} className="px-3 py-1.5 text-gray-400">Cancel</button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg font-semibold">Save Driver</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default TransporterPortal;
