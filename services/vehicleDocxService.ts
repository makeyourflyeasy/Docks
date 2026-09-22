import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  Header,
  Footer,
  convertInchesToTwip
} from 'docx';
import { Vehicle } from '../types';

// Company details
export const DOCKS_COMPANY = {
  name: 'Docks (Pvt) Ltd.',
  fullLegalName: 'M/s. Docks (Pvt.) Ltd.',
  address: 'Office No. 13 First Floor, State Life Building No. 7, G-Allana Road Tower, Karachi',
  ntn: '5064083-8',
  customsNtn: '3997968',
  phone: '+92 21 3241 4500',
  email: 'operations@dockspvtltd.com',
  witnesses: {
    w1_arbaz: { name: 'Mr. MUHAMMAD ARBAZ', cnic: '42401-7400526-3' },
    w1_hasnain: { name: 'Mr. MUHAMMAD HASNAIN', cnic: '42401-7452960-7' },
    w2_shams: { name: 'Mr. SHAMS TABREZ BUKHARI', cnic: '42301-0618439-9' }
  }
};

// Date utilities
export function getCleanDate(dateInput?: string | Date): Date {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date) return dateInput;
  // Handle DD/MM/YYYY or DD-MM-YYYY
  if (typeof dateInput === 'string') {
    const parts = dateInput.split(/[/\-.]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      } else {
        // DD-MM-YYYY
        return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      }
    }
  }
  const parsed = new Date(dateInput);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function formatSlashDate(d: Date = new Date()): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function formatDotDate(d: Date = new Date()): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

