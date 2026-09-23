import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Briefcase, Truck, Edit, Trash2, Key, Save, X, CheckCircle, 
  AlertTriangle, Eye, FileText, CreditCard, ChevronRight, Calendar, DollarSign, 
  Clock, Plus, Shield, Phone, MapPin, Building, Percent, Upload, Check, 
  Receipt, ArrowUpRight, ArrowDownLeft, LayoutGrid, List, Search, Mail, ChevronLeft,
  Coffee, ShieldCheck, MapPinned, Lock, Unlock, Compass, Download
} from 'lucide-react';
import { 
  AppUser, UserRole, Case, FinanceEntry, Client, DestinationStaff, StaffLedgerEntry 
} from '../types';
import { safeAppStorage } from '../services/storage';
import { compressAndPrepareFile } from '../services/fileUtils';
import { 
  saveUserToFirestore, 
  deleteUserFromFirestore, 
  subscribeToUsers, 
  subscribeToClients, 
  saveClientToFirestore, 
  deleteClientFromFirestore,
  subscribeToDestinationStaff, 
  deleteDestinationStaffFromFirestore, 
  subscribeToStaffLedgers, 
  subscribeToCases, 
  subscribeToFinances, 
  DEFAULT_DATABASE_USERS,
  syncMonthlyStaffSalariesToPayables 
} from '../services/dbService';

import { ClientRegistrationModal } from './ClientRegistrationModal';
import { StaffLedgerModal } from './StaffLedgerModal';
import { ClientLedgerModal } from './ClientLedgerModal';
import { DestinationStaffModal } from './DestinationStaffModal';

export const CASE_CATEGORIES = [
  "Afghan Transit",
  "Bonded Carrier",
  "Customs Clearance",
  "TIR",
  "Transportation of Private Cargo",
  "Warehousing & Distribution"
];

const UserManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'office' | 'clients' | 'transporters' | 'destinations'>(() => {
    return (safeAppStorage.getItem('dpl_user_tab') as any) || 'office';
  });

  const [destSubTab, setDestSubTab] = useState<'agents' | 'users'>('agents');

  useEffect(() => {
    safeAppStorage.setItem('dpl_user_tab', activeTab);
  }, [activeTab]);

  // Live state from Firestore subscriptions
  const [users, setUsers] = useState<AppUser[]>(DEFAULT_DATABASE_USERS);
  const [clientsList, setClientsList] = useState<Client[]>([]);
  const [destinationStaffList, setDestinationStaffList] = useState<DestinationStaff[]>([]);
  const [staffLedgerEntries, setStaffLedgerEntries] = useState<StaffLedgerEntry[]>([]);
  const [casesList, setCasesList] = useState<Case[]>([]);
  const [financesList, setFinancesList] = useState<FinanceEntry[]>([]);

  // Subscribe to real-time collections
  useEffect(() => {
    const unsubUsers = subscribeToUsers((data) => {
      if (data && data.length > 0) {
        setUsers(data);
        syncMonthlyStaffSalariesToPayables(data).catch(() => {});
      }
    });

    const unsubClients = subscribeToClients((data) => {
      setClientsList(data || []);
    });

    const unsubDest = subscribeToDestinationStaff((data) => {
      setDestinationStaffList(data || []);
    });

    const unsubLedgers = subscribeToStaffLedgers((data) => {
      setStaffLedgerEntries(data || []);
    });

    const unsubCases = subscribeToCases((data) => {
      setCasesList(data || []);
    });

    const unsubFinances = subscribeToFinances((data) => {
      setFinancesList(data || []);
    });

    return () => {
      unsubUsers();
      unsubClients();
      unsubDest();
      unsubLedgers();
      unsubCases();
      unsubFinances();
    };
  }, []);

  // Search & View Mode
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => {
    return typeof window !== 'undefined' && window.innerWidth < 768 ? 'cards' : 'table';
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Modals Flow
  const [showRoleSelectorModal, setShowRoleSelectorModal] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedOnboardingRole, setSelectedOnboardingRole] = useState<'STAFF' | 'TRANSPORTER' | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | string | null>(null);

  // Client modals
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [ledgerClient, setLedgerClient] = useState<Client | null>(null);

  // Staff ledger modal
  const [selectedStaffUser, setSelectedStaffUser] = useState<AppUser | null>(null);

  // Destination staff modal
  const [showDestinationModal, setShowDestinationModal] = useState(false);
  const [destinationStaffToEdit, setDestinationStaffToEdit] = useState<DestinationStaff | null>(null);

  // Delete Confirmation State
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'USER' | 'CLIENT' | 'DESTINATION';
    id: string | number;
    name: string;
  } | null>(null);

  // Form State for Staff & Transporter/Broker
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contact: '',
    role: '' as UserRole | '',
    roles: [] as UserRole[],
    designation: '',
    generatedId: '',
    generatedPass: '',
    profilePicture: '',
    fatherName: '',
    residentialAddress: '',
    secondaryPhone: '',
    secondaryPhoneRelation: '',
    cnicFront: '',
    cnicBack: '',
    baseSalary: 50000,
    allowanceMobile: 2000,
    allowanceFuel: 5000,
    allowanceInternet: 2000,
    loansAdvances: 0,
    // Transporter/Broker fields
    representativeName: '',
    fleetSize: 1,
    containerCompatibility: ['20ft', '40ft'] as string[],
    preferredRoutes: 'Karachi - Lahore - Peshawar',
    ntn: '',
    officeAddress: '',
    whatsappNumber: ''
  });

  // Open primary create button
  const handleOpenAdd = () => {
    if (activeTab === 'clients') {
      setClientToEdit(null);
      setShowClientModal(true);
      return;
    }
    if (activeTab === 'destinations') {
      if (destSubTab === 'users') {
        handleSelectRoleType('STAFF', [UserRole.UNLOADING_PORT_STAFF]);
      } else {
        setDestinationStaffToEdit(null);
        setShowDestinationModal(true);
      }
      return;
    }
    if (activeTab === 'transporters') {
      handleSelectRoleType('TRANSPORTER');
      return;
    }
    // Default office
    handleSelectRoleType('STAFF');
  };

  const handleSelectRoleType = (roleType: 'STAFF' | 'TRANSPORTER', defaultRolesOverride?: UserRole[]) => {
    setSelectedOnboardingRole(roleType);
    setShowRoleSelectorModal(false);
    setIsEditing(false);
    setEditingId(null);

    const prefix = roleType === 'TRANSPORTER' ? 'TRP-' : 'EMP-';
    const existingIds = users
      .map(u => u.userId)
      .filter(id => id && id.startsWith(prefix))
      .map(id => parseInt(id!.split('-')[1]) || 0);
    const nextNum = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
    const generatedId = `${prefix}${nextNum.toString().padStart(4, '0')}`;
    const generatedPass = Math.random().toString(36).slice(-8).toUpperCase();

    const finalRoles = defaultRolesOverride || (roleType === 'TRANSPORTER' ? [UserRole.TRANSPORTER] : [UserRole.OPERATIONS_MANAGER]);
    const finalRole = finalRoles[0];

    setFormData({
      name: '',
      email: '',
      contact: '',
      role: finalRole,
      roles: finalRoles,
      designation: roleType === 'STAFF' && defaultRolesOverride?.includes(UserRole.UNLOADING_PORT_STAFF) ? 'Destination Representative' : '',
      generatedId,
      generatedPass,
      profilePicture: '',
      fatherName: '',
      residentialAddress: '',
      secondaryPhone: '',
      secondaryPhoneRelation: '',
      cnicFront: '',
      cnicBack: '',
      baseSalary: 50000,
      allowanceMobile: 2000,
      allowanceFuel: 5000,
      allowanceInternet: 2000,
      loansAdvances: 0,
      representativeName: '',
      fleetSize: 1,
      containerCompatibility: ['20ft', '40ft'],
      preferredRoutes: 'Karachi - Lahore - Peshawar',
      ntn: '',
      officeAddress: '',
      whatsappNumber: ''
    });

    if (roleType === 'TRANSPORTER') setActiveTab('transporters');
    else if (defaultRolesOverride?.includes(UserRole.UNLOADING_PORT_STAFF)) setActiveTab('destinations');
    else setActiveTab('office');

    setShowModal(true);
  };

  const handleEditUser = (user: AppUser) => {
    const isTransporter = user.role === UserRole.TRANSPORTER;
    const roleType = isTransporter ? 'TRANSPORTER' : 'STAFF';
    setSelectedOnboardingRole(roleType);

    const userRoles = (user.roles && user.roles.length > 0) ? user.roles : (user.role ? [user.role] : [UserRole.OPERATIONS_MANAGER]);

    setFormData({
      name: user.name,
      email: user.email,
      contact: user.contact,
      role: user.role,
      roles: userRoles,
      designation: user.designation || '',
      generatedId: user.userId || '',
      generatedPass: user.password || '',
      profilePicture: user.profilePicture || '',
      fatherName: user.fatherName || '',
      residentialAddress: user.residentialAddress || '',
      secondaryPhone: user.secondaryPhone || '',
      secondaryPhoneRelation: user.secondaryPhoneRelation || '',
      cnicFront: user.cnicFront || '',
      cnicBack: user.cnicBack || '',
      baseSalary: user.baseSalary || 50000,
      allowanceMobile: user.allowances?.mobile || 0,
      allowanceFuel: user.allowances?.fuel || 0,
      allowanceInternet: user.allowances?.internet || 0,
      loansAdvances: user.loansAdvances || 0,
      representativeName: (user as any).representativeName || '',
      fleetSize: (user as any).fleetSize || 1,
      containerCompatibility: (user as any).containerCompatibility || ['20ft', '40ft'],
      preferredRoutes: (user as any).preferredRoutes || 'Karachi - Lahore - Peshawar',
      ntn: (user as any).ntn || '',
      officeAddress: (user as any).officeAddress || '',
      whatsappNumber: (user as any).whatsappNumber || ''
    });

    setIsEditing(true);
    setEditingId(user.id);
    setShowModal(true);
  };

  const handleSaveUser = async () => {
    if (!formData.name.trim()) {
      alert("Please enter the name / company name.");
      return;
    }

    const assignedRoles = selectedOnboardingRole === 'TRANSPORTER' 
      ? [UserRole.TRANSPORTER] 
      : (formData.roles && formData.roles.length > 0 ? formData.roles : [formData.role || UserRole.OPERATIONS_MANAGER]);
    const primaryRole = assignedRoles[0] || UserRole.OPERATIONS_MANAGER;

    if (isEditing && editingId) {
      const updatedUser: AppUser = {
        id: Number(editingId) || Date.now(),
        name: formData.name.trim(),
        email: formData.email.trim(),
        contact: formData.contact.trim(),
        role: primaryRole as UserRole,
        roles: assignedRoles as UserRole[],
        designation: formData.designation.trim(),
        status: 'ACTIVE',
        isAdmin: assignedRoles.includes(UserRole.ADMIN),
        userId: formData.generatedId.trim(),
        password: formData.generatedPass.trim(),
        profilePicture: formData.profilePicture,
        fatherName: formData.fatherName,
        residentialAddress: formData.residentialAddress,
        secondaryPhone: formData.secondaryPhone,
        secondaryPhoneRelation: formData.secondaryPhoneRelation,
        cnicFront: formData.cnicFront,
        cnicBack: formData.cnicBack,
        baseSalary: formData.baseSalary,
        allowances: {
          fuel: formData.allowanceFuel,
          mobile: formData.allowanceMobile,
          internet: formData.allowanceInternet
        },
        loansAdvances: formData.loansAdvances,
        ...((selectedOnboardingRole === 'TRANSPORTER') ? {
          representativeName: formData.representativeName,
          fleetSize: formData.fleetSize,
          containerCompatibility: formData.containerCompatibility,
          preferredRoutes: formData.preferredRoutes,
          ntn: formData.ntn,
          officeAddress: formData.officeAddress,
          whatsappNumber: formData.whatsappNumber
        } : {})
      } as any;

      setUsers(prev => prev.map(u => String(u.id) === String(editingId) ? updatedUser : u));
      try {
        await saveUserToFirestore(updatedUser);
      } catch (err) {
        console.warn("Notice: User saved locally", err);
      }
    } else {
      const newUser: AppUser = {
        id: Date.now(),
        name: formData.name.trim(),
        email: formData.email.trim(),
        contact: formData.contact.trim(),
        role: primaryRole as UserRole,
        roles: assignedRoles as UserRole[],
        designation: formData.designation.trim(),
        status: 'ACTIVE',
        isAdmin: assignedRoles.includes(UserRole.ADMIN),
        userId: formData.generatedId.trim(),
        password: formData.generatedPass.trim(),
        profilePicture: formData.profilePicture,
        fatherName: formData.fatherName,
        residentialAddress: formData.residentialAddress,
        secondaryPhone: formData.secondaryPhone,
        secondaryPhoneRelation: formData.secondaryPhoneRelation,
        cnicFront: formData.cnicFront,
        cnicBack: formData.cnicBack,
        baseSalary: formData.baseSalary,
        allowances: {
          fuel: formData.allowanceFuel,
          mobile: formData.allowanceMobile,
          internet: formData.allowanceInternet
        },
        loansAdvances: formData.loansAdvances,
        ...((selectedOnboardingRole === 'TRANSPORTER') ? {
          representativeName: formData.representativeName,
          fleetSize: formData.fleetSize,
          containerCompatibility: formData.containerCompatibility,
          preferredRoutes: formData.preferredRoutes,
          ntn: formData.ntn,
          officeAddress: formData.officeAddress,
          whatsappNumber: formData.whatsappNumber
        } : {})
      } as any;

      setUsers(prev => [...prev, newUser]);
      try {
        await saveUserToFirestore(newUser);
      } catch (err) {
        console.warn("Notice: User saved locally", err);
      }
    }

    setShowModal(false);
  };

  const confirmDeleteTarget = async () => {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === 'USER') {
        setUsers(users.filter(u => String(u.id) !== String(deleteTarget.id)));
        await deleteUserFromFirestore(deleteTarget.id);
      } else if (deleteTarget.type === 'CLIENT') {
        setClientsList(prev => prev.filter(c => (c.id || c.name) !== deleteTarget.id));
        await deleteClientFromFirestore(String(deleteTarget.id));
      } else if (deleteTarget.type === 'DESTINATION') {
        setDestinationStaffList(prev => prev.filter(d => d.id !== deleteTarget.id));
        await deleteDestinationStaffFromFirestore(String(deleteTarget.id));
      }
    } catch (err) {
      console.warn("Notice deleting target:", err);
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'profilePicture' | 'cnicFront' | 'cnicBack') => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const processed = await compressAndPrepareFile(file);
        if (processed.dataUrl) {
          setFormData(prev => ({ ...prev, [fieldName]: processed.dataUrl }));
        }
      } catch (err) {
        console.warn("File processing notice:", err);
      } finally {
        e.target.value = '';
      }
    }
  };

  // Filter staff users (office vs transporters)
  const officeUsers = users.filter(u => u.role !== UserRole.CLIENT && u.role !== UserRole.TRANSPORTER);
  const transporterUsers = users.filter(u => u.role === UserRole.TRANSPORTER);

  // Search filtering
  const q = searchQuery.toLowerCase().trim();

  const filteredOfficeUsers = officeUsers.filter(u => {
    if (!q) return true;
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.userId && u.userId.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q)) ||
      (u.contact && u.contact.toLowerCase().includes(q))
    );
  });

  const filteredClients = clientsList.filter(c => {
    if (!q) return true;
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.ownerName && c.ownerName.toLowerCase().includes(q)) ||
      (c.mobileNumber && c.mobileNumber.toLowerCase().includes(q)) ||
      (c.contact && c.contact.toLowerCase().includes(q)) ||
      (c.defaultCaseCategory && c.defaultCaseCategory.toLowerCase().includes(q)) ||
      (c.ntn && c.ntn.toLowerCase().includes(q))
    );
  });

  const filteredTransporters = transporterUsers.filter(u => {
    if (!q) return true;
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.userId && u.userId.toLowerCase().includes(q)) ||
      (u.contact && u.contact.toLowerCase().includes(q))
    );
  });

  const filteredDestinationStaff = destinationStaffList.filter(d => {
    if (!q) return true;
    return (
      (d.name && d.name.toLowerCase().includes(q)) ||
      (d.station && d.station.toLowerCase().includes(q)) ||
      (d.role && d.role.toLowerCase().includes(q)) ||
      (d.phone && d.phone.toLowerCase().includes(q))
    );
  });

  const destinationUsers = users.filter(u => 
    u.role === UserRole.UNLOADING_PORT_STAFF || 
    u.role === UserRole.DESTINATION_PORT_STAFF ||
    (u.roles && (u.roles.includes(UserRole.UNLOADING_PORT_STAFF) || u.roles.includes(UserRole.DESTINATION_PORT_STAFF)))
  );

  const filteredDestinationUsers = destinationUsers.filter(u => {
    if (!q) return true;
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.userId && u.userId.toLowerCase().includes(q)) ||
      (u.contact && u.contact.toLowerCase().includes(q))
    );
  });

  const getActiveCount = () => {
    if (activeTab === 'office') return filteredOfficeUsers.length;
    if (activeTab === 'clients') return filteredClients.length;
    if (activeTab === 'transporters') return filteredTransporters.length;
    return destSubTab === 'agents' ? filteredDestinationStaff.length : filteredDestinationUsers.length;
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2 drop-shadow-md">
            <Users className="text-brand-400" /> User Management & Unified Directory
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Unified Management: Office Staff (HR & Dual Ledgers), Clients (Tariffs & Financial Statements), Transporters/Brokers & Destinations Staff.
          </p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="w-full sm:w-auto bg-brand-600 hover:bg-brand-500 text-white px-4 sm:px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold shadow-lg shadow-brand-600/30 transition-all hover:scale-102 active:scale-95"
        >
          <UserPlus size={17} /> 
          <span>
            {activeTab === 'clients' ? 'Register New Client' : activeTab === 'destinations' ? (destSubTab === 'users' ? 'Create Destination User' : 'Add Destination Representative') : activeTab === 'transporters' ? 'Add Transporter / Broker' : 'Create User / Staff ID'}
          </span>
        </button>
      </div>

      {/* Primary 4 Tabs */}
      <div className="flex gap-2 sm:gap-3 border-b border-white/10 pb-1.5 overflow-x-auto custom-scrollbar-x no-scrollbar" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y' }}>
        <button
          onClick={() => setActiveTab('office')}
          className={`flex items-center gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl transition-all whitespace-nowrap text-xs sm:text-sm font-semibold shrink-0 ${
            activeTab === 'office' ? 'bg-brand-600/20 text-brand-300 border border-brand-500/40 shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <Briefcase size={16} /> Office Staff ({officeUsers.length})
        </button>

        <button
          onClick={() => setActiveTab('clients')}
          className={`flex items-center gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl transition-all whitespace-nowrap text-xs sm:text-sm font-semibold shrink-0 ${
            activeTab === 'clients' ? 'bg-brand-600/20 text-brand-300 border border-brand-500/40 shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <Building size={16} /> Clients ({clientsList.length})
        </button>

        <button
          onClick={() => setActiveTab('transporters')}
          className={`flex items-center gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl transition-all whitespace-nowrap text-xs sm:text-sm font-semibold shrink-0 ${
            activeTab === 'transporters' ? 'bg-brand-600/20 text-brand-300 border border-brand-500/40 shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <Truck size={16} /> Transporters / Brokers ({transporterUsers.length})
        </button>

        <button
          onClick={() => setActiveTab('destinations')}
          className={`flex items-center gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl transition-all whitespace-nowrap text-xs sm:text-sm font-semibold shrink-0 ${
            activeTab === 'destinations' ? 'bg-amber-600/20 text-amber-300 border border-amber-500/40 shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <MapPin size={16} /> Destinations Staff ({destinationStaffList.length + destinationUsers.length})
        </button>
      </div>

      {/* Search & Layout View Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white/5 p-2 sm:p-2.5 rounded-2xl border border-white/10">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={
              activeTab === 'office' ? "Search office staff by name, ID, role, phone..." :
              activeTab === 'clients' ? "Search clients by company, owner, category, NTN..." :
              activeTab === 'transporters' ? "Search transporters / brokers by fleet name, ID..." :
              destSubTab === 'users' ? "Search destination staff login accounts by name, ID..." :
              "Search destination representatives by name, station, role..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-black/40 border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs p-1"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
          <span className="text-xs text-gray-400 px-1 font-mono">
            {getActiveCount()} {getActiveCount() === 1 ? 'record' : 'records'}
          </span>

          <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'cards' 
                  ? 'bg-brand-600 text-white shadow-md' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <LayoutGrid size={14} />
              <span>Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'table' 
                  ? 'bg-brand-600 text-white shadow-md' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <List size={14} />
              <span>Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. OFFICE STAFF TAB */}
      {/* ========================================================================= */}
      {activeTab === 'office' && (
        filteredOfficeUsers.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center border border-white/10 text-gray-400 space-y-2">
            <Users size={32} className="mx-auto text-gray-500 mb-2" />
            <p className="text-sm font-semibold text-white">No office staff found</p>
            <p className="text-xs text-gray-500">Click &quot;Create User / Staff ID&quot; to onboard an employee.</p>
          </div>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredOfficeUsers.map(user => (
              <div 
                key={user.id} 
                className="glass-card rounded-2xl p-4 border border-white/10 hover:border-brand-500/30 transition-all shadow-lg space-y-3 relative overflow-hidden group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-sm font-bold text-white shadow-lg overflow-hidden shrink-0">
                      {user.profilePicture ? (
                        <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        user.name.charAt(0)
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-white text-sm truncate">{user.name}</h4>
                      {user.designation && (
                        <p className="text-[11px] text-amber-300/90 font-medium truncate">{user.designation}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className="text-[11px] font-mono font-semibold text-brand-400 bg-brand-500/10 px-1.5 py-0.5 rounded border border-brand-500/20">
                          {user.userId || `EMP-${user.id}`}
                        </span>
                        {(user.roles && user.roles.length > 0 ? user.roles : [user.role]).map(r => (
                          <span key={r} className={`rounded px-1.5 py-0.5 text-[10px] font-medium border truncate ${
                            r === UserRole.ADMIN 
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' 
                              : 'bg-white/10 border-white/10 text-gray-200'
                          }`}>
                            {r.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <span className="text-green-400 text-[11px] font-bold flex items-center gap-1 shrink-0 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_6px_currentColor]"></span> {user.status || 'ACTIVE'}
                  </span>
                </div>

                {user.fatherName && (
                  <div className="text-xs text-gray-400 flex items-center gap-1.5 px-0.5">
                    <span className="text-gray-500 font-medium">S/O:</span>
                    <span className="text-gray-200 font-medium">{user.fatherName}</span>
                  </div>
                )}

                <div className="bg-white/5 rounded-xl p-2.5 border border-white/5 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 flex items-center gap-1.5">
                      <Phone size={13} className="text-brand-400 shrink-0" /> Contact:
                    </span>
                    <a href={`tel:${user.contact}`} className="font-mono text-white hover:text-brand-300 font-semibold transition">
                      {user.contact || 'N/A'}
                    </a>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 flex items-center gap-1.5">
                      <CreditCard size={13} className="text-emerald-400 shrink-0" /> Base Salary:
                    </span>
                    <span className="font-mono text-emerald-300 font-bold">
                      PKR {(user.baseSalary || 45000).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                  <button
                    onClick={() => setSelectedStaffUser(user)}
                    className="flex-1 text-emerald-300 hover:text-emerald-200 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 transition-all text-xs flex items-center justify-center gap-1.5 font-semibold"
                    title="View Salary & Daily Routine Ledgers"
                  >
                    <CreditCard size={14} /> Dual Ledgers
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    <button 
                      onClick={() => handleEditUser(user)}
                      className="text-gray-300 hover:text-white p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                      title="Edit Staff User ID & Role"
                    >
                      <Edit size={14} />
                    </button>
                    <button 
                      onClick={() => setDeleteTarget({ type: 'USER', id: user.id, name: user.name })}
                      className="text-gray-400 hover:text-red-400 p-2 rounded-xl bg-white/5 hover:bg-red-500/10 transition-colors"
                      title="Delete Staff"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-card rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            <div className="overflow-x-auto custom-scrollbar custom-scrollbar-x" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y' }}>
              <table className="w-full text-left text-sm text-gray-300 min-w-[750px]">
                <thead className="bg-white/5 uppercase text-xs font-semibold text-gray-400 border-b border-white/10">
                  <tr>
                    <th className="p-4">Staff Details</th>
                    <th className="p-4">Role & Duties</th>
                    <th className="p-4">Contact Info</th>
                    <th className="p-4">Base Monthly Salary</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredOfficeUsers.map(user => (
                    <tr key={user.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-sm font-bold text-white shadow-lg overflow-hidden shrink-0">
                          {user.profilePicture ? (
                            <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover" />
                          ) : (
                            user.name.charAt(0)
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-white block">{user.name}</span>
                          {user.designation && (
                            <span className="text-[11px] text-amber-300 block">{user.designation}</span>
                          )}
                          <span className="text-xs font-mono text-brand-400">{user.userId || `EMP-${user.id}`}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {(user.roles && user.roles.length > 0 ? user.roles : [user.role]).map(r => (
                            <span key={r} className={`rounded-md px-2 py-0.5 text-[11px] font-medium inline-block border ${
                              r === UserRole.ADMIN
                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                : 'bg-white/10 border-white/10 text-gray-200'
                            }`}>
                              {r.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                        {user.fatherName && (
                          <p className="text-[11px] text-gray-400 mt-1">S/O: {user.fatherName}</p>
                        )}
                      </td>
                      <td className="p-4">
                        <p className="text-white font-mono text-xs">{user.contact}</p>
                        <p className="text-[11px] text-gray-400 truncate max-w-[180px]">{user.email}</p>
                      </td>
                      <td className="p-4">
                        <span className="font-mono text-emerald-400 font-semibold text-xs">
                          PKR {(user.baseSalary || 45000).toLocaleString()}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-green-400 text-xs font-bold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_currentColor]"></span> {user.status || 'ACTIVE'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedStaffUser(user)}
                            className="text-emerald-400 hover:text-emerald-300 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors text-xs flex items-center gap-1 font-semibold"
                            title="View Salary & Daily Routine Ledgers"
                          >
                            <CreditCard size={14} /> Dual Ledgers
                          </button>
                          <button 
                            onClick={() => handleEditUser(user)}
                            className="text-gray-300 hover:text-white p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                            title="Edit User ID & Role"
                          >
                            <Edit size={15} />
                          </button>
                          <button 
                            onClick={() => setDeleteTarget({ type: 'USER', id: user.id, name: user.name })}
                            className="text-gray-400 hover:text-red-400 p-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 transition-colors"
                            title="Delete User"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* ========================================================================= */}
      {/* 2. CLIENTS TAB */}
      {/* ========================================================================= */}
      {activeTab === 'clients' && (
        filteredClients.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center border border-white/10 text-gray-400 space-y-2">
            <Building size={32} className="mx-auto text-gray-500 mb-2" />
            <p className="text-sm font-semibold text-white">No registered clients found</p>
            <p className="text-xs text-gray-500">Click &quot;Register New Client&quot; to onboard a client company with automatic tariffs.</p>
          </div>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredClients.map(client => (
              <div 
                key={client.id || client.name} 
                className="glass-card rounded-2xl p-4 border border-white/10 hover:border-emerald-500/30 transition-all shadow-lg space-y-3 relative overflow-hidden group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-sm font-bold text-emerald-400 shadow-lg shrink-0">
                      <Building size={20} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-white text-sm truncate">{client.name}</h4>
                      <p className="text-xs text-gray-400 truncate">{client.ownerName || client.contact || 'Owner N/A'}</p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-medium">
                    {client.defaultCaseCategory || 'Bonded Carrier'}
                  </span>
                </div>

                <div className="bg-white/5 rounded-xl p-2.5 border border-white/5 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Phone:</span>
                    <a href={`tel:${client.mobileNumber || client.phone}`} className="text-white font-mono font-medium hover:text-brand-300">
                      {client.mobileNumber || client.phone || client.contact || 'N/A'}
                    </a>
                  </div>
                  {client.whatsappNumber && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">WhatsApp:</span>
                      <span className="text-emerald-300 font-mono text-[11px]">{client.whatsappNumber}</span>
                    </div>
                  )}
                  {client.ntn && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">NTN / STRN:</span>
                      <span className="text-gray-300 font-mono text-[11px]">{client.ntn}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px]">
                    <span className="text-gray-400">Default Tariff Items:</span>
                    <span className="text-amber-400 font-mono font-bold">
                      {(client.defaultCharges || []).length} items
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                  <button
                    onClick={() => setLedgerClient(client)}
                    className="flex-1 text-emerald-300 hover:text-emerald-200 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 transition-all text-xs flex items-center justify-center gap-1.5 font-semibold"
                    title="Check Financial Ledger Statement"
                  >
                    <FileText size={14} /> Check Ledger
                  </button>
                  <button
                    onClick={() => {
                      setClientToEdit(client);
                      setShowClientModal(true);
                    }}
                    className="text-brand-300 hover:text-white px-2.5 py-1.5 rounded-xl bg-brand-500/15 hover:bg-brand-500/25 border border-brand-500/30 transition-all text-xs flex items-center gap-1 font-medium"
                    title="Edit Profile & Default Tariff Setup"
                  >
                    <Edit size={14} /> Tariff
                  </button>
                  <button 
                    onClick={() => setDeleteTarget({ type: 'CLIENT', id: client.id || client.name, name: client.name })}
                    className="text-gray-400 hover:text-red-400 p-2 rounded-xl bg-white/5 hover:bg-red-500/10 transition-colors"
                    title="Delete Client"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-card rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            <div className="overflow-x-auto custom-scrollbar custom-scrollbar-x" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y' }}>
              <table className="w-full text-left text-sm text-gray-300 min-w-[750px]">
                <thead className="bg-white/5 uppercase text-xs font-semibold text-gray-400 border-b border-white/10">
                  <tr>
                    <th className="p-4">Client Company</th>
                    <th className="p-4">Owner & Contact</th>
                    <th className="p-4">Default Category</th>
                    <th className="p-4">NTN / Tax ID</th>
                    <th className="p-4">Default Tariff Heads</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredClients.map(client => (
                    <tr key={client.id || client.name} className="hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                            <Building size={18} />
                          </div>
                          <div>
                            <span className="font-bold text-white block">{client.name}</span>
                            <span className="text-[11px] text-gray-400">{client.officeAddress || 'Address N/A'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-white font-medium text-xs">{client.ownerName || client.contact || 'N/A'}</p>
                        <p className="text-[11px] text-gray-400 font-mono">{client.mobileNumber || client.phone || 'N/A'}</p>
                      </td>
                      <td className="p-4">
                        <span className="bg-brand-500/10 border border-brand-500/20 text-brand-300 px-2.5 py-1 rounded-md text-xs font-medium">
                          {client.defaultCaseCategory || 'Bonded Carrier'}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-xs text-gray-300">
                        {client.ntn || 'N/A'}
                      </td>
                      <td className="p-4 font-mono text-xs text-amber-400 font-semibold">
                        {(client.defaultCharges || []).length} billing heads
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setLedgerClient(client)}
                            className="text-emerald-400 hover:text-emerald-300 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors text-xs flex items-center gap-1 font-semibold"
                            title="Check Financial Ledger Statement"
                          >
                            <FileText size={14} /> Ledger
                          </button>
                          <button
                            onClick={() => {
                              setClientToEdit(client);
                              setShowClientModal(true);
                            }}
                            className="text-brand-300 hover:text-white px-2 py-1 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 transition-colors text-xs flex items-center gap-1 font-medium"
                            title="Edit Profile & Tariff"
                          >
                            <Edit size={14} /> Edit
                          </button>
                          <button 
                            onClick={() => setDeleteTarget({ type: 'CLIENT', id: client.id || client.name, name: client.name })}
                            className="text-gray-400 hover:text-red-400 p-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 transition-colors"
                            title="Delete Client"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* ========================================================================= */}
      {/* 3. TRANSPORTERS / BROKERS TAB (Renamed as requested) */}
      {/* ========================================================================= */}
      {activeTab === 'transporters' && (
        filteredTransporters.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center border border-white/10 text-gray-400 space-y-2">
            <Truck size={32} className="mx-auto text-gray-500 mb-2" />
            <p className="text-sm font-semibold text-white">No transporters / brokers found</p>
            <p className="text-xs text-gray-500">Click &quot;Add Transporter / Broker&quot; to onboard transport fleet partners.</p>
          </div>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredTransporters.map(trans => (
              <div 
                key={trans.id} 
                className="glass-card rounded-2xl p-4 border border-white/10 hover:border-amber-500/30 transition-all shadow-lg space-y-3 relative overflow-hidden group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-sm font-bold text-amber-400 shadow-lg shrink-0">
                      <Truck size={20} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-white text-sm truncate">{trans.name}</h4>
                      <p className="text-xs text-gray-400 font-mono">{trans.userId || 'N/A'} • Transporter/Broker</p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-medium">
                    Fleet Partner
                  </span>
                </div>

                <div className="bg-white/5 rounded-xl p-2.5 border border-white/5 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Contact:</span>
                    <a href={`tel:${trans.contact}`} className="text-white font-mono font-medium hover:text-amber-300">
                      {trans.contact || 'N/A'}
                    </a>
                  </div>
                  {(trans as any).preferredRoutes && (
                    <div className="flex items-start justify-between gap-2 pt-1 border-t border-white/5">
                      <span className="text-gray-400 shrink-0">Routes:</span>
                      <span className="text-gray-300 text-right text-[11px] truncate max-w-[200px]">
                        {(trans as any).preferredRoutes}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                  <span className="text-[11px] text-gray-400">
                    Portal ID: <strong className="text-amber-300 font-mono">{trans.userId || 'TRP-N/A'}</strong>
                  </span>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleEditUser(trans)}
                      className="text-gray-300 hover:text-white p-1.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                      title="Edit Transporter / Broker"
                    >
                      <Edit size={14} />
                    </button>
                    <button 
                      onClick={() => setDeleteTarget({ type: 'USER', id: trans.id, name: trans.name })}
                      className="text-gray-400 hover:text-red-400 p-1.5 rounded-xl bg-white/5 hover:bg-red-500/10 transition-colors"
                      title="Delete Transporter / Broker"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-card rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            <div className="overflow-x-auto custom-scrollbar custom-scrollbar-x" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y' }}>
              <table className="w-full text-left text-sm text-gray-300 min-w-[750px]">
                <thead className="bg-white/5 uppercase text-xs font-semibold text-gray-400 border-b border-white/10">
                  <tr>
                    <th className="p-4">Transporter / Broker Name</th>
                    <th className="p-4">Contact Phone</th>
                    <th className="p-4">Portal ID</th>
                    <th className="p-4">Preferred Transit Routes</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredTransporters.map(trans => (
                    <tr key={trans.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold shrink-0">
                          <Truck size={18} />
                        </div>
                        <div>
                          <span className="font-bold text-white block">{trans.name}</span>
                          <span className="text-[11px] text-gray-400">Transporter / Broker Entity</span>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-xs text-white">
                        {trans.contact}
                      </td>
                      <td className="p-4 font-mono text-xs text-amber-400 font-semibold">
                        {trans.userId || 'TRP-N/A'}
                      </td>
                      <td className="p-4 text-xs text-gray-300">
                        {(trans as any).preferredRoutes || 'Standard Transit Routes'}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleEditUser(trans)}
                            className="text-gray-300 hover:text-white p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                            title="Edit Transporter / Broker"
                          >
                            <Edit size={15} />
                          </button>
                          <button 
                            onClick={() => setDeleteTarget({ type: 'USER', id: trans.id, name: trans.name })}
                            className="text-gray-400 hover:text-red-400 p-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 transition-colors"
                            title="Delete Transporter / Broker"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* ========================================================================= */}
      {/* 4. DESTINATIONS STAFF TAB (New Tab as requested) */}
      {/* ========================================================================= */}
      {activeTab === 'destinations' && (
        <div className="space-y-4">
          {/* Destination Sub-Tabs */}
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 self-start w-fit">
            <button
              onClick={() => setDestSubTab('agents')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                destSubTab === 'agents'
                  ? 'bg-amber-600 text-white shadow-md font-bold animate-pulse-glow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <MapPin size={14} />
              <span>Field Representatives ({filteredDestinationStaff.length})</span>
            </button>
            <button
              onClick={() => setDestSubTab('users')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                destSubTab === 'users'
                  ? 'bg-amber-600 text-white shadow-md font-bold animate-pulse-glow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Users size={14} />
              <span>Staff Login Accounts ({filteredDestinationUsers.length})</span>
            </button>
          </div>

          {destSubTab === 'agents' ? (
            filteredDestinationStaff.length === 0 ? (
              <div className="glass-card rounded-2xl p-8 text-center border border-white/10 text-gray-400 space-y-2">
                <MapPin size={32} className="mx-auto text-amber-500 mb-2" />
                <p className="text-sm font-semibold text-white">No destination staff representatives registered</p>
                <p className="text-xs text-gray-500">
                  Stationed representatives handle loading, unloading, seals inspection and customs clearance at ports (Karachi, Port Qasim) and borders (Torkham, Chaman).
                </p>
                <button
                  onClick={() => {
                    setDestinationStaffToEdit(null);
                    setShowDestinationModal(true);
                  }}
                  className="mt-3 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold px-4 py-2 rounded-xl inline-flex items-center gap-1.5 transition"
                >
                  <Plus size={14} /> Add First Destination Representative
                </button>
              </div>
            ) : viewMode === 'cards' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredDestinationStaff.map(staff => (
                  <div 
                    key={staff.id} 
                    className="glass-card rounded-2xl p-4 border border-white/10 hover:border-amber-500/30 transition-all shadow-lg space-y-3 relative overflow-hidden group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-sm font-bold text-amber-400 shadow-lg shrink-0">
                          <MapPin size={20} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-white text-sm truncate">{staff.name}</h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium">
                              {staff.role}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        staff.status === 'ACTIVE' 
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                          : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                      }`}>
                        {staff.status === 'ACTIVE' ? 'Active Duty' : 'On Leave'}
                      </span>
                    </div>

                    <div className="bg-white/5 rounded-xl p-2.5 border border-white/5 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Station:</span>
                        <span className="text-white font-semibold flex items-center gap-1">
                          <MapPinned size={12} className="text-amber-400" /> {staff.station}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Phone:</span>
                        <a href={`tel:${staff.phone}`} className="text-white font-mono font-medium hover:text-amber-300">
                          {staff.phone}
                        </a>
                      </div>
                      {staff.cnic && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">CNIC:</span>
                          <span className="text-gray-300 font-mono text-[11px]">{staff.cnic}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px]">
                        <span className="text-gray-400">Compensation:</span>
                        <span className="text-emerald-400 font-mono font-bold">
                          PKR {(staff.baseRate || 0).toLocaleString()} / {staff.paymentType === 'PER_CASE_COMMISSION' ? 'case' : staff.paymentType === 'DAILY_RATE' ? 'day' : 'month'}
                        </span>
                      </div>
                    </div>

                    {staff.notes && (
                      <p className="text-[11px] text-gray-400 line-clamp-1 italic px-1">
                        &quot;{staff.notes}&quot;
                      </p>
                    )}

                    <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-white/5">
                      <button 
                        onClick={() => {
                          setDestinationStaffToEdit(staff);
                          setShowDestinationModal(true);
                        }}
                        className="text-gray-300 hover:text-white p-1.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                        title="Edit Destination Representative"
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        onClick={() => setDeleteTarget({ type: 'DESTINATION', id: staff.id, name: staff.name })}
                        className="text-gray-400 hover:text-red-400 p-1.5 rounded-xl bg-white/5 hover:bg-red-500/10 transition-colors"
                        title="Delete Staff"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-card rounded-2xl overflow-hidden border border-white/10 shadow-2xl animate-in fade-in duration-200">
                <div className="overflow-x-auto custom-scrollbar custom-scrollbar-x" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y' }}>
                  <table className="w-full text-left text-sm text-gray-300 min-w-[750px]">
                    <thead className="bg-white/5 uppercase text-xs font-semibold text-gray-400 border-b border-white/10">
                      <tr>
                        <th className="p-4">Representative Name</th>
                        <th className="p-4">Station Location</th>
                        <th className="p-4">Operational Role</th>
                        <th className="p-4">Primary Contact</th>
                        <th className="p-4">Compensation Terms</th>
                        <th className="p-4">Duty Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredDestinationStaff.map(staff => (
                        <tr key={staff.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold shrink-0">
                              <MapPin size={18} />
                            </div>
                            <div>
                              <span className="font-bold text-white block">{staff.name}</span>
                              <span className="text-[11px] text-gray-400">{staff.cnic || 'CNIC not recorded'}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="bg-white/5 border border-white/10 rounded-md px-2.5 py-1 text-xs text-white font-medium inline-flex items-center gap-1.5">
                              <MapPinned size={12} className="text-amber-400" /> {staff.station}
                            </span>
                          </td>
                          <td className="p-4 text-xs font-medium text-gray-200">
                            {staff.role}
                          </td>
                          <td className="p-4 font-mono text-xs text-white">
                            {staff.phone}
                          </td>
                          <td className="p-4 font-mono text-xs text-emerald-400 font-semibold">
                            PKR {(staff.baseRate || 0).toLocaleString()} ({staff.paymentType === 'PER_CASE_COMMISSION' ? 'per case' : staff.paymentType === 'DAILY_RATE' ? 'daily' : 'monthly'})
                          </td>
                          <td className="p-4">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              staff.status === 'ACTIVE' 
                                ? 'text-green-400 bg-green-500/10 border border-green-500/20' 
                                : 'text-gray-400 bg-gray-500/10 border border-gray-500/20'
                            }`}>
                              {staff.status === 'ACTIVE' ? 'Active Duty' : 'On Leave'}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => {
                                  setDestinationStaffToEdit(staff);
                                  setShowDestinationModal(true);
                                }}
                                className="text-gray-300 hover:text-white p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                                title="Edit Profile"
                              >
                                <Edit size={15} />
                              </button>
                              <button 
                                onClick={() => setDeleteTarget({ type: 'DESTINATION', id: staff.id, name: staff.name })}
                                className="text-gray-400 hover:text-red-400 p-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 transition-colors"
                                title="Delete Staff"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          ) : (
            filteredDestinationUsers.length === 0 ? (
              <div className="glass-card rounded-2xl p-8 text-center border border-white/10 text-gray-400 space-y-2 animate-in fade-in duration-200">
                <Users size={32} className="mx-auto text-amber-500 mb-2" />
                <p className="text-sm font-semibold text-white">No destination staff login accounts registered</p>
                <p className="text-xs text-gray-500">
                  Create a login-enabled employee user account with the Destination Staff role to see them here.
                </p>
                <button
                  onClick={() => handleSelectRoleType('STAFF', [UserRole.UNLOADING_PORT_STAFF])}
                  className="mt-3 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold px-4 py-2 rounded-xl inline-flex items-center gap-1.5 transition animate-all"
                >
                  <Plus size={14} /> Create First Destination Staff User
                </button>
              </div>
            ) : viewMode === 'cards' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 animate-in fade-in duration-200">
                {filteredDestinationUsers.map(user => (
                  <div 
                    key={user.id} 
                    className="glass-card rounded-2xl p-4 border border-white/10 hover:border-amber-500/30 transition-all shadow-lg space-y-3 relative overflow-hidden group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-sm font-bold text-amber-400 shadow-lg overflow-hidden shrink-0">
                          {user.profilePicture ? (
                            <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover" />
                          ) : (
                            user.name.charAt(0)
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-white text-sm truncate">{user.name}</h4>
                          {user.designation && (
                            <p className="text-[11px] text-amber-300/90 font-medium truncate">{user.designation}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="text-[11px] font-mono font-semibold text-brand-400 bg-brand-500/10 px-1.5 py-0.5 rounded border border-brand-500/20">
                              {user.userId || `EMP-${user.id}`}
                            </span>
                            {(user.roles && user.roles.length > 0 ? user.roles : [user.role]).map(r => (
                              <span key={r} className="rounded px-1.5 py-0.5 text-[10px] font-medium border truncate bg-teal-500/15 text-teal-300 border-teal-500/30">
                                {r === UserRole.UNLOADING_PORT_STAFF ? 'Destination Staff' : r.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <span className="text-green-400 text-[11px] font-bold flex items-center gap-1 shrink-0 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_6px_currentColor]"></span> {user.status || 'ACTIVE'}
                      </span>
                    </div>

                    <div className="bg-white/5 rounded-xl p-2.5 border border-white/5 space-y-1.5 text-xs font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 font-sans">Contact:</span>
                        <a href={`tel:${user.contact}`} className="text-white hover:text-amber-300">{user.contact}</a>
                      </div>
                      {user.email && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 font-sans">Email:</span>
                          <span className="text-gray-300 truncate max-w-[150px]">{user.email}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-1.5 border-t border-white/5">
                        <span className="text-gray-400 font-sans">Password:</span>
                        <span className="text-amber-400 font-bold">{user.password || '••••••••'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-white/5">
                      <button
                        onClick={() => setSelectedStaffUser(user)}
                        className="text-emerald-400 hover:text-emerald-300 px-2.5 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors text-[11px] flex items-center gap-1 font-semibold"
                        title="View Salary & Daily Routine Ledgers"
                      >
                        <CreditCard size={12} /> Ledgers
                      </button>
                      <button 
                        onClick={() => handleEditUser(user)}
                        className="text-gray-300 hover:text-white p-1.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                        title="Edit User ID & Role"
                      >
                        <Edit size={13} />
                      </button>
                      <button 
                        onClick={() => setDeleteTarget({ type: 'USER', id: user.id, name: user.name })}
                        className="text-gray-400 hover:text-red-400 p-1.5 rounded-xl bg-white/5 hover:bg-red-500/10 transition-colors"
                        title="Delete Staff"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-card rounded-2xl overflow-hidden border border-white/10 shadow-2xl animate-in fade-in duration-200">
                <div className="overflow-x-auto custom-scrollbar custom-scrollbar-x" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y' }}>
                  <table className="w-full text-left text-sm text-gray-300 min-w-[750px]">
                    <thead className="bg-white/5 uppercase text-xs font-semibold text-gray-400 border-b border-white/10">
                      <tr>
                        <th className="p-4">Staff Member Name</th>
                        <th className="p-4">Assigned Roles</th>
                        <th className="p-4">Primary Contact / Credentials</th>
                        <th className="p-4">Salary Base</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredDestinationUsers.map(user => (
                        <tr key={user.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-sm font-bold text-amber-400 shadow-lg overflow-hidden shrink-0">
                              {user.profilePicture ? (
                                <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover" />
                              ) : (
                                user.name.charAt(0)
                              )}
                            </div>
                            <div>
                              <span className="font-bold text-white block">{user.name}</span>
                              {user.designation && (
                                <span className="text-[11px] text-amber-300 block">{user.designation}</span>
                              )}
                              <span className="text-xs font-mono text-brand-400">{user.userId || `EMP-${user.id}`}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-1">
                              {(user.roles && user.roles.length > 0 ? user.roles : [user.role]).map(r => (
                                <span key={r} className="rounded-md px-2 py-0.5 text-[11px] font-medium inline-block border bg-teal-500/15 text-teal-300 border-teal-500/30 font-medium">
                                  {r === UserRole.UNLOADING_PORT_STAFF ? 'Destination Staff' : r.replace(/_/g, ' ')}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-4 font-mono text-xs">
                            <div className="text-white">Phone: {user.contact}</div>
                            <div className="text-gray-400 text-[11px]">Pass: {user.password || '••••••••'}</div>
                          </td>
                          <td className="p-4">
                            <span className="font-mono text-emerald-400 font-semibold text-xs">
                              PKR {(user.baseSalary || 45000).toLocaleString()}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="text-green-400 text-xs font-bold flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_currentColor]"></span> {user.status || 'ACTIVE'}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setSelectedStaffUser(user)}
                                className="text-emerald-400 hover:text-emerald-300 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors text-xs flex items-center gap-1 font-semibold"
                                title="View Salary & Daily Routine Ledgers"
                              >
                                <CreditCard size={14} /> Dual Ledgers
                              </button>
                              <button 
                                onClick={() => handleEditUser(user)}
                                className="text-gray-300 hover:text-white p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                                title="Edit User ID & Role"
                              >
                                <Edit size={15} />
                              </button>
                              <button 
                                onClick={() => setDeleteTarget({ type: 'USER', id: user.id, name: user.name })}
                                className="text-gray-400 hover:text-red-400 p-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 transition-colors"
                                title="Delete Staff"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ONBOARDING ROLE SELECTOR MODAL */}
      {/* ========================================================================= */}
      {showRoleSelectorModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="glass-card p-6 sm:p-8 rounded-3xl w-full max-w-xl border border-white/15 shadow-2xl space-y-5 bg-slate-900">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-brand-400 font-bold">Directory Setup</span>
                <h3 className="text-lg sm:text-xl font-bold text-white mt-0.5">Select User Category to Add</h3>
              </div>
              <button onClick={() => setShowRoleSelectorModal(false)} className="text-gray-400 hover:text-white p-1 rounded-full bg-white/5">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              <button
                type="button"
                onClick={() => handleSelectRoleType('STAFF')}
                className="group p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-brand-500/50 hover:bg-brand-500/10 transition-all text-left flex flex-col justify-between hover:scale-102 shadow-lg"
              >
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center">
                    <Briefcase size={20} />
                  </div>
                  <h4 className="text-sm font-bold text-white">Office Staff Member</h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Executives, Managers, Accountants, Clerks, Drivers & Office Boys (with Dual Ledgers).
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-xs text-brand-300 font-semibold">
                  <span>Create Staff Profile</span>
                  <ChevronRight size={14} />
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectRoleType('TRANSPORTER')}
                className="group p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 hover:border-amber-500/50 hover:bg-amber-500/15 transition-all text-left flex flex-col justify-between hover:scale-102 shadow-lg"
              >
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Truck size={20} />
                  </div>
                  <h4 className="text-sm font-bold text-white">Transporter / Broker</h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Fleet Partners, Goods Transport Agencies, Truck Owners & Transit Brokers.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-xs text-amber-300 font-semibold">
                  <span>Add Transporter / Broker</span>
                  <ChevronRight size={14} />
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAFF & TRANSPORTER FORM MODAL */}
      {/* ========================================================================= */}
      {showModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="glass-card p-6 rounded-3xl w-full max-w-2xl border border-white/15 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar bg-slate-900">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-white/10 sticky top-0 bg-slate-900/90 backdrop-blur-md z-10">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-brand-400 font-bold">
                  {selectedOnboardingRole === 'TRANSPORTER' ? 'Transporter / Broker Setup' : 'Staff Employee Profile'}
                </span>
                <h3 className="text-lg font-bold text-white">
                  {isEditing ? 'Edit Profile' : 'Register New'} {selectedOnboardingRole === 'TRANSPORTER' ? 'Transporter / Broker' : 'Office Staff'}
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white p-1 rounded-full bg-white/5">
                <X size={20} />
              </button>
            </div>

            {/* Form Body */}
            {selectedOnboardingRole === 'STAFF' ? (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-gray-300 font-medium block mb-1">Full Name *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Kamran Akmal"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-white outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="text-gray-300 font-medium block mb-1">Father&apos;s Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Muhammad Akmal"
                      value={formData.fatherName}
                      onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-white outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="text-gray-300 font-medium block mb-1">Designation (Custom Title)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Senior Operations Executive / Port Dispatcher"
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-white outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="text-gray-300 font-medium block mb-1">Primary Phone *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 0300-1234567"
                      value={formData.contact}
                      onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-white outline-none focus:border-brand-500"
                    />
                  </div>

                  {/* Multi-Role Assignment Section */}
                  <div className="sm:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <ShieldCheck size={16} className="text-brand-400" />
                          System Role Rights & Multi-Role Assignment *
                        </h4>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Admin has universal access (exclusive). For non-admin staff, you can select multiple roles to grant combined rights across modules.
                        </p>
                      </div>
                      <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 shrink-0">
                        {formData.roles.includes(UserRole.ADMIN) 
                          ? 'Super Admin (All Rights)' 
                          : `${formData.roles.length} Role(s) Selected`}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                      {/* ADMIN - Exclusive */}
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            role: UserRole.ADMIN,
                            roles: [UserRole.ADMIN]
                          }));
                        }}
                        className={`text-left p-3 rounded-xl border transition-all flex flex-col justify-between ${
                          formData.roles.includes(UserRole.ADMIN)
                            ? 'bg-purple-600/25 border-purple-500 shadow-md shadow-purple-500/20 ring-1 ring-purple-400'
                            : 'bg-black/30 border-white/10 hover:border-purple-500/40 text-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_8px_currentColor]"></span>
                            Administrator
                          </span>
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-purple-500/30 text-purple-200">
                            Super Access
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1 leading-tight">
                          Full system control, approval rights, and unrestricted access across all modules.
                        </p>
                      </button>

                      {/* OPERATIONS MANAGER */}
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => {
                            let r = prev.roles.filter(x => x !== UserRole.ADMIN);
                            if (r.includes(UserRole.OPERATIONS_MANAGER)) {
                              r = r.filter(x => x !== UserRole.OPERATIONS_MANAGER);
                              if (r.length === 0) r = [UserRole.OPERATIONS_MANAGER];
                            } else {
                              r = [...r, UserRole.OPERATIONS_MANAGER];
                            }
                            return { ...prev, role: r[0] || UserRole.OPERATIONS_MANAGER, roles: r };
                          });
                        }}
                        className={`text-left p-3 rounded-xl border transition-all flex flex-col justify-between ${
                          !formData.roles.includes(UserRole.ADMIN) && formData.roles.includes(UserRole.OPERATIONS_MANAGER)
                            ? 'bg-blue-600/25 border-blue-500 shadow-md shadow-blue-500/20 ring-1 ring-blue-400'
                            : 'bg-black/30 border-white/10 hover:border-blue-500/40 text-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_currentColor]"></span>
                            Operations Manager
                          </span>
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-blue-500/30 text-blue-200">
                            Cases
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1 leading-tight">
                          Case registration and operational workflow execution up to vehicle assignment.
                        </p>
                      </button>

                      {/* FINANCE MANAGER */}
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => {
                            let r = prev.roles.filter(x => x !== UserRole.ADMIN);
                            if (r.includes(UserRole.FINANCE_MANAGER)) {
                              r = r.filter(x => x !== UserRole.FINANCE_MANAGER);
                              if (r.length === 0) r = [UserRole.FINANCE_MANAGER];
                            } else {
                              r = [...r, UserRole.FINANCE_MANAGER];
                            }
                            return { ...prev, role: r[0] || UserRole.FINANCE_MANAGER, roles: r };
                          });
                        }}
                        className={`text-left p-3 rounded-xl border transition-all flex flex-col justify-between ${
                          !formData.roles.includes(UserRole.ADMIN) && formData.roles.includes(UserRole.FINANCE_MANAGER)
                            ? 'bg-emerald-600/25 border-emerald-500 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-400'
                            : 'bg-black/30 border-white/10 hover:border-emerald-500/40 text-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_currentColor]"></span>
                            Finance Manager
                          </span>
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-200">
                            Finance
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1 leading-tight">
                          Manages entire finance suite: cashbook, bank accounts, ledgers, and billing.
                        </p>
                      </button>

                      {/* LOADING PORT STAFF */}
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => {
                            let r = prev.roles.filter(x => x !== UserRole.ADMIN);
                            if (r.includes(UserRole.LOADING_PORT_STAFF)) {
                              r = r.filter(x => x !== UserRole.LOADING_PORT_STAFF);
                              if (r.length === 0) r = [UserRole.LOADING_PORT_STAFF];
                            } else {
                              r = [...r, UserRole.LOADING_PORT_STAFF];
                            }
                            return { ...prev, role: r[0] || UserRole.LOADING_PORT_STAFF, roles: r };
                          });
                        }}
                        className={`text-left p-3 rounded-xl border transition-all flex flex-col justify-between ${
                          !formData.roles.includes(UserRole.ADMIN) && formData.roles.includes(UserRole.LOADING_PORT_STAFF)
                            ? 'bg-amber-600/25 border-amber-500 shadow-md shadow-amber-500/20 ring-1 ring-amber-400'
                            : 'bg-black/30 border-white/10 hover:border-amber-500/40 text-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_currentColor]"></span>
                            Loading Port Staff
                          </span>
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-amber-500/30 text-amber-200">
                            Loading Port
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1 leading-tight">
                          Completes loading port workflow, wharfage, stuffing, container seals, and dispatch.
                        </p>
                      </button>

                      {/* UNLOADING PORT STAFF */}
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => {
                            let r = prev.roles.filter(x => x !== UserRole.ADMIN);
                            if (r.includes(UserRole.UNLOADING_PORT_STAFF)) {
                              r = r.filter(x => x !== UserRole.UNLOADING_PORT_STAFF);
                              if (r.length === 0) r = [UserRole.UNLOADING_PORT_STAFF];
                            } else {
                              r = [...r, UserRole.UNLOADING_PORT_STAFF];
                            }
                            return { ...prev, role: r[0] || UserRole.UNLOADING_PORT_STAFF, roles: r };
                          });
                        }}
                        className={`text-left p-3 rounded-xl border transition-all flex flex-col justify-between ${
                          !formData.roles.includes(UserRole.ADMIN) && formData.roles.includes(UserRole.UNLOADING_PORT_STAFF)
                            ? 'bg-teal-600/25 border-teal-500 shadow-md shadow-teal-500/20 ring-1 ring-teal-400'
                            : 'bg-black/30 border-white/10 hover:border-teal-500/40 text-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-teal-400 shadow-[0_0_8px_currentColor]"></span>
                            Destination Staff
                          </span>
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-teal-500/30 text-teal-200">
                            Unloading & DO
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1 leading-tight">
                          Manages unloading, destination workflow, arrival, delivery orders (DO), and empty container return.
                        </p>
                      </button>

                      {/* DESTINATION PORT STAFF */}
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => {
                            let r = prev.roles.filter(x => x !== UserRole.ADMIN);
                            if (r.includes(UserRole.DESTINATION_PORT_STAFF)) {
                              r = r.filter(x => x !== UserRole.DESTINATION_PORT_STAFF);
                              if (r.length === 0) r = [UserRole.DESTINATION_PORT_STAFF];
                            } else {
                              r = [...r, UserRole.DESTINATION_PORT_STAFF];
                            }
                            return { ...prev, role: r[0] || UserRole.DESTINATION_PORT_STAFF, roles: r };
                          });
                        }}
                        className={`text-left p-3 rounded-xl border transition-all flex flex-col justify-between ${
                          !formData.roles.includes(UserRole.ADMIN) && formData.roles.includes(UserRole.DESTINATION_PORT_STAFF)
                            ? 'bg-cyan-600/25 border-cyan-500 shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400'
                            : 'bg-black/30 border-white/10 hover:border-cyan-500/40 text-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_currentColor]"></span>
                            Destination Port Staff
                          </span>
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-cyan-500/30 text-cyan-200">
                            Customs DO
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1 leading-tight">
                          Handles port destination workflows, clearing agent coordination, and container returns.
                        </p>
                      </button>

                      {/* VEHICLE MANAGER */}
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => {
                            let r = prev.roles.filter(x => x !== UserRole.ADMIN);
                            if (r.includes(UserRole.VEHICLE_MANAGER)) {
                              r = r.filter(x => x !== UserRole.VEHICLE_MANAGER);
                              if (r.length === 0) r = [UserRole.VEHICLE_MANAGER];
                            } else {
                              r = [...r, UserRole.VEHICLE_MANAGER];
                            }
                            return { ...prev, role: r[0] || UserRole.VEHICLE_MANAGER, roles: r };
                          });
                        }}
                        className={`text-left p-3 rounded-xl border transition-all flex flex-col justify-between ${
                          !formData.roles.includes(UserRole.ADMIN) && formData.roles.includes(UserRole.VEHICLE_MANAGER)
                            ? 'bg-rose-600/25 border-rose-500 shadow-md shadow-rose-500/20 ring-1 ring-rose-400'
                            : 'bg-black/30 border-white/10 hover:border-rose-500/40 text-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_8px_currentColor]"></span>
                            Vehicle Manager
                          </span>
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-rose-500/30 text-rose-200">
                            Fleet
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1 leading-tight">
                          Manages vehicle registrations, vehicle maintenance, carriers, and fleet management.
                        </p>
                      </button>

                      {/* OFFICE STAFF */}
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => {
                            let r = prev.roles.filter(x => x !== UserRole.ADMIN);
                            if (r.includes(UserRole.OFFICE_STAFF)) {
                              r = r.filter(x => x !== UserRole.OFFICE_STAFF);
                              if (r.length === 0) r = [UserRole.OFFICE_STAFF];
                            } else {
                              r = [...r, UserRole.OFFICE_STAFF];
                            }
                            return { ...prev, role: r[0] || UserRole.OFFICE_STAFF, roles: r };
                          });
                        }}
                        className={`text-left p-3 rounded-xl border transition-all flex flex-col justify-between ${
                          !formData.roles.includes(UserRole.ADMIN) && formData.roles.includes(UserRole.OFFICE_STAFF)
                            ? 'bg-indigo-600/25 border-indigo-500 shadow-md shadow-indigo-500/20 ring-1 ring-indigo-400'
                            : 'bg-black/30 border-white/10 hover:border-indigo-500/40 text-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_currentColor]"></span>
                            Office Staff
                          </span>
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-200">
                            Admin Staff
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1 leading-tight">
                          Head office administrative coordinators and general support personnel.
                        </p>
                      </button>
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-gray-300 font-medium block mb-1">Residential Address</label>
                    <input 
                      type="text" 
                      placeholder="e.g. House #12, Street 4, Sector 11-B, North Karachi"
                      value={formData.residentialAddress}
                      onChange={(e) => setFormData({ ...formData, residentialAddress: e.target.value })}
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-white outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                {/* Salary & Allowances */}
                <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 space-y-2.5">
                  <h4 className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                    <DollarSign size={14} className="text-emerald-400" />
                    Salary, Allowances & Advance Terms
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className="text-gray-400 block mb-1">Base Salary (PKR)</label>
                      <input 
                        type="number"
                        value={formData.baseSalary}
                        onChange={(e) => setFormData({ ...formData, baseSalary: Number(e.target.value) || 0 })}
                        className="w-full bg-black/40 border border-white/15 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 block mb-1">Fuel Allowance</label>
                      <input 
                        type="number"
                        value={formData.allowanceFuel}
                        onChange={(e) => setFormData({ ...formData, allowanceFuel: Number(e.target.value) || 0 })}
                        className="w-full bg-black/40 border border-white/15 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 block mb-1">Mobile Allowance</label>
                      <input 
                        type="number"
                        value={formData.allowanceMobile}
                        onChange={(e) => setFormData({ ...formData, allowanceMobile: Number(e.target.value) || 0 })}
                        className="w-full bg-black/40 border border-white/15 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 block mb-1">Initial Advance</label>
                      <input 
                        type="number"
                        value={formData.loansAdvances}
                        onChange={(e) => setFormData({ ...formData, loansAdvances: Number(e.target.value) || 0 })}
                        className="w-full bg-black/40 border border-white/15 rounded-lg px-2.5 py-1.5 text-amber-400 font-mono text-xs outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* User ID & Password Assignment */}
                <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                      <Key size={14} className="text-brand-400" />
                      Login Credentials (Optional / Assign as needed)
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        const newPass = Math.random().toString(36).slice(-8).toUpperCase();
                        setFormData(prev => ({ ...prev, generatedPass: newPass }));
                      }}
                      className="text-[11px] text-brand-400 hover:text-brand-300 font-mono underline"
                    >
                      Generate New Password
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
                    <div>
                      <label className="text-gray-400 text-[10px] block mb-0.5">User ID:</label>
                      <input 
                        type="text"
                        value={formData.generatedId}
                        onChange={(e) => setFormData({ ...formData, generatedId: e.target.value })}
                        className="w-full bg-black/40 border border-white/15 rounded-lg p-1.5 text-brand-400 text-xs font-bold outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 text-[10px] block mb-0.5">Password:</label>
                      <input 
                        type="text"
                        value={formData.generatedPass}
                        onChange={(e) => setFormData({ ...formData, generatedPass: e.target.value })}
                        className="w-full bg-black/40 border border-white/15 rounded-lg p-1.5 text-white text-xs font-bold outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Transporter / Broker Form */
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-gray-300 font-medium block mb-1">Transporter / Broker Entity Name *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Swift Goods Transport & Brokerage"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-white outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="text-gray-300 font-medium block mb-1">Representative Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Haji Nisar Ahmed"
                      value={formData.representativeName}
                      onChange={(e) => setFormData({ ...formData, representativeName: e.target.value })}
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-white outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="text-gray-300 font-medium block mb-1">Primary Mobile Phone *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 0300-9988776"
                      value={formData.contact}
                      onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-white outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="text-gray-300 font-medium block mb-1">WhatsApp Contact</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 0300-9988776"
                      value={formData.whatsappNumber}
                      onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-white outline-none focus:border-brand-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-gray-300 font-medium block mb-1">Transit Routes & Operations</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Karachi Port to Lahore NLC, Karachi to Peshawar / Torkham"
                      value={formData.preferredRoutes}
                      onChange={(e) => setFormData({ ...formData, preferredRoutes: e.target.value })}
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-white outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                {/* Transporter User ID & Password */}
                <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 space-y-2">
                  <h4 className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                    <Key size={14} className="text-amber-400" />
                    Transporter / Broker Portal Login
                  </h4>
                  <div className="grid grid-cols-2 gap-3 font-mono">
                    <div>
                      <span className="text-gray-400 text-[10px] block mb-0.5">User ID:</span>
                      <input 
                        type="text"
                        value={formData.generatedId}
                        onChange={(e) => setFormData({ ...formData, generatedId: e.target.value })}
                        className="w-full bg-black/40 border border-white/15 rounded-lg p-1.5 text-amber-400 text-xs font-bold outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-gray-400 text-[10px] block mb-0.5">Password:</span>
                      <input 
                        type="text"
                        value={formData.generatedPass}
                        onChange={(e) => setFormData({ ...formData, generatedPass: e.target.value })}
                        className="w-full bg-black/40 border border-white/15 rounded-lg p-1.5 text-white text-xs font-bold outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Unified Document Attachments Section (SRS compliance for file uploads / downloads / camera captures) */}
            <div className="mt-5 p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3.5">
              <h4 className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                <FileText size={14} className="text-brand-400" />
                Document Attachments & Verification Checklist
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* File Upload Inputs */}
                <div className="space-y-1">
                  <span className="text-gray-300 text-[11px] font-medium block">Profile Photo</span>
                  <label className="flex flex-col items-center justify-center p-2 border border-dashed border-white/20 hover:border-brand-500 rounded-xl cursor-pointer bg-black/30 hover:bg-black/50 transition text-center">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'profilePicture')}
                    />
                    <Upload size={14} className="text-gray-400 mb-0.5" />
                    <span className="text-[10px] text-gray-300 font-semibold truncate max-w-full">
                      {formData.profilePicture ? 'Replace Photo' : 'Upload Photo'}
                    </span>
                  </label>
                </div>

                <div className="space-y-1">
                  <span className="text-gray-300 text-[11px] font-medium block">CNIC Front / ID Copy</span>
                  <label className="flex flex-col items-center justify-center p-2 border border-dashed border-white/20 hover:border-brand-500 rounded-xl cursor-pointer bg-black/30 hover:bg-black/50 transition text-center">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'cnicFront')}
                    />
                    <Upload size={14} className="text-gray-400 mb-0.5" />
                    <span className="text-[10px] text-gray-300 font-semibold truncate max-w-full">
                      {formData.cnicFront ? 'Replace Front' : 'Upload Front'}
                    </span>
                  </label>
                </div>

                <div className="space-y-1">
                  <span className="text-gray-300 text-[11px] font-medium block">CNIC Back / Reg Document</span>
                  <label className="flex flex-col items-center justify-center p-2 border border-dashed border-white/20 hover:border-brand-500 rounded-xl cursor-pointer bg-black/30 hover:bg-black/50 transition text-center">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'cnicBack')}
                    />
                    <Upload size={14} className="text-gray-400 mb-0.5" />
                    <span className="text-[10px] text-gray-300 font-semibold truncate max-w-full">
                      {formData.cnicBack ? 'Replace Back / Doc' : 'Upload Back / Doc'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Uploaded Files Summary List with Download Option */}
              {((formData.profilePicture) || (formData.cnicFront) || (formData.cnicBack)) && (
                <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-1.5 animate-in fade-in">
                  <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <Download size={11} className="text-emerald-400" />
                    Uploaded Files Ledger (Click Download to Save)
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { label: 'Profile Photo', url: formData.profilePicture, name: 'Profile_Photo' },
                      { label: 'CNIC Front / ID Copy', url: formData.cnicFront, name: 'CNIC_Front' },
                      { label: 'CNIC Back / Reg Document', url: formData.cnicBack, name: 'CNIC_Back' }
                    ].filter(f => f.url).map((file, fIdx) => (
                      <div key={fIdx} className="flex items-center justify-between text-xs p-1.5 rounded bg-black/20 border border-white/5 hover:border-white/10 transition-colors">
                        <span className="text-gray-200 font-medium truncate max-w-[120px]">{file.label}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = file.url!;
                            const ext = file.url!.startsWith('data:application/pdf') ? '.pdf' : '.jpg';
                            link.download = `${file.name}${ext}`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          className="text-brand-400 hover:text-brand-300 font-bold hover:underline flex items-center gap-1 bg-brand-500/10 border border-brand-500/20 px-2 py-0.5 rounded text-[10px]"
                        >
                          <Download size={11} /> Download
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-white/10">
              <button 
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-xs text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveUser}
                className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl shadow-lg shadow-brand-600/30 flex items-center gap-2 text-xs font-semibold transition-all hover:scale-102"
              >
                <Save size={15} /> {isEditing ? 'Update Profile' : 'Save & Onboard'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. DUAL LEDGER MODAL FOR STAFF (Salary & Daily Routine Petty Cash) */}
      {/* ========================================================================= */}
      {selectedStaffUser && (
        <StaffLedgerModal
          isOpen={Boolean(selectedStaffUser)}
          onClose={() => setSelectedStaffUser(null)}
          staffUser={selectedStaffUser}
          ledgerEntries={staffLedgerEntries}
        />
      )}

      {/* ========================================================================= */}
      {/* 6. CLIENT REGISTRATION & DEFAULT TARIFF SETUP MODAL */}
      {/* ========================================================================= */}
      <ClientRegistrationModal
        isOpen={showClientModal}
        onClose={() => {
          setShowClientModal(false);
          setClientToEdit(null);
        }}
        initialClient={clientToEdit || undefined}
        onSave={(savedClient) => {
          setClientsList(prev => [
            savedClient,
            ...prev.filter(c => (c.id || c.name) !== (savedClient.id || savedClient.name))
          ]);
          setShowClientModal(false);
          setClientToEdit(null);
        }}
      />

      {/* ========================================================================= */}
      {/* 7. CLIENT FINANCIAL STATEMENT LEDGER MODAL */}
      {/* ========================================================================= */}
      {ledgerClient && (
        <ClientLedgerModal
          isOpen={Boolean(ledgerClient)}
          onClose={() => setLedgerClient(null)}
          client={ledgerClient}
          cases={casesList}
          finances={financesList}
        />
      )}

      {/* ========================================================================= */}
      {/* 8. DESTINATION STAFF MODAL */}
      {/* ========================================================================= */}
      <DestinationStaffModal
        isOpen={showDestinationModal}
        onClose={() => {
          setShowDestinationModal(false);
          setDestinationStaffToEdit(null);
        }}
        staffToEdit={destinationStaffToEdit}
        onSaved={() => {
          setShowDestinationModal(false);
          setDestinationStaffToEdit(null);
        }}
      />

      {/* ========================================================================= */}
      {/* 9. DELETE CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-60 p-4 animate-in fade-in duration-150">
          <div className="glass-card p-6 rounded-2xl w-full max-w-sm border border-white/10 text-center space-y-4 bg-slate-900 shadow-2xl">
            <div className="bg-red-500/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto border border-red-500/30">
              <AlertTriangle size={24} className="text-red-500" />
            </div>
            <h3 className="text-base font-bold text-white">Confirm Removal</h3>
            <p className="text-xs text-gray-400">
              Are you sure you want to remove <strong className="text-white">&quot;{deleteTarget.name}&quot;</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-2.5 justify-center pt-2">
              <button 
                onClick={() => setDeleteTarget(null)} 
                className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteTarget} 
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-red-600/30"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
