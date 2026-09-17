import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Briefcase, 
  FileText, 
  Truck, 
  Users, 
  FolderKanban, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  Lock, 
  UserCheck, 
  Coins,
  KeyRound,
  Eye,
  EyeOff,
  LogIn,
  Loader2,
  FilePlus2,
  HelpCircle,
  Clock
} from 'lucide-react';
import { UserRole } from '../types';
import Logo from './Logo';
import { useBranding } from '../services/brandingService';
import { safeAppStorage } from '../services/storage';
import { authenticateDatabaseUser, DEFAULT_DATABASE_USERS } from '../services/dbService';
import { loginWithGoogle } from '../services/firebase';

export interface SelectedModePayload {
  role: UserRole;
  clientName?: string;
  targetView: string;
  displayName: string;
}

interface LoginModeSelectionProps {
  onSelectMode: (payload: SelectedModePayload) => void;
}

const PORTAL_MODES: {
  id: string;
  role: UserRole;
  targetView: string;
  title: string;
  persona: string;
  badge: string;
  badgeColor: string;
  accentBorder: string;
  gradientBg: string;
  icon: React.ElementType;
  description: string;
  clientName?: string;
}[] = [
  {
    id: 'admin',
    role: UserRole.ADMIN,
    targetView: 'dashboard',
    title: 'Admin Portal',
    persona: 'Arbab Khan (Director)',
    badge: 'Full Master Access',
    badgeColor: 'bg-brand-500/20 text-brand-300 border-brand-500/30',
    accentBorder: 'hover:border-brand-400 group-hover:shadow-brand-500/20',
    gradientBg: 'from-brand-950/40 via-slate-900 to-slate-950',
    icon: ShieldCheck,
    description: 'Complete administration of Cases, Financial Ledgers, Fleet Carriers, User Roles, and Corporate Settings.'
  },
  {
    id: 'client',
    role: UserRole.CLIENT,
    targetView: 'cases',
    title: 'Client Portal',
    persona: 'Global Traders Ltd',
    clientName: 'Global Traders Ltd',
    badge: 'Consignments & Invoices',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    accentBorder: 'hover:border-amber-400 group-hover:shadow-amber-500/20',
    gradientBg: 'from-amber-950/40 via-slate-900 to-slate-950',
    icon: Briefcase,
    description: 'Real-time consignment tracking, customs container stages, auto-generated Delivery Orders (DO) and billing receipts.'
  },
  {
    id: 'operations',
    role: UserRole.OPERATIONS_MANAGER,
    targetView: 'cases',
    title: 'Operations & Clearing',
    persona: 'Bilal Ahmed (Ops Manager)',
    badge: 'Port & Customs TP',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    accentBorder: 'hover:border-emerald-400 group-hover:shadow-emerald-500/20',
    gradientBg: 'from-emerald-950/40 via-slate-900 to-slate-950',
    icon: FolderKanban,
    description: 'Cargo TP filing, Wharfage payments, Port loading/unloading verification, and Border customs documentation.'
  },
  {
    id: 'finance',
    role: UserRole.FINANCE_MANAGER,
    targetView: 'finance',
    title: 'Finance & Accounts',
    persona: 'Faisal Karim (Finance Head)',
    badge: 'Treasury & Ledgers',
    badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    accentBorder: 'hover:border-yellow-400 group-hover:shadow-yellow-500/20',
    gradientBg: 'from-yellow-950/40 via-slate-900 to-slate-950',
    icon: Coins,
    description: 'Corporate ledger balances, client receivables, expense vouchers, payment slips verification, and bank books.'
  },
  {
    id: 'fleet',
    role: UserRole.VEHICLE_MANAGER,
    targetView: 'vehicles',
    title: 'Fleet & Transport',
    persona: 'Fahad Mustafa (Fleet Officer)',
    badge: 'Carrier & Drivers',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    accentBorder: 'hover:border-purple-400 group-hover:shadow-purple-500/20',
    gradientBg: 'from-purple-950/40 via-slate-900 to-slate-950',
    icon: Truck,
    description: 'Bonded carrier trailer management, driver licenses, fitness tracking, and active transport dispatch allocation.'
  },
  {
    id: 'ceo',
    role: UserRole.CEO,
    targetView: 'dashboard',
    title: 'CEO Executive Desk',
    persona: 'Shahid Khan (Chief Executive)',
    badge: 'Executive Analytics',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    accentBorder: 'hover:border-blue-400 group-hover:shadow-blue-500/20',
    gradientBg: 'from-blue-950/40 via-slate-900 to-slate-950',
    icon: Users,
    description: 'High-level business KPIs, overall logistics volume, corporate profitability, and strategic overview.'
  }
];