export function formatDashDate(d: Date = new Date()): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export function getOrdinalSuffix(n: number): string {
  if (n >= 11 && n <= 13) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

export function formatAgreementDate(d: Date = new Date()): string {
  const day = d.getDate();
  const dayStr = String(day).padStart(2, '0') + getOrdinalSuffix(day);
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const monthStr = months[d.getMonth()];
  const year = d.getFullYear();
  return `${dayStr} ${monthStr}, ${year}`;
}

// 6 months calculation
export function calculateSixMonthsExpiry(startDate: Date = new Date()): Date {
  const expiry = new Date(startDate);
  expiry.setMonth(expiry.getMonth() + 6);
  // Customs expiry is typically 6 months minus 1 day (e.g., 19.09.2026 -> 18.03.2027)
  expiry.setDate(expiry.getDate() - 1);
  return expiry;
}

// Helper to extract Maker, Model, MRA, Tare from Vehicle
export function extractVehicleFields(v: Vehicle) {
  let maker = v.maker;
  let model = v.model;

  if (!maker && v.makeModel) {
    const parts = v.makeModel.trim().split(/\s+/);
    maker = parts[0]?.toUpperCase() || 'HINO';
    if (!model && parts.length > 1) {
      model = parts.slice(1).join(' ');
    }
  }

  if (!maker) {
    const reg = (v.registrationNumber || '').toUpperCase();
    if (reg.includes('HINO')) maker = 'HINO';
    else if (reg.includes('NISSAN')) maker = 'NISSAN';
    else if (reg.includes('VOLVO')) maker = 'VOLVO';
    else if (reg.includes('FUSO')) maker = 'FUSO';
    else if (reg.includes('JAC')) maker = 'JAC';
    else maker = 'HINO';
  }

  if (!model) {
    model = v.registrationDate ? v.registrationDate.slice(0, 4) : '2018';
  }

  let mra = v.mra;
  if (!mra) {
    const reg = (v.registrationNumber || '').toUpperCase();
    if (reg.includes('LS') || reg.includes('TLB') || reg.includes('TLD') || reg.includes('TLF') || reg.includes('TLK') || reg.includes('TMG') || reg.includes('TLX')) {
      mra = 'LASBELA';
    } else if (reg.includes('LES') || reg.includes('LPT') || reg.includes('LCA')) {
      mra = 'LAHORE';
    } else if (reg.includes('Z-') || reg.includes('P-') || reg.includes('PR-')) {
      mra = 'PESHAWAR';
    } else if (reg.includes('KP') || reg.includes('C-')) {
      mra = 'HARIPUR';
    } else {
      mra = 'KARACHI';
    }
  }

  const tare = v.tareWeight || (v.weightCapacity ? `${v.weightCapacity} TARE` : '5100 KG');
  const owner = v.ownerName || 'DOCKS (PVT) LTD';
  const ownerFather = v.ownerFatherName || 'BARKHURDAR';
  const ownerCnic = v.ownerCnic || '38301-4549550-1';
  const ownerAddress = v.ownerAddress || 'TAJ MASJID ROAD H.NO.123/3 ST NO.23 MOH AGRA TAJ COLONY KARACHI';

  return { maker, model, mra, tare, owner, ownerFather, ownerCnic, ownerAddress };
}

// Download utility
export async function downloadDocxBlob(doc: Document, filename: string): Promise<void> {
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.docx') ? filename : `${filename}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Table cell border styling helper
const tableBorders = {
  top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  right: { style: BorderStyle.SINGLE, size: 4, color: '000000' }
};

// ============================================================================
// 1. REGISTRATION & RENEWAL APPLICATION LETTER (Company Letterhead)
// From: Letter 10 Vehicles registration letter 07-09-26.pdf
// ============================================================================
export interface RegistrationLetterOptions {
  letterDate?: string | Date;
  referenceNo?: string;
  leaveLetterheadSpace?: boolean; // leaves top margin for pre-printed letterhead
}

export async function generateRegistrationRenewalLetterDocx(
  vehicles: Vehicle[],
  options: RegistrationLetterOptions = {}
): Promise<Document> {
  const dateObj = getCleanDate(options.letterDate);
  const formattedDate = formatSlashDate(dateObj);
  const topMargin = options.leaveLetterheadSpace !== false ? convertInchesToTwip(2.2) : convertInchesToTwip(1.0);

  const tableHeaderRow = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        children: [new Paragraph({ text: 'REG-NO.', alignment: AlignmentType.CENTER, run: { bold: true, size: 18 } })],
        width: { size: 15, type: WidthType.PERCENTAGE },
        borders: tableBorders
      }),
      new TableCell({
        children: [new Paragraph({ text: 'CHASSIS', alignment: AlignmentType.CENTER, run: { bold: true, size: 18 } })],
        width: { size: 18, type: WidthType.PERCENTAGE },
        borders: tableBorders
      }),
      new TableCell({
        children: [new Paragraph({ text: 'ENGINE', alignment: AlignmentType.CENTER, run: { bold: true, size: 18 } })],
        width: { size: 16, type: WidthType.PERCENTAGE },
        borders: tableBorders
      }),
      new TableCell({
        children: [new Paragraph({ text: 'MAKER', alignment: AlignmentType.CENTER, run: { bold: true, size: 18 } })],
        width: { size: 12, type: WidthType.PERCENTAGE },
        borders: tableBorders
      }),
      new TableCell({
        children: [new Paragraph({ text: 'MODEL', alignment: AlignmentType.CENTER, run: { bold: true, size: 18 } })],
        width: { size: 10, type: WidthType.PERCENTAGE },
        borders: tableBorders
      }),
      new TableCell({
        children: [new Paragraph({ text: 'M.R.A.', alignment: AlignmentType.CENTER, run: { bold: true, size: 18 } })],
        width: { size: 13, type: WidthType.PERCENTAGE },
        borders: tableBorders
      }),
      new TableCell({
        children: [new Paragraph({ text: 'OWNER', alignment: AlignmentType.CENTER, run: { bold: true, size: 18 } })],
        width: { size: 16, type: WidthType.PERCENTAGE },
        borders: tableBorders
      })
    ]
  });

  const tableDataRows = vehicles.map((v) => {
    const { maker, model, mra, owner } = extractVehicleFields(v);
    return new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ text: v.registrationNumber || '-', alignment: AlignmentType.CENTER, run: { size: 17 } })],
          borders: tableBorders
        }),
        new TableCell({
          children: [new Paragraph({ text: v.chassisNo || '-', alignment: AlignmentType.CENTER, run: { size: 17 } })],
          borders: tableBorders
        }),
        new TableCell({
          children: [new Paragraph({ text: v.engineNo || '-', alignment: AlignmentType.CENTER, run: { size: 17 } })],
          borders: tableBorders
        }),
        new TableCell({
          children: [new Paragraph({ text: maker || '-', alignment: AlignmentType.CENTER, run: { size: 17 } })],
          borders: tableBorders
        }),
        new TableCell({
          children: [new Paragraph({ text: String(model || '-'), alignment: AlignmentType.CENTER, run: { size: 17 } })],
          borders: tableBorders
        }),
        new TableCell({
          children: [new Paragraph({ text: mra || '-', alignment: AlignmentType.CENTER, run: { size: 17 } })],
          borders: tableBorders
        }),
        new TableCell({
          children: [new Paragraph({ text: owner || '-', alignment: AlignmentType.CENTER, run: { size: 17 } })],
          borders: tableBorders
        })
      ]
    });
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: topMargin,
              bottom: convertInchesToTwip(1.0),
              left: convertInchesToTwip(1.0),
              right: convertInchesToTwip(1.0)
            }
          }
        },
        children: [
          // Date right-aligned
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { after: 280 },
            children: [
              new TextRun({ text: 'Date: ', bold: true, size: 22 }),
              new TextRun({ text: formattedDate, size: 22 })
            ]
          }),

          // Recipient Address
          new Paragraph({
            spacing: { line: 276, after: 300 },
            children: [
              new TextRun({ text: 'The Deputy / Assistant Director,\n', bold: true, size: 22 }),
              new TextRun({ text: 'Licensing of Bonded Carrier,\n', size: 22 }),
              new TextRun({ text: 'Directorate of Transit Trade,\n', size: 22 }),
              new TextRun({ text: 'Custom House,\n', size: 22 }),
              new TextRun({ text: 'Karachi.', bold: true, underline: {}, size: 22 })
            ]
          }),

          // Subject Line
          new Paragraph({
            spacing: { before: 180, after: 240 },
            children: [
              new TextRun({ text: 'Subject:\t', bold: true, size: 22 }),
              new TextRun({
                text: 'REGISTRATION OF VEHICLES AS PRIVATE BONDED CARRIER',
                bold: true,
                underline: {},
                size: 22
              })
            ]
          }),

          // Body text
          new Paragraph({
            spacing: { line: 310, after: 260 },
            children: [
              new TextRun({
                text: `In terms of Rule 329 (5) of Chapter XIV of Customs Rules, 2001, `,
                size: 21
              }),
              new TextRun({
                text: `(${vehicles.length})`,
                bold: true,
                size: 21
              }),
              new TextRun({
                text: ` vehicles indicated below is hereby required to be registered with us for transshipment of imported goods to upcountry Customs Dry Ports / Customs Stations for a period of six months.`,
                size: 21
              })
            ]
          }),

          // Table
          new Table({
            rows: [tableHeaderRow, ...tableDataRows],
            width: { size: 100, type: WidthType.PERCENTAGE }
          }),

          // Closing paragraph
          new Paragraph({
            spacing: { before: 300, line: 280, after: 360 },
            children: [
              new TextRun({
                text: 'It is therefore, you are requested to register the aforementioned list and issue permit accordingly. Thanking for kind perusal',
                size: 21
              })
            ]
          }),

          // Company Sign-off
          new Paragraph({
            spacing: { before: 200 },
            children: [
              new TextRun({
                text: 'Docks (Pvt) Ltd.',
                bold: true,
                size: 23
              })
            ]
          })
        ]
      }
    ]
  });

  return doc;
}

// ============================================================================
// 2. CUSTOMS PERMIT FOR RENEWAL / FRESH REGISTRATION (Customs Office Format)
// From: Custom Vehicle List.pdf
// ============================================================================
export interface CustomsPermitOptions {
  letterDate?: string | Date;
  applicationDate?: string | Date;
  permitNo?: string;
  leaveGovernmentHeaderSpace?: boolean;
}

