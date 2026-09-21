import React, { useState, useMemo, useEffect } from 'react';
import { Truck, Plus, Search, FileText, User, Settings, Save, MapPin, Calendar, Clock, AlertTriangle, Trash2, CheckCircle, X, ChevronRight, Eye, Activity, CreditCard, Filter, AlertCircle, Download, Loader2, Ban, FileCheck, ShieldCheck, UploadCloud } from 'lucide-react';
import { Vehicle, Transporter, VehicleCategory, VehicleType, TrackerInfo, VehicleHistory } from '../types';
import { autoFillVehicleData } from '../services/geminiService';
import { safeAppStorage } from '../services/storage';
import { downloadVehicleDetailsPdf, downloadVehicleNocPdf } from '../services/pdfExportService';
import { PdfViewerModal } from './PdfViewerModal';
import { 
  subscribeToVehicles, 
  saveVehicleToFirestore, 
  updateVehicleInFirestore, 
  deleteVehicleFromFirestore 
} from '../services/dbService';
import { 
  BulkVehicleImportModal, 
  VehicleOnlineModal, 
  VehicleRenewalModal 
} from './VehicleManagementModals';

// --- Clean Live Data ---

const INITIAL_TRANSPORTERS: Transporter[] = [];

const INITIAL_VEHICLES: Vehicle[] = [];

interface VehicleManagementProps {
  initialFilter?: any;
  clearFilter?: () => void;
}

