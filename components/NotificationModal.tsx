import React from 'react';
import { X, Check, XCircle, FileText, DollarSign, Info, Trash2, AlertTriangle, Edit, ShieldAlert } from 'lucide-react';
import { AppNotification } from '../types';

interface NotificationModalProps {
  notification: AppNotification | null;
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: 'ACCEPT' | 'REJECT' | 'VIEW') => void;
}

const NotificationModal: React.FC<NotificationModalProps> = ({ notification, isOpen, onClose, onAction }) => {
  if (!isOpen || !notification) return null;

  const isApprovalAction = 
    notification.notificationSubType === 'CASE_APPROVAL' ||
    notification.notificationSubType === 'DELETION_APPROVAL' ||
    notification.notificationSubType === 'CANCELLATION_APPROVAL' ||
    notification.notificationSubType === 'EDIT_APPROVAL';

  const getIcon = () => {
    switch (notification.notificationSubType) {
      case 'DELETION_APPROVAL':
        return <Trash2 size={40} className="text-red-400" />;
      case 'CANCELLATION_APPROVAL':
        return <AlertTriangle size={40} className="text-amber-400" />;
      case 'EDIT_APPROVAL':
        return <Edit size={40} className="text-cyan-400" />;
      case 'CASE_APPROVAL':
        return <FileText size={40} className="text-blue-400" />;
      case 'BUYING':
        return <DollarSign size={40} className="text-green-400" />;
      default:
        return <Info size={40} className="text-gray-400" />;
    }
  };

  const getHeaderColor = () => {
    switch (notification.notificationSubType) {
      case 'DELETION_APPROVAL':
        return 'bg-gradient-to-r from-red-900 to-red-700';
      case 'CANCELLATION_APPROVAL':
        return 'bg-gradient-to-r from-amber-900 to-amber-700';
      case 'EDIT_APPROVAL':
        return 'bg-gradient-to-r from-cyan-900 to-blue-700';
      case 'CASE_APPROVAL':
        return 'bg-blue-600';
      case 'BUYING':
        return 'bg-green-600';
      default:
        return 'bg-slate-700';
    }
  };

  const approval = notification.approvalData;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-3 sm:pt-6 pb-6 px-3 sm:px-4 overflow-y-auto bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-white/15 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100 mb-6">
        
        {/* Header */}
        <div className={`${getHeaderColor()} p-5 flex justify-between items-start`}>
          <div className="flex gap-3.5 items-center">
            <div className="bg-white/15 p-2.5 rounded-xl backdrop-blur-md shrink-0">
              {getIcon()}
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white inline-block mb-1">
                {notification.notificationSubType?.replace(/_/g, ' ') || 'SYSTEM ALERT'}
              </span>
              <h3 className="text-lg font-bold text-white leading-tight">{notification.title}</h3>
              <p className="text-white/80 text-xs mt-0.5">{notification.timestamp}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white/70 hover:text-white hover:bg-white/15 p-1.5 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3.5 max-h-[60vh] overflow-y-auto custom-scrollbar">
          
          {/* Notification Description */}
          <div className="bg-white/5 rounded-xl p-3.5 border border-white/10">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <ShieldAlert size={14} className="text-amber-400" />
              Request Summary
            </h4>
            <p className="text-gray-200 text-sm leading-relaxed">
              {notification.description}
            </p>
          </div>

          {/* Structured Approval Context */}
          {approval && (
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="text-[11px] text-gray-400 block font-medium">Target Entity</span>
                <span className="text-sm font-bold text-white font-mono mt-0.5 block truncate">
                  {approval.entityName || `${approval.entityType.toUpperCase()} #${approval.entityId}`}
                </span>
                <span className="text-[10px] text-brand-400 uppercase font-semibold">
                  {approval.entityType}
                </span>
              </div>

              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="text-[11px] text-gray-400 block font-medium">Action Requested</span>
                <span className={`text-sm font-bold mt-0.5 block ${
                  approval.actionType === 'DELETE' ? 'text-red-400' :
                  approval.actionType === 'CANCEL' ? 'text-amber-400' : 'text-cyan-400'
                }`}>
                  {approval.actionType}
                </span>
                <span className="text-[10px] text-gray-400 truncate block">
                  By {approval.requestedBy}
                </span>
              </div>

              {approval.reason && (
                <div className="col-span-2 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl">
                  <span className="text-[11px] text-amber-300 font-semibold block uppercase tracking-wider">
                    Stated Reason:
                  </span>
                  <p className="text-xs text-amber-100 mt-1 italic leading-relaxed">
                    &quot;{approval.reason}&quot;
                  </p>
                </div>
              )}

              {approval.proposedChanges && Object.keys(approval.proposedChanges).length > 0 && (
                <div className="col-span-2 bg-white/5 border border-white/10 p-3 rounded-xl space-y-1.5">
                  <span className="text-[11px] text-gray-400 font-semibold block uppercase tracking-wider">
                    Proposed Modifications:
                  </span>
                  <div className="max-h-28 overflow-y-auto space-y-1 text-xs font-mono">
                    {Object.entries(approval.proposedChanges).map(([k, v]) => (
                      <div key={k} className="flex justify-between py-0.5 border-b border-white/5 text-[11px]">
                        <span className="text-gray-400">{k}:</span>
                        <span className="text-emerald-300 truncate max-w-[200px]">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Details (fallback text if any) */}
          {notification.details && !approval && (
            <div className="bg-white/5 rounded-xl p-3.5 border border-white/5">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Details</h4>
              <p className="text-gray-300 text-xs whitespace-pre-line font-mono">
                {notification.details}
              </p>
            </div>
          )}
        </div>

        {/* Footer / Actions */}
        <div className="p-4 border-t border-white/10 bg-black/30 flex flex-col gap-2.5">
          
          {/* Action Buttons for Approvals */}
          {isApprovalAction && (
            <div className="flex gap-2.5 w-full">
              <button 
                onClick={() => onAction('REJECT')}
                className="flex-1 flex items-center justify-center gap-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 py-2.5 rounded-xl transition-all font-semibold text-sm"
              >
                <XCircle size={16} /> Reject Request
              </button>
              <button 
                onClick={() => onAction('ACCEPT')}
                className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-500 text-white py-2.5 rounded-xl transition-all font-semibold text-sm shadow-lg shadow-green-600/20"
              >
                <Check size={16} /> Approve & Execute
              </button>
            </div>
          )}

          {/* Action Buttons for Buying */}
          {notification.notificationSubType === 'BUYING' && (
            <div className="flex gap-2.5 w-full">
              <button 
                onClick={() => onAction('REJECT')}
                className="flex-1 flex items-center justify-center gap-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 py-2.5 rounded-xl transition-all font-semibold text-sm"
              >
                <XCircle size={16} /> Reject
              </button>
              <button 
                onClick={() => onAction('ACCEPT')}
                className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-500 text-white py-2.5 rounded-xl transition-all font-semibold text-sm shadow-lg shadow-green-600/20"
              >
                <Check size={16} /> Approve
              </button>
            </div>
          )}

          {/* View Link */}
          <button 
            onClick={() => onAction('VIEW')}
            className="w-full text-center text-xs text-brand-400 hover:text-brand-300 hover:underline pt-1"
          >
            Open in {notification.targetView ? notification.targetView.toUpperCase() : 'Application'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationModal;
