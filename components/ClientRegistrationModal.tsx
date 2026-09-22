import React, { useState, useEffect } from 'react';
import { 
  Building, User, Phone, Mail, MapPin, FileText, DollarSign, Plus, Trash2, 
  Check, X, Upload, Eye, Search, AlertCircle, Shield, CheckCircle2, ChevronRight, 
  CreditCard, Sparkles, Key, Lock, FileCheck
} from 'lucide-react';
import { Client, ClientDefaultCharge, CaseCharge, UNIVERSAL_CHARGE_TYPES } from '../types';
import { 
  CATEGORY_SERVICE_ARRANGEMENTS, 
  getCategoryArrangements, 
  normalizeCategoryKey 
} from '../services/categoryTariffService';
import { saveClientToFirestore } from '../services/dbService';
import { compressAndPrepareFile } from '../services/fileUtils';

export const CASE_CATEGORIES_LIST = [
  "Bonded Carrier",
  "Afghan Transit",
  "Import & Export Services",
  "Transportation of Private Cargo",
  "TIR",
  "Customs Clearance",
  "ISO Tank Service",
  "Car Carrier",
  "Liner & NVOCC",
  "Breakbulk/Chartering Services",
  "Warehousing & Distribution"
];

interface ClientRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (client: Client, appliedCharges: CaseCharge[]) => void;
  initialClient?: Client | null;
  defaultCategory?: string;
}

