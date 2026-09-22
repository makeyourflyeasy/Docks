import React, { useState } from 'react';
import { 
  X, DollarSign, Calendar, Plus, Printer, CheckCircle, Clock, 
  ArrowUpRight, ArrowDownLeft, Receipt, Trash2, Filter, AlertCircle, 
  Briefcase, Coffee, ShieldCheck, FileText, User
} from 'lucide-react';
import { AppUser, StaffLedgerEntry } from '../types';
import { saveStaffLedgerEntryToFirestore, deleteStaffLedgerEntryFromFirestore } from '../services/dbService';
import { compressAndPrepareFile } from '../services/fileUtils';

interface StaffLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffUser: AppUser;
  ledgerEntries: StaffLedgerEntry[];
}

export const StaffLedgerModal: React.FC<StaffLedgerModalProps> = ({
  isOpen,
  onClose,
  staffUser,
  ledgerEntries
}) => {
  const [ledgerType, setLedgerType] = useState<'SALARY' | 'DAILY'>('SALARY');

  // Date range filter
  const todayStr = new Date().toISOString().split('T')[0];
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState(firstDayOfMonth);
  const [toDate, setToDate] = useState(todayStr);

  // New Transaction Form Modal
  const [showAddEntryModal, setShowAddEntryModal] = useState(false);
  const [entryDate, setEntryDate] = useState(todayStr);
  const [entryDescription, setEntryDescription] = useState('');
  const [entryCategory, setEntryCategory] = useState('');
  const [entryAmount, setEntryAmount] = useState<number | ''>('');
  const [entryDirection, setEntryDirection] = useState<'DEBIT' | 'CREDIT'>('DEBIT');
  const [entryNotes, setEntryNotes] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [receiptName, setReceiptName] = useState('');
  const [isSettled, setIsSettled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Receipt preview
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filter entries for this staff member and selected ledger type
  const staffIdStr = String(staffUser.id || staffUser.userId || '');
  const matchingEntries = ledgerEntries.filter(e => {
    const isThisStaff = String(e.staffId) === staffIdStr || e.staffName?.toLowerCase() === staffUser.name?.toLowerCase();
    const isThisType = e.type === ledgerType;
    return isThisStaff && isThisType;
  });

  // Apply date range
  const filteredEntries = matchingEntries.filter(e => {
    if (fromDate && e.date < fromDate) return false;
    if (toDate && e.date > toDate) return false;
    return true;
  }).sort((a, b) => (a.date > b.date ? 1 : -1));

  // Compute Running Balance and Totals
  let runningBal = 0;
  const computedRows = filteredEntries.map(e => {
    // For Salary Ledger: Debit = Salary/Allowance Accrued or Paid, Credit = Deductions/Advance repaid
    // For Daily Ledger: Debit = Cash given to staff, Credit = Bill submitted / Cash returned
    if (ledgerType === 'DAILY') {
      runningBal += (Number(e.debit) || 0) - (Number(e.credit) || 0);
    } else {
      runningBal += (Number(e.debit) || 0) - (Number(e.credit) || 0);
    }
    return {
      ...e,
      runningBalance: runningBal
    };
  });

  const totalDebit = filteredEntries.reduce((sum, e) => sum + (Number(e.debit) || 0), 0);
  const totalCredit = filteredEntries.reduce((sum, e) => sum + (Number(e.credit) || 0), 0);
  const netBalance = runningBal;

  // Handle receipt upload
  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const processed = await compressAndPrepareFile(file);
      setReceiptUrl(processed.dataUrl);
      setReceiptName(processed.name);
    } catch (err) {
      console.warn('Receipt upload notice:', err);
    }
  };

  // Open add transaction modal
  const handleOpenAdd = () => {
    setEntryDate(todayStr);
    setEntryAmount('');
    setEntryNotes('');
    setReceiptUrl('');
    setReceiptName('');
    setIsSettled(false);

    if (ledgerType === 'SALARY') {
      setEntryDirection('DEBIT');
      setEntryCategory('Salary Disbursement');
      setEntryDescription(`Monthly Salary payment - ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`);
      setEntryAmount(staffUser.baseSalary || 50000);
    } else {
      setEntryDirection('DEBIT');
      setEntryCategory('Petty Cash Advance');
      setEntryDescription('Cash given for office routine expenses & meals');
      setEntryAmount(2000);
    }
    setShowAddEntryModal(true);
  };

  // Save new ledger transaction
  const handleSaveTransaction = async () => {
    const numAmount = Number(entryAmount);
    if (!numAmount || numAmount <= 0) {
      alert('Please enter a valid amount greater than 0');
      return;
    }
    if (!entryDescription.trim()) {
      alert('Please enter a description for this entry');
      return;
    }

    setIsSubmitting(true);
    try {
      const isDebit = entryDirection === 'DEBIT';
      const debitVal = isDebit ? numAmount : 0;
      const creditVal = !isDebit ? numAmount : 0;

      const newEntry: Partial<StaffLedgerEntry> = {
        staffId: staffIdStr,
        staffName: staffUser.name,
        type: ledgerType,
        date: entryDate,
        description: entryDescription.trim(),
        category: entryCategory || (ledgerType === 'SALARY' ? 'Salary' : 'Petty Cash'),
        debit: debitVal,
        credit: creditVal,
        balance: 0,
        receiptUrl: receiptUrl || undefined,
        notes: entryNotes.trim(),
        settled: isSettled
      };

      await saveStaffLedgerEntryToFirestore(newEntry);
      setShowAddEntryModal(false);
    } catch (err) {
      console.error('Failed to save staff ledger entry:', err);
      alert('Could not save ledger entry. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete an entry
  const handleDeleteEntry = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ledger transaction?')) return;
    try {
      await deleteStaffLedgerEntryFromFirestore(id);
    } catch (err) {
      console.warn('Failed to delete staff ledger entry:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="glass-card rounded-2xl w-full max-w-5xl border border-white/15 shadow-2xl bg-slate-900/98 my-auto max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex justify-between items-center bg-slate-950/80 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-brand-400 shrink-0">
              <User size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {staffUser.name}
                </h3>
                <span className="text-xs bg-brand-500/20 text-brand-300 border border-brand-500/30 px-2 py-0.5 rounded-full font-mono">
                  {staffUser.role || 'Staff Member'}
                </span>
                <span className="text-xs text-gray-400 font-mono">
                  ID: {staffUser.userId || `EMP-${staffUser.id}`}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Staff Financial Ledgers: Dual tracking for Payroll/Salary and Daily Routine Petty Cash
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-white/10 hover:bg-white/15 text-gray-300 px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
            >
              <Printer size={14} /> Print Statement
            </button>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Staff Quick Profile Bar */}
        <div className="bg-white/5 border-b border-white/10 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-4 text-gray-300">
            <span>Phone: <strong className="text-white">{staffUser.contact || 'N/A'}</strong></span>
            <span>CNIC: <strong className="text-white">{staffUser.cnicFront ? 'Uploaded' : (staffUser as any).cnic || 'N/A'}</strong></span>
            <span>Base Salary: <strong className="text-emerald-300 font-mono">PKR {(staffUser.baseSalary || 0).toLocaleString()}</strong></span>
            <span>Fuel Allowance: <strong className="text-blue-300 font-mono">PKR {(staffUser.allowances?.fuel || 0).toLocaleString()}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-400">Portal Login:</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${staffUser.password ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-gray-500/20 text-gray-300 border border-gray-500/30'}`}>
              {staffUser.password ? 'Active Credentials' : 'No Portal Access (Payroll Only)'}
            </span>
          </div>
        </div>

        {/* Dual Ledger Mode Switcher Tabs */}
        <div className="p-3 sm:p-4 bg-black/40 border-b border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          {/* Tabs */}
          <div className="flex items-center gap-2 bg-slate-950/80 p-1 rounded-xl border border-white/10 self-start">
            <button
              onClick={() => setLedgerType('SALARY')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                ledgerType === 'SALARY'
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Briefcase size={14} />
              <span>1. Salary & Loans Ledger</span>
            </button>
            <button
              onClick={() => setLedgerType('DAILY')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                ledgerType === 'DAILY'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Coffee size={14} />
              <span>2. Daily Routine & Petty Cash Ledger</span>
            </button>
          </div>

          {/* Date Range & Add Action */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-black/50 border border-white/10 px-2.5 py-1.5 rounded-xl text-xs">
              <Calendar size={13} className="text-gray-400" />
              <span className="text-gray-400 text-[11px]">From:</span>
              <input 
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-transparent text-white outline-none text-xs cursor-pointer"
              />
              <span className="text-gray-400 text-[11px]">To:</span>
              <input 
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-transparent text-white outline-none text-xs cursor-pointer"
              />
            </div>

            <button
              onClick={handleOpenAdd}
              className={`text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-md transition flex items-center gap-1.5 ${
                ledgerType === 'SALARY' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-amber-600 hover:bg-amber-500'
              }`}
            >
              <Plus size={14} /> {ledgerType === 'SALARY' ? 'Record Salary / Loan' : 'Record Daily Cash / Expense'}
            </button>
          </div>
        </div>

        {/* Ledger Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-950/40 border-b border-white/10 shrink-0">
          <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
            <span className="text-[11px] text-gray-400 block mb-1">
              {ledgerType === 'SALARY' ? 'Total Salary / Advances Paid (Debit)' : 'Total Cash Given to Staff (Debit)'}
            </span>
            <span className="text-base font-bold font-mono text-emerald-400">
              PKR {totalDebit.toLocaleString()}
            </span>
          </div>

          <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
            <span className="text-[11px] text-gray-400 block mb-1">
              {ledgerType === 'SALARY' ? 'Total Deductions / Loans Repaid (Credit)' : 'Total Bills Submitted / Returned (Credit)'}
            </span>
            <span className="text-base font-bold font-mono text-blue-400">
              PKR {totalCredit.toLocaleString()}
            </span>
          </div>

          <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
            <span className="text-[11px] text-gray-400 block mb-1">
              {ledgerType === 'SALARY' ? 'Net Outstanding / Advance Balance' : 'Net Cash Currently in Staff Hand'}
            </span>
            <span className={`text-base font-bold font-mono ${netBalance > 0 ? 'text-amber-400' : 'text-gray-300'}`}>
              PKR {netBalance.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Scrollable Ledger Table */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 text-xs">
          {computedRows.length === 0 ? (
            <div className="p-12 text-center text-gray-400 bg-black/20 rounded-2xl border border-white/5">
              <FileText size={32} className="mx-auto mb-2 text-gray-600 opacity-60" />
              <p className="font-medium text-sm text-gray-300">No ledger transactions found in this date range</p>
              <p className="text-xs text-gray-500 mt-1">
                Click &quot;{ledgerType === 'SALARY' ? 'Record Salary / Loan' : 'Record Daily Cash / Expense'}&quot; to record the first transaction for {staffUser.name}.
              </p>
            </div>
          ) : (
            <div className="border border-white/10 rounded-xl overflow-hidden shadow-lg bg-black/30">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-white/10 text-[11px] text-gray-400 font-semibold uppercase tracking-wider">
                    <th className="p-3">Date</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Description / Details</th>
                    <th className="p-3 text-right">
                      {ledgerType === 'SALARY' ? 'Debit (Paid)' : 'Debit (Cash Given)'}
                    </th>
                    <th className="p-3 text-right">
                      {ledgerType === 'SALARY' ? 'Credit (Deducted)' : 'Credit (Bill / Returned)'}
                    </th>
                    <th className="p-3 text-right">Running Balance</th>
                    <th className="p-3 text-center">Receipt</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {computedRows.map((row) => (
                    <tr key={row.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3 font-mono text-gray-300 whitespace-nowrap">{row.date}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-gray-300 text-[10px] font-medium">
                          {row.category || (ledgerType === 'SALARY' ? 'Salary' : 'Petty Cash')}
                        </span>
                      </td>
                      <td className="p-3 text-white font-medium">
                        <div>{row.description}</div>
                        {row.notes && (
                          <div className="text-[10px] text-gray-400 mt-0.5">{row.notes}</div>
                        )}
                      </td>
                      <td className="p-3 text-right font-mono font-semibold text-emerald-400 whitespace-nowrap">
                        {row.debit > 0 ? `PKR ${row.debit.toLocaleString()}` : '-'}
                      </td>
                      <td className="p-3 text-right font-mono font-semibold text-blue-400 whitespace-nowrap">
                        {row.credit > 0 ? `PKR ${row.credit.toLocaleString()}` : '-'}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-white whitespace-nowrap">
                        PKR {row.runningBalance.toLocaleString()}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        {row.receiptUrl ? (
                          <button
                            type="button"
                            onClick={() => setPreviewReceiptUrl(row.receiptUrl!)}
                            className="text-brand-400 hover:text-brand-300 flex items-center justify-center gap-1 mx-auto text-[11px] underline"
                          >
                            <Receipt size={13} /> View
                          </button>
                        ) : (
                          <span className="text-gray-600 text-[11px]">-</span>
                        )}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleDeleteEntry(row.id)}
                          className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10 transition"
                          title="Delete entry"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-white/10 flex justify-between items-center bg-slate-950/80 rounded-b-2xl shrink-0">
          <span className="text-xs text-gray-400">
            Showing {computedRows.length} transactions for {staffUser.name}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="bg-white/10 hover:bg-white/15 text-gray-300 px-4 py-2 rounded-xl text-xs font-semibold transition"
          >
            Close Ledger
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECONDARY MODAL: ADD TRANSACTION */}
      {/* ========================================================================= */}
      {showAddEntryModal && (
        <div className="fixed inset-0 bg-black/90 z-60 flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="glass-card rounded-2xl w-full max-w-lg border border-white/20 p-5 space-y-4 bg-slate-900 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <DollarSign size={16} className={ledgerType === 'SALARY' ? 'text-emerald-400' : 'text-amber-400'} />
                <span>
                  {ledgerType === 'SALARY' ? 'Record Salary / Advance Payment' : 'Record Daily Routine Cash / Expense'}
                </span>
              </h4>
              <button 
                onClick={() => setShowAddEntryModal(false)} 
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Type Direction Selector */}
              <div>
                <label className="text-gray-300 font-medium block mb-1.5">Transaction Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEntryDirection('DEBIT')}
                    className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition ${
                      entryDirection === 'DEBIT' 
                        ? 'bg-emerald-600 text-white shadow-md' 
                        : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <ArrowDownLeft size={14} />
                    <span>{ledgerType === 'SALARY' ? 'Salary / Advance Paid (Debit)' : 'Cash Given to Staff (Debit)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEntryDirection('CREDIT')}
                    className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition ${
                      entryDirection === 'CREDIT' 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <ArrowUpRight size={14} />
                    <span>{ledgerType === 'SALARY' ? 'Loan Deducted / Repaid (Credit)' : 'Expense Bill / Returned (Credit)'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-300 font-medium block mb-1">Date</label>
                  <input 
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full glass-input rounded-xl p-2 bg-black/40 border border-white/15 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-gray-300 font-medium block mb-1">Amount (PKR) *</label>
                  <input 
                    type="number"
                    placeholder="e.g. 5000"
                    value={entryAmount}
                    onChange={(e) => setEntryAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full glass-input rounded-xl p-2 bg-black/40 border border-emerald-500/40 text-emerald-300 font-mono font-bold outline-none"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-300 font-medium block mb-1">Category</label>
                <select
                  value={entryCategory}
                  onChange={(e) => setEntryCategory(e.target.value)}
                  className="w-full glass-input rounded-xl p-2 bg-black/40 border border-white/15 text-white outline-none"
                >
                  {ledgerType === 'SALARY' ? (
                    <>
                      <option value="Salary Disbursement">Salary Disbursement</option>
                      <option value="Advance Loan">Advance Loan</option>
                      <option value="Fuel Allowance">Fuel Allowance</option>
                      <option value="Mobile Allowance">Mobile Allowance</option>
                      <option value="Bonus / Incentive">Bonus / Incentive</option>
                      <option value="Loan Deduction">Loan Deduction</option>
                    </>
                  ) : (
                    <>
                      <option value="Petty Cash Advance">Petty Cash Advance</option>
                      <option value="Staff Meals / Chai">Staff Meals / Tea / Ration</option>
                      <option value="Stationery / Office Supply">Stationery / Office Supply</option>
                      <option value="Vehicle Fuel / Errand">Vehicle Fuel / Travel Errand</option>
                      <option value="Change / Balance Returned">Remaining Change / Cash Returned</option>
                      <option value="Daily Routine Settlement">Daily Routine Settlement</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="text-gray-300 font-medium block mb-1">Description / Details *</label>
                <input 
                  type="text"
                  placeholder="e.g. Chai & lunch bill for 5 staff members"
                  value={entryDescription}
                  onChange={(e) => setEntryDescription(e.target.value)}
                  className="w-full glass-input rounded-xl p-2 bg-black/40 border border-white/15 text-white outline-none"
                />
              </div>

              {/* Receipt Bill Upload */}
              <div>
                <label className="text-gray-300 font-medium block mb-1">Receipt / Bill Attachment</label>
                <label className="flex items-center justify-center gap-2 p-2.5 border border-dashed border-white/20 rounded-xl cursor-pointer bg-white/5 hover:bg-white/10 transition">
                  <input 
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={handleReceiptUpload}
                  />
                  <Receipt size={14} className="text-gray-400" />
                  <span className="text-gray-300 truncate font-medium">
                    {receiptName || (receiptUrl ? 'Replace Bill Image' : 'Upload Receipt / Bill Copy')}
                  </span>
                </label>
              </div>

              <div>
                <label className="text-gray-300 font-medium block mb-1">Remarks / Notes (Optional)</label>
                <input 
                  type="text"
                  placeholder="e.g. Approved by Accounts Manager"
                  value={entryNotes}
                  onChange={(e) => setEntryNotes(e.target.value)}
                  className="w-full glass-input rounded-xl p-2 bg-black/40 border border-white/15 text-white outline-none"
                />
              </div>
            </div>

            <div className="flex justify-between items-center border-t border-white/10 pt-3">
              <button
                type="button"
                onClick={() => setShowAddEntryModal(false)}
                className="text-gray-400 hover:text-white text-xs px-3 py-1.5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTransaction}
                disabled={isSubmitting || !entryAmount}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-md transition"
              >
                {isSubmitting ? 'Saving...' : 'Save Transaction'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Receipt Viewer */}
      {previewReceiptUrl && (
        <div className="fixed inset-0 bg-black/95 z-70 flex items-center justify-center p-4">
          <div className="glass-card rounded-2xl w-full max-w-xl border border-white/20 p-4 space-y-3 bg-slate-900 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <h4 className="text-sm font-bold text-white">Attached Bill / Receipt</h4>
              <button onClick={() => setPreviewReceiptUrl(null)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center min-h-[300px]">
              <img src={previewReceiptUrl} alt="Receipt" className="max-w-full max-h-[500px] object-contain rounded-xl" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
