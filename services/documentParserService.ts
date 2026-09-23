import * as XLSX from 'xlsx';
// @ts-ignore
import mammoth from 'mammoth';
import { Vehicle, VehicleCategory, VehicleType } from '../types';

export interface ParsedVehicleRow {
  registrationNumber: string;
  category: VehicleCategory;
  type: VehicleType;
  size: '20ft' | '40ft' | '45ft' | 'Loose';
  engineNo: string;
  chassisNo: string;
  transporterName: string;
  brokerName: string;
  driverName: string;
  driverCnic: string;
  driverContact: string;
  validationExpiryDate: string;
  registrationDate?: string;
  weightCapacity?: string;
}

export function parseRobustDate(val: any): string | null {
  if (!val) return null;
  const str = String(val).trim();
  if (!str) return null;

  // If Excel serial number
  if (!isNaN(Number(str)) && Number(str) > 30000) {
    try {
      const dateObj = new Date((Number(str) - 25569) * 86400 * 1000);
      return dateObj.toISOString().slice(0, 10);
    } catch (_) {}
  }

  // Try parsing direct Date string or South Asian/European format DD/MM/YYYY
  const parts = str.split(/[-/.\s]+/);
  if (parts.length === 3) {
    // Check if it's YYYY-MM-DD
    if (parts[0].length === 4) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
    }
    // Check if it's DD/MM/YYYY
    if (parts[2].length === 4) {
      const d = parseInt(parts[0], 10);
      let m = parseInt(parts[1], 10);
      const y = parseInt(parts[2], 10);

      // Handle word months like Oct/October
      if (isNaN(m)) {
        const monthStr = parts[1].toLowerCase();
        const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const matchedIdx = months.findIndex(mon => monthStr.includes(mon));
        if (matchedIdx >= 0) m = matchedIdx + 1;
      }

      if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
    }
  }

  try {
    const parsed = Date.parse(str);
    if (!isNaN(parsed)) {
      return new Date(parsed).toISOString().slice(0, 10);
    }
  } catch (_) {}

  return null;
}

/**
 * Checks if a string or vehicle record looks like corrupted binary / zip data.
 * This prevents zip files (like raw xlsx read as text) from poisoning the database.
 */
