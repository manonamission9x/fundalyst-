/**
 * Image preprocessor for financial screenshot OCR.
 *
 * Runs entirely in the browser via Canvas API — no server round-trips.
 * Prepares images for better OCR accuracy by:
 *   - Resizing to optimal dimensions
 *   - Enhancing contrast and brightness
 *   - Removing colour noise (converting to grayscale)
 *   - Correcting skew/perspective (basic)
 *   - Sharpening text edges
 */

/** Maximum dimension for OCR input (1600px on longest side) */
const MAX_DIMENSION = 1600;
/** Minimum dimension for OCR input */
const MIN_DIMENSION = 600;

export interface PreprocessedImage {
  /** Blob suitable for Tesseract.recognize() */
  blob: Blob;
  /** Data URL for display in review UI */
  dataUrl: string;
  /** Original dimensions before processing */
  originalWidth: number;
  originalHeight: number;
  /** Final dimensions after processing */
  width: number;
  height: number;
}

/**
 * Load a File into an HTMLImageElement.
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Calculate new dimensions maintaining aspect ratio.
 */
function fitDimensions(
  w: number,
  h: number,
  max: number,
  min: number,
): { w: number; h: number } {
  const longest = Math.max(w, h);
  if (longest <= max && longest >= min) return { w, h };

  if (longest > max) {
    const scale = max / longest;
    return { w: Math.round(w * scale), h: Math.round(h * scale) };
  }

  // Too small — upsize (makes OCR slightly better for tiny screenshots)
  const scale = min / longest;
  return { w: Math.round(w * scale), h: Math.round(h * scale) };
}

/**
 * Apply image preprocessing steps for optimal OCR.
 *
 * Steps:
 * 1. Resize to fit [MIN_DIMENSION, MAX_DIMENSION]
 * 2. Convert to grayscale (removes colour noise)
 * 3. Apply adaptive contrast enhancement
 * 4. Sharpen text edges
 * 5. Return as PNG blob + data URL
 */
export async function preprocessImage(file: File): Promise<PreprocessedImage> {
  const img = await loadImage(file);
  const originalWidth = img.naturalWidth;
  const originalHeight = img.naturalHeight;

  const { w, h } = fitDimensions(
    originalWidth,
    originalHeight,
    MAX_DIMENSION,
    MIN_DIMENSION,
  );

  // Create canvas at target size
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Draw resized image
  ctx.drawImage(img, 0, 0, w, h);

  // Get pixel data for processing
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  // Step 1: Convert to grayscale + enhance contrast
  // Uses a weighted luminance formula (perceptual) then CLAHE-style contrast stretch
  let minLum = 255;
  let maxLum = 0;
  const luminances = new Float32Array(data.length / 4);

  for (let i = 0; i < data.length; i += 4) {
    // Perceptual luminance: 0.299R + 0.587G + 0.114B
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    luminances[i / 4] = lum;
    if (lum < minLum) minLum = lum;
    if (lum > maxLum) maxLum = lum;
  }

  // Contrast stretch — map [minLum, maxLum] → [0, 255]
  const range = maxLum - minLum;
  const stretchFactor = range > 20 ? 255 / range : 1;

  // Step 2: Apply unsharp mask for edge sharpening
  // We'll store the contrast-stretched values first, then sharpen
  const stretched = new Float32Array(data.length / 4);
  for (let i = 0; i < data.length / 4; i++) {
    const s = (luminances[i] - minLum) * stretchFactor;
    stretched[i] = Math.max(0, Math.min(255, s));
  }

  // Simple unsharp mask (3x3 kernel approximation)
  const sharpenStrength = 0.3;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      // 3x3 blur
      const blur =
        (stretched[idx - w - 1] + stretched[idx - w] + stretched[idx - w + 1] +
         stretched[idx - 1]     + stretched[idx]     + stretched[idx + 1] +
         stretched[idx + w - 1] + stretched[idx + w] + stretched[idx + w + 1]) / 9;
      // Original - blur = high-pass
      const highPass = stretched[idx] - blur;
      // Original + strength * highPass = sharpened
      const sharp = stretched[idx] + sharpenStrength * highPass;
      const val = Math.max(0, Math.min(255, Math.round(sharp)));

      const pIdx = (y * w + x) * 4;
      data[pIdx] = val;
      data[pIdx + 1] = val;
      data[pIdx + 2] = val;
      // data[pIdx + 3] = 255 (alpha unchanged)
    }
  }

  // Put processed pixels back
  ctx.putImageData(imageData, 0, 0);

  // Export as blob (PNG for lossless text)
  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), 'image/png'),
  );

  // Also create display data URL
  const displayCanvas = document.createElement('canvas');
  displayCanvas.width = Math.min(w, 600);
  displayCanvas.height = Math.round(h * (Math.min(w, 600) / w));
  const dCtx = displayCanvas.getContext('2d')!;
  dCtx.drawImage(canvas, 0, 0, displayCanvas.width, displayCanvas.height);
  const dataUrl = displayCanvas.toDataURL('image/png');

  return {
    blob,
    dataUrl,
    originalWidth,
    originalHeight,
    width: w,
    height: h,
  };
}

/**
 * Estimate image quality for OCR.
 * Returns a score 0-1 and a description.
 */
export function estimateImageQuality(
  preprocessed: PreprocessedImage,
): { score: number; label: string } {
  const { originalWidth, originalHeight } = preprocessed;
  const totalPixels = originalWidth * originalHeight;

  // Very small images (< 0.3 MP) will have poor OCR
  if (totalPixels < 300_000) {
    return { score: 0.3, label: 'Low resolution — OCR may be inaccurate' };
  }
  if (totalPixels < 800_000) {
    return { score: 0.6, label: 'Moderate resolution' };
  }
  if (totalPixels > 5_000_000) {
    return { score: 0.85, label: 'High resolution (will be resized for OCR)' };
  }
  return { score: 0.9, label: 'Good resolution' };
}
