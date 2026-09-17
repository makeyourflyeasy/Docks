import React from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Truck, 
  ShieldCheck, 
  FileCheck,
  Camera,
  Car
} from 'lucide-react';
import { CategoryStepRendererProps } from './CommonStepProps';
import { WorkflowMultiUploader } from '../WorkflowMultiUploader';

export const CarCarrierSteps: React.FC<CategoryStepRendererProps> = ({
  stepIndex,
  formData,
  setFormData,
  targetCase,
  setActivePdfPreview,
  isReadOnly = false
}) => {
  return (
    <div className="space-y-5">
      {/* STEP 1: VEHICLE CONDITION AUDIT */}
      {stepIndex === 0 && (
        <div className="space-y-4">
          <div>
            <label className="font-semibold text-gray-300 block mb-1.5">Vehicle VIN / Chassis Numbers *</label>
            <input 
              type="text"
              disabled={isReadOnly}
              value={formData.carChassisNumbers || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                carChassisNumbers: e.target.value,
                referenceNo: e.target.value 
              }))}
              placeholder="e.g. NZE140-9081234, ZVW30-112345 (comma-separated for multi-car loads)"
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
            />
          </div>

          <WorkflowMultiUploader
            label="Pre-Loading Physical Condition Audit Photos"
            sublabel="Capture 360-degree high resolution photos of vehicles (front, back, sides, odometer, scratches/dents)"
            urlField="carConditionAuditPhotoUrl"
            nameField="carConditionAuditPhotoName"
            allowCamera={true}
            formData={formData}
            setFormData={setFormData}
            onPreview={setActivePdfPreview}
            isReadOnly={isReadOnly}
          />
        </div>
      )}

      {/* STEP 2: CARRIER ASSIGNMENT & LOADING */}
      {stepIndex === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-gray-300 block mb-1.5">Car Carrier Trailer Reg No. *</label>
              <input 
                type="text"
                disabled={isReadOnly}
                value={formData.carCarrierTrailerNo || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, carCarrierTrailerNo: e.target.value }))}
                placeholder="e.g. CCT-8891"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-300 block mb-1.5">Deck Slot Assignment</label>
              <input 
                type="text"
                disabled={isReadOnly}
                value={formData.carDeckSlot || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, carDeckSlot: e.target.value }))}
                placeholder="e.g. Upper Deck Bay 1 & 2 / Lower Deck Bay 3"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white"
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
            <div>
              <span className="font-bold text-white text-sm block">Wheel Lashing & Safety Locking</span>
              <span className="text-gray-400 text-[11px]">All vehicle wheels securely lashed with safety wheel chocks and certified ratchets</span>
            </div>
            <button
              type="button"
              disabled={isReadOnly}
              onClick={() => setFormData(prev => ({ ...prev, carLashingLocked: !prev.carLashingLocked }))}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-all ${
                formData.carLashingLocked
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-white/5 border-white/10 text-gray-400'
              }`}
            >
              {formData.carLashingLocked ? '✓ Lashing Locked' : 'Mark Locked'}
            </button>
          </div>

          {/* Freight & Invoice Sync */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-bold text-white text-sm block">Car Carrier Freight</span>
                <span className="text-gray-400 text-[11px]">Vehicle transport charges for carrier trailer</span>
              </div>
              <div className="flex rounded-xl bg-slate-800 p-1 border border-white/10 shrink-0">
                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => setFormData(prev => ({ ...prev, carFreightArrangedBy: 'Client' }))}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    formData.carFreightArrangedBy === 'Client' ? 'bg-brand-600 text-white' : 'text-gray-400'
                  }`}
                >
                  Arranged by Client
                </button>
                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => setFormData(prev => ({ ...prev, carFreightArrangedBy: 'DPL' }))}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    formData.carFreightArrangedBy === 'DPL' ? 'bg-emerald-600 text-white' : 'text-gray-400'
                  }`}
                >
                  Arranged by DPL
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-gray-400 block mb-1">Carrier Freight Amount (PKR)</label>
                <input 
                  type="number"
                  disabled={isReadOnly}
                  value={formData.carFreightAmount || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, carFreightAmount: Number(e.target.value) }))}
                  placeholder="e.g. 140000"
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
              {formData.carFreightArrangedBy === 'DPL' && (
                <div className="animate-fade-in">
                  <label className="text-gray-400 block mb-1">DPL Carrier Commission (PKR)</label>
                  <input 
                    type="number"
                    disabled={isReadOnly}
                    value={formData.carFreightCommission || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, carFreightCommission: Number(e.target.value) }))}
                    placeholder="e.g. 10000"
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              )}
            </div>
            {formData.carFreightArrangedBy === 'DPL' && (
              <p className="text-[11px] text-emerald-400 mt-1">
                ✓ Car carrier freight and commission will be appended to the client invoice.
              </p>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: IN TRANSIT TRACKING */}
      {stepIndex === 2 && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
            <label className="font-bold text-white text-sm block">Car Carrier Highway Route Status</label>
            <div className="grid grid-cols-3 gap-2">
              {(['En Route', 'Checkpoint Reached', 'At Destination Hub'] as const).map(status => (
                <button
                  key={status}
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => setFormData(prev => ({ ...prev, carTransitProgress: status }))}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    formData.carTransitProgress === status
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-md'
                      : 'bg-slate-800 border-white/10 text-gray-400'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: UNLOADING & FINAL INSPECTION */}
      {stepIndex === 3 && (
        <div className="space-y-4">
          <WorkflowMultiUploader
            label="Destination Unloading Photos"
            sublabel="Capture photos of vehicles offloaded at destination yard/showroom"
            urlField="carUnloadingPhotoUrl"
            nameField="carUnloadingPhotoName"
            allowCamera={true}
            formData={formData}
            setFormData={setFormData}
            onPreview={setActivePdfPreview}
            isReadOnly={isReadOnly}
          />

          <WorkflowMultiUploader
            label="Final Delivery Inspection Sheet (Signed by Recipient)"
            sublabel="Signed handover sheet verifying scratch-free condition upon delivery"
            urlField="carInspectionSheetUrl"
            nameField="carInspectionSheetName"
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
