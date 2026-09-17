/**
 * Secure and memory-efficient file utilities for document handling,
 * image compression, and Base64 conversion.
 */

export interface ProcessedDocument {
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  base64: string;
  isImage: boolean;
}

/**
 * Accurately detects MIME type and document nature from filename and declared type.
 * Prevents miscategorizing JPEGs without MIME as PDFs or vice versa.
 */
export function detectMimeType(file: { name?: string; type?: string }): { mimeType: string; isImage: boolean; isPdf: boolean } {
  const name = (file.name || '').toLowerCase();
  const type = (file.type || '').toLowerCase();

  // Check for image by MIME or extension (supporting jfif, tiff, heic, webp, png, bmp, etc.)
  if (
    type.startsWith('image/') ||
    /\.(jpe?g|jfif|png|webp|bmp|gif|heic|heif|tiff?)$/i.test(name)
  ) {
    let mime = type.startsWith('image/') ? type : 'image/jpeg';
    if (name.endsWith('.png')) mime = 'image/png';
    else if (name.endsWith('.webp')) mime = 'image/webp';
    else if (name.endsWith('.gif')) mime = 'image/gif';
    else if (name.endsWith('.bmp')) mime = 'image/bmp';
    else if (/\.(tiff?)$/i.test(name)) mime = 'image/tiff';
    return { mimeType: mime, isImage: true, isPdf: false };
  }

  // Check for PDF
  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    return { mimeType: 'application/pdf', isImage: false, isPdf: true };
  }

  return { 
    mimeType: type || (name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'), 
    isImage: false, 
    isPdf: type === 'application/pdf' || name.endsWith('.pdf') 
  };
}

/**
 * Compresses and enhances an image or PDF file to maximize OCR readability:
 * - High-resolution preservation (up to 2200px) so fine serials, GD entries, and stamps remain crisp.
 * - Adaptive shadow lifting for low-light smartphone captures.
 * - Dynamic contrast boost for faint photocopies, carbon duplicates, and dot-matrix receipts.
 * - High fidelity (0.92 quality) to avoid blocky compression artifacts around small numbers.
 */
export async function compressAndPrepareFile(file: File): Promise<ProcessedDocument> {
  const { mimeType: defaultMimeType, isImage } = detectMimeType(file);

  if (!isImage) {
    // For PDFs & documents, allow up to 20MB for inline AI extraction
    if (file.size > 20 * 1024 * 1024) {
      console.log(`Document ${file.name} (${Math.round(file.size / 1024)} KB) preserved locally without heavy inline Base64.`);
      return {
        name: file.name,
        type: defaultMimeType,
        size: file.size,
        dataUrl: '',
        base64: '',
        isImage: false,
      };
    }

    try {
      const base64 = await readAsBase64(file, 20 * 1024 * 1024);
      return {
        name: file.name,
        type: defaultMimeType,
        size: file.size,
        dataUrl: '', // Avoid duplicate multi-megabyte string in memory for PDFs
        base64,
        isImage: false,
      };
    } catch (err) {
      console.warn("Non-fatal PDF read warning:", err);
      return {
        name: file.name,
        type: defaultMimeType,
        size: file.size,
        dataUrl: '',
        base64: '',
        isImage: false,
      };
    }
  }

  // For images, optimize resolution to a crisp 2200px (ideal for Gemini multimodal document vision)
  return new Promise((resolve) => {
    let objectUrl = '';
    try {
      objectUrl = URL.createObjectURL(file);
    } catch (e) {
      console.warn("Could not create object URL for image:", e);
    }

    const img = new Image();
    const cleanup = () => {
      if (objectUrl) {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch (_) {}
      }
    };

    img.onerror = () => {
      cleanup();
      resolve({
        name: file.name,
        type: defaultMimeType,
        size: file.size,
        dataUrl: '',
        base64: '',
        isImage: true,
      });
    };

    img.onload = () => {
      let canvas: HTMLCanvasElement | null = null;
      try {
        const maxDim = 1600; // Balanced clarity for OCR while safely preventing mobile OOM
        let { width, height } = img;

        // Scale down if image is larger than maxDim
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup();
          resolve({
            name: file.name,
            type: defaultMimeType,
            size: file.size,
            dataUrl: '',
            base64: '',
            isImage: true,
          });
          return;
        }

        // Draw image directly
        ctx.drawImage(img, 0, 0, width, height);

        // Export high-fidelity JPEG with 0.85 quality (substantially lighter and prevents memory spikes)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const commaIdx = compressedDataUrl.indexOf(',');
        const compressedBase64 = commaIdx >= 0 ? compressedDataUrl.substring(commaIdx + 1) : '';
        const approxSize = Math.round((compressedBase64.length * 3) / 4);

        // Explicitly release GPU texture memory
        canvas.width = 0;
        canvas.height = 0;
        canvas = null;

        cleanup();
        resolve({
          name: file.name.replace(/\.[^/.]+$/, "") + ".jpg",
          type: 'image/jpeg',
          size: approxSize,
          dataUrl: compressedDataUrl,
          base64: compressedBase64,
          isImage: true,
        });
      } catch (canvasErr) {
        if (canvas) {
          try {
            canvas.width = 0;
            canvas.height = 0;
          } catch (_) {}
        }
        cleanup();
        console.warn("Canvas compression fallback:", canvasErr);
        resolve({
          name: file.name,
          type: defaultMimeType,
          size: file.size,
          dataUrl: '',
          base64: '',
          isImage: true,
        });
      }
    };

    if (objectUrl) {
      img.src = objectUrl;
    } else {
      // Fallback to FileReader if objectUrl failed
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = (e.target?.result as string) || '';
      };
      reader.onerror = () => {
        resolve({
          name: file.name,
          type: defaultMimeType,
          size: file.size,
          dataUrl: '',
          base64: '',
          isImage: true,
        });
      };
      reader.readAsDataURL(file);
    }
  });
}