export async function generateCustomsPermitLetterDocx(
  vehicles: Vehicle[],
  options: CustomsPermitOptions = {}
): Promise<Document> {
  const dateObj = getCleanDate(options.letterDate);
  const formattedDated = formatDotDate(dateObj);
  const appDate = options.applicationDate ? formatDotDate(getCleanDate(options.applicationDate)) : formattedDated;
  const expiryDateObj = calculateSixMonthsExpiry(dateObj);
  const formattedExpiry = formatDotDate(expiryDateObj);
  const permitRef = options.permitNo || 'No. SI/Mics./01/2021–(Licensing)';

  const tableHeaderRow = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        children: [new Paragraph({ text: 'S #', alignment: AlignmentType.CENTER, run: { bold: true, size: 18 } })],
        width: { size: 6, type: WidthType.PERCENTAGE },
        borders: tableBorders
      }),
      new TableCell({
        children: [new Paragraph({ text: 'Reg. No.', alignment: AlignmentType.CENTER, run: { bold: true, size: 18 } })],
        width: { size: 15, type: WidthType.PERCENTAGE },
        borders: tableBorders
      }),
      new TableCell({
        children: [new Paragraph({ text: 'Chassis No.', alignment: AlignmentType.CENTER, run: { bold: true, size: 18 } })],
        width: { size: 18, type: WidthType.PERCENTAGE },
        borders: tableBorders
      }),
      new TableCell({
        children: [new Paragraph({ text: 'Engine No.', alignment: AlignmentType.CENTER, run: { bold: true, size: 18 } })],
        width: { size: 17, type: WidthType.PERCENTAGE },
        borders: tableBorders
      }),
      new TableCell({
        children: [new Paragraph({ text: 'Make', alignment: AlignmentType.CENTER, run: { bold: true, size: 18 } })],
        width: { size: 12, type: WidthType.PERCENTAGE },
        borders: tableBorders
      }),
      new TableCell({
        children: [new Paragraph({ text: 'Model', alignment: AlignmentType.CENTER, run: { bold: true, size: 18 } })],
        width: { size: 10, type: WidthType.PERCENTAGE },
        borders: tableBorders
      }),
      new TableCell({
        children: [new Paragraph({ text: 'MRA', alignment: AlignmentType.CENTER, run: { bold: true, size: 18 } })],
        width: { size: 11, type: WidthType.PERCENTAGE },
        borders: tableBorders
      }),
      new TableCell({
        children: [new Paragraph({ text: 'Expiry', alignment: AlignmentType.CENTER, run: { bold: true, size: 18 } })],
        width: { size: 11, type: WidthType.PERCENTAGE },
        borders: tableBorders
      })
    ]
  });

  const tableDataRows = vehicles.map((v, idx) => {
    const { maker, model, mra } = extractVehicleFields(v);
    return new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ text: String(idx + 1), alignment: AlignmentType.CENTER, run: { size: 17 } })],
          borders: tableBorders
        }),
        new TableCell({
          children: [new Paragraph({ text: v.registrationNumber || '-', alignment: AlignmentType.CENTER, run: { size: 17 } })],
          borders: tableBorders
        }),
        new TableCell({
          children: [new Paragraph({ text: v.chassisNo || '-', alignment: AlignmentType.CENTER, run: { size: 17 } })],
          borders: tableBorders
        }),
        new TableCell({
          children: [new Paragraph({ text: v.engineNo || '-', alignment: AlignmentType.CENTER, run: { size: 17 } })],
          borders: tableBorders
        }),
        new TableCell({
          children: [new Paragraph({ text: maker || '-', alignment: AlignmentType.CENTER, run: { size: 17 } })],
          borders: tableBorders
        }),
        new TableCell({
          children: [new Paragraph({ text: String(model || '-'), alignment: AlignmentType.CENTER, run: { size: 17 } })],
          borders: tableBorders
        }),
        new TableCell({
          children: [new Paragraph({ text: mra || '-', alignment: AlignmentType.CENTER, run: { size: 17 } })],
          borders: tableBorders
        }),
        new TableCell({
          children: [new Paragraph({ text: formattedExpiry, alignment: AlignmentType.CENTER, run: { size: 17 } })],
          borders: tableBorders
        })
      ]
    });
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.9),
              bottom: convertInchesToTwip(0.9),
              left: convertInchesToTwip(0.9),
              right: convertInchesToTwip(0.9)
            }
          }
        },
        children: [
          // Government Header
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { line: 260, after: 120 },
            children: [
              new TextRun({ text: 'Government of Pakistan\n', bold: true, size: 24 }),
              new TextRun({ text: 'Directorate General of Transit Trade\n', bold: true, size: 22 }),
              new TextRun({ text: 'Custom House\n', size: 21 }),
              new TextRun({ text: 'Karachi\n', bold: true, size: 22 }),
              new TextRun({ text: '****', size: 18 })
            ]
          }),

          // Reference & Date Row
          new Paragraph({
            spacing: { before: 140, after: 200 },
            children: [
              new TextRun({ text: `${permitRef}`, bold: true, size: 20 }),
              new TextRun({ text: `\t\t\t\tDated: ${formattedDated}`, bold: true, size: 20 })
            ]
          }),

          // Addressee: M/s. Docks (Pvt) Ltd
          new Paragraph({
            spacing: { line: 260, after: 220 },
            children: [
              new TextRun({ text: 'M/s. Docks (Pvt.) Ltd\n', bold: true, size: 21 }),
              new TextRun({ text: 'Office No.13 First Floor State Life Building No.7\n', size: 20 }),
              new TextRun({ text: 'G-Allana Road Tower,\n', size: 20 }),
              new TextRun({ text: 'Karachi.', bold: true, size: 20 })
            ]
          }),

          // Subject
          new Paragraph({
            spacing: { before: 120, after: 160 },
            children: [
              new TextRun({ text: 'Subject: - \t', bold: true, size: 21 }),
              new TextRun({
                text: 'PERMIT FOR RENEWAL / FRESH REGISTRATION OF VEHICLES IN THE SYSTEM AS PRIVATE BONDED CARRIER / TRANSPORT OPERATOR',
                bold: true,
                underline: {},
                size: 21
              })
            ]
          }),

          // Reference line
          new Paragraph({
            spacing: { after: 180 },
            children: [
              new TextRun({ text: 'Please refer to your application dated ', size: 20 }),
              new TextRun({ text: `${appDate}`, bold: true, underline: {}, size: 20 }),
              new TextRun({ text: ' on the subject cited above.', size: 20 })
            ]
          }),

          // Paragraph 2
          new Paragraph({
            spacing: { line: 290, after: 200 },
            children: [
              new TextRun({ text: '2.\tThe request for renewal of vehicles and fresh registration of ', size: 20 }),
              new TextRun({ text: `${vehicles.length} vehicles`, bold: true, underline: {}, size: 20 }),
              new TextRun({
                text: ` in terms of Rule 329 (5) & (6) of Chapter XIV, Rule 478 (d) of Chapter XXI and Rule 639 (d) of Customs Rules, 2001 notified vide SRO 450(I)/2001 dated 18.06.2001 acceded to and total `,
                size: 20
              }),
              new TextRun({ text: `${vehicles.length} vehicles`, bold: true, underline: {}, size: 20 }),
              new TextRun({
                text: `, particulars of which indicated in the table below are hereby provisionally registered in the system in the with `,
                size: 20
              }),
              new TextRun({ text: `M/s. Docks (Pvt.) Ltd. Karachi`, bold: true, underline: {}, size: 20 }),
              new TextRun({
                text: ` for providing transport facility to the transhipments to and from upcountry Customs Dry Ports as well as transit goods for a period of six months. The Customs House, However, reserves the right to revoke / suspend this provisional registration fully or partially at anytime during the period of its validity without any prior notice.`,
                size: 20
              })
            ]
          }),

          // Table
          new Table({
            rows: [tableHeaderRow, ...tableDataRows],
            width: { size: 100, type: WidthType.PERCENTAGE }
          }),

          // Paragraph 3
          new Paragraph({
            spacing: { before: 240, line: 280, after: 380 },
            children: [
              new TextRun({
                text: '3.\tAppropriate Customs Officer assigned the job of issuing sealing certificate at exit point of Port / Airport must ensure the fulfilment of conditions in terms of Rule 327, 328 and 329 of Chapter XIV and Rule 477, 478 and 479 of Chapter XXI of Customs Rules, 2001 notified vide SRO 450(I)/2001 dated 18.06.2001 besides other conditions contained in the said rules. The Trackers in these vehicles may also be checked by the concerned Customs staff of tracking, sealing and monitoring at the time of exit of vehicles with goods from port.',
                size: 20
              })
            ]
          }),

          // Deputy Director Signature block
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 300 },
            children: [
              new TextRun({ text: '(Deputy Director)\n', bold: true, size: 22 }),
              new TextRun({ text: '(Licensing)', bold: true, size: 21 })
            ]
          })
        ]
      }
    ]
  });

  return doc;
}

