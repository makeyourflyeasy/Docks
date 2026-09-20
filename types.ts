
export enum UserRole {
  ADMIN = 'ADMIN',
  CEO = 'CEO',
  OPERATIONS_MANAGER = 'OPERATIONS_MANAGER',
  FINANCE_MANAGER = 'FINANCE_MANAGER',
  CRO = 'CRO',
  ACCOUNTANT = 'ACCOUNTANT',
  HR_MANAGER = 'HR_MANAGER',
  LOADING_PORT_STAFF = 'LOADING_PORT_STAFF',
  UNLOADING_PORT_STAFF = 'UNLOADING_PORT_STAFF',
  VEHICLE_MANAGER = 'VEHICLE_MANAGER',
  DOCUMENTATION_OFFICER = 'DOCUMENTATION_OFFICER',
  TRANSPORT_ALLOCATION_OFFICER = 'TRANSPORT_ALLOCATION_OFFICER',
  DATA_ENTRY_OFFICER = 'DATA_ENTRY_OFFICER',
  CUSTOMER_SUPPORT = 'CUSTOMER_SUPPORT',
  RIDER = 'RIDER',
  PEON = 'PEON',
  SWEEPER = 'SWEEPER',
  WATCHMAN = 'WATCHMAN',
  CLIENT = 'CLIENT',
  TRANSPORTER = 'TRANSPORTER'
}

export enum CaseStatus {
  SHIPPING_LINE_DO = 'Shipping Line DO',
  TP_FILING = 'TP Filing',
  EXCISE_PAYMENT = 'Excise Payment',
  WHARFAGE_PAYMENT = 'Wharfage Payment',
  VEHICLE_ASSIGNMENT = 'Vehicle Assignment',
  LOADING_PORT_PROCESSING = 'Loading Port Processing',
  IN_TRANSIT = 'In Transit',
  DESTINATION_PORT_ARRIVAL = 'Destination Port Arrival',
  COMPLETED = 'Case Completed',
  INCIDENT_STOPPAGE = 'Incident / Stoppage'
}

export const WORKFLOW_8_STEPS = [
  CaseStatus.SHIPPING_LINE_DO,
  CaseStatus.TP_FILING,
  CaseStatus.EXCISE_PAYMENT,
  CaseStatus.WHARFAGE_PAYMENT,
  CaseStatus.VEHICLE_ASSIGNMENT,
  CaseStatus.LOADING_PORT_PROCESSING,
  CaseStatus.IN_TRANSIT,
  CaseStatus.DESTINATION_PORT_ARRIVAL
] as const;

export const PAKISTAN_REGIONS = [
  'Sindh',
  'Punjab',
  'Khyber Pakhtunkhwa',
  'Balochistan',
  'Islamabad Capital Territory',
  'Gilgit-Baltistan',
  'Azad Jammu & Kashmir'
] as const;

export interface Container {
  id: number;
  number: string;
  size: '20ft' | '40ft' | '45ft';
  weight: number;
  sealNo?: string;
  vehicleNo?: string;
  driverName?: string;
  driverContact?: string;
  driverCnic?: string;
  sealPhoto?: string;
  platePhoto?: string;
  driverPhoto?: string;
  status: 'Pending' | 'Loaded' | 'In Transit' | 'Delivered';
}

