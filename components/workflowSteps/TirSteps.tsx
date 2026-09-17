import React from 'react';
import { 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  FileCheck,
  Calendar,
  Lock,
  Globe
} from 'lucide-react';
import { CategoryStepRendererProps } from './CommonStepProps';
import { WorkflowMultiUploader } from '../WorkflowMultiUploader';

export const TirSteps: React.FC<CategoryStepRendererProps> = ({
  stepIndex,
  formData,
  setFormData,
  targetCase,
  setActivePdfPreview,
  isReadOnly = false
}) => {
  return (
    <div className="space-y-5">
      {/* STEP 1: TIR CARNET VALIDATION */}
      {stepIndex === 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-gray-300 block mb-1.5">TIR Carnet Number *</label>
              <input 
                type="text"
                disabled={isReadOnly}
                value={formData.tirCarnetNumber || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  tirCarnetNumber: e.target.value,
                  referenceNo: e.target.value 
                }))}
                placeholder="e.g. TIR-PK-889123-X"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-300 block mb-1.5">Carnet Validity Expiration Date</label>
              <input 
                type="date"
                disabled={isReadOnly}
                value={formData.tirValidityDate || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, tirValidityDate: e.target.value }))}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white"
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
            <label className="font-bold text-white text-sm block">International Guarantee Coverage Status</label>
            <div className="grid grid-cols-3 gap-2">
              {(['Active / Covered', 'Pending', 'Expired'] as const).map(status => (
                <button
                  key={status}
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => setFormData(prev => ({ ...prev, tirGuaranteeStatus: status }))}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    formData.tirGuaranteeStatus === status
                      ? status === 'Active / Covered'
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-md'
                        : 'bg-rose-500/20 border-rose-500/40 text-rose-300 shadow-md'
                      : 'bg-slate-800 border-white/10 text-gray-400'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-400">
              IRU (International Road Transport Union) guarantee endorsement verified for cross-border transit.
            </p>
          </div>
        </div>
      )}

      {/* STEP 2: DEPARTURE CUSTOMS SEALING */}
      {stepIndex === 1 && (
        <div className="space-y-4">
          <div>
            <label className="font-semibold text-gray-300 block mb-1.5">Departure Customs Office</label>
            <input 
              type="text"
              disabled={isReadOnly}
              value={formData.tirOriginCustomsOffice || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, tirOriginCustomsOffice: e.target.value }))}
              placeholder="e.g. Karachi Port Customs House / Port Qasim"
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white"
            />
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-sm">Customs Sealing Inspection</span>
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => setFormData(prev => ({ ...prev, tirSealingInspected: !prev.tirSealingInspected }))}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-all ${
                  formData.tirSealingInspected
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-white/5 border-white/10 text-gray-400'
                }`}
              >
                {formData.tirSealingInspected ? '✓ Inspected & Approved' : 'Mark Inspected'}
              </button>
            </div>

            <div className="pt-2">
              <label className="text-gray-400 block mb-1">TIR Approved Customs Seal Number *</label>
              <input 
                type="text"
                disabled={isReadOnly}
                value={formData.tirSealNumber || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, tirSealNumber: e.target.value }))}
                placeholder="e.g. PK-TIR-SEAL-987654"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
          </div>

          <WorkflowMultiUploader
            label="TIR Customs Seal Photo"
            sublabel="High-resolution close-up picture of affixed customs seal on vehicle/container doors"
            urlField="tirSealPhotoUrl"
            nameField="tirSealPhotoName"
            allowCamera={true}
            formData={formData}
            setFormData={setFormData}
            onPreview={setActivePdfPreview}
            isReadOnly={isReadOnly}
          />
        </div>
      )}

      {/* STEP 3: EN-ROUTE BORDER INSPECTION */}
      {stepIndex === 2 && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-white text-sm block">Border Crossing Voucher Detachment</span>
                <span className="text-gray-400 text-[11px]">TIR Carnet Volet 1 / Volet 2 detachment by customs officer</span>
              </div>
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => setFormData(prev => ({ ...prev, tirVoucherDetached: !prev.tirVoucherDetached }))}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-all ${
                  formData.tirVoucherDetached
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-white/5 border-white/10 text-gray-400'
                }`}
              >
                {formData.tirVoucherDetached ? '✓ Voucher Detached' : 'Mark Detached'}
              </button>
            </div>

            <div>
              <label className="text-gray-400 block mb-1">Detachment Reference / Voucher Serial No.</label>
              <input 
                type="text"
                disabled={isReadOnly}
                value={formData.tirVoucherDetachmentNo || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, tirVoucherDetachmentNo: e.target.value }))}
                placeholder="e.g. VOLET-2-DETACH-441"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
          </div>

          <WorkflowMultiUploader
            label="Customs Transit Inspection Checklist"
            sublabel="Upload stamped transit inspection report or border authority release sheet"
            urlField="tirInspectionChecklistUrl"
            nameField="tirInspectionChecklistName"
            formData={formData}
            setFormData={setFormData}
            onPreview={setActivePdfPreview}
            isReadOnly={isReadOnly}
          />
        </div>
      )}

      {/* STEP 4: DESTINATION CUSTOMS DISCHARGE */}
      {stepIndex === 3 && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
            <div>
              <span className="font-bold text-white text-sm block">Unbroken Seal & Physical Verification</span>
              <span className="text-gray-400 text-[11px]">Destination customs office confirmed unbroken seals & uncompromised lashing</span>
            </div>
            <button
              type="button"
              disabled={isReadOnly}
              onClick={() => setFormData(prev => ({ ...prev, tirSealIntactVerified: !prev.tirSealIntactVerified }))}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-all ${
                formData.tirSealIntactVerified
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-white/5 border-white/10 text-gray-400'
              }`}
            >
              {formData.tirSealIntactVerified ? '✓ Verified Intact' : 'Click to Verify'}
            </button>
          </div>

          <WorkflowMultiUploader
            label="TIR Carnet Final Discharge Voucher (Counterfoil Stamped Copy)"
            sublabel="Final destination customs stamp relieving carrier and guarantor of liability"
            urlField="tirDischargeVoucherUrl"
            nameField="tirDischargeVoucherName"
            formData={formData}
            setFormData={setFormData}
            onPreview={setActivePdfPreview}
            isReadOnly={isReadOnly}
          />
        </div>
      )}
    </div>
  );
};
