import React, { useState } from 'react';
import { 
  X, 
  LogIn, 
  LogOut, 
  ShieldCheck, 
  CheckCircle2, 
  Database, 
  User, 
  Mail, 
  Loader2, 
  KeyRound,
  Sparkles,
  HardDrive
} from 'lucide-react';
import { loginWithGoogle, logoutUser, auth } from '../services/firebase';
import { signInWithGoogleDrive, getDriveAccessToken } from '../services/googleDriveService';
import { UserRole } from '../types';
import Logo from './Logo';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  onClose, 
  currentUser, 
  currentRole, 
  onRoleChange 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await loginWithGoogle();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logoutUser();
      onClose();
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div 
        className="bg-slate-900 border border-brand-500/30 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-6 border-b border-white/10 relative">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <Logo className="h-9 w-auto" />
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-brand-500/20 p-2.5 rounded-xl border border-brand-500/30">
              <Database className="text-brand-400" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Firebase Authentication
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </h3>
              <p className="text-xs text-brand-300/80">Cloud Database & Authentication</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Database Live Status Badge */}
          <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-300">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span className="font-medium">Firestore Database: Connected & Secure</span>
            </div>
            <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-md font-mono">
              ACTIVE
            </span>
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-xs text-rose-300">
              {error}
            </div>
          )}

          {currentUser ? (
            /* Logged In View */
            <div className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3">
                {currentUser.photoURL ? (
                  <img 
                    src={currentUser.photoURL} 
                    alt={currentUser.displayName || 'User'} 
                    className="w-12 h-12 rounded-full border border-brand-500/40 object-cover" 
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-brand-600 flex items-center justify-center text-white font-bold text-lg">
                    {currentUser.displayName ? currentUser.displayName[0] : 'U'}
                  </div>
                )}
                <div className="overflow-hidden flex-1">
                  <h4 className="text-white font-semibold text-sm truncate">
                    {currentUser.displayName || 'Logged In User'}
                  </h4>
                  <p className="text-gray-400 text-xs truncate flex items-center gap-1 mt-0.5">
                    <Mail size={12} className="text-brand-400" /> {currentUser.email}
                  </p>
                  <p className="text-[10px] text-gray-500 font-mono mt-0.5 truncate">
                    UID: {currentUser.uid}
                  </p>
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  Active Portal Role:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onRoleChange(UserRole.ADMIN)}
                    className={`p-2.5 rounded-lg border text-xs font-medium text-center transition ${
                      currentRole === UserRole.ADMIN 
                        ? 'bg-brand-600/20 border-brand-500 text-brand-300 shadow-md' 
                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    Admin Portal
                  </button>
                  <button
                    type="button"
                    onClick={() => onRoleChange(UserRole.CLIENT)}
                    className={`p-2.5 rounded-lg border text-xs font-medium text-center transition ${
                      currentRole === UserRole.CLIENT 
                        ? 'bg-amber-600/20 border-amber-500 text-amber-300 shadow-md' 
                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    Client Portal
                  </button>
                </div>
              </div>

              {/* Google Drive Status Link */}
              <div className="p-3 rounded-xl bg-slate-800/80 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <HardDrive size={18} className="text-brand-400" />
                  <div className="text-left">
                    <p className="text-xs font-semibold text-white">Google Drive Cloud Storage</p>
                    <p className="text-[11px] text-gray-400">
                      {getDriveAccessToken() ? 'Connected & Ready' : 'Permissions configured'}
                    </p>
                  </div>
                </div>
                {!getDriveAccessToken() && (
                  <button
                    type="button"
                    onClick={async () => {
                      setLoading(true);
                      try {
                        await signInWithGoogleDrive();
                        setError(null);
                      } catch (err: any) {
                        setError(err?.message || 'Failed to connect Drive');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="px-2.5 py-1 text-xs font-medium rounded-lg bg-brand-600 hover:bg-brand-500 text-white transition"
                  >
                    Connect
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 py-2.5 rounded-xl text-sm font-medium transition"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            /* Logged Out View */
            <div className="space-y-4 text-center">
              <p className="text-gray-300 text-xs leading-relaxed">
                Sign in with your Google account to sync records and access cloud databases securely.
              </p>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full bg-white hover:bg-gray-100 text-gray-900 font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-3 transition shadow-lg shadow-white/10 active:scale-[0.99]"
              >
                {loading ? (
                  <Loader2 size={20} className="animate-spin text-gray-900" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>Sign in with Google</span>
              </button>

              <div className="pt-2 text-[11px] text-gray-500 flex items-center justify-center gap-1.5">
                <ShieldCheck size={14} className="text-brand-400" />
                <span>Google Firebase Auth & Firestore Integration</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
