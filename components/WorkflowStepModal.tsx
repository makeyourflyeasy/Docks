import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, 
  Save, 
  Upload, 
  Download, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Eye, 
  Truck, 
  ShieldCheck, 
  Clock, 
  MapPin, 
  Camera, 
  DollarSign, 
  FileCheck, 
  Check, 
  Lock, 
  Info,
  ChevronRight,
  RotateCcw,
  Sparkles,
  AlertCircle,
  Printer
} from 'lucide-react';
import { 
  Case, 
  CaseStatus, 
  CaseStepDetail, 
  CaseCharge, 
  WORKFLOW_8_STEPS, 
  PAKISTAN_REGIONS, 
  Vehicle, 
  UserRole 
} from '../types';
import { safeAppStorage } from '../services/storage';
import { 
  getCategoryWorkflow, 
  getWorkflowStepIndex, 
  normalizeCategoryName, 
  supportsSubCategories 
} from '../services/workflowConfig';
import { PdfViewerModal } from './PdfViewerModal';
import { WorkflowMultiUploader } from './WorkflowMultiUploader';
import { CustomsClearanceSteps } from './workflowSteps/CustomsClearanceSteps';
import { AfghanTransitSteps } from './workflowSteps/AfghanTransitSteps';
import { TirSteps } from './workflowSteps/TirSteps';
import { PrivateCargoSteps } from './workflowSteps/PrivateCargoSteps';
import { WarehousingSteps } from './workflowSteps/WarehousingSteps';
import { CargoEquipmentSubCategoryFields } from './CargoEquipmentSubCategoryFields';
import { CarCarrierSteps } from './workflowSteps/CarCarrierSteps';
import { IsoTankSteps } from './workflowSteps/IsoTankSteps';
import { BreakbulkSteps } from './workflowSteps/BreakbulkSteps';
import { LinerNvoccSteps } from './workflowSteps/LinerNvoccSteps';

interface WorkflowStepModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetCase: Case;
  stepStatus: CaseStatus | string;
  stepIndex: number;
  onSaveCase: (updatedCase: Case) => void;
  userRole?: UserRole;
  availableVehicles?: Vehicle[];
  onReportIncident?: (updatedCase: Case) => void;
}

