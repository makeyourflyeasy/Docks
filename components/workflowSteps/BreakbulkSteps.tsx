import React from 'react';
import { 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Anchor, 
  ShieldCheck, 
  FileCheck,
  Building2,
  Calendar
} from 'lucide-react';
import { CategoryStepRendererProps } from './CommonStepProps';
import { WorkflowMultiUploader } from '../WorkflowMultiUploader';

export const BreakbulkSteps: React.FC<CategoryStepRendererProps> = ({
  stepIndex,
  formData,
  setFormData,
  targetCase,
  setActivePdfPreview,
  isReadOnly = false
}) => {
  return (
    <div className="space-y-5">
      {/* STEP 1: CHARTER PARTY & BERTHING */}
      {stepIndex === 0 && (
        <div className="space-y-4">
          <WorkflowMultiUploader
            label="Charter Party Agreement / Fixture Note"
            sublabel="Contract between charterer and shipowner specifying laytime, demurrage, and discharging terms"
            urlField="breakbulkCharterDocUrl"
            nameField="breakbulkCharterDocName"
            formData={formData}
            setFormData={setFormData}
            onPreview={setActivePdfPreview}
            isReadOnly={isReadOnly}
          />

          <div>
            <label className="font-semibold text-gray-300 block mb-1.5">Vessel Berthing Notice & Berth Location</label>
            <input 
              type="text"
              disabled={isReadOnly}
              value={formData.breakbulkBerthingNotice || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, breakbulkBerthingNotice: e.target.value }))}
              placeholder="e.g. MV PACIFIC GLORY - Berthing at Berth 5, Port Qasim"
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white"
            />
          </div>
        </div>
      )}

      {/* STEP 2: STEVEDORING & MARINE SURVEY */}
      {stepIndex === 1 && (
        <div className="space-y-4">
          <WorkflowMultiUploader
            label="Independent Marine Surveyor Inspection Report"
            sublabel="Pre-discharge draft survey, hatch opening condition, and cargo securing inspection report"
            urlField="breakbulkSurveyReportUrl"
            nameField="breakbulkSurveyReportName"
            formData={formData}
            setFormData={setFormData}
            onPreview={setActivePdfPreview}
            isReadOnly={isReadOnly}
          />

          <div>
            <label className="font-semibold text-gray-300 block mb-1.5">Assigned Crane & Heavy Lifter Operator</label>
            <input 
              type="text"
              disabled={isReadOnly}
              value={formData.breakbulkCraneOperator || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, breakbulkCraneOperator: e.target.value }))}
              placeholder="e.g. Premier Stevedores / 100-Ton Shore Mobile Crane"
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white"
            />
          </div>

          {/* Stevedoring Charges Invoicing */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-bold text-white text-sm block">Stevedoring & Heavy Lift Handling Charges</span>
                <span className="text-gray-400 text-[11px]">Quayside discharging and mobile crane charges</span>
              </div>
              <div className="flex rounded-xl bg-slate-800 p-1 border border-white/10 shrink-0">
                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => setFormData(prev => ({ ...prev, breakbulkStevedoringArrangedBy: 'Client' }))}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    formData.breakbulkStevedoringArrangedBy === 'Client' ? 'bg-brand-600 text-white' : 'text-gray-400'
                  }`}
                >
                  Arranged by Client
                </button>
                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => setFormData(prev => ({ ...prev, breakbulkStevedoringArrangedBy: 'DPL' }))}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    formData.breakbulkStevedoringArrangedBy === 'DPL' ? 'bg-emerald-600 text-white' : 'text-gray-400'
                  }`}
                >
                  Arranged by DPL
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-gray-400 block mb-1">Discharging Charges (PKR)</label>
                <input 
                  type="number"
                  disabled={isReadOnly}
                  value={formData.breakbulkStevedoringAmount || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, breakbulkStevedoringAmount: Number(e.target.value) }))}
                  placeholder="e.g. 350000"
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
              {formData.breakbulkStevedoringArrangedBy === 'DPL' && (
                <div className="animate-fade-in">
                  <label className="text-gray-400 block mb-1">DPL Stevedoring Commission (PKR)</label>
                  <input 
                    type="number"
                    disabled={isReadOnly}
                    value={formData.breakbulkStevedoringCommission || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, breakbulkStevedoringCommission: Number(e.target.value) }))}
                    placeholder="e.g. 25000"
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              )}
            </div>
            {formData.breakbulkStevedoringArrangedBy === 'DPL' && (
              <p className="text-[11px] text-emerald-400 mt-1">
                ✓ Stevedoring charges and handling fee will be appended to the client invoice.
              </p>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: TALLY SHEET & CARGO DISCHARGE */}
      {stepIndex === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-gray-300 block mb-1.5">Piece Count Tally</label>
              <input 
                type="number"
                disabled={isReadOnly}
                value={formData.breakbulkTallyPieceCount || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, breakbulkTallyPieceCount: Number(e.target.value) }))}
                placeholder="e.g. 85 Bundles Steel Pipes"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-300 block mb-1.5">Discharged Metric Tonnage (MT)</label>
              <input 
                type="number"
                disabled={isReadOnly}
                value={formData.breakbulkTallyMetricTons || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, breakbulkTallyMetricTons: Number(e.target.value) }))}
                placeholder="e.g. 1250 MT"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
          </div>

          <WorkflowMultiUploader
            label="Daily Discharge Tally Sheet Scan"
            sublabel="Upload tally clerk signed sheet verifying pieces offloaded from vessel hold"
            urlField="breakbulkTallySheetUrl"
            nameField="breakbulkTallySheetName"
            formData={formData}
            setFormData={setFormData}
            onPreview={setActivePdfPreview}
            isReadOnly={isReadOnly}
          />
        </div>
      )}

      {/* STEP 4: DIRECT LOADING / STORAGE DISPATCH */}
      {stepIndex === 3 && (
        <div className="space-y-4">
          <div>
            <label className="font-semibold text-gray-300 block mb-1.5">Port Gate Pass Numbers for Heavy Trailers</label>
            <input 
              type="text"
              disabled={isReadOnly}
              value={formData.breakbulkTrailerGatePasses || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, breakbulkTrailerGatePasses: e.target.value }))}
              placeholder="e.g. GP-991, GP-992, GP-993 (multi-trailer dispatch)"
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
            />
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
            <div>
              <span className="font-bold text-white text-sm block">Direct Quayside Offloading Dispatch Confirmation</span>
              <span className="text-gray-400 text-[11px]">Confirm cargo dispatched from berth directly onto road haulage trailers</span>
            </div>
            <button
              type="button"
              disabled={isReadOnly}
              onClick={() => setFormData(prev => ({ ...prev, breakbulkDirectDispatchConfirmed: !prev.breakbulkDirectDispatchConfirmed }))}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-all ${
                formData.breakbulkDirectDispatchConfirmed
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-white/5 border-white/10 text-gray-400'
              }`}
            >
              {formData.breakbulkDirectDispatchConfirmed ? '✓ Dispatched' : 'Confirm Dispatch'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
