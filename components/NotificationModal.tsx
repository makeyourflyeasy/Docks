import React from 'react';
import { X, Check, XCircle, FileText, DollarSign, Info } from 'lucide-react';
import { AppNotification } from '../types';

interface NotificationModalProps {
  notification: AppNotification | null;
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: 'ACCEPT' | 'REJECT' | 'VIEW') => void;
}

const NotificationModal: React.FC<NotificationModalProps> = ({ notification, isOpen, onClose, onAction }) => {
  if (!isOpen || !notification) return null;

  const getIcon = () => {
    switch (notification.notificationSubType) {
      case 'CASE_APPROVAL':
        return <FileText size={48} className="text-blue-500" />;
      case 'BUYING':
        return <DollarSign size={48} className="text-green-500" />;
      default:
        return <Info size={48} className="text-gray-500" />;
    }
  };

  const getHeaderColor = () => {
    switch (notification.notificationSubType) {
      case 'CASE_APPROVAL':
        return 'bg-blue-600';
      case 'BUYING':
        return 'bg-green-600';
      default:
        return 'bg-slate-700';
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100">
        
        {/* Header */}
        <div className={`${getHeaderColor()} p-6 flex justify-between items-start`}>
          <div className="flex gap-4 items-center">
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-md">
              {getIcon()}
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{notification.title}</h3>
              <p className="text-white/80 text-sm mt-1">{notification.timestamp}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="bg-white/5 rounded-xl p-4 border border-white/5">
            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Description</h4>
            <p className="text-gray-200 leading-relaxed">
              {notification.description}
            </p>
          </div>

          {notification.details && (
            <div className="bg-white/5 rounded-xl p-4 border border-white/5">
              <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Details</h4>
              <p className="text-gray-300 text-sm whitespace-pre-line">
                {notification.details}
              </p>
            </div>
          )}

          {/* Specific Fields based on Type (Mock Data for now) */}
          {notification.notificationSubType === 'CASE_APPROVAL' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 p-3 rounded-lg">
                <span className="text-xs text-gray-500 block">Case ID</span>
                <span className="text-sm font-mono text-white">DPL-24-0042</span>
              </div>
              <div className="bg-white/5 p-3 rounded-lg">
                <span className="text-xs text-gray-500 block">Client</span>
                <span className="text-sm text-white">Global Traders Ltd.</span>
              </div>
            </div>
          )}

           {notification.notificationSubType === 'BUYING' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 p-3 rounded-lg">
                <span className="text-xs text-gray-500 block">Amount</span>
                <span className="text-sm font-mono text-green-400">PKR 12,450.00</span>
              </div>
              <div className="bg-white/5 p-3 rounded-lg">
                <span className="text-xs text-gray-500 block">Vendor</span>
                <span className="text-sm text-white">Maersk Line</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer / Actions */}
        <div className="p-6 border-t border-white/10 bg-black/20 flex flex-col gap-3">
          
          {/* Action Buttons for Case Approval */}
          {notification.notificationSubType === 'CASE_APPROVAL' && (
            <div className="flex gap-3 w-full">
              <button 
                onClick={() => onAction('REJECT')}
                className="flex-1 flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 py-3 rounded-xl transition-all font-medium"
              >
                <XCircle size={18} /> Reject Case
              </button>
              <button 
                onClick={() => onAction('ACCEPT')}
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl transition-all font-medium shadow-lg shadow-green-600/20"
              >
                <Check size={18} /> Accept Case
              </button>
            </div>
          )}

          {/* Action Buttons for Buying */}
           {notification.notificationSubType === 'BUYING' && (
            <div className="flex gap-3 w-full">
              <button 
                onClick={() => onAction('REJECT')}
                className="flex-1 flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 py-3 rounded-xl transition-all font-medium"
              >
                <XCircle size={18} /> Reject
              </button>
              <button 
                onClick={() => onAction('ACCEPT')}
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl transition-all font-medium shadow-lg shadow-green-600/20"
              >
                <Check size={18} /> Approve
              </button>
            </div>
          )}

          {/* View Full Details Link */}
          <button 
            onClick={() => onAction('VIEW')}
            className="w-full text-center text-sm text-brand-400 hover:text-brand-300 hover:underline mt-2"
          >
            View Full Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationModal;
