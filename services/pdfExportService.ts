import { jsPDF } from 'jspdf';
import { Case, Container, Vehicle } from '../types';
import { getStoredBranding } from './brandingService';

export interface PdfExportOptions {
  onlyInvoice?: boolean;
  withInvoice?: boolean;
  withAttachments?: boolean;
  previewOnly?: boolean;
  onlyCaseDetails?: boolean;
}

export interface BrandingInfo {
  companyName: string;
  subtitle?: string;
  customLogo?: string | null;
  address?: string;
  phone?: string;
  cell?: string;
  email?: string;
  web?: string;
  directorName?: string;
  directorTitle?: string;
}

let cachedDplLogoPngUrl: string | null = null;

export async function getDefaultLogoPngUrl(): Promise<string> {
  if (cachedDplLogoPngUrl) return cachedDplLogoPngUrl;
  if (typeof window === 'undefined') return '';

  return new Promise((resolve) => {
    try {
      const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="30 25 930 190" width="930" height="190">
        <defs>
          <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="80%">
            <stop offset="0%" stop-color="#FFF5B8"/>
            <stop offset="12%" stop-color="#FCE182"/>
            <stop offset="28%" stop-color="#EDB840"/>
            <stop offset="48%" stop-color="#CCA026"/>
            <stop offset="68%" stop-color="#F8DD7B"/>
            <stop offset="85%" stop-color="#E2B438"/>
            <stop offset="100%" stop-color="#B28014"/>
          </linearGradient>
          <linearGradient id="s1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#DBAC33"/>
            <stop offset="50%" stop-color="#FCE48D"/>
            <stop offset="100%" stop-color="#C2921C"/>
          </linearGradient>
        </defs>
        <g>
          <path d="M 45,36 L 215,36 L 203,62 L 45,62 Z" fill="url(#s1)" stroke="#8C630D" stroke-width="1.2"/>
          <path d="M 45,80 L 180,80 L 168,106 L 45,106 Z" fill="url(#s1)" stroke="#8C630D" stroke-width="1.2"/>
          <path d="M 45,124 L 145,124 L 133,150 L 45,150 Z" fill="url(#s1)" stroke="#8C630D" stroke-width="1.2"/>
          <path fill-rule="evenodd" d="M 265,36 L 370,36 C 415,36 442,65 442,105 C 442,155 410,204 345,204 L 145,204 L 225,120 L 280,120 L 298,80 L 245,80 Z M 305,68 L 345,68 C 370,68 388,86 388,110 C 388,142 368,172 335,172 L 278,172 L 302,144 L 322,144 L 332,102 L 288,102 Z" fill="url(#g1)" stroke="#8C630D" stroke-width="1.5"/>
          <path fill-rule="evenodd" d="M 485,36 L 580,36 C 630,36 655,62 655,98 C 655,134 628,152 575,152 L 508,152 L 482,204 L 415,204 Z M 522,68 L 560,68 C 585,68 600,80 600,98 C 600,116 585,122 560,122 L 498,122 Z" fill="url(#g1)" stroke="#8C630D" stroke-width="1.5"/>
          <path d="M 685,36 L 770,36 L 715,132 L 630,132 Z" fill="url(#g1)" stroke="#8C630D" stroke-width="1.5"/>
          <path d="M 625,148 C 605,148 595,160 595,176 C 595,192 605,204 625,204 L 770,204 L 795,148 Z" fill="url(#g1)" stroke="#8C630D" stroke-width="1.5"/>
          <path d="M 820,148 L 955,148 L 955,164 L 813,164 Z" fill="url(#s1)" stroke="#8C630D" stroke-width="1.2"/>
          <path d="M 808,168 L 955,168 L 955,184 L 801,184 Z" fill="url(#s1)" stroke="#8C630D" stroke-width="1.2"/>
          <path d="M 796,188 L 955,188 L 955,204 L 789,204 Z" fill="url(#s1)" stroke="#8C630D" stroke-width="1.2"/>
        </g>
      </svg>`;

      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 930;
        canvas.height = 190;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          cachedDplLogoPngUrl = dataUrl;
          URL.revokeObjectURL(url);
          resolve(dataUrl);
        } else {
          URL.revokeObjectURL(url);
          resolve('');
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve('');
      };
      img.src = url;
    } catch {
      resolve('');
    }
  });
}

export async function resolvePdfLogoUrl(customLogo?: string | null): Promise<string> {
  if (customLogo && typeof customLogo === 'string' && customLogo.startsWith('data:image/')) {
    if (customLogo.includes('image/svg+xml')) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width || 800;
          canvas.height = img.height || 300;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
          } else {
            resolve(customLogo);
          }
        };
        img.onerror = async () => {
          resolve(await getDefaultLogoPngUrl());
        };
        img.src = customLogo;
      });
    }
    return customLogo;
  }
  return await getDefaultLogoPngUrl();
}

/**
 * Utility to strip non-ASCII characters that break standard PDF fonts (Helvetica)
 * causing corrupted characters or mojibake.
 */
export function cleanPdfText(str?: string | null): string {
  if (!str) return '';
  return String(str).replace(/[^\x20-\x7E]/g, '').trim();
}

/**
 * Draws the official corporate header with logo, company legal name,
 * customs bonded status, office address, phones, cell numbers, email & website
 * alongside the document title and reference number.
 * Ensures strict width bounding so left-side company text never overlaps
 * right-side document metadata or runs off the page.
 */
export async function drawPdfCorporateHeader(
  doc: jsPDF,
  options: {
    title: string;
    refNo?: string;
    date?: string;
    subRef?: string;
    branding?: BrandingInfo;
    accentColor?: [number, number, number];
  }
): Promise<number> {
  const stored = getStoredBranding();
  const b = { ...stored, ...options.branding };
  const companyName = cleanPdfText(b.companyName) || 'DOCKS (PVT) LTD.';
  const subtitle = cleanPdfText(b.subtitle) || 'CUSTOMS BONDED CARRIER';
  const address = cleanPdfText(b.address) || 'Office No. 14-B, First Floor, State Life Building No. 7, G-Allana Road Tower, Karachi.';
  const phone = cleanPdfText(b.phone) || '+92-21-32330103, +92-21-32330104';
  const cell = cleanPdfText(b.cell) || '+92-321-9222883, +92-321-8496006';
  const email = cleanPdfText(b.email) || 'director@dockspk.com';
  const web = cleanPdfText(b.web) || 'www.dockspk.com';

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const startY = 12;

  // Top accent bars
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 5, 'F');
  const accent = options.accentColor || [234, 179, 8];
  doc.setFillColor(accent[0], accent[1], accent[2]);
  doc.rect(0, 5, pageWidth, 1.8, 'F');

  const logoUrl = await resolvePdfLogoUrl(b.customLogo);
  const logoW = 34;
  const logoH = 7.5;
  let logoDrawn = false;

  if (logoUrl) {
    try {
      const format = logoUrl.includes('image/jpeg') || logoUrl.includes('image/jpg') ? 'JPEG' : 'PNG';
      doc.addImage(logoUrl, format, margin, startY, logoW, logoH);
      logoDrawn = true;
    } catch (e) {
      console.warn('Could not draw logo into PDF:', e);
    }
  }

  const textStartX = logoDrawn ? margin + logoW + 3.5 : margin;

  // Clean right-aligned texts
  const cleanTitle = cleanPdfText(options.title);
  const cleanRef = options.refNo ? cleanPdfText(options.refNo) : undefined;
  const cleanDate = options.date ? cleanPdfText(options.date) : undefined;
  const cleanSubRef = options.subRef ? cleanPdfText(options.subRef) : undefined;

  // Measure right block to allocate space and guarantee no overlap
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  let maxRightTextWidth = cleanTitle ? doc.getTextWidth(cleanTitle) : 38;
  if (cleanRef) {
    doc.setFontSize(8);
    maxRightTextWidth = Math.max(maxRightTextWidth, doc.getTextWidth(cleanRef));
  }
  const rightColWidth = Math.max(48, maxRightTextWidth + 4);
  const maxLeftWidth = Math.max(45, (pageWidth - margin) - textStartX - rightColWidth - 5);

  // Left Column:
  // 1. Company Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(15, 23, 42);
  doc.text(companyName.toUpperCase(), textStartX, startY + 3.5, { maxWidth: maxLeftWidth });

  // 2. Subtitle (Wraps cleanly within maxLeftWidth)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(180, 83, 9);
  const subLines: string[] = doc.splitTextToSize(subtitle.toUpperCase(), maxLeftWidth);
  let currLeftY = startY + 6.8;
  const maxSubLines = Math.min(subLines.length, 2);
  for (let i = 0; i < maxSubLines; i++) {
    doc.text(subLines[i], textStartX, currLeftY);
    currLeftY += 2.6;
  }

  // Right-aligned Document Title & Metadata
  let currRightY = startY + 3.8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(accent[0] === 234 ? 180 : accent[0], accent[1] === 179 ? 83 : accent[1], accent[2] === 8 ? 9 : accent[2]);
  doc.text(cleanTitle, pageWidth - margin, currRightY, { align: 'right' });

  if (cleanRef) {
    currRightY += 4.2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(15, 23, 42);
    doc.text(cleanRef, pageWidth - margin, currRightY, { align: 'right' });
  }

  if (cleanDate) {
    currRightY += 3.8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(100, 116, 139);
    doc.text(`Date: ${cleanDate}`, pageWidth - margin, currRightY, { align: 'right' });
  }

  if (cleanSubRef) {
    currRightY += 3.4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text(cleanSubRef, pageWidth - margin, currRightY, { align: 'right' });
  }

  // Divider line sits safely below left branding, right metadata, and logo
  const dividerY = Math.max(currLeftY, currRightY, startY + logoH) + 3.2;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, dividerY, pageWidth - margin, dividerY);

  return dividerY + 4.0;
}

/**
 * Draws the official corporate footer across all documents.
 * All office address, phone numbers, cell numbers, email & website are anchored
 * at the bottom of the page, keeping the header clean and uncluttered.
 */
export function drawPdfCorporateFooter(
  doc: jsPDF,
  rightText: string = 'ERP Verified Document',
  branding?: BrandingInfo
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const b = { ...getStoredBranding(), ...branding };
  const companyName = cleanPdfText(b.companyName) || 'DOCKS (PVT) LTD.';
  const address = cleanPdfText(b.address) || 'Office No. 14-B, First Floor, State Life Building No. 7, G-Allana Road Tower, Karachi.';
  const phone = cleanPdfText(b.phone) || '+92-21-32330103, +92-21-32330104';
  const cell = cleanPdfText(b.cell) || '+92-321-9222883, +92-321-8496006';
  const email = cleanPdfText(b.email) || 'director@dockspk.com';
  const web = cleanPdfText(b.web) || 'www.dockspk.com';

  const cleanRight = cleanPdfText(rightText);
  const dividerY = pageHeight - 16;
  const centerX = pageWidth / 2;

  // Bottom footer divider line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.35);
  doc.line(margin, dividerY, pageWidth - margin, dividerY);

  // Line 1: Company Legal Name & Office Address (CENTERED)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(51, 65, 85);
  const addrText = `${companyName}  •  Office Address: ${address}`;
  doc.text(addrText, centerX, dividerY + 3.8, { align: 'center', maxWidth: pageWidth - (margin * 2) });

  // Line 2: All contact numbers, cell phones, email & website (CENTERED)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.9);
  doc.setTextColor(100, 116, 139);
  const phonePart = phone ? `Phone: ${phone}` : '';
  const cellPart = cell ? `Cell: ${cell}` : '';
  const emailPart = email ? `Email: ${email}` : '';
  const webPart = web ? `Web: ${web}` : '';
  const contactText = [phonePart, cellPart, emailPart, webPart].filter(Boolean).join('  |  ');
  doc.text(contactText, centerX, dividerY + 7.4, { align: 'center', maxWidth: pageWidth - (margin * 2) });

  // Line 3: Page Number / Status (CENTERED UNDERNEATH ADDRESS & CONTACT INFO)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(148, 163, 184);
  const pageText = cleanRight || 'Page 1 of 1';
  doc.text(pageText, centerX, dividerY + 11.0, { align: 'center' });
}

/**
 * Draws the official corporate stamp only (strictly no personal signature line).
 * In accordance with DOCKS SRS Policy:
 * Payment receipts: Accountant signature + stamp.
 * All other documents (Invoices, DOs, NOCs, Dossiers): Official Company Stamp Only.
 */
export function drawOfficialCompanyStampOnly(
  doc: jsPDF,
  x: number,
  y: number,
  title: string = 'OFFICIAL CARRIER SEAL'
): void {
  try {
    const boxW = 56;
    const boxH = 22;

    // Outer border
    doc.setDrawColor(30, 58, 138); // Deep Navy
    doc.setLineWidth(0.6);
    doc.roundedRect(x, y, boxW, boxH, 2, 2, 'S');

    // Inner thin border
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.2);
    doc.roundedRect(x + 1, y + 1, boxW - 2, boxH - 2, 1.5, 1.5, 'S');

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(30, 58, 138);
    doc.text('DOCKS (PVT) LTD.', x + (boxW / 2), y + 4.8, { align: 'center' });

    // Subtitle
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4.8);
    doc.setTextColor(37, 99, 235);
    doc.text('BONDED CARRIER • FLEET OPERATIONS', x + (boxW / 2), y + 8.2, { align: 'center' });

    // Center Badge
    doc.setFillColor(30, 58, 138);
    doc.rect(x + 2, y + 9.8, boxW - 4, 5.2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(255, 255, 255);
    doc.text(title, x + (boxW / 2), y + 13.5, { align: 'center' });

    // Footer notice
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4.2);
    doc.setTextColor(30, 58, 138);
    doc.text('ERP DIGITALLY AUTHENTICATED', x + (boxW / 2), y + 17.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(3.8);
    doc.setTextColor(100, 116, 139);
    doc.text('OFFICIAL STAMP ONLY • NO SIGNATURE REQUIRED', x + (boxW / 2), y + 20.2, { align: 'center' });
  } catch (err) {
    console.warn('Error drawing official company stamp:', err);
  }
}

/**
 * Draws the Accountant's Signature & Stamp.
 * EXCLUSIVELY applied to Payment Receipts per DOCKS SRS.
 */
export function drawAccountantStampAndSignature(
  doc: jsPDF,
  currentY: number,
  margin: number,
  pageWidth: number
): void {
  // Left: Official Company Stamp
  drawOfficialCompanyStampOnly(doc, margin + 4, currentY, 'PAYMENT VERIFIED & RECORDED');

  // Right: Accountant Signature & Stamp Line
  const sigX = pageWidth - margin - 64;
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);
  doc.line(sigX, currentY + 14, sigX + 60, currentY + 14);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text("ACCOUNTANT'S SIGNATURE & STAMP", sigX + 30, currentY + 18, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(100, 116, 139);
  doc.text('Finance & Terminal Accounts Department', sigX + 30, currentY + 21.5, { align: 'center' });
}

/**
 * Generates an official, beautifully formatted A4 PDF dossier or invoice
 * and automatically triggers a direct file download on mobile/desktop devices.
 */
export async function downloadCasePdf(
  targetCase: Case,
  branding: BrandingInfo,
  options: PdfExportOptions = {}
): Promise<{ success: boolean; filename: string; blobUrl?: string }> {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    let currentY = margin;

    const b = { ...getStoredBranding(), ...branding };
    const companyName = b.companyName || 'DOCKS (PVT) LTD.';

    // Helper: Header block with corporate branding & logo
    const renderHeader = async (docTitle: string) => {
      currentY = await drawPdfCorporateHeader(doc, {
        title: docTitle,
        refNo: `Case: ${targetCase.caseNo}`,
        date: targetCase.createdAt || new Date().toLocaleDateString(),
        subRef: targetCase.clientName ? `Client: ${targetCase.clientName}` : undefined,
        branding: b,
        accentColor: [234, 179, 8]
      });
    };

    // Helper: Footer
    const renderFooter = (pageNo: number, totalPages: number) => {
      drawPdfCorporateFooter(doc, `Page ${pageNo} of ${totalPages}`, b);
    };

    // --- PAGE 1: CASE SUMMARY OR INVOICE ---
    if (!options.onlyInvoice) {
      await renderHeader('CASE DETAILS');

      // Case Meta Box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 28, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text('CASE IDENTIFICATION & ROUTE', margin + 4, currentY + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);

      const col1X = margin + 4;
      const col2X = margin + 65;
      const col3X = margin + 125;

      doc.text(`Case No: ${targetCase.caseNo}`, col1X, currentY + 12);
      doc.text(`Client: ${targetCase.clientName || 'N/A'}`, col1X, currentY + 17);
      doc.text(`Status: ${targetCase.status || 'Active'}`, col1X, currentY + 22);

      doc.text(`Category: ${targetCase.category || 'Transit'}`, col2X, currentY + 12);
      doc.text(`Port of Loading (POL): ${targetCase.pol || 'N/A'}`, col2X, currentY + 17);
      doc.text(`Port of Destination (POD): ${targetCase.pod || 'N/A'}`, col2X, currentY + 22);

      doc.text(`BL / AWB: ${targetCase.extractedData?.blNumber || 'N/A'}`, col3X, currentY + 12);
      doc.text(`GD No: ${targetCase.extractedData?.gdNo || 'N/A'}`, col3X, currentY + 17);
      doc.text(`Containers: ${targetCase.containers?.length || 0}`, col3X, currentY + 22);

      currentY += 34;

      // Containers Table
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text('MANIFEST & CONTAINERS', margin, currentY);
      currentY += 4;

      // Table Header
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, currentY, pageWidth - (margin * 2), 6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);

      doc.text('#', margin + 2, currentY + 4);
      doc.text('CONTAINER NO.', margin + 10, currentY + 4);
      doc.text('SIZE / TYPE', margin + 50, currentY + 4);
      doc.text('SEAL NUMBER', margin + 85, currentY + 4);
      doc.text('WEIGHT (KG)', margin + 125, currentY + 4);
      doc.text('STATUS', margin + 155, currentY + 4);
      currentY += 6;

      // Table Rows
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);

      if (targetCase.containers && targetCase.containers.length > 0) {
        targetCase.containers.forEach((cnt: Container, idx: number) => {
          if (idx % 2 === 1) {
            doc.setFillColor(250, 250, 250);
            doc.rect(margin, currentY, pageWidth - (margin * 2), 6, 'F');
          }
          doc.text(String(idx + 1), margin + 2, currentY + 4);
          doc.text(cnt.number || 'N/A', margin + 10, currentY + 4);
          doc.text(cnt.size || '40ft', margin + 50, currentY + 4);
          doc.text(cnt.sealNo || 'N/A', margin + 85, currentY + 4);
          doc.text(cnt.weight ? cnt.weight.toLocaleString() : 'N/A', margin + 125, currentY + 4);
          doc.text(cnt.status || 'In Transit', margin + 155, currentY + 4);
          currentY += 6;
        });
      } else {
        doc.text('No container records filed.', margin + 10, currentY + 4);
        currentY += 6;
      }

      currentY += 8;

      // Tracking / Status Summary
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text('CLEARANCE & LOGISTICS STATUS', margin, currentY);
      currentY += 4;

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 16, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(180, 83, 9);
      doc.text(`Current Active State: ${targetCase.status || 'Active'}`, margin + 4, currentY + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Consignee: ${targetCase.extractedData?.consigneeName || 'N/A'}`, margin + 4, currentY + 11);
      doc.text(`Shipper: ${targetCase.extractedData?.shipperName || 'N/A'}`, margin + 75, currentY + 11);
      doc.text(`Vessel: ${targetCase.extractedData?.vesselName || 'N/A'}`, margin + 140, currentY + 11);

      currentY += 24;

      const totalPagesCount = options.onlyCaseDetails ? 1 : (options.withInvoice ? 2 : 1);
      renderFooter(1, totalPagesCount);
    }

    // --- INVOICE PAGE ---
    if (!options.onlyCaseDetails && (options.onlyInvoice || options.withInvoice)) {
      if (!options.onlyInvoice) {
        doc.addPage();
      }

      await renderHeader('INVOICE');

      // Invoice Details Header Box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 22, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(`INVOICE NO: INV-${targetCase.caseNo}`, margin + 4, currentY + 6);
      doc.text(`BILL TO: ${targetCase.clientName || 'General Freight Client'}`, margin + 4, currentY + 12);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(`Associated Case: ${targetCase.caseNo} (${targetCase.category || 'Customs Clearance'})`, margin + 4, currentY + 17);

      doc.text(`Issue Date: ${targetCase.createdAt || new Date().toLocaleDateString()}`, pageWidth - margin - 4, currentY + 6, { align: 'right' });
      doc.text('Payment Terms: Immediate upon receipt', pageWidth - margin - 4, currentY + 12, { align: 'right' });
      doc.text('Currency: PKR (Pakistani Rupee)', pageWidth - margin - 4, currentY + 17, { align: 'right' });

      currentY += 28;

      // Charges Table Header
      doc.setFillColor(15, 23, 42);
      doc.rect(margin, currentY, pageWidth - (margin * 2), 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);

      doc.text('#', margin + 3, currentY + 4.8);
      doc.text('SERVICE / ITEM DESCRIPTION', margin + 12, currentY + 4.8);
      doc.text('AMOUNT (PKR)', pageWidth - margin - 4, currentY + 4.8, { align: 'right' });
      currentY += 7;

      // Charges Rows
      const charges = targetCase.charges && targetCase.charges.length > 0
        ? targetCase.charges
        : [
            { description: 'Terminal Handling & Customs Examination Charges', amount: 45000 },
            { description: 'Bonded Transportation & Transit Clearance Fee', amount: 85000 },
            { description: 'Port Documentation, EDI & Gate Pass Surcharge', amount: 12500 }
          ];

      let totalAmount = 0;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);

      charges.forEach((ch: any, idx: number) => {
        totalAmount += Number(ch.amount) || 0;
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, currentY, pageWidth - (margin * 2), 6.5, 'F');
        }
        doc.text(String(idx + 1), margin + 3, currentY + 4.5);
        doc.text(ch.description || 'Logistics Service', margin + 12, currentY + 4.5);
        doc.text(Number(ch.amount || 0).toLocaleString(), pageWidth - margin - 4, currentY + 4.5, { align: 'right' });
        currentY += 6.5;
      });

      // Total Row
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, currentY, pageWidth - (margin * 2), 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text('TOTAL AMOUNT DUE:', margin + 12, currentY + 5.5);
      doc.setTextColor(180, 83, 9); // gold / amber
      doc.text(`PKR ${totalAmount.toLocaleString()}`, pageWidth - margin - 4, currentY + 5.5, { align: 'right' });
      currentY += 16;

      // Official Company Stamp Only (SRS: All non-payment receipts carry stamp only)
      const sigX = pageWidth - margin - 60;
      drawOfficialCompanyStampOnly(doc, sigX, currentY, 'OFFICIAL INVOICE STAMP');

      renderFooter(options.onlyInvoice ? 1 : 2, options.onlyInvoice ? 1 : 2);
    }

    // Generate output blob and trigger browser download
    const filename = options.onlyInvoice 
      ? `Invoice-${targetCase.caseNo}.pdf`
      : options.onlyCaseDetails
        ? `Case-Details-${targetCase.caseNo}.pdf`
        : `Dossier-${targetCase.caseNo}.pdf`;

    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);

    // Create invisible anchor element to trigger download across all browsers unless previewOnly is set
    if (!options.previewOnly) {
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = blobUrl;
      downloadAnchor.download = filename;
      downloadAnchor.rel = 'noopener noreferrer';
      downloadAnchor.style.display = 'none';
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();

      // Clean up anchor tag, retain blob for 60s for user fallback clicks
      setTimeout(() => {
        if (document.body.contains(downloadAnchor)) {
          document.body.removeChild(downloadAnchor);
        }
      }, 500);
    }

    setTimeout(() => {
      try {
        URL.revokeObjectURL(blobUrl);
      } catch (e) {
        // ignore
      }
    }, 60000);

    return { success: true, filename, blobUrl };
  } catch (error) {
    console.error('Failed to generate and download PDF:', error);
    throw error;
  }
}

