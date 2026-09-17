import React from 'react';
import { 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  DollarSign, 
  Truck, 
  ShieldCheck, 
  FileCheck,
  Building2,
  Calendar,
  Hash,
  Clock
} from 'lucide-react';
import { CategoryStepRendererProps } from './CommonStepProps';
import { WorkflowMultiUploader } from '../WorkflowMultiUploader';

export const CustomsClearanceSteps: React.FC<CategoryStepRendererProps> = ({
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
      {/* STEP 1: DOCUMENT INTAKE & SETUP */}
      {stepIndex === 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <WorkflowMultiUploader
              label="Bill of Lading (BL)"
              sublabel="Master or House BL document"
              urlField="blDocUrl"
              nameField="blDocName"
              formData={formData}
              setFormData={setFormData}
              onPreview={setActivePdfPreview}
              compact={true}
              isReadOnly={isReadOnly}
            />

            <WorkflowMultiUploader
              label="Commercial Invoice"
              sublabel="Certified shipper invoice"
              urlField="commercialInvoiceUrl"
              nameField="commercialInvoiceName"
              formData={formData}
              setFormData={setFormData}
              onPreview={setActivePdfPreview}
              compact={true}
              isReadOnly={isReadOnly}
            />

            <WorkflowMultiUploader
              label="Packing List"
              sublabel="Consignment itemization"
              urlField="packingListUrl"
              nameField="packingListName"
              formData={formData}
              setFormData={setFormData}
              onPreview={setActivePdfPreview}
              compact={true}
              isReadOnly={isReadOnly}
            />
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
            <label className="font-bold text-white text-sm block">WeBOC / PSW Access Status</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['Active', 'Authorized', 'Pending', 'Suspended'] as const).map(status => (
                <button
                  key={status}
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => setFormData(prev => ({ ...prev, webocAccessStatus: status }))}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    formData.webocAccessStatus === status
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-md'
                      : 'bg-slate-800 border-white/10 text-gray-400 hover:bg-slate-700'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-400">
              Verifies Pakistan Single Window (PSW) / WeBOC customs credentials authorization for GD intake.
            </p>
          </div>
        </div>
      )}

      {/* STEP 2: GD FILING & ASSESSMENT */}
      {stepIndex === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-gray-300 block mb-1.5">Goods Declaration (GD) Number *</label>
              <input 
                type="text"
                disabled={isReadOnly}
                value={formData.customsGdNumber || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  customsGdNumber: e.target.value,
                  referenceNo: e.target.value 
                }))}
                placeholder="e.g. KAPE-HC-12345-2026"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-300 block mb-1.5">GD Filing Date</label>
              <input 
                type="date"
                disabled={isReadOnly}
                value={formData.customsGdFilingDate || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, customsGdFilingDate: e.target.value }))}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white"
              />
            </div>
          </div>

          {/* Duty & Taxes Assessment Amount & Payment Entity */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-bold text-white text-sm block">Duty & Taxes Assessment</span>
                <span className="text-gray-400 text-[11px]">Pakistan Customs assessed statutory duties, sales tax, and regulatory duty</span>
              </div>
              <div className="flex rounded-xl bg-slate-800 p-1 border border-white/10 shrink-0">
                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => setFormData(prev => ({ ...prev, dutyTaxesPaymentStatus: 'Paid by Client' }))}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    formData.dutyTaxesPaymentStatus === 'Paid by Client' ? 'bg-brand-600 text-white' : 'text-gray-400'
                  }`}
                >
                  Paid by Client
                </button>
                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => setFormData(prev => ({ ...prev, dutyTaxesPaymentStatus: 'Paid by DPL' }))}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    formData.dutyTaxesPaymentStatus === 'Paid by DPL' ? 'bg-emerald-600 text-white' : 'text-gray-400'
                  }`}
                >
                  Paid by DPL
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-gray-400 block mb-1">Assessment Amount (PKR)</label>
                <input 
                  type="number"
                  disabled={isReadOnly}
                  value={formData.dutyTaxesAssessmentAmount || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, dutyTaxesAssessmentAmount: Number(e.target.value) }))}
                  placeholder="e.g. 450000"
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
              {formData.dutyTaxesPaymentStatus === 'Paid by DPL' && (
                <div className="animate-fade-in">
                  <label className="text-gray-400 block mb-1">DPL Customs Clearance Fee / Commission (PKR)</label>
                  <input 
                    type="number"
                    disabled={isReadOnly}
                    value={formData.dutyTaxesCommission || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, dutyTaxesCommission: Number(e.target.value) }))}
                    placeholder="e.g. 15000"
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              )}
            </div>
            {formData.dutyTaxesPaymentStatus === 'Paid by DPL' && (
              <p className="text-[11px] text-emerald-400 mt-1">
                ✓ Assessed customs duty will be automatically appended to the client's final invoice.
              </p>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: PHYSICAL EXAMINATION & LAB TESTING */}
      {stepIndex === 2 && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
            <label className="font-bold text-white text-sm block">Customs Physical Examination Status</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => setFormData(prev => ({ ...prev, examinationStatus: 'Satisfactory' }))}
                className={`py-3 px-4 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                  formData.examinationStatus === 'Satisfactory'
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-md'
                    : 'bg-slate-800 border-white/10 text-gray-400'
                }`}
              >
                <CheckCircle2 size={16} />
                <span>Satisfactory Clearance</span>
              </button>

              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => setFormData(prev => ({ ...prev, examinationStatus: 'Detained' }))}
                className={`py-3 px-4 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                  formData.examinationStatus === 'Detained'
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 shadow-md'
                    : 'bg-slate-800 border-white/10 text-gray-400'
                }`}
              >
                <AlertTriangle size={16} />
                <span>Detained / Further Inquiry</span>
              </button>
            </div>
          </div>

          <WorkflowMultiUploader
            label="Customs Lab Test Report / Examination Order"
            sublabel="Upload chemical or physical lab test certificate (if mandatory for tariff heading)"
            urlField="labTestReportUrl"
            nameField="labTestReportName"
            formData={formData}
            setFormData={setFormData}
            onPreview={setActivePdfPreview}
            isReadOnly={isReadOnly}
          />

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
            <div>
              <span className="font-bold text-white text-sm block">Customs Inspector Endorsement</span>
              <span className="text-gray-400 text-[11px]">Principal Appraiser (PA) or Examining Officer (EO) approval verified</span>
            </div>
            <button
              type="button"
              disabled={isReadOnly}
              onClick={() => setFormData(prev => ({ ...prev, inspectorEndorsementVerified: !prev.inspectorEndorsementVerified }))}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-all ${
                formData.inspectorEndorsementVerified
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-white/5 border-white/10 text-gray-400'
              }`}
            >
              {formData.inspectorEndorsementVerified ? '✓ Verified & Signed' : 'Click to Verify'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: OUT OF CHARGE (OOC) CLEARANCE */}
      {stepIndex === 3 && (
        <div className="space-y-4">
          <WorkflowMultiUploader
            label="Out of Charge (OOC) Document & Stamp"
            sublabel="Upload official customs Out of Charge release copy"
            urlField="oocDocUrl"
            nameField="oocDocName"
            formData={formData}
            setFormData={setFormData}
            onPreview={setActivePdfPreview}
            isReadOnly={isReadOnly}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-gray-300 block mb-1.5">OOC Release Order Number</label>
              <input 
                type="text"
                disabled={isReadOnly}
                value={formData.oocNumber || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, oocNumber: e.target.value }))}
                placeholder="e.g. OOC-PSW-99812"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-300 block mb-1.5">OOC Release Date</label>
              <input 
                type="date"
                disabled={isReadOnly}
                value={formData.oocDate || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, oocDate: e.target.value }))}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white"
              />
            </div>
          </div>

          <WorkflowMultiUploader
            label="Shipping Line Delivery Order (DO) Issuance"
            sublabel="Upload finalized DO issued by shipping line after customs clearance"
            urlField="customsDoIssuanceUrl"
            nameField="customsDoIssuanceName"
            formData={formData}
            setFormData={setFormData}
            onPreview={setActivePdfPreview}
            isReadOnly={isReadOnly}
          />
        </div>
      )}

      {/* STEP 5: TERMINAL GATE OUT & DELIVERY */}
      {stepIndex === 4 && (
        <div className="space-y-4">
          <WorkflowMultiUploader
            label="Terminal Gate Out Pass"
            sublabel="Port / QICT / KICT / SAPT Gate Out document"
            urlField="terminalGatePassUrl"
            nameField="terminalGatePassName"
            formData={formData}
            setFormData={setFormData}
            onPreview={setActivePdfPreview}
            isReadOnly={isReadOnly}
          />

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
            <span className="font-bold text-white text-sm block">Assigned Transport Truck & Driver</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-gray-400 block mb-1">Vehicle Registration No.</label>
                <input 
                  type="text"
                  disabled={isReadOnly}
                  value={formData.assignedTruckNo || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, assignedTruckNo: e.target.value }))}
                  placeholder="e.g. TLX-982"
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-gray-400 block mb-1">Driver Name</label>
                <input 
                  type="text"
                  disabled={isReadOnly}
                  value={formData.assignedDriverName || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, assignedDriverName: e.target.value }))}
                  placeholder="e.g. Muhammad Iqbal"
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="text-gray-400 block mb-1">Driver CNIC</label>
                <input 
                  type="text"
                  disabled={isReadOnly}
                  value={formData.assignedDriverCnic || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, assignedDriverCnic: e.target.value }))}
                  placeholder="e.g. 42101-1234567-1"
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
            <div>
              <span className="font-bold text-white text-sm block">Final Cargo Dispatch Confirmation</span>
              <span className="text-gray-400 text-[11px]">Confirm cargo has left terminal gate and is dispatched to client warehouse</span>
            </div>
            <button
              type="button"
              disabled={isReadOnly}
              onClick={() => setFormData(prev => ({ ...prev, cargoDispatchConfirmed: !prev.cargoDispatchConfirmed }))}
              className={`px-4 py-2 rounded-xl font-bold text-xs border transition-all ${
                formData.cargoDispatchConfirmed
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-white/5 border-white/10 text-gray-400'
              }`}
            >
              {formData.cargoDispatchConfirmed ? '✓ Dispatched to Client' : 'Confirm Dispatch'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
