import React from 'react';
import { 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  FileCheck,
  Flame,
  Gauge
} from 'lucide-react';
import { CategoryStepRendererProps } from './CommonStepProps';
import { WorkflowMultiUploader } from '../WorkflowMultiUploader';

export const IsoTankSteps: React.FC<CategoryStepRendererProps> = ({
  stepIndex,
  formData,
  setFormData,
  targetCase,
  setActivePdfPreview,
  isReadOnly = false
}) => {
  return (
    <div className="space-y-5">
      {/* STEP 1: TANK FITNESS & CHEMICAL CLEARANCE */}
      {stepIndex === 0 && (
        <div className="space-y-4">
          <div>
            <label className="font-semibold text-gray-300 block mb-1.5">ISO Tank Container Number *</label>
            <input 
              type="text"
              disabled={isReadOnly}
              value={formData.isoTankNumber || targetCase.containerNumber || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                isoTankNumber: e.target.value,
                containerNumber: e.target.value,
                referenceNo: e.target.value 
              }))}
              placeholder="e.g. TANK-908123-4"
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <WorkflowMultiUploader
              label="Tank Cleanliness Certificate"
              sublabel="Certified periodic wash and chemical neutralization certificate"
              urlField="isoCleanlinessCertUrl"
              nameField="isoCleanlinessCertName"
              formData={formData}
              setFormData={setFormData}
              onPreview={setActivePdfPreview}
              isReadOnly={isReadOnly}
            />

            <WorkflowMultiUploader
              label="Periodic Hydrostatic / Pressure Test Certificate"
              sublabel="5-year / 2.5-year pressure test endorsement"
              urlField="isoPressureTestCertUrl"
              nameField="isoPressureTestCertName"
              formData={formData}
              setFormData={setFormData}
              onPreview={setActivePdfPreview}
              isReadOnly={isReadOnly}
            />
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
            <div>
              <span className="font-bold text-white text-sm block">Material Safety Data Sheet (MSDS) Verification</span>
              <span className="text-gray-400 text-[11px]">Chemical compatibility and hazardous substance protocols verified</span>
            </div>
            <button
              type="button"
              disabled={isReadOnly}
              onClick={() => setFormData(prev => ({ ...prev, isoMsdsVerified: !prev.isoMsdsVerified }))}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-all ${
                formData.isoMsdsVerified
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-white/5 border-white/10 text-gray-400'
              }`}
            >
              {formData.isoMsdsVerified ? '✓ MSDS Verified' : 'Verify MSDS'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: SPECIALIZED LOADING / DISCHARGE */}
      {stepIndex === 1 && (
        <div className="space-y-4">
          <WorkflowMultiUploader
            label="Terminal Loading / Decanting Authorization Document"
            sublabel="Port chemical terminal or refinery loading permit"
            urlField="isoLoadingAuthUrl"
            nameField="isoLoadingAuthName"
            formData={formData}
            setFormData={setFormData}
            onPreview={setActivePdfPreview}
            isReadOnly={isReadOnly}
          />

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
            <span className="font-bold text-white text-sm block">Tank Valve Seals & Pressure Reading</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 block mb-1">Bottom Discharge Valve Seal No.</label>
                <input 
                  type="text"
                  disabled={isReadOnly}
                  value={formData.isoValveSealNo || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, isoValveSealNo: e.target.value }))}
                  placeholder="e.g. SEAL-VALVE-998"
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-gray-400 block mb-1">Pressure Gauge Reading (Bar / PSI)</label>
                <input 
                  type="text"
                  disabled={isReadOnly}
                  value={formData.isoPressureGaugeReading || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, isoPressureGaugeReading: e.target.value }))}
                  placeholder="e.g. 1.8 Bar / 26 PSI"
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
            </div>
          </div>

          <WorkflowMultiUploader
            label="Valve Seal & Pressure Gauge Close-Up Photo"
            sublabel="High-resolution photo showing intact valve seal and pressure meter"
            urlField="isoValveSealPhotoUrl"
            nameField="isoValveSealPhotoName"
            allowCamera={true}
            formData={formData}
            setFormData={setFormData}
            onPreview={setActivePdfPreview}
            isReadOnly={isReadOnly}
          />
        </div>
      )}

      {/* STEP 3: SPECIALIZED TRANSPORT EXECUTION */}
      {stepIndex === 2 && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
            <span className="font-bold text-white text-sm block">HAZMAT Certified Transport Allocation</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 block mb-1">Assigned Vehicle Reg No.</label>
                <input 
                  type="text"
                  disabled={isReadOnly}
                  value={formData.isoVehicleRegNo || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, isoVehicleRegNo: e.target.value }))}
                  placeholder="e.g. JZ-4921"
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-gray-400 block mb-1">HAZMAT Certified Driver Name</label>
                <input 
                  type="text"
                  disabled={isReadOnly}
                  value={formData.isoDriverName || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, isoDriverName: e.target.value }))}
                  placeholder="e.g. Asad Ullah (HAZMAT Class 3 Certified)"
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-gray-300 text-xs">HAZMAT Emergency Kit & Fire Extinguisher Inspection</span>
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => setFormData(prev => ({ ...prev, isoHazmatCertified: !prev.isoHazmatCertified }))}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-all ${
                  formData.isoHazmatCertified
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-white/5 border-white/10 text-gray-400'
                }`}
              >
                {formData.isoHazmatCertified ? '✓ HAZMAT Verified' : 'Confirm HAZMAT Compliance'}
              </button>
            </div>
          </div>

          {/* Freight & Invoicing */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-bold text-white text-sm block">Specialized Tank Freight</span>
                <span className="text-gray-400 text-[11px]">Specialized hazardous tank haulage charges</span>
              </div>
              <div className="flex rounded-xl bg-slate-800 p-1 border border-white/10 shrink-0">
                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => setFormData(prev => ({ ...prev, isoFreightArrangedBy: 'Client' }))}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    formData.isoFreightArrangedBy === 'Client' ? 'bg-brand-600 text-white' : 'text-gray-400'
                  }`}
                >
                  Arranged by Client
                </button>
                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => setFormData(prev => ({ ...prev, isoFreightArrangedBy: 'DPL' }))}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    formData.isoFreightArrangedBy === 'DPL' ? 'bg-emerald-600 text-white' : 'text-gray-400'
                  }`}
                >
                  Arranged by DPL
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-gray-400 block mb-1">HAZMAT Tank Freight Amount (PKR)</label>
                <input 
                  type="number"
                  disabled={isReadOnly}
                  value={formData.isoFreightAmount || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, isoFreightAmount: Number(e.target.value) }))}
                  placeholder="e.g. 210000"
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
              {formData.isoFreightArrangedBy === 'DPL' && (
                <div className="animate-fade-in">
                  <label className="text-gray-400 block mb-1">DPL Tank Handling Commission (PKR)</label>
                  <input 
                    type="number"
                    disabled={isReadOnly}
                    value={formData.isoFreightCommission || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, isoFreightCommission: Number(e.target.value) }))}
                    placeholder="e.g. 15000"
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              )}
            </div>
            {formData.isoFreightArrangedBy === 'DPL' && (
              <p className="text-[11px] text-emerald-400 mt-1">
                ✓ HAZMAT Tank Freight and commission will be appended to the client invoice.
              </p>
            )}
          </div>
        </div>
      )}

      {/* STEP 4: DELIVERY & RECEIVER SIGN-OFF */}
      {stepIndex === 3 && (
        <div className="space-y-4">
          <WorkflowMultiUploader
            label="Receiver Safety Offloading Endorsement & Clean Return Pass"
            sublabel="Factory receiver signature confirming safe discharge and issuing clean return pass for empty ISO tank"
            urlField="isoReceiverEndorsementUrl"
            nameField="isoReceiverEndorsementName"
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