// ============================================================================
// 3. VEHICLE LEASE AGREEMENT (Printed on Stamp Paper)
// From: Lease Agreement TAS-582.pdf
// ============================================================================
export interface LeaseAgreementOptions {
  agreementDate?: string | Date;
  leaveStampPaperSpace?: boolean; // leaves ~3.5 inches on top for legal stamp
  customLessorName?: string;
  customFatherName?: string;
  customCnic?: string;
  customAddress?: string;
  witness1Name?: string;
  witness1Cnic?: string;
  witness2Name?: string;
  witness2Cnic?: string;
}

export async function generateLeaseAgreementDocx(
  vehicles: Vehicle[],
  options: LeaseAgreementOptions = {}
): Promise<Document> {
  const dateObj = getCleanDate(options.agreementDate);
  const formattedAgrDate = formatAgreementDate(dateObj);
  const startDateStr = formatDotDate(dateObj);
  const expiryDateObj = calculateSixMonthsExpiry(dateObj);
  const endDateStr = formatDotDate(expiryDateObj);

  // Default to leaving 3.5 inches at the top for Pakistani stamp paper
  const topMargin = options.leaveStampPaperSpace !== false ? convertInchesToTwip(3.5) : convertInchesToTwip(1.0);

  // Lessor information from first vehicle or options
  const firstV = vehicles[0] || {} as Vehicle;
  const { maker: m1, model: mod1, mra: mra1, tare: t1, owner: o1, ownerFather: of1, ownerCnic: oc1, ownerAddress: oa1 } = extractVehicleFields(firstV);
  
  const lessorName = options.customLessorName || o1 || 'GUL HAMEED';
  const lessorFather = options.customFatherName || of1 || 'BARKHURDAR';
  const lessorCnic = options.customCnic || oc1 || '38301-4549550-1';
  const lessorAddress = options.customAddress || oa1 || 'TAJ MASJID ROAD H.NO.123/3 ST NO.23 MOH AGRA TAJ COLONY KARACHI';

  const w1Name = options.witness1Name || DOCKS_COMPANY.witnesses.w1_arbaz.name;
  const w1Cnic = options.witness1Cnic || DOCKS_COMPANY.witnesses.w1_arbaz.cnic;
  const w2Name = options.witness2Name || DOCKS_COMPANY.witnesses.w2_shams.name;
  const w2Cnic = options.witness2Cnic || DOCKS_COMPANY.witnesses.w2_shams.cnic;

  const tableHeaderRow = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        children: [new Paragraph({ text: 'VEHICLE NO.', alignment: AlignmentType.CENTER, run: { bold: true, size: 17 } })],
        borders: tableBorders
      }),
      new TableCell({
        children: [new Paragraph({ text: 'CHASIS NUMBER', alignment: AlignmentType.CENTER, run: { bold: true, size: 17 } })],
        borders: tableBorders
      }),
      new TableCell({
        children: [new Paragraph({ text: 'ENGINE NUMBER', alignment: AlignmentType.CENTER, run: { bold: true, size: 17 } })],
        borders: tableBorders
      }),
      new TableCell({
        children: [new Paragraph({ text: 'MAKER', alignment: AlignmentType.CENTER, run: { bold: true, size: 17 } })],
        borders: tableBorders
      }),
      new TableCell({
        children: [new Paragraph({ text: 'MODEL', alignment: AlignmentType.CENTER, run: { bold: true, size: 17 } })],
        borders: tableBorders
      }),
      new TableCell({
        children: [new Paragraph({ text: 'TARE OF VEHICLE', alignment: AlignmentType.CENTER, run: { bold: true, size: 17 } })],
        borders: tableBorders
      }),
      new TableCell({
        children: [new Paragraph({ text: 'MRA OF VEHICLES', alignment: AlignmentType.CENTER, run: { bold: true, size: 17 } })],
        borders: tableBorders
      })
    ]
  });

  const tableDataRows = vehicles.map((v) => {
    const { maker, model, mra, tare } = extractVehicleFields(v);
    return new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ text: v.registrationNumber || '-', alignment: AlignmentType.CENTER, run: { size: 17 } })],
          borders: tableBorders
        }),
        new TableCell({
          children: [new Paragraph({ text: v.chassisNo || '-', alignment: AlignmentType.CENTER, run: { size: 17 } })],
          borders: tableBorders
        }),
        new TableCell({
          children: [new Paragraph({ text: v.engineNo || '-', alignment: AlignmentType.CENTER, run: { size: 17 } })],
          borders: tableBorders
        }),
        new TableCell({
          children: [new Paragraph({ text: maker || '-', alignment: AlignmentType.CENTER, run: { size: 17 } })],
          borders: tableBorders
        }),
        new TableCell({
          children: [new Paragraph({ text: String(model || '-'), alignment: AlignmentType.CENTER, run: { size: 17 } })],
          borders: tableBorders
        }),
        new TableCell({
          children: [new Paragraph({ text: tare || '5100', alignment: AlignmentType.CENTER, run: { size: 17 } })],
          borders: tableBorders
        }),
        new TableCell({
          children: [new Paragraph({ text: mra || '-', alignment: AlignmentType.CENTER, run: { size: 17 } })],
          borders: tableBorders
        })
      ]
    });
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: topMargin,
              bottom: convertInchesToTwip(0.8),
              left: convertInchesToTwip(0.8),
              right: convertInchesToTwip(0.8)
            }
          }
        },
        children: [
          // Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: 'LEASE AGREEMENT',
                bold: true,
                underline: {},
                size: 26
              })
            ]
          }),

          // Date of Agreement
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 180 },
            children: [
              new TextRun({
                text: `This agreement is made at Karachi on ${formattedAgrDate}.`,
                size: 20
              })
            ]
          }),

          // BETWEEN
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
              new TextRun({ text: 'BETWEEN', bold: true, size: 21 })
            ]
          }),

          // Lessor paragraph
          new Paragraph({
            spacing: { line: 280, after: 160 },
            children: [
              new TextRun({ text: `M/S. ${lessorName.toUpperCase()} S/O ${lessorFather.toUpperCase()}`, bold: true, underline: {}, size: 20 }),
              new TextRun({ text: ' holder of ', size: 20 }),
              new TextRun({ text: `CNIC NO:${lessorCnic}`, bold: true, underline: {}, size: 20 }),
              new TextRun({ text: ' Resident of ', size: 20 }),
              new TextRun({ text: `${lessorAddress.toUpperCase()}`, bold: true, underline: {}, size: 20 }),
              new TextRun({
                text: ' the first part here in after referred to as “Lessor” (which expression wherever the context so permits, shall mean and included their heirs, executors, administrators, successors, attorneys, representatives, nominees and assignee).',
                size: 20
              })
            ]
          }),

          // AND
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
              new TextRun({ text: 'AND', bold: true, size: 21 })
            ]
          }),

          // Lessee paragraph
          new Paragraph({
            spacing: { line: 280, after: 180 },
            children: [
              new TextRun({ text: 'M/s.Docks (Pvt.) Ltd.', bold: true, underline: {}, size: 20 }),
              new TextRun({
                text: ', (bonded Carrier) having OFFICE NO.13 FIRST FLOOR, STATE LIFE BUILDING NO. 7, G-ALLANA ROAD, TOWER, KARACHI, to as “Lessee” (which expression whereas the context so permits, shall mean and include their heirs, executors, administrators, successors, attorneys, representatives, nominees and assignees). WHEREAS, the lessor is the lawful owner of the following vehicles:',
                size: 20
              })
            ]
          }),

          // Vehicle specs table
          new Table({
            rows: [tableHeaderRow, ...tableDataRows],
            width: { size: 100, type: WidthType.PERCENTAGE }
          }),

          // Preamble to terms
          new Paragraph({
            spacing: { before: 200, line: 270, after: 180 },
            children: [
              new TextRun({
                text: 'AND WHEREAS, the lessor has agreed to hand over the above referred vehicle for a period of (Six months) on the lease basis on the following terms and conditions:',
                size: 20
              })
            ]
          }),

          // Clause a
          new Paragraph({
            spacing: { line: 270, after: 120 },
            children: [
              new TextRun({
                text: `a) The vehicle shall be indelibly painted on all four sides clearly indicating the name of “lessees” (Bonded Carrier) and shall be maintained an acceptable standard till the lease period and should not be registered on the other bonded carriers name within the agreement period i.e. `,
                size: 19
              }),
              new TextRun({
                text: `(${startDateStr} to ${endDateStr}).`,
                bold: true,
                underline: {},
                size: 19
              })
            ]
          }),

          // Clause b
          new Paragraph({
            spacing: { line: 270, after: 100 },
            children: [
              new TextRun({
                text: 'b) The designated vehicle shall remain dedicated to M/s. Docks (Pvt.) Ltd.',
                size: 19
              })
            ]
          }),

          // Clause c
          new Paragraph({
            spacing: { line: 270, after: 100 },
            children: [
              new TextRun({
                text: 'c) Payments to the lessor for services rendered shall be made in accordance with agreed rates.',
                size: 19
              })
            ]
          }),

          // Clause d
          new Paragraph({
            spacing: { line: 270, after: 100 },
            children: [
              new TextRun({
                text: 'd) This lease agreement is an irrevocable agreement and cannot be terminated by either party during its validity, except by mutual consideration of both parties.',
                size: 19
              })
            ]
          }),

          // Clause e
          new Paragraph({
            spacing: { line: 270, after: 100 },
            children: [
              new TextRun({
                text: 'e) The vehicle under this lease agreement remained at the disposal of “lessee” and is not used for any unlawful purpose i.e. (vehicle will be used only for the transportation of bonded carrier goods).',
                size: 19
              })
            ]
          }),

          // Clause f
          new Paragraph({
            spacing: { line: 270, after: 100 },
            children: [
              new TextRun({
                text: 'f) The payment to the lessor will be made on monthly basis.',
                size: 19
              })
            ]
          }),

          // Clause g
          new Paragraph({
            spacing: { line: 270, after: 100 },
            children: [
              new TextRun({
                text: 'g) The “Lessee” remained responsible for all the Govt. dues, duty & taxes, charges etc. whatever accrued during the lease period and by usage of vehicle by the “Lessee”.',
                size: 19
              })
            ]
          }),

          // Clause h
          new Paragraph({
            spacing: { line: 270, after: 260 },
            children: [
              new TextRun({
                text: 'h) It is stated that the lessor is also responsible for any liabilities that may arrives on the lessee during transportation / transshipment of the goods including responsibility of payment of loss of government revenue (if any).',
                size: 19
              })
            ]
          }),

          // Signatures: Lessor & Lessee
          new Paragraph({
            spacing: { line: 270, after: 200 },
            children: [
              new TextRun({ text: 'LESSOR\t\t\t\t\t\t\tLEASEE\n\n', bold: true, size: 21 }),
              new TextRun({ text: '__________________________\t\t\t__________________________\n', size: 20 }),
              new TextRun({ text: `${lessorName}\t\t\t\t\tDocks (Pvt.) Ltd.\n`, bold: true, size: 20 }),
              new TextRun({ text: `CNIC: ${lessorCnic}\t\t\t\tNTN No. ${DOCKS_COMPANY.ntn}`, size: 20 })
            ]
          }),

          // Signatures: Witnesses
          new Paragraph({
            spacing: { line: 270, before: 180 },
            children: [
              new TextRun({ text: 'Witness 1:\t\t\t\t\t\tWitness 2:\n\n', bold: true, size: 21 }),
              new TextRun({ text: '__________________________\t\t\t__________________________\n', size: 20 }),
              new TextRun({ text: `${w1Name}\t\t\t\t${w2Name}\n`, bold: true, size: 20 }),
              new TextRun({ text: `CNIC NO. ${w1Cnic}\t\t\tCNIC NO. ${w2Cnic}`, size: 20 })
            ]
          })
        ]
      }
    ]
  });

  return doc;
}

