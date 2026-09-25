import React, { useState, useMemo } from 'react';
import { 
  X, Search, Download, FileText, Calendar, DollarSign, 
  CheckCircle2, UploadCloud, CreditCard, User, RotateCcw, AlertCircle, Eye
} from 'lucide-react';
import { StaffLoadingBill, StaffPrivateLedgerEntry } from '../types';
import { downloadLoadingBillPdf, downloadClientLedgerPdf, LoadingBillData } from '../services/pdfExportService';
import { saveStaffPrivateLedgerEntryToFirestore, saveStaffBillToFirestore } from '../services/dbService';
import { compressAndPrepareFile, convertImageToPdf } from '../services/fileUtils';
import { useBranding } from '../services/brandingService';

// ==========================================
// 1. DOWNLOAD LOADING BILL MODAL (With Search)
// ==========================================

interface DownloadBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  bills: StaffLoadingBill[];
  staffName: string;
}

export const DownloadLoadingBillSearchModal: React.FC<DownloadBillModalProps> = ({
  isOpen,
  onClose,
  bills,
  staffName
}) => {
  const { customLogo, companyName } = useBranding();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  if (!isOpen) return null;

  const filteredBills = bills.filter(b => {
    if (selectedDate && b.date !== selectedDate) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      const matchBillNo = (b.billNo || '').toLowerCase().includes(q);
      const matchCase = (b.caseNo || '').toLowerCase().includes(q);
      const matchClient = (b.clientName || '').toLowerCase().includes(q);
      const matchContainer = (b.containerNo || '').toLowerCase().includes(q);
      return matchBillNo || matchCase || matchClient || matchContainer;
    }

    return true;
  });

  const handleDownload = async (b: StaffLoadingBill) => {
    try {
      const pdfData: LoadingBillData = {
        billNo: b.billNo,
        caseNo: b.caseNo,
        clientName: b.clientName,
        containerNo: b.containerNo,
        vehicleNo: b.vehicleNo,
        driverName: b.driverName,
        portTerminal: b.portTerminal,
        date: b.date,
        items: (b.charges || []).map(ch => ({
          head: ch.head,
          amount: ch.amount,
          receiptName: ch.receiptName,
          receiptUrl: ch.receiptUrl,
          remarks: ch.description
        })),
        totalAmount: b.totalAmount,
        remarks: b.remarks,
        officerName: staffName,
        branding: { companyName, customLogo }
      };

      await downloadLoadingBillPdf(pdfData);
    } catch (err) {
      console.error(err);
      alert('Failed to generate Loading Bill PDF');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Download size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">Download Port Loading Bills</h2>
              <p className="text-xs text-gray-400">Search created bills by bill #, case #, container #, or client</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white flex items-center justify-center transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 bg-slate-950/60 border-b border-white/10 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by bill #, case #, container #, or client name..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-400 outline-none focus:border-brand-500"
              autoFocus
            />
          </div>
          <div className="w-full sm:w-44">
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-2xl px-3 py-2.5 text-xs text-white outline-none focus:border-brand-500"
            />
          </div>
          {(searchTerm || selectedDate) && (
            <button
              type="button"
              onClick={() => { setSearchTerm(''); setSelectedDate(''); }}
              className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-2xl text-xs font-semibold"
            >
              Clear
            </button>
          )}
        </div>

        {/* Bills List */}
        <div className="p-6 overflow-y-auto space-y-3 custom-scrollbar flex-1 text-xs">
          {filteredBills.length === 0 ? (
            <div className="p-12 text-center bg-slate-950/40 border border-dashed border-white/10 rounded-3xl space-y-2">
              <FileText size={32} className="mx-auto text-gray-500 opacity-60" />
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">No Loading Bills Found</h4>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                No bills match your current search query. Create a bill from the Current Cases workflow to generate records.
              </p>
            </div>
          ) : (
            filteredBills.map(b => (
              <div
                key={b.id || b.billNo}
                className="p-4 bg-slate-950/80 hover:bg-slate-950 border border-white/10 hover:border-amber-500/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition shadow-md"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-amber-300 text-xs">{b.billNo}</span>
                    <span className="text-gray-400 text-xs font-mono">• Case: {b.caseNo}</span>
                    <span className="text-gray-400 text-xs font-mono">• {b.containerNo}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400">
                    <span className="text-gray-200 font-semibold">{b.clientName}</span>
                    <span className="text-slate-600">•</span>
                    <span>Date: {b.date}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-brand-300">{b.charges?.length || 0} itemized charges</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-white/5">
                  <div className="text-right">
                    <span className="text-[10px] text-gray-500 uppercase font-bold block">Bill Total</span>
                    <span className="text-xs font-bold text-emerald-400 font-mono">
                      PKR {b.totalAmount.toLocaleString()}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownload(b)}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/10 transition active:scale-95 shrink-0"
                  >
                    <Download size={13} />
                    <span>Download Bill</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-white/10 bg-slate-950/80 flex items-center justify-between text-[11px] text-gray-400">
          <span>{filteredBills.length} bills displayed</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};


// ==========================================
// 2. DOWNLOAD CLIENT LEDGER MODAL
// ==========================================

interface DownloadLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  ledgerEntries: StaffPrivateLedgerEntry[];
  bills: StaffLoadingBill[];
  staffUserId: string;
  staffName: string;
}

export const DownloadClientLedgerModal: React.FC<DownloadLedgerModalProps> = ({
  isOpen,
  onClose,
  ledgerEntries,
  bills,
  staffUserId,
  staffName
}) => {
  const { customLogo, companyName } = useBranding();
  if (!isOpen) return null;

  // Extract unique client names
  const clientOptions = useMemo(() => {
    const set = new Set<string>();
    ledgerEntries.forEach(e => {
      if (e.clientName) set.add(e.clientName);
    });
    bills.forEach(b => {
      if (b.clientName) set.add(b.clientName);
    });
    return Array.from(set).sort();
  }, [ledgerEntries, bills]);

  const [selectedClient, setSelectedClient] = useState(clientOptions[0] || '');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  // Filter entries for selected client and date range
  const filteredEntries = useMemo(() => {
    if (!selectedClient) return [];
    return ledgerEntries.filter(e => {
      if (e.clientName !== selectedClient) return false;
      if (fromDate && e.date < fromDate) return false;
      if (toDate && e.date > toDate) return false;
      return true;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [ledgerEntries, selectedClient, fromDate, toDate]);

  // Running balance calculation
  let runningBal = 0;
  const computedRows = filteredEntries.map(e => {
    if (e.type === 'DEBIT') {
      runningBal += Number(e.debit || 0);
    } else {
      runningBal -= Number(e.credit || 0);
    }
    return { ...e, calculatedBalance: runningBal };
  });

  const totalDebits = filteredEntries.reduce((s, e) => s + (Number(e.debit) || 0), 0);
  const totalCredits = filteredEntries.reduce((s, e) => s + (Number(e.credit) || 0), 0);
  const netDue = totalDebits - totalCredits;

  const handleDownloadLedger = async () => {
    if (!selectedClient) {
      alert('Please select a client to download the ledger statement.');
      return;
    }

    setIsDownloading(true);
    try {
      const statementDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      
      const pdfExportData = {
        clientName: selectedClient,
        statementDate,
        companyName,
        customLogo,
        summary: {
          totalDebits,
          totalCredits,
          netBalance: netDue,
          totalCases: 0,
          totalContainers: 0
        },
        entries: computedRows.map(r => ({
          date: r.date,
          reference: r.reference || '-',
          description: r.description || '-',
          debit: r.debit || 0,
          credit: r.credit || 0,
          balance: r.calculatedBalance,
          type: r.type,
          party: selectedClient
        })),
        branding: { companyName, customLogo }
      };

      await downloadClientLedgerPdf(pdfExportData as any);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to generate Client Ledger PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center font-bold">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">Download Client Ledger Statement</h2>
              <p className="text-xs text-gray-400">Export private ledger showing bills, payments, and running balance</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white flex items-center justify-center transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter Selection Body */}
        <div className="p-6 bg-slate-950/60 border-b border-white/10 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-gray-300 block mb-1 font-medium text-[11px]">Select Client *</label>
              <select
                value={selectedClient}
                onChange={e => setSelectedClient(e.target.value)}
                className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-white outline-none focus:border-brand-500 text-xs font-medium"
              >
                <option value="">-- Choose Client --</option>
                {clientOptions.map(cl => (
                  <option key={cl} value={cl}>{cl}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-gray-300 block mb-1 font-medium text-[11px]">From Date (Optional)</label>
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="text-gray-300 block mb-1 font-medium text-[11px]">To Date (Optional)</label>
              <input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* Ledger Summary Ribbon */}
          {selectedClient && (
            <div className="grid grid-cols-3 gap-3 bg-slate-900/80 p-3.5 rounded-2xl border border-white/10 text-center">
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Total Billed (Debits)</span>
                <span className="text-xs font-mono font-bold text-red-400">
                  PKR {totalDebits.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Total Received (Credits)</span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  PKR {totalCredits.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Net Balance Due</span>
                <span className="text-xs font-mono font-bold text-amber-300">
                  PKR {netDue.toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Ledger Entries Preview Table */}
        <div className="p-6 overflow-y-auto space-y-3 custom-scrollbar flex-1 text-xs">
          {!selectedClient ? (
            <div className="text-center py-10 text-gray-500 text-xs">
              Select a client from the dropdown above to view and download their statement of account.
            </div>
          ) : computedRows.length === 0 ? (
            <div className="text-center py-10 text-gray-500 text-xs bg-slate-950/40 rounded-2xl border border-dashed border-white/10 p-6">
              No bills or payments recorded for {selectedClient} in the selected date range.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-gray-400 border-b border-white/10 pb-2 text-[11px] font-bold">
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Ref / Voucher</th>
                    <th className="pb-2">Narration</th>
                    <th className="pb-2 text-right">Debit (Billed)</th>
                    <th className="pb-2 text-right">Credit (Paid)</th>
                    <th className="pb-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {computedRows.map(row => (
                    <tr key={row.id} className="hover:bg-white/5">
                      <td className="py-2 text-gray-400 font-mono text-[11px]">{row.date}</td>
                      <td className="py-2 font-mono font-semibold text-white">{row.reference || '-'}</td>
                      <td className="py-2 text-gray-300 max-w-xs truncate">{row.description}</td>
                      <td className="py-2 text-right font-mono font-bold text-red-400">
                        {row.debit > 0 ? `PKR ${row.debit.toLocaleString()}` : '-'}
                      </td>
                      <td className="py-2 text-right font-mono font-bold text-emerald-400">
                        {row.credit > 0 ? `PKR ${row.credit.toLocaleString()}` : '-'}
                      </td>
                      <td className="py-2 text-right font-mono font-bold text-amber-300">
                        PKR {row.calculatedBalance.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-slate-950/80 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs transition"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleDownloadLedger}
            disabled={!selectedClient || isDownloading}
            className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-brand-600 to-sky-500 hover:from-brand-500 hover:to-sky-400 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-xl shadow-brand-600/20 transition active:scale-95"
          >
            <Download size={15} />
            <span>{isDownloading ? 'Generating PDF...' : 'Download Client Ledger PDF'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};


// ==========================================
// 3. ADD PAYMENT MODAL
// ==========================================

interface AddPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffUserId: string;
  staffName: string;
  clients: string[];
  onPaymentAdded?: (entry: StaffPrivateLedgerEntry) => void;
}

export const AddStaffPaymentModal: React.FC<AddPaymentModalProps> = ({
  isOpen,
  onClose,
  staffUserId,
  staffName,
  clients,
  onPaymentAdded
}) => {
  if (!isOpen) return null;

  const [selectedClient, setSelectedClient] = useState(clients[0] || '');
  const [customClientName, setCustomClientName] = useState('');
  const [isCash, setIsCash] = useState(false);
  const [amount, setAmount] = useState<number | ''>('');
  const [remarks, setRemarks] = useState('Payment received against port loading disbursements.');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [slipUrl, setSlipUrl] = useState('');
  const [slipName, setSlipName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSlipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (!isPdf) {
        const converted = await convertImageToPdf(file, `Deposit_Slip_${file.name}`, true);
        setSlipUrl(converted.pdfDataUrl);
        setSlipName('Deposit_Slip.pdf');
      } else {
        const processed = await compressAndPrepareFile(file);
        setSlipUrl(processed.dataUrl || (processed.base64 ? `data:application/pdf;base64,${processed.base64}` : ''));
        setSlipName(file.name);
      }
    } catch (err) {
      console.warn('Slip upload failed', err);
      alert('Failed to process deposit slip.');
    }
  };

  const handleFinish = async () => {
    const finalClient = selectedClient === 'custom' ? customClientName.trim() : selectedClient;
    const finalAmount = Number(amount);

    if (!finalClient) {
      alert('Please select or specify a client name.');
      return;
    }
    if (isNaN(finalAmount) || finalAmount <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }
    if (!isCash && !slipUrl) {
      alert('Please either tick "Cash Payment" or upload a bank deposit slip receipt.');
      return;
    }

    setIsSubmitting(true);
    try {
      const entryId = `pled_pay_${Date.now()}`;
      const reference = isCash ? 'CASH-RECEIPT' : (slipName || 'BANK-DEPOSIT');

      const entry: StaffPrivateLedgerEntry = {
        id: entryId,
        staffUserId,
        staffName,
        clientName: finalClient,
        date: paymentDate,
        type: 'CREDIT',
        reference,
        description: remarks || (isCash ? 'Payment Received via Cash' : 'Payment Received via Bank Deposit Slip'),
        debit: 0,
        credit: finalAmount,
        balance: 0, // Recalculated dynamically
        paymentMode: isCash ? 'CASH' : 'DEPOSIT_SLIP',
        receiptUrl: slipUrl || undefined,
        receiptName: slipName || undefined,
        remarks,
        createdAt: new Date().toISOString()
      };

      await saveStaffPrivateLedgerEntryToFirestore(entry);

      if (onPaymentAdded) {
        onPaymentAdded(entry);
      }

      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to record payment in database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <CreditCard size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">Record Client Payment</h2>
              <p className="text-xs text-gray-400">Post deposit slip or cash payment to client ledger</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white flex items-center justify-center transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4 text-xs">
          
          {/* Client Selection */}
          <div>
            <label className="text-gray-300 block mb-1 font-medium text-[11px]">Select Client *</label>
            <select
              value={selectedClient}
              onChange={e => setSelectedClient(e.target.value)}
              className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-white outline-none focus:border-brand-500 text-xs font-medium"
            >
              <option value="">-- Choose Client --</option>
              {clients.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
              <option value="custom">+ Other / New Client Name</option>
            </select>
          </div>

          {selectedClient === 'custom' && (
            <div>
              <label className="text-gray-300 block mb-1 font-medium text-[11px]">Enter Client Name *</label>
              <input
                type="text"
                placeholder="Client Name..."
                value={customClientName}
                onChange={e => setCustomClientName(e.target.value)}
                className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-white outline-none focus:border-brand-500 text-xs"
              />
            </div>
          )}

          {/* Payment Method: Cash checkbox or Deposit Slip */}
          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-white/10 space-y-3">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Payment Verification Method</span>
            
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isCash}
                onChange={e => setIsCash(e.target.checked)}
                className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500 bg-black/50 border-white/20"
              />
              <span className="text-white font-medium">Cash Payment Received Directly</span>
            </label>

            {!isCash && (
              <div className="space-y-1 pt-1 border-t border-white/5">
                <label className="text-gray-400 block mb-1 text-[11px]">Upload Bank Deposit Slip / Cheque Receipt *</label>
                <label className="flex items-center justify-center gap-2 p-3 border border-dashed border-white/20 hover:border-brand-500 rounded-xl cursor-pointer bg-black/40 hover:bg-black/60 transition text-center text-xs">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={handleSlipUpload}
                  />
                  <UploadCloud size={15} className="text-brand-400" />
                  <span className="text-gray-300 font-medium">
                    {slipName || 'Upload Deposit Slip (Image or PDF)'}
                  </span>
                </label>
                {slipUrl && (
                  <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1 mt-1">
                    <CheckCircle2 size={11} /> Slip attached successfully
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Amount (PKR) */}
          <div>
            <label className="text-gray-300 block mb-1 font-medium text-[11px]">Received Amount (PKR) *</label>
            <input
              type="number"
              placeholder="e.g. 50000"
              value={amount}
              onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-white font-mono font-bold text-xs outline-none focus:border-brand-500"
            />
          </div>

          {/* Date (Defaults to current, editable) */}
          <div>
            <label className="text-gray-300 block mb-1 font-medium text-[11px]">Payment Date *</label>
            <input
              type="date"
              value={paymentDate}
              onChange={e => setPaymentDate(e.target.value)}
              className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-brand-500"
            />
          </div>

          {/* Remarks */}
          <div>
            <label className="text-gray-300 block mb-1 font-medium text-[11px]">Narration / Remarks</label>
            <input
              type="text"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-brand-500"
            />
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
            onClick={handleFinish}
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-xl shadow-emerald-600/20 transition active:scale-95"
          >
            <CheckCircle2 size={15} />
            <span>Finish & Post Payment</span>
          </button>
        </div>

      </div>
    </div>
  );
};
