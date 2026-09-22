import * as XLSX from 'xlsx';
import { Vehicle } from '../types';

export interface GeneralLedgerExportItem {
  date: string;
  party: string;
  category?: string;
  reference?: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface ClientLedgerExportItem {
  date: string;
  reference?: string;
  party: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

/**
 * Exports General Ledger into a professional Microsoft Excel (.xlsx) workbook
 */
export function exportGeneralLedgerToExcel(
  entries: GeneralLedgerExportItem[],
  summary: { totalDebits: number; totalCredits: number; netBalance: number },
  accountFilter: string = 'ALL'
) {
  const wb = XLSX.utils.book_new();
  const today = new Date().toISOString().split('T')[0];

  // Title and metadata block
  const sheetData: any[][] = [
    ['DPL LOGISTICS & SUPPLY CHAIN - DOCKS (PVT.) LTD'],
    ['GENERAL LEDGER STATEMENT (AUDIT RECORD)'],
    [`Generated On: ${today}`, `Filter / Account: ${accountFilter}`, `Status: Active Official Book`],
    [], // Blank separator
    [
      'Date',
      'Account / Party Name',
      'Account Category',
      'Reference / Voucher',
      'Transaction Description',
      'Debit Incurred (PKR)',
      'Credit Received (PKR)',
      'Cumulative Balance (PKR)'
    ]
  ];

  // Data rows
  entries.forEach((item) => {
    sheetData.push([
      item.date || '',
      item.party || '',
      item.category || '',
      item.reference || '',
      item.description || '',
      Number(item.debit || 0),
      Number(item.credit || 0),
      Number(item.balance || 0)
    ]);
  });

  // Summary Totals Row
  sheetData.push([]);
  sheetData.push([
    'TOTAL SUMMARY',
    '',
    '',
    '',
    'Cumulative Financial Position',
    Number(summary.totalDebits || 0),
    Number(summary.totalCredits || 0),
    Number(summary.netBalance || 0)
  ]);

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Set explicit, generous column widths so no text is truncated in Excel
  ws['!cols'] = [
    { wch: 14 }, // Date
    { wch: 34 }, // Account / Party Name
    { wch: 24 }, // Category
    { wch: 22 }, // Reference
    { wch: 42 }, // Description
    { wch: 20 }, // Debit
    { wch: 20 }, // Credit
    { wch: 24 }  // Balance
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'General Ledger');

  // Also create a Summary Sheet
  const summarySheetData: any[][] = [
    ['DOCKS (PVT.) LTD - FINANCIAL METRICS SUMMARY'],
    [`Statement Period as of: ${today}`],
    [],
    ['Metric Description', 'Amount (PKR)'],
    ['Total Debits (Receivables, Charges & Payables Outflow)', Number(summary.totalDebits || 0)],
    ['Total Credits (Direct Inflows & Payments Received)', Number(summary.totalCredits || 0)],
    ['Net Outstanding / Closing Balance', Number(summary.netBalance || 0)],
    ['Total Number of Transactions Logged', entries.length]
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summarySheetData);
  wsSummary['!cols'] = [
    { wch: 55 },
    { wch: 25 }
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ledger Overview');

  const cleanFilter = accountFilter.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `General_Ledger_DPL_${cleanFilter}_${today}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * Exports Client Statement / Ledger into a professional Microsoft Excel (.xlsx) workbook
 */
export function exportClientLedgerToExcel(
  clientName: string,
  entries: ClientLedgerExportItem[],
  summary: { totalDebits: number; totalCredits: number; netBalance: number }
) {
  const wb = XLSX.utils.book_new();
  const today = new Date().toISOString().split('T')[0];

  const sheetData: any[][] = [
    ['DOCKS (PVT.) LTD - CLIENT STATEMENT OF ACCOUNT'],
    [`Client Name: ${clientName}`],
    [`Statement Date: ${today}`, `Financial Status: Reconciled Official Statement`],
    [],
    [
      'Date',
      'Reference / Invoice / Case',
      'Client / Account',
      'Transaction Details',
      'Charges / Invoiced (Debit PKR)',
      'Paid / Received (Credit PKR)',
      'Current Ledger Balance (PKR)'
    ]
  ];

  entries.forEach((item) => {
    sheetData.push([
      item.date || '',
      item.reference || '',
      item.party || clientName,
      item.description || '',
      Number(item.debit || 0),
      Number(item.credit || 0),
      Number(item.balance || 0)
    ]);
  });

  sheetData.push([]);
  sheetData.push([
    'CLOSING TOTALS',
    '',
    '',
    'Reconciled Account Balance',
    Number(summary.totalDebits || 0),
    Number(summary.totalCredits || 0),
    Number(summary.netBalance || 0)
  ]);

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!cols'] = [
    { wch: 14 }, // Date
    { wch: 28 }, // Reference
    { wch: 32 }, // Client
    { wch: 42 }, // Details
    { wch: 22 }, // Invoiced (Debit)
    { wch: 22 }, // Paid (Credit)
    { wch: 26 }  // Balance
  ];

  const safeClient = clientName.slice(0, 25).replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.utils.book_append_sheet(wb, ws, `${safeClient} Statement`);

  const filename = `Client_Statement_${safeClient}_${today}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * Exports Vehicles Master List to native Excel (.xlsx)
 */
export function exportVehiclesToExcel(vehicles: Vehicle[]) {
  const wb = XLSX.utils.book_new();
  const today = new Date().toISOString().split('T')[0];

  const headers = [
    'Sr No',
    'Vehicle Registration Number',
    'DPL Serial No',
    'Category',
    'Type',
    'Size',
    'Weight Capacity',
    'Engine Number',
    'Chassis Number',
    'Transporter / Fleet Owner',
    'Broker Name',
    'Driver Name',
    'Driver CNIC',
    'Driver Contact',
    'Registration Date',
    'Validity Expiry Date',
    'Tracking Status',
    'Current Trip Status'
  ];

  const sheetData: any[][] = [
    ['DOCKS (PVT.) LTD - MASTER FLEET & VEHICLE REGISTRY'],
    [`Export Date: ${today}`, `Total Vehicles Registered: ${vehicles.length}`],
    [],
    headers
  ];

  vehicles.forEach((v, idx) => {
    sheetData.push([
      idx + 1,
      v.registrationNumber || '',
      v.dplSerial || '',
      v.category || '',
      v.type || '',
      v.size || '',
      v.weightCapacity || '',
      v.engineNo || '',
      v.chassisNo || '',
      v.transporterName || '',
      v.brokerName || v.transporterName || '',
      v.driverName || '',
      v.driverCnic || '',
      v.driverContact || '',
      v.createdAt || '',
      v.validationExpiryDate || '',
      v.isOnline ? 'Online At Station' : 'Offline',
      v.status || 'AVAILABLE'
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!cols'] = [
    { wch: 8 },  // Sr
    { wch: 22 }, // Reg No
    { wch: 22 }, // DPL Serial
    { wch: 18 }, // Category
    { wch: 16 }, // Type
    { wch: 12 }, // Size
    { wch: 18 }, // Weight
    { wch: 20 }, // Engine
    { wch: 20 }, // Chassis
    { wch: 30 }, // Transporter
    { wch: 26 }, // Broker
    { wch: 24 }, // Driver
    { wch: 20 }, // Driver CNIC
    { wch: 18 }, // Driver Contact
    { wch: 16 }, // Reg Date
    { wch: 18 }, // Expiry Date
    { wch: 18 }, // Tracking
    { wch: 18 }  // Status
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Fleet Master');
  XLSX.writeFile(wb, `DPL_Master_Vehicles_Fleet_${today}.xlsx`);
}

/**
 * Generates and downloads a clean Excel template (.xlsx) for Bulk Vehicle Import
 */
export function downloadBulkVehicleExcelTemplate() {
  const wb = XLSX.utils.book_new();

  const headers = [
    'Vehicle Registration Number',
    'Category',
    'Vehicle Type',
    'Vehicle Size',
    'Engine Number',
    'Chassis Number',
    'Transporter / Company Name',
    'Broker Name',
    'Driver Full Name',
    'Driver CNIC',
    'Driver Mobile Contact',
    'Validity Expiry Date (YYYY-MM-DD)'
  ];

  const sampleRows: any[][] = [
    [
      'Vehicle Registration Number',
      'Category (Bonded Carrier / Afghan Transit / TIR / Local Fleet)',
      'Vehicle Type (Flatbed / Lowbed / Container Carrier / Box Truck)',
      'Vehicle Size (20ft / 40ft / 45ft / Loose)',
      'Engine Number',
      'Chassis Number',
      'Transporter / Company Name',
      'Broker Name',
      'Driver Full Name',
      'Driver CNIC',
      'Driver Mobile Contact',
      'Validity Expiry Date (YYYY-MM-DD)'
    ],
    [
      'TLP-101',
      'Bonded Carrier',
      'Flatbed',
      '40ft',
      'ENG-99881',
      'CHS-44332',
      'Naveed Goods Forwarding',
      'Naveed Goods Forwarding',
      'Mohammad Tariq',
      '42101-1234567-1',
      '0300-1122334',
      '2026-12-31'
    ],
    [
      'KBL-505',
      'Afghan Transit',
      'Lowbed',
      '45ft',
      'ENG-55443',
      'CHS-88771',
      'Khyber Logistics',
      'Khyber Logistics',
      'Gul Khan',
      '17301-7654321-3',
      '0333-9988776',
      '2026-11-30'
    ],
    [
      'TIR-808',
      'TIR',
      'Container Carrier',
      '40ft',
      'ENG-11223',
      'CHS-99001',
      'Indus International',
      'Indus International',
      'Rashid Ali',
      '35201-9988776-5',
      '0321-4455667',
      '2027-01-15'
    ]
  ];

  const ws = XLSX.utils.aoa_to_sheet(sampleRows);
  ws['!cols'] = [
    { wch: 26 },
    { wch: 22 },
    { wch: 20 },
    { wch: 16 },
    { wch: 18 },
    { wch: 18 },
    { wch: 30 },
    { wch: 26 },
    { wch: 22 },
    { wch: 20 },
    { wch: 20 },
    { wch: 22 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Vehicle Import Template');
  XLSX.writeFile(wb, 'DPL_Bulk_Vehicle_Registration_Template.xlsx');
}