export interface ExtractedData {
  shipperName?: string;
  shipperAddress?: string;
  shipperContact?: string;
  shipperEmail?: string;
  shipperCountry?: string;
  consigneeName?: string;
  consigneeAddress?: string;
  consigneeContact?: string;
  consigneeEmail?: string;
  shippingAgent?: string;
  shippingLine?: string;
  blNumber?: string;
  blDate?: string;
  pol?: string;
  pod?: string;
  placeOfDelivery?: string;
  voyageNo?: string;
  freightTerms?: string;
  freeDays?: string;
  notifyPartyName?: string;
  notifyPartyAddress?: string;
  // Commercial Invoice
  invoiceNo?: string;
  invoiceDate?: string;
  invoiceValue?: number;
  invoiceCurrency?: string;
  incoTerms?: string;
  // Packing List & Specs
  packageCount?: number;
  packagingType?: string;
  totalWeight?: number;
  grossWeight?: number;
  netWeight?: number;
  volumeCBM?: number;
  // Customs & Manifest Details
  gdNo?: string;
  gdNumber?: string;
  tpNumber?: string;
  gdDate?: string;
  vesselName?: string;
  igmNo?: string;
  igmDate?: string;
  indexNo?: string;
  arrivalDate?: string;
  itemType?: string;
  itemName?: string;
  itemDescription?: string;
  hsCode?: string;
  docCategoryDetected?: string;
  containerNo?: string;
  containerSize?: string;
  sealNo?: string;
  // Pakistan Customs & International Logistics Regulatory Fields
  gdType?: string; // 'TP Filing', 'Afghan Transit (ATT)', 'Home Consumption (GD-HC)', 'Into-Bond (GD-IB)', 'Ex-Bond (GD-EB)', 'Export (GD-EXP)', 'TIR Carnet'
  ntnNumber?: string; // Importer / Client NTN
  strnNumber?: string; // Sales Tax Registration No
  pswUserId?: string; // Pakistan Single Window / WeBOC User ID
  appraisingGroup?: string; // Group I to VIII
  jawaznamaNo?: string; // Afghan Business License for Afghan Transit Trade
  trackerId?: string; // FBR Authorized Satellite Tracking ID / E-Seal
  carrierBondNo?: string; // Customs Bond / Revolving Insurance Guarantee No
  customsSealNo?: string; // Customs Bullet/Wire Seal
  tirCarnetNo?: string; // TIR Carnet No
  hazmatClass?: string; // IMO / UN Hazmat Class for ISO Tank
  routePermitNo?: string; // NHA Axle Load / Route Permit
  chassisNumbers?: string; // VIN / Chassis for Car Carrier
  currency?: string; // PKR, USD, EUR
  // Private Cargo Specific Fields
  pickupDestination?: string; // Loading / Pick up location
  dropoffDestination?: string; // Delivery / Drop off destination
  cargoOwner?: string; // Cargo Owner / Sender Name
  cargoOwnerContact?: string; // Cargo Owner Phone
  cargoOwnerCnic?: string; // Cargo Owner CNIC / NTN
  builtyNumber?: string; // Bilty / Consignment Note No
  builtyDate?: string; // Bilty Date
  vehicleNumber?: string; // Vehicle / Truck Registration
  driverName?: string; // Driver Name
  driverContact?: string; // Driver Mobile Number
  driverCnic?: string; // Driver CNIC
  paymentTerms?: string; // Paid / To-Pay / Advance / COD
}

export interface CaseCharge {
  id?: string;
  category?: string;
  description: string;
  amount: number;
  taxable?: boolean;
  notes?: string;
  receiptUrl?: string;
  receiptName?: string;
  syncKey?: string;
  arrangedBy?: 'DPL' | 'Client';
}

export interface CaseServiceArrangement {
  key: string;
  label: string;
  arrangedBy: 'DPL' | 'Client';
  amount: number;
  category?: string;
}

export interface MockDocument {
  name: string;
  url: string;
  type: string;
}

export interface CompanyDocument {
  id: string;
  title: string;
  url: string;
  fileType: 'IMAGE' | 'PDF';
  uploadDate: string;
  unlimitedValidity: boolean;
  expiryDate?: string;
  isExpired?: boolean;
}

export interface StepFileItem {
  id: string;
  url: string;
  name: string;
  type?: 'image' | 'pdf' | 'document';
  uploadedAt?: string;
}

export interface CaseStepDetail {
  status: string;
  completed?: boolean;
  date?: string;
  officer?: string;
  remarks?: string;
  referenceNo?: string;
  updatedAt?: string;
  multiFiles?: Record<string, StepFileItem[]>;

  // Step 1: Shipping Line DO
  doReceiptUrl?: string;
  doReceiptName?: string;
  doReferenceNo?: string;
  doIssueDate?: string;
  doDueChargesArrangedBy?: 'Client' | 'DPL';
  doDueChargesAmount?: number;
  doDueChargesCommission?: number;
  doDepositArrangedBy?: 'Client' | 'DPL';
  doDepositAmount?: number;
  doDepositCommission?: number;

  // Step 2: TP Filing
  tpGdPrintUrl?: string;
  tpGdPrintName?: string;
  tpGdNumber?: string;
  tpFilingDate?: string;
  tpItemDescription?: string;
  tpFilingEntity?: 'Client' | 'DPL';

  // Step 3: Excise Payment
  exciseReceiptUrl?: string;
  exciseReceiptName?: string;
  exciseAmount?: number;
  exciseReferenceNo?: string;
  exciseRegion?: string;
  excisePaymentDate?: string;
  exciseHandledBy?: 'Client' | 'DPL';

  // Step 4: Wharfage Payment
  wharfageReceiptUrl?: string;
  wharfageReceiptName?: string;
  wharfageReceiptDate?: string;
  wharfageAmount?: number;
  wharfagePaymentEntity?: 'Client' | 'DPL';
  wharfageCommission?: number;

  // Step 5: Vehicle Assignment
  assignedVehicleNo?: string;
  vehicleVerifiedInDb?: boolean;
  registrationBookUrl?: string;
  registrationBookName?: string;
  ownerCnicUrl?: string;
  ownerCnicName?: string;
  taxRenewalDate?: string;
  taxExpiryDate?: string;
  driverName?: string;
  driverCnic?: string;
  driverCnicFrontUrl?: string;
  driverCnicFrontName?: string;
  driverCnicBackUrl?: string;
  driverCnicBackName?: string;
  driverLicenseUrl?: string;
  driverLicenseName?: string;
  vehicleRentAmount?: number;
  vehicleRentArrangedBy?: 'Client' | 'DPL';
  vehicleRentCommission?: number;

