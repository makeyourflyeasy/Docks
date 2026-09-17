import React from 'react';
import { 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Ship, 
  Clock, 
  FileCheck,
  Building2,
  Calendar
} from 'lucide-react';
import { CategoryStepRendererProps } from './CommonStepProps';
import { WorkflowMultiUploader } from '../WorkflowMultiUploader';

export const LinerNvoccSteps: React.FC<CategoryStepRendererProps> = ({
  stepIndex,
  formData,
  setFormData,
  targetCase,
  setActivePdfPreview,
  isReadOnly = false
}) => {
  return (
    <div className="space-y-5">
      {/* STEP 1: BOOKING & SLOT ALLOCATION */}
      {stepIndex === 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-gray-300 block mb-1.5">Master Bill of Lading (MBL) No. *</label>
              <input 
                type="text"
                disabled={isReadOnly}
                value={formData.linerMasterBl || targetCase.blNumber || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  linerMasterBl: e.target.value,
                  blNumber: e.target.value,
                  referenceNo: e.target.value 
                }))}
                placeholder="e.g. MSKU987654321"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-300 block mb-1.5">House Bill of Lading (HBL) No.</label>
              <input 
                type="text"
                disabled={isReadOnly}
                value={formData.linerHouseBl || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, linerHouseBl: e.target.value }))}
                placeholder="e.g. DPL-HBL-2026-101"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
          </div>

          <WorkflowMultiUploader
            label="Carrier Booking Confirmation Document"
            sublabel="Upload ocean liner booking memo, slot allocation confirmation, or vessel schedule sheet"
            urlField="linerBookingConfirmUrl"
            nameField="linerBookingConfirmName"
            formData={formData}
            setFormData={setFormData}
            onPreview={setActivePdfPreview}
            isReadOnly={isReadOnly}
          />
        </div>
      )}

      {/* STEP 2: MANIFEST & CUSTOMS FILING */}
      {stepIndex === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-gray-300 block mb-1.5">IGM / EGM Number & Index *</label>
              <input 
                type="text"
                disabled={isReadOnly}
                value={formData.linerIgmEgmIndex || targetCase.igmNo || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  linerIgmEgmIndex: e.target.value,
                  igmNo: e.target.value 
                }))}
                placeholder="e.g. IGM 1042/2026 Index 45"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-300 block mb-1.5">Manifest Filing Date</label>
              <input 
                type="date"
                disabled={isReadOnly}
                value={formData.linerManifestFilingDate || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, linerManifestFilingDate: e.target.value }))}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: CONTAINER DEMURRAGE & INVENTORY TRACKING */}
      {stepIndex === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-gray-300 block mb-1.5">Free Days Allowed by Liner</label>
              <input 
                type="number"
                disabled={isReadOnly}
                value={formData.linerFreeDaysAllowed || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, linerFreeDaysAllowed: Number(e.target.value) }))}
                placeholder="e.g. 14 Days"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-300 block mb-1.5">Daily Demurrage Rate (USD / PKR)</label>
              <input 
                type="number"
                disabled={isReadOnly}
                value={formData.linerDailyDemurrageRate || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, linerDailyDemurrageRate: Number(e.target.value) }))}
                placeholder="e.g. 40 USD / 11,000 PKR"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
          </div>

          {/* Demurrage Invoicing Logic */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-bold text-white text-sm block">Container Demurrage & Detention Payment</span>
                <span className="text-gray-400 text-[11px]">Charges incurred if returned after allowed free days</span>
              </div>
              <div className="flex rounded-xl bg-slate-800 p-1 border border-white/10 shrink-0">
                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => setFormData(prev => ({ ...prev, linerDemurragePaymentStatus: 'Paid by Client' }))}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    formData.linerDemurragePaymentStatus === 'Paid by Client' ? 'bg-brand-600 text-white' : 'text-gray-400'
                  }`}
                >
                  Paid by Client
                </button>
                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => setFormData(prev => ({ ...prev, linerDemurragePaymentStatus: 'Paid by DPL' }))}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    formData.linerDemurragePaymentStatus === 'Paid by DPL' ? 'bg-emerald-600 text-white' : 'text-gray-400'
                  }`}
                >
                  Paid by DPL
                </button>
              </div>
            </div>

            {formData.linerDemurragePaymentStatus === 'Paid by DPL' && (
              <div className="animate-fade-in pt-2">
                <label className="text-gray-400 block mb-1">Total Demurrage Amount Paid by DPL (PKR)</label>
                <input 
                  type="number"
                  disabled={isReadOnly}
                  value={formData.linerDemurrageAmount || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, linerDemurrageAmount: Number(e.target.value) }))}
                  placeholder="e.g. 55000"
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                />
                <p className="text-[11px] text-emerald-400 mt-1">
                  ✓ Demurrage settlement will be appended to the client's final invoice.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 4: EMPTY CONTAINER RETURN NOC */}
      {stepIndex === 3 && (
        <div className="space-y-4">
          <WorkflowMultiUploader
            label="Empty Depot Return Receipt (Equipment Interchange Receipt - EIR)"
            sublabel="Upload stamped depot return slip verifying empty container returned to shipping line terminal"
            urlField="linerEmptyDepotReceiptUrl"
            nameField="linerEmptyDepotReceiptName"
            formData={formData}
            setFormData={setFormData}
            onPreview={setActivePdfPreview}
            isReadOnly={isReadOnly}
          />

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
            <div>
              <span className="font-bold text-white text-sm block">Equipment Discharge & Liability Release Confirmation</span>
              <span className="text-gray-400 text-[11px]">Confirm container inspected without damage and security deposit released</span>
            </div>
            <button
              type="button"
              disabled={isReadOnly}
              onClick={() => setFormData(prev => ({ ...prev, linerEquipmentDischarged: !prev.linerEquipmentDischarged }))}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-all ${
                formData.linerEquipmentDischarged
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-white/5 border-white/10 text-gray-400'
              }`}
            >
              {formData.linerEquipmentDischarged ? '✓ Equipment Discharged' : 'Confirm Discharge'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
