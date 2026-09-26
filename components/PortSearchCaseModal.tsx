import React, { useState, useMemo } from 'react';
import { 
  X, Search, Filter, RotateCcw, Ship, MapPin, Calendar, 
  User, CheckCircle2, Clock, ChevronRight, AlertCircle 
} from 'lucide-react';
import { Case, CaseStatus } from '../types';

interface PortSearchCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  cases: Case[];
  onSelectCase: (c: Case) => void;
}

export const PortSearchCaseModal: React.FC<PortSearchCaseModalProps> = ({
  isOpen,
  onClose,
  cases,
  onSelectCase
}) => {
  if (!isOpen) return null;

  // Search input at top
  const [searchTerm, setSearchTerm] = useState('');

  // Bottom filters
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedPol, setSelectedPol] = useState('');
  const [selectedPod, setSelectedPod] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Unique list of clients, POLs, and PODs for easy dropdown selection
  const clientOptions = useMemo(() => {
    const set = new Set<string>();
    cases.forEach(c => {
      if (c.clientName) set.add(c.clientName);
    });
    return Array.from(set).sort();
  }, [cases]);

  const polOptions = useMemo(() => {
    const set = new Set<string>();
    cases.forEach(c => {
      if (c.pol) set.add(c.pol);
    });
    return Array.from(set).sort();
  }, [cases]);

  const podOptions = useMemo(() => {
    const set = new Set<string>();
    cases.forEach(c => {
      if (c.pod) set.add(c.pod);
    });
    return Array.from(set).sort();
  }, [cases]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedClient('');
    setSelectedPol('');
    setSelectedPod('');
    setFromDate('');
    setToDate('');
  };

  // Filtered cases logic: works with both search keyword, filters, or combined
  const filteredCases = useMemo(() => {
    return cases.filter(c => {
      // 1. Keyword search (case number, container number, driver name, vehicle, client)
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const caseNo = (c.caseNo || '').toLowerCase();
        const client = (c.clientName || '').toLowerCase();
        const pol = (c.pol || '').toLowerCase();
        const pod = (c.pod || '').toLowerCase();
        const containers = c.containers || [];
        const matchContainer = containers.some(cntr => 
          (cntr.number || '').toLowerCase().includes(q) ||
          (cntr.vehicleNo || '').toLowerCase().includes(q) ||
          (cntr.driverName || '').toLowerCase().includes(q) ||
          (cntr.sealNo || '').toLowerCase().includes(q)
        );

        const matchDirect = caseNo.includes(q) || client.includes(q) || pol.includes(q) || pod.includes(q);
        if (!matchDirect && !matchContainer) return false;
      }

      // 2. Client filter
      if (selectedClient && c.clientName !== selectedClient) {
        return false;
      }

      // 3. Port of Loading filter
      if (selectedPol && c.pol !== selectedPol) {
        return false;
      }

      // 4. Port of Unloading filter
      if (selectedPod && c.pod !== selectedPod) {
        return false;
      }

      // 5. Date range filter
      if (fromDate) {
        const caseDate = c.createdAt ? new Date(c.createdAt).toISOString().split('T')[0] : '';
        if (caseDate && caseDate < fromDate) return false;
      }
      if (toDate) {
        const caseDate = c.createdAt ? new Date(c.createdAt).toISOString().split('T')[0] : '';
        if (caseDate && caseDate > toDate) return false;
      }

      return true;
    });
  }, [cases, searchTerm, selectedClient, selectedPol, selectedPod, fromDate, toDate]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm pt-3 sm:pt-6 pb-6 px-3 sm:px-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] mb-6">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center font-bold">
              <Search size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">Search All Historical Cases & Containers</h2>
              <p className="text-xs text-gray-400">Search by keywords, client, port terminals, or dates to inspect container workflow</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white flex items-center justify-center transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Input Bar (Top) */}
        <div className="p-6 bg-slate-950/50 border-b border-white/10 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by case #, container #, driver name, vehicle plate, client, seal #..."
              className="w-full bg-slate-900 border border-white/15 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all font-medium"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>

          {/* Bottom Filter Grid (Client, POL, POD, Date Range) */}
          <div className="bg-slate-900/80 p-4 rounded-2xl border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Filter size={13} className="text-brand-400" />
                Advanced Case Filter Criteria
              </span>
              {(selectedClient || selectedPol || selectedPod || fromDate || toDate || searchTerm) && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1 hover:underline transition"
                >
                  <RotateCcw size={12} /> Clear all filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
              {/* Client Filter */}
              <div>
                <label className="text-gray-400 block mb-1 font-medium text-[11px]">Client</label>
                <select
                  value={selectedClient}
                  onChange={e => setSelectedClient(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-2 text-white outline-none focus:border-brand-500"
                >
                  <option value="">All Clients</option>
                  {clientOptions.map(cl => (
                    <option key={cl} value={cl}>{cl}</option>
                  ))}
                </select>
              </div>

              {/* Port of Loading (POL) Filter */}
              <div>
                <label className="text-gray-400 block mb-1 font-medium text-[11px]">Port of Loading (POL)</label>
                <select
                  value={selectedPol}
                  onChange={e => setSelectedPol(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-2 text-white outline-none focus:border-brand-500"
                >
                  <option value="">All Loading Ports</option>
                  {polOptions.map(pol => (
                    <option key={pol} value={pol}>{pol}</option>
                  ))}
                </select>
              </div>

              {/* Port of Unloading (POD) Filter */}
              <div>
                <label className="text-gray-400 block mb-1 font-medium text-[11px]">Port of Unloading (POD)</label>
                <select
                  value={selectedPod}
                  onChange={e => setSelectedPod(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-2 text-white outline-none focus:border-brand-500"
                >
                  <option value="">All Destination Ports</option>
                  {podOptions.map(pod => (
                    <option key={pod} value={pod}>{pod}</option>
                  ))}
                </select>
              </div>

              {/* From Date */}
              <div>
                <label className="text-gray-400 block mb-1 font-medium text-[11px]">From Date</label>
                <input 
                  type="date"
                  value={fromDate}
                  onChange={e => setFromDate(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-2 text-white outline-none focus:border-brand-500 text-xs"
                />
              </div>

              {/* To Date */}
              <div>
                <label className="text-gray-400 block mb-1 font-medium text-[11px]">To Date</label>
                <input 
                  type="date"
                  value={toDate}
                  onChange={e => setToDate(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-2 text-white outline-none focus:border-brand-500 text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Results List */}
        <div className="p-6 overflow-y-auto space-y-3 custom-scrollbar flex-1">
          <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1">
            <span>Search Results ({filteredCases.length} records found)</span>
            <span>Click any case to inspect container particulars</span>
          </div>

          {filteredCases.length === 0 ? (
            <div className="p-12 text-center bg-slate-950/40 border border-dashed border-white/10 rounded-3xl space-y-3">
              <Ship size={36} className="mx-auto text-gray-500 opacity-50" />
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">No matching shipments found</h4>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                No cases matched your search query or filter criteria. Try clearing some filters or searching with a different container number or keyword.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="bg-white/10 hover:bg-white/15 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredCases.map(c => {
                const mainCntr = c.containers?.[0];
                const isCompleted = c.status === CaseStatus.COMPLETED;

                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      onSelectCase(c);
                      onClose();
                    }}
                    className="p-4 bg-slate-950/60 hover:bg-slate-950 border border-white/10 hover:border-brand-500/40 rounded-2xl cursor-pointer transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                        isCompleted 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        <Ship size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-white text-xs">{c.caseNo}</span>
                          <span className="text-gray-400 text-xs font-mono">• {mainCntr?.number || 'Container TBD'}</span>
                          <span className="bg-white/5 border border-white/10 text-[10px] text-gray-400 font-bold px-1.5 py-0.5 rounded">
                            {mainCntr?.size || '40ft'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-1 text-[11px] text-gray-400">
                          <span className="text-gray-300 font-semibold">{c.clientName}</span>
                          <span className="text-slate-600">•</span>
                          <span className="flex items-center gap-1">
                            <MapPin size={10} className="text-brand-400" /> {c.pol} → {c.pod}
                          </span>
                          {c.createdAt && (
                            <>
                              <span className="text-slate-600">•</span>
                              <span className="flex items-center gap-1">
                                <Calendar size={10} className="text-gray-500" /> {new Date(c.createdAt).toLocaleDateString()}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-white/5">
                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border flex items-center gap-1 ${
                        isCompleted
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                      }`}>
                        {isCompleted ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                        {c.status}
                      </span>
                      <ChevronRight size={16} className="text-gray-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-white/10 bg-slate-950/80 flex items-center justify-between">
          <span className="text-[11px] text-gray-400">
            Viewing {filteredCases.length} of {cases.length} total system shipments
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition"
          >
            Close Search
          </button>
        </div>

      </div>
    </div>
  );
};