  // Step 6: Loading Port Processing
  vehiclePhotoUrl?: string;
  vehiclePhotoName?: string;
  portGatePassUrl?: string;
  portGatePassName?: string;
  trackerStatus?: 'Installed' | 'Not Installed';
  trackerArrangedBy?: 'Client' | 'DPL';
  trackerAmount?: number;
  trackerCommission?: number;
  loadingChargesArrangedBy?: 'Client' | 'DPL';
  loadingChargesAmount?: number;
  loadingChargesCommission?: number;
  weightSlipUrl?: string;
  weightSlipName?: string;
  sealSlipUrl?: string;
  sealSlipName?: string;
  customsSealPhotoUrl?: string;
  customsSealPhotoName?: string;
  customsSealNumber?: string;
  gateOutToggled?: boolean;
  driverGateOutPhotoUrl?: string;
  driverGateOutPhotoName?: string;

  // Step 7: In Transit & Emergency Exception
  inTransitActive?: boolean;
  incidentReported?: boolean;
  incidentReason?: string;
  incidentDate?: string;
  incidentLocation?: string;
  incidentRemarks?: string;

  // Step 8: Destination Port Arrival
  portGateArrivalPhotoUrl?: string;
  portGateArrivalPhotoName?: string;
  destinationGateInToggled?: boolean;
  secondaryCustomsSealPhotoUrl?: string;
  secondaryCustomsSealPhotoName?: string;
  secondaryCustomsSealNumber?: string;
  destinationWeightSlipUrl?: string;
  destinationWeightSlipName?: string;
  finalSignedTransportNoteUrl?: string;
  finalSignedTransportNoteName?: string;
  dryPortGatePassUrl?: string;
  dryPortGatePassName?: string;
  vehicleGateOutToggled?: boolean;

  // Category 2: Customs Clearance
  blDocUrl?: string;
  blDocName?: string;
  commercialInvoiceUrl?: string;
  commercialInvoiceName?: string;
  packingListUrl?: string;
  packingListName?: string;
  webocAccessStatus?: 'Active' | 'Pending' | 'Suspended' | 'Authorized';
  customsGdNumber?: string;
  customsGdFilingDate?: string;
  dutyTaxesAssessmentAmount?: number;
  dutyTaxesPaymentStatus?: 'Paid by Client' | 'Paid by DPL';
  dutyTaxesCommission?: number;
  examinationStatus?: 'Satisfactory' | 'Detained';
  labTestReportUrl?: string;
  labTestReportName?: string;
  inspectorEndorsementVerified?: boolean;
  oocDocUrl?: string;
  oocDocName?: string;
  oocNumber?: string;
  oocDate?: string;
  customsDoIssuanceUrl?: string;
  customsDoIssuanceName?: string;
  terminalGatePassUrl?: string;
  terminalGatePassName?: string;
  assignedTruckNo?: string;
  assignedDriverName?: string;
  assignedDriverCnic?: string;
  cargoDispatchConfirmed?: boolean;

  // Category 3: Afghan Transit (ATT)
  attShippingDoUrl?: string;
  attShippingDoName?: string;
  attGdNumber?: string;
  attGdDate?: string;
  attBondNumber?: string;
  attBondDocUrl?: string;
  attBondDocName?: string;
  attBondValidityDate?: string;
  attVehicleNo?: string;
  attDriverName?: string;
  attDriverCnic?: string;
  attTrackerCode?: string;
  attTrackerInstalled?: boolean;
  attGpsMonitoringStatus?: 'Active' | 'Off-Route Alert' | 'Checkpoint Hold';
  attBorderCheckpoint?: 'Torkham' | 'Chaman' | 'Both';
  attCheckpointApproved?: boolean;
  attBorderPassUrl?: string;
  attBorderPassName?: string;
  attAfghanDischargeNocUrl?: string;
  attAfghanDischargeNocName?: string;

  // Category 4: TIR (Transports Internationaux Routiers)
  tirCarnetNumber?: string;
  tirValidityDate?: string;
  tirCarnetValid?: boolean;
  tirGuaranteeStatus?: 'Active / Covered' | 'Pending' | 'Expired';
  tirOriginCustomsOffice?: string;
  tirSealingInspected?: boolean;
  tirSealPhotoUrl?: string;
  tirSealPhotoName?: string;
  tirSealNumber?: string;
  tirVoucherDetachmentNo?: string;
  tirVoucherDetached?: boolean;
  tirInspectionChecklistUrl?: string;
  tirInspectionChecklistName?: string;
  tirSealIntactVerified?: boolean;
  tirDischargeVoucherUrl?: string;
  tirDischargeVoucherName?: string;

