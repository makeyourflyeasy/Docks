import React from 'react';
import { 
  Truck, 
  ShieldCheck, 
  FileText, 
  AlertTriangle, 
  Layers, 
  Anchor, 
  CheckCircle2, 
  Clock, 
  Building2, 
  Sparkles,
  Barcode
} from 'lucide-react';
import { Case, CaseStepDetail } from '../types';
import { WorkflowMultiUploader } from './WorkflowMultiUploader';

export interface CargoEquipmentSubCategoryFieldsProps {
  subCategory?: string;
  formData: CaseStepDetail;
  setFormData: React.Dispatch<React.SetStateAction<CaseStepDetail>>;
  targetCase?: Case;
  setActivePdfPreview: (preview: { url: string; title: string } | null) => void;
  isReadOnly?: boolean;
}

export const CargoEquipmentSubCategoryFields: React.FC<CargoEquipmentSubCategoryFieldsProps> = ({
  subCategory = 'Standard Container / General Cargo',
  formData,
  setFormData,
  targetCase,
  setActivePdfPreview,
  isReadOnly = false
}) => {
  const normSub = (subCategory || '').toLowerCase();
  const isCarCarrier = normSub.includes('car');
  const isIsoTank = normSub.includes('iso') || normSub.includes('tank');
  const isBreakbulk = normSub.includes('breakbulk') || normSub.includes('charter');
  const isLinerNvocc = normSub.includes('liner') || normSub.includes('nvocc');

  // If standard container, display standard container & customs seal fields
  if (!isCarCarrier && !isIsoTank && !isBreakbulk && !isLinerNvocc) {
    return (
      <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-3 animate-fade-in">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-brand-400" />
            <span className="font-bold text-white text-xs uppercase tracking-wider">
              Standard Container & Cargo Verification
            </span>
          </div>
          <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-mono font-semibold">
            Standard Container / General Cargo
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-gray-300 font-semibold text-xs block mb-1">
              Container Number *
            </label>
            <input 
              type="text"
              disabled={isReadOnly}
              value={targetCase?.containers?.[0]?.number || ''}
              readOnly
              className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs cursor-not-allowed"
              placeholder="e.g. MSKU-982145-2"
            />
          </div>
          <div>
            <label className="text-gray-300 font-semibold text-xs block mb-1">
              Customs Seal Number *
            </label>
            <input 
              type="text"
              disabled={isReadOnly}
              value={formData.customsSealNumber || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, customsSealNumber: e.target.value }))}
              placeholder="e.g. PK-KHI-998812"
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-brand-500 outline-none"
            />
          </div>
        </div>
      </div>
    );
  }

  // CAR CARRIER SUB-CATEGORY: Replaces Container Number with Vehicle VIN / Chassis Number
  if (isCarCarrier) {
    return (
      <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/25 space-y-4 animate-fade-in">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <Truck size={16} className="text-amber-400" />
            <span className="font-bold text-white text-xs uppercase tracking-wider">
              Car Carrier Equipment & Vehicle Tracking
            </span>
          </div>
          <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-semibold">
            Sub-Category: Car Carrier
          </span>
        </div>

        {/* VIN / Chassis Input */}
        <div>
          <label className="text-amber-300 font-semibold text-xs block mb-1">
            Vehicle VIN / Chassis Numbers (Replaces Container Number) *
          </label>
          <textarea
            rows={2}
            disabled={isReadOnly}
            value={formData.carVinChassisNumbers || targetCase?.extractedData?.chassisNumbers || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, carVinChassisNumbers: e.target.value }))}
            placeholder="e.g. JTDKN3DU5A0129481, WBA3A5C58DF918231 (1 per line or comma-separated)"
            className="w-full bg-slate-800 border border-white/10 rounded-xl p-2.5 text-white font-mono text-xs focus:border-amber-400 outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-gray-300 font-semibold text-xs block mb-1">Car Carrier Trailer Reg No.</label>
            <input 
              type="text"
              disabled={isReadOnly}
              value={formData.carCarrierTrailerNo || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, carCarrierTrailerNo: e.target.value }))}
              placeholder="e.g. T-LHR-8821"
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs"
            />
          </div>
          <div>
            <label className="text-gray-300 font-semibold text-xs block mb-1">Deck Slot Allocation</label>
            <input 
              type="text"
              disabled={isReadOnly}
              value={formData.carCarrierDeckSlot || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, carCarrierDeckSlot: e.target.value }))}
              placeholder="e.g. Upper Deck - Bay 1 & 2"
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-xs"
            />
          </div>
        </div>

        {/* Pre-Loading Physical Damage Audit Photos */}
        <WorkflowMultiUploader
          label="Pre-Loading Physical Damage Audit Photos *"
          sublabel="Upload multi-angle exterior bodywork, odometer, and scratch condition photographs"
          urlField="carAuditPhotosUrl"
          nameField="carAuditPhotosName"
          formData={formData}
          setFormData={setFormData}
          onPreview={setActivePdfPreview}
          isReadOnly={isReadOnly}
        />

        {/* Vehicle Lashing Verification Checklist */}
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
          <div>
            <span className="font-semibold text-white text-xs block">Vehicle Lashing & Strapping Lock Verification</span>
            <span className="text-gray-400 text-[11px]">Wheel chocks and 4-point tire harness secured to carrier deck</span>
          </div>
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => setFormData(prev => ({ ...prev, carLashingLockVerified: !prev.carLashingLockVerified }))}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-all ${
              formData.carLashingLockVerified 
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
            }`}
          >
            {formData.carLashingLockVerified ? '✓ Lashing Verified' : 'Verify Lashing'}
          </button>
        </div>
      </div>
    );
  }

  // ISO TANK SUB-CATEGORY: Replaces Container Number with ISO Tank Unit Number
  if (isIsoTank) {
    return (
      <div className="p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/25 space-y-4 animate-fade-in">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-cyan-400" />
            <span className="font-bold text-white text-xs uppercase tracking-wider">
              ISO Tank & Liquid Bulk Chemical Tracking
            </span>
          </div>
          <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2.5 py-0.5 rounded-full font-semibold">
            Sub-Category: ISO Tank Service
          </span>
        </div>

        {/* ISO Tank Unit Number */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-cyan-300 font-semibold text-xs block mb-1">
              ISO Tank Unit Number (Replaces Container Number) *
            </label>
            <input 
              type="text"
              disabled={isReadOnly}
              value={formData.isoTankNumber || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, isoTankNumber: e.target.value }))}
              placeholder="e.g. ITNU-748921-3"
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-cyan-400 outline-none"
            />
          </div>
          <div>
            <label className="text-gray-300 font-semibold text-xs block mb-1">
              Chemical / Product Commercial Name & UN No.
            </label>
            <input 
              type="text"
              disabled={isReadOnly}
              value={formData.isoChemicalName || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, isoChemicalName: e.target.value }))}
              placeholder="e.g. Acetone / UN 1090 (Class 3 HAZMAT)"
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-xs"
            />
          </div>
        </div>

        {/* Required Uploads: Cleanliness Certificate, Safety Pressure Test Certificate, MSDS */}
        <WorkflowMultiUploader
          label="ISO Tank Cleanliness Certificate *"
          sublabel="Certified tank interior degreasing, steam wash, and odor-free inspection certificate"
          urlField="isoCleanlinessCertUrl"
          nameField="isoCleanlinessCertName"
          formData={formData}
          setFormData={setFormData}
          onPreview={setActivePdfPreview}
          isReadOnly={isReadOnly}
        />

        <WorkflowMultiUploader
          label="Safety Pressure Test Certificate *"
          sublabel="Mandatory 2.5/5-year hydraulic or pneumatic pressure test certificate"
          urlField="isoPressureTestCertUrl"
          nameField="isoPressureTestCertName"
          formData={formData}
          setFormData={setFormData}
          onPreview={setActivePdfPreview}
          isReadOnly={isReadOnly}
        />

        <WorkflowMultiUploader
          label="Material Safety Data Sheet (MSDS) *"
          sublabel="Official 16-section chemical safety data sheet with emergency response guidance"
          urlField="isoMsdsDocUrl"
          nameField="isoMsdsDocName"
          formData={formData}
          setFormData={setFormData}
          onPreview={setActivePdfPreview}
          isReadOnly={isReadOnly}
        />

        {/* Pressure gauge bar & MSDS verified */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
          <div>
            <label className="text-gray-300 font-semibold text-xs block mb-1">Pressure Gauge Reading (Bar)</label>
            <input 
              type="number"
              step="0.1"
              disabled={isReadOnly}
              value={formData.isoPressureGaugeBar || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, isoPressureGaugeBar: Number(e.target.value) }))}
              placeholder="e.g. 1.8"
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs"
            />
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
            <span className="font-semibold text-white text-xs">MSDS Verified & Approved</span>
            <button
              type="button"
              disabled={isReadOnly}
              onClick={() => setFormData(prev => ({ ...prev, isoMsdsVerified: !prev.isoMsdsVerified }))}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-all ${
                formData.isoMsdsVerified 
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              {formData.isoMsdsVerified ? '✓ MSDS Verified' : 'Verify MSDS'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // BREAKBULK / CHARTERING SUB-CATEGORY: Replaces Container with Manifest Parcel Details & Tonnage
  if (isBreakbulk) {
    return (
      <div className="p-4 rounded-2xl bg-orange-500/5 border border-orange-500/25 space-y-4 animate-fade-in">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <Anchor size={16} className="text-orange-400" />
            <span className="font-bold text-white text-xs uppercase tracking-wider">
              Breakbulk & Project Cargo Parcel Tracking
            </span>
          </div>
          <span className="text-[10px] bg-orange-500/20 text-orange-300 border border-orange-500/30 px-2.5 py-0.5 rounded-full font-semibold">
            Sub-Category: Breakbulk / Chartering
          </span>
        </div>

        {/* Parcel Details & Metric Tonnage */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-orange-300 font-semibold text-xs block mb-1">
              Bill of Lading / Manifest Parcel Details *
            </label>
            <input 
              type="text"
              disabled={isReadOnly}
              value={formData.breakbulkTrailerPasses || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, breakbulkTrailerPasses: e.target.value }))}
              placeholder="e.g. Parcel #04 - Turbine Rotor & Heavy Gearbox"
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-orange-400 outline-none"
            />
          </div>
          <div>
            <label className="text-orange-300 font-semibold text-xs block mb-1">
              Metric Tonnage / Piece Count *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input 
                type="number"
                disabled={isReadOnly}
                value={formData.tallyMetricTonnage || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, tallyMetricTonnage: Number(e.target.value) }))}
                placeholder="Tonnage (MT)"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs"
              />
              <input 
                type="number"
                disabled={isReadOnly}
                value={formData.tallyPieceCount || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, tallyPieceCount: Number(e.target.value) }))}
                placeholder="Pieces (Pkgs)"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs"
              />
            </div>
          </div>
        </div>

        {/* Marine Surveyor Inspection Report */}
        <WorkflowMultiUploader
          label="Marine Surveyor Loading / Unloading Inspection Report *"
          sublabel="Official survey report documenting heavy lift rigging, sling angles, and hatch survey"
          urlField="marineSurveyReportUrl"
          nameField="marineSurveyReportName"
          formData={formData}
          setFormData={setFormData}
          onPreview={setActivePdfPreview}
          isReadOnly={isReadOnly}
        />

        {/* Stevedoring Tally Sheet */}
        <WorkflowMultiUploader
          label="Stevedoring Tally Sheet *"
          sublabel="Wharf tally sheet confirming piece-by-piece crane discharge and dock supervisor sign-off"
          urlField="tallySheetDocUrl"
          nameField="tallySheetDocName"
          formData={formData}
          setFormData={setFormData}
          onPreview={setActivePdfPreview}
          isReadOnly={isReadOnly}
        />
      </div>
    );
  }

  // LINER & NVOCC SUB-CATEGORY: Replaces standard Container fields with MBL & HBL Dual Entry
  if (isLinerNvocc) {
    const freeDays = formData.linerFreeDaysAllowed || 14;
    const incurredDays = formData.linerDemurrageDaysIncurred || 0;
    const dailyRate = formData.linerDailyDemurrageRatePkr || 4500;
    const calculatedDemurrage = Math.max(0, incurredDays - freeDays) * dailyRate;

    return (
      <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/25 space-y-4 animate-fade-in">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-indigo-400" />
            <span className="font-bold text-white text-xs uppercase tracking-wider">
              Liner & NVOCC Master & House BL Operations
            </span>
          </div>
          <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full font-semibold">
            Sub-Category: Liner & NVOCC Services
          </span>
        </div>

        {/* Master BL & House BL Dual Entry */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-indigo-300 font-semibold text-xs block mb-1">
              Master Bill of Lading (MBL) *
            </label>
            <input 
              type="text"
              disabled={isReadOnly}
              value={formData.linerMblNumber || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, linerMblNumber: e.target.value }))}
              placeholder="e.g. MAEU-992144810"
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-indigo-400 outline-none"
            />
          </div>
          <div>
            <label className="text-indigo-300 font-semibold text-xs block mb-1">
              House Bill of Lading (HBL) *
            </label>
            <input 
              type="text"
              disabled={isReadOnly}
              value={formData.linerHblNumber || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, linerHblNumber: e.target.value }))}
              placeholder="e.g. HBL-DPL-2026-009"
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-indigo-400 outline-none"
            />
          </div>
        </div>

        {/* Vessel IGM / EGM Index Tracking */}
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
          <span className="font-semibold text-white text-xs block">Vessel IGM / EGM Customs Index Tracking</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-[11px] block mb-1">IGM / EGM Number</label>
              <input 
                type="text"
                disabled={isReadOnly}
                value={formData.linerIgmEgmNumber || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, linerIgmEgmNumber: e.target.value }))}
                placeholder="e.g. IGM-KHI-2026-104"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs"
              />
            </div>
            <div>
              <label className="text-gray-400 text-[11px] block mb-1">Index Number</label>
              <input 
                type="text"
                disabled={isReadOnly}
                value={formData.linerIgmEgmIndexNo || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, linerIgmEgmIndexNo: e.target.value }))}
                placeholder="e.g. Index # 412"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs"
              />
            </div>
          </div>
        </div>

        {/* Demurrage Free-Days Counter Logic */}
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white text-xs">Demurrage Free-Days Counter</span>
            <span className="text-[11px] font-mono text-indigo-300">
              Calculated Demurrage: PKR {calculatedDemurrage.toLocaleString()}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-gray-400 text-[10px] block mb-1">Free Days</label>
              <input 
                type="number"
                disabled={isReadOnly}
                value={formData.linerFreeDaysAllowed || 14}
                onChange={(e) => setFormData(prev => ({ ...prev, linerFreeDaysAllowed: Number(e.target.value) }))}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-2.5 py-1.5 text-white font-mono text-xs"
              />
            </div>
            <div>
              <label className="text-gray-400 text-[10px] block mb-1">Days Incurred</label>
              <input 
                type="number"
                disabled={isReadOnly}
                value={formData.linerDemurrageDaysIncurred || 0}
                onChange={(e) => setFormData(prev => {
                  const days = Number(e.target.value);
                  const fd = prev.linerFreeDaysAllowed || 14;
                  const rate = prev.linerDailyDemurrageRatePkr || 4500;
                  const total = Math.max(0, days - fd) * rate;
                  return {
                    ...prev,
                    linerDemurrageDaysIncurred: days,
                    linerTotalDemurrageAmount: total
                  };
                })}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-2.5 py-1.5 text-white font-mono text-xs"
              />
            </div>
            <div>
              <label className="text-gray-400 text-[10px] block mb-1">Daily Rate (PKR)</label>
              <input 
                type="number"
                disabled={isReadOnly}
                value={formData.linerDailyDemurrageRatePkr || 4500}
                onChange={(e) => setFormData(prev => ({ ...prev, linerDailyDemurrageRatePkr: Number(e.target.value) }))}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-2.5 py-1.5 text-white font-mono text-xs"
              />
            </div>
          </div>
        </div>

        {/* Empty Container Return NOC Verification */}
        <WorkflowMultiUploader
          label="Empty Depot Return Receipt & Line NOC *"
          sublabel="Upload verified Equipment Interchange Receipt (EIR) from empty depot confirming damage-free return"
          urlField="linerEmptyDepotReceiptUrl"
          nameField="linerEmptyDepotReceiptName"
          formData={formData}
          setFormData={setFormData}
          onPreview={setActivePdfPreview}
          isReadOnly={isReadOnly}
        />

        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
          <div>
            <span className="font-semibold text-white text-xs block">Empty Container Return NOC Verification</span>
            <span className="text-gray-400 text-[11px]">Shipping line equipment deposit clearance signed</span>
          </div>
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => setFormData(prev => ({ ...prev, linerEquipmentDischargeConfirmed: !prev.linerEquipmentDischargeConfirmed }))}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-all ${
              formData.linerEquipmentDischargeConfirmed 
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
            }`}
          >
            {formData.linerEquipmentDischargeConfirmed ? '✓ NOC Verified' : 'Verify Line NOC'}
          </button>
        </div>
      </div>
    );
  }

  return null;
};
