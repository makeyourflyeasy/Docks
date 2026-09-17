import { CaseCharge, Case } from '../types';

export interface CategoryComplianceDetail {
  id: string;
  name: string;
  legalAct: string;
  customsRulesRef: string;
  mandatoryDocuments: string[];
  mandatoryFields: string[];
  procedureSummary: string;
  standardTariff: CaseCharge[];
}

export const PAKISTAN_CUSTOMS_COMPLIANCE: Record<string, CategoryComplianceDetail> = {
  "Bonded Carrier": {
    id: "bonded_carrier",
    name: "Bonded Carrier (Transhipment - TP)",
    legalAct: "Customs Act 1969, Section 121 (Transhipment of Cargo Against Bond)",
    customsRulesRef: "Customs Rules 2001, Chapter XXI (Transhipment) & SRO 450(I)/2001, SRO 601(I)/2014",
    mandatoryDocuments: [
      "Transhipment Permit (TP) / Sub-Manifest (WeBOC EDI)",
      "Carrier Revolving Insurance Guarantee / Financial Security Bond",
      "Carrier Registration Certificate (CBC License with Collectorate of Transit & Transhipment)",
      "Port Delivery Order (DO) / Shipping Line Endorsement",
      "Customs Container Bullet Seal & FBR Electronic Tracker Seal Receipt"
    ],
    mandatoryFields: [
      "TP / Sub-Manifest Number",
      "Port of Entry / Discharge (KPT, PQA, SAPT, KICT, QICT)",
      "Destination Dry Port / Inland Container Depot (Lahore, Sambrial, Faisalabad, etc.)",
      "FBR Authorized Satellite Tracker Device ID (E-Seal)",
      "Carrier Bond License Number (CBC No.)",
      "Safe Transit Route & Permitted Transit Days Limit (Max 7-10 Days)"
    ],
    procedureSummary: "Bonded carriers transport imported containerized cargo from sea ports to upcountry customs dry ports under bonded security without paying customs duties at the sea port. All containers must be triple-sealed (Line seal, Customs seal, Carrier seal) with an active FBR electronic satellite tracker. Cargo must reach destination within statutory transit time limits.",
    standardTariff: [
      { id: 'bc_1', category: 'Bonded Carrier', description: 'Inland Container Haulage / Freight (Port to Upcountry Dryport/ICD)', amount: 120000, taxable: false },
      { id: 'bc_2', category: 'Bonded Carrier', description: 'Transhipment Permit (TP) Electronic Filing & WeBOC Processing Fee', amount: 12500, taxable: true },
      { id: 'bc_3', category: 'Bonded Carrier', description: 'Customs Revolving Insurance Guarantee & Bond Security Surcharge', amount: 15000, taxable: false },
      { id: 'bc_4', category: 'Bonded Carrier', description: 'FBR Satellite Tracking Device & Electronic Seal (E-Seal) Monitoring Fee', amount: 8500, taxable: true },
      { id: 'bc_5', category: 'Bonded Carrier', description: 'Empty Container Return Haulage & Terminal Gate-in Handling', amount: 14000, taxable: true }
    ]
  },

  "Afghan Transit": {
    id: "afghan_transit",
    name: "Afghan Transit Trade (ATT / APTTA)",
    legalAct: "Customs Act 1969, Chapter XVI (Transit Trade) & APTTA 2010/2020 Protocol",
    customsRulesRef: "Customs Rules 2001, Chapter XXV (Afghan Transit Trade) & SRO 121(I)/2014",
    mandatoryDocuments: [
      "WeBOC Transit Goods Declaration (AT-GD)",
      "Jawaznama (Afghan Ministry of Commerce Valid Business License)",
      "Customs Security Financial Guarantee / Bank Guarantee",
      "Customs Carrier En-route Escort Memo (for sensitive/high-value cargo)",
      "Border Gate Pass & Cross-Docking Terminal Dispatch Order"
    ],
    mandatoryFields: [
      "AT-GD Number & Registration Date",
      "Jawaznama Number (Afghan Importer License)",
      "Border Customs Post (BCP: Torkham, Chaman, Ghulam Khan, Kharlachi)",
      "Afghan Consignee Full Legal Name & Address",
      "FBR Authorized Satellite Tracker ID",
      "Customs Financial Guarantee / Indemnity Bond No."
    ],
    procedureSummary: "Regulates transit cargo destined for landlocked Afghanistan via Pakistan territory. Filing is executed on WeBOC Transit module. FBR authorized tracking devices and biometric verification of drivers are mandatory. Cargo is released at specified Border Customs Stations (Torkham / Chaman) upon verification of intact seals and tracker departure data.",
    standardTariff: [
      { id: 'att_1', category: 'Afghan Transit', description: 'Cross-Border Transit Haulage (Karachi Port to Border Post / Kabul / Kandahar)', amount: 175000, taxable: false },
      { id: 'att_2', category: 'Afghan Transit', description: 'WeBOC Transit Goods Declaration (AT-GD) & Jawaznama Electronic Processing', amount: 20000, taxable: true },
      { id: 'att_3', category: 'Afghan Transit', description: 'Border Customs Clearance, Cross-docking & Frontier Terminal Handling', amount: 18500, taxable: true },
      { id: 'att_4', category: 'Afghan Transit', description: 'FBR Satellite Tracking Device (Tracker PK/TPL) & Escort Protocol Surcharge', amount: 12500, taxable: true },
      { id: 'att_5', category: 'Afghan Transit', description: 'Border Detention, Wait-time Buffer & Line Equipment Management', amount: 10000, taxable: false }
    ]
  },

  "Customs Clearance": {
    id: "customs_clearance",
    name: "Customs Clearance (Home Consumption & Warehousing)",
    legalAct: "Customs Act 1969, Section 79 (Home Consumption), Section 84 (Warehousing), Section 131 (Export)",
    customsRulesRef: "Customs Rules 2001, SRO 450(I)/2001 & Pakistan Single Window (PSW) Act 2021",
    mandatoryDocuments: [
      "Bill of Lading (MBL/HBL) / Air Waybill (AWB)",
      "Commercial Invoice (Stamped & Signed) & Packing List",
      "Goods Declaration (GD-HC / GD-IB / GD-EB / GD-EXP) via WeBOC / PSW",
      "Certificate of Origin & SRO Concessionary Certificates (if applicable)",
      "Port Wharfage Receipt, Shipping Line DO & Sindh Excise Cess Challan"
    ],
    mandatoryFields: [
      "GD Number & Filing Date",
      "Importer/Exporter NTN & Sales Tax Registration Number (STRN)",
      "Pakistan Single Window (PSW) Trader ID / WeBOC User ID",
      "8-Digit Pakistan Customs Tariff (PCT) HS Code",
      "Customs Appraising Group (Group 1 to 8)",
      "Duty & Tax Slabs: CD, ACD, Sales Tax (18%), AST (3%), WHT Sec 148"
    ],
    procedureSummary: "Comprehensive customs brokerage for import and export consignments. Encompasses declaration on PSW/WeBOC, electronic document upload, assessment before Customs Appraiser/Principal Appraiser, physical cargo examination, laboratory testing/sampling where applicable, duty payment through 1-Link PSID, and out-of-charge issuance.",
    standardTariff: [
      { id: 'cc_1', category: 'Customs Clearance', description: 'Professional Customs Agency & Electronic Clearing Commission', amount: 25000, taxable: true },
      { id: 'cc_2', category: 'Customs Clearance', description: 'Pakistan Single Window (PSW) / WeBOC Electronic Declaration & Assessment Handling', amount: 8500, taxable: true },
      { id: 'cc_3', category: 'Customs Clearance', description: 'Port Wharfage, Terminal Handling & Shipping Line Delivery Order (DO) Endorsement', amount: 18500, taxable: false },
      { id: 'cc_4', category: 'Customs Clearance', description: 'Customs Examination, De-stuffing & Gate Out / Out-of-Charge Administration', amount: 9500, taxable: true },
      { id: 'cc_5', category: 'Customs Clearance', description: 'Sindh Infrastructure Development Cess (Excise Department) Processing', amount: 12000, taxable: false }
    ]
  },

  "TIR": {
    id: "tir",
    name: "TIR International Road Transport",
    legalAct: "Customs Convention on the International Transport of Goods Under Cover of TIR Carnets (1975) & Pakistan TIR Accession",
    customsRulesRef: "Pakistan Customs TIR Rules 2017 & FBR Guidelines (PNC-ICC Guaranteeing Association)",
    mandatoryDocuments: [
      "TIR Carnet (14-Digit Document issued by PNC-ICC / IRU)",
      "Certificate of Approval for Road Vehicle (Customs Sealed Vehicle Body)",
      "International CMR Consignment Note",
      "TIR Electronic Pre-Declaration (TIR-EPD)",
      "Comprehensive International Transit Insurance Policy"
    ],
    mandatoryFields: [
      "TIR Carnet Number",
      "Vehicle Approval Certificate Number",
      "Customs Office of Departure (e.g., Karachi, Sost, Taftan)",
      "Customs Office of Destination (China, Iran, Turkey, Central Asia)",
      "TIR Carrier Authorization ID (National Guaranteeing Association)",
      "Customs Heavy-Duty Seal Number"
    ],
    procedureSummary: "TIR allows seamless door-to-door transit between Pakistan, Central Asia, Iran, Turkey, and China with zero intermediate border inspections or deposit of customs duties, relying on international carnets and secure vehicle seals recognized by all participating customs authorities.",
    standardTariff: [
      { id: 'tir_1', category: 'TIR', description: 'International Transcontinental Haulage (Under TIR Seal Protocol)', amount: 240000, taxable: false },
      { id: 'tir_2', category: 'TIR', description: 'TIR Carnet Administration, Guarantee & Customs Manifestation Surcharge', amount: 25000, taxable: true },
      { id: 'tir_3', category: 'TIR', description: 'Border En-route Inspection, Customs Escort & Seal Endorsement Formalities', amount: 20000, taxable: true },
      { id: 'tir_4', category: 'TIR', description: 'International Route Tolls, Transit Permits & Border Demurrage Provision', amount: 15000, taxable: false }
    ]
  },

  "ISO Tank Service": {
    id: "iso_tank",
    name: "ISO Tank Specialized Liquid / Hazmat Logistics",
    legalAct: "Pakistan Merchant Shipping Ordinance 2001 & Petroleum Act 1934",
    customsRulesRef: "IMO / IMDG Code (International Maritime Dangerous Goods) & Explosives Act Rules",
    mandatoryDocuments: [
      "Material Safety Data Sheet (MSDS) (16-Section Standard)",
      "Periodic 2.5 & 5 Year Tank Hydrostatic / Pneumatic Inspection Certificate (CSC Plate)",
      "Cleanliness / Prior Cargo Certificate (Food Grade / Chemical Grade)",
      "Dangerous Goods Declaration (DGD) (if hazardous cargo)"
    ],
    mandatoryFields: [
      "IMO Hazmat Class (Class 3 Flammable, Class 8 Corrosive, Class 9, Non-Haz Food)",
      "UN Hazardous Material Number (4-Digit UN Code)",
      "Tare Weight, Maximum Gross Weight & Volume Capacity (Litres)",
      "Steam Heating / Temperature Monitoring Requirement",
      "Emergency Contact & Spillage Response Protocol"
    ],
    procedureSummary: "Specialized intermodal container transport for bulk liquids, petrochemicals, solvents, and food-grade commodities. Requires dedicated prime movers with spark arrestors, ADR certified drivers, dynamic pressure monitoring, and specialized terminal depots for steaming and lifting.",
    standardTariff: [
      { id: 'iso_1', category: 'ISO Tank Service', description: 'Specialized ISO Tank Haulage with Heavy Prime Mover Allocation', amount: 140000, taxable: false },
      { id: 'iso_2', category: 'ISO Tank Service', description: 'IMO Hazmat Safety Placarding & Emergency Response Protocol', amount: 16500, taxable: true },
      { id: 'iso_3', category: 'ISO Tank Service', description: 'Depot Pre-Trip Inspection, Pressure Valve Testing & Cleaning Certificate Fee', amount: 18500, taxable: true },
      { id: 'iso_4', category: 'ISO Tank Service', description: 'Terminal Stevedoring & Dangerous Goods Port Surcharge', amount: 15000, taxable: false }
    ]
  },

  "Car Carrier": {
    id: "car_carrier",
    name: "Car Carrier (Automotive Transport)",
    legalAct: "Motor Vehicles Act 1939 & Provincial Motor Vehicle Ordinances",
    customsRulesRef: "Customs Import of Vehicles Valuation Rules & NHA Axle Load Regulations",
    mandatoryDocuments: [
      "Vehicle Pre-Loading Condition Survey Sheet (Dent & Scratch Diagram)",
      "Vehicle Registration / Customs Import GD / Delivery Challan",
      "Carrier Cargo Insurance Transit Binder",
      "Multi-Unit Loading Manifest & Driver Gate Pass"
    ],
    mandatoryFields: [
      "Vehicle Chassis / VIN Number",
      "Engine Number, Make, Model & Manufacturing Year",
      "Number of Automobile Units on Trailer",
      "Insurance Policy Number & Declared Vehicle Valuation",
      "Destination Dealer / Showroom Address"
    ],
    procedureSummary: "Automotive carrier logistics moving newly imported CBU (Completely Built Units), CKD/SKD, or domestic vehicles on dedicated double-deck trailers. Thorough pre-inspection condition surveys are legally recorded before wheel strapping and en-route tracking.",
    standardTariff: [
      { id: 'car_1', category: 'Car Carrier', description: 'Multi-Vehicle Specialized Auto Carrier Trailer Haulage', amount: 95000, taxable: false },
      { id: 'car_2', category: 'Car Carrier', description: 'Vehicle Condition Survey, Pre-Delivery Inspection (PDI) & Scratch Audit', amount: 7500, taxable: true },
      { id: 'car_3', category: 'Car Carrier', description: 'En-route Transit Vehicle Cargo Insurance & Strapping Security Surcharge', amount: 12500, taxable: false },
      { id: 'car_4', category: 'Car Carrier', description: 'Terminal Ramp Loading/Unloading & Compound Gate Surcharge', amount: 8000, taxable: true }
    ]
  },

  "Liner & NVOCC": {
    id: "liner_nvocc",
    name: "Liner & NVOCC Services",
    legalAct: "Bills of Lading Act 1856 & Carriage of Goods by Sea Act 1925",
    customsRulesRef: "Customs Electronic Manifest (WeBOC IGM / EGM Protocol) & SRO 450(I)/2001",
    mandatoryDocuments: [
      "Master Bill of Lading (MBL) & House Bill of Lading (HBL)",
      "Electronic Import General Manifest (IGM) Data Feed",
      "Line Delivery Order (DO) & Container Security Deposit Receipt",
      "Detention & Demurrage Free Time Guarantee Form"
    ],
    mandatoryFields: [
      "MBL / HBL Number & Shipping Line Name",
      "Vessel Name, Voyage Number & IGM / Index Number",
      "Container Detention Free Days (7, 14, or 21 Days)",
      "Security Deposit Refund Amount & Cheque Number",
      "Container Return Depot Details"
    ],
    procedureSummary: "Non-Vessel Operating Common Carrier agency handling ocean freight, feeder slot coordination, line DO processing, container inventory management, and container deposit refunds in compliance with international maritime and shipping agency standards.",
    standardTariff: [
      { id: 'ln_1', category: 'Liner & NVOCC', description: 'Ocean Freight & Feeder Slot Haulage Charges', amount: 155000, taxable: false },
      { id: 'ln_2', category: 'Liner & NVOCC', description: 'Terminal Handling Charges (THC) & Port Marine Surcharge', amount: 35000, taxable: false },
      { id: 'ln_3', category: 'Liner & NVOCC', description: 'Line Delivery Order (DO) Processing & EDI Manifest Filing Fee', amount: 16500, taxable: true },
      { id: 'ln_4', category: 'Liner & NVOCC', description: 'Container Inventory Monitoring & Security Deposit Administration', amount: 12000, taxable: true }
    ]
  },

  "Breakbulk/Chartering Services": {
    id: "breakbulk",
    name: "Breakbulk, Heavy Lift & Project Cargo",
    legalAct: "National Highway Authority (NHA) Axle Load Regime 2023 & Ports Act 1908",
    customsRulesRef: "Customs Act 1969 & Marine Safety Inspection Rules",
    mandatoryDocuments: [
      "Out of Gauge (OOG) Dimensional Survey & Engineering Drawing",
      "NHA Axle Load & Heavy Route Transit Permission",
      "Port Stevedoring & Shore Crane Gear Inspection Certificate",
      "Marine Cargo Lashing & Securing Certificate"
    ],
    mandatoryFields: [
      "Length x Width x Height Dimensions (OOG Details)",
      "Single Piece Gross Weight & Center of Gravity (Metric Tons)",
      "Lowbed Trailer Axle Count & Hydraulic Modular Spec",
      "NHA Heavy Escort Permit Number",
      "Berth Stevedoring & Crane Rigging Plan"
    ],
    procedureSummary: "Uncontainerized oversized or heavy industrial equipment (turbines, steel coils, generators). Requires hydraulic multi-axle modular trailers, police and route clearance escorts, port crane stevedoring, and specialized marine lashing surveys.",
    standardTariff: [
      { id: 'bb_1', category: 'Breakbulk/Chartering Services', description: 'Heavy-Lift Lowbed / Hydraulic Modular Trailer Haulage', amount: 165000, taxable: false },
      { id: 'bb_2', category: 'Breakbulk/Chartering Services', description: 'Port Stevedoring, Shore Crane Rigging & Marine Discharge Handling', amount: 65000, taxable: false },
      { id: 'bb_3', category: 'Breakbulk/Chartering Services', description: 'NHA Route Survey, Axle Load Clearance & Police Escort Surcharge', amount: 28000, taxable: true },
      { id: 'bb_4', category: 'Breakbulk/Chartering Services', description: 'Marine Cargo Lashing, Chocking & Engineering Inspection Survey', amount: 22000, taxable: true }
    ]
  },

  "Warehousing & Distribution": {
    id: "warehousing",
    name: "Customs Bonded & Public Warehousing",
    legalAct: "Customs Act 1969, Section 84 (Warehousing) & Section 98 (Bond Period)",
    customsRulesRef: "Customs Rules 2001, Chapter XV (Public & Private Warehouses)",
    mandatoryDocuments: [
      "Customs Bonded Warehouse License (Collectorate of Customs)",
      "Into-Bond Goods Declaration (GD-IB) & Section 84 Bond",
      "Customs Gate Inward / Outward Tally Sheet",
      "Ex-Bond Goods Declaration (GD-EB) (upon release of goods)"
    ],
    mandatoryFields: [
      "Customs Warehouse License Number & Bay Number",
      "Bond Period Expiry Date (Statutory Limit 1 Year under Section 98)",
      "Cargo Volume in CBM & Pallet Count",
      "Customs Insurance Coverage Amount",
      "Inward & Outward Gate Pass Numbers"
    ],
    procedureSummary: "Storage of imported goods in customs bonded premises without immediate payment of duty and taxes for up to one year. Duties are paid proportionately on Ex-Bond declarations when consignments are evacuated into local markets.",
    standardTariff: [
      { id: 'wh_1', category: 'Warehousing & Distribution', description: 'Customs Bonded Secure Storage Rental (Per Month / Volume Basis)', amount: 48000, taxable: false },
      { id: 'wh_2', category: 'Warehousing & Distribution', description: 'Container De-stuffing, Palletization & Forklift Handling Fee', amount: 17500, taxable: true },
      { id: 'wh_3', category: 'Warehousing & Distribution', description: 'Into-Bond / Ex-Bond Gate Pass & Customs Stock Register Administration', amount: 9500, taxable: true },
      { id: 'wh_4', category: 'Warehousing & Distribution', description: 'Warehouse Comprehensive Fire, Burglary & Stock Insurance Surcharge', amount: 11000, taxable: false }
    ]
  },

  "Transportation of Private Cargo": {
    id: "private_cargo",
    name: "Transportation of Private Cargo (Domestic Logistics)",
    legalAct: "Carriage by Road Act & Sales Tax on Services Acts",
    customsRulesRef: "National Commercial Freight Rules & Goods Transport Alliance Regulations",
    mandatoryDocuments: [
      "Commercial Goods Bilty / Consignment Note (C/N)",
      "Commercial Tax Invoice & Delivery Challan",
      "Driver License & CNIC Copy",
      "En-route Toll & Fuel Expense Slip"
    ],
    mandatoryFields: [
      "Bilty / Consignment Note Number",
      "Pickup Origin & Destination Delivery Warehouse",
      "Vehicle Registration Number & Driver Mobile Contact",
      "Cargo Commodity, Weight (Tons) & Package Count",
      "Payment Terms: Paid / To-Pay / Advance"
    ],
    procedureSummary: "Point-to-point commercial road haulage for cleared or domestic factory cargo throughout Pakistan. Features instant digital bilty generation, real-time dispatch updates, and comprehensive freight challan billing.",
    standardTariff: [
      { id: 'pc_1', category: 'Transportation of Private Cargo', description: 'Commercial Inland Haulage / Freight (Origin to Destination)', amount: 75000, taxable: false },
      { id: 'pc_2', category: 'Transportation of Private Cargo', description: 'Loading, Unloading & Labour Stevedoring Surcharge', amount: 12500, taxable: true },
      { id: 'pc_3', category: 'Transportation of Private Cargo', description: 'Transit Toll Taxes, Motorway Weigh Station & Fuel Surcharge', amount: 9500, taxable: false },
      { id: 'pc_4', category: 'Transportation of Private Cargo', description: 'Consignment Note (Bilty) Documentation & Electronic POD Processing', amount: 4500, taxable: true }
    ]
  }
};

