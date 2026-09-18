import { CaseStatus } from '../types';

export interface WorkflowStepConfig {
  stepIndex: number;
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  categoryName: string;
}

export interface CategoryWorkflowConfig {
  category: string;
  normalizedCategory: string;
  totalSteps: number;
  steps: WorkflowStepConfig[];
}

export function normalizeCategoryName(category?: string): string {
  if (!category) return 'Bonded Carrier';
  const c = category.toLowerCase().trim();
  if (c.includes('import') || c.includes('export')) return 'Import & Export Services';
  if (c.includes('bonded')) return 'Bonded Carrier';
  if (c.includes('customs')) return 'Customs Clearance';
  if (c.includes('afghan') || c.includes('att')) return 'Afghan Transit';
  if (c.includes('tir')) return 'TIR';
  if (c.includes('private') || c.includes('cargo')) return 'Transportation of Private Cargo';
  if (c.includes('car')) return 'Car Carrier';
  if (c.includes('iso') || c.includes('tank')) return 'ISO Tank Service';
  if (c.includes('liner') || c.includes('nvocc')) return 'Liner & NVOCC';
  if (c.includes('breakbulk') || c.includes('charter')) return 'Breakbulk / Chartering Services';
  if (c.includes('warehouse') || c.includes('distribution')) return 'Warehousing & Distribution';
  return category;
}

