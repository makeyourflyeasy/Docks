
import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Briefcase, Truck, Edit, Trash2, Key, Save, X, CheckCircle, 
  AlertTriangle, Eye, FileText, CreditCard, ChevronRight, Calendar, DollarSign, 
  Clock, Plus, Shield, Phone, MapPin, Building, Percent, Upload, Check, 
  Receipt, ArrowUpRight, ArrowDownLeft, LayoutGrid, List, Search, Mail, ChevronLeft
} from 'lucide-react';
import { AppUser, UserRole, Case, FinanceEntry, CaseStatus, Client, ClientDefaultCharge, UNIVERSAL_CHARGE_TYPES } from '../types';
import { safeAppStorage } from '../services/storage';
import { compressAndPrepareFile } from '../services/fileUtils';
import { saveClientToFirestore, subscribeToClients } from '../services/dbService';

const INITIAL_USERS: AppUser[] = [
  { 
    id: 1, userId: 'EMP-0001', password: 'password123', name: 'Shahid Khan', 
    role: UserRole.CEO, contact: '0300-1111111', email: 'ceo@docks.com', status: 'ACTIVE',
    fatherName: 'Akhtar Khan', residentialAddress: 'Defence Phase 6, Karachi', baseSalary: 250000,
    allowances: { fuel: 25000, mobile: 5000, internet: 5000 }
  },
  { 
    id: 2, userId: 'ADMIN', password: 'admin123', name: 'Arbab Khan', 
    role: UserRole.ADMIN, contact: '0300-1234567', email: 'admin@docks.com', status: 'ACTIVE',
    fatherName: 'Tariq Khan', residentialAddress: 'Clifton Block 4, Karachi', baseSalary: 180000
  },
  { 
    id: 3, userId: 'EMP-0002', password: 'password123', name: 'Bilal Ahmed', 
    role: UserRole.OPERATIONS_MANAGER, contact: '0321-9876543', email: 'ops@docks.com', status: 'ACTIVE',
    fatherName: 'Ahmed Ali', residentialAddress: 'Gulshan-e-Iqbal, Karachi', baseSalary: 110000
  },
  { 
    id: 4, userId: 'EMP-0003', password: 'password123', name: 'Faisal Karim', 
    role: UserRole.FINANCE_MANAGER, contact: '0333-5554444', email: 'finance@docks.com', status: 'ACTIVE',
    fatherName: 'Karim Ullah', residentialAddress: 'North Nazimabad, Karachi', baseSalary: 120000
  },
  { 
    id: 5, userId: 'EMP-0004', password: 'password123', name: 'Kamran Akmal', 
    role: UserRole.CRO, contact: '0333-1122334', email: 'cro@docks.com', status: 'ACTIVE',
    baseSalary: 95000
  },
  { 
    id: 6, userId: 'EMP-0005', password: 'password123', name: 'Sana Mir', 
    role: UserRole.HR_MANAGER, contact: '0345-1122334', email: 'hr@docks.com', status: 'ACTIVE',
    baseSalary: 100000
  },
  { 
    id: 7, userId: 'EMP-0006', password: 'password123', name: 'Usman Qadir', 
    role: UserRole.ACCOUNTANT, contact: '0312-9988776', email: 'accounts@docks.com', status: 'ACTIVE',
    baseSalary: 85000
  },
  { 
    id: 8, userId: 'EMP-0007', password: 'password123', name: 'Fahad Mustafa', 
    role: UserRole.VEHICLE_MANAGER, contact: '0301-2233445', email: 'transport@docks.com', status: 'ACTIVE',
    baseSalary: 90000
  },
  { 
    id: 9, userId: 'EMP-0008', password: 'password123', name: 'Rashid Latif', 
    role: UserRole.LOADING_PORT_STAFF, contact: '0302-3344556', email: 'port.loading@docks.com', status: 'ACTIVE',
    baseSalary: 65000
  },
  { 
    id: 10, userId: 'EMP-0009', password: 'password123', name: 'Moin Khan', 
    role: UserRole.UNLOADING_PORT_STAFF, contact: '0303-4455667', email: 'port.unloading@docks.com', status: 'ACTIVE',
    baseSalary: 65000
  },
  { 
    id: 11, userId: 'EMP-0010', password: 'password123', name: 'Shoaib Akhtar', 
    role: UserRole.DOCUMENTATION_OFFICER, contact: '0304-5566778', email: 'docs@docks.com', status: 'ACTIVE',
    baseSalary: 70000
  },
  { 
    id: 12, userId: 'EMP-0011', password: 'password123', name: 'Wasim Akram', 
    role: UserRole.TRANSPORT_ALLOCATION_OFFICER, contact: '0305-6677889', email: 'allocation@docks.com', status: 'ACTIVE',
    baseSalary: 75000
  },
  { 
    id: 13, userId: 'EMP-0012', password: 'password123', name: 'Inzamam Ul Haq', 
    role: UserRole.DATA_ENTRY_OFFICER, contact: '0306-7788990', email: 'data@docks.com', status: 'ACTIVE',
    baseSalary: 55000
  },
  { 
    id: 14, userId: 'EMP-0013', password: 'password123', name: 'Younis Khan', 
    role: UserRole.CUSTOMER_SUPPORT, contact: '0307-8899001', email: 'support@docks.com', status: 'ACTIVE',
    baseSalary: 60000
  },
  { 
    id: 15, userId: 'EMP-0014', password: 'password123', name: 'Sarfaraz Ahmed', 
    role: UserRole.RIDER, contact: '0308-9900112', email: 'rider@docks.com', status: 'ACTIVE',
    baseSalary: 45000, allowances: { fuel: 15000, mobile: 2000 }, loansAdvances: 5000
  },
  { 
    id: 16, userId: 'EMP-0015', password: 'password123', name: 'Sher Khan', 
    role: UserRole.WATCHMAN, contact: '0345-5566778', email: 'n/a', status: 'ACTIVE',
    baseSalary: 38000
  },
  { 
    id: 17, userId: 'EMP-0016', password: 'password123', name: 'Gul Zaman', 
    role: UserRole.PEON, contact: '0311-2233445', email: 'n/a', status: 'ACTIVE',
    baseSalary: 35000
  },
  { 
    id: 18, userId: 'EMP-0017', password: 'password123', name: 'Raju Bhai', 
    role: UserRole.SWEEPER, contact: '0322-3344556', email: 'n/a', status: 'ACTIVE',
    baseSalary: 32000
  },
  { 
    id: 19, userId: 'CLT-001', password: 'client123', name: 'Global Traders Ltd', 
    role: UserRole.CLIENT, contact: '021-111-222-333', email: 'info@globaltraders.com', status: 'ACTIVE' 
  },
  { 
    id: 20, userId: 'CLT-002', password: 'client123', name: 'Swift Logistics', 
    role: UserRole.CLIENT, contact: '0300-5555555', email: 'contact@swiftlogistics.com', status: 'ACTIVE' 
  },
  { 
    id: 21, userId: 'CLT-003', password: 'client123', name: 'Pak China Trade Co', 
    role: UserRole.CLIENT, contact: '0321-4444444', email: 'info@pakchina.com', status: 'INACTIVE' 
  }
];