export function isCorruptedVehicleRecord(record: { registrationNumber?: string; [key: string]: any }): boolean {
  const reg = String(record?.registrationNumber || '').trim();
  if (!reg) return true;

  // Check for common ZIP / XML / OOXML binary fragments
  if (
    reg.includes('_rels') ||
    reg.includes('workbook.xml') ||
    reg.includes('[Content_Types]') ||
    reg.includes('word/') ||
    reg.includes('xl/') ||
    reg.includes('PK\x03') ||
    reg.includes('PK\x01')
  ) {
    return true;
  }

  // Check for excessive non-printable ASCII or control characters
  let nonPrintableCount = 0;
  for (let i = 0; i < reg.length; i++) {
    const code = reg.charCodeAt(i);
    // Standard printable ascii is 32 to 126
    if (code < 32 || code > 126) {
      nonPrintableCount++;
    }
  }

  if (nonPrintableCount > 2) return true;

  // A genuine registration number usually has letters, numbers, spaces, and hyphens (e.g. KHI-1234, TLP 992)
  // If it has lots of symbols like ^, $, @, %, ;, }, {, \
  const weirdSymbols = (reg.match(/[\\$%^&*@!~`+={}\[\]|;:"<>?]/g) || []).length;
  if (weirdSymbols >= 3) return true;

  return false;
}

/**
 * Normalizes text to standard vehicle category enum
 */
export function mapToVehicleCategory(val: string): VehicleCategory {
  const s = String(val || '').toLowerCase().trim();
  if (s.includes('afghan')) return VehicleCategory.AFGHAN_TRANSIT;
  if (s.includes('tir')) return VehicleCategory.TIR;
  if (s.includes('local') || s.includes('domestic')) return VehicleCategory.LOCAL_TRANSPORTATION;
  return VehicleCategory.BONDED_CARRIER;
}

/**
 * Normalizes text to standard vehicle type enum
 */
export function mapToVehicleType(val: string): VehicleType {
  const s = String(val || '').toLowerCase().trim();
  if (s.includes('low')) return VehicleType.LOWBED;
  if (s.includes('coil')) return VehicleType.COIL_LIFTER;
  if (s.includes('car')) return VehicleType.CAR_CARRIER;
  if (s.includes('mazda')) return VehicleType.MAZDA;
  if (s.includes('shehzore')) return VehicleType.SHEHZORE;
  if (s.includes('open')) return VehicleType.OPEN_TRUCK;
  if (s.includes('container')) return VehicleType.CONTAINER;
  return VehicleType.FLATBED;
}

/**
 * Normalizes vehicle size
 */
export function mapToVehicleSize(val: string): '20ft' | '40ft' | '45ft' | 'Loose' {
  const s = String(val || '').toLowerCase().trim();
  if (s.includes('20')) return '20ft';
  if (s.includes('45')) return '45ft';
  if (s.includes('loose')) return 'Loose';
  return '40ft';
}

/**
 * Parses an Excel (.xlsx / .xls) file buffer into structured vehicle records
 */
export function parseExcelVehicles(arrayBuffer: ArrayBuffer): ParsedVehicleRow[] {
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) return [];

  const ws = wb.Sheets[firstSheetName];
  const jsonData = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' });
  if (!jsonData || jsonData.length === 0) return [];

  // Find header row or assume row 0
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(jsonData.length, 6); i++) {
    const row = jsonData[i];
    if (Array.isArray(row)) {
      const rowText = row.map(c => String(c).toLowerCase()).join(' ');
      if (
        rowText.includes('registration') ||
        rowText.includes('vehicle') ||
        rowText.includes('gadi') ||
        rowText.includes('reg')
      ) {
        headerRowIndex = i;
        break;
      }
    }
  }

  const headers = (jsonData[headerRowIndex] || []).map(h => String(h || '').trim().toLowerCase());

  // Helper to find column index with strict keyword prioritized matching and exclusions
  const findCol = (keywords: string[], exclusions: string[] = []): number => {
    // Stage 1: Exact matches first
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i];
      const matchesExclusion = exclusions.some(ex => h.includes(ex));
      if (matchesExclusion) continue;

      const isExact = keywords.some(kw => h === kw || h.startsWith(kw + ' ') || h.endsWith(' ' + kw));
      if (isExact) return i;
    }

    // Stage 2: Substring inclusion matches
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i];
      const matchesExclusion = exclusions.some(ex => h.includes(ex));
      if (matchesExclusion) continue;

      const matchesKeyword = keywords.some(kw => h.includes(kw));
      if (matchesKeyword) return i;
    }
    return -1;
  };

  // Exclude date/expiry words from registration number to avoid capturing registration date/serial number columns
  const regCol = findCol(['vehicle number', 'vehicle no', 'plate number', 'plate no', 'gadi number', 'gadi no', 'veh no', 'reg no', 'registration no', 'reg', 'gadi', 'vehicle', 'plate', 'number'], ['date', 'expiry', 'valid', 'time', 'issue', 'day']);
  const regDateCol = findCol(['registration date', 'reg date', 'issue date', 'reg_date', 'registered date'], []);
  const catCol = findCol(['category', 'carrier', 'transit']);
  const typeCol = findCol(['type', 'body']);
  const sizeCol = findCol(['size', 'length', 'feet', 'ft']);
  const engCol = findCol(['engine']);
  const chassisKeywordIdx = findCol(['chassis']);
  const chsCol = chassisKeywordIdx >= 0 ? chassisKeywordIdx : findCol(['chasis', 'chass']);
  const transpCol = findCol(['transporter', 'company', 'fleet']);
  const brokerCol = findCol(['broker', 'vendor']);
  const driverCol = findCol(['driver', 'name']);
  const cnicCol = findCol(['cnic', 'nic', 'id card', 'cnic no']);
  const contactCol = findCol(['contact', 'phone', 'mobile', 'cell', 'phone no']);
  const expiryCol = findCol(['expiry', 'valid', 'expire', 'exp', 'expiry date', 'validity'], ['registration', 'reg', 'start', 'issue']);
  const weightCol = findCol(['weight', 'capacity', 'ton']);

  const results: ParsedVehicleRow[] = [];

  for (let r = headerRowIndex + 1; r < jsonData.length; r++) {
    const row = jsonData[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    const rawReg = regCol >= 0 ? row[regCol] : row[0];
    const cleanReg = String(rawReg || '').trim().toUpperCase();

    // Skip empty rows or headers
    if (!cleanReg || cleanReg.toLowerCase().includes('vehicle registration') || cleanReg.toLowerCase() === 'sr no' || cleanReg.toLowerCase() === 'serial') {
      continue;
    }

    if (isCorruptedVehicleRecord({ registrationNumber: cleanReg })) {
      continue;
    }

    const category = mapToVehicleCategory(catCol >= 0 ? String(row[catCol]) : (row[1] ? String(row[1]) : 'Bonded Carrier'));
    const type = mapToVehicleType(typeCol >= 0 ? String(row[typeCol]) : (row[2] ? String(row[2]) : 'Flatbed'));
    const size = mapToVehicleSize(sizeCol >= 0 ? String(row[sizeCol]) : (row[3] ? String(row[3]) : '40ft'));

    const engineNo = engCol >= 0 ? String(row[engCol] || '').trim() : (row[4] ? String(row[4]).trim() : 'N/A');
    const chassisNo = chsCol >= 0 ? String(row[chsCol] || '').trim() : (row[5] ? String(row[5]).trim() : 'N/A');
    
    const transporter = transpCol >= 0 ? String(row[transpCol] || '').trim() : (row[6] ? String(row[6]).trim() : 'Direct Fleet');
    const broker = brokerCol >= 0 ? String(row[brokerCol] || '').trim() : transporter;

    const driverName = driverCol >= 0 ? String(row[driverCol] || '').trim() : (row[8] ? String(row[8]).trim() : 'N/A');
    const driverCnic = cnicCol >= 0 ? String(row[cnicCol] || '').trim() : (row[9] ? String(row[9]).trim() : 'N/A');
    const driverContact = contactCol >= 0 ? String(row[contactCol] || '').trim() : (row[10] ? String(row[10]).trim() : 'N/A');

    let expiry = expiryCol >= 0 ? parseRobustDate(row[expiryCol]) : null;
    if (!expiry) {
      expiry = new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    }

    const regDate = regDateCol >= 0 ? parseRobustDate(row[regDateCol]) || undefined : undefined;

    const weightCapacity = weightCol >= 0 ? String(row[weightCol] || '').trim() : undefined;

    results.push({
      registrationNumber: cleanReg,
      category,
      type,
      size,
      engineNo: engineNo || 'N/A',
      chassisNo: chassisNo || 'N/A',
      transporterName: transporter || 'Direct Fleet',
      brokerName: broker || transporter || 'Direct Fleet',
      driverName: driverName || 'N/A',
      driverCnic: driverCnic || 'N/A',
      driverContact: driverContact || 'N/A',
      validationExpiryDate: expiry,
      registrationDate: regDate,
      weightCapacity
    });
  }

  return results;
}

/**
 * Parses Word (.docx) documents containing vehicle lists or tables using Mammoth
 */
export async function parseDocxVehicles(arrayBuffer: ArrayBuffer): Promise<ParsedVehicleRow[]> {
  try {
    // 1. First attempt to extract HTML to parse tables if present
    const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
    const html = htmlResult.value;

    if (html && html.includes('<table')) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const tables = doc.querySelectorAll('table');
      const tableRows: string[][] = [];

      tables.forEach(table => {
        const rows = table.querySelectorAll('tr');
        rows.forEach(tr => {
          const cells = tr.querySelectorAll('td, th');
          const rowData: string[] = [];
          cells.forEach(td => rowData.push(td.textContent?.trim() || ''));
          if (rowData.length > 0) {
            tableRows.push(rowData);
          }
        });
      });

      if (tableRows.length > 1) {
        // Convert to Excel-like 2D array and parse
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(tableRows);
        XLSX.utils.book_append_sheet(wb, ws, 'DocxTable');
        const ab = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
        return parseExcelVehicles(ab);
      }
    }

    // 2. Fallback to raw text extraction (line-by-line / CSV-like or key-value)
    const textResult = await mammoth.extractRawText({ arrayBuffer });
    const text = textResult.value || '';
    return parseTextOrCsvVehicles(text);
  } catch (err) {
    console.error('Error parsing DOCX file:', err);
    return [];
  }
}

/**
 * Parses plain text, CSV, or TSV vehicle data
 */
export function parseTextOrCsvVehicles(text: string): ParsedVehicleRow[] {
  if (!text || typeof text !== 'string') return [];

  // Guard against binary data accidentally passed as text (like raw zip bytes)
  if (text.startsWith('PK\x03\x04') || text.includes('_rels/.rels') || text.includes('xl/workbook.xml')) {
    console.warn('Blocked raw binary zip/docx/xlsx data from text parser.');
    return [];
  }

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const results: ParsedVehicleRow[] = [];

  for (const line of lines) {
    // Determine delimiter: comma, tab, pipe, or semicolon
    let delimiter = ',';
    if (line.includes('\t')) delimiter = '\t';
    else if (line.includes('|')) delimiter = '|';
    else if (line.includes(';') && !line.includes(',')) delimiter = ';';

    const cols = line.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
    if (cols.length === 0) continue;

    const rawReg = cols[0];
    if (!rawReg) continue;

    const cleanReg = rawReg.toUpperCase();
    if (
      cleanReg.includes('REGISTRATION') ||
      cleanReg.includes('VEHICLE') ||
      cleanReg.includes('SR NO') ||
      cleanReg === 'GADI NO'
    ) {
      continue;
    }

    if (isCorruptedVehicleRecord({ registrationNumber: cleanReg })) {
      continue;
    }

    const category = mapToVehicleCategory(cols[1] || 'Bonded Carrier');
    const type = mapToVehicleType(cols[2] || 'Flatbed');
    const size = mapToVehicleSize(cols[3] || '40ft');
    const engineNo = cols[4] || 'N/A';
    const chassisNo = cols[5] || 'N/A';
    const transporter = cols[6] || 'Direct Fleet';
    const broker = cols[7] || transporter;
    const driverName = cols[8] || 'N/A';
    const driverCnic = cols[9] || 'N/A';
    const driverContact = cols[10] || 'N/A';
    let expiry = cols[11] || '';

    if (!expiry || !/^\d{4}-\d{2}-\d{2}$/.test(expiry)) {
      expiry = new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    }

    results.push({
      registrationNumber: cleanReg,
      category,
      type,
      size,
      engineNo,
      chassisNo,
      transporterName: transporter,
      brokerName: broker,
      driverName,
      driverCnic,
      driverContact,
      validationExpiryDate: expiry
    });
  }

  return results;
}

/**
 * Universal Master File Parser for Vehicles
 * Automatically routes .xlsx, .xls, .docx, .csv, .txt to the correct parser
 */
export async function parseVehicleFile(file: File): Promise<{
  rows: ParsedVehicleRow[];
  fileType: 'EXCEL' | 'DOCX' | 'CSV_TEXT' | 'UNKNOWN';
  error?: string;
}> {
  const name = file.name.toLowerCase();

  try {
    // 1. Excel (.xlsx, .xls, .xlsm, .csv)
    if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.xlsm')) {
      const buffer = await file.arrayBuffer();
      const rows = parseExcelVehicles(buffer);
      return { rows, fileType: 'EXCEL' };
    }

    // 2. Word (.docx)
    if (name.endsWith('.docx')) {
      const buffer = await file.arrayBuffer();
      const rows = await parseDocxVehicles(buffer);
      return { rows, fileType: 'DOCX' };
    }

    // 3. CSV / Text / Tab delimited
    if (name.endsWith('.csv') || name.endsWith('.txt') || name.endsWith('.tsv')) {
      const text = await file.text();
      // Double check if user renamed an .xlsx or .docx to .csv
      if (text.startsWith('PK\x03\x04')) {
        // It's actually a zip/xlsx!
        const buffer = await file.arrayBuffer();
        const rows = parseExcelVehicles(buffer);
        return { rows, fileType: 'EXCEL' };
      }
      const rows = parseTextOrCsvVehicles(text);
      return { rows, fileType: 'CSV_TEXT' };
    }

    // Fallback: check magic numbers by reading first 4 bytes
    const slice = await file.slice(0, 4).arrayBuffer();
    const bytes = new Uint8Array(slice);
    const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b; // 'PK'

    if (isZip) {
      // Could be xlsx or docx
      const buffer = await file.arrayBuffer();
      try {
        const rows = parseExcelVehicles(buffer);
        if (rows.length > 0) {
          return { rows, fileType: 'EXCEL' };
        }
      } catch (_) {}

      try {
        const rows = await parseDocxVehicles(buffer);
        if (rows.length > 0) {
          return { rows, fileType: 'DOCX' };
        }
      } catch (_) {}
    }

    // Fallback to text
    const text = await file.text();
    const rows = parseTextOrCsvVehicles(text);
    return { rows, fileType: 'CSV_TEXT' };
  } catch (err: any) {
    console.error('Master file parser failed:', err);
    return {
      rows: [],
      fileType: 'UNKNOWN',
      error: err?.message || 'Failed to read document file'
    };
  }
}