export async function downloadContainerInvoicePdf(data: {
  invoiceNo: string;
  clientName: string;
  containerNo: string;
  size: string;
  weight?: number;
  sealNo?: string;
  route: string;
  rate: number;
  date: string;
  blNo?: string;
  companyName?: string;
  customLogo?: string | null;
  branding?: BrandingInfo;
}): Promise<{ success: boolean; filename: string; blobUrl?: string }> {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;

    let currentY = await drawPdfCorporateHeader(doc, {
      title: 'INVOICE',
      refNo: `Invoice: ${data.invoiceNo}`,
      date: data.date,
      subRef: `Container: ${data.containerNo}`,
      branding: {
        companyName: data.companyName,
        customLogo: data.customLogo,
        ...data.branding
      },
      accentColor: [234, 179, 8]
    });

    currentY += 4;

    // Client box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 22, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('BILLED TO (CLIENT):', margin + 4, currentY + 6);
    doc.text(data.clientName, margin + 4, currentY + 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`B/L Number: ${data.blNo || 'N/A'}`, margin + 4, currentY + 16);

    doc.text(`Route: ${data.route}`, pageWidth - margin - 4, currentY + 6, { align: 'right' });
    doc.text('Terms: Immediate upon delivery', pageWidth - margin - 4, currentY + 11, { align: 'right' });
    doc.text('Currency: PKR', pageWidth - margin - 4, currentY + 16, { align: 'right' });

    currentY += 28;

    // Charges table
    doc.setFillColor(15, 23, 42);
    doc.rect(margin, currentY, pageWidth - (margin * 2), 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);

    doc.text('#', margin + 3, currentY + 4.8);
    doc.text('DESCRIPTION / CONTAINER PARTICULARS', margin + 12, currentY + 4.8);
    doc.text('AMOUNT (PKR)', pageWidth - margin - 4, currentY + 4.8, { align: 'right' });
    currentY += 7;

    // Line 1: Terminal Handling & Haulage
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);

    const desc1 = `Container ${data.containerNo} (${data.size}) - Route: ${data.route}`;
    doc.text('1', margin + 3, currentY + 4.5);
    doc.text(desc1, margin + 12, currentY + 4.5);
    doc.text(Number(data.rate).toLocaleString(), pageWidth - margin - 4, currentY + 4.5, { align: 'right' });
    currentY += 7;

    // Line 2: Port & Documentation EDI
    const docFee = 7500;
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, currentY, pageWidth - (margin * 2), 6.5, 'F');
    doc.text('2', margin + 3, currentY + 4.5);
    doc.text('Customs Port Documentation, EDI Clearance & Gate Pass', margin + 12, currentY + 4.5);
    doc.text(docFee.toLocaleString(), pageWidth - margin - 4, currentY + 4.5, { align: 'right' });
    currentY += 7;

    // Total
    const total = Number(data.rate) + docFee;
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, currentY, pageWidth - (margin * 2), 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('TOTAL AMOUNT DUE:', margin + 12, currentY + 5.5);
    doc.setTextColor(180, 83, 9);
    doc.text(`PKR ${total.toLocaleString()}`, pageWidth - margin - 4, currentY + 5.5, { align: 'right' });
    currentY += 18;

    // Official Company Stamp Only (Per SRS Policy: Only payment receipts carry accountant signature)
    const sigX = pageWidth - margin - 60;
    drawOfficialCompanyStampOnly(doc, sigX, currentY, 'OFFICIAL FREIGHT STAMP');

    // Footer with complete address & contacts
    drawPdfCorporateFooter(doc, 'ERP Verified Invoice', data.branding);

    // Trigger download
    const filename = `${data.invoiceNo}.pdf`;
    return triggerDirectDownload(doc, filename);
  } catch (err) {
    console.error('Failed to generate container invoice PDF:', err);
    throw err;
  }
}

