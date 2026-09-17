import React from 'react';
import { 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Warehouse, 
  ShieldCheck, 
  FileCheck,
  Building2,
  Barcode
} from 'lucide-react';
import { CategoryStepRendererProps } from './CommonStepProps';
import { WorkflowMultiUploader } from '../WorkflowMultiUploader';

export const WarehousingSteps: React.FC<CategoryStepRendererProps> = ({
  stepIndex,
  formData,
  setFormData,
  targetCase,
  setActivePdfPreview,
  isReadOnly = false
}) => {
  return (
    <div className="space-y-5">
      {/* STEP 1: INBOUND CARGO RECEIPT */}
      {stepIndex === 0 && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-white text-sm block">Goods Receipt Note (GRN)</span>
                <span className="text-gray-400 text-[11px]">Official entry receipt into bonded or general storage facility</span>
              </div>
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => setFormData(prev => ({ 
                  ...prev, 
                  warehouseGrnGenerated: true,
                  warehouseGrnNumber: prev.warehouseGrnNumber || `GRN-${Date.now().toString().slice(-6)}` 
                }))}
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md"
              >
                {formData.warehouseGrnGenerated ? '✓ GRN Generated' : 'Generate Digital GRN'}
              </button>
            </div>

            <div>
              <label className="text-gray-400 block mb-1">GRN Serial Number *</label>
              <input 
                type="text"
                disabled={isReadOnly}
                value={formData.warehouseGrnNumber || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  warehouseGrnNumber: e.target.value,
                  referenceNo: e.target.value 
                }))}
                placeholder="e.g. GRN-DPL-88912"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
            <div>
              <span className="font-bold text-white text-sm block">Inbound Quality & Physical Damage Inspection</span>
              <span className="text-gray-400 text-[11px]">Inspect carton/pallet integrity before staging into warehouse</span>
            </div>
            <button
              type="button"
              disabled={isReadOnly}
              onClick={() => setFormData(prev => ({ ...prev, warehouseInspectionCompleted: !prev.warehouseInspectionCompleted }))}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-all ${
                formData.warehouseInspectionCompleted
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-white/5 border-white/10 text-gray-400'
              }`}
            >
              {formData.warehouseInspectionCompleted ? '✓ Inspected Clean' : 'Complete Inspection'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: RACK & LOCATION ALLOCATION */}
      {stepIndex === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-gray-300 block mb-1.5">Warehouse Bay / Rack Barcode *</label>
              <input 
                type="text"
                disabled={isReadOnly}
                value={formData.warehouseBayRackBarcode || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, warehouseBayRackBarcode: e.target.value }))}
                placeholder="e.g. ZONE-B / RACK-04 / LEVEL-2"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
            <div className="flex flex-col justify-end">
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => setFormData(prev => ({ ...prev, warehouseInventorySynced: !prev.warehouseInventorySynced }))}
                className={`py-2.5 px-4 rounded-xl font-bold text-xs border transition-all flex items-center justify-center gap-2 ${
                  formData.warehouseInventorySynced
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-md'
                    : 'bg-slate-800 border-white/10 text-gray-400'
                }`}
              >
                <Barcode size={16} />
                <span>{formData.warehouseInventorySynced ? '✓ Synced with WMS Inventory' : 'Sync with WMS Inventory'}</span>
              </button>
            </div>
          </div>

          {/* Warehousing Charges Invoicing */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-bold text-white text-sm block">Warehouse Storage & Handling Charges</span>
                <span className="text-gray-400 text-[11px]">Storage rent, forklift pallet handling, and staging fees</span>
              </div>
              <div className="flex rounded-xl bg-slate-800 p-1 border border-white/10 shrink-0">
                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => setFormData(prev => ({ ...prev, warehouseChargesArrangedBy: 'Client' }))}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    formData.warehouseChargesArrangedBy === 'Client' ? 'bg-brand-600 text-white' : 'text-gray-400'
                  }`}
                >
                  Arranged by Client
                </button>
                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => setFormData(prev => ({ ...prev, warehouseChargesArrangedBy: 'DPL' }))}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    formData.warehouseChargesArrangedBy === 'DPL' ? 'bg-emerald-600 text-white' : 'text-gray-400'
                  }`}
                >
                  Arranged by DPL
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-gray-400 block mb-1">Storage & Handling Fee (PKR)</label>
                <input 
                  type="number"
                  disabled={isReadOnly}
                  value={formData.warehouseChargesAmount || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, warehouseChargesAmount: Number(e.target.value) }))}
                  placeholder="e.g. 75000"
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
              {formData.warehouseChargesArrangedBy === 'DPL' && (
                <div className="animate-fade-in">
                  <label className="text-gray-400 block mb-1">DPL Handling Commission (PKR)</label>
                  <input 
                    type="number"
                    disabled={isReadOnly}
                    value={formData.warehouseChargesCommission || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, warehouseChargesCommission: Number(e.target.value) }))}
                    placeholder="e.g. 5000"
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              )}
            </div>
            {formData.warehouseChargesArrangedBy === 'DPL' && (
              <p className="text-[11px] text-emerald-400 mt-1">
                ✓ Warehousing and handling charges will be appended to the client invoice.
              </p>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: STOCK MANAGEMENT & PICKING */}
      {stepIndex === 2 && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-white text-sm block">Digital Outbound Pick List</span>
                <span className="text-gray-400 text-[11px]">Generate picking document for warehouse logistics staff</span>
              </div>
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => setFormData(prev => ({ 
                  ...prev, 
                  warehousePickListGenerated: true,
                  warehousePickListNumber: prev.warehousePickListNumber || `PICK-${Date.now().toString().slice(-6)}` 
                }))}
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md"
              >
                {formData.warehousePickListGenerated ? '✓ Pick List Generated' : 'Generate Pick List'}
              </button>
            </div>

            <div>
              <label className="text-gray-400 block mb-1">Pick List Serial Reference</label>
              <input 
                type="text"
                disabled={isReadOnly}
                value={formData.warehousePickListNumber || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, warehousePickListNumber: e.target.value }))}
                placeholder="e.g. PICK-DPL-4412"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: DISPATCH & GATE PASS */}
      {stepIndex === 3 && (
        <div className="space-y-4">
          <WorkflowMultiUploader
            label="Outbound Commercial Packing List"
            sublabel="Upload verified packing list for goods leaving storage"
            urlField="warehousePackingListUrl"
            nameField="warehousePackingListName"
            formData={formData}
            setFormData={setFormData}
            onPreview={setActivePdfPreview}
            isReadOnly={isReadOnly}
          />

          <WorkflowMultiUploader
            label="Final Warehouse Delivery Note & Gate Out Pass"
            sublabel="Official signed warehouse release note and outbound security gate pass"
            urlField="warehouseDeliveryNoteUrl"
            nameField="warehouseDeliveryNoteName"
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