  // Category 5: Transportation of Private Cargo
  cargoShipperName?: string;
  cargoShipperContact?: string;
  cargoShipperAddress?: string;
  cargoDescription?: string;
  cargoWeightKg?: number;
  cargoOriginAddress?: string;
  cargoDestinationAddress?: string;
  cargoTruckNo?: string;
  cargoDriverName?: string;
  cargoDriverCnic?: string;
  cargoDriverCnicDocUrl?: string;
  cargoDriverCnicDocName?: string;
  cargoFreightAmount?: number;
  cargoFreightArrangedBy?: 'Client' | 'DPL';
  cargoFreightCommission?: number;
  cargoLoadingPhotoUrl?: string;
  cargoLoadingPhotoName?: string;
  cargoBiltyNumber?: string;
  cargoBiltyGenerated?: boolean;
  cargoTransitStatus?: 'Departed Origin' | 'On Route' | 'Near Destination';
  cargoDriverPhone?: string;
  cargoOffloadingVerified?: boolean;
  cargoPodUrl?: string;
  cargoPodName?: string;

  // Category 6: Car Carrier
  carVinChassisNumbers?: string;
  carPreLoadConditionNotes?: string;
  carAuditPhotosUrl?: string;
  carAuditPhotosName?: string;
  carCarrierTrailerNo?: string;
  carCarrierDeckSlot?: string;
  carLashingLockVerified?: boolean;
  carCarrierFreightAmount?: number;
  carCarrierFreightArrangedBy?: 'Client' | 'DPL';
  carCarrierFreightCommission?: number;
  carTransitStatus?: 'Departed Terminal' | 'En-Route Hub' | 'Approving Checkpoint' | 'Approaching Showroom';
  carUnloadingPhotosUrl?: string;
  carUnloadingPhotosName?: string;
  carFinalInspectionSheetUrl?: string;
  carFinalInspectionSheetName?: string;

  // Category 7: ISO Tank Service
  isoTankNumber?: string;
  isoCleanlinessCertUrl?: string;
  isoCleanlinessCertName?: string;
  isoPressureTestCertUrl?: string;
  isoPressureTestCertName?: string;
  isoChemicalName?: string;
  isoUnNumber?: string;
  isoMsdsVerified?: boolean;
  isoMsdsDocUrl?: string;
  isoMsdsDocName?: string;
  isoLoadingAuthDocUrl?: string;
  isoLoadingAuthDocName?: string;
  isoValveSealPhotoUrl?: string;
  isoValveSealPhotoName?: string;
  isoPressureGaugeBar?: number;
  isoHazmatDriverName?: string;
  isoHazmatDriverLicenseNo?: string;
  isoHazmatVehicleNo?: string;
  isoHazmatCertified?: boolean;
  isoHazmatFreightAmount?: number;
  isoHazmatFreightArrangedBy?: 'Client' | 'DPL';
  isoHazmatFreightCommission?: number;
  isoReceiverEndorsementUrl?: string;
  isoReceiverEndorsementName?: string;
  isoCleanReturnPassUrl?: string;
  isoCleanReturnPassName?: string;

  // Category 8: Liner & NVOCC
  linerMblNumber?: string;
  linerHblNumber?: string;
  linerBookingConfirmationUrl?: string;
  linerBookingConfirmationName?: string;
  linerIgmEgmNumber?: string;
  linerIgmEgmIndexNo?: string;
  linerManifestDate?: string;
  linerArrivalDate?: string;
  linerFreeDaysAllowed?: number;
  linerDailyDemurrageRatePkr?: number;
  linerDemurrageDaysIncurred?: number;
  linerTotalDemurrageAmount?: number;
  linerDemurrageArrangedBy?: 'Client' | 'DPL';
  linerDemurrageCommission?: number;
  linerEmptyDepotReceiptUrl?: string;
  linerEmptyDepotReceiptName?: string;
  linerEquipmentDischargeConfirmed?: boolean;
  linerNocIssuedDate?: string;

  // Category 9: Breakbulk / Chartering Services
  charterPartyDocUrl?: string;
  charterPartyDocName?: string;
  charterVesselName?: string;
  charterBerthNumber?: string;
  charterBerthingNoticeDate?: string;
  marineSurveyReportUrl?: string;
  marineSurveyReportName?: string;
  craneOperatorName?: string;
  craneEquipmentId?: string;
  stevedoringChargesAmount?: number;
  stevedoringChargesArrangedBy?: 'Client' | 'DPL';
  stevedoringChargesCommission?: number;
  tallyPieceCount?: number;
  tallyMetricTonnage?: number;
  tallyDischargeDate?: string;
  tallySheetDocUrl?: string;
  tallySheetDocName?: string;
  breakbulkTrailerPasses?: string;
  breakbulkGatePassIssued?: boolean;

