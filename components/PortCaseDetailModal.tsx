import React from 'react';
import { 
  X, Ship, FileText, Download, ShieldCheck, Truck, User, 
  Phone, CreditCard, Lock, Calendar, MapPin, CheckCircle2, AlertCircle, FileCheck
} from 'lucide-react';
import { Case, Container, CaseStatus } from '../types';
import { downloadCustomsDeliveryOrderPdf } from '../services/pdfExportService';
import { saveCaseToFirestore } from '../services/dbService';
import { useBranding } from '../services/brandingService';

interface PortCaseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetCase: Case;
  isDestinationStaff?: boolean;
  staffName?: string;
}

export const PortCaseDetailModal: React.FC<PortCaseDetailModalProps> = ({
  isOpen,
  onClose,
  targetCase,
  isDestinationStaff = false,
  staffName = 'Port Staff'
}) => {
  const { customLogo, companyName } = useBranding();
  if (!isOpen) return null;

  const container: Container | undefined = targetCase.containers?.[0];
  const wfDetails: Record<string, any> = targetCase.workflowDetails || {};
  const loadingStep: any = wfDetails[CaseStatus.LOADING_PORT_PROCESSING] || {};
  const destinationStep: any = wfDetails[CaseStatus.DESTINATION_PORT_ARRIVAL] || {};

  // Check if destination staff can generate delivery order
  // When container is unloaded at port/destination and vehicle has gated out
  const isUnloaded = destinationStep.unloaded === true || 
    destinationStep.status === 'COMPLETED' || 
    targetCase.status === CaseStatus.DESTINATION_PORT_ARRIVAL ||
    targetCase.status === CaseStatus.COMPLETED ||
    container?.status === 'Delivered';
  
  const isVehicleGatedOut = destinationStep.gateOutVehicle === true || 
    destinationStep.vehicleGatedOut === true || 
    targetCase.status === CaseStatus.COMPLETED ||
    destinationStep.status === 'COMPLETED';

  const canGenerateDO = isDestinationStaff && (isUnloaded || isVehicleGatedOut);

  // Filter documents to show ONLY loading/port operational workflow uploads
  // Strictly hide company invoices, commercial sales invoices, and customer pricing documents
  const allDocs = targetCase.documents || [];
  const portWorkflowDocs = allDocs.filter((doc: any) => {
    const docName = (doc.name || '').toLowerCase();
    const docType = (doc.type || '').toLowerCase();
    const isPortRelated = 
      docName.includes('seal') || 
      docName.includes('loading') || 
      docName.includes('wharfage') || 
      docName.includes('demurrage') || 
      docName.includes('tracker') || 
      docName.includes('delivery') || 
      docName.includes('gate') || 
      docName.includes('receipt') || 
      docName.includes('slip') || 
      docName.includes('port') ||
      docName.includes('weight') ||
      docType.includes('loading') ||
      docType.includes('port') ||
      docType.includes('receipt');

    // Explicitly exclude company finance/invoice documents
    const isCompanyFinance = 
      docName.includes('commercial invoice') || 
      docName.includes('sales invoice') || 
      docName.includes('customer bill') || 
      docName.includes('pricing') ||
      docName.includes('dpl official invoice');

    return isPortRelated && !isCompanyFinance;
  });

  // Also include seal photo from container if available and not in docs
  const hasSealPhoto = !!(container?.sealPhoto || loadingStep.sealPhoto);
  const sealPhotoUrl = container?.sealPhoto || loadingStep.sealPhoto;

  const handleDownloadDoc = (url: string, name: string) => {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = name || 'Port_Document.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleGenerateDO = async () => {
    try {
      const doResult = await downloadCustomsDeliveryOrderPdf({
        targetCase,
        officerName: staffName,
        branding: { companyName, customLogo }
      });

      // Permanently append Delivery Order PDF to Case Documents so Case Manager, Finance Manager, and Admin can access it forever
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
    } catch (err) {
      console.error('Failed to generate Delivery Order PDF', err);
      alert('Error generating Delivery Order PDF');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Ship size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-bold text-white tracking-wide">Case Particulars & Container Detail</h2>
                <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                  {targetCase.caseNo}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Client: <span className="text-gray-200 font-semibold">{targetCase.clientName}</span> • Route: {targetCase.pol} → {targetCase.pod}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canGenerateDO && (
              <button
                type="button"
                onClick={handleGenerateDO}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition active:scale-95"
              >
                <FileCheck size={14} />
                <span>Generate Delivery Order (DO)</span>
              </button>
            )}
            <button 
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white flex items-center justify-center transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar text-xs">
          
          {/* Section 1: Container & Operational Specifics */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Truck size={14} />
                Section 1: Container & Dispatch Particulars
              </h3>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-brand-500/10 text-brand-300 border border-brand-500/20">
                Status: {targetCase.status}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Container Details */}
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/5 space-y-2.5">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Container Specification</span>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Container No:</span>
                    <span className="text-white font-mono font-bold">{container?.number || 'TBD'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Size / Type:</span>
                    <span className="text-gray-200">{container?.size || '40ft HC'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Gross Weight:</span>
                    <span className="text-gray-200">{container?.weight ? `${container.weight.toLocaleString()} kg` : 'Standard Weight'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Carrier / Line:</span>
                    <span className="text-gray-200">{targetCase.extractedData?.shippingLine || 'Standard Carrier'}</span>
                  </div>
                </div>
              </div>

              {/* Vehicle & Driver Details */}
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/5 space-y-2.5">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Assigned Transport & Driver</span>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Truck / Plate No:</span>
                    <span className="text-amber-400 font-mono font-bold">{container?.vehicleNo || loadingStep.assignedVehicleNo || 'TBD'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Driver Name:</span>
                    <span className="text-white font-semibold">{container?.driverName || loadingStep.driverName || 'TBD'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Driver Contact:</span>
                    <span className="text-brand-400 font-mono flex items-center gap-1">
                      <Phone size={11} /> {container?.driverContact || loadingStep.driverContact || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Driver CNIC:</span>
                    <span className="text-gray-300 font-mono">{container?.driverCnic || loadingStep.driverCnic || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Customs Seal & Route Details */}
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/5 space-y-2.5">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Customs Seal & Route</span>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Customs Bullet Seal:</span>
                    <span className="text-emerald-400 font-mono font-bold">{container?.sealNo || loadingStep.sealNo || 'Pending Verification'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Port of Loading:</span>
                    <span className="text-gray-200">{targetCase.pol || 'Karachi Port'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Port of Unloading:</span>
                    <span className="text-gray-200">{targetCase.pod || 'Destination Port'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Registration Date:</span>
                    <span className="text-gray-300">{targetCase.createdAt ? new Date(targetCase.createdAt).toLocaleDateString() : 'Active'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Seal Photo preview if uploaded */}
            {hasSealPhoto && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck size={18} className="text-emerald-400" />
                  <div>
                    <span className="text-emerald-300 font-bold block">Customs Bullet Seal Verification Photo Attached</span>
                    <span className="text-[11px] text-gray-400 font-mono">Seal No: {container?.sealNo || loadingStep.sealNo || 'Verified'}</span>
                  </div>
                </div>
                {sealPhotoUrl && (
                  <button
                    type="button"
                    onClick={() => handleDownloadDoc(sealPhotoUrl, `Seal_Verification_${targetCase.caseNo}.pdf`)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition"
                  >
                    <Download size={12} />
                    <span>Download Seal Scan</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Port & Loading Workflow Documents */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={14} />
                Section 2: Port & Loading Workflow Documents ({portWorkflowDocs.length + (hasSealPhoto ? 1 : 0)})
              </h3>
              <span className="text-[11px] text-gray-400">
                Staff Read-Only View (Download Only)
              </span>
            </div>

            <p className="text-[11px] text-gray-400 leading-relaxed">
              In accordance with operational security protocol, only documents submitted during port loading and cargo handling are accessible below. You may download documents for terminal inspection. Modifications and deletions are restricted.
            </p>

            {portWorkflowDocs.length === 0 && !hasSealPhoto ? (
              <div className="bg-black/30 border border-dashed border-white/10 rounded-2xl p-6 text-center text-gray-500">
                <FileText size={28} className="mx-auto mb-2 opacity-40 text-gray-400" />
                <p className="text-xs font-medium">No loading workflow documents uploaded yet for this shipment.</p>
                <p className="text-[10px] text-gray-500 mt-0.5">Documents will appear here once the loading workflow step or loading bill is completed.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Bullet Seal Doc Item */}
                {hasSealPhoto && sealPhotoUrl && (
                  <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-3 flex items-center justify-between hover:border-white/20 transition">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                        <ShieldCheck size={15} />
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-white block truncate text-xs">Customs Bullet Seal Photo Scan</span>
                        <span className="text-[10px] text-gray-400 block font-mono">Verified Container Seal</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDownloadDoc(sealPhotoUrl, `Seal_Photo_Scan_${targetCase.caseNo}.pdf`)}
                      className="bg-white/5 hover:bg-white/10 border border-white/10 text-brand-300 hover:text-white px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1 text-[11px] transition shrink-0 ml-2"
                    >
                      <Download size={11} /> Download
                    </button>
                  </div>
                )}

                {/* Workflow uploaded docs */}
                {portWorkflowDocs.map((doc: any, index: number) => (
                  <div key={doc.id || index} className="bg-slate-950/80 border border-white/10 rounded-2xl p-3 flex items-center justify-between hover:border-white/20 transition">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center shrink-0 border border-brand-500/20">
                        <FileText size={15} />
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-white block truncate text-xs">{doc.name || 'Port Operational Document'}</span>
                        <span className="text-[10px] text-gray-400 block font-mono">{doc.type || 'Workflow Upload'}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDownloadDoc(doc.url, doc.name || `Port_Doc_${index}.pdf`)}
                      className="bg-white/5 hover:bg-white/10 border border-white/10 text-brand-300 hover:text-white px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1 text-[11px] transition shrink-0 ml-2"
                    >
                      <Download size={11} /> Download
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-white/10 bg-slate-950/80 flex items-center justify-between">
          <span className="text-[11px] text-gray-400">
            DPL Port Operations Desk • Confidential Container Record
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition"
          >
            Close Particulars
          </button>
        </div>

      </div>
    </div>
  );
};