export const LoginModeSelection: React.FC<LoginModeSelectionProps> = ({ onSelectMode }) => {
  const { customLogo, companyName, subtitle } = useBranding();
  
  // Login Mode Tab: 'quick' (Direct Category Login) vs 'credentials' (Real ID & Password)
  const [activeTab, setActiveTab] = useState<'quick' | 'credentials'>('quick');

  // Credentials Form State
  const [identifier, setIdentifier] = useState('ADMIN');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showQuickCredentials, setShowQuickCredentials] = useState(false);

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

  const handleCardClick = (mode: typeof PORTAL_MODES[0]) => {
    // If selecting Admin or Operations and a case registration was ongoing, resume straight into cases
    let targetView = mode.targetView;
    if ((mode.role === UserRole.ADMIN || mode.role === UserRole.OPERATIONS_MANAGER) && hasActiveDraft) {
      targetView = 'cases';
    } else if (lastLocationRole === mode.role && lastLocationView) {
      targetView = lastLocationView;
    }

    onSelectMode({
      role: mode.role,
      clientName: mode.clientName || 'Global Traders Ltd',
      targetView: targetView,
      displayName: mode.persona
    });
  };

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setErrorMessage('Please enter both User ID / Email and Password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const user = await authenticateDatabaseUser(identifier, password);
      
      // Determine user role and navigation target
      const userRole = (user.role as UserRole) || UserRole.ADMIN;
      let targetView = 'dashboard';

      if (userRole === UserRole.CLIENT) {
        targetView = 'cases';
      } else if (userRole === UserRole.FINANCE_MANAGER || userRole === UserRole.ACCOUNTANT) {
        targetView = 'finance';
      } else if (userRole === UserRole.VEHICLE_MANAGER || userRole === UserRole.TRANSPORTER) {
        targetView = 'vehicles';
      } else if (hasActiveDraft && (userRole === UserRole.ADMIN || userRole === UserRole.OPERATIONS_MANAGER)) {
        targetView = 'cases';
      } else if (lastLocationRole === userRole && lastLocationView) {
        targetView = lastLocationView;
      }

      onSelectMode({
        role: userRole,
        clientName: user.clientName || (userRole === UserRole.CLIENT ? user.name : 'Global Traders Ltd'),
        targetView: targetView,
        displayName: user.name || user.userId || 'Staff User'
      });
    } catch (err: any) {
      console.error('Login failure:', err);
      setErrorMessage(err?.message || 'Invalid credentials. Please verify your User ID and Password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const googleUser = await loginWithGoogle();
      const defaultRole = UserRole.ADMIN;
      const targetView = hasActiveDraft ? 'cases' : (lastLocationView || 'dashboard');

      onSelectMode({
        role: defaultRole,
        clientName: 'Global Traders Ltd',
        targetView: targetView,
        displayName: googleUser?.displayName || 'Google User'
      });
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || 'Google authentication could not be completed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (user: typeof DEFAULT_DATABASE_USERS[0]) => {
    setIdentifier(user.userId || user.email || '');
    setPassword(user.password || 'admin123');
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between overflow-y-auto bg-slate-950 text-gray-100 p-4 sm:p-8 custom-scrollbar select-none">
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
      <div className="w-full max-w-6xl mx-auto flex flex-col items-center text-center pt-2 pb-4 relative z-10">
        <div className="flex items-center justify-center mb-3 transform hover:scale-105 transition-transform duration-300">
          {customLogo ? (
            <img 
              src={customLogo} 
              alt="Corporate Logo" 
              className="w-48 sm:w-60 max-h-24 object-contain drop-shadow-[0_4px_20px_rgba(245,158,11,0.25)]" 
            />
          ) : (
            <Logo className="w-56 sm:w-72 h-auto drop-shadow-xl" />
          )}
        </div>

        {/* Corporate Company Name - High Contrast Luminous Gold */}
        {(() => {
          const rawName = (companyName || '').trim();
          const isDocks = !rawName || rawName.toLowerCase().includes('docks');
          const formattedTitle = isDocks ? 'DOCKS PRIVATE LIMITED' : rawName.toUpperCase();
          return (
            <h1 
              className="text-2xl sm:text-4xl font-extrabold tracking-wider text-amber-300 uppercase drop-shadow-[0_2px_14px_rgba(245,158,11,0.65)] font-sans px-2"
              style={{ color: '#FCD34D', textShadow: '0 2px 14px rgba(245, 158, 11, 0.65)' }}
            >
              {formattedTitle}
            </h1>
          );
        })()}
        <p 
          className="text-xs sm:text-sm font-bold text-amber-400 tracking-widest uppercase mt-1 px-4 max-w-4xl leading-relaxed"
          style={{ color: '#FBBF24' }}
        >
          {subtitle || 'CUSTOMS CLEARANCE, BONDED CARRIER, AFGHAN TRANSIT & LOGISTICS'}
        </p>

        {/* Dual Tab Mode Switcher: Quick Category Login vs Real Credentials Login */}
        <div className="mt-4 inline-flex items-center p-1 rounded-2xl bg-slate-900/90 border border-amber-500/30 backdrop-blur-md shadow-2xl">
          <button
            type="button"
            id="tab-direct-category"
            onClick={() => setActiveTab('quick')}
            className={`flex items-center gap-2 px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
              activeTab === 'quick'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/25 scale-[1.02]'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles size={16} className={activeTab === 'quick' ? 'text-slate-950 animate-pulse' : 'text-amber-400'} />
            <span>Direct Category Login</span>
          </button>

          <button
            type="button"
            id="tab-real-credentials"
            onClick={() => setActiveTab('credentials')}
            className={`flex items-center gap-2 px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
              activeTab === 'credentials'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/25 scale-[1.02]'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Lock size={15} className={activeTab === 'credentials' ? 'text-slate-950' : 'text-amber-400'} />
            <span>Real ID & Password</span>
          </button>
        </div>
      </div>

      {/* Main Body Area: Tab 1 (Direct Category Grid) OR Tab 2 (Real Credentials Form) */}
      {activeTab === 'quick' ? (
        /* TAB 1: DIRECT ACCOUNT CATEGORY CARDS (Admin, Client, Finance, Operations, Fleet, CEO) */
        <div className="w-full max-w-6xl mx-auto my-auto py-2 relative z-10">
          
          {/* Active Case Registration Draft Banner if Detected */}
          {hasActiveDraft && (
            <div className="mb-4 bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-emerald-500/20 border border-amber-400/40 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg shadow-amber-500/10 backdrop-blur-md animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center flex-shrink-0">
                  <FilePlus2 className="text-amber-300 animate-pulse" size={22} />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-bold text-amber-300 flex items-center gap-2">
                    <span>Unfinished Case Registration in Progress</span>
                    <span className="bg-amber-400/20 text-amber-200 px-2 py-0.5 rounded-full text-[10px] font-mono border border-amber-400/30">
                      Step {draftStep} of 3
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-300 mt-0.5">
                    {draftCaseNo ? `Draft Case: ${draftCaseNo} • ` : ''}Logging into Admin or Operations will resume directly right where you left off!
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const adminMode = PORTAL_MODES.find(m => m.id === 'admin')!;
                  handleCardClick(adminMode);
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <span>Resume Case Registration Now</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}

          {/* Grid of Interactive Portal Mode Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {PORTAL_MODES.map((mode) => {
              const Icon = mode.icon;
              const isModeAdmin = mode.role === UserRole.ADMIN;
              const isLastLocation = lastLocationRole === mode.role;

              return (
                <button
                  key={mode.id}
                  type="button"
                  id={`portal-login-${mode.id}`}
                  onClick={() => handleCardClick(mode)}
                  className={`group relative text-left p-5 sm:p-6 rounded-2xl border border-white/10 ${mode.accentBorder} bg-gradient-to-b ${mode.gradientBg} shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1.5 active:scale-[0.98] cursor-pointer flex flex-col justify-between overflow-hidden`}
                >
                  {/* Top Row: Icon + Badge */}
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="p-3 rounded-xl bg-white/10 border border-white/10 group-hover:scale-110 group-hover:bg-white/15 transition-all duration-300 shadow-inner">
                        <Icon size={26} className="text-amber-300 group-hover:text-yellow-200 transition-colors" />
                      </div>
                      
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full border ${mode.badgeColor} uppercase tracking-wider`}>
                          {mode.badge}
                        </span>
                        {isModeAdmin && hasActiveDraft && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 animate-pulse">
                            <Clock size={10} /> Case Draft Ready
                          </span>
                        )}
                        {!isModeAdmin && isLastLocation && (
                          <span className="text-[9px] font-medium px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            Last Active
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg sm:text-xl font-black text-white group-hover:text-amber-300 transition-colors">
                      {mode.title}
                    </h3>

                    {/* Persona Profile */}
                    <div className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400/90 bg-black/40 px-2.5 py-1 rounded-lg border border-amber-400/20">
                      <UserCheck size={13} className="text-amber-400" />
                      <span>{mode.persona}</span>
                    </div>

                    {/* Description */}
                    <p className="mt-3 text-xs text-gray-300/80 leading-relaxed">
                      {mode.description}
                    </p>
                  </div>

                  {/* Bottom Direct Login Action Strip */}
                  <div className="mt-5 pt-3.5 border-t border-white/10 flex items-center justify-between text-xs font-bold text-amber-300 group-hover:text-amber-200">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 size={15} className="text-emerald-400" />
                      {isModeAdmin && hasActiveDraft ? 'Resume Exact Case Stage' : 'Click to Enter Portal'}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-slate-950 transition-all duration-300">
                      <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* TAB 2: REAL ID & PASSWORD ENTERPRISE AUTHENTICATION (For Full Live Operation) */
        <div className="w-full max-w-lg mx-auto my-auto py-2 relative z-10 animate-fade-in">
          <div className="bg-slate-900/90 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            
            {/* Form Header */}
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto mb-3 shadow-inner">
                <KeyRound className="text-amber-300" size={24} />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                Live Credentials Login
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Enter your official User ID and password to sign in
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
                <span>An active case registration draft will automatically resume upon successful login.</span>
              </div>
            )}

            {/* Sign In Form */}
            <form onSubmit={handleCredentialsLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  User Identification / Email or ID
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="login-identifier-input"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. ADMIN or CLT-001 or admin@docks.com"
                    className="w-full px-4 py-3 bg-slate-950/80 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400 transition"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                    Password
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
                    className="w-full px-4 py-3 bg-slate-950/80 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400 transition"
                    required
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                id="btn-submit-credentials"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 active:scale-[0.99] text-slate-950 font-extrabold text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <LogIn size={18} />
                    <span>Sign In to DOCKS Cloud</span>
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="my-5 flex items-center gap-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[11px] font-bold text-gray-500 uppercase">OR</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Google Single Sign-On Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full bg-white hover:bg-gray-100 text-gray-900 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-3 transition shadow-md active:scale-[0.99] cursor-pointer disabled:opacity-50 text-xs sm:text-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Sign in with Google Account</span>
            </button>

            {/* Quick Demo Credentials Assistant */}
            <div className="mt-5 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowQuickCredentials(!showQuickCredentials)}
                className="w-full flex items-center justify-between text-xs text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <HelpCircle size={14} /> Quick Demo Credentials Guide
                </span>
                <span>{showQuickCredentials ? '▲ Hide' : '▼ View'}</span>
              </button>

              {showQuickCredentials && (
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] animate-fade-in">
                  <button
                    type="button"
                    onClick={() => handleQuickFill(DEFAULT_DATABASE_USERS[1])}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-left transition"
                  >
                    <div className="font-bold text-amber-300">👑 Admin (Master)</div>
                    <div className="text-gray-400">ID: ADMIN</div>
                    <div className="text-gray-500 text-[10px]">Pass: admin123</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickFill(DEFAULT_DATABASE_USERS[15])}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-left transition"
                  >
                    <div className="font-bold text-yellow-300">💼 Client (Global)</div>
                    <div className="text-gray-400">ID: CLT-001</div>
                    <div className="text-gray-500 text-[10px]">Pass: client123</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickFill(DEFAULT_DATABASE_USERS[3])}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-left transition"
                  >
                    <div className="font-bold text-emerald-300">💰 Finance Head</div>
                    <div className="text-gray-400">ID: EMP-0003</div>
                    <div className="text-gray-500 text-[10px]">Pass: password123</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickFill(DEFAULT_DATABASE_USERS[2])}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-left transition"
                  >
                    <div className="font-bold text-cyan-300">🚢 Operations</div>
                    <div className="text-gray-400">ID: EMP-0002</div>
                    <div className="text-gray-500 text-[10px]">Pass: password123</div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer Info Notice */}
      <div className="w-full max-w-6xl mx-auto pt-4 pb-2 text-center text-[11px] text-gray-500 relative z-10 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-white/5">
        <div className="flex items-center gap-2 text-emerald-400/80">
          <ShieldCheck size={14} className="text-emerald-400" />
          <span>Direct Portal Gateway & Live Cloud Password Authentication Ready</span>
        </div>
        <div className="text-gray-400">
          DOCKS (PVT) LTD. Enterprise Logistics Cloud System
        </div>
      </div>
    </div>
  );
};

export default LoginModeSelection;
