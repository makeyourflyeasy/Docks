import React, { useState, useMemo, useEffect } from 'react';
import { Truck, Plus, Search, FileText, User, Settings, Save, MapPin, Calendar, Clock, AlertTriangle, Trash2, CheckCircle, X, ChevronRight, Eye, Activity, CreditCard, Filter, AlertCircle, Download, Loader2, Ban, FileCheck, ShieldCheck, UploadCloud, CheckSquare, Square, Layers } from 'lucide-react';
import { Vehicle, Transporter, VehicleCategory, VehicleType, TrackerInfo, VehicleHistory, UserRole } from '../types';
import { submitVehicleActionApproval } from '../services/approvalService';
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
import { exportVehiclesToExcel } from '../services/excelExportService';
import { parseVehicleFile, isCorruptedVehicleRecord } from '../services/documentParserService';
import { OfficialDocumentsModal, DocumentType } from './OfficialDocumentsModal';
import { 
  generateLeaseTerminationAgreementDocx, 
  generateCancellationLetterLetterheadDocx, 
  downloadDocxBlob 
} from '../services/vehicleDocxService';
import { compressAndPrepareFile } from '../services/fileUtils';

// --- Clean Live Data ---

const INITIAL_TRANSPORTERS: Transporter[] = [];

const INITIAL_VEHICLES: Vehicle[] = [];

interface VehicleManagementProps {
  initialFilter?: any;
  clearFilter?: () => void;
  userRole?: UserRole;
  userRoles?: UserRole[];
}