// ============================================================================
// 4. LEASE CANCELLATION AND TERMINATION AGREEMENT (Printed on Stamp Paper)
// From: LEASE TERMINATION OF NOC.pdf
// ============================================================================
export interface LeaseTerminationOptions {
  terminationDate?: string | Date;
  originalAgreementDate?: string | Date;
  leaveStampPaperSpace?: boolean;
  customLessorName?: string;
  customCnic?: string;
  customAddress?: string;
  witness1Name?: string;
  witness1Cnic?: string;
  witness2Name?: string;
  witness2Cnic?: string;
}

export async function generateLeaseTerminationAgreementDocx(
  vehicle: Vehicle,
  options: LeaseTerminationOptions = {}
): Promise<Document> {
  const dateObj = getCleanDate(options.terminationDate);
  const origDate = options.originalAgreementDate ? formatDashDate(getCleanDate(options.originalAgreementDate)) : formatDashDate(dateObj);
  const topMargin = options.leaveStampPaperSpace !== false ? convertInchesToTwip(3.5) : convertInchesToTwip(1.0);

  const { maker, model, mra, tare, owner, ownerCnic, ownerAddress } = extractVehicleFields(vehicle);
  const lessorName = options.customLessorName || owner || 'M/S. FLEET OWNER';
  const lessorCnic = options.customCnic || ownerCnic || '42101-0000000-0';
  const lessorAddress = options.customAddress || ownerAddress || 'Karachi, Pakistan';

  const w1Name = options.witness1Name || DOCKS_COMPANY.witnesses.w1_hasnain.name;
  const w1Cnic = options.witness1Cnic || DOCKS_COMPANY.witnesses.w1_hasnain.cnic;
  const w2Name = options.witness2Name || DOCKS_COMPANY.witnesses.w2_shams.name;
  const w2Cnic = options.witness2Cnic || DOCKS_COMPANY.witnesses.w2_shams.cnic;

  const tableHeaderRow = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        children: [new Paragraph({ text: 'Vehicle No.', alignment: AlignmentType.CENTER, run: { bold: true, size: 18 } })],
        borders: tableBorders
      }),
      new TableCell({
        children: [new Paragraph({ text: 'Chassis No.', alignment: AlignmentType.CENTER, run: { bold: true, size: 18 } })],
        borders: tableBorders
      }),
      new TableCell({
        children: [new Paragraph({ text: 'Engine No.', alignment: AlignmentType.CENTER, run: { bold: true, size: 18 } })],
        borders: tableBorders
      }),
      new TableCell({
        children: [new Paragraph({ text: 'Maker', alignment: AlignmentType.CENTER, run: { bold: true, size: 18 } })],
        borders: tableBorders
      }),
      new TableCell({
        children: [new Paragraph({ text: 'Model', alignment: AlignmentType.CENTER, run: { bold: true, size: 18 } })],
        borders: tableBorders
      }),
      new TableCell({
        children: [new Paragraph({ text: 'Tare of Vehicle', alignment: AlignmentType.CENTER, run: { bold: true, size: 18 } })],
        borders: tableBorders
      }),
      new TableCell({
        children: [new Paragraph({ text: 'MRA of Vehicle', alignment: AlignmentType.CENTER, run: { bold: true, size: 18 } })],
        borders: tableBorders
      })
    ]
  });

  const tableDataRow = new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({ text: vehicle.registrationNumber || '-', alignment: AlignmentType.CENTER, run: { size: 18 } })],
        borders: tableBorders
      }),
      new TableCell({
        children: [new Paragraph({ text: vehicle.chassisNo || '-', alignment: AlignmentType.CENTER, run: { size: 18 } })],
        borders: tableBorders
      }),
      new TableCell({
        children: [new Paragraph({ text: vehicle.engineNo || '-', alignment: AlignmentType.CENTER, run: { size: 18 } })],
        borders: tableBorders
      }),
      new TableCell({
        children: [new Paragraph({ text: maker || '-', alignment: AlignmentType.CENTER, run: { size: 18 } })],
        borders: tableBorders
      }),
      new TableCell({
        children: [new Paragraph({ text: String(model || '-'), alignment: AlignmentType.CENTER, run: { size: 18 } })],
        borders: tableBorders
      }),
      new TableCell({
        children: [new Paragraph({ text: tare || '15000 KG', alignment: AlignmentType.CENTER, run: { size: 18 } })],
        borders: tableBorders
      }),
      new TableCell({
        children: [new Paragraph({ text: mra || '-', alignment: AlignmentType.CENTER, run: { size: 18 } })],
        borders: tableBorders
      })
    ]
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: topMargin,
              bottom: convertInchesToTwip(0.9),
              left: convertInchesToTwip(0.9),
              right: convertInchesToTwip(0.9)
            }
          }
        },
        children: [
          // Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: 'LEASE CANCELLATION AND TERMINATION AGREEMENT',
                bold: true,
                size: 24
              })
            ]
          }),

          // Lessor Statement
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { line: 260, after: 160 },
            children: [
              new TextRun({ text: 'This LEASE CANCELLATION AND TERMINATION AGREEMENT is made by\n', size: 20 }),
              new TextRun({ text: `M/S. ${lessorName.toUpperCase()}\n`, bold: true, underline: {}, size: 21 }),
              new TextRun({ text: '“Owner of Vehicle” hereafter referred to as the Lesser', bold: true, size: 20 })
            ]
          }),

          // AND
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
              new TextRun({ text: 'AND', bold: true, size: 21 })
            ]
          }),

          // Lessee Statement
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [
              new TextRun({ text: 'M/s. DOCKS (PVT) LTD', bold: true, size: 21 }),
              new TextRun({ text: ' hereafter referred to as “Lessee”.', size: 20 })
            ]
          }),

          // Cancellation clause
          new Paragraph({
            spacing: { line: 280, after: 200 },
            children: [
              new TextRun({ text: `The Lease agreement dated `, size: 20 }),
              new TextRun({ text: `${origDate}`, bold: true, underline: {}, size: 20 }),
              new TextRun({
                text: ` made between the Lesser and the Lessee, pertaining to the following vehicles is hereby cancelled / terminated:`,
                size: 20
              })
            ]
          }),

          // Vehicle Table
          new Table({
            rows: [tableHeaderRow, tableDataRow],
            width: { size: 100, type: WidthType.PERCENTAGE }
          }),

          // Agreement Covenant
          new Paragraph({
            spacing: { before: 240, line: 280, after: 300 },
            children: [
              new TextRun({
                text: 'The Lesser and Lessee have mutually agreed that the Lease shall be cancelled and terminated in consideration of the mutual covenants set forth and without any terms and conditions.',
                size: 20
              })
            ]
          }),

          // Lessor Sign Block
          new Paragraph({
            spacing: { line: 260, after: 200 },
            children: [
              new TextRun({ text: 'LESSOR\nSIGNATURE\n\n\n', bold: true, size: 20 }),
              new TextRun({ text: `CNIC No: ${lessorCnic}\n`, size: 20 }),
              new TextRun({ text: `Address: ${lessorAddress}`, size: 20 })
            ]
          }),

          // Lessee Sign Block
          new Paragraph({
            spacing: { line: 260, after: 240 },
            children: [
              new TextRun({ text: 'LESSEE\nSIGNATURE\n\n\n', bold: true, size: 20 }),
              new TextRun({ text: 'M/S. DOCKS (PVT.) LTD\n', bold: true, size: 21 }),
              new TextRun({ text: `CNIC No. / NTN No. ${DOCKS_COMPANY.customsNtn}\n`, size: 20 }),
              new TextRun({ text: `Address: ${DOCKS_COMPANY.address}`, size: 20 })
            ]
          }),

          // Witnesses
          new Paragraph({
            spacing: { line: 260, before: 180 },
            children: [
              new TextRun({ text: 'Witness 1\t\t\t\t\t\tWitness-2\n\n', bold: true, size: 21 }),
              new TextRun({ text: `${w1Name}\t\t\t\t${w2Name}\n`, bold: true, size: 20 }),
              new TextRun({ text: `CNIC NO. ${w1Cnic}\t\t\tCNIC NO. ${w2Cnic}`, size: 20 })
            ]
          })
        ]
      }
    ]
  });

  return doc;
}