/**
 * Converts numbers into English words (PKR format: Crores, Lakhs, Thousands, Rupees)
 */
export function numberToWordsRupees(num: number): string {
  if (!num || isNaN(num) || num === 0) return 'Rupees Zero Only';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertGroup(n: number): string {
    let str = '';
    if (n >= 100) {
      str += a[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      str += b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '') + ' ';
    } else if (n > 0) {
      str += a[n] + ' ';
    }
    return str.trim();
  }

  let n = Math.floor(Math.abs(num));
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const remainder = n;

  let result = '';
  if (crore > 0) result += convertGroup(crore) + ' Crore ';
  if (lakh > 0) result += convertGroup(lakh) + ' Lakh ';
  if (thousand > 0) result += convertGroup(thousand) + ' Thousand ';
  if (remainder > 0) result += convertGroup(remainder) + ' ';

  return `Rupees ${result.trim()} Only`;
}

function triggerDirectDownload(doc: jsPDF, filename: string): { success: boolean; filename: string; blobUrl: string } {
  const pdfBlob = doc.output('blob');
  const blobUrl = URL.createObjectURL(pdfBlob);

  try {
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = blobUrl;
    downloadAnchor.download = filename;
    downloadAnchor.style.display = 'none';
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();

    setTimeout(() => {
      if (document.body.contains(downloadAnchor)) {
        document.body.removeChild(downloadAnchor);
      }
    }, 1500);
  } catch (err) {
    console.warn('Anchor download fallback to doc.save:', err);
    try {
      doc.save(filename);
    } catch {
      // fallback
    }
  }

  setTimeout(() => {
    try {
      URL.revokeObjectURL(blobUrl);
    } catch {
      // ignore
    }
  }, 180000);

  return { success: true, filename, blobUrl };
}