export const CATEGORY_WORKFLOW_MAP: Record<string, CategoryWorkflowConfig> = {
  'Import & Export Services': {
    category: 'Import & Export Services',
    normalizedCategory: 'Import & Export Services',
    totalSteps: 8,
    steps: [
      {
        stepIndex: 0,
        id: 'ie_container_booking',
        title: 'Container Box Booking (CRO)',
        shortTitle: 'Container Booking',
        description: 'Empty container booking from shipping line / depot, Container Release Order (CRO) and container number allocation.',
        categoryName: 'Import & Export Services'
      },
      {
        stepIndex: 1,
        id: 'ie_vessel_booking',
        title: 'Vessel & Ocean Freight Booking',
        shortTitle: 'Vessel Booking',
        description: 'Vessel name, voyage number, POL & POD confirmation, sailing schedule, and booking confirmation.',
        categoryName: 'Import & Export Services'
      },
      {
        stepIndex: 2,
        id: 'ie_transport_arrangement',
        title: 'Inland Transportation Arrangement',
        shortTitle: 'Transportation Dispatch',
        description: 'Trailer assignment, driver CNIC/phone dispatch, route scheduling from depot/port to warehouse/factory.',
        categoryName: 'Import & Export Services'
      },
      {
        stepIndex: 3,
        id: 'ie_cargo_stuffing',
        title: 'Warehouse Cargo Stuffing & Loading',
        shortTitle: 'Cargo Stuffing & Loading',
        description: 'Warehouse cargo loading into container, packages/cartons count, Verified Gross Mass (VGM), seal verification & gate out.',
        categoryName: 'Import & Export Services'
      },
      {
        stepIndex: 4,
        id: 'ie_port_customs',
        title: 'Port Arrival & Customs Clearance',
        shortTitle: 'Port & Customs Clearance',
        description: 'Port terminal drayage, WebOC/PSW Goods Declaration (GD) filing, customs examination, assessment & export/import NOC.',
        categoryName: 'Import & Export Services'
      },
      {
        stepIndex: 5,
        id: 'ie_vessel_loading',
        title: 'Vessel Loading & Bill of Lading (B/L)',
        shortTitle: 'Vessel Loading & B/L',
        description: 'Container loaded onto vessel, Mate\'s Receipt issuance, Master & House Bill of Lading generation, and vessel sailing confirmation.',
        categoryName: 'Import & Export Services'
      },
      {
        stepIndex: 6,
        id: 'ie_dest_clearance_do',
        title: 'Destination Clearance & Delivery Order (DO)',
        shortTitle: 'Destination Clearance & DO',
        description: 'Destination port arrival, import documentation clearance, customs appraisal, and Shipping Line Delivery Order (DO) issuance.',
        categoryName: 'Import & Export Services'
      },
      {
        stepIndex: 7,
        id: 'ie_destuff_empty_return',
        title: 'De-stuffing, Empty Return & Settlement',
        shortTitle: 'Empty Return & Settlement',
        description: 'Consignee warehouse cargo de-stuffing, empty container returned to shipping line depot (EIR slip) and all charges settled.',
        categoryName: 'Import & Export Services'
      }
    ]
  },
  'Bonded Carrier': {
    category: 'Bonded Carrier',
    normalizedCategory: 'Bonded Carrier',
    totalSteps: 8,
    steps: [
      {
        stepIndex: 0,
        id: CaseStatus.SHIPPING_LINE_DO,
        title: 'Shipping Line DO',
        shortTitle: 'Delivery Order',
        description: 'DO receipt verification, due charges handling, and refundable container security deposit.',
        categoryName: 'Bonded Carrier'
      },
      {
        stepIndex: 1,
        id: CaseStatus.TP_FILING,
        title: 'TP Filing',
        shortTitle: 'Transit Permit',
        description: 'Upload TP/GD print, entry number, date, item description, and filing entity.',
        categoryName: 'Bonded Carrier'
      },
      {
        stepIndex: 2,
        id: CaseStatus.EXCISE_PAYMENT,
        title: 'Excise Payment',
        shortTitle: 'Provincial Excise',
        description: 'Provincial excise duty receipt, reference number, region selection, and payment status.',
        categoryName: 'Bonded Carrier'
      },
      {
        stepIndex: 3,
        id: CaseStatus.WHARFAGE_PAYMENT,
        title: 'Wharfage Payment',
        shortTitle: 'Port Wharfage',
        description: 'Wharfage terminal charges, receipt upload, amount, date, and paying party.',
        categoryName: 'Bonded Carrier'
      },
      {
        stepIndex: 4,
        id: CaseStatus.VEHICLE_ASSIGNMENT,
        title: 'Vehicle Assignment',
        shortTitle: 'Fleet Allocation',
        description: 'Vehicle lookup, registration book, owner CNIC check, driver credentials, and rent allocation.',
        categoryName: 'Bonded Carrier'
      },
      {
        stepIndex: 5,
        id: CaseStatus.LOADING_PORT_PROCESSING,
        title: 'Loading Port Processing',
        shortTitle: 'Port Gate Out',
        description: 'Port gate pass, satellite tracker setup, container loading, customs seal, and driver photo.',
        categoryName: 'Bonded Carrier'
      },
      {
        stepIndex: 6,
        id: CaseStatus.IN_TRANSIT,
        title: 'In Transit & Emergency Exception',
        shortTitle: 'Highway Transit',
        description: 'Live highway transit monitoring, GPS positioning, and route incident / stoppage reporting.',
        categoryName: 'Bonded Carrier'
      },
      {
        stepIndex: 7,
        id: CaseStatus.DESTINATION_PORT_ARRIVAL,
        title: 'Destination Port Arrival & Auto DO Generation',
        shortTitle: 'Dry Port Discharge',
        description: 'Gate arrival photo, customs seal verification, weight slip, transport note, and auto Delivery Order release.',
        categoryName: 'Bonded Carrier'
      }
    ]
  },

  'Customs Clearance': {
    category: 'Customs Clearance',
    normalizedCategory: 'Customs Clearance',
    totalSteps: 5,
    steps: [
      {
        stepIndex: 0,
        id: 'Document Intake & Setup',
        title: 'Document Intake & Setup',
        shortTitle: 'Document Intake',
        description: 'Bill of Lading (BL), Commercial Invoice, Packing List uploads, and WeBOC/PSW access status.',
        categoryName: 'Customs Clearance'
      },
      {
        stepIndex: 1,
        id: 'GD Filing & Assessment',
        title: 'GD Filing & Assessment',
        shortTitle: 'GD Assessment',
        description: 'Goods Declaration (GD) entry number, filing date, duty & taxes calculation, and payment party.',
        categoryName: 'Customs Clearance'
      },
      {
        stepIndex: 2,
        id: 'Physical Examination & Lab Testing',
        title: 'Physical Examination & Lab Testing',
        shortTitle: 'Examination & Lab',
        description: 'Customs physical examination status, lab test reports (if applicable), and inspector endorsement.',
        categoryName: 'Customs Clearance'
      },
      {
        stepIndex: 3,
        id: 'Out of Charge (OOC) Clearance',
        title: 'Out of Charge (OOC) Clearance',
        shortTitle: 'OOC Clearance',
        description: 'Out of Charge (OOC) official stamp, customs release document, and shipping line DO issuance.',
        categoryName: 'Customs Clearance'
      },
      {
        stepIndex: 4,
        id: 'Terminal Gate Out & Delivery',
        title: 'Terminal Gate Out & Delivery',
        shortTitle: 'Terminal Gate Out',
        description: 'Terminal gate pass, container truck assignment, and final cargo dispatch confirmation.',
        categoryName: 'Customs Clearance'
      }
    ]
  },

  'Afghan Transit': {
    category: 'Afghan Transit',
    normalizedCategory: 'Afghan Transit',
    totalSteps: 5,
    steps: [
      {
        stepIndex: 0,
        id: 'Shipping DO & AT GD Filing',
        title: 'Shipping DO & AT GD Filing',
        shortTitle: 'DO & AT-GD',
        description: 'Shipping line Delivery Order upload and Afghan Transit Goods Declaration (AT-GD) registration.',
        categoryName: 'Afghan Transit'
      },
      {
        stepIndex: 1,
        id: 'Guarantee & Bank Security Verification',
        title: 'Guarantee & Bank Security Verification',
        shortTitle: 'Transit Bond & Guarantee',
        description: 'Revolving insurance guarantee / bank guarantee bond number, validity date, and official bond document.',
        categoryName: 'Afghan Transit'
      },
      {
        stepIndex: 2,
        id: 'Port Loading & Mandatory GPS Tracking',
        title: 'Port Loading & Mandatory GPS Tracking',
        shortTitle: 'Port Loading & Tracker',
        description: 'Carrier vehicle and driver allocation, high-security tracker device installation, and activation code.',
        categoryName: 'Afghan Transit'
      },
      {
        stepIndex: 3,
        id: 'Border Transit Execution',
        title: 'Border Transit Execution',
        shortTitle: 'Border Transit',
        description: 'Live satellite GPS route monitoring and customs checkpoint approvals (Torkham / Chaman).',
        categoryName: 'Afghan Transit'
      },
      {
        stepIndex: 4,
        id: 'Border Crossing & Handover',
        title: 'Border Crossing & Handover',
        shortTitle: 'Border Handover & NOC',
        description: 'Cross-border gate pass, Afghan customs stamped manifest, and bilateral transit discharge NOC.',
        categoryName: 'Afghan Transit'
      }
    ]
  },

  'TIR': {
    category: 'TIR',
    normalizedCategory: 'TIR',
    totalSteps: 4,
    steps: [
      {
        stepIndex: 0,
        id: 'TIR Carnet Validation',
        title: 'TIR Carnet Validation',
        shortTitle: 'Carnet Validation',
        description: 'TIR Carnet number check, international guarantee validity period, and authorized carrier status.',
        categoryName: 'TIR'
      },
      {
        stepIndex: 1,
        id: 'Departure Customs Sealing',
        title: 'Departure Customs Sealing',
        shortTitle: 'Origin Sealing',
        description: 'Customs sealing inspection at departure customs office, TIR seal photo, and seal serial number.',
        categoryName: 'TIR'
      },
      {
        stepIndex: 2,
        id: 'En-Route Border Inspection',
        title: 'En-Route Border Inspection',
        shortTitle: 'En-Route Border',
        description: 'Border crossing voucher detachment record and international customs transit inspection checklist.',
        categoryName: 'TIR'
      },
      {
        stepIndex: 3,
        id: 'Destination Customs Discharge',
        title: 'Destination Customs Discharge',
        shortTitle: 'TIR Discharge',
        description: 'Destination customs unsealing inspection, intact seal verification, and final stamped discharge voucher.',
        categoryName: 'TIR'
      }
    ]
  },

  'Transportation of Private Cargo': {
    category: 'Transportation of Private Cargo',
    normalizedCategory: 'Transportation of Private Cargo',
    totalSteps: 5,
    steps: [
      {
        stepIndex: 0,
        id: 'Booking & Pickup Request',
        title: 'Booking & Pickup Request',
        shortTitle: 'Booking Request',
        description: 'Shipper details, cargo description, weight, dimensions, and origin/destination warehouse addresses.',
        categoryName: 'Transportation of Private Cargo'
      },
      {
        stepIndex: 1,
        id: 'Vehicle & Driver Assignment',
        title: 'Vehicle & Driver Assignment',
        shortTitle: 'Truck Allocation',
        description: 'Commercial truck registration, driver CNIC verification, license check, and freight payment party.',
        categoryName: 'Transportation of Private Cargo'
      },
      {
        stepIndex: 2,
        id: 'Loading & Bilty Generation',
        title: 'Loading & Bilty Generation',
        shortTitle: 'Loading & Bilty',
        description: 'Cargo loading photos, cargo condition audit, and auto-generated commercial bilty / consignment note.',
        categoryName: 'Transportation of Private Cargo'
      },
      {
        stepIndex: 3,
        id: 'In Transit Monitoring',
        title: 'In Transit Monitoring',
        shortTitle: 'Transit Monitoring',
        description: 'Real-time highway progress updates, waypoint checkpoints, and driver contact coordination.',
        categoryName: 'Transportation of Private Cargo'
      },
      {
        stepIndex: 4,
        id: 'Destination Offloading & POD',
        title: 'Destination Offloading & POD',
        shortTitle: 'Offloading & POD',
        description: 'Destination offloading verification, cargo handover inspection, and signed Proof of Delivery (POD) upload.',
        categoryName: 'Transportation of Private Cargo'
      }
    ]
  },

  'Car Carrier': {
    category: 'Car Carrier',
    normalizedCategory: 'Car Carrier',
    totalSteps: 4,
    steps: [
      {
        stepIndex: 0,
        id: 'Vehicle Condition Audit',
        title: 'Vehicle Condition Audit',
        shortTitle: 'VIN & Condition Audit',
        description: 'Automobile VIN/Chassis numbers, pre-loading multi-angle damage inspection, and physical condition audit.',
        categoryName: 'Car Carrier'
      },
      {
        stepIndex: 1,
        id: 'Carrier Assignment & Loading',
        title: 'Carrier Assignment & Loading',
        shortTitle: 'Deck Slot Allocation',
        description: 'Car carrier trailer registration, upper/lower deck slot allocation, and vehicle wheel lashing lock verification.',
        categoryName: 'Car Carrier'
      },
      {
        stepIndex: 2,
        id: 'In Transit Tracking',
        title: 'In Transit Tracking',
        shortTitle: 'Carrier In Transit',
        description: 'Highway convoy tracking, fleet safety monitoring, and transit checkpoint progress reporting.',
        categoryName: 'Car Carrier'
      },
      {
        stepIndex: 3,
        id: 'Unloading & Final Inspection',
        title: 'Unloading & Final Inspection',
        shortTitle: 'Unloading & Sign-off',
        description: 'Destination dealership unloading photos and final vehicle handover inspection sheet signed by recipient.',
        categoryName: 'Car Carrier'
      }
    ]
  },

  'ISO Tank Service': {
    category: 'ISO Tank Service',
    normalizedCategory: 'ISO Tank Service',
    totalSteps: 4,
    steps: [
      {
        stepIndex: 0,
        id: 'Tank Fitness & Chemical Clearance',
        title: 'Tank Fitness & Chemical Clearance',
        shortTitle: 'Fitness & MSDS',
        description: 'ISO tank container serial number, cleanliness certificate, safety pressure test certificate, and MSDS verification.',
        categoryName: 'ISO Tank Service'
      },
      {
        stepIndex: 1,
        id: 'Specialized Loading / Discharge',
        title: 'Specialized Loading / Discharge',
        shortTitle: 'Valve Sealing & Pressure',
        description: 'Terminal loading authorization, chemical valve seal inspection photo, and pressure gauge bar reading.',
        categoryName: 'ISO Tank Service'
      },
      {
        stepIndex: 2,
        id: 'Specialized Transport Execution',
        title: 'Specialized Transport Execution',
        shortTitle: 'HAZMAT Transport',
        description: 'Certified HAZMAT driver allocation, specialized chemical prime mover, and route safety clearance.',
        categoryName: 'ISO Tank Service'
      },
      {
        stepIndex: 3,
        id: 'Delivery & Receiver Sign-off',
        title: 'Delivery & Receiver Sign-off',
        shortTitle: 'Receiver Offload NOC',
        description: 'Receiver safety offloading endorsement, tank discharge inspection, and clean empty return pass.',
        categoryName: 'ISO Tank Service'
      }
    ]
  },

  'Liner & NVOCC': {
    category: 'Liner & NVOCC',
    normalizedCategory: 'Liner & NVOCC',
    totalSteps: 4,
    steps: [
      {
        stepIndex: 0,
        id: 'Booking & Slot Allocation',
        title: 'Booking & Slot Allocation',
        shortTitle: 'MBL / HBL Booking',
        description: 'Master BL (MBL) & House BL (HBL) reference numbers, booking confirmation note, and slot confirmation.',
        categoryName: 'Liner & NVOCC'
      },
      {
        stepIndex: 1,
        id: 'Manifest & Customs Filing',
        title: 'Manifest & Customs Filing',
        shortTitle: 'IGM / EGM Manifest',
        description: 'Import / Export General Manifest (IGM/EGM) index number, filing date, and customs vessel arrival schedule.',
        categoryName: 'Liner & NVOCC'
      },
      {
        stepIndex: 2,
        id: 'Container Demurrage & Inventory Tracking',
        title: 'Container Demurrage & Inventory Tracking',
        shortTitle: 'Demurrage & Free Days',
        description: 'Free days counter, arrival discharge date, daily demurrage rate calculation, and incurred charges audit.',
        categoryName: 'Liner & NVOCC'
      },
      {
        stepIndex: 3,
        id: 'Empty Container Return NOC',
        title: 'Empty Container Return NOC',
        shortTitle: 'Empty Depot NOC',
        description: 'Empty depot equipment interchange receipt (EIR) upload and line equipment discharge confirmation.',
        categoryName: 'Liner & NVOCC'
      }
    ]
  },

  'Breakbulk / Chartering Services': {
    category: 'Breakbulk / Chartering Services',
    normalizedCategory: 'Breakbulk / Chartering Services',
    totalSteps: 4,
    steps: [
      {
        stepIndex: 0,
        id: 'Charter Party & Berthing',
        title: 'Charter Party & Berthing',
        shortTitle: 'Charter Party & Berth',
        description: 'Charter party agreement upload, vessel nomination, berthing notice, and port authority scheduling.',
        categoryName: 'Breakbulk / Chartering Services'
      },
      {
        stepIndex: 1,
        id: 'Stevedoring & Marine Survey',
        title: 'Stevedoring & Marine Survey',
        shortTitle: 'Marine Surveyor & Cranes',
        description: 'Marine surveyor inspection report upload, crane / heavy lifter operator allocation, and rigging checklist.',
        categoryName: 'Breakbulk / Chartering Services'
      },
      {
        stepIndex: 2,
        id: 'Tally Sheet & Cargo Discharge',
        title: 'Tally Sheet & Cargo Discharge',
        shortTitle: 'Tally Sheet & Tonnage',
        description: 'Daily piece count tally, metric tonnage discharged, hatch survey notes, and tally sheet scan upload.',
        categoryName: 'Breakbulk / Chartering Services'
      },
      {
        stepIndex: 3,
        id: 'Direct Loading / Storage Dispatch',
        title: 'Direct Loading / Storage Dispatch',
        shortTitle: 'Heavy Gate Pass',
        description: 'Gate pass generation for multi-axle trailers, direct wharf dispatch, and final cargo release pass.',
        categoryName: 'Breakbulk / Chartering Services'
      }
    ]
  },

  'Warehousing & Distribution': {
    category: 'Warehousing & Distribution',
    normalizedCategory: 'Warehousing & Distribution',
    totalSteps: 4,
    steps: [
      {
        stepIndex: 0,
        id: 'Inbound Cargo Receipt',
        title: 'Inbound Cargo Receipt',
        shortTitle: 'Inbound GRN',
        description: 'Goods Receipt Note (GRN) generation, cargo physical inspection, barcode tagging, and receipt scan upload.',
        categoryName: 'Warehousing & Distribution'
      },
      {
        stepIndex: 1,
        id: 'Rack & Location Allocation',
        title: 'Rack & Location Allocation',
        shortTitle: 'Rack & Bay Sync',
        description: 'Warehouse bay/rack barcode allocation, inventory WMS system synchronization, and storage charges.',
        categoryName: 'Warehousing & Distribution'
      },
      {
        stepIndex: 2,
        id: 'Stock Management & Picking',
        title: 'Stock Management & Picking',
        shortTitle: 'Outbound Picking',
        description: 'Digital outbound pick list generation, sku verification, piece verification, and staging confirmation.',
        categoryName: 'Warehousing & Distribution'
      },
      {
        stepIndex: 3,
        id: 'Dispatch & Gate Pass',
        title: 'Dispatch & Gate Pass',
        shortTitle: 'Warehouse Gate Out',
        description: 'Commercial packing list upload, final warehouse delivery note (DN), and gate out security pass release.',
        categoryName: 'Warehousing & Distribution'
      }
    ]
  }
};