// Mock Data for Client Details
const MOCK_CLIENT_CASES: Case[] = [
  { 
    id: '1', caseNo: 'DPL-24-00042', clientName: 'Global Traders Ltd', category: 'Afghan Transit', 
    status: CaseStatus.LOADING_PORT_PROCESSING, pol: 'SHA', pod: 'KDH', createdAt: '2024-05-20', 
    documents: [], containers: [], extractedData: {} 
  },
  { 
    id: '2', caseNo: 'DPL-24-00015', clientName: 'Global Traders Ltd', category: 'Customs Clearance', 
    status: CaseStatus.COMPLETED, pol: 'JEA', pod: 'KPT', createdAt: '2024-04-10', 
    documents: [], containers: [], extractedData: {} 
  },
  { 
    id: '3', caseNo: 'DPL-24-00041', clientName: 'Swift Logistics', category: 'Bonded Carrier', 
    status: CaseStatus.IN_TRANSIT, pol: 'JEA', pod: 'LHR-NLC', createdAt: '2024-05-18', 
    documents: [], containers: [], extractedData: {} 
  }
];

const MOCK_CLIENT_PAYMENTS: FinanceEntry[] = [
  { id: 1, date: '2024-05-20', description: 'Advance Payment - Case DPL-0042', amount: 50000, type: 'INCOME', status: 'PAID', party: 'Global Traders Ltd', category: 'Logistics Services', reference: 'INV-2024-001' },
  { id: 2, date: '2024-05-18', description: 'Logistics Service Invoice #442', amount: 80000, type: 'RECEIVABLE', status: 'PARTIAL', party: 'Global Traders Ltd', category: 'Services', reference: 'INV-442' },
  { id: 3, date: '2024-04-15', description: 'Clearance Charges', amount: 120000, type: 'INCOME', status: 'PAID', party: 'Global Traders Ltd', category: 'Customs', reference: 'INV-2024-005' },
];

export const CASE_CATEGORIES = [
  "Afghan Transit",
  "Bonded Carrier",
  "Customs Clearance",
  "TIR",
  "Transportation of Private Cargo",
  "Warehousing & Distribution"
];

const UserManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'office' | 'clients' | 'transporters'>(() => {
    return (safeAppStorage.getItem('dpl_user_tab') as any) || 'office';
  });

  useEffect(() => {
    safeAppStorage.setItem('dpl_user_tab', activeTab);
  }, [activeTab]);

  const [users, setUsers] = useState<AppUser[]>(INITIAL_USERS);
  
  // Onboarding Modal Flow
  const [showRoleSelectorModal, setShowRoleSelectorModal] = useState(false);
  const [selectedOnboardingRole, setSelectedOnboardingRole] = useState<'STAFF' | 'CLIENT' | 'TRANSPORTER' | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Staff / Employee HR Profile & Cashbook Modal
  const [selectedStaffUser, setSelectedStaffUser] = useState<AppUser | null>(null);
  
  // Delete Confirmation State
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Client Details & Billing Setup Modal
  const [selectedClient, setSelectedClient] = useState<AppUser | null>(null);
  const [detailsTab, setDetailsTab] = useState<'cases' | 'payments' | 'billing'>('cases');

  // Search & View Mode (cards for responsive mobile, table for wide view)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => {
    return typeof window !== 'undefined' && window.innerWidth < 768 ? 'cards' : 'table';
  });
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form State (Handles Staff, Client, and Transporter according to SRS specifications)
  const [formData, setFormData] = useState({
    // Basic Info
    name: '', // Company Name or Staff Full Name
    email: '',
    contact: '', // Primary Phone
    role: '' as UserRole | '',
    generatedId: '',
    generatedPass: '',
    profilePicture: '',

    // Staff HR Fields (SRS Section 3)
    fatherName: '',
    residentialAddress: '',
    secondaryPhone: '',
    secondaryPhoneRelation: '',
    cnicFront: '',
    cnicBack: '',
    baseSalary: 50000,
    allowanceMobile: 0,
    allowanceFuel: 0,
    allowanceInternet: 0,
    loansAdvances: 0,

    // Client Onboarding & Billing Setup (SRS Section 1)
    ownerName: '',
    officeAddress: '',
    officePhone: '',
    mobileNumber: '',
    whatsappNumber: '',
    ntn: '',
    strn: '',
    defaultCaseCategory: 'Afghan Transit',
    clientCharges: UNIVERSAL_CHARGE_TYPES.map(c => ({
      id: c.id,
      category: 'Afghan Transit',
      description: c.name,
      defaultAmount: c.defaultAmount,
      enabled: true
    })),

    // Transporter Onboarding (SRS Section 4)
    representativeName: '',
    landline: '',
    fleetSize: 1,
    containerCompatibility: ['20ft', '40ft'] as string[],
    preferredRoutes: 'Karachi - Lahore - Peshawar'
  });

  // Custom Charge Addition within Client Setup
  const [newCustomChargeName, setNewCustomChargeName] = useState('');
  const [newCustomChargeAmount, setNewCustomChargeAmount] = useState<number>(5000);
  const [showAddCustomChargeInput, setShowAddCustomChargeInput] = useState(false);

  // Step 1: Open Role Selector Prompt
  const handleOpenAdd = () => {
    setShowRoleSelectorModal(true);
  };

  // Step 2: User selects Staff, Client, or Transporter
  const handleSelectRoleType = (roleType: 'STAFF' | 'CLIENT' | 'TRANSPORTER') => {
    setSelectedOnboardingRole(roleType);
    setShowRoleSelectorModal(false);
    setIsEditing(false);
    setEditingId(null);

    // Auto-generate ID prefix
    const prefix = roleType === 'CLIENT' ? 'CLT-' : roleType === 'TRANSPORTER' ? 'TRP-' : 'EMP-';
    const existingIds = users
      .map(u => u.userId)
      .filter(id => id && id.startsWith(prefix))
      .map(id => parseInt(id!.split('-')[1]) || 0);
    const nextNum = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
    const generatedId = `${prefix}${nextNum.toString().padStart(4, '0')}`;
    const generatedPass = Math.random().toString(36).slice(-8).toUpperCase();

    setFormData({
      name: '',
      email: '',
      contact: '',
      role: roleType === 'CLIENT' ? UserRole.CLIENT : roleType === 'TRANSPORTER' ? UserRole.TRANSPORTER : UserRole.DATA_ENTRY_OFFICER,
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
      ownerName: '',
      officeAddress: '',
      officePhone: '',
      mobileNumber: '',
      whatsappNumber: '',
      ntn: '',
      strn: '',
      defaultCaseCategory: 'Afghan Transit',
      clientCharges: UNIVERSAL_CHARGE_TYPES.map(c => ({
        id: c.id,
        category: 'Afghan Transit',
        description: c.name,
        defaultAmount: c.defaultAmount,
        enabled: true
      })),
      representativeName: '',
      landline: '',
      fleetSize: 1,
      containerCompatibility: ['20ft', '40ft'],
      preferredRoutes: 'Karachi - Lahore - Peshawar'
    });

    if (roleType === 'CLIENT') setActiveTab('clients');
    else if (roleType === 'TRANSPORTER') setActiveTab('transporters');
    else setActiveTab('office');

    setShowModal(true);
  };

  const handleEditUser = (user: AppUser) => {
    const isClient = user.role === UserRole.CLIENT;
    const isTransporter = user.role === UserRole.TRANSPORTER;
    const roleType = isClient ? 'CLIENT' : isTransporter ? 'TRANSPORTER' : 'STAFF';
    setSelectedOnboardingRole(roleType);

    setFormData({
      name: user.name,
      email: user.email,
      contact: user.contact,
      role: user.role,
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
      ownerName: '',
      officeAddress: '',
      officePhone: user.contact || '',
      mobileNumber: user.contact || '',
      whatsappNumber: '',
      ntn: '',
      strn: '',
      defaultCaseCategory: 'Afghan Transit',
      clientCharges: UNIVERSAL_CHARGE_TYPES.map(c => ({
        id: c.id,
        category: 'Afghan Transit',
        description: c.name,
        defaultAmount: c.defaultAmount,
        enabled: true
      })),
      representativeName: '',
      landline: '',
      fleetSize: 1,
      containerCompatibility: ['20ft', '40ft'],
      preferredRoutes: 'Karachi - Lahore - Peshawar'
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

    const assignedRole = selectedOnboardingRole === 'CLIENT' 
      ? UserRole.CLIENT 
      : selectedOnboardingRole === 'TRANSPORTER' 
      ? UserRole.TRANSPORTER 
      : (formData.role || UserRole.DATA_ENTRY_OFFICER);

    if (isEditing && editingId) {
      setUsers(prev => prev.map(u => u.id === editingId ? {
        ...u,
        name: formData.name,
        email: formData.email,
        contact: formData.contact || formData.mobileNumber || formData.officePhone,
        role: assignedRole as UserRole,
        userId: formData.generatedId,
        password: formData.generatedPass,
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
        loansAdvances: formData.loansAdvances
      } : u));
    } else {
      const newUser: AppUser = {
        id: Date.now(),
        name: formData.name,
        email: formData.email,
        contact: formData.contact || formData.mobileNumber || formData.officePhone,
        role: assignedRole as UserRole,
        status: 'ACTIVE',
        userId: formData.generatedId,
        password: formData.generatedPass,
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
        loansAdvances: formData.loansAdvances
      };
      setUsers(prev => [...prev, newUser]);

      // If client, also synchronize to Firestore Clients collection
      if (selectedOnboardingRole === 'CLIENT') {
        try {
          await saveClientToFirestore({
            name: formData.name,
            ownerName: formData.ownerName,
            contact: formData.officePhone || formData.contact,
            officeAddress: formData.officeAddress,
            mobileNumber: formData.mobileNumber,
            whatsappNumber: formData.whatsappNumber,
            email: formData.email,
            ntn: formData.ntn,
            strn: formData.strn,
            defaultCaseCategory: formData.defaultCaseCategory,
            defaultCharges: formData.clientCharges.filter(c => c.enabled).map(c => ({
              id: c.id,
              category: formData.defaultCaseCategory,
              description: c.description,
              defaultAmount: c.defaultAmount,
              taxable: true
            }))
          });
        } catch (err) {
          console.warn("Notice: Client stored locally", err);
        }
      }
    }

    setShowModal(false);
  };

  const confirmDeleteUser = () => {
    if (deleteId) {
      setUsers(users.filter(u => u.id !== deleteId));
      setDeleteId(null);
    }
  };

  const handleAddCustomCharge = () => {
    if (!newCustomChargeName.trim()) return;
    const newId = `custom_${Date.now()}`;
    setFormData(prev => ({
      ...prev,
      clientCharges: [
        ...prev.clientCharges,
        {
          id: newId,
          category: prev.defaultCaseCategory,
          description: newCustomChargeName.trim(),
          defaultAmount: Number(newCustomChargeAmount) || 0,
          enabled: true
        }
      ]
    }));
    setNewCustomChargeName('');
    setNewCustomChargeAmount(5000);
    setShowAddCustomChargeInput(false);
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
        console.warn("File processing note:", err);
      } finally {
        e.target.value = '';
      }
    }
  };

  const currentTabUsers = users.filter(u => {
    if (activeTab === 'office') return u.role !== UserRole.CLIENT && u.role !== UserRole.TRANSPORTER;
    if (activeTab === 'clients') return u.role === UserRole.CLIENT;
    if (activeTab === 'transporters') return u.role === UserRole.TRANSPORTER;
    return true;
  });

  const filteredUsers = currentTabUsers.filter(u => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.userId && u.userId.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q)) ||
      (u.contact && u.contact.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.fatherName && u.fatherName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2 drop-shadow-md">
            <Users className="text-brand-400" /> User Management & Onboarding
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            System RBAC & Profiles: Staff (HR, Payroll & Cashbook), Clients (Billing & Charges), and Transporters (Fleet).
          </p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="w-full sm:w-auto bg-brand-600 hover:bg-brand-500 text-white px-4 sm:px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold shadow-lg shadow-brand-600/30 transition-all hover:scale-102 active:scale-95"
        >
          <UserPlus size={17} /> Create User ID
        </button>
      </div>

      {/* Primary Tabs */}
      <div className="flex gap-2 sm:gap-3 border-b border-white/10 pb-1.5 overflow-x-auto custom-scrollbar-x no-scrollbar" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y' }}>
        <button
          onClick={() => setActiveTab('office')}
          className={`flex items-center gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl transition-all whitespace-nowrap text-xs sm:text-sm font-semibold shrink-0 ${
            activeTab === 'office' ? 'bg-brand-600/20 text-brand-300 border border-brand-500/40 shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <Briefcase size={16} /> Office Staff ({users.filter(u => u.role !== UserRole.CLIENT && u.role !== UserRole.TRANSPORTER).length})
        </button>
        <button
          onClick={() => setActiveTab('clients')}
          className={`flex items-center gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl transition-all whitespace-nowrap text-xs sm:text-sm font-semibold shrink-0 ${
            activeTab === 'clients' ? 'bg-brand-600/20 text-brand-300 border border-brand-500/40 shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <Users size={16} /> Clients ({users.filter(u => u.role === UserRole.CLIENT).length})
        </button>
        <button
          onClick={() => setActiveTab('transporters')}
          className={`flex items-center gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl transition-all whitespace-nowrap text-xs sm:text-sm font-semibold shrink-0 ${
            activeTab === 'transporters' ? 'bg-brand-600/20 text-brand-300 border border-brand-500/40 shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <Truck size={16} /> Transporters ({users.filter(u => u.role === UserRole.TRANSPORTER).length})
        </button>
      </div>

      {/* Search & Layout View Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white/5 p-2 sm:p-2.5 rounded-2xl border border-white/10">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, ID, role, or contact..."
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

        {/* View Mode Toggle & Total Count */}
        <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
          <span className="text-xs text-gray-400 px-1 font-mono">
            {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
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
              title="Cards View (Best for Mobile)"
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
              title="Table View"
            >
              <List size={14} />
              <span>Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Cards or Table */}
      {filteredUsers.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center border border-white/10 text-gray-400 space-y-2">
          <Users size={32} className="mx-auto text-gray-500 mb-2" />
          <p className="text-sm font-semibold text-white">No users found matching your search</p>
          <p className="text-xs text-gray-500">Try adjusting your search criteria or switch tabs</p>
        </div>
      ) : viewMode === 'cards' ? (
        /* Cards View (Responsive Mobile & Desktop Grid) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredUsers.map(user => (
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
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] font-mono font-semibold text-brand-400 bg-brand-500/10 px-1.5 py-0.5 rounded border border-brand-500/20">
                        {user.userId || 'N/A'}
                      </span>
                      <span className="bg-white/10 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-gray-200 font-medium truncate">
                        {user.role.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                </div>
                <span className="text-green-400 text-[11px] font-bold flex items-center gap-1 shrink-0 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_6px_currentColor]"></span> {user.status}
                </span>
              </div>

              {user.fatherName && (
                <div className="text-xs text-gray-400 flex items-center gap-1.5 px-0.5">
                  <span className="text-gray-500 font-medium">S/O:</span>
                  <span className="text-gray-200 font-medium">{user.fatherName}</span>
                </div>
              )}

              {/* Contact information with clickable phone call */}
              <div className="bg-white/5 rounded-xl p-2.5 border border-white/5 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 flex items-center gap-1.5">
                    <Phone size={13} className="text-brand-400 shrink-0" /> Contact:
                  </span>
                  <a 
                    href={`tel:${user.contact}`} 
                    className="font-mono text-white hover:text-brand-300 font-semibold transition"
                  >
                    {user.contact || 'N/A'}
                  </a>
                </div>
                {user.email && user.email !== 'n/a' && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 flex items-center gap-1.5">
                      <Mail size={13} className="text-brand-400 shrink-0" /> Email:
                    </span>
                    <span className="text-gray-300 truncate max-w-[180px] font-mono text-[11px]">
                      {user.email}
                    </span>
                  </div>
                )}
              </div>

              {/* Salary & Advance (for Office staff) */}
              {activeTab === 'office' && (
                <div className="flex items-center justify-between text-xs bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">
                  <span className="text-emerald-300 font-medium">Salary:</span>
                  <div className="text-right">
                    <span className="font-mono font-bold text-emerald-400">PKR {(user.baseSalary || 45000).toLocaleString()}</span>
                    {user.loansAdvances ? (
                      <p className="text-[10px] text-amber-400 font-mono">Adv: PKR {user.loansAdvances.toLocaleString()}</p>
                    ) : null}
                  </div>
                </div>
              )}

              {/* Bottom Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  {activeTab === 'office' && (
                    <button
                      onClick={() => setSelectedStaffUser(user)}
                      className="w-full text-emerald-300 hover:text-emerald-200 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 transition-all text-xs flex items-center justify-center gap-1.5 font-semibold"
                      title="View HR Profile & Cashbook Ledger"
                    >
                      <CreditCard size={14} /> HR / Cashbook
                    </button>
                  )}
                  {activeTab === 'clients' && (
                    <button 
                      onClick={() => { setSelectedClient(user); setDetailsTab('cases'); }}
                      className="w-full text-brand-300 hover:text-brand-200 px-2.5 py-1.5 rounded-lg bg-brand-500/15 hover:bg-brand-500/25 border border-brand-500/30 transition-all text-xs flex items-center justify-center gap-1.5 font-semibold"
                      title="View Client Details & Billing Setup"
                    >
                      <Eye size={14} /> Profile & Charges
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button 
                    onClick={() => handleEditUser(user)}
                    className="text-gray-300 hover:text-white p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    title="Edit User"
                  >
                    <Edit size={14} />
                  </button>
                  <button 
                    onClick={() => setDeleteId(user.id)}
                    className="text-gray-400 hover:text-red-400 p-2 rounded-lg bg-white/5 hover:bg-red-500/10 transition-colors"
                    title="Delete User"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Users Table View (with full horizontal scroll support) */
        <div className="glass-card rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
          {/* Mobile Swipe Cue */}
          <div className="sm:hidden px-3.5 py-2 bg-brand-500/10 border-b border-brand-500/20 text-brand-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-medium">
              <ChevronLeft size={14} className="animate-pulse" />
              <span>Swipe horizontally for full table</span>
              <ChevronRight size={14} className="animate-pulse" />
            </div>
            <span className="text-[10px] text-gray-400 font-mono">
              6 Columns
            </span>
          </div>

          <div 
            className="overflow-x-auto custom-scrollbar custom-scrollbar-x"
            style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y' }}
          >
            <table className="w-full text-left text-sm text-gray-300 min-w-[750px]">
              <thead className="bg-white/5 uppercase text-xs font-semibold text-gray-400 border-b border-white/10">
                <tr>
                  <th className="p-4">User Details</th>
                  <th className="p-4">Role & Duties</th>
                  <th className="p-4">Contact Info</th>
                  {activeTab === 'office' && <th className="p-4">Monthly Salary</th>}
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map(user => (
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
                        <span className="text-xs font-mono text-brand-400">{user.userId || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="bg-white/10 border border-white/10 rounded-md px-2.5 py-1 text-xs text-gray-200 font-medium inline-block">
                        {user.role.replace(/_/g, ' ')}
                      </span>
                      {user.fatherName && (
                        <p className="text-[11px] text-gray-400 mt-1">S/O: {user.fatherName}</p>
                      )}
                    </td>
                    <td className="p-4">
                      <p className="text-white font-mono text-xs">{user.contact}</p>
                      <p className="text-[11px] text-gray-400 truncate max-w-[180px]">{user.email}</p>
                    </td>
                    {activeTab === 'office' && (
                      <td className="p-4">
                        <span className="font-mono text-emerald-400 font-semibold text-xs">
                          PKR {(user.baseSalary || 45000).toLocaleString()}
                        </span>
                        {user.loansAdvances ? (
                          <p className="text-[10px] text-amber-400">Advance: PKR {user.loansAdvances.toLocaleString()}</p>
                        ) : null}
                      </td>
                    )}
                    <td className="p-4">
                      <span className="text-green-400 text-xs font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_currentColor]"></span> {user.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {activeTab === 'office' && (
                          <button
                            onClick={() => setSelectedStaffUser(user)}
                            className="text-emerald-400 hover:text-emerald-300 p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors text-xs flex items-center gap-1 font-medium"
                            title="View HR Profile & Cashbook Ledger"
                          >
                            <CreditCard size={14} /> HR / Cash
                          </button>
                        )}
                        {activeTab === 'clients' && (
                          <button 
                            onClick={() => { setSelectedClient(user); setDetailsTab('cases'); }}
                            className="text-brand-400 hover:text-white p-1.5 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 transition-colors text-xs flex items-center gap-1 font-medium"
                            title="View Client Details & Billing Setup"
                          >
                            <Eye size={14} /> Profile
                          </button>
                        )}
                        <button 
                          onClick={() => handleEditUser(user)}
                          className="text-gray-300 hover:text-white p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                          title="Edit User"
                        >
                          <Edit size={15} />
                        </button>
                        <button 
                          onClick={() => setDeleteId(user.id)}
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
      )}

      {/* ========================================================= */}
      {/* 1. PRIMARY ROLE SELECTION PROMPT MODAL (SRS Section 1) */}
      {/* ========================================================= */}
      {showRoleSelectorModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="glass-card p-6 sm:p-8 rounded-3xl w-full max-w-2xl border border-white/15 shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-brand-400 font-bold">Onboarding Flow</span>
                <h3 className="text-xl sm:text-2xl font-bold text-white mt-0.5">Select User / Entity Type</h3>
              </div>
              <button onClick={() => setShowRoleSelectorModal(false)} className="text-gray-400 hover:text-white p-1.5 rounded-full bg-white/5">
                <X size={20} />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-gray-300">
              Please specify the category of user you are creating. The system will immediately direct you to the dedicated configuration form:
            </p>

            {/* 3 Large Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* Card 1: Staff Member */}
              <button
                type="button"
                onClick={() => handleSelectRoleType('STAFF')}
                className="group p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-brand-500/50 hover:bg-brand-500/10 transition-all text-left flex flex-col justify-between hover:scale-102 shadow-lg"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Briefcase size={24} />
                  </div>
                  <h4 className="text-base font-bold text-white">Staff Member</h4>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Finance, Case, Vehicle, Port, Documentation, Riders, Sweepers & Peons.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-brand-300 font-semibold">
                  <span>HR & Salary Setup</span>
                  <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              {/* Card 2: Client */}
              <button
                type="button"
                onClick={() => handleSelectRoleType('CLIENT')}
                className="group p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-500/15 transition-all text-left flex flex-col justify-between hover:scale-102 shadow-lg"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Building size={24} />
                  </div>
                  <h4 className="text-base font-bold text-white">Client</h4>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Direct Client Profile & Universal Case Billing Setup (DO, TP, Loading, etc.).
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-emerald-300 font-semibold">
                  <span>Billing & Tariffs</span>
                  <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              {/* Card 3: Transporter */}
              <button
                type="button"
                onClick={() => handleSelectRoleType('TRANSPORTER')}
                className="group p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 hover:border-amber-500/50 hover:bg-amber-500/15 transition-all text-left flex flex-col justify-between hover:scale-102 shadow-lg"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Truck size={24} />
                  </div>
                  <h4 className="text-base font-bold text-white">Transporter</h4>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Fleet Management, NTN, Owner CNIC & Vehicle registration.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-amber-300 font-semibold">
                  <span>Fleet & NOC</span>
                  <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. DEDICATED ONBOARDING MODAL FOR SELECTED ENTITY */}
      {/* ========================================================= */}
      {showModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="glass-card p-6 rounded-3xl w-full max-w-2xl border border-white/15 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-white/10 sticky top-0 bg-slate-900/90 backdrop-blur-md z-10">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-brand-400 font-bold">
                  {selectedOnboardingRole === 'CLIENT' ? 'Client Onboarding & Billing Form' : selectedOnboardingRole === 'TRANSPORTER' ? 'Transporter Fleet Profile' : 'Staff Member HR Profile'}
                </span>
                <h3 className="text-xl font-bold text-white">
                  {isEditing ? 'Edit Profile' : 'Register New'} {selectedOnboardingRole === 'CLIENT' ? 'Client Company' : selectedOnboardingRole === 'TRANSPORTER' ? 'Transporter Entity' : 'Staff Employee'}
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white p-1 rounded-full bg-white/5">
                <X size={20} />
              </button>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* A: CLIENT ONBOARDING & BILLING SETUP (SRS Section 1) */}
            {/* ------------------------------------------------------------- */}
            {selectedOnboardingRole === 'CLIENT' && (
              <div className="space-y-6">
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-xs text-emerald-300 flex items-start gap-2">
                  <CheckCircle size={16} className="shrink-0 mt-0.5" />
                  <span>
                    Client onboarding pre-configures universal charges and tariffs. These default charges will automatically populate whenever a new case is registered for this client, with full override flexibility per case.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Company Name *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Al-Madina Cargo LLC"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white focus:border-brand-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Company Owner Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Haji Muhammad Tariq"
                      value={formData.ownerName}
                      onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white focus:border-brand-500 outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-gray-400 block mb-1">Office Address</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Suite 402, Trade Center, I.I. Chundrigar Road, Karachi"
                      value={formData.officeAddress}
                      onChange={(e) => setFormData({ ...formData, officeAddress: e.target.value })}
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white focus:border-brand-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Office Phone / Landline</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 021-32456789"
                      value={formData.officePhone}
                      onChange={(e) => setFormData({ ...formData, officePhone: e.target.value, contact: e.target.value })}
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white focus:border-brand-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Mobile Number</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 0300-1234567"
                      value={formData.mobileNumber}
                      onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white focus:border-brand-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">WhatsApp Number</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 0300-1234567"
                      value={formData.whatsappNumber}
                      onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white focus:border-brand-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">NTN / STRN</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 1234567-8"
                      value={formData.ntn}
                      onChange={(e) => setFormData({ ...formData, ntn: e.target.value })}
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white focus:border-brand-500 outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-gray-400 block mb-1">Default Case Category</label>
                    <select 
                      value={formData.defaultCaseCategory}
                      onChange={(e) => setFormData({ ...formData, defaultCaseCategory: e.target.value })}
                      className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white focus:border-brand-500 outline-none"
                    >
                      {CASE_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Universal Charges & Billing Structure Configuration */}
                <div className="space-y-3 pt-4 border-t border-white/10">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <DollarSign size={16} className="text-emerald-400" />
                        Universal Case Charges & Tariffs
                      </h4>
                      <p className="text-[11px] text-gray-400">
                        Default amounts for this client. You can adjust values or disable items.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddCustomChargeInput(!showAddCustomChargeInput)}
                      className="text-xs bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1 self-start sm:self-auto font-medium"
                    >
                      <Plus size={13} /> Add Custom Charge Head
                    </button>
                  </div>

                  {/* Add Custom Charge Inline Form */}
                  {showAddCustomChargeInput && (
                    <div className="p-3 bg-white/5 border border-brand-500/30 rounded-xl flex flex-col sm:flex-row gap-2 items-center">
                      <input 
                        type="text"
                        placeholder="Charge Name (e.g. Weighbridge Fee)"
                        value={newCustomChargeName}
                        onChange={(e) => setNewCustomChargeName(e.target.value)}
                        className="flex-1 bg-black/40 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                      />
                      <input 
                        type="number"
                        placeholder="Amount PKR"
                        value={newCustomChargeAmount}
                        onChange={(e) => setNewCustomChargeAmount(Number(e.target.value))}
                        className="w-28 bg-black/40 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomCharge}
                        className="bg-brand-600 hover:bg-brand-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
                      >
                        Add
                      </button>
                    </div>
                  )}

                  {/* Charges List Grid */}
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {formData.clientCharges.map((ch, idx) => (
                      <div key={ch.id} className="p-2.5 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between gap-3 text-xs">
                        <label className="flex items-center gap-2 cursor-pointer flex-1">
                          <input 
                            type="checkbox"
                            checked={ch.enabled}
                            onChange={(e) => {
                              const updated = [...formData.clientCharges];
                              updated[idx].enabled = e.target.checked;
                              setFormData({ ...formData, clientCharges: updated });
                            }}
                            className="rounded border-white/20 text-brand-600"
                          />
                          <span className={ch.enabled ? "text-white font-medium" : "text-gray-500 line-through"}>
                            {ch.description}
                          </span>
                        </label>
                        <div className="flex items-center gap-1 font-mono">
                          <span className="text-[10px] text-gray-400">PKR</span>
                          <input 
                            type="number"
                            disabled={!ch.enabled}
                            value={ch.defaultAmount}
                            onChange={(e) => {
                              const updated = [...formData.clientCharges];
                              updated[idx].defaultAmount = Number(e.target.value) || 0;
                              setFormData({ ...formData, clientCharges: updated });
                            }}
                            className="w-24 bg-black/40 border border-white/10 rounded px-2 py-1 text-right text-emerald-400 text-xs font-semibold outline-none disabled:opacity-30"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Generated Credentials */}
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-2">
                  <h4 className="text-xs font-bold text-gray-300 flex items-center gap-1.5"><Key size={14} /> Client Portal Login Credentials</h4>
                  <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                    <div>
                      <span className="text-gray-500 block text-[10px]">Client ID:</span>
                      <span className="text-brand-400 font-bold">{formData.generatedId}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px]">Generated Password:</span>
                      <span className="text-white font-bold">{formData.generatedPass}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* B: STAFF MEMBER HR PROFILE (SRS Section 3) */}
            {/* ------------------------------------------------------------- */}
            {selectedOnboardingRole === 'STAFF' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Full Name *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Kamran Akmal"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Father&apos;s Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Muhammad Akmal"
                      value={formData.fatherName}
                      onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Role / Designation *</label>
                    <select 
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                      className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
                    >
                      <option value="">Select Staff Role...</option>
                      {Object.keys(UserRole).filter(r => r !== 'CLIENT' && r !== 'TRANSPORTER').map(r => (
                        <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Primary Phone *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 0300-1234567"
                      value={formData.contact}
                      onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-gray-400 block mb-1">Residential Address</label>
                    <input 
                      type="text" 
                      placeholder="e.g. House #12, Street 4, Sector 11-B, North Karachi"
                      value={formData.residentialAddress}
                      onChange={(e) => setFormData({ ...formData, residentialAddress: e.target.value })}
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Secondary Phone (Emergency)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 0321-9876543"
                      value={formData.secondaryPhone}
                      onChange={(e) => setFormData({ ...formData, secondaryPhone: e.target.value })}
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Secondary Contact Relation / Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Brother (Tariq)"
                      value={formData.secondaryPhoneRelation}
                      onChange={(e) => setFormData({ ...formData, secondaryPhoneRelation: e.target.value })}
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                {/* Salary & Payroll Settings */}
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-3">
                  <h4 className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                    <DollarSign size={14} className="text-emerald-400" />
                    Automated Payroll & Allowances Setup
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
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

                {/* CNIC Upload Front & Back */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="border border-dashed border-white/20 p-3 rounded-xl text-center relative group hover:bg-white/5">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'cnicFront')}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <Upload size={18} className="mx-auto text-brand-400 mb-1" />
                    <p className="text-xs font-semibold text-white">CNIC Front Upload</p>
                    <p className="text-[10px] text-gray-400">
                      {formData.cnicFront ? '✓ Front Image Captured' : 'Click to upload picture'}
                    </p>
                  </div>
                  <div className="border border-dashed border-white/20 p-3 rounded-xl text-center relative group hover:bg-white/5">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'cnicBack')}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <Upload size={18} className="mx-auto text-brand-400 mb-1" />
                    <p className="text-xs font-semibold text-white">CNIC Back Upload</p>
                    <p className="text-[10px] text-gray-400">
                      {formData.cnicBack ? '✓ Back Image Captured' : 'Click to upload picture'}
                    </p>
                  </div>
                </div>

                {/* Staff Credentials */}
                <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex justify-between items-center text-xs font-mono">
                  <div>
                    <span className="text-gray-500 block text-[10px]">User ID:</span>
                    <span className="text-brand-400 font-bold">{formData.generatedId}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px]">System Password:</span>
                    <span className="text-white font-bold">{formData.generatedPass}</span>
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* C: TRANSPORTER ONBOARDING (SRS Section 4) */}
            {/* ------------------------------------------------------------- */}
            {selectedOnboardingRole === 'TRANSPORTER' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Company / Fleet Name *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Swift Goods Transport"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">NTN Number</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 7654321-0"
                      value={formData.ntn}
                      onChange={(e) => setFormData({ ...formData, ntn: e.target.value })}
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Mobile Contact *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 0300-9988776"
                      value={formData.contact}
                      onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">WhatsApp Number</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 0300-9988776"
                      value={formData.whatsappNumber}
                      onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-gray-400 block mb-1">Fleet Depot / Office Address</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Maripur Road, Truck Stand, Karachi"
                      value={formData.officeAddress}
                      onChange={(e) => setFormData({ ...formData, officeAddress: e.target.value })}
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-gray-400 block mb-1">Preferred Routes & Stations</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Karachi Port to Lahore NLC, Karachi to Peshawar / Torkham"
                      value={formData.preferredRoutes}
                      onChange={(e) => setFormData({ ...formData, preferredRoutes: e.target.value })}
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                {/* Transporter Credentials */}
                <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex justify-between items-center text-xs font-mono">
                  <div>
                    <span className="text-gray-500 block text-[10px]">Transporter ID:</span>
                    <span className="text-amber-400 font-bold">{formData.generatedId}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px]">Portal Password:</span>
                    <span className="text-white font-bold">{formData.generatedPass}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-white/10">
              <button 
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveUser}
                className="px-6 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl shadow-lg shadow-brand-600/30 flex items-center gap-2 text-sm font-semibold transition-all hover:scale-102"
              >
                <Save size={16} /> {isEditing ? 'Update Profile' : 'Save & Onboard'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. STAFF HR PROFILE & CASHBOOK LEDGER MODAL (SRS Section 3) */}
      {/* ========================================================= */}
      {selectedStaffUser && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="glass-card p-6 sm:p-8 rounded-3xl w-full max-w-2xl border border-white/15 shadow-2xl space-y-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-start border-b border-white/10 pb-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-xl font-bold text-white shadow-lg">
                  {selectedStaffUser.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{selectedStaffUser.name}</h3>
                  <p className="text-xs text-brand-400 font-mono">{selectedStaffUser.userId} • {selectedStaffUser.role.replace(/_/g, ' ')}</p>
                </div>
              </div>
              <button onClick={() => setSelectedStaffUser(null)} className="text-gray-400 hover:text-white p-1 rounded-full bg-white/5">
                <X size={20} />
              </button>
            </div>

            {/* HR Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                <span className="text-gray-400 block">Father&apos;s Name:</span>
                <span className="text-white font-semibold text-sm">{selectedStaffUser.fatherName || 'Not recorded'}</span>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                <span className="text-gray-400 block">Phone & Emergency:</span>
                <span className="text-white font-mono font-semibold">{selectedStaffUser.contact}</span>
                {selectedStaffUser.secondaryPhone && (
                  <p className="text-gray-400 text-[11px] mt-0.5">Alt: {selectedStaffUser.secondaryPhone} ({selectedStaffUser.secondaryPhoneRelation || 'Relation'})</p>
                )}
              </div>
              <div className="sm:col-span-2 p-3 bg-white/5 rounded-xl border border-white/5">
                <span className="text-gray-400 block">Residential Address:</span>
                <span className="text-white">{selectedStaffUser.residentialAddress || 'Office Quarters / Karachi'}</span>
              </div>
            </div>

            {/* Salary, Advance & Cashbook Breakdown */}
            <div className="bg-slate-900/80 p-4 rounded-2xl border border-white/10 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <DollarSign size={15} /> Monthly Payroll & Cashbook Ledger
              </h4>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-2.5 bg-black/40 rounded-xl">
                  <span className="text-gray-400 text-[10px] block">Base Monthly Salary:</span>
                  <span className="text-emerald-400 font-mono font-bold text-sm">
                    PKR {(selectedStaffUser.baseSalary || 50000).toLocaleString()}
                  </span>
                </div>
                <div className="p-2.5 bg-black/40 rounded-xl">
                  <span className="text-gray-400 text-[10px] block">Active Advances:</span>
                  <span className="text-amber-400 font-mono font-bold text-sm">
                    PKR {(selectedStaffUser.loansAdvances || 0).toLocaleString()}
                  </span>
                </div>
                <div className="p-2.5 bg-black/40 rounded-xl">
                  <span className="text-gray-400 text-[10px] block">Net Payable:</span>
                  <span className="text-white font-mono font-bold text-sm">
                    PKR {((selectedStaffUser.baseSalary || 50000) - (selectedStaffUser.loansAdvances || 0)).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button 
                onClick={() => setSelectedStaffUser(null)}
                className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. CLIENT DETAILS MODAL */}
      {/* ========================================================= */}
      {selectedClient && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="glass-card w-full max-w-4xl h-[85vh] flex flex-col rounded-3xl shadow-2xl border border-white/15 overflow-hidden">
            <div className="bg-slate-900/90 p-6 border-b border-white/10 flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                  {selectedClient.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedClient.name}</h2>
                  <p className="text-xs text-gray-400 mt-1 font-mono">
                    ID: {selectedClient.userId} • Phone: {selectedClient.contact} • {selectedClient.email}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedClient(null)} className="text-gray-400 hover:text-white bg-white/5 p-2 rounded-full">
                <X size={22} />
              </button>
            </div>

            <div className="flex border-b border-white/10 bg-white/5">
              <button 
                onClick={() => setDetailsTab('cases')}
                className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${detailsTab === 'cases' ? 'border-brand-500 text-white bg-white/5' : 'border-transparent text-gray-400 hover:text-white'}`}
              >
                <Briefcase size={16} /> Case History
              </button>
              <button 
                onClick={() => setDetailsTab('payments')}
                className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${detailsTab === 'payments' ? 'border-brand-500 text-white bg-white/5' : 'border-transparent text-gray-400 hover:text-white'}`}
              >
                <CreditCard size={16} /> Payment History
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-950/50">
              {detailsTab === 'cases' && (
                <div className="space-y-3">
                  {MOCK_CLIENT_CASES.filter(c => c.clientName === selectedClient.name || c.clientName.includes(selectedClient.name.split(' ')[0])).map(c => (
                    <div key={c.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-bold text-brand-400 text-sm">{c.caseNo}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full border border-green-500/30 text-green-400 bg-green-500/10">
                            {c.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-300">{c.category} • {c.pol} → {c.pod}</p>
                      </div>
                      <span className="text-xs text-gray-500 font-mono">{c.createdAt}</span>
                    </div>
                  ))}
                </div>
              )}

              {detailsTab === 'payments' && (
                <div className="space-y-3">
                  {MOCK_CLIENT_PAYMENTS.map(p => (
                    <div key={p.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex justify-between items-center">
                      <div>
                        <h4 className="text-white text-sm font-semibold">{p.description}</h4>
                        <p className="text-xs text-gray-400">{p.reference} • {p.date}</p>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-emerald-400 font-bold text-sm">+ PKR {p.amount.toLocaleString()}</span>
                        <span className="block text-[10px] text-gray-500 uppercase">{p.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="glass-card p-6 rounded-2xl w-full max-w-sm border border-white/10 text-center space-y-4">
            <div className="bg-red-500/20 w-14 h-14 rounded-full flex items-center justify-center mx-auto border border-red-500/30">
              <AlertTriangle size={28} className="text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-white">Confirm Removal</h3>
            <p className="text-xs text-gray-400">Are you sure you want to remove this user? This action cannot be undone.</p>
            <div className="flex gap-3 justify-center pt-2">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 bg-white/10 text-white rounded-xl text-xs">
                Cancel
              </button>
              <button onClick={confirmDeleteUser} className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold">
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