/**
 * Returns authentic standard charges for any category, scaling freight per container count.
 */
export function getStandardChargesForCategory(category: string, containerCount: number = 1): CaseCharge[] {
  const norm = (category || '').toLowerCase();
  const count = Math.max(1, containerCount || 1);

  // Match category
  let matchedKey = Object.keys(PAKISTAN_CUSTOMS_COMPLIANCE).find(k => 
    norm.includes(k.toLowerCase()) || k.toLowerCase().includes(norm)
  );

  if (!matchedKey) {
    if (norm.includes('afghan') || norm.includes('transit')) matchedKey = "Afghan Transit";
    else if (norm.includes('bonded') || norm.includes('carrier')) matchedKey = "Bonded Carrier";
    else if (norm.includes('clearance')) matchedKey = "Customs Clearance";
    else if (norm.includes('tir')) matchedKey = "TIR";
    else if (norm.includes('tank') || norm.includes('iso')) matchedKey = "ISO Tank Service";
    else if (norm.includes('car')) matchedKey = "Car Carrier";
    else if (norm.includes('liner') || norm.includes('nvocc')) matchedKey = "Liner & NVOCC";
    else if (norm.includes('breakbulk')) matchedKey = "Breakbulk/Chartering Services";
    else if (norm.includes('warehouse')) matchedKey = "Warehousing & Distribution";
    else matchedKey = "Transportation of Private Cargo";
  }

  const spec = PAKISTAN_CUSTOMS_COMPLIANCE[matchedKey];
  if (!spec) return [];

  // Scale first item (haulage/freight) by container count, keep others per case
  return spec.standardTariff.map((item, idx) => {
    if (idx === 0 && count > 1) {
      return {
        ...item,
        description: `${item.description} (${count} Containers @ PKR ${(item.amount).toLocaleString()})`,
        amount: item.amount * count
      };
    }
    return { ...item };
  });
}