  // Category 10: Warehousing & Distribution
  warehouseGrnNumber?: string;
  warehouseGrnDate?: string;
  warehouseStorageInspected?: boolean;
  warehouseGrnDocUrl?: string;
  warehouseGrnDocName?: string;
  warehouseBayRackCode?: string;
  warehouseInventorySynced?: boolean;
  warehouseHandlingAmount?: number;
  warehouseHandlingArrangedBy?: 'Client' | 'DPL';
  warehouseHandlingCommission?: number;
  warehousePickListNumber?: string;
  warehousePickListItemsCount?: number;
  warehousePickListDocUrl?: string;
  warehousePickListDocName?: string;
  warehousePackingListUrl?: string;
  warehousePackingListName?: string;
  warehouseDeliveryNoteUrl?: string;
  warehouseDeliveryNoteName?: string;
  warehouseGateOutPassNumber?: string;

  // Additional Operational & Sub-Category Aliases
  carChassisNumbers?: string;
  carConditionAuditPhotoUrl?: string;
  carConditionAuditPhotoName?: string;
  carDeckSlot?: string;
  carLashingLocked?: boolean;
  carFreightAmount?: number;
  carFreightCommission?: number;
  carFreightArrangedBy?: 'Client' | 'DPL';
  carTransitProgress?: string;
  carUnloadingPhotoUrl?: string;
  carUnloadingPhotoName?: string;
  carInspectionSheetUrl?: string;
  carInspectionSheetName?: string;

  breakbulkSurveyReportName?: string;
  breakbulkSurveyReportUrl?: string;
  breakbulkCharterDocUrl?: string;
  breakbulkCharterDocName?: string;
  breakbulkBerthingNotice?: string;
  breakbulkCraneOperator?: string;
  breakbulkStevedoringArrangedBy?: 'Client' | 'DPL';
  breakbulkStevedoringAmount?: number;
  breakbulkStevedoringCommission?: number;
  breakbulkTallyPieceCount?: number;
  breakbulkTallyMetricTons?: number;
  breakbulkTallySheetUrl?: string;
  breakbulkTallySheetName?: string;
  breakbulkTrailerGatePasses?: string;
  breakbulkDirectDispatchConfirmed?: boolean;
  outOfChargeCleared?: boolean;

  isoLoadingAuthUrl?: string;
  isoLoadingAuthName?: string;
  isoValveSealNo?: string;
  isoPressureGaugeReading?: number | string;
  isoVehicleRegNo?: string;
  isoDriverName?: string;
  isoFreightArrangedBy?: 'Client' | 'DPL';
  isoFreightAmount?: number;
  isoFreightCommission?: number;

  linerMasterBl?: string;
  linerHouseBl?: string;
  linerBookingConfirmUrl?: string;
  linerBookingConfirmName?: string;
  linerIgmEgmIndex?: string;
  linerManifestFilingDate?: string;
  linerDailyDemurrageRate?: number;
  linerDemurragePaymentStatus?: 'Pending' | 'Paid' | 'Paid by Client' | 'Paid by DPL';
  linerDemurrageAmount?: number;
  linerEquipmentDischarged?: boolean;

  warehouseGrnGenerated?: boolean;
  warehouseInspectionCompleted?: boolean;
  warehouseBayRackBarcode?: string;
  warehouseChargesArrangedBy?: 'Client' | 'DPL';
  warehouseChargesAmount?: number;
  warehouseChargesCommission?: number;
  warehousePickListGenerated?: boolean;

