import React, { useState } from 'react';
import { 
  X, Printer, Calendar, Search, DollarSign, Building, 
  ArrowDownLeft, ArrowUpRight, FileText, CheckCircle, Clock, 
  ChevronRight, Download, Filter
} from 'lucide-react';
import { Client, Case, FinanceEntry } from '../types';

interface ClientLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  cases: Case[];
  finances: FinanceEntry[];
}

interface LedgerRow {
  id: string;
  date: string;
  type: 'INVOICE' | 'PAYMENT' | 'ADJUSTMENT';
  refNumber: string;
  description: string;
  debit: number;   // Billed to client
  credit: number;  // Received from client
  runningBalance: number;
}

export const ClientLedgerModal: React.FC<ClientLedgerModalProps> = ({
  isOpen,
  onClose,
  client,
  cases,
  finances
}) => {
  // Date range filter
  const todayStr = new Date().toISOString().split('T')[0];
  const firstDayOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState(firstDayOfYear);
  const [toDate, setToDate] = useState(todayStr);
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  // Filter cases for this client
  const clientNameNormalized = client.name.toLowerCase().trim();
  const clientCases = cases.filter(c => {
    const cClient = (c.clientName || c.client || (c.extractedData as any)?.cargoOwner || (c.extractedData as any)?.consigneeName || '').toLowerCase().trim();
    return cClient === clientNameNormalized || cClient.includes(clientNameNormalized) || clientNameNormalized.includes(cClient);
  });

  // Filter financial transactions for this client
  const clientFinances = finances.filter(f => {
    const p1 = (f.party || '').toLowerCase().trim();
    const p2 = (f.clientName || '').toLowerCase().trim();
    return p1 === clientNameNormalized || p1.includes(clientNameNormalized) || clientNameNormalized.includes(p1) ||
           p2 === clientNameNormalized || p2.includes(clientNameNormalized) || clientNameNormalized.includes(p2);
  });

  // Build unified chronological rows
  const rawRows: Omit<LedgerRow, 'runningBalance'>[] = [];

  // 1. Add Case Invoices (Debit)
  clientCases.forEach(c => {
    // Calculate total case amount
    const chargesSum = Array.isArray(c.charges)
      ? c.charges.reduce((sum, ch) => sum + (Number(ch.amount || (ch as any).defaultAmount) || 0), 0)
      : 0;
    const totalBilled = Number(c.totalAmount) || chargesSum || 0;

    const caseDate = c.createdAt 
      ? new Date(c.createdAt).toISOString().split('T')[0]
      : (c.registrationDate || c.date || todayStr);

    const ref = c.caseNo || c.caseNumber || (c.invoiceNo) || `CASE-${c.id}`;
    const blInfo = c.extractedData?.blNumber || c.blNumber || (c as any).gdNumber || 'N/A';

    if (totalBilled > 0) {
      rawRows.push({
        id: `case_${c.id}`,
        date: caseDate,
        type: 'INVOICE',
        refNumber: ref,
        description: `Case Billing: ${c.category || 'Logistics'} - ${c.pol || ''} to ${c.pod || ''} (BL: ${blInfo})`,
        debit: totalBilled,
        credit: 0
      });
    }

    // If case has advance paid recorded directly
    if (c.advancePaid && Number(c.advancePaid) > 0) {
      rawRows.push({
        id: `case_adv_${c.id}`,
        date: caseDate,
        type: 'PAYMENT',
        refNumber: `ADV-${ref}`,
        description: `Advance Payment Received on Case ${ref}`,
        debit: 0,
        credit: Number(c.advancePaid)
      });
    }
  });

  // 2. Add Direct Financial Payments / Receipts (Credit)
  clientFinances.forEach(f => {
    const finDate = f.date ? new Date(f.date).toISOString().split('T')[0] : todayStr;
    const isIncome = f.type === 'INCOME' || (f.type as any) === 'RECEIPT';

    if (isIncome) {
      rawRows.push({
        id: `fin_${f.id}`,
        date: finDate,
        type: 'PAYMENT',
        refNumber: f.voucherNumber || f.referenceNumber || `VCH-${f.id}`,
        description: f.description || `Payment Received - ${f.paymentMethod || 'Bank/Cash'}`,
        debit: 0,
        credit: Number(f.amount) || 0
      });
    } else {
      // Expense or refund
      rawRows.push({
        id: `fin_${f.id}`,
        date: finDate,
        type: 'ADJUSTMENT',
        refNumber: f.voucherNumber || `ADJ-${f.id}`,
        description: f.description || 'Adjustment / Debit Note',
        debit: Number(f.amount) || 0,
        credit: 0
      });
    }
  });

  // Sort chronologically
  rawRows.sort((a, b) => (a.date > b.date ? 1 : -1));

  // Compute Running Balance
  let runningBal = 0;
  const rowsWithBalance: LedgerRow[] = rawRows.map(row => {
    runningBal += (row.debit - row.credit);
    return {
      ...row,
      runningBalance: runningBal
    };
  });

  // Apply Date Range and Search Filter
  const filteredRows = rowsWithBalance.filter(row => {
    if (fromDate && row.date < fromDate) return false;
    if (toDate && row.date > toDate) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchRef = row.refNumber.toLowerCase().includes(q);
      const matchDesc = row.description.toLowerCase().includes(q);
      if (!matchRef && !matchDesc) return false;
    }
    return true;
  });

  const totalDebit = filteredRows.reduce((sum, r) => sum + r.debit, 0);
  const totalCredit = filteredRows.reduce((sum, r) => sum + r.credit, 0);
  const currentOutstanding = filteredRows.length > 0 
    ? filteredRows[filteredRows.length - 1].runningBalance 
    : 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="glass-card rounded-2xl w-full max-w-5xl border border-white/15 shadow-2xl bg-slate-900/98 my-auto max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex justify-between items-center bg-slate-950/80 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Building size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {client.name}
                </h3>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Client Financial Statement
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Full chronological ledger statement showing all case billings, advance receipts, and net balance
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-white/10 hover:bg-white/15 text-gray-300 px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
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

        {/* Client KYC & Details Bar */}
        <div className="bg-white/5 border-b border-white/10 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-4 text-gray-300">
            <span>Owner: <strong className="text-white">{client.ownerName || client.contact || 'N/A'}</strong></span>
            <span>Phone: <strong className="text-white">{client.mobileNumber || client.phone || 'N/A'}</strong></span>
            <span>NTN: <strong className="text-white">{client.ntn || 'N/A'}</strong></span>
            <span>Default Category: <strong className="text-brand-300">{client.defaultCaseCategory || 'Bonded Carrier'}</strong></span>
          </div>
          <div className="text-gray-400 font-mono">
            Total Cases: <strong className="text-white">{clientCases.length}</strong>
          </div>
        </div>

        {/* Date Filter & Search Bar */}
        <div className="p-3 sm:p-4 bg-black/40 border-b border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
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
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text"
              placeholder="Search case / voucher #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full glass-input rounded-xl pl-8 pr-3 py-1.5 bg-black/40 border border-white/10 text-white text-xs outline-none"
            />
          </div>
        </div>

        {/* Ledger Totals Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-950/40 border-b border-white/10 shrink-0">
          <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
            <span className="text-[11px] text-gray-400 block mb-1">
              Total Invoiced / Billed (Debit)
            </span>
            <span className="text-base font-bold font-mono text-emerald-400">
              PKR {totalDebit.toLocaleString()}
            </span>
          </div>

          <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
            <span className="text-[11px] text-gray-400 block mb-1">
              Total Received / Paid (Credit)
            </span>
            <span className="text-base font-bold font-mono text-blue-400">
              PKR {totalCredit.toLocaleString()}
            </span>
          </div>

          <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
            <span className="text-[11px] text-gray-400 block mb-1">
              Net Receivable Balance Due
            </span>
            <span className={`text-base font-bold font-mono ${currentOutstanding > 0 ? 'text-amber-400' : 'text-gray-300'}`}>
              PKR {currentOutstanding.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Scrollable Statement Table */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 text-xs">
          {filteredRows.length === 0 ? (
            <div className="p-12 text-center text-gray-400 bg-black/20 rounded-2xl border border-white/5">
              <FileText size={32} className="mx-auto mb-2 text-gray-600 opacity-60" />
              <p className="font-medium text-sm text-gray-300">No transactions recorded for this client in selected range</p>
              <p className="text-xs text-gray-500 mt-1">
                Cases registered for &quot;{client.name}&quot; and direct receipts will automatically appear here.
              </p>
            </div>
          ) : (
            <div className="border border-white/10 rounded-xl overflow-hidden shadow-lg bg-black/30">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-white/10 text-[11px] text-gray-400 font-semibold uppercase tracking-wider">
                    <th className="p-3">Date</th>
                    <th className="p-3">Ref / Case #</th>
                    <th className="p-3">Description</th>
                    <th className="p-3 text-right">Debit (Billed)</th>
                    <th className="p-3 text-right">Credit (Received)</th>
                    <th className="p-3 text-right">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredRows.map((row) => (
                    <tr key={row.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3 font-mono text-gray-300 whitespace-nowrap">{row.date}</td>
                      <td className="p-3 font-mono font-medium text-brand-300 whitespace-nowrap">
                        {row.refNumber}
                      </td>
                      <td className="p-3 text-white font-medium">
                        {row.description}
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
            Total {filteredRows.length} statement line items
          </span>
          <button
            type="button"
            onClick={onClose}
            className="bg-white/10 hover:bg-white/15 text-gray-300 px-4 py-2 rounded-xl text-xs font-semibold transition"
          >
            Close Statement
          </button>
        </div>
      </div>
    </div>
  );
};