export const ClientRegistrationModal: React.FC<ClientRegistrationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialClient,
  defaultCategory = 'Bonded Carrier'
}) => {
  // Section 1: Client / Company Details
  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [cnic, setCnic] = useState('');
  const [officeAddress, setOfficeAddress] = useState('');
  const [contact, setContact] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [email, setEmail] = useState('');
  const [ntn, setNtn] = useState('');
  const [strn, setStrn] = useState('');

  // Documents
  const [businessCardUrl, setBusinessCardUrl] = useState('');
  const [businessCardName, setBusinessCardName] = useState('');
  const [contractLetterUrl, setContractLetterUrl] = useState('');
  const [contractLetterName, setContractLetterName] = useState('');
  const [nicDocUrl, setNicDocUrl] = useState('');
  const [nicDocName, setNicDocName] = useState('');
  const [ntnDocUrl, setNtnDocUrl] = useState('');
  const [ntnDocName, setNtnDocName] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  // Section 2: Default Case Category & Service Arrangements
  const [selectedCategory, setSelectedCategory] = useState('Bonded Carrier');
  const [arrangements, setArrangements] = useState<Record<string, 'DPL' | 'Client'>>({});

  // Section 3: Finance & Default Charges
  const [chargesList, setChargesList] = useState<ClientDefaultCharge[]>([]);

  // Optional Portal Login Credentials
  const [loginEnabled, setLoginEnabled] = useState(false);
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');

  // Secondary Modal: Add Charge Picker
  const [showChargePicker, setShowChargePicker] = useState(false);
  const [chargeSearch, setChargeSearch] = useState('');
  const [selectedPickerCharges, setSelectedPickerCharges] = useState<Record<string, boolean>>({});
  const [customChargeInput, setCustomChargeInput] = useState('');
  const [allAvailableCharges, setAllAvailableCharges] = useState<Array<{ id: string; name: string; category: string; defaultAmount: number }>>([]);

  // Preview Doc Modal
  const [previewDoc, setPreviewDoc] = useState<{ url: string; name: string } | null>(null);

  // Initialize or reset form on open
  useEffect(() => {
    if (!isOpen) return;

    if (initialClient) {
      setName(initialClient.name || '');
      setOwnerName(initialClient.ownerName || '');
      setCnic(initialClient.cnic || '');
      setOfficeAddress(initialClient.officeAddress || '');
      setContact(initialClient.contact || '');
      setMobileNumber(initialClient.mobileNumber || '');
      setWhatsappNumber(initialClient.whatsappNumber || initialClient.mobileNumber || '');
      setEmail(initialClient.email || '');
      setNtn(initialClient.ntn || '');
      setStrn(initialClient.strn || '');
      setBusinessCardUrl(initialClient.businessCardUrl || '');
      setContractLetterUrl(initialClient.contractLetterUrl || '');
      setNicDocUrl(initialClient.nicDocUrl || '');
      setNtnDocUrl(initialClient.ntnDocUrl || '');
      setNtnDocName(initialClient.ntnDocName || '');
      
      const cat = initialClient.defaultCaseCategory || defaultCategory;
      setSelectedCategory(cat);
      
      // Load arrangements
      const baseArr = getCategoryArrangements(cat);
      const initialArr: Record<string, 'DPL' | 'Client'> = {};
      Object.entries(baseArr).forEach(([key, item]) => {
        initialArr[key] = (initialClient.defaultServiceArrangements && initialClient.defaultServiceArrangements[key]) 
          ? initialClient.defaultServiceArrangements[key] 
          : (item.isDefaultDpl ? 'DPL' : 'Client');
      });
      setArrangements(initialArr);

      setChargesList(initialClient.defaultCharges || []);
      setLoginEnabled(Boolean(initialClient.loginEnabled));
      setUserId(initialClient.userId || `CLT-${Date.now().toString().slice(-4)}`);
      setPassword(initialClient.password || 'client123');
    } else {
      // Fresh client creation
      setName('');
      setOwnerName('');
      setCnic('');
      setOfficeAddress('');
      setContact('');
      setMobileNumber('');
      setWhatsappNumber('');
      setEmail('');
      setNtn('');
      setStrn('');
      setBusinessCardUrl('');
      setBusinessCardName('');
      setContractLetterUrl('');
      setContractLetterName('');
      setNicDocUrl('');
      setNicDocName('');
      setNtnDocUrl('');
      setNtnDocName('');

      const cat = defaultCategory;
      setSelectedCategory(cat);

      // Load arrangements for category
      const baseArr = getCategoryArrangements(cat);
      const initialArr: Record<string, 'DPL' | 'Client'> = {};
      Object.entries(baseArr).forEach(([key, item]) => {
        initialArr[key] = item.isDefaultDpl ? 'DPL' : 'Client';
      });
      setArrangements(initialArr);

      // Build initial category charges
      populateCategoryCharges(cat);

      setLoginEnabled(false);
      setUserId(`CLT-${Math.floor(1000 + Math.random() * 9000)}`);
      setPassword(`DPL@${Math.floor(100 + Math.random() * 900)}`);
    }
  }, [isOpen, initialClient, defaultCategory]);

  // Build category default charges
  const populateCategoryCharges = (cat: string) => {
    const normKey = normalizeCategoryKey(cat);
    const catArrangements = CATEGORY_SERVICE_ARRANGEMENTS[normKey] || CATEGORY_SERVICE_ARRANGEMENTS['Bonded Carrier'];
    
    // Automatically open the charges specific to this category
    const initialList: ClientDefaultCharge[] = Object.entries(catArrangements).map(([key, item]) => {
      // For Bonded Carrier: TP charges default with amount
      // For Private Cargo: Loading & Unloading default with amount
      const isDefaultByRule = item.isDefaultDpl || (normKey === 'Transportation of Private Cargo' && (key.includes('loading') || key.includes('unloading')));
      return {
        id: `chg_${key}_${Date.now()}`,
        category: cat,
        description: item.label,
        defaultAmount: isDefaultByRule ? item.amount : 0, // 0 means user can enter amount to make it active default
        taxable: isDefaultByRule
      };
    });

    setChargesList(initialList);
  };

  // When category dropdown changes
  const handleCategoryChange = (newCat: string) => {
    setSelectedCategory(newCat);
    const baseArr = getCategoryArrangements(newCat);
    const newArr: Record<string, 'DPL' | 'Client'> = {};
    Object.entries(baseArr).forEach(([key, item]) => {
      newArr[key] = item.isDefaultDpl ? 'DPL' : 'Client';
    });
    setArrangements(newArr);
    populateCategoryCharges(newCat);
  };

  // Master charge pool for the charge picker
  useEffect(() => {
    const poolMap = new Map<string, { id: string; name: string; category: string; defaultAmount: number }>();

    // Add universal charges
    UNIVERSAL_CHARGE_TYPES.forEach(ch => {
      poolMap.set(ch.name.toLowerCase(), {
        id: ch.id,
        name: ch.name,
        category: 'Universal Charges',
        defaultAmount: ch.defaultAmount
      });
    });

    // Add all category arrangements
    Object.entries(CATEGORY_SERVICE_ARRANGEMENTS).forEach(([catName, arrMap]) => {
      Object.entries(arrMap).forEach(([k, item]) => {
        const lower = item.label.toLowerCase();
        if (!poolMap.has(lower)) {
          poolMap.set(lower, {
            id: `cat_${catName}_${k}`,
            name: item.label,
            category: catName,
            defaultAmount: item.amount
          });
        }
      });
    });

    setAllAvailableCharges(Array.from(poolMap.values()));
  }, []);

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'card' | 'contract' | 'nic' | 'ntn') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(target);
    try {
      const processed = await compressAndPrepareFile(file);
      if (target === 'card') {
        setBusinessCardUrl(processed.dataUrl);
        setBusinessCardName(processed.name);
      } else if (target === 'contract') {
        setContractLetterUrl(processed.dataUrl);
        setContractLetterName(processed.name);
      } else if (target === 'nic') {
        setNicDocUrl(processed.dataUrl);
        setNicDocName(processed.name);
      } else if (target === 'ntn') {
        setNtnDocUrl(processed.dataUrl);
        setNtnDocName(processed.name);
      }
    } catch (err) {
      console.warn('File upload warning:', err);
    } finally {
      setUploadingDoc(null);
    }
  };

  // Toggle Arrangement for a specific field
  const toggleArrangement = (key: string, value: 'DPL' | 'Client') => {
    setArrangements(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Open Charge Picker Modal
  const handleOpenChargePicker = () => {
    // Pre-tick charges that are already in the list
    const preSelected: Record<string, boolean> = {};
    chargesList.forEach(c => {
      preSelected[c.description.toLowerCase()] = true;
    });
    setSelectedPickerCharges(preSelected);
    setShowChargePicker(true);
  };

  // Add custom charge on the fly inside charge picker
  const handleAddCustomChargeOnFly = () => {
    if (!customChargeInput.trim()) return;
    const nameTrimmed = customChargeInput.trim();
    const newItem = {
      id: `custom_${Date.now()}`,
      name: nameTrimmed,
      category: selectedCategory,
      defaultAmount: 5000
    };

    setAllAvailableCharges(prev => [newItem, ...prev]);
    setSelectedPickerCharges(prev => ({ ...prev, [nameTrimmed.toLowerCase()]: true }));
    setCustomChargeInput('');
  };

  // Apply selected charges from picker
  const handleApplyChargesFromPicker = () => {
    const updatedCharges = [...chargesList];
    const existingDescSet = new Set(chargesList.map(c => c.description.toLowerCase()));

    allAvailableCharges.forEach(item => {
      const isSelected = selectedPickerCharges[item.name.toLowerCase()];
      if (isSelected && !existingDescSet.has(item.name.toLowerCase())) {
        updatedCharges.push({
          id: `chg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          category: item.category || selectedCategory,
          description: item.name,
          defaultAmount: item.defaultAmount || 0,
          taxable: true
        });
      }
    });

    setChargesList(updatedCharges);
    setShowChargePicker(false);
  };

  // Save client and tariff
  const handleSave = async () => {
    if (!name.trim()) {
      alert('Please enter Client / Company Title');
      return;
    }

    const clientId = initialClient?.id || `client_${Date.now()}`;
    const trimmedName = name.trim();

    // User's crucial rule:
    // "Koi bhi client case register karte waqt add kiya jaega to usmein by default charges mein pahli bar ek amount likhna zaruri hai Varna koi charges by default nahi honge jab tak unmen ek amount dal jaege phir woh charges default hojaeinge"
    // Only save charges where amount > 0 as default charges!
    const validDefaultCharges: ClientDefaultCharge[] = chargesList
      .filter(c => (Number(c.defaultAmount) || 0) > 0)
      .map(c => ({
        id: c.id,
        category: c.category || selectedCategory,
        description: c.description,
        defaultAmount: Number(c.defaultAmount) || 0,
        taxable: c.taxable ?? false
      }));

    const clientToSave: Client = {
      id: clientId,
      name: trimmedName,
      ownerName: ownerName.trim(),
      cnic: cnic.trim(),
      officeAddress: officeAddress.trim(),
      contact: contact.trim() || mobileNumber.trim(),
      mobileNumber: mobileNumber.trim(),
      whatsappNumber: whatsappNumber.trim() || mobileNumber.trim(),
      email: email.trim(),
      ntn: ntn.trim(),
      strn: strn.trim(),
      businessCardUrl: businessCardUrl || undefined,
      contractLetterUrl: contractLetterUrl || undefined,
      nicDocUrl: nicDocUrl || undefined,
      ntnDocUrl: ntnDocUrl || undefined,
      ntnDocName: ntnDocName || undefined,
      defaultCaseCategory: selectedCategory,
      defaultServiceArrangements: arrangements,
      defaultCharges: validDefaultCharges,
      loginEnabled: loginEnabled,
      userId: loginEnabled ? userId : undefined,
      password: loginEnabled ? password : undefined,
      createdAt: initialClient?.createdAt || new Date().toISOString()
    };

    try {
      await saveClientToFirestore(clientToSave);
    } catch (err) {
      console.warn("Could not save client to Firestore:", err);
    }

    // Convert valid default charges to CaseCharge array for instant application
    const appliedCharges: CaseCharge[] = validDefaultCharges.map((ch, idx) => ({
      id: `chg_app_${Date.now()}_${idx}`,
      category: ch.category || selectedCategory,
      description: ch.description,
      amount: Number(ch.defaultAmount) || 0,
      taxable: ch.taxable ?? false,
      arrangedBy: 'DPL'
    }));

    onSave(clientToSave, appliedCharges);
  };

  if (!isOpen) return null;

  const filteredPickerCharges = allAvailableCharges.filter(c => {
    if (!chargeSearch.trim()) return true;
    const q = chargeSearch.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q);
  });

  const activeDefaultChargesCount = chargesList.filter(c => (Number(c.defaultAmount) || 0) > 0).length;
  const totalDefaultAmount = chargesList.reduce((sum, c) => sum + (Number(c.defaultAmount) || 0), 0);

  const currentCategoryArrangements = getCategoryArrangements(selectedCategory);

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="glass-card rounded-2xl w-full max-w-4xl border border-white/15 shadow-2xl bg-slate-900/95 my-auto max-h-[94vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex justify-between items-center bg-slate-950/70 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-brand-400 shrink-0 shadow-lg">
              <Building size={22} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>{initialClient ? 'Edit Client & Default Tariff' : 'Register New Client & Default Tariff'}</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                  Auto-Billing Profile
                </span>
              </h3>
              <p className="text-xs text-gray-400">
                Setup client details, default case category arrangements (DPL vs Client), and default charges tariff
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 custom-scrollbar text-sm">
          
          {/* ========================================================================= */}
          {/* SECTION 1: CLIENT / COMPANY DETAILS & DOCUMENTS */}
          {/* ========================================================================= */}
          <div className="space-y-4 bg-white/5 p-4 rounded-2xl border border-white/10">
            <div className="flex items-center gap-2 text-xs font-bold text-brand-300 uppercase tracking-wider">
              <User size={15} />
              <span>1. Client Details & KYC Documents</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              <div className="sm:col-span-2 lg:col-span-2">
                <label className="text-xs font-medium text-gray-300 block mb-1">
                  Company Title / Business Name <span className="text-red-400">*</span>
                </label>
                <input 
                  type="text"
                  placeholder="e.g. Al-Madina Logistics & Afghan Trading Co."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full glass-input rounded-xl p-2.5 outline-none text-white text-sm bg-black/40 border border-white/15 focus:border-brand-400"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-300 block mb-1">
                  Owner / CEO Name
                </label>
                <input 
                  type="text"
                  placeholder="e.g. Haji Gul Muhammad"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full glass-input rounded-xl p-2.5 outline-none text-white text-sm bg-black/40 border border-white/15 focus:border-brand-400"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-300 block mb-1">
                  Owner NIC / CNIC
                </label>
                <input 
                  type="text"
                  placeholder="e.g. 42101-1234567-1"
                  value={cnic}
                  onChange={(e) => setCnic(e.target.value)}
                  className="w-full glass-input rounded-xl p-2.5 outline-none text-white text-sm bg-black/40 border border-white/15 focus:border-brand-400"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-300 block mb-1">
                  Primary Contact / Phone
                </label>
                <input 
                  type="text"
                  placeholder="e.g. 021-32415555"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className="w-full glass-input rounded-xl p-2.5 outline-none text-white text-sm bg-black/40 border border-white/15 focus:border-brand-400"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-300 block mb-1">
                  Mobile Number
                </label>
                <input 
                  type="text"
                  placeholder="e.g. 0300-1234567"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="w-full glass-input rounded-xl p-2.5 outline-none text-white text-sm bg-black/40 border border-white/15 focus:border-brand-400"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-300 block mb-1">
                  WhatsApp Number
                </label>
                <input 
                  type="text"
                  placeholder="e.g. 0300-1234567"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  className="w-full glass-input rounded-xl p-2.5 outline-none text-white text-sm bg-black/40 border border-white/15 focus:border-brand-400"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-300 block mb-1">
                  Email Address
                </label>
                <input 
                  type="email"
                  placeholder="e.g. info@almadinalogistics.pk"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full glass-input rounded-xl p-2.5 outline-none text-white text-sm bg-black/40 border border-white/15 focus:border-brand-400"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-300 block mb-1">
                  NTN / Tax ID
                </label>
                <input 
                  type="text"
                  placeholder="e.g. 1234567-8"
                  value={ntn}
                  onChange={(e) => setNtn(e.target.value)}
                  className="w-full glass-input rounded-xl p-2.5 outline-none text-white text-sm bg-black/40 border border-white/15 focus:border-brand-400"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-300 block mb-1">
                  STRN (Sales Tax Reg)
                </label>
                <input 
                  type="text"
                  placeholder="e.g. 17-00-1234567"
                  value={strn}
                  onChange={(e) => setStrn(e.target.value)}
                  className="w-full glass-input rounded-xl p-2.5 outline-none text-white text-sm bg-black/40 border border-white/15 focus:border-brand-400"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="text-xs font-medium text-gray-300 block mb-1">
                  Office / Business Address
                </label>
                <input 
                  type="text"
                  placeholder="e.g. Suite # 301, Trade Center, I.I. Chundrigar Road, Karachi"
                  value={officeAddress}
                  onChange={(e) => setOfficeAddress(e.target.value)}
                  className="w-full glass-input rounded-xl p-2.5 outline-none text-white text-sm bg-black/40 border border-white/15 focus:border-brand-400"
                />
              </div>
            </div>

            {/* Document Uploads: Business Card, Contract Letter, CNIC, NTN */}
            <div className="pt-3 border-t border-white/10">
              <label className="text-xs font-bold text-gray-300 block mb-2">
                Attached Documents (Business Card, Contract Letter, CNIC Copy, NTN Certificate)
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Business Card Upload */}
                <div className="p-3 bg-black/30 border border-white/10 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                      <CreditCard size={14} className="text-blue-400" /> Business Card
                    </span>
                    {businessCardUrl && (
                      <button
                        type="button"
                        onClick={() => setPreviewDoc({ url: businessCardUrl, name: businessCardName || 'Business Card' })}
                        className="text-[11px] text-brand-400 hover:text-brand-300 flex items-center gap-1"
                      >
                        <Eye size={12} /> View
                      </button>
                    )}
                  </div>
                  <label className="flex flex-col items-center justify-center p-2.5 border border-dashed border-white/20 hover:border-brand-400 rounded-lg cursor-pointer bg-white/5 hover:bg-white/10 transition text-center">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'card')}
                    />
                    <Upload size={16} className="text-gray-400 mb-1" />
                    <span className="text-[11px] text-gray-300 font-medium truncate max-w-full">
                      {uploadingDoc === 'card' ? 'Processing...' : businessCardName || (businessCardUrl ? 'Replace Card' : 'Upload Card')}
                    </span>
                  </label>
                </div>

                {/* Contract Letter Upload */}
                <div className="p-3 bg-black/30 border border-white/10 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                      <FileText size={14} className="text-emerald-400" /> Contract Letter
                    </span>
                    {contractLetterUrl && (
                      <button
                        type="button"
                        onClick={() => setPreviewDoc({ url: contractLetterUrl, name: contractLetterName || 'Contract Letter' })}
                        className="text-[11px] text-brand-400 hover:text-brand-300 flex items-center gap-1"
                      >
                        <Eye size={12} /> View
                      </button>
                    )}
                  </div>
                  <label className="flex flex-col items-center justify-center p-2.5 border border-dashed border-white/20 hover:border-brand-400 rounded-lg cursor-pointer bg-white/5 hover:bg-white/10 transition text-center">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'contract')}
                    />
                    <Upload size={16} className="text-gray-400 mb-1" />
                    <span className="text-[11px] text-gray-300 font-medium truncate max-w-full">
                      {uploadingDoc === 'contract' ? 'Processing...' : contractLetterName || (contractLetterUrl ? 'Replace Letter' : 'Upload Letter')}
                    </span>
                  </label>
                </div>

                {/* Owner CNIC Upload */}
                <div className="p-3 bg-black/30 border border-white/10 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                      <Shield size={14} className="text-purple-400" /> Owner CNIC Copy
                    </span>
                    {nicDocUrl && (
                      <button
                        type="button"
                        onClick={() => setPreviewDoc({ url: nicDocUrl, name: nicDocName || 'CNIC Copy' })}
                        className="text-[11px] text-brand-400 hover:text-brand-300 flex items-center gap-1"
                      >
                        <Eye size={12} /> View
                      </button>
                    )}
                  </div>
                  <label className="flex flex-col items-center justify-center p-2.5 border border-dashed border-white/20 hover:border-brand-400 rounded-lg cursor-pointer bg-white/5 hover:bg-white/10 transition text-center">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'nic')}
                    />
                    <Upload size={16} className="text-gray-400 mb-1" />
                    <span className="text-[11px] text-gray-300 font-medium truncate max-w-full">
                      {uploadingDoc === 'nic' ? 'Processing...' : nicDocName || (nicDocUrl ? 'Replace CNIC' : 'Upload CNIC')}
                    </span>
                  </label>
                </div>

                {/* NTN Certificate Upload */}
                <div className="p-3 bg-black/30 border border-white/10 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                      <FileCheck size={14} className="text-cyan-400" /> NTN Certificate
                    </span>
                    {ntnDocUrl && (
                      <button
                        type="button"
                        onClick={() => setPreviewDoc({ url: ntnDocUrl, name: ntnDocName || 'NTN Certificate' })}
                        className="text-[11px] text-brand-400 hover:text-brand-300 flex items-center gap-1"
                      >
                        <Eye size={12} /> View
                      </button>
                    )}
                  </div>
                  <label className="flex flex-col items-center justify-center p-2.5 border border-dashed border-white/20 hover:border-brand-400 rounded-lg cursor-pointer bg-white/5 hover:bg-white/10 transition text-center">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'ntn')}
                    />
                    <Upload size={16} className="text-gray-400 mb-1" />
                    <span className="text-[11px] text-gray-300 font-medium truncate max-w-full">
                      {uploadingDoc === 'ntn' ? 'Processing...' : ntnDocName || (ntnDocUrl ? 'Replace NTN' : 'Upload NTN')}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 2: DEFAULT CASE CATEGORY & SERVICE ARRANGEMENTS (DPL VS CLIENT) */}
          {/* ========================================================================= */}
          <div className="space-y-4 bg-white/5 p-4 rounded-2xl border border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider">
                <Shield size={15} />
                <span>2. Default Case Category & Service Arrangement</span>
              </div>
              <span className="text-[11px] text-gray-400">
                Zyada tar is category ke cases register honge
              </span>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-300 block mb-1.5">
                Primary Case Category (Default Selection) <span className="text-red-400">*</span>
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full glass-input rounded-xl p-2.5 outline-none text-white text-sm bg-black/40 border border-white/15 focus:border-brand-400"
              >
                {CASE_CATEGORIES_LIST.map(cat => (
                  <option key={cat} value={cat} className="bg-slate-900">
                    {cat} {cat === 'Bonded Carrier' ? '(Most Common)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Operational Service Arrangement Toggles */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">
                  Operational Service Arrangement Fields for {selectedCategory}:
                </span>
                <span className="text-[11px] text-gray-400">
                  Select <strong className="text-blue-300">Arranged by DPL</strong> or <strong className="text-amber-300">Arranged by Client</strong> to set permanent defaults:
                </span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                {Object.entries(currentCategoryArrangements).map(([key, item]) => {
                  const currentArrangement = arrangements[key] || (item.isDefaultDpl ? 'DPL' : 'Client');
                  const isDpl = currentArrangement === 'DPL';

                  return (
                    <div 
                      key={key} 
                      className={`p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all ${
                        isDpl 
                          ? 'bg-blue-950/30 border-blue-500/30 shadow-sm' 
                          : 'bg-black/30 border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${isDpl ? 'bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.8)]' : 'bg-amber-400'}`}></span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{item.label}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 bg-black/50 p-1 rounded-xl border border-white/10">
                        <button
                          type="button"
                          onClick={() => toggleArrangement(key, 'DPL')}
                          className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                            isDpl 
                              ? 'bg-blue-600 text-white shadow-md font-bold' 
                              : 'text-gray-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {isDpl && <Check size={12} />}
                          <span>Arranged by DPL</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleArrangement(key, 'Client')}
                          className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                            !isDpl 
                              ? 'bg-amber-600/90 text-white shadow-md font-bold' 
                              : 'text-gray-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {!isDpl && <Check size={12} />}
                          <span>Arranged by Client</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 3: FINANCE & BY-DEFAULT CHARGES TARIFF */}
          {/* ========================================================================= */}
          <div className="space-y-4 bg-white/5 p-4 rounded-2xl border border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-300 uppercase tracking-wider">
                <DollarSign size={15} />
                <span>3. Finance & Default Billing Charges Tariff</span>
              </div>
              <button
                type="button"
                onClick={handleOpenChargePicker}
                className="bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-md transition flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Plus size={14} /> Add Charge / Add Amount
              </button>
            </div>

            {/* Crucial Rule Notification */}
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-200 flex items-start gap-2.5">
              <Sparkles size={16} className="shrink-0 mt-0.5 text-emerald-400" />
              <div>
                <strong>Rule for Default Charges:</strong> Default charges must have an initial amount greater than zero (&gt; 0). Only charges with a specified amount will be saved as the permanent default billing schedule for this client.
              </div>
            </div>

            {/* Charges List Table */}
            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
              {chargesList.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-400 bg-black/20 rounded-xl border border-white/5">
                  No default charges added yet. Click &quot;Add Charge / Add Amount&quot; to pick or create charges.
                </div>
              ) : (
                chargesList.map((ch, idx) => {
                  const hasAmount = (Number(ch.defaultAmount) || 0) > 0;

                  return (
                    <div 
                      key={ch.id || idx}
                      className={`p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center gap-2.5 transition-all ${
                        hasAmount 
                          ? 'bg-emerald-950/20 border-emerald-500/30' 
                          : 'bg-black/30 border-white/10 opacity-70'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <input 
                          type="text"
                          value={ch.description}
                          onChange={(e) => {
                            const updated = [...chargesList];
                            updated[idx].description = e.target.value;
                            setChargesList(updated);
                          }}
                          placeholder="Charge description"
                          className="w-full glass-input rounded-lg p-2 text-xs text-white bg-black/40 border border-white/10 focus:border-brand-400"
                        />
                      </div>

                      <div className="w-full sm:w-36">
                        <select
                          value={ch.category || selectedCategory}
                          onChange={(e) => {
                            const updated = [...chargesList];
                            updated[idx].category = e.target.value;
                            setChargesList(updated);
                          }}
                          className="w-full glass-input rounded-lg p-2 text-xs text-white bg-black/40 border border-white/10"
                        >
                          <option value="Freight / Haulage">Freight / Haulage</option>
                          <option value="Documentation">Documentation</option>
                          <option value="Port & Terminal">Port & Terminal</option>
                          <option value="Customs / Transit">Customs / Transit</option>
                          <option value="Agency">Agency</option>
                          <option value="Security / Tracking">Security / Tracking</option>
                          <option value="Miscellaneous">Miscellaneous</option>
                        </select>
                      </div>

                      <div className="w-full sm:w-36 flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-400 font-mono">PKR</span>
                        <input 
                          type="number"
                          placeholder="0 (Enter amount)"
                          value={ch.defaultAmount === 0 ? '' : ch.defaultAmount}
                          onChange={(e) => {
                            const updated = [...chargesList];
                            updated[idx].defaultAmount = e.target.value === '' ? 0 : Number(e.target.value);
                            setChargesList(updated);
                          }}
                          className={`w-full glass-input rounded-lg p-2 text-xs font-mono font-bold outline-none bg-black/40 border ${
                            hasAmount 
                              ? 'text-emerald-300 border-emerald-500/50 bg-emerald-950/40' 
                              : 'text-gray-400 border-white/10'
                          }`}
                        />
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <label className="flex items-center gap-1 text-[11px] text-gray-300 cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={ch.taxable ?? false}
                            onChange={(e) => {
                              const updated = [...chargesList];
                              updated[idx].taxable = e.target.checked;
                              setChargesList(updated);
                            }}
                            className="rounded text-brand-500 focus:ring-0"
                          />
                          <span>Taxable</span>
                        </label>

                        <button
                          type="button"
                          onClick={() => {
                            setChargesList(chargesList.filter((_, i) => i !== idx));
                          }}
                          className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-500/10 transition"
                          title="Remove charge"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Total Default Charges Tally */}
            <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
              <div>
                <span className="text-xs font-semibold text-emerald-300 block">
                  Active Default Charges ({activeDefaultChargesCount} charges with amount &gt; 0):
                </span>
                <span className="text-[10px] text-gray-400">
                  Only charges with positive amount will be applied automatically to cases
                </span>
              </div>
              <span className="text-sm font-bold font-mono text-emerald-400">
                PKR {totalDefaultAmount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* OPTIONAL: CLIENT PORTAL CREDENTIALS */}
          {/* ========================================================================= */}
          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-300 uppercase tracking-wider">
                <Key size={14} />
                <span>Client Portal Access & Login ID (Optional)</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={loginEnabled}
                  onChange={(e) => setLoginEnabled(e.target.checked)}
                  className="rounded text-brand-500 focus:ring-0"
                />
                <span className="text-xs text-brand-300 font-semibold">Enable Client Portal Login</span>
              </label>
            </div>

            {loginEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-[11px] text-gray-400 block mb-1">Assigned Client User ID</label>
                  <input 
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="w-full glass-input rounded-xl p-2 text-xs font-mono font-bold text-brand-300 bg-black/40 border border-white/15"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 block mb-1">Portal Password</label>
                  <input 
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full glass-input rounded-xl p-2 text-xs font-mono text-white bg-black/40 border border-white/15"
                  />
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-white/10 flex justify-between items-center bg-slate-950/70 rounded-b-2xl shrink-0">
          <button 
            type="button"
            onClick={onClose}
            className="bg-white/10 hover:bg-white/15 text-gray-300 px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-colors"
          >
            Cancel
          </button>
          <button 
            type="button"
            onClick={handleSave}
            disabled={!name.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2"
          >
            <CheckCircle2 size={16} /> Save Client & Apply Charges
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECONDARY POPUP: MASTER CHARGE PICKER & ADD CUSTOM CHARGE */}
      {/* ========================================================================= */}
      {showChargePicker && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-lg z-60 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="glass-card rounded-2xl w-full max-w-xl border border-white/20 shadow-2xl bg-slate-900/98 max-h-[85vh] flex flex-col">
            {/* Picker Header */}
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-950/80 rounded-t-2xl">
              <div>
                <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <DollarSign size={16} className="text-emerald-400" />
                  <span>Select Charges for {name || 'Client'}</span>
                </h4>
                <p className="text-[11px] text-gray-400">
                  Tick any charges to add to the client&apos;s default tariff list
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setShowChargePicker(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search and Add Custom Charge bar */}
            <div className="p-3 border-b border-white/10 space-y-2.5 bg-black/30">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text"
                  placeholder="Search existing charges..."
                  value={chargeSearch}
                  onChange={(e) => setChargeSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-brand-500"
                />
              </div>

              {/* Add New Charge input if not found in list */}
              <div className="flex gap-2">
                <input 
                  type="text"
                  placeholder="Type new charge name (e.g. Weighbridge Token)..."
                  value={customChargeInput}
                  onChange={(e) => setCustomChargeInput(e.target.value)}
                  className="flex-1 bg-black/40 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-brand-400"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomChargeOnFly();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddCustomChargeOnFly}
                  disabled={!customChargeInput.trim()}
                  className="bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition flex items-center gap-1 shrink-0"
                >
                  <Plus size={13} /> Add New Charge
                </button>
              </div>
            </div>

            {/* Scrollable Charges Checklist */}
            <div className="p-3 overflow-y-auto space-y-1.5 custom-scrollbar flex-1 max-h-72">
              {filteredPickerCharges.length === 0 ? (
                <div className="text-center p-6 text-xs text-gray-400">
                  No matching charges found. Type above and click &quot;Add New Charge&quot; to create it!
                </div>
              ) : (
                filteredPickerCharges.map((item) => {
                  const isChecked = selectedPickerCharges[item.name.toLowerCase()] ?? false;

                  return (
                    <label 
                      key={item.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 cursor-pointer transition ${
                        isChecked 
                          ? 'bg-brand-950/40 border-brand-500/40 text-white' 
                          : 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            setSelectedPickerCharges(prev => ({
                              ...prev,
                              [item.name.toLowerCase()]: e.target.checked
                            }));
                          }}
                          className="rounded text-brand-600 focus:ring-0"
                        />
                        <div className="min-w-0">
                          <span className="text-xs font-semibold block truncate">{item.name}</span>
                          <span className="text-[10px] text-gray-400">{item.category}</span>
                        </div>
                      </div>

                      <span className="text-xs font-mono text-emerald-400 font-bold shrink-0">
                        PKR {item.defaultAmount.toLocaleString()}
                      </span>
                    </label>
                  );
                })
              )}
            </div>

            {/* Picker Footer */}
            <div className="p-3 border-t border-white/10 flex justify-between items-center bg-slate-950/80 rounded-b-2xl">
              <span className="text-xs text-gray-400 font-mono">
                {Object.values(selectedPickerCharges).filter(Boolean).length} charges selected
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowChargePicker(false)}
                  className="px-3 py-1.5 text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyChargesFromPicker}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-1.5 rounded-xl shadow-md transition"
                >
                  OK (Add to Tariff)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Quick Preview */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/95 z-70 flex items-center justify-center p-4">
          <div className="glass-card rounded-2xl w-full max-w-2xl border border-white/20 p-4 space-y-3 bg-slate-900 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <h4 className="text-sm font-bold text-white truncate">{previewDoc.name}</h4>
              <button 
                onClick={() => setPreviewDoc(null)} 
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center min-h-[300px]">
              {previewDoc.url.startsWith('data:application/pdf') || previewDoc.url.endsWith('.pdf') ? (
                <iframe src={previewDoc.url} className="w-full h-[500px] rounded-xl border border-white/10" title={previewDoc.name} />
              ) : (
                <img src={previewDoc.url} alt={previewDoc.name} className="max-w-full max-h-[500px] object-contain rounded-xl" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
