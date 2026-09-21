import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Search, X, Filter, Calendar, Building, ChevronDown, Check, ArrowRight,
  Package, Anchor, Truck, FileText, Sparkles, Layers, SlidersHorizontal
} from 'lucide-react';
import { Case, Client } from '../types';

interface SmartCaseSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  cases: Case[];
  clients?: Client[];
  onSelectCase: (caseItem: Case) => void;
}

export const SmartCaseSearchModal: React.FC<SmartCaseSearchModalProps> = ({
  isOpen,
  onClose,
  cases,
  clients = [],
  onSelectCase
}) => {
  const [quickQuery, setQuickQuery] = useState('');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Advanced Filters
  const [selectedClientName, setSelectedClientName] = useState('');
  const [clientSearchInput, setClientSearchInput] = useState('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);

  const [selectedPol, setSelectedPol] = useState('');
  const [selectedPod, setSelectedPod] = useState('');
  const [selectedShippingAgent, setSelectedShippingAgent] = useState('');
  const [selectedShippingLine, setSelectedShippingLine] = useState('');

  // Date Range Options: 'ALL' or 'CUSTOM'
  const [dateMode, setDateMode] = useState<'ALL' | 'CUSTOM'>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const clientDropdownRef = useRef<HTMLDivElement>(null);

  // Close client dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target as Node)) {
        setIsClientDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Unique lists for suggestions
  const uniqueClients = useMemo(() => {
    const set = new Set<string>();
    clients.forEach(c => c.name && set.add(c.name));
    cases.forEach(c => c.clientName && set.add(c.clientName));
    return Array.from(set).sort();
  }, [clients, cases]);

  const uniquePols = useMemo(() => {
    const set = new Set<string>();
    cases.forEach(c => c.pol && set.add(c.pol));
    return Array.from(set).sort();
  }, [cases]);

  const uniquePods = useMemo(() => {
    const set = new Set<string>();
    cases.forEach(c => c.pod && set.add(c.pod));
    return Array.from(set).sort();
  }, [cases]);

  const uniqueShippingAgents = useMemo(() => {
    const set = new Set<string>();
    cases.forEach(c => {
      if (c.shippingAgent) set.add(c.shippingAgent);
    });
    return Array.from(set).sort();
  }, [cases]);

  const uniqueShippingLines = useMemo(() => {
    const set = new Set<string>();
    cases.forEach(c => {
      if (c.shippingLine) set.add(c.shippingLine);
    });
    return Array.from(set).sort();
  }, [cases]);

  // Filtered Client Suggestions for Auto-complete
  const filteredClientSuggestions = useMemo(() => {
    if (!clientSearchInput.trim()) return uniqueClients;
    const q = clientSearchInput.toLowerCase();
    return uniqueClients.filter(name => name.toLowerCase().includes(q));
  }, [uniqueClients, clientSearchInput]);

  // Main Filtering Engine
  const filteredCases = useMemo(() => {
    return cases.filter(c => {
      // 1. Quick Search String Match
      if (quickQuery.trim()) {
        const q = quickQuery.toLowerCase().trim();
        const matchImporter = c.importer?.toLowerCase().includes(q);
        const matchShippingAgent = c.shippingAgent?.toLowerCase().includes(q);
        const matchShipper = c.shipper?.toLowerCase().includes(q);
        const matchCaseNo = c.caseNo?.toLowerCase().includes(q) || String(c.id).toLowerCase().includes(q);
        const matchBlNo = c.blNumber?.toLowerCase().includes(q);
        const matchClientName = c.clientName?.toLowerCase().includes(q);
        
        // Match container numbers
        const matchContainer = c.containers?.some(cntr => cntr.number?.toLowerCase().includes(q));

        // Fuzzy item description match
        const itemDesc = (c.itemDescription || (c as any).goodsDescription || (c as any).cargoDescription || '').toLowerCase();
        const matchItem = itemDesc.includes(q);

        if (!matchImporter && !matchShippingAgent && !matchShipper && !matchCaseNo && !matchBlNo && !matchClientName && !matchContainer && !matchItem) {
          return false;
        }
      }

      // 2. Advanced Filters (if active)
      if (selectedClientName) {
        if (c.clientName?.toLowerCase() !== selectedClientName.toLowerCase()) return false;
      }
      if (selectedPol) {
        if (c.pol?.toLowerCase() !== selectedPol.toLowerCase()) return false;
      }
      if (selectedPod) {
        if (c.pod?.toLowerCase() !== selectedPod.toLowerCase()) return false;
      }
      if (selectedShippingAgent) {
        if (c.shippingAgent?.toLowerCase() !== selectedShippingAgent.toLowerCase()) return false;
      }
      if (selectedShippingLine) {
        if (c.shippingLine?.toLowerCase() !== selectedShippingLine.toLowerCase()) return false;
      }

      // 3. Date Range Filter
      if (dateMode === 'CUSTOM') {
        const caseDate = c.createdAt ? c.createdAt.split('T')[0] : '';
        if (startDate && caseDate < startDate) return false;
        if (endDate && caseDate > endDate) return false;
      }

      return true;
    });
  }, [
    cases, 
    quickQuery, 
    selectedClientName, 
    selectedPol, 
    selectedPod, 
    selectedShippingAgent, 
    selectedShippingLine, 
    dateMode, 
    startDate, 
    endDate
  ]);

  const handleResetFilters = () => {
    setQuickQuery('');
    setSelectedClientName('');
    setClientSearchInput('');
    setSelectedPol('');
    setSelectedPod('');
    setSelectedShippingAgent('');
    setSelectedShippingLine('');
    setDateMode('ALL');
    setStartDate('');
    setEndDate('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in">
      <div className="bg-slate-900 border border-white/15 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] my-auto">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-slate-950/70 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/20 border border-brand-400/30 flex items-center justify-center text-brand-400 shadow-md">
              <Search size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Smart Case Search & Advanced Query
              </h2>
              <p className="text-xs text-gray-400">
                Instant search across Importer, Shipper, Agent, Container, BL, Item Description, and Client
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Bar & Controls */}
        <div className="p-4 sm:p-5 border-b border-white/10 bg-slate-900/90 space-y-3 shrink-0">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-400" size={18} />
            <input
              type="text"
              value={quickQuery}
              onChange={(e) => setQuickQuery(e.target.value)}
              placeholder="Search by Importer, Shipping Agent, Shipper, Container #, BL #, Case #, Item Description, or Client..."
              className="w-full bg-slate-950 border border-white/20 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-brand-400 shadow-inner font-sans"
              autoFocus
            />
            {quickQuery && (
              <button
                type="button"
                onClick={() => setQuickQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition ${
                isAdvancedOpen || selectedClientName || selectedPol || selectedPod || selectedShippingAgent || selectedShippingLine || dateMode === 'CUSTOM'
                  ? 'bg-brand-600/30 text-brand-300 border-brand-500/50 shadow-md shadow-brand-600/20'
                  : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
              }`}
            >
              <SlidersHorizontal size={14} />
              <span>{isAdvancedOpen ? 'Hide Advanced Search' : 'Advanced Search (Filters & Date Range)'}</span>
              {(selectedClientName || selectedPol || selectedPod || selectedShippingAgent || selectedShippingLine || dateMode === 'CUSTOM') && (
                <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
              )}
            </button>

            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>Matching Cases:</span>
              <span className="px-2.5 py-1 rounded-lg bg-brand-500/20 text-brand-300 font-bold font-mono">
                {filteredCases.length}
              </span>
              {(quickQuery || selectedClientName || selectedPol || selectedPod || selectedShippingAgent || selectedShippingLine || dateMode === 'CUSTOM') && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-gray-400 hover:text-red-400 underline ml-2 transition"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          {/* Advanced Filters Expandable Drawer */}
          {isAdvancedOpen && (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-white/10 space-y-4 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                
                {/* 1. Client Searchable Auto-Suggest Dropdown */}
                <div className="relative" ref={clientDropdownRef}>
                  <label className="text-[11px] font-semibold text-gray-300 block mb-1">
                    Select Client (Auto-Suggest)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={clientSearchInput}
                      onFocus={() => setIsClientDropdownOpen(true)}
                      onChange={(e) => {
                        setClientSearchInput(e.target.value);
                        setSelectedClientName(e.target.value);
                        setIsClientDropdownOpen(true);
                      }}
                      placeholder="Type or select client name..."
                      className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-brand-400 focus:outline-none pr-8"
                    />
                    <ChevronDown
                      size={14}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer pointer-events-none"
                    />
                  </div>

                  {isClientDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-white/20 rounded-xl shadow-2xl max-h-48 overflow-y-auto z-50 custom-scrollbar">
                      <div
                        onClick={() => {
                          setSelectedClientName('');
                          setClientSearchInput('');
                          setIsClientDropdownOpen(false);
                        }}
                        className="px-3 py-2 text-xs text-gray-400 hover:bg-white/10 cursor-pointer border-b border-white/5"
                      >
                        -- All Clients --
                      </div>
                      {filteredClientSuggestions.map(name => (
                        <div
                          key={name}
                          onClick={() => {
                            setSelectedClientName(name);
                            setClientSearchInput(name);
                            setIsClientDropdownOpen(false);
                          }}
                          className={`px-3 py-2 text-xs text-white hover:bg-brand-600/30 cursor-pointer flex items-center justify-between ${
                            selectedClientName === name ? 'bg-brand-600/20 text-brand-300 font-bold' : ''
                          }`}
                        >
                          <span>{name}</span>
                          {selectedClientName === name && <Check size={12} className="text-brand-400" />}
                        </div>
                      ))}
                      {filteredClientSuggestions.length === 0 && (
                        <div className="px-3 py-2 text-xs text-gray-500 italic">No matching client found</div>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Port of Destination (POD) */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-300 block mb-1">
                    Port of Destination (POD)
                  </label>
                  <select
                    value={selectedPod}
                    onChange={(e) => setSelectedPod(e.target.value)}
                    className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-brand-400 focus:outline-none"
                  >
                    <option value="">All Destination Ports / Dry Ports</option>
                    {uniquePods.map(pod => (
                      <option key={pod} value={pod}>{pod}</option>
                    ))}
                  </select>
                </div>

                {/* 3. Port of Loading (POL) */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-300 block mb-1">
                    Port of Loading (POL)
                  </label>
                  <select
                    value={selectedPol}
                    onChange={(e) => setSelectedPol(e.target.value)}
                    className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-brand-400 focus:outline-none"
                  >
                    <option value="">All Loading Seaports</option>
                    {uniquePols.map(pol => (
                      <option key={pol} value={pol}>{pol}</option>
                    ))}
                  </select>
                </div>

                {/* 4. Shipping Agent */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-300 block mb-1">
                    Shipping Agent
                  </label>
                  <select
                    value={selectedShippingAgent}
                    onChange={(e) => setSelectedShippingAgent(e.target.value)}
                    className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-brand-400 focus:outline-none"
                  >
                    <option value="">All Shipping Agents</option>
                    {uniqueShippingAgents.map(ag => (
                      <option key={ag} value={ag}>{ag}</option>
                    ))}
                  </select>
                </div>

                {/* 5. Shipping Line */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-300 block mb-1">
                    Shipping Line
                  </label>
                  <select
                    value={selectedShippingLine}
                    onChange={(e) => setSelectedShippingLine(e.target.value)}
                    className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-brand-400 focus:outline-none"
                  >
                    <option value="">All Shipping Lines</option>
                    {uniqueShippingLines.map(sl => (
                      <option key={sl} value={sl}>{sl}</option>
                    ))}
                  </select>
                </div>

                {/* 6. Date Range Mode */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-300 block mb-1">
                    Date Range Mode
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDateMode('ALL')}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition ${
                        dateMode === 'ALL'
                          ? 'bg-brand-600 text-white border-brand-500'
                          : 'bg-slate-900 text-gray-400 border-white/10 hover:text-white'
                      }`}
                    >
                      All Data (Shuru se Aaj Tak)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDateMode('CUSTOM')}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition ${
                        dateMode === 'CUSTOM'
                          ? 'bg-brand-600 text-white border-brand-500'
                          : 'bg-slate-900 text-gray-400 border-white/10 hover:text-white'
                      }`}
                    >
                      Date Range
                    </button>
                  </div>
                </div>

              </div>

              {/* Date Pickers if CUSTOM selected */}
              {dateMode === 'CUSTOM' && (
                <div className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-medium">From Date:</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-slate-900 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white focus:border-brand-400 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-medium">To Date:</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-slate-900 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white focus:border-brand-400 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Results Table */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {filteredCases.length === 0 ? (
            <div className="text-center py-12 text-gray-400 space-y-2">
              <Package size={40} className="mx-auto opacity-40 text-gray-500" />
              <p className="text-sm font-semibold text-gray-300">No matching cases found</p>
              <p className="text-xs text-gray-500">Try adjusting your search keyword, clear filters, or switch to All Data mode.</p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-brand-300 transition"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredCases.map((c) => {
                const containersCount = c.containers?.length || 0;
                const containerNos = (c.containers || []).map(cnt => cnt.number).filter(Boolean).join(', ');
                const itemDesc = c.itemDescription || (c as any).goodsDescription || (c as any).cargoDescription;

                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      onSelectCase(c);
                      onClose();
                    }}
                    className="p-3.5 hover:bg-white/5 rounded-xl transition cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-transparent hover:border-brand-500/30"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-sm text-brand-400 group-hover:text-brand-300">
                          {c.caseNo}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-semibold text-gray-300">
                          {c.category}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-[10px] font-semibold text-emerald-300">
                          {c.status}
                        </span>
                      </div>

                      <div className="text-xs text-white font-medium flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>Client: <strong className="text-gray-200">{c.clientName || 'N/A'}</strong></span>
                        {c.blNumber && <span>BL: <strong className="text-amber-300 font-mono">{c.blNumber}</strong></span>}
                        {c.importer && <span>Importer: <strong className="text-gray-300">{c.importer}</strong></span>}
                      </div>

                      <div className="text-[11px] text-gray-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>Route: <strong className="text-gray-300">{c.pol} → {c.pod}</strong></span>
                        {containersCount > 0 && (
                          <span>Containers ({containersCount}): <strong className="text-cyan-300 font-mono">{containerNos || 'Listed'}</strong></span>
                        )}
                        {itemDesc && (
                          <span className="truncate max-w-xs">Item: <strong className="text-gray-300">{itemDesc}</strong></span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:self-center shrink-0">
                      <span className="text-[11px] text-gray-400 font-mono">
                        {c.createdAt ? c.createdAt.split('T')[0] : ''}
                      </span>
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-xl bg-brand-600/30 group-hover:bg-brand-600 text-brand-200 group-hover:text-white text-xs font-semibold flex items-center gap-1 transition shadow-sm"
                      >
                        <span>Open Case</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-white/10 bg-slate-950/70 rounded-b-2xl flex items-center justify-between text-xs text-gray-400 shrink-0">
          <span>Click any case row to open its full details and workflow view.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-medium transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
