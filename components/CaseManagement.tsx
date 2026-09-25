import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  ChevronRight, ChevronDown, CheckCircle2, Upload, FileText, CheckCircle, Loader2, Save, 
  MapPin, Anchor, Box, User, AlertCircle, Calendar, Camera, X, Truck, Briefcase, 
  Search, Eye, Share2, AlertTriangle, ArrowLeft, Download, Trash2, Edit, Plus, ListFilter, Filter,
  Sparkles, Scan, FileCheck, Globe, Receipt, Scale, Ship, UploadCloud, Play, Clock, ArrowRight, RefreshCw, Layers,
  Building, Phone, Mail, DollarSign, Tag, Package, ShieldCheck, XCircle, Copy, Check, ExternalLink
} from 'lucide-react';
import Logo from './Logo';
import { useBranding } from '../services/brandingService';
import { autoFillCaseData, downloadFile, docDataCache, detectShippingDocumentType } from '../services/geminiService';
import { downloadCasePdf, sharePdfFile, downloadCustomsDeliveryOrderPdf } from '../services/pdfExportService';
import { PdfViewerModal } from './PdfViewerModal';
import { detectMimeType, compressAndPrepareFile, convertImageToPdf } from '../services/fileUtils';
import { Container, ExtractedData, CaseStatus, Case, MockDocument, UserRole, CaseCharge, Client, ClientDefaultCharge, CaseStepDetail, WORKFLOW_8_STEPS, Vehicle } from '../types';
import { WorkflowStepModal } from './WorkflowStepModal';
import { CompletedCaseDossier } from './CompletedCaseDossier';
import { submitCaseActionApproval } from '../services/approvalService';
import { 
  PAKISTAN_CUSTOMS_COMPLIANCE, 
  getStandardChargesForCategory, 
  validateCustomsCompliance,
  CategoryComplianceDetail
} from '../services/customsComplianceService';
import { safeSessionStorage, safeLocalStorage, safeAppStorage } from '../services/storage';
import { appLifecycle } from '../services/lifecycle';
import { 
  PRIMARY_SERVICE_CATEGORIES, 
  SUB_CATEGORY_OPTIONS, 
  supportsSubCategories, 
  getCategoryWorkflow, 
  getWorkflowStepIndex,
  isDestinationUnloadedAndGateOut 
} from '../services/workflowConfig';
import {
  getCategoryArrangements,
  getArrangementCharges,
  resolveCaseCharges,
  saveChargeAsClientDefault,
  CATEGORY_SERVICE_ARRANGEMENTS,
  ServiceArrangementItem,
  normalizeCategoryKey
} from '../services/categoryTariffService';
import { ClientRegistrationModal } from './ClientRegistrationModal';
import { SmartCaseSearchModal } from './SmartCaseSearchModal';
import { logActivity } from '../services/activityLogService';
import { generateDplCaseNumber, getDestinationCode, getCaseInvoiceNumber } from '../services/caseNumberService';

export interface UploadedDocRecord {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  docCategory?: 'BL' | 'INVOICE' | 'PACKING_LIST' | 'ALL_IN_ONE' | 'GENERAL';
}

export const TOP_SHIPPING_LINES_SHOWCASE = [
  { name: 'Maersk Line', prefix: 'MSKU / MRKU', flag: '🇩🇰' },
  { name: 'MSC', prefix: 'MEDU / MSCU', flag: '🇨🇭' },
  { name: 'CMA CGM', prefix: 'CMAU / APZU', flag: '🇫🇷' },
  { name: 'COSCO Shipping', prefix: 'COSU / CBHU', flag: '🇨🇳' },
  { name: 'Hapag-Lloyd', prefix: 'HLCU / HLXU', flag: '🇩🇪' },
  { name: 'ONE (Ocean Network)', prefix: 'ONEY / NYKU', flag: '🇯🇵' },
  { name: 'Evergreen Marine', prefix: 'EMCU / EGLV', flag: '🇹🇼' },
  { name: 'HMM', prefix: 'HDMU', flag: '🇰🇷' },
  { name: 'Yang Ming', prefix: 'YMLU', flag: '🇹🇼' },
  { name: 'OOCL / PIL / Wan Hai', prefix: 'OOLU / PCIU', flag: '🌏' }
];
import { 
  subscribeToCases, 
  saveCaseToFirestore, 
  updateCaseInFirestore, 
  deleteCaseFromFirestore,
  subscribeToClients,
  saveClientToFirestore,
  DEFAULT_CLIENTS
} from '../services/dbService';

export interface PortItem {
  name: string;
  code: string;
  type?: 'Sea Port' | 'Dry Port' | 'Border Terminal' | string;
}

const INITIAL_PORTS: PortItem[] = [
  // Sea Ports / Terminal
  { name: "Karachi Port Trust", code: "KPT", type: "Sea Port" },
  { name: "Port Qasim", code: "QICT", type: "Sea Port" },
  { name: "South Asia Pakistan Terminals", code: "SAPT", type: "Sea Port" },
  { name: "Karachi International Container Terminal", code: "KICT", type: "Sea Port" },
  { name: "Karachi Gateway Terminal", code: "KGTL", type: "Sea Port" },
  { name: "Karachi Gateway Terminal Multipurpose", code: "KGTML", type: "Sea Port" },
  { name: "Al-Hamd International Container Terminal", code: "AICT", type: "Sea Port" },
  { name: "Gwadar Port", code: "GWADAR", type: "Sea Port" },
  { name: "NLC Sultanabad", code: "NLC Sultanabad", type: "Sea Port" },

  // Dry Ports
  { name: "Faisalabad Dry Port", code: "Faisalabad Dry Port", type: "Dry Port" },
  { name: "Lahore Dry Port", code: "Lahore Dry Port", type: "Dry Port" },
  { name: "Lahore NLC Dry Port", code: "Lahore NLC", type: "Dry Port" },
  { name: "Lahore MICT Dry Port", code: "Lahore MICT", type: "Dry Port" },
  { name: "Lahore DPW Dry Port", code: "Lahore DPW", type: "Dry Port" },
  { name: "Rawalpindi Dry Port", code: "Rawalpindi Dry Port", type: "Dry Port" },
  { name: "Multan Dry Port", code: "Multan Dry Port", type: "Dry Port" },
  { name: "Sialkot Dry Port", code: "SICT", type: "Dry Port" },
  { name: "Islamabad Dry Port", code: "Islamabad Dry Port", type: "Dry Port" },
  { name: "Azakhel Dry Port", code: "Azakhel Dry Port", type: "Dry Port" },
  { name: "Havelian Dry Port", code: "Havelian Dry Port", type: "Dry Port" },
  { name: "Peshawar Dry Port", code: "Peshawar Dry Port", type: "Dry Port" },
  { name: "Jamrud Dry Port", code: "Jamrud Dry Port", type: "Dry Port" },
  { name: "Quetta Railway Dry Port", code: "Quetta Railway", type: "Dry Port" },
  { name: "Quetta NLC Dry Port", code: "Quetta NLC", type: "Dry Port" },
  { name: "Gilgit Dry Port", code: "Gilgit Dry Port", type: "Dry Port" },
  { name: "Sost Dry Port", code: "Sost Dry Port", type: "Dry Port" },
  { name: "Muzaffarabad Dry Port", code: "Muzaffarabad", type: "Dry Port" },
  { name: "Karachi Dry Port", code: "Karachi Dry Port", type: "Dry Port" },
  { name: "Karachi NLC Dry Port", code: "Karachi NLC", type: "Dry Port" },

  // Border Terminals & Crossings
  { name: "Wagha Border Terminal", code: "Wagha Border", type: "Border Terminal" },
  { name: "Torkham Border Terminal", code: "Torkham Border", type: "Border Terminal" },
  { name: "Chaman Border Terminal", code: "Chaman Border", type: "Border Terminal" },
  { name: "Taftan Border Terminal", code: "Taftan Border", type: "Border Terminal" },
  { name: "Angur Ada", code: "Angur Ada", type: "Border Terminal" },
  { name: "Badini", code: "Badini", type: "Border Terminal" },
  { name: "Ghulam Khan", code: "Ghulam Khan", type: "Border Terminal" },
  { name: "Kharlachi", code: "Kharlachi", type: "Border Terminal" },
  { name: "Mand", code: "Mand", type: "Border Terminal" }
];

/**
 * Autocomplete Searchable Port Input Component
 * Allows user to type letters to filter ports, see suggestions below,
 * clear, toggle list, and click "+ Add Port" without leaving the page.
 */
interface PortSearchableInputProps {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (val: string) => void;
  ports: PortItem[];
  targetField: 'pol' | 'pod';
  placeholder?: string;
  onOpenAddPort: (targetField: 'pol' | 'pod', initialName?: string) => void;
}

