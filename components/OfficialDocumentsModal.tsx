import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, FileText, Download, CheckCircle2, AlertTriangle, ShieldCheck, 
  Calendar, Building, User, Filter, Search, CheckSquare, Square, 
  Sparkles, Layers, RefreshCw, FileSpreadsheet, Printer, ChevronRight,
  ExternalLink, FileCheck
} from 'lucide-react';
import { Vehicle } from '../types';
import { 
  generateRegistrationRenewalLetterDocx,
  generateCustomsPermitLetterDocx,
  generateLeaseAgreementDocx,
  generateLeaseTerminationAgreementDocx,
  generateCancellationLetterLetterheadDocx,
  downloadDocxBlob,
  formatSlashDate,
  formatDotDate,
  formatDashDate,
  formatAgreementDate,
  calculateSixMonthsExpiry,
  extractVehicleFields,
  DOCKS_COMPANY
} from '../services/vehicleDocxService';

export type DocumentType = 
  | 'REG_LETTER'        // Letter 10 Vehicles registration letter (Company Letterhead)
  | 'CUSTOMS_PERMIT'    // Custom Vehicle List (Customs Office Format)
  | 'LEASE_AGREEMENT'   // Lease Agreement TAS-582 (Stamp Paper)
  | 'LEASE_TERMINATION' // LEASE TERMINATION OF NOC (Stamp Paper)
  | 'CANCELLATION_NOC'; // NOC on letter head (Company Letterhead)

export interface OfficialDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  allVehicles?: Vehicle[];
  vehicles?: Vehicle[];
  initialSelectedVehicles?: Vehicle[];
  preSelectedIds?: number[];
  initialDocType?: DocumentType;
}

