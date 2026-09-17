import React from 'react';
import { 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Truck, 
  MapPin, 
  Phone, 
  ShieldCheck, 
  FileCheck,
  DollarSign
} from 'lucide-react';
import { CategoryStepRendererProps } from './CommonStepProps';
import { WorkflowMultiUploader } from '../WorkflowMultiUploader';

export const PrivateCargoSteps: React.FC<CategoryStepRendererProps> = ({
  stepIndex,
  formData,
  setFormData,
  targetCase,
  setActivePdfPreview,
  isReadOnly = false
}) => {
  return (
    <div className="space-y-5">
      {/* STEP 1: BOOKING & PICKUP REQUEST */}
      {stepIndex === 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-gray-300 block mb-1.5">Shipper / Consignor Name *</label>
              <input 
                type="text"
                disabled={isReadOnly}
                value={formData.cargoShipperName || targetCase.clientName || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, cargoShipperName: e.target.value }))}
                placeholder="e.g. Fauji Fertilizer Co."
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-300 block mb-1.5">Shipper Contact Phone</label>
              <input 
                type="text"
                disabled={isReadOnly}
                value={formData.cargoShipperContact || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, cargoShipperContact: e.target.value }))}
                placeholder="e.g. 0300-9876543"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-300 block mb-1.5">Total Cargo Weight (KG)</label>
              <input 
                type="number"
                disabled={isReadOnly}
                value={formData.cargoWeightKg || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, cargoWeightKg: Number(e.target.value) }))}
                placeholder="e.g. 24000"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-gray-300 block mb-1.5">Cargo Description & Packaging</label>
            <input 
              type="text"
              disabled={isReadOnly}
              value={formData.cargoDescription || targetCase.extractedData?.itemDescription || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, cargoDescription: e.target.value }))}
              placeholder="e.g. 400 Bags Industrial Raw Plastic Granules on Wooden Pallets"
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-gray-300 block mb-1.5">Pickup Origin Location</label>
              <input 
                type="text"
                disabled={isReadOnly}
                value={formData.cargoOriginAddress || targetCase.pol || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, cargoOriginAddress: e.target.value }))}
                placeholder="e.g. S.I.T.E Area, Karachi"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-300 block mb-1.5">Delivery Destination Location</label>
              <input 
                type="text"
                disabled={isReadOnly}
                value={formData.cargoDestinationAddress || targetCase.pod || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, cargoDestinationAddress: e.target.value }))}
                placeholder="e.g. Sundar Industrial Estate, Lahore"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: VEHICLE & DRIVER ASSIGNMENT */}
      {stepIndex === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-gray-300 block mb-1.5">Assigned Truck No. *</label>
              <input 
                type="text"
                disabled={isReadOnly}
                value={formData.cargoTruckNo || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  cargoTruckNo: e.target.value,
                  assignedVehicleNo: e.target.value 
                }))}
                placeholder="e.g. TKD-552"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-300 block mb-1.5">Driver Name *</label>
              <input 
                type="text"
                disabled={isReadOnly}
                value={formData.cargoDriverName || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  cargoDriverName: e.target.value,
                  driverName: e.target.value 
                }))}
                placeholder="e.g. Ghulam Nabi"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-300 block mb-1.5">Driver CNIC *</label>
              <input 
                type="text"
                disabled={isReadOnly}
                value={formData.cargoDriverCnic || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  cargoDriverCnic: e.target.value,
                  driverCnic: e.target.value 
                }))}
                placeholder="e.g. 42301-7654321-7"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
          </div>

          <WorkflowMultiUploader
            label="Driver CNIC & Commercial License Document"
            sublabel="Front and back scans of driver identity documents"
            urlField="cargoDriverCnicDocUrl"
            nameField="cargoDriverCnicDocName"
            formData={formData}
            setFormData={setFormData}
            onPreview={setActivePdfPreview}
            isReadOnly={isReadOnly}
          />

          {/* Vehicle Freight / Invoicing Logic */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-bold text-white text-sm block">Vehicle Freight Charges</span>
                <span className="text-gray-400 text-[11px]">Primary highway freight for commercial transport</span>
              </div>
              <div className="flex rounded-xl bg-slate-800 p-1 border border-white/10 shrink-0">
                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => setFormData(prev => ({ ...prev, cargoFreightArrangedBy: 'Client' }))}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    formData.cargoFreightArrangedBy === 'Client' ? 'bg-brand-600 text-white' : 'text-gray-400'
                  }`}
                >
                  Arranged by Client
                </button>
                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => setFormData(prev => ({ ...prev, cargoFreightArrangedBy: 'DPL' }))}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    formData.cargoFreightArrangedBy === 'DPL' ? 'bg-emerald-600 text-white' : 'text-gray-400'
                  }`}
                >
                  Arranged by DPL
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-gray-400 block mb-1">Freight Rent Amount (PKR)</label>
                <input 
                  type="number"
                  disabled={isReadOnly}
                  value={formData.cargoFreightAmount || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, cargoFreightAmount: Number(e.target.value) }))}
                  placeholder="e.g. 180000"
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
              {formData.cargoFreightArrangedBy === 'DPL' && (
                <div className="animate-fade-in">
                  <label className="text-gray-400 block mb-1">DPL Freight Commission (PKR)</label>
                  <input 
                    type="number"
                    disabled={isReadOnly}
                    value={formData.cargoFreightCommission || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, cargoFreightCommission: Number(e.target.value) }))}
                    placeholder="e.g. 10000"
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              )}
            </div>
            {formData.cargoFreightArrangedBy === 'DPL' && (
              <p className="text-[11px] text-emerald-400 mt-1">
                ✓ Freight amount and commission will be appended to the client's final invoice.
              </p>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: LOADING & BILTY GENERATION */}
      {stepIndex === 2 && (
        <div className="space-y-4">
          <WorkflowMultiUploader
            label="Cargo Loading Photos"
            sublabel="Pre-transit pictures of cargo loaded and secured on vehicle bed (camera / multi-photo supported)"
            urlField="cargoLoadingPhotoUrl"
            nameField="cargoLoadingPhotoName"
            allowCamera={true}
            formData={formData}
            setFormData={setFormData}
            onPreview={setActivePdfPreview}
            isReadOnly={isReadOnly}
          />

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-white text-sm block">Commercial Bilty / Consignment Note</span>
                <span className="text-gray-400 text-[11px]">Official transport receipt for commercial cargo transit</span>
              </div>
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => setFormData(prev => ({ 
                  ...prev, 
                  cargoBiltyGenerated: true,
                  cargoBiltyNumber: prev.cargoBiltyNumber || `BLT-${Date.now().toString().slice(-6)}`
                }))}
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md"
              >
                {formData.cargoBiltyGenerated ? '✓ Bilty Generated' : 'Generate Digital Bilty'}
              </button>
            </div>

            <div>
              <label className="text-gray-400 block mb-1">Bilty / Waybill Serial Number</label>
              <input 
                type="text"
                disabled={isReadOnly}
                value={formData.cargoBiltyNumber || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  cargoBiltyNumber: e.target.value,
                  referenceNo: e.target.value 
                }))}
                placeholder="e.g. BLT-DPL-99212"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: IN TRANSIT MONITORING */}
      {stepIndex === 3 && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
            <label className="font-bold text-white text-sm block">Transit Highway Status</label>
            <div className="grid grid-cols-3 gap-2">
              {(['Departed Origin', 'On Route', 'Near Destination'] as const).map(status => (
                <button
                  key={status}
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => setFormData(prev => ({ ...prev, cargoTransitStatus: status }))}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    formData.cargoTransitStatus === status
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-md'
                      : 'bg-slate-800 border-white/10 text-gray-400'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-semibold text-gray-300 block mb-1.5">Driver Contact Phone</label>
            <input 
              type="text"
              disabled={isReadOnly}
              value={formData.cargoDriverPhone || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, cargoDriverPhone: e.target.value }))}
              placeholder="e.g. 0345-1234567"
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
            />
          </div>
        </div>
      )}

      {/* STEP 5: DESTINATION OFFLOADING & POD */}
      {stepIndex === 4 && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
            <div>
              <span className="font-bold text-white text-sm block">Cargo Offloading Verification</span>
              <span className="text-gray-400 text-[11px]">Consignment safely offloaded and inspected at receiver facility</span>
            </div>
            <button
              type="button"
              disabled={isReadOnly}
              onClick={() => setFormData(prev => ({ ...prev, cargoOffloadingVerified: !prev.cargoOffloadingVerified }))}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-all ${
                formData.cargoOffloadingVerified
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-white/5 border-white/10 text-gray-400'
              }`}
            >
              {formData.cargoOffloadingVerified ? '✓ Offloaded & Checked' : 'Confirm Offloading'}
            </button>
          </div>

          <WorkflowMultiUploader
            label="Signed Proof of Delivery (POD) Receipt"
            sublabel="Upload recipient signed, stamped Bilty / delivery receipt confirming cargo receipt in good order"
            urlField="cargoPodUrl"
            nameField="cargoPodName"
            allowCamera={true}
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
