import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  KeyRound,
  Eye,
  EyeOff,
  LogIn,
  Loader2,
  HelpCircle,
  Clock,
  User,
  CheckCircle2
} from 'lucide-react';
import { UserRole } from '../types';
import Logo from './Logo';
import { useBranding } from '../services/brandingService';
import { safeAppStorage } from '../services/storage';
import { authenticateDatabaseUser, DEFAULT_DATABASE_USERS } from '../services/dbService';

export interface SelectedModePayload {
  role: UserRole;
  roles?: UserRole[];
  designation?: string;
  clientName?: string;
  targetView: string;
  displayName: string;
}

interface LoginModeSelectionProps {
  onSelectMode: (payload: SelectedModePayload) => void;
}

export const LoginModeSelection: React.FC<LoginModeSelectionProps> = ({ onSelectMode }) => {
  const { customLogo, companyName, subtitle } = useBranding();

  // Credentials Form State - Blank by default, user enters their credentials
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCredentialsGuide, setShowCredentialsGuide] = useState(false);

  // Workflow & Draft Resumption Detection
  const [hasActiveDraft, setHasActiveDraft] = useState(false);
  const [draftCaseNo, setDraftCaseNo] = useState('');
  const [draftStep, setDraftStep] = useState(1);
  const [lastLocationView, setLastLocationView] = useState<string | null>(null);
  const [lastLocationRole, setLastLocationRole] = useState<string | null>(null);

  useEffect(() => {
    // Check if user was in the middle of a case registration
    const regView = safeAppStorage.getItem('dpl_reg_view');
    const caseNo = safeAppStorage.getItem('dpl_reg_caseno') || '';
    const stepVal = parseInt(safeAppStorage.getItem('dpl_reg_step') || '1', 10);
    const lastView = safeAppStorage.getItem('dpl_last_location_view');
    const lastRole = safeAppStorage.getItem('dpl_last_location_role');

    if (regView === 'register') {
      setHasActiveDraft(true);
      setDraftCaseNo(caseNo);
      setDraftStep(stepVal);
    }
    if (lastView) setLastLocationView(lastView);
    if (lastRole) setLastLocationRole(lastRole);
  }, []);

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setErrorMessage('Please enter both User ID and Password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const user = await authenticateDatabaseUser(identifier.trim(), password.trim());
      
      // Determine user role and navigation target
      const userRole = (user.role as UserRole) || UserRole.ADMIN;
      const userRoles = (user.roles && user.roles.length > 0) ? user.roles : [userRole];
      safeAppStorage.setItem('dpl_user_roles', JSON.stringify(userRoles));
      if (user.designation) {
        safeAppStorage.setItem('dpl_user_designation', user.designation);
      }
      safeAppStorage.setItem('dpl_current_user_id', user.userId || '');
      safeAppStorage.setItem('dpl_current_user_name', user.name || user.userId || 'Staff');
      if ((user as any).station) {
        safeAppStorage.setItem('dpl_current_user_station', (user as any).station);
      }

      let targetView = 'dashboard';

      if (userRole === UserRole.CLIENT) {
        targetView = 'cases';
      } else if (userRoles.includes(UserRole.FINANCE_MANAGER)) {
        targetView = 'finance';
      } else if (userRoles.includes(UserRole.VEHICLE_MANAGER) || userRole === UserRole.TRANSPORTER) {
        targetView = 'vehicles';
      } else if (hasActiveDraft && (userRoles.includes(UserRole.ADMIN) || userRoles.includes(UserRole.OPERATIONS_MANAGER))) {
        targetView = 'cases';
      } else if (lastLocationRole === userRole && lastLocationView) {
        targetView = lastLocationView;
      } else if (userRoles.includes(UserRole.OPERATIONS_MANAGER) || userRoles.includes(UserRole.LOADING_PORT_STAFF) || userRoles.includes(UserRole.UNLOADING_PORT_STAFF) || userRoles.includes(UserRole.DESTINATION_PORT_STAFF) || userRoles.includes(UserRole.OFFICE_STAFF)) {
        targetView = 'cases';
      }

      onSelectMode({
        role: userRole,
        roles: userRoles,
        designation: user.designation,
        clientName: user.clientName || (userRole === UserRole.CLIENT ? user.name : 'Client Portal'),
        targetView: targetView,
        displayName: user.name || user.userId || 'Staff User'
      });
    } catch (err: any) {
      console.error('Login failure:', err);
      setErrorMessage(err?.message || 'Invalid User ID or Password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (user: typeof DEFAULT_DATABASE_USERS[0]) => {
    setIdentifier(user.userId || '');
    setPassword(user.password || 'dpl01234');
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between overflow-y-auto bg-slate-950 text-gray-100 p-4 sm:p-8 custom-scrollbar">
      {/* Background Ambience */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 10%, rgba(245, 158, 11, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 10% 90%, rgba(37, 99, 235, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 90% 90%, rgba(16, 185, 129, 0.15) 0%, transparent 50%)
          `
        }}
      />

      {/* Top Header with Corporate Identity */}
      <div className="w-full max-w-xl mx-auto flex flex-col items-center text-center pt-2 pb-1 relative z-10">
        <div className="flex items-center justify-center mb-2 transform hover:scale-105 transition-transform duration-300">
          {customLogo ? (
            <img 
              src={customLogo} 
              alt="Corporate Logo" 
              className="w-40 sm:w-48 max-h-16 object-contain drop-shadow-[0_4px_20px_rgba(245,158,11,0.25)]" 
            />
          ) : (
            <Logo className="w-44 sm:w-52 h-auto drop-shadow-xl" />
          )}
        </div>

        {/* Corporate Company Name */}
        {(() => {
          const rawName = (companyName || '').trim();
          const isDocks = !rawName || rawName.toLowerCase().includes('docks');
          const formattedTitle = isDocks ? 'DOCKS PRIVATE LIMITED' : rawName.toUpperCase();
          return (
            <h1 
              className="text-xl sm:text-2xl font-extrabold tracking-wider text-amber-300 uppercase drop-shadow-[0_2px_14px_rgba(245,158,11,0.65)] font-sans px-2"
              style={{ color: '#FCD34D', textShadow: '0 2px 14px rgba(245, 158, 11, 0.65)' }}
            >
              {formattedTitle}
            </h1>
          );
        })()}
        <p 
          className="text-[11px] sm:text-xs font-bold text-amber-400 tracking-widest uppercase mt-0.5 px-4 max-w-xl leading-relaxed"
          style={{ color: '#FBBF24' }}
        >
          {subtitle || 'CUSTOMS CLEARANCE, BONDED CARRIER, AFGHAN TRANSIT & LOGISTICS'}
        </p>
      </div>

      {/* Main Single Login Form Container */}
      <div className="w-full max-w-md mx-auto my-auto py-2 relative z-10 animate-fade-in">
        <div className="bg-slate-900/95 border border-amber-500/30 rounded-3xl p-5 sm:p-7 shadow-2xl backdrop-blur-xl">
          
          {/* Form Header */}
          <div className="text-center mb-5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto mb-2 shadow-inner">
              <Lock className="text-amber-300" size={22} />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-wide">
              Sign In
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Please enter your User ID and Password
            </p>
          </div>

          {/* Error Notice */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <span>{errorMessage}</span>
            </div>
          )}

          {/* In-Progress Draft Resumption Notice */}
          {hasActiveDraft && (
            <div className="mb-4 p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
              <Clock size={15} className="flex-shrink-0 text-amber-400" />
              <span>An active case registration draft ({draftCaseNo || `Step ${draftStep}`}) will resume upon login.</span>
            </div>
          )}

          {/* Sign In Form */}
          <form onSubmit={handleCredentialsLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <User size={13} className="text-amber-400" />
                <span>User ID</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="login-identifier-input"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. admin, finance, casemanager"
                  className="w-full px-4 py-3 bg-slate-950/90 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <KeyRound size={13} className="text-amber-400" />
                  <span>Password</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                  <span>{showPassword ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="login-password-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-3 bg-slate-950/90 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              id="btn-submit-credentials"
              disabled={isLoading}
              className="w-full mt-3 py-3.5 px-4 rounded-xl bg-amber-400 hover:bg-yellow-300 active:bg-amber-500 text-slate-950 font-black text-base shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer disabled:opacity-50 border border-amber-300 select-none"
              style={{
                backgroundColor: '#fbbf24',
                color: '#020617',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#fde047';
                e.currentTarget.style.color = '#020617';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#fbbf24';
                e.currentTarget.style.color = '#020617';
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={19} className="animate-spin text-slate-950 shrink-0" style={{ color: '#020617' }} />
                  <span className="font-extrabold text-slate-950" style={{ color: '#020617' }}>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <LogIn size={19} className="text-slate-950 stroke-[2.5] shrink-0" style={{ color: '#020617' }} />
                  <span className="font-black text-slate-950 text-base tracking-wide" style={{ color: '#020617' }}>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Staff Credentials Reference Guide */}
          <div className="mt-5 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={() => setShowCredentialsGuide(!showCredentialsGuide)}
              className="w-full flex items-center justify-between text-xs text-amber-400/90 hover:text-amber-300 font-semibold cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <HelpCircle size={14} /> Official Staff Credentials Guide
              </span>
              <span className="text-[10px] uppercase tracking-wider">{showCredentialsGuide ? '▲ Hide' : '▼ View IDs'}</span>
            </button>

            {showCredentialsGuide && (
              <div className="mt-3 space-y-2 text-[11px] animate-fade-in max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                <p className="text-[10px] text-gray-400 mb-1.5">
                  Universal Password for all accounts is: <strong className="text-amber-300 font-mono">dpl01234</strong>
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {DEFAULT_DATABASE_USERS.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleQuickFill(u)}
                      className="p-2 rounded-lg bg-white/5 hover:bg-amber-500/10 border border-white/10 hover:border-amber-500/30 text-left transition cursor-pointer group"
                    >
                      <div className="font-bold text-gray-200 group-hover:text-amber-300 truncate">{u.name}</div>
                      <div className="text-amber-400 font-mono text-[10px]">ID: {u.userId}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Info Notice */}
      <div className="w-full max-w-xl mx-auto pt-4 pb-2 text-center text-[11px] text-gray-500 relative z-10 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-white/5">
        <div className="flex items-center gap-2 text-emerald-400/80">
          <ShieldCheck size={14} className="text-emerald-400" />
          <span>Authorized Access • Encrypted Session</span>
        </div>
        <div className="text-gray-400">
          DOCKS (PVT) LTD. Enterprise Logistics Cloud
        </div>
      </div>
    </div>
  );
};

export default LoginModeSelection;