  // Category 11: Import & Export Services
  tradeDirection?: 'Export' | 'Import';
  croBookingNumber?: string;
  croDocumentUrl?: string;
  croDocumentName?: string;
  emptyDepotName?: string;
  emptyContainerAllocated?: string;
  emptySealNumber?: string;
  croReleaseDate?: string;
  shippingLineName?: string;
  vesselName?: string;
  voyageNumber?: string;
  vesselBookingRef?: string;
  vesselPol?: string;
  vesselPod?: string;
  vesselEtd?: string;
  vesselEta?: string;
  vesselCutOffDate?: string;
  vesselBookingConfirmUrl?: string;
  vesselBookingConfirmName?: string;
  assignedTrailerNo?: string;
  assignedTrailerDriver?: string;
  assignedDriverPhone?: string;
  truckingWaybillUrl?: string;
  truckingWaybillName?: string;
  truckingChargesAmount?: number;
  truckingArrangedBy?: 'Client' | 'DPL';
  stuffingLocationWarehouse?: string;
  stuffingPackagesCount?: number;
  stuffingGrossWeight?: number;
  vgmWeightKg?: number;
  vgmCertificateUrl?: string;
  vgmCertificateName?: string;
  stuffingPhotosUrl?: string;
  stuffingPhotosName?: string;
  containerSealedVerified?: boolean;
  warehouseGateOutSlipUrl?: string;
  warehouseGateOutSlipName?: string;
  portTerminalName?: string;
  portTerminalGateInUrl?: string;
  portTerminalGateInName?: string;
  exportCustomsGdNo?: string;
  exportCustomsGdDate?: string;
  exportCustomsStatus?: 'Examined' | 'Assessed' | 'Out of Charge (OOC)' | 'Export NOC Issued';
  exportCustomsNocUrl?: string;
  exportCustomsNocName?: string;
  customsDutyCharges?: number;
  customsChargesArrangedBy?: 'Client' | 'DPL';
  vesselLoadingBayNo?: string;
  matesReceiptNo?: string;
  matesReceiptUrl?: string;
  matesReceiptName?: string;
  billOfLadingNo?: string;
  billOfLadingType?: 'Original' | 'Seaway Bill' | 'Telex Release';
  billOfLadingUrl?: string;
  billOfLadingName?: string;
  vesselSailedConfirmed?: boolean;
  destinationPortName?: string;
  destinationIgmNo?: string;
  destinationCustomsClearanceStatus?: 'In Progress' | 'Cleared' | 'DO Issued';
  destinationDoNumber?: string;
  destinationDoDocUrl?: string;
  destinationDoDocName?: string;
  destinationChargesAmount?: number;
  destinationChargesArrangedBy?: 'Client' | 'DPL';
  destuffingComplete?: boolean;
  destuffingPhotosUrl?: string;
  destuffingPhotosName?: string;
  emptyContainerReturnDepot?: string;
  emptyContainerReturnDate?: string;
  emptyContainerEirDocUrl?: string;
  emptyContainerEirDocName?: string;
  containerDemurrageDetentionAmount?: number;
  containerSecurityRefunded?: boolean;
  allChargesSettledVerified?: boolean;
}

export interface Case {
  id: string;
  caseNo: string; // DPL-YY-00001
  invoiceNo?: string;
  registrationDate?: string;
  clientName: string;
  category: string;
  subCategory?: string;
  pol: string;
  pod: string;
  status: CaseStatus | string;
  containerNumber?: string;
  blNumber?: string;
  igmNo?: string;
  documents: (File | MockDocument)[];
  extractedData: ExtractedData;
  containers: Container[];
  createdAt: string;
  charges?: CaseCharge[];
  serviceArrangements?: Record<string, { arrangedBy: 'DPL' | 'Client'; amount: number }>;
  workflowDetails?: Record<string, CaseStepDetail>;
  isIncidentVault?: boolean;
  incidentDetails?: {
    reportedAt: string;
    reportedBy?: string;
    location?: string;
    reason: string;
    emergencyContact?: string;
  };
  objectionHold?: {
    flagged: boolean;
    reason?: string;
    flaggedBy?: string;
    flaggedAt?: string;
  };
  autoGeneratedDoUrl?: string;
}

export interface LogEntry {
  id: number;
  action: string;
  user: string;
  timestamp: string;
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
}

export interface ClientDefaultCharge {
  id: string;
  category: string;
  description: string;
  defaultAmount: number;
  taxable?: boolean;
}

export interface Client {
  id: string;
  name: string; // Company Name / Company Title
  ownerName?: string;
  contact?: string; // Office Phone / Primary Contact
  officeAddress?: string;
  mobileNumber?: string;
  whatsappNumber?: string;
  email?: string;
  cnic?: string; // Owner NIC / CNIC
  ntn?: string;
  strn?: string;
  businessCardUrl?: string; // Business Card photo / doc
  contractLetterUrl?: string; // Contract Letter document
  nicDocUrl?: string; // Owner CNIC copy
  defaultCaseCategory?: string;
  defaultServiceArrangements?: Record<string, 'DPL' | 'Client'>; // Default Arranged By DPL vs Arranged By Client
  defaultCharges?: ClientDefaultCharge[];
  openingBalance?: number;
  userId?: string; // Optional portal login user ID
  password?: string; // Optional portal login password
  loginEnabled?: boolean;
  createdAt?: string;
}

export interface DestinationStaff {
  id: string;
  name: string;
  station: string; // e.g. Torkham, Chaman, Peshawar, Quetta, Lahore Dryport, Faisalabad, Karachi Port, Kabul
  role: 'Loading Agent' | 'Unloading Agent' | 'Clearing Agent' | 'Station Supervisor';
  contact: string;
  cnic?: string;
  address?: string;
  commissionOrSalary?: number;
  paymentType?: 'Monthly Salary' | 'Per Case Commission' | 'Daily Rate';
  status: 'Active' | 'Inactive';
  notes?: string;
  createdAt?: string;
}

