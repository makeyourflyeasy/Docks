import React from 'react';
import { 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  MapPin, 
  Truck, 
  ShieldCheck, 
  FileCheck,
  Radio,
  Clock,
  Compass
} from 'lucide-react';
import { CategoryStepRendererProps } from './CommonStepProps';
import { WorkflowMultiUploader } from '../WorkflowMultiUploader';

export const AfghanTransitSteps: React.FC<CategoryStepRendererProps> = ({
  stepIndex,
  formData,
  setFormData,
  targetCase,
  setActivePdfPreview,
  isReadOnly = false,
  availableVehicles = []
}) => {
  return (
    <div className="space-y-5">
      {/* STEP 1: SHIPPING DO & AT GD FILING */}
      {stepIndex === 0 && (
        <div className="space-y-4">
          <WorkflowMultiUploader
            label="Shipping Line Delivery Order (DO)"
            sublabel="Official ocean carrier DO endorsed for Afghan Transit Cargo"
            urlField="attShippingDoUrl"
            nameField="attShippingDoName"
            formData={formData}
            setFormData={setFormData}
            onPreview={setActivePdfPreview}
            isReadOnly={isReadOnly}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-gray-300 block mb-1.5">Afghan Transit GD Number (AT-GD) *</label>
              <input 
                type="text"
                disabled={isReadOnly}
                value={formData.attGdNumber || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  attGdNumber: e.target.value,
                  referenceNo: e.target.value 
                }))}
                placeholder="e.g. ATGD-KAPE-2026-9912"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-300 block mb-1.5">AT-GD Registration Date</label>
              <input 
                type="date"
                disabled={isReadOnly}
                value={formData.attGdDate || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, attGdDate: e.target.value }))}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: GUARANTEE & BANK SECURITY VERIFICATION */}
      {stepIndex === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-gray-300 block mb-1.5">Revolving Insurance / Bank Guarantee Bond No. *</label>
              <input 
                type="text"
                disabled={isReadOnly}
                value={formData.attBondNumber || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, attBondNumber: e.target.value }))}
                placeholder="e.g. BG-HABIB-2026-8812"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-300 block mb-1.5">Guarantee Validity Date</label>
              <input 
                type="date"
                disabled={isReadOnly}
                value={formData.attBondValidityDate || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, attBondValidityDate: e.target.value }))}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white"
              />
            </div>
          </div>

          <WorkflowMultiUploader
            label="Revolving Insurance Guarantee / Financial Bond Document"
            sublabel="Upload certified customs transit security bond copy"
            urlField="attBondDocUrl"
            nameField="attBondDocName"
            formData={formData}
            setFormData={setFormData}
            onPreview={setActivePdfPreview}
            isReadOnly={isReadOnly}
          />
        </div>
      )}

      {/* STEP 3: PORT LOADING & MANDATORY GPS TRACKING */}
      {stepIndex === 2 && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
            <span className="font-bold text-white text-sm block">Transit Carrier Allocation</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-gray-400 block mb-1">Vehicle Registration No.</label>
                <input 
                  type="text"
                  disabled={isReadOnly}
                  value={formData.attVehicleNo || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, attVehicleNo: e.target.value }))}
                  placeholder="e.g. TLX-982"
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-gray-400 block mb-1">Authorized Driver Name</label>
                <input 
                  type="text"
                  disabled={isReadOnly}
                  value={formData.attDriverName || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, attDriverName: e.target.value }))}
                  placeholder="e.g. Gul Khan"
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="text-gray-400 block mb-1">Driver CNIC</label>
                <input 
                  type="text"
                  disabled={isReadOnly}
                  value={formData.attDriverCnic || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, attDriverCnic: e.target.value }))}
                  placeholder="e.g. 14301-7654321-3"
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-white text-sm block">Mandatory Customs Satellite Tracker</span>
                <span className="text-gray-400 text-[11px]">Pakistan Customs approved real-time tracking unit installation</span>
              </div>
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => setFormData(prev => ({ ...prev, attTrackerInstalled: !prev.attTrackerInstalled }))}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-all ${
                  formData.attTrackerInstalled
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-white/5 border-white/10 text-gray-400'
                }`}
              >
                {formData.attTrackerInstalled ? '✓ Tracker Active' : 'Mark Installed'}
              </button>
            </div>

            <div>
              <label className="text-gray-400 block mb-1">Tracker Device Serial / Activation Code *</label>
              <input 
                type="text"
                disabled={isReadOnly}
                value={formData.attTrackerCode || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, attTrackerCode: e.target.value }))}
                placeholder="e.g. TRK-AFGHAN-998812"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: BORDER TRANSIT EXECUTION */}
      {stepIndex === 3 && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
            <label className="font-bold text-white text-sm block">Live GPS Monitoring Telemetry</label>
            <div className="grid grid-cols-3 gap-2">
              {(['Active', 'Off-Route Alert', 'Checkpoint Hold'] as const).map(status => (
                <button
                  key={status}
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => setFormData(prev => ({ ...prev, attGpsMonitoringStatus: status }))}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    formData.attGpsMonitoringStatus === status
                      ? status === 'Active'
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-md'
                        : 'bg-rose-500/20 border-rose-500/40 text-rose-300 shadow-md'
                      : 'bg-slate-800 border-white/10 text-gray-400'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
            <label className="font-bold text-white text-sm block">Designated Customs Border Checkpoint</label>
            <div className="grid grid-cols-2 gap-3">
              {(['Torkham', 'Chaman'] as const).map(border => (
                <button
                  key={border}
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => setFormData(prev => ({ ...prev, attBorderCheckpoint: border }))}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                    formData.attBorderCheckpoint === border
                      ? 'bg-brand-600 text-white shadow-md'
                      : 'bg-slate-800 border-white/10 text-gray-400'
                  }`}
                >
                  {border} Border Checkpoint
                </button>
              ))}
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-gray-300 text-xs">Customs Checkpoint Clearance Verification</span>
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => setFormData(prev => ({ ...prev, attCheckpointApproved: !prev.attCheckpointApproved }))}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-all ${
                  formData.attCheckpointApproved
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-white/5 border-white/10 text-gray-400'
                }`}
              >
                {formData.attCheckpointApproved ? '✓ Checkpoint Cleared' : 'Confirm Clearance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: BORDER CROSSING & HANDOVER */}
      {stepIndex === 4 && (
        <div className="space-y-4">
          <WorkflowMultiUploader
            label="Cross-Border Transit Gate Pass"
            sublabel="Pakistan Customs border clearance & exit gate pass"
            urlField="attBorderPassUrl"
            nameField="attBorderPassName"
            formData={formData}
            setFormData={setFormData}
            onPreview={setActivePdfPreview}
            isReadOnly={isReadOnly}
          />

          <WorkflowMultiUploader
            label="Afghan Customs Stamped Manifest & Discharge NOC"
            sublabel="Official destination endorsement verifying safe cargo handover across international border"
            urlField="attAfghanDischargeNocUrl"
            nameField="attAfghanDischargeNocName"
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
