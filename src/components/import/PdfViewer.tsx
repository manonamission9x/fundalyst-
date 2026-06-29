'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface PdfViewerProps {
  /** The PDF file to display */
  file: File;
  /** Called when the user navigates to a different page */
  onPageChange?: (page: number) => void;
  /** Initial page to display */
  initialPage?: number;
  /** Height of the viewer container */
  height?: number;
}

type ZoomMode = 'fit-width' | 'fit-page' | 'custom';

/**
 * Embedded PDF viewer using pdfjs-dist canvas rendering.
 *
 * Features:
 *   - Page rendering via canvas
 *   - Page navigation (prev / next / jump-to-page)
 *   - Zoom controls (fit width, fit page, custom zoom)
 *   - Thumbnail strip for quick navigation
 *   - Loading state while page renders
 */
export default function PdfViewer({
  file,
  onPageChange,
  initialPage = 1,
  height = 500,
}: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfDoc, setPdfDoc] = useState<import('pdfjs-dist').PDFDocumentProxy | null>(null);
  const [pageNum, setPageNum] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoomMode, setZoomMode] = useState<ZoomMode>('fit-width');
  const [zoom, setZoom] = useState(1);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const pdfDocRef = useRef<import('pdfjs-dist').PDFDocumentProxy | null>(null);

  // Load the PDF document
  useEffect(() => {
    let cancelled = false;
    const t1 = setTimeout(() => setLoading(true), 0);
    const t2 = setTimeout(() => setError(null), 0);

    (async () => {
      try {
        const pdfjsModule = await import('pdfjs-dist');
        const pdfjsLib = pdfjsModule.default || pdfjsModule;

        // Set worker source
        if (!pdfjsLib.GlobalWorkerOptions?.workerSrc) {
          try {
            pdfjsLib.GlobalWorkerOptions.workerSrc =
              'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.149/pdf.worker.min.mjs';
          } catch { /* best-effort */ }
        }

        const arrayBuffer = await file.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        if (cancelled) return;

        pdfDocRef.current = doc;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setPageNum(Math.min(initialPage, doc.numPages));

        // Generate thumbnails for first ~20 pages
        const thumbs: string[] = [];
        const maxThumbs = Math.min(doc.numPages, 20);
        for (let i = 1; i <= maxThumbs; i++) {
          try {
            const page = await doc.getPage(i);
            const viewport = page.getViewport({ scale: 0.3 });
            const thumbCanvas = document.createElement('canvas');
            thumbCanvas.width = viewport.width;
            thumbCanvas.height = viewport.height;
            const ctx = thumbCanvas.getContext('2d')!;
            await page.render({ canvas: thumbCanvas, viewport, canvasContext: ctx }).promise;
            thumbs.push(thumbCanvas.toDataURL('image/png'));
          } catch {
            thumbs.push('');
          }
        }
        if (!cancelled) setThumbnails(thumbs);
        setLoading(false);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load PDF');
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [file, initialPage]);

  // Render the current page
  const renderPage = useCallback(async (num: number) => {
    if (!pdfDocRef.current || !canvasRef.current) return;

    // Cancel any in-progress render
    if (renderTaskRef.current) {
      try { renderTaskRef.current.cancel(); } catch { /* ignore */ }
    }

    setRendering(true);

    try {
      const doc = pdfDocRef.current;
      const page = await doc.getPage(num);
      const container = containerRef.current;
      const containerWidth = container?.clientWidth || 800;
      const containerHeight = (height || 500) - 10;

      let scale = zoom;
      if (zoomMode === 'fit-width') {
        scale = containerWidth / page.getViewport({ scale: 1 }).width;
      } else if (zoomMode === 'fit-page') {
        const vp = page.getViewport({ scale: 1 });
        scale = Math.min(
          containerWidth / vp.width,
          containerHeight / vp.height,
        );
      }

      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const renderTask = page.render({
        canvas,
        viewport,
        canvasContext: ctx,
      });
      renderTaskRef.current = renderTask;
      await renderTask.promise;
      renderTaskRef.current = null;
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'CancellationException') {
        console.warn('[PdfViewer] Render error:', err.message);
      }
    }
    setRendering(false);
  }, [zoom, zoomMode, height]);

  // Re-render when page, zoom, or size changes
  useEffect(() => {
    if (pdfDoc) renderPage(pageNum);
  }, [pdfDoc, pageNum, renderPage]);

  // Fit-width on container resize
  useEffect(() => {
    if (zoomMode !== 'fit-width') return;
    const observer = new ResizeObserver(() => {
      if (pdfDoc) renderPage(pageNum);
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [pdfDoc, pageNum, zoomMode, renderPage]);

  // Navigation handlers
  const goToPage = useCallback((n: number) => {
    const page = Math.max(1, Math.min(n, totalPages));
    setPageNum(page);
    onPageChange?.(page);
  }, [totalPages, onPageChange]);

  const handleZoomMode = useCallback((mode: ZoomMode) => {
    setZoomMode(mode);
    if (mode === 'custom') setZoom(1);
  }, []);

  const zoomIn = useCallback(() => setZoom((z) => Math.min(z + 0.25, 3)), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(z - 0.25, 0.25)), []);

  if (error) {
    return (
      <div
        style={{
          height, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)', color: 'var(--red)',
          fontSize: 13, padding: 20, textAlign: 'center',
        }}
      >
        {error}
      </div>
    );
  }

  const zoomPercent = Math.round(
    zoomMode === 'fit-width' ? 100 :
    zoomMode === 'fit-page' ? 100 :
    zoom * 100,
  );

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        background: 'var(--bg)',
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 14px',
          background: 'var(--bg-elevated)',
          borderBottom: '1px solid var(--border)',
          flexWrap: 'wrap',
        }}
      >
        {/* Page navigation */}
        <button
          type="button"
          onClick={() => goToPage(pageNum - 1)}
          disabled={pageNum <= 1 || loading}
          aria-label="Previous page"
          style={{
            fontSize: 11, padding: '3px 10px',
            border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-surface)', color: 'var(--text-secondary)',
            cursor: pageNum > 1 ? 'pointer' : 'default',
            opacity: pageNum > 1 ? 1 : 0.4,
          }}
        >
          ‹ Prev
        </button>

        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
          Page{' '}
          <input
            type="number"
            value={pageNum}
            onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
            min={1}
            max={totalPages}
            aria-label="Page number"
            style={{
              width: 40, padding: '2px 4px', textAlign: 'center',
              fontSize: 11, fontFamily: 'var(--font-mono)',
              background: 'var(--bg-field)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', color: 'var(--text)',
            }}
          />
          {' '}of {totalPages}
        </span>

        <button
          type="button"
          onClick={() => goToPage(pageNum + 1)}
          disabled={pageNum >= totalPages || loading}
          aria-label="Next page"
          style={{
            fontSize: 11, padding: '3px 10px',
            border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-surface)', color: 'var(--text-secondary)',
            cursor: pageNum < totalPages ? 'pointer' : 'default',
            opacity: pageNum < totalPages ? 1 : 0.4,
          }}
        >
          Next ›
        </button>

        <span style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 4px' }} />

        {/* Zoom controls */}
        <button type="button" onClick={zoomOut} aria-label="Zoom out" style={smallBtnStyle}>−</button>

        <select
          value={zoomMode}
          onChange={(e) => handleZoomMode(e.target.value as ZoomMode)}
          aria-label="Zoom mode"
          style={{
            fontSize: 10, fontFamily: 'var(--font-mono)',
            background: 'var(--bg-field)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)',
            padding: '2px 4px',
          }}
        >
          <option value="fit-width">Fit width</option>
          <option value="fit-page">Fit page</option>
          <option value="custom">{zoomPercent}%</option>
        </select>

        <button type="button" onClick={zoomIn} aria-label="Zoom in" style={smallBtnStyle}>+</button>

        {rendering && (
          <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>
            Rendering…
          </span>
        )}
      </div>

      {/* Page + Thumbnails */}
      <div style={{ display: 'flex', height: height - 45 }}>
        {/* Thumbnail strip */}
        {thumbnails.length > 0 && (
          <div
            style={{
              width: 100, overflowY: 'auto', flexShrink: 0,
              borderRight: '1px solid var(--border-light)',
              background: 'var(--bg-elevated)',
              padding: '6px 0',
            }}
          >
            {thumbnails.map((thumb, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goToPage(i + 1)}
                aria-label={`Go to page ${i + 1}`}
                style={{
                  display: 'block', width: '100%', padding: '4px 8px',
                  border: 'none', background: 'transparent',
                  cursor: 'pointer', opacity: pageNum === i + 1 ? 1 : 0.5,
                }}
              >
                {thumb ? (
                  <img
                    src={thumb}
                    alt={`Page ${i + 1}`}
                    style={{
                      width: '100%', borderRadius: 2,
                      border: pageNum === i + 1 ? '2px solid var(--primary)' : '2px solid transparent',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      height: 40, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 9,
                      color: 'var(--text-muted)', background: 'var(--bg-field)',
                      borderRadius: 2,
                    }}
                  >
                    {i + 1}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Main canvas area */}
        <div
          ref={containerRef}
          style={{
            flex: 1, overflow: 'auto', display: 'flex',
            justifyContent: 'center', alignItems: 'flex-start',
            padding: 10, background: 'var(--bg)',
          }}
        >
          {loading ? (
            <div style={{
              padding: 40, color: 'var(--text-muted)', fontSize: 12,
              fontFamily: 'var(--font-mono)',
            }}>
              Loading PDF…
            </div>
          ) : (
            <canvas ref={canvasRef} style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.5)' }} />
          )}
        </div>
      </div>
    </div>
  );
}

const smallBtnStyle: React.CSSProperties = {
  fontSize: 14, padding: '2px 8px', lineHeight: 1.2,
  border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
  background: 'var(--bg-surface)', color: 'var(--text-secondary)',
  cursor: 'pointer',
};
