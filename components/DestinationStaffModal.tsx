import React, { useState, useEffect } from 'react';
import { 
  X, MapPin, User, Phone, CreditCard, DollarSign, 
  CheckCircle, Shield, FileText, Save, AlertTriangle
} from 'lucide-react';
import { DestinationStaff } from '../types';
import { saveDestinationStaffToFirestore } from '../services/dbService';

interface DestinationStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffToEdit?: DestinationStaff | null;
  onSaved?: () => void;
}

export const COMMON_STATIONS = [
  'Karachi Port (KPT)',
  'Port Qasim (PQA)',
  'Torkham Border',
  'Chaman Border',
  'Peshawar Dry Port',
  'Quetta Chaman Transit Office',
  'Lahore Dry Port (Prem Nagar)',
  'Faisalabad Dry Port',
  'Sialkot Dry Port',
  'Islamabad Dry Port',
  'Gwadar Port',
  'Kabul Destination Terminal',
  'Kandahar Destination Point',
  'Jalalabad Hub'
];

export const DESTINATION_ROLES = [
  'Station Supervisor',
  'Loading Agent',
  'Unloading Agent',
  'Customs Clearance Agent',
  'Border Representative',
  'Port Operations Officer'
];

export const DestinationStaffModal: React.FC<DestinationStaffModalProps> = ({
  isOpen,
  onClose,
  staffToEdit,
  onSaved
}) => {
  const [formData, setFormData] = useState<Partial<DestinationStaff>>({
    name: '',
    station: 'Karachi Port (KPT)',
    role: 'Loading Agent',
    phone: '',
    secondaryPhone: '',
    cnic: '',
    address: '',
    paymentType: 'MONTHLY_SALARY',
    baseRate: 40000,
    status: 'ACTIVE',
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (staffToEdit) {
      setFormData({
        ...staffToEdit
      });
    } else {
      setFormData({
        name: '',
        station: 'Karachi Port (KPT)',
        role: 'Loading Agent',
        phone: '',
        secondaryPhone: '',
        cnic: '',
        address: '',
        paymentType: 'MONTHLY_SALARY',
        baseRate: 40000,
        status: 'ACTIVE',
        notes: ''
      });
    }
    setErrorMsg('');
  }, [staffToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      setErrorMsg('Please enter representative full name');
      return;
    }
    if (!formData.phone?.trim()) {
      setErrorMsg('Please enter primary contact phone number');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const payload: Partial<DestinationStaff> = {
        ...formData,
        id: staffToEdit?.id || `dest_${Date.now()}`,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        station: formData.station || 'Karachi Port (KPT)',
        role: formData.role || 'Loading Agent',
        status: formData.status || 'ACTIVE',
        baseRate: Number(formData.baseRate) || 0,
        updatedAt: new Date().toISOString(),
        createdAt: staffToEdit?.createdAt || new Date().toISOString()
      };

      await saveDestinationStaffToFirestore(payload);
      if (onSaved) onSaved();
      onClose();
    } catch (err: any) {
      console.error('Error saving destination staff:', err);
      setErrorMsg(err.message || 'Failed to save destination staff. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-start justify-center pt-3 sm:pt-6 pb-6 px-3 sm:px-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="glass-card rounded-2xl w-full max-w-xl border border-white/15 shadow-2xl bg-slate-900/98 mb-6 flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex justify-between items-center bg-slate-950/80 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <MapPin size={20} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                {staffToEdit ? 'Edit Destination Staff Profile' : 'Add New Destination Representative'}
              </h3>
              <p className="text-xs text-gray-400">
                Company representatives stationed at ports, dry ports & border crossings (loading, unloading & clearing)
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto max-h-[78vh]">
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Personal & Station Info */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label className="text-gray-300 font-medium block mb-1">
                  Representative Full Name <span className="text-red-400">*</span>
                </label>
                <input 
                  type="text"
                  placeholder="e.g. Khan Muhammad Torkhami"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full glass-input rounded-xl p-2.5 bg-black/40 border border-white/15 text-white outline-none focus:border-amber-400"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-gray-300 font-medium block mb-1">
                  Station Location <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.station}
                  onChange={(e) => setFormData({ ...formData, station: e.target.value })}
                  className="w-full glass-input rounded-xl p-2.5 bg-black/40 border border-white/15 text-white outline-none focus:border-amber-400"
                >
                  {COMMON_STATIONS.map(s => (
                    <option key={s} value={s} className="bg-slate-900">{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-gray-300 font-medium block mb-1">
                  Role / Responsibility <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full glass-input rounded-xl p-2.5 bg-black/40 border border-white/15 text-white outline-none focus:border-amber-400"
                >
                  {DESTINATION_ROLES.map(r => (
                    <option key={r} value={r} className="bg-slate-900">{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-gray-300 font-medium block mb-1">
                  Primary Mobile Phone <span className="text-red-400">*</span>
                </label>
                <input 
                  type="text"
                  placeholder="e.g. 0300-9876543"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full glass-input rounded-xl p-2.5 bg-black/40 border border-white/15 text-white outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-gray-300 font-medium block mb-1">
                  Secondary Phone / Emergency
                </label>
                <input 
                  type="text"
                  placeholder="e.g. 0312-3456789"
                  value={formData.secondaryPhone || ''}
                  onChange={(e) => setFormData({ ...formData, secondaryPhone: e.target.value })}
                  className="w-full glass-input rounded-xl p-2.5 bg-black/40 border border-white/15 text-white outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-gray-300 font-medium block mb-1">
                  National ID (CNIC)
                </label>
                <input 
                  type="text"
                  placeholder="e.g. 17301-1234567-1"
                  value={formData.cnic || ''}
                  onChange={(e) => setFormData({ ...formData, cnic: e.target.value })}
                  className="w-full glass-input rounded-xl p-2.5 bg-black/40 border border-white/15 text-white outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-gray-300 font-medium block mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full glass-input rounded-xl p-2.5 bg-black/40 border border-white/15 text-white outline-none focus:border-amber-400"
                >
                  <option value="ACTIVE" className="bg-slate-900">Active Duty</option>
                  <option value="INACTIVE" className="bg-slate-900">Inactive / On Leave</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-gray-300 font-medium block mb-1">
                  Station Office / Camp Address
                </label>
                <input 
                  type="text"
                  placeholder="e.g. Near Customs Gate # 2, Torkham Border, Khyber Agency"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full glass-input rounded-xl p-2.5 bg-black/40 border border-white/15 text-white outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Compensation & Payment Structure */}
          <div className="space-y-3 pt-3 border-t border-white/10">
            <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign size={14} /> Compensation & Settlement Terms
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-gray-300 font-medium block mb-1">Payment Method / Structure</label>
                <select
                  value={formData.paymentType}
                  onChange={(e) => setFormData({ ...formData, paymentType: e.target.value as any })}
                  className="w-full glass-input rounded-xl p-2.5 bg-black/40 border border-white/15 text-white outline-none"
                >
                  <option value="MONTHLY_SALARY" className="bg-slate-900">Fixed Monthly Salary</option>
                  <option value="PER_CASE_COMMISSION" className="bg-slate-900">Per Container / Case Commission</option>
                  <option value="DAILY_RATE" className="bg-slate-900">Daily Rate Allowance</option>
                </select>
              </div>

              <div>
                <label className="text-gray-300 font-medium block mb-1">
                  Rate / Amount (PKR)
                </label>
                <input 
                  type="number"
                  placeholder="e.g. 40000"
                  value={formData.baseRate || ''}
                  onChange={(e) => setFormData({ ...formData, baseRate: Number(e.target.value) || 0 })}
                  className="w-full glass-input rounded-xl p-2.5 bg-black/40 border border-white/15 text-emerald-300 font-mono font-bold outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-gray-300 font-medium block mb-1">Operational Notes / Special Duties</label>
                <input 
                  type="text"
                  placeholder="e.g. Coordinates border seals inspection and Afghan customs clearance gate-passes"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full glass-input rounded-xl p-2.5 bg-black/40 border border-white/15 text-white outline-none"
                />
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-between items-center pt-4 border-t border-white/10">
            <button 
              type="button"
              onClick={onClose}
              className="bg-white/10 hover:bg-white/15 text-gray-300 px-4 py-2.5 rounded-xl font-medium text-xs transition"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-semibold text-xs shadow-lg shadow-amber-600/30 transition flex items-center gap-2"
            >
              <Save size={15} />
              <span>{isSubmitting ? 'Saving...' : staffToEdit ? 'Update Profile' : 'Save Representative'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
