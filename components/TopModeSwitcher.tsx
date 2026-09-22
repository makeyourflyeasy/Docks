import React, { useState, useRef, useEffect } from 'react';
import { 
  ShieldCheck, DollarSign, Globe, Briefcase, UserPlus, 
  ChevronDown, Check, Info, Lock, LogOut, KeyRound, X, ArrowRight, UserCheck
} from 'lucide-react';
import { UserRole } from '../types';

export type AppMode = 'admin' | 'finance' | 'client' | 'employee' | 'recruiter';

export interface ModeOption {
  id: AppMode;
  name: string;
  role: UserRole;
  targetView: string;
  description: string;
  badge: string;
  icon: React.ElementType;
  accentColor: string;
  activeBg: string;
  activeBorder: string;
  activeText: string;
}

export const APP_MODES: ModeOption[] = [
  {
    id: 'admin',
    name: 'Admin Portal',
    role: UserRole.ADMIN,
    targetView: 'dashboard',
    description: 'Full system control, real-time analytics, all cases, fleet, and settings',
    badge: 'SUPER ADMIN',
    icon: ShieldCheck,
    accentColor: 'text-purple-400',
    activeBg: 'bg-purple-950/60',
    activeBorder: 'border-purple-500/60',
    activeText: 'text-purple-300'
  },
  {
    id: 'finance',
    name: 'Financier Portal',
    role: UserRole.FINANCE_MANAGER,
    targetView: 'finance',
    description: 'Customer ledger, billing, payment verification, slips, vouchers, and accounts',
    badge: 'FINANCIER / ACCOUNTS',
    icon: DollarSign,
    accentColor: 'text-emerald-400',
    activeBg: 'bg-emerald-950/60',
    activeBorder: 'border-emerald-500/60',
    activeText: 'text-emerald-300'
  },
  {
    id: 'client',
    name: 'Client Portal',
    role: UserRole.CLIENT,
    targetView: 'cases',
    description: 'Shipment tracking, in-transit containers, payment slips upload, and invoices',
    badge: 'CLIENT VIEW',
    icon: Globe,
    accentColor: 'text-amber-400',
    activeBg: 'bg-amber-950/60',
    activeBorder: 'border-amber-500/60',
    activeText: 'text-amber-300'
  },
  {
    id: 'employee',
    name: 'Operations Portal',
    role: UserRole.OPERATIONS_MANAGER,
    targetView: 'cases',
    description: 'Cargo clearing, port logistics, container dispatch, and GD documentation',
    badge: 'OPERATIONS & CLEARING',
    icon: Briefcase,
    accentColor: 'text-cyan-400',
    activeBg: 'bg-cyan-950/60',
    activeBorder: 'border-cyan-500/60',
    activeText: 'text-cyan-300'
  },
  {
    id: 'recruiter',
    name: 'Fleet & HR Portal',
    role: UserRole.VEHICLE_MANAGER,
    targetView: 'vehicles',
    description: 'Fleet carriers, driver validation, transport dispatch, and vehicle assignments',
    badge: 'FLEET & TRANSPORT',
    icon: UserPlus,
    accentColor: 'text-indigo-400',
    activeBg: 'bg-indigo-950/60',
    activeBorder: 'border-indigo-500/60',
    activeText: 'text-indigo-300'
  }
];

interface TopModeSwitcherProps {
  currentRole: UserRole;
  onSwitchMode: (mode: ModeOption) => void;
  onSignOut?: () => void;
  onOpenAuthModal?: () => void;
  className?: string;
  isCompact?: boolean;
}

export const TopModeSwitcher: React.FC<TopModeSwitcherProps> = ({
  currentRole,
  onSwitchMode,
  onSignOut,
  onOpenAuthModal,
  className = '',
  isCompact = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Determine current active mode
  const currentMode = APP_MODES.find(m => m.role === currentRole) || 
    (currentRole === UserRole.CLIENT ? APP_MODES[2] : 
     currentRole === UserRole.FINANCE_MANAGER ? APP_MODES[1] :
     currentRole === UserRole.OPERATIONS_MANAGER ? APP_MODES[3] :
     currentRole === UserRole.VEHICLE_MANAGER ? APP_MODES[4] :
     APP_MODES[0]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const CurrentIcon = currentMode.icon;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Switcher Main Trigger Button - Shows Active Logged In Role */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl border transition-all duration-200 shadow-md ${currentMode.activeBg} ${currentMode.activeBorder} hover:brightness-110 focus:outline-none ring-1 ring-white/10 cursor-pointer`}
        title="Active Authenticated Session"
      >
        <div className={`p-1 sm:p-1.5 rounded-lg bg-black/50 ${currentMode.accentColor} shadow-inner flex-shrink-0`}>
          <CurrentIcon size={14} />
        </div>

        <div className="text-left">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider hidden md:inline flex items-center gap-1">
              <UserCheck size={10} /> Active:
            </span>
            <span className={`text-xs sm:text-sm font-bold ${currentMode.activeText} whitespace-nowrap`}>
              {currentMode.name}
            </span>
          </div>
          <span className="text-[9px] sm:text-[10px] text-gray-400 font-mono hidden xs:block leading-none truncate max-w-[100px]">
            {currentRole}
          </span>
        </div>

        <ChevronDown 
          size={14} 
          className={`text-gray-400 ml-1 transition-transform duration-200 ${isOpen ? 'rotate-180 text-white' : ''}`} 
        />
      </button>

      {/* Dropdown Popup Menu */}
      {isOpen && (
        <div 
          className="absolute right-0 top-full mt-2 w-[300px] sm:w-[340px] bg-slate-900/98 backdrop-blur-2xl border border-amber-500/40 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-3.5 border-b border-white/10 bg-slate-950/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                <Lock size={15} />
              </div>
              <div>
                <span className="text-xs font-bold text-white uppercase tracking-wider block">
                  Authenticated Session
                </span>
                <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                  <Check size={11} /> ID & Password Verified
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          {/* Current Role Details */}
          <div className="p-3.5 bg-white/5 border-b border-white/5">
            <div className="text-xs font-bold text-gray-200 mb-1 flex items-center justify-between">
              <span>Current Role:</span>
              <span className="text-amber-300 font-mono text-[11px]">{currentRole}</span>
            </div>
            <p className="text-[11px] text-gray-400 leading-snug">
              {currentMode.description}
            </p>
          </div>

          {/* Account Actions */}
          <div className="p-2.5 space-y-1.5 bg-slate-950/40">
            {onSignOut && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onSignOut();
                }}
                className="w-full p-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:text-amber-200 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer active:scale-95"
              >
                <KeyRound size={14} />
                <span>Switch User / Log In with Another ID</span>
              </button>
            )}

            {onSignOut && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onSignOut();
                }}
                className="w-full p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer active:scale-95"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TopModeSwitcher;
