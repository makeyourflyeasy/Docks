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
import { logoutUser, auth } from '../services/firebase';
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
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs leading-relaxed">
                <p className="font-semibold mb-1">Official ID & Password Authentication Required</p>
                <p className="text-gray-400 text-[11px]">
                  Sign in through the main corporate portal using your designated User ID and password.
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition shadow-md cursor-pointer text-xs"
              >
                <span>Continue to App</span>
              </button>

              <div className="pt-2 text-[11px] text-gray-500 flex items-center justify-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>Protected Enterprise Firestore Database</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