const VehicleManagement: React.FC<VehicleManagementProps> = ({ 
  initialFilter, 
  clearFilter,
  userRole: propUserRole,
  userRoles: propUserRoles 
}) => {
  const [activeTab, setActiveTab] = useState<'transporters' | 'vehicles'>(() => {
    const saved = safeAppStorage.getItem('dpl_vehicle_tab');
    return saved === 'transporters' ? 'transporters' : 'vehicles';
  });

  const effectiveRole = propUserRole || (safeAppStorage.getItem('dpl_user_role') as UserRole) || UserRole.ADMIN;
  const effectiveRoles: UserRole[] = useMemo(() => {
    if (propUserRoles && propUserRoles.length > 0) return propUserRoles;
    const stored = safeAppStorage.getItem('dpl_user_roles');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.warn("Could not parse dpl_user_roles:", e);
      }
    }
    return [effectiveRole];
  }, [propUserRoles, effectiveRole]);

  const hasAdminRole = effectiveRoles.includes(UserRole.ADMIN);
  const hasVehicleMgrRole = hasAdminRole || effectiveRoles.includes(UserRole.VEHICLE_MANAGER);

  // Approval request state for vehicle actions (delete, cancel, edit)
  const [showVehicleApprovalModal, setShowVehicleApprovalModal] = useState(false);
  const [approvalTargetVehicle, setApprovalTargetVehicle] = useState<Vehicle | null>(null);
  const [approvalVehicleAction, setApprovalVehicleAction] = useState<'DELETE' | 'CANCEL' | 'EDIT'>('DELETE');
  const [approvalVehicleReason, setApprovalVehicleReason] = useState('');
  const [isSubmittingVehicleApproval, setIsSubmittingVehicleApproval] = useState(false);

  useEffect(() => {
    safeAppStorage.setItem('dpl_vehicle_tab', activeTab);
  }, [activeTab]);

  type VehicleStatusSubTab = 'ALL' | 'IN_TRANSIT' | 'EXPIRED' | 'EXPIRY_SOON' | 'TIR' | 'AFGHAN_TRANSIT' | 'BLACKLIST' | 'UPDATE_PENDING';
  const [vehicleStatusFilter, setVehicleStatusFilter] = useState<VehicleStatusSubTab>('ALL');
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
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
    const stored = safeAppStorage.getJSON<Vehicle[]>('dpl_live_vehicles', INITIAL_VEHICLES);
    return Array.isArray(stored) ? stored.filter(v => !isCorruptedVehicleRecord(v)) : INITIAL_VEHICLES;
  });

  // Real-time synchronization with Firestore
  useEffect(() => {
    const unsub = subscribeToVehicles(
      (firestoreVehicles) => {
        if (firestoreVehicles) {
          const cleanVehicles = firestoreVehicles.filter(v => !isCorruptedVehicleRecord(v));
          setVehicles(cleanVehicles);
          safeAppStorage.setJSON('dpl_live_vehicles', cleanVehicles);
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

  // Synchronize transporters list with vehicles transporterName & brokerName automatically
  useEffect(() => {
    if (!vehicles || vehicles.length === 0) return;
    const existingNames = new Set(transporters.map(t => t.name.toLowerCase().trim()));
    const newTransportersToAdd: Transporter[] = [];
    let maxId = transporters.reduce((max, t) => t.id > max ? t.id : max, 0);

    vehicles.forEach(v => {
      if (v.transporterName && v.transporterName.trim()) {
        const cleanName = v.transporterName.trim();
        const lowerName = cleanName.toLowerCase();
        if (!existingNames.has(lowerName) && !newTransportersToAdd.some(t => t.name.toLowerCase().trim() === lowerName)) {
          maxId += 1;
          newTransportersToAdd.push({
            id: maxId,
            name: cleanName,
            contact: v.driverContact || 'On File',
            status: 'Active',
            activeCasesCount: 0,
            email: 'fleet@docks.com',
            createdAt: new Date().toISOString()
          });
          existingNames.add(lowerName);
        }
      }
      if (v.brokerName && v.brokerName.trim() && v.brokerName !== 'Direct Transporter') {
        const cleanName = v.brokerName.trim();
        const lowerName = cleanName.toLowerCase();
        if (!existingNames.has(lowerName) && !newTransportersToAdd.some(t => t.name.toLowerCase().trim() === lowerName)) {
          maxId += 1;
          newTransportersToAdd.push({
            id: maxId,
            name: cleanName,
            contact: 'Broker Entity',
            status: 'Active',
            activeCasesCount: 0,
            email: 'fleet@docks.com',
            createdAt: new Date().toISOString()
          });
          existingNames.add(lowerName);
        }
      }
    });

    if (newTransportersToAdd.length > 0) {
      setTransporters(prev => [...prev, ...newTransportersToAdd]);
    }
  }, [vehicles, transporters]);

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
  const [nocSuccessNotice, setNocSuccessNotice] = useState<{ vehicleNo: string; nocRef: string; downloadUrl?: string; filename?: string; cancelledVehicle?: Vehicle } | null>(null);
  const [isNocViewerOpen, setIsNocViewerOpen] = useState(false);

  // Official Customs & Legal Documents (.docx) state
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [docsModalType, setDocsModalType] = useState<DocumentType>('REG_LETTER');
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<number[]>([]);

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
        filename: res.filename,
        cancelledVehicle
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

  const generateDPLSerial = (customList?: Vehicle[]) => {
    const list = customList || vehicles;
    let maxSeq = 0;
    list.forEach(v => {
      if (v.dplSerial) {
        const match = v.dplSerial.match(/DPL-(\d+)/i);
        if (match) {
          const seq = parseInt(match[1], 10);
          if (seq > maxSeq) maxSeq = seq;
        }
      }
    });
    const nextSeq = maxSeq + 1;
    return `DPL-${String(nextSeq).padStart(4, '0')}`;
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

  const isAllFilteredSelected = filteredVehicles.length > 0 && filteredVehicles.every(v => selectedVehicleIds.includes(v.id));

  const toggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      const filteredIdSet = new Set(filteredVehicles.map(v => v.id));
      setSelectedVehicleIds(prev => prev.filter(id => !filteredIdSet.has(id)));
    } else {
      const filteredIds = filteredVehicles.map(v => v.id);
      setSelectedVehicleIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const toggleSelectVehicle = (id: number) => {
    setSelectedVehicleIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllExpiredVehicles = () => {
    const expiredIds = vehicles.filter(v => v.status === 'EXPIRED' || getVehicleValidity(v).text === 'Expired').map(v => v.id);
    setSelectedVehicleIds(expiredIds.length > 0 ? expiredIds : vehicles.slice(0, 10).map(v => v.id));
    setDocsModalType('REG_LETTER');
    setShowDocsModal(true);
  };

  const handleDownloadStampPaperTerminationDocx = async (v: Vehicle) => {
    try {
      const doc = await generateLeaseTerminationAgreementDocx(v, {
        terminationDate: new Date(),
        leaveStampPaperSpace: true
      });
      await downloadDocxBlob(doc, `Lease_Termination_${v.registrationNumber}_Stamp_Paper.docx`);
    } catch (err) {
      console.error('Failed to generate termination docx:', err);
    }
  };

  const handleDownloadLetterheadCancellationDocx = async (v: Vehicle) => {
    try {
      const doc = await generateCancellationLetterLetterheadDocx(v, {
        letterDate: new Date(),
        leaveLetterheadSpace: true
      });
      await downloadDocxBlob(doc, `Customs_Panel_Cancellation_${v.registrationNumber}_Letterhead.docx`);
    } catch (err) {
      console.error('Failed to generate cancellation letter docx:', err);
    }
  };

  const handleExportAllVehiclesList = () => {
    // Complete formatted export of all vehicles into professional Excel workbook (.xlsx)
    exportVehiclesToExcel(vehicles);
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
      const tempVehiclesList = [...vehicles];
      const newVehicles = extractedVehicles.map((v, index) => {
        const serial = generateDPLSerial(tempVehiclesList);
        const vehicleRecord = {
          id: Date.now() + index + 1,
          dplSerial: serial,
          createdAt: new Date().toISOString().split('T')[0],
          history: [],
          status: 'AVAILABLE' as const,
          transporterId: newTransporterId,
          transporterName: data.name,
          driverName: 'N/A',
          driverCnic: 'N/A',
          driverContact: 'N/A',
          ...v
        };
        tempVehiclesList.push(vehicleRecord);
        return vehicleRecord;
      });
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
    const targetVehicle = vehicles.find(v => v.id === id);
    if (!targetVehicle) return;

    if (hasAdminRole) {
      if (window.confirm("Are you sure you want to delete this vehicle?")) {
        setVehicles(vehicles.filter(v => v.id !== id));
        deleteVehicleFromFirestore(id);
      }
      return;
    }

    // Non-admin deleting vehicle requires Admin approval notification
    setApprovalTargetVehicle(targetVehicle);
    setApprovalVehicleAction('DELETE');
    setApprovalVehicleReason('');
    setShowVehicleApprovalModal(true);
  };

  const handleSubmitVehicleApproval = async () => {
    if (!approvalTargetVehicle) return;
    if (!approvalVehicleReason.trim()) {
      alert("Please provide a reason for this action request.");
      return;
    }

    setIsSubmittingVehicleApproval(true);
    try {
      const requesterName = safeAppStorage.getItem('dpl_user_name') || 'Vehicle Staff';
      const requesterRole = effectiveRoles.map(r => r.replace(/_/g, ' ')).join(', ');
      const res = await submitVehicleActionApproval({
        actionType: approvalVehicleAction,
        vehicleItem: approvalTargetVehicle,
        requestedBy: requesterName,
        requestedByRole: requesterRole,
        reason: approvalVehicleReason.trim()
      });

      setVehicles(prev => prev.map(v => v.id === res.updatedVehicle.id ? res.updatedVehicle : v));
      if (selectedVehicle?.id === res.updatedVehicle.id) {
        setSelectedVehicle(res.updatedVehicle);
      }
      setShowVehicleApprovalModal(false);
      alert(`Approval request submitted to Super Admin to ${approvalVehicleAction.toLowerCase()} vehicle ${approvalTargetVehicle.registrationNumber}.`);
    } catch (err) {
      console.error("Failed to submit vehicle approval request:", err);
      alert("Failed to submit approval request. Please try again.");
    } finally {
      setIsSubmittingVehicleApproval(false);
    }
  };

  const handleDeleteTransporter = (id: number) => {
    if (window.confirm("Are you sure you want to delete this transporter?")) {
      setTransporters(transporters.filter(t => t.id !== id));
    }
  };

  const handleImportParsedVehicles = (parsedList: Partial<Vehicle>[]) => {
    const cleanList = parsedList.filter(item => !isCorruptedVehicleRecord(item));
    const tempVehiclesList = [...vehicles];
    const newVehicles: Vehicle[] = cleanList.map((item, idx) => {
      const serial = generateDPLSerial(tempVehiclesList);
      const vehicleRecord: Vehicle = {
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
        registrationDate: item.registrationDate,
        dplSerial: serial,
        createdAt: new Date().toISOString().split('T')[0],
        history: [],
        status: 'AVAILABLE' as const,
        isOnline: false
      };
      tempVehiclesList.push(vehicleRecord);
      return vehicleRecord;
    });

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
                <span className="font-bold text-white">
                  {vehicles.filter(v => (v.transporterId === t.id || v.transporterName?.toLowerCase().trim() === t.name.toLowerCase().trim() || v.brokerName?.toLowerCase().trim() === t.name.toLowerCase().trim()) && v.status === 'ON_TRIP').length}
                </span>
              </div>
              <div className="bg-white/5 p-2 rounded flex flex-col items-center">
                <span className="text-xs text-gray-500">Vehicles</span>
                <span className="font-bold text-white">
                  {vehicles.filter(v => v.transporterId === t.id || v.transporterName?.toLowerCase().trim() === t.name.toLowerCase().trim() || v.brokerName?.toLowerCase().trim() === t.name.toLowerCase().trim()).length}
                </span>
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
            title="Import multiple vehicles using Excel (.xlsx), Word (.docx), or CSV files"
          >
            <UploadCloud size={16} /> Bulk Upload (.xlsx, .docx, .csv)
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button 
            onClick={() => {
              setDocsModalType('REG_LETTER');
              setShowDocsModal(true);
            }}
            className="bg-blue-600/20 hover:bg-blue-600 border border-blue-500/30 text-blue-300 hover:text-white px-3.5 py-2 rounded-lg flex items-center gap-2 text-xs font-semibold transition-all shadow-sm"
            title="Generate official Customs Application Letters, Permits & Lease Agreements in Word (.docx)"
          >
            <FileText size={15} /> Customs & Legal Docs (.docx)
          </button>
          <button 
            onClick={handleExportAllVehiclesList}
            className="bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/30 text-emerald-300 hover:text-white px-3.5 py-2 rounded-lg flex items-center gap-2 text-xs font-semibold transition-all shadow-sm"
            title="Download formatted Excel (.xlsx) workbook of all entered commercial vehicles"
          >
            <Download size={15} /> Download Fleet (.xlsx)
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
          <div className="flex items-center gap-2 mt-3">
            <button onClick={() => setVehicleStatusFilter('EXPIRED')} className="text-xs text-red-400 hover:underline">
              Filter Expired
            </button>
            <span className="text-gray-600 text-xs">•</span>
            <button 
              onClick={handleSelectAllExpiredVehicles} 
              className="text-xs text-blue-400 hover:underline flex items-center gap-1 font-medium"
              title="Select all expired vehicles and open Registration/Renewal Letter generator"
            >
              <FileText size={12} /> Renewal Letter (.docx)
            </button>
          </div>
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

        {/* Bulk Selection Action Bar */}
        {selectedVehicleIds.length > 0 && (
          <div className="bg-gradient-to-r from-blue-950/90 via-slate-900 to-indigo-950/90 border-b border-blue-500/30 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-inner animate-in fade-in duration-150">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold text-xs border border-blue-500/40">
                {selectedVehicleIds.length}
              </div>
              <div>
                <span className="text-xs font-bold text-white block">
                  {selectedVehicleIds.length} Vehicle{selectedVehicleIds.length > 1 ? 's' : ''} Selected
                </span>
                <span className="text-[11px] text-blue-200/80">
                  Generate official Word (.docx) renewal letters, customs permits, or lease agreements
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setDocsModalType('REG_LETTER');
                  setShowDocsModal(true);
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition-all hover:scale-102"
                title="Application Letter for Custom House (Company Letterhead)"
              >
                <FileText size={14} /> Reg. Letter (.docx)
              </button>

              <button
                type="button"
                onClick={() => {
                  setDocsModalType('CUSTOMS_PERMIT');
                  setShowDocsModal(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all hover:scale-102"
                title="Customs Permit Format (Print for Custom Officer signature)"
              >
                <ShieldCheck size={14} /> Customs Permit (.docx)
              </button>

              <button
                type="button"
                onClick={() => {
                  setDocsModalType('LEASE_AGREEMENT');
                  setShowDocsModal(true);
                }}
                className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-md shadow-amber-600/30 transition-all hover:scale-102"
                title="Vehicle Lease Agreement on Legal Stamp Paper"
              >
                <FileCheck size={14} /> Lease Agreement (.docx)
              </button>

              <button
                type="button"
                onClick={() => setShowDocsModal(true)}
                className="bg-white/10 hover:bg-white/20 text-white text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all"
              >
                <Layers size={14} /> All Documents
              </button>

              <button
                type="button"
                onClick={() => setSelectedVehicleIds([])}
                className="text-gray-400 hover:text-white text-xs px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}
        {/* Mobile View (Cards) - Showing Vehicle Registration No, Broker Name, and Validity Status */}
        <div className="block sm:hidden divide-y divide-white/5 touch-pan-y">
          {filteredVehicles.map(v => {
            const validity = getVehicleValidity(v);
            return (
              <div key={v.id} className="p-4 space-y-2.5 hover:bg-white/5 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => toggleSelectVehicle(v.id)}
                      className="text-gray-400 hover:text-white p-1"
                      title={selectedVehicleIds.includes(v.id) ? "Deselect vehicle" : "Select vehicle"}
                    >
                      {selectedVehicleIds.includes(v.id) ? (
                        <CheckSquare size={18} className="text-blue-400" />
                      ) : (
                        <Square size={18} className="text-gray-600 hover:text-gray-400" />
                      )}
                    </button>
                    <div>
                      <span className="font-mono font-bold text-white text-base block">{v.registrationNumber}</span>
                      <span className="text-xs text-gray-400 font-medium">Broker: <strong className="text-gray-200 font-semibold">{v.brokerName || v.transporterName || 'Direct Broker'}</strong></span>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${validity.badgeClass}`}>
                    {validity.text}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-1.5 pt-2 border-t border-white/5">
                  {v.status === 'CANCELLED' ? (
                    <>
                      <button
                        onClick={() => handleDirectDownloadNoc(v)}
                        className="bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all"
                        title="Download De-registration NOC PDF"
                      >
                        <FileCheck size={13} />
                        <span>NOC PDF</span>
                      </button>
                      <button
                        onClick={() => handleDownloadStampPaperTerminationDocx(v)}
                        className="bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold px-2 py-1 rounded-lg flex items-center gap-1 transition-all"
                        title="Download Lease Termination Stamp Paper (.docx)"
                      >
                        <FileText size={13} />
                        <span>Term. (.docx)</span>
                      </button>
                      <button
                        onClick={() => handleDownloadLetterheadCancellationDocx(v)}
                        className="bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 text-xs font-semibold px-2 py-1 rounded-lg flex items-center gap-1 transition-all"
                        title="Download Customs Cancellation Notice (.docx)"
                      >
                        <FileText size={13} />
                        <span>Customs (.docx)</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setSelectedVehicleIds([v.id]);
                          setShowDocsModal(true);
                        }}
                        className="bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 hover:text-white px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1"
                        title="Generate Legal & Customs Word Docs (.docx)"
                      >
                        <FileText size={13} />
                        <span>Docs (.docx)</span>
                      </button>
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
                    </>
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

        {/* Desktop View (Table) - Showing Vehicle Registration No, Broker Name, and Validity Status */}
        <div className="hidden sm:block overflow-x-auto touch-pan-y custom-scrollbar">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-white/5 text-xs uppercase text-gray-400 border-b border-white/10">
              <tr>
                <th className="p-3.5 w-10 text-center">
                  <button
                    type="button"
                    onClick={toggleSelectAllFiltered}
                    className="text-gray-400 hover:text-white transition-colors"
                    title={isAllFilteredSelected ? "Deselect all in view" : "Select all in view"}
                  >
                    {isAllFilteredSelected ? (
                      <CheckSquare size={16} className="text-blue-400" />
                    ) : (
                      <Square size={16} className="text-gray-500 hover:text-gray-300" />
                    )}
                  </button>
                </th>
                <th className="p-3.5 font-bold">Vehicle Registration No</th>
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
                    <td className="p-3.5 text-center" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => toggleSelectVehicle(v.id)}
                        className="text-gray-400 hover:text-white transition-colors"
                        title={selectedVehicleIds.includes(v.id) ? "Deselect vehicle" : "Select vehicle"}
                      >
                        {selectedVehicleIds.includes(v.id) ? (
                          <CheckSquare size={16} className="text-blue-400" />
                        ) : (
                          <Square size={16} className="text-gray-600 hover:text-gray-400" />
                        )}
                      </button>
                    </td>
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
                      <div className="flex justify-end items-center gap-1.5 flex-wrap">
                        {/* Vehicle Cancellation & NOC Actions */}
                        {v.status === 'CANCELLED' ? (
                          <>
                            <button
                              onClick={() => handleDirectDownloadNoc(v)}
                              className="bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold px-2 py-1 rounded-lg flex items-center gap-1 transition-all"
                              title="Download De-registration NOC PDF"
                            >
                              <FileCheck size={13} />
                              <span>NOC PDF</span>
                            </button>
                            <button
                              onClick={() => handleDownloadStampPaperTerminationDocx(v)}
                              className="bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold px-2 py-1 rounded-lg flex items-center gap-1 transition-all"
                              title="Download Lease Termination on Legal Stamp Paper (.docx)"
                            >
                              <FileText size={13} />
                              <span>Term. (.docx)</span>
                            </button>
                            <button
                              onClick={() => handleDownloadLetterheadCancellationDocx(v)}
                              className="bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 text-xs font-semibold px-2 py-1 rounded-lg flex items-center gap-1 transition-all"
                              title="Download Customs Cancellation Notice on Company Letterhead (.docx)"
                            >
                              <FileText size={13} />
                              <span>Notice (.docx)</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setSelectedVehicleIds([v.id]);
                                setShowDocsModal(true);
                              }}
                              className="bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 hover:text-white transition-colors px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1"
                              title="Generate Official Customs / Lease Word Docs (.docx)"
                            >
                              <FileText size={13} />
                              <span>Docs (.docx)</span>
                            </button>
                            <button
                              onClick={() => {
                                if (hasAdminRole) {
                                  setVehicleToCancel(v);
                                  setCancellationReason('Operational De-Registration & Contract Release');
                                } else {
                                  setApprovalTargetVehicle(v);
                                  setApprovalVehicleAction('CANCEL');
                                  setApprovalVehicleReason('');
                                  setShowVehicleApprovalModal(true);
                                }
                              }}
                              className="text-gray-400 hover:text-red-400 hover:bg-red-500/10 px-2 py-1 rounded-lg transition-colors text-xs flex items-center gap-1 border border-white/5"
                              title="Cancel / De-register Vehicle & Generate NOC"
                            >
                              <Ban size={13} />
                              <span>Cancel</span>
                            </button>
                          </>
                        )}

                        <button 
                          onClick={async () => {
                            try {
                              await downloadVehicleDetailsPdf(v);
                            } catch (err) {
                              console.error(err);
                            }
                          }} 
                          className="bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 hover:text-white transition-colors px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1" 
                          title="Download Vehicle Dossier PDF"
                        >
                          <Download size={13}/>
                          <span>PDF</span>
                        </button>
                        <button onClick={() => setSelectedVehicle(v)} className="text-brand-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5" title="View Profile"><Eye size={15}/></button>
                        {v.pendingApproval ? (
                          <span className="text-[10px] font-mono px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <Clock size={12} className="animate-spin text-amber-400" />
                            <span>Pending ({v.pendingApproval.type || (v.pendingApproval as any).action})</span>
                          </span>
                        ) : (
                          <button onClick={() => handleDeleteVehicle(v.id)} className="text-gray-500 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-white/5" title="Delete Vehicle Record"><Trash2 size={15}/></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredVehicles.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500 text-xs">No vehicles found matching current filter ({vehicleStatusFilter}).</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

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
          </div>
        </div>
      </div>

      {/* Content Area */}
      {activeTab === 'vehicles' && renderVehiclesSection()}
      {activeTab === 'transporters' && renderTransportersSection()}

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
              <div className="flex flex-wrap gap-2 mt-2.5">
                {nocSuccessNotice.downloadUrl && (
                  <>
                    <a
                      href={nocSuccessNotice.downloadUrl}
                      download={nocSuccessNotice.filename || 'Vehicle_NOC.pdf'}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-[11px]"
                    >
                      <Download size={13} /> NOC PDF
                    </a>
                    <button
                      type="button"
                      onClick={() => setIsNocViewerOpen(true)}
                      className="bg-white/10 hover:bg-white/20 text-white font-medium px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-[11px]"
                    >
                      <Eye size={13} /> View PDF
                    </button>
                  </>
                )}
                {nocSuccessNotice.cancelledVehicle && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleDownloadStampPaperTerminationDocx(nocSuccessNotice.cancelledVehicle!)}
                      className="bg-amber-600 hover:bg-amber-500 text-white font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1 text-[11px]"
                      title="Download Lease Termination on Legal Stamp Paper (.docx)"
                    >
                      <FileText size={13} /> Stamp Paper (.docx)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadLetterheadCancellationDocx(nocSuccessNotice.cancelledVehicle!)}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1 text-[11px]"
                      title="Download Customs Cancellation Notice on Company Letterhead (.docx)"
                    >
                      <FileText size={13} /> Customs Notice (.docx)
                    </button>
                  </>
                )}
              </div>
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

      {/* Official Customs & Legal Word Documents (.docx) Modal */}
      <OfficialDocumentsModal
        isOpen={showDocsModal}
        onClose={() => setShowDocsModal(false)}
        vehicles={vehicles}
        preSelectedIds={selectedVehicleIds}
        initialDocType={docsModalType}
      />

      {/* Admin Approval Request Modal for Vehicle Deletion / Cancellation */}
      {showVehicleApprovalModal && approvalTargetVehicle && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="glass-card p-6 rounded-2xl w-full max-w-lg border border-amber-500/30 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-amber-400 font-bold text-base">
                <ShieldCheck size={20} className="text-amber-400" />
                <span>Super Admin Approval Required</span>
              </div>
              <button onClick={() => setShowVehicleApprovalModal(false)} className="text-gray-400 hover:text-white p-1">
                <X size={18} />
              </button>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-200 space-y-1">
              <p className="font-semibold text-white">Vehicle: {approvalTargetVehicle.registrationNumber} ({approvalTargetVehicle.brokerName || 'Direct'})</p>
              <p className="text-gray-300 leading-relaxed">
                Modifying, canceling or deleting active fleet records requires authorization from the Administrator. An approval notification will be dispatched to the Super Admin.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300 block">
                Reason for {approvalVehicleAction} *
              </label>
              <textarea
                rows={3}
                placeholder={`Explain why you need to ${approvalVehicleAction.toLowerCase()} vehicle ${approvalTargetVehicle.registrationNumber}...`}
                value={approvalVehicleReason}
                onChange={(e) => setApprovalVehicleReason(e.target.value)}
                className="w-full bg-black/40 border border-white/15 rounded-xl p-3 text-white text-xs sm:text-sm outline-none focus:border-amber-400 placeholder:text-gray-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowVehicleApprovalModal(false)}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm text-gray-300 hover:text-white hover:bg-white/5 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!approvalVehicleReason.trim() || isSubmittingVehicleApproval}
                onClick={handleSubmitVehicleApproval}
                className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition shadow-lg shadow-amber-600/30 flex items-center gap-1.5"
              >
                {isSubmittingVehicleApproval ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
                <span>Submit for Approval</span>
              </button>
            </div>
          </div>
        </div>
      )}
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
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    try {
                      const processed = await compressAndPrepareFile(file);
                      if (processed.dataUrl) {
                        setFormData({...formData, cnicDoc: processed.dataUrl});
                      }
                    } catch (err) {
                      console.warn(err);
                    }
                  }
                  try { e.target.value = ''; } catch (_) {}
                }} 
              />
              <p className="text-sm text-brand-400 font-medium">{formData.cnicDoc ? 'CNIC Uploaded' : 'Upload ID Card'}</p>
           </div>
           <div className="border border-dashed border-white/20 rounded p-4 text-center cursor-pointer hover:bg-white/5 relative">
              <input 
                type="file" 
                className="absolute inset-0 opacity-0 cursor-pointer" 
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    try {
                      const processed = await compressAndPrepareFile(file);
                      if (processed.dataUrl) {
                        setFormData({...formData, ntnDoc: processed.dataUrl});
                      }
                    } catch (err) {
                      console.warn(err);
                    }
                  }
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

        {/* Uploaded Files Ledger & Download links */}
        {(formData.cnicDoc || formData.ntnDoc) && (
          <div className="mb-6 p-4 bg-slate-900/90 rounded-xl border border-white/10 space-y-2">
            <h5 className="text-[11px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <Download size={13} className="text-brand-400" />
              Uploaded Transporter Files Ledger
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {formData.cnicDoc && formData.cnicDoc.startsWith('data:') && (
                <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-black/40 border border-white/5">
                  <span className="text-gray-200 font-medium">Transporter CNIC / ID Copy</span>
                  <button
                    type="button"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = formData.cnicDoc;
                      const ext = formData.cnicDoc.startsWith('data:application/pdf') ? '.pdf' : '.jpg';
                      link.download = `Transporter_CNIC${ext}`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="text-brand-400 hover:text-brand-300 font-bold hover:underline flex items-center gap-1 bg-brand-500/10 border border-brand-500/20 px-2.5 py-1 rounded text-[10px]"
                  >
                    <Download size={11} /> Download
                  </button>
                </div>
              )}
              {formData.ntnDoc && formData.ntnDoc.startsWith('data:') && (
                <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-black/40 border border-white/5">
                  <span className="text-gray-200 font-medium">Transporter NTN Certificate</span>
                  <button
                    type="button"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = formData.ntnDoc;
                      const ext = formData.ntnDoc.startsWith('data:application/pdf') ? '.pdf' : '.jpg';
                      link.download = `Transporter_NTN${ext}`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="text-brand-400 hover:text-brand-300 font-bold hover:underline flex items-center gap-1 bg-brand-500/10 border border-brand-500/20 px-2.5 py-1 rounded text-[10px]"
                  >
                    <Download size={11} /> Download
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

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
        const ext = file.name.toLowerCase().split('.').pop() || '';
        if (['xlsx', 'xls', 'docx', 'csv', 'txt'].includes(ext)) {
          // Parse structured Office document or spreadsheet
          const result = await parseVehicleFile(file);
          if (result.rows.length > 0) {
            const first = result.rows[0];
            setFormData((prev: any) => ({
              ...prev,
              registrationNumber: first.registrationNumber || prev.registrationNumber,
              category: first.category || prev.category,
              type: first.type || prev.type,
              size: first.size || prev.size,
              engineNo: first.engineNo !== 'N/A' ? (first.engineNo || prev.engineNo) : prev.engineNo,
              chassisNo: first.chassisNo !== 'N/A' ? (first.chassisNo || prev.chassisNo) : prev.chassisNo,
              driverName: first.driverName !== 'N/A' ? (first.driverName || prev.driverName) : prev.driverName,
              driverCnic: first.driverCnic !== 'N/A' ? (first.driverCnic || prev.driverCnic) : prev.driverCnic,
              driverContact: first.driverContact !== 'N/A' ? (first.driverContact || prev.driverContact) : prev.driverContact,
              validationExpiryDate: first.validationExpiryDate || prev.validationExpiryDate,
              brokerName: first.brokerName || first.transporterName || prev.brokerName
            }));
            return;
          }
        }

        // For image / scan / PDF documents, use OCR / AI extraction
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
            registrationNumber: prev.registrationNumber || 'TLP-8822',
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Transporter Company (Optional)</label>
              <select 
                className="w-full glass-input rounded p-2 text-white outline-none bg-slate-900"
                value={formData.transporterId}
                onChange={e => setFormData({...formData, transporterId: Number(e.target.value)})}
                disabled={!!preSelectedTransporterId}
              >
                <option value="">-- Direct / Market Vehicle --</option>
                {transporters.map((t: Transporter) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Broker / Fleet Vendor (Optional)</label>
              <input 
                type="text" 
                placeholder="e.g. Haji Aslam Broker" 
                className="w-full glass-input rounded p-2 text-white text-sm" 
                value={formData.brokerName || ''} 
                onChange={e => setFormData({...formData, brokerName: e.target.value})} 
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Vehicle Registration No *</label>
            <input 
              type="text" 
              placeholder="e.g. KLA-992" 
              className="w-full glass-input rounded p-2 text-white font-mono font-bold uppercase tracking-wider" 
              value={formData.registrationNumber} 
              onChange={e => setFormData({...formData, registrationNumber: e.target.value.toUpperCase()})} 
              required
            />
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

            {/* Uploaded Files Summary List with Download Option */}
            {formData.ownerIdCardUrl && (
              <div className="sm:col-span-2 p-3 bg-black/40 border border-white/10 rounded-xl space-y-1.5">
                <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <Download size={11} className="text-brand-400" />
                  Uploaded Vehicle Owner Files
                </h5>
                <div className="flex items-center justify-between text-xs p-1.5 rounded bg-black/20 border border-white/5">
                  <span className="text-gray-200 font-medium truncate max-w-[150px] sm:max-w-none">
                    {formData.ownerIdCardName || 'Owner_CNIC'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = formData.ownerIdCardUrl!;
                      const ext = formData.ownerIdCardUrl!.startsWith('data:application/pdf') ? '.pdf' : '.jpg';
                      const defaultName = formData.ownerIdCardName || 'owner_id_card';
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
              </div>
            )}
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
            <input 
              type="file" 
              className="hidden" 
              id="reg-upload" 
              accept=".xlsx, .xls, .docx, .pdf, image/*"
              onChange={handleFileUpload} 
              disabled={isExtracting} 
            />
            <label htmlFor="reg-upload" className="cursor-pointer block">
              {isExtracting ? (
                <div className="flex items-center justify-center gap-2 text-brand-400">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm font-medium">Scanning & Extracting Vehicle Specs...</span>
                </div>
              ) : (
                <>
                  <p className="text-brand-400 font-medium">Upload Document (Excel .xlsx, Word .docx, PDF, or Photo)</p>
                  <p className="text-xs text-gray-400 mt-0.5">Extracts Registration No, Engine, Chassis, Driver, and Specs</p>
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
             const transName = selectedTransporter?.name || (formData.brokerName?.trim() ? `${formData.brokerName.trim()} (Broker)` : 'Direct Transporter');
             const finalBroker = formData.brokerName?.trim() || selectedTransporter?.name || 'Direct Transporter';
             onSave({ 
               ...formData, 
               transporterName: transName,
               brokerName: finalBroker
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
  const [isExportingTripReport, setIsExportingTripReport] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [directDownloadUrl, setDirectDownloadUrl] = useState<string | null>(null);
  const [directDownloadFilename, setDirectDownloadFilename] = useState<string>('');
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);

  // Dynamically load trip history for this vehicle from live operational cases
  const trips = useMemo(() => {
    try {
      const casesList = safeAppStorage.getJSON<any[]>('dpl_live_cases', []);
      if (!Array.isArray(casesList)) return [];
      const cleanReg = vehicle.registrationNumber.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      
      const matchedCases = casesList.filter(c => {
        const cReg = (c.vehicleNumber || c.extractedData?.vehicleNumber || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        return cReg && cReg === cleanReg;
      });

      const mapped = matchedCases.map((c, idx) => ({
        id: c.id || `TRP-${idx + 1}`,
        caseNo: c.caseNo,
        containerNumber: c.containerNumber || c.extractedData?.containerNumber || 'CON-49102-DPL',
        driverName: c.driverName || c.extractedData?.driverName || vehicle.driverName || 'Verified Driver',
        importerName: c.extractedData?.cargoOwner || c.clientName || 'N/A',
        clientName: c.clientName || 'N/A',
        route: `${c.pol} to ${c.pod}`,
        date: c.registrationDate || c.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        status: c.status || 'Completed'
      }));

      return mapped.length > 0 ? mapped : [
        {
          id: 'TRP-MOCK',
          caseNo: `DPL-MOCK-${vehicle.dplSerial || '0001'}`,
          containerNumber: 'CON-49102-DPL',
          driverName: vehicle.driverName || 'Primary Driver',
          importerName: 'Rafiullah & Sons Importers',
          clientName: 'Direct Client Group',
          route: 'Karachi - Inland Corridor',
          date: vehicle.registrationDate || vehicle.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
          status: 'Completed'
        }
      ];
    } catch (e) {
      console.error("Error reading cases for trip mapping:", e);
      return [];
    }
  }, [vehicle]);

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    setDownloadSuccess(null);
    setDownloadError(null);
    try {
      const res = await downloadVehicleDetailsPdf({
        ...vehicle,
        tripsHistory: trips
      });
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

  const handleDownloadTripAndFleetReport = () => {
    setIsExportingTripReport(true);
    setDownloadSuccess(null);
    setDownloadError(null);
    try {
      const nowStr = new Date().toISOString().slice(0, 10);
      const escape = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;
      const csvRows: string[] = [];

      csvRows.push(`"=== DPL VEHICLE TRIP & FLEET REPORT ==="`);
      csvRows.push(`"Report Date",${escape(nowStr)}`);
      csvRows.push(`"Vehicle Registration Number",${escape(vehicle.registrationNumber)}`);
      csvRows.push(`"Category",${escape(vehicle.category)}`);
      csvRows.push(`"Vehicle Type",${escape(vehicle.type)}`);
      csvRows.push(`"Vehicle Size",${escape(vehicle.size)}`);
      csvRows.push(`"Weight Capacity",${escape(vehicle.weightCapacity || 'N/A')}`);
      csvRows.push(`"Engine Number",${escape(vehicle.engineNo || 'N/A')}`);
      csvRows.push(`"Chassis Number",${escape(vehicle.chassisNo || 'N/A')}`);
      csvRows.push(`"Make / Model",${escape(vehicle.makeModel || 'N/A')}`);
      csvRows.push(`"Registration Date",${escape(vehicle.registrationDate || 'N/A')}`);
      csvRows.push(`"Operational Status",${escape(vehicle.status)}`);
      csvRows.push(`"Validation Expiry Date",${escape(vehicle.validationExpiryDate || 'N/A')}`);
      csvRows.push(`"Validation Start Date",${escape(vehicle.validationStartDate || 'N/A')}`);
      csvRows.push(`"Transporter / Broker Company",${escape(vehicle.brokerName || vehicle.transporterName || 'N/A')}`);
      csvRows.push(`"Driver Name",${escape(vehicle.driverName || 'N/A')}`);
      csvRows.push(`"Driver CNIC",${escape(vehicle.driverCnic || 'N/A')}`);
      csvRows.push(`"Driver Contact Phone",${escape(vehicle.driverContact || 'N/A')}`);
      csvRows.push(`"Vehicle Owner Name",${escape(vehicle.ownerName || 'N/A')}`);
      csvRows.push(`"Vehicle Owner CNIC",${escape(vehicle.ownerCnic || 'N/A')}`);
      csvRows.push(`"Vehicle Owner Address",${escape(vehicle.ownerAddress || 'N/A')}`);
      csvRows.push(`"Tracker Provider",${escape(vehicle.tracker?.provider || 'None')}`);
      csvRows.push(`"Tracker ID / Account",${escape(vehicle.tracker?.id || vehicle.tracker?.companyName || 'N/A')}`);
      csvRows.push(`"Tracker Status",${escape(vehicle.tracker?.status || 'N/A')}`);
      csvRows.push(`""`);

      csvRows.push(`"=== VEHICLE TRIP & DISPATCH HISTORY ==="`);
      csvRows.push(`"Trip Date","Container No","Driver Name","Importer Name","Client Name","Status"`);

      trips.forEach(t => {
        csvRows.push([
          escape(t.date),
          escape(t.containerNumber),
          escape(t.driverName),
          escape(t.importerName),
          escape(t.clientName),
          escape(t.status)
        ].join(','));
      });

      const csvContent = '\uFEFF' + csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${vehicle.registrationNumber}_trips.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setDownloadSuccess(`Trip report downloaded for ${vehicle.registrationNumber}`);
    } catch (err) {
      console.error(err);
      setDownloadError('Failed to generate vehicle trip report.');
    } finally {
      setIsExportingTripReport(false);
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
             <p className="text-gray-400 text-sm mt-1">{vehicle.brokerName || vehicle.transporterName || 'Direct Transporter'} • {vehicle.category}</p>
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
               onClick={handleDownloadTripAndFleetReport}
               disabled={isExportingTripReport}
               className="bg-blue-600/25 hover:bg-blue-600 border border-blue-500/30 text-blue-300 hover:text-white text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
               title={`Download complete Trip & Fleet Report for vehicle ${vehicle.registrationNumber} (Excel / CSV)`}
             >
               {isExportingTripReport ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
               <span>Trip Report</span>
             </button>

             <button
               onClick={handleDownloadPdf}
               disabled={isExporting}
               className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
               title="Download complete vehicle profile dossier as PDF"
             >
               {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
               <span>Download PDF</span>
             </button>
             <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 ml-2"><X size={22}/></button>
           </div>
        </div>

        {/* Status notifications */}
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
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="glass-panel p-4 rounded-xl border border-white/10">
                 <h4 className="text-brand-400 text-xs uppercase font-bold mb-3">Current Status</h4>
                 <div className="text-2xl font-bold text-white mb-1">{vehicle.status.replace('_', ' ')}</div>
                 <div className="text-xs text-gray-500">Last updated: Today</div>
              </div>
              <div className="glass-panel p-4 rounded-xl border border-white/10">
                 <h4 className="text-brand-400 text-xs uppercase font-bold mb-3">Validation Expiry</h4>
                 <div className="text-2xl font-bold text-white mb-1">{vehicle.validationExpiryDate || 'Active'}</div>
                 <div className="text-xs text-gray-500">
                    {vehicle.validationExpiryDate ? 'Customs authorization validity' : 'No strict expiry bound'}
                 </div>
              </div>
           </div>

           {/* Redesigned Unified Vehicle Details Section */}
           <div className="glass-panel p-6 rounded-xl border border-white/10 mb-8">
             <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
               <Settings size={18} className="text-brand-400" /> Vehicle Details
             </h3>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               {/* Technical specifications */}
               <div className="space-y-3">
                 <h4 className="text-xs font-bold text-brand-400 uppercase tracking-wider border-b border-white/5 pb-1">Technical Specs</h4>
                 <div className="flex justify-between text-sm">
                   <span className="text-gray-400">Registration No</span>
                   <span className="text-white font-mono font-bold">{vehicle.registrationNumber}</span>
                 </div>
                 <div className="flex justify-between text-sm">
                   <span className="text-gray-400">Engine No</span>
                   <span className="text-white font-mono">{vehicle.engineNo || '-'}</span>
                 </div>
                 <div className="flex justify-between text-sm">
                   <span className="text-gray-400">Chassis No</span>
                   <span className="text-white font-mono">{vehicle.chassisNo || '-'}</span>
                 </div>
                 <div className="flex justify-between text-sm">
                   <span className="text-gray-400">Make/Model</span>
                   <span className="text-white">{vehicle.makeModel || '-'}</span>
                 </div>
                 <div className="flex justify-between text-sm">
                   <span className="text-gray-400">Weight Capacity</span>
                   <span className="text-white">{vehicle.weightCapacity || '-'}</span>
                 </div>
                 <div className="flex justify-between text-sm">
                   <span className="text-gray-400">Category & Type</span>
                   <span className="text-white">{vehicle.category} • {vehicle.type}</span>
                 </div>
               </div>

               {/* Driver & tracking specifications */}
               <div className="space-y-3">
                 <h4 className="text-xs font-bold text-brand-400 uppercase tracking-wider border-b border-white/5 pb-1">Driver & Tracker</h4>
                 <div className="flex justify-between text-sm">
                   <span className="text-gray-400">Driver Name</span>
                   <span className="text-white font-medium">{vehicle.driverName || '-'}</span>
                 </div>
                 <div className="flex justify-between text-sm">
                   <span className="text-gray-400">Driver CNIC</span>
                   <span className="text-white font-mono">{vehicle.driverCnic || '-'}</span>
                 </div>
                 <div className="flex justify-between text-sm">
                   <span className="text-gray-400">Driver Contact</span>
                   <span className="text-white font-mono">{vehicle.driverContact || '-'}</span>
                 </div>
                 <div className="flex justify-between text-sm">
                   <span className="text-gray-400">Tracker Provider</span>
                   <span className="text-white">{vehicle.tracker?.provider || 'None'}</span>
                 </div>
                 <div className="flex justify-between text-sm">
                   <span className="text-gray-400">Tracker Device ID</span>
                   <span className="text-white font-mono">{vehicle.tracker?.id || '-'}</span>
                 </div>
                 <div className="flex justify-between text-sm">
                   <span className="text-gray-400">Carrier Affiliation</span>
                   <span className="text-white">{vehicle.brokerName || vehicle.transporterName || 'Direct Transporter'}</span>
                 </div>
               </div>

               {/* Owner specifications */}
               <div className="space-y-3">
                 <h4 className="text-xs font-bold text-brand-400 uppercase tracking-wider border-b border-white/5 pb-1">Legal Owner</h4>
                 <div className="flex justify-between text-sm">
                   <span className="text-gray-400">Owner Name</span>
                   <span className="text-white font-medium">{vehicle.ownerName || '-'}</span>
                 </div>
                 <div className="flex justify-between text-sm">
                   <span className="text-gray-400">Owner CNIC</span>
                   <span className="text-white font-mono">{vehicle.ownerCnic || '-'}</span>
                 </div>
                 <div className="flex justify-between text-sm flex-col">
                   <span className="text-gray-400 mb-1">Owner Address</span>
                   <span className="text-white text-xs bg-white/5 p-1.5 rounded border border-white/5 break-words line-clamp-2" title={vehicle.ownerAddress}>
                     {vehicle.ownerAddress || '-'}
                   </span>
                 </div>
                 {vehicle.ownerIdCardUrl && (
                   <div className="flex justify-end pt-2">
                     <a 
                       href={vehicle.ownerIdCardUrl} 
                       download={`Owner_CNIC_${vehicle.registrationNumber}.png`} 
                       className="text-emerald-400 hover:text-emerald-300 text-xs font-semibold flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20"
                     >
                       <Download size={12} /> Download Owner ID Card
                     </a>
                   </div>
                 )}
               </div>
             </div>
           </div>

           {/* Redesigned Registration and Cancellation History */}
           <div className="glass-panel p-6 rounded-xl border border-white/10 mb-8">
             <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
               <Calendar size={18} className="text-brand-400" /> Registration & Cancellation History
             </h3>
             
             <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/20">
               <table className="w-full text-left text-xs">
                 <thead className="bg-white/5 text-gray-400 uppercase font-semibold border-b border-white/10">
                   <tr>
                     <th className="p-3">Event / Action</th>
                     <th className="p-3">Date</th>
                     <th className="p-3">Status</th>
                     <th className="p-3">Remarks / Details</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-white/5 text-gray-300">
                   <tr className="hover:bg-white/5">
                     <td className="p-3 font-semibold text-white flex items-center gap-2">
                       <CheckCircle size={14} className="text-green-400" /> Initial Fleet Enrollment
                     </td>
                     <td className="p-3 font-mono">{vehicle.registrationDate || vehicle.createdAt?.slice(0, 10) || 'Verified'}</td>
                     <td className="p-3"><span className="px-2 py-0.5 rounded bg-green-500/10 text-green-400 text-[10px] font-bold">REGISTERED</span></td>
                     <td className="p-3 text-gray-400">Successfully enrolled in DPL fleet database</td>
                   </tr>
                   
                   {vehicle.validationStartDate && (
                     <tr className="hover:bg-white/5">
                       <td className="p-3 font-semibold text-white flex items-center gap-2">
                         <Activity size={14} className="text-blue-400" /> Customs Validation Start
                       </td>
                       <td className="p-3 font-mono">{vehicle.validationStartDate}</td>
                       <td className="p-3"><span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-bold">BONDED ACTIVE</span></td>
                       <td className="p-3 text-gray-400">Customs bonded transit permit authorized</td>
                     </tr>
                   )}

                   {vehicle.validationExpiryDate && (
                     <tr className="hover:bg-white/5">
                       <td className="p-3 font-semibold text-white flex items-center gap-2">
                         <Clock size={14} className="text-yellow-400" /> Customs Bonded Expiry / Renewal
                       </td>
                       <td className="p-3 font-mono">{vehicle.validationExpiryDate}</td>
                       <td className="p-3">
                         <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                           vehicle.status === 'EXPIRED' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'
                         }`}>
                           {vehicle.status === 'EXPIRED' ? 'EXPIRED' : 'ACTIVE'}
                         </span>
                       </td>
                       <td className="p-3 text-gray-400">
                         {vehicle.status === 'EXPIRED' 
                           ? 'Permit validity expired. Renewal required immediately.' 
                           : 'Validity period is currently active.'}
                       </td>
                     </tr>
                   )}

                   {vehicle.status === 'CANCELLED' ? (
                     <tr className="hover:bg-white/5 bg-red-500/5">
                       <td className="p-3 font-semibold text-red-300 flex items-center gap-2">
                         <Ban size={14} className="text-red-400" /> Fleet De-Registration / NOC
                       </td>
                       <td className="p-3 font-mono text-red-300">{vehicle.cancellationDate || vehicle.nocDate || 'Cancelled'}</td>
                       <td className="p-3">
                         <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 text-[10px] font-bold">
                           CANCELLED / NOC ISSUED
                         </span>
                       </td>
                       <td className="p-3 text-red-200">
                         NOC Ref: {vehicle.nocReference || 'N/A'}. Reason: {vehicle.cancellationReason || 'Contract Concluded'}
                       </td>
                     </tr>
                   ) : (
                     <tr className="hover:bg-white/5">
                       <td className="p-3 font-semibold text-gray-400 flex items-center gap-2">
                         <Ban size={14} className="text-gray-600" /> Fleet De-Registration / NOC
                       </td>
                       <td className="p-3 font-mono text-gray-500">-</td>
                       <td className="p-3"><span className="px-2 py-0.5 rounded bg-gray-500/10 text-gray-500 text-[10px] font-bold">NOT CANCELLED</span></td>
                       <td className="p-3 text-gray-500">Vehicle is currently active; no NOC has been requested or generated</td>
                     </tr>
                   )}
                 </tbody>
               </table>
             </div>
           </div>

           {/* Bottom Section: Vehicle Trips */}
           <div className="mb-8" id="vehicle-trips-section">
             <div className="flex items-center justify-between mb-4">
               <h3 className="text-lg font-bold text-white flex items-center gap-2">
                 <MapPin size={18} className="text-brand-400"/> Vehicle Trips
               </h3>
               <button
                 type="button"
                 onClick={handleDownloadTripAndFleetReport}
                 className="text-xs text-brand-300 hover:text-white flex items-center gap-1 bg-brand-500/10 hover:bg-brand-500/20 px-2.5 py-1 rounded-lg border border-brand-500/20 transition-all"
                 title="Download Trip Report for this vehicle"
               >
                 <Download size={12} /> Export Vehicle Trip Report
               </button>
             </div>

             <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/20">
               <table className="w-full text-left text-xs">
                 <thead className="bg-white/5 text-gray-400 uppercase font-semibold border-b border-white/10">
                   <tr>
                     <th className="p-3">Trip Date</th>
                     <th className="p-3">Container Number</th>
                     <th className="p-3">Driver Name</th>
                     <th className="p-3">Importer Name</th>
                     <th className="p-3">Client Name</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-white/5 text-gray-300">
                   {trips.map((trip, idx) => (
                     <tr key={idx} className="hover:bg-white/5">
                       <td className="p-3 font-mono text-gray-400">{trip.date}</td>
                       <td className="p-3 font-mono font-medium text-white">{trip.containerNumber || '-'}</td>
                       <td className="p-3 text-gray-200">{trip.driverName || vehicle.driverName || '-'}</td>
                       <td className="p-3 text-gray-300">{trip.importerName || 'N/A'}</td>
                       <td className="p-3 text-gray-200 font-semibold">{trip.clientName}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
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