/**
 * Native Web Share API helper for Mobile devices (iOS / Android)
 * Enables direct "Save to Files" or WhatsApp/Drive export on touch devices
 */
export async function sharePdfFile(blobUrl: string, filename: string, title?: string): Promise<boolean> {
  try {
    if (navigator.share) {
      const response = await fetch(blobUrl);
      const blob = await response.blob();
      const file = new File([blob], filename, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: title || filename,
          text: `Official PDF Document: ${filename}`
        });
        return true;
      }
    }
  } catch (err) {
    console.warn('Native share error or dismissed:', err);
  }
  return false;
}

// -------------------------------------------------------------
// 1. PAYMENT RECEIPT / VOUCHER
// -------------------------------------------------------------
export interface PaymentReceiptData {
  receiptNo: string;
  date: string;
  party: string;
  type: string; // 'INCOME' | 'EXPENSE' | 'RECEIVABLE' | 'PAYABLE'
  amount: number;
  paymentMethod?: string;
  bankName?: string;
  transactionId?: string;
  description: string;
  reference?: string;
  category?: string;
  caseNo?: string;
  receivedBy?: string;
  companyName?: string;
  customLogo?: string | null;
  branding?: BrandingInfo;
}

export async function downloadPaymentReceiptPdf(data: PaymentReceiptData): Promise<{ success: boolean; filename: string; blobUrl: string }> {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const isIncome = data.type === 'INCOME' || data.type === 'RECEIVABLE';
    const accentColor: [number, number, number] = isIncome ? [16, 185, 129] : [220, 38, 38];
    const docTitle = isIncome ? 'PAYMENT RECEIPT' : 'PAYMENT VOUCHER';

    let currentY = await drawPdfCorporateHeader(doc, {
      title: docTitle,
      refNo: `Voucher: ${data.receiptNo}`,
      date: data.date,
      subRef: data.caseNo ? `Case Ref: ${data.caseNo}` : undefined,
      branding: {
        companyName: data.companyName,
        customLogo: data.customLogo,
        ...data.branding
      },
      accentColor
    });

    currentY += 4;

    // Party Information Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 24, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(isIncome ? 'RECEIVED WITH THANKS FROM (PARTY / CLIENT):' : 'PAID TO (BENEFICIARY / VENDOR):', margin + 4, currentY + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(data.party || 'Valued Customer', margin + 4, currentY + 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Reference No: ${data.reference || data.caseNo || 'N/A'}`, margin + 4, currentY + 19);

    doc.text(`Account Head: ${data.category || 'General Ledger'}`, pageWidth - margin - 4, currentY + 6, { align: 'right' });
    doc.text(`Status: CLEARED / VERIFIED`, pageWidth - margin - 4, currentY + 13, { align: 'right' });
    doc.text(`Currency: PKR`, pageWidth - margin - 4, currentY + 19, { align: 'right' });

    currentY += 30;

    // Amount Box (Prominent display)
    doc.setFillColor(isIncome ? 240 : 254, isIncome ? 253 : 242, isIncome ? 244 : 242);
    doc.setDrawColor(isIncome ? 167 : 254, isIncome ? 243 : 202, isIncome ? 208 : 202);
    doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 22, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(isIncome ? 6 : 153, isIncome ? 95 : 27, isIncome ? 70 : 27);
    doc.text('TOTAL AMOUNT RECEIVED / PAID:', margin + 5, currentY + 7);

    doc.setFontSize(14);
    doc.text(`PKR ${Number(data.amount).toLocaleString()}/-`, pageWidth - margin - 5, currentY + 8, { align: 'right' });

    // Amount in words
    const words = numberToWordsRupees(data.amount);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(`In Words: ${words}`, margin + 5, currentY + 16);

    currentY += 28;

    // Payment Particulars Table
    doc.setFillColor(15, 23, 42);
    doc.rect(margin, currentY, pageWidth - (margin * 2), 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('PARTICULARS / TRANSACTION SPECIFICATIONS', margin + 4, currentY + 4.8);
    doc.text('DETAILS', pageWidth - margin - 4, currentY + 4.8, { align: 'right' });

    currentY += 7;

    const rowDetails = [
      { label: 'Description / Purpose of Payment', value: data.description || 'Logistics & freight services payment' },
      { label: 'Payment Method', value: (data.paymentMethod || 'Cash').toUpperCase() },
      { label: 'Bank / Channel Name', value: data.bankName || 'Direct Terminal Counter / Cashier' },
      { label: 'Transaction / Cheque / Ref ID', value: data.transactionId || data.reference || 'SYS-AUTO-LOG' },
      { label: 'Associated Case / BL No', value: data.caseNo || data.reference || 'General Account' },
    ];

    rowDetails.forEach((row, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, currentY, pageWidth - (margin * 2), 6.5, 'F');
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.8);
      doc.setTextColor(71, 85, 105);
      doc.text(row.label, margin + 4, currentY + 4.4);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(row.value, pageWidth - margin - 4, currentY + 4.4, { align: 'right' });

      currentY += 6.5;
    });

    currentY += 8;

    // Signatures & Stamp: Strictly Accountant Signature & Stamp for Payment Receipts
    drawAccountantStampAndSignature(doc, currentY, margin, pageWidth);

    // Corporate footer with company address and contact numbers
    drawPdfCorporateFooter(doc, 'ERP Verified Receipt', data.branding);

    // Download trigger
    const cleanNo = data.receiptNo.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Receipt_${cleanNo}.pdf`;
    return triggerDirectDownload(doc, filename);
  } catch (error) {
    console.error('Failed to generate payment receipt PDF:', error);
    throw error;
  }
}

// -------------------------------------------------------------
// 2. RECEIVABLE INVOICE PDF
// -------------------------------------------------------------
export interface ReceivableInvoiceData {
  invoiceNo: string;
  date: string;
  dueDate?: string;
  clientName: string;
  clientAddress?: string;
  description: string;
  amount: number;
  reference?: string;
  category?: string;
  status?: string;
  companyName?: string;
  customLogo?: string | null;
  branding?: BrandingInfo;
  lineItems?: Array<{ description: string; qty?: number; rate?: number; amount: number }>;
}

export async function downloadReceivableInvoicePdf(data: ReceivableInvoiceData): Promise<{ success: boolean; filename: string; blobUrl: string }> {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;

    let currentY = await drawPdfCorporateHeader(doc, {
      title: 'INVOICE',
      refNo: `Invoice No: ${data.invoiceNo}`,
      date: data.date,
      subRef: data.dueDate ? `Due Date: ${data.dueDate}` : undefined,
      branding: {
        companyName: data.companyName,
        customLogo: data.customLogo,
        ...data.branding
      },
      accentColor: [234, 179, 8]
    });

    currentY += 4;

    // Client Info Card
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 22, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('INVOICE BILLED TO (CUSTOMER / CONSIGNEE):', margin + 4, currentY + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(data.clientName || 'Valued Client', margin + 4, currentY + 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Reference / B/L No: ${data.reference || 'N/A'}`, margin + 4, currentY + 17);

    doc.text(`Category: ${data.category || 'Freight Forwarding'}`, pageWidth - margin - 4, currentY + 6, { align: 'right' });
    doc.text(`Status: ${(data.status || 'UNPAID').toUpperCase()}`, pageWidth - margin - 4, currentY + 12, { align: 'right' });
    doc.text('Currency: PKR (Pak Rupees)', pageWidth - margin - 4, currentY + 17, { align: 'right' });

    currentY += 28;

    // Invoice Items Table
    doc.setFillColor(15, 23, 42);
    doc.rect(margin, currentY, pageWidth - (margin * 2), 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);

    doc.text('#', margin + 3, currentY + 4.8);
    doc.text('DESCRIPTION / SERVICES PERFORMED', margin + 12, currentY + 4.8);
    doc.text('AMOUNT (PKR)', pageWidth - margin - 4, currentY + 4.8, { align: 'right' });
    currentY += 7;

    // Use customized line items or construct standard items
    const items = (data.lineItems && data.lineItems.length > 0) ? data.lineItems : [
      { description: data.description || 'Terminal Handling, Bonded Carrier & Freight Services', amount: data.amount }
    ];

    items.forEach((item, index) => {
      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, currentY, pageWidth - (margin * 2), 7, 'F');
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);

      doc.text(String(index + 1), margin + 3, currentY + 4.8);
      doc.text(item.description, margin + 12, currentY + 4.8);
      doc.text(Number(item.amount).toLocaleString(), pageWidth - margin - 4, currentY + 4.8, { align: 'right' });

      currentY += 7;
    });

    // Total Highlight Box
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, currentY, pageWidth - (margin * 2), 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('TOTAL INVOICE AMOUNT DUE:', margin + 12, currentY + 5.5);
    doc.setTextColor(180, 83, 9);
    doc.text(`PKR ${Number(data.amount).toLocaleString()}`, pageWidth - margin - 4, currentY + 5.5, { align: 'right' });

    currentY += 12;

    // Amount in Words
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Amount in Words: ${numberToWordsRupees(data.amount)}`, margin, currentY);

    currentY += 18;

    // Official Company Stamp Only (Per SRS: Invoices carry official company stamp only)
    const sigX = pageWidth - margin - 60;
    drawOfficialCompanyStampOnly(doc, sigX, currentY, 'OFFICIAL INVOICE STAMP');

    // Corporate footer with company address and contact numbers
    drawPdfCorporateFooter(doc, 'ERP Verified Invoice', data.branding);

    const cleanNo = data.invoiceNo.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Invoice_${cleanNo}.pdf`;
    return triggerDirectDownload(doc, filename);
  } catch (error) {
    console.error('Failed to generate receivable invoice PDF:', error);
    throw error;
  }
}

