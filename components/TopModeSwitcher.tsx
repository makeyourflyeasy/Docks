import React, { useState, useRef, useEffect } from 'react';
import { 
  ShieldCheck, DollarSign, Globe, Briefcase, UserPlus, 
  ChevronDown, Check, Sparkles, Info, Lock, LogIn, KeyRound, X, ArrowRight
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
    name: 'Employee Portal',
    role: UserRole.DOCUMENTATION_OFFICER,
    targetView: 'cases',
    description: 'Case documentation, TP filing, port clearance, containers, and operations',
    badge: 'STAFF / OPERATIONS',
    icon: Briefcase,
    accentColor: 'text-sky-400',
    activeBg: 'bg-sky-950/60',
    activeBorder: 'border-sky-500/60',
    activeText: 'text-sky-300'
  },
  {
    id: 'recruiter',
    name: 'Recruiter Portal',
    role: UserRole.HR_MANAGER,
    targetView: 'users',
    description: 'Staff hiring, driver & transporter onboarding, user credentials, and fleet registration',
    badge: 'HR & RECRUITER',
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
  onOpenAuthModal?: () => void;
  className?: string;
  isCompact?: boolean;
}

export const TopModeSwitcher: React.FC<TopModeSwitcherProps> = ({
  currentRole,
  onSwitchMode,
  onOpenAuthModal,
  className = '',
  isCompact = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Determine current active mode
  const currentMode = APP_MODES.find(m => m.role === currentRole) || 
    (currentRole === UserRole.CLIENT ? APP_MODES[2] : 
     (currentRole === UserRole.FINANCE_MANAGER || currentRole === UserRole.ACCOUNTANT) ? APP_MODES[1] :
     (currentRole === UserRole.DOCUMENTATION_OFFICER || currentRole === UserRole.OPERATIONS_MANAGER) ? APP_MODES[3] :
     (currentRole === UserRole.HR_MANAGER || currentRole === UserRole.VEHICLE_MANAGER) ? APP_MODES[4] :
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
      {/* Switcher Main Trigger Button - Clearly labeled as Portal Login / Mode Switcher */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-4 py-1 sm:py-2 rounded-xl border transition-all duration-200 shadow-lg ${currentMode.activeBg} ${currentMode.activeBorder} hover:brightness-110 focus:outline-none ring-1 ring-white/10`}
        title="Direct Portal Login (No Password Required)"
      >
        <div className={`p-1 sm:p-1.5 rounded-lg bg-black/50 ${currentMode.accentColor} shadow-inner flex-shrink-0`}>
          <CurrentIcon size={15} />
        </div>

        <div className="text-left">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider hidden md:inline flex items-center gap-1">
              <KeyRound size={10} /> Login:
            </span>
            <span className={`text-xs sm:text-sm font-bold ${currentMode.activeText} whitespace-nowrap`}>
              {currentMode.name}
            </span>
          </div>
          <span className="text-[9px] sm:text-[10px] text-gray-400 font-mono hidden xs:block leading-none truncate max-w-[90px] sm:max-w-none">
            {currentMode.badge}
          </span>
        </div>

        <div className="ml-0.5 sm:ml-1 pl-1 sm:pl-1.5 border-l border-white/10 flex items-center gap-1 flex-shrink-0">
          <span className="hidden lg:inline-block text-[10px] bg-brand-500/20 text-brand-300 border border-brand-500/30 px-1.5 py-0.5 rounded font-medium">
            Switch
          </span>
          <ChevronDown 
            size={14} 
            className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-white' : ''}`} 
          />
        </div>
      </button>

      {/* Dropdown Popup Menu */}
      {isOpen && (
        <div 
          className="absolute right-0 top-full mt-2 w-[320px] sm:w-[380px] bg-slate-900/98 backdrop-blur-2xl border border-brand-500/40 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-3.5 border-b border-white/10 bg-slate-950/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                <LogIn size={16} />
              </div>
              <div>
                <span className="text-xs font-bold text-white uppercase tracking-wider block">
                  Select Portal to Log In
                </span>
                <span className="text-[10px] text-emerald-400 font-medium">Direct Access • No Password Required</span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10"
            >
              <X size={16} />
            </button>
          </div>

          {/* List of 5 Portals */}
          <div className="p-2.5 space-y-2 max-h-[390px] overflow-y-auto custom-scrollbar">
            {APP_MODES.map((mode) => {
              const isSelected = mode.id === currentMode.id;
              const Icon = mode.icon;

              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => {
                    onSwitchMode(mode);
                    setIsOpen(false);
                  }}
                  className={`w-full p-3 rounded-xl border text-left transition-all flex items-start gap-3 group ${
                    isSelected
                      ? `${mode.activeBg} ${mode.activeBorder} shadow-lg shadow-black/40`
                      : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl mt-0.5 shrink-0 ${
                    isSelected ? 'bg-black/50 ' + mode.accentColor : 'bg-white/10 text-gray-400 group-hover:text-white'
                  }`}>
                    <Icon size={19} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-gray-200 group-hover:text-white'}`}>
                          {mode.name}
                        </span>
                      </div>
                      {isSelected ? (
                        <div className="flex items-center gap-1 text-emerald-400 text-xs font-semibold bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          <Check size={12} />
                          <span className="text-[10px]">Logged In</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-brand-400 opacity-0 group-hover:opacity-100 flex items-center gap-1 font-medium transition-opacity">
                          Log In <ArrowRight size={11} />
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-gray-400 block mt-0.5">
                      {mode.badge}
                    </span>
                    <p className="text-[11px] text-gray-400 leading-snug mt-1">
                      {mode.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Optional ID/Password Testing Button */}
          {onOpenAuthModal && (
            <div className="p-2.5 border-t border-white/5 bg-slate-950/60">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenAuthModal();
                }}
                className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-gray-300 hover:text-white border border-white/10 flex items-center justify-center gap-2 transition"
              >
                <Lock size={13} className="text-amber-400" />
                <span>Test Login with Email & Password (For Deployment)</span>
              </button>
            </div>
          )}

          {/* Bottom Clarification Notice */}
          <div className="p-3 bg-black/70 border-t border-white/5 flex items-start gap-2 text-[11px] text-gray-400">
            <Info size={14} className="text-brand-400 shrink-0 mt-0.5" />
            <p className="leading-tight">
              <span className="text-gray-300 font-medium">Development Mode:</span> You can switch between all 5 portals without credentials. Once ready for deployment, each user will log in with their specific ID/password.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopModeSwitcher;