export const ALL_SERVICE_CATEGORIES: string[] = [
  'Bonded Carrier',
  'Customs Clearance',
  'Afghan Transit',
  'TIR',
  'Transportation of Private Cargo',
  'Warehousing & Distribution'
];

export const PRIMARY_SERVICE_CATEGORIES = [
  'Import & Export Services',
  'Bonded Carrier',
  'Customs Clearance',
  'Afghan Transit',
  'TIR',
  'Transportation of Private Cargo',
  'Warehousing & Distribution'
] as const;

export const SUB_CATEGORY_OPTIONS = [
  'Standard Container / General Cargo',
  'Car Carrier',
  'ISO Tank Service',
  'Breakbulk / Chartering',
  'Liner & NVOCC Services'
] as const;

export function supportsSubCategories(category?: string): boolean {
  const norm = normalizeCategoryName(category);
  return norm === 'Import & Export Services' || norm === 'Bonded Carrier' || norm === 'Afghan Transit' || norm === 'Transportation of Private Cargo';
}

export function getCategoryWorkflow(category?: string): CategoryWorkflowConfig {
  const norm = normalizeCategoryName(category);
  return CATEGORY_WORKFLOW_MAP[norm] || CATEGORY_WORKFLOW_MAP['Bonded Carrier'];
}

export function getWorkflowStepsForCategory(category?: string): string[] {
  const cfg = getCategoryWorkflow(category);
  return cfg.steps.map(s => s.id);
}

export function getWorkflowStepIndex(category?: string, status?: string): number {
  if (!status) return 0;
  if (status === CaseStatus.COMPLETED) {
    const cfg = getCategoryWorkflow(category);
    return cfg.totalSteps;
  }
  const cfg = getCategoryWorkflow(category);
  const idx = cfg.steps.findIndex(s => s.id === status || s.title === status);
  if (idx !== -1) return idx;

  // Check if status is a number or matches legacy
  const stepIdx = cfg.steps.findIndex(s => s.title.toLowerCase().includes(status.toLowerCase()));
  return stepIdx !== -1 ? stepIdx : 0;
}

export function getNextWorkflowStep(category: string | undefined, currentIndex: number): string {
  const cfg = getCategoryWorkflow(category);
  if (currentIndex >= cfg.totalSteps - 1) {
    return CaseStatus.COMPLETED;
  }
  return cfg.steps[currentIndex + 1].id;
}
