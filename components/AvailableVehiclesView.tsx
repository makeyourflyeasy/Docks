import React, { useState, useEffect, useMemo } from 'react';
import { 
  Truck, MapPin, Calendar, DollarSign, Phone, Search, Filter, 
  CheckCircle2, Clock, AlertCircle, RefreshCw, X, ArrowRight, ShieldCheck, Tag
} from 'lucide-react';
import { AvailableVehicle } from '../types';
import { subscribeToAvailableVehicles } from '../services/dbService';

interface AvailableVehiclesViewProps {
  onClose?: () => void;
  isModal?: boolean;
  onSelectVehicle?: (vehicle: AvailableVehicle) => void;
  userRole?: string;
}

export const AvailableVehiclesView: React.FC<AvailableVehiclesViewProps> = ({
  onClose,
  isModal = false,
  onSelectVehicle,
  userRole
}) => {
  const [vehicles, setVehicles] = useState<AvailableVehicle[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCity, setFilterCity] = useState('ALL');
  const [filterDestination, setFilterDestination] = useState('ALL');

  useEffect(() => {
    const unsub = subscribeToAvailableVehicles((items) => {
      setVehicles(items || []);
    });
    return () => unsub();
  }, []);

  const citiesList = useMemo(() => {
    const cities = new Set<string>();
    vehicles.forEach(v => {
      if (v.currentCity) cities.add(v.currentCity.trim());
    });
    return Array.from(cities);
  }, [vehicles]);

  const destinationsList = useMemo(() => {
    const dests = new Set<string>();
    vehicles.forEach(v => {
      (v.allowableDestinations || []).forEach(d => {
        if (d) dests.add(d.trim());
      });
    });
    return Array.from(dests);
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      if (v.readyStatus !== 'READY') return false;

      if (filterCity !== 'ALL' && v.currentCity?.toLowerCase() !== filterCity.toLowerCase()) {
        return false;
      }

      if (filterDestination !== 'ALL') {
        const hasDest = (v.allowableDestinations || []).some(
          d => d.toLowerCase().includes(filterDestination.toLowerCase()) || filterDestination.toLowerCase().includes(d.toLowerCase())
        );
        if (!hasDest) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNum = v.vehicleNo?.toLowerCase().includes(q);
        const matchTrans = v.transporterName?.toLowerCase().includes(q);
        const matchDriver = v.driverName?.toLowerCase().includes(q);
        const matchCity = v.currentCity?.toLowerCase().includes(q);
        if (!matchNum && !matchTrans && !matchDriver && !matchCity) return false;
      }

      return true;
    });
  }, [vehicles, searchQuery, filterCity, filterDestination]);

  const content = (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-900/80 p-4 rounded-2xl border border-white/10">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Truck className="text-amber-400" size={22} />
            <span>Available & Ready Vehicles for Loading</span>
            <span className="bg-amber-500/20 text-amber-300 text-xs px-2.5 py-0.5 rounded-full border border-amber-500/30 font-semibold font-mono">
              {filteredVehicles.length} Ready
            </span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Fleet carriers marked "Ready for Loading" by registered transporters across Pakistan
          </p>
        </div>
        {isModal && onClose && (
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-white/10">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search vehicle no, transporter, driver..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <select
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
            className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All Current Locations (Pakistan)</option>
            {citiesList.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={filterDestination}
            onChange={(e) => setFilterDestination(e.target.value)}
            className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All Destinations</option>
            {destinationsList.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Vehicles Cards Grid */}
      {filteredVehicles.length === 0 ? (
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-10 text-center text-gray-400 space-y-2">
          <Truck size={42} className="mx-auto text-gray-600 opacity-60" />
          <h4 className="text-white font-bold text-sm">No Ready Vehicles Found</h4>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Currently no transporters have vehicles marked ready for this route/location. Check back shortly or contact fleet dispatch.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVehicles.map((v) => (
            <div 
              key={v.id}
              className="bg-slate-900/90 border border-white/10 hover:border-amber-500/40 rounded-2xl p-4 space-y-3.5 transition-all shadow-lg hover:shadow-amber-500/5 group"
            >
              {/* Top Row: Vehicle Reg & Status */}
              <div className="flex justify-between items-start border-b border-white/10 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-base text-white group-hover:text-amber-300 transition-colors">
                      {v.vehicleNo}
                    </span>
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                      READY
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 font-medium">
                    🏢 {v.transporterName || 'Transporter'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-400 block">Est. Rent</span>
                  <span className="font-mono font-bold text-sm text-amber-400">
                    PKR {Number(v.estimatedRent || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Location & Route Info */}
              <div className="bg-white/5 rounded-xl p-2.5 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-gray-300">
                  <MapPin size={14} className="text-emerald-400 shrink-0" />
                  <span>Current City: <strong className="text-white">{v.currentCity || 'Karachi'}</strong></span>
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 block mb-1">Permitted Destination Routes:</span>
                  <div className="flex flex-wrap gap-1">
                    {(v.allowableDestinations || ['All Pakistan Dry Ports']).map((dest, dIdx) => (
                      <span key={dIdx} className="bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] px-2 py-0.5 rounded font-mono">
                        {dest}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Driver & Specs */}
              <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-400 pt-1">
                <div>
                  <span className="block text-gray-500">Driver:</span>
                  <span className="text-gray-200 font-medium">{v.driverName || 'Designated Driver'}</span>
                </div>
                <div>
                  <span className="block text-gray-500">Contact:</span>
                  <a href={`tel:${v.driverContact}`} className="text-amber-300 font-mono hover:underline flex items-center gap-1">
                    <Phone size={11} />
                    <span>{v.driverContact || 'N/A'}</span>
                  </a>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-white/10 flex justify-between items-center text-xs">
                <span className="text-[10px] text-gray-500">
                  Ready since {v.availableFromDate || v.createdAt?.slice(0, 10)}
                </span>
                {onSelectVehicle ? (
                  <button
                    onClick={() => onSelectVehicle(v)}
                    className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition active:scale-95"
                  >
                    <span>Assign / Select</span>
                    <ArrowRight size={13} />
                  </button>
                ) : (
                  <a
                    href={`tel:${v.driverContact}`}
                    className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
                  >
                    <Phone size={12} className="text-emerald-400" />
                    <span>Contact Driver</span>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center pt-3 sm:pt-6 pb-6 px-3 sm:px-4 backdrop-blur-sm overflow-y-auto">
        <div className="bg-slate-900 rounded-3xl max-w-5xl w-full border border-white/10 shadow-2xl overflow-hidden p-6 mb-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
          {content}
        </div>
      </div>
    );
  }

  return content;
};