export interface StaffLedgerEntry {
  id: string;
  staffId: number | string;
  staffName: string;
  type: 'SALARY' | 'DAILY_ROUTINE'; // Salary/Fuel/Loan vs Daily Khana Peena / Petty Cash
  date: string;
  description: string;
  category?: string; // 'Monthly Salary', 'Fuel Allowance', 'Mobile Allowance', 'Loan / Advance', 'Daily Meal / Chai', 'Market Purchase', 'Cash Return', 'Settlement'
  debit: number; // For Salary: Salary payable, Loan given. For Daily: Cash given to staff for purchases
  credit: number; // For Salary: Salary paid, Loan recovered. For Daily: Expense bill submitted, Cash balance returned
  balance: number;
  receiptUrl?: string;
  notes?: string;
  settled?: boolean;
}

export interface LedgerEntry {
  id: string | number;
  date: string;
  reference?: string;
  description: string;
  debit: number; // Charges / Billed / Owed (Increases balance owed)
  credit: number; // Payments received (Decreases balance owed)
  balance: number;
  type: 'DEBIT' | 'CREDIT' | 'INFO';
  party: string;
  relatedCaseId?: string;
  category?: string;
  // Metadata fields for SRS compliance
  caseNo?: string;
  blNumber?: string;
  containerNumber?: string;
  pol?: string;
  pod?: string;
  registrationDate?: string;
  isTaxSuppressed?: boolean; // For Income Tax compliance export suppression
}

export interface FinanceEntry {
  id: number;
  date: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'RECEIVABLE' | 'PAYABLE';
  status: 'PAID' | 'PENDING' | 'PARTIAL';
  party: string; // Client or Vendor
  category: string;
  reference?: string; // Invoice No etc
  caseNo?: string;
  containerNumber?: string;
  paidAmount?: number;
  remainingAmount?: number;
  relatedCaseId?: string;
  recurringTemplateId?: string;
  paymentMethod?: 'CASH' | 'BANK';
  bankId?: string | number;
  bankName?: string;
  transactionId?: string;
  slipPhoto?: string;
  slipUrl?: string;
  documentUrl?: string;
  documentName?: string;
}

export interface RecurringFinanceTemplate {
  id: string;
  title: string;
  type: 'PAYABLE' | 'RECEIVABLE';
  amount: number;
  party: string;
  category: string;
  frequency?: 'MONTHLY_FIRST'; // Automatically triggers on the 1st of every month
  active?: boolean;
  isActive?: boolean;
  dayOfMonth?: number;
  notes?: string;
  lastPostedMonth?: string; // e.g. "2026-04"
}

export enum VehicleCategory {
  DOMESTIC = 'Domestic',
  BONDED_CARRIER = 'Bonded Carrier',
  AFGHAN_TRANSIT = 'Afghan Transit',
  TIR = 'TIR'
}

export enum VehicleType {
  CONTAINER = 'Container',
  COIL_LIFTER = 'Coil Lifter',
  FLATBED = 'Flatbed Trailer',
  LOWBED = 'Lowbed',
  MAZDA = 'Mazda',
  SHEHZORE = 'Shehzore',
  OPEN_TRUCK = 'Open Truck',
  CAR_CARRIER = 'Car Carrier'
}

export interface TrackerInfo {
  id: string;
  provider: 'Us' | 'Client';
  companyName?: string;
  installationDate: string;
  cost?: number;
  paymentStatus?: 'Paid' | 'Pending'; // Only if provider is 'Us'
  status: 'Active' | 'Inactive';
}

export interface VehicleHistory {
  id: number;
  date: string;
  description: string;
  relatedCaseId?: string; // DPL Case Number
  relatedCaseNo?: string; // Display string
  importer?: string;
  forwarder?: string;
  containerNo?: string;
  type: 'CASE_ASSIGNMENT' | 'DRIVER_CHANGE' | 'MAINTENANCE' | 'STATUS_CHANGE';
}

export interface Transporter {
  id: number;
  name: string; // Company Name
  ntn?: string;
  representativeName?: string;
  accountantName?: string;
  contact: string; // Mobile
  landline?: string;
  whatsappNumber?: string;
  email: string;
  address?: string;
  cnicDoc?: string; // Owner CNIC front
  ownerCnicBack?: string; // Owner CNIC back
  ntnDoc?: string;
  vehicleListDoc?: string;
  activeCasesCount: number;
  createdAt: string;
  status: 'Active' | 'Inactive';
}

export interface Vehicle {
  id: number;
  dplSerial: string; // Auto-generated
  registrationNumber: string;
  category: VehicleCategory;
  type: VehicleType;
  size: '20ft' | '40ft' | '45ft' | 'Loose';
  weightCapacity?: string; // e.g. 35 Tons
  stationRoutePreferences?: string[]; // e.g. ["Karachi to Lahore", "Karachi to Peshawar", "Torkham"]
  containerCompatibility?: ('20ft' | '40ft' | '45ft' | 'Open Top' | 'Car Carrier' | 'Loose')[];
  
