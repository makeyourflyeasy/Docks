import React, { useState } from 'react';
import { 
  X, Ship, Camera, ShieldCheck, CheckCircle2, 
  Truck, User, Phone, MapPin, Receipt, FileCheck, Download, AlertCircle, Save 
} from 'lucide-react';
import { Case, Container, CaseStatus } from '../types';
import { saveCaseToFirestore } from '../services/dbService';
import { compressAndPrepareFile, convertImageToPdf } from '../services/fileUtils';
import { downloadCustomsDeliveryOrderPdf } from '../services/pdfExportService';
import { PortMakeBillModal } from './PortMakeBillModal';
import { useBranding } from '../services/brandingService';

interface PortWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetCase: Case;
  staffUserId: string;
  staffName: string;
  isDestinationStaff?: boolean;
  onSuccess?: (msg: string) => void;
}

export const PortWorkflowModal: React.FC<PortWorkflowModalProps> = ({
  isOpen,
  onClose,
  targetCase,
  staffUserId,
  staffName,
  isDestinationStaff = false,
  onSuccess
}) => {
  const { customLogo, companyName } = useBranding();
  if (!isOpen) return null;

  const container: Container | undefined = targetCase.containers?.[0];
  const wfDetails: Record<string, any> = targetCase.workflowDetails || {};
  const loadingStep: any = wfDetails[CaseStatus.LOADING_PORT_PROCESSING] || {};
  const destStep: any = wfDetails[CaseStatus.DESTINATION_PORT_ARRIVAL] || {};

  // Operational states
  const [sealNo, setSealNo] = useState(container?.sealNo || loadingStep.sealNo || '');
  const [sealPhoto, setSealPhoto] = useState(container?.sealPhoto || loadingStep.sealPhoto || '');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  
  const [portTerminal, setPortTerminal] = useState(
    loadingStep.portTerminal || targetCase.pol || 'KICT Port Terminal'
  );
  const [remarks, setRemarks] = useState(
    loadingStep.remarks || `Cargo inspected and loading verified by ${staffName} (${staffUserId})`
  );

  // Destination Specific States
  const [containerUnloaded, setContainerUnloaded] = useState(
    destStep.unloaded === true || targetCase.status === CaseStatus.DESTINATION_PORT_ARRIVAL || targetCase.status === CaseStatus.COMPLETED
  );
  const [vehicleGatedOut, setVehicleGatedOut] = useState(
    destStep.gateOutVehicle === true || targetCase.status === CaseStatus.COMPLETED
  );

  // Bill creation modal trigger
  const [showBillModal, setShowBillModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Photo / Camera Upload
  const handleSealPhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (!isPdf) {
        const converted = await convertImageToPdf(file, `Seal_Verification_${targetCase.caseNo}`, true);
        setSealPhoto(converted.pdfDataUrl);
      } else {
        const processed = await compressAndPrepareFile(file);
        setSealPhoto(processed.dataUrl || (processed.base64 ? `data:application/pdf;base64,${processed.base64}` : ''));
      }
    } catch (err) {
      console.warn('Seal capture warning:', err);
      alert('Failed to process image capture.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Generate Delivery Order (DO) for Destination Staff
  const handleGenerateDO = async () => {
    try {
      const doResult = await downloadCustomsDeliveryOrderPdf({
        targetCase,
        officerName: staffName,
        branding: { companyName, customLogo }
      });

      // Permanently append Delivery Order PDF to Case Documents so Case Manager, Finance Manager, and Admin have permanent access
      const existingDocs = targetCase.documents || [];
      const doDocName = `Customs_Delivery_Order_${targetCase.caseNo}.pdf`;
      const alreadyHasDO = existingDocs.some((d: any) => d.name === doDocName);

      if (!alreadyHasDO) {
        const updatedDocs = [
          ...existingDocs,
          {
            id: `doc_do_${Date.now()}`,
            name: doDocName,
            type: 'Delivery Order',
            url: doResult?.dataUrl || doResult?.blobUrl || '',
            uploadedAt: new Date().toISOString(),
            officer: staffName
          }
        ];
        await saveCaseToFirestore({
          ...targetCase,
          documents: updatedDocs
        });
      }

      if (onSuccess) onSuccess('✓ Customs Delivery Order (DO / NOC) downloaded and saved permanently to Case Documents.');
    } catch (err) {
      console.error(err);
      alert('Failed to generate Delivery Order PDF');
    }
  };

  // Complete Workflow Action
  const handleCompleteWorkflow = async () => {
    if (!isDestinationStaff && !sealNo.trim()) {
      alert('Please enter or verify the Customs Bullet Seal number before completing.');
      return;
    }

    setIsSubmitting(true);
    try {
      const nowIso = new Date().toISOString();

      // Update container seal and status
      const updatedContainers = (targetCase.containers || []).map((cntr, idx) => {
        if (idx === 0) {
          return {
            ...cntr,
            sealNo: sealNo.trim() || cntr.sealNo,
            sealPhoto: sealPhoto || cntr.sealPhoto,
            status: isDestinationStaff ? ('Delivered' as const) : ('In Transit' as const)
          };
        }
        return cntr;
      });

      // Prepare updated workflow step
      let nextStatus = CaseStatus.IN_TRANSIT;
      const updatedWf = { ...wfDetails };

      if (!isDestinationStaff) {
        // Loading step completion
        updatedWf[CaseStatus.LOADING_PORT_PROCESSING] = {
          status: 'COMPLETED',
          completed: true,
          date: nowIso,
          officer: staffName,
          staffUserId,
          portTerminal,
          sealNo: sealNo.trim(),
          sealPhoto: sealPhoto || undefined,
          remarks
        };
        nextStatus = CaseStatus.IN_TRANSIT;
      } else {
        // Destination step completion
        updatedWf[CaseStatus.DESTINATION_PORT_ARRIVAL] = {
          status: 'COMPLETED',
          completed: true,
          date: nowIso,
          officer: staffName,
          staffUserId,
          unloaded: containerUnloaded,
          gateOutVehicle: vehicleGatedOut,
          remarks
        };
        nextStatus = CaseStatus.COMPLETED;
      }

      // Add seal photo as an official document if uploaded
      const existingDocs = targetCase.documents || [];
      const newDocs = [...existingDocs];
      if (sealPhoto && !newDocs.some((d: any) => d.name?.includes('Seal_Verification'))) {
        newDocs.push({
          id: `doc_seal_${Date.now()}`,
          name: `Customs_Seal_Verification_${targetCase.caseNo}.pdf`,
          type: 'Port Loading Scan',
          url: sealPhoto,
          uploadedAt: nowIso
        });
      }

      const updatedCase: Case = {
        ...targetCase,
        status: nextStatus,
        containers: updatedContainers,
        workflowDetails: updatedWf,
        documents: newDocs
      };

      await saveCaseToFirestore(updatedCase);

      const successText = isDestinationStaff
        ? `🎉 Case ${targetCase.caseNo} completed! Container unloaded & vehicle gated out.`
        : `🎉 Loading completed for Case ${targetCase.caseNo}! Container dispatched into transit.`;

      if (onSuccess) onSuccess(successText);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to update workflow step.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canShowDO = isDestinationStaff && (containerUnloaded || vehicleGatedOut);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
        <div className="relative w-full max-w-3xl bg-slate-900 border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center font-bold">
                <Ship size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white tracking-wide">
                    {isDestinationStaff ? 'Destination Offloading Workflow' : 'Port Loading Workflow Operations'}
                  </h2>
                  <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                    {targetCase.caseNo}
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  Staff: <span className="text-gray-200 font-semibold">{staffName} ({staffUserId})</span> • Container: <span className="text-white font-mono font-bold">{container?.number || 'TBD'}</span>
                </p>
              </div>
            </div>

            <button 
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white flex items-center justify-center transition"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar text-xs">
            
            {/* Top Action Ribbon for Make Loading Bill */}
            <div className="bg-gradient-to-r from-amber-500/15 via-slate-900 to-brand-500/15 p-4 rounded-2xl border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
              <div>
                <span className="text-xs font-bold text-amber-300 block">Loading Bill & Expense Recording</span>
                <span className="text-[11px] text-gray-300">
                  Record wharfage, port demurrage, tracker, and delivery charges to generate the official bill.
                </span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {canShowDO && (
                  <button
                    type="button"
                    onClick={handleGenerateDO}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition active:scale-95"
                  >
                    <FileCheck size={13} />
                    <span>Generate Delivery Order</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowBillModal(true)}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 transition active:scale-95 w-full sm:w-auto"
                >
                  <Receipt size={14} />
                  <span>Create Loading Bill / Make Bill</span>
                </button>
              </div>
            </div>

            {/* Vehicle & Driver Verification Card */}
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/5 space-y-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Assigned Logistics Driver & Vehicle</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-gray-400 block text-[11px]">Truck / Plate No</span>
                  <span className="text-amber-400 font-mono font-bold">{container?.vehicleNo || loadingStep.assignedVehicleNo || 'TBD'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Driver Name</span>
                  <span className="text-white font-semibold">{container?.driverName || loadingStep.driverName || 'TBD'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Driver Phone</span>
                  <span className="text-brand-400 font-mono">{container?.driverContact || loadingStep.driverContact || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Container Size</span>
                  <span className="text-gray-200">{container?.size || '40ft HC'}</span>
                </div>
              </div>
            </div>

            {/* Workflow Operational Form Fields */}
            <div className="space-y-4">
              
              {/* Port Terminal Selector */}
              <div>
                <label className="text-gray-300 block mb-1 font-medium text-[11px]">Port Terminal Node</label>
                <select
                  value={portTerminal}
                  onChange={e => setPortTerminal(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-brand-500 text-xs"
                >
                  <option value="KICT Port Terminal">KICT Port Terminal (Karachi)</option>
                  <option value="QICT Port Qasim Terminal">Port Qasim (QICT Terminal)</option>
                  <option value="SAPT Port Terminal">SAPT Deep Sea Terminal (Karachi)</option>
                  <option value="KPT Karachi Port">KPT Karachi Port Yard</option>
                  <option value="Lahore Dryport">Lahore Dryport Station</option>
                  <option value="Peshawar Station">Peshawar Terminal Station</option>
                </select>
              </div>

              {/* Customs Bullet Seal & Camera Capture */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-300 block mb-1 font-medium text-[11px]">Customs Bullet Seal Number *</label>
                  <input
                    type="text"
                    placeholder="e.g. SL-984021"
                    value={sealNo}
                    onChange={e => setSealNo(e.target.value)}
                    className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-white font-mono font-bold uppercase tracking-wider text-xs outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="text-gray-300 block mb-1 font-medium text-[11px]">Customs Seal Photo Scan</label>
                  <label className="flex items-center justify-center gap-2 p-2.5 border border-dashed border-white/20 hover:border-brand-500 rounded-xl cursor-pointer bg-black/40 hover:bg-black/60 transition text-center text-xs">
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment"
                      className="hidden" 
                      onChange={handleSealPhotoCapture} 
                    />
                    <Camera size={14} className="text-brand-400" />
                    <span>{sealPhoto ? 'Change Seal Photo' : 'Capture Seal Photo'}</span>
                  </label>
                </div>
              </div>

              {/* Seal photo feedback preview */}
              {sealPhoto && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between text-xs text-emerald-300">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-400" />
                    <span className="font-semibold">Customs Seal Photo Scan Attached ✅</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = sealPhoto;
                      a.download = `Seal_Photo_${targetCase.caseNo}.pdf`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    }}
                    className="text-emerald-400 hover:text-white flex items-center gap-1 font-bold hover:underline"
                  >
                    <Download size={11} /> Download PDF Scan
                  </button>
                </div>
              )}

              {/* Destination Offloading Checkpoints */}
              {isDestinationStaff && (
                <div className="bg-slate-950/80 p-4 rounded-2xl border border-white/10 space-y-3">
                  <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block">
                    Offloading & Gate Out Destination Checkpoints
                  </span>
                  
                  <div className="space-y-2">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={containerUnloaded}
                        onChange={e => setContainerUnloaded(e.target.checked)}
                        className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500 bg-black/50 border-white/20"
                      />
                      <span className="text-gray-200 font-medium">Container safely unloaded at destination yard</span>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={vehicleGatedOut}
                        onChange={e => setVehicleGatedOut(e.target.checked)}
                        className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500 bg-black/50 border-white/20"
                      />
                      <span className="text-gray-200 font-medium">Vehicle successfully gated out from port terminal / station</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Operational Remarks */}
              <div>
                <label className="text-gray-300 block mb-1 font-medium text-[11px]">Workflow Inspection Remarks</label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-brand-500"
                />
              </div>

            </div>

          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-white/10 bg-slate-950/80 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs transition"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleCompleteWorkflow}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-xl shadow-emerald-600/20 transition active:scale-95"
            >
              <CheckCircle2 size={15} />
              <span>{isDestinationStaff ? 'Mark Offloading Complete & Finish' : 'Mark Loading Complete & Sail'}</span>
            </button>
          </div>

        </div>
      </div>

      {/* Embedded Make Loading Bill Modal */}
      {showBillModal && (
        <PortMakeBillModal
          isOpen={showBillModal}
          onClose={() => setShowBillModal(false)}
          targetCase={targetCase}
          staffUserId={staffUserId}
          staffName={staffName}
          onBillGenerated={(bill) => {
            if (onSuccess) {
              onSuccess(`✓ Bill #${bill.billNo} generated and posted to ${targetCase.clientName}'s private ledger.`);
            }
          }}
        />
      )}
    </>
  );
};
