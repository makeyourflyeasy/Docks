import React, { useState } from 'react';
import { 
  CheckCircle2, 
  FileText, 
  Download, 
  ShieldCheck, 
  AlertTriangle, 
  Eye, 
  Building2, 
  Truck, 
  DollarSign, 
  FileCheck, 
  MapPin, 
  Calendar, 
  User, 
  Lock, 
  Unlock,
  ExternalLink,
  Receipt,
  Package,
  CheckCircle
} from 'lucide-react';
import { Case, CaseStatus, UserRole, WORKFLOW_8_STEPS } from '../types';
import { downloadCustomsDeliveryOrderPdf } from '../services/pdfExportService';
import { PdfViewerModal } from './PdfViewerModal';

interface CompletedCaseDossierProps {
  targetCase: Case;
  userRole?: UserRole;
  customLogo?: string | null;
  onUpdateCase?: (updated: Case) => void;
  onOpenDownloadAllModal?: () => void;
}

export const CompletedCaseDossier: React.FC<CompletedCaseDossierProps> = ({
  targetCase,
  userRole = UserRole.ADMIN,
  customLogo,
  onUpdateCase,
  onOpenDownloadAllModal
}) => {
  const [isGeneratingDo, setIsGeneratingDo] = useState(false);
  const [activePdfUrl, setActivePdfUrl] = useState<string | null>(null);
  const [activePdfTitle, setActivePdfTitle] = useState<string>('');
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [holdReasonInput, setHoldReasonInput] = useState('');

  const isHoldFlagged = !!targetCase.objectionHold?.flagged;
  const canManageHold = userRole === UserRole.ADMIN || (userRole as string) === 'MANAGER' || userRole === UserRole.OPERATIONS_MANAGER;

  const handleDownloadDeliveryOrder = async () => {
    if (isHoldFlagged) {
      alert(`Download Locked: An objection/hold has been flagged on this case: "${targetCase.objectionHold?.reason || 'Administrative Review Required'}"`);
      return;
    }

    try {
      setIsGeneratingDo(true);
      const res = await downloadCustomsDeliveryOrderPdf({
        targetCase,
        branding: customLogo ? { customLogo, companyName: 'Docks (Pvt.) Ltd.' } : undefined
      });
      if (res?.blobUrl) {
        setActivePdfUrl(res.blobUrl);
        setActivePdfTitle(`Delivery Order - ${targetCase.caseNo}`);
      }
    } catch (err) {
      console.error('Failed to generate DO:', err);
      alert('Error generating Delivery Order PDF.');
    } finally {
      setIsGeneratingDo(false);
    }
  };

  const handleToggleHold = (flag: boolean) => {
    if (flag && !holdReasonInput.trim()) {
      alert('Please provide a valid reason for the objection/hold.');
      return;
    }

    const updated: Case = {
      ...targetCase,
      objectionHold: {
        flagged: flag,
        reason: flag ? holdReasonInput.trim() : undefined,
        flaggedBy: userRole,
        flaggedAt: new Date().toISOString()
      }
    };

    if (onUpdateCase) {
      onUpdateCase(updated);
    }
    setShowHoldModal(false);
    setHoldReasonInput('');
  };

  // Compile all uploaded documents across all 8 workflow steps and general case
  const collectedDocs: Array<{ title: string; url?: string; step: string; type: string }> = [];

  const wf = targetCase.workflowDetails || {};

  // Step 1
  const s1 = wf[CaseStatus.SHIPPING_LINE_DO];
  if (s1?.doReceiptUrl) collectedDocs.push({ title: 'DO Payment Receipt', url: s1.doReceiptUrl, step: 'Step 1: Shipping Line DO', type: 'Receipt' });

  // Step 2
  const s2 = wf[CaseStatus.TP_FILING];
  if (s2?.tpGdPrintUrl) collectedDocs.push({ title: 'TP / GD Print Document', url: s2.tpGdPrintUrl, step: 'Step 2: TP Filing', type: 'Customs Doc' });

  // Step 3
  const s3 = wf[CaseStatus.EXCISE_PAYMENT];
  if (s3?.exciseReceiptUrl) collectedDocs.push({ title: 'Excise Payment Challan', url: s3.exciseReceiptUrl, step: 'Step 3: Excise Payment', type: 'Receipt' });

  // Step 4
  const s4 = wf[CaseStatus.WHARFAGE_PAYMENT];
  if (s4?.wharfageReceiptUrl) collectedDocs.push({ title: 'Wharfage Terminal Receipt', url: s4.wharfageReceiptUrl, step: 'Step 4: Wharfage Payment', type: 'Receipt' });

  // Step 5
  const s5 = wf[CaseStatus.VEHICLE_ASSIGNMENT];
  if (s5?.registrationBookUrl) collectedDocs.push({ title: 'Vehicle Registration Book', url: s5.registrationBookUrl, step: 'Step 5: Vehicle Assignment', type: 'Vehicle Doc' });
  if (s5?.ownerCnicUrl) collectedDocs.push({ title: 'Vehicle Owner CNIC', url: s5.ownerCnicUrl, step: 'Step 5: Vehicle Assignment', type: 'CNIC' });
  if (s5?.driverCnicFrontUrl) collectedDocs.push({ title: 'Driver CNIC (Front)', url: s5.driverCnicFrontUrl, step: 'Step 5: Vehicle Assignment', type: 'CNIC' });
  if (s5?.driverCnicBackUrl) collectedDocs.push({ title: 'Driver CNIC (Back)', url: s5.driverCnicBackUrl, step: 'Step 5: Vehicle Assignment', type: 'CNIC' });
  if (s5?.driverLicenseUrl) collectedDocs.push({ title: 'Driver Driving License', url: s5.driverLicenseUrl, step: 'Step 5: Vehicle Assignment', type: 'License' });

  // Step 6
  const s6 = wf[CaseStatus.LOADING_PORT_PROCESSING];
  if (s6?.vehiclePhotoUrl) collectedDocs.push({ title: 'Vehicle Loading Photo', url: s6.vehiclePhotoUrl, step: 'Step 6: Loading Port', type: 'Photo' });
  if (s6?.portGatePassUrl) collectedDocs.push({ title: 'Port Gate Pass', url: s6.portGatePassUrl, step: 'Step 6: Loading Port', type: 'Gate Pass' });
  if (s6?.weightSlipUrl) collectedDocs.push({ title: 'Port Weight Slip', url: s6.weightSlipUrl, step: 'Step 6: Loading Port', type: 'Slip' });
  if (s6?.sealSlipUrl) collectedDocs.push({ title: 'Seal Verification Slip', url: s6.sealSlipUrl, step: 'Step 6: Loading Port', type: 'Slip' });
  if (s6?.customsSealPhotoUrl) collectedDocs.push({ title: 'Customs Container Seal Photo', url: s6.customsSealPhotoUrl, step: 'Step 6: Loading Port', type: 'Photo' });
  if (s6?.driverGateOutPhotoUrl) collectedDocs.push({ title: 'Driver Gate Out Live Photo', url: s6.driverGateOutPhotoUrl, step: 'Step 6: Loading Port', type: 'Photo' });

  // Step 8
  const s8 = wf[CaseStatus.DESTINATION_PORT_ARRIVAL];
  if (s8?.portGateArrivalPhotoUrl) collectedDocs.push({ title: 'Destination Gate Arrival Photo', url: s8.portGateArrivalPhotoUrl, step: 'Step 8: Destination Port', type: 'Photo' });
  if (s8?.secondaryCustomsSealPhotoUrl) collectedDocs.push({ title: 'Secondary Customs Seal Photo', url: s8.secondaryCustomsSealPhotoUrl, step: 'Step 8: Destination Port', type: 'Photo' });
  if (s8?.destinationWeightSlipUrl) collectedDocs.push({ title: 'Destination Port Weight Slip', url: s8.destinationWeightSlipUrl, step: 'Step 8: Destination Port', type: 'Slip' });
  if (s8?.finalSignedTransportNoteUrl) collectedDocs.push({ title: 'Final Signed Transport Note (Endorsed)', url: s8.finalSignedTransportNoteUrl, step: 'Step 8: Destination Port', type: 'Endorsement' });
  if (s8?.dryPortGatePassUrl) collectedDocs.push({ title: 'Dry Port Gate Pass', url: s8.dryPortGatePassUrl, step: 'Step 8: Destination Port', type: 'Gate Pass' });

  // General attached documents
  (targetCase.documents || []).forEach((doc: any, i: number) => {
    if (doc?.url) {
      collectedDocs.push({
        title: doc.title || doc.name || `Case Document ${i + 1}`,
        url: doc.url,
        step: 'General Consignment',
        type: doc.fileType || 'Document'
      });
    }
  });

  const totalCharges = (targetCase.charges || []).reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in" id="completed-case-dossier">
      {/* Top Banner: Dossier Completion Notice */}
      <div className="bg-gradient-to-r from-emerald-900/40 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-64 bg-emerald-500/5 blur-2xl pointer-events-none"></div>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg shadow-emerald-500/10">
              <ShieldCheck size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xs uppercase tracking-widest font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-1.5">
                  <CheckCircle2 size={13} /> 8-Step Workflow Completed
                </span>
                <span className="text-xs text-gray-400 font-mono">Case #{targetCase.caseNo}</span>
              </div>
              <h2 className="text-2xl font-black text-white mt-1.5">Completed Case Dossier Screen</h2>
              <p className="text-sm text-gray-300 max-w-2xl mt-1 leading-relaxed">
                All 8 bonded transit operations have been finalized and verified. Vehicle Gate Out is confirmed at the destination port. All operational data is permanently archived in read-only format.
              </p>
            </div>
          </div>

          {/* Action Hub */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {canManageHold && (
              <button
                type="button"
                onClick={() => {
                  if (isHoldFlagged) {
                    handleToggleHold(false);
                  } else {
                    setShowHoldModal(true);
                  }
                }}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
                  isHoldFlagged
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 hover:bg-rose-500/30'
                    : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                }`}
                title="Flag or release administrative hold on DO release"
              >
                {isHoldFlagged ? <Unlock size={15} /> : <Lock size={15} />}
                <span>{isHoldFlagged ? 'Release Objection Hold' : 'Flag Objection / Hold'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDownloadDeliveryOrder}
              disabled={isGeneratingDo || isHoldFlagged}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg ${
                isHoldFlagged
                  ? 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 hover:scale-105 active:scale-95'
              }`}
            >
              <FileCheck size={16} />
              <span>{isGeneratingDo ? 'Generating DO...' : 'Download Delivery Order (DO / NOC)'}</span>
            </button>

            {onOpenDownloadAllModal && (
              <button
                type="button"
                onClick={onOpenDownloadAllModal}
                className="bg-brand-600 hover:bg-brand-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-brand-600/20 hover:scale-105 active:scale-95"
              >
                <Download size={16} />
                <span>Download All Case Documents</span>
              </button>
            )}
          </div>
        </div>

        {/* Hold Alert Box if active */}
        {isHoldFlagged && (
          <div className="mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-xs">
            <AlertTriangle size={18} className="shrink-0 text-rose-400 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-rose-200">Delivery Order Release Locked (Objection / Hold Flagged)</p>
              <p className="mt-0.5 text-rose-300/90">{targetCase.objectionHold?.reason || 'Administrative review hold active.'}</p>
              <p className="text-[10px] text-gray-400 mt-1 font-mono">Flagged by: {targetCase.objectionHold?.flaggedBy || 'Admin'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Read-Only Dossier Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Consignment & Workflow Summary */}
        <div className="lg:col-span-2 space-y-6">
          {/* Case Metadata */}
          <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Building2 size={16} className="text-brand-400" />
              <span>Consignment & Route Particulars</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-gray-400 block mb-1">Consignee / Client</span>
                <span className="font-bold text-white text-sm">{targetCase.clientName}</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-gray-400 block mb-1">Category</span>
                <span className="font-semibold text-white">{targetCase.category || 'Transit'}</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-gray-400 block mb-1">BL Number</span>
                <span className="font-mono text-white font-semibold">{targetCase.extractedData?.blNumber || 'N/A'}</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-gray-400 block mb-1">Port of Loading (POL)</span>
                <span className="font-semibold text-emerald-400">{targetCase.pol}</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-gray-400 block mb-1">Port of Destination (POD)</span>
                <span className="font-semibold text-emerald-400">{targetCase.pod}</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-gray-400 block mb-1">Registration Date</span>
                <span className="font-mono text-white">{targetCase.createdAt}</span>
              </div>
            </div>
          </div>

          {/* 8-Step Complete Operational Audit Trail */}
          <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FileCheck size={16} className="text-emerald-400" />
              <span>8-Step Operational Execution Record</span>
            </h3>

            <div className="space-y-3">
              {WORKFLOW_8_STEPS.map((stepName, idx) => {
                const detail = wf[stepName];
                return (
                  <div key={stepName} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">{stepName}</h4>
                        <p className="text-gray-400 text-[11px] mt-0.5">
                          {detail?.referenceNo ? `Ref: ${detail.referenceNo}` : 'Executed according to customs regulations'}
                          {detail?.date ? ` • ${detail.date}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                      <span className="text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                        <CheckCircle size={12} /> Verified
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Containers & Seal Inventory */}
          <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Package size={16} className="text-blue-400" />
              <span>Containers & Vehicle Manifest</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-slate-900/80 text-gray-400 uppercase tracking-wider text-[10px] border-b border-white/10">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Container No.</th>
                    <th className="p-3">Size</th>
                    <th className="p-3">Weight (KG)</th>
                    <th className="p-3">Customs Seal</th>
                    <th className="p-3">Carrier Vehicle</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(targetCase.containers || []).map((cnt, i) => (
                    <tr key={cnt.id || i} className="hover:bg-white/[0.02]">
                      <td className="p-3 font-mono">{i + 1}</td>
                      <td className="p-3 font-bold text-white font-mono">{cnt.number}</td>
                      <td className="p-3">{cnt.size}</td>
                      <td className="p-3 font-mono">{cnt.weight ? cnt.weight.toLocaleString() : 'N/A'}</td>
                      <td className="p-3 font-mono text-amber-300">{cnt.sealNo || 'VERIFIED'}</td>
                      <td className="p-3 font-mono text-emerald-400">{cnt.vehicleNo || 'ASSIGNED'}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Delivered
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!targetCase.containers || targetCase.containers.length === 0) && (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-gray-500 italic">
                        No container records registered.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Documents Hub & Final Billing Statement */}
        <div className="space-y-6">
          {/* Universal Document Hub */}
          <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FileText size={16} className="text-brand-400" />
                <span>Case Documents & Receipts</span>
              </h3>
              <span className="text-xs font-mono text-gray-400">{collectedDocs.length} files</span>
            </div>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
              {collectedDocs.map((doc, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/20 transition-all flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">{doc.title}</p>
                    <p className="text-[10px] text-gray-400 truncate">{doc.step}</p>
                  </div>
                  {doc.url && (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-white/5 hover:bg-brand-500 hover:text-white text-gray-300 transition-colors shrink-0"
                      title="View / Download Document"
                    >
                      <Download size={14} />
                    </a>
                  )}
                </div>
              ))}
              {collectedDocs.length === 0 && (
                <div className="p-6 text-center text-xs text-gray-500 italic">
                  No receipts or operational slips recorded.
                </div>
              )}
            </div>
          </div>

          {/* Final Billable Charges & Invoicing Statement */}
          <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <DollarSign size={16} className="text-emerald-400" />
              <span>Final Billable Charges</span>
            </h3>

            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar text-xs">
              {(targetCase.charges || []).map((chg, idx) => (
                <div key={chg.id || idx} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white">{chg.description}</p>
                    {chg.category && <p className="text-[10px] text-gray-400">{chg.category}</p>}
                  </div>
                  <span className="font-mono font-bold text-emerald-400">
                    PKR {(Number(chg.amount) || 0).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-between items-center text-sm">
              <span className="font-bold text-gray-300">Total Billable:</span>
              <span className="font-mono font-black text-lg text-emerald-400">
                PKR {totalCharges.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Flag Objection / Hold Modal */}
      {showHoldModal && (
        <div className="fixed inset-0 bg-black/80 z-[120] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-rose-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle size={24} />
              <h3 className="text-lg font-bold text-white">Flag Objection / Hold</h3>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              Flagging an objection locks Delivery Order (DO / NOC) downloads for all terminal staff and clients until resolved by an administrator or case manager.
            </p>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider">
                Reason for Objection / Hold (Compulsory)
              </label>
              <textarea
                value={holdReasonInput}
                onChange={(e) => setHoldReasonInput(e.target.value)}
                placeholder="e.g. Pending detention settlement with shipping line, customs inspection discrepancy, or client payment clearance..."
                rows={3}
                className="w-full bg-slate-800 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-rose-500"
              />
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowHoldModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleToggleHold(true)}
                className="bg-rose-600 hover:bg-rose-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-rose-600/30"
              >
                Apply Objection Hold
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Viewer Modal */}
      {activePdfUrl && (
        <PdfViewerModal
          isOpen={!!activePdfUrl}
          pdfUrl={activePdfUrl}
          title={activePdfTitle}
          filename={activePdfTitle || 'delivery_order.pdf'}
          onClose={() => setActivePdfUrl(null)}
        />
      )}
    </div>
  );
};
