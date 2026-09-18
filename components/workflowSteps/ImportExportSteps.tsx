import React from 'react';
import { 
  FileText, 
  CheckCircle2, 
  Ship, 
  Clock, 
  Building2, 
  Calendar, 
  Truck, 
  Anchor, 
  Layers, 
  ShieldCheck, 
  Box, 
  DollarSign, 
  CheckSquare, 
  Upload, 
  FileCheck,
  Scale,
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  Navigation
} from 'lucide-react';
import { CategoryStepRendererProps } from './CommonStepProps';
import { WorkflowMultiUploader } from '../WorkflowMultiUploader';

export const ImportExportSteps: React.FC<CategoryStepRendererProps> = ({
  stepIndex,
  formData,
  setFormData,
  targetCase,
  setActivePdfPreview,
  isReadOnly = false,
  availableVehicles = []
}) => {
  const isExport = (formData.tradeDirection || 'Export') === 'Export';

  return (
    <div className="space-y-5">
      {/* Direction Switcher Header: Export vs Import */}
      <div className="p-3 bg-slate-800/80 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center font-bold">
            {isExport ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
          </div>
          <div>
            <span className="text-xs text-gray-400 font-medium block">Trade Stream</span>
            <span className="text-sm font-bold text-white">
              {isExport ? 'Export Shipment (Outgoing)' : 'Import Shipment (Incoming)'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10">
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => setFormData(prev => ({ ...prev, tradeDirection: 'Export' }))}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              isExport 
                ? 'bg-brand-600 text-white shadow-md' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <ArrowUpRight size={13} />
            <span>Export Flow</span>
          </button>
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => setFormData(prev => ({ ...prev, tradeDirection: 'Import' }))}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              !isExport 
                ? 'bg-emerald-600 text-white shadow-md' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <ArrowDownLeft size={13} />
            <span>Import Flow</span>
          </button>
        </div>
      </div>

      {/* STEP 1: CONTAINER BOX BOOKING (CRO) */}
      {stepIndex === 0 && (
        <div className="space-y-4">
          <div className="bg-brand-500/10 border border-brand-500/20 p-3.5 rounded-xl text-xs text-brand-200">
            <p className="font-semibold mb-1 flex items-center gap-1.5">
              <Box size={14} className="text-brand-400" />
              {isExport ? 'Export Container Booking & Box Allocation' : 'Import Inward Container Booking & Release'}
            </p>
            <p className="text-gray-300 text-[11px] leading-relaxed">
              Book container boxes from the ocean shipping line or container depot. Record the Container Release Order (CRO) number, empty pickup yard, and assigned container and seal IDs.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-gray-300 block mb-1 text-xs">CRO / Booking Reference No. *</label>
              <input 
                type="text"
                disabled={isReadOnly}
                value={formData.croBookingNumber || targetCase.blNumber || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  croBookingNumber: e.target.value,
                  referenceNo: e.target.value 
                }))}
                placeholder="e.g. CRO-MSK-2026-8891"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-mono focus:border-brand-500 outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-300 block mb-1 text-xs">Container Release Date</label>
              <input 
                type="date"
                disabled={isReadOnly}
                value={formData.croReleaseDate || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, croReleaseDate: e.target.value }))}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-brand-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-gray-300 block mb-1 text-xs">Empty Depot / Yard Name</label>
              <input 
                type="text"
                disabled={isReadOnly}
                value={formData.emptyDepotName || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, emptyDepotName: e.target.value }))}
                placeholder="e.g. Premier Mercantile Yard / KPT"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-brand-500 outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-300 block mb-1 text-xs">Allocated Container No(s)</label>
              <input 
                type="text"
                disabled={isReadOnly}
                value={formData.emptyContainerAllocated || targetCase.containers?.map(c => c.number).join(', ') || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, emptyContainerAllocated: e.target.value }))}
                placeholder="e.g. MSKU9182734 (40HC)"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-mono focus:border-brand-500 outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-300 block mb-1 text-xs">Bullet Seal No.</label>
              <input 
                type="text"
                disabled={isReadOnly}
                value={formData.emptySealNumber || targetCase.containers?.[0]?.sealNo || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, emptySealNumber: e.target.value }))}
                placeholder="e.g. MSK-SL-99410"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-mono focus:border-brand-500 outline-none"
              />
            </div>
          </div>

          <WorkflowMultiUploader
            label="Container Release Order (CRO) / Allocation Memo"
            sublabel="Upload stamped CRO slip from shipping line, empty yard gate pass, or equipment allocation sheet"
            urlField="croDocumentUrl"
            nameField="croDocumentName"
            formData={formData}
            setFormData={setFormData}
            onPreview={setActivePdfPreview}
            isReadOnly={isReadOnly}
          />
        </div>
      )}

      {/* STEP 2: VESSEL & OCEAN FREIGHT BOOKING */}
      {stepIndex === 1 && (
        <div className="space-y-4">
          <div className="bg-sky-500/10 border border-sky-500/20 p-3.5 rounded-xl text-xs text-sky-200">
            <p className="font-semibold mb-1 flex items-center gap-1.5">
              <Ship size={14} className="text-sky-400" />
              Ocean Carrier & Vessel Sailing Details
            </p>
            <p className="text-gray-300 text-[11px] leading-relaxed">
              Confirm shipping line slot booking, vessel name, voyage number, Port of Loading (POL), Port of Discharge (POD), and vessel sailing cutoff deadlines.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-gray-300 block mb-1 text-xs">Shipping Line *</label>
              <select
                disabled={isReadOnly}
                value={formData.shippingLineName || targetCase.extractedData?.shippingLine || 'Maersk Line'}
                onChange={(e) => setFormData(prev => ({ ...prev, shippingLineName: e.target.value }))}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-brand-500 outline-none"
              >
                <option value="Maersk Line">Maersk Line</option>
                <option value="Mediterranean Shipping Co (MSC)">MSC</option>
                <option value="CMA CGM Group">CMA CGM</option>
                <option value="Hapag-Lloyd">Hapag-Lloyd</option>
                <option value="COSCO Shipping Lines">COSCO Shipping</option>
                <option value="Ocean Network Express (ONE)">Ocean Network Express (ONE)</option>
                <option value="Evergreen Marine">Evergreen Marine</option>
                <option value="Yang Ming Marine">Yang Ming</option>
                <option value="HMM Co Ltd">HMM</option>
                <option value="Other Carrier">Other Ocean Carrier</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-gray-300 block mb-1 text-xs">Vessel Name *</label>
              <input 
                type="text"
                disabled={isReadOnly}
                value={formData.vesselName || targetCase.extractedData?.vesselName || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, vesselName: e.target.value }))}
                placeholder="e.g. MV MAERSK MC-KINNEY"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-semibold focus:border-brand-500 outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-300 block mb-1 text-xs">Voyage Number *</label>
              <input 
                type="text"
                disabled={isReadOnly}
                value={formData.voyageNumber || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, voyageNumber: e.target.value }))}
                placeholder="e.g. 2604E / 112W"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-mono focus:border-brand-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-gray-300 block mb-1 text-xs">Port of Loading (POL)</label>
              <input 
                type="text"
                disabled={isReadOnly}
                value={formData.vesselPol || targetCase.pol || 'Karachi Port Trust (KPT)'}
                onChange={(e) => setFormData(prev => ({ ...prev, vesselPol: e.target.value }))}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-brand-500 outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-300 block mb-1 text-xs">Port of Discharge (POD)</label>
              <input 
                type="text"
                disabled={isReadOnly}
                value={formData.vesselPod || targetCase.pod || 'Jebel Ali Port (DXB)'}
                onChange={(e) => setFormData(prev => ({ ...prev, vesselPod: e.target.value }))}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-brand-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-gray-300 block mb-1 text-xs">Vessel Cut-off Date</label>
              <input 
                type="date"
                disabled={isReadOnly}
                value={formData.vesselCutOffDate || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, vesselCutOffDate: e.target.value }))}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-brand-500 outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-300 block mb-1 text-xs">Estimated Departure (ETD)</label>
              <input 
                type="date"
                disabled={isReadOnly}
                value={formData.vesselEtd || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, vesselEtd: e.target.value }))}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-brand-500 outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-300 block mb-1 text-xs">Estimated Arrival (ETA)</label>
              <input 
                type="date"
                disabled={isReadOnly}
                value={formData.vesselEta || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, vesselEta: e.target.value }))}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-brand-500 outline-none"
              />
            </div>
          </div>

          <WorkflowMultiUploader
            label="Shipping Line Booking Confirmation Document"
            sublabel="Upload ocean booking confirmation, SOB receipt, or freight contract memo"
            urlField="vesselBookingConfirmUrl"
            nameField="vesselBookingConfirmName"
            formData={formData}
            setFormData={setFormData}
            onPreview={setActivePdfPreview}
            isReadOnly={isReadOnly}
          />
        </div>
      )}

      {/* STEP 3: INLAND TRANSPORTATION ARRANGEMENT */}
      {stepIndex === 2 && (
        <div className="space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl text-xs text-amber-200">
            <p className="font-semibold mb-1 flex items-center gap-1.5">
              <Truck size={14} className="text-amber-400" />
              Inland Trailer & Driver Drayage Arrangement
            </p>
            <p className="text-gray-300 text-[11px] leading-relaxed">
              Assign trailer/prime mover for drayage between empty yard, warehouse/factory stuffing location, and port container terminal.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-gray-300 block mb-1 text-xs">Select Fleet Vehicle / Trailer</label>
              <select
                disabled={isReadOnly}
                value={formData.assignedTrailerNo || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  const found = availableVehicles.find(v => v.registrationNumber === val);
                  setFormData(prev => ({
                    ...prev,
                    assignedTrailerNo: val,
                    assignedTrailerDriver: found ? found.driverName : prev.assignedTrailerDriver,
                    assignedDriverPhone: found ? found.driverContact : prev.assignedDriverPhone,
                    assignedDriverCnic: found ? found.driverCnic : prev.assignedDriverCnic
                  }));
                }}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-brand-500 outline-none"
              >
                <option value="">-- Choose Trailer from Fleet (or enter below) --</option>
                {availableVehicles.map(v => (
                  <option key={v.id} value={v.registrationNumber}>
                    {v.registrationNumber} ({v.type} - Driver: {v.driverName})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-semibold text-gray-300 block mb-1 text-xs">Trailer Registration No. *</label>
              <input 
                type="text"
                disabled={isReadOnly}
                value={formData.assignedTrailerNo || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, assignedTrailerNo: e.target.value }))}
                placeholder="e.g. TL-8821 / KHI-9012"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-mono focus:border-brand-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-gray-300 block mb-1 text-xs">Driver Full Name</label>
              <input 
                type="text"
                disabled={isReadOnly}
                value={formData.assignedTrailerDriver || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, assignedTrailerDriver: e.target.value }))}
                placeholder="Driver Name"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-brand-500 outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-300 block mb-1 text-xs">Driver Mobile No.</label>
              <input 
                type="text"
                disabled={isReadOnly}
                value={formData.assignedDriverPhone || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, assignedDriverPhone: e.target.value }))}
                placeholder="0300-XXXXXXX"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-mono focus:border-brand-500 outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-300 block mb-1 text-xs">Driver CNIC No.</label>
              <input 
                type="text"
                disabled={isReadOnly}
                value={formData.assignedDriverCnic || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, assignedDriverCnic: e.target.value }))}
                placeholder="42101-XXXXXXX-X"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-mono focus:border-brand-500 outline-none"
              />
            </div>
          </div>

          <div className="p-3.5 bg-slate-800/80 rounded-xl border border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            <div>
              <label className="font-semibold text-gray-300 block mb-1 text-xs">Inland Haulage Freight (PKR)</label>
              <input 
                type="number"
                disabled={isReadOnly}
                value={formData.truckingChargesAmount || 65000}
                onChange={(e) => setFormData(prev => ({ ...prev, truckingChargesAmount: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-mono focus:border-brand-500 outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-300 block mb-1 text-xs">Arranged & Paid By</label>
              <div className="flex gap-2">
                {(['DPL', 'Client'] as const).map(party => (
                  <button
                    key={party}
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => setFormData(prev => ({ ...prev, truckingArrangedBy: party }))}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition-all ${
                      (formData.truckingArrangedBy || 'DPL') === party
                        ? 'bg-brand-600 border-brand-500 text-white'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    {party === 'DPL' ? 'DPL Logistics' : 'Paid by Client'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <WorkflowMultiUploader
            label="Inland Trucking Bilty / Consignment Waybill"
            sublabel="Upload signed driver transport agreement, bilty slip, or trailer dispatch gate pass"
            urlField="truckingWaybillUrl"
            nameField="truckingWaybillName"
            formData={formData}
            setFormData={setFormData}
            onPreview={setActivePdfPreview}
            isReadOnly={isReadOnly}
          />
        </div>
      )}

      {/* STEP 4: WAREHOUSE / FACTORY CARGO STUFFING & LOADING */}
      {stepIndex === 3 && (
        <div className="space-y-4">
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-xl text-xs text-emerald-200">
            <p className="font-semibold mb-1 flex items-center gap-1.5">
              <Layers size={14} className="text-emerald-400" />
              Warehouse Cargo Stuffing, Packaging & VGM Weighbridge
            </p>
            <p className="text-gray-300 text-[11px] leading-relaxed">
              Record cargo stuffing into the container at shipper factory/warehouse. Enter package counts, gross weights, SOLAS Verified Gross Mass (VGM), and high-security seal verification.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-gray-300 block mb-1 text-xs">Stuffing Location / Warehouse</label>
              <input 
                type="text"
                disabled={isReadOnly}
                value={formData.stuffingLocationWarehouse || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, stuffingLocationWarehouse: e.target.value }))}
                placeholder="e.g. S.I.T.E. Industrial Area Factory"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-brand-500 outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-300 block mb-1 text-xs">Packages / Cartons Count</label>
              <input 
                type="number"
                disabled={isReadOnly}
                value={formData.stuffingPackagesCount || targetCase.extractedData?.packageCount || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, stuffingPackagesCount: parseInt(e.target.value) || 0 }))}
                placeholder="Total Packages"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-mono focus:border-brand-500 outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-300 block mb-1 text-xs">Gross Cargo Weight (Kg)</label>
              <input 
                type="number"
                disabled={isReadOnly}
                value={formData.stuffingGrossWeight || targetCase.extractedData?.totalWeight || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, stuffingGrossWeight: parseFloat(e.target.value) || 0 }))}
                placeholder="Gross Weight (Kg)"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-mono focus:border-brand-500 outline-none"
              />
            </div>
          </div>

          <div className="p-3.5 bg-slate-800/80 rounded-xl border border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            <div>
              <label className="font-semibold text-gray-300 block mb-1 text-xs flex items-center gap-1.5">
                <Scale size={13} className="text-brand-400" />
                Verified Gross Mass (VGM Weight in Kg) *
              </label>
              <input 
                type="number"
                disabled={isReadOnly}
                value={formData.vgmWeightKg || formData.stuffingGrossWeight || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, vgmWeightKg: parseFloat(e.target.value) || 0 }))}
                placeholder="Certified VGM (Tare + Cargo)"
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-mono focus:border-brand-500 outline-none"
              />
            </div>
            <div className="flex items-center gap-3 pt-4 sm:pt-0">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox"
                  disabled={isReadOnly}
                  checked={formData.containerSealedVerified || false}
                  onChange={(e) => setFormData(prev => ({ ...prev, containerSealedVerified: e.target.checked }))}
                  className="w-4 h-4 rounded border-white/20 bg-slate-900 text-brand-600 focus:ring-0 cursor-pointer"
                />
                <span className="text-xs text-gray-200 font-semibold">
                  Container Sealed & Bullet Lock Verified
                </span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <WorkflowMultiUploader
              label="SOLAS VGM Certificate"
              sublabel="Certified weighbridge slip"
              urlField="vgmCertificateUrl"
              nameField="vgmCertificateName"
              formData={formData}
              setFormData={setFormData}
              onPreview={setActivePdfPreview}
              compact={true}
              isReadOnly={isReadOnly}
            />

            <WorkflowMultiUploader
              label="Stuffing Inspection Photos"
              sublabel="Cargo loading & seal photo"
              urlField="stuffingPhotosUrl"
              nameField="stuffingPhotosName"
              formData={formData}
              setFormData={setFormData}
              onPreview={setActivePdfPreview}
              compact={true}
              isReadOnly={isReadOnly}
            />

            <WorkflowMultiUploader
              label="Warehouse Gate-Out Slip"
              sublabel="Factory exit dispatch challan"
              urlField="warehouseGateOutSlipUrl"
              nameField="warehouseGateOutSlipName"
              formData={formData}
              setFormData={setFormData}
              onPreview={setActivePdfPreview}
              compact={true}
              isReadOnly={isReadOnly}
            />
          </div>
        </div>
      )}

      {/* STEP 5: PORT ARRIVAL & CUSTOMS CLEARANCE */}
      {stepIndex === 4 && (
        <div className="space-y-4">
          <div className="bg-indigo-500/10 border border-indigo-500/20 p-3.5 rounded-xl text-xs text-indigo-200">
            <p className="font-semibold mb-1 flex items-center gap-1.5">
              <Anchor size={14} className="text-indigo-400" />
              Port Drayage & Customs Clearance (WebOC / PSW)
            </p>
            <p className="text-gray-300 text-[11px] leading-relaxed">
              Deliver loaded container to port container terminal (SAPT, KICT, PICT, QICT). File Goods Declaration (GD), complete assessment, physical/scanner examination, and obtain Customs Out of Charge (OOC) / Export NOC.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-gray-300 block mb-1 text-xs">Port Container Terminal *</label>
              <select
                disabled={isReadOnly}
                value={formData.portTerminalName || 'SAPT - South Asia Pakistan Terminals'}
                onChange={(e) => setFormData(prev => ({ ...prev, portTerminalName: e.target.value }))}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-brand-500 outline-none"
              >
                <option value="SAPT - South Asia Pakistan Terminals">SAPT - South Asia Terminals</option>
                <option value="KICT - Karachi International Container Terminal">KICT - Karachi Int'l Terminal</option>
                <option value="PICT - Pakistan International Container Terminal">PICT - Pakistan Int'l Terminal</option>
                <option value="QICT - Qasim International Container Terminal">QICT - Qasim Int'l Terminal</option>
                <option value="KPT West Wharf Container Terminal">KPT West Wharf</option>
                <option value="Gwadar Port Free Zone Terminal">Gwadar Port Terminal</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-gray-300 block mb-1 text-xs">WebOC / PSW GD Number *</label>
              <input 
                type="text"
                disabled={isReadOnly}
                value={formData.exportCustomsGdNo || targetCase.extractedData?.gdNo || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, exportCustomsGdNo: e.target.value }))}
                placeholder="e.g. KAPE-HC-109283-2026"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-mono focus:border-brand-500 outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-300 block mb-1 text-xs">GD Filing Date</label>
              <input 
                type="date"
                disabled={isReadOnly}
                value={formData.exportCustomsGdDate || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, exportCustomsGdDate: e.target.value }))}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-brand-500 outline-none"
              />
            </div>
          </div>

          <div className="p-3.5 bg-slate-800/80 rounded-xl border border-white/10 space-y-2">
            <label className="font-semibold text-gray-300 block text-xs">Customs Clearance & Examination Status</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['Examined', 'Assessed', 'Out of Charge (OOC)', 'Export NOC Issued'] as const).map(st => (
                <button
                  key={st}
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => setFormData(prev => ({ ...prev, exportCustomsStatus: st }))}
                  className={`py-1.5 px-2.5 rounded-lg text-xs font-bold border transition-all truncate ${
                    (formData.exportCustomsStatus || 'Export NOC Issued') === st
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <WorkflowMultiUploader
              label="Port Terminal Gate-In Pass"
              sublabel="Container entry gate pass slip"
              urlField="portTerminalGateInUrl"
              nameField="portTerminalGateInName"
              formData={formData}
              setFormData={setFormData}
              onPreview={setActivePdfPreview}
              isReadOnly={isReadOnly}
            />

            <WorkflowMultiUploader
              label="Customs Out of Charge (OOC) / Export NOC"
              sublabel="WebOC cleared GD & customs seal release"
              urlField="exportCustomsNocUrl"
              nameField="exportCustomsNocName"
              formData={formData}
              setFormData={setFormData}
              onPreview={setActivePdfPreview}
              isReadOnly={isReadOnly}
            />
          </div>
        </div>
      )}

      {/* STEP 6: VESSEL LOADING & BILL OF LADING (B/L) */}
      {stepIndex === 5 && (
        <div className="space-y-4">
          <div className="bg-cyan-500/10 border border-cyan-500/20 p-3.5 rounded-xl text-xs text-cyan-200">
            <p className="font-semibold mb-1 flex items-center gap-1.5">
              <Ship size={14} className="text-cyan-400" />
              Vessel Loading, Mate's Receipt & Bill of Lading Issuance
            </p>
            <p className="text-gray-300 text-[11px] leading-relaxed">
              Confirm container loaded onto vessel bay. Obtain Mate's Receipt (MR) from ship's officer and release Master/House Bill of Lading (B/L) for international transit.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-gray-300 block mb-1 text-xs">Vessel Loading Bay / Cell No.</label>
              <input 
                type="text"
                disabled={isReadOnly}
                value={formData.vesselLoadingBayNo || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, vesselLoadingBayNo: e.target.value }))}
                placeholder="e.g. Bay 14-02-86"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-mono focus:border-brand-500 outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-300 block mb-1 text-xs">Mate's Receipt (MR) No.</label>
              <input 
                type="text"
                disabled={isReadOnly}
                value={formData.matesReceiptNo || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, matesReceiptNo: e.target.value }))}
                placeholder="e.g. MR-2026-991"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-mono focus:border-brand-500 outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-300 block mb-1 text-xs">Bill of Lading (B/L) No. *</label>
              <input 
                type="text"
                disabled={isReadOnly}
                value={formData.billOfLadingNo || targetCase.blNumber || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, billOfLadingNo: e.target.value }))}
                placeholder="e.g. MSKU-9081726"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-mono font-semibold focus:border-brand-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-gray-300 block mb-1 text-xs">B/L Release Format</label>
              <select
                disabled={isReadOnly}
                value={formData.billOfLadingType || 'Original'}
                onChange={(e) => setFormData(prev => ({ ...prev, billOfLadingType: e.target.value as any }))}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-brand-500 outline-none"
              >
                <option value="Original">Original B/L (3/3 Set)</option>
                <option value="Seaway Bill">Express Seaway Bill</option>
                <option value="Telex Release">Telex Release / Electronic Release</option>
              </select>
            </div>
            <div className="flex items-center gap-3 pt-3 sm:pt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox"
                  disabled={isReadOnly}
                  checked={formData.vesselSailedConfirmed || false}
                  onChange={(e) => setFormData(prev => ({ ...prev, vesselSailedConfirmed: e.target.checked }))}
                  className="w-4 h-4 rounded border-white/20 bg-slate-900 text-brand-600 focus:ring-0 cursor-pointer"
                />
                <span className="text-xs text-gray-200 font-semibold">
                  Vessel Sailed & En Route Departure Confirmed
                </span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <WorkflowMultiUploader
              label="Mate's Receipt (MR) Document"
              sublabel="Signed chief officer receipt"
              urlField="matesReceiptUrl"
              nameField="matesReceiptName"
              formData={formData}
              setFormData={setFormData}
              onPreview={setActivePdfPreview}
              isReadOnly={isReadOnly}
            />

            <WorkflowMultiUploader
              label="Final Ocean Bill of Lading (B/L)"
              sublabel="Master or House B/L document"
              urlField="billOfLadingUrl"
              nameField="billOfLadingName"
              formData={formData}
              setFormData={setFormData}
              onPreview={setActivePdfPreview}
              isReadOnly={isReadOnly}
            />
          </div>
        </div>
      )}

      {/* STEP 7: DESTINATION CLEARANCE & DELIVERY ORDER (DO) */}
      {stepIndex === 6 && (
        <div className="space-y-4">
          <div className="bg-purple-500/10 border border-purple-500/20 p-3.5 rounded-xl text-xs text-purple-200">
            <p className="font-semibold mb-1 flex items-center gap-1.5">
              <Building2 size={14} className="text-purple-400" />
              Destination Port Arrival, Import Customs & Delivery Order (DO)
            </p>
            <p className="text-gray-300 text-[11px] leading-relaxed">
              Upon vessel arrival at destination country, clear import customs, settle shipping line destination ocean charges, and obtain the Shipping Line Delivery Order (DO).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-gray-300 block mb-1 text-xs">Destination Port & Terminal</label>
              <input 
                type="text"
                disabled={isReadOnly}
                value={formData.destinationPortName || targetCase.pod || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, destinationPortName: e.target.value }))}
                placeholder="e.g. Jebel Ali Port, UAE"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-brand-500 outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-300 block mb-1 text-xs">Destination IGM / Manifest No.</label>
              <input 
                type="text"
                disabled={isReadOnly}
                value={formData.destinationIgmNo || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, destinationIgmNo: e.target.value }))}
                placeholder="e.g. IGM-DXB-4412"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-mono focus:border-brand-500 outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-300 block mb-1 text-xs">Delivery Order (DO) Number *</label>
              <input 
                type="text"
                disabled={isReadOnly}
                value={formData.destinationDoNumber || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, destinationDoNumber: e.target.value }))}
                placeholder="e.g. DO-MSK-2026-091"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-mono font-semibold focus:border-brand-500 outline-none"
              />
            </div>
          </div>

          <div className="p-3.5 bg-slate-800/80 rounded-xl border border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            <div>
              <label className="font-semibold text-gray-300 block mb-1 text-xs">Destination Clearance Status</label>
              <div className="flex gap-2">
                {(['In Progress', 'Cleared', 'DO Issued'] as const).map(st => (
                  <button
                    key={st}
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => setFormData(prev => ({ ...prev, destinationCustomsClearanceStatus: st }))}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition-all ${
                      (formData.destinationCustomsClearanceStatus || 'DO Issued') === st
                        ? 'bg-purple-600 border-purple-500 text-white'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="font-semibold text-gray-300 block mb-1 text-xs">Destination Port Charges (PKR / USD Equiv.)</label>
              <input 
                type="number"
                disabled={isReadOnly}
                value={formData.destinationChargesAmount || 45000}
                onChange={(e) => setFormData(prev => ({ ...prev, destinationChargesAmount: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-mono focus:border-brand-500 outline-none"
              />
            </div>
          </div>

          <WorkflowMultiUploader
            label="Shipping Line Delivery Order (DO) Document"
            sublabel="Upload stamped delivery order, ocean manifest discharge memo, or release voucher"
            urlField="destinationDoDocUrl"
            nameField="destinationDoDocName"
            formData={formData}
            setFormData={setFormData}
            onPreview={setActivePdfPreview}
            isReadOnly={isReadOnly}
          />
        </div>
      )}

      {/* STEP 8: DE-STUFFING, EMPTY CONTAINER RETURN & SETTLEMENT */}
      {stepIndex === 7 && (
        <div className="space-y-4">
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-xl text-xs text-emerald-200">
            <p className="font-semibold mb-1 flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-400" />
              Consignee Cargo De-stuffing, Empty Return & All Charges Clear
            </p>
            <p className="text-gray-300 text-[11px] leading-relaxed">
              Complete cargo de-stuffing at consignee warehouse. Return empty container box to shipping line nominated depot with stamped Equipment Interchange Receipt (EIR) and settle all financial charges.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-gray-300 block mb-1 text-xs">Empty Return Nominated Depot *</label>
              <input 
                type="text"
                disabled={isReadOnly}
                value={formData.emptyContainerReturnDepot || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, emptyContainerReturnDepot: e.target.value }))}
                placeholder="e.g. Shipping Line Yard / Port Container Depot"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-brand-500 outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-300 block mb-1 text-xs">Empty Container Return Date</label>
              <input 
                type="date"
                disabled={isReadOnly}
                value={formData.emptyContainerReturnDate || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, emptyContainerReturnDate: e.target.value }))}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-brand-500 outline-none"
              />
            </div>
          </div>

          <div className="p-3.5 bg-slate-800/80 rounded-xl border border-white/10 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox"
                  disabled={isReadOnly}
                  checked={formData.destuffingComplete || false}
                  onChange={(e) => setFormData(prev => ({ ...prev, destuffingComplete: e.target.checked }))}
                  className="w-4 h-4 rounded border-white/20 bg-slate-900 text-emerald-500 focus:ring-0 cursor-pointer"
                />
                <span className="text-xs text-gray-200 font-semibold">
                  Consignee Cargo De-stuffing & Inspection Completed
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox"
                  disabled={isReadOnly}
                  checked={formData.containerSecurityRefunded || false}
                  onChange={(e) => setFormData(prev => ({ ...prev, containerSecurityRefunded: e.target.checked }))}
                  className="w-4 h-4 rounded border-white/20 bg-slate-900 text-emerald-500 focus:ring-0 cursor-pointer"
                />
                <span className="text-xs text-gray-200 font-semibold">
                  Line Container Security Deposit Refunded
                </span>
              </label>
            </div>

            <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox"
                  disabled={isReadOnly}
                  checked={formData.allChargesSettledVerified || false}
                  onChange={(e) => setFormData(prev => ({ ...prev, allChargesSettledVerified: e.target.checked }))}
                  className="w-4 h-4 rounded border-white/20 bg-slate-900 text-brand-500 focus:ring-0 cursor-pointer"
                />
                <span className="text-xs text-white font-bold">
                  All Port, Ocean Freight, Haulage & Demurrage Charges Settled (Clear)
                </span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <WorkflowMultiUploader
              label="Empty Container Return Receipt (EIR Slip)"
              sublabel="Stamped equipment interchange receipt from line depot"
              urlField="emptyContainerEirDocUrl"
              nameField="emptyContainerEirDocName"
              formData={formData}
              setFormData={setFormData}
              onPreview={setActivePdfPreview}
              isReadOnly={isReadOnly}
            />

            <WorkflowMultiUploader
              label="Cargo De-stuffing & Delivery Proof (POD)"
              sublabel="Consignee signed delivery receiving or offloading photos"
              urlField="destuffingPhotosUrl"
              nameField="destuffingPhotosName"
              formData={formData}
              setFormData={setFormData}
              onPreview={setActivePdfPreview}
              isReadOnly={isReadOnly}
            />
          </div>
        </div>
      )}
    </div>
  );
};