// ============================================================================
// 5. CANCELLATION OF REGISTERED VEHICLE FROM OUR PANEL (Company Letterhead)
// From: NOC on letter head.pdf
// ============================================================================
export interface CancellationLetterOptions {
  letterDate?: string | Date;
  leaveLetterheadSpace?: boolean;
}

export async function generateCancellationLetterLetterheadDocx(
  vehicles: Vehicle | Vehicle[],
  options: CancellationLetterOptions = {}
): Promise<Document> {
  const vList = Array.isArray(vehicles) ? vehicles : [vehicles];
  const dateObj = getCleanDate(options.letterDate);
  const formattedDate = formatDashDate(dateObj);
  const topMargin = options.leaveLetterheadSpace !== false ? convertInchesToTwip(2.2) : convertInchesToTwip(1.0);

  const tableHeaderRow = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        children: [new Paragraph({ text: 'Sr. #', alignment: AlignmentType.CENTER, run: { bold: true, size: 18 } })],
        width: { size: 7, type: WidthType.PERCENTAGE },
        borders: tableBorders
      }),
      new TableCell({
        children: [new Paragraph({ text: 'Vehicle No.', alignment: AlignmentType.CENTER, run: { bold: true, size: 18 } })],
        width: { size: 15, type: WidthType.PERCENTAGE },
        borders: tableBorders
      }),
      new TableCell({
        children: [new Paragraph({ text: 'Chassis No.', alignment: AlignmentType.CENTER, run: { bold: true, size: 18 } })],
        width: { size: 18, type: WidthType.PERCENTAGE },
        borders: tableBorders
      }),
      new TableCell({
        children: [new Paragraph({ text: 'Engine No.', alignment: AlignmentType.CENTER, run: { bold: true, size: 18 } })],
        width: { size: 17, type: WidthType.PERCENTAGE },
        borders: tableBorders
      }),
      new TableCell({
        children: [new Paragraph({ text: 'Maker', alignment: AlignmentType.CENTER, run: { bold: true, size: 18 } })],
        width: { size: 12, type: WidthType.PERCENTAGE },
        borders: tableBorders
      }),
      new TableCell({
        children: [new Paragraph({ text: 'Model', alignment: AlignmentType.CENTER, run: { bold: true, size: 18 } })],
        width: { size: 10, type: WidthType.PERCENTAGE },
        borders: tableBorders
      }),
      new TableCell({
        children: [new Paragraph({ text: 'MRA of Vehicle', alignment: AlignmentType.CENTER, run: { bold: true, size: 18 } })],
        width: { size: 11, type: WidthType.PERCENTAGE },
        borders: tableBorders
      }),
      new TableCell({
        children: [new Paragraph({ text: 'Lease Expiry Date', alignment: AlignmentType.CENTER, run: { bold: true, size: 18 } })],
        width: { size: 10, type: WidthType.PERCENTAGE },
        borders: tableBorders
      })
    ]
  });

  const tableDataRows = vList.map((v, idx) => {
    const { maker, model, mra } = extractVehicleFields(v);
    const leaseExp = v.validationExpiryDate
      ? formatDashDate(getCleanDate(v.validationExpiryDate))
      : formatDashDate(dateObj);

    return new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ text: String(idx + 1), alignment: AlignmentType.CENTER, run: { size: 18 } })],
          borders: tableBorders
        }),
        new TableCell({
          children: [new Paragraph({ text: v.registrationNumber || '-', alignment: AlignmentType.CENTER, run: { size: 18 } })],
          borders: tableBorders
        }),
        new TableCell({
          children: [new Paragraph({ text: v.chassisNo || '-', alignment: AlignmentType.CENTER, run: { size: 18 } })],
          borders: tableBorders
        }),
        new TableCell({
          children: [new Paragraph({ text: v.engineNo || '-', alignment: AlignmentType.CENTER, run: { size: 18 } })],
          borders: tableBorders
        }),
        new TableCell({
          children: [new Paragraph({ text: maker || '-', alignment: AlignmentType.CENTER, run: { size: 18 } })],
          borders: tableBorders
        }),
        new TableCell({
          children: [new Paragraph({ text: String(model || '-'), alignment: AlignmentType.CENTER, run: { size: 18 } })],
          borders: tableBorders
        }),
        new TableCell({
          children: [new Paragraph({ text: mra || '-', alignment: AlignmentType.CENTER, run: { size: 18 } })],
          borders: tableBorders
        }),
        new TableCell({
          children: [new Paragraph({ text: leaseExp, alignment: AlignmentType.CENTER, run: { size: 18 } })],
          borders: tableBorders
        })
      ]
    });
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: topMargin,
              bottom: convertInchesToTwip(1.0),
              left: convertInchesToTwip(1.0),
              right: convertInchesToTwip(1.0)
            }
          }
        },
        children: [
          // Date
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { after: 260 },
            children: [
              new TextRun({ text: `Date: ${formattedDate}`, size: 22 })
            ]
          }),

          // Addressee
          new Paragraph({
            spacing: { line: 260, after: 260 },
            children: [
              new TextRun({ text: 'The Deputy Director,\n', bold: true, size: 22 }),
              new TextRun({ text: 'Licensing of Bonded Carrier,\n', size: 22 }),
              new TextRun({ text: 'Directorate of Transit Trade,\n', size: 22 }),
              new TextRun({ text: 'Custom House,\n', size: 22 }),
              new TextRun({ text: 'Karachi.', bold: true, underline: {}, size: 22 })
            ]
          }),

          // Subject
          new Paragraph({
            spacing: { before: 140, after: 200 },
            children: [
              new TextRun({ text: 'Subject:\t', bold: true, size: 22 }),
              new TextRun({
                text: 'CANCELLATION OF REGISTERED VEHICLE FROM OUR PANEL',
                bold: true,
                underline: {},
                size: 22
              })
            ]
          }),

          // Respected Sir
          new Paragraph({
            spacing: { after: 140 },
            children: [
              new TextRun({ text: 'Respected Sir,', size: 21 })
            ]
          }),

          // Text
          new Paragraph({
            spacing: { line: 280, after: 240 },
            children: [
              new TextRun({
                text: 'Reference to the above mentioned subject, this is to inform you that the contract agreement for the below mentioned vehicle gone cancelled. The details are listed as under',
                size: 21
              })
            ]
          }),

          // Table
          new Table({
            rows: [tableHeaderRow, ...tableDataRows],
            width: { size: 100, type: WidthType.PERCENTAGE }
          }),

          // Cooperation
          new Paragraph({
            spacing: { before: 300, after: 260 },
            children: [
              new TextRun({
                text: 'Your usual cooperation in this regard would highly be appreciated.',
                size: 21
              })
            ]
          }),

          // Closing
          new Paragraph({
            spacing: { line: 260, after: 240 },
            children: [
              new TextRun({ text: 'Yours Faithfully,\n\n', size: 21 }),
              new TextRun({ text: '_________________________\n', size: 21 }),
              new TextRun({ text: 'For: DOCKS (PVT) LTD.', bold: true, size: 23 })
            ]
          })
        ]
      }
    ]
  });

  return doc;
}