/**
 * Validates a case against Pakistan Customs statutory requirements.
 */
export function validateCustomsCompliance(c: Partial<Case>): {
  compliant: boolean;
  missingFields: string[];
  warnings: string[];
  categoryDetail?: CategoryComplianceDetail;
} {
  const cat = c.category || 'Bonded Carrier';
  const detail = Object.values(PAKISTAN_CUSTOMS_COMPLIANCE).find(d => 
    d.name.toLowerCase().includes(cat.toLowerCase()) || cat.toLowerCase().includes(d.name.toLowerCase())
  ) || PAKISTAN_CUSTOMS_COMPLIANCE["Bonded Carrier"];

  const missingFields: string[] = [];
  const warnings: string[] = [];

  const ext = c.extractedData || {};

  // Universal Logistics Check
  if (!c.clientName) missingFields.push("Client Name");
  if (!c.pol) missingFields.push("Port of Loading / Origin (POL)");
  if (!c.pod) missingFields.push("Port of Destination (POD)");
  if (!c.containers || c.containers.length === 0) warnings.push("No containers registered for shipment");

  // Category Specific Compliance Check
  if (cat.includes("Bonded Carrier")) {
    if (!ext.gdNo && !ext.blNumber) warnings.push("Sub-Manifest / TP Number or BL Number recommended under Sec 121");
    if (!ext.trackerId) warnings.push("FBR Satellite Tracking Device (E-Seal) ID not yet assigned");
    if (!c.containers?.every(cntr => cntr.sealNo)) warnings.push("Some containers do not have Customs / Carrier Seal numbers recorded");
  } else if (cat.includes("Afghan Transit")) {
    if (!ext.jawaznamaNo) warnings.push("Jawaznama (Afghan License) required under Customs Rules 2001 Chapter XXV");
    if (!ext.gdNo) warnings.push("WeBOC AT-GD Number required for Afghan Transit Trade clearance");
    if (!ext.trackerId) warnings.push("Mandatory FBR Satellite Tracker ID is missing");
  } else if (cat.includes("Customs Clearance")) {
    if (!ext.gdNo) warnings.push("Goods Declaration (GD) Number is mandatory for Customs Clearance");
    if (!ext.hsCode) warnings.push("8-digit Pakistan Customs Tariff (PCT) HS Code required for assessment");
  } else if (cat.includes("TIR")) {
    if (!ext.tirCarnetNo) warnings.push("14-digit TIR Carnet Number required under UN TIR Convention 1975");
  } else if (cat.includes("ISO Tank")) {
    if (!ext.hazmatClass) warnings.push("IMO Hazmat Class / UN Number must be declared for ISO Tank liquid cargo");
  }

  return {
    compliant: missingFields.length === 0,
    missingFields,
    warnings,
    categoryDetail: detail
  };
}
