'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePageTitle } from '@/lib/use-page-title';
import { PageHeader, Card, Disclaimer, DataQualityBar, TrustBadge, DataSourceBadge } from '@/components/ui';
import { useImporterStore } from '@/store/importer-store';
import { canonicalDisplayName } from '@/lib/importer/metric-aliases';
import { validatePdfFile, deepValidatePdf } from '@/lib/importer/pdf-validator';
import type { MetricMapping } from '@/lib/importer/types';
import type { PdfValidationResult } from '@/lib/importer/pdf-validator';
import dynamic from 'next/dynamic';

// Lazy-load PDF viewer (heavy dependency)
const PdfViewer = dynamic(() => import('@/components/import/PdfViewer'), {
  ssr: false,
  loading: () => <div className="skeleton" style={{ width: '100%', height: 200, borderRadius: 'var(--radius-md)' }} />,
});

export default function ImportPage() {
  usePageTitle('Import');
  const {
    review, isImporting, error, lastDataset,
    startImport, updateMapping, confirmImport, cancelImport,
    saveMappingTemplate, clearLastDataset,
  } = useImporterStore();

  // Clipboard paste support for screenshots
  const [pastedFile, setPastedFile] = useState<File | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [pdfValidation, setPdfValidation] = useState<PdfValidationResult | null>(null);
  const [pdfValidating, setPdfValidating] = useState(false);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploadedFile(file);
      setPdfValidation(null);

      // Track for image preview in review
      if (file.type.startsWith('image/')) {
        setPastedFile(file);
      } else {
        setPastedFile(null);
      }

      // Validate PDF before processing
      if (file.name.toLowerCase().endsWith('.pdf')) {
        const quickCheck = validatePdfFile(file);
        if (!quickCheck.valid) {
          setPdfValidation(quickCheck);
          setPdfValidating(false);
          return; // Don't proceed with import
        }
        setPdfValidating(true);
        // Deep validation (async, checks encryption, pages, etc.)
        const deep = await deepValidatePdf(file);
        setPdfValidating(false);
        setPdfValidation(deep);
        if (!deep.valid) return; // Don't proceed
      }

      await startImport(file);
      e.target.value = '';
    },
    [startImport]
  );

  // ── Sample data import for demo ──
  const handleSampleImport = useCallback(async () => {
    const sampleCSV = `Metric, FY24, FY25, FY26
Revenue, 1240, 1410, 1530
Net Profit, 142, 130, 119
EBITDA Margin, 18.2, 16.4, 14.6
Total Debt, 410, 500, 590
Promoter Holding, 72.5, 70.1, 68.3
Total Assets, 3200, 3600, 4100
Current Assets, 1400, 1550, 1700
Current Liabilities, 800, 900, 1050
Cash & Equivalents, 200, 180, 150
Inventory, 600, 700, 800
Receivables, 900, 1050, 1200
Depreciation, 80, 85, 90
Interest Expense, 45, 52, 60`;
    const blob = new Blob([sampleCSV], { type: 'text/csv' });
    const file = new File([blob], 'sample-financial-data.csv', { type: 'text/csv' });
    setUploadedFile(file);
    await startImport(file);
  }, [startImport, setUploadedFile]);

  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const imageFile = new File([file], 'clipboard-screenshot.png', {
              type: file.type || 'image/png',
            });
            setPastedFile(imageFile);
            await startImport(imageFile);
          }
          return;
        }
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [startImport]);

  const handleConfirm = useCallback(() => {
    const dataset = confirmImport();
    if (dataset) {
      saveMappingTemplate();
    }
  }, [confirmImport, saveMappingTemplate]);

  // Show the last confirmed dataset if no active review
  if (!review && lastDataset) {
    return <ImportResult dataset={lastDataset} onClear={clearLastDataset} />;
  }

  return (
    <div>
      <PageHeader
        title="Import"
        subtitle="Upload messy financial files. Fundalyst cleans, maps, and prepares them for analysis."
        answer="Upload messy data. We clean it. Your files stay in your browser."
      />

      {/* Upload area */}
      {!review && !isImporting && !error && (
        <>
          <Card style={{ marginBottom: '1.5rem' }}>
            <div style={{ padding: '32px 20px', textAlign: 'center' }}>
              <label className="import-dropzone" style={{ maxWidth: 400, margin: '0 auto' }}>
                <div className="import-dropzone-icon">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M10 2v12M4 8l6-6 6 6" />
                    <path d="M2 16v2h16v-2" />
                  </svg>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                  Choose a file or drag it here
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                  Supports NSE/BSE-style financial statements, Screener exports, annual report tables, and Indian filing terminology.
                </div>
                <div className="import-formats">
                  <span>CSV</span>
                  <span>·</span>
                  <span>XLSX</span>
                  <span>·</span>
                  <span>PDF</span>
                  <span>·</span>
                  <span>Screenshot</span>
                  <span style={{ color: 'var(--amber)', fontSize: 8 }}>NEW</span>
                </div>
                <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: 6 }}>
                  Or paste a screenshot from clipboard (Ctrl+V)
                </div>
                <span className="upload-label" style={{ padding: '8px 18px', fontSize: 12 }}>
                  Upload file
                  <input type="file" accept=".csv,.tsv,.txt,.xlsx,.xls,.pdf,.png,.jpg,.jpeg,.gif,.webp" style={{ display: 'none' }} onChange={handleFileUpload} />
                </span>
              </label>
            </div>
          </Card>

          {/* Try sample data — bypass file selection */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <button
              type="button"
              className="btn-primary"
              style={{ fontSize: 12, padding: '8px 20px' }}
              onClick={handleSampleImport}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3">
                <path d="M2 7h10M7 2v10" />
              </svg>
              Try an example →
            </button>
            <div style={{ marginTop: 6, fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              No file needed — loads example financial data to see how import works
            </div>
          </div>

          {/* PDF validation result */}
          {pdfValidating && (
            <Card style={{ marginBottom: '1.5rem' }}>
              <div className="pdf-progress">
                <div className="pdf-progress-bar">
                  <div className="pdf-progress-fill" style={{ width: '60%' }} />
                </div>
                <span className="pdf-progress-label">Validating PDF…</span>
              </div>
            </Card>
          )}
          {pdfValidation && !pdfValidation.valid && (
            <div className={`pdf-validation error`}>
              <span className="pdf-validation-icon">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><path d="M4 4l6 6M10 4l-6 6" /></svg>
              </span>
              <div>{pdfValidation.error}</div>
            </div>
          )}
          {pdfValidation && pdfValidation.valid && pdfValidation.warnings.length > 0 && (
            <div className={`pdf-validation warning`}>
              <span className="pdf-validation-icon">!</span>
              <div>
                {pdfValidation.warnings.map((w, i) => (
                  <div key={i}>{w}</div>
                ))}
              </div>
            </div>
          )}

          {/* Workflow steps */}
          <div className="workflow-steps">
            <div className="workflow-step">
              <div className="workflow-step-num">Step 1</div>
              <div className="workflow-step-title">Detect periods</div>
              <div className="workflow-step-desc">Identifies fiscal years, quarters, and statement types automatically.</div>
            </div>
            <div className="workflow-step">
              <div className="workflow-step-num">Step 2</div>
              <div className="workflow-step-title">Normalize values</div>
              <div className="workflow-step-desc">Converts Cr/Lakh/Bn/Mn, handles Indian commas and bracket negatives.</div>
            </div>
            <div className="workflow-step">
              <div className="workflow-step-num">Step 3</div>
              <div className="workflow-step-title">Map metrics</div>
              <div className="workflow-step-desc">Matches 200+ labels to 32 canonical metrics with confidence scoring.</div>
            </div>
            <div className="workflow-step">
              <div className="workflow-step-num">Step 4</div>
              <div className="workflow-step-title">Review &amp; analyze</div>
              <div className="workflow-step-desc">Confirm mappings, then all tools auto-populate with your data.</div>
            </div>
          </div>

          {/* Or paste */}
          <div style={{ textAlign: 'center', padding: '16px 0', marginTop: '0.5rem' }}>
            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              or paste data manually in any tool&nbsp;
              <Link href="/research/trends" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Trends →</Link>
            </span>
          </div>

          <Disclaimer extra="From raw filings to clear investment insight" />
        </>
      )}

      {/* Loading state — enhanced for PDF and screenshots */}
      {isImporting && (
        <Card>
          <div className="pdf-progress">
            <div className="pdf-progress-bar">
              <div className="pdf-progress-fill" style={{ width: '45%' }} />
            </div>
            <span className="pdf-progress-label">
              {uploadedFile?.name.toLowerCase().endsWith('.pdf')
                ? 'Extracting financial data from PDF…'
                : pastedFile
                  ? 'Processing screenshot…'
                  : 'Parsing file…'}
            </span>
          </div>
          <div style={{ padding: '0 20px 14px', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
            {uploadedFile?.name.toLowerCase().endsWith('.pdf')
              ? `Processing ${uploadedFile.name} — this may take a moment for multi-page documents`
              : 'This may take a few seconds for images'}
          </div>
        </Card>
      )}

      {/* Error state */}
      {error && (
        <Card label="Import failed">
          <div style={{ padding: '14px 20px' }}>
            <p style={{ fontSize: 12, color: 'var(--red)', marginBottom: 12 }}>{error}</p>
            <button type="button" onClick={cancelImport} style={{ fontSize: 12 }}>
              Try again
            </button>
          </div>
        </Card>
      )}

      {/* Review screen */}
      {review && !isImporting && (
        <ImportReview
          review={review}
          onUpdateMapping={updateMapping}
          onConfirm={handleConfirm}
          onCancel={cancelImport}
          sourceImageUrl={pastedFile ? URL.createObjectURL(pastedFile) : undefined}
          uploadedFile={uploadedFile}
        />
      )}
    </div>
  );
}

// ── Import Review Component ──

function ImportReview({
  review,
  onUpdateMapping,
  onConfirm,
  onCancel,
  sourceImageUrl,
  uploadedFile,
}: {
  review: NonNullable<ReturnType<typeof useImporterStore.getState>['review']>;
  onUpdateMapping: (label: string, updates: Partial<MetricMapping>) => void;
  onConfirm: () => void;
  onCancel: () => void;
  sourceImageUrl?: string;
  uploadedFile?: File | null;
}) {
  const factsCount = review.rawFacts.length;
  const mappedCount = review.mappings.filter((m) => m.canonicalMetric !== 'unknown' && !m.ignored).length;
  const ignoredCount = review.mappings.filter((m) => m.ignored).length;
  const unknownCount = review.mappings.filter((m) => m.canonicalMetric === 'unknown' && !m.ignored).length;
  const pctMapped = factsCount > 0 ? Math.round((mappedCount / factsCount) * 100) : 0;

  return (
    <div style={{ marginTop: '1.5rem' }}>
      {/* Detection Summary */}
      <Card label="File detected">
        <div className="card-body">
          {review.sourceType === 'ocr' && sourceImageUrl && (
            <div style={{
              marginBottom: 14, display: 'flex', gap: 14, alignItems: 'flex-start',
            }}>
              <img
                src={sourceImageUrl}
                alt="Uploaded screenshot"
                style={{
                  maxWidth: 160, maxHeight: 120,
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  objectFit: 'contain',
                  background: 'var(--bg)',
                }}
              />
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                <strong style={{ color: 'var(--text-secondary)' }}>Screenshot imported</strong>
                <br />
                Text extracted via OCR. Values shown below are the best guess from the image.
                <br />
                Always review uncertain values before confirming.
              </div>
            </div>
          )}

          {/* PDF viewer — shown when reviewing a PDF import */}
          {(review.sourceType === 'pdf-text' || review.sourceType === 'ocr') && uploadedFile && uploadedFile.name.toLowerCase().endsWith('.pdf') && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                Source document
              </div>
              <PdfViewer
                file={uploadedFile}
                height={360}
              />
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <DetectItem label="File" value={review.fileName} />
            <DetectItem label="Company" value={review.metadata.company || 'Not detected'} />
            <DetectItem label="Currency" value={review.metadata.currency} />
            <DetectItem label="Unit" value={review.metadata.unit} />
            <DetectItem label="Periods" value={review.metadata.periodLabels.join(', ') || 'None detected'} />
            <DetectItem label="Statement" value={review.metadata.statementTypes.join(', ')} />
          </div>
          <DataQualityBar
            source={review.fileName}
            periods={`${review.metadata.periodLabels.length} periods detected`}
            metrics={mappedCount}
            missing={unknownCount}
          />
          <div className="flex gap-2 flex-wrap mt-2">
            <TrustBadge label="Import" variant="source" />
            {pctMapped >= 80 && <TrustBadge label="High Mapping Quality" variant="good" />}
          </div>

          {/* Extraction quality summary */}
          <div style={{
            marginTop: 12, display: 'flex', gap: 12, flexWrap: 'wrap',
            fontSize: 10, fontFamily: 'var(--font-mono)',
          }}>
            {factsCount > 0 && (
              <>
                <span style={{ color: 'var(--green)' }}>
                  ● {review.rawFacts.filter(f => f.metric !== 'unknown' && f.confidence >= 0.7).length} high
                </span>
                <span style={{ color: 'var(--amber)' }}>
                  ● {review.rawFacts.filter(f => f.metric !== 'unknown' && f.confidence >= 0.4 && f.confidence < 0.7).length} medium
                </span>
                <span style={{ color: 'var(--red)' }}>
                  ● {review.rawFacts.filter(f => f.metric === 'unknown' || f.confidence < 0.4).length} low
                </span>
                <span style={{ color: 'var(--text-muted)' }}>
                  {factsCount} total values
                </span>
              </>
            )}
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 16, fontSize: 11, fontFamily: 'var(--font-mono)' }}>
            <span style={{ color: 'var(--green)' }}>{factsCount} values found</span>
            <span style={{ color: 'var(--primary)' }}>{mappedCount} metrics mapped ({pctMapped}%)</span>
            {unknownCount > 0 && <span style={{ color: 'var(--amber)' }}>{unknownCount} need review</span>}
            {ignoredCount > 0 && <span style={{ color: 'var(--text-muted)' }}>{ignoredCount} skipped</span>}
          </div>
        </div>
      </Card>

      {/* Warnings */}
      {review.warnings.length > 0 && (
        <Card label="Warnings" style={{ marginTop: 2 }}>
          <div className="card-body">
            {review.warnings.map((w, i) => (
              <div key={i} style={{ fontSize: 11, color: 'var(--amber)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" style={{ marginRight: 4, verticalAlign: 'middle' }}><path d="M6 1L1 11h10L6 1z" /><path d="M6 5v2" /><circle cx="6" cy="9" r="0.5" fill="currentColor" stroke="none" /></svg>
                {w}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Mapping Table */}
      <Card label={`Metric mappings (${review.mappings.length} rows)`} style={{ marginTop: 2 }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="diff-table">
            <thead>
              <tr>
                <th>Original label</th>
                <th>Mapped to</th>
                <th>Confidence</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {review.mappings.map((m, i) => (
                <tr key={i}>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <span style={m.ignored ? { textDecoration: 'line-through', opacity: 0.5 } : {}}>
                      {m.originalLabel}
                    </span>
                  </td>
                  <td>
                    {m.ignored ? (
                      <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>Ignored</span>
                    ) : (
                      <select
                        value={m.userOverride || m.canonicalMetric}
                        onChange={(e) =>
                          onUpdateMapping(m.originalLabel, {
                            userOverride: e.target.value,
                            canonicalMetric: e.target.value,
                            userConfirmed: true,
                          })
                        }
                        style={{
                          background: 'var(--bg-field)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text)',
                          padding: '3px 6px',
                          fontSize: 11,
                          fontFamily: 'var(--font-mono)',
                          maxWidth: 150,
                        }}
                      >
                        <option value={m.canonicalMetric}>{canonicalDisplayName(m.canonicalMetric)}</option>
                        {ALL_METRIC_OPTIONS.filter((opt) => opt !== m.canonicalMetric).map((opt) => (
                          <option key={opt} value={opt}>
                            {canonicalDisplayName(opt)}
                          </option>
                        ))}
                        <option value="unknown">Unknown — skip</option>
                      </select>
                    )}
                  </td>
                  <td>
                    <ConfidenceBadge score={m.confidence} />
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => onUpdateMapping(m.originalLabel, { ignored: !m.ignored })}
                      style={{
                        fontSize: 10, padding: '2px 8px', border: 'none',
                        background: m.ignored ? 'var(--bg-surface)' : 'transparent',
                        color: m.ignored ? 'var(--text-muted)' : 'var(--primary)',
                        cursor: 'pointer',
                      }}
                    >
                      {m.ignored ? 'Restore' : 'Ignore'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Actions */}
      <div className="card-actions import-confirm-bar">
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={onCancel} style={{ fontSize: 12 }}>
            Cancel
          </button>
          {review.sourceType === 'ocr' && review.mappings.some((m) => m.confidence < 0.5) && (
            <button
              type="button"
              onClick={() => {
                // Accept all high-confidence mappings (≥50%), ignore low-confidence ones
                for (const m of review.mappings) {
                  if (m.confidence < 0.5) {
                    onUpdateMapping(m.originalLabel, { ignored: true });
                  } else if (!m.userConfirmed) {
                    onUpdateMapping(m.originalLabel, { userConfirmed: true });
                  }
                }
              }}
              style={{ fontSize: 11, padding: '6px 12px', color: 'var(--amber)', border: '1px solid var(--amber)', borderRadius: 'var(--radius-sm)', background: 'transparent', cursor: 'pointer' }}
            >
              Accept high-confidence, skip low
            </button>
          )}
        </div>
        <button type="button" className="btn-primary" onClick={onConfirm} style={{ fontSize: 12 }}>
          Confirm mapping — load into tools →
        </button>
      </div>

      <Disclaimer extra="Review all mappings before confirming" />
    </div>
  );
}

// ── Import Result (shown after confirmation) ──

function ImportResult({
  dataset,
  onClear,
}: {
  dataset: NonNullable<ReturnType<typeof useImporterStore.getState>['lastDataset']>;
  onClear: () => void;
}) {
  const groupedByMetric = new Map<string, number>();
  for (const f of dataset.facts) {
    const key = f.metric === 'unknown' ? 'Unmapped' : f.metric;
    groupedByMetric.set(key, (groupedByMetric.get(key) || 0) + 1);
  }
  const periods = [...new Set(dataset.facts.map((f) => f.periodLabel))];

  return (
    <div>
      <PageHeader
        title="Import complete"
        subtitle="Your data has been cleaned and mapped. Use the tools below to analyze, or import another file."
      />

      {/* Dataset summary */}
      <Card label="Dataset summary" style={{ marginTop: '1.5rem' }}>
        <div className="card-body">
          <div className="import-detection-grid" style={{ marginBottom: 14 }}>
            <DetectItem label="Company" value={dataset.companyName || 'Not specified'} />
            <DetectItem label="Currency" value={dataset.currency} />
            <DetectItem label="Unit" value={dataset.unit} />
            <DetectItem label="Total facts" value={String(dataset.facts.length)} />
            <DetectItem label="Periods" value={periods.join(', ')} />
            <DetectItem label="Confidence" value="Review each tool for details" />
          </div>
          <DataQualityBar
            source="Import"
            periods={`${periods.length} periods`}
            metrics={groupedByMetric.size}
          />
          <div className="flex items-center gap-2 mt-2">
            <DataSourceBadge variant="imported" />
          </div>
          <div className="flex gap-2 flex-wrap mt-2">
            <TrustBadge label="Import" variant="source" />
            <TrustBadge label="Data Ready for Analysis" variant="good" />
          </div>
          {/* Global data status */}
          <div className="import-success-banner">
            <span className="import-success-banner-title">
              ✓ Import complete
            </span>
            <span className="import-success-banner-text">
              {dataset.facts.length} metrics across {periods.length} periods
            </span>
            <span className="import-success-banner-text">
              Available in all analysis tools
            </span>
          </div>
        </div>
      </Card>

      {/* Metrics detected */}
      {groupedByMetric.size > 0 && (
        <Card label="Metrics detected" style={{ marginTop: 2 }}>
          <div className="card-body">
            <div className="grid grid-cols-4 gap-2">
              {[...groupedByMetric.entries()].map(([metric, count]) => (
                <div
                  key={metric}
                  className={`import-metric-chip${metric === 'Unmapped' ? ' missing' : ''}`}
                >
                  <div className="import-metric-chip-title">
                  {metric === 'Unmapped' ? 'Needs review' : canonicalDisplayName(metric)}
                  </div>
                  <div className="import-metric-chip-count">{count} values</div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Missing fields */}
      {dataset.missingFields.length > 0 && (
        <Card label="Missing data for analysis" style={{ marginTop: 2 }}>
          <div className="card-body">
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 8 }}>
              The following metrics are not present in this file. Some tools may not produce complete results:
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {dataset.missingFields.map((field) => (
                <span
                  key={field}
                  style={{
                    fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--amber)',
                    padding: '3px 8px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                  }}
                >
                  {canonicalDisplayName(field)}
                </span>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="card-actions import-confirm-bar">
        <button type="button" onClick={onClear} style={{ fontSize: 12 }}>
          Clear imported data
        </button>
        <div className="import-action-bar">
          <Link href="/research/filing" className="btn-primary import-action-link">
            Filing comparison →
          </Link>
          <Link href="/tools/dcf" className="btn import-action-link">
            DCF valuation →
          </Link>
          <Link href="/tools/wc" className="btn import-action-link">
            Cash efficiency →
          </Link>
        </div>
      </div>

      <Disclaimer extra="From messy filings to clean insight" />
    </div>
  );
}

// ── Helper Components ──

function DetectItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="import-detection-label">
        {label}
      </div>
      <div className="import-detection-value">{value}</div>
    </div>
  );
}

function ConfidenceBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  let color = 'var(--red)';
  let label = 'low';
  if (pct >= 80) { color = 'var(--green)'; label = 'high'; }
  else if (pct >= 50) { color = 'var(--amber)'; label = 'medium'; }

  return (
    <span
      style={{
        fontSize: 10, fontFamily: 'var(--font-mono)', color, fontWeight: 500,
        padding: '1px 6px', borderRadius: 2,
        background: pct < 50 ? 'var(--red-subtle)' : 'transparent',
      }}
      title={`${label} confidence`}
    >
      {pct}%
    </span>
  );
}

const ALL_METRIC_OPTIONS = [
  'revenue', 'totalIncome', 'netProfit', 'ebit', 'ebitda', 'interestExpense',
  'cogs', 'grossProfit', 'depreciation', 'tax', 'profitBeforeTax', 'extraordinaryItems',
  'operatingCashFlow', 'investingCashFlow', 'financingCashFlow', 'capex', 'freeCashFlow',
  'currentAssets', 'currentLiabilities', 'inventory', 'receivables', 'payables',
  'totalDebt', 'cash', 'equity', 'totalAssets', 'nonCurrentLiabilities',
  'sharesOutstanding', 'eps', 'marketCap', 'workingCapital', 'fixedAssets', 'expenses',
];