const PortSearchableInput: React.FC<PortSearchableInputProps> = ({
  label,
  icon,
  value,
  onChange,
  ports,
  targetField,
  placeholder = 'Type port name or code...',
  onOpenAddPort
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value || '');
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync internal search term when parent value changes
  useEffect(() => {
    setSearchTerm(value || '');
  }, [value]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter ports based on search term
  const filteredPorts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return ports;
    return ports.filter(p => 
      p.name.toLowerCase().includes(term) || 
      (p.code && p.code.toLowerCase().includes(term))
    );
  }, [ports, searchTerm]);

  const handleSelectPort = (portName: string) => {
    onChange(portName);
    setSearchTerm(portName);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setSearchTerm('');
    setIsOpen(true);
  };

  const isExactMatch = ports.some(p => p.name.toLowerCase() === searchTerm.trim().toLowerCase());

  return (
    <div ref={containerRef} className={`space-y-1.5 relative ${isOpen ? 'z-50' : 'z-20'}`}>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-xs text-brand-300 font-medium">
          {icon} {label}
        </label>
      </div>

      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full glass-input rounded-xl p-3 sm:p-3.5 outline-none text-sm text-white bg-black/60 border border-white/15 focus:border-brand-400 pr-16"
        />

        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {searchTerm && (
            <button
              type="button"
              onClick={handleClear}
              className="text-gray-400 hover:text-white p-1 rounded-md"
              title="Clear port"
            >
              <X size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(prev => !prev)}
            className="text-gray-400 hover:text-white p-1 rounded-md"
            title="Toggle port list"
          >
            <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-brand-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Autocomplete Suggestion Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-[9999] bg-slate-900/98 backdrop-blur-2xl border border-brand-500/30 rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto">
          {filteredPorts.length > 0 ? (
            <div className="py-1 divide-y divide-white/5">
              {filteredPorts.map((p, idx) => {
                const isSelected = p.name.toLowerCase() === value.toLowerCase();
                return (
                  <button
                    key={`${targetField}-${p.code || p.name}-${idx}`}
                    type="button"
                    onClick={() => handleSelectPort(p.name)}
                    className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between text-xs sm:text-sm hover:bg-brand-500/20 transition-colors ${
                      isSelected ? 'bg-brand-500/30 text-white font-semibold' : 'text-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <Anchor size={13} className="text-brand-400 shrink-0" />
                      <span className="truncate">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {p.code && p.code !== p.name && (
                        <span className="font-mono text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-gray-300">
                          {p.code}
                        </span>
                      )}
                      {p.type && (
                        <span className="text-[9px] bg-brand-500/20 text-brand-300 border border-brand-500/30 px-1.5 py-0.5 rounded uppercase font-medium">
                          {p.type}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-3 text-center text-xs text-gray-400">
              No matching port found for "{searchTerm}"
            </div>
          )}

          {/* Quick Add Option inside Dropdown */}
          {searchTerm.trim() && !isExactMatch && (
            <div className="p-1.5 bg-black/40 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenAddPort(targetField, searchTerm.trim());
                }}
                className="w-full text-left p-2 rounded-lg bg-brand-600/30 hover:bg-brand-600/50 text-brand-300 text-xs flex items-center gap-2 transition-colors font-medium"
              >
                <Plus size={14} className="text-brand-400 shrink-0" />
                <span>Add "<strong>{searchTerm.trim()}</strong>" as New Port</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const CATEGORIES = PRIMARY_SERVICE_CATEGORIES;

const MOCK_CLIENTS = [
  "Trial Client"
];

// Clean Initial Cases for Live Operation
const INITIAL_CASES: Case[] = [];

// Operational Services Arrangement Definitions (Arranged by DPL vs Client)
export const INITIAL_REGISTRATION_ARRANGEMENTS: Record<string, { label: string; arrangedBy: 'DPL' | 'Client'; amount: number }> = getCategoryArrangements('Bonded Carrier');

export const getArrangementInitialCharges = (arrangements: Record<string, { label: string; arrangedBy: 'DPL' | 'Client'; amount: number }>): CaseCharge[] => {
  return getArrangementCharges(arrangements as any);
};

// Configuration for Report Columns (Optimized for zero-horizontal-scrolling)
const REPORT_COLUMNS = [
  { key: 'caseNo', label: 'CASE NO' },
  { key: 'createdAt', label: 'DATE' },
  { key: 'clientName', label: 'CLIENT' },
  { key: 'category', label: 'CATEGORY' },
  { key: 'status', label: 'STATUS' },
  { key: 'pol', label: 'PORT OF LOADING' },
  { key: 'pod', label: 'PORT OF DELIVERY' },
];

interface CaseManagementProps {
    initialFilter?: any;
    clearFilter?: () => void;
    onActionComplete?: (notificationId: number) => void;
    customLogo?: string | null;
    userRole?: UserRole;
    userRoles?: UserRole[];
    currentClientName?: string;
}

const CaseManagement: React.FC<CaseManagementProps> = ({ 
  initialFilter, 
  clearFilter, 
  onActionComplete, 
  customLogo,
  userRole: propUserRole,
  userRoles: propUserRoles,
  currentClientName: propClientName
}) => {
  const branding = useBranding();
  const { companyName, subtitle } = branding;
  const activeLogo = customLogo || branding.customLogo;
  const [view, setView] = useState<'list' | 'register' | 'details'>('list');
  const [activeNotificationId, setActiveNotificationId] = useState<number | null>(null);
  const [showSmartSearchModal, setShowSmartSearchModal] = useState(false);
  const [cases, setCases] = useState<Case[]>(() => {
    return safeAppStorage.getJSON<Case[]>('dpl_live_cases', INITIAL_CASES);
  });
  const [selectedCase, setSelectedCase] = useState<any>(() => {
    return safeAppStorage.getJSON<any>('dpl_selected_case', null);
  });

  // Preserve selectedCase across app switching & tab freezing
  useEffect(() => {
    if (selectedCase) {
      safeAppStorage.setJSON('dpl_selected_case', selectedCase);
      safeAppStorage.setItem('dpl_selected_case_id', selectedCase.id || '');
    } else if (view !== 'details') {
      safeAppStorage.removeItem('dpl_selected_case');
      safeAppStorage.removeItem('dpl_selected_case_id');
    }
  }, [selectedCase, view]);

  // Persist active view in safeAppStorage
  useEffect(() => {
    safeAppStorage.setItem('dpl_reg_view', view);
  }, [view]);

  // Restore selectedCase from cases list if returning from background/gallery
  useEffect(() => {
    if (view === 'details' && !selectedCase && cases.length > 0) {
      const savedId = safeAppStorage.getItem('dpl_selected_case_id');
      if (savedId) {
        const found = cases.find(c => c.id === savedId || c.caseNo === savedId);
        if (found) {
          setSelectedCase(found);
        }
      }
    }
  }, [view, selectedCase, cases]);

  // Synchronize cases with Firestore
  useEffect(() => {
    const unsubscribe = subscribeToCases(
      (firestoreCases) => {
        if (firestoreCases) {
          setCases(firestoreCases);
          safeAppStorage.setJSON('dpl_live_cases', firestoreCases);
          // If viewing details, update selectedCase with live Firestore changes
          if (view === 'details' && selectedCase) {
            const updated = firestoreCases.find(c => c.id === selectedCase.id || c.caseNo === selectedCase.caseNo);
            if (updated) setSelectedCase(updated);
          }
        }
      },
      (err) => {
        console.warn("Firestore case subscription note:", err);
      }
    );
    return () => unsubscribe();
  }, [view, selectedCase?.id]);

  // Synchronize Registered Clients with Firestore & Cases
  const [clientsData, setClientsData] = useState<Client[]>([]);
  const [registeredClients, setRegisteredClients] = useState<string[]>(DEFAULT_CLIENTS);
  const [isOtherClient, setIsOtherClient] = useState(false);
  const [otherClientName, setOtherClientName] = useState('');

  useEffect(() => {
    const unsubscribeClients = subscribeToClients((clientsList) => {
      setClientsData(clientsList);
      const dbNames = clientsList.map(c => c.name).filter(Boolean);
      const caseNames = cases.map(c => c.clientName).filter(Boolean);
      const combined = Array.from(new Set([...DEFAULT_CLIENTS, ...dbNames, ...caseNames]));
      setRegisteredClients(combined);
    });
    return () => unsubscribeClients();
  }, [cases]);

  // User role state
  const [mockUserRole, setMockUserRole] = useState(UserRole.ADMIN);

  // Determine effective user role and multi-roles
  const effectiveRole = propUserRole || (safeAppStorage.getItem('dpl_user_role') as UserRole) || mockUserRole || UserRole.ADMIN;
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
  const hasOpsRole = hasAdminRole || effectiveRoles.includes(UserRole.OPERATIONS_MANAGER);
  const hasFinanceRole = hasAdminRole || effectiveRoles.includes(UserRole.FINANCE_MANAGER);
  const hasLoadingRole = hasAdminRole || effectiveRoles.includes(UserRole.LOADING_PORT_STAFF);
  const hasUnloadingRole = hasAdminRole || effectiveRoles.includes(UserRole.UNLOADING_PORT_STAFF) || effectiveRoles.includes(UserRole.DESTINATION_PORT_STAFF);

  // Approval request state for finished cases
  const [showApprovalPromptModal, setShowApprovalPromptModal] = useState(false);
  const [approvalTargetAction, setApprovalTargetAction] = useState<'DELETE' | 'CANCEL' | 'EDIT'>('EDIT');
  const [approvalReason, setApprovalReason] = useState('');
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  const effectiveClientName = propClientName || safeAppStorage.getItem('dpl_client_name') || 'Global Traders Ltd';
  const isClientUser = effectiveRole === UserRole.CLIENT;

  // Retrieve client's default category from profile or previous cases
  const getClientDefaultCategory = (clientName: string): string => {
    if (!clientName) return 'Bonded Carrier';
    const foundClient = clientsData.find(c => c.name?.toLowerCase() === clientName.toLowerCase());
    if (foundClient?.defaultCaseCategory) return foundClient.defaultCaseCategory;
    const prevCase = cases.find(c => c.clientName?.toLowerCase() === clientName.toLowerCase() && c.category);
    return prevCase?.category || 'Bonded Carrier';
  };

  const handleClientSelect = (clientName: string) => {
    if (clientName === '__ADD_NEW_CLIENT__' || clientName === '__OTHERS__') {
      setIsOtherClient(false);
      setShowAddClientModal(true);
    } else {
      setIsOtherClient(false);
      const foundClient = clientsData.find(c => c.name?.toLowerCase() === clientName.toLowerCase());
      const defaultCat = foundClient?.defaultCaseCategory || getClientDefaultCategory(clientName) || formData.category || 'Bonded Carrier';
      
      // Resolve charges & arrangements based on category & client default rules
      const resolved = resolveCaseCharges(foundClient, defaultCat);

      setFormData(prev => ({
        ...prev,
        client: clientName,
        category: defaultCat,
        serviceArrangements: resolved.arrangements as any,
        charges: resolved.charges
      }));

      if (resolved.isClientCustomDefault) {
        setDraftToast(`✓ Loaded ${resolved.charges.length} default charges configured for ${clientName}`);
      } else {
        setDraftToast(`✓ Applied ${defaultCat} operational service arrangements`);
      }
    }
  };

  const handleOtherClientChange = (val: string) => {
    setOtherClientName(val);
    setFormData(prev => ({ ...prev, client: val.trim() }));
  };

  // Dynamic Ports State with persistence
  const [ports, setPorts] = useState<PortItem[]>(() => {
    return safeAppStorage.getJSON('dpl_ports', INITIAL_PORTS);
  });
  const [showPortModal, setShowPortModal] = useState(false);
  const [portTargetField, setPortTargetField] = useState<'pol' | 'pod' | null>(null);
  const [newPortName, setNewPortName] = useState('');
  const [newPortCode, setNewPortCode] = useState('');
  const [newPortType, setNewPortType] = useState('Dry Port');

  // Client Modal State & Default Charges State
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [newClientForm, setNewClientForm] = useState({
    name: '',
    ownerName: '',
    contact: '',
    mobileNumber: '',
    whatsappNumber: '',
    email: '',
    ntn: '',
    strn: '',
    officeAddress: '',
    defaultCaseCategory: 'Bonded Carrier'
  });

  const [clientChargesList, setClientChargesList] = useState<ClientDefaultCharge[]>([
    {
      id: 'chg_1',
      category: 'Freight / Haulage',
      description: 'Bonded Carrier Transportation Charge',
      defaultAmount: 75000,
      taxable: false
    },
    {
      id: 'chg_2',
      category: 'Documentation',
      description: 'Customs Clearance & Documentation',
      defaultAmount: 15000,
      taxable: true
    },
    {
      id: 'chg_3',
      category: 'Port & Terminal',
      description: 'Port Terminal Handling & E-Seal Tracking',
      defaultAmount: 8500,
      taxable: false
    },
    {
      id: 'chg_4',
      category: 'Agency',
      description: 'Agency & Port Service Charges',
      defaultAmount: 5000,
      taxable: true
    }
  ]);

  const handleSaveNewClientWithCharges = async () => {
    if (!newClientForm.name.trim()) {
      alert('Please enter Client / Company Name');
      return;
    }
    const clientNameTrimmed = newClientForm.name.trim();
    const clientId = `client_${Date.now()}`;

    const clientToSave: Client = {
      id: clientId,
      name: clientNameTrimmed,
      ownerName: newClientForm.ownerName.trim(),
      contact: newClientForm.contact.trim(),
      mobileNumber: newClientForm.mobileNumber.trim(),
      whatsappNumber: newClientForm.whatsappNumber.trim() || newClientForm.mobileNumber.trim(),
      email: newClientForm.email.trim(),
      ntn: newClientForm.ntn.trim(),
      strn: newClientForm.strn.trim(),
      officeAddress: newClientForm.officeAddress.trim(),
      defaultCaseCategory: newClientForm.defaultCaseCategory || 'Bonded Carrier',
      defaultCharges: clientChargesList,
      createdAt: new Date().toISOString()
    };

    try {
      await saveClientToFirestore(clientToSave);
    } catch (err) {
      console.warn("Could not save client to Firestore:", err);
    }

    setClientsData(prev => [clientToSave, ...prev.filter(c => c.name.toLowerCase() !== clientNameTrimmed.toLowerCase())]);
    setRegisteredClients(prev => Array.from(new Set([clientNameTrimmed, ...prev])));

    const appliedCharges: CaseCharge[] = clientChargesList.map((ch, idx) => ({
      id: `chg_${Date.now()}_${idx}`,
      category: ch.category || clientToSave.defaultCaseCategory || 'Bonded Carrier',
      description: ch.description,
      amount: Number(ch.defaultAmount) || 0,
      taxable: ch.taxable ?? false
    }));

    setFormData(prev => ({
      ...prev,
      client: clientNameTrimmed,
      category: clientToSave.defaultCaseCategory || 'Bonded Carrier',
      charges: appliedCharges
    }));

    setIsOtherClient(false);
    setOtherClientName('');
    setShowAddClientModal(false);
    setDraftToast(`✓ Client "${clientNameTrimmed}" registered with ${appliedCharges.length} default charges applied!`);
  };

  const handleAddPort = (targetField?: 'pol' | 'pod' | null) => {
    if (!newPortName.trim()) return;
    const trimmed = newPortName.trim();
    const code = newPortCode.trim() || (trimmed.length <= 4 ? trimmed.toUpperCase() : trimmed.substring(0, 4).toUpperCase());
    const newPortObj: PortItem = { name: trimmed, code, type: newPortType };
    const updatedPorts = [...ports.filter(p => p.name.toLowerCase() !== trimmed.toLowerCase()), newPortObj];
    setPorts(updatedPorts);
    safeAppStorage.setJSON('dpl_ports', updatedPorts);

    const fieldToUpdate = targetField !== undefined ? targetField : portTargetField;
    if (fieldToUpdate === 'pol') {
      setFormData(prev => ({ 
        ...prev, 
        pol: trimmed,
        extractedData: { ...prev.extractedData, pickupDestination: trimmed }
      }));
    } else if (fieldToUpdate === 'pod') {
      setFormData(prev => ({ 
        ...prev, 
        pod: trimmed,
        extractedData: { ...prev.extractedData, dropoffDestination: trimmed }
      }));
    }

    setNewPortName('');
    setNewPortCode('');
    setNewPortType('Dry Port');
    setShowPortModal(false);
    setPortTargetField(null);
    setDraftToast(`✓ Port "${trimmed}" added to all port lists!`);
  };

  const handleOpenAddPort = (targetField?: 'pol' | 'pod' | null, initialName?: string) => {
    setPortTargetField(targetField || null);
    setNewPortName(initialName || '');
    setNewPortCode(initialName ? (initialName.length <= 4 ? initialName.toUpperCase() : initialName.substring(0, 4).toUpperCase()) : '');
    setNewPortType('Dry Port');
    setShowPortModal(true);
  };

  // Filtering State
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterDates, setFilterDates] = useState({ start: '', end: '' });
  const [activeDateFilter, setActiveDateFilter] = useState<{start: string, end: string} | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Advanced Reporting State
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportSearchTerm, setReportSearchTerm] = useState('');
  const [reportFilters, setReportFilters] = useState<Record<string, string>>({});
  const [activeFilterColumn, setActiveFilterColumn] = useState<string | null>(null);
  const [reportSelectedCase, setReportSelectedCase] = useState<Case | null>(null);
  const [copiedCaseNo, setCopiedCaseNo] = useState(false);

  // Detail View Edit State
  const [isEditingCase, setIsEditingCase] = useState(false);
  const [editedCase, setEditedCase] = useState<any>(null);

  // New features state
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printOptions, setPrintOptions] = useState({ withAttachments: false, withInvoice: false, onlyInvoice: false });
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfDownloadSuccess, setPdfDownloadSuccess] = useState<string | null>(null);
  const [pdfDownloadError, setPdfDownloadError] = useState<string | null>(null);
  const [directDownloadUrl, setDirectDownloadUrl] = useState<string | null>(null);
  const [directDownloadFilename, setDirectDownloadFilename] = useState<string>('');
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);

  // Download Documents Modal state
  const [showDownloadDocsModal, setShowDownloadDocsModal] = useState(false);
  const [selectedDownloadType, setSelectedDownloadType] = useState<'caseDetails' | 'invoice' | 'attachments' | 'all'>('caseDetails');

  // Add/Edit Charges state
  const STANDARD_CHARGE_CATEGORIES = [
    'Transhipment Permit (TP) Filing & EDI Fee',
    'Port Wharfage & Terminal Handling (THC)',
    'Delivery Order (DO) Charges',
    'DO Security Deposit',
    'Excise & Taxation Payment',
    'Customs Examination & Surcharge',
    'Weighbridge Scale Charges',
    'Detention / Demurrage Payment',
    'Container Damage / Repair Payment',
    'FBR Satellite Tracking Device & E-Seal Monitoring',
    'Inland Freight & Vehicle Rent',
    'Customs Duty & Regulatory Taxes',
    'Additional Customs Duty (ACD)',
    'Labor & Offloading Charges',
    'Customs Agency / Clearing Commission',
    'Bank Charges & Stamp Paper',
    'Empty Container Return & Gate-in Fee',
    'Manifest / WeBOC Electronic Processing',
    'Cross-Border Transit / TIR Surcharge',
    'Direct Client Disbursement',
    'Cash Payment / Miscellaneous Handling'
  ];

  const [customChargeCategories, setCustomChargeCategories] = useState<string[]>(() => {
    try {
      const stored = safeLocalStorage.getItem('custom_billing_categories');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn("Failed reading custom categories:", e);
    }
    return [];
  });

  const [showAddChargeModal, setShowAddChargeModal] = useState(false);
  const [selectedChargeCategory, setSelectedChargeCategory] = useState('');
  const [newChargeDesc, setNewChargeDesc] = useState('');
  const [newChargeAmount, setNewChargeAmount] = useState('');
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [newChargeReceipt, setNewChargeReceipt] = useState<{ url: string; name: string } | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);

  // 8-Step Workflow Interactive Modal state
  const [showStepModal, setShowStepModal] = useState(false);
  const [selectedStepStatus, setSelectedStepStatus] = useState<CaseStatus | null>(null);
  const [stepModalIndex, setStepModalIndex] = useState<number>(0);

  const handleOpenStepModal = (status: CaseStatus, index: number, target: Case) => {
    setSelectedStepStatus(status);
    setStepModalIndex(index);
    setShowStepModal(true);
  };

  const handleDownloadPdfFile = async (caseToExport?: Case, overrideOpts?: { onlyInvoice?: boolean; withInvoice?: boolean; withAttachments?: boolean; onlyCaseDetails?: boolean }) => {
    const activeCase = caseToExport || selectedCase;
    if (!activeCase) {
      setPdfDownloadError("No case found to generate PDF.");
      return;
    }
    setIsDownloadingPdf(true);
    setPdfDownloadError(null);
    setPdfDownloadSuccess(null);
    try {
      const opts = overrideOpts || printOptions;
      const result = await downloadCasePdf(
        activeCase,
        { companyName, subtitle, customLogo: activeLogo, ...branding },
        opts
      );
      setPdfDownloadSuccess(result.filename);
      if (result.blobUrl) {
        setDirectDownloadUrl(result.blobUrl);
        setDirectDownloadFilename(result.filename);
      }
    } catch (err: any) {
      console.error("PDF generation/download error:", err);
      setPdfDownloadError("Unable to download PDF. Please try again.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDownloadDeliveryOrder = async (caseToPrint?: Case) => {
    const activeCase = caseToPrint || selectedCase;
    if (!activeCase) return;
    try {
      await downloadCustomsDeliveryOrderPdf({
        targetCase: activeCase,
        branding: { companyName, subtitle, customLogo: activeLogo, ...branding }
      });
    } catch (err: any) {
      console.error("DO PDF generation error:", err);
    }
  };

  // Registration State (Bulletproof persistence across app switching, backgrounding & reloads)
  const [step, setStep] = useState<number>(() => {
    const saved = safeAppStorage.getItem('dpl_reg_step');
    return saved ? Math.max(1, parseInt(saved, 10)) : 1;
  });
  const [loading, setLoading] = useState(false);
  const [isReadingDocuments, setIsReadingDocuments] = useState(false);
  const [readingPhase, setReadingPhase] = useState('Reading Documents...');
  const [readingProgress, setReadingProgress] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocRecord[]>(() => {
    return safeAppStorage.getJSON<UploadedDocRecord[]>('dpl_reg_docs', []);
  });
  const [isAttachingFiles, setIsAttachingFiles] = useState(false);
  const documentsSectionRef = useRef<HTMLDivElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [generatedCaseNo, setGeneratedCaseNo] = useState<string>(() => {
    return safeAppStorage.getItem('dpl_reg_caseno') || '';
  });
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [showCustomsGuideModal, setShowCustomsGuideModal] = useState(false);
  const [activeGuideCategory, setActiveGuideCategory] = useState<string>('Bonded Carrier');
  
  const [formData, setFormData] = useState<{
    client: string;
    category: string;
    subCategory?: string;
    pol: string;
    pod: string;
    containers: Container[];
    extractedData: ExtractedData;
    charges?: CaseCharge[];
    serviceArrangements?: Record<string, { label: string; arrangedBy: 'DPL' | 'Client'; amount: number }>;
  }>(() => {
    const saved = safeAppStorage.getJSON<any>('dpl_reg_formdata', null);
    if (saved) {
      return {
        ...saved,
        serviceArrangements: saved.serviceArrangements || { ...INITIAL_REGISTRATION_ARRANGEMENTS },
        charges: (saved.charges && saved.charges.length > 0) ? saved.charges : getArrangementInitialCharges(saved.serviceArrangements || INITIAL_REGISTRATION_ARRANGEMENTS)
      };
    }
    return {
      client: '',
      category: 'Bonded Carrier',
      subCategory: 'Standard Container / General Cargo',
      pol: '',
      pod: '',
      containers: [],
      extractedData: {},
      serviceArrangements: { ...INITIAL_REGISTRATION_ARRANGEMENTS },
      charges: getArrangementInitialCharges(INITIAL_REGISTRATION_ARRANGEMENTS)
    };
  });

  // Toggle Service Arrangement: Arranged by DPL (Auto-added to Invoice) vs Arranged by Client (Excluded from Invoice)
  const handleToggleServiceArrangement = (key: string, targetArrangedBy: 'DPL' | 'Client') => {
    setFormData(prev => {
      const catArr = getCategoryArrangements(prev.category || 'Bonded Carrier');
      const currentArrangements = { ...catArr, ...(prev.serviceArrangements || {}) };
      const currentItem = currentArrangements[key] || catArr[key];
      if (!currentItem) return prev;

      const updatedArrangements = {
        ...currentArrangements,
        [key]: {
          ...currentItem,
          arrangedBy: targetArrangedBy,
          ...(targetArrangedBy === 'Client' ? { amount: 0 } : {})
        }
      };

      let updatedCharges = [...(prev.charges || [])];
      if (targetArrangedBy === 'DPL') {
        // User marked as Arranged by DPL -> AUTOMATICALLY ADD TO INVOICE CHARGES
        updatedCharges = updatedCharges.filter(c => c.syncKey !== key);
        if (Number(currentItem.amount) > 0) {
          updatedCharges.push({
            id: `ch_arr_${key}_${Date.now()}`,
            syncKey: key,
            description: currentItem.label,
            amount: Number(currentItem.amount),
            arrangedBy: 'DPL',
            taxable: true
          });
        }
      } else {
        // User marked as Arranged by Client -> AUTOMATICALLY REMOVE FROM INVOICE CHARGES
        updatedCharges = updatedCharges.filter(c => c.syncKey !== key);
      }

      const updatedFormData = {
        ...prev,
        serviceArrangements: updatedArrangements,
        charges: updatedCharges
      };
      safeAppStorage.setJSON('dpl_reg_formdata', updatedFormData);
      return updatedFormData;
    });
  };

  // Update Estimated Amount for Service Arrangement
  const handleUpdateArrangementAmount = (key: string, newAmount: number) => {
    setFormData(prev => {
      const catArr = getCategoryArrangements(prev.category || 'Bonded Carrier');
      const currentArrangements = { ...catArr, ...(prev.serviceArrangements || {}) };
      const currentItem = currentArrangements[key] || catArr[key];
      if (!currentItem) return prev;

      const updatedArrangements = {
        ...currentArrangements,
        [key]: {
          ...currentItem,
          amount: newAmount
        }
      };

      let updatedCharges = [...(prev.charges || [])];
      if (currentItem.arrangedBy === 'DPL') {
        const exists = updatedCharges.some(c => c.syncKey === key);
        if (exists) {
          updatedCharges = updatedCharges.map(c => c.syncKey === key ? { ...c, amount: newAmount } : c);
        } else if (newAmount > 0) {
          updatedCharges.push({
            id: `ch_arr_${key}_${Date.now()}`,
            syncKey: key,
            description: currentItem.label,
            amount: newAmount,
            arrangedBy: 'DPL',
            taxable: true
          });
        }
      }

      const updatedFormData = {
        ...prev,
        serviceArrangements: updatedArrangements,
        charges: updatedCharges
      };
      safeAppStorage.setJSON('dpl_reg_formdata', updatedFormData);
      return updatedFormData;
    });
  };

  // Step 4 Review & Submission States
  const [isCaseSubmitted, setIsCaseSubmitted] = useState<boolean>(false);
  const [submittedCaseData, setSubmittedCaseData] = useState<Case | null>(null);
  const [showRegistrationChargeModal, setShowRegistrationChargeModal] = useState<boolean>(false);
  const [newRegChargeDesc, setNewRegChargeDesc] = useState<string>('');
  const [newRegChargeAmount, setNewRegChargeAmount] = useState<string>('');
  const [isSaveAsClientDefault, setIsSaveAsClientDefault] = useState<boolean>(false);
  const [saveAsClientDefaultInModal, setSaveAsClientDefaultInModal] = useState<boolean>(false);

  const handleAddRegistrationChargeItem = async (desc: string, amount: number) => {
    if (!desc.trim() || amount <= 0) return;
    const newCharge: CaseCharge = {
      id: `ch_${Date.now()}`,
      category: formData.category,
      description: desc.trim(),
      amount: amount,
      taxable: true
    };

    if (isCaseSubmitted && submittedCaseData) {
      const updatedCharges = [...(submittedCaseData.charges || []), newCharge];
      const updatedCase: Case = { ...submittedCaseData, charges: updatedCharges };
      setSubmittedCaseData(updatedCase);
      setCases(prev => prev.map(c => c.id === updatedCase.id ? updatedCase : c));
      updateCaseInFirestore(updatedCase).catch(e => console.warn("Firestore charge update error:", e));
    } else {
      const existing = formData.charges || [];
      setFormData(prev => ({
        ...prev,
        charges: [...existing, newCharge]
      }));
    }

    // If marked as Client Default Charge
    if (isSaveAsClientDefault && formData.client) {
      const clientObj = clientsData.find(c => c.name?.toLowerCase() === formData.client?.toLowerCase());
      if (clientObj) {
        try {
          const updatedClient = await saveChargeAsClientDefault(clientObj, {
            description: desc.trim(),
            amount: amount,
            category: formData.category,
            taxable: true
          });
          setClientsData(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
          setDraftToast(`✓ Saved "${desc.trim()}" as permanent default charge for ${formData.client}!`);
        } catch (err) {
          console.warn("Could not save default charge to client:", err);
        }
      }
    }

    setNewRegChargeDesc('');
    setNewRegChargeAmount('');
    setIsSaveAsClientDefault(false);
    setShowRegistrationChargeModal(false);
  };

  // Draft Persistence and Detection
  const checkHasDraft = () => {
    try {
      const active = safeAppStorage.getItem('dpl_reg_draft_active') === 'true';
      const savedStep = parseInt(safeAppStorage.getItem('dpl_reg_step') || '1', 10);
      const savedFormData = safeAppStorage.getJSON<any>('dpl_reg_formdata', null);
      const savedDocs = safeAppStorage.getJSON<any[]>('dpl_reg_docs', []);
      if (active) return true;
      if (savedStep > 1) return true;
      if (savedDocs && savedDocs.length > 0) return true;
      if (savedFormData && (Boolean(savedFormData.client?.trim()) || (savedFormData.containers && savedFormData.containers.length > 0))) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const [hasDraft, setHasDraft] = useState<boolean>(() => checkHasDraft());
  const [showDiscardModal, setShowDiscardModal] = useState<boolean>(false);
  const [showStartNewDraftPrompt, setShowStartNewDraftPrompt] = useState<boolean>(false);
  const [draftToast, setDraftToast] = useState<string | null>(null);

  useEffect(() => {
    if (draftToast) {
      const timer = setTimeout(() => setDraftToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [draftToast]);

  const draftInfo = React.useMemo(() => {
    if (!hasDraft) return null;
    const savedStep = parseInt(safeAppStorage.getItem('dpl_reg_step') || '1', 10);
    const savedCaseNo = safeAppStorage.getItem('dpl_reg_caseno') || '';
    const savedFormData = safeAppStorage.getJSON<any>('dpl_reg_formdata', formData);
    const savedDocs = safeAppStorage.getJSON<any[]>('dpl_reg_docs', uploadedDocs);
    const savedTime = safeAppStorage.getItem('dpl_reg_updated_at') || '';

    let stepName = 'Basic Details & Shipping Documents';
    if (savedStep === 2) stepName = 'Extracted Data & Route Verification';
    if (savedStep === 3) stepName = 'Container Allocation & Charges Review';

    return {
      step: savedStep,
      stepName,
      caseNo: savedCaseNo,
      client: savedFormData?.client || '',
      category: savedFormData?.category || 'Bonded Carrier',
      docsCount: (savedDocs && savedDocs.length) || 0,
      containersCount: (savedFormData?.containers && savedFormData.containers.length) || 0,
      updatedAt: savedTime
    };
  }, [hasDraft, formData, uploadedDocs]);

  // Preserve registration draft in safeAppStorage with debouncing to prevent mobile I/O thrashing
  useEffect(() => {
    if (view === 'register' && step < 4) {
      const hasContent = Boolean(formData.client?.trim()) || uploadedDocs.length > 0 || step > 1 || (formData.containers && formData.containers.length > 0);
      const timer = setTimeout(() => {
        if (hasContent) {
          safeAppStorage.setItem('dpl_reg_draft_active', 'true');
          safeAppStorage.setItem('dpl_reg_step', String(step));
          if (generatedCaseNo) {
            safeAppStorage.setItem('dpl_reg_caseno', generatedCaseNo);
          } else {
            safeAppStorage.removeItem('dpl_reg_caseno');
          }
          safeAppStorage.setJSON('dpl_reg_formdata', formData);
          safeAppStorage.setJSON('dpl_reg_docs', uploadedDocs);
          safeAppStorage.setItem('dpl_reg_updated_at', new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          setHasDraft(true);
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [view, step, generatedCaseNo, formData, uploadedDocs]);

  // Safely release camera hardware when the user switches to gallery or another app
  useEffect(() => {
    const unsubscribe = appLifecycle.subscribe((lifecycleState) => {
      if (lifecycleState === 'background' && showCamera) {
        stopCamera();
      }
    });
    return () => {
      unsubscribe();
      stopCamera();
    };
  }, [showCamera]);

  // Effect to apply initial filter from props (Dashboard drill-down)
  useEffect(() => {
    if (initialFilter) {
        if (initialFilter.status) {
            setStatusFilter(initialFilter.status);
        }
        if (initialFilter.notificationId) {
            setActiveNotificationId(initialFilter.notificationId);
        }
    } else {
        setStatusFilter(null);
    }
  }, [initialFilter]);

  const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  };

  // Generate strictly sequential case number: DPL-[DEST]-[YY]-[MMM]-[SERIAL]
  // Serial resets ONLY on Year change. Month changes dynamically.
  // Invoice Number is identical to Case Number.
  const generateCaseNumber = (customList?: Case[], destination?: string) => {
    const dest = destination || formData.pod || formData.extractedData?.dropoffDestination;
    return generateDplCaseNumber(customList || cases, dest);
  };

  // Keep generatedCaseNo synchronized with chosen POD / destination during registration
  useEffect(() => {
    if (view === 'register') {
      const dest = formData.pod || formData.extractedData?.dropoffDestination;
      if (dest) {
        const destCode = getDestinationCode(dest);
        setGeneratedCaseNo(prev => {
          if (!prev) {
            const fresh = generateDplCaseNumber(cases, dest);
            safeAppStorage.setItem('dpl_reg_caseno', fresh);
            return fresh;
          }
          const parts = prev.split('-');
          if (parts.length === 5 && parts[0] === 'DPL') {
            if (parts[1] !== destCode) {
              const updated = `DPL-${destCode}-${parts[2]}-${parts[3]}-${parts[4]}`;
              safeAppStorage.setItem('dpl_reg_caseno', updated);
              return updated;
            }
          } else {
            const fresh = generateDplCaseNumber(cases, dest);
            safeAppStorage.setItem('dpl_reg_caseno', fresh);
            return fresh;
          }
          return prev;
        });
      }
    }
  }, [formData.pod, formData.extractedData?.dropoffDestination, view, cases]);

  const handleResumeDraft = () => {
    const savedStep = parseInt(safeAppStorage.getItem('dpl_reg_step') || '1', 10);
    const savedCaseNo = safeAppStorage.getItem('dpl_reg_caseno') || '';
    const savedFormData = safeAppStorage.getJSON<any>('dpl_reg_formdata', null);
    const savedDocs = safeAppStorage.getJSON<UploadedDocRecord[]>('dpl_reg_docs', []);

    if (savedFormData) {
      setFormData(savedFormData);
    }
    if (savedDocs && savedDocs.length > 0) {
      setUploadedDocs(savedDocs);
    }
    setGeneratedCaseNo(savedCaseNo);
    setStep(Math.max(1, Math.min(savedStep, 3)));
    setView('register');
    setDraftToast('⚡ Resumed incomplete case draft');
  };

  const handleDiscardDraft = () => {
    safeAppStorage.removeItem('dpl_reg_draft_active');
    safeAppStorage.removeItem('dpl_reg_step');
    safeAppStorage.removeItem('dpl_reg_caseno');
    safeAppStorage.removeItem('dpl_reg_formdata');
    safeAppStorage.removeItem('dpl_reg_docs');
    safeAppStorage.removeItem('dpl_reg_updated_at');
    safeAppStorage.removeItem('dpl_reg_view');
    setHasDraft(false);
    setGeneratedCaseNo('');
    setStep(1);
    setIsCaseSubmitted(false);
    setSubmittedCaseData(null);
    setShowRegistrationChargeModal(false);
    setNewRegChargeDesc('');
    setNewRegChargeAmount('');
    setFiles([]);
    setUploadedDocs([]);
    const clientNameInit = isClientUser ? (effectiveClientName || 'Global Traders Ltd') : '';
    const categoryInit = isClientUser ? getClientDefaultCategory(effectiveClientName || '') : 'Bonded Carrier';
    const clientObj = clientsData.find(c => c.name?.toLowerCase() === clientNameInit.toLowerCase());
    const resolvedInit = resolveCaseCharges(clientObj, categoryInit);

    setFormData({
      client: clientNameInit,
      category: categoryInit,
      pol: 'Karachi Port Trust',
      pod: '',
      containers: [],
      extractedData: {},
      serviceArrangements: resolvedInit.arrangements as any,
      charges: resolvedInit.charges
    });
    setShowDiscardModal(false);
    setDraftToast('🗑️ Incomplete case draft discarded');
  };

  const handleStartRegistration = () => {
    if (hasDraft) {
      setShowStartNewDraftPrompt(true);
      return;
    }
    startFreshRegistration();
  };

  const startFreshRegistration = () => {
    // Clear any previous draft residue
    safeAppStorage.removeItem('dpl_reg_draft_active');
    safeAppStorage.removeItem('dpl_reg_step');
    safeAppStorage.removeItem('dpl_reg_caseno');
    safeAppStorage.removeItem('dpl_reg_formdata');
    safeAppStorage.removeItem('dpl_reg_docs');
    safeAppStorage.removeItem('dpl_reg_updated_at');
    setHasDraft(false);
    setIsCaseSubmitted(false);
    setSubmittedCaseData(null);
    setShowRegistrationChargeModal(false);
    setNewRegChargeDesc('');
    setNewRegChargeAmount('');

    // CRITICAL USER DIRECTIVE:
    // Do NOT reserve or assign a serial case number in Step 1!
    // Case number will be generated strictly when progressing to Step 2.
    setGeneratedCaseNo('');
    setStep(1);

    const initialClient = isClientUser ? (effectiveClientName || 'Global Traders Ltd') : '';
    const initialCategory = initialClient ? getClientDefaultCategory(initialClient) : 'Bonded Carrier';
    const foundClient = clientsData.find(c => c.name?.toLowerCase() === initialClient.toLowerCase());
    const resolved = resolveCaseCharges(foundClient, initialCategory);

    const initialFormData = {
      client: initialClient,
      category: initialCategory || 'Bonded Carrier',
      pol: 'Karachi Port Trust',
      pod: '',
      containers: [],
      extractedData: {},
      serviceArrangements: resolved.arrangements as any,
      charges: resolved.charges
    };

    setFormData(initialFormData);
    setFiles([]);
    setUploadedDocs([]);
    setCategoryDropdownOpen(false);
    setCategorySearch('');
    setIsOtherClient(false);
    setOtherClientName('');
    setView('register');
  };

  // Keep client account synced if registering as a Client user
  useEffect(() => {
    if (view === 'register' && isClientUser && effectiveClientName) {
      if (!formData.client || formData.client !== effectiveClientName) {
        const cat = getClientDefaultCategory(effectiveClientName);
        setFormData(prev => ({
          ...prev,
          client: effectiveClientName,
          category: prev.category || cat || 'Bonded Carrier'
        }));
      }
    }
  }, [view, isClientUser, effectiveClientName, clientsData]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.target;
    try {
      if (inputEl && inputEl.files && inputEl.files.length > 0) {
        const selected: File[] = Array.from(inputEl.files);
        // Clear input value so selecting the same file again triggers change event
        inputEl.value = '';
        setIsAttachingFiles(true);
        // Defer processing to next frame so the mobile browser can smoothly finish returning from OS Activity
        setTimeout(() => {
          processFiles(selected).finally(() => {
            setIsAttachingFiles(false);
          });
        }, 40);
      }
    } catch (err) {
      console.warn("File upload error caught:", err);
      setIsAttachingFiles(false);
    }
  };

  const processFiles = async (newFiles: File[], categoryHint?: 'BL' | 'INVOICE' | 'PACKING_LIST' | 'ALL_IN_ONE') => {
    if (!newFiles || newFiles.length === 0) return;
    try {
      const newDocRecords: UploadedDocRecord[] = [];

      for (const f of newFiles) {
        let objectUrl = '';
        try {
          objectUrl = URL.createObjectURL(f);
        } catch (_) {}

        const docType = f.type || detectMimeType(f).mimeType;
        const recId = `${f.name.replace(/[^a-zA-Z0-9.-]/g, '_')}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const detectedCategory = categoryHint || detectShippingDocumentType(f.name);

        newDocRecords.push({
          id: recId,
          name: f.name,
          type: docType,
          size: f.size,
          url: objectUrl,
          docCategory: detectedCategory
        });
      }

      // Smoothly cache Base64 in background after UI finishes rendering to prevent freezing main UI thread
      setTimeout(() => {
        for (const f of newFiles) {
          compressAndPrepareFile(f).then(processed => {
            if (processed && processed.base64) {
              const mime = processed.type || (processed.isImage ? 'image/jpeg' : 'application/pdf');
              docDataCache.set(f.name, { base64: processed.base64, mimeType: mime, name: f.name });
            }
          }).catch(() => {});
        }
      }, 300);

      setFiles(prev => [...prev, ...newFiles]);
      setUploadedDocs(prev => {
        const combined = [...prev, ...newDocRecords];
        try {
          // Store clean serializable records without volatile blob URLs that break storage
          const safeRecords = combined.map(d => ({
            id: d.id,
            name: d.name,
            type: d.type,
            size: d.size,
            url: '',
            docCategory: d.docCategory
          }));
          safeAppStorage.setJSON('dpl_reg_docs', safeRecords);
        } catch (e) {
          console.warn("Doc storage notice:", e);
        }
        return combined;
      });

      // Keep view smoothly focused on the documents section without jumping to the top
      setTimeout(() => {
        if (documentsSectionRef.current) {
          documentsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 80);
    } catch (error) {
      console.warn("Processing notice:", error);
    }
  };

  const triggerDocumentReading = async () => {
    setIsReadingDocuments(true);
    setReadingProgress(12);
    setReadingPhase('Enhancing scan contrast & analyzing shipping line format...');

    const timer1 = setTimeout(() => {
      setReadingProgress(35);
      setReadingPhase('Reading B/L header, Maersk/MSC/COSCO line & B/L Number...');
    }, 400);

    const timer2 = setTimeout(() => {
      setReadingProgress(60);
      setReadingPhase('Extracting ISO containers (MSKU/CMAU...), 20ft/40ft/45ft & seals...');
    }, 900);

    const timer3 = setTimeout(() => {
      setReadingProgress(82);
      setReadingPhase('Parsing Commercial Invoice values (USD/PKR) & Incoterms...');
    }, 1500);

    const timer4 = setTimeout(() => {
      setReadingProgress(94);
      setReadingPhase('Extracting Packing List carton counts, weights & volume (CBM)...');
    }, 2100);

    try {
      // Gather all documents (both direct File objects and uploaded docs without duplicates)
      const combinedDocs: any[] = [];
      const seenNames = new Set<string>();

      for (const f of files) {
        if (f && f.name && !seenNames.has(f.name)) {
          seenNames.add(f.name);
          combinedDocs.push(f);
        }
      }
      for (const d of uploadedDocs) {
        if (d && d.name && !seenNames.has(d.name)) {
          seenNames.add(d.name);
          combinedDocs.push(d);
        }
      }

      let data: any = {};
      if (combinedDocs.length > 0) {
        data = await autoFillCaseData(combinedDocs);
      } else {
        await new Promise(r => setTimeout(r, 1200));
      }

      setReadingProgress(100);
      setReadingPhase('All International Shipping Fields Read! Opening Form...');

      if (data && typeof data === 'object' && Object.keys(data).length > 0) {
        setFormData(prev => {
          const merged = { ...prev.extractedData, ...data };
          let updatedContainers = [...prev.containers];

          if (data.containers && Array.isArray(data.containers) && data.containers.length > 0) {
            updatedContainers = data.containers.map((c: any, idx: number) => ({
              id: Date.now() + idx,
              number: c.number || `CNTR-${Math.floor(1000 + Math.random() * 9000)}`,
              size: c.size === '20ft' || c.size === '45ft' ? c.size : '40ft',
              weight: c.weight || data.totalWeight || data.grossWeight || 0,
              sealNo: c.sealNo || '',
              status: 'Pending'
            }));
          } else if ((data.totalWeight || data.grossWeight) && updatedContainers.length === 0) {
            updatedContainers = [
              {
                id: Date.now(),
                number: `CNTR-${Math.floor(1000 + Math.random() * 9000)}`,
                size: '40ft',
                weight: data.totalWeight || data.grossWeight,
                status: 'Pending'
              }
            ];
          }

          // Auto-fill client from consignee if empty
          const candidateClient = prev.client || data.consigneeName || '';

          // Auto-register extracted client into registeredClients list so it appears in dropdowns
          if (data.consigneeName && !registeredClients.includes(data.consigneeName)) {
            setRegisteredClients(prevList => {
              if (prevList.includes(data.consigneeName)) return prevList;
              const nextList = [...prevList, data.consigneeName];
              safeAppStorage.setJSON('dpl_registered_clients', nextList);
              return nextList;
            });
          }

          // Auto-fill category if empty or detected
          let candidateCategory = prev.category;
          if (!candidateCategory) {
            if (data.builtyNumber || data.pickupDestination || data.dropoffDestination) {
              candidateCategory = 'Transportation of Private Cargo';
            } else {
              candidateCategory = data.suggestedCategory || (
                (data.consigneeAddress && (data.consigneeAddress.toUpperCase().includes('BARA') || data.consigneeAddress.toUpperCase().includes('AFGHAN') || data.consigneeAddress.toUpperCase().includes('KHYBER')))
                  ? 'Bonded Carrier'
                  : 'Ocean Freight Import'
              );
            }
          }

          // Auto-fill POL & POD if found
          let candidatePol = prev.pol || data.pickupDestination || '';
          if (!candidatePol && data.pol) {
            const matchedPort = ports.find(p => 
              p.name.toLowerCase().includes(data.pol.toLowerCase()) || 
              data.pol.toLowerCase().includes(p.name.toLowerCase()) || 
              (p.code && data.pol.toUpperCase().includes(p.code.toUpperCase()))
            );
            candidatePol = matchedPort ? matchedPort.name : data.pol;
          }

          let candidatePod = prev.pod || data.dropoffDestination || '';
          if (!candidatePod && data.pod) {
            const matchedPort = ports.find(p => 
              p.name.toLowerCase().includes(data.pod.toLowerCase()) || 
              data.pod.toLowerCase().includes(p.name.toLowerCase()) || 
              (p.code && data.pod.toUpperCase().includes(p.code.toUpperCase()))
            );
            candidatePod = matchedPort ? matchedPort.name : data.pod;
          }

          const foundClient = clientsData.find(c => c.name?.toLowerCase() === candidateClient.toLowerCase());
          const resolved = resolveCaseCharges(foundClient, candidateCategory);

          return {
            ...prev,
            client: candidateClient,
            category: candidateCategory,
            pol: candidatePol,
            pod: candidatePod,
            containers: updatedContainers,
            extractedData: merged,
            serviceArrangements: resolved.arrangements as any,
            charges: prev.charges && prev.charges.length > 0 ? prev.charges : resolved.charges
          };
        });
      }

      // Allow animated 100% completion to display nicely
      await new Promise(r => setTimeout(r, 650));
    } catch (err) {
      console.warn("Document reading notice:", err);
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      setIsReadingDocuments(false);
      let activeNo = generatedCaseNo;
      if (!activeNo) {
        activeNo = generateCaseNumber();
        setGeneratedCaseNo(activeNo);
        safeAppStorage.setItem('dpl_reg_caseno', activeNo);
      }
      setStep(2);
    }
  };

  const startCamera = async () => {
    try {
      setShowCamera(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: { ideal: 'environment' } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn("Camera getUserMedia fallback:", err);
      setShowCamera(false);
      // Fallback smoothly to device image capture
      cameraInputRef.current?.click();
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
  };

  const captureImage = async () => {
    if (videoRef.current) {
      try {
        const canvas = document.createElement('canvas');
        const maxDim = 1920;
        let w = videoRef.current.videoWidth || 1280;
        let h = videoRef.current.videoHeight || 720;
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
          const rawDataUrl = canvas.toDataURL('image/jpeg', 0.92);
          const baseName = `Camera_Scan_${Date.now()}`;
          const converted = await convertImageToPdf(rawDataUrl, `${baseName}.pdf`, true);
          processFiles([converted.file]);
          stopCamera();
        }
      } catch (camErr) {
        console.warn("Camera capture error:", camErr);
        stopCamera();
      }
    }
  };

  const handleCameraFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.target;
    try {
      if (inputEl && inputEl.files && inputEl.files.length > 0) {
        const selected = Array.from(inputEl.files);
        inputEl.value = '';
        setIsAttachingFiles(true);
        const pdfFiles: File[] = [];
        for (const file of selected) {
          try {
            const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
            if (!isPdf) {
              const converted = await convertImageToPdf(file, file.name || `Scanned_Doc_${Date.now()}.pdf`, true);
              pdfFiles.push(converted.file);
            } else {
              pdfFiles.push(file);
            }
          } catch (err) {
            console.warn("Camera scan to PDF conversion fallback:", err);
            pdfFiles.push(file);
          }
        }
        processFiles(pdfFiles).finally(() => {
          setIsAttachingFiles(false);
        });
      }
    } catch (err) {
      console.warn("Camera file upload error:", err);
      setIsAttachingFiles(false);
    }
  };

  const addContainer = () => {
    const totalWeight = formData.extractedData.totalWeight || 0;
    const count = formData.containers.length + 1;
    setFormData((prev) => ({
      ...prev,
      containers: [
        ...prev.containers, 
        { 
          id: Date.now(), 
          number: `CNTR-${Math.floor(Math.random()*10000)}`, 
          size: '40ft', 
          weight: 0,
          status: 'Pending'
        }
      ]
    }));
  };

  const updateContainer = (id: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      containers: prev.containers.map(c => c.id === id ? { ...c, [field]: value } : c)
    }));
  };

  const removeContainer = (id: number) => {
    if (window.confirm("Are you sure you want to remove this container?")) {
      setFormData(prev => ({
          ...prev,
          containers: prev.containers.filter(c => c.id !== id)
      }));
    }
  }

  const updateExtractedData = (field: string, value: any) => {
    setFormData(prev => ({
        ...prev,
        extractedData: { ...prev.extractedData, [field]: value }
    }));
  };

  const handleFinalSubmit = () => {
      const serializableDocs = uploadedDocs.length > 0 
        ? uploadedDocs.map(d => ({
            name: d.name || 'document',
            type: d.type || 'application/octet-stream',
            size: d.size || 0,
            url: d.url || ''
          }))
        : files.map((f: any) => ({
            name: (f as any).name || 'document',
            type: (f as any).type || 'application/octet-stream',
            size: (f as any).size || 0,
            url: ''
          }));

      const finalCharges = (formData.charges && formData.charges.length > 0)
        ? formData.charges
        : [];

      // Final sequential verification: ensure case number is strictly unique & sequential
      let finalCaseNo = generatedCaseNo;
      const isTaken = !finalCaseNo || cases.some(c => c.caseNo === finalCaseNo);
      if (isTaken) {
        finalCaseNo = generateCaseNumber();
        setGeneratedCaseNo(finalCaseNo);
      }

      const initialWorkflow = getCategoryWorkflow(formData.category);
      const initialStepStatus = initialWorkflow.steps[0]?.id || CaseStatus.SHIPPING_LINE_DO;

      const newCase: Case = {
          id: Date.now().toString(),
          caseNo: finalCaseNo,
          clientName: formData.client,
          category: formData.category,
          subCategory: supportsSubCategories(formData.category) ? (formData.subCategory || 'Standard Container / General Cargo') : undefined,
          status: initialStepStatus, 
          createdAt: new Date().toISOString().split('T')[0],
          pol: formData.pol,
          pod: formData.pod,
          containers: formData.containers,
          extractedData: formData.extractedData,
          documents: serializableDocs,
          charges: finalCharges,
          serviceArrangements: formData.serviceArrangements
      };
      const updatedCases = [newCase, ...cases.filter(c => c.caseNo !== newCase.caseNo)];
      setCases(updatedCases);
      setSubmittedCaseData(newCase);
      safeAppStorage.setJSON('dpl_live_cases', updatedCases);
      window.dispatchEvent(new CustomEvent('dpl_cases_updated', { detail: updatedCases }));
      saveCaseToFirestore(newCase).catch((e) => console.warn("Firestore saveCase error:", e));
      if (formData.client) {
        saveClientToFirestore({ name: formData.client }).catch(() => {});
      }

      // Registration is complete! Clean up draft keys from storage
      safeAppStorage.removeItem('dpl_reg_draft_active');
      safeAppStorage.removeItem('dpl_reg_step');
      safeAppStorage.removeItem('dpl_reg_caseno');
      safeAppStorage.removeItem('dpl_reg_formdata');
      safeAppStorage.removeItem('dpl_reg_docs');
      safeAppStorage.removeItem('dpl_reg_updated_at');
      safeAppStorage.removeItem('dpl_reg_view');
      setHasDraft(false);

      setIsCaseSubmitted(true);
      setStep(4); 
  };

  // --- Filter Logic ---
  const handleSearchRecords = () => {
    if (filterDates.start && filterDates.end) {
        setActiveDateFilter(filterDates);
    } else {
        setActiveDateFilter(null);
    }
    setShowFilterModal(false);
  };

  const handleOpenReport = () => {
    setShowReportModal(true);
    setShowFilterModal(false);
  };

  // Workflow Tab Filter (All Active, In Progress, Completed, Incident Vault)
  const [activeWorkflowTab, setActiveWorkflowTab] = useState<'all' | 'in_progress' | 'completed' | 'incident_vault'>('all');

  const incidentCasesCount = cases.filter(c => c.status === CaseStatus.INCIDENT_STOPPAGE || c.isIncidentVault).length;
  const completedCasesCount = cases.filter(c => c.status === CaseStatus.COMPLETED && !c.isIncidentVault).length;
  const inProgressCasesCount = cases.filter(c => c.status !== CaseStatus.COMPLETED && c.status !== CaseStatus.INCIDENT_STOPPAGE && !c.isIncidentVault).length;

  // Filtering Logic Combined
  const filteredCases = cases.filter(c => {
      // Incident Vault separation
      if (activeWorkflowTab === 'incident_vault') {
        return c.status === CaseStatus.INCIDENT_STOPPAGE || c.isIncidentVault === true;
      }
      // Hide incident stoppage cases from normal lists
      if (c.status === CaseStatus.INCIDENT_STOPPAGE || c.isIncidentVault === true) {
        return false;
      }

      // Workflow Status Tabs
      if (activeWorkflowTab === 'in_progress' && c.status === CaseStatus.COMPLETED) return false;
      if (activeWorkflowTab === 'completed' && c.status !== CaseStatus.COMPLETED) return false;

      // Date Filter
      if (activeDateFilter) {
          if (c.createdAt < activeDateFilter.start || c.createdAt > activeDateFilter.end) return false;
      }
      // Status Filter (from Dashboard)
      if (statusFilter) {
          if (c.status !== statusFilter) return false;
      }
      return true;
  });

  const clearStatusFilter = () => {
      setStatusFilter(null);
      if(clearFilter) clearFilter();
  };

  const handleResolveIncident = (caseToResume: Case) => {
    const updated: Case = {
      ...caseToResume,
      status: CaseStatus.IN_TRANSIT,
      isIncidentVault: false,
      incidentDetails: undefined
    };
    setCases(prev => prev.map(c => c.id === updated.id ? updated : c));
    if (selectedCase?.id === updated.id) setSelectedCase(updated);
    updateCaseInFirestore(updated).catch(e => console.warn("Firestore error resolving incident:", e));
  };

  // --- Detail View Logic ---

  const handleEditCaseToggle = () => {
     if (isEditingCase) {
         // Cancel
         setIsEditingCase(false);
         setEditedCase(selectedCase);
     } else {
         // Start Edit
         const caseCopy = JSON.parse(JSON.stringify(selectedCase));
         caseCopy.documents = selectedCase.documents; // Preserve File objects
         setEditedCase(caseCopy); 
         setIsEditingCase(true);
     }
  };

  const handleSaveEditedCase = () => {
      // Update local state and Firestore
      const updatedCases = cases.map(c => c.id === editedCase.id ? editedCase : c);
      setCases(updatedCases);
      setSelectedCase(editedCase);
      setIsEditingCase(false);
      updateCaseInFirestore(editedCase).catch((e) => console.warn("Firestore updateCase error:", e));
  };

  const handleInitiateFinishedCaseAction = (action: 'DELETE' | 'CANCEL' | 'EDIT') => {
    const target = isEditingCase ? editedCase : selectedCase;
    if (!target) return;

    const isCaseFinished = target.status === CaseStatus.COMPLETED || target.status === ('Delivered' as any) || target.status === ('Completed' as any);

    if (!isCaseFinished || hasAdminRole) {
      if (action === 'EDIT') {
        handleEditCaseToggle();
      } else if (action === 'DELETE') {
        if (window.confirm("Are you sure you want to delete this case?")) {
          if (target?.id) {
            deleteCaseFromFirestore(target.id).catch(() => {});
          }
          setCases(cases.filter(c => c.id !== target?.id));
          setView('list');
        }
      } else if (action === 'CANCEL') {
        if (window.confirm("Are you sure you want to cancel this case?")) {
          const cancelledCase = { ...target, status: 'Cancelled' as any };
          setCases(cases.map(c => c.id === target.id ? cancelledCase : c));
          setSelectedCase(cancelledCase);
          updateCaseInFirestore(cancelledCase).catch(() => {});
        }
      }
      return;
    }

    // Finished case & non-admin -> requires Admin approval notification!
    setApprovalTargetAction(action);
    setApprovalReason('');
    setShowApprovalPromptModal(true);
  };

  const handleSubmitFinishedCaseApproval = async () => {
    const target = isEditingCase ? editedCase : selectedCase;
    if (!target) return;
    if (!approvalReason.trim()) {
      alert("Please enter a reason or justification for this action.");
      return;
    }
    setIsSubmittingApproval(true);
    try {
      const requesterName = safeAppStorage.getItem('dpl_user_name') || 'Staff User';
      const requesterRole = effectiveRoles.map(r => r.replace(/_/g, ' ')).join(', ');
      const res = await submitCaseActionApproval({
        actionType: approvalTargetAction,
        caseItem: target,
        requestedBy: requesterName,
        requestedByRole: requesterRole,
        reason: approvalReason.trim()
      });

      setCases(prev => prev.map(c => c.id === res.updatedCase.id ? res.updatedCase : c));
      setSelectedCase(res.updatedCase);
      setShowApprovalPromptModal(false);
      alert(`Your request to ${approvalTargetAction} this finished case has been submitted to Super Admin for approval.`);
    } catch (err) {
      console.error("Failed to submit approval request:", err);
      alert("Could not submit approval request. Please try again.");
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  const handleApproveCase = () => {
    const target = isEditingCase ? editedCase : selectedCase;
    if (!target) return;
    
    // Logic to move to next status
    let newStatus = target.status;
    if (target.status === CaseStatus.SHIPPING_LINE_DO) {
        newStatus = CaseStatus.LOADING_PORT_PROCESSING;
    } else if (target.status === CaseStatus.LOADING_PORT_PROCESSING) {
        newStatus = CaseStatus.IN_TRANSIT;
    }

    const updatedCase = { 
      ...target, 
      status: newStatus,
      approvalStatus: 'APPROVED' as const,
      approvedBy: effectiveRole,
      approvedAt: new Date().toISOString()
    };
    const updatedCases = cases.map(c => c.id === target.id ? updatedCase : c);
    setCases(updatedCases);
    setSelectedCase(updatedCase);
    updateCaseInFirestore(updatedCase).catch((e) => console.warn("Firestore approveCase error:", e));
    logActivity(
      `Case Approved: ${target.caseNo}`,
      `Case ${target.caseNo} (${target.clientName}) was officially approved by ${effectiveRole}. Status advanced to ${newStatus}.`,
      effectiveRole,
      'OPERATIONS',
      { caseNo: target.caseNo, client: target.clientName }
    );
    
    if (activeNotificationId && onActionComplete) {
        onActionComplete(activeNotificationId);
        setActiveNotificationId(null);
    }
  };

  const handleRejectCase = () => {
    const target = isEditingCase ? editedCase : selectedCase;
    if (!target) return;
    const updatedCase = {
      ...target,
      approvalStatus: 'REJECTED' as const,
      approvedBy: effectiveRole,
      approvedAt: new Date().toISOString()
    };
    const updatedCases = cases.map(c => c.id === target.id ? updatedCase : c);
    setCases(updatedCases);
    setSelectedCase(updatedCase);
    updateCaseInFirestore(updatedCase).catch((e) => console.warn("Firestore rejectCase error:", e));
    logActivity(
      `Case Rejected: ${target.caseNo}`,
      `Case ${target.caseNo} (${target.clientName}) was rejected by ${effectiveRole}.`,
      effectiveRole,
      'OPERATIONS',
      { caseNo: target.caseNo, client: target.clientName }
    );
  };

  // --- Advanced Report Logic ---
  const getFilteredReportData = () => {
    return cases.filter(c => {
      // 1. Global Search (Deep Search)
      if (reportSearchTerm) {
        const rowString = JSON.stringify(c).toLowerCase();
        if (!rowString.includes(reportSearchTerm.toLowerCase())) return false;
      }

      // 2. Column Filters
      for (const col of REPORT_COLUMNS) {
        const filterVal = reportFilters[col.key];
        if (filterVal) {
          const cellVal = String(getNestedValue(c, col.key) || '').toLowerCase();
          if (!cellVal.includes(filterVal.toLowerCase())) return false;
        }
      }

      return true;
    });
  };

  const handleColumnFilterChange = (key: string, value: string) => {
    setReportFilters(prev => ({ ...prev, [key]: value }));
  };

  // Dedicated Popup Modal for Full Case Details & Complete Documents Download
  const renderReportCaseDetailModal = () => {
    if (!reportSelectedCase) return null;
    const c = reportSelectedCase;
    const caseNo = c.caseNo || c.caseNumber || 'N/A';
    const clientName = c.clientName || c.client || c.extractedData?.consigneeName || 'N/A';
    const status = c.status || 'Active';
    const pol = c.pol || c.extractedData?.pol || 'Karachi Port / Terminal';
    const pod = c.pod || c.extractedData?.pod || c.extractedData?.placeOfDelivery || 'Upcountry Dry Port';
    const dateStr = c.createdAt ? c.createdAt.split('T')[0] : (c.registrationDate || c.date || 'N/A');
    const ext = c.extractedData || ({} as ExtractedData);
    const docs = c.documents || [];
    const charges = c.charges || [];
    const containers = c.containers || [];

    const handleDownloadAllFilesBatch = () => {
      // 1. Download Unified Complete Dossier PDF
      handleDownloadPdfFile(c, { withInvoice: true, withAttachments: true });
      // 2. Trigger download of any attached document files
      if (docs.length > 0) {
        docs.forEach((doc: any, i: number) => {
          setTimeout(() => {
            try {
              const docName = doc.name || `Document_${caseNo}_${i + 1}`;
              let url = doc.url;
              if (!url && doc instanceof File) url = URL.createObjectURL(doc);
              if (url) {
                const a = document.createElement('a');
                a.href = url;
                a.download = docName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }
            } catch (err) {
              console.warn("File download notice:", err);
            }
          }, (i + 1) * 350);
        });
      }
    };

    return (
      <div 
        className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-md flex items-start justify-center pt-6 sm:pt-10 p-3 sm:p-6 no-print overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) setReportSelectedCase(null);
        }}
      >
        <div className="bg-slate-900 border border-white/15 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
          
          {/* Modal Header */}
          <div className="p-5 sm:p-6 border-b border-white/10 bg-slate-950/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
            <div className="space-y-1">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xl sm:text-2xl font-black font-mono text-amber-300 tracking-wider">
                  {caseNo}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(caseNo);
                    setCopiedCaseNo(true);
                    setTimeout(() => setCopiedCaseNo(false), 2000);
                  }}
                  className="text-gray-400 hover:text-white p-1 rounded transition-colors text-xs flex items-center gap-1 bg-white/5 px-2 py-0.5 border border-white/10 cursor-pointer"
                  title="Copy Case Number"
                >
                  {copiedCaseNo ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copiedCaseNo ? 'Copied' : 'Copy'}</span>
                </button>
                <span className="px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-brand-500/20 text-brand-300 border border-brand-500/30">
                  {status}
                </span>
              </div>
              <p className="text-xs text-gray-300">
                <span className="font-semibold text-white">{clientName}</span> • <span className="text-gray-400">{c.category || 'Bonded Carrier'}</span>
                {c.subCategory && c.subCategory !== 'Standard Container / General Cargo' && ` (${c.subCategory})`}
                {' '}• Registered on {dateStr}
              </p>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={handleDownloadAllFilesBatch}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                title="Download all case documents, dossier PDF and attachments"
              >
                <Download size={15} />
                <span>Download All Documents</span>
              </button>

              <button 
                type="button"
                onClick={() => setReportSelectedCase(null)}
                className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Modal Scrollable Body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-6 space-y-6 text-gray-200">
            
            {/* 1. Quick Document Downloads Center */}
            <div className="bg-gradient-to-r from-brand-950/60 via-slate-900 to-amber-950/40 p-4 sm:p-5 rounded-2xl border border-white/10 shadow-lg space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Download size={16} className="text-emerald-400" />
                    <span>Download Case Documents & Official PDFs</span>
                  </h4>
                  <p className="text-[11px] text-gray-400">
                    One-click access to complete case dossier, single-page summary, commercial invoice, DO, and shipping documents.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCase(c);
                      setShowDownloadDocsModal(true);
                    }}
                    className="text-[11px] text-brand-300 hover:text-white font-medium underline flex items-center gap-1"
                  >
                    <span>Full Download Center</span>
                    <ExternalLink size={11} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                {/* Button A: Complete Dossier */}
                <button
                  type="button"
                  onClick={() => handleDownloadPdfFile(c, { withInvoice: true, withAttachments: true })}
                  disabled={isDownloadingPdf}
                  className="bg-emerald-700/80 hover:bg-emerald-600 border border-emerald-500/40 text-white p-3 rounded-xl text-xs font-semibold flex flex-col items-center justify-center text-center gap-1 shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  title="Download unified PDF with all case particulars, invoices, and paperwork"
                >
                  <Download size={16} className="text-emerald-200" />
                  <span>Complete Dossier (PDF)</span>
                  <span className="text-[9px] text-emerald-200/80 font-normal">All details + attachments</span>
                </button>

                {/* Button B: Case Summary */}
                <button
                  type="button"
                  onClick={() => handleDownloadPdfFile(c, { onlyCaseDetails: true })}
                  disabled={isDownloadingPdf}
                  className="bg-brand-700/80 hover:bg-brand-600 border border-brand-500/40 text-white p-3 rounded-xl text-xs font-semibold flex flex-col items-center justify-center text-center gap-1 shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  title="Download clean single-page official case summary"
                >
                  <FileText size={16} className="text-brand-200" />
                  <span>Case Summary (PDF)</span>
                  <span className="text-[9px] text-brand-200/80 font-normal">Single-page metadata</span>
                </button>

                {/* Button C: Commercial Invoice */}
                <button
                  type="button"
                  onClick={() => handleDownloadPdfFile(c, { onlyInvoice: true })}
                  disabled={isDownloadingPdf}
                  className="bg-amber-700/80 hover:bg-amber-600 border border-amber-500/40 text-white p-3 rounded-xl text-xs font-semibold flex flex-col items-center justify-center text-center gap-1 shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  title="Download official commercial invoice voucher"
                >
                  <Receipt size={16} className="text-amber-200" />
                  <span>Commercial Invoice</span>
                  <span className="text-[9px] text-amber-200/80 font-normal">Itemized bill breakdown</span>
                </button>

                {/* Button D: Customs Delivery Order (DO) */}
                {isDestinationUnloadedAndGateOut(c) && (
                  <button
                    type="button"
                    onClick={() => handleDownloadDeliveryOrder(c)}
                    className="bg-purple-700/80 hover:bg-purple-600 border border-purple-500/40 text-white p-3 rounded-xl text-xs font-semibold flex flex-col items-center justify-center text-center gap-1 shadow-md transition-all active:scale-95 cursor-pointer"
                    title="Print customs delivery order document"
                  >
                    <FileCheck size={16} className="text-purple-200" />
                    <span>Print DO Document</span>
                    <span className="text-[9px] text-purple-200/80 font-normal">Port/Terminal Delivery Order</span>
                  </button>
                )}
              </div>
            </div>

            {/* 2. Attached Shipping Files & Documents */}
            {docs.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                    <Package size={15} className="text-brand-400" />
                    <span>Attached Shipping Documents ({docs.length})</span>
                  </h4>
                  <button
                    type="button"
                    onClick={handleDownloadAllFilesBatch}
                    className="text-[11px] text-brand-300 hover:text-white flex items-center gap-1 font-medium underline"
                  >
                    <Download size={12} />
                    <span>Download All Files</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {docs.map((doc: any, idx: number) => {
                    const docName = doc.name || `Attached_Document_${idx + 1}`;
                    const docCategory = doc.docCategory || doc.type || 'Customs Paperwork';
                    let docUrl = doc.url;
                    if (!docUrl && doc instanceof File) {
                      try { docUrl = URL.createObjectURL(doc); } catch (_) {}
                    }

                    return (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-white/10 hover:border-white/20 transition-all text-xs">
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-400 flex items-center justify-center shrink-0">
                            <FileText size={16} />
                          </div>
                          <div className="truncate">
                            <p className="font-semibold text-white truncate">{docName}</p>
                            <span className="text-[10px] text-gray-400">{docCategory}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {docUrl && (
                            <button
                              type="button"
                              onClick={() => {
                                const isPdf = docName.toLowerCase().endsWith('.pdf');
                                if (isPdf) {
                                  setDirectDownloadUrl(docUrl);
                                  setDirectDownloadFilename(docName);
                                  setIsPdfViewerOpen(true);
                                } else {
                                  setLightboxImage(docUrl);
                                }
                              }}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white transition-colors"
                              title="Preview Document"
                            >
                              <Eye size={14} />
                            </button>
                          )}
                          {docUrl && (
                            <a
                              href={docUrl}
                              download={docName}
                              className="p-1.5 rounded-lg bg-brand-600/30 hover:bg-brand-600 text-brand-300 hover:text-white transition-colors flex items-center gap-1 font-medium text-[11px] px-2.5"
                              title="Download File"
                            >
                              <Download size={13} />
                              <span>Save</span>
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. Comprehensive Shipping Particulars Grid */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <Ship size={15} className="text-brand-400" />
                <span>Shipping, Routing & Commodity Particulars</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                
                {/* Card A: Bill of Lading & Vessel */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-white/10 space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-brand-400 font-bold block">
                    B/L, Vessel & Port Calls
                  </span>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between py-0.5 border-b border-white/5">
                      <span className="text-gray-400">B/L Number:</span>
                      <span className="font-mono font-semibold text-white">{ext.blNumber || c.blNumber || '-'}</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-white/5">
                      <span className="text-gray-400">B/L Date:</span>
                      <span className="text-gray-200">{ext.blDate || '-'}</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-white/5">
                      <span className="text-gray-400">Vessel Name:</span>
                      <span className="text-gray-200">{ext.vesselName || '-'}</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-white/5">
                      <span className="text-gray-400">Shipping Line:</span>
                      <span className="text-gray-200">{ext.shippingLine || '-'}</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-white/5">
                      <span className="text-gray-400">IGM / Index:</span>
                      <span className="font-mono text-gray-200">
                        {ext.igmNo ? `IGM: ${ext.igmNo}` : ''} {ext.indexNo ? `Idx: ${ext.indexNo}` : ''} {!ext.igmNo && !ext.indexNo && '-'}
                      </span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-gray-400">Arrival Date:</span>
                      <span className="text-gray-200">{ext.arrivalDate || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Card B: Port Routing & Status */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-white/10 space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold block">
                    Routing & Service Category
                  </span>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between py-0.5 border-b border-white/5">
                      <span className="text-gray-400">Port of Loading (POL):</span>
                      <span className="text-white font-medium text-right truncate max-w-[160px]">{pol}</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-white/5">
                      <span className="text-gray-400">Port of Delivery (POD):</span>
                      <span className="text-white font-medium text-right truncate max-w-[160px]">{pod}</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-white/5">
                      <span className="text-gray-400">Category:</span>
                      <span className="text-gray-200">{c.category || 'Bonded Carrier'}</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-white/5">
                      <span className="text-gray-400">Sub-Category:</span>
                      <span className="text-gray-200">{c.subCategory || 'Standard'}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-gray-400">DO Arranged By:</span>
                      <span className="font-semibold text-amber-300">
                        {c.serviceArrangements?.shippingLineDO?.arrangedBy === 'DPL' ? 'DPL (Docks Pvt Ltd)' : 'Client Arranged'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card C: Cargo & Value */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-white/10 space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold block">
                    Cargo Description & Weight
                  </span>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between py-0.5 border-b border-white/5">
                      <span className="text-gray-400">Item Name:</span>
                      <span className="text-white font-medium truncate max-w-[160px]">{ext.itemName || ext.itemType || '-'}</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-white/5">
                      <span className="text-gray-400">Packaging Type:</span>
                      <span className="text-gray-200">{ext.packagingType || '-'}</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-white/5">
                      <span className="text-gray-400">Package Count:</span>
                      <span className="font-mono text-gray-200">{ext.packageCount ? `${ext.packageCount} Units` : '-'}</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-white/5">
                      <span className="text-gray-400">Total Gross Weight:</span>
                      <span className="font-mono font-semibold text-white">{ext.totalWeight ? `${ext.totalWeight.toLocaleString()} Kg` : '-'}</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-white/5">
                      <span className="text-gray-400">Invoice Value:</span>
                      <span className="font-mono text-emerald-300">{ext.invoiceValue ? `PKR ${ext.invoiceValue.toLocaleString()}` : '-'}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-gray-400">HS Code:</span>
                      <span className="font-mono text-gray-200">{ext.hsCode || '-'}</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* 4. Shipper & Consignee */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-white/10 space-y-1.5 text-xs">
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold block">
                  Consignee / Importer
                </span>
                <p className="font-bold text-white text-sm">{ext.consigneeName || clientName}</p>
                <p className="text-gray-400 leading-relaxed">{ext.consigneeAddress || 'Address on file'}</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-white/10 space-y-1.5 text-xs">
                <span className="text-[10px] font-mono uppercase tracking-wider text-purple-400 font-bold block">
                  Shipper / Supplier
                </span>
                <p className="font-bold text-white text-sm">{ext.shipperName || 'International Supplier'}</p>
                <p className="text-gray-400 leading-relaxed">{ext.shipperAddress || 'Overseas Port / Location'}</p>
              </div>
            </div>

            {/* 5. Containers & Transport Vehicles */}
            {containers.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                  <Truck size={15} className="text-brand-400" />
                  <span>Assigned Containers & Transport Fleet ({containers.length})</span>
                </h4>

                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-gray-400 font-mono uppercase border-b border-white/10">
                      <tr>
                        <th className="p-3">#</th>
                        <th className="p-3">Container No</th>
                        <th className="p-3">Size / Type</th>
                        <th className="p-3">Seal No</th>
                        <th className="p-3">Vehicle No</th>
                        <th className="p-3">Driver Name & Phone</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 bg-slate-900/50">
                      {containers.map((cn: Container, cIdx: number) => (
                        <tr key={cIdx} className="hover:bg-white/5">
                          <td className="p-3 text-gray-500 font-mono">{cIdx + 1}</td>
                          <td className="p-3 font-mono font-bold text-amber-300">{cn.number || '-'}</td>
                          <td className="p-3 text-gray-300 font-mono">{cn.size || '40ft'}</td>
                          <td className="p-3 font-mono text-cyan-300">{cn.sealNo || '-'}</td>
                          <td className="p-3 font-mono font-semibold text-white">{cn.vehicleNo || '-'}</td>
                          <td className="p-3 text-gray-300">
                            {cn.driverName ? `${cn.driverName} (${cn.driverContact || 'No Phone'})` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 6. Itemized Financial Charges */}
            {charges.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <DollarSign size={15} className="text-emerald-400" />
                    <span>Itemized Charges & Billing</span>
                  </span>
                  <span className="font-mono text-emerald-400 font-bold">
                    Total: PKR {charges.reduce((sum, ch) => sum + (Number(ch.amount) || 0), 0).toLocaleString()}
                  </span>
                </h4>

                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-gray-400 font-mono uppercase border-b border-white/10">
                      <tr>
                        <th className="p-3">Charge Description</th>
                        <th className="p-3">Category</th>
                        <th className="p-3 text-right">Amount (PKR)</th>
                        <th className="p-3 text-center">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 bg-slate-900/50">
                      {charges.map((ch: CaseCharge, chIdx: number) => (
                        <tr key={chIdx} className="hover:bg-white/5">
                          <td className="p-3 font-medium text-white">{ch.description}</td>
                          <td className="p-3 text-gray-400">{ch.category || 'Port / Logistics'}</td>
                          <td className="p-3 font-mono text-emerald-300 font-semibold text-right">
                            PKR {(Number(ch.amount) || 0).toLocaleString()}
                          </td>
                          <td className="p-3 text-center">
                            {ch.receiptUrl ? (
                              <a
                                href={ch.receiptUrl}
                                download={`Receipt_${(ch.description || 'Charge').replace(/\s+/g, '_')}`}
                                className="text-[10px] text-brand-300 hover:text-white underline inline-flex items-center gap-1"
                              >
                                <Download size={10} />
                                <span>Receipt</span>
                              </a>
                            ) : (
                              <span className="text-gray-600">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>

          {/* Modal Footer */}
          <div className="p-4 sm:p-5 border-t border-white/10 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <span className="text-xs text-gray-400">
              DPL Operations Audit & Clearance Record
            </span>
            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => {
                  const target = c;
                  setReportSelectedCase(null);
                  setShowReportModal(false);
                  setSelectedCase(target);
                  setView('details');
                }}
                className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-brand-600/30 cursor-pointer"
              >
                <ExternalLink size={14} />
                <span>Open in Full Case Editor</span>
              </button>
              <button
                type="button"
                onClick={() => setReportSelectedCase(null)}
                className="bg-slate-800 hover:bg-slate-700 text-gray-200 px-4 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>

        </div>
      </div>
    );
  };

  const renderReportModal = () => {
    const reportData = getFilteredReportData();

    return (
      <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col animate-in fade-in slide-in-from-bottom-4 print-sheet" data-printable-modal="true">
        {/* Top Bar - Hidden during Print */}
        <div className="bg-slate-900 border-b border-white/10 p-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-lg z-20 no-print shrink-0">
           <div className="flex items-center gap-4 w-full md:w-auto">
              <button onClick={() => setShowReportModal(false)} className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors">
                 <ArrowLeft size={24} />
              </button>
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><ListFilter size={24} className="text-brand-400"/> Full Case Report</h2>
           </div>

           {/* Global Search Bar */}
           <div className="w-full md:w-96 relative">
              <Search className="absolute left-3 top-2.5 text-brand-400" size={20} />
              <input 
                type="text" 
                placeholder="Search anything (Client, BL, item, etc)..." 
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 outline-none text-white focus:border-brand-500 transition-colors shadow-inner text-sm"
                value={reportSearchTerm}
                onChange={(e) => setReportSearchTerm(e.target.value)}
                autoFocus
              />
           </div>
           
           <div className="flex items-center gap-3">
              <div className="text-sm text-gray-400 font-mono hidden md:block">
                 {reportData.length} Records Found
              </div>
              <button
                onClick={() => {
                  const headers = ['#', 'Case No', 'Date', 'Client', 'Category', 'Status', 'Port of Loading', 'Port of Delivery'];
                  const rows = reportData.map((c, i) => [
                    i + 1,
                    c.caseNo,
                    c.createdAt ? c.createdAt.split('T')[0] : (c.registrationDate || ''),
                    c.clientName || c.client || '',
                    c.category,
                    c.status,
                    c.pol || c.extractedData?.pol || '',
                    c.pod || c.extractedData?.pod || '',
                  ]);
                  const csvContent = [headers.join(','), ...rows.map(r => r.map(f => `"${String(f).replace(/"/g, '""')}"`).join(','))].join('\n');
                  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `Case_Report_${new Date().toISOString().split('T')[0]}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <Download size={15} />
                <span>Download Report (CSV)</span>
              </button>
           </div>
        </div>

        {/* Official Header for Print (Visible only in Print) */}
        <div className="hidden print:block p-4 border-b-2 border-black">
           <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                 <Logo className="h-14 w-auto max-w-[200px] object-contain shrink-0" customSrc={activeLogo} />
                 <div className="flex flex-col justify-center">
                    <h1 className="text-xl font-bold uppercase tracking-wider text-black leading-tight">{companyName}</h1>
                    {subtitle && <p className="text-xs text-gray-700 font-medium">{subtitle}</p>}
                    <p className="text-[11px] text-gray-600 mt-0.5">{branding.address} • Tel: {branding.phone} • Cell: {branding.cell} • Email: {branding.email}</p>
                    <p className="text-xs font-semibold text-black mt-1 uppercase tracking-wide">COMPREHENSIVE CASE AUDIT & LOGISTICS REPORT</p>
                 </div>
              </div>
              <div className="text-right text-xs text-gray-700 shrink-0">
                 <p className="font-semibold text-black">Total Records: {reportData.length}</p>
                 <p>Generated on: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
                 {reportSearchTerm && <p>Search Query: "{reportSearchTerm}"</p>}
              </div>
           </div>
        </div>

        {/* Report Table Viewport with Reduced Side Margins & Natural Up/Down Scroll */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-950 p-4 sm:p-6 lg:p-8">
           <div className="max-w-[1360px] mx-auto w-full space-y-3">
             
             {/* Sub-header instruction */}
             <div className="flex items-center justify-between text-xs text-gray-400 px-1 no-print">
               <span className="flex items-center gap-1.5 text-brand-300">
                 <Sparkles size={14} className="text-amber-400" />
                 Row par click karein case ki mukammal detail aur documents download karne ke liye
               </span>
               <span className="font-mono text-gray-400">{reportData.length} cases</span>
             </div>

             <div className="border border-white/10 rounded-2xl overflow-hidden shadow-2xl bg-slate-900/60 print:border-none">
               <div className="w-full">
                 <table className="w-full text-left text-sm text-gray-200 print:text-black">
                    <thead className="bg-slate-900 text-xs uppercase font-bold text-gray-400 sticky top-0 z-10 shadow-md print:bg-gray-100 print:text-black">
                      <tr>
                        <th className="p-3.5 border-b border-white/10 bg-slate-900 w-12 text-center print:bg-transparent print:border-gray-300">#</th>
                        {REPORT_COLUMNS.map((col) => (
                          <th key={col.key} className="p-3.5 border-b border-white/10 bg-slate-900 group relative print:bg-transparent print:border-gray-300 text-xs tracking-wider">
                             <div className="flex items-center justify-between gap-1.5">
                                <span>{col.label}</span>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setActiveFilterColumn(activeFilterColumn === col.key ? null : col.key); }}
                                  className={`p-1 rounded hover:bg-white/10 transition-colors no-print ${reportFilters[col.key] ? 'text-brand-400' : 'text-gray-600 group-hover:text-gray-400'}`}
                                  title={`Filter by ${col.label}`}
                                >
                                   <Filter size={13} fill={reportFilters[col.key] ? 'currentColor' : 'none'} />
                                </button>
                             </div>

                             {/* Column Filter Popup */}
                             {activeFilterColumn === col.key && (
                                <div className="absolute top-full left-0 mt-2 w-52 bg-slate-800 border border-white/20 rounded-xl shadow-2xl p-2.5 z-30 animate-in fade-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
                                   <input 
                                     type="text" 
                                     placeholder={`Filter ${col.label}...`}
                                     className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-brand-500"
                                     value={reportFilters[col.key] || ''}
                                     onChange={(e) => handleColumnFilterChange(col.key, e.target.value)}
                                     autoFocus
                                   />
                                   <div className="flex justify-between items-center mt-2 pt-1 border-t border-white/10">
                                      {reportFilters[col.key] ? (
                                        <button
                                          onClick={() => handleColumnFilterChange(col.key, '')}
                                          className="text-[10px] text-red-400 hover:text-red-300"
                                        >
                                          Clear
                                        </button>
                                      ) : <span />}
                                      <button 
                                        onClick={() => setActiveFilterColumn(null)}
                                        className="text-[10px] text-brand-400 hover:text-white uppercase font-bold"
                                      >
                                        Close
                                      </button>
                                   </div>
                                </div>
                             )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                       {reportData.map((row, idx) => (
                          <tr 
                            key={row.id} 
                            onClick={() => setReportSelectedCase(row)}
                            className="hover:bg-brand-500/10 transition-colors cursor-pointer group"
                            title="Click row to open case details & download documents"
                          >
                             <td className="p-3.5 border-r border-white/5 bg-slate-900/30 text-center text-gray-500 font-mono text-xs w-12">
                                {idx + 1}
                             </td>
                             {REPORT_COLUMNS.map((col) => {
                                let val = getNestedValue(row, col.key);
                                if (col.key === 'createdAt' && val) {
                                  val = String(val).split('T')[0];
                                } else if (col.key === 'pol' && !val) {
                                  val = row.extractedData?.pol || '-';
                                } else if (col.key === 'pod' && !val) {
                                  val = row.extractedData?.pod || row.extractedData?.placeOfDelivery || '-';
                                } else if (col.key === 'clientName' && !val) {
                                  val = row.extractedData?.consigneeName || row.client || '-';
                                }

                                if (col.key === 'caseNo') {
                                  return (
                                    <td key={col.key} className="p-3.5 font-mono font-bold text-amber-300 border-r border-white/5 whitespace-nowrap">
                                      <div className="flex items-center gap-1.5">
                                        <span>{val || '-'}</span>
                                        <ExternalLink size={12} className="opacity-0 group-hover:opacity-80 transition-opacity text-brand-400 shrink-0" />
                                      </div>
                                    </td>
                                  );
                                }

                                if (col.key === 'createdAt') {
                                  return (
                                    <td key={col.key} className="p-3.5 font-mono text-gray-300 border-r border-white/5 whitespace-nowrap text-xs">
                                      {val || '-'}
                                    </td>
                                  );
                                }

                                if (col.key === 'clientName') {
                                  return (
                                    <td key={col.key} className="p-3.5 font-semibold text-white border-r border-white/5 truncate max-w-[200px]" title={String(val || '')}>
                                      {val || '-'}
                                    </td>
                                  );
                                }

                                if (col.key === 'category') {
                                  return (
                                    <td key={col.key} className="p-3.5 text-gray-300 border-r border-white/5 whitespace-nowrap text-xs">
                                      {val || '-'}
                                    </td>
                                  );
                                }

                                if (col.key === 'status') {
                                  return (
                                    <td key={col.key} className="p-3.5 border-r border-white/5 whitespace-nowrap">
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-500/15 text-brand-300 border border-brand-500/30">
                                        {val || 'Active'}
                                      </span>
                                    </td>
                                  );
                                }

                                return (
                                  <td key={col.key} className="p-3.5 text-gray-300 border-r border-white/5 last:border-0 truncate max-w-[180px] text-xs" title={String(val || '')}>
                                     {val || '-'}
                                  </td>
                                );
                             })}
                          </tr>
                       ))}
                       {reportData.length === 0 && (
                          <tr>
                             <td colSpan={REPORT_COLUMNS.length + 1} className="p-12 text-center text-gray-500">
                                No records found matching your search.
                             </td>
                          </tr>
                       )}
                    </tbody>
                 </table>
               </div>
             </div>
           </div>
        </div>

        {/* Case Detail & Document Download Popup Modal */}
        {reportSelectedCase && renderReportCaseDetailModal()}
      </div>
    );
  };

  // --- Views ---

  const renderCaseList = () => (
    <div className={`space-y-6 animate-fade-in ${showReportModal ? 'print:hidden' : ''}`}>
       {/* Incomplete Case Draft Alert Banner */}
       {hasDraft && draftInfo && (
         <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-950/50 via-slate-900/95 to-amber-950/50 border border-amber-500/40 shadow-xl shadow-amber-950/20 space-y-3 animate-in fade-in slide-in-from-top-2">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
             <div className="flex items-start sm:items-center gap-3.5">
               <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-400 shadow-inner">
                 <AlertTriangle size={22} className="animate-pulse" />
               </div>
               <div>
                 <div className="flex flex-wrap items-center gap-2">
                   <h3 className="text-base font-bold text-white flex items-center gap-2">
                     Incomplete Case Registration
                   </h3>
                   <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                     Step {draftInfo.step} of 4: {draftInfo.stepName}
                   </span>
                   {draftInfo.caseNo ? (
                     <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                       {draftInfo.caseNo}
                     </span>
                   ) : (
                     <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-white/10 text-gray-300 border border-white/10">
                       Serial: Assigned on Progression
                     </span>
                   )}
                 </div>
                 <p className="text-xs text-amber-200/90 mt-1">
                   <span className="font-semibold text-white">{draftInfo.client || 'Draft Client'}</span> &bull; {draftInfo.category} &bull; {draftInfo.docsCount} document(s) attached {draftInfo.updatedAt ? `&bull; Auto-saved at ${draftInfo.updatedAt}` : ''}
                 </p>
               </div>
             </div>

             {/* Action Buttons */}
             <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto">
               <button
                 onClick={handleResumeDraft}
                 className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-lg shadow-brand-600/30 transition-all hover:scale-105 active:scale-95"
                 title="Resume case registration from where you left off"
               >
                 <Play size={14} className="fill-current" />
                 <span>Continue Registration</span>
               </button>
               <button
                 onClick={() => setShowDiscardModal(true)}
                 className="bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-all hover:text-white"
                 title="Discard this incomplete draft"
               >
                 <Trash2 size={14} />
                 <span>Discard Draft</span>
               </button>
             </div>
           </div>
         </div>
       )}

       {/* Toolbar */}
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div className="flex flex-wrap gap-2 items-center">
           <button onClick={handleStartRegistration} className="bg-brand-600 hover:bg-brand-500 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 font-medium shadow-lg shadow-brand-600/30 transition-all hover:scale-105">
             <Upload size={18} /> New Case Registration
           </button>
           <button onClick={() => setShowPortModal(true)} className="bg-white/5 hover:bg-white/10 text-white border border-white/10 px-4 py-2.5 rounded-lg flex items-center gap-2 font-medium transition-colors">
             <Anchor size={18} className="text-brand-400" /> Add Port
           </button>
           <button onClick={() => setShowFilterModal(true)} className="bg-white/5 hover:bg-white/10 text-white border border-white/10 px-4 py-2.5 rounded-lg flex items-center gap-2 font-medium transition-colors">
             <ListFilter size={18} className="text-brand-400" /> View List / Reports
           </button>
         </div>
         <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setShowSmartSearchModal(true)}
              className="bg-brand-600 hover:bg-brand-500 text-white px-3.5 py-2.5 rounded-lg flex items-center gap-2 font-medium text-xs sm:text-sm shadow-md shadow-brand-600/20 transition-all active:scale-95 shrink-0"
              title="Smart Case Search & Advanced Query"
            >
              <Search size={16} />
              <span>Smart Search</span>
            </button>
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-2.5 text-gray-500" size={18} />
              <input 
                type="text" 
                onClick={() => setShowSmartSearchModal(true)}
                placeholder="Search Importer, BL, Item, Client..." 
                className="w-full glass-input rounded-lg pl-10 pr-4 py-2.5 outline-none text-sm text-white cursor-pointer placeholder-gray-400" 
                readOnly
              />
            </div>
         </div>
       </div>

        {/* Active Filter Indicators */}
        <div className="flex flex-wrap gap-2">
            {activeDateFilter && (
                <div className="flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 px-3 py-1.5 rounded-lg w-fit">
                    <span className="text-xs text-brand-300">Date Filter: {activeDateFilter.start} to {activeDateFilter.end}</span>
                    <button onClick={() => setActiveDateFilter(null)} className="text-gray-400 hover:text-white"><X size={14} /></button>
                </div>
            )}
            {statusFilter && (
                <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 px-3 py-1.5 rounded-lg w-fit animate-in fade-in">
                    <span className="text-xs text-yellow-300">Status: {statusFilter}</span>
                    <button onClick={clearStatusFilter} className="text-gray-400 hover:text-white"><X size={14} /></button>
                </div>
            )}
        </div>

        {/* Workflow & Incident Vault Filtering Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
          <button
            type="button"
            onClick={() => setActiveWorkflowTab('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeWorkflowTab === 'all'
                ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5'
            }`}
          >
            <span>All Active Cases</span>
            <span className="px-1.5 py-0.5 rounded-md bg-black/30 text-[10px] font-mono">
              {cases.length - incidentCasesCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveWorkflowTab('in_progress')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeWorkflowTab === 'in_progress'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5'
            }`}
          >
            <span>In Progress (8 Steps)</span>
            <span className="px-1.5 py-0.5 rounded-md bg-black/30 text-[10px] font-mono">
              {inProgressCasesCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveWorkflowTab('completed')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeWorkflowTab === 'completed'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5'
            }`}
          >
            <span>Completed Dossiers</span>
            <span className="px-1.5 py-0.5 rounded-md bg-black/30 text-[10px] font-mono">
              {completedCasesCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveWorkflowTab('incident_vault')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeWorkflowTab === 'incident_vault'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                : incidentCasesCount > 0
                ? 'bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25 animate-pulse'
                : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5'
            }`}
          >
            <AlertTriangle size={14} className={incidentCasesCount > 0 ? 'text-rose-400' : 'text-gray-400'} />
            <span>Incident / Disputed Vault</span>
            <span className="px-1.5 py-0.5 rounded-md bg-black/30 text-[10px] font-mono">
              {incidentCasesCount}
            </span>
          </button>
        </div>

        {/* If in Incident Vault, show emergency banner */}
        {activeWorkflowTab === 'incident_vault' && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-start gap-3">
              <AlertCircle size={22} className="text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-white text-sm">Incident & Disputed Exception Vault</h4>
                <p className="text-gray-300 text-xs mt-0.5">
                  These cases experienced en-route stoppages, breakdowns, customs holds, or accidents. Normal workflow execution is halted until resolved.
                </p>
              </div>
            </div>
          </div>
        )}

       {/* Case List - Touch-Optimized for Smooth Vertical Scrolling */}
       <div className="glass-card rounded-2xl overflow-hidden">
         {/* Mobile View: High Density, Compact Typography, Zero Horizontal Scroll */}
         <div className="block sm:hidden divide-y divide-white/10 touch-pan-y">
           {filteredCases.length > 0 ? (
             filteredCases.map(c => (
               <div 
                 key={c.id} 
                 className="p-3 hover:bg-white/5 active:bg-white/10 transition-colors cursor-pointer space-y-1.5"
                 onClick={() => { setSelectedCase(c); setView('details'); }}
               >
                 {/* Top Row: Case No, Status & Date */}
                 <div className="flex items-center justify-between gap-2">
                   <div className="flex items-center gap-2 min-w-0">
                     <span className="font-mono font-bold text-xs text-brand-400 truncate">{c.caseNo}</span>
                     <span className="text-[10px] text-gray-400 shrink-0">{c.createdAt}</span>
                   </div>
                   <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border border-white/10 shrink-0 ${
                     c.status === CaseStatus.COMPLETED ? 'bg-green-500/20 text-green-400' : 
                     c.status === CaseStatus.IN_TRANSIT ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400'
                   }`}>
                     {c.status}
                   </span>
                 </div>

                 {/* Middle Row: Client & Category */}
                 <div className="flex items-center justify-between gap-2">
                   <p className="font-semibold text-white text-xs truncate">{c.clientName}</p>
                   <span className="text-[10px] text-brand-300 bg-brand-500/10 px-1.5 py-0.5 rounded border border-brand-500/20 shrink-0">
                     {c.category}
                   </span>
                 </div>

                 {/* Bottom Row: Route (POL -> POD) & View Button */}
                 <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px]">
                   <span className="font-mono text-gray-300 truncate">
                     {c.pol && c.pod ? `${c.pol} → ${c.pod}` : 'Customs Clearance'}
                   </span>
                   <span className="text-brand-400 flex items-center gap-1 font-medium text-[11px] shrink-0">
                     <Eye size={12} />
                     <span>Details</span>
                   </span>
                 </div>
               </div>
             ))
           ) : (
             <div className="p-8 text-center text-gray-400 text-xs">
               No cases found matching the criteria.
             </div>
           )}
         </div>

         {/* Desktop View: Full Table */}
         <div className="hidden sm:block overflow-x-auto custom-scrollbar touch-pan-y">
           <table className="w-full text-left text-sm text-gray-200 min-w-[1000px]">
             <thead className="bg-white/5 uppercase text-xs font-semibold text-gray-300 border-b border-white/5">
               <tr>
                 <th className="p-4">Case No</th>
                 <th className="p-4">Client</th>
                 <th className="p-4">Category</th>
                 <th className="p-4">Route</th>
                 <th className="p-4">Date</th>
                 <th className="p-4">Status</th>
                 <th className="p-4 text-center">Action</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-white/5">
               {filteredCases.length > 0 ? (
                 filteredCases.map(c => (
                   <tr key={c.id} className="hover:bg-white/5 transition-colors cursor-pointer group" onClick={() => { setSelectedCase(c); setView('details'); }}>
                     <td className="p-4 font-mono font-bold text-white group-hover:text-brand-400 transition-colors">{c.caseNo}</td>
                     <td className="p-4 font-medium text-white">{c.clientName}</td>
                     <td className="p-4 text-gray-200">{c.category}</td>
                     <td className="p-4 text-xs font-mono text-gray-300">
                        {c.pol && c.pod ? `${c.pol} → ${c.pod}` : '-'}
                     </td>
                     <td className="p-4 text-gray-300">
                          {c.createdAt}
                     </td>
                     <td className="p-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`px-2 py-1 rounded text-xs font-medium border border-white/10
                            ${c.status === CaseStatus.COMPLETED ? 'bg-green-500/20 text-green-400' : 
                              c.status === CaseStatus.IN_TRANSIT ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                             {c.status}
                          </span>
                          {c.approvalStatus === 'PENDING' && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/25 text-amber-300 border border-amber-500/40 animate-pulse">
                              Pending Approval
                            </span>
                          )}
                        </div>
                     </td>
                     <td className="p-4 text-center">
                       <button className="p-2 hover:bg-white/10 rounded-full text-brand-400 transition-colors">
                         <Eye size={18} />
                       </button>
                     </td>
                   </tr>
                 ))
               ) : (
                  <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-400">
                          No cases found matching the criteria.
                      </td>
                  </tr>
               )}
             </tbody>
           </table>
         </div>
       </div>

       {/* View List / Filter Modal */}
       {showFilterModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center pt-8 sm:pt-14 p-4 overflow-y-auto animate-in fade-in duration-200">
            <div className="glass-card p-6 rounded-2xl w-full max-w-sm border border-white/10">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2"><ListFilter size={20} className="text-brand-400"/> Filter Case List</h3>
                    <button onClick={() => setShowFilterModal(false)} className="text-gray-400 hover:text-white"><X size={20}/></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Start Date</label>
                        <input 
                            type="date" 
                            value={filterDates.start}
                            onChange={(e) => setFilterDates({...filterDates, start: e.target.value})}
                            className="w-full glass-input rounded-lg p-3 outline-none text-white"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">End Date</label>
                        <input 
                            type="date" 
                            value={filterDates.end}
                            onChange={(e) => setFilterDates({...filterDates, end: e.target.value})}
                            className="w-full glass-input rounded-lg p-3 outline-none text-white"
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <button 
                            onClick={handleSearchRecords}
                            className="w-full bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg font-medium border border-white/10 flex items-center justify-center gap-1 text-xs"
                        >
                            <Search size={14} /> Search Records
                        </button>
                        <button 
                            onClick={handleOpenReport}
                            className="w-full bg-brand-600 hover:bg-brand-500 text-white py-2 rounded-lg font-medium shadow-lg shadow-brand-600/20 flex items-center justify-center gap-1 text-xs"
                        >
                            <Eye size={14} /> View Full List
                        </button>
                    </div>
                </div>
            </div>
        </div>
       )}

       {/* Full Screen Report Modal */}
       {showReportModal && renderReportModal()}

       {/* Confirm Discard Incomplete Draft Modal */}
       {showDiscardModal && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center pt-8 sm:pt-14 p-4 overflow-y-auto animate-in fade-in duration-200">
           <div className="glass-card p-6 rounded-2xl w-full max-w-md border border-red-500/30 shadow-2xl space-y-4">
             <div className="flex items-center gap-3 text-red-400">
               <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
                 <Trash2 size={20} />
               </div>
               <div>
                 <h3 className="text-lg font-bold text-white">Discard Incomplete Case?</h3>
                 <p className="text-xs text-gray-400">This action will permanently delete the draft</p>
               </div>
             </div>

             <p className="text-sm text-gray-300 leading-relaxed">
               Are you sure you want to discard this incomplete case draft? All uploaded documents and entered details will be cleared permanently.
             </p>

             {draftInfo && (
               <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs space-y-1.5 text-gray-300">
                 <div className="flex justify-between">
                   <span className="text-gray-400">Client:</span>
                   <span className="font-semibold text-white">{draftInfo.client || 'None'}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-gray-400">Category:</span>
                   <span className="text-white">{draftInfo.category}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-gray-400">Progress:</span>
                   <span className="text-amber-300 font-medium">Step {draftInfo.step} of 4 ({draftInfo.stepName})</span>
                 </div>
                 {draftInfo.caseNo && (
                   <div className="flex justify-between">
                     <span className="text-gray-400">Reserved Serial:</span>
                     <span className="text-cyan-300 font-mono">{draftInfo.caseNo}</span>
                   </div>
                 )}
               </div>
             )}

             <div className="grid grid-cols-2 gap-3 pt-2">
               <button
                 type="button"
                 onClick={() => setShowDiscardModal(false)}
                 className="bg-white/10 hover:bg-white/15 text-white py-2.5 rounded-xl font-medium text-sm transition-colors"
               >
                 Cancel
               </button>
               <button
                 type="button"
                 onClick={handleDiscardDraft}
                 className="bg-red-600 hover:bg-red-500 text-white py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-red-600/30"
               >
                 Yes, Discard Draft
               </button>
             </div>
           </div>
         </div>
       )}

       {/* Existing Incomplete Draft Prompt (When clicking New Registration) */}
       {showStartNewDraftPrompt && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center pt-8 sm:pt-14 p-4 overflow-y-auto animate-in fade-in duration-200">
           <div className="glass-card p-6 rounded-2xl w-full max-w-md border border-amber-500/30 shadow-2xl space-y-4">
             <div className="flex items-center gap-3 text-amber-400">
               <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                 <AlertCircle size={20} />
               </div>
               <div>
                 <h3 className="text-lg font-bold text-white">Incomplete Draft Found</h3>
                 <p className="text-xs text-gray-400">You already have a case registration in progress</p>
               </div>
             </div>

             <p className="text-sm text-gray-300 leading-relaxed">
               An incomplete registration draft {draftInfo?.client ? `for "${draftInfo.client}"` : ''} is currently paused at Step {draftInfo?.step || 1}. Would you like to resume this draft or discard it and start fresh?
             </p>

             <div className="flex flex-col gap-2.5 pt-2">
               <button
                 type="button"
                 onClick={() => {
                   setShowStartNewDraftPrompt(false);
                   handleResumeDraft();
                 }}
                 className="w-full bg-brand-600 hover:bg-brand-500 text-white py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-600/30 transition-all"
               >
                 <Play size={15} className="fill-current" />
                 <span>Resume Incomplete Draft</span>
               </button>
               <button
                 type="button"
                 onClick={() => {
                   setShowStartNewDraftPrompt(false);
                   startFreshRegistration();
                 }}
                 className="w-full bg-white/10 hover:bg-white/15 text-gray-300 hover:text-white py-2.5 rounded-xl font-medium text-sm transition-colors"
               >
                 Discard & Start Fresh Case
               </button>
               <button
                 type="button"
                 onClick={() => setShowStartNewDraftPrompt(false)}
                 className="w-full py-2 text-xs text-gray-400 hover:text-white transition-colors"
               >
                 Cancel
               </button>
             </div>
           </div>
         </div>
       )}

       {/* Draft notification toast */}
       {draftToast && (
         <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 border border-white/20 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
           <span className="text-sm font-medium">{draftToast}</span>
         </div>
       )}

    </div>
  );

  const renderCaseDetails = () => {
    // Helper to render input or text based on edit mode
    const Field = ({ label, value, onChange }: { label: string, value: any, onChange?: (val: string) => void }) => {
       if (isEditingCase && onChange) {
          return (
             <div className="mb-3">
                <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1 block">{label}</label>
                <input 
                   type="text" 
                   value={value || ''} 
                   onChange={(e) => onChange(e.target.value)} 
                   className="w-full border-b border-brand-500 bg-brand-500/10 text-white px-1 py-0.5 focus:outline-none text-sm font-medium"
                />
             </div>
          );
       }
       return (
         <div className="mb-3">
             <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">{label}</p>
             <p className="text-sm font-medium text-white border-b border-transparent">{value || '-'}</p>
         </div>
       );
    };

    const targetCase = isEditingCase ? editedCase : selectedCase;

    if (!targetCase) {
      return (
        <div className="glass-card rounded-2xl p-8 text-center border border-white/10 space-y-4 max-w-lg mx-auto my-12 animate-fade-in">
          <div className="w-14 h-14 bg-brand-500/10 border border-brand-500/20 text-brand-400 rounded-2xl flex items-center justify-center mx-auto">
            <Loader2 className="animate-spin" size={28} />
          </div>
          <h3 className="text-lg font-bold text-white">Restoring Case Details</h3>
          <p className="text-xs text-gray-300">Synchronizing your case documents and shipment files...</p>
          <div className="pt-2">
            <button 
              type="button"
              onClick={() => {
                safeAppStorage.removeItem('dpl_selected_case');
                safeAppStorage.removeItem('dpl_selected_case_id');
                setView('list');
              }}
              className="text-xs bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-xl transition-colors font-medium shadow-md shadow-brand-600/30"
            >
              Return to Cases List
            </button>
          </div>
        </div>
      );
    }

    // Helper to get image source from File or MockDocument
    const getDocSource = (doc: any) => {
      if (!doc) return '';
      if (doc.url) {
        return doc.url;
      }
      try {
        if (doc instanceof File || doc instanceof Blob || doc instanceof MediaSource) {
          return URL.createObjectURL(doc);
        }
      } catch (err) {
        console.error("Failed to create object URL for doc", doc, err);
      }
      return '';
    };

    return (
      <div className="space-y-6 animate-fade-in printable-content">
         <div className="flex flex-wrap justify-between items-center gap-3 mb-4 no-print">
            <button onClick={() => setView('list')} className="text-gray-300 hover:text-white flex items-center gap-2 font-medium text-xs sm:text-sm">
                <ArrowLeft size={16} /> Back to List
            </button>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {isEditingCase ? (
                   <>
                      <button onClick={handleEditCaseToggle} className="text-gray-300 hover:text-white px-3 py-1.5 text-xs sm:text-sm">Cancel</button>
                      <button onClick={handleSaveEditedCase} className="bg-green-600 hover:bg-green-500 text-white px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs sm:text-sm shadow-lg font-medium">
                         <Save size={15} /> Save Changes
                      </button>
                   </>
                ) : (
                   <>
                      {/* Print Delivery Order (DO) button for Destination Staff, Case Manager, and Admin */}
                      {(effectiveRole === UserRole.UNLOADING_PORT_STAFF || effectiveRole === UserRole.DESTINATION_PORT_STAFF || effectiveRole === UserRole.ADMIN || effectiveRole === UserRole.OPERATIONS_MANAGER) && isDestinationUnloadedAndGateOut(targetCase) && (
                        <button 
                          onClick={() => handleDownloadDeliveryOrder(targetCase)} 
                          className="bg-amber-600 hover:bg-amber-500 active:scale-95 text-white px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs sm:text-sm shadow-lg shadow-amber-600/20 transition-all font-medium"
                          title="Print Customs / Terminal Delivery Order (DO) Document"
                        >
                          <FileText size={15} />
                          <span>Print DO (Delivery Order)</span>
                        </button>
                      )}

                      {targetCase?.status === CaseStatus.SHIPPING_LINE_DO && effectiveRole !== UserRole.CLIENT && (
                          <button onClick={handleApproveCase} className="bg-green-600 hover:bg-green-500 text-white px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs sm:text-sm shadow-lg shadow-green-600/20 animate-pulse font-medium">
                              <CheckCircle size={15} /> Approve & Process
                          </button>
                      )}
                      
                      {(hasOpsRole || hasAdminRole) && (
                        <>
                          {targetCase?.pendingApproval ? (
                            <div className="bg-amber-500/20 border border-amber-500/40 text-amber-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold">
                              <Clock size={14} className="animate-spin text-amber-400" />
                              <span>Pending Admin Approval ({targetCase.pendingApproval.action})</span>
                            </div>
                          ) : (
                            <>
                              <button 
                                onClick={() => handleInitiateFinishedCaseAction('EDIT')} 
                                className="bg-brand-600/20 hover:bg-brand-600/30 text-brand-400 border border-brand-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs sm:text-sm font-medium"
                              >
                                <Edit size={15} /> Edit Case
                              </button>
                              <button 
                                onClick={() => handleInitiateFinishedCaseAction('CANCEL')} 
                                className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs sm:text-sm font-medium"
                              >
                                <XCircle size={15} /> Cancel
                              </button>
                              <button 
                                onClick={() => handleInitiateFinishedCaseAction('DELETE')} 
                                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs sm:text-sm font-medium"
                              >
                                <Trash2 size={15} /> Delete
                              </button>
                            </>
                          )}
                        </>
                      )}
                      <button 
                        onClick={() => setShowDownloadDocsModal(true)} 
                        className="bg-brand-600 hover:bg-brand-500 active:scale-95 text-white px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs sm:text-sm shadow-lg shadow-brand-600/20 transition-all font-medium"
                        title="Download Documents (Case Details, Invoice, Attachments, All)"
                      >
                        <Download size={15} />
                        <span>Download Documents</span>
                      </button>
                   </>
                )}
            </div>
         </div>

         {/* Pending Approval Banner on Detail View */}
         {targetCase?.pendingApproval && (
           <div className="mb-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start sm:items-center justify-between gap-3 text-amber-200 text-xs sm:text-sm shadow-xl">
             <div className="flex items-center gap-2.5">
               <AlertTriangle size={18} className="text-amber-400 shrink-0" />
               <div>
                 <span className="font-bold text-amber-300">Approval Pending from Super Admin: </span>
                 <span>
                   A request to <strong>{targetCase.pendingApproval.action}</strong> this completed case was submitted by <strong>{targetCase.pendingApproval.requestedBy}</strong>. Reason: &quot;{targetCase.pendingApproval.reason}&quot;.
                 </span>
               </div>
             </div>
             <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
               Awaiting Admin
             </span>
           </div>
         )}

         {/* Mobile-Friendly PDF Download Alert / Notification Banner */}
         {(isDownloadingPdf || pdfDownloadSuccess || pdfDownloadError) && (
           <div className="mb-4 print:hidden animate-fade-in">
             {isDownloadingPdf && (
               <div className="p-3.5 bg-brand-500/15 border border-brand-500/40 rounded-xl flex items-center gap-3 text-brand-300 text-xs sm:text-sm shadow-lg">
                 <Loader2 size={18} className="animate-spin text-brand-400 shrink-0" />
                 <span>Generating & downloading PDF...</span>
               </div>
             )}
             {pdfDownloadSuccess && (
               <div className="p-4 bg-emerald-950/80 border border-emerald-500/40 rounded-xl space-y-2 shadow-2xl backdrop-blur-md">
                 <div className="flex flex-wrap items-center justify-between gap-2">
                   <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                     <CheckCircle2 size={18} className="shrink-0" />
                     <span>PDF Ready: {pdfDownloadSuccess}</span>
                   </div>
                   <button
                     type="button"
                     onClick={() => setPdfDownloadSuccess(null)}
                     className="text-xs text-gray-400 hover:text-white px-2 py-1"
                   >
                     ✕ Close
                   </button>
                 </div>
                 <p className="text-xs text-gray-300">
                   If the file did not download automatically, click the button below:
                 </p>
                 <div className="flex flex-wrap items-center gap-3 pt-1">
                   {directDownloadUrl && (
                     <>
                       <a
                         href={directDownloadUrl}
                         download={directDownloadFilename}
                         className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow active:scale-95 transition-all"
                       >
                         <Download size={14} /> Download File
                       </a>
                       <button
                         type="button"
                         onClick={() => setIsPdfViewerOpen(true)}
                         className="bg-white/10 hover:bg-white/20 text-white font-medium text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 border border-white/20 active:scale-95 transition-all"
                       >
                         <Eye size={14} /> View PDF
                       </button>
                       {typeof navigator !== 'undefined' && 'share' in navigator && (
                         <button
                           type="button"
                           onClick={() => sharePdfFile(directDownloadUrl, directDownloadFilename, targetCase?.caseNo)}
                           className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow active:scale-95 transition-all"
                         >
                           <Share2 size={14} /> Save to Mobile
                         </button>
                       )}
                     </>
                   )}
                 </div>
               </div>
             )}
             {pdfDownloadError && (
               <div className="p-3.5 bg-red-500/20 border border-red-500/40 rounded-xl flex items-center justify-between gap-2 text-red-300 text-xs sm:text-sm">
                 <div className="flex items-center gap-2">
                   <AlertCircle size={18} className="text-red-400 shrink-0" />
                   <span>{pdfDownloadError}</span>
                 </div>
                 <button
                   type="button"
                   onClick={() => setPdfDownloadError(null)}
                   className="text-xs text-gray-400 hover:text-white px-2 py-1"
                 >
                   ✕
                 </button>
               </div>
             )}
           </div>
         )}
  
          {/* Client Case Approval Banner */}
          {targetCase?.approvalStatus === 'PENDING' && (
            <div className="mb-4 p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-200 shadow-lg no-print">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    Client Case Registration: Approval Pending
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/30 text-amber-300 text-[10px] uppercase font-bold">
                      Awaiting Admin / Case Manager
                    </span>
                  </h4>
                  <p className="text-xs text-amber-300/90 mt-0.5">
                    This case was registered via Client Portal by <strong>{targetCase.clientName}</strong> and requires authorization.
                  </p>
                </div>
              </div>
              {(effectiveRole === UserRole.ADMIN || effectiveRole === UserRole.OPERATIONS_MANAGER) && (
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={handleApproveCase}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
                  >
                    <CheckCircle size={15} />
                    <span>Approve Case</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRejectCase}
                    className="bg-red-600/80 hover:bg-red-600 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 border border-red-500/30 transition-all active:scale-95"
                  >
                    <X size={15} />
                    <span>Reject</span>
                  </button>
                </div>
              )}
            </div>
          )}

         <div id="printable-area" className="glass-card rounded-2xl overflow-hidden border border-white/10 print:border-none print:shadow-none">
            {/* Official Corporate Header for Print (Visible only in Print) */}
            <div className="hidden print:block p-6 pb-4 border-b-2 border-black bg-white">
               <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                     <Logo className="h-16 w-auto max-w-[210px] object-contain shrink-0" customSrc={activeLogo} />
                     <div className="flex flex-col justify-center">
                        <h1 className="text-2xl font-bold uppercase tracking-wider text-black leading-tight">{companyName}</h1>
                        <p className="text-xs text-gray-700 font-medium">{subtitle || "Customs Clearance, Bonded Carrier & Freight Terminal Services"}</p>
                        <p className="text-[11px] text-gray-600 mt-0.5">{branding.address} • Tel: {branding.phone} • Cell: {branding.cell} • Email: {branding.email}</p>
                        <p className="text-xs font-bold text-black mt-1 uppercase tracking-wide">CASE DETAILS</p>
                     </div>
                  </div>
                  <div className="text-right text-xs text-gray-700 shrink-0">
                     <p className="font-mono font-bold text-sm text-black">{targetCase?.caseNo}</p>
                     <p>Date: {targetCase?.createdAt || new Date().toLocaleDateString()}</p>
                     <p>Status: <span className="font-bold text-black">{targetCase?.status}</span></p>
                  </div>
               </div>
            </div>

            {/* Header / Title Section */}
            <div className="bg-black/20 p-6 border-b border-white/10 print:bg-gray-100 print:border-b print:border-gray-300">
               <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                     <div className="flex flex-col justify-center">
                        <h2 className="text-2xl sm:text-3xl font-bold text-white print:text-black leading-tight mb-1">{targetCase?.caseNo}</h2>
                        <p className="text-brand-300 print:text-black text-base sm:text-lg font-semibold">{targetCase?.clientName}</p>
                     </div>
                  </div>
                  <div className="text-right">
                     <span className={`inline-block px-3 py-1 rounded text-sm font-medium border border-white/10 mb-2 print:border-black
                        ${targetCase?.status === CaseStatus.COMPLETED ? 'bg-green-500/20 text-green-400 print:bg-transparent print:text-black' : 
                          'bg-blue-500/20 text-blue-400 print:bg-transparent print:text-black'}`}>
                        {targetCase?.status}
                     </span>
                     <p className="text-gray-300 text-sm print:text-black">
                         {targetCase?.createdAt}
                     </p>
                  </div>
               </div>
            </div>
                       <div className={`p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 print:grid-cols-2 print:gap-4 ${printOptions.onlyInvoice ? 'print:hidden' : ''}`}>
               {/* Client & Route Info */}
               <div className="bg-white/5 rounded-xl p-5 border border-white/5 print:bg-transparent print:border print:border-gray-300">
                  <h3 className="text-brand-300 print:text-black font-bold uppercase text-xs mb-4 border-b border-white/10 pb-2 print:border-gray-300">Case Info</h3>
                  <Field label="Category" value={targetCase?.category} onChange={(v) => setEditedCase({...targetCase, category: v})} />
                  <Field label="Port of Loading" value={targetCase?.pol} onChange={(v) => setEditedCase({...targetCase, pol: v})} />
                  <Field label="Port of Destination" value={targetCase?.pod} onChange={(v) => setEditedCase({...targetCase, pod: v})} />
               </div>

               {/* Shipping Details */}
               <div className="bg-white/5 rounded-xl p-5 border border-white/5 print:bg-transparent print:border print:border-gray-300">
                  <h3 className="text-brand-300 print:text-black font-bold uppercase text-xs mb-4 border-b border-white/10 pb-2 print:border-gray-300">Shipping Details</h3>
                   <Field 
                     label="BL Number" 
                     value={targetCase?.extractedData?.blNumber} 
                     onChange={(v) => setEditedCase({...targetCase, extractedData: {...targetCase.extractedData, blNumber: v}})} 
                  />
                   <Field 
                     label="Vessel Name" 
                     value={targetCase?.extractedData?.vesselName} 
                     onChange={(v) => setEditedCase({...targetCase, extractedData: {...targetCase.extractedData, vesselName: v}})} 
                  />
                   <Field 
                     label="Arrival Date" 
                     value={targetCase?.extractedData?.arrivalDate} 
                     onChange={(v) => setEditedCase({...targetCase, extractedData: {...targetCase.extractedData, arrivalDate: v}})} 
                  />
               </div>

               {/* Cargo Specs */}
               <div className="bg-white/5 rounded-xl p-5 border border-white/5 print:bg-transparent print:border print:border-gray-300">
                  <h3 className="text-brand-300 print:text-black font-bold uppercase text-xs mb-4 border-b border-white/10 pb-2 print:border-gray-300">Cargo Specs</h3>
                  <Field 
                     label="Shipper" 
                     value={targetCase?.extractedData?.shipperName} 
                     onChange={(v) => setEditedCase({...targetCase, extractedData: {...targetCase.extractedData, shipperName: v}})} 
                  />
                  <Field 
                     label="Consignee" 
                     value={targetCase?.extractedData?.consigneeName} 
                     onChange={(v) => setEditedCase({...targetCase, extractedData: {...targetCase.extractedData, consigneeName: v}})} 
                  />
                  <Field 
                     label="Total Weight" 
                     value={targetCase?.extractedData?.totalWeight ? `${targetCase?.extractedData?.totalWeight} Kg` : ''} 
                     onChange={(v) => setEditedCase({...targetCase, extractedData: {...targetCase.extractedData, totalWeight: parseFloat(v) || 0}})} 
                  />
               </div>
            </div>

            {/* Containers List */}
            <div className={`p-6 border-t border-white/10 print:border-gray-300 ${printOptions.onlyInvoice ? 'print:hidden' : ''}`}>
                <div className="flex justify-between items-center mb-4">
                   <h3 className="text-white print:text-black font-bold text-lg">Containers</h3>
                   {isEditingCase && (
                       <button className="text-xs bg-brand-600 text-white px-2 py-1 rounded">Add Container</button>
                   )}
                </div>
                {/* Mobile View (Cards) - Optimized for vertical thumb scrolling */}
                <div className="block sm:hidden divide-y divide-white/10 touch-pan-y">
                    {targetCase?.containers?.length > 0 ? (
                        targetCase.containers.map((c: any, idx: number) => (
                            <div key={idx} className="py-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="font-mono font-bold text-white text-sm">
                                        {isEditingCase ? (
                                            <input 
                                                className="bg-transparent border-b border-brand-400 w-36 text-white font-mono" 
                                                value={c.number} 
                                                onChange={(e) => {
                                                    const newContainers = [...targetCase.containers];
                                                    newContainers[idx].number = e.target.value;
                                                    setEditedCase({...targetCase, containers: newContainers});
                                                }} 
                                            />
                                        ) : c.number}
                                    </span>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-brand-500/20 text-brand-300 border border-brand-500/30">
                                        {c.status || 'Active'}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs text-gray-300 bg-white/5 p-2 rounded-lg">
                                    <div>
                                        <span className="text-[10px] text-gray-500 uppercase block">Size</span>
                                        <span className="font-medium text-white">{c.size || '20ft'}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-gray-500 uppercase block">Weight</span>
                                        <span className="font-medium text-white">{c.weight ? `${c.weight} Kg` : '-'}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-4 text-center text-gray-400 italic text-xs">No containers assigned.</div>
                    )}
                </div>

                {/* Desktop View (Table) */}
                <div className="hidden sm:block overflow-x-auto touch-pan-y custom-scrollbar">
                    <table className="w-full text-left text-sm text-gray-200 print:text-black">
                        <thead className="bg-white/5 uppercase text-xs font-semibold text-gray-300 print:text-black border-b border-white/5 print:border-gray-300 print:bg-gray-100">
                            <tr>
                                <th className="p-3">Container No</th>
                                <th className="p-3">Size</th>
                                <th className="p-3">Weight (Kg)</th>
                                <th className="p-3">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 print:divide-gray-300">
                            {targetCase?.containers?.length > 0 ? (
                                targetCase.containers.map((c: any, idx: number) => (
                                    <tr key={idx}>
                                        <td className="p-3 font-mono font-medium text-white print:text-black">
                                            {isEditingCase ? (
                                                <input className="bg-transparent border-b border-white/20 w-32 text-white" value={c.number} onChange={(e) => {
                                                    const newContainers = [...targetCase.containers];
                                                    newContainers[idx].number = e.target.value;
                                                    setEditedCase({...targetCase, containers: newContainers});
                                                }} />
                                            ) : c.number}
                                        </td>
                                        <td className="p-3 text-white print:text-black">{c.size}</td>
                                        <td className="p-3 text-white print:text-black">{c.weight}</td>
                                        <td className="p-3 text-white print:text-black">{c.status}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="p-4 text-center text-gray-400 italic">No containers assigned.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Billing Details (On-Screen Interactive Card) */}
            <div className="p-6 border-t border-white/10 no-print space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-white font-bold text-lg flex items-center gap-2">
                    <FileText className="text-amber-400" size={20} />
                    <span>Billing Details</span>
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  {(effectiveRole === UserRole.ADMIN || effectiveRole === UserRole.FINANCE_MANAGER) ? (
                    <button
                      type="button"
                      onClick={() => {
                        setNewChargeDesc('');
                        setNewChargeAmount('');
                        setShowAddChargeModal(true);
                      }}
                      className="bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/30 text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-medium transition-all hover:scale-105"
                      title="Add additional charge or fee"
                    >
                      <Plus size={14} />
                      <span>Add Charge</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-xs">
                      <ShieldCheck size={14} className="text-amber-400" />
                      <span>Finance Manager / Admin Managed</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Charges Breakdown Table */}
              <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-900/60">
                <table className="w-full text-left text-sm text-gray-200">
                  <thead className="bg-white/5 uppercase text-xs font-semibold text-gray-300 border-b border-white/10">
                    <tr>
                      <th className="p-3 w-10 text-center">#</th>
                      <th className="p-3">Service Description</th>
                      <th className="p-3 text-right">Amount (PKR)</th>
                      <th className="p-3 text-center">Payment Receipt</th>
                      <th className="p-3 text-center w-14">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {(!targetCase.charges || targetCase.charges.length === 0) ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-gray-400 text-xs italic">
                          No charges added yet. Click "+ Add Charge" above to add TP charges, transport, or customs fees.
                        </td>
                      </tr>
                    ) : (
                      targetCase.charges.map((charge: any, idx: number) => (
                      <tr key={idx} className="hover:bg-white/5 transition-colors group">
                        <td className="p-3 text-gray-400 text-xs text-center">{idx + 1}</td>
                        <td className="p-3 text-white font-medium text-xs sm:text-sm">
                          {charge.description}
                        </td>
                        <td className="p-3 text-right font-mono font-semibold text-emerald-400 text-xs sm:text-sm">
                          PKR {Number(charge.amount || 0).toLocaleString()}
                        </td>
                        <td className="p-3 text-center">
                          {charge.receiptUrl ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setLightboxImage(charge.receiptUrl)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-medium flex items-center gap-1 transition-colors"
                                title="View Receipt"
                              >
                                <Eye size={12} />
                                <span>View Receipt</span>
                              </button>
                              <a
                                href={charge.receiptUrl}
                                download={charge.receiptName || `Receipt_${(charge.description || 'charge').replace(/\s+/g, '_')}.png`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg bg-brand-500/15 hover:bg-brand-500/25 text-brand-300 border border-brand-500/30 transition-colors"
                                title="Download Receipt"
                              >
                                <Download size={13} />
                              </a>
                            </div>
                          ) : (
                            <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-dashed border-white/20 hover:border-brand-400 text-gray-400 hover:text-white text-xs transition-colors">
                              <Upload size={12} />
                              <span>+ Attach Receipt</span>
                              <input
                                type="file"
                                accept="image/*,.pdf"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  try {
                                    const proc = await compressAndPrepareFile(file);
                                    const dataUrl = proc?.dataUrl || proc?.base64 || '';
                                    const currentCharges = targetCase.charges ? [...targetCase.charges] : [];
                                    currentCharges[idx] = {
                                      ...currentCharges[idx],
                                      receiptUrl: dataUrl,
                                      receiptName: file.name
                                    };
                                    const updatedCase = { ...targetCase, charges: currentCharges };
                                    setCases(prev => prev.map(c => c.id === updatedCase.id ? updatedCase : c));
                                    setSelectedCase(updatedCase);
                                    if (isEditingCase) setEditedCase(updatedCase);
                                    updateCaseInFirestore(updatedCase).catch(e => console.warn("Attach receipt err:", e));
                                  } catch (err) {
                                    console.error("Failed to attach receipt:", err);
                                  }
                                }}
                              />
                            </label>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {(effectiveRole === UserRole.ADMIN || effectiveRole === UserRole.FINANCE_MANAGER) ? (
                            <button
                              type="button"
                              onClick={() => {
                                const currentCharges = targetCase.charges ? [...targetCase.charges] : [];
                                const updatedCharges = currentCharges.filter((_, i) => i !== idx);
                                const updatedCase = { ...targetCase, charges: updatedCharges };
                                setCases(prev => prev.map(c => c.id === updatedCase.id ? updatedCase : c));
                                setSelectedCase(updatedCase);
                                if (isEditingCase) setEditedCase(updatedCase);
                                updateCaseInFirestore(updatedCase).catch(e => console.warn("Firestore charge delete err:", e));
                              }}
                              className="text-gray-500 hover:text-red-400 p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                              title="Remove Charge"
                            >
                              <Trash2 size={13} />
                            </button>
                          ) : (
                            <span className="text-gray-600 text-[10px]">—</span>
                          )}
                        </td>
                      </tr>
                    )))}
                    <tr className="bg-white/5 font-bold border-t-2 border-white/10">
                      <td colSpan={2} className="p-3 text-gray-300 uppercase text-xs">Total Amount Due:</td>
                      <td className="p-3 text-right text-amber-400 font-mono text-base">
                        PKR {(targetCase.charges || []).reduce((sum: number, c: any) => sum + (Number(c.amount) || 0), 0).toLocaleString()}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Attached Documents Section (Print Only or Always Visible but optimized for print) */}
            {targetCase?.documents && targetCase.documents.length > 0 && (
                <div className={`p-6 border-t border-white/10 print:border-gray-300 break-before-page ${(!printOptions.withAttachments || printOptions.onlyInvoice) ? 'print:hidden' : ''}`}>
                    <h3 className="text-white print:text-black font-bold text-lg mb-6">Attached Documents</h3>
                    <div className="space-y-8">
                        {targetCase.documents.map((doc: any, idx: number) => (
                            <div key={idx} className="bg-white p-4 rounded-lg print:p-0 print:border-none">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-black font-bold text-sm">{doc?.name || `Document ${idx + 1}`}</p>
                                  {isEditingCase && (
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        if (window.confirm("Are you sure you want to remove this document?")) {
                                          const updatedDocs = targetCase.documents.filter((_: any, dIdx: number) => dIdx !== idx);
                                          setEditedCase({ ...targetCase, documents: updatedDocs });
                                        }
                                      }}
                                      className="text-red-600 hover:text-red-700 text-xs font-semibold flex items-center gap-1 bg-red-50 hover:bg-red-100 px-2 py-1 rounded transition"
                                    >
                                      <Trash2 size={13} /> Remove
                                    </button>
                                  )}
                                </div>
                                <div className="border border-gray-200 rounded overflow-hidden cursor-pointer" onClick={() => setLightboxImage(getDocSource(doc))}>
                                     <img 
                                        src={getDocSource(doc)} 
                                        alt={doc?.name || `Document ${idx + 1}`} 
                                        className="w-full h-auto object-contain max-h-[800px] mx-auto print:max-h-[235mm] print:w-auto hover:scale-[1.01] transition-transform document-scan"
                                     />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Invoice Section */}
            {(printOptions.withInvoice || printOptions.onlyInvoice) && targetCase?.charges && targetCase.charges.length > 0 && (
                <div className="p-6 border-t border-white/10 print:border-gray-300 break-before-page hidden print:block">
                    <div className="flex justify-between items-center border-b-2 border-black pb-4 mb-6">
                      <div className="flex items-center gap-4">
                        <Logo className="h-14 sm:h-16 w-auto max-w-[210px] object-contain shrink-0" customSrc={activeLogo} />
                        <div className="flex flex-col justify-center">
                          <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-wider text-black leading-tight">{companyName}</h2>
                          <p className="text-xs text-gray-700 font-medium">{subtitle || "Customs Clearance, Bonded Carrier & Freight Terminal Services"}</p>
                          <p className="text-[11px] text-gray-600 mt-0.5">{branding.address} • Tel: {branding.phone} • Cell: {branding.cell} • Email: {branding.email}</p>
                          <p className="text-xs font-bold text-black mt-1 uppercase tracking-wide">INVOICE</p>
                        </div>
                      </div>
                      <div className="text-right text-xs text-gray-700 shrink-0">
                        <p className="font-mono font-bold text-sm text-black">{targetCase.caseNo}</p>
                        <p>Date: {targetCase.createdAt || new Date().toLocaleDateString()}</p>
                        <p>Client: <span className="font-semibold text-black">{targetCase.clientName}</span></p>
                      </div>
                    </div>

                    <table className="w-full text-left text-sm text-gray-200 print:text-black mb-6 border border-gray-200">
                        <thead className="bg-white/5 print:bg-gray-100 uppercase text-xs font-semibold print:text-black border-b border-gray-200">
                            <tr>
                                <th className="p-4 border-r border-gray-200">Description</th>
                                <th className="p-4 text-right">Amount (PKR)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {targetCase.charges.map((charge: any, idx: number) => (
                                <tr key={idx}>
                                    <td className="p-4 border-r border-gray-200">{charge.description}</td>
                                    <td className="p-4 text-right font-medium font-mono">{charge.amount.toLocaleString()}</td>
                                </tr>
                            ))}
                            <tr className="bg-white/5 print:bg-gray-50 border-t-2 border-gray-300">
                                <td className="p-4 border-r border-gray-200 font-bold text-right uppercase">Total Amount Due:</td>
                                <td className="p-4 text-right font-bold text-brand-500 font-mono text-lg">
                                    PKR {targetCase.charges.reduce((sum: number, c: any) => sum + c.amount, 0).toLocaleString()}
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Authorized Stamp Block */}
                    <div className="flex justify-end items-center pt-4 border-t border-gray-300 print-avoid-break">
                        <div className="border-t border-dashed border-black pt-1 w-48 text-center mt-4">
                            <p className="font-semibold text-black text-[11px]">Authorized Signatory</p>
                            <p className="text-[10px] text-gray-600">Finance & Terminal Billing</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Print Footer */}
            <div className="hidden print:block p-6 mt-8 border-t border-gray-300">
                <div className="flex justify-between text-xs text-gray-500">
                    <p>Generated by {companyName} • Secure Customs & Terminal System</p>
                    <p>Printed: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
                </div>
            </div>
         </div>
  
         {/* If Case is Fully Completed, show the Completed Case Dossier View */}
         {targetCase?.status === CaseStatus.COMPLETED ? (
           <CompletedCaseDossier
             targetCase={targetCase}
             customLogo={activeLogo}
             userRole={mockUserRole}
             onUpdateCase={(updated) => {
               setCases(prev => prev.map(c => c.id === updated.id ? updated : c));
               setSelectedCase(updated);
               updateCaseInFirestore(updated).catch(e => console.warn("Firestore error:", e));
             }}
             onOpenDownloadAllModal={() => setShowDownloadDocsModal(true)}
           />
         ) : (
           /* Workflow Visualization (Hidden on Print) - Dynamic Workflow Process */
           <div className="glass-card p-6 rounded-2xl no-print">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Layers className="text-brand-400" size={20} />
                      <span>{getCategoryWorkflow(targetCase?.category).category} Workflow ({getCategoryWorkflow(targetCase?.category).totalSteps} Steps)</span>
                    </h3>
                    {targetCase?.subCategory && targetCase.subCategory !== 'Standard Container / General Cargo' && (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {targetCase.subCategory}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Tap any of the {getCategoryWorkflow(targetCase?.category).totalSteps} workflow steps to view details, update mandatory compliance fields, or advance the case.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-brand-300 bg-brand-500/10 border border-brand-500/20 px-2.5 py-1 rounded-full shrink-0">
                    {targetCase?.status === CaseStatus.COMPLETED ? (
                      <span className="text-emerald-300 font-bold">✓ Workflow Completed</span>
                    ) : (
                      `Step ${Math.min(getCategoryWorkflow(targetCase?.category).totalSteps, getWorkflowStepIndex(targetCase?.category, targetCase?.status as string) + 1)} of ${getCategoryWorkflow(targetCase?.category).totalSteps} Active`
                    )}
                  </span>
                </div>
              </div>

              {/* If Case has an Active Incident Stoppage */}
              {(targetCase?.isIncidentVault || targetCase?.status === CaseStatus.INCIDENT_STOPPAGE) && (
                <div className="mb-6 p-4 rounded-xl bg-rose-500/15 border border-rose-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-pulse">
                  <div className="flex items-center gap-3">
                    <AlertTriangle size={24} className="text-rose-400 shrink-0" />
                    <div>
                      <h4 className="font-bold text-rose-300 text-sm">Case Stoppage / Incident Active</h4>
                      <p className="text-xs text-gray-300 mt-0.5">
                        Reason: {targetCase?.incidentDetails?.reason || 'Route Stoppage'} | Location: {targetCase?.incidentDetails?.location || 'Unknown'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleResolveIncident(targetCase)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 shrink-0"
                  >
                    Resolve & Resume Workflow
                  </button>
                </div>
              )}

              <div className="relative">
                 <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-white/10"></div>
                 {(() => {
                   const categoryWorkflow = getCategoryWorkflow(targetCase?.category);
                   const activeIndex = getWorkflowStepIndex(targetCase?.category, targetCase?.status as string);
                   const isCaseCompleted = targetCase?.status === CaseStatus.COMPLETED;

                   return categoryWorkflow.steps.map((stepConfig, index) => {
                     const isCompleted = isCaseCompleted || index < activeIndex;
                     const isCurrent = !isCaseCompleted && index === activeIndex;
                     const isPending = !isCaseCompleted && index > activeIndex;
                     const stepDetail = targetCase?.workflowDetails?.[stepConfig.id];

                     return (
                       <div 
                         key={stepConfig.id} 
                         onClick={() => handleOpenStepModal(stepConfig.id as any, index, targetCase)}
                         className="relative flex gap-4 sm:gap-6 mb-6 last:mb-0 cursor-pointer group"
                         title="Tap to update or view step details"
                       >
                          <div className={`w-12 h-12 rounded-full border-4 shrink-0 flex items-center justify-center z-10 font-bold text-sm transition-all group-hover:scale-110 shadow-md ${
                             isCompleted ? 'bg-emerald-600 border-emerald-950 text-white shadow-emerald-600/30' : 
                             isCurrent ? 'bg-amber-500 border-amber-950 text-white animate-pulse shadow-amber-500/40 ring-4 ring-amber-500/20' : 
                             'bg-slate-900 border-white/10 text-gray-500'
                          }`}>
                             {isCompleted ? <CheckCircle2 size={20} /> : index + 1}
                          </div>
                          <div className={`flex-1 p-4 rounded-xl border transition-all group-hover:border-brand-500/60 group-hover:bg-white/[0.07] ${
                             isCurrent ? 'bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/5' : 
                             isCompleted ? 'bg-emerald-500/5 border-emerald-500/20' : 
                             'bg-white/[0.02] border-white/5'
                          }`}>
                             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                               <div className="flex items-center gap-2.5">
                                 <h4 className={`font-semibold text-sm sm:text-base ${isCompleted ? 'text-white' : isCurrent ? 'text-amber-300 font-bold' : 'text-gray-400'}`}>
                                   Step {index + 1}: {stepConfig.title}
                                 </h4>
                                 {isCompleted && (
                                   <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                     <CheckCircle2 size={10} /> Completed
                                   </span>
                                 )}
                                 {isCurrent && (
                                   <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                                     <Clock size={10} className="animate-spin" /> In Progress
                                   </span>
                                 )}
                                 {isPending && (
                                   <span className="text-[10px] bg-white/5 text-gray-400 border border-white/10 px-2 py-0.5 rounded-full">
                                     Pending
                                   </span>
                                 )}
                               </div>
                               <span className="text-xs text-brand-400 group-hover:text-brand-300 font-medium flex items-center gap-1 shrink-0">
                                 <span>Update / Details</span>
                                 <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                               </span>
                             </div>

                             {/* Render step details if recorded */}
                             {stepDetail && (stepDetail.remarks || stepDetail.referenceNo || stepDetail.officer || stepDetail.date) && (
                               <div className="mt-2.5 pt-2.5 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-300">
                                 {stepDetail.date && (
                                   <div>
                                     <span className="text-gray-400">Date: </span>
                                     <span className="font-mono text-white">{stepDetail.date}</span>
                                   </div>
                                 )}
                                 {stepDetail.officer && (
                                   <div>
                                     <span className="text-gray-400">Officer: </span>
                                     <span className="text-white">{stepDetail.officer}</span>
                                   </div>
                                 )}
                                 {stepDetail.referenceNo && (
                                   <div>
                                     <span className="text-gray-400">Ref/Challan: </span>
                                     <span className="font-mono text-amber-300">{stepDetail.referenceNo}</span>
                                   </div>
                                 )}
                                 {stepDetail.remarks && (
                                   <div className="sm:col-span-3 text-gray-300 text-xs italic bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5 mt-1">
                                     "{stepDetail.remarks}"
                                   </div>
                                 )}
                               </div>
                             )}
                          </div>
                       </div>
                     );
                   });
                 })()}
              </div>
           </div>
         )}

         {/* Bottom Action Section: Download Documents */}
         <div className="glass-card p-6 rounded-2xl no-print border border-brand-500/30 bg-gradient-to-r from-slate-900 via-brand-950/40 to-slate-900 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
           <div>
             <h4 className="text-white font-bold text-lg flex items-center gap-2">
               <Download className="text-brand-400" size={22} />
               <span>Download Documents</span>
             </h4>
             <p className="text-xs sm:text-sm text-gray-300 mt-1">
               Download single-page Case Details, itemized Billing Invoice, Attached Shipping Documents, or Complete Dossier.
             </p>
           </div>
           <button
             type="button"
             onClick={() => setShowDownloadDocsModal(true)}
             className="bg-brand-600 hover:bg-brand-500 active:scale-95 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-brand-600/30 flex items-center gap-2.5 text-sm transition-all shrink-0 hover:scale-105"
             id="btn-bottom-download-docs"
           >
             <Download size={18} />
             <span>Download Documents</span>
           </button>
         </div>
      </div>
    );
  };

  // --- Registration Wizard Steps ---
  
  // --- Registration Step 1: Merged Case Particulars & Documents (Single-Screen) ---
  const renderStep1_Merged = () => {
    return (
      <div className="space-y-6 animate-in fade-in max-w-3xl mx-auto pb-4">
        {/* Registration Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-brand-950/70 to-slate-900 border border-white/10 shadow-lg">
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border flex items-center gap-1.5 ${
                generatedCaseNo 
                  ? 'bg-brand-500/20 text-brand-300 border-brand-500/30' 
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              }`}>
                {generatedCaseNo ? (
                  <span>{generatedCaseNo}</span>
                ) : (
                  <>
                    <Clock size={12} className="animate-pulse" />
                    <span>Serial: Assigned on Progression</span>
                  </>
                )}
              </span>
              <span className="text-xs text-gray-400">Step 1 of 4</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white mt-1">
              Case Registration & Documents
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Client, category, route, and shipping documents on a single streamlined page
            </p>
          </div>
          {uploadedDocs.length > 0 && (
            <div className="self-start sm:self-auto flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
              <CheckCircle2 size={15} />
              <span>{uploadedDocs.length} {uploadedDocs.length === 1 ? 'Document Attached' : 'Documents Attached'}</span>
            </div>
          )}
        </div>

        {/* 1. Client Selection (Sabse Upar) */}
        <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm font-semibold text-white">
              <User size={16} className="text-brand-400" />
              <span>Client / Importer / Shipper</span>
              <span className="text-red-400">*</span>
            </label>
            {isClientUser && (
              <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 size={12} /> Auto-Selected
              </span>
            )}
          </div>

          {isClientUser ? (
            /* Client is registering: Client account is pre-selected */
            <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl bg-slate-900/90 border border-brand-500/40 shadow-sm">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-brand-600/20 text-brand-400 border border-brand-500/30 flex items-center justify-center flex-shrink-0">
                  <User size={20} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] sm:text-[11px] text-brand-300 uppercase tracking-wider block font-semibold">
                    Client Company Name
                  </span>
                  <span className="text-base sm:text-lg font-bold text-white truncate block">
                    {formData.client || effectiveClientName}
                  </span>
                </div>
              </div>
              <span className="text-xs text-gray-400 font-mono hidden sm:block">
                Client Portal
              </span>
            </div>
          ) : (
            /* Case Manager / Admin is registering: Select from dropdown or add new */
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <select 
                    className="w-full glass-input rounded-xl p-3.5 sm:p-4 outline-none appearance-none cursor-pointer text-sm sm:text-base text-white bg-black/60 border border-white/15 focus:border-brand-400 pr-10"
                    value={formData.client}
                    onChange={(e) => {
                      if (e.target.value === '__ADD_NEW_CLIENT__') {
                        setShowAddClientModal(true);
                      } else {
                        handleClientSelect(e.target.value);
                      }
                    }}
                  >
                    <option value="" className="bg-slate-900 text-gray-400">-- Select Client Company --</option>
                    {registeredClients.map(c => (
                      <option key={c} value={c} className="bg-slate-900 text-white">{c}</option>
                    ))}
                    <option value="__ADD_NEW_CLIENT__" className="bg-slate-900 text-amber-300 font-semibold">
                      ➕ Add New Client & Set Default Charges
                    </option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddClientModal(true)}
                  className="bg-brand-600 hover:bg-brand-500 text-white px-3.5 sm:px-4 py-3.5 sm:py-4 rounded-xl flex items-center gap-1.5 text-xs sm:text-sm font-semibold transition-all shadow-md shadow-brand-600/20 shrink-0"
                  title="Add New Client & Set Default Tariff / Charges"
                >
                  <Plus size={16} />
                  <span>Add Client & Tariff</span>
                </button>
              </div>

              {/* Status Badge when client default charges are loaded */}
              {formData.client && formData.charges && formData.charges.length > 0 && (
                <div className="flex items-center justify-between p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300">
                  <div className="flex items-center gap-2 truncate pr-2">
                    <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                    <span className="truncate">
                      <strong>{formData.charges.length}</strong> default charges applied for <strong>{formData.client}</strong> (Total: PKR {formData.charges.reduce((s, c) => s + (Number(c.amount) || 0), 0).toLocaleString()})
                    </span>
                  </div>
                  <span className="text-[11px] text-emerald-400/80 font-mono shrink-0 hidden sm:inline">
                    Editable in Step 3 / Invoice
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. Case Category (Client ke niche) */}
        <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm font-semibold text-white">
              <Briefcase size={16} className="text-brand-400" />
              <span>Case Category</span>
              <span className="text-red-400">*</span>
            </label>
            {formData.client && getClientDefaultCategory(formData.client) && formData.category === getClientDefaultCategory(formData.client) && (
              <span className="text-[11px] text-brand-300 bg-brand-500/10 border border-brand-500/25 px-2.5 py-0.5 rounded-full flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} /> Client Default Category
              </span>
            )}
          </div>

          <div className="relative">
            <select
              className="w-full glass-input rounded-xl p-3.5 sm:p-4 outline-none appearance-none cursor-pointer text-sm sm:text-base text-white bg-black/60 border border-white/15 focus:border-brand-400 pr-10"
              value={formData.category}
              onChange={(e) => {
                const newCat = e.target.value;
                const foundClient = clientsData.find(c => c.name?.toLowerCase() === formData.client?.toLowerCase());
                const resolved = resolveCaseCharges(foundClient, newCat);
                setFormData({ 
                  ...formData, 
                  category: newCat,
                  subCategory: supportsSubCategories(newCat) ? (formData.subCategory || 'Standard Container / General Cargo') : undefined,
                  serviceArrangements: resolved.arrangements as any,
                  charges: resolved.charges
                });
                if (resolved.isClientCustomDefault) {
                  setDraftToast(`✓ Applied ${resolved.charges.length} client default charges for ${formData.client}`);
                } else {
                  setDraftToast(`✓ Switched to ${newCat} default operational services`);
                }
              }}
            >
              <option value="" className="bg-slate-900 text-gray-400">-- Select Primary Category --</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat} className="bg-slate-900 text-white">
                  {cat}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
          </div>

          {/* Dynamic Cargo / Equipment Sub-Category Dropdown */}
          {supportsSubCategories(formData.category) && (
            <div className="space-y-1.5 pt-2 animate-fade-in">
              <label className="flex items-center justify-between text-xs font-semibold text-amber-300">
                <span className="flex items-center gap-1.5">
                  <Truck size={14} /> Cargo / Equipment Sub-Category
                </span>
                <span className="text-[10px] text-gray-400">Specialized Transport Equipment</span>
              </label>
              <div className="relative">
                <select
                  className="w-full glass-input rounded-xl p-3 sm:p-3.5 outline-none appearance-none cursor-pointer text-xs sm:text-sm text-amber-200 bg-amber-950/20 border border-amber-500/30 focus:border-amber-400 pr-10"
                  value={formData.subCategory || 'Standard Container / General Cargo'}
                  onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
                >
                  {SUB_CATEGORY_OPTIONS.map(sub => (
                    <option key={sub} value={sub} className="bg-slate-900 text-white">
                      {sub}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 text-amber-400 pointer-events-none" size={18} />
              </div>
            </div>
          )}
        </div>

        {/* 3. Port of Loading & Port of Destination (Searchable Suggestions & Instant Add Port) */}
        {(() => {
          const isPrivateCargo = formData.category === 'Transportation of Private Cargo' || formData.category?.toLowerCase().includes('private');
          return (
            <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-white/10 space-y-3 relative z-30">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-semibold text-white">
                  {isPrivateCargo ? (
                    <>
                      <Truck size={16} className="text-amber-400" />
                      <span>Transport Route & Locations (Pick up / Drop off)</span>
                    </>
                  ) : (
                    <>
                      <Ship size={16} className="text-brand-400" />
                      <span>Route Selection (Ports & Terminals)</span>
                    </>
                  )}
                </label>
                <button
                  type="button"
                  onClick={() => handleOpenAddPort(null)}
                  className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 font-medium bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/25 px-2.5 py-1 rounded-lg transition-colors shadow-sm"
                  title="Add new port or terminal to all lists"
                >
                  <Plus size={13} /> {isPrivateCargo ? 'Add Location' : 'Add Port'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* POL with Autocomplete Search & Add Port */}
                <PortSearchableInput
                  label={isPrivateCargo ? "Pick up Destination (Loading Point / Origin)" : "Port of Loading (POL)"}
                  icon={isPrivateCargo ? <MapPin size={14} className="text-amber-400" /> : <Anchor size={14} className="text-brand-400" />}
                  value={formData.pol}
                  onChange={(val) => {
                    setFormData(prev => ({ 
                      ...prev, 
                      pol: val,
                      extractedData: { ...prev.extractedData, pickupDestination: val }
                    }));
                  }}
                  ports={ports}
                  targetField="pol"
                  placeholder={isPrivateCargo ? "Type pick up location (e.g. Karachi Factory, Hub, Multan)..." : "Type port name or code (e.g. KPT, Port Qasim)..."}
                  onOpenAddPort={handleOpenAddPort}
                />

                {/* POD with Autocomplete Search & Add Port */}
                <PortSearchableInput
                  label={isPrivateCargo ? "Drop off Destination (Unloading Point / Delivery)" : "Port of Destination (POD)"}
                  icon={<MapPin size={14} className={isPrivateCargo ? "text-emerald-400" : "text-brand-400"} />}
                  value={formData.pod}
                  onChange={(val) => {
                    setFormData(prev => ({ 
                      ...prev, 
                      pod: val,
                      extractedData: { ...prev.extractedData, dropoffDestination: val }
                    }));
                  }}
                  ports={ports}
                  targetField="pod"
                  placeholder={isPrivateCargo ? "Type drop off location (e.g. Faisalabad, Lahore, Rawalpindi)..." : "Type port name or code (e.g. Lahore, Sialkot, Torkham)..."}
                  onOpenAddPort={handleOpenAddPort}
                />
              </div>
            </div>
          );
        })()}

        {/* 4. Document Upload & Camera (Single unified upload button + Camera button) */}
        <div ref={documentsSectionRef} className="glass-panel p-4 sm:p-5 rounded-2xl border border-white/10 space-y-3 relative z-10">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm font-semibold text-white">
              <FileText size={16} className="text-brand-400" />
              <span>Shipping Documents</span>
            </label>
            {uploadedDocs.length > 0 && (
              <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                <CheckCircle2 size={12} /> {uploadedDocs.length} {uploadedDocs.length === 1 ? 'file' : 'files'} attached
              </span>
            )}
          </div>

          {/* Attaching progress indicator */}
          {isAttachingFiles && (
            <div className="flex items-center justify-center gap-2 py-2 px-3 bg-brand-500/10 border border-brand-500/30 rounded-xl text-brand-300 text-xs animate-pulse">
              <Loader2 size={15} className="animate-spin text-brand-400" />
              <span>Attaching & verifying document...</span>
            </div>
          )}

          {/* Standard accessible file and camera inputs (sr-only avoids Chromium layout drop/compositor flash) */}
          <input 
            ref={multiFileInputRef}
            type="file"
            accept=".pdf,image/*,application/pdf"
            multiple
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={handleFileUpload}
          />
          <input 
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={handleCameraFileUpload}
          />

          {/* Dropzone container */}
          <div 
            data-dropzone="true"
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
                await processFiles(Array.from(e.dataTransfer.files));
              }
            }}
            className="border-2 border-dashed border-white/20 hover:border-brand-400/60 rounded-2xl p-5 sm:p-6 bg-slate-950/60 hover:bg-slate-950/80 transition-all text-center space-y-4"
          >
            {/* The Two Main Action Buttons: Upload Documents + Camera */}
            <div className="flex flex-col sm:flex-row items-stretch justify-center gap-3 sm:gap-4 max-w-md mx-auto">
              {/* 1. Single Multi-Document Upload Button */}
              <button
                type="button"
                onClick={() => multiFileInputRef.current?.click()}
                className="flex-1 py-3.5 px-4 bg-gradient-to-r from-blue-600 to-brand-600 hover:from-blue-500 hover:to-brand-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2.5 shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                title="Select multiple documents or single multi-page PDF"
              >
                <UploadCloud size={20} className="text-cyan-200" />
                <div className="text-left">
                  <div className="text-sm font-bold leading-tight">Upload Documents</div>
                  <div className="text-[10px] text-cyan-100/80 font-normal leading-tight">Multi-file or Single PDF</div>
                </div>
              </button>

              {/* 2. Camera Button */}
              <button
                type="button"
                onClick={() => {
                  startCamera();
                }}
                className="py-3.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2.5 shadow-lg shadow-purple-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                title="Capture document photo via camera"
              >
                <Camera size={20} className="text-purple-200" />
                <div className="text-left">
                  <div className="text-sm font-bold leading-tight">Camera</div>
                  <div className="text-[10px] text-purple-100/80 font-normal leading-tight">Take document photo</div>
                </div>
              </button>
            </div>

            <p className="text-xs text-gray-400">
              Drag & drop shipping documents (B/L, Invoice, Packing List) here
            </p>

            {/* Uploaded Documents List */}
            {uploadedDocs.length > 0 && (
              <div className="pt-3 border-t border-white/10 text-left space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-300">
                    Selected Documents ({uploadedDocs.length})
                  </span>
                  {uploadedDocs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedDocs([]);
                        setFiles([]);
                        safeAppStorage.removeItem('dpl_reg_docs');
                      }}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {uploadedDocs.map((doc, idx) => {
                    const isImage = (doc.type && doc.type.startsWith('image/')) || /\.(jpg|jpeg|png|webp|gif)$/i.test(doc.name);
                    const fileSizeFormatted = doc.size > 1024 * 1024 
                      ? `${(doc.size / (1024 * 1024)).toFixed(1)} MB`
                      : `${Math.max(1, Math.round(doc.size / 1024))} KB`;

                    return (
                      <div 
                        key={doc.id || `${doc.name}-${idx}`}
                        className="bg-slate-900/90 border border-white/10 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-sm"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="p-1.5 rounded-lg bg-brand-600/20 text-brand-300 flex-shrink-0">
                            <FileText size={16} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-white truncate" title={doc.name}>
                              {doc.name}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              {fileSizeFormatted}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          {isImage && doc.url && (
                            <button
                              type="button"
                              onClick={() => setLightboxImage(doc.url)}
                              className="p-1 text-gray-400 hover:text-white rounded hover:bg-white/10"
                              title="Preview"
                            >
                              <Eye size={14} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setUploadedDocs(prev => {
                                const updated = prev.filter((_, i) => i !== idx);
                                safeAppStorage.setJSON('dpl_reg_docs', updated);
                                return updated;
                              });
                              setFiles(prev => prev.filter((_, i) => i !== idx));
                            }}
                            className="p-1 text-red-400 hover:text-red-300 rounded hover:bg-red-500/10"
                            title="Remove"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Direct Instant AI Scan & Extract Button */}
                <div className="pt-3 border-t border-brand-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 bg-brand-950/40 p-3 rounded-xl border border-brand-500/30">
                  <div className="text-left text-xs">
                    <div className="font-semibold text-brand-200 flex items-center gap-1.5">
                      <Sparkles size={14} className="text-brand-400 animate-pulse" />
                      <span>Optical Document Reader Ready</span>
                    </div>
                    <div className="text-[11px] text-gray-400">
                      Reads Bill of Lading, Consignee, Shipper, Shipping Agent, Containers, Packages, & Commercial Invoice.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => triggerDocumentReading()}
                    className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all hover:scale-105 active:scale-95 flex-shrink-0"
                  >
                    <Sparkles size={15} />
                    <span>Scan & Auto-Extract All Data</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };


  const renderDocumentReadingView = () => (
    <div className="w-full max-w-lg md:max-w-xl mx-auto px-2 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-6 text-center overflow-hidden">
      {/* 1. TOP: Circular Rotating / Spinning Loader */}
      <div className="relative w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 mx-auto flex items-center justify-center my-1 sm:my-2 flex-shrink-0">
        {/* Soft atmospheric glow */}
        <div className="absolute inset-0 rounded-full bg-cyan-500/15 blur-xl sm:blur-2xl animate-pulse" />
        
        {/* Outer orbital spinning ring (Clockwise) */}
        <div 
          className="absolute inset-0 rounded-full border-3 sm:border-4 border-transparent border-t-cyan-400 border-r-blue-500 animate-spin" 
          style={{ animationDuration: '1.8s' }} 
        />

        {/* Middle counter-spinning ring (Counter-Clockwise) */}
        <div 
          className="absolute inset-2 sm:inset-2.5 rounded-full border-2 sm:border-3 border-transparent border-b-cyan-300 border-l-blue-400 animate-spin" 
          style={{ animationDuration: '2.4s', animationDirection: 'reverse' }} 
        />

        {/* Third subtle dashed rotating track */}
        <div 
          className="absolute inset-4 sm:inset-5 rounded-full border border-dashed border-cyan-400/30 animate-spin" 
          style={{ animationDuration: '6s' }} 
        />

        {/* Glowing Center Optical Lens Orb */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-22 md:h-22 rounded-full bg-gradient-to-br from-slate-900 via-brand-950 to-slate-950 border border-cyan-400/50 shadow-[0_0_25px_rgba(56,189,248,0.35)] flex flex-col items-center justify-center relative overflow-hidden">
          {/* Radar sweeping scanline */}
          <div 
            className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/25 to-transparent animate-pulse"
            style={{ animationDuration: '1.2s' }}
          />
          {readingProgress >= 100 ? (
            <CheckCircle2 className="text-emerald-400" size={30} />
          ) : (
            <>
              <Scan className="text-cyan-400 animate-pulse w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
              <span className="text-[10px] sm:text-xs font-mono font-bold text-cyan-300 mt-0.5 sm:mt-1">
                {readingProgress}%
              </span>
            </>
          )}
        </div>
      </div>

      {/* 2. BELOW: Clearly Written "Reading Document..." */}
      <div className="space-y-1 sm:space-y-2 px-1">
        <h2 className="text-lg sm:text-2xl md:text-3xl font-bold text-white tracking-tight sm:tracking-wide">
          Reading Shipping Documents...
        </h2>
        <p className="text-xs sm:text-sm text-cyan-300/90 font-medium line-clamp-2 max-w-md mx-auto leading-relaxed">
          {readingPhase}
        </p>
      </div>

      {/* 3. Progress Bar & Phase Info */}
      <div className="glass-panel p-3.5 sm:p-5 rounded-2xl border border-white/10 space-y-3 text-left shadow-xl w-full overflow-hidden">
        <div className="flex justify-between items-center text-xs font-medium gap-2 min-w-0">
          <span className="text-cyan-300 flex items-center gap-1.5 min-w-0 flex-1">
            <Loader2 size={13} className="animate-spin text-cyan-400 flex-shrink-0" />
            <span className="truncate text-[11px] sm:text-xs text-cyan-200">{readingPhase}</span>
          </span>
          <span className="text-white font-mono bg-cyan-500/20 px-2 py-0.5 rounded border border-cyan-500/30 flex-shrink-0 font-bold text-[11px] sm:text-xs">
            {readingProgress}%
          </span>
        </div>

        {/* Progress Track */}
        <div className="w-full bg-white/10 rounded-full h-2 sm:h-2.5 overflow-hidden p-0.5 border border-white/10">
          <div 
            className="bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 h-full rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(56,189,248,0.5)]"
            style={{ width: `${Math.max(8, readingProgress)}%` }}
          />
        </div>

        {/* Real-time Document Reading Checklist */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2.5 border-t border-white/10 text-[11px] sm:text-xs">
          <div className={`flex items-center gap-2 min-w-0 ${readingProgress >= 25 ? 'text-emerald-400 font-medium' : 'text-gray-400'}`}>
            <CheckCircle size={14} className={`flex-shrink-0 ${readingProgress >= 25 ? 'text-emerald-400' : 'text-gray-600'}`} />
            <span className="truncate sm:whitespace-normal">Shipping Line & B/L Format Recognition</span>
          </div>
          <div className={`flex items-center gap-2 min-w-0 ${readingProgress >= 50 ? 'text-emerald-400 font-medium' : 'text-gray-400'}`}>
            <CheckCircle size={14} className={`flex-shrink-0 ${readingProgress >= 50 ? 'text-emerald-400' : 'text-gray-600'}`} />
            <span className="truncate sm:whitespace-normal">B/L No, Vessel, Voyage, POL & POD</span>
          </div>
          <div className={`flex items-center gap-2 min-w-0 ${readingProgress >= 70 ? 'text-emerald-400 font-medium' : 'text-gray-400'}`}>
            <CheckCircle size={14} className={`flex-shrink-0 ${readingProgress >= 70 ? 'text-emerald-400' : 'text-gray-600'}`} />
            <span className="truncate sm:whitespace-normal">Commercial Invoice & Incoterms</span>
          </div>
          <div className={`flex items-center gap-2 min-w-0 ${readingProgress >= 85 ? 'text-emerald-400 font-medium' : 'text-gray-400'}`}>
            <CheckCircle size={14} className={`flex-shrink-0 ${readingProgress >= 85 ? 'text-emerald-400' : 'text-gray-600'}`} />
            <span className="truncate sm:whitespace-normal">Packing List Weights, Cartons & CBM</span>
          </div>
          <div className={`flex items-center gap-2 min-w-0 sm:col-span-2 ${readingProgress >= 95 ? 'text-emerald-400 font-medium' : 'text-gray-400'}`}>
            <CheckCircle size={14} className={`flex-shrink-0 ${readingProgress >= 95 ? 'text-emerald-400' : 'text-gray-600'}`} />
            <span className="truncate sm:whitespace-normal">ISO Containers (MSKU/CMAU) & Seals</span>
          </div>
        </div>
      </div>

      {/* Uploaded Documents Being Scanned */}
      {uploadedDocs.length > 0 && (
        <div className="text-left space-y-1.5 w-full overflow-hidden px-1">
          <p className="text-[11px] sm:text-xs text-gray-400 font-medium">Scanned Documents ({uploadedDocs.length}):</p>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {uploadedDocs.map((doc, idx) => (
              <div 
                key={doc.id || idx} 
                className="bg-white/5 border border-cyan-500/20 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg flex items-center gap-2 text-[11px] sm:text-xs text-gray-300 max-w-full min-w-0"
              >
                <FileText size={13} className="text-cyan-400 flex-shrink-0" />
                <span className="truncate max-w-[140px] sm:max-w-[200px] text-white font-medium">{doc.name}</span>
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reassurance text */}
      <p className="text-[11px] sm:text-xs text-gray-400 max-w-md mx-auto leading-relaxed px-2">
        The form will open automatically once reading completes with detected fields pre-filled. Any unread information can be entered manually.
      </p>
    </div>
  );

  const renderServiceArrangementsSection = (isStep4Review: boolean = false) => {
    const arrangements = formData.serviceArrangements || INITIAL_REGISTRATION_ARRANGEMENTS;
    const dplArrangedCount = Object.values(arrangements).filter(a => a.arrangedBy === 'DPL').length;
    const clientArrangedCount = Object.values(arrangements).filter(a => a.arrangedBy === 'Client').length;

    return (
      <div className="glass-panel p-5 rounded-xl border border-white/10 bg-slate-900/60 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div>
            <h4 className="text-sm font-bold text-white uppercase flex items-center gap-2">
              <Layers size={16} className="text-amber-400" />
              <span>Operational Logistics Services & Charges (Arranged by DPL vs Client)</span>
            </h4>
            <p className="text-xs text-gray-400 mt-0.5">
              Items marked <span className="text-emerald-400 font-semibold">Arranged by DPL</span> are automatically added to the invoice charges. Items marked <span className="text-sky-400 font-semibold">Arranged by Client</span> are excluded from invoice.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
              <CheckCircle size={12} /> {dplArrangedCount} Invoiced by DPL
            </span>
            <span className="bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
              <User size={12} /> {clientArrangedCount} Client Direct
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(arrangements).map(([key, item]) => {
            const isDpl = item.arrangedBy === 'DPL';
            return (
              <div 
                key={key} 
                className={`p-3 rounded-xl border transition-all ${
                  isDpl 
                    ? 'bg-emerald-950/20 border-emerald-500/30' 
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-white block truncate">{item.label}</span>
                    <span className="text-[10px] font-mono text-gray-400 block">
                      {isDpl ? 'Added to Client Invoice' : 'Client Settles Directly (Excluded)'}
                    </span>
                  </div>

                  {/* Toggle Selector Buttons */}
                  <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleServiceArrangement(key, 'DPL')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                        isDpl 
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40' 
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                      title="Arranged by DPL: adds to client invoice"
                    >
                      <CheckCircle size={11} />
                      <span>DPL</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleServiceArrangement(key, 'Client')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                        !isDpl 
                          ? 'bg-sky-600 text-white shadow-md shadow-sky-900/40' 
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                      title="Arranged by Client: excluded from client invoice"
                    >
                      <User size={11} />
                      <span>Client</span>
                    </button>
                  </div>
                </div>

                {/* Amount Field or Client Direct Settlement Notice */}
                {isDpl ? (
                  /* Arranged by DPL: Amount is written step-by-step for invoicing */
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-emerald-500/20">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-emerald-300 font-medium flex items-center gap-1">
                        <DollarSign size={12} className="text-emerald-400" />
                        <span>DPL Charge:</span>
                      </span>
                      <div className="relative w-32">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-emerald-400/80 font-bold">PKR</span>
                        <input
                          type="number"
                          value={item.amount || ''}
                          onChange={(e) => handleUpdateArrangementAmount(key, Number(e.target.value) || 0)}
                          placeholder="Enter amount..."
                          className="w-full pl-10 pr-2 py-1 bg-black/60 border border-emerald-500/40 rounded-lg text-xs font-mono font-bold text-emerald-300 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/15 px-2.5 py-1 rounded-lg border border-emerald-500/30 whitespace-nowrap flex items-center gap-1 self-start sm:self-auto">
                      <CheckCircle size={11} className="text-emerald-400" />
                      <span>Invoiced: PKR {Number(item.amount || 0).toLocaleString()}</span>
                    </span>
                  </div>
                ) : (
                  /* Arranged by Client: Excluded from invoice - No amount input needed */
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                    <div className="flex items-center gap-1.5 text-sky-400/80">
                      <User size={12} className="text-sky-400 shrink-0" />
                      <span className="text-[11px] text-sky-300 font-medium">Client settles directly</span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-medium bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 whitespace-nowrap flex items-center gap-1">
                      <span>⊘ Excluded from Invoice</span>
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderPrivateCargoRegistrationReview = (extracted: any, autoFilledCount: number) => {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
        {/* Category Header Banner */}
        <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
              <Truck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Private Cargo Transport Registration</h3>
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full uppercase">
                  Domestic Freight
                </span>
              </div>
              <p className="text-xs text-amber-200/80">
                Default Charges: <strong className="text-emerald-400">Loading Charges & Unloading Charges (Arranged by DPL)</strong>. Vehicle Rent, Builty, Labor & Detention as required.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              <CheckCircle size={14} /> {autoFilledCount} fields extracted
            </span>
          </div>
        </div>

        {/* Bento Grid of Private Cargo Registration Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Card 1: Route & Locations */}
          <div className="glass-panel p-5 rounded-xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h4 className="text-amber-400 text-sm font-bold uppercase flex items-center gap-1.5">
                <MapPin size={15} /> Pick up & Drop off Route
              </h4>
              <span className="text-[10px] text-gray-400">Domestic Route</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-300 font-medium block mb-1">
                  Pick up Destination (Loading Point / Origin) <span className="text-red-400">*</span>
                </label>
                <input 
                  type="text"
                  className="w-full rounded-lg p-2.5 text-sm text-white border border-white/15 bg-black/40 focus:border-amber-400 outline-none"
                  value={extracted.pickupDestination || formData.pol || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateExtractedData('pickupDestination', val);
                    setFormData(prev => ({ ...prev, pol: val }));
                  }}
                  placeholder="e.g. Karachi Port Terminal / Hub Industrial Area / Factory"
                />
              </div>

              <div>
                <label className="text-xs text-gray-300 font-medium block mb-1">
                  Drop off Destination (Unloading Point / Delivery) <span className="text-red-400">*</span>
                </label>
                <input 
                  type="text"
                  className="w-full rounded-lg p-2.5 text-sm text-white border border-white/15 bg-black/40 focus:border-amber-400 outline-none"
                  value={extracted.dropoffDestination || formData.pod || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateExtractedData('dropoffDestination', val);
                    setFormData(prev => ({ ...prev, pod: val }));
                  }}
                  placeholder="e.g. Faisalabad Textile Mills / Lahore Dryport / Warehouse"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Cargo Owner Details */}
          <div className="glass-panel p-5 rounded-xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h4 className="text-amber-400 text-sm font-bold uppercase flex items-center gap-1.5">
                <User size={15} /> Cargo Owner / Consignor
              </h4>
              <span className="text-[10px] text-gray-400">Shipper / Owner</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-300 font-medium block mb-1">
                  Cargo Owner Name <span className="text-red-400">*</span>
                </label>
                <input 
                  type="text"
                  className="w-full rounded-lg p-2.5 text-sm text-white border border-white/15 bg-black/40 focus:border-amber-400 outline-none"
                  value={extracted.cargoOwner || extracted.shipperName || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateExtractedData('cargoOwner', val);
                    updateExtractedData('shipperName', val);
                  }}
                  placeholder="e.g. Haji Muhammad Textile Trading"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-300 font-medium block mb-1">Contact No</label>
                  <input 
                    type="text"
                    className="w-full rounded-lg p-2 text-sm text-white border border-white/15 bg-black/40 focus:border-amber-400 outline-none"
                    value={extracted.cargoOwnerContact || extracted.shipperContact || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateExtractedData('cargoOwnerContact', val);
                      updateExtractedData('shipperContact', val);
                    }}
                    placeholder="0300-1234567"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-300 font-medium block mb-1">CNIC / NTN</label>
                  <input 
                    type="text"
                    className="w-full rounded-lg p-2 text-sm text-white border border-white/15 bg-black/40 focus:border-amber-400 outline-none"
                    value={extracted.cargoOwnerCnic || ''}
                    onChange={(e) => updateExtractedData('cargoOwnerCnic', e.target.value)}
                    placeholder="42101-xxxxxxx-x"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Consignment Note & Waybill Details */}
          <div className="glass-panel p-5 rounded-xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h4 className="text-amber-400 text-sm font-bold uppercase flex items-center gap-1.5">
                <FileText size={15} /> Consignment Waybill Information
              </h4>
              <span className="text-[10px] text-gray-400">Waybill & Terms</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-300 font-medium block mb-1">
                  Waybill / Consignment Note Number <span className="text-red-400">*</span>
                </label>
                <input 
                  type="text"
                  className="w-full rounded-lg p-2.5 text-sm font-mono font-semibold text-amber-300 border border-amber-500/30 bg-amber-500/5 focus:border-amber-400 outline-none"
                  value={extracted.builtyNumber || extracted.blNumber || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateExtractedData('builtyNumber', val);
                    updateExtractedData('blNumber', val);
                  }}
                  placeholder="e.g. BLT-2025-9821 / KHI-892"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-300 font-medium block mb-1">Builty Date</label>
                  <input 
                    type="date"
                    className="w-full rounded-lg p-2 text-xs text-white border border-white/15 bg-black/40 focus:border-amber-400 outline-none"
                    value={extracted.builtyDate || extracted.blDate || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateExtractedData('builtyDate', val);
                      updateExtractedData('blDate', val);
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-300 font-medium block mb-1">Payment Terms</label>
                  <select 
                    className="w-full rounded-lg p-2 text-xs text-white border border-white/15 bg-black/40 focus:border-amber-400 outline-none"
                    value={extracted.paymentTerms || 'To-Pay'}
                    onChange={(e) => updateExtractedData('paymentTerms', e.target.value)}
                  >
                    <option value="To-Pay">To-Pay (Unloading par)</option>
                    <option value="Paid">Paid (Prepaid)</option>
                    <option value="Advance">Advance Paid</option>
                    <option value="COD">Cash on Delivery</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Container & Security Seal (If containerized) */}
          <div className="glass-panel p-5 rounded-xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h4 className="text-amber-400 text-sm font-bold uppercase flex items-center gap-1.5">
                <Box size={15} /> Container & Seal Number
              </h4>
              <span className="text-[10px] text-gray-400">Optional / Containerized</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-300 font-medium block mb-1">Container Number</label>
                <input 
                  type="text"
                  className="w-full rounded-lg p-2.5 text-sm font-mono text-white border border-white/15 bg-black/40 focus:border-amber-400 outline-none uppercase"
                  value={extracted.containerNo || formData.containers?.[0]?.number || ''}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    updateExtractedData('containerNo', val);
                    if (formData.containers.length > 0) {
                      setFormData(prev => ({
                        ...prev,
                        containers: prev.containers.map((c, idx) => idx === 0 ? { ...c, number: val } : c)
                      }));
                    } else if (val) {
                      setFormData(prev => ({
                        ...prev,
                        containers: [{ id: Date.now(), number: val, size: '40ft', weight: extracted.grossWeight || 0, sealNo: extracted.sealNo || '', status: 'Pending' }]
                      }));
                    }
                  }}
                  placeholder="e.g. MSKU1234567 or Open Truck"
                />
              </div>

              <div>
                <label className="text-xs text-gray-300 font-medium block mb-1">Seal Number</label>
                <input 
                  type="text"
                  className="w-full rounded-lg p-2.5 text-sm font-mono text-white border border-white/15 bg-black/40 focus:border-amber-400 outline-none"
                  value={extracted.sealNo || formData.containers?.[0]?.sealNo || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateExtractedData('sealNo', val);
                    if (formData.containers.length > 0) {
                      setFormData(prev => ({
                        ...prev,
                        containers: prev.containers.map((c, idx) => idx === 0 ? { ...c, sealNo: val } : c)
                      }));
                    }
                  }}
                  placeholder="e.g. SL-984120 / Bottle Seal"
                />
              </div>
            </div>
          </div>

          {/* Card 5: Vehicle & Driver Information */}
          <div className="glass-panel p-5 rounded-xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h4 className="text-amber-400 text-sm font-bold uppercase flex items-center gap-1.5">
                <Truck size={15} /> Transport Vehicle & Driver
              </h4>
              <span className="text-[10px] text-gray-400">Driver Verification</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-300 font-medium block mb-1">Vehicle / Truck Registration No</label>
                <input 
                  type="text"
                  className="w-full rounded-lg p-2.5 text-sm font-mono text-white border border-white/15 bg-black/40 focus:border-amber-400 outline-none uppercase"
                  value={extracted.vehicleNumber || ''}
                  onChange={(e) => updateExtractedData('vehicleNumber', e.target.value.toUpperCase())}
                  placeholder="e.g. TLA-492 / KHI-8120"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-gray-300 font-medium block mb-1">Driver Name</label>
                  <input 
                    type="text"
                    className="w-full rounded-lg p-2 text-xs text-white border border-white/15 bg-black/40 focus:border-amber-400 outline-none"
                    value={extracted.driverName || ''}
                    onChange={(e) => updateExtractedData('driverName', e.target.value)}
                    placeholder="Name"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-300 font-medium block mb-1">Driver Mobile</label>
                  <input 
                    type="text"
                    className="w-full rounded-lg p-2 text-xs text-white border border-white/15 bg-black/40 focus:border-amber-400 outline-none"
                    value={extracted.driverContact || ''}
                    onChange={(e) => updateExtractedData('driverContact', e.target.value)}
                    placeholder="03xx-xxxxxxx"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-300 font-medium block mb-1">Driver CNIC</label>
                  <input 
                    type="text"
                    className="w-full rounded-lg p-2 text-xs text-white border border-white/15 bg-black/40 focus:border-amber-400 outline-none"
                    value={extracted.driverCnic || ''}
                    onChange={(e) => updateExtractedData('driverCnic', e.target.value)}
                    placeholder="CNIC No"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 6: Consignee / Receiver Information */}
          <div className="glass-panel p-5 rounded-xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h4 className="text-amber-400 text-sm font-bold uppercase flex items-center gap-1.5">
                <Building size={15} /> Consignee / Receiver Party
              </h4>
              <span className="text-[10px] text-gray-400">Delivery Recipient</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-300 font-medium block mb-1">Consignee Name</label>
                <input 
                  type="text"
                  className="w-full rounded-lg p-2.5 text-sm text-white border border-white/15 bg-black/40 focus:border-amber-400 outline-none"
                  value={extracted.consigneeName || ''}
                  onChange={(e) => updateExtractedData('consigneeName', e.target.value)}
                  placeholder="e.g. Al-Madina Weaving Mills Ltd"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-300 font-medium block mb-1">Receiver Contact</label>
                  <input 
                    type="text"
                    className="w-full rounded-lg p-2 text-sm text-white border border-white/15 bg-black/40 focus:border-amber-400 outline-none"
                    value={extracted.consigneeContact || ''}
                    onChange={(e) => updateExtractedData('consigneeContact', e.target.value)}
                    placeholder="03xx-xxxxxxx"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-300 font-medium block mb-1">Destination Address</label>
                  <input 
                    type="text"
                    className="w-full rounded-lg p-2 text-sm text-white border border-white/15 bg-black/40 focus:border-amber-400 outline-none"
                    value={extracted.consigneeAddress || ''}
                    onChange={(e) => updateExtractedData('consigneeAddress', e.target.value)}
                    placeholder="Sector / Industrial Zone"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 7: Cargo Specifications & Commodities */}
          <div className="glass-panel p-5 rounded-xl border border-white/10 space-y-4 lg:col-span-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h4 className="text-amber-400 text-sm font-bold uppercase flex items-center gap-1.5">
                <Package size={15} /> Cargo Specifications & Packaging
              </h4>
              <span className="text-[10px] text-gray-400">Weight & Packaging</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="lg:col-span-2">
                <label className="text-xs text-gray-300 font-medium block mb-1">Cargo / Commodity Description</label>
                <input 
                  type="text"
                  className="w-full rounded-lg p-2.5 text-sm text-white border border-white/15 bg-black/40 focus:border-amber-400 outline-none"
                  value={extracted.itemName || ''}
                  onChange={(e) => updateExtractedData('itemName', e.target.value)}
                  placeholder="e.g. Cotton Yarn Cones / Steel Coils / Rice Bags"
                />
              </div>

              <div>
                <label className="text-xs text-gray-300 font-medium block mb-1">Packaging Type</label>
                <input 
                  type="text"
                  className="w-full rounded-lg p-2.5 text-sm text-white border border-white/15 bg-black/40 focus:border-amber-400 outline-none"
                  value={extracted.packagingType || 'Bags / Bundles'}
                  onChange={(e) => updateExtractedData('packagingType', e.target.value)}
                  placeholder="Bags, Cartons, Crates"
                />
              </div>

              <div>
                <label className="text-xs text-gray-300 font-medium block mb-1">Total Packages</label>
                <input 
                  type="number"
                  className="w-full rounded-lg p-2.5 text-sm text-white border border-white/15 bg-black/40 focus:border-amber-400 outline-none"
                  value={extracted.packageCount || ''}
                  onChange={(e) => updateExtractedData('packageCount', parseFloat(e.target.value))}
                  placeholder="e.g. 400"
                />
              </div>

              <div>
                <label className="text-xs text-gray-300 font-medium block mb-1">Gross Weight (KG)</label>
                <input 
                  type="number"
                  className="w-full rounded-lg p-2.5 text-sm font-mono text-emerald-400 font-bold border border-white/15 bg-black/40 focus:border-amber-400 outline-none"
                  value={extracted.grossWeight || extracted.totalWeight || ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    updateExtractedData('grossWeight', val);
                    updateExtractedData('totalWeight', val);
                  }}
                  placeholder="e.g. 24000"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Cargo Document Upload Section (Builty copy, Weight Slip, Challan) */}
        <div className="glass-panel p-5 rounded-xl border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-amber-400 text-sm font-bold uppercase flex items-center gap-2">
              <UploadCloud size={16} /> Cargo Document Upload (Builty, Weight Slip, Challan)
            </h4>
            <span className="text-xs text-gray-400">
              {uploadedDocs.length} {uploadedDocs.length === 1 ? 'file attached' : 'files attached'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {uploadedDocs.map(doc => (
              <div key={doc.id} className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                    <FileText size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{doc.name}</p>
                    <p className="text-[10px] text-gray-400">{(doc.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setLightboxImage(doc.url)}
                    className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                    title="View Document"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedDocs(prev => {
                        const updated = prev.filter(d => d.id !== doc.id);
                        safeAppStorage.setJSON('dpl_reg_docs', updated);
                        return updated;
                      });
                      setFiles(prev => prev.filter(f => f.name !== doc.name));
                    }}
                    className="p-1.5 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/10 transition-colors"
                    title="Remove File"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}

            {/* Quick Upload Button */}
            <label className="p-3 border border-dashed border-amber-500/40 hover:border-amber-400 bg-amber-500/5 hover:bg-amber-500/10 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors text-amber-300 text-xs font-medium">
              <Plus size={16} />
              <span>Attach Additional Document</span>
              <input 
                type="file" 
                multiple 
                className="hidden" 
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    processFiles(Array.from(e.target.files));
                  }
                }}
              />
            </label>
          </div>
        </div>

        {/* Operational Logistics Services & Charges (Arranged by DPL vs Client) */}
        {renderServiceArrangementsSection(false)}
      </div>
    );
  };

  const renderStep5_DataReview = () => {
    const extracted = formData.extractedData || {};
    const autoFilledCount = Object.values(extracted).filter(v => v !== undefined && v !== null && String(v).trim() !== '').length;

    const isPrivateCargo = formData.category === 'Transportation of Private Cargo' || formData.category?.toLowerCase().includes('private');
    if (isPrivateCargo) {
      return renderPrivateCargoRegistrationReview(extracted, autoFilledCount);
    }

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
        {/* Compact Single-Line Document Status Bar */}
        <div className="flex items-center justify-between gap-3 px-3 py-1.5 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle size={14} className="text-emerald-400 shrink-0" />
            <span className="font-medium text-emerald-200 text-xs truncate">
              Your documents have been read
            </span>
          </div>
          <span className="text-[10px] font-mono text-emerald-300/90 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shrink-0">
            {autoFilledCount} fields read
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Group 1: Parties Involved */}
          <div className="glass-panel p-5 rounded-xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h4 className="text-brand-400 text-sm font-bold uppercase flex items-center gap-1.5">
                <User size={15} /> Parties Involved
              </h4>
              <span className="text-[10px] text-gray-400">Shipper & Consignee</span>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-gray-300 font-medium">Shipper Name</label>
                  {extracted.shipperName ? (
                    <span className="text-[10px] text-emerald-400 flex items-center gap-0.5"><CheckCircle size={10} /> Read from doc</span>
                  ) : (
                    <span className="text-[10px] text-amber-400/80">Manual entry</span>
                  )}
                </div>
                <input 
                  className={`w-full rounded-lg p-2.5 text-sm text-white transition-colors outline-none border ${
                    extracted.shipperName ? 'border-emerald-500/30 bg-emerald-500/5 focus:border-emerald-400' : 'border-white/15 bg-black/40 focus:border-brand-400'
                  }`}
                  value={extracted.shipperName || ''} 
                  onChange={(e) => updateExtractedData('shipperName', e.target.value)} 
                  placeholder="Enter Shipper Name..." 
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-gray-300 font-medium">Shipper Address</label>
                  {extracted.shipperAddress ? (
                    <span className="text-[10px] text-emerald-400 flex items-center gap-0.5"><CheckCircle size={10} /> Read from doc</span>
                  ) : (
                    <span className="text-[10px] text-amber-400/80">Manual entry</span>
                  )}
                </div>
                <textarea 
                  className={`w-full rounded-lg p-2.5 text-sm h-16 text-white transition-colors outline-none border resize-none ${
                    extracted.shipperAddress ? 'border-emerald-500/30 bg-emerald-500/5 focus:border-emerald-400' : 'border-white/15 bg-black/40 focus:border-brand-400'
                  }`}
                  value={extracted.shipperAddress || ''} 
                  onChange={(e) => updateExtractedData('shipperAddress', e.target.value)} 
                  placeholder="Enter Shipper Address..." 
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-300 block mb-1">Shipper Contact</label>
                  <input 
                    className="w-full rounded-lg p-2 text-sm text-white border border-white/15 bg-black/40 focus:border-brand-400 outline-none" 
                    value={extracted.shipperContact || ''} 
                    onChange={(e) => updateExtractedData('shipperContact', e.target.value)} 
                    placeholder="Phone No." 
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-300 block mb-1">Shipper Email</label>
                  <input 
                    className="w-full rounded-lg p-2 text-sm text-white border border-white/15 bg-black/40 focus:border-brand-400 outline-none" 
                    value={extracted.shipperEmail || ''} 
                    onChange={(e) => updateExtractedData('shipperEmail', e.target.value)} 
                    placeholder="Email" 
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-white/10">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-gray-300 font-medium">Consignee Name</label>
                  {extracted.consigneeName ? (
                    <span className="text-[10px] text-emerald-400 flex items-center gap-0.5"><CheckCircle size={10} /> Read from doc</span>
                  ) : (
                    <span className="text-[10px] text-amber-400/80">Manual entry</span>
                  )}
                </div>
                <input 
                  className={`w-full rounded-lg p-2.5 text-sm text-white transition-colors outline-none border ${
                    extracted.consigneeName ? 'border-emerald-500/30 bg-emerald-500/5 focus:border-emerald-400' : 'border-white/15 bg-black/40 focus:border-brand-400'
                  }`}
                  value={extracted.consigneeName || ''} 
                  onChange={(e) => updateExtractedData('consigneeName', e.target.value)} 
                  placeholder="Enter Consignee Name..." 
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-gray-300 font-medium">Consignee Address</label>
                  {extracted.consigneeAddress ? (
                    <span className="text-[10px] text-emerald-400 flex items-center gap-0.5"><CheckCircle size={10} /> Read from doc</span>
                  ) : (
                    <span className="text-[10px] text-amber-400/80">Manual entry</span>
                  )}
                </div>
                <textarea 
                  className={`w-full rounded-lg p-2.5 text-sm h-16 text-white transition-colors outline-none border resize-none ${
                    extracted.consigneeAddress ? 'border-emerald-500/30 bg-emerald-500/5 focus:border-emerald-400' : 'border-white/15 bg-black/40 focus:border-brand-400'
                  }`}
                  value={extracted.consigneeAddress || ''} 
                  onChange={(e) => updateExtractedData('consigneeAddress', e.target.value)} 
                  placeholder="Enter Consignee Address..." 
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-300 block mb-1">Consignee Contact</label>
                  <input 
                    className="w-full rounded-lg p-2 text-sm text-white border border-white/15 bg-black/40 focus:border-brand-400 outline-none" 
                    value={extracted.consigneeContact || ''} 
                    onChange={(e) => updateExtractedData('consigneeContact', e.target.value)} 
                    placeholder="Phone No." 
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-300 block mb-1">Consignee Email</label>
                  <input 
                    className="w-full rounded-lg p-2 text-sm text-white border border-white/15 bg-black/40 focus:border-brand-400 outline-none" 
                    value={extracted.consigneeEmail || ''} 
                    onChange={(e) => updateExtractedData('consigneeEmail', e.target.value)} 
                    placeholder="Email" 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Group 2: Shipping Line & B/L Details */}
          <div className="glass-panel p-5 rounded-xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h4 className="text-brand-400 text-sm font-bold uppercase flex items-center gap-1.5">
                <Ship size={15} /> Bill of Lading & Maritime Route
              </h4>
              <span className="text-[10px] text-blue-300 font-mono bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                B/L Intelligence
              </span>
            </div>

            {/* Bill of Lading */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-gray-300 font-medium">B/L Number</label>
                  {extracted.blNumber && <span className="text-[10px] text-emerald-400 flex items-center gap-0.5"><CheckCircle size={9} /> Read</span>}
                </div>
                <input 
                  className={`w-full rounded-lg p-2 text-sm text-white font-mono outline-none border ${
                    extracted.blNumber ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/15 bg-black/40 focus:border-brand-400'
                  }`}
                  value={extracted.blNumber || ''} 
                  onChange={(e) => updateExtractedData('blNumber', e.target.value)} 
                  placeholder="e.g. MSKU12345678"
                />
              </div>
              <div>
                <label className="text-xs text-gray-300 block mb-1">B/L Date</label>
                <input 
                  type="date" 
                  className="w-full rounded-lg p-2 text-sm text-white border border-white/15 bg-black/40 focus:border-brand-400 outline-none" 
                  value={extracted.blDate || ''} 
                  onChange={(e) => updateExtractedData('blDate', e.target.value)} 
                />
              </div>
            </div>

            {/* Shipping Line & Vessel */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-gray-300 font-medium">Shipping Line</label>
                  {extracted.shippingLine && <span className="text-[10px] text-emerald-400 flex items-center gap-0.5"><CheckCircle size={9} /> Read</span>}
                </div>
                <input 
                  className={`w-full rounded-lg p-2 text-sm text-white outline-none border ${
                    extracted.shippingLine ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/15 bg-black/40 focus:border-brand-400'
                  }`}
                  value={extracted.shippingLine || ''} 
                  onChange={(e) => updateExtractedData('shippingLine', e.target.value)} 
                  placeholder="e.g. Maersk, MSC, COSCO"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-gray-300 font-medium">Shipping Agent</label>
                  {extracted.shippingAgent && <span className="text-[10px] text-emerald-400 flex items-center gap-0.5"><CheckCircle size={9} /> Read</span>}
                </div>
                <input 
                  className={`w-full rounded-lg p-2 text-sm text-white outline-none border ${
                    extracted.shippingAgent ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/15 bg-black/40 focus:border-brand-400'
                  }`}
                  value={extracted.shippingAgent || ''} 
                  onChange={(e) => updateExtractedData('shippingAgent', e.target.value)} 
                  placeholder="e.g. RIAZEDA (PVT) LTD"
                />
              </div>
            </div>

            {/* Vessel Name & Voyage No */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-gray-300 font-medium">Vessel Name</label>
                  {extracted.vesselName && <span className="text-[10px] text-emerald-400 flex items-center gap-0.5"><CheckCircle size={9} /></span>}
                </div>
                <input 
                  className={`w-full rounded-lg p-2 text-sm text-white outline-none border ${
                    extracted.vesselName ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/15 bg-black/40 focus:border-brand-400'
                  }`}
                  value={extracted.vesselName || ''} 
                  onChange={(e) => updateExtractedData('vesselName', e.target.value)} 
                  placeholder="e.g. MSC OSCAR"
                />
              </div>
              <div>
                <label className="text-xs text-gray-300 block mb-1">Voyage No.</label>
                <input 
                  className="w-full rounded-lg p-2 text-sm text-white border border-white/15 bg-black/40 focus:border-brand-400 outline-none font-mono" 
                  value={extracted.voyageNo || ''} 
                  onChange={(e) => updateExtractedData('voyageNo', e.target.value)} 
                  placeholder="e.g. 2401E"
                />
              </div>
            </div>

            {/* POL & POD */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-gray-300 font-medium">Port of Loading (POL)</label>
                  {extracted.pol && <span className="text-[10px] text-emerald-400 flex items-center gap-0.5"><CheckCircle size={9} /></span>}
                </div>
                <input 
                  className="w-full rounded-lg p-2 text-sm text-white border border-white/15 bg-black/40 focus:border-brand-400 outline-none" 
                  value={extracted.pol || ''} 
                  onChange={(e) => updateExtractedData('pol', e.target.value)} 
                  placeholder="e.g. Shanghai, Jebel Ali"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-gray-300 font-medium">Port of Discharge (POD)</label>
                  {extracted.pod && <span className="text-[10px] text-emerald-400 flex items-center gap-0.5"><CheckCircle size={9} /></span>}
                </div>
                <input 
                  className="w-full rounded-lg p-2 text-sm text-white border border-white/15 bg-black/40 focus:border-brand-400 outline-none" 
                  value={extracted.pod || ''} 
                  onChange={(e) => updateExtractedData('pod', e.target.value)} 
                  placeholder="e.g. Karachi, Port Qasim"
                />
              </div>
            </div>

            {/* Free Days & Freight Terms */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-300 block mb-1">Demurrage Free Days</label>
                <input 
                  type="number"
                  className="w-full rounded-lg p-2 text-sm text-white border border-white/15 bg-black/40 focus:border-brand-400 outline-none" 
                  value={extracted.freeDays || ''} 
                  onChange={(e) => updateExtractedData('freeDays', parseInt(e.target.value) || 0)} 
                  placeholder="e.g. 14 Days"
                />
              </div>
              <div>
                <label className="text-xs text-gray-300 block mb-1">Freight Terms</label>
                <select
                  className="w-full rounded-lg p-2 text-sm text-white border border-white/15 bg-black/40 focus:border-brand-400 outline-none"
                  value={extracted.freightTerms || 'Prepaid'}
                  onChange={(e) => updateExtractedData('freightTerms', e.target.value)}
                >
                  <option value="Prepaid">Prepaid</option>
                  <option value="Collect">Collect</option>
                  <option value="Payable at Destination">Payable at Destination</option>
                </select>
              </div>
            </div>

            {/* Goods Declaration (GD/TP) & IGM */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-gray-300 font-medium">( GD/TP Number )</label>
                  {extracted.gdNo && <span className="text-[10px] text-emerald-400"><CheckCircle size={9} /></span>}
                </div>
                <input 
                  className={`w-full rounded-lg p-2 text-sm text-white outline-none border ${
                    extracted.gdNo ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/15 bg-black/40 focus:border-brand-400'
                  }`}
                  value={extracted.gdNo || ''} 
                  onChange={(e) => updateExtractedData('gdNo', e.target.value)} 
                  placeholder="e.g. KAPE-HC-12345 / TP-98765"
                />
              </div>
              <div>
                <label className="text-xs text-gray-300 block mb-1">( GD/TP Date )</label>
                <input 
                  type="date" 
                  className="w-full rounded-lg p-2 text-sm text-white border border-white/15 bg-black/40 focus:border-brand-400 outline-none" 
                  value={extracted.gdDate || ''} 
                  onChange={(e) => updateExtractedData('gdDate', e.target.value)} 
                />
              </div>
            </div>

            {/* IGM No & Index No */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-300 block mb-1">IGM No</label>
                <input 
                  className="w-full rounded-lg p-2 text-sm text-white border border-white/15 bg-black/40 focus:border-brand-400 outline-none font-mono" 
                  value={extracted.igmNo || ''} 
                  onChange={(e) => updateExtractedData('igmNo', e.target.value)} 
                  placeholder="IGM Number"
                />
              </div>
              <div>
                <label className="text-xs text-gray-300 block mb-1">Index No</label>
                <input 
                  className="w-full rounded-lg p-2 text-sm text-white border border-white/15 bg-black/40 focus:border-brand-400 outline-none font-mono" 
                  value={extracted.indexNo || ''} 
                  onChange={(e) => updateExtractedData('indexNo', e.target.value)} 
                  placeholder="Index No"
                />
              </div>
            </div>
          </div>

          {/* Group 3: Commercial Invoice & Packing Specifications */}
          <div className="glass-panel p-5 rounded-xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h4 className="text-brand-400 text-sm font-bold uppercase flex items-center gap-1.5">
                <Receipt size={15} /> Commercial Invoice & Packing List
              </h4>
              <span className="text-[10px] text-amber-300 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                Invoice & Cargo Data
              </span>
            </div>

            {/* Commercial Invoice No & Date */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-gray-300 font-medium">Commercial Invoice No.</label>
                  {extracted.invoiceNo && <span className="text-[10px] text-emerald-400 flex items-center gap-0.5"><CheckCircle size={9} /> Read</span>}
                </div>
                <input 
                  className={`w-full rounded-lg p-2 text-sm text-white outline-none border font-mono ${
                    extracted.invoiceNo ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/15 bg-black/40 focus:border-brand-400'
                  }`}
                  value={extracted.invoiceNo || ''} 
                  onChange={(e) => updateExtractedData('invoiceNo', e.target.value)} 
                  placeholder="e.g. INV-2024-8891"
                />
              </div>
              <div>
                <label className="text-xs text-gray-300 block mb-1">Invoice Date</label>
                <input 
                  type="date" 
                  className="w-full rounded-lg p-2 text-sm text-white border border-white/15 bg-black/40 focus:border-brand-400 outline-none" 
                  value={extracted.invoiceDate || ''} 
                  onChange={(e) => updateExtractedData('invoiceDate', e.target.value)} 
                />
              </div>
            </div>

            {/* Invoice Value & Currency */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-gray-300 font-medium">Invoice Value</label>
                  {extracted.invoiceValue && <span className="text-[10px] text-emerald-400 flex items-center gap-0.5"><CheckCircle size={9} /> Read</span>}
                </div>
                <input 
                  type="number" 
                  className={`w-full rounded-lg p-2 text-sm text-white outline-none border ${
                    extracted.invoiceValue ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/15 bg-black/40 focus:border-brand-400'
                  }`}
                  value={extracted.invoiceValue || ''} 
                  onChange={(e) => updateExtractedData('invoiceValue', parseFloat(e.target.value))} 
                  placeholder="Total amount"
                />
              </div>
              <div>
                <label className="text-xs text-gray-300 block mb-1">Currency</label>
                <select
                  className="w-full rounded-lg p-2 text-sm text-white border border-white/15 bg-black/40 focus:border-brand-400 outline-none"
                  value={extracted.invoiceCurrency || 'USD'}
                  onChange={(e) => updateExtractedData('invoiceCurrency', e.target.value)}
                >
                  <option value="USD">USD ($)</option>
                  <option value="PKR">PKR (Rs)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="CNY">CNY (¥)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="AED">AED (Dirham)</option>
                </select>
              </div>
            </div>

            {/* Incoterms & HS Code */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-300 block mb-1">Incoterms</label>
                <select
                  className="w-full rounded-lg p-2 text-sm text-white border border-white/15 bg-black/40 focus:border-brand-400 outline-none font-medium"
                  value={extracted.incoTerms || 'CIF'}
                  onChange={(e) => updateExtractedData('incoTerms', e.target.value)}
                >
                  <option value="CIF">CIF — Cost, Insurance & Freight</option>
                  <option value="CFR">CFR — Cost & Freight</option>
                  <option value="FOB">FOB — Free on Board</option>
                  <option value="EXW">EXW — Ex Works</option>
                  <option value="DDP">DDP — Delivered Duty Paid</option>
                  <option value="CIP">CIP — Carriage and Insurance Paid</option>
                </select>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-gray-300 font-medium">HS / PCT Code</label>
                  {extracted.hsCode && <span className="text-[10px] text-emerald-400 flex items-center gap-0.5"><CheckCircle size={9} /></span>}
                </div>
                <input 
                  className="w-full rounded-lg p-2 text-sm text-white border border-white/15 bg-black/40 focus:border-brand-400 outline-none font-mono" 
                  value={extracted.hsCode || ''} 
                  onChange={(e) => updateExtractedData('hsCode', e.target.value)} 
                  placeholder="e.g. 8471.30"
                />
              </div>
            </div>

            {/* Item Name / Description */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs text-gray-300 font-medium">Cargo Description</label>
                {extracted.itemName && <span className="text-[10px] text-emerald-400 flex items-center gap-0.5"><CheckCircle size={9} /></span>}
              </div>
              <input 
                className={`w-full rounded-lg p-2 text-sm text-white outline-none border ${
                  extracted.itemName ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/15 bg-black/40 focus:border-brand-400'
                }`}
                value={extracted.itemName || ''} 
                onChange={(e) => updateExtractedData('itemName', e.target.value)} 
                placeholder="Description of goods..."
              />
            </div>

            {/* Packing List: Packaging & Count */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-300 block mb-1">Packaging Type</label>
                <input 
                  className="w-full rounded-lg p-2 text-sm text-white border border-white/15 bg-black/40 focus:border-brand-400 outline-none" 
                  value={extracted.packagingType || ''} 
                  onChange={(e) => updateExtractedData('packagingType', e.target.value)} 
                  placeholder="Cartons, Pallets, Drums"
                />
              </div>
              <div>
                <label className="text-xs text-gray-300 block mb-1">No. of Packages / Cartons</label>
                <input 
                  type="number" 
                  className="w-full rounded-lg p-2 text-sm text-white border border-white/15 bg-black/40 focus:border-brand-400 outline-none" 
                  value={extracted.packageCount || ''} 
                  onChange={(e) => updateExtractedData('packageCount', parseFloat(e.target.value))} 
                  placeholder="e.g. 850"
                />
              </div>
            </div>

            {/* Packing List: Gross Weight, Net Weight & Volume CBM */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-gray-300 font-medium truncate">Gross Wt (Kg)</label>
                  {(extracted.grossWeight || extracted.totalWeight) && <span className="text-[10px] text-emerald-400">✓</span>}
                </div>
                <input 
                  type="number" 
                  className={`w-full rounded-lg p-2 text-sm text-white outline-none border ${
                    (extracted.grossWeight || extracted.totalWeight) ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/15 bg-black/40 focus:border-brand-400'
                  }`}
                  value={extracted.grossWeight || extracted.totalWeight || ''} 
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    updateExtractedData('grossWeight', val);
                    updateExtractedData('totalWeight', val);
                  }} 
                  placeholder="Gross Kgs"
                />
              </div>
              <div>
                <label className="text-xs text-gray-300 block mb-1 truncate">Net Wt (Kg)</label>
                <input 
                  type="number" 
                  className="w-full rounded-lg p-2 text-sm text-white border border-white/15 bg-black/40 focus:border-brand-400 outline-none" 
                  value={extracted.netWeight || ''} 
                  onChange={(e) => updateExtractedData('netWeight', parseFloat(e.target.value))} 
                  placeholder="Net Kgs"
                />
              </div>
              <div>
                <label className="text-xs text-gray-300 block mb-1 truncate">Volume (CBM)</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="w-full rounded-lg p-2 text-sm text-white border border-white/15 bg-black/40 focus:border-brand-400 outline-none" 
                  value={extracted.volumeCBM || ''} 
                  onChange={(e) => updateExtractedData('volumeCBM', parseFloat(e.target.value))} 
                  placeholder="e.g. 54.2"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Operational Logistics Services & Charges (Arranged by DPL vs Client) */}
        {renderServiceArrangementsSection(false)}
      </div>
    );
  };

  const renderStep6_Containers = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
        <div>
          <h3 className="text-lg sm:text-xl font-semibold text-white">Step 3: Containers Manifest</h3>
          <p className="text-xs text-gray-400">Containers identified from shipping documents or added manually</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-mono text-brand-300 bg-brand-500/10 border border-brand-500/20 px-3 py-1.5 rounded-lg">
            Total: {formData.containers.length} {formData.containers.length === 1 ? 'Container' : 'Containers'}
          </span>
          <button 
            type="button"
            onClick={addContainer}
            className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-lg shadow-brand-600/30 transition-all"
          >
            <Box size={16} /> Add Container
          </button>
        </div>
      </div>
      
      {/* Mobile View (Cards) - Optimized for vertical thumb scrolling */}
      <div className="block sm:hidden space-y-3 touch-pan-y">
        {formData.containers.map((c: any, index: number) => (
          <div key={c.id} className="glass-panel border border-white/10 p-3.5 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-brand-400 bg-brand-500/10 border border-brand-500/20 px-2 py-0.5 rounded">
                Container #{index + 1}
              </span>
              <button 
                type="button"
                onClick={() => removeContainer(c.id)}
                className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-colors"
                title="Remove container"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div>
              <label className="text-[10px] text-gray-400 uppercase font-semibold block mb-1">Container Number</label>
              <input 
                type="text" 
                placeholder="e.g. MSKU1234567"
                value={c.number} 
                onChange={(e) => updateContainer(c.id, 'number', e.target.value)}
                className="glass-input rounded-lg px-3 py-2 w-full outline-none text-sm text-white font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-400 uppercase font-semibold block mb-1">Size</label>
                <select 
                  value={c.size} 
                  onChange={(e) => updateContainer(c.id, 'size', e.target.value)}
                  className="glass-input rounded-lg px-2.5 py-2 w-full outline-none text-xs text-white bg-slate-900"
                >
                  <option value="20ft" className="bg-slate-900 text-white">20ft</option>
                  <option value="40ft" className="bg-slate-900 text-white">40ft</option>
                  <option value="45ft" className="bg-slate-900 text-white">45ft</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-gray-400 uppercase font-semibold block mb-1">Weight (Kg)</label>
                <input 
                  type="number" 
                  placeholder="0"
                  value={c.weight} 
                  onChange={(e) => updateContainer(c.id, 'weight', parseFloat(e.target.value) || 0)}
                  className="glass-input rounded-lg px-2.5 py-2 w-full outline-none text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-gray-400 uppercase font-semibold block mb-1">Seal Number (Optional)</label>
              <input 
                type="text" 
                placeholder="e.g. SL-98765"
                value={c.seal || ''} 
                onChange={(e) => updateContainer(c.id, 'seal', e.target.value)}
                className="glass-input rounded-lg px-3 py-2 w-full outline-none text-xs text-white"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop View (Table) */}
      <div className="hidden sm:block glass-panel border border-white/10 rounded-xl overflow-hidden overflow-x-auto custom-scrollbar touch-pan-y">
        <table className="w-full text-left text-sm text-gray-200 min-w-[650px]"> 
          <thead className="bg-white/5 uppercase text-[11px] font-semibold text-gray-300 border-b border-white/10">
            <tr>
              <th className="p-3 sm:p-4 w-12 text-center">#</th>
              <th className="p-3 sm:p-4">Container No</th>
              <th className="p-3 sm:p-4 w-32">Size</th>
              <th className="p-3 sm:p-4 w-36">Weight (Kg)</th>
              <th className="p-3 sm:p-4 w-36">Seal No</th>
              <th className="p-3 sm:p-4 w-16 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {formData.containers.map((c: any, index: number) => (
              <tr key={c.id} className="hover:bg-white/5 transition-colors">
                <td className="p-3 text-center text-gray-400 font-mono text-xs">{index + 1}</td>
                <td className="p-3">
                  <input 
                    type="text" 
                    placeholder="e.g. MSKU1234567"
                    value={c.number} 
                    onChange={(e) => updateContainer(c.id, 'number', e.target.value)}
                    className="glass-input rounded-lg px-3 py-1.5 w-full outline-none text-sm text-white font-mono"
                  />
                </td>
                <td className="p-3">
                  <select 
                    value={c.size} 
                    onChange={(e) => updateContainer(c.id, 'size', e.target.value)}
                    className="glass-input rounded-lg px-3 py-1.5 w-full outline-none text-sm text-white bg-slate-900"
                  >
                    <option value="20ft" className="bg-slate-900 text-white">20ft</option>
                    <option value="40ft" className="bg-slate-900 text-white">40ft</option>
                    <option value="45ft" className="bg-slate-900 text-white">45ft</option>
                  </select>
                </td>
                <td className="p-3">
                  <input 
                    type="number" 
                    placeholder="0"
                    value={c.weight} 
                    onChange={(e) => updateContainer(c.id, 'weight', parseFloat(e.target.value) || 0)}
                    className="glass-input rounded-lg px-3 py-1.5 w-full outline-none text-sm text-white"
                  />
                </td>
                <td className="p-3">
                  <input 
                    type="text" 
                    placeholder="Optional"
                    value={c.seal || ''} 
                    onChange={(e) => updateContainer(c.id, 'seal', e.target.value)}
                    className="glass-input rounded-lg px-3 py-1.5 w-full outline-none text-sm text-white"
                  />
                </td>
                <td className="p-3 text-center">
                  <button 
                    type="button"
                    onClick={() => removeContainer(c.id)}
                    className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-colors"
                    title="Remove container"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/10 text-xs text-gray-400 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1 rounded bg-brand-500/20 text-brand-300">
            <Box size={14} />
          </div>
          <span>
            {formData.containers.length} container{formData.containers.length === 1 ? '' : 's'} recorded. Additional containers can be added anytime.
          </span>
        </div>
        <span className="font-mono text-xs text-emerald-400 font-semibold">
          Total Cargo Weight: {formData.containers.reduce((sum: number, c: any) => sum + (Number(c.weight) || 0), 0).toLocaleString()} KG
        </span>
      </div>
    </div>
  );

  const renderStep7_Submit = () => {
    if (isCaseSubmitted) {
      return (
        <div className="text-center py-10 px-4 animate-in zoom-in duration-300 max-w-2xl mx-auto">
          <div className="bg-emerald-500/10 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-5 border-4 border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
            <CheckCircle className="text-emerald-400" size={44} />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Case Registered Successfully!</h2>
          <p className="text-gray-300 text-sm mb-6 max-w-lg mx-auto">
            Your case has been registered and synced with Firebase Firestore. All cargo manifests, routes, and billing details are securely recorded.
          </p>
          
          <div className="glass-panel inline-block rounded-2xl p-6 border border-brand-500/30 mb-8 bg-slate-900/80 shadow-xl">
            <p className="text-xs text-gray-400 uppercase mb-1 tracking-widest font-semibold">Registered Case Number</p>
            <p className="text-2xl sm:text-3xl font-mono text-brand-400 font-bold tracking-wider">{submittedCaseData?.caseNo || generatedCaseNo}</p>
            <p className="text-xs text-emerald-400 mt-2 flex items-center justify-center gap-1.5 font-medium">
              <CheckCircle size={14} /> Status: {submittedCaseData?.status || 'Active'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
            <button 
              onClick={() => {
                if (submittedCaseData) {
                  setSelectedCase(submittedCaseData);
                  setView('details');
                } else {
                  setView('list');
                }
                setIsCaseSubmitted(false);
              }} 
              className="bg-brand-600 hover:bg-brand-500 text-white px-5 py-3 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-brand-600/30 flex items-center justify-center gap-2"
            >
              <Eye size={16} />
              <span>Finish & View Case</span>
            </button>

            <button 
              onClick={handleStartRegistration} 
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              <span>Create Another Case</span>
            </button>

            <button 
              onClick={() => setShowRegistrationChargeModal(true)} 
              className="bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 px-5 py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
            >
              <DollarSign size={16} />
              <span>Add More Charges</span>
            </button>

            <button 
              onClick={() => { setView('list'); setStep(1); setIsCaseSubmitted(false); }} 
              className="bg-white/10 hover:bg-white/20 text-white px-5 py-3 rounded-xl text-sm font-semibold transition-colors border border-white/10 flex items-center justify-center gap-2"
            >
              <span>View All Cases</span>
            </button>
          </div>
        </div>
      );
    }

    // Step 4: Pre-submission Full Case Review
    const currentCharges = formData.charges || [];
    const totalChargesAmount = currentCharges.reduce((sum, ch) => sum + (Number(ch.amount) || 0), 0);

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
        {/* Step 4 Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono uppercase bg-brand-500/20 text-brand-300 px-2.5 py-0.5 rounded-full border border-brand-500/30 font-semibold">
                Step 4 of 4: Final Review
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                Ready for Registration
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white">Review Case Details & Confirm</h3>
            <p className="text-xs sm:text-sm text-gray-400">
              Review all shipment, cargo, containers, and charges before finishing. Click Edit on any section to modify.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setShowRegistrationChargeModal(true)}
              className="text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 font-medium"
            >
              <Plus size={14} />
              <span>Add More Charges</span>
            </button>
            <button
              type="button"
              onClick={handleFinalSubmit}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all hover:scale-105"
            >
              <CheckCircle size={16} />
              <span>Finish & Register</span>
            </button>
          </div>
        </div>

        {/* Section 1: Route & Client Overview */}
        <div className="glass-panel p-5 rounded-xl border border-white/10 bg-slate-900/60 space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <h4 className="text-sm font-bold text-white uppercase flex items-center gap-2">
              <Briefcase size={16} className="text-brand-400" />
              <span>1. Client & Service Route</span>
            </h4>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-xs text-brand-300 hover:text-white bg-brand-500/10 hover:bg-brand-500/20 px-2.5 py-1 rounded-lg border border-brand-500/30 flex items-center gap-1 transition-colors"
            >
              <Edit size={12} />
              <span>Edit Route</span>
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-gray-400 block mb-0.5">Client / Shipper</span>
              <span className="text-white font-semibold text-sm">{formData.client || 'General Cargo'}</span>
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">Category</span>
              <span className="text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 inline-block">
                {formData.category}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">Port of Loading (POL)</span>
              <span className="text-white font-medium flex items-center gap-1">
                <MapPin size={12} className="text-red-400" /> {formData.pol || 'Karachi Port Trust'}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">Port of Destination (POD)</span>
              <span className="text-white font-medium flex items-center gap-1">
                <Anchor size={12} className="text-emerald-400" /> {formData.pod || 'Not Specified'}
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Cargo & Shipping Details */}
        <div className="glass-panel p-5 rounded-xl border border-white/10 bg-slate-900/60 space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <h4 className="text-sm font-bold text-white uppercase flex items-center gap-2">
              <FileText size={16} className="text-brand-400" />
              <span>2. Cargo & B/L Details</span>
            </h4>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="text-xs text-brand-300 hover:text-white bg-brand-500/10 hover:bg-brand-500/20 px-2.5 py-1 rounded-lg border border-brand-500/30 flex items-center gap-1 transition-colors"
            >
              <Edit size={12} />
              <span>Edit Cargo</span>
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-gray-400 block mb-0.5">B/L or CRO Number</span>
              <span className="text-white font-mono font-semibold">{formData.extractedData.blNumber || 'Pending'}</span>
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">Consignee</span>
              <span className="text-white font-medium">{formData.extractedData.consigneeName || 'Same as Client'}</span>
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">Commodity / Cargo</span>
              <span className="text-white font-medium">{formData.extractedData.itemDescription || formData.extractedData.itemName || 'Commercial Freight'}</span>
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">Total Gross Weight</span>
              <span className="text-emerald-400 font-mono font-semibold">
                {formData.extractedData.totalWeight ? `${formData.extractedData.totalWeight.toLocaleString()} KG` : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">Volume (CBM)</span>
              <span className="text-white font-mono">{formData.extractedData.volumeCBM ? `${formData.extractedData.volumeCBM} CBM` : 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">Packages</span>
              <span className="text-white font-mono">
                {formData.extractedData.packageCount ? `${formData.extractedData.packageCount} ${formData.extractedData.packagingType || 'Packages'}` : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">Vessel / Voyage</span>
              <span className="text-white font-medium">{formData.extractedData.vesselName || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">Index Number</span>
              <span className="text-white font-mono">{formData.extractedData.indexNo || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Section 3: Containers Manifest */}
        <div className="glass-panel p-5 rounded-xl border border-white/10 bg-slate-900/60 space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white uppercase flex items-center gap-2">
                <Box size={16} className="text-brand-400" />
                <span>3. Containers Manifest</span>
              </h4>
              <span className="text-[10px] font-mono text-brand-300 bg-brand-500/10 border border-brand-500/20 px-2 py-0.5 rounded">
                {formData.containers.length} {formData.containers.length === 1 ? 'Container' : 'Containers'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="text-xs text-brand-300 hover:text-white bg-brand-500/10 hover:bg-brand-500/20 px-2.5 py-1 rounded-lg border border-brand-500/30 flex items-center gap-1 transition-colors"
            >
              <Edit size={12} />
              <span>Edit Containers</span>
            </button>
          </div>

          {formData.containers.length === 0 ? (
            <p className="text-xs text-gray-400 italic py-2">No containers added yet. You can edit to add containers.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400 uppercase font-semibold">
                    <th className="py-2 px-3">#</th>
                    <th className="py-2 px-3">Container Number</th>
                    <th className="py-2 px-3">Size</th>
                    <th className="py-2 px-3">Cargo Weight (KG)</th>
                    <th className="py-2 px-3">Seal Number</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {formData.containers.map((c: any, idx: number) => (
                    <tr key={c.id || idx} className="hover:bg-white/5">
                      <td className="py-2 px-3 text-gray-500">{idx + 1}</td>
                      <td className="py-2 px-3 text-white font-bold">{c.number || 'Pending'}</td>
                      <td className="py-2 px-3 text-brand-300">{c.size || '40ft'}</td>
                      <td className="py-2 px-3 text-emerald-400 font-semibold">{c.weight ? Number(c.weight).toLocaleString() : '0'}</td>
                      <td className="py-2 px-3 text-gray-300">{c.seal || c.sealNo || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section 4: Operational Services Arrangement (Arranged by DPL vs Client) */}
        {renderServiceArrangementsSection(true)}

        {/* Section 4.1: Charges & Invoicing Breakdown */}
        <div className="glass-panel p-5 rounded-xl border border-amber-500/30 bg-slate-900/80 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div>
              <h4 className="text-sm font-bold text-white uppercase flex items-center gap-2">
                <Receipt size={16} className="text-amber-400" />
                <span>Invoice Charges & Estimated Billing Summary</span>
              </h4>
              <p className="text-xs text-gray-400 mt-0.5">
                Charges automatically synced from DPL-arranged services above. Client-arranged services are excluded from the invoice.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowRegistrationChargeModal(true)}
              className="text-xs text-white bg-amber-600 hover:bg-amber-500 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 font-medium shadow-sm"
            >
              <Plus size={13} />
              <span>Add Custom Charge</span>
            </button>
          </div>

          {currentCharges.length === 0 ? (
            <div className="p-5 text-center rounded-xl bg-white/5 border border-dashed border-white/15 text-gray-400 text-xs space-y-2">
              <p className="text-gray-300">No automatic charges applied. Switch any service above to "DPL" or add custom charges.</p>
              <button
                type="button"
                onClick={() => setShowRegistrationChargeModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-semibold transition-colors"
              >
                <Plus size={13} />
                <span>+ Add TP Charges / Custom Charges</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {currentCharges.map((ch, cIdx) => (
                <div key={cIdx} className="flex items-center justify-between p-2.5 bg-white/5 border border-white/5 rounded-lg text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-mono text-[10px]">
                      {cIdx + 1}
                    </span>
                    <span className="text-white font-medium">{ch.description}</span>
                    {ch.syncKey && (
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-mono">
                        DPL Arranged
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-emerald-400 font-bold">
                      PKR {Number(ch.amount).toLocaleString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (ch.syncKey) {
                          handleToggleServiceArrangement(ch.syncKey, 'Client');
                        } else {
                          const updated = currentCharges.filter((_, idx) => idx !== cIdx);
                          setFormData(prev => ({ ...prev, charges: updated }));
                        }
                      }}
                      className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors"
                      title={ch.syncKey ? "Exclude from invoice (set to Client arranged)" : "Remove charge"}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-3 border-t border-white/10 flex items-center justify-between">
            <span className="text-xs sm:text-sm font-semibold uppercase text-gray-300">
              Total Estimated Billing:
            </span>
            <span className="text-lg font-bold text-amber-400 font-mono">
              PKR {totalChargesAmount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Section 5: Attached Documents */}
        {uploadedDocs.length > 0 && (
          <div className="glass-panel p-4 rounded-xl border border-white/10 bg-slate-900/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck size={16} className="text-emerald-400" />
              <span className="text-xs text-gray-300 font-medium">
                {uploadedDocs.length} Attached Shipping Document{uploadedDocs.length === 1 ? '' : 's'} verified and linked to this case.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-xs text-brand-300 hover:text-white flex items-center gap-1"
            >
              <Edit size={12} />
              <span>Manage Docs</span>
            </button>
          </div>
        )}

        {/* Step 4 Action Buttons */}
        <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="bg-white/10 hover:bg-white/15 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors border border-white/10 flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              <span>Back to Containers</span>
            </button>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors border border-white/5 flex items-center gap-1.5"
            >
              <Edit size={14} />
              <span>Edit Case Details</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowRegistrationChargeModal(true)}
              className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5"
            >
              <Plus size={15} />
              <span>Add More Charges</span>
            </button>
            <button
              type="button"
              onClick={handleFinalSubmit}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 sm:px-8 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all hover:scale-105"
            >
              <CheckCircle size={17} />
              <span>Finish & Register Case</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {view === 'list' && renderCaseList()}
      {view === 'details' && renderCaseDetails()}
      {view === 'register' && (
        <div className="max-w-7xl mx-auto pb-12 w-full overflow-hidden">
           <button onClick={() => setView('list')} className="text-gray-400 hover:text-white flex items-center gap-2 mb-4 text-sm font-medium transition-colors">
              <ArrowLeft size={16} /> Cancel Registration
           </button>
           
           <div className="glass-card rounded-2xl shadow-2xl flex flex-col relative w-full overflow-hidden">
        {/* Stepper Header (hidden during full-page document reading) */}
        {!isReadingDocuments && (
          <div className="bg-black/30 p-3 sm:p-5 border-b border-white/5 backdrop-blur-sm z-20 rounded-t-2xl">
            <div className="flex justify-between items-center relative max-w-xl mx-auto">
              <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/10 -z-0 rounded"></div>
              {[
                { s: 1, label: 'Case & Documents' },
                { s: 2, label: 'Data Review' },
                { s: 3, label: 'Containers' },
                { s: 4, label: 'Submit' }
              ].map(({ s, label }) => (
                <div key={s} className="relative z-10 flex flex-col items-center group cursor-default">
                  <div 
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold border-2 sm:border-4 transition-all duration-300 shadow-lg
                      ${step >= s 
                        ? 'bg-brand-600 text-white border-brand-900/50 scale-105 sm:scale-110 shadow-brand-500/30' 
                        : 'bg-slate-900 text-gray-600 border-slate-800'}`}
                  >
                    {s}
                  </div>
                  <span className={`text-[11px] mt-1.5 font-medium whitespace-nowrap hidden sm:block ${step >= s ? 'text-brand-300' : 'text-gray-500'}`}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="p-3 sm:p-6 flex-1 w-full overflow-hidden">
          {isReadingDocuments ? (
            <div className="min-h-[380px] sm:min-h-[440px] flex flex-col justify-center items-center w-full">
              {renderDocumentReadingView()}
            </div>
          ) : (
            <div className="space-y-4">
              {step === 1 && renderStep1_Merged()}
              {step === 2 && renderStep5_DataReview()}
              {step === 3 && renderStep6_Containers()}
              {step === 4 && renderStep7_Submit()}
            </div>
          )}
        </div>

        {step < 4 && !isReadingDocuments && (
          <div className="p-3 sm:p-5 bg-slate-900/95 border-t border-white/10 flex justify-between items-center backdrop-blur-md z-20 sticky bottom-0 rounded-b-2xl shadow-xl">
            <button 
              disabled={step === 1}
              onClick={() => setStep(s => s - 1)}
              className={`px-3 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${step === 1 ? 'opacity-0 cursor-default pointer-events-none' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
            >
              ← Back
            </button>
            <button 
              onClick={() => {
                if (step === 1) {
                  if (!generatedCaseNo) {
                    const freshCaseNo = generateCaseNumber();
                    setGeneratedCaseNo(freshCaseNo);
                    safeAppStorage.setItem('dpl_reg_caseno', freshCaseNo);
                  }
                  if (isOtherClient && otherClientName.trim()) {
                    const trimmed = otherClientName.trim();
                    saveClientToFirestore({ name: trimmed }).catch(() => {});
                    if (!registeredClients.includes(trimmed)) {
                      setRegisteredClients(prev => [...prev, trimmed]);
                    }
                  }
                  if (files.length > 0 || uploadedDocs.length > 0) {
                    triggerDocumentReading();
                    return;
                  }
                  setStep(2);
                  return;
                }
                if (step === 2) {
                  // Auto-add container if empty when entering container step
                  if (formData.containers.length === 0) {
                    const totalWeight = formData.extractedData.totalWeight || 0;
                    const extractedCntr = formData.extractedData.containerNo || `CNTR-${Math.floor(Math.random()*10000)}`;
                    const extractedSize = formData.extractedData.containerSize || '40ft';
                    setFormData(prev => ({
                      ...prev,
                      containers: [
                        { 
                          id: Date.now(), 
                          number: extractedCntr, 
                          size: (extractedSize === '20ft' || extractedSize === '45ft') ? extractedSize : '40ft', 
                          weight: totalWeight,
                          sealNo: prev.extractedData.sealNo || '',
                          status: 'Pending'
                        }
                      ]
                    }));
                  }
                  setStep(3);
                  return;
                }
                if (step === 3) {
                  setStep(4);
                  return;
                }
                setStep(s => s + 1);
              }}
              disabled={
                step === 1 && (files.length === 0 && uploadedDocs.length === 0) && (!formData.client || !formData.client.trim() || !formData.category)
              }
              className={`bg-brand-600 hover:bg-brand-500 text-white px-5 sm:px-8 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-lg shadow-brand-600/30 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <span>
                {step === 3
                  ? 'Review & Confirm Case' 
                  : step === 1 && (files.length > 0 || uploadedDocs.length > 0)
                    ? 'Scan Documents & Continue'
                    : step === 2
                      ? 'Next: Containers'
                      : 'Next Step'}
              </span>
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
    )}

      {/* Add More Charges Modal */}
      {showRegistrationChargeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[95] flex items-start justify-center pt-8 sm:pt-14 p-4 overflow-y-auto">
          <div className="glass-card max-w-md w-full p-6 rounded-2xl border border-white/15 bg-slate-900/95 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Receipt size={18} className="text-amber-400" />
                <span>Add Charge Item</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowRegistrationChargeModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-300 font-medium block mb-1.5">Quick Presets</label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { desc: 'TP Charges', amount: 18000 },
                    { desc: 'Loading / Unloading Charges', amount: 6000 },
                    { desc: 'Delivery Order (DO) Charges', amount: 8500 },
                    { desc: 'Vehicle Rent / Freight', amount: 125000 },
                    { desc: 'Customs Duty / Taxes', amount: 0 }
                  ].map((preset, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => {
                        setNewRegChargeDesc(preset.desc);
                        if (preset.amount > 0) setNewRegChargeAmount(String(preset.amount));
                      }}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-amber-500/20 text-gray-300 hover:text-amber-300 border border-white/10 hover:border-amber-500/30 transition-colors flex items-center gap-1"
                    >
                      <Plus size={11} /> {preset.desc}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-300 font-medium block mb-1">Charge Description</label>
                <input
                  type="text"
                  placeholder="e.g. TP Charges, Demurrage Surcharge, Port Lift Off"
                  value={newRegChargeDesc}
                  onChange={(e) => setNewRegChargeDesc(e.target.value)}
                  className="glass-input w-full p-2.5 rounded-xl text-sm text-white outline-none border border-white/15 focus:border-amber-400"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs text-gray-300 font-medium block mb-1">Amount (PKR)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-400">PKR</span>
                  <input
                    type="number"
                    placeholder="e.g. 15000"
                    value={newRegChargeAmount}
                    onChange={(e) => setNewRegChargeAmount(e.target.value)}
                    className="glass-input w-full pl-12 pr-3 py-2.5 rounded-xl text-sm text-emerald-400 font-mono font-bold outline-none border border-white/15 focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Set as Default for Client Checkbox */}
              {formData.client && (
                <div className="p-3 bg-brand-500/10 border border-brand-500/20 rounded-xl">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSaveAsClientDefault}
                      onChange={(e) => setIsSaveAsClientDefault(e.target.checked)}
                      className="mt-0.5 rounded border-white/20 text-brand-500 focus:ring-brand-400 cursor-pointer"
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-brand-300 block">
                        Set as Default Charge for {formData.client}
                      </span>
                      <span className="text-[11px] text-gray-300 leading-tight">
                        Ye charge {formData.client} ke aainda har case aur invoice par by default automatically lagega.
                      </span>
                    </div>
                  </label>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowRegistrationChargeModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!newRegChargeDesc.trim() || !newRegChargeAmount || Number(newRegChargeAmount) <= 0}
                onClick={() => handleAddRegistrationChargeItem(newRegChargeDesc, Number(newRegChargeAmount) || 0)}
                className="bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-amber-600/30 flex items-center gap-1.5"
              >
                <Plus size={14} />
                <span>Save Charge</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 no-print">
           <div className="bg-slate-900 rounded-2xl overflow-hidden max-w-2xl w-full border border-white/10 shadow-2xl">
              <div className="relative">
                 <video ref={videoRef} autoPlay playsInline className="w-full bg-black h-96 object-cover" />
                 <button onClick={stopCamera} className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-red-500 transition-colors">
                    <X size={24} />
                 </button>
              </div>
              <div className="p-6 flex flex-col items-center">
                 <p className="text-gray-400 mb-4 text-sm">Align document within the frame</p>
                 <button onClick={captureImage} className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center hover:bg-white/20 transition-all">
                    <div className="w-12 h-12 bg-white rounded-full"></div>
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Global Lightbox Modal */}
      {lightboxImage && (
         <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm cursor-zoom-out no-print" onClick={() => setLightboxImage(null)}>
            <button className="absolute top-6 right-6 text-white/50 hover:text-white bg-black/50 hover:bg-black/80 rounded-full p-2 transition-all">
               <X size={32} />
            </button>
            <img src={lightboxImage} alt="Document View" className="max-w-full max-h-[90vh] object-contain shadow-2xl border border-white/10" />
         </div>
      )}

      {/* Add Custom Charge Modal */}
      {showAddChargeModal && (
        <div 
          className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm no-print overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddChargeModal(false);
              setIsAddingNewCategory(false);
            }
          }}
        >
          <div className="bg-slate-900 rounded-2xl overflow-hidden max-w-lg w-full border border-white/15 shadow-2xl animate-fade-in my-8">
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-slate-950/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center border border-brand-500/20">
                  <Receipt size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Add Billing Charge</h3>
                  <p className="text-xs text-gray-400">Select charge category, amount and attach payment receipt</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowAddChargeModal(false);
                  setIsAddingNewCategory(false);
                }}
                className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Charge Category Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Select Charge Category
                </label>
                <select
                  value={selectedChargeCategory}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedChargeCategory(val);
                    if (val && val !== '__CUSTOM__') {
                      setNewChargeDesc(val);
                    } else if (val === '__CUSTOM__') {
                      setNewChargeDesc('');
                    }
                  }}
                  className="w-full bg-slate-800 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
                >
                  <option value="">-- Select Category --</option>
                  <optgroup label="Standard Customs & Shipping Charges">
                    {STANDARD_CHARGE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </optgroup>
                  {customChargeCategories.length > 0 && (
                    <optgroup label="Custom Created Categories">
                      {customChargeCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </optgroup>
                  )}
                  <option value="__CUSTOM__">✍ Custom Category...</option>
                </select>

                {/* Button to Add New Category */}
                <div className="mt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setIsAddingNewCategory(prev => !prev)}
                    className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium transition-colors"
                  >
                    <Plus size={13} />
                    <span>+ Add New Charge Category</span>
                  </button>
                  {customChargeCategories.length > 0 && (
                    <span className="text-[11px] text-gray-500">
                      {customChargeCategories.length} custom {customChargeCategories.length === 1 ? 'category' : 'categories'} available
                    </span>
                  )}
                </div>

                {/* Inline New Category Creation Box */}
                {isAddingNewCategory && (
                  <div className="mt-2.5 p-3 rounded-xl bg-slate-950/80 border border-amber-500/30 space-y-2">
                    <p className="text-xs text-gray-300 font-medium">
                      Enter new charge category name (will be saved across all cases):
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCategoryInput}
                        onChange={(e) => setNewCategoryInput(e.target.value)}
                        placeholder="e.g. Scanning Surcharge, Security Escort Fee..."
                        className="flex-1 bg-slate-900 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newCategoryInput.trim()) {
                              const trimmed = newCategoryInput.trim();
                              const updatedCats = Array.from(new Set([...customChargeCategories, trimmed]));
                              setCustomChargeCategories(updatedCats);
                              safeLocalStorage.setItem('custom_billing_categories', JSON.stringify(updatedCats));
                              setSelectedChargeCategory(trimmed);
                              setNewChargeDesc(trimmed);
                              setNewCategoryInput('');
                              setIsAddingNewCategory(false);
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newCategoryInput.trim()) {
                            const trimmed = newCategoryInput.trim();
                            const updatedCats = Array.from(new Set([...customChargeCategories, trimmed]));
                            setCustomChargeCategories(updatedCats);
                            safeLocalStorage.setItem('custom_billing_categories', JSON.stringify(updatedCats));
                            setSelectedChargeCategory(trimmed);
                            setNewChargeDesc(trimmed);
                            setNewCategoryInput('');
                            setIsAddingNewCategory(false);
                          }
                        }}
                        disabled={!newCategoryInput.trim()}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-semibold text-xs transition-colors"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingNewCategory(false);
                          setNewCategoryInput('');
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 text-xs transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Service / Item Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Service / Item Description
                </label>
                <input 
                  type="text"
                  value={newChargeDesc}
                  onChange={(e) => setNewChargeDesc(e.target.value)}
                  placeholder="e.g. Weighbridge charges, Terminal detention, Wharfage surcharge"
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>

              {/* Amount (PKR) */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Amount in PKR
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-400 font-bold">
                    PKR
                  </span>
                  <input 
                    type="number"
                    value={newChargeAmount}
                    onChange={(e) => setNewChargeAmount(e.target.value)}
                    placeholder="e.g. 15000"
                    className="w-full bg-slate-800 border border-white/10 rounded-xl pl-14 pr-3.5 py-2.5 text-sm font-mono font-semibold text-emerald-400 placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>

              {/* Receipt Upload Option */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Upload Payment Receipt / Voucher
                </label>
                
                {newChargeReceipt ? (
                  <div className="p-3 rounded-xl bg-slate-800 border border-emerald-500/30 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                        {newChargeReceipt.name.toLowerCase().endsWith('.pdf') ? (
                          <FileText size={18} />
                        ) : (
                          <Receipt size={18} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white truncate">{newChargeReceipt.name}</p>
                        <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 size={10} /> Receipt Attached
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setLightboxImage(newChargeReceipt.url)}
                        className="p-1.5 text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg text-xs transition-colors"
                        title="Preview"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewChargeReceipt(null)}
                        className="p-1.5 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-xs transition-colors"
                        title="Remove"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-white/15 hover:border-brand-400/50 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-slate-800/40 hover:bg-slate-800/80 transition-all text-center">
                    {isUploadingReceipt ? (
                      <Loader2 size={22} className="text-brand-400 animate-spin" />
                    ) : (
                      <UploadCloud size={22} className="text-gray-400" />
                    )}
                    <span className="text-xs font-medium text-gray-300">
                      {isUploadingReceipt ? 'Processing receipt...' : 'Click to browse or drop payment receipt / voucher'}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      Supports JPG, PNG, WEBP or PDF receipt document
                    </span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      disabled={isUploadingReceipt}
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setIsUploadingReceipt(true);
                        try {
                          const proc = await compressAndPrepareFile(file);
                          const dataUrl = proc?.dataUrl || proc?.base64 || '';
                          setNewChargeReceipt({ url: dataUrl, name: file.name });
                        } catch (err) {
                          console.warn("Failed compression, fallback to FileReader:", err);
                          const reader = new FileReader();
                          reader.onload = () => {
                            setNewChargeReceipt({ url: reader.result as string, name: file.name });
                          };
                          reader.readAsDataURL(file);
                        } finally {
                          setIsUploadingReceipt(false);
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Set as Default for Client Checkbox */}
              {selectedCase?.clientName && (
                <div className="p-3 bg-brand-500/10 border border-brand-500/20 rounded-xl">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveAsClientDefaultInModal}
                      onChange={(e) => setSaveAsClientDefaultInModal(e.target.checked)}
                      className="mt-0.5 rounded border-white/20 text-brand-500 focus:ring-brand-400 cursor-pointer"
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-brand-300 block">
                        Set as Default Charge for {selectedCase.clientName}
                      </span>
                      <span className="text-[11px] text-gray-300 leading-tight">
                        Ye charge is client ke aainda har case aur invoice par by default automatically apply hoga.
                      </span>
                    </div>
                  </label>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-white/10 bg-slate-950/50 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowAddChargeModal(false);
                  setIsAddingNewCategory(false);
                  setNewChargeReceipt(null);
                  setSaveAsClientDefaultInModal(false);
                }}
                className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!newChargeDesc.trim() || !newChargeAmount) return;
                  const active = selectedCase;
                  if (!active) return;
                  const currentCharges = (active.charges && active.charges.length > 0)
                    ? [...active.charges]
                    : [];
                  
                  const updatedCharges = [
                    ...currentCharges,
                    {
                      id: `chg_${Date.now()}`,
                      category: selectedChargeCategory || active.category,
                      description: newChargeDesc.trim(),
                      amount: parseFloat(newChargeAmount) || 0,
                      receiptUrl: newChargeReceipt?.url,
                      receiptName: newChargeReceipt?.name,
                    }
                  ];

                  const updatedCase = { ...active, charges: updatedCharges };
                  setCases(prev => prev.map(c => c.id === updatedCase.id ? updatedCase : c));
                  setSelectedCase(updatedCase);
                  if (isEditingCase) setEditedCase(updatedCase);
                  updateCaseInFirestore(updatedCase).catch(e => console.warn("Firestore charge error:", e));

                  // If checked, persist as client default
                  if (saveAsClientDefaultInModal && active.clientName) {
                    const clientObj = clientsData.find(c => c.name?.toLowerCase() === active.clientName?.toLowerCase());
                    if (clientObj) {
                      saveChargeAsClientDefault(clientObj, {
                        description: newChargeDesc.trim(),
                        amount: parseFloat(newChargeAmount) || 0,
                        category: selectedChargeCategory || active.category,
                        taxable: true
                      }).then(updatedClient => {
                        setClientsData(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
                        setDraftToast(`✓ Saved "${newChargeDesc.trim()}" as permanent default charge for ${active.clientName}!`);
                      }).catch(err => console.warn("Could not save client default:", err));
                    }
                  }

                  setShowAddChargeModal(false);
                  setSelectedChargeCategory('');
                  setNewChargeDesc('');
                  setNewChargeAmount('');
                  setNewChargeReceipt(null);
                  setIsAddingNewCategory(false);
                  setSaveAsClientDefaultInModal(false);
                }}
                disabled={!newChargeDesc.trim() || !newChargeAmount || isUploadingReceipt}
                className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-brand-600/30 flex items-center gap-1.5"
              >
                <Save size={15} />
                <span>Save Charge</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8-Step Streamlined Workflow Interactive Modal */}
      {showStepModal && selectedStepStatus && selectedCase && (
        <WorkflowStepModal
          isOpen={showStepModal}
          onClose={() => setShowStepModal(false)}
          targetCase={selectedCase}
          stepStatus={selectedStepStatus}
          stepIndex={stepModalIndex}
          userRole={effectiveRole}
          userRoles={effectiveRoles}
          onSaveCase={(updatedCase) => {
            setCases(prev => prev.map(c => c.id === updatedCase.id ? updatedCase : c));
            setSelectedCase(updatedCase);
            if (isEditingCase) setEditedCase(updatedCase);
            updateCaseInFirestore(updatedCase).catch(e => console.warn("Firestore step update error:", e));
          }}
          onReportIncident={(caseWithIncident) => {
            setCases(prev => prev.map(c => c.id === caseWithIncident.id ? caseWithIncident : c));
            setSelectedCase(caseWithIncident);
            if (isEditingCase) setEditedCase(caseWithIncident);
            updateCaseInFirestore(caseWithIncident).catch(e => console.warn("Firestore incident error:", e));
            setActiveWorkflowTab('incident_vault');
          }}
        />
      )}

      {/* Download Documents Modal - Clean List Format */}
      {showDownloadDocsModal && selectedCase && (
        <div 
          className="fixed inset-0 bg-black/80 z-[100] flex items-start justify-center pt-6 sm:pt-10 p-3 sm:p-5 backdrop-blur-sm no-print overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDownloadDocsModal(false);
          }}
        >
          <div className="bg-slate-900 rounded-2xl overflow-hidden max-w-2xl w-full border border-white/15 shadow-2xl animate-fade-in max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex justify-between items-center bg-slate-950/70 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-500/15 text-brand-400 flex items-center justify-center border border-brand-500/30">
                  <Download size={20} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <span>Download Case Documents</span>
                  </h3>
                  <p className="text-xs text-gray-400 font-mono">
                    Case No: <span className="text-amber-300 font-semibold">{selectedCase.caseNo}</span>
                    {selectedCase.clientName && <span> • Client: <span className="text-white font-medium">{selectedCase.clientName}</span></span>}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowDownloadDocsModal(false)}
                className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* List Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Available Documents List:
                </p>
                {isDownloadingPdf && (
                  <div className="flex items-center gap-1.5 text-xs text-brand-300 font-medium">
                    <Loader2 size={13} className="animate-spin text-brand-400" />
                    <span>Preparing download...</span>
                  </div>
                )}
              </div>

              {/* Status / Notice Banner */}
              {pdfDownloadSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between gap-3 text-xs text-emerald-300 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
                    <span>Downloaded: <strong className="font-mono text-white">{pdfDownloadSuccess}</strong></span>
                  </div>
                  <span className="text-[11px] text-gray-400">Saved to Downloads</span>
                </div>
              )}

              {pdfDownloadError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-xs text-red-300">
                  <AlertCircle size={16} className="shrink-0 text-red-400" />
                  <span>{pdfDownloadError}</span>
                </div>
              )}

              {/* Clean List of Documents */}
              <div className="divide-y divide-white/10 rounded-xl border border-white/10 bg-slate-950/50 overflow-hidden shadow-sm">
                
                {/* 1. Sabse upar Hoga: Case Detail */}
                <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-brand-500/15 text-brand-400 border border-brand-500/25 flex items-center justify-center shrink-0">
                      <FileText size={18} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">Case Detail</h4>
                      <p className="text-[11px] text-gray-400 truncate">Official Single-Page Case Summary, Dropdowns Form & Invoice Breakdown</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isDownloadingPdf}
                    onClick={() => handleDownloadPdfFile(selectedCase, { onlyCaseDetails: true, withInvoice: false, withAttachments: false })}
                    className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-brand-600/20 transition-all shrink-0 cursor-pointer active:scale-95"
                    title="Download Case Detail PDF"
                  >
                    <Download size={13} />
                    <span>Download</span>
                  </button>
                </div>

                {/* 2. Usse niche Hoga: Invoice */}
                <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/25 flex items-center justify-center shrink-0">
                      <Receipt size={18} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">Invoice</h4>
                      <p className="text-[11px] text-gray-400 truncate">Official Commercial Invoice & Itemized Service Charges</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isDownloadingPdf}
                    onClick={() => handleDownloadPdfFile(selectedCase, { onlyInvoice: true, withInvoice: true, withAttachments: false })}
                    className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-amber-600/20 transition-all shrink-0 cursor-pointer active:scale-95"
                    title="Download Commercial Invoice PDF"
                  >
                    <Download size={13} />
                    <span>Download</span>
                  </button>
                </div>

                {/* 3. Usse niche: Sare uploaded document honge jinke naam likhe a rahe honge aur aage download ka button hoga */}
                {selectedCase.documents && selectedCase.documents.length > 0 ? (
                  selectedCase.documents.map((doc: any, idx: number) => {
                    const docName = doc.name || ('Document_' + (idx + 1));
                    const docCategory = doc.docCategory || doc.type || 'Customs Document';
                    const docSrc = doc.url || (doc instanceof File ? URL.createObjectURL(doc) : '');

                    const handleDownloadUploadedDoc = () => {
                      if (!docSrc) return;
                      const a = document.createElement('a');
                      a.href = docSrc;
                      a.download = docName;
                      a.rel = 'noopener noreferrer';
                      document.body.appendChild(a);
                      a.click();
                      setTimeout(() => {
                        if (document.body.contains(a)) document.body.removeChild(a);
                      }, 400);
                    };

                    return (
                      <div key={idx} className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 flex items-center justify-center shrink-0">
                            <FileCheck size={18} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-white truncate" title={docName}>{docName}</h4>
                            <p className="text-[11px] text-gray-400 truncate">{docCategory}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleDownloadUploadedDoc}
                          disabled={!docSrc}
                          className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-cyan-600/20 transition-all shrink-0 cursor-pointer active:scale-95"
                          title={'Download ' + docName}
                        >
                          <Download size={13} />
                          <span>Download</span>
                        </button>
                      </div>
                    );
                  })
                ) : null}

                {/* Attached Payment Receipts if any */}
                {selectedCase.charges && selectedCase.charges.some((c: any) => c.receiptUrl) && (
                  selectedCase.charges.filter((c: any) => c.receiptUrl).map((ch: any, rIdx: number) => {
                    const rName = ch.receiptName || ('Receipt_' + (ch.description || 'Charge').replace(/\s+/g, '_') + '.png');
                    const handleDownloadReceipt = () => {
                      const a = document.createElement('a');
                      a.href = ch.receiptUrl;
                      a.download = rName;
                      a.rel = 'noopener noreferrer';
                      document.body.appendChild(a);
                      a.click();
                      setTimeout(() => {
                        if (document.body.contains(a)) document.body.removeChild(a);
                      }, 400);
                    };

                    return (
                      <div key={'rcp-' + rIdx} className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex items-center justify-center shrink-0">
                            <Receipt size={18} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-white truncate">{ch.description} (Receipt)</h4>
                            <p className="text-[11px] text-emerald-400 font-mono">PKR {Number(ch.amount || 0).toLocaleString()}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleDownloadReceipt}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all shrink-0 cursor-pointer active:scale-95"
                          title="Download Receipt"
                        >
                          <Download size={13} />
                          <span>Download</span>
                        </button>
                      </div>
                    );
                  })
                )}

                {/* Complete Unified Dossier */}
                <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors bg-brand-500/[0.04]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/25 flex items-center justify-center shrink-0">
                      <Layers size={18} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">Complete Unified Dossier</h4>
                      <p className="text-[11px] text-gray-400 truncate">Combined dossier containing Case Details, Invoice & all paperwork in 1 PDF</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isDownloadingPdf}
                    onClick={() => handleDownloadPdfFile(selectedCase, { withInvoice: true, withAttachments: true })}
                    className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-purple-600/20 transition-all shrink-0 cursor-pointer active:scale-95"
                    title="Download Complete Unified Dossier PDF"
                  >
                    <Download size={13} />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 border-t border-white/10 bg-slate-950/70 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowDownloadDocsModal(false)}
                className="px-5 py-2 rounded-xl text-xs sm:text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Print Options Modal (Universally available in Case Details & Management) */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm no-print" onClick={(e) => {
          if (e.target === e.currentTarget) setShowPrintModal(false);
        }}>
          <div className="bg-slate-900 rounded-2xl overflow-hidden max-w-md w-full border border-white/15 shadow-2xl animate-fade-in">
            <div className="p-5 sm:p-6 border-b border-white/10 flex justify-between items-center bg-slate-950/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center border border-brand-500/20">
                  <Download size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Export Dossier (PDF)</h3>
                  <p className="text-xs text-gray-400">Select components for official PDF document export</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPrintModal(false)} 
                className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-3">
               <label className="flex items-start gap-3 p-3.5 rounded-xl border border-white/10 hover:border-brand-500/40 hover:bg-white/5 cursor-pointer transition-all bg-white/[0.02]">
                  <input 
                    type="checkbox" 
                    checked={printOptions.withAttachments} 
                    onChange={(e) => setPrintOptions({...printOptions, withAttachments: e.target.checked})} 
                    className="w-5 h-5 accent-brand-500 rounded mt-0.5" 
                  />
                  <div>
                    <p className="text-white font-medium text-sm">Include Attached Files & Documents</p>
                    <p className="text-gray-400 text-xs mt-0.5">Attach copies of scanned BL, GD, and custom documents</p>
                  </div>
               </label>
               
               <label className="flex items-start gap-3 p-3.5 rounded-xl border border-white/10 hover:border-brand-500/40 hover:bg-white/5 cursor-pointer transition-all bg-white/[0.02]">
                  <input 
                    type="checkbox" 
                    checked={printOptions.withInvoice} 
                    onChange={(e) => setPrintOptions({...printOptions, withInvoice: e.target.checked, onlyInvoice: false})} 
                    className="w-5 h-5 accent-brand-500 rounded mt-0.5" 
                  />
                  <div>
                    <p className="text-white font-medium text-sm">Include Commercial Invoice</p>
                    <p className="text-gray-400 text-xs mt-0.5">Append freight terminal charges and official payment voucher</p>
                  </div>
               </label>

               <label className="flex items-start gap-3 p-3.5 rounded-xl border border-white/10 hover:border-brand-500/40 hover:bg-white/5 cursor-pointer transition-all bg-white/[0.02]">
                  <input 
                    type="checkbox" 
                    checked={printOptions.onlyInvoice} 
                    onChange={(e) => {
                        setPrintOptions({ withAttachments: false, withInvoice: false, onlyInvoice: e.target.checked });
                    }} 
                    className="w-5 h-5 accent-brand-500 rounded mt-0.5" 
                  />
                  <div>
                    <p className="text-white font-medium text-sm">Invoice Only</p>
                    <p className="text-gray-400 text-xs mt-0.5">Print only the commercial freight invoice without case details</p>
                  </div>
               </label>

               {/* In-progress status banner */}
               {isDownloadingPdf && (
                 <div className="p-3 bg-brand-500/10 border border-brand-500/30 rounded-xl flex items-center gap-3 text-brand-300 text-xs animate-pulse">
                    <Loader2 size={18} className="animate-spin text-brand-400 shrink-0" />
                    <span>Generating & downloading PDF...</span>
                 </div>
               )}

               {/* Success notification banner */}
               {pdfDownloadSuccess && (
                 <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl space-y-1.5 text-xs text-emerald-300 animate-fade-in">
                    <div className="flex items-center gap-2">
                       <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                       <span className="font-semibold text-white">File successfully downloaded! ({pdfDownloadSuccess})</span>
                    </div>
                    <p className="text-gray-300 text-[11px] pl-6">
                      The PDF is saved in your mobile Downloads folder.
                    </p>
                    {directDownloadUrl && (
                      <div className="pl-6 pt-1">
                        <a 
                          href={directDownloadUrl} 
                          download={directDownloadFilename}
                          className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 underline font-bold"
                        >
                          <Download size={13} /> Tap here to download again
                        </a>
                      </div>
                    )}
                 </div>
               )}

               {/* Error notification banner */}
               {pdfDownloadError && (
                 <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-300 text-xs">
                    <AlertCircle size={18} className="text-red-400 shrink-0" />
                    <span>{pdfDownloadError}</span>
                 </div>
               )}
            </div>

            <div className="p-4 sm:p-5 bg-black/40 border-t border-white/10 flex flex-wrap justify-between items-center gap-3">
              <button 
                type="button"
                onClick={() => {
                  setShowPrintModal(false);
                  setPdfDownloadSuccess(null);
                  setPdfDownloadError(null);
                }} 
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Close
              </button>
              
              <div className="flex items-center gap-2">
                {/* Primary: Real PDF File Download */}
                <button 
                  type="button"
                  disabled={isDownloadingPdf}
                  onClick={() => handleDownloadPdfFile(selectedCase)} 
                  className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-60 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-emerald-600/30 flex items-center gap-2 text-sm transition-all"
                  id="btn-download-pdf-dossier"
                >
                   {isDownloadingPdf ? (
                     <>
                       <Loader2 size={16} className="animate-spin" />
                       <span>Downloading...</span>
                     </>
                   ) : (
                     <>
                       <Download size={16} />
                       <span>Download & Save PDF</span>
                     </>
                   )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pakistan Customs & International Logistics Statutory Compliance Guide Modal */}
      {showCustomsGuideModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center pt-6 sm:pt-10 p-3 sm:p-6 overflow-y-auto animate-in fade-in">
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 bg-black/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <FileCheck size={22} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <span>Pakistan Customs Act & Regulatory Compliance Guide</span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono px-2 py-0.5 rounded border border-amber-500/30">
                      FBR / WeBOC / PSW
                    </span>
                  </h3>
                  <p className="text-xs text-gray-400">
                    Statutory acts, required documents, procedures & standard tariffs for all 10 logistics services
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowCustomsGuideModal(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Body: Left Categories List, Right Details */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
              {/* Categories Sidebar */}
              <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/10 overflow-y-auto bg-black/20 p-2 space-y-1 shrink-0">
                {CATEGORIES.map(cat => {
                  const isSelected = activeGuideCategory === cat;
                  const item = PAKISTAN_CUSTOMS_COMPLIANCE[cat];
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveGuideCategory(cat)}
                      className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-center justify-between ${
                        isSelected 
                          ? 'bg-amber-500/20 border border-amber-500/40 text-amber-200 font-semibold shadow-sm' 
                          : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <div className="truncate min-w-0 pr-2">
                        <p className="truncate">{cat}</p>
                        {item && (
                          <p className="text-[10px] text-gray-500 font-mono truncate">
                            {item.id.toUpperCase()}
                          </p>
                        )}
                      </div>
                      {isSelected && <ChevronRight size={14} className="text-amber-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Selected Service Compliance Breakdown */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-900/40">
                {PAKISTAN_CUSTOMS_COMPLIANCE[activeGuideCategory] ? (
                  (() => {
                    const detail = PAKISTAN_CUSTOMS_COMPLIANCE[activeGuideCategory];
                    return (
                      <div className="space-y-5">
                        {/* Title & Acts Badge */}
                        <div className="space-y-2 border-b border-white/10 pb-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h4 className="text-lg font-bold text-white flex items-center gap-2">
                              <span>{detail.name}</span>
                            </h4>
                            <span className="text-xs bg-amber-500/20 text-amber-300 font-mono px-2.5 py-1 rounded-full border border-amber-500/30">
                              {detail.legalAct}
                            </span>
                          </div>
                          <p className="text-xs text-brand-300 font-medium font-mono">
                            Statutory Reference: {detail.customsRulesRef}
                          </p>
                        </div>

                        {/* Procedure Summary */}
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-1.5">
                          <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider">Customs & Regulatory Procedure</p>
                          <p className="text-xs sm:text-sm text-gray-200 leading-relaxed">
                            {detail.procedureSummary}
                          </p>
                        </div>

                        {/* Mandatory Fields & Compliance Checklist */}
                        <div className="space-y-2">
                          <p className="text-xs text-gray-300 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                            <FileCheck size={14} className="text-emerald-400" />
                            <span>Mandatory Documents & Data Required by Law:</span>
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {detail.mandatoryFields.map((field, idx) => (
                              <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-black/40 border border-white/5 text-xs text-gray-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                                <span>{field}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Standard Tariff & Billing Heads */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-300 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                              <FileText size={14} className="text-amber-400" />
                              <span>Statutory & Standard Tariff Heads (PKR):</span>
                            </p>
                            <span className="text-xs font-mono font-bold text-amber-400">
                              Total: PKR {detail.standardTariff.reduce((sum, ch) => sum + ch.amount, 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="rounded-xl border border-white/10 overflow-hidden bg-black/30">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-white/5 text-gray-400 font-semibold uppercase border-b border-white/10">
                                <tr>
                                  <th className="p-2.5">Billing Description</th>
                                  <th className="p-2.5 text-right">Standard Rate (PKR)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5">
                                {detail.standardTariff.map((ch, idx) => (
                                  <tr key={idx} className="hover:bg-white/5">
                                    <td className="p-2.5 text-gray-200">{ch.description}</td>
                                    <td className="p-2.5 text-right font-mono font-semibold text-emerald-400">
                                      PKR {ch.amount.toLocaleString()}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="p-8 text-center text-gray-400 text-sm">
                    Select a category to view its Pakistan Customs statutory compliance specifications.
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 sm:p-4 border-t border-white/10 bg-black/40 flex justify-between items-center text-xs text-gray-400">
              <span className="font-mono">Pakistan Customs Act 1969 & Customs Rules 2001 (SROs 450(I)/2001)</span>
              <button 
                type="button"
                onClick={() => setShowCustomsGuideModal(false)}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-1.5 rounded-lg transition-colors font-medium"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Port Modal (In-flow without leaving page) */}
      {showPortModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center pt-8 sm:pt-14 p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="glass-card p-5 sm:p-6 rounded-2xl w-full max-w-md border border-white/10 shadow-2xl bg-slate-900/95 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-white/10">
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Anchor size={20} className="text-brand-400" />
                <span>Add Port / Terminal</span>
              </h3>
              <button 
                type="button"
                onClick={() => { setShowPortModal(false); setPortTargetField(null); }}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-400">
              Add a new port or terminal to the system. It will immediately be saved to the global port directory and appear in all search suggestions and dropdowns for both POL and POD.
            </p>

            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">
                  Port / Terminal Name <span className="text-red-400">*</span>
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. Gwadar Deep Sea Port / Sialkot Dry Port / Hub Terminal" 
                  value={newPortName}
                  onChange={(e) => setNewPortName(e.target.value)}
                  className="w-full glass-input rounded-xl p-3 outline-none text-white text-sm bg-black/50 border border-white/15 focus:border-brand-400"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1">
                    Port Code / Acronym
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. GWD, SKT" 
                    value={newPortCode}
                    onChange={(e) => setNewPortCode(e.target.value.toUpperCase())}
                    className="w-full glass-input rounded-xl p-3 outline-none text-white text-sm bg-black/50 border border-white/15 focus:border-brand-400 uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1">
                    Port Type
                  </label>
                  <select
                    value={newPortType}
                    onChange={(e) => setNewPortType(e.target.value)}
                    className="w-full glass-input rounded-xl p-3 outline-none text-white text-sm bg-black/50 border border-white/15 focus:border-brand-400"
                  >
                    <option value="Dry Port" className="bg-slate-900">Dry Port (Inland)</option>
                    <option value="Sea Port" className="bg-slate-900">Sea Port (Coastal)</option>
                    <option value="Border Terminal" className="bg-slate-900">Border Terminal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">
                  Destination Selection
                </label>
                <select
                  value={portTargetField || 'all'}
                  onChange={(e) => setPortTargetField(e.target.value === 'all' ? null : (e.target.value as 'pol' | 'pod'))}
                  className="w-full glass-input rounded-xl p-3 outline-none text-white text-sm bg-black/50 border border-white/15 focus:border-brand-400 cursor-pointer"
                >
                  <option value="all" className="bg-slate-900">🌐 Add to All Port Lists (Available in POL & POD)</option>
                  <option value="pol" className="bg-slate-900">⚓ Add to All Lists & Select as Port of Loading (POL)</option>
                  <option value="pod" className="bg-slate-900">📍 Add to All Lists & Select as Port of Destination (POD)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button 
                type="button"
                onClick={() => { setShowPortModal(false); setPortTargetField(null); }}
                className="flex-1 bg-white/10 hover:bg-white/15 text-gray-300 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-colors"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={() => handleAddPort()}
                disabled={!newPortName.trim()}
                className="flex-1 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white py-2.5 rounded-xl font-semibold text-xs sm:text-sm shadow-lg shadow-brand-600/20 transition-all flex items-center justify-center gap-1.5"
              >
                <Plus size={16} /> {portTargetField ? 'Add & Select Port' : 'Save Port to All Lists'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Featured Client Registration & Default Tariff Modal */}
      <ClientRegistrationModal
        isOpen={showAddClientModal}
        onClose={() => setShowAddClientModal(false)}
        defaultCategory={formData.category || 'Bonded Carrier'}
        onSave={(client, appliedCharges) => {
          setClientsData(prev => [client, ...prev.filter(c => c.name.toLowerCase() !== client.name.toLowerCase())]);
          setRegisteredClients(prev => Array.from(new Set([client.name, ...prev])));

          // Apply saved default arrangements to formData
          const newArrangements = { ...formData.serviceArrangements };
          if (client.defaultServiceArrangements) {
            Object.entries(client.defaultServiceArrangements).forEach(([key, val]) => {
              if (newArrangements[key]) {
                newArrangements[key] = {
                  ...newArrangements[key],
                  arrangedBy: val
                };
              }
            });
          }

          setFormData(prev => ({
            ...prev,
            client: client.name,
            category: client.defaultCaseCategory || prev.category || 'Bonded Carrier',
            serviceArrangements: newArrangements,
            charges: appliedCharges.length > 0 ? appliedCharges : prev.charges
          }));

          setIsOtherClient(false);
          setOtherClientName('');
          setShowAddClientModal(false);
          setDraftToast(`✓ Client "${client.name}" registered with default tariff and service arrangements applied!`);
        }}
      />

      {/* Smart Case Search & Advanced Query Modal */}
      <SmartCaseSearchModal
        isOpen={showSmartSearchModal}
        onClose={() => setShowSmartSearchModal(false)}
        cases={cases}
        clients={clientsData}
        onSelectCase={(caseItem) => {
          setSelectedCase(caseItem);
          setView('details');
        }}
      />

      {/* Dedicated In-App PDF Viewer Modal */}
      <PdfViewerModal
        isOpen={isPdfViewerOpen}
        onClose={() => setIsPdfViewerOpen(false)}
        pdfUrl={directDownloadUrl}
        filename={directDownloadFilename}
        title={printOptions.onlyInvoice ? "Invoice" : "Case Details"}
      />

      {/* Admin Approval Request Modal for Finished Cases */}
      {showApprovalPromptModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center pt-8 sm:pt-14 p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="glass-card p-6 rounded-2xl w-full max-w-lg border border-amber-500/30 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-amber-400 font-bold text-base">
                <ShieldCheck size={20} className="text-amber-400" />
                <span>Admin Approval Required</span>
              </div>
              <button onClick={() => setShowApprovalPromptModal(false)} className="text-gray-400 hover:text-white p-1">
                <X size={18} />
              </button>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-200 space-y-1">
              <p className="font-semibold text-white">This case has finished its operational lifecycle.</p>
              <p className="text-gray-300 leading-relaxed">
                Under company operating rules, any <span className="text-amber-300 font-bold uppercase">{approvalTargetAction}</span> action on a completed case requires Super Admin review and authorization.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300 block">
                Reason / Justification for {approvalTargetAction} *
              </label>
              <textarea
                rows={3}
                placeholder={`Explain why this completed case needs to be ${approvalTargetAction.toLowerCase()}ed...`}
                value={approvalReason}
                onChange={(e) => setApprovalReason(e.target.value)}
                className="w-full bg-black/40 border border-white/15 rounded-xl p-3 text-white text-xs sm:text-sm outline-none focus:border-amber-400 placeholder:text-gray-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowApprovalPromptModal(false)}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm text-gray-300 hover:text-white hover:bg-white/5 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!approvalReason.trim() || isSubmittingApproval}
                onClick={handleSubmitFinishedCaseApproval}
                className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition shadow-lg shadow-amber-600/30 flex items-center gap-1.5"
              >
                {isSubmittingApproval ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
                <span>Submit for Approval</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CaseManagement;