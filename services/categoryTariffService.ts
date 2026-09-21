import { CaseCharge, Client, ClientDefaultCharge } from '../types';
import { saveClientToFirestore } from './dbService';

export interface ServiceArrangementItem {
  label: string;
  arrangedBy: 'DPL' | 'Client';
  amount: number;
  category?: string;
  isDefaultDpl?: boolean;
}

/**
 * Category-specific Operational Service Arrangements & Default Tariffs.
 * Defined strictly according to company operational guidelines:
 * 
 * 1. Bonded Carrier: TP charges by default (DPL). Loading, dry port DO, unloading, seal, vehicle rent, vehicle detention as per requirement.
 * 2. Afghan Transit: Manifest, loading, seal, border clearance, convoy, service charges, sales tax SRB, NLC, insurance as per requirement.
 * 3. Import Export Services: Vessel, container, customs clearance, service charges, sales tax SRB, NLC, insurance as per requirement.
 * 4. Private Cargo: Loading charges & unloading charges by default (DPL).
 * 5. TIR: Zero default charges (all as per requirement).
 * 6. Customs Clearance: Service charges, loading charges, unloading charges by default (DPL).
 */
export const CATEGORY_SERVICE_ARRANGEMENTS: Record<string, Record<string, ServiceArrangementItem>> = {
  "Bonded Carrier": {
    loading_charges: { label: 'Loading / Labor Handling Charges', arrangedBy: 'Client', amount: 0 },
    do_charges: { label: 'Shipping Line Delivery Order (DO) Charges', arrangedBy: 'Client', amount: 0 },
    security_deposit: { label: 'DO Security Deposit / Guarantee', arrangedBy: 'Client', amount: 0 },
    dryport_do_charges: { label: 'Dry Port Delivery Order (DO) Charges', arrangedBy: 'Client', amount: 0 },
    unloading_charges: { label: 'Unloading / Offloading Charges', arrangedBy: 'Client', amount: 0 },
    seal_charges: { label: 'Customs Bullet Seal & E-Seal Tracking Fee', arrangedBy: 'Client', amount: 0 },
    vehicle_rent: { label: 'Vehicle Rent / Transporter Freight', arrangedBy: 'Client', amount: 0 },
    vehicle_detention: { label: 'Vehicle Detention / Waiting Surcharge', arrangedBy: 'Client', amount: 0 },
    wharfage_charges: { label: 'Wharfage Terminal & Port Dues', arrangedBy: 'Client', amount: 0 }
  },

  "Afghan Transit": {
    manifest_charges: { label: 'Transit Manifest Charges (AT-GD WeBOC)', arrangedBy: 'Client', amount: 0 },
    loading_charges: { label: 'Loading / Port Handling Charges', arrangedBy: 'Client', amount: 0 },
    seal_charges: { label: 'Customs Bullet Seal & Satellite Tracker Device', arrangedBy: 'Client', amount: 0 },
    border_clearance_charges: { label: 'Border Clearance Charges (Torkham / Chaman)', arrangedBy: 'Client', amount: 0 },
    convoy_charges: { label: 'Convoy Charges (Customs Armed Escort)', arrangedBy: 'Client', amount: 0 },
    service_charges: { label: 'Service Charges (Transit Agency & Formalities)', arrangedBy: 'Client', amount: 0 },
    sales_tax_srb: { label: 'Sales Tax / SRB Tax Assessment', arrangedBy: 'Client', amount: 0 },
    nlc_charges: { label: 'NLC Terminal & Weighbridge Charges', arrangedBy: 'Client', amount: 0 },
    insurance_charges: { label: 'Insurance Charges (Cross-Border Transit Policy)', arrangedBy: 'Client', amount: 0 },
    vehicle_rent: { label: 'Vehicle Rent / Cross-Border Heavy Freight', arrangedBy: 'Client', amount: 0 },
    vehicle_detention: { label: 'Vehicle Detention / Demurrage Charges', arrangedBy: 'Client', amount: 0 }
  },

  "Import & Export Services": {
    vessel_charges: { label: 'Vessel Charges (Ocean Freight / Slot Booking)', arrangedBy: 'Client', amount: 0 },
    container_charges: { label: 'Container Charges (CRO & Empty Allocation)', arrangedBy: 'Client', amount: 0 },
    customs_clearance_charges: { label: 'Customs Clearance Charges (GD Assessment & OOC)', arrangedBy: 'Client', amount: 0 },
    service_charges: { label: 'Service Charges (Agency & Documentation)', arrangedBy: 'Client', amount: 0 },
    sales_tax_srb: { label: 'Sales Tax / SRB Tax Assessment', arrangedBy: 'Client', amount: 0 },
    nlc_charges: { label: 'NLC / Terminal Staging Charges', arrangedBy: 'Client', amount: 0 },
    insurance_charges: { label: 'Insurance Charges (Marine Cargo Transit)', arrangedBy: 'Client', amount: 0 },
    vgm_charges: { label: 'SOLAS VGM Weighbridge & Terminal Staging', arrangedBy: 'Client', amount: 0 },
    delivery_order: { label: 'Shipping Line Delivery Order (DO) Fee', arrangedBy: 'Client', amount: 0 }
  },

  "Transportation of Private Cargo": {
    loading_charges: { label: 'Loading / Labor Handling Charges', arrangedBy: 'DPL', amount: 8000, isDefaultDpl: true },
    unloading_charges: { label: 'Unloading / Offloading Charges', arrangedBy: 'DPL', amount: 8000, isDefaultDpl: true },
    vehicle_rent: { label: 'Vehicle Rent / Inland Truck Freight', arrangedBy: 'Client', amount: 0 },
    builty_charges: { label: 'Builty / Consignment Note Documentation Fee', arrangedBy: 'Client', amount: 0 },
    transit_toll: { label: 'Transit Toll & Weigh Station Charges', arrangedBy: 'Client', amount: 0 },
    insurance_charges: { label: 'Cargo Transit Insurance Surcharge', arrangedBy: 'Client', amount: 0 },
    vehicle_detention: { label: 'Vehicle Detention / Waiting Charges', arrangedBy: 'Client', amount: 0 }
  },

  "TIR": {
    tir_carnet_charges: { label: 'TIR Carnet Administration Charges', arrangedBy: 'Client', amount: 0 },
    border_escort_charges: { label: 'Border Customs Escort & E-Seal Endorsement', arrangedBy: 'Client', amount: 0 },
    transit_toll_charges: { label: 'International Transit Tolls & Route Permits', arrangedBy: 'Client', amount: 0 },
    loading_charges: { label: 'Loading & Securing Charges', arrangedBy: 'Client', amount: 0 },
    unloading_charges: { label: 'Destination Unloading Charges', arrangedBy: 'Client', amount: 0 },
    freight_charges: { label: 'International Road Haulage / Freight', arrangedBy: 'Client', amount: 0 }
  },

  "Customs Clearance": {
    service_charges: { label: 'Customs Agency Service Charges / Commission', arrangedBy: 'DPL', amount: 15000, isDefaultDpl: true },
    loading_charges: { label: 'Terminal / Port Loading Charges', arrangedBy: 'DPL', amount: 7000, isDefaultDpl: true },
    unloading_charges: { label: 'Destuffing / Examination Unloading Charges', arrangedBy: 'DPL', amount: 7000, isDefaultDpl: true },
    weboc_psw_charges: { label: 'WeBOC / PSW Electronic Declaration Fee', arrangedBy: 'Client', amount: 0 },
    customs_examination_charges: { label: 'Customs Examination Surcharge', arrangedBy: 'Client', amount: 0 },
    wharfage_charges: { label: 'Port Wharfage & Terminal Handling Dues', arrangedBy: 'Client', amount: 0 },
    delivery_order_charges: { label: 'Shipping Line Delivery Order (DO) Fee', arrangedBy: 'Client', amount: 0 },
    sindh_excise_cess: { label: 'Sindh Infrastructure Cess / Excise Challan', arrangedBy: 'Client', amount: 0 }
  },

  "ISO Tank Service": {
    iso_freight: { label: 'Specialized ISO Tank Haulage', arrangedBy: 'Client', amount: 0 },
    hazmat_safety: { label: 'IMO Hazmat Placarding & Emergency Response', arrangedBy: 'Client', amount: 0 },
    valve_inspection: { label: 'Pre-Trip Valve & Pressure Gauge Certification', arrangedBy: 'Client', amount: 0 },
    terminal_stevedoring: { label: 'Dangerous Goods Port Stevedoring', arrangedBy: 'Client', amount: 0 }
  },

  "Car Carrier": {
    vehicle_haulage: { label: 'Multi-Vehicle Auto Carrier Haulage', arrangedBy: 'Client', amount: 0 },
    condition_survey: { label: 'Pre-Loading Scratch & Condition Audit', arrangedBy: 'Client', amount: 0 },
    transit_insurance: { label: 'En-route Vehicle Transit Insurance', arrangedBy: 'Client', amount: 0 },
    ramp_handling: { label: 'Ramp Loading & Wheel Strapping Fee', arrangedBy: 'Client', amount: 0 }
  },

  "Liner & NVOCC": {
    ocean_freight: { label: 'Ocean Freight & Feeder Slot Allocation', arrangedBy: 'Client', amount: 0 },
    thc_charges: { label: 'Terminal Handling Charges (THC)', arrangedBy: 'Client', amount: 0 },
    line_do: { label: 'Shipping Line Delivery Order (DO) & Manifest Fee', arrangedBy: 'Client', amount: 0 },
    security_deposit: { label: 'Container Security Deposit Administration', arrangedBy: 'Client', amount: 0 }
  },

  "Breakbulk/Chartering Services": {
    heavy_haulage: { label: 'Hydraulic Multi-Axle Modular Haulage', arrangedBy: 'Client', amount: 0 },
    stevedoring_crane: { label: 'Port Stevedoring & Shore Crane Rigging', arrangedBy: 'Client', amount: 0 },
    nha_escort: { label: 'NHA Route Permit & Heavy Escort Surcharge', arrangedBy: 'Client', amount: 0 },
    marine_lashing: { label: 'Marine Lashing & Technical Survey', arrangedBy: 'Client', amount: 0 }
  },

  "Warehousing & Distribution": {
    bonded_storage: { label: 'Bonded Warehouse Storage Rental', arrangedBy: 'Client', amount: 0 },
    destuffing_pallet: { label: 'Container De-stuffing & Palletization', arrangedBy: 'Client', amount: 0 },
    gate_pass_admin: { label: 'Into-Bond / Ex-Bond Documentation Fee', arrangedBy: 'Client', amount: 0 },
    stock_insurance: { label: 'Warehouse Fire & Stock Insurance', arrangedBy: 'Client', amount: 0 }
  }
};

/**
 * Normalizes category name to key in CATEGORY_SERVICE_ARRANGEMENTS.
 */
export function normalizeCategoryKey(category: string): string {
  const norm = (category || '').toLowerCase();
  if (norm.includes('bonded')) return 'Bonded Carrier';
  if (norm.includes('afghan') || norm.includes('transit')) return 'Afghan Transit';
  if (norm.includes('import') || norm.includes('export')) return 'Import & Export Services';
  if (norm.includes('private') || norm.includes('cargo') || norm.includes('domestic')) return 'Transportation of Private Cargo';
  if (norm.includes('tir')) return 'TIR';
  if (norm.includes('clearance')) return 'Customs Clearance';
  if (norm.includes('tank') || norm.includes('iso')) return 'ISO Tank Service';
  if (norm.includes('car')) return 'Car Carrier';
  if (norm.includes('liner') || norm.includes('nvocc')) return 'Liner & NVOCC';
  if (norm.includes('breakbulk')) return 'Breakbulk/Chartering Services';
  if (norm.includes('warehouse')) return 'Warehousing & Distribution';
  return 'Bonded Carrier';
}

/**
 * Returns the default service arrangements structure for a category.
 */
export function getCategoryArrangements(category: string): Record<string, ServiceArrangementItem> {
  const key = normalizeCategoryKey(category);
  const found = CATEGORY_SERVICE_ARRANGEMENTS[key];
  if (found) {
    // Return a fresh deep clone
    return JSON.parse(JSON.stringify(found));
  }
  return JSON.parse(JSON.stringify(CATEGORY_SERVICE_ARRANGEMENTS['Bonded Carrier']));
}

/**
 * Generates CaseCharge array from service arrangements where arrangedBy === 'DPL'.
 */
export function getArrangementCharges(arrangements: Record<string, ServiceArrangementItem>): CaseCharge[] {
  return Object.entries(arrangements)
    .filter(([_, item]) => item.arrangedBy === 'DPL' && Number(item.amount) > 0)
    .map(([key, item]) => ({
      id: `ch_arr_${key}`,
      syncKey: key,
      description: item.label,
      amount: Number(item.amount),
      arrangedBy: 'DPL',
      taxable: true
    }));
}

/**
 * Core business logic resolver:
 * "Default charges woh client vise honge case category wise Nahin.
 * Agar client ke andar koi charges ham bad mein add karte waqt by default per tik laga dete Hain to woh charges uski client per by default lagenge har invoice per har case per."
 *
 * If the client has configured default charges:
 *   -> Apply those client default charges to the case/invoice.
 *   -> Also synchronize matching operational service items.
 * If the client does not have custom default charges:
 *   -> Apply the category-specific operational service arrangements & default charges.
 */
export function resolveCaseCharges(
  client: Client | undefined,
  category: string,
  existingArrangements?: Record<string, ServiceArrangementItem>
): {
  arrangements: Record<string, ServiceArrangementItem>;
  charges: CaseCharge[];
  isClientCustomDefault: boolean;
  clientName?: string;
} {
  const baseArrangements = getCategoryArrangements(category);
  const mergedArrangements: Record<string, ServiceArrangementItem> = {
    ...baseArrangements,
    ...(existingArrangements || {})
  };

  // Apply client's saved default service arrangements if present
  if (client?.defaultServiceArrangements) {
    Object.entries(client.defaultServiceArrangements).forEach(([k, arrangedBy]) => {
      if (mergedArrangements[k]) {
        mergedArrangements[k].arrangedBy = arrangedBy;
      }
    });
  }

  // Check if client has custom default charges configured
  if (client?.defaultCharges && client.defaultCharges.length > 0) {
    const clientCharges: CaseCharge[] = client.defaultCharges
      .filter(ch => (Number(ch.defaultAmount) || 0) > 0)
      .map((ch, idx) => ({
        id: ch.id || `ch_clt_${Date.now()}_${idx}`,
        category: ch.category || category,
        description: ch.description,
        amount: Number(ch.defaultAmount) || 0,
        taxable: ch.taxable ?? false,
        arrangedBy: 'DPL'
      }));

    // If client has default charges, set any corresponding arrangements to DPL
    Object.keys(mergedArrangements).forEach((k) => {
      const arr = mergedArrangements[k];
      const match = clientCharges.find(c => 
        c.description.toLowerCase().includes(arr.label.toLowerCase()) || 
        arr.label.toLowerCase().includes(c.description.toLowerCase())
      );
      if (match) {
        mergedArrangements[k].arrangedBy = 'DPL';
        mergedArrangements[k].amount = match.amount;
      }
    });

    return {
      arrangements: mergedArrangements,
      charges: clientCharges,
      isClientCustomDefault: true,
      clientName: client.name
    };
  }

  // Otherwise, use category-specific defaults
  const categoryCharges = getArrangementCharges(mergedArrangements);

  return {
    arrangements: mergedArrangements,
    charges: categoryCharges,
    isClientCustomDefault: false,
    clientName: client?.name
  };
}

/**
 * Saves a charge permanently as a default charge for a client in Firestore.
 * Ensures that this charge will be applied to every future case and invoice for this client.
 */
export async function saveChargeAsClientDefault(
  client: Client,
  charge: {
    description: string;
    amount: number;
    category?: string;
    taxable?: boolean;
  }
): Promise<Client> {
  const existingDefaults = client.defaultCharges ? [...client.defaultCharges] : [];
  
  // Check if already exists by description
  const cleanDesc = charge.description.trim();
  const existingIdx = existingDefaults.findIndex(d => d.description.toLowerCase() === cleanDesc.toLowerCase());

  const newDefaultCharge: ClientDefaultCharge = {
    id: `clt_def_${Date.now()}`,
    category: charge.category || client.defaultCaseCategory || 'Bonded Carrier',
    description: cleanDesc,
    defaultAmount: Number(charge.amount) || 0,
    taxable: charge.taxable ?? false
  };

  if (existingIdx >= 0) {
    existingDefaults[existingIdx] = newDefaultCharge;
  } else {
    existingDefaults.push(newDefaultCharge);
  }

  const updatedClient: Client = {
    ...client,
    defaultCharges: existingDefaults
  };

  await saveClientToFirestore(updatedClient);
  return updatedClient;
}