export const WorkflowStepModal: React.FC<WorkflowStepModalProps> = ({
  isOpen,
  onClose,
  targetCase,
  stepStatus,
  stepIndex,
  onSaveCase,
  userRole = UserRole.ADMIN,
  availableVehicles = [],
  onReportIncident
}) => {
  if (!isOpen || !targetCase) return null;

  const categoryWorkflow = useMemo(() => getCategoryWorkflow(targetCase.category), [targetCase.category]);
  const normCategory = useMemo(() => normalizeCategoryName(targetCase.category), [targetCase.category]);
  const activeStepIdx = useMemo(() => getWorkflowStepIndex(targetCase.category, targetCase.status as string), [targetCase.category, targetCase.status]);
  const isReadOnly = targetCase.status === CaseStatus.COMPLETED;

  // Existing step detail or defaults
  const existingDetail = targetCase.workflowDetails?.[stepStatus] || ({} as CaseStepDetail);

  // Form State
  const [formData, setFormData] = useState<CaseStepDetail>({
    status: stepStatus,
    completed: existingDetail.completed || false,
    date: existingDetail.date || new Date().toISOString().split('T')[0],
    officer: existingDetail.officer || '',
    referenceNo: existingDetail.referenceNo || '',
    remarks: existingDetail.remarks || '',
    updatedAt: existingDetail.updatedAt || '',

    // Step 1
    doReceiptUrl: existingDetail.doReceiptUrl || '',
    doReceiptName: existingDetail.doReceiptName || '',
    doReferenceNo: existingDetail.doReferenceNo || existingDetail.referenceNo || '',
    doIssueDate: existingDetail.doIssueDate || existingDetail.date || '',
    doDueChargesArrangedBy: existingDetail.doDueChargesArrangedBy || 'Client',
    doDueChargesAmount: existingDetail.doDueChargesAmount || 0,
    doDueChargesCommission: existingDetail.doDueChargesCommission || 0,
    doDepositArrangedBy: existingDetail.doDepositArrangedBy || 'Client',
    doDepositAmount: existingDetail.doDepositAmount || 0,
    doDepositCommission: existingDetail.doDepositCommission || 0,

    // Step 2
    tpGdPrintUrl: existingDetail.tpGdPrintUrl || '',
    tpGdPrintName: existingDetail.tpGdPrintName || '',
    tpGdNumber: existingDetail.tpGdNumber || existingDetail.referenceNo || targetCase.extractedData?.tpNumber || targetCase.extractedData?.gdNumber || '',
    tpFilingDate: existingDetail.tpFilingDate || existingDetail.date || '',
    tpItemDescription: existingDetail.tpItemDescription || targetCase.extractedData?.itemDescription || '',
    tpFilingEntity: existingDetail.tpFilingEntity || 'Client',

    // Step 3
    exciseReceiptUrl: existingDetail.exciseReceiptUrl || '',
    exciseReceiptName: existingDetail.exciseReceiptName || '',
    exciseAmount: existingDetail.exciseAmount || 0,
    exciseReferenceNo: existingDetail.exciseReferenceNo || existingDetail.referenceNo || '',
    exciseRegion: existingDetail.exciseRegion || 'Sindh',
    excisePaymentDate: existingDetail.excisePaymentDate || existingDetail.date || '',
    exciseHandledBy: existingDetail.exciseHandledBy || 'Client',

    // Step 4
    wharfageReceiptUrl: existingDetail.wharfageReceiptUrl || '',
    wharfageReceiptName: existingDetail.wharfageReceiptName || '',
    wharfageReceiptDate: existingDetail.wharfageReceiptDate || existingDetail.date || '',
    wharfageAmount: existingDetail.wharfageAmount || 0,
    wharfagePaymentEntity: existingDetail.wharfagePaymentEntity || 'Client',
    wharfageCommission: existingDetail.wharfageCommission || 0,

    // Step 5
    assignedVehicleNo: existingDetail.assignedVehicleNo || targetCase.containers?.[0]?.vehicleNo || '',
    vehicleVerifiedInDb: existingDetail.vehicleVerifiedInDb || false,
    registrationBookUrl: existingDetail.registrationBookUrl || '',
    registrationBookName: existingDetail.registrationBookName || '',
    ownerCnicUrl: existingDetail.ownerCnicUrl || '',
    ownerCnicName: existingDetail.ownerCnicName || '',
    taxRenewalDate: existingDetail.taxRenewalDate || '',
    taxExpiryDate: existingDetail.taxExpiryDate || '',
    driverName: existingDetail.driverName || targetCase.containers?.[0]?.driverName || '',
    driverCnic: existingDetail.driverCnic || targetCase.containers?.[0]?.driverCnic || '',
    driverCnicFrontUrl: existingDetail.driverCnicFrontUrl || '',
    driverCnicFrontName: existingDetail.driverCnicFrontName || '',
    driverCnicBackUrl: existingDetail.driverCnicBackUrl || '',
    driverCnicBackName: existingDetail.driverCnicBackName || '',
    driverLicenseUrl: existingDetail.driverLicenseUrl || '',
    driverLicenseName: existingDetail.driverLicenseName || '',
    vehicleRentAmount: existingDetail.vehicleRentAmount || 0,
    vehicleRentArrangedBy: existingDetail.vehicleRentArrangedBy || 'Client',
    vehicleRentCommission: existingDetail.vehicleRentCommission || 0,

    // Step 6
    vehiclePhotoUrl: existingDetail.vehiclePhotoUrl || '',
    vehiclePhotoName: existingDetail.vehiclePhotoName || '',
    portGatePassUrl: existingDetail.portGatePassUrl || '',
    portGatePassName: existingDetail.portGatePassName || '',
    trackerStatus: existingDetail.trackerStatus || 'Not Installed',
    trackerArrangedBy: existingDetail.trackerArrangedBy || 'Client',
    trackerAmount: existingDetail.trackerAmount || 0,
    trackerCommission: existingDetail.trackerCommission || 0,
    loadingChargesArrangedBy: existingDetail.loadingChargesArrangedBy || 'Client',
    loadingChargesAmount: existingDetail.loadingChargesAmount || 0,
    loadingChargesCommission: existingDetail.loadingChargesCommission || 0,
    weightSlipUrl: existingDetail.weightSlipUrl || '',
    weightSlipName: existingDetail.weightSlipName || '',
    sealSlipUrl: existingDetail.sealSlipUrl || '',
    sealSlipName: existingDetail.sealSlipName || '',
    customsSealPhotoUrl: existingDetail.customsSealPhotoUrl || '',
    customsSealPhotoName: existingDetail.customsSealPhotoName || '',
    customsSealNumber: existingDetail.customsSealNumber || '',
    gateOutToggled: existingDetail.gateOutToggled || false,
    driverGateOutPhotoUrl: existingDetail.driverGateOutPhotoUrl || '',
    driverGateOutPhotoName: existingDetail.driverGateOutPhotoName || '',

    // Step 7
    inTransitActive: existingDetail.inTransitActive || false,
    incidentReported: existingDetail.incidentReported || false,
    incidentReason: existingDetail.incidentReason || '',
    incidentDate: existingDetail.incidentDate || '',
    incidentLocation: existingDetail.incidentLocation || '',
    incidentRemarks: existingDetail.incidentRemarks || '',

    // Step 8
    portGateArrivalPhotoUrl: existingDetail.portGateArrivalPhotoUrl || '',
    portGateArrivalPhotoName: existingDetail.portGateArrivalPhotoName || '',
    destinationGateInToggled: existingDetail.destinationGateInToggled || false,
    secondaryCustomsSealPhotoUrl: existingDetail.secondaryCustomsSealPhotoUrl || '',
    secondaryCustomsSealPhotoName: existingDetail.secondaryCustomsSealPhotoName || '',
    secondaryCustomsSealNumber: existingDetail.secondaryCustomsSealNumber || '',
    destinationWeightSlipUrl: existingDetail.destinationWeightSlipUrl || '',
    destinationWeightSlipName: existingDetail.destinationWeightSlipName || '',
    finalSignedTransportNoteUrl: existingDetail.finalSignedTransportNoteUrl || '',
    finalSignedTransportNoteName: existingDetail.finalSignedTransportNoteName || '',
    dryPortGatePassUrl: existingDetail.dryPortGatePassUrl || '',
    dryPortGatePassName: existingDetail.dryPortGatePassName || '',
    vehicleGateOutToggled: existingDetail.vehicleGateOutToggled || false
  });

  const [stepAction, setStepAction] = useState<'advance' | 'set_current' | 'keep'>('advance');
  const [activePdfPreview, setActivePdfPreview] = useState<{ url: string; title: string } | null>(null);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [incidentForm, setIncidentForm] = useState({
    reason: '',
    location: '',
    date: new Date().toISOString().split('T')[0],
    contact: ''
  });

  // Load vehicles from storage if availableVehicles is empty
  const allVehicles = useMemo(() => {
    if (availableVehicles && availableVehicles.length > 0) return availableVehicles;
    return safeAppStorage.getJSON<Vehicle[]>('dpl_vehicles_data', []);
  }, [availableVehicles]);

  // Check vehicle database match when assignedVehicleNo changes
  const matchedVehicle = useMemo(() => {
    if (!formData.assignedVehicleNo) return null;
    const cleanInput = formData.assignedVehicleNo.trim().toUpperCase().replace(/\s+/g, '');
    return allVehicles.find(v => 
      v.registrationNumber.toUpperCase().replace(/\s+/g, '') === cleanInput
    ) || null;
  }, [formData.assignedVehicleNo, allVehicles]);

  // Sync vehicle DB verification
  useEffect(() => {
    if (matchedVehicle) {
      const hasRegBook = !!matchedVehicle.registrationBook;
      const hasCnic = !!matchedVehicle.driverCnic || !!matchedVehicle.photo;
      setFormData(prev => ({
        ...prev,
        vehicleVerifiedInDb: true,
        registrationBookUrl: prev.registrationBookUrl || matchedVehicle.registrationBook,
        registrationBookName: prev.registrationBookName || (matchedVehicle.registrationBook ? 'Vehicle Registration Book (Database)' : ''),
        taxRenewalDate: prev.taxRenewalDate || matchedVehicle.validationStartDate || '',
        taxExpiryDate: prev.taxExpiryDate || matchedVehicle.validationExpiryDate || '',
        driverName: prev.driverName || matchedVehicle.driverName || '',
        driverCnic: prev.driverCnic || matchedVehicle.driverCnic || ''
      }));
    }
  }, [matchedVehicle]);

  // Validation rules per step
  const validateStep = (): { valid: boolean; error?: string } => {
    if (normCategory === 'Bonded Carrier') {
      if (stepIndex === 0) { // Step 1: Shipping Line DO
        if (formData.doDepositArrangedBy === 'DPL' && (!formData.doDepositCommission || formData.doDepositCommission <= 0)) {
          return { valid: false, error: 'Compulsory Rule: Please enter the DPL Commission Amount for DO Deposit.' };
        }
      }

      if (stepIndex === 2) { // Step 3: Excise Payment
        if (!formData.exciseRegion) {
          return { valid: false, error: 'Excise Region is mandatory. Please select a Pakistan administrative region.' };
        }
      }

      if (stepIndex === 3) { // Step 4: Wharfage Payment
        if (formData.wharfagePaymentEntity === 'DPL' && (!formData.wharfageCommission || formData.wharfageCommission <= 0)) {
          return { valid: false, error: 'Compulsory Rule: Please enter the DPL Commission Amount for Wharfage payment.' };
        }
      }

      if (stepIndex === 4) { // Step 5: Vehicle Assignment
        if (!formData.assignedVehicleNo?.trim()) {
          return { valid: false, error: 'Vehicle Registration Number is required.' };
        }

        // If not in database or missing docs, require both Registration Book and Owner CNIC
        const hasDbDocs = matchedVehicle?.registrationBook;
        if (!hasDbDocs && (!formData.registrationBookUrl || !formData.ownerCnicUrl)) {
          return { 
            valid: false, 
            error: 'Compulsory Vehicle Lock: Vehicle registration book and owner CNIC must be uploaded before advancing.' 
          };
        }

        // Dual-sided Driver CNIC compulsory
        if (!formData.driverCnicFrontUrl || !formData.driverCnicBackUrl) {
          return {
            valid: false,
            error: 'Compulsory Driver Verification: Dual-sided Driver CNIC (Front & Back) uploads are required.'
          };
        }

        if (formData.vehicleRentArrangedBy === 'DPL' && (!formData.vehicleRentCommission || formData.vehicleRentCommission <= 0)) {
          return { valid: false, error: 'Compulsory Rule: Please enter DPL Commission Amount for Vehicle Rent.' };
        }
      }

      if (stepIndex === 5) { // Step 6: Loading Port Processing
        if (stepAction === 'advance') {
          if (!formData.customsSealPhotoUrl || !formData.customsSealNumber?.trim()) {
            return { valid: false, error: 'Customs Seal Verification Required: Both Customs Seal Photo and Customs Seal Number are mandatory.' };
          }
          if (!formData.gateOutToggled) {
            return { valid: false, error: 'Completion Criteria: Step 6 requires Gate Out status to be verified.' };
          }
          if (!formData.driverGateOutPhotoUrl) {
            return { valid: false, error: 'Completion Criteria: Driver Live Picture at Gate Out is compulsory.' };
          }
        }
        if (formData.loadingChargesArrangedBy === 'DPL' && (!formData.loadingChargesCommission || formData.loadingChargesCommission <= 0)) {
          return { valid: false, error: 'Compulsory Rule: Please enter DPL Commission Amount for Loading Charges.' };
        }
      }

      if (stepIndex === 7) { // Step 8: Destination Port Arrival
        if (stepAction === 'advance') {
          if (!formData.secondaryCustomsSealPhotoUrl || !formData.secondaryCustomsSealNumber?.trim()) {
            return { valid: false, error: 'Customs Seal Verification Required: Both Secondary Customs Seal Photo and Customs Seal Number are mandatory.' };
          }
        }
      }
    }

    return { valid: true };
  };

  // Helper: Synchronize all DPL expenses and commissions to targetCase.charges
  const syncDplExpensesToInvoice = (currentCase: Case, updatedDetail: CaseStepDetail): CaseCharge[] => {
    const existingCharges = [...(currentCase.charges || [])];
    
    // Key-value pairs of DPL items for this step
    const dplItemsToSync: Array<{ key: string; label: string; amount: number; commission: number; receiptUrl?: string; receiptName?: string }> = [];

    const activeStepId = categoryWorkflow.steps[stepIndex]?.id || String(stepStatus);
    const isDoStep = stepIndex === 0 || activeStepId === 'DELIVERY_ORDER' || updatedDetail.doDueChargesArrangedBy !== undefined;
    const isExciseStep = stepIndex === 2 || activeStepId === 'SINDH_EXCISE' || updatedDetail.exciseHandledBy !== undefined;
    const isWharfageStep = stepIndex === 3 || activeStepId === 'PORT_TERMINAL' || updatedDetail.wharfagePaymentEntity !== undefined;
    const isVehicleStep = stepIndex === 4 || activeStepId === 'TRANSPORTER' || updatedDetail.vehicleRentArrangedBy !== undefined;
    const isTrackerStep = stepIndex === 5 || activeStepId === 'CUSTOMS_GATE' || updatedDetail.trackerArrangedBy !== undefined;

    if (isDoStep) { // DO Due Charges & Security Deposit
      if (updatedDetail.doDueChargesArrangedBy === 'DPL' && Number(updatedDetail.doDueChargesAmount) > 0) {
        dplItemsToSync.push({
          key: 'dpl_do_due_charges',
          label: 'DO Due Charges (DPL Arranged)',
          amount: Number(updatedDetail.doDueChargesAmount),
          commission: 0, // No commission for DO Due Charges
          receiptUrl: updatedDetail.doReceiptUrl,
          receiptName: updatedDetail.doReceiptName
        });
      }
      if (updatedDetail.doDepositArrangedBy === 'DPL' && Number(updatedDetail.doDepositAmount) > 0) {
        dplItemsToSync.push({
          key: 'dpl_do_deposit',
          label: 'DO Security Deposit (DPL Arranged)',
          amount: Number(updatedDetail.doDepositAmount),
          commission: Number(updatedDetail.doDepositCommission) || 0,
          receiptUrl: updatedDetail.doReceiptUrl,
          receiptName: updatedDetail.doReceiptName
        });
      }
    }

    if (isExciseStep) { // Excise Payment
      if (updatedDetail.exciseHandledBy === 'DPL' && Number(updatedDetail.exciseAmount) > 0) {
        dplItemsToSync.push({
          key: 'dpl_excise',
          label: `Excise Duty Payment (${updatedDetail.exciseRegion || 'Sindh'}) (DPL Arranged)`,
          amount: Number(updatedDetail.exciseAmount),
          commission: 0,
          receiptUrl: updatedDetail.exciseReceiptUrl,
          receiptName: updatedDetail.exciseReceiptName
        });
      }
    }

    if (isWharfageStep) { // Wharfage Terminal Payment
      if (updatedDetail.wharfagePaymentEntity === 'DPL' && Number(updatedDetail.wharfageAmount) > 0) {
        dplItemsToSync.push({
          key: 'dpl_wharfage',
          label: 'Wharfage Terminal Payment (DPL Arranged)',
          amount: Number(updatedDetail.wharfageAmount),
          commission: Number(updatedDetail.wharfageCommission) || 0,
          receiptUrl: updatedDetail.wharfageReceiptUrl,
          receiptName: updatedDetail.wharfageReceiptName
        });
      }
    }

    if (isVehicleStep) { // Vehicle Rent
      if (updatedDetail.vehicleRentArrangedBy === 'DPL' && Number(updatedDetail.vehicleRentAmount) > 0) {
        dplItemsToSync.push({
          key: 'dpl_vehicle_rent',
          label: 'Vehicle Freight / Rent (DPL Arranged)',
          amount: Number(updatedDetail.vehicleRentAmount),
          commission: Number(updatedDetail.vehicleRentCommission) || 0
        });
      }
    }

    if (isTrackerStep) { // Tracker & Loading
      if (updatedDetail.trackerArrangedBy === 'DPL' && Number(updatedDetail.trackerAmount) > 0) {
        dplItemsToSync.push({
          key: 'dpl_tracker',
          label: 'Tracking Device Fee (DPL Arranged)',
          amount: Number(updatedDetail.trackerAmount),
          commission: 0 // Only Tracker Cost, NO commission
        });
      }
      if (updatedDetail.loadingChargesArrangedBy === 'DPL' && Number(updatedDetail.loadingChargesAmount) > 0) {
        dplItemsToSync.push({
          key: 'dpl_loading',
          label: 'Port Loading Charges (DPL Arranged)',
          amount: Number(updatedDetail.loadingChargesAmount),
          commission: Number(updatedDetail.loadingChargesCommission) || 0
        });
      }
    }

    // Keys to clean up old items if switched back to Client
    const keysToClean: string[] = [];
    if (isDoStep) keysToClean.push('dpl_do_due_charges', 'dpl_do_deposit');
    if (isExciseStep) keysToClean.push('dpl_excise');
    if (isWharfageStep) keysToClean.push('dpl_wharfage');
    if (isVehicleStep) keysToClean.push('dpl_vehicle_rent');
    if (isTrackerStep) keysToClean.push('dpl_tracker', 'dpl_loading');
    
    // Filter out previous auto-generated items for this step
    let filtered = existingCharges.filter(c => {
      const matchKey = keysToClean.some(k => (c as any).syncKey === k || (c as any).syncKey === `${k}_comm`);
      return !matchKey;
    });

    // Append newly active items
    dplItemsToSync.forEach(item => {
      // 1. Base expense
      filtered.push({
        id: `chg_${item.key}_${Date.now()}`,
        description: item.label,
        category: 'DPL Disbursed Expense',
        amount: item.amount,
        receiptUrl: item.receiptUrl,
        receiptName: item.receiptName,
        taxable: false,
        ...({ syncKey: item.key } as any)
      });

      // 2. Compulsory Commission
      if (item.commission > 0) {
        filtered.push({
          id: `chg_${item.key}_comm_${Date.now()}`,
          description: `${item.label} - DPL Service Commission`,
          category: 'Service Commission',
          amount: item.commission,
          taxable: true,
          ...({ syncKey: `${item.key}_comm` } as any)
        });
      }
    });

    return filtered;
  };

  const handleSave = () => {
    const validation = validateStep();
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    const currentWorkflow = targetCase.workflowDetails || {};
    let finalStatus = targetCase.status;
    let isCompleted = false;

    if (stepAction === 'set_current') {
      finalStatus = stepStatus;
      isCompleted = false;
    } else if (stepAction === 'advance') {
      isCompleted = true;
      const totalSteps = categoryWorkflow.totalSteps;
      if (stepIndex < totalSteps - 1) {
        finalStatus = categoryWorkflow.steps[stepIndex + 1].id as any;
      } else {
        // Final step complete -> marks entire workflow completed
        finalStatus = CaseStatus.COMPLETED;
      }
    } else {
      isCompleted = stepIndex <= activeStepIdx;
    }

    // Final step completion trigger
    if (stepIndex === categoryWorkflow.totalSteps - 1 && (formData.vehicleGateOutToggled || formData.outOfChargeCleared)) {
      finalStatus = CaseStatus.COMPLETED;
      isCompleted = true;
    }

    const updatedStepDetail: CaseStepDetail = {
      ...formData,
      status: stepStatus,
      completed: isCompleted,
      updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Calculate updated billable charges based on Global Financial Rule
    const updatedCharges = syncDplExpensesToInvoice(targetCase, updatedStepDetail);

    // Update container with vehicle & driver if assigned in step 5
    let updatedContainers = targetCase.containers ? [...targetCase.containers] : [];
    if (stepIndex === 4 && formData.assignedVehicleNo) {
      updatedContainers = updatedContainers.map(c => ({
        ...c,
        vehicleNo: formData.assignedVehicleNo,
        driverName: formData.driverName || c.driverName,
        driverCnic: formData.driverCnic || c.driverCnic
      }));
    }

    const updatedCase: Case = {
      ...targetCase,
      status: finalStatus,
      charges: updatedCharges,
      containers: updatedContainers,
      workflowDetails: {
        ...currentWorkflow,
        [stepStatus]: updatedStepDetail
      }
    };

    onSaveCase(updatedCase);
    onClose();
  };

  // Step 8 Trigger: Uploading destination arrival picture automatically marks Step 7 (In Transit) as completed
  const handleDestinationArrivalPhotoUploaded = (photoUrl: string) => {
    setFormData(prev => ({
      ...prev,
      portGateArrivalPhotoUrl: photoUrl,
      portGateArrivalPhotoName: 'Destination Port Arrival Photo'
    }));

    // Auto-mark Step 7 In Transit as completed in targetCase
    const s7 = targetCase.workflowDetails?.[CaseStatus.IN_TRANSIT] || ({} as CaseStepDetail);
    const updatedS7: CaseStepDetail = {
      ...s7,
      status: CaseStatus.IN_TRANSIT,
      completed: true,
      inTransitActive: false,
      date: new Date().toISOString().split('T')[0],
      remarks: (s7.remarks || '') + ' (Arrival at Destination Port Verified)'
    };

    const updatedCase: Case = {
      ...targetCase,
      workflowDetails: {
        ...(targetCase.workflowDetails || {}),
        [CaseStatus.IN_TRANSIT]: updatedS7
      }
    };
    onSaveCase(updatedCase);
  };

  const handleTriggerIncident = () => {
    if (!incidentForm.reason.trim()) {
      alert('Please specify the incident / stoppage reason.');
      return;
    }

    const updatedCase: Case = {
      ...targetCase,
      status: CaseStatus.INCIDENT_STOPPAGE,
      isIncidentVault: true,
      incidentDetails: {
        reportedAt: new Date().toISOString(),
        reportedBy: userRole,
        reason: incidentForm.reason,
        location: incidentForm.location || 'En-route',
        emergencyContact: incidentForm.contact
      }
    };

    if (onReportIncident) {
      onReportIncident(updatedCase);
    } else {
      onSaveCase(updatedCase);
    }

    setShowIncidentModal(false);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-3 sm:p-5 backdrop-blur-md no-print"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-slate-900 rounded-3xl overflow-hidden max-w-2xl w-full border border-white/15 shadow-2xl animate-fade-in max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-brand-500/20 text-brand-400 font-mono font-black flex items-center justify-center border border-brand-500/40 text-lg shadow-inner">
              {stepIndex + 1}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-brand-400 font-bold uppercase tracking-wider">
                  Step {stepIndex + 1} of {categoryWorkflow.totalSteps}
                </span>
                <span className="text-[10px] bg-brand-500/20 text-brand-300 border border-brand-500/30 px-2 py-0.5 rounded-full font-semibold">
                  {targetCase.category}
                </span>
                {targetCase.subCategory && targetCase.subCategory !== 'Standard Container / General Cargo' && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold">
                    {targetCase.subCategory}
                  </span>
                )}
                {stepIndex < activeStepIdx && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                    Completed
                  </span>
                )}
                {stepIndex === activeStepIdx && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold animate-pulse">
                    Active Stage
                  </span>
                )}
              </div>
              <h3 className="text-lg font-black text-white">{stepStatus}</h3>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 space-y-6 overflow-y-auto custom-scrollbar flex-1 text-xs">
          {/* Read-Only Dossier Lock Banner */}
          {targetCase.status === CaseStatus.COMPLETED && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Finalized Case Dossier (Read-Only Lock)</h4>
                  <p className="text-gray-300 text-[11px]">
                    All operational steps and mandatory compliance documents are sealed under Pakistan Customs regulations.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 flex items-center gap-1.5 transition-colors shrink-0"
              >
                <Printer size={14} />
                <span>Print Dossier</span>
              </button>
            </div>
          )}

          {/* DYNAMIC CATEGORY STEP RENDERERS */}
          {normCategory === 'Customs Clearance' && (
            <CustomsClearanceSteps
              stepIndex={stepIndex}
              formData={formData}
              setFormData={setFormData}
              targetCase={targetCase}
              setActivePdfPreview={setActivePdfPreview}
              isReadOnly={isReadOnly}
              availableVehicles={availableVehicles}
            />
          )}

          {normCategory === 'Afghan Transit' && (
            <div className="space-y-4">
              {targetCase.subCategory && targetCase.subCategory !== 'Standard Container / General Cargo' && (
                <CargoEquipmentSubCategoryFields
                  subCategory={targetCase.subCategory}
                  formData={formData}
                  setFormData={setFormData}
                  targetCase={targetCase}
                  setActivePdfPreview={setActivePdfPreview}
                  isReadOnly={isReadOnly}
                />
              )}
              <AfghanTransitSteps
                stepIndex={stepIndex}
                formData={formData}
                setFormData={setFormData}
                targetCase={targetCase}
                setActivePdfPreview={setActivePdfPreview}
                isReadOnly={isReadOnly}
                availableVehicles={availableVehicles}
                onTriggerIncident={() => setShowIncidentModal(true)}
                onDestinationArrivalPhotoUploaded={handleDestinationArrivalPhotoUploaded}
              />
            </div>
          )}

          {normCategory === 'TIR' && (
            <TirSteps
              stepIndex={stepIndex}
              formData={formData}
              setFormData={setFormData}
              targetCase={targetCase}
              setActivePdfPreview={setActivePdfPreview}
              isReadOnly={isReadOnly}
              availableVehicles={availableVehicles}
            />
          )}

          {normCategory === 'Transportation of Private Cargo' && (
            <div className="space-y-4">
              {targetCase.subCategory && targetCase.subCategory !== 'Standard Container / General Cargo' && (
                <CargoEquipmentSubCategoryFields
                  subCategory={targetCase.subCategory}
                  formData={formData}
                  setFormData={setFormData}
                  targetCase={targetCase}
                  setActivePdfPreview={setActivePdfPreview}
                  isReadOnly={isReadOnly}
                />
              )}
              <PrivateCargoSteps
                stepIndex={stepIndex}
                formData={formData}
                setFormData={setFormData}
                targetCase={targetCase}
                setActivePdfPreview={setActivePdfPreview}
                isReadOnly={isReadOnly}
                availableVehicles={availableVehicles}
              />
            </div>
          )}

          {normCategory === 'Warehousing & Distribution' && (
            <WarehousingSteps
              stepIndex={stepIndex}
              formData={formData}
              setFormData={setFormData}
              targetCase={targetCase}
              setActivePdfPreview={setActivePdfPreview}
              isReadOnly={isReadOnly}
              availableVehicles={availableVehicles}
            />
          )}

          {normCategory === 'Car Carrier' && (
            <CarCarrierSteps
              stepIndex={stepIndex}
              formData={formData}
              setFormData={setFormData}
              targetCase={targetCase}
              setActivePdfPreview={setActivePdfPreview}
              isReadOnly={isReadOnly}
              availableVehicles={availableVehicles}
            />
          )}

          {normCategory === 'ISO Tank Service' && (
            <IsoTankSteps
              stepIndex={stepIndex}
              formData={formData}
              setFormData={setFormData}
              targetCase={targetCase}
              setActivePdfPreview={setActivePdfPreview}
              isReadOnly={isReadOnly}
              availableVehicles={availableVehicles}
            />
          )}

          {normCategory === 'Breakbulk / Chartering Services' && (
            <BreakbulkSteps
              stepIndex={stepIndex}
              formData={formData}
              setFormData={setFormData}
              targetCase={targetCase}
              setActivePdfPreview={setActivePdfPreview}
              isReadOnly={isReadOnly}
              availableVehicles={availableVehicles}
            />
          )}

          {normCategory === 'Liner & NVOCC' && (
            <LinerNvoccSteps
              stepIndex={stepIndex}
              formData={formData}
              setFormData={setFormData}
              targetCase={targetCase}
              setActivePdfPreview={setActivePdfPreview}
              isReadOnly={isReadOnly}
              availableVehicles={availableVehicles}
            />
          )}

          {/* BONDED CARRIER (CORE 8-STEP WORKFLOW) */}
          {(normCategory === 'Bonded Carrier' || !['Customs Clearance', 'Afghan Transit', 'TIR', 'Transportation of Private Cargo', 'Warehousing & Distribution', 'Car Carrier', 'ISO Tank Service', 'Breakbulk / Chartering Services', 'Liner & NVOCC'].includes(normCategory)) && (
            <div className="space-y-6">
              {targetCase.subCategory && targetCase.subCategory !== 'Standard Container / General Cargo' && (
                <CargoEquipmentSubCategoryFields
                  subCategory={targetCase.subCategory}
                  formData={formData}
                  setFormData={setFormData}
                  targetCase={targetCase}
                  setActivePdfPreview={setActivePdfPreview}
                  isReadOnly={isReadOnly}
                />
              )}
          {/* STEP 1: SHIPPING LINE DO */}
          {stepIndex === 0 && (
            <div className="space-y-4">
              {/* Receipt Upload/Download */}
              <WorkflowMultiUploader
                label="DO Receipt Document"
                sublabel="Upload official delivery order payment receipt (Supports multi-page, camera capture, replace & remove)"
                urlField="doReceiptUrl"
                nameField="doReceiptName"
                formData={formData}
                setFormData={setFormData}
                onPreview={setActivePdfPreview}
              />

              {/* Reference & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-300 block mb-1.5">DO Reference Number</label>
                  <input 
                    type="text"
                    value={formData.doReferenceNo}
                    onChange={(e) => setFormData({ ...formData, doReferenceNo: e.target.value, referenceNo: e.target.value })}
                    placeholder="e.g. DO-HAPAG-98212"
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-300 block mb-1.5">DO Issue Date</label>
                  <input 
                    type="date"
                    value={formData.doIssueDate}
                    onChange={(e) => setFormData({ ...formData, doIssueDate: e.target.value, date: e.target.value })}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              {/* Global Financial Rule: DO Due Charges */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">DO Due Charges</span>
                  <div className="flex rounded-xl bg-slate-800 p-1 border border-white/10">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, doDueChargesArrangedBy: 'Client' })}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        formData.doDueChargesArrangedBy === 'Client' ? 'bg-brand-600 text-white shadow' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Arranged by Client
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, doDueChargesArrangedBy: 'DPL' })}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        formData.doDueChargesArrangedBy === 'DPL' ? 'bg-emerald-600 text-white shadow' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Arranged by DPL
                    </button>
                  </div>
                </div>

                <div className="pt-1">
                  <label className="text-gray-400 block mb-1 text-xs">Due Charges Amount (PKR)</label>
                  <input 
                    type="number"
                    value={formData.doDueChargesAmount || ''}
                    onChange={(e) => setFormData({ ...formData, doDueChargesAmount: Number(e.target.value) })}
                    placeholder="0"
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-sm"
                  />
                  {formData.doDueChargesArrangedBy === 'DPL' && (
                    <span className="text-[10px] text-emerald-400 mt-1 block">
                      Auto-appends DO Due Charges directly to client's final invoice.
                    </span>
                  )}
                </div>
              </div>

              {/* Global Financial Rule: DO Deposit */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">DO Security Deposit</span>
                  <div className="flex rounded-xl bg-slate-800 p-1 border border-white/10">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, doDepositArrangedBy: 'Client' })}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        formData.doDepositArrangedBy === 'Client' ? 'bg-brand-600 text-white shadow' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Arranged by Client
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, doDepositArrangedBy: 'DPL' })}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        formData.doDepositArrangedBy === 'DPL' ? 'bg-emerald-600 text-white shadow' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Arranged by DPL
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-gray-400 block mb-1">Deposit Amount (PKR)</label>
                    <input 
                      type="number"
                      value={formData.doDepositAmount || ''}
                      onChange={(e) => setFormData({ ...formData, doDepositAmount: Number(e.target.value) })}
                      placeholder="0"
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>

                  {formData.doDepositArrangedBy === 'DPL' && (
                    <div className="animate-fade-in">
                      <label className="text-emerald-400 font-bold block mb-1 flex items-center gap-1">
                        <Sparkles size={13} /> DPL Commission Amount (Compulsory)
                      </label>
                      <input 
                        type="number"
                        value={formData.doDepositCommission || ''}
                        onChange={(e) => setFormData({ ...formData, doDepositCommission: Number(e.target.value) })}
                        placeholder="e.g. 3000"
                        className="w-full bg-emerald-950/40 border border-emerald-500/50 rounded-xl px-3 py-2 text-emerald-200 font-mono font-bold"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: TP FILING */}
          {stepIndex === 1 && (
            <div className="space-y-4">
              {/* TP/GD Print Document Upload */}
              <WorkflowMultiUploader
                label="Customs TP / GD Print Document"
                sublabel="Upload customs transit permit or goods declaration (Supports multi-page, camera capture, replace & remove)"
                urlField="tpGdPrintUrl"
                nameField="tpGdPrintName"
                formData={formData}
                setFormData={setFormData}
                onPreview={setActivePdfPreview}
              />

              {/* Number & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-300 block mb-1.5">TP / GD Reference Number</label>
                  <input 
                    type="text"
                    value={formData.tpGdNumber}
                    onChange={(e) => setFormData({ ...formData, tpGdNumber: e.target.value, referenceNo: e.target.value })}
                    placeholder="e.g. KPT-TP-2024-998"
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-300 block mb-1.5">TP Filing Date</label>
                  <input 
                    type="date"
                    value={formData.tpFilingDate}
                    onChange={(e) => setFormData({ ...formData, tpFilingDate: e.target.value, date: e.target.value })}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              {/* Item Description */}
              <div>
                <label className="font-semibold text-gray-300 block mb-1.5">Item Description as per TP/GD</label>
                <textarea 
                  value={formData.tpItemDescription}
                  onChange={(e) => setFormData({ ...formData, tpItemDescription: e.target.value })}
                  placeholder="Enter goods description, packaging count, HS codes, or cargo specifications as stated on the TP/GD document..."
                  rows={3}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl p-3 text-white placeholder-gray-500"
                />
              </div>

              {/* Filing Entity Toggle */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white text-sm block">Filing Entity</span>
                  <span className="text-gray-400 text-[11px]">Select whether TP was filed by the client or DPL customs brokerage</span>
                </div>
                <div className="flex rounded-xl bg-slate-800 p-1 border border-white/10">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tpFilingEntity: 'Client' })}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      formData.tpFilingEntity === 'Client' ? 'bg-brand-600 text-white shadow' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Filed by Client
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tpFilingEntity: 'DPL' })}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      formData.tpFilingEntity === 'DPL' ? 'bg-emerald-600 text-white shadow' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Filed by DPL
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: EXCISE PAYMENT */}
          {stepIndex === 2 && (
            <div className="space-y-4">
              {/* Payment Entity Handled By (Client vs DPL) */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white text-sm block">Excise Payment Handled By</span>
                  <span className="text-[11px] text-gray-400">
                    {formData.exciseHandledBy === 'DPL' 
                      ? 'Arranged by DPL: Auto-appends excise amount to final client invoice' 
                      : 'Arranged by Client: Expense not billed to invoice'}
                  </span>
                </div>
                <div className="flex rounded-xl bg-slate-800 p-1 border border-white/10">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, exciseHandledBy: 'Client' })}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      (formData.exciseHandledBy || 'Client') === 'Client' ? 'bg-brand-600 text-white shadow' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Paid by Client
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, exciseHandledBy: 'DPL' })}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      formData.exciseHandledBy === 'DPL' ? 'bg-emerald-600 text-white shadow' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Paid by DPL
                  </button>
                </div>
              </div>

              {/* Payment Receipt */}
              <WorkflowMultiUploader
                label="Excise Payment Receipt"
                sublabel="Upload bank challan / provincial excise receipt (Supports multi-page, camera capture, replace & remove)"
                urlField="exciseReceiptUrl"
                nameField="exciseReceiptName"
                formData={formData}
                setFormData={setFormData}
                onPreview={setActivePdfPreview}
              />

              {/* Excise Amount & Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-300 block mb-1.5">Excise Paid Amount (PKR)</label>
                  <input 
                    type="number"
                    value={formData.exciseAmount || ''}
                    onChange={(e) => setFormData({ ...formData, exciseAmount: Number(e.target.value) })}
                    placeholder="e.g. 4500"
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-300 block mb-1.5">Excise Challan / Reference No.</label>
                  <input 
                    type="text"
                    value={formData.exciseReferenceNo}
                    onChange={(e) => setFormData({ ...formData, exciseReferenceNo: e.target.value, referenceNo: e.target.value })}
                    placeholder="e.g. EXC-SND-99210"
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              {/* Mandatory Pakistan Administrative Region */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-amber-400 block mb-1.5 flex items-center gap-1.5">
                    <MapPin size={13} /> Excise Administrative Region (Mandatory)
                  </label>
                  <select 
                    value={formData.exciseRegion}
                    onChange={(e) => setFormData({ ...formData, exciseRegion: e.target.value })}
                    className="w-full bg-slate-800 border border-amber-500/40 rounded-xl px-3 py-2 text-white font-semibold focus:border-amber-400 focus:outline-none"
                  >
                    {PAKISTAN_REGIONS.map(reg => (
                      <option key={reg} value={reg} className="bg-slate-900 text-white">
                        {reg}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-gray-300 block mb-1.5">Excise Payment Date</label>
                  <input 
                    type="date"
                    value={formData.excisePaymentDate}
                    onChange={(e) => setFormData({ ...formData, excisePaymentDate: e.target.value, date: e.target.value })}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: WHARFAGE PAYMENT */}
          {stepIndex === 3 && (
            <div className="space-y-4">
              {/* Wharfage Receipt at the top */}
              <WorkflowMultiUploader
                label="Wharfage Terminal Receipt"
                sublabel="Upload port/terminal wharfage payment voucher (Supports multi-page, camera capture, replace & remove)"
                urlField="wharfageReceiptUrl"
                nameField="wharfageReceiptName"
                formData={formData}
                setFormData={setFormData}
                onPreview={setActivePdfPreview}
              />

              {/* Receipt Details & Payment Entity */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">Wharfage Payment Particulars</span>
                  <div className="flex rounded-xl bg-slate-800 p-1 border border-white/10">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, wharfagePaymentEntity: 'Client' })}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        formData.wharfagePaymentEntity === 'Client' ? 'bg-brand-600 text-white shadow' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Paid by Client
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, wharfagePaymentEntity: 'DPL' })}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        formData.wharfagePaymentEntity === 'DPL' ? 'bg-emerald-600 text-white shadow' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Paid by DPL
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-gray-400 block mb-1">Wharfage Paid Amount (PKR)</label>
                    <input 
                      type="number"
                      value={formData.wharfageAmount || ''}
                      onChange={(e) => setFormData({ ...formData, wharfageAmount: Number(e.target.value) })}
                      placeholder="0"
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 block mb-1">Receipt Date</label>
                    <input 
                      type="date"
                      value={formData.wharfageReceiptDate}
                      onChange={(e) => setFormData({ ...formData, wharfageReceiptDate: e.target.value, date: e.target.value })}
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                </div>

                {formData.wharfagePaymentEntity === 'DPL' && (
                  <div className="animate-fade-in pt-2 border-t border-white/5">
                    <label className="text-emerald-400 font-bold block mb-1 flex items-center gap-1">
                      <Sparkles size={13} /> DPL Commission Amount (Compulsory)
                    </label>
                    <input 
                      type="number"
                      value={formData.wharfageCommission || ''}
                      onChange={(e) => setFormData({ ...formData, wharfageCommission: Number(e.target.value) })}
                      placeholder="e.g. 2500"
                      className="w-full bg-emerald-950/40 border border-emerald-500/50 rounded-xl px-3 py-2 text-emerald-200 font-mono font-bold"
                    />
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      Auto-appends wharfage payment + commission into client billable invoice.
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 5: VEHICLE ASSIGNMENT */}
          {stepIndex === 4 && (
            <div className="space-y-4">
              {/* Vehicle Registration & DB Verification */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-white text-sm flex items-center gap-2">
                    <Truck size={16} className="text-brand-400" />
                    <span>Vehicle Identification & DB Verification</span>
                  </label>
                  {matchedVehicle ? (
                    <span className="text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <CheckCircle2 size={12} /> Database Verified Profile
                    </span>
                  ) : (
                    <span className="text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-medium">
                      Unregistered / Missing Docs
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <input 
                    type="text"
                    value={formData.assignedVehicleNo}
                    onChange={(e) => setFormData({ ...formData, assignedVehicleNo: e.target.value })}
                    placeholder="Enter Registration Number (e.g. KLA-992 / TLX-334)..."
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono font-bold uppercase tracking-wider"
                  />

                  {/* Suggest existing vehicles */}
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[10px] text-gray-500 py-1">Quick Select:</span>
                    {allVehicles.slice(0, 5).map(v => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, assignedVehicleNo: v.registrationNumber })}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-gray-300 font-mono border border-white/5"
                      >
                        {v.registrationNumber}
                      </button>
                    ))}
                  </div>
                </div>

                {/* If matched in DB, show verified particulars */}
                {matchedVehicle && (
                  <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <span className="text-gray-400 block">Make / Model:</span>
                      <span className="text-white font-semibold">{matchedVehicle.makeModel || 'Carrier'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Category:</span>
                      <span className="text-white font-semibold">{matchedVehicle.category}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Tax Token Expiry:</span>
                      <span className="text-amber-300 font-mono">{matchedVehicle.validationExpiryDate || 'Valid'}</span>
                    </div>
                  </div>
                )}

                {/* Compulsory Lock: If documents missing in DB, enforce compulsory upload */}
                {(!matchedVehicle || !matchedVehicle.registrationBook) && (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                    <div className="flex items-start gap-2 text-amber-300">
                      <Lock size={15} className="shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-xs">Compulsory Vehicle Document Lock</p>
                        <p className="text-[11px] text-amber-200/80">
                          This vehicle does not have registration documents on file. You MUST upload the Registration Book and Owner CNIC to advance this step.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <WorkflowMultiUploader
                        label="Registration Book *"
                        sublabel="Vehicle registration book document"
                        urlField="registrationBookUrl"
                        nameField="registrationBookName"
                        required={true}
                        compact={true}
                        formData={formData}
                        setFormData={setFormData}
                        onPreview={setActivePdfPreview}
                      />

                      <WorkflowMultiUploader
                        label="Owner CNIC *"
                        sublabel="Vehicle owner CNIC document"
                        urlField="ownerCnicUrl"
                        nameField="ownerCnicName"
                        required={true}
                        compact={true}
                        formData={formData}
                        setFormData={setFormData}
                        onPreview={setActivePdfPreview}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Driver Information & Compulsory Dual-Sided CNIC */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
                <label className="font-bold text-white text-sm block">Driver Particulars & Verification</label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-gray-400 block mb-1">Driver Full Name</label>
                    <input 
                      type="text"
                      value={formData.driverName}
                      onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                      placeholder="e.g. Muhammad Ramzan"
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 block mb-1">Driver CNIC Number</label>
                    <input 
                      type="text"
                      value={formData.driverCnic}
                      onChange={(e) => setFormData({ ...formData, driverCnic: e.target.value })}
                      placeholder="e.g. 42101-1234567-1"
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>
                </div>

                {/* Dual-Sided CNIC Compulsory Uploads */}
                <div className="space-y-3 pt-1">
                  <span className="text-gray-300 font-semibold block text-xs">
                    Driver CNIC (Dual-Sided Compulsory Upload with Multi-Page & Camera Support)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <WorkflowMultiUploader
                      label="Driver CNIC Front Side"
                      sublabel="Upload or take photo of CNIC front"
                      urlField="driverCnicFrontUrl"
                      nameField="driverCnicFrontName"
                      required={true}
                      allowCamera={true}
                      compact={true}
                      formData={formData}
                      setFormData={setFormData}
                      onPreview={setActivePdfPreview}
                    />

                    <WorkflowMultiUploader
                      label="Driver CNIC Back Side"
                      sublabel="Upload or take photo of CNIC back"
                      urlField="driverCnicBackUrl"
                      nameField="driverCnicBackName"
                      required={true}
                      allowCamera={true}
                      compact={true}
                      formData={formData}
                      setFormData={setFormData}
                      onPreview={setActivePdfPreview}
                    />
                  </div>
                </div>

                {/* Optional Driving License Document */}
                <div className="pt-1">
                  <WorkflowMultiUploader
                    label="Driving License Document (Optional)"
                    sublabel="Attach heavy vehicle license or capture with camera"
                    urlField="driverLicenseUrl"
                    nameField="driverLicenseName"
                    allowCamera={true}
                    formData={formData}
                    setFormData={setFormData}
                    onPreview={setActivePdfPreview}
                  />
                </div>
              </div>

              {/* Vehicle Rent & Arrangement */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">Vehicle Rent / Freight</span>
                  <div className="flex rounded-xl bg-slate-800 p-1 border border-white/10">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, vehicleRentArrangedBy: 'Client' })}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        formData.vehicleRentArrangedBy === 'Client' ? 'bg-brand-600 text-white shadow' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Arranged by Client
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, vehicleRentArrangedBy: 'DPL' })}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        formData.vehicleRentArrangedBy === 'DPL' ? 'bg-emerald-600 text-white shadow' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Arranged by DPL
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-gray-400 block mb-1">Rent Amount (PKR)</label>
                    <input 
                      type="number"
                      value={formData.vehicleRentAmount || ''}
                      onChange={(e) => setFormData({ ...formData, vehicleRentAmount: Number(e.target.value) })}
                      placeholder="e.g. 125000"
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>

                  {formData.vehicleRentArrangedBy === 'DPL' && (
                    <div className="animate-fade-in">
                      <label className="text-emerald-400 font-bold block mb-1 flex items-center gap-1">
                        <Sparkles size={13} /> DPL Commission Amount (Compulsory)
                      </label>
                      <input 
                        type="number"
                        value={formData.vehicleRentCommission || ''}
                        onChange={(e) => setFormData({ ...formData, vehicleRentCommission: Number(e.target.value) })}
                        placeholder="e.g. 7500"
                        className="w-full bg-emerald-950/40 border border-emerald-500/50 rounded-xl px-3 py-2 text-emerald-200 font-mono font-bold"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: LOADING PORT PROCESSING */}
          {stepIndex === 5 && (
            <div className="space-y-4">
              {/* Media & Document Uploads */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                <label className="font-bold text-white text-sm block">Media & Document Uploads</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <WorkflowMultiUploader
                    label="Vehicle Photo at Port"
                    sublabel="Upload or take photo of container loaded on trailer"
                    urlField="vehiclePhotoUrl"
                    nameField="vehiclePhotoName"
                    allowCamera={true}
                    compact={true}
                    formData={formData}
                    setFormData={setFormData}
                    onPreview={setActivePdfPreview}
                  />

                  <WorkflowMultiUploader
                    label="Port Gate Pass"
                    sublabel="Upload or scan gate pass slip"
                    urlField="portGatePassUrl"
                    nameField="portGatePassName"
                    compact={true}
                    formData={formData}
                    setFormData={setFormData}
                    onPreview={setActivePdfPreview}
                  />
                </div>
              </div>

              {/* Tracker Device Module */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white text-sm block">Tracker Device Module</span>
                    <span className="text-gray-400 text-[11px]">GPS tracking unit installation & arrangement</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ 
                      ...formData, 
                      trackerStatus: formData.trackerStatus === 'Installed' ? 'Not Installed' : 'Installed' 
                    })}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-all ${
                      formData.trackerStatus === 'Installed'
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-white/5 border-white/10 text-gray-400'
                    }`}
                  >
                    {formData.trackerStatus === 'Installed' ? '✓ Installed' : 'Not Installed'}
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-gray-300 font-medium">Tracker Arranged By:</span>
                  <div className="flex rounded-xl bg-slate-800 p-1 border border-white/10">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, trackerArrangedBy: 'Client' })}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                        formData.trackerArrangedBy === 'Client' ? 'bg-brand-600 text-white' : 'text-gray-400'
                      }`}
                    >
                      Client
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, trackerArrangedBy: 'DPL' })}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                        formData.trackerArrangedBy === 'DPL' ? 'bg-emerald-600 text-white' : 'text-gray-400'
                      }`}
                    >
                      DPL
                    </button>
                  </div>
                </div>

                {formData.trackerArrangedBy === 'DPL' && (
                  <div className="pt-2 animate-fade-in">
                    <label className="text-gray-400 block mb-1 text-xs">Tracker Cost (PKR)</label>
                    <input 
                      type="number"
                      value={formData.trackerAmount || ''}
                      onChange={(e) => setFormData({ ...formData, trackerAmount: Number(e.target.value) })}
                      placeholder="e.g. 15000"
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-sm"
                    />
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      Tracker Cost is appended directly to client's invoice (no commission added).
                    </span>
                  </div>
                )}
              </div>

              {/* Loading Charges Module (Moved from Step 4) */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white text-sm block">Loading Charges Module</span>
                    <span className="text-gray-400 text-[11px]">Crane & container lifter charges (Karachi Port)</span>
                  </div>
                  <div className="flex rounded-xl bg-slate-800 p-1 border border-white/10">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, loadingChargesArrangedBy: 'Client' })}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                        formData.loadingChargesArrangedBy === 'Client' ? 'bg-brand-600 text-white' : 'text-gray-400'
                      }`}
                    >
                      Client
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, loadingChargesArrangedBy: 'DPL' })}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                        formData.loadingChargesArrangedBy === 'DPL' ? 'bg-emerald-600 text-white' : 'text-gray-400'
                      }`}
                    >
                      DPL
                    </button>
                  </div>
                </div>

                {formData.loadingChargesArrangedBy === 'DPL' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 animate-fade-in">
                    <div>
                      <label className="text-gray-400 block mb-1">Loading Amount (PKR)</label>
                      <input 
                        type="number"
                        value={formData.loadingChargesAmount || ''}
                        onChange={(e) => setFormData({ ...formData, loadingChargesAmount: Number(e.target.value) })}
                        placeholder="e.g. 6000"
                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-emerald-400 font-bold block mb-1">DPL Commission (Compulsory)</label>
                      <input 
                        type="number"
                        value={formData.loadingChargesCommission || ''}
                        onChange={(e) => setFormData({ ...formData, loadingChargesCommission: Number(e.target.value) })}
                        placeholder="e.g. 1500"
                        className="w-full bg-emerald-950/40 border border-emerald-500/50 rounded-xl px-3 py-2 text-emerald-200 font-mono font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Verification Slips & Customs Seal Capture */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                <label className="font-bold text-white text-sm block">Verification Slips & Customs Seal</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <WorkflowMultiUploader
                    label="Port Weight Slip"
                    sublabel="Official port weighbridge scale slip"
                    urlField="weightSlipUrl"
                    nameField="weightSlipName"
                    allowCamera={true}
                    compact={true}
                    formData={formData}
                    setFormData={setFormData}
                    onPreview={setActivePdfPreview}
                  />

                  <WorkflowMultiUploader
                    label="Seal Slip"
                    sublabel="Customs or port seal verification slip"
                    urlField="sealSlipUrl"
                    nameField="sealSlipName"
                    allowCamera={true}
                    compact={true}
                    formData={formData}
                    setFormData={setFormData}
                    onPreview={setActivePdfPreview}
                  />
                </div>

                {/* Customs Seal Photo & Mandatory Customs Seal Number */}
                <div className="p-4 rounded-xl border border-white/10 bg-slate-800/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-white font-semibold text-xs block">Customs Container Seal Verification</span>
                      <span className="text-[11px] text-amber-400 font-medium">Both Seal Photo & Customs Seal Number are mandatory</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <WorkflowMultiUploader
                      label="Customs Seal Photo"
                      sublabel="Capture or upload high-res photo of container seal"
                      urlField="customsSealPhotoUrl"
                      nameField="customsSealPhotoName"
                      required={true}
                      allowCamera={true}
                      compact={true}
                      formData={formData}
                      setFormData={setFormData}
                      onPreview={setActivePdfPreview}
                    />

                    <div>
                      <label className="text-gray-300 text-xs font-semibold block mb-1">
                        Customs Seal Number (Mandatory)
                      </label>
                      <input 
                        type="text"
                        value={formData.customsSealNumber || ''}
                        onChange={(e) => setFormData({ ...formData, customsSealNumber: e.target.value })}
                        placeholder="e.g. PK-KPT-89421"
                        className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-brand-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Gate Out Verification & Completion Criteria */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white text-sm block">Gate Out Verification (Completion Requirement)</span>
                    <span className="text-amber-200/80 text-[11px]">Step 6 marks completed only when Gate Out and Driver Live Photo are verified</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, gateOutToggled: !formData.gateOutToggled })}
                    className={`px-3.5 py-1.5 rounded-xl font-bold text-xs border transition-all ${
                      formData.gateOutToggled
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                        : 'bg-slate-800 text-gray-400 border-white/10'
                    }`}
                  >
                    {formData.gateOutToggled ? '✓ Gate Out Confirmed' : 'Mark Gate Out'}
                  </button>
                </div>

                <div className="pt-1">
                  <WorkflowMultiUploader
                    label="Driver Live Picture at Gate Out *"
                    sublabel="Capture or upload live verification photo of driver passing gate out (Camera or multi-file supported)"
                    urlField="driverGateOutPhotoUrl"
                    nameField="driverGateOutPhotoName"
                    required={true}
                    allowCamera={true}
                    formData={formData}
                    setFormData={setFormData}
                    onPreview={setActivePdfPreview}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: IN TRANSIT & EMERGENCY EXCEPTION */}
          {stepIndex === 6 && (
            <div className="space-y-5">
              {/* Motion Feature: Animated Transport Carrier */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-blue-500/30 relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping"></div>
                    <span className="font-mono font-bold text-blue-400 uppercase tracking-wider text-xs">
                      Live Transit Telemetry Active
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 font-mono">Route: {targetCase.pol} ➔ {targetCase.pod}</span>
                </div>

                {/* Road & Truck Animation Container */}
                <div className="relative h-20 bg-slate-950/80 rounded-xl border border-white/10 overflow-hidden flex items-center px-4">
                  {/* Road Center Dashed Line */}
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 border-b border-dashed border-white/20"></div>

                  {/* Animated Moving Truck */}
                  <div className="flex items-center gap-2 animate-[pulse_3s_ease-in-out_infinite] transform transition-transform">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500 flex items-center justify-center text-blue-300 shadow-lg shadow-blue-500/20">
                      <Truck size={22} className="animate-bounce" />
                    </div>
                    <div className="bg-slate-900/90 border border-white/10 px-2.5 py-1 rounded-lg">
                      <p className="text-[11px] font-bold text-white font-mono">{formData.assignedVehicleNo || 'CARRIER-FLEET'}</p>
                      <p className="text-[9px] text-emerald-400">GPS Signal Verified • Normal Speed</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Emergency Exception Red Button */}
              <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0">
                    <AlertTriangle size={22} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Emergency Exception & Incident Vault</h4>
                    <p className="text-gray-300 text-[11px] mt-0.5 leading-relaxed">
                      If the carrier vehicle faces an accident, highway police stoppage, customs border seizure, or mechanical breakdown, report immediately to halt normal workflow and relocate this case to the Incident Vault.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowIncidentModal(true)}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-rose-600/30 transition-all active:scale-98"
                >
                  <AlertCircle size={18} />
                  <span>Report Incident / Accident / Stoppage</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 8: DESTINATION PORT ARRIVAL & AUTO COMPLETION */}
          {stepIndex === 7 && (
            <div className="space-y-4">
              {/* Transit Completion Trigger: Port Gate Arrival Picture */}
              <WorkflowMultiUploader
                label="Port Gate Arrival Picture (Step 7 Completion Trigger)"
                sublabel="Capture or upload arrival photo (camera, multi-file supported; automatically marks Step 7 In Transit as Completed)"
                urlField="portGateArrivalPhotoUrl"
                nameField="portGateArrivalPhotoName"
                allowCamera={true}
                formData={formData}
                setFormData={setFormData}
                onPreview={setActivePdfPreview}
                onChange={(url) => {
                  if (url) handleDestinationArrivalPhotoUploaded(url);
                }}
              />

              {/* Destination Port Operations */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">Destination Terminal Operations</span>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, destinationGateInToggled: !formData.destinationGateInToggled })}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all ${
                      formData.destinationGateInToggled
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-white/5 border-white/10 text-gray-400'
                    }`}
                  >
                    {formData.destinationGateInToggled ? '✓ Gate In Recorded' : 'Mark Gate In'}
                  </button>
                </div>

                {/* Destination Customs Seal Verification */}
                <div className="p-4 rounded-xl border border-white/10 bg-slate-800/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-white font-semibold text-xs block">Destination Customs Seal Verification</span>
                      <span className="text-[11px] text-amber-400 font-medium">Both Seal Photo & Customs Seal Number are mandatory</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <WorkflowMultiUploader
                      label="Secondary Customs Seal Photo"
                      sublabel="Capture or upload intact seal photo"
                      urlField="secondaryCustomsSealPhotoUrl"
                      nameField="secondaryCustomsSealPhotoName"
                      required={true}
                      allowCamera={true}
                      compact={true}
                      formData={formData}
                      setFormData={setFormData}
                      onPreview={setActivePdfPreview}
                    />

                    <div>
                      <label className="text-gray-300 text-xs font-semibold block mb-1">
                        Customs Seal Number (Mandatory)
                      </label>
                      <input 
                        type="text"
                        value={formData.secondaryCustomsSealNumber || ''}
                        onChange={(e) => setFormData({ ...formData, secondaryCustomsSealNumber: e.target.value })}
                        placeholder="e.g. PK-DEST-89421"
                        className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-brand-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <WorkflowMultiUploader
                    label="Destination Weight Slip"
                    sublabel="Terminal weighbridge slip"
                    urlField="destinationWeightSlipUrl"
                    nameField="destinationWeightSlipName"
                    allowCamera={true}
                    compact={true}
                    formData={formData}
                    setFormData={setFormData}
                    onPreview={setActivePdfPreview}
                  />

                  <WorkflowMultiUploader
                    label="Signed Transport Note"
                    sublabel="Endorsed delivery receipt"
                    urlField="finalSignedTransportNoteUrl"
                    nameField="finalSignedTransportNoteName"
                    allowCamera={true}
                    compact={true}
                    formData={formData}
                    setFormData={setFormData}
                    onPreview={setActivePdfPreview}
                  />

                  <WorkflowMultiUploader
                    label="Dry Port Gate Pass"
                    sublabel="Clearance / entry pass"
                    urlField="dryPortGatePassUrl"
                    nameField="dryPortGatePassName"
                    allowCamera={true}
                    compact={true}
                    formData={formData}
                    setFormData={setFormData}
                    onPreview={setActivePdfPreview}
                  />
                </div>
              </div>

              {/* Vehicle Gate Out & Workflow Termination */}
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white text-sm block">Vehicle Gate Out & Termination</span>
                  <span className="text-emerald-200/80 text-[11px]">
                    Marking Gate Out completes the entire 8-step workflow and auto-generates the final Delivery Order (DO / NOC)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, vehicleGateOutToggled: !formData.vehicleGateOutToggled })}
                  className={`px-4 py-2 rounded-xl font-bold text-xs border transition-all ${
                    formData.vehicleGateOutToggled
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-600/30'
                      : 'bg-slate-800 text-gray-400 border-white/10'
                  }`}
                >
                  {formData.vehicleGateOutToggled ? '✓ Vehicle Gate Out Confirmed' : 'Mark Vehicle Gate Out'}
                </button>
              </div>
            </div>
          )}
            </div>
          )}

          {/* Step Action Selector */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
            <label className="font-bold text-white text-xs uppercase tracking-wider block">
              Workflow Transition Action
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <label className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex flex-col justify-between ${
                stepAction === 'advance' 
                  ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300 shadow-md' 
                  : 'bg-white/[0.02] border-white/10 text-gray-400 hover:bg-white/5'
              }`}>
                <div className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    name="stepAction" 
                    checked={stepAction === 'advance'} 
                    onChange={() => setStepAction('advance')}
                    className="accent-emerald-500"
                  />
                  <span className="font-bold">Complete & Advance</span>
                </div>
                <span className="text-[10px] text-gray-400 mt-1">Mark complete and advance to next stage</span>
              </label>

              <label className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex flex-col justify-between ${
                stepAction === 'set_current' 
                  ? 'bg-amber-500/15 border-amber-500/60 text-amber-300 shadow-md' 
                  : 'bg-white/[0.02] border-white/10 text-gray-400 hover:bg-white/5'
              }`}>
                <div className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    name="stepAction" 
                    checked={stepAction === 'set_current'} 
                    onChange={() => setStepAction('set_current')}
                    className="accent-amber-500"
                  />
                  <span className="font-bold">Set as Active Stage</span>
                </div>
                <span className="text-[10px] text-gray-400 mt-1">Make this the current working stage</span>
              </label>

              <label className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex flex-col justify-between ${
                stepAction === 'keep' 
                  ? 'bg-blue-500/15 border-blue-500/60 text-blue-300 shadow-md' 
                  : 'bg-white/[0.02] border-white/10 text-gray-400 hover:bg-white/5'
              }`}>
                <div className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    name="stepAction" 
                    checked={stepAction === 'keep'} 
                    onChange={() => setStepAction('keep')}
                    className="accent-blue-500"
                  />
                  <span className="font-bold">Save Data Only</span>
                </div>
                <span className="text-[10px] text-gray-400 mt-1">Update fields without modifying stage</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-950/70 flex justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-brand-600/30 flex items-center gap-2"
          >
            <Save size={15} />
            <span>Save Step Details</span>
          </button>
        </div>
      </div>

      {/* Incident / Stoppage Modal */}
      {showIncidentModal && (
        <div className="fixed inset-0 bg-black/85 z-[130] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertCircle size={28} />
              <div>
                <h3 className="text-lg font-black text-white">Report Transit Incident / Stoppage</h3>
                <p className="text-xs text-gray-400">Case will be moved immediately into the Incident Vault</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-300 block mb-1">Reason / Incident Description *</label>
                <textarea 
                  value={incidentForm.reason}
                  onChange={(e) => setIncidentForm({ ...incidentForm, reason: e.target.value })}
                  placeholder="e.g. Engine breakdown near Hyderabad, Highway Police seal verification hold, or container seal discrepancy..."
                  rows={3}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl p-3 text-white placeholder-gray-500 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-300 block mb-1">Current Stoppage Location</label>
                  <input 
                    type="text"
                    value={incidentForm.location}
                    onChange={(e) => setIncidentForm({ ...incidentForm, location: e.target.value })}
                    placeholder="e.g. M-9 Motorway Milepost 74"
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-300 block mb-1">Incident Date</label>
                  <input 
                    type="date"
                    value={incidentForm.date}
                    onChange={(e) => setIncidentForm({ ...incidentForm, date: e.target.value })}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-300 block mb-1">Emergency On-Ground Contact</label>
                <input 
                  type="text"
                  value={incidentForm.contact}
                  onChange={(e) => setIncidentForm({ ...incidentForm, contact: e.target.value })}
                  placeholder="e.g. Driver Cell: 0300-1234567 / Highway Patrol Unit"
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowIncidentModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTriggerIncident}
                className="bg-rose-600 hover:bg-rose-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-rose-600/30 flex items-center gap-1.5"
              >
                <AlertCircle size={15} />
                <span>Move Case to Incident Vault</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF / Document Viewer Modal */}
      {activePdfPreview && (
        <PdfViewerModal
          isOpen={!!activePdfPreview}
          pdfUrl={activePdfPreview.url}
          title={activePdfPreview.title}
          filename={activePdfPreview.title || 'document.pdf'}
          onClose={() => setActivePdfPreview(null)}
        />
      )}
    </div>
  );
};