const VehicleManagement: React.FC<VehicleManagementProps> = ({ initialFilter, clearFilter }) => {
  const [activeTab, setActiveTab] = useState<'transporters' | 'vehicles' | 'transporter_portal'>(() => {
    const saved = safeAppStorage.getItem('dpl_vehicle_tab');
    return (saved === 'transporters' || saved === 'transporter_portal') ? saved : 'vehicles';
  });

  useEffect(() => {
    safeAppStorage.setItem('dpl_vehicle_tab', activeTab);
  }, [activeTab]);

  type VehicleStatusSubTab = 'ALL' | 'IN_TRANSIT' | 'EXPIRED' | 'EXPIRY_SOON' | 'TIR' | 'AFGHAN_TRANSIT' | 'BLACKLIST' | 'UPDATE_PENDING';
  const [vehicleStatusFilter, setVehicleStatusFilter] = useState<VehicleStatusSubTab>('ALL');
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [selectedTransporterForPortal, setSelectedTransporterForPortal] = useState<number | null>(null);
  const [renewalModalVehicle, setRenewalModalVehicle] = useState<Vehicle | null>(null);
  const [onlineModalVehicle, setOnlineModalVehicle] = useState<Vehicle | null>(null);

  const getVehicleValidity = (v: Vehicle): { text: 'Valid' | 'Expired' | 'Expiry Soon'; badgeClass: string } => {
    if (v.status === 'EXPIRED') {
      return { text: 'Expired', badgeClass: 'bg-red-500/20 text-red-400 border border-red-500/30' };
    }
    if (v.status === 'EXPIRE_SOON') {
      return { text: 'Expiry Soon', badgeClass: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' };
    }
    if (v.validationExpiryDate) {
      const expDate = new Date(v.validationExpiryDate).getTime();
      const now = Date.now();
      const diffDays = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        return { text: 'Expired', badgeClass: 'bg-red-500/20 text-red-400 border border-red-500/30' };
      }
      if (diffDays <= 30) {
        return { text: 'Expiry Soon', badgeClass: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' };
      }
    }
    return { text: 'Valid', badgeClass: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' };
  };
  const [transporters, setTransporters] = useState<Transporter[]>(() => {
    return safeAppStorage.getJSON<Transporter[]>('dpl_live_transporters', INITIAL_TRANSPORTERS);
  });
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    return safeAppStorage.getJSON<Vehicle[]>('dpl_live_vehicles', INITIAL_VEHICLES);
  });

  // Real-time synchronization with Firestore
  useEffect(() => {
    const unsub = subscribeToVehicles(
      (firestoreVehicles) => {
        if (firestoreVehicles) {
          setVehicles(firestoreVehicles);
          safeAppStorage.setJSON('dpl_live_vehicles', firestoreVehicles);
        }
      },
      (err) => console.warn('Vehicle subscription warning:', err)
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    safeAppStorage.setJSON('dpl_live_transporters', transporters);
  }, [transporters]);

  useEffect(() => {
    safeAppStorage.setJSON('dpl_live_vehicles', vehicles);
  }, [vehicles]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [showAddTransporter, setShowAddTransporter] = useState(false);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null); // For Profile
  const [preSelectedTransporterId, setPreSelectedTransporterId] = useState<number | null>(null);

  // Cancellation & Automated NOC Workflow (SRS Mandate)
  const [vehicleToCancel, setVehicleToCancel] = useState<Vehicle | null>(null);
  const [cancellationReason, setCancellationReason] = useState('Contract Concluded & Operational De-Registration');
  const [isCancellingVehicle, setIsCancellingVehicle] = useState(false);
  const [nocSuccessNotice, setNocSuccessNotice] = useState<{ vehicleNo: string; nocRef: string; downloadUrl?: string; filename?: string } | null>(null);
  const [isNocViewerOpen, setIsNocViewerOpen] = useState(false);

  // --- Helper Functions ---

  const handleConfirmCancelVehicle = async () => {
    if (!vehicleToCancel) return;
    setIsCancellingVehicle(true);
    const today = new Date().toLocaleDateString('en-GB');
    const nocRef = `NOC-DPL-${Date.now().toString().slice(-6)}`;

    // Update vehicle status in state
    const cancelledVehicle: Vehicle = {
      ...vehicleToCancel,
      status: 'CANCELLED' as const,
      cancellationRequested: true,
      cancellationApproved: true,
      cancellationDate: today,
      cancellationReason: cancellationReason,
      nocReference: nocRef,
      nocDate: today
    };

    const updatedVehicles = vehicles.map(v => {
      if (v.id === vehicleToCancel.id) {
        return cancelledVehicle;
      }
      return v;
    });
    setVehicles(updatedVehicles);
    updateVehicleInFirestore(cancelledVehicle);

    // Automatically generate and download official NOC PDF
    try {
      const res = await downloadVehicleNocPdf({
        vehicle: {
          ...vehicleToCancel,
          cancellationReason,
          nocReference: nocRef,
          cancellationDate: today
        },
        nocNo: nocRef,
        reason: cancellationReason,
        date: today
      });

      setNocSuccessNotice({
        vehicleNo: vehicleToCancel.registrationNumber,
        nocRef,
        downloadUrl: res.blobUrl,
        filename: res.filename
      });
    } catch (err) {
      console.error('Error generating vehicle NOC:', err);
    } finally {
      setIsCancellingVehicle(false);
      setVehicleToCancel(null);
    }
  };

  const handleDirectDownloadNoc = async (v: Vehicle) => {
    try {
      const res = await downloadVehicleNocPdf({
        vehicle: v,
        nocNo: v.nocReference || `NOC-DPL-${v.id}`,
        reason: v.cancellationReason || 'Fleet Release',
        date: v.cancellationDate || new Date().toLocaleDateString('en-GB')
      });
      setNocSuccessNotice({
        vehicleNo: v.registrationNumber,
        nocRef: v.nocReference || `NOC-DPL-${v.id}`,
        downloadUrl: res.blobUrl,
        filename: res.filename
      });
    } catch (err) {
      console.error('Failed to download NOC:', err);
    }
  };

  const generateDPLSerial = () => {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `DPL-${dateStr}-${random}`;
  };

  const calculateExpiryDate = (startDate: string) => {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + 6);
    return date.toISOString().split('T')[0];
  };

  const checkExpiryStatus = (expiryDate?: string) => {
    if (!expiryDate) return 'Valid';
    const today = new Date();
    const expiry = new Date(expiryDate);
    const monthsDiff = (expiry.getTime() - today.getTime()) / (1000 * 3600 * 24 * 30);
    
    if (monthsDiff < 0) return 'Expired';
    if (monthsDiff <= 1) return 'Expiring Soon';
    return 'Valid';
  };

  // --- Derived State ---

  const sortedTransporters = useMemo(() => {
    return [...transporters].sort((a, b) => b.activeCasesCount - a.activeCasesCount);
  }, [transporters]);

  const vehiclesOnWay = vehicles.filter(v => v.status === 'ON_TRIP');
  const vehiclesExpired = vehicles.filter(v => v.status === 'EXPIRED' || checkExpiryStatus(v.validationExpiryDate) === 'Expired');
  const vehiclesExpiringSoon = vehicles.filter(v => v.status === 'EXPIRE_SOON' || checkExpiryStatus(v.validationExpiryDate) === 'Expiring Soon');
  
  const statusCounts = useMemo(() => {
    return {
      ALL: vehicles.length,
      IN_TRANSIT: vehicles.filter(v => v.status === 'ON_TRIP' || v.status === 'IN_LINE').length,
      EXPIRED: vehicles.filter(v => v.status === 'EXPIRED' || getVehicleValidity(v).text === 'Expired').length,
      EXPIRY_SOON: vehicles.filter(v => v.status === 'EXPIRE_SOON' || getVehicleValidity(v).text === 'Expiry Soon').length,
      TIR: vehicles.filter(v => (v.category as string)?.toUpperCase() === 'TIR' || (v.type as string)?.toUpperCase().includes('TIR')).length,
      AFGHAN_TRANSIT: vehicles.filter(v => (v.category as string)?.toLowerCase().includes('afghan') || (v.type as string)?.toLowerCase().includes('afghan')).length,
      BLACKLIST: vehicles.filter(v => Boolean(v.isBlacklisted || v.status === 'CANCELLED' || v.status === 'INACTIVE')).length,
      UPDATE_PENDING: vehicles.filter(v => Boolean(v.isUpdatePending || !v.chassisNo || !v.engineNo || !v.validationExpiryDate)).length,
    };
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        v.registrationNumber.toLowerCase().includes(q) ||
        (v.brokerName && v.brokerName.toLowerCase().includes(q)) ||
        v.transporterName.toLowerCase().includes(q) ||
        (v.driverName && v.driverName.toLowerCase().includes(q)) ||
        (v.dplSerial && v.dplSerial.toLowerCase().includes(q))
      );

      if (!matchesSearch) return false;

      const validity = getVehicleValidity(v);
      switch (vehicleStatusFilter) {
        case 'IN_TRANSIT':
          return v.status === 'ON_TRIP' || v.status === 'IN_LINE';
        case 'EXPIRED':
          return v.status === 'EXPIRED' || validity.text === 'Expired';
        case 'EXPIRY_SOON':
          return v.status === 'EXPIRE_SOON' || validity.text === 'Expiry Soon';
        case 'TIR':
          return (v.category as string)?.toUpperCase() === 'TIR' || (v.type as string)?.toUpperCase().includes('TIR');
        case 'AFGHAN_TRANSIT':
          return (v.category as string)?.toLowerCase().includes('afghan') || (v.type as string)?.toLowerCase().includes('afghan');
        case 'BLACKLIST':
          return Boolean(v.isBlacklisted || v.status === 'CANCELLED' || v.status === 'INACTIVE');
        case 'UPDATE_PENDING':
          return Boolean(v.isUpdatePending || !v.chassisNo || !v.engineNo || !v.validationExpiryDate);
        case 'ALL':
        default:
          return true;
      }
    });
  }, [vehicles, searchQuery, vehicleStatusFilter]);

  const handleExportTripReport = () => {
    const headers = [
      'Gadi Number',
      'DPL Serial',
      'Category',
      'Type',
      'Size',
      'Transporter / Broker',
      'Driver Name',
      'Driver Contact',
      'Status',
      'Validity',
      'Expiry Date',
      'Trips / Active Route'
    ];

    const rows = filteredVehicles.map(v => {
      const validity = getVehicleValidity(v);
      const tripRoute = v.tripsHistory && v.tripsHistory.length > 0 
        ? v.tripsHistory[0].route 
        : (v.stationRoutePreferences?.join(' | ') || 'Karachi - Inland');
      return [
        `"${v.registrationNumber}"`,
        `"${v.dplSerial || ''}"`,
        `"${v.category || ''}"`,
        `"${v.type || ''}"`,
        `"${v.size || ''}"`,
        `"${v.brokerName || v.transporterName || ''}"`,
        `"${v.driverName || ''}"`,
        `"${v.driverContact || ''}"`,
        `"${v.status}"`,
        `"${validity.text}"`,
        `"${v.validationExpiryDate || ''}"`,
        `"${tripRoute}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DPL_Vehicle_Trip_Fleet_Report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const trackersOnWay = vehicles.filter(v => v.tracker && v.status === 'ON_TRIP');
  const pendingTrackerPayments = vehicles.filter(v => v.tracker?.provider === 'Us' && v.tracker.paymentStatus === 'Pending');

  // --- Handlers ---

  const handleAddTransporter = (data: any, extractedVehicles: any[]) => {
    const newTransporterId = Date.now();
    const newTransporter: Transporter = {
      id: newTransporterId,
      ...data,
      activeCasesCount: 0,
      createdAt: new Date().toISOString().split('T')[0],
      status: 'Active'
    };
    setTransporters([...transporters, newTransporter]);

    if (extractedVehicles && extractedVehicles.length > 0) {
      const newVehicles = extractedVehicles.map((v, index) => ({
        id: Date.now() + index + 1,
        dplSerial: generateDPLSerial(),
        createdAt: new Date().toISOString().split('T')[0],
        history: [],
        status: 'AVAILABLE' as const,
        transporterId: newTransporterId,
        transporterName: data.name,
        driverName: 'N/A',
        driverCnic: 'N/A',
        driverContact: 'N/A',
        ...v
      }));
      setVehicles(prev => [...prev, ...newVehicles]);
      newVehicles.forEach(nv => saveVehicleToFirestore(nv));
    }
    
    setShowAddTransporter(false);
  };

  const handleAddVehicle = (data: any) => {
    const newVehicle: Vehicle = {
      id: Date.now(),
      dplSerial: generateDPLSerial(),
      createdAt: new Date().toISOString().split('T')[0],
      history: [],
      ...data
    };
    setVehicles([...vehicles, newVehicle]);
    saveVehicleToFirestore(newVehicle);
    setShowAddVehicle(false);
  };

  const handleDeleteVehicle = (id: number) => {
    if (window.confirm("Are you sure you want to delete this vehicle?")) {
      setVehicles(vehicles.filter(v => v.id !== id));
      deleteVehicleFromFirestore(id);
    }
  };

  const handleDeleteTransporter = (id: number) => {
    if (window.confirm("Are you sure you want to delete this transporter?")) {
      setTransporters(transporters.filter(t => t.id !== id));
    }
  };

  const handleImportParsedVehicles = (parsedList: Partial<Vehicle>[]) => {
    const newVehicles: Vehicle[] = parsedList.map((item, idx) => ({
      id: Date.now() + idx,
      registrationNumber: item.registrationNumber || `REG-${Date.now() + idx}`,
      category: (item.category as VehicleCategory) || VehicleCategory.BONDED_CARRIER,
      type: (item.type as VehicleType) || VehicleType.FLATBED,
      size: (item.size as '20ft' | '40ft' | '45ft' | 'Loose') || '40ft',
      engineNo: item.engineNo || 'N/A',
      chassisNo: item.chassisNo || 'N/A',
      transporterId: 0,
      transporterName: item.transporterName || 'Direct Broker',
      brokerName: item.brokerName || item.transporterName || 'Direct Broker',
      driverName: item.driverName || 'N/A',
      driverCnic: item.driverCnic || 'N/A',
      driverContact: item.driverContact || 'N/A',
      validationExpiryDate: item.validationExpiryDate || new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      dplSerial: generateDPLSerial(),
      createdAt: new Date().toISOString().split('T')[0],
      history: [],
      status: 'AVAILABLE' as const,
      isOnline: false
    }));

    setVehicles(prev => [...prev, ...newVehicles]);
    newVehicles.forEach(nv => saveVehicleToFirestore(nv));
    setShowBulkUploadModal(false);
  };

  const handleConfirmOnline = (vehicleId: number, station: string, destination: string) => {
    setVehicles(prev => prev.map(v => {
      if (v.id === vehicleId) {
        const updated = {
          ...v,
          isOnline: true,
          onlineLocation: station,
          onlineDestination: destination,
          status: 'AVAILABLE' as const
        };
        updateVehicleInFirestore(updated);
        return updated;
      }
      return v;
    }));
    setOnlineModalVehicle(null);
  };

  const handleToggleOffline = (vehicleId: number) => {
    setVehicles(prev => prev.map(v => {
      if (v.id === vehicleId) {
        const updated = {
          ...v,
          isOnline: false,
          onlineLocation: undefined,
          onlineDestination: undefined
        };
        updateVehicleInFirestore(updated);
        return updated;
      }
      return v;
    }));
  };

  const handleConfirmRenewal = (vehicleId: number, newExpiryDate: string, docUrl?: string) => {
    setVehicles(prev => prev.map(v => {
      if (v.id === vehicleId) {
        const updated: Vehicle = {
          ...v,
          validationExpiryDate: newExpiryDate,
          status: 'AVAILABLE',
          isUpdatePending: false,
          history: [
            ...(v.history || []),
            {
              id: Date.now(),
              date: new Date().toISOString().split('T')[0],
              description: `6-Month Validity Renewed until ${newExpiryDate}`,
              type: 'STATUS_CHANGE' as const
            }
          ]
        };
        updateVehicleInFirestore(updated);
        return updated;
      }
      return v;
    }));
    setRenewalModalVehicle(null);
  };

  // --- Render Sections ---

  const renderTransportersSection = () => (
    <div className="space-y-6 animate-fade-in">
      {/* Action Bar */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
        <div className="flex gap-3">
          <button onClick={() => setShowAddTransporter(true)} className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors">
            <Plus size={16} /> Add Transporter
          </button>
          <button onClick={() => { setPreSelectedTransporterId(null); setShowAddVehicle(true); }} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors">
            <Truck size={16} /> Add Vehicle
          </button>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
          <input 
            type="text" 
            placeholder="Search transporters..." 
            className="w-full glass-input rounded-lg pl-9 pr-4 py-2 text-sm outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Transporters List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedTransporters.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase())).map(t => (
          <div key={t.id} className="glass-card p-5 rounded-xl border border-white/10 hover:bg-white/5 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-white font-semibold">{t.name}</h3>
                  <p className="text-xs text-gray-400">{t.contact}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded text-[10px] font-medium ${t.status === 'Active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {t.status}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-300 mb-4">
              <div className="bg-white/5 p-2 rounded flex flex-col items-center">
                <span className="text-xs text-gray-500">Active Cases</span>
                <span className="font-bold text-white">{t.activeCasesCount}</span>
              </div>
              <div className="bg-white/5 p-2 rounded flex flex-col items-center">
                <span className="text-xs text-gray-500">Vehicles</span>
                <span className="font-bold text-white">{vehicles.filter(v => v.transporterId === t.id).length}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => { setPreSelectedTransporterId(t.id); setShowAddVehicle(true); }}
                className="flex-1 bg-brand-600/20 hover:bg-brand-600/30 text-brand-400 py-2 rounded-lg text-xs font-medium transition-colors"
              >
                + Add Vehicle
              </button>
              <button 
                onClick={() => handleDeleteTransporter(t.id)}
                className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                title="Delete Transporter"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderVehiclesSection = () => (
    <div className="space-y-6 animate-fade-in">
      {/* Quick Action Navigation Bar */}
      <div className="flex flex-wrap justify-between items-center gap-3 bg-white/5 p-4 rounded-xl border border-white/10">
        <div className="flex flex-wrap items-center gap-2.5">
          <button 
            onClick={() => { setPreSelectedTransporterId(null); setShowAddVehicle(true); }}
            className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold shadow-lg shadow-brand-600/30 transition-all hover:scale-105"
          >
            <Truck size={16} /> + Add Vehicle
          </button>
          <button 
            onClick={() => setShowAddTransporter(true)} 
            className="bg-purple-600/20 hover:bg-purple-600 border border-purple-500/30 text-purple-300 hover:text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all"
          >
            <Plus size={16} /> + Add Transporter / Broker
          </button>
          <button 
            onClick={() => setShowBulkUploadModal(true)}
            className="bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/30 text-emerald-300 hover:text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all"
          >
            <UploadCloud size={16} /> Bulk Excel / CSV Upload
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={handleExportTripReport}
            className="bg-blue-600/20 hover:bg-blue-600 border border-blue-500/30 text-blue-300 hover:text-white px-3.5 py-2 rounded-lg flex items-center gap-2 text-xs font-medium transition-all"
            title="Download complete trip and vehicle fleet report in CSV"
          >
            <Download size={15} /> Download Trip & Fleet Report
          </button>
        </div>
      </div>

      {/* Vehicle Status Filter Tabs */}
      <div className="overflow-x-auto pb-1 no-scrollbar">
        <div className="flex gap-2 p-1.5 bg-black/40 rounded-xl border border-white/10 w-max">
          {[
            { id: 'ALL', label: 'All', count: statusCounts.ALL, icon: Truck, color: 'text-gray-300' },
            { id: 'IN_TRANSIT', label: 'In Transit', count: statusCounts.IN_TRANSIT, icon: MapPin, color: 'text-blue-400' },
            { id: 'EXPIRED', label: 'Expired', count: statusCounts.EXPIRED, icon: AlertTriangle, color: 'text-red-400' },
            { id: 'EXPIRY_SOON', label: 'Expiry Soon', count: statusCounts.EXPIRY_SOON, icon: Clock, color: 'text-yellow-400' },
            { id: 'TIR', label: 'TIR', count: statusCounts.TIR, icon: ShieldCheck, color: 'text-purple-400' },
            { id: 'AFGHAN_TRANSIT', label: 'Afghan Transit', count: statusCounts.AFGHAN_TRANSIT, icon: Activity, color: 'text-cyan-400' },
            { id: 'BLACKLIST', label: 'Blacklist', count: statusCounts.BLACKLIST, icon: Ban, color: 'text-rose-500' },
            { id: 'UPDATE_PENDING', label: 'Update Pending', count: statusCounts.UPDATE_PENDING, icon: AlertCircle, color: 'text-amber-400' },
          ].map(tab => {
            const isActive = vehicleStatusFilter === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setVehicleStatusFilter(tab.id as VehicleStatusSubTab)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
                  isActive 
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-white' : tab.color} />
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-gray-300'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dashboard Windows */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-xl border-l-4 border-blue-500 bg-gradient-to-br from-blue-500/10 to-transparent">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-xs uppercase font-bold">In The Way</p>
              <h3 className="text-2xl font-bold text-white mt-1">{vehiclesOnWay.length}</h3>
            </div>
            <Truck className="text-blue-400" size={24} />
          </div>
          <button onClick={() => setVehicleStatusFilter('IN_TRANSIT')} className="text-xs text-blue-400 mt-3 hover:underline">View Active Routes</button>
        </div>

        <div className="glass-card p-4 rounded-xl border-l-4 border-yellow-500 bg-gradient-to-br from-yellow-500/10 to-transparent">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-xs uppercase font-bold">Expiry Soon</p>
              <h3 className="text-2xl font-bold text-white mt-1">{vehiclesExpiringSoon.length}</h3>
            </div>
            <Clock className="text-yellow-400" size={24} />
          </div>
          <button onClick={() => setVehicleStatusFilter('EXPIRY_SOON')} className="text-[10px] text-yellow-400 mt-3 hover:underline">Filter Expiry Soon</button>
        </div>

        <div className="glass-card p-4 rounded-xl border-l-4 border-red-500 bg-gradient-to-br from-red-500/10 to-transparent">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-xs uppercase font-bold">Expired</p>
              <h3 className="text-2xl font-bold text-white mt-1">{vehiclesExpired.length}</h3>
            </div>
            <AlertTriangle className="text-red-400" size={24} />
          </div>
          <button onClick={() => setVehicleStatusFilter('EXPIRED')} className="text-xs text-red-400 mt-3 hover:underline">Filter Expired</button>
        </div>

        <div className="glass-card p-4 rounded-xl border-l-4 border-brand-500 bg-gradient-to-br from-brand-500/10 to-transparent flex flex-col justify-center items-center cursor-pointer hover:bg-brand-500/20 transition-colors" onClick={() => setVehicleStatusFilter('ALL')}>
          <Search className="text-brand-400 mb-2" size={24} />
          <span className="text-brand-400 font-bold">View All Vehicles</span>
          <span className="text-xs text-brand-500/70 mt-1">{vehicles.length} Total Registered</span>
        </div>
      </div>

      {/* Main Vehicle List */}
      <div className="glass-card rounded-xl border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Truck size={18}/> 
            <span>Fleet Vehicles ({filteredVehicles.length})</span>
            {vehicleStatusFilter !== 'ALL' && (
              <span className="text-xs text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
                Tab: {vehicleStatusFilter}
              </span>
            )}
          </h3>
          <div className="flex gap-2">
             <div className="relative">
                <Search className="absolute left-2 top-2 text-gray-500" size={14} />
                <input type="text" placeholder="Search registration, broker, driver..." className="glass-input rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none w-56" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
             </div>
             <button onClick={() => setVehicleStatusFilter('ALL')} className="p-1.5 bg-white/5 rounded hover:bg-white/10 text-gray-400" title="Clear Filters"><Filter size={16}/></button>
          </div>
        </div>
        {/* Mobile View (Cards) - Showing Gadi Number, Broker Name, and Validity Status */}
        <div className="block sm:hidden divide-y divide-white/5 touch-pan-y">
          {filteredVehicles.map(v => {
            const validity = getVehicleValidity(v);
            return (
              <div key={v.id} className="p-4 space-y-2.5 hover:bg-white/5 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="font-mono font-bold text-white text-base block">{v.registrationNumber}</span>
                    <span className="text-xs text-gray-400 font-medium">Broker: <strong className="text-gray-200 font-semibold">{v.brokerName || v.transporterName || 'Direct Broker'}</strong></span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${validity.badgeClass}`}>
                    {validity.text}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-white/5">
                  {v.status === 'CANCELLED' ? (
                    <button
                      onClick={() => handleDirectDownloadNoc(v)}
                      className="bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all"
                      title="Download De-registration NOC PDF"
                    >
                      <FileCheck size={13} />
                      <span>NOC PDF</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setVehicleToCancel(v);
                        setCancellationReason('Operational De-Registration & Contract Release');
                      }}
                      className="text-gray-400 hover:text-red-400 p-1.5 rounded-lg text-xs flex items-center gap-1 bg-white/5 border border-white/5"
                      title="Cancel / De-register Vehicle & Generate NOC"
                    >
                      <Ban size={14} />
                      <span className="text-[11px]">Cancel</span>
                    </button>
                  )}
                  <button 
                    onClick={async () => {
                      try {
                        await downloadVehicleDetailsPdf(v);
                      } catch (err) {
                        console.error(err);
                      }
                    }} 
                    className="text-emerald-400 hover:text-white p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium flex items-center gap-1" 
                    title="Download Vehicle Details PDF"
                  >
                    <Download size={14}/>
                    <span>PDF</span>
                  </button>
                  <button onClick={() => setSelectedVehicle(v)} className="text-brand-400 hover:text-white p-1.5 rounded-lg bg-white/5 text-xs flex items-center gap-1 border border-white/5" title="View Profile">
                    <Eye size={14}/>
                    <span>View</span>
                  </button>
                  <button onClick={() => handleDeleteVehicle(v.id)} className="text-gray-400 hover:text-red-400 p-1.5 rounded-lg bg-white/5" title="Delete Vehicle">
                    <Trash2 size={14}/>
                  </button>
                </div>
              </div>
            );
          })}
          {filteredVehicles.length === 0 && (
            <div className="p-8 text-center text-gray-500 text-xs">No vehicles found in {vehicleStatusFilter} category.</div>
          )}
        </div>

        {/* Desktop View (Table) - Showing Gadi Number, Broker Name, and Validity Status */}
        <div className="hidden sm:block overflow-x-auto touch-pan-y custom-scrollbar">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-white/5 text-xs uppercase text-gray-400 border-b border-white/10">
              <tr>
                <th className="p-3.5 font-bold">Gadi Number</th>
                <th className="p-3.5 font-bold">Category & Type</th>
                <th className="p-3.5 font-bold">Broker / Transporter</th>
                <th className="p-3.5 font-bold">Driver Info</th>
                <th className="p-3.5 font-bold">Status (Validity)</th>
                <th className="p-3.5 text-right font-bold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredVehicles.map(v => {
                const validity = getVehicleValidity(v);
                return (
                  <tr key={v.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-white text-base">
                      {v.registrationNumber}
                      {v.dplSerial && (
                        <span className="block text-[11px] font-mono text-gray-400 font-normal">{v.dplSerial}</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className="text-xs text-gray-200 font-medium">{v.category || 'Bonded Carrier'}</span>
                      <span className="block text-[11px] text-gray-400">{v.type || 'Flatbed'} • {v.size || '40ft'}</span>
                    </td>
                    <td className="p-3.5 font-medium text-gray-200">{v.brokerName || v.transporterName || 'Direct Broker'}</td>
                    <td className="p-3.5 text-xs">
                      <span className="text-gray-200 font-medium block">{v.driverName || 'N/A'}</span>
                      <span className="text-gray-400 font-mono text-[11px]">{v.driverContact || ''}</span>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold inline-block ${validity.badgeClass}`}>
                        {validity.text}
                      </span>
                      {v.validationExpiryDate && (
                        <span className="block text-[10px] text-gray-400 mt-0.5">Exp: {v.validationExpiryDate}</span>
                      )}
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex justify-end items-center gap-2">
                        {/* Vehicle Cancellation & NOC Actions */}
                        {v.status === 'CANCELLED' ? (
                          <button
                            onClick={() => handleDirectDownloadNoc(v)}
                            className="bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all"
                            title="Download De-registration NOC PDF"
                          >
                            <FileCheck size={14} />
                            <span>NOC PDF</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setVehicleToCancel(v);
                              setCancellationReason('Operational De-Registration & Contract Release');
                            }}
                            className="text-gray-400 hover:text-red-400 hover:bg-red-500/10 px-2.5 py-1.5 rounded-lg transition-colors text-xs flex items-center gap-1 border border-white/5"
                            title="Cancel / De-register Vehicle & Generate NOC"
                          >
                            <Ban size={14} />
                            <span>Cancel</span>
                          </button>
                        )}

                        <button 
                          onClick={async () => {
                            try {
                              await downloadVehicleDetailsPdf(v);
                            } catch (err) {
                              console.error(err);
                            }
                          }} 
                          className="bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 hover:text-white transition-colors px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1" 
                          title="Download Vehicle Dossier PDF"
                        >
                          <Download size={14}/>
                          <span>PDF</span>
                        </button>
                        <button onClick={() => setSelectedVehicle(v)} className="text-brand-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5" title="View Profile"><Eye size={16}/></button>
                        <button onClick={() => handleDeleteVehicle(v.id)} className="text-gray-500 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-white/5" title="Delete Vehicle Record"><Trash2 size={16}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredVehicles.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500 text-xs">No vehicles found matching current filter ({vehicleStatusFilter}).</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderTransporterPortalSection = () => {
    // Unique list of transporter names from transporters state + vehicle brokerNames
    const allTransporterNames = Array.from(new Set([
      ...transporters.map(t => t.name),
      ...vehicles.map(v => v.brokerName || v.transporterName).filter(Boolean)
    ]));

    const currentTransporter = selectedTransporterForPortal 
      ? transporters.find(t => t.id === selectedTransporterForPortal)?.name 
      : null;

    const portalVehicles = currentTransporter 
      ? vehicles.filter(v => (v.brokerName === currentTransporter) || (v.transporterName === currentTransporter))
      : vehicles;

    const onlineCount = portalVehicles.filter(v => v.isOnline).length;
    const inTransitCount = portalVehicles.filter(v => v.status === 'ON_TRIP' || v.status === 'IN_LINE').length;
    const renewalNeededCount = portalVehicles.filter(v => {
      const val = getVehicleValidity(v);
      return val.text === 'Expired' || val.text === 'Expiry Soon';
    }).length;

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Portal Header */}
        <div className="glass-card p-6 rounded-2xl border border-white/10 bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-950">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-purple-400 font-bold">Partner Self-Service Hub</span>
              <h3 className="text-xl font-bold text-white mt-1 flex items-center gap-2">
                <ShieldCheck className="text-purple-400" size={22} />
                <span>Transporter & Broker Operational Portal</span>
              </h3>
              <p className="text-xs text-gray-400 mt-1 max-w-xl">
                Transporters can manage vehicle availability, mark trucks online at specific customs ports/terminals, request 6-month validity renewals, and monitor active transit orders.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-400 font-medium">Select Transporter/Broker:</label>
              <select
                value={selectedTransporterForPortal || ''}
                onChange={(e) => setSelectedTransporterForPortal(e.target.value ? Number(e.target.value) : null)}
                className="glass-input rounded-xl px-3 py-2 text-xs text-white border border-white/10 bg-slate-900 outline-none"
              >
                <option value="">All Transporters & Brokers</option>
                {transporters.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.status})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            <div className="bg-white/5 p-3.5 rounded-xl border border-white/10">
              <span className="text-[11px] text-gray-400 block uppercase font-medium">Fleet Size</span>
              <span className="text-xl font-bold text-white mt-1 block">{portalVehicles.length} Vehicles</span>
            </div>
            <div className="bg-emerald-500/10 p-3.5 rounded-xl border border-emerald-500/20">
              <span className="text-[11px] text-emerald-400 block uppercase font-medium">Online at Terminal</span>
              <span className="text-xl font-bold text-emerald-300 mt-1 block">{onlineCount} Ready</span>
            </div>
            <div className="bg-blue-500/10 p-3.5 rounded-xl border border-blue-500/20">
              <span className="text-[11px] text-blue-400 block uppercase font-medium">In Transit</span>
              <span className="text-xl font-bold text-blue-300 mt-1 block">{inTransitCount} En Route</span>
            </div>
            <div className="bg-yellow-500/10 p-3.5 rounded-xl border border-yellow-500/20">
              <span className="text-[11px] text-yellow-400 block uppercase font-medium">Renewal Due</span>
              <span className="text-xl font-bold text-yellow-300 mt-1 block">{renewalNeededCount} Alert</span>
            </div>
          </div>
        </div>

        {/* Vehicles Grid / Table */}
        <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
          <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Truck size={16} className="text-brand-400" />
              <span>Partner Fleet Status & Self-Service Actions ({portalVehicles.length})</span>
            </h4>
            <div className="flex gap-2">
              <button
                onClick={() => setShowBulkUploadModal(true)}
                className="bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/30 text-emerald-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all"
              >
                <UploadCloud size={13} /> Bulk Register Vehicles
              </button>
            </div>
          </div>

          <div className="divide-y divide-white/5">
            {portalVehicles.map(v => {
              const validity = getVehicleValidity(v);
              return (
                <div key={v.id} className="p-4 hover:bg-white/5 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-white text-base">{v.registrationNumber}</span>
                      <span className="text-xs bg-white/10 px-2 py-0.5 rounded text-gray-300 font-medium">
                        {v.category || 'Bonded Carrier'} • {v.type || 'Flatbed'} • {v.size || '40ft'}
                      </span>
                      {v.isOnline ? (
                        <span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          ONLINE • {v.onlineLocation || 'Port'}
                        </span>
                      ) : (
                        <span className="bg-gray-500/20 border border-gray-500/30 text-gray-400 text-xs font-semibold px-2 py-0.5 rounded-full">
                          OFFLINE / IN DEPOT
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 flex flex-wrap gap-x-4 gap-y-1">
                      <span>Transporter: <strong className="text-gray-200">{v.brokerName || v.transporterName || 'Direct'}</strong></span>
                      <span>Driver: <strong className="text-gray-200">{v.driverName || 'N/A'} ({v.driverContact || 'N/A'})</strong></span>
                      <span>Validity Expiry: <strong className="text-gray-200 font-mono">{v.validationExpiryDate || 'Not set'}</strong></span>
                      {v.onlineDestination && (
                        <span>Heading Towards: <strong className="text-emerald-300">{v.onlineDestination}</strong></span>
                      )}
                    </div>
                  </div>

                  {/* Actions for this vehicle */}
                  <div className="flex flex-wrap items-center gap-2">
                    {v.isOnline ? (
                      <button
                        onClick={() => handleToggleOffline(v.id)}
                        className="bg-gray-500/20 hover:bg-gray-500/30 border border-gray-500/30 text-gray-300 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      >
                        Mark Offline
                      </button>
                    ) : (
                      <button
                        onClick={() => setOnlineModalVehicle(v)}
                        className="bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/30 text-emerald-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all"
                      >
                        <MapPin size={13} /> Mark Online at Station
                      </button>
                    )}

                    <button
                      onClick={() => setRenewalModalVehicle(v)}
                      className="bg-purple-600/20 hover:bg-purple-600 border border-purple-500/30 text-purple-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all"
                      title="Request 6-Month Extension for Customs Bonded Carriage"
                    >
                      <Clock size={13} /> Request 6-Mo Renewal
                    </button>

                    <button
                      onClick={() => setSelectedVehicle(v)}
                      className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                </div>
              );
            })}

            {portalVehicles.length === 0 && (
              <div className="p-8 text-center text-gray-500 text-xs">
                No vehicles found for the selected transporter/broker profile. Click "+ Add Vehicle" or "Bulk Register" to add.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // --- Main Render ---

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Tabs */}
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2 drop-shadow-md">
          <Truck className="text-brand-400" /> Vehicle Management System
        </h2>
        
        <div className="overflow-x-auto max-w-full pb-1 no-scrollbar">
          <div className="flex gap-2 bg-white/5 rounded-lg p-1 border border-white/10 w-max">
            <button 
              onClick={() => setActiveTab('vehicles')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'vehicles' ? 'bg-brand-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              <Truck size={16} /> Fleet & Vehicles
            </button>
            <button 
              onClick={() => setActiveTab('transporters')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'transporters' ? 'bg-brand-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              <User size={16} /> Transporters & Brokers
            </button>
            <button 
              onClick={() => setActiveTab('transporter_portal')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'transporter_portal' ? 'bg-brand-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              <Activity size={16} /> Transporter Portal
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {activeTab === 'vehicles' && renderVehiclesSection()}
      {activeTab === 'transporters' && renderTransportersSection()}
      {activeTab === 'transporter_portal' && renderTransporterPortalSection()}

      {/* Add Transporter Modal */}
      {showAddTransporter && (
        <AddTransporterModal onClose={() => setShowAddTransporter(false)} onSave={handleAddTransporter} />
      )}

      {/* Add Vehicle Modal */}
      {showAddVehicle && (
        <AddVehicleModal 
          transporters={transporters} 
          preSelectedTransporterId={preSelectedTransporterId}
          onClose={() => setShowAddVehicle(false)} 
          onSave={handleAddVehicle} 
        />
      )}

      {/* Vehicle Profile Modal */}
      {selectedVehicle && (
        <VehicleProfileModal 
          vehicle={selectedVehicle} 
          onClose={() => setSelectedVehicle(null)} 
          onCancelVehicle={(v) => {
            setSelectedVehicle(null);
            setVehicleToCancel(v);
            setCancellationReason('Operational De-Registration & Contract Release');
          }}
        />
      )}

      {/* ========================================================= */}
      {/* VEHICLE CANCELLATION CONFIRMATION & AUTO NOC MODAL (SRS) */}
      {/* ========================================================= */}
      {vehicleToCancel && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="glass-card p-6 sm:p-7 rounded-3xl w-full max-w-lg border border-red-500/30 shadow-2xl space-y-5 bg-slate-950/95">
            {/* Modal Header */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                <AlertTriangle size={26} />
              </div>
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-red-400 font-bold">Action Required</span>
                <h3 className="text-xl font-bold text-white mt-0.5">Cancel Vehicle</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Are you sure you want to cancel and de-register this vehicle from the active customs bonded fleet?
                </p>
              </div>
            </div>

            {/* Vehicle Summary Card */}
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Registration Number:</span>
                <span className="font-mono font-bold text-white text-sm bg-white/10 px-2 py-0.5 rounded">{vehicleToCancel.registrationNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">DPL Fleet Serial:</span>
                <span className="font-mono text-brand-400">{vehicleToCancel.dplSerial}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Transporter:</span>
                <span className="text-white font-medium">{vehicleToCancel.transporterName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Category:</span>
                <span className="text-gray-200">{vehicleToCancel.category} • {vehicleToCancel.type}</span>
              </div>
            </div>

            {/* Reason for Cancellation Input */}
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                Reason for De-registration / NOC
              </label>
              <input
                type="text"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="e.g. Contract completed, sold, or maintenance retirement"
                className="w-full bg-black/50 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-red-500"
              />
            </div>

            {/* Automatic NOC Generation Notice */}
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-xs text-red-200">
              <ShieldCheck size={18} className="text-red-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Automatic NOC Generation:</strong> Upon confirmation, this vehicle will be immediately de-registered and the official No Objection Certificate (NOC) document will be generated and downloaded.
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setVehicleToCancel(null)}
                disabled={isCancellingVehicle}
                className="px-4 py-2.5 rounded-xl text-xs font-medium text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
              >
                Abort
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelVehicle}
                disabled={isCancellingVehicle}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/30 flex items-center gap-2 transition-all hover:scale-102"
              >
                {isCancellingVehicle ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Generating NOC...</span>
                  </>
                ) : (
                  <>
                    <Ban size={15} />
                    <span>Confirm & Generate NOC</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NOC Notification Banner */}
      {nocSuccessNotice && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-slate-900 border border-emerald-500/40 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle size={20} />
            </div>
            <div className="flex-1 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-white">Vehicle Cancelled & NOC Ready!</span>
                <button onClick={() => setNocSuccessNotice(null)} className="text-gray-400 hover:text-white">
                  <X size={15} />
                </button>
              </div>
              <p className="text-gray-300 mt-1">
                Vehicle <strong className="text-white font-mono">{nocSuccessNotice.vehicleNo}</strong> de-registered. NOC Ref: <strong className="text-emerald-400 font-mono">{nocSuccessNotice.nocRef}</strong>
              </p>
              {nocSuccessNotice.downloadUrl && (
                <div className="flex gap-2 mt-2.5">
                  <a
                    href={nocSuccessNotice.downloadUrl}
                    download={nocSuccessNotice.filename || 'Vehicle_NOC.pdf'}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-[11px]"
                  >
                    <Download size={13} /> Download Again
                  </a>
                  <button
                    type="button"
                    onClick={() => setIsNocViewerOpen(true)}
                    className="bg-white/10 hover:bg-white/20 text-white font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-[11px]"
                  >
                    <Eye size={13} /> View PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NOC PDF Viewer Modal */}
      {nocSuccessNotice?.downloadUrl && (
        <PdfViewerModal
          isOpen={isNocViewerOpen}
          onClose={() => setIsNocViewerOpen(false)}
          pdfUrl={nocSuccessNotice.downloadUrl}
          filename={nocSuccessNotice.filename || 'Vehicle_NOC.pdf'}
          title="Vehicle De-registration NOC"
        />
      )}

      {/* Bulk Excel / CSV Import Modal */}
      <BulkVehicleImportModal
        isOpen={showBulkUploadModal}
        onClose={() => setShowBulkUploadModal(false)}
        onImport={handleImportParsedVehicles}
        transporters={transporters}
      />

      {/* Vehicle Online at Station Modal */}
      <VehicleOnlineModal
        isOpen={Boolean(onlineModalVehicle)}
        vehicle={onlineModalVehicle}
        onClose={() => setOnlineModalVehicle(null)}
        onConfirm={handleConfirmOnline}
      />

      {/* Vehicle 6-Month Renewal Modal */}
      <VehicleRenewalModal
        isOpen={Boolean(renewalModalVehicle)}
        vehicle={renewalModalVehicle}
        onClose={() => setRenewalModalVehicle(null)}
        onConfirmRenewal={handleConfirmRenewal}
      />
    </div>
  );
};

// --- Sub-Components (Modals) ---

const AddTransporterModal = ({ onClose, onSave }: any) => {
  const [formData, setFormData] = useState({
    name: '',
    representativeName: '',
    accountantName: '',
    contact: '',
    landline: '',
    email: '',
    address: '',
    cnicDoc: '',
    ntnDoc: '',
    vehicleListDoc: ''
  });
  const [extractedVehicles, setExtractedVehicles] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleVehicleListUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessing(true);
      // Data Extraction
      setTimeout(() => {
        const mockExtractedVehicles = [
          {
            registrationNumber: 'KHI-1234',
            engineNo: 'ENG-SCAN-001',
            chassisNo: 'CH-SCAN-001',
            registrationDate: '2023-01-15',
            ownerName: 'Abdul Rehman',
            ownerCnic: '42101-1234567-1',
            ownerAddress: 'House 123, Street 4, Karachi',
            type: VehicleType.FLATBED,
            size: '40ft',
            weightCapacity: '20-25 Ton',
            category: VehicleCategory.DOMESTIC
          },
          {
            registrationNumber: 'LHR-5678',
            engineNo: 'ENG-SCAN-002',
            chassisNo: 'CH-SCAN-002',
            registrationDate: '2023-02-20',
            ownerName: 'Muhammad Ali',
            ownerCnic: '42201-7654321-9',
            ownerAddress: 'Flat 5, Block A, Lahore',
            type: VehicleType.MAZDA,
            size: 'Loose',
            weightCapacity: '5-10 Ton',
            category: VehicleCategory.DOMESTIC
          }
        ];
        setExtractedVehicles(mockExtractedVehicles);
        setFormData(prev => ({ ...prev, vehicleListDoc: 'uploaded' }));
        setIsProcessing(false);
      }, 800);
      try { e.target.value = ''; } catch (_) {}
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card p-6 rounded-2xl w-full max-w-2xl border border-white/10 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <h3 className="text-xl font-bold text-white mb-4 sticky top-0 bg-slate-900/95 pb-4 border-b border-white/10 z-10 backdrop-blur-md">Add New Transporter</h3>
        
        <div className="flex flex-col gap-4 mb-6 mt-2">
          <input type="text" placeholder="Company Name" className="glass-input rounded p-2 text-white outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          <input type="text" placeholder="Representative Name" className="glass-input rounded p-2 text-white outline-none" value={formData.representativeName} onChange={e => setFormData({...formData, representativeName: e.target.value})} />
          <input type="text" placeholder="Accountant Name" className="glass-input rounded p-2 text-white outline-none" value={formData.accountantName} onChange={e => setFormData({...formData, accountantName: e.target.value})} />
          <input type="text" placeholder="Mobile Number" className="glass-input rounded p-2 text-white outline-none" value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} />
          <input type="text" placeholder="Landline Number" className="glass-input rounded p-2 text-white outline-none" value={formData.landline} onChange={e => setFormData({...formData, landline: e.target.value})} />
          <input type="email" placeholder="Email Address" className="glass-input rounded p-2 text-white outline-none" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          <input type="text" placeholder="Office Address" className="w-full glass-input rounded p-2 text-white outline-none" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
           <div className="border border-dashed border-white/20 rounded p-4 text-center cursor-pointer hover:bg-white/5 relative">
              <input 
                type="file" 
                className="absolute inset-0 opacity-0 cursor-pointer" 
                onChange={(e) => {
                  setFormData({...formData, cnicDoc: 'uploaded'});
                  try { e.target.value = ''; } catch (_) {}
                }} 
              />
              <p className="text-sm text-brand-400 font-medium">{formData.cnicDoc ? 'CNIC Uploaded' : 'Upload ID Card'}</p>
           </div>
           <div className="border border-dashed border-white/20 rounded p-4 text-center cursor-pointer hover:bg-white/5 relative">
              <input 
                type="file" 
                className="absolute inset-0 opacity-0 cursor-pointer" 
                onChange={(e) => {
                  setFormData({...formData, ntnDoc: 'uploaded'});
                  try { e.target.value = ''; } catch (_) {}
                }} 
              />
              <p className="text-sm text-brand-400 font-medium">{formData.ntnDoc ? 'NTN Uploaded' : 'Upload NTN'}</p>
           </div>
           <div className="border border-dashed border-white/20 rounded p-4 text-center cursor-pointer hover:bg-white/5 relative">
              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleVehicleListUpload} />
              <p className="text-sm text-brand-400 font-medium">
                {isProcessing ? 'Processing...' : formData.vehicleListDoc ? 'List Uploaded' : 'Upload Vehicle List'}
              </p>
           </div>
        </div>

        {extractedVehicles.length > 0 && (
          <div className="mb-6 bg-white/5 rounded-xl p-4 border border-white/10">
            <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <CheckCircle size={14} className="text-green-400"/> Data Extracted Vehicles ({extractedVehicles.length})
            </h4>
            <div className="max-h-40 overflow-y-auto space-y-2 custom-scrollbar pr-2">
              {extractedVehicles.map((v, i) => (
                <div key={i} className="text-xs text-gray-300 bg-black/20 p-2 rounded flex justify-between">
                  <span>{v.registrationNumber} ({v.type})</span>
                  <span className="text-gray-500">Owner: {v.ownerName}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
          <button 
            onClick={() => onSave(formData, extractedVehicles)} 
            className="bg-brand-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
            disabled={isProcessing}
          >
            Save Transporter & Vehicles
          </button>
        </div>
      </div>
    </div>
  );
};

const AddVehicleModal = ({ transporters, preSelectedTransporterId, onClose, onSave }: any) => {
  const [formData, setFormData] = useState<any>({
    transporterId: preSelectedTransporterId || '',
    category: VehicleCategory.DOMESTIC,
    type: VehicleType.FLATBED,
    size: '40ft',
    registrationNumber: '', engineNo: '', chassisNo: '',
    brokerName: '',
    ownerName: '',
    ownerCnic: '',
    ownerIdCardUrl: '',
    ownerIdCardName: '',
    driverName: '', driverCnic: '', driverContact: '',
    validationStartDate: '',
    weightCapacity: ''
  });

  const [isExtracting, setIsExtracting] = useState(false);

  const handleOwnerIdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev: any) => ({
          ...prev,
          ownerIdCardUrl: reader.result as string,
          ownerIdCardName: file.name
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsExtracting(true);
      try {
        const extracted = await autoFillVehicleData(file);
        if (extracted && Object.keys(extracted).length > 0) {
          setFormData((prev: any) => ({
            ...prev,
            registrationNumber: extracted.registrationNumber || prev.registrationNumber,
            engineNo: extracted.engineNo || prev.engineNo,
            chassisNo: extracted.chassisNo || prev.chassisNo,
            driverName: extracted.driverName || prev.driverName,
            driverCnic: extracted.driverCnic || prev.driverCnic,
            weightCapacity: extracted.weightCapacity || prev.weightCapacity,
            category: extracted.category || prev.category
          }));
        } else {
          setFormData((prev: any) => ({
            ...prev,
            registrationNumber: prev.registrationNumber || 'ABC-8822',
            engineNo: prev.engineNo || 'ENG-SCAN-123',
            chassisNo: prev.chassisNo || 'CH-SCAN-456'
          }));
        }
      } catch (err) {
        console.warn("Vehicle document OCR notice:", err);
      } finally {
        setIsExtracting(false);
        try { e.target.value = ''; } catch (_) {}
      }
    }
  };

  const showValidationDate = formData.category === VehicleCategory.BONDED_CARRIER || formData.category === VehicleCategory.AFGHAN_TRANSIT;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card p-6 rounded-2xl w-full max-w-2xl border border-white/10 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <h3 className="text-xl font-bold text-white mb-4 sticky top-0 bg-slate-900/95 pb-4 border-b border-white/10 z-10 backdrop-blur-md">Add New Vehicle</h3>
        
        <div className="flex flex-col gap-4 mb-4 mt-2">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Transporter</label>
            <select 
              className="w-full glass-input rounded p-2 text-white outline-none bg-slate-900"
              value={formData.transporterId}
              onChange={e => setFormData({...formData, transporterId: Number(e.target.value)})}
              disabled={!!preSelectedTransporterId}
            >
              <option value="">Select Transporter</option>
              {transporters.map((t: Transporter) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Gadi Number (Registration No) *</label>
              <input 
                type="text" 
                placeholder="e.g. KLA-992" 
                className="w-full glass-input rounded p-2 text-white font-mono font-bold" 
                value={formData.registrationNumber} 
                onChange={e => setFormData({...formData, registrationNumber: e.target.value})} 
                required
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Broker Name *</label>
              <input 
                type="text" 
                placeholder="e.g. Haji Aslam Broker" 
                className="w-full glass-input rounded p-2 text-white" 
                value={formData.brokerName} 
                onChange={e => setFormData({...formData, brokerName: e.target.value})} 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
            <div>
              <label className="text-xs text-brand-300 block mb-1 font-medium">Vehicle Owner Name</label>
              <input 
                type="text" 
                placeholder="Owner Full Name" 
                className="w-full glass-input rounded p-2 text-white text-sm" 
                value={formData.ownerName} 
                onChange={e => setFormData({...formData, ownerName: e.target.value})} 
              />
            </div>
            <div>
              <label className="text-xs text-brand-300 block mb-1 font-medium">Owner CNIC / ID No</label>
              <input 
                type="text" 
                placeholder="e.g. 42101-1234567-1" 
                className="w-full glass-input rounded p-2 text-white font-mono text-sm" 
                value={formData.ownerCnic} 
                onChange={e => setFormData({...formData, ownerCnic: e.target.value})} 
              />
            </div>

            <div className="sm:col-span-2 mt-1">
              <label className="text-xs text-gray-300 block mb-1 font-medium flex items-center justify-between">
                <span>Owner ID Card / CNIC Document Upload</span>
                {formData.ownerIdCardName && (
                  <span className="text-emerald-400 text-[11px] font-semibold flex items-center gap-1">
                    <CheckCircle size={12} /> {formData.ownerIdCardName}
                  </span>
                )}
              </label>
              <div className="relative border border-dashed border-brand-500/40 hover:border-brand-400 bg-brand-500/5 hover:bg-brand-500/10 rounded-xl p-3.5 text-center transition-all">
                <input 
                  type="file" 
                  id="owner-id-upload" 
                  className="hidden" 
                  accept="image/*,application/pdf"
                  onChange={handleOwnerIdUpload} 
                />
                <label htmlFor="owner-id-upload" className="cursor-pointer block">
                  <div className="flex items-center justify-center gap-2 text-brand-300">
                    <UploadCloud size={18} className="text-brand-400" />
                    <span className="text-xs font-semibold">
                      {formData.ownerIdCardName ? 'Change Owner ID Card Document' : 'Upload Owner ID Card (Image / Scan)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">Accepts PNG, JPG, or PDF</p>
                </label>
              </div>
            </div>
          </div>

          <div>
             <label className="text-xs text-gray-400 block mb-1">Category</label>
             <select className="w-full glass-input rounded p-2 text-white outline-none bg-slate-900" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
               {Object.values(VehicleCategory).map(c => <option key={c} value={c}>{c}</option>)}
             </select>
          </div>
          <div>
             <label className="text-xs text-gray-400 block mb-1">Type</label>
             <select className="w-full glass-input rounded p-2 text-white outline-none bg-slate-900" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
               {Object.values(VehicleType).map(t => <option key={t} value={t}>{t}</option>)}
             </select>
          </div>

          {formData.type === VehicleType.CONTAINER && (
            <div>
              <label className="text-xs text-gray-400 block mb-1">Container Size</label>
              <select className="w-full glass-input rounded p-2 text-white outline-none bg-slate-900" value={formData.size} onChange={e => setFormData({...formData, size: e.target.value})}>
                <option value="20ft">20ft</option>
                <option value="40ft">40ft</option>
                <option value="45ft">45ft</option>
              </select>
            </div>
          )}

          <div>
            <label className="text-xs text-gray-400 block mb-1">Weight Capacity</label>
            <select className="w-full glass-input rounded p-2 text-white outline-none bg-slate-900" value={formData.weightCapacity} onChange={e => setFormData({...formData, weightCapacity: e.target.value})}>
              <option value="">Select Weight Range</option>
              <option value="1-5 Ton">1-5 Ton</option>
              <option value="5-10 Ton">5-10 Ton</option>
              <option value="10-15 Ton">10-15 Ton</option>
              <option value="15-20 Ton">15-20 Ton</option>
              <option value="20-25 Ton">20-25 Ton</option>
              <option value="25-30 Ton">25-30 Ton</option>
              <option value="30-35 Ton">30-35 Ton</option>
              <option value="35-40 Ton">35-40 Ton</option>
              <option value="40-45 Ton">40-45 Ton</option>
              <option value="45-50 Ton">45-50 Ton</option>
            </select>
          </div>

          <div className="border border-dashed border-white/20 rounded p-4 text-center cursor-pointer hover:bg-white/5 relative">
            <input type="file" className="hidden" id="reg-upload" onChange={handleFileUpload} disabled={isExtracting} />
            <label htmlFor="reg-upload" className="cursor-pointer block">
              {isExtracting ? (
                <div className="flex items-center justify-center gap-2 text-brand-400">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm font-medium">Scanning & Extracting Vehicle Specs...</span>
                </div>
              ) : (
                <>
                  <p className="text-brand-400 font-medium">Upload Registration Page (Doc Scanner)</p>
                  <p className="text-xs text-gray-500">Auto-fills Reg No, Engine, Chassis, etc.</p>
                </>
              )}
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input type="text" placeholder="Engine No" className="glass-input rounded p-2 text-white" value={formData.engineNo} onChange={e => setFormData({...formData, engineNo: e.target.value})} />
            <input type="text" placeholder="Chassis No" className="glass-input rounded p-2 text-white" value={formData.chassisNo} onChange={e => setFormData({...formData, chassisNo: e.target.value})} />
          </div>
          
          {showValidationDate && (
            <div className="bg-yellow-500/10 p-3 rounded border border-yellow-500/20">
              <label className="text-xs text-yellow-400 block mb-1">Validation Start Date (Bonded/Afghan)</label>
              <input type="date" className="glass-input rounded p-2 text-white w-full" value={formData.validationStartDate} onChange={e => setFormData({...formData, validationStartDate: e.target.value})} />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
          <button onClick={() => {
             const selectedTransporter = transporters.find((t: Transporter) => t.id === formData.transporterId);
             onSave({ 
               ...formData, 
               transporterName: selectedTransporter?.name || (formData.brokerName ? `${formData.brokerName} (Broker)` : 'Direct Broker')
             });
          }} className="bg-brand-600 text-white px-4 py-2 rounded-lg">Save Vehicle</button>
        </div>
      </div>
    </div>
  );
};

const VehicleProfileModal = ({ 
  vehicle, 
  onClose,
  onCancelVehicle
}: { 
  vehicle: Vehicle; 
  onClose: () => void;
  onCancelVehicle?: (v: Vehicle) => void;
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [directDownloadUrl, setDirectDownloadUrl] = useState<string | null>(null);
  const [directDownloadFilename, setDirectDownloadFilename] = useState<string>('');
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    setDownloadSuccess(null);
    setDownloadError(null);
    try {
      const res = await downloadVehicleDetailsPdf(vehicle);
      setDownloadSuccess(`Vehicle dossier downloaded: ${res.filename}`);
      setDirectDownloadFilename(res.filename);
      setDirectDownloadUrl(res.blobUrl);
    } catch (err) {
      console.error(err);
      setDownloadError('Failed to generate vehicle profile PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in">
      <div className="glass-card w-full max-w-4xl h-[85vh] flex flex-col rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="bg-slate-900/90 p-5 md:p-6 border-b border-white/10 flex flex-wrap justify-between items-center gap-3">
           <div>
             <h2 className="text-2xl font-bold text-white flex items-center gap-3">
               {vehicle.registrationNumber}
               <span className="text-sm font-normal bg-white/10 px-2 py-1 rounded text-gray-300">{vehicle.type}</span>
             </h2>
             <p className="text-gray-400 text-sm mt-1">{vehicle.transporterName} • {vehicle.category}</p>
           </div>
           
           <div className="flex items-center gap-2">
             {vehicle.status === 'CANCELLED' ? (
               <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
                 <Ban size={13} /> De-registered / Cancelled
               </span>
             ) : onCancelVehicle ? (
               <button
                 onClick={() => onCancelVehicle(vehicle)}
                 className="bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all"
                 title="Cancel Vehicle and Generate NOC"
               >
                 <Ban size={14} />
                 <span>Cancel Vehicle (NOC)</span>
               </button>
             ) : null}

             <button
               onClick={handleDownloadPdf}
               disabled={isExporting}
               className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
               title="Download complete vehicle profile dossier as PDF"
             >
               {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
               <span>Download PDF</span>
             </button>
             <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 ml-2"><X size={22}/></button>
           </div>
        </div>

        {/* Status notification banner inside modal */}
        {isExporting && (
          <div className="bg-brand-500/10 border-b border-brand-500/20 px-6 py-2.5 flex items-center gap-3 text-brand-300 text-xs animate-pulse">
            <Loader2 size={16} className="animate-spin text-brand-400 shrink-0" />
            <span>Generating and downloading Vehicle Dossier PDF...</span>
          </div>
        )}

        {downloadSuccess && (
          <div className="bg-emerald-500/15 border-b border-emerald-500/20 px-6 py-2.5 text-xs text-emerald-300 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-emerald-400 shrink-0" />
              <span>{downloadSuccess} — Saved to your device!</span>
            </div>
            {directDownloadUrl && (
              <div className="flex items-center gap-3">
                <a 
                  href={directDownloadUrl} 
                  download={directDownloadFilename}
                  className="inline-flex items-center gap-1 text-emerald-300 underline font-bold"
                >
                  <Download size={12} /> Tap here to download again
                </a>
                <button
                  type="button"
                  onClick={() => setIsPdfViewerOpen(true)}
                  className="inline-flex items-center gap-1 text-white bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded text-[11px] font-semibold border border-white/20 transition-all active:scale-95"
                >
                  <Eye size={12} /> View PDF
                </button>
              </div>
            )}
          </div>
        )}

        {downloadError && (
          <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-2.5 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle size={16} className="text-red-400 shrink-0" />
            <span>{downloadError}</span>
          </div>
        )}
        
        <div className="flex-1 overflow-y-auto p-6">
           {/* Status Cards */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="glass-panel p-4 rounded-xl border border-white/10">
                 <h4 className="text-brand-400 text-xs uppercase font-bold mb-3">Current Status</h4>
                 <div className="text-2xl font-bold text-white mb-1">{vehicle.status.replace('_', ' ')}</div>
                 <div className="text-xs text-gray-500">Last updated: Today</div>
              </div>
              <div className="glass-panel p-4 rounded-xl border border-white/10">
                 <h4 className="text-brand-400 text-xs uppercase font-bold mb-3">DPL Serial</h4>
                 <div className="text-xl font-mono text-white mb-1">{vehicle.dplSerial}</div>
                 <div className="text-xs text-gray-500">Auto-generated</div>
              </div>
              <div className="glass-panel p-4 rounded-xl border border-white/10">
                 <h4 className="text-brand-400 text-xs uppercase font-bold mb-3">Validation</h4>
                 <div className="text-white mb-1">{vehicle.validationExpiryDate || 'N/A'}</div>
                 <div className="text-xs text-gray-500">
                    {vehicle.validationExpiryDate ? 'Expires in 3 months' : 'No expiry set'}
                 </div>
              </div>
           </div>

           {/* Technical & Owner Details */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
             <div className="glass-panel p-5 rounded-xl border border-white/10">
               <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Settings size={18}/> Technical Details</h3>
               <div className="space-y-3 text-sm">
                 <div className="flex justify-between border-b border-white/5 pb-2">
                   <span className="text-gray-400">Engine No</span>
                   <span className="text-white font-mono">{vehicle.engineNo}</span>
                 </div>
                 <div className="flex justify-between border-b border-white/5 pb-2">
                   <span className="text-gray-400">Chassis No</span>
                   <span className="text-white font-mono">{vehicle.chassisNo}</span>
                 </div>
                 <div className="flex justify-between border-b border-white/5 pb-2">
                   <span className="text-gray-400">Make/Model</span>
                   <span className="text-white">{vehicle.makeModel || '-'}</span>
                 </div>
                 <div className="flex justify-between border-b border-white/5 pb-2">
                   <span className="text-gray-400">Registration Date</span>
                   <span className="text-white">{vehicle.registrationDate || '-'}</span>
                 </div>
                 <div className="flex justify-between border-b border-white/5 pb-2">
                   <span className="text-gray-400">Weight Capacity</span>
                   <span className="text-white">{vehicle.weightCapacity || '-'}</span>
                 </div>
               </div>
             </div>

             <div className="glass-panel p-5 rounded-xl border border-white/10">
               <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><User size={18}/> Owner Details</h3>
               <div className="space-y-3 text-sm">
                 <div className="flex justify-between border-b border-white/5 pb-2">
                   <span className="text-gray-400">Owner Name</span>
                   <span className="text-white">{vehicle.ownerName || '-'}</span>
                 </div>
                 <div className="flex justify-between border-b border-white/5 pb-2">
                   <span className="text-gray-400">CNIC</span>
                   <span className="text-white font-mono">{vehicle.ownerCnic || '-'}</span>
                 </div>
                 <div className="flex justify-between border-b border-white/5 pb-2">
                   <span className="text-gray-400">Address</span>
                   <span className="text-white text-right max-w-[200px] truncate" title={vehicle.ownerAddress}>{vehicle.ownerAddress || '-'}</span>
                 </div>
                 {vehicle.ownerIdCardUrl ? (
                   <div className="flex justify-between items-center pt-1">
                     <span className="text-gray-400">Owner ID Card</span>
                     <a 
                       href={vehicle.ownerIdCardUrl} 
                       download={`Owner_CNIC_${vehicle.registrationNumber}.png`} 
                       className="text-emerald-400 hover:text-emerald-300 text-xs font-semibold flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20"
                     >
                       <Download size={12} /> Download ID Card
                     </a>
                   </div>
                 ) : null}
               </div>
             </div>
           </div>

           <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Activity size={18}/> History Log</h3>
           <div className="space-y-4">
              {/* Mock History */}
              <div className="border-l-2 border-brand-500 pl-4 py-1">
                 <p className="text-sm text-white font-medium">Assigned to Case DPL-24-0042</p>
                 <p className="text-xs text-gray-400">2024-05-20 • Trip to Lahore</p>
              </div>
              <div className="border-l-2 border-gray-700 pl-4 py-1">
                 <p className="text-sm text-gray-300">Maintenance: Oil Change</p>
                 <p className="text-xs text-gray-500">2024-04-15 • Workshop</p>
              </div>
              <div className="border-l-2 border-gray-700 pl-4 py-1">
                 <p className="text-sm text-gray-300">Vehicle Registered</p>
                 <p className="text-xs text-gray-500">{vehicle.createdAt} • System Entry</p>
              </div>
           </div>
        </div>
      </div>

      <PdfViewerModal
        isOpen={isPdfViewerOpen}
        onClose={() => setIsPdfViewerOpen(false)}
        pdfUrl={directDownloadUrl}
        filename={directDownloadFilename}
        title="Vehicle Dossier"
      />
    </div>
  );
};

export default VehicleManagement;