export const OfficialDocumentsModal: React.FC<OfficialDocumentsModalProps> = ({
  isOpen,
  onClose,
  allVehicles: rawAllVehicles,
  vehicles: altVehicles,
  initialSelectedVehicles = [],
  preSelectedIds = [],
  initialDocType = 'REG_LETTER'
}) => {
  const allVehicles = rawAllVehicles || altVehicles || [];

  const [activeTab, setActiveTab] = useState<DocumentType>(initialDocType);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'EXPIRED' | 'EXPIRY_SOON' | 'ACTIVE' | 'CANCELLED'>('ALL');
  
  // Selection set of vehicle IDs
  const [selectedIds, setSelectedIds] = useState<number[]>(() => {
    if (preSelectedIds.length > 0) {
      return preSelectedIds;
    }
    if (initialSelectedVehicles.length > 0) {
      return initialSelectedVehicles.map(v => v.id);
    }
    // Default to expired vehicles if any, otherwise first 5
    const expired = allVehicles.filter(v => v.status === 'EXPIRED');
    if (expired.length > 0) return expired.map(v => v.id);
    return allVehicles.slice(0, 10).map(v => v.id);
  });

  // Sync state whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      if (initialDocType) setActiveTab(initialDocType);
      if (preSelectedIds && preSelectedIds.length > 0) {
        setSelectedIds(preSelectedIds);
      } else if (initialSelectedVehicles && initialSelectedVehicles.length > 0) {
        setSelectedIds(initialSelectedVehicles.map(v => v.id));
      }
    }
  }, [isOpen, initialDocType, preSelectedIds, initialSelectedVehicles]);

  if (!isOpen) return null;

  // Common configuration state
  const todayStr = new Date().toISOString().slice(0, 10);
  const [letterDate, setLetterDate] = useState<string>(todayStr);
  const [leaveHeaderMargin, setLeaveHeaderMargin] = useState<boolean>(true); // For letterhead / stamp paper
  const [permitRefNo, setPermitRefNo] = useState<string>('No. SI/Mics./01/2021–(Licensing)');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [lastGeneratedMsg, setLastGeneratedMsg] = useState<string | null>(null);

  // Custom Lessor / Witness overrides for Legal agreements
  const [customLessorName, setCustomLessorName] = useState<string>('');
  const [customFatherName, setCustomFatherName] = useState<string>('');
  const [customCnic, setCustomCnic] = useState<string>('');
  const [customAddress, setCustomAddress] = useState<string>('');
  const [witness1Name, setWitness1Name] = useState<string>(DOCKS_COMPANY.witnesses.w1_arbaz.name);
  const [witness1Cnic, setWitness1Cnic] = useState<string>(DOCKS_COMPANY.witnesses.w1_arbaz.cnic);
  const [witness2Name, setWitness2Name] = useState<string>(DOCKS_COMPANY.witnesses.w2_shams.name);
  const [witness2Cnic, setWitness2Cnic] = useState<string>(DOCKS_COMPANY.witnesses.w2_shams.cnic);

  // Filtered vehicles pool
  const displayVehicles = useMemo(() => {
    return allVehicles.filter(v => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || 
        v.registrationNumber.toLowerCase().includes(q) ||
        (v.chassisNo || '').toLowerCase().includes(q) ||
        (v.engineNo || '').toLowerCase().includes(q) ||
        (v.driverName || '').toLowerCase().includes(q) ||
        (v.transporterName || '').toLowerCase().includes(q) ||
        (v.ownerName || '').toLowerCase().includes(q);

      if (!matchSearch) return false;

      if (filterMode === 'EXPIRED') return v.status === 'EXPIRED';
      if (filterMode === 'EXPIRY_SOON') return v.status === 'EXPIRE_SOON';
      if (filterMode === 'ACTIVE') return v.status === 'AVAILABLE' || v.status === 'ON_TRIP';
      if (filterMode === 'CANCELLED') return v.status === 'CANCELLED';
      return true;
    });
  }, [allVehicles, searchQuery, filterMode]);

  // Selected vehicles array
  const selectedVehicles = useMemo(() => {
    return allVehicles.filter(v => selectedIds.includes(v.id));
  }, [allVehicles, selectedIds]);

  // Expiry calculation
  const calculatedExpiryDate = useMemo(() => {
    const d = new Date(letterDate || todayStr);
    return calculateSixMonthsExpiry(d);
  }, [letterDate, todayStr]);

  const toggleSelectVehicle = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const ids = displayVehicles.map(v => v.id);
    setSelectedIds(prev => Array.from(new Set([...prev, ...ids])));
  };

  const handleSelectAllExpired = () => {
    const expired = allVehicles.filter(v => v.status === 'EXPIRED').map(v => v.id);
    setSelectedIds(expired);
    setFilterMode('EXPIRED');
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  // -------------------------------------------------------------
  // GENERATION HANDLERS
  // -------------------------------------------------------------

  const handleDownloadCurrentDoc = async () => {
    if (selectedVehicles.length === 0) return;
    setIsGenerating(true);
    setLastGeneratedMsg(null);

    try {
      const dateObj = new Date(letterDate || todayStr);

      if (activeTab === 'REG_LETTER') {
        const doc = await generateRegistrationRenewalLetterDocx(selectedVehicles, {
          letterDate: dateObj,
          leaveLetterheadSpace: leaveHeaderMargin
        });
        const filename = `DPL_Vehicle_Registration_Renewal_Letter_${formatDashDate(dateObj)}.docx`;
        await downloadDocxBlob(doc, filename);
        setLastGeneratedMsg(`Downloaded Registration / Renewal Letter (${selectedVehicles.length} vehicles) in Word format.`);
      } 
      else if (activeTab === 'CUSTOMS_PERMIT') {
        const doc = await generateCustomsPermitLetterDocx(selectedVehicles, {
          letterDate: dateObj,
          permitNo: permitRefNo,
          leaveGovernmentHeaderSpace: leaveHeaderMargin
        });
        const filename = `Customs_Permit_Vehicle_Renewal_${formatDashDate(dateObj)}.docx`;
        await downloadDocxBlob(doc, filename);
        setLastGeneratedMsg(`Downloaded Customs Permit Format (${selectedVehicles.length} vehicles) for officer signature.`);
      } 
      else if (activeTab === 'LEASE_AGREEMENT') {
        const doc = await generateLeaseAgreementDocx(selectedVehicles, {
          agreementDate: dateObj,
          leaveStampPaperSpace: leaveHeaderMargin,
          customLessorName: customLessorName || undefined,
          customFatherName: customFatherName || undefined,
          customCnic: customCnic || undefined,
          customAddress: customAddress || undefined,
          witness1Name,
          witness1Cnic,
          witness2Name,
          witness2Cnic
        });
        const regStr = selectedVehicles.length === 1 ? selectedVehicles[0].registrationNumber : `${selectedVehicles.length}_Vehicles`;
        const filename = `Lease_Agreement_${regStr}_Stamp_Paper_${formatDashDate(dateObj)}.docx`;
        await downloadDocxBlob(doc, filename);
        setLastGeneratedMsg(`Downloaded Lease Agreement for Stamp Paper (${selectedVehicles.length} vehicles).`);
      } 
      else if (activeTab === 'LEASE_TERMINATION') {
        // Generate termination for selected vehicles (first or loop)
        for (let i = 0; i < selectedVehicles.length; i++) {
          const v = selectedVehicles[i];
          const doc = await generateLeaseTerminationAgreementDocx(v, {
            terminationDate: dateObj,
            originalAgreementDate: v.registrationDate ? new Date(v.registrationDate) : dateObj,
            leaveStampPaperSpace: leaveHeaderMargin,
            customLessorName: customLessorName || undefined,
            customCnic: customCnic || undefined,
            customAddress: customAddress || undefined,
            witness1Name: DOCKS_COMPANY.witnesses.w1_hasnain.name,
            witness1Cnic: DOCKS_COMPANY.witnesses.w1_hasnain.cnic,
            witness2Name: DOCKS_COMPANY.witnesses.w2_shams.name,
            witness2Cnic: DOCKS_COMPANY.witnesses.w2_shams.cnic
          });
          const filename = `Lease_Cancellation_Termination_${v.registrationNumber}_Stamp_Paper.docx`;
          await downloadDocxBlob(doc, filename);
        }
        setLastGeneratedMsg(`Downloaded Lease Cancellation & Termination Agreement(s) on Stamp Paper.`);
      } 
      else if (activeTab === 'CANCELLATION_NOC') {
        const doc = await generateCancellationLetterLetterheadDocx(selectedVehicles, {
          letterDate: dateObj,
          leaveLetterheadSpace: leaveHeaderMargin
        });
        const filename = `Customs_Panel_Cancellation_Letter_${formatDashDate(dateObj)}.docx`;
        await downloadDocxBlob(doc, filename);
        setLastGeneratedMsg(`Downloaded Customs Panel Cancellation Letter for Letterhead.`);
      }
    } catch (err) {
      console.error('Document generation error:', err);
      alert('Failed to generate document: ' + (err as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Batch download all 3 Registration / Renewal documents in one workflow
  const handleDownloadAllRegistrationDocs = async () => {
    if (selectedVehicles.length === 0) return;
    setIsGenerating(true);
    setLastGeneratedMsg(null);
    try {
      const dateObj = new Date(letterDate || todayStr);
      
      // 1. Reg Letter
      const doc1 = await generateRegistrationRenewalLetterDocx(selectedVehicles, {
        letterDate: dateObj,
        leaveLetterheadSpace: leaveHeaderMargin
      });
      await downloadDocxBlob(doc1, `1_Registration_Letter_${formatDashDate(dateObj)}.docx`);

      // 2. Customs Permit Letter
      const doc2 = await generateCustomsPermitLetterDocx(selectedVehicles, {
        letterDate: dateObj,
        permitNo: permitRefNo,
        leaveGovernmentHeaderSpace: leaveHeaderMargin
      });
      await downloadDocxBlob(doc2, `2_Customs_Permit_List_${formatDashDate(dateObj)}.docx`);

      // 3. Lease Agreement
      const doc3 = await generateLeaseAgreementDocx(selectedVehicles, {
        agreementDate: dateObj,
        leaveStampPaperSpace: leaveHeaderMargin,
        witness1Name,
        witness1Cnic,
        witness2Name,
        witness2Cnic
      });
      await downloadDocxBlob(doc3, `3_Lease_Agreement_Stamp_Paper_${formatDashDate(dateObj)}.docx`);

      setLastGeneratedMsg(`Successfully downloaded all 3 official Word documents (.docx) for the ${selectedVehicles.length} vehicles!`);
    } catch (err) {
      console.error('Batch download error:', err);
      alert('Batch generation error: ' + (err as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Batch download both Cancellation documents
  const handleDownloadAllCancellationDocs = async () => {
    if (selectedVehicles.length === 0) return;
    setIsGenerating(true);
    setLastGeneratedMsg(null);
    try {
      const dateObj = new Date(letterDate || todayStr);

      // 1. Stamp paper lease termination
      for (const v of selectedVehicles) {
        const doc1 = await generateLeaseTerminationAgreementDocx(v, {
          terminationDate: dateObj,
          leaveStampPaperSpace: leaveHeaderMargin
        });
        await downloadDocxBlob(doc1, `Lease_Termination_${v.registrationNumber}_Stamp_Paper.docx`);
      }

      // 2. Letterhead Cancellation Letter
      const doc2 = await generateCancellationLetterLetterheadDocx(selectedVehicles, {
        letterDate: dateObj,
        leaveLetterheadSpace: leaveHeaderMargin
      });
      await downloadDocxBlob(doc2, `Customs_Cancellation_Letterhead_${formatDashDate(dateObj)}.docx`);

      setLastGeneratedMsg(`Downloaded both Stamp Paper Termination and Letterhead Cancellation documents in Word format.`);
    } catch (err) {
      console.error('Cancellation docs error:', err);
      alert('Cancellation docs generation error: ' + (err as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex flex-wrap justify-between items-center bg-white/5 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <FileText size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-white">Official Customs & Legal Documents Generator</h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Microsoft Word (.docx)
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Generate 1:1 authentic letters, customs permits, stamp paper lease agreements, and cancellation NOCs
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation for 5 Document Formats */}
        <div className="border-b border-white/10 bg-slate-950/60 px-4 flex items-center gap-2 overflow-x-auto no-scrollbar py-2">
          <button
            onClick={() => setActiveTab('REG_LETTER')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'REG_LETTER'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText size={15} />
            <span>1. Registration / Renewal Letter (Letterhead)</span>
          </button>

          <button
            onClick={() => setActiveTab('CUSTOMS_PERMIT')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'CUSTOMS_PERMIT'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <ShieldCheck size={15} />
            <span>2. Customs Permit Format (Office Copy)</span>
          </button>

          <button
            onClick={() => setActiveTab('LEASE_AGREEMENT')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'LEASE_AGREEMENT'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileCheck size={15} />
            <span>3. Lease Agreement (Stamp Paper)</span>
          </button>

          <button
            onClick={() => setActiveTab('LEASE_TERMINATION')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'LEASE_TERMINATION'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <AlertTriangle size={15} />
            <span>4. Lease Termination (Stamp Paper)</span>
          </button>

          <button
            onClick={() => setActiveTab('CANCELLATION_NOC')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'CANCELLATION_NOC'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Building size={15} />
            <span>5. Panel Cancellation (Letterhead)</span>
          </button>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
          
          {/* Document Type Overview Banner */}
          <div className="p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4 bg-white/[0.02] border-white/10">
            <div className="space-y-1">
              <span className="text-xs uppercase font-bold tracking-wider text-blue-400">
                {activeTab === 'REG_LETTER' && 'Company Letterhead Document (Rule 329(5) of Customs Rules, 2001)'}
                {activeTab === 'CUSTOMS_PERMIT' && 'Customs Directorate General Transit Trade Official Format'}
                {activeTab === 'LEASE_AGREEMENT' && 'Stamp Paper Legal Format (Six Months Bonded Carrier Lease)'}
                {activeTab === 'LEASE_TERMINATION' && 'Stamp Paper Legal Format (Mutual Lease Cancellation Agreement)'}
                {activeTab === 'CANCELLATION_NOC' && 'Customs Directorate Panel De-registration Letter'}
              </span>
              <p className="text-xs text-gray-300">
                {activeTab === 'REG_LETTER' && 'Generates official application letter addressed to The Deputy / Assistant Director, Licensing of Bonded Carrier, Custom House Karachi.'}
                {activeTab === 'CUSTOMS_PERMIT' && 'Customs officers ask Docks (Pvt) Ltd to bring this pre-printed permit letter so they can review and endorse signatures.'}
                {activeTab === 'LEASE_AGREEMENT' && 'Mandatory legal agreement executed with vehicle owners on official Stamp Paper with clauses (a) to (h).'}
                {activeTab === 'LEASE_TERMINATION' && 'Mutual covenant agreement on Stamp Paper between Lessor and Lessee concluding operational lease.'}
                {activeTab === 'CANCELLATION_NOC' && 'Formal notice printed on Docks (Pvt) Ltd letterhead notifying Customs of vehicle contract conclusion.'}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {(activeTab === 'REG_LETTER' || activeTab === 'CUSTOMS_PERMIT' || activeTab === 'LEASE_AGREEMENT') && (
                <button
                  type="button"
                  onClick={handleDownloadAllRegistrationDocs}
                  disabled={selectedVehicles.length === 0 || isGenerating}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all"
                  title="Generates and downloads all 3 registration documents (.docx) at once"
                >
                  <Layers size={15} />
                  <span>Download All 3 Renewal Docs (.docx)</span>
                </button>
              )}

              {(activeTab === 'LEASE_TERMINATION' || activeTab === 'CANCELLATION_NOC') && (
                <button
                  type="button"
                  onClick={handleDownloadAllCancellationDocs}
                  disabled={selectedVehicles.length === 0 || isGenerating}
                  className="bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-rose-600/30 transition-all"
                  title="Generates both Stamp Paper Termination and Letterhead Notice"
                >
                  <Layers size={15} />
                  <span>Download Both Cancellation Docs (.docx)</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleDownloadCurrentDoc}
                disabled={selectedVehicles.length === 0 || isGenerating}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all"
              >
                <Download size={15} />
                <span>
                  {isGenerating ? 'Generating...' : `Download ${activeTab === 'REG_LETTER' ? 'Reg Letter' : activeTab === 'CUSTOMS_PERMIT' ? 'Customs Permit' : activeTab === 'LEASE_AGREEMENT' ? 'Lease Agreement' : activeTab === 'LEASE_TERMINATION' ? 'Termination Doc' : 'Cancellation Notice'} (.docx)`}
                </span>
              </button>
            </div>
          </div>

          {lastGeneratedMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <span>{lastGeneratedMsg}</span>
            </div>
          )}

          {/* Configuration Form Controls */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-white/[0.02] border border-white/10 rounded-2xl">
            {/* Letter Generation Date */}
            <div>
              <label className="text-xs text-gray-300 font-semibold block mb-1.5 flex items-center gap-1.5">
                <Calendar size={13} className="text-blue-400" />
                <span>Document Generation Date:</span>
              </label>
              <input
                type="date"
                value={letterDate}
                onChange={(e) => setLetterDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
              <span className="text-[10px] text-gray-400 mt-1 block">
                Formatted as {formatSlashDate(new Date(letterDate || todayStr))}
              </span>
            </div>

            {/* Calculated 6-Month Expiry */}
            <div>
              <label className="text-xs text-gray-300 font-semibold block mb-1.5 flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-emerald-400" />
                <span>Calculated 6-Month Expiry:</span>
              </label>
              <div className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-emerald-300 font-mono flex items-center justify-between">
                <span>{formatDotDate(calculatedExpiryDate)}</span>
                <span className="text-[10px] text-gray-400">Rule 329(5)</span>
              </div>
              <span className="text-[10px] text-gray-400 mt-1 block">
                Automatic 6-month regulatory validity window
              </span>
            </div>

            {/* Customs Reference No (For Permit) */}
            <div>
              <label className="text-xs text-gray-300 font-semibold block mb-1.5">
                Customs Reference Number:
              </label>
              <input
                type="text"
                value={permitRefNo}
                onChange={(e) => setPermitRefNo(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                placeholder="No. SI/Mics./01/2021–(Licensing)"
              />
              <span className="text-[10px] text-gray-400 mt-1 block">
                Directorate General of Transit Trade ref
              </span>
            </div>

            {/* Margin Spacing Option */}
            <div className="flex flex-col justify-between">
              <label className="text-xs text-gray-300 font-semibold block mb-1.5">
                Paper Spacing Layout:
              </label>
              <div className="flex items-center gap-2 p-2 bg-white/5 rounded-xl border border-white/10">
                <input
                  type="checkbox"
                  id="top-margin-toggle"
                  checked={leaveHeaderMargin}
                  onChange={(e) => setLeaveHeaderMargin(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0 w-4 h-4 bg-white/10 border-white/20"
                />
                <label htmlFor="top-margin-toggle" className="text-xs text-gray-300 cursor-pointer">
                  {activeTab === 'LEASE_AGREEMENT' || activeTab === 'LEASE_TERMINATION'
                    ? 'Leave 3.5" top space for Stamp Paper'
                    : 'Leave 2.2" top space for Company Letterhead'}
                </label>
              </div>
              <span className="text-[10px] text-gray-400 mt-1 block">
                Uncheck if printing on blank paper with digital header
              </span>
            </div>
          </div>

          {/* Legal Agreement Optional Overrides (For Lease Agreement / Termination) */}
          {(activeTab === 'LEASE_AGREEMENT' || activeTab === 'LEASE_TERMINATION') && (
            <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-2">
                  <FileCheck size={14} />
                  <span>Legal Lessor & Witness Customization (Stamp Paper)</span>
                </span>
                <span className="text-[11px] text-gray-400">
                  Pre-filled from vehicle registration record or custom party
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="text-[11px] text-gray-400 block mb-1">Lessor / Owner Name:</label>
                  <input
                    type="text"
                    value={customLessorName}
                    onChange={(e) => setCustomLessorName(e.target.value)}
                    placeholder="e.g. GUL HAMEED"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 block mb-1">Lessor Father Name:</label>
                  <input
                    type="text"
                    value={customFatherName}
                    onChange={(e) => setCustomFatherName(e.target.value)}
                    placeholder="e.g. BARKHURDAR"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 block mb-1">Lessor CNIC:</label>
                  <input
                    type="text"
                    value={customCnic}
                    onChange={(e) => setCustomCnic(e.target.value)}
                    placeholder="38301-4549550-1"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 block mb-1">Lessor Address:</label>
                  <input
                    type="text"
                    value={customAddress}
                    onChange={(e) => setCustomAddress(e.target.value)}
                    placeholder="TAJ MASJID ROAD H.NO.123/3 ST NO.23 MOH AGRA TAJ COLONY KARACHI"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>
              </div>

              {/* Witnesses */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-1 border-t border-white/5">
                <div>
                  <label className="text-[11px] text-gray-400 block mb-1">Witness 1 Name:</label>
                  <input
                    type="text"
                    value={witness1Name}
                    onChange={(e) => setWitness1Name(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 block mb-1">Witness 1 CNIC:</label>
                  <input
                    type="text"
                    value={witness1Cnic}
                    onChange={(e) => setWitness1Cnic(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 block mb-1">Witness 2 Name:</label>
                  <input
                    type="text"
                    value={witness2Name}
                    onChange={(e) => setWitness2Name(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 block mb-1">Witness 2 CNIC:</label>
                  <input
                    type="text"
                    value={witness2Cnic}
                    onChange={(e) => setWitness2Cnic(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white font-mono text-[11px]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Vehicle Selection Toolbar */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Select Vehicles for Document:</span>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold text-xs border border-blue-500/30">
                  {selectedIds.length} Selected
                </span>
              </div>

              {/* Quick Preset Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleSelectAllExpired}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white border border-red-500/30 transition-colors"
                >
                  Select All Expired ({allVehicles.filter(v => v.status === 'EXPIRED').length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const expirySoon = allVehicles.filter(v => v.status === 'EXPIRE_SOON').map(v => v.id);
                    setSelectedIds(expirySoon);
                    setFilterMode('EXPIRY_SOON');
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-white border border-amber-500/30 transition-colors"
                >
                  Select Expiry Soon ({allVehicles.filter(v => v.status === 'EXPIRE_SOON').length})
                </button>
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 text-gray-200 transition-colors"
                >
                  Select Filtered ({displayVehicles.length})
                </button>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Clear Selection
                </button>
              </div>
            </div>

            {/* Search and Status Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="text"
                  placeholder="Search by Reg No, Chassis, Engine, Driver, Owner..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {(['ALL', 'EXPIRED', 'EXPIRY_SOON', 'ACTIVE', 'CANCELLED'] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setFilterMode(mode)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${
                      filterMode === mode
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                    }`}
                  >
                    {mode === 'ALL' ? 'All Records' : mode === 'EXPIRED' ? 'Expired' : mode === 'EXPIRY_SOON' ? 'Expiry Soon' : mode === 'ACTIVE' ? 'Active' : 'Cancelled / NOC'}
                  </button>
                ))}
              </div>
            </div>

            {/* Vehicles Selection Table */}
            <div className="border border-white/10 rounded-xl overflow-hidden bg-slate-950/40">
              <div className="max-h-72 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="bg-white/5 text-gray-400 font-semibold sticky top-0 z-10 backdrop-blur-sm border-b border-white/10">
                    <tr>
                      <th className="p-3 w-10 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedIds.length === displayVehicles.length) {
                              setSelectedIds([]);
                            } else {
                              handleSelectAllFiltered();
                            }
                          }}
                          className="text-gray-400 hover:text-white"
                        >
                          {selectedIds.length > 0 && selectedIds.length === displayVehicles.length ? (
                            <CheckSquare size={16} className="text-blue-400" />
                          ) : (
                            <Square size={16} />
                          )}
                        </button>
                      </th>
                      <th className="p-3">Reg No.</th>
                      <th className="p-3">Chassis No.</th>
                      <th className="p-3">Engine No.</th>
                      <th className="p-3">Make / Model</th>
                      <th className="p-3">MRA Authority</th>
                      <th className="p-3">Owner / Lessor</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Expiry Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {displayVehicles.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-6 text-center text-gray-500">
                          No matching vehicles found for the current search and filter.
                        </td>
                      </tr>
                    ) : (
                      displayVehicles.map((v) => {
                        const isSelected = selectedIds.includes(v.id);
                        const { maker, model, mra, owner } = extractVehicleFields(v);
                        return (
                          <tr
                            key={v.id}
                            onClick={() => toggleSelectVehicle(v.id)}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? 'bg-blue-600/15 hover:bg-blue-600/25' : 'hover:bg-white/5'
                            }`}
                          >
                            <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => toggleSelectVehicle(v.id)}
                                className="text-gray-400 hover:text-white"
                              >
                                {isSelected ? (
                                  <CheckSquare size={16} className="text-blue-400" />
                                ) : (
                                  <Square size={16} />
                                )}
                              </button>
                            </td>
                            <td className="p-3 font-bold text-white font-mono">{v.registrationNumber}</td>
                            <td className="p-3 font-mono text-gray-300">{v.chassisNo || '-'}</td>
                            <td className="p-3 font-mono text-gray-300">{v.engineNo || '-'}</td>
                            <td className="p-3 text-gray-300">{maker} {model}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded bg-white/5 text-gray-300 text-[11px] font-mono">
                                {mra}
                              </span>
                            </td>
                            <td className="p-3 text-gray-300 max-w-[150px] truncate" title={owner}>
                              {owner}
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                v.status === 'EXPIRED'
                                  ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                  : v.status === 'EXPIRE_SOON'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : v.status === 'CANCELLED'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}>
                                {v.status}
                              </span>
                            </td>
                            <td className="p-3 text-gray-400 font-mono text-[11px]">
                              {v.validationExpiryDate || '-'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Selected Vehicles Live Document Table Preview */}
          {selectedVehicles.length > 0 && (
            <div className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <FileText size={15} className="text-blue-400" />
                  <span>Document Table Preview ({selectedVehicles.length} Vehicles to be rendered in .docx)</span>
                </span>
                <span className="text-[11px] text-gray-400">
                  Matches standard Customs Rule 329(5) & Lease specifications
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-left text-[11px] text-gray-200">
                  <thead className="bg-black/60 text-gray-300 font-bold uppercase tracking-wider border-b border-white/10">
                    <tr>
                      <th className="p-2.5 text-center w-8">#</th>
                      <th className="p-2.5">REG-NO.</th>
                      <th className="p-2.5">CHASSIS</th>
                      <th className="p-2.5">ENGINE</th>
                      <th className="p-2.5">MAKER</th>
                      <th className="p-2.5">MODEL</th>
                      <th className="p-2.5">M.R.A.</th>
                      <th className="p-2.5">TARE</th>
                      <th className="p-2.5">OWNER</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {selectedVehicles.map((v, idx) => {
                      const { maker, model, mra, tare, owner } = extractVehicleFields(v);
                      return (
                        <tr key={v.id} className="hover:bg-white/5">
                          <td className="p-2.5 text-center text-gray-400">{idx + 1}</td>
                          <td className="p-2.5 font-bold text-white">{v.registrationNumber}</td>
                          <td className="p-2.5">{v.chassisNo || '-'}</td>
                          <td className="p-2.5">{v.engineNo || '-'}</td>
                          <td className="p-2.5 font-sans">{maker}</td>
                          <td className="p-2.5">{model}</td>
                          <td className="p-2.5 font-sans">{mra}</td>
                          <td className="p-2.5">{tare}</td>
                          <td className="p-2.5 font-sans text-gray-300">{owner}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-white/10 flex flex-wrap justify-between items-center gap-3 bg-white/5">
          <div className="text-xs text-gray-400">
            Selected: <strong className="text-white">{selectedVehicles.length} vehicles</strong> | 
            Letter Date: <strong className="text-blue-300 font-mono">{formatSlashDate(new Date(letterDate || todayStr))}</strong> | 
            Expiry: <strong className="text-emerald-300 font-mono">{formatDotDate(calculatedExpiryDate)}</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleDownloadCurrentDoc}
              disabled={selectedVehicles.length === 0 || isGenerating}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white flex items-center gap-2 transition-colors shadow-lg shadow-emerald-600/30"
            >
              <Download size={14} />
              <span>
                {isGenerating ? 'Generating Word Doc...' : `Download ${activeTab === 'REG_LETTER' ? 'Registration Letter' : activeTab === 'CUSTOMS_PERMIT' ? 'Customs Permit' : activeTab === 'LEASE_AGREEMENT' ? 'Lease Agreement' : activeTab === 'LEASE_TERMINATION' ? 'Lease Termination' : 'Cancellation Letter'} (.docx)`}
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
