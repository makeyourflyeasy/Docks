/**
 * DPL Case Number & Invoice Number Standard Generation Service
 * 
 * Business Rule:
 * Destination-wise case numbering format:
 * DPL-[DEST]-[YY]-[MMM]-[SERIAL]
 * Example for Lahore in September: DPL-LHR-26-SEP-001
 * 
 * DPL    = Docks (Pvt) Ltd.
 * DEST   = Destination Code (e.g. LHR for Lahore, KHI for Karachi, FSD for Faisalabad, etc.)
 * YY     = 2-digit Year (e.g. 26 for 2026)
 * MMM    = 3-letter Month (e.g. SEP, OCT, NOV)
 * SERIAL = Running sequential number (001, 002... up to 100,000+) that continues sequentially until the Year changes.
 * 
 * Invoice Number Rule:
 * "Aur Jo hamara case number hoga vahi hamara invoice number hoga same to same"
 * Case Number is identical to the Invoice Number.
 */

const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'] as const;

export const DESTINATION_CODES: Record<string, string> = {
  'LAHORE': 'LHR',
  'KARACHI': 'KHI',
  'FAISALABAD': 'FSD',
  'ISLAMABAD': 'ISB',
  'RAWALPINDI': 'RWP',
  'MULTAN': 'MUX',
  'PESHAWAR': 'PEW',
  'SIALKOT': 'SKT',
  'QUETTA': 'QTA',
  'GUJRANWALA': 'GUJ',
  'GWADAR': 'GWD',
  'KABUL': 'KBL',
  'KANDAHAR': 'KDH',
  'JALALABAD': 'JAL',
  'CHAMAN': 'CHM',
  'TORKHAM': 'TKM',
  'HYDERABAD': 'HDD',
  'SUKKUR': 'SKR',
  'SAHIWAL': 'SWL',
  'KASUR': 'KSR',
  'SHEIKHUPURA': 'SKP',
  'GUJRAT': 'GJT',
  'PORT QASIM': 'PQA',
  'KICT': 'KHI',
  'PICTC': 'KHI',
  'SAPT': 'KHI'
};

/**
 * Derives a standard 3-letter destination code from POD / Drop-off location
 */
export function getDestinationCode(destination?: string): string {
  if (!destination || typeof destination !== 'string') {
    return 'LHR';
  }

  const upper = destination.toUpperCase().trim();

  // 1. Direct or partial city match
  for (const [city, code] of Object.entries(DESTINATION_CODES)) {
    if (upper.includes(city) || upper.includes(code)) {
      return code;
    }
  }

  // Common dry port aliases
  if (upper.includes('PREM') || upper.includes('MUGHALPURA') || upper.includes('KOT LAKHPAT')) return 'LHR';
  if (upper.includes('GATTI') || upper.includes('CHAK JHUMRA')) return 'FSD';
  if (upper.includes('CHAKLALA') || upper.includes('MARGALLA')) return 'ISB';
  if (upper.includes('SHERSHAH')) return 'MUX';
  if (upper.includes('SAMBRIAL')) return 'SKT';
  if (upper.includes('SPIN BOLDAK')) return 'SPB';
  if (upper.includes('TOR KHAM')) return 'TKM';

  // 2. Extract first 3 clean letters if alphanumeric
  const clean = upper.replace(/[^A-Z]/g, '');
  if (clean.length >= 3) {
    return clean.slice(0, 3);
  }

  return 'LHR';
}

/**
 * Scans existing cases and generates the next strictly sequential case number
 * format: DPL-[DEST]-[YY]-[MMM]-[SERIAL]
 * Serial resets ONLY when Year changes. Month updates dynamically.
 */
export function generateDplCaseNumber(
  existingCases: Array<{ caseNo?: string; createdAt?: string; date?: string }>,
  destination?: string,
  targetDate: Date = new Date()
): string {
  const destCode = getDestinationCode(destination);
  const currentYearFull = targetDate.getFullYear();
  const currentYear2Digit = String(currentYearFull).slice(-2);
  const currentMonth3Letter = MONTH_NAMES[targetDate.getMonth()];

  let maxSeq = 0;

  existingCases.forEach(c => {
    if (!c || !c.caseNo) return;
    const caseStr = String(c.caseNo).trim();

    // Check if this case belongs to the current year
    let caseYear2Digit: string | null = null;

    // Pattern 1: DPL-LHR-26-SEP-001 or DPL-26-000001
    const yearMatch = caseStr.match(/DPL-(?:[A-Z0-9]+-)?(\d{2})-(?:[A-Z]{3}-)?(\d+)/i);
    if (yearMatch) {
      caseYear2Digit = yearMatch[1];
      const seq = parseInt(yearMatch[2], 10);
      if (caseYear2Digit === currentYear2Digit && !isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
      return;
    }

    // Pattern 2: DPL-(\d+) legacy format
    const legacyMatch = caseStr.match(/DPL-(\d+)/i);
    if (legacyMatch) {
      // Check if createdAt is in current year
      const dateStr = c.createdAt || c.date || '';
      if (!dateStr || dateStr.startsWith(String(currentYearFull))) {
        const seq = parseInt(legacyMatch[1], 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
      return;
    }

    // Fallback: extract last numeric group
    const parts = caseStr.split('-');
    const lastPart = parts[parts.length - 1];
    const seq = parseInt(lastPart, 10);
    if (!isNaN(seq) && seq > maxSeq) {
      maxSeq = seq;
    }
  });

  const nextSeq = maxSeq + 1;
  const serialStr = String(nextSeq).padStart(3, '0');

  return `DPL-${destCode}-${currentYear2Digit}-${currentMonth3Letter}-${serialStr}`;
}

/**
 * Returns the exact Invoice Number for a case.
 * Business Rule: "Aur Jo hamara case number hoga vahi hamara invoice number hoga same to same"
 */
export function getCaseInvoiceNumber(caseItem?: { caseNo?: string; id?: string; extractedData?: any }): string {
  if (!caseItem) return 'DPL-INV-PENDING';
  if (caseItem.caseNo && caseItem.caseNo.trim()) {
    return caseItem.caseNo.trim();
  }
  if (caseItem.extractedData?.invoiceNumber) {
    return String(caseItem.extractedData.invoiceNumber).trim();
  }
  return `DPL-${caseItem.id || 'NEW'}`;
}
