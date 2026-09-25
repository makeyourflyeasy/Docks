import React, { useState } from 'react';
import { 
  X, Receipt, Plus, Trash2, Download, CheckCircle2, 
  UploadCloud, FileText, Camera, DollarSign, AlertCircle, Clock 
} from 'lucide-react';
import { Case, CaseCharge, StaffLoadingBill, StaffPrivateLedgerEntry } from '../types';
import { downloadLoadingBillPdf, LoadingBillData, LoadingBillItem } from '../services/pdfExportService';
import { saveStaffBillToFirestore, saveStaffPrivateLedgerEntryToFirestore, saveCaseToFirestore } from '../services/dbService';
import { compressAndPrepareFile, convertImageToPdf } from '../services/fileUtils';
import { useBranding } from '../services/brandingService';

interface ExtraChargeItem {
  id: string;
  head: string;
  amount: number;
  description?: string;
  receiptUrl?: string;
  receiptName?: string;
}

interface PortMakeBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetCase: Case;
  staffUserId: string;
  staffName: string;
  onBillGenerated?: (bill: StaffLoadingBill) => void;
}

export const PortMakeBillModal: React.FC<PortMakeBillModalProps> = ({
  isOpen,
  onClose,
  targetCase,
  staffUserId,
  staffName,
  onBillGenerated
}) => {
  const { customLogo, companyName } = useBranding();
  if (!isOpen) return null;

  const container = targetCase.containers?.[0];
  const initialWf: Record<string, any> = targetCase.workflowDetails || {};
  const loadingStep: any = initialWf[targetCase.status] || initialWf['LOADING_PORT_PROCESSING'] || {};

  // Bill Meta
  const [billNo, setBillNo] = useState(`LB-${targetCase.caseNo?.replace(/[^a-zA-Z0-9]/g, '') || 'PORT'}-${Date.now().toString().slice(-4)}`);
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [portTerminal, setPortTerminal] = useState(targetCase.pol || 'KICT Port Terminal, Karachi');
  const [remarks, setRemarks] = useState('Port terminal handling, wharfage, demurrage, and gate dispatch expenses.');

  // 1. Wharfage Payment
  const [wharfageAmount, setWharfageAmount] = useState<number | ''>(Number(loadingStep.wharfageAmount) || '');
  const [wharfageReceiptUrl, setWharfageReceiptUrl] = useState<string>(loadingStep.wharfageReceiptUrl || '');
  const [wharfageReceiptName, setWharfageReceiptName] = useState<string>(loadingStep.wharfageReceiptName || '');

  // 2. Additional Port Demurrage
  const [demurrageAmount, setDemurrageAmount] = useState<number | ''>('');
  const [demurrageReceiptUrl, setDemurrageReceiptUrl] = useState<string>('');
  const [demurrageReceiptName, setDemurrageReceiptName] = useState<string>('');

  // 3. Tracker Payment
  const [trackerAmount, setTrackerAmount] = useState<number | ''>(Number(loadingStep.trackerAmount) || '');
  const [trackerReceiptUrl, setTrackerReceiptUrl] = useState<string>('');
  const [trackerReceiptName, setTrackerReceiptName] = useState<string>('');

  // 4. Delivery Charges
  const [deliveryAmount, setDeliveryAmount] = useState<number | ''>(Number(loadingStep.loadingChargesAmount) || '');
  const [deliveryReceiptUrl, setDeliveryReceiptUrl] = useState<string>('');
  const [deliveryReceiptName, setDeliveryReceiptName] = useState<string>('');

  // Extra Dynamic Charges
  const [extraCharges, setExtraCharges] = useState<ExtraChargeItem[]>([]);
  
  // Sub-popup for Add New Charges
  const [showAddChargeModal, setShowAddChargeModal] = useState(false);
  const [newHead, setNewHead] = useState('');
  const [newAmount, setNewAmount] = useState<number | ''>('');
  const [newDescription, setNewDescription] = useState('');
  const [newReceiptUrl, setNewReceiptUrl] = useState('');
  const [newReceiptName, setNewReceiptName] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);

  // File Upload Helper
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setUrl: (url: string) => void,
    setName: (name: string) => void,
    headLabel: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (!isPdf) {
        const converted = await convertImageToPdf(file, `${headLabel}_Receipt_${file.name}`, true);
        setUrl(converted.pdfDataUrl);
        setName(`${headLabel}_Receipt.pdf`);
      } else {
        const processed = await compressAndPrepareFile(file);
        setUrl(processed.dataUrl || (processed.base64 ? `data:application/pdf;base64,${processed.base64}` : ''));
        setName(file.name);
      }
    } catch (err) {
      console.warn('Failed to process receipt upload:', err);
      alert('Failed to process receipt file.');
    }
  };

  const handleAddExtraCharge = () => {
    if (!newHead.trim()) {
      alert('Please enter a charge head title.');
      return;
    }
    if (!newAmount || Number(newAmount) <= 0) {
      alert('Please enter a valid charge amount.');
      return;
    }

    const newItem: ExtraChargeItem = {
      id: `chg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      head: newHead.trim(),
      amount: Number(newAmount),
      description: newDescription.trim(),
      receiptUrl: newReceiptUrl,
      receiptName: newReceiptName || `${newHead.trim()}_Receipt.pdf`
    };

    setExtraCharges(prev => [...prev, newItem]);
    setNewHead('');
    setNewAmount('');
    setNewDescription('');
    setNewReceiptUrl('');
    setNewReceiptName('');
    setShowAddChargeModal(false);
  };

  const handleRemoveExtraCharge = (id: string) => {
    setExtraCharges(prev => prev.filter(c => c.id !== id));
  };

  // Live Grand Total
  const totalWharfage = Number(wharfageAmount) || 0;
  const totalDemurrage = Number(demurrageAmount) || 0;
  const totalTracker = Number(trackerAmount) || 0;
  const totalDelivery = Number(deliveryAmount) || 0;
  const totalExtra = extraCharges.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const grandTotal = totalWharfage + totalDemurrage + totalTracker + totalDelivery + totalExtra;

  // Complete and Generate Bill
  const handleCompleteAndGenerateBill = async () => {
    if (grandTotal <= 0) {
      alert('Please enter at least one charge amount before generating the bill.');
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Prepare itemized charges
      const allCharges: Array<{
        id?: string;
        head: string;
        amount: number;
        description?: string;
        receiptUrl?: string;
        receiptName?: string;
      }> = [];

      const pdfItems: LoadingBillItem[] = [];

      if (totalWharfage > 0) {
        allCharges.push({
          head: 'Wharfage Payment',
          amount: totalWharfage,
          description: 'Port terminal wharfage payment',
          receiptUrl: wharfageReceiptUrl,
          receiptName: wharfageReceiptName || 'Wharfage_Receipt.pdf'
        });
        pdfItems.push({
          head: 'Wharfage Payment',
          amount: totalWharfage,
          receiptUrl: wharfageReceiptUrl,
          receiptName: wharfageReceiptName
        });
      }

      if (totalDemurrage > 0) {
        allCharges.push({
          head: 'Additional Port Demurrage',
          amount: totalDemurrage,
          description: 'Additional terminal port demurrage',
          receiptUrl: demurrageReceiptUrl,
          receiptName: demurrageReceiptName || 'Demurrage_Receipt.pdf'
        });
        pdfItems.push({
          head: 'Additional Port Demurrage',
          amount: totalDemurrage,
          receiptUrl: demurrageReceiptUrl,
          receiptName: demurrageReceiptName
        });
      }

      if (totalTracker > 0) {
        allCharges.push({
          head: 'Tracker Payment',
          amount: totalTracker,
          description: 'GPS Satellite E-Seal Tracker payment',
          receiptUrl: trackerReceiptUrl,
          receiptName: trackerReceiptName || 'Tracker_Receipt.pdf'
        });
        pdfItems.push({
          head: 'Tracker Payment',
          amount: totalTracker,
          receiptUrl: trackerReceiptUrl,
          receiptName: trackerReceiptName
        });
      }

      if (totalDelivery > 0) {
        allCharges.push({
          head: 'Delivery Charges',
          amount: totalDelivery,
          description: 'Port gate delivery charges',
          receiptUrl: deliveryReceiptUrl,
          receiptName: deliveryReceiptName || 'Delivery_Receipt.pdf'
        });
        pdfItems.push({
          head: 'Delivery Charges',
          amount: totalDelivery,
          receiptUrl: deliveryReceiptUrl,
          receiptName: deliveryReceiptName
        });
      }

      extraCharges.forEach(ex => {
        allCharges.push({
          id: ex.id,
          head: ex.head,
          amount: ex.amount,
          description: ex.description,
          receiptUrl: ex.receiptUrl,
          receiptName: ex.receiptName
        });
        pdfItems.push({
          head: ex.head,
          amount: ex.amount,
          receiptUrl: ex.receiptUrl,
          receiptName: ex.receiptName,
          remarks: ex.description
        });
      });

      // 2. Build StaffLoadingBill object
      const billId = `bill_${Date.now()}`;
      const loadingBill: StaffLoadingBill = {
        id: billId,
        billNo,
        staffUserId,
        staffName,
        caseId: targetCase.id,
        caseNo: targetCase.caseNo,
        clientName: targetCase.clientName,
        containerNo: container?.number || targetCase.containerNumber || 'Container TBD',
        vehicleNo: container?.vehicleNo || loadingStep.assignedVehicleNo || '',
        driverName: container?.driverName || loadingStep.driverName || '',
        portTerminal,
        date: billDate,
        createdAt: new Date().toISOString(),
        charges: allCharges,
        totalAmount: grandTotal,
        paidAmount: 0,
        balanceDue: grandTotal,
        status: 'PENDING',
        remarks
      };

      // 3. Save Bill to staff private bills collection
      await saveStaffBillToFirestore(loadingBill);

      // 4. Automatically Post Debit to Client's Private Ledger for this staff member
      const ledgerEntry: StaffPrivateLedgerEntry = {
        id: `pled_bill_${Date.now()}`,
        staffUserId,
        staffName,
        clientName: targetCase.clientName,
        date: billDate,
        type: 'DEBIT',
        reference: billNo,
        description: `Port Loading Bill - Case ${targetCase.caseNo} (${container?.number || 'Container'})`,
        debit: grandTotal,
        credit: 0,
        balance: grandTotal, // Ledger recalculates running balance on render/load
        caseNo: targetCase.caseNo,
        containerNo: container?.number,
        createdAt: new Date().toISOString()
      };
      await saveStaffPrivateLedgerEntryToFirestore(ledgerEntry);

      // 5. Generate and Download PDF
      const pdfData: LoadingBillData = {
        billNo,
        caseNo: targetCase.caseNo,
        clientName: targetCase.clientName,
        containerNo: container?.number || '',
        vehicleNo: container?.vehicleNo || loadingStep.assignedVehicleNo || '',
        driverName: container?.driverName || loadingStep.driverName || '',
        portTerminal,
        date: billDate,
        items: pdfItems,
        totalAmount: grandTotal,
        remarks,
        officerName: staffName,
        branding: { companyName, customLogo }
      };

      const pdfResult = await downloadLoadingBillPdf(pdfData);

      // 6. Permanently append Loading Bill PDF and port receipts to Case Documents
      // This ensures Case Manager, Finance Manager, and Admin can download this bill anytime,
      // even if the staff ID is deleted or suspended in the future!
      const existingCaseDocs = targetCase.documents || [];
      const newDocsToAdd: any[] = [];

      // Official Loading Bill PDF Document
      newDocsToAdd.push({
        id: `doc_bill_${billNo}`,
        name: `Loading Bill - ${billNo}.pdf`,
        type: 'Loading Bill',
        url: pdfResult?.dataUrl || pdfResult?.blobUrl || '',
        uploadedAt: new Date().toISOString(),
        officer: staffName,
        billNo: billNo,
        totalAmount: grandTotal,
        containerNo: container?.number || targetCase.containerNumber,
        billData: loadingBill
      });

      // Attached Receipt Documents
      allCharges.forEach((ch, idx) => {
        if (ch.receiptUrl) {
          newDocsToAdd.push({
            id: `doc_port_${Date.now()}_${idx}`,
            name: ch.receiptName || `${ch.head} Receipt`,
            type: 'Loading Workflow Receipt',
            url: ch.receiptUrl,
            uploadedAt: new Date().toISOString()
          });
        }
      });

      const existingLoadingBills = (targetCase as any).loadingBills || [];
      const updatedLoadingBills = [
        ...existingLoadingBills.filter((b: any) => b.billNo !== billNo),
        loadingBill
      ];

      const updatedCase: Case = {
        ...targetCase,
        documents: [...existingCaseDocs, ...newDocsToAdd],
        loadingBills: updatedLoadingBills
      };
      await saveCaseToFirestore(updatedCase);

      if (onBillGenerated) {
        onBillGenerated(loadingBill);
      }

      onClose();
    } catch (err) {
      console.error('Failed to generate loading bill:', err);
      alert('An error occurred while creating the loading bill. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Receipt size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">Generate Port Loading Bill</h2>
                <span className="text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  Staff ID: {staffUserId}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Case: <span className="text-gray-200 font-semibold">{targetCase.caseNo}</span> • Client: <span className="text-gray-200 font-semibold">{targetCase.clientName}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white flex items-center justify-center transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar text-xs">
          
          {/* Bill Info Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/60 p-3.5 rounded-2xl border border-white/5">
            <div>
              <label className="text-gray-400 block mb-1 font-medium text-[11px]">Bill Number</label>
              <input
                type="text"
                value={billNo}
                onChange={e => setBillNo(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-white font-mono font-bold text-xs"
              />
            </div>
            <div>
              <label className="text-gray-400 block mb-1 font-medium text-[11px]">Bill Date</label>
              <input
                type="date"
                value={billDate}
                onChange={e => setBillDate(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-white text-xs"
              />
            </div>
            <div>
              <label className="text-gray-400 block mb-1 font-medium text-[11px]">Port / Terminal</label>
              <input
                type="text"
                value={portTerminal}
                onChange={e => setPortTerminal(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-white text-xs"
              />
            </div>
          </div>

          {/* Standard Port Charges List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign size={14} />
                Itemized Loading Charges & Supporting Receipts
              </span>
              <span className="text-[11px] text-gray-400">All amounts in PKR</span>
            </div>

            {/* 1. Wharfage Payment */}
            <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-white/5 space-y-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-white font-bold text-xs block">1. Wharfage Payment</span>
                  <span className="text-[10px] text-gray-400">Port authority terminal dues and wharfage fee</span>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative w-full sm:w-44">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-[11px]">PKR</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={wharfageAmount}
                      onChange={e => setWharfageAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-black/50 border border-white/10 rounded-xl pl-11 pr-3 py-1.5 text-white font-mono font-bold text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Receipt Upload Row */}
              <div className="flex items-center justify-between pt-1 border-t border-white/5">
                <label className="cursor-pointer inline-flex items-center gap-1.5 text-[11px] text-brand-400 hover:text-brand-300 font-medium transition">
                  <UploadCloud size={13} />
                  <span>{wharfageReceiptUrl ? 'Change Receipt' : 'Upload Wharfage Receipt'}</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={e => handleFileUpload(e, setWharfageReceiptUrl, setWharfageReceiptName, 'Wharfage')}
                  />
                </label>
                {wharfageReceiptUrl ? (
                  <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 size={11} /> {wharfageReceiptName || 'Receipt Attached'}
                  </span>
                ) : (
                  <span className="text-[10px] text-gray-500">No receipt attached</span>
                )}
              </div>
            </div>

            {/* 2. Additional Port Demurrage */}
            <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-white/5 space-y-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-white font-bold text-xs block">2. Additional Port Demurrage</span>
                  <span className="text-[10px] text-gray-400">Terminal demurrage / detention storage dues</span>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative w-full sm:w-44">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-[11px]">PKR</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={demurrageAmount}
                      onChange={e => setDemurrageAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-black/50 border border-white/10 rounded-xl pl-11 pr-3 py-1.5 text-white font-mono font-bold text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Receipt Upload Row */}
              <div className="flex items-center justify-between pt-1 border-t border-white/5">
                <label className="cursor-pointer inline-flex items-center gap-1.5 text-[11px] text-brand-400 hover:text-brand-300 font-medium transition">
                  <UploadCloud size={13} />
                  <span>{demurrageReceiptUrl ? 'Change Receipt' : 'Upload Demurrage Receipt'}</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={e => handleFileUpload(e, setDemurrageReceiptUrl, setDemurrageReceiptName, 'Demurrage')}
                  />
                </label>
                {demurrageReceiptUrl ? (
                  <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 size={11} /> {demurrageReceiptName || 'Receipt Attached'}
                  </span>
                ) : (
                  <span className="text-[10px] text-gray-500">No receipt attached</span>
                )}
              </div>
            </div>

            {/* 3. Tracker Payment */}
            <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-white/5 space-y-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-white font-bold text-xs block">3. Tracker Payment</span>
                  <span className="text-[10px] text-gray-400">Satellite GPS E-Seal & tracking activation charge</span>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative w-full sm:w-44">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-[11px]">PKR</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={trackerAmount}
                      onChange={e => setTrackerAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-black/50 border border-white/10 rounded-xl pl-11 pr-3 py-1.5 text-white font-mono font-bold text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Receipt Upload Row */}
              <div className="flex items-center justify-between pt-1 border-t border-white/5">
                <label className="cursor-pointer inline-flex items-center gap-1.5 text-[11px] text-brand-400 hover:text-brand-300 font-medium transition">
                  <UploadCloud size={13} />
                  <span>{trackerReceiptUrl ? 'Change Receipt' : 'Upload Tracker Receipt'}</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={e => handleFileUpload(e, setTrackerReceiptUrl, setTrackerReceiptName, 'Tracker')}
                  />
                </label>
                {trackerReceiptUrl ? (
                  <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 size={11} /> {trackerReceiptName || 'Receipt Attached'}
                  </span>
                ) : (
                  <span className="text-[10px] text-gray-500">No receipt attached</span>
                )}
              </div>
            </div>

            {/* 4. Delivery Charges */}
            <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-white/5 space-y-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-white font-bold text-xs block">4. Delivery Charges</span>
                  <span className="text-[10px] text-gray-400">Terminal delivery pass and gate handling fee</span>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative w-full sm:w-44">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-[11px]">PKR</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={deliveryAmount}
                      onChange={e => setDeliveryAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-black/50 border border-white/10 rounded-xl pl-11 pr-3 py-1.5 text-white font-mono font-bold text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Receipt Upload Row */}
              <div className="flex items-center justify-between pt-1 border-t border-white/5">
                <label className="cursor-pointer inline-flex items-center gap-1.5 text-[11px] text-brand-400 hover:text-brand-300 font-medium transition">
                  <UploadCloud size={13} />
                  <span>{deliveryReceiptUrl ? 'Change Receipt' : 'Upload Delivery Receipt'}</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={e => handleFileUpload(e, setDeliveryReceiptUrl, setDeliveryReceiptName, 'Delivery')}
                  />
                </label>
                {deliveryReceiptUrl ? (
                  <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 size={11} /> {deliveryReceiptName || 'Receipt Attached'}
                  </span>
                ) : (
                  <span className="text-[10px] text-gray-500">No receipt attached</span>
                )}
              </div>
            </div>

            {/* Extra Charges list if added */}
            {extraCharges.map((item, idx) => (
              <div key={item.id} className="p-3.5 bg-slate-950/80 rounded-2xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-white font-bold text-xs block">{5 + idx}. {item.head}</span>
                    {item.description && <span className="text-[10px] text-gray-400 block">{item.description}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-brand-300 text-xs">
                      PKR {item.amount.toLocaleString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveExtraCharge(item.id)}
                      className="p-1 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition"
                      title="Remove charge"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {item.receiptUrl && (
                  <div className="pt-1 border-t border-white/5 text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 size={11} /> {item.receiptName || 'Receipt Attached'}
                  </div>
                )}
              </div>
            ))}

            {/* Button to Add New Charges */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowAddChargeModal(true)}
                className="w-full py-2.5 px-4 bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/30 text-brand-300 font-bold rounded-2xl flex items-center justify-center gap-2 transition"
              >
                <Plus size={14} />
                <span>+ Add New Charges</span>
              </button>
            </div>
          </div>

          {/* Remarks input */}
          <div>
            <label className="text-gray-400 block mb-1 font-medium text-[11px]">Operational Remarks / Notes</label>
            <input
              type="text"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-xs"
            />
          </div>

          {/* Grand Total Summary Box */}
          <div className="bg-gradient-to-r from-amber-500/10 via-slate-900 to-brand-500/10 p-4 rounded-2xl border border-amber-500/30 flex items-center justify-between">
            <div>
              <span className="text-gray-300 font-bold text-xs uppercase tracking-wide block">Total Loading Bill Amount Due</span>
              <span className="text-[10px] text-gray-400">Posts automatically to {targetCase.clientName}'s ledger</span>
            </div>
            <div className="text-right">
              <span className="text-lg font-black text-amber-400 font-mono">
                PKR {grandTotal.toLocaleString()}
              </span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-slate-950/80 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs transition"
          >
            Cancel
          </button>
          
          <button
            type="button"
            onClick={handleCompleteAndGenerateBill}
            disabled={isProcessing || grandTotal <= 0}
            className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-xl shadow-emerald-600/20 transition active:scale-95"
          >
            {isProcessing ? (
              <span>Generating Bill...</span>
            ) : (
              <>
                <CheckCircle2 size={15} />
                <span>Complete & Generate Bill</span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* Sub-Popup Window for Add New Charges */}
      {showAddChargeModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-white/20 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus size={16} className="text-brand-400" />
                Add New Charge Category
              </h3>
              <button 
                onClick={() => setShowAddChargeModal(false)}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-gray-300 block mb-1 font-medium">Charges Head / Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Weighbridge Scale Fee, Labor Handling, Gate Pass"
                  value={newHead}
                  onChange={e => setNewHead(e.target.value)}
                  className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-white outline-none focus:border-brand-500 text-xs font-medium"
                />
              </div>

              <div>
                <label className="text-gray-300 block mb-1 font-medium">Amount (PKR) *</label>
                <input
                  type="number"
                  placeholder="e.g. 5000"
                  value={newAmount}
                  onChange={e => setNewAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-white font-mono font-bold text-xs"
                />
              </div>

              <div>
                <label className="text-gray-300 block mb-1 font-medium">Description / Details</label>
                <input
                  type="text"
                  placeholder="Brief description of charge..."
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-white text-xs"
                />
              </div>

              <div>
                <label className="text-gray-300 block mb-1 font-medium">Upload Receipt (Image / PDF)</label>
                <label className="flex items-center justify-center gap-2 p-3 border border-dashed border-white/20 hover:border-brand-500 rounded-xl cursor-pointer bg-black/40 transition">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={e => handleFileUpload(e, setNewReceiptUrl, setNewReceiptName, newHead || 'Extra')}
                  />
                  <Camera size={15} className="text-brand-400" />
                  <span className="text-xs text-gray-300">{newReceiptName || 'Choose File or Take Photo'}</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowAddChargeModal(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddExtraCharge}
                className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-lg shadow-brand-600/20"
              >
                Add Charge
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