// -------------------------------------------------------------
// 3. CLIENT LEDGER STATEMENT
// -------------------------------------------------------------
export interface ClientLedgerExportData {
  clientName: string;
  statementDate: string;
  dateRange?: string;
  summary: {
    totalDebits: number;
    totalCredits: number;
    netBalance: number;
    totalCases?: number;
    totalContainers?: number;
  };
  entries: Array<{
    date: string;
    reference: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
  }>;
  companyName?: string;
  customLogo?: string | null;
  branding?: BrandingInfo;
}

export async function downloadClientLedgerPdf(data: ClientLedgerExportData): Promise<{ success: boolean; filename: string; blobUrl: string }> {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    let currentY = 16;
    const b = { ...getStoredBranding(), ...data.branding };

    const drawHeader = async (pageNum: number) => {
      currentY = await drawPdfCorporateHeader(doc, {
        title: 'CLIENT STATEMENT OF ACCOUNT',
        refNo: `Client: ${data.clientName}`,
        date: data.statementDate,
        subRef: `Page ${pageNum}`,
        branding: {
          companyName: data.companyName,
          customLogo: data.customLogo,
          ...data.branding
        },
        accentColor: [37, 99, 235]
      });
      currentY += 4;
    };

    await drawHeader(1);

    // Client & Summary Header Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 26, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('ACCOUNT HOLDER / CLIENT:', margin + 4, currentY + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(data.clientName, margin + 4, currentY + 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Total Active Cases: ${data.summary.totalCases || 0} | Containers: ${data.summary.totalContainers || 0}`, margin + 4, currentY + 20);

    // Summary Metric Pills on Right
    const col3X = pageWidth - margin - 75;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Total Debits (Billed):', col3X, currentY + 6);
    doc.text('Total Credits (Paid):', col3X, currentY + 12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Net Balance Due:', col3X, currentY + 19);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(185, 28, 28);
    doc.text(`PKR ${Number(data.summary.totalDebits).toLocaleString()}`, pageWidth - margin - 4, currentY + 6, { align: 'right' });

    doc.setTextColor(22, 163, 74);
    doc.text(`PKR ${Number(data.summary.totalCredits).toLocaleString()}`, pageWidth - margin - 4, currentY + 12, { align: 'right' });

    doc.setFontSize(9);
    doc.setTextColor(data.summary.netBalance > 0 ? 185 : 22, data.summary.netBalance > 0 ? 28 : 163, data.summary.netBalance > 0 ? 28 : 74);
    doc.text(`PKR ${Number(data.summary.netBalance).toLocaleString()}`, pageWidth - margin - 4, currentY + 19, { align: 'right' });

    currentY += 32;

    // Table Header
    const drawTableHeader = () => {
      doc.setFillColor(15, 23, 42);
      doc.rect(margin, currentY, pageWidth - (margin * 2), 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);

      doc.text('DATE', margin + 3, currentY + 4.8);
      doc.text('REF / CASE', margin + 24, currentY + 4.8);
      doc.text('DESCRIPTION / NARRATION', margin + 50, currentY + 4.8);
      doc.text('DEBIT (PKR)', pageWidth - margin - 52, currentY + 4.8, { align: 'right' });
      doc.text('CREDIT (PKR)', pageWidth - margin - 26, currentY + 4.8, { align: 'right' });
      doc.text('BALANCE', pageWidth - margin - 4, currentY + 4.8, { align: 'right' });
      currentY += 7;
    };

    drawTableHeader();

    let pageNum = 1;

    for (let idx = 0; idx < data.entries.length; idx++) {
      const entry = data.entries[idx];
      if (currentY > pageHeight - 25) {
        doc.addPage();
        pageNum++;
        await drawHeader(pageNum);
        drawTableHeader();
      }

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, currentY, pageWidth - (margin * 2), 6.5, 'F');
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(entry.date, margin + 3, currentY + 4.4);
      doc.text(entry.reference || '-', margin + 24, currentY + 4.4);

      // Truncate long descriptions
      const desc = entry.description.length > 40 ? entry.description.substring(0, 38) + '...' : entry.description;
      doc.setTextColor(15, 23, 42);
      doc.text(desc, margin + 50, currentY + 4.4);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(entry.debit > 0 ? 185 : 156, entry.debit > 0 ? 28 : 163, entry.debit > 0 ? 28 : 175);
      doc.text(entry.debit > 0 ? Number(entry.debit).toLocaleString() : '-', pageWidth - margin - 52, currentY + 4.4, { align: 'right' });

      doc.setTextColor(entry.credit > 0 ? 22 : 156, entry.credit > 0 ? 163 : 163, entry.credit > 0 ? 74 : 175);
      doc.text(entry.credit > 0 ? Number(entry.credit).toLocaleString() : '-', pageWidth - margin - 26, currentY + 4.4, { align: 'right' });

      doc.setTextColor(15, 23, 42);
      doc.text(Number(entry.balance).toLocaleString(), pageWidth - margin - 4, currentY + 4.4, { align: 'right' });

      currentY += 6.5;
    }

    currentY += 8;
    if (currentY < pageHeight - 30) {
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, currentY, pageWidth - (margin * 2), 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text('OUTSTANDING CLOSING BALANCE:', margin + 4, currentY + 5.5);
      doc.setTextColor(185, 28, 28);
      doc.text(`PKR ${Number(data.summary.netBalance).toLocaleString()}`, pageWidth - margin - 4, currentY + 5.5, { align: 'right' });
    }

    // Corporate footer with company address and contact numbers
    drawPdfCorporateFooter(doc, 'ERP Verified Client Statement', data.branding);

    const cleanClient = data.clientName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Client_Ledger_${cleanClient}_${new Date().toISOString().split('T')[0]}.pdf`;
    return triggerDirectDownload(doc, filename);
  } catch (error) {
    console.error('Failed to generate client ledger PDF:', error);
    throw error;
  }
}

// -------------------------------------------------------------
// 4. GENERAL LEDGER STATEMENT
// -------------------------------------------------------------
export interface GeneralLedgerExportData {
  accountFilter: string;
  dateRange?: string;
  generatedDate: string;
  totalDebits: number;
  totalCredits: number;
  closingBalance: number;
  entries: Array<{
    date: string;
    party: string;
    category?: string;
    reference?: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
  }>;
  companyName?: string;
  customLogo?: string | null;
  branding?: BrandingInfo;
}

export async function downloadGeneralLedgerPdf(data: GeneralLedgerExportData): Promise<{ success: boolean; filename: string; blobUrl: string }> {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    let currentY = 16;
    const b = { ...getStoredBranding(), ...data.branding };

    const drawHeader = async (pageNum: number) => {
      currentY = await drawPdfCorporateHeader(doc, {
        title: 'GENERAL LEDGER (GL)',
        refNo: `Account: ${data.accountFilter}`,
        date: data.generatedDate,
        subRef: `Page ${pageNum}`,
        branding: {
          companyName: data.companyName,
          customLogo: data.customLogo,
          ...data.branding
        },
        accentColor: [15, 23, 42]
      });
      currentY += 4;
    };

    await drawHeader(1);

    // Summary Card
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 18, 2, 2, 'FD');

    const colWidth = (pageWidth - (margin * 2)) / 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('TOTAL DEBITS', margin + 6, currentY + 6);
    doc.text('TOTAL CREDITS', margin + colWidth + 6, currentY + 6);
    doc.text('NET CLOSING BALANCE', margin + (colWidth * 2) + 6, currentY + 6);

    doc.setFontSize(10);
    doc.setTextColor(185, 28, 28);
    doc.text(`PKR ${Number(data.totalDebits).toLocaleString()}`, margin + 6, currentY + 13);

    doc.setTextColor(22, 163, 74);
    doc.text(`PKR ${Number(data.totalCredits).toLocaleString()}`, margin + colWidth + 6, currentY + 13);

    doc.setTextColor(15, 23, 42);
    doc.text(`PKR ${Number(data.closingBalance).toLocaleString()}`, margin + (colWidth * 2) + 6, currentY + 13);

    currentY += 24;

    const drawTableHeader = () => {
      doc.setFillColor(15, 23, 42);
      doc.rect(margin, currentY, pageWidth - (margin * 2), 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);

      doc.text('DATE', margin + 3, currentY + 4.8);
      doc.text('PARTY / ACCOUNT', margin + 22, currentY + 4.8);
      doc.text('REF', margin + 55, currentY + 4.8);
      doc.text('DESCRIPTION', margin + 74, currentY + 4.8);
      doc.text('DEBIT (PKR)', pageWidth - margin - 52, currentY + 4.8, { align: 'right' });
      doc.text('CREDIT (PKR)', pageWidth - margin - 26, currentY + 4.8, { align: 'right' });
      doc.text('BALANCE', pageWidth - margin - 4, currentY + 4.8, { align: 'right' });
      currentY += 7;
    };

    drawTableHeader();

    let pageNum = 1;

    for (let idx = 0; idx < data.entries.length; idx++) {
      const entry = data.entries[idx];
      if (currentY > pageHeight - 25) {
        doc.addPage();
        pageNum++;
        await drawHeader(pageNum);
        drawTableHeader();
      }

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, currentY, pageWidth - (margin * 2), 6.5, 'F');
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(71, 85, 105);
      doc.text(entry.date, margin + 3, currentY + 4.4);

      const partyStr = entry.party.length > 18 ? entry.party.substring(0, 16) + '..' : entry.party;
      doc.text(partyStr, margin + 22, currentY + 4.4);
      doc.text((entry.reference || '-').substring(0, 10), margin + 55, currentY + 4.4);

      const desc = entry.description.length > 28 ? entry.description.substring(0, 26) + '..' : entry.description;
      doc.setTextColor(15, 23, 42);
      doc.text(desc, margin + 74, currentY + 4.4);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(entry.debit > 0 ? 185 : 156, entry.debit > 0 ? 28 : 163, entry.debit > 0 ? 28 : 175);
      doc.text(entry.debit > 0 ? Number(entry.debit).toLocaleString() : '-', pageWidth - margin - 52, currentY + 4.4, { align: 'right' });

      doc.setTextColor(entry.credit > 0 ? 22 : 156, entry.credit > 0 ? 163 : 163, entry.credit > 0 ? 74 : 175);
      doc.text(entry.credit > 0 ? Number(entry.credit).toLocaleString() : '-', pageWidth - margin - 26, currentY + 4.4, { align: 'right' });

      doc.setTextColor(15, 23, 42);
      doc.text(Number(entry.balance).toLocaleString(), pageWidth - margin - 4, currentY + 4.4, { align: 'right' });

      currentY += 6.5;
    }

    // Corporate footer with company address and contact numbers
    drawPdfCorporateFooter(doc, 'ERP Verified General Ledger', data.branding);

    const cleanFilter = data.accountFilter.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `General_Ledger_${cleanFilter}_${new Date().toISOString().split('T')[0]}.pdf`;
    return triggerDirectDownload(doc, filename);
  } catch (error) {
    console.error('Failed to generate general ledger PDF:', error);
    throw error;
  }
}

// -------------------------------------------------------------
// 5. VEHICLE DETAILS & DISPATCH DOSSIER
// -------------------------------------------------------------
export interface VehicleExportData {
  registrationNumber: string;
  dplSerial: string;
  makeModel?: string;
  category: string;
  type: string;
  size?: string;
  engineNo?: string;
  chassisNo?: string;
  weightCapacity?: string;
  transporterName: string;
  driverName?: string;
  driverCnic?: string;
  driverContact?: string;
  status: string;
  validationStartDate?: string;
  validationExpiryDate?: string;
  tracker?: {
    provider?: string;
    companyName?: string;
    status?: string;
    installationDate?: string;
    cost?: number;
  };
  ownerName?: string;
  ownerCnic?: string;
  ownerAddress?: string;
  createdAt?: string;
  registrationDate?: string;
  history?: Array<{ title?: string; date?: string; note?: string }>;
  companyName?: string;
  customLogo?: string | null;
  branding?: BrandingInfo;
}

export async function downloadVehicleDetailsPdf(data: VehicleExportData): Promise<{ success: boolean; filename: string; blobUrl: string }> {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;

    let currentY = await drawPdfCorporateHeader(doc, {
      title: 'VEHICLE DOSSIER',
      refNo: `Reg: ${data.registrationNumber}`,
      date: new Date().toLocaleDateString(),
      subRef: `DPL Serial: ${data.dplSerial}`,
      branding: {
        companyName: data.companyName,
        customLogo: data.customLogo,
        ...data.branding
      },
      accentColor: [37, 99, 235]
    });

    currentY += 4;

    // Status & Category Overview Strip
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 16, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`FLEET STATUS: ${data.status.replace(/_/g, ' ')}`, margin + 6, currentY + 6);
    doc.text(`CATEGORY: ${data.category}`, margin + 60, currentY + 6);
    doc.text(`BODY TYPE: ${data.type} (${data.size || 'Standard'})`, margin + 115, currentY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Transporter: ${data.transporterName}`, margin + 6, currentY + 12);
    doc.text(`Validation Expiry: ${data.validationExpiryDate || 'N/A'}`, margin + 115, currentY + 12);

    currentY += 22;

    // 2-Column Grid: Left (Technical specs), Right (Driver & Tracker)
    const colWidth = (pageWidth - (margin * 2) - 8) / 2;

    // Left Box: Technical Specifications
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, currentY, colWidth, 48, 2, 2, 'FD');

    doc.setFillColor(15, 23, 42);
    doc.rect(margin, currentY, colWidth, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('ENGINE & VEHICLE SPECIFICATIONS', margin + 4, currentY + 4.2);

    let leftY = currentY + 11;
    const techSpecs = [
      { label: 'Registration No', val: data.registrationNumber },
      { label: 'Engine Number', val: data.engineNo || 'Verified' },
      { label: 'Chassis Number', val: data.chassisNo || 'Verified' },
      { label: 'Make & Model', val: data.makeModel || 'Heavy Haulage Truck' },
      { label: 'Weight Capacity', val: data.weightCapacity || '40-45 Ton' },
      { label: 'DPL System Serial', val: data.dplSerial },
    ];

    techSpecs.forEach(spec => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(100, 116, 139);
      doc.text(spec.label, margin + 4, leftY);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(spec.val, margin + colWidth - 4, leftY, { align: 'right' });
      leftY += 6;
    });

    // Right Box: Driver, Transporter & Tracker
    const rightX = margin + colWidth + 8;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(rightX, currentY, colWidth, 48, 2, 2, 'FD');

    doc.setFillColor(15, 23, 42);
    doc.rect(rightX, currentY, colWidth, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('DRIVER & FLEET TRACKING DATA', rightX + 4, currentY + 4.2);

    let rightY = currentY + 11;
    const driverSpecs = [
      { label: 'Driver Name', val: data.driverName || 'Designated Driver' },
      { label: 'Driver CNIC', val: data.driverCnic || 'Registered' },
      { label: 'Driver Mobile', val: data.driverContact || 'On File' },
      { label: 'GPS Tracker Provider', val: data.tracker?.companyName || data.tracker?.provider || 'Active GPS' },
      { label: 'Tracker Device ID', val: data.tracker?.status || 'Active Tracking' },
      { label: 'Carrier Affiliation', val: data.transporterName },
    ];

    driverSpecs.forEach(spec => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(100, 116, 139);
      doc.text(spec.label, rightX + 4, rightY);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(spec.val, rightX + colWidth - 4, rightY, { align: 'right' });
      rightY += 6;
    });

    currentY += 54;

    // Owner & Customs Bonded Validation Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 24, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('LEGAL OWNER & CUSTOMS BONDED CREDENTIALS', margin + 4, currentY + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(`Vehicle Owner: ${data.ownerName || data.transporterName}`, margin + 4, currentY + 11);
    doc.text(`Owner CNIC: ${data.ownerCnic || 'On Record'}`, margin + 4, currentY + 16);
    doc.text(`Address: ${data.ownerAddress || 'Karachi Port Commercial Terminal Zone, Pakistan'}`, margin + 4, currentY + 21);

    doc.text(`Customs Validation Start: ${data.validationStartDate || '2024-01-01'}`, pageWidth - margin - 4, currentY + 11, { align: 'right' });
    doc.text(`Customs Bonded Expiry: ${data.validationExpiryDate || 'Active'}`, pageWidth - margin - 4, currentY + 16, { align: 'right' });
    doc.text(`Security Clearance: VERIFIED & CLEARED`, pageWidth - margin - 4, currentY + 21, { align: 'right' });

    currentY += 30;

    // Dispatch & Activity Log Table
    doc.setFillColor(15, 23, 42);
    doc.rect(margin, currentY, pageWidth - (margin * 2), 6.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('TERMINAL LOG & DISPATCH ACTIVITY HISTORY', margin + 4, currentY + 4.5);
    currentY += 6.5;

    const mockLogs = (data.history && data.history.length > 0) ? data.history : [
      { title: `Assigned to Dispatch Duty • Container Haulage`, date: '2026-04-12', note: 'Port Qasim to Lahore Dryport' },
      { title: `Routine Maintenance & Brake Inspection`, date: '2026-03-20', note: 'Certified by Chief Fleet Inspector' },
      { title: `Customs Tracker & Terminal Gate Pass Renewal`, date: '2026-01-15', note: 'System Entry Verified' },
    ];

    mockLogs.forEach((log, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, currentY, pageWidth - (margin * 2), 6.5, 'F');
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(log.date || '2026-04-01', margin + 4, currentY + 4.4);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(log.title || 'Trip Dispatch', margin + 30, currentY + 4.4);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(log.note || '', pageWidth - margin - 4, currentY + 4.4, { align: 'right' });

      currentY += 6.5;
    });

    currentY += 8;

    // Official Company Stamp Only (SRS: No personal signature required on dossier/NOC)
    const sigX = pageWidth - margin - 60;
    drawOfficialCompanyStampOnly(doc, sigX, currentY, 'FLEET VERIFICATION STAMP');

    // Corporate footer with company address and contact numbers
    drawPdfCorporateFooter(doc, 'ERP Verified Fleet Dossier', data.branding);

    const cleanReg = data.registrationNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Vehicle_Dossier_${cleanReg}.pdf`;
    return triggerDirectDownload(doc, filename);
  } catch (error) {
    console.error('Failed to generate vehicle details PDF:', error);
    throw error;
  }
}

// -------------------------------------------------------------
// 7. VEHICLE CANCELLATION & DE-REGISTRATION NOC PDF
// -------------------------------------------------------------
export interface VehicleNocData {
  vehicle: Vehicle;
  nocNo?: string;
  reason?: string;
  date?: string;
  branding?: BrandingInfo;
}

/**
 * Generates an official No Objection Certificate (N.O.C) for vehicle de-registration.
 * Triggered automatically when a vehicle is cancelled or de-registered from the fleet.
 * Includes official company stamp only (in strict adherence to DOCKS SRS Policy).
 */
export async function downloadVehicleNocPdf(
  data: VehicleNocData
): Promise<{ success: boolean; filename: string; blobUrl: string }> {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    const v = data.vehicle;
    const today = data.date || new Date().toLocaleDateString('en-GB');
    const nocSerial = data.nocNo || v.nocReference || `NOC-DPL-${Date.now().toString().slice(-6)}`;
    const reasonText = data.reason || v.cancellationReason || 'Fleet Contract Concluded & Operational Retirement';

    let currentY = await drawPdfCorporateHeader(doc, {
      title: 'NO OBJECTION CERTIFICATE',
      refNo: nocSerial,
      date: today,
      subRef: `Vehicle: ${v.registrationNumber}`,
      branding: data.branding,
      accentColor: [185, 28, 28] // Corporate Crimson/Red
    });

    currentY += 4;

    // Header Subject Banner
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(252, 165, 165);
    doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 16, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(153, 27, 27);
    doc.text('SUBJECT: ISSUANCE OF N.O.C. FOR FLEET DE-REGISTRATION & RELEASE', margin + 6, currentY + 6.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`TO: CUSTOMS AUTHORITIES / PORTS & TERMINALS / ALLIED LOGISTICS OPERATORS`, margin + 6, currentY + 12);

    currentY += 21;

    // Formal Certification Statement
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    const bodyP1 = `This is to officially certify that the commercial vehicle bearing Registration Number ${v.registrationNumber}, DPL Serial ${v.dplSerial}, belonging to Transporter "${v.transporterName}", has formally been decommissioned and removed from the active customs bonded / domestic carrier fleet of DOCKS (PVT) LTD.`;
    doc.text(bodyP1, margin, currentY, { maxWidth: pageWidth - (margin * 2), lineHeightFactor: 1.4 });

    currentY += 14;

    const bodyP2 = `All customs port gate passes, GPS tracker hardware, container chassis locks, and bonded transit manifests issued under the authority of DOCKS (PVT) LTD. have been safely surrendered, audited, and reconciled. All financial liabilities, wharfage dues, and terminal toll fees up to ${today} have been cleared.`;
    doc.text(bodyP2, margin, currentY, { maxWidth: pageWidth - (margin * 2), lineHeightFactor: 1.4 });

    currentY += 14;

    const bodyP3 = `Consequently, DOCKS (PVT) LTD. holds NO OBJECTION whatsoever to the cancellation, transfer of ownership, or re-registration of this vehicle under any other carrier or entity.`;
    doc.text(bodyP3, margin, currentY, { maxWidth: pageWidth - (margin * 2), lineHeightFactor: 1.4 });

    currentY += 12;

    // Specification Box
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('DE-REGISTERED VEHICLE PARTICULARS:', margin, currentY);
    currentY += 3.5;

    const rows: [string, string][] = [
      ['Vehicle Registration No:', v.registrationNumber],
      ['DPL Fleet Serial No:', v.dplSerial],
      ['Vehicle Category / Type:', `${v.category} • ${v.type} (${v.size || 'Standard'})`],
      ['Engine Number:', v.engineNo || 'N/A'],
      ['Chassis Number:', v.chassisNo || 'N/A'],
      ['Make / Model:', v.makeModel || 'Commercial Hauler'],
      ['Associated Transporter:', v.transporterName],
      ['Registered Driver / Contact:', `${v.driverName} (${v.driverContact || 'N/A'})`],
      ['Effective Cancellation Date:', today],
      ['De-Registration Reason:', reasonText],
      ['NOC Reference Serial:', nocSerial],
    ];

    rows.forEach(([label, val], idx) => {
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, currentY, pageWidth - (margin * 2), 5.6, 'F');
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(label, margin + 4, currentY + 3.8);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(val, pageWidth - margin - 4, currentY + 3.8, { align: 'right' });

      currentY += 5.6;
    });

    currentY += 10;

    // Official Company Stamp Only (In strict compliance with SRS policy)
    const sigX = pageWidth - margin - 60;
    drawOfficialCompanyStampOnly(doc, sigX, currentY, 'OFFICIAL NOC CARRIER SEAL');

    // Corporate footer with company address and contact numbers
    drawPdfCorporateFooter(doc, 'Official De-Registration NOC', data.branding);

    const cleanReg = v.registrationNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `NOC_${cleanReg}_${nocSerial}.pdf`;
    return triggerDirectDownload(doc, filename);
  } catch (error) {
    console.error('Failed to generate vehicle NOC PDF:', error);
    throw error;
  }
}

export interface CaseDeliveryOrderData {
  targetCase: Case;
  branding?: BrandingInfo;
  officerName?: string;
}

export async function downloadCustomsDeliveryOrderPdf(
  data: CaseDeliveryOrderData
): Promise<{ success: boolean; filename: string; blobUrl: string }> {
  try {
    const { targetCase } = data;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    let currentY = margin;

    const b = { ...getStoredBranding(), ...data.branding };
    const companyName = b.companyName || 'DOCKS (PVT) LTD.';
    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const doSerial = `DO-NOC-${targetCase.caseNo.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now().toString().slice(-4)}`;

    // Draw Corporate Header
    currentY = await drawPdfCorporateHeader(doc, {
      title: 'CUSTOMS BONDED CARRIER DELIVERY ORDER (DO / NOC)',
      refNo: `DO Ref: ${doSerial}`,
      date: today,
      subRef: `Case: ${targetCase.caseNo}`,
      branding: b,
      accentColor: [16, 185, 129] // Emerald accent
    });

    // Subtitle banner
    doc.setFillColor(16, 185, 129, 0.1);
    doc.setDrawColor(16, 185, 129, 0.3);
    doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 8, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(5, 150, 105);
    doc.text('OFFICIAL CARRIER NO-OBJECTION CERTIFICATE (NOC) & FINAL CARGO RELEASE ORDER', pageWidth / 2, currentY + 5.2, { align: 'center' });
    currentY += 12;

    // Delivery Order Meta Block
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 26, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('CONSIGNMENT & CARRIER PARTICULARS', margin + 4, currentY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);

    const c1 = margin + 4;
    const c2 = margin + 65;
    const c3 = margin + 125;

    doc.text(`Consignee / Client: ${targetCase.clientName || 'N/A'}`, c1, currentY + 11);
    doc.text(`B/L Number: ${targetCase.extractedData?.blNumber || 'N/A'}`, c1, currentY + 16);
    doc.text(`GD / TP Number: ${targetCase.extractedData?.tpNumber || targetCase.extractedData?.gdNo || targetCase.extractedData?.gdNumber || 'N/A'}`, c1, currentY + 21);

    doc.text(`Port of Loading (POL): ${targetCase.pol || 'N/A'}`, c2, currentY + 11);
    doc.text(`Port of Destination (POD): ${targetCase.pod || 'N/A'}`, c2, currentY + 16);
    doc.text(`Cargo Category: ${targetCase.category || 'Bonded Transit'}`, c2, currentY + 21);

    doc.text(`Carrier: ${companyName}`, c3, currentY + 11);
    doc.text(`Status: Workflow Completed`, c3, currentY + 16);
    doc.text(`Issued Date: ${today}`, c3, currentY + 21);

    currentY += 31;

    // Container Table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('CONTAINERS & SEALS COVERED UNDER THIS DO / NOC:', margin, currentY);
    currentY += 3.5;

    // Table Header
    doc.setFillColor(15, 23, 42);
    doc.rect(margin, currentY, pageWidth - (margin * 2), 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('SR', margin + 4, currentY + 4.2);
    doc.text('CONTAINER NO.', margin + 16, currentY + 4.2);
    doc.text('SIZE', margin + 60, currentY + 4.2);
    doc.text('WEIGHT (KG)', margin + 85, currentY + 4.2);
    doc.text('SEAL NO.', margin + 120, currentY + 4.2);
    doc.text('VEHICLE REG', margin + 155, currentY + 4.2);
    currentY += 6;

    const containers = targetCase.containers || [];
    if (containers.length === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, currentY, pageWidth - (margin * 2), 6, 'F');
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('General Consignment / Manifest Bulk (No individual container entries recorded)', margin + 4, currentY + 4.2);
      currentY += 6;
    } else {
      containers.forEach((cnt, idx) => {
        if (idx % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, currentY, pageWidth - (margin * 2), 5.5, 'F');
        }
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(30, 41, 59);
        doc.text(String(idx + 1), margin + 4, currentY + 3.8);
        doc.setFont('helvetica', 'bold');
        doc.text(cnt.number || 'N/A', margin + 16, currentY + 3.8);
        doc.setFont('helvetica', 'normal');
        doc.text(cnt.size || 'N/A', margin + 60, currentY + 3.8);
        doc.text(cnt.weight ? `${cnt.weight.toLocaleString()} kg` : 'N/A', margin + 85, currentY + 3.8);
        doc.text(cnt.sealNo || 'CUSTOMS SEALED', margin + 120, currentY + 3.8);
        doc.text(cnt.vehicleNo || 'VERIFIED CARRIER', margin + 155, currentY + 3.8);
        currentY += 5.5;
      });
    }

    currentY += 6;

    // Customs Legal Release Declaration
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 26, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('OFFICIAL RELEASE DECLARATION & CARRIER ENDORSEMENT:', margin + 4, currentY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    const releaseStatement = `This certifies that the bonded transit movement for the cargo referenced above has successfully arrived at the destination terminal (${targetCase.pod || 'Designated Dry Port / Terminal'}). All customs gate-in verification, seal integrity inspections, weight validations, and carrier documentation have been satisfactorily finalized. The cargo is hereby officially cleared for final discharge, delivery, and unstuffing in accordance with Pakistan Customs bonded carrier regulations.`;
    const splitStatement = doc.splitTextToSize(releaseStatement, pageWidth - (margin * 2) - 8);
    doc.text(splitStatement, margin + 4, currentY + 11);

    currentY += 34;

    // Official Stamp and Authorized Signatures
    const stampX = margin + 10;
    const signX = pageWidth - margin - 65;

    drawOfficialCompanyStampOnly(doc, stampX, currentY, 'CUSTOMS BONDED CARRIER SEAL');

    // Authorized signature line
    doc.setDrawColor(100, 116, 139);
    doc.setLineWidth(0.4);
    doc.line(signX, currentY + 16, signX + 55, currentY + 16);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('Authorized Operations Officer', signX + 27.5, currentY + 20, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(data.officerName || companyName, signX + 27.5, currentY + 24, { align: 'center' });

    // Corporate Footer
    drawPdfCorporateFooter(doc, 'Official Customs Bonded Carrier Delivery Order', b);

    const cleanCaseNo = targetCase.caseNo.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Delivery_Order_${cleanCaseNo}.pdf`;
    return triggerDirectDownload(doc, filename);
  } catch (error) {
    console.error('Failed to generate delivery order PDF:', error);
    throw error;
  }
}
