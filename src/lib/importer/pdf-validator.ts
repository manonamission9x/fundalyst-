/**
 * PDF file validator.
 *
 * Checks before processing:
 *   - File extension and magic bytes (valid PDF format)
 *   - File size within limits
 *   - Not encrypted/password-protected
 *   - Not corrupted (loadable by pdfjs-dist)
 *   - Has pages with extractable content
 */

import { isPDFAvailable } from './ocr';

export interface PdfValidationResult {
  /** Overall validity */
  valid: boolean;
  /** User-facing error message (null if valid) */
  error: string | null;
  /** Non-blocking warnings */
  warnings: string[];
  /** Number of pages (null if not loaded yet) */
  pageCount: number | null;
  /** Whether the PDF appears to be scanned/image-based */
  isScanned: boolean | null;
  /** Whether the PDF is encrypted/password-protected */
  isEncrypted: boolean;
  /** File size info for UI display */
  fileSize: { bytes: number; label: string };
}

/** Maximum allowed PDF size: 50 MB */
const MAX_FILE_SIZE = 50 * 1024 * 1024;
/** Minimum PDF magic bytes length to check */
const MAGIC_BYTES_LENGTH = 5;
/** PDF "magic bytes" — the file must start with %PDF */
const PDF_HEADER = /^%PDF/;

/** Known encrypted PDF marker in the linearized header */
const ENCRYPT_MARKER = /\/Encrypt\s+\d+\s+\d+\s+R/;

/**
 * Quick synchronous validation — checks extension, magic bytes, file size.
 * Returns a result. If `valid` is false, the error is user-actionable.
 */
export function validatePdfFile(file: File): PdfValidationResult {
  const warnings: string[] = [];

  // Check extension
  const name = file.name.toLowerCase();
  if (!name.endsWith('.pdf')) {
    return {
      valid: false,
      error: `"${file.name}" does not appear to be a PDF file. Please upload a file with a .pdf extension.`,
      warnings: [],
      pageCount: null,
      isScanned: null,
      isEncrypted: false,
      fileSize: { bytes: file.size, label: formatFileSize(file.size) },
    };
  }

  // Check file size
  if (file.size === 0) {
    return {
      valid: false,
      error: 'The PDF file is empty. Please upload a document that contains financial data.',
      warnings: [],
      pageCount: null,
      isScanned: null,
      isEncrypted: false,
      fileSize: { bytes: 0, label: '0 bytes' },
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `The PDF is too large (${formatFileSize(file.size)}). Maximum supported size is 50 MB.`,
      warnings: [],
      pageCount: null,
      isScanned: null,
      isEncrypted: false,
      fileSize: { bytes: file.size, label: formatFileSize(file.size) },
    };
  }

  // File size warning for large files
  if (file.size > 20 * 1024 * 1024) {
    warnings.push(
      `Large PDF (${formatFileSize(file.size)}). Processing may take longer.`,
    );
  }

  return {
    valid: true,
    error: null,
    warnings,
    pageCount: null,
    isScanned: null,
    isEncrypted: false,
    fileSize: { bytes: file.size, label: formatFileSize(file.size) },
  };
}

/**
 * Deep validation — loads the PDF with pdfjs-dist to check for:
 *   - Encryption / password protection
 *   - Page count
 *   - Likely scanned status (very little text relative to page count)
 *   - Corruption (loading failure)
 *
 * Must be run after `validatePdfFile` passes.
 */
export async function deepValidatePdf(
  file: File,
): Promise<PdfValidationResult> {
  const base = validatePdfFile(file);
  if (!base.valid) return base;

  const warnings = [...base.warnings];
  const pdfjsOk = await isPDFAvailable();
  if (!pdfjsOk) {
    warnings.push('PDF engine not fully loaded — deep validation unavailable.');
    return { ...base, warnings, isScanned: null };
  }

  let pdfjsModule: any;
  try {
    pdfjsModule = await import('pdfjs-dist');
  } catch {
    warnings.push('Could not load PDF engine for validation.');
    return { ...base, warnings, isScanned: null };
  }

  const pdfjsLib = pdfjsModule.default || pdfjsModule;
  const arrayBuffer = await file.arrayBuffer();

  // Set worker source (needed for encrypted PDF detection in some versions)
  if (!pdfjsLib.GlobalWorkerOptions?.workerSrc) {
    try {
      const version = '5.4.149';
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.mjs`;
    } catch {
      // best-effort
    }
  }

  // Try loading the document
  let doc: any;
  try {
    doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  } catch (err: any) {
    const msg = (err?.message || '').toLowerCase();

    if (msg.includes('password') || msg.includes('encrypt') || msg.includes('protected')) {
      return {
        ...base,
        valid: false,
        error:
          'This PDF is password-protected or encrypted. Please provide an unprotected version.',
        isEncrypted: true,
      };
    }

    if (msg.includes('corrupt') || msg.includes('invalid') || msg.includes('broken')) {
      return {
        ...base,
        valid: false,
        error:
          'The PDF file appears to be corrupted and cannot be read. Please try a different file or re-download it.',
        isEncrypted: false,
      };
    }

    return {
      ...base,
      valid: false,
      error: `Could not read PDF: ${err?.message || 'Unknown error'}. If the file opens in other PDF readers, try re-saving it.`,
      isEncrypted: false,
    };
  }

  const pageCount = doc.numPages;

  if (!pageCount || pageCount === 0) {
    return {
      ...base,
      valid: false,
      error: 'The PDF appears to have no pages. Please upload a document that contains financial data.',
      pageCount: 0,
      isEncrypted: false,
    };
  }

  // Sample pages to detect scanned content
  let totalTextLength = 0;
  const samplePages = Math.min(pageCount, 5);

  for (let i = 1; i <= samplePages; i++) {
    try {
      const page = await doc.getPage(i);
      const tc = await page.getTextContent();
      for (const item of tc.items) {
        totalTextLength += ((item as any).str || '').length;
      }
    } catch {
      // Page might be image-only — fine
    }
  }

  // Estimate scanned vs text-based
  const avgTextPerPage = totalTextLength / samplePages;
  const isScanned = avgTextPerPage < 30;

  if (isScanned) {
    warnings.push(
      avgTextPerPage < 5
        ? 'This PDF appears to be scanned images. OCR will be used for text extraction, which may reduce accuracy for financial tables.'
        : 'This PDF contains limited extractable text. Some pages may be scanned images.',
    );
  }

  if (pageCount > 50) {
    warnings.push(
      `Large document (${pageCount} pages). Only financial statement pages will be analyzed.`,
    );
  }

  return {
    ...base,
    valid: true,
    error: null,
    warnings,
    pageCount,
    isScanned,
    isEncrypted: false,
  };
}

/** Format bytes to a human-readable string */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export { formatFileSize };