  // Technical Details
  engineNo: string;
  chassisNo: string;
  makeModel?: string;
  registrationDate?: string;
  
  // Owner Details (from Vehicle List)
  ownerName?: string;
  ownerCnic?: string;
  ownerAddress?: string;
  ownerIdCardUrl?: string; // Owner CNIC / ID Card image or doc
  ownerIdCardName?: string;
  
  // Driver & Transporter / Broker
  driverName: string;
  driverCnic: string;
  driverContact: string;
  transporterId: number;
  transporterName: string;
  brokerName?: string; // Broker / Agent Name
  
  // Status & Validation
  status: 'AVAILABLE' | 'ON_TRIP' | 'MAINTENANCE' | 'IN_LINE' | 'EXPIRED' | 'EXPIRE_SOON' | 'CANCELLED' | 'TRANSFERRED' | 'INACTIVE';
  validationStartDate?: string; // Only for Bonded/Afghan
  validationExpiryDate?: string; // Auto-calculated (6 months)
  
  // Cancellation & NOC Workflow
  cancellationRequested?: boolean;
  cancellationReason?: string;
  cancellationApproved?: boolean;
  cancellationDate?: string;
  nocDocUrl?: string;
  nocDate?: string;
  nocReference?: string;
  
  // Documents
  registrationBook?: string;
  customsRegCertDoc?: string; // Customs Registration Certificate
  licenseDoc?: string;
  photo?: string;
  
  // Tracker
  tracker?: TrackerInfo;
  
  history: VehicleHistory[];
  createdAt: string;
}

export interface AppUser {
  id: number;
  uid?: string; // Firebase Auth UID or Database UID
  userId?: string; // e.g. EMP-0001 or ADMIN
  password?: string;
  name: string;
  role: UserRole;
  contact: string;
  email: string;
  status: 'ACTIVE' | 'INACTIVE';
  profilePicture?: string;
  cnicDoc?: string;
  clientName?: string;
  lastLogin?: string;
  authProvider?: 'password' | 'google' | 'database';
  isAdmin?: boolean;

  // HR Specific Profile Fields (SRS section 3)
  fatherName?: string;
  residentialAddress?: string;
  secondaryPhone?: string;
  secondaryPhoneRelation?: string;
  cnicFront?: string;
  cnicBack?: string;
  baseSalary?: number;
  allowances?: {
    mobile?: number;
    fuel?: number;
    internet?: number;
    other?: number;
  };
  loansAdvances?: number;
}

export const UNIVERSAL_CHARGE_TYPES = [
  { id: 'tp_charges', name: 'TP Charges', defaultAmount: 18000 },
  { id: 'loading_unloading', name: 'Loading / Unloading Charges', defaultAmount: 6000 },
  { id: 'do_charges', name: 'Delivery Order (DO) Charges', defaultAmount: 8500 },
  { id: 'do_deposit', name: 'DO Deposit', defaultAmount: 25000 },
  { id: 'excise_payment', name: 'Excise Payment', defaultAmount: 4500 },
  { id: 'detention', name: 'Detention Payment', defaultAmount: 0 },
  { id: 'damage_payment', name: 'Damage Payment', defaultAmount: 0 },
  { id: 'bank_charges', name: 'Bank Charges', defaultAmount: 1200 },
  { id: 'documentation', name: 'Documentation Charges', defaultAmount: 3500 },
  { id: 'vehicle_rent', name: 'Vehicle Rent / Freight', defaultAmount: 125000 },
  { id: 'customs_duty', name: 'Customs Duty', defaultAmount: 0 },
  { id: 'add_customs_duty', name: 'Additional Customs Duty', defaultAmount: 0 },
  { id: 'direct_payment', name: 'Direct Payment', defaultAmount: 0 },
  { id: 'cash_payment', name: 'Cash Payment', defaultAmount: 0 },
  { id: 'photocopy_stamp', name: 'Photocopy / Stamp Paper', defaultAmount: 800 },
  { id: 'manifest_charges', name: 'Manifest Charges', defaultAmount: 2500 },
  { id: 'tir_charges', name: 'TIR Charges', defaultAmount: 15000 }
];

export interface AppNotification {
  id: number;
  title: string;
  description: string;
  details?: string; // Full details for the pop-up
  timestamp: string;
  type: 'ACTION' | 'INFO' | 'ALERT';
  notificationSubType?: 'CASE_APPROVAL' | 'BUYING' | 'GENERAL';
  status: 'PENDING' | 'RESOLVED';
  actionLabel?: string;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  targetView?: string;
  targetFilter?: any;
}

export interface Bank {
  id: number;
  bankName: string;
  branch: string;
  accountTitle: string;
  accountNumber: string;
  iban: string;
  logo?: string;
}