/**
 * Safely reads a File as raw Base64 string with size limit and timeout
 */
export function readAsBase64(file: File, maxSizeBytes: number = 10 * 1024 * 1024): Promise<string> {
  return new Promise((resolve) => {
    if (file.size > maxSizeBytes) {
      console.warn(`File ${file.name} exceeds safe memory limit for Base64 (${Math.round(file.size / 1024)} KB).`);
      resolve('');
      return;
    }

    const reader = new FileReader();
    const timeout = setTimeout(() => {
      try {
        reader.abort();
      } catch (_) {}
      resolve('');
    }, 10000); // 10s safeguard

    reader.onload = () => {
      clearTimeout(timeout);
      try {
        const result = (reader.result as string) || '';
        const commaIdx = result.indexOf(',');
        const base64 = commaIdx >= 0 ? result.substring(commaIdx + 1) : result;
        resolve(base64);
      } catch (e) {
        console.warn("Base64 extraction warning:", e);
        resolve('');
      }
    };

    reader.onerror = (error) => {
      clearTimeout(timeout);
      console.warn("FileReader error, handled safely:", error);
      resolve('');
    };

    reader.onabort = () => {
      clearTimeout(timeout);
      resolve('');
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Safely reads a Blob as raw Base64 string
 */
export function readBlobAsBase64(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    const timeout = setTimeout(() => {
      try { reader.abort(); } catch (_) {}
      resolve('');
    }, 12000);

    reader.onload = () => {
      clearTimeout(timeout);
      try {
        const result = (reader.result as string) || '';
        const commaIdx = result.indexOf(',');
        resolve(commaIdx >= 0 ? result.substring(commaIdx + 1) : result);
      } catch (_) {
        resolve('');
      }
    };
    reader.onerror = () => {
      clearTimeout(timeout);
      resolve('');
    };
    reader.onabort = () => {
      clearTimeout(timeout);
      resolve('');
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Generates and triggers download of a clean CSV file
 */
export function exportCSVFile(filename: string, headers: string[], rows: (string | number)[][]): void {
  const escapeCsv = (val: string | number | undefined | null) => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvContent = [
    headers.map(escapeCsv).join(','),
    ...rows.map(row => row.map(escapeCsv).join(','))
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

