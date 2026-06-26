'use client';

import { useCallback, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader, Card, Disclaimer, DataQualityBar } from '@/components/ui';
import { useImporterStore } from '@/store/importer-store';
import { useGlobalDataStore } from '@/store/global-data-store';
import { canonicalDisplayName } from '@/lib/importer/metric-aliases';
import type { MetricMapping } from '@/lib/importer/types';

export default function ImportPage() {
  const {
    review, isImporting, error, lastDataset,
    startImport, updateMapping, confirmImport, cancelImport,
    saveMappingTemplate, clearLastDataset,
  } = useImporterStore();

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      await startImport(file);
      e.target.value = '';
    },
    [startImport]
  );

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
        title="Smart Import"
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
                  <span>Image</span>
                  <span style={{ color: 'var(--amber)', fontSize: 8 }}>BETA</span>
                </div>
                <span className="upload-label" style={{ padding: '8px 18px', fontSize: 12 }}>
                  Upload file
                  <input type="file" accept=".csv,.tsv,.txt,.xlsx,.xls,.pdf,.png,.jpg,.jpeg,.gif,.webp" style={{ display: 'none' }} onChange={handleFileUpload} />
                </span>
              </label>
            </div>
          </Card>

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

      {/* Loading state */}
      {isImporting && (
        <Card>
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              Parsing file...
            </div>
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
}: {
  review: NonNullable<ReturnType<typeof useImporterStore.getState>['review']>;
  onUpdateMapping: (label: string, updates: Partial<MetricMapping>) => void;
  onConfirm: () => void;
  onCancel: () => void;
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
          <div style={{ marginTop: 8, display: 'flex', gap: 16, fontSize: 11, fontFamily: 'var(--font-mono)' }}>
            <span style={{ color: 'var(--green)' }}>{factsCount} values found</span>
            <span style={{ color: 'var(--primary)' }}>{mappedCount} metrics mapped ({pctMapped}%)</span>
            {unknownCount > 0 && <span style={{ color: 'var(--amber)' }}>{unknownCount} unmapped</span>}
            {ignoredCount > 0 && <span style={{ color: 'var(--text-muted)' }}>{ignoredCount} ignored</span>}
          </div>
        </div>
      </Card>

      {/* Warnings */}
      {review.warnings.length > 0 && (
        <Card label="Warnings" style={{ marginTop: 2 }}>
          <div className="card-body">
            {review.warnings.map((w, i) => (
              <div key={i} style={{ fontSize: 11, color: 'var(--amber)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
                ⚠ {w}
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
      <div className="card-actions" style={{ justifyContent: 'space-between', marginTop: 2, border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '12px 20px' }}>
        <button type="button" onClick={onCancel} style={{ fontSize: 12 }}>
          Cancel
        </button>
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
  const globalDatasets = useGlobalDataStore((s) => s.datasets);
  const globalCount = globalDatasets.length;

  return (
    <div>
      <PageHeader
        title="Import complete"
        subtitle="Your data has been cleaned and mapped. Use the tools below to analyze, or import another file."
      />

      {/* Dataset summary */}
      <Card label="Dataset summary" style={{ marginTop: '1.5rem' }}>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
            <DetectItem label="Company" value={dataset.companyName || 'Not specified'} />
            <DetectItem label="Currency" value={dataset.currency} />
            <DetectItem label="Unit" value={dataset.unit} />
            <DetectItem label="Total facts" value={String(dataset.facts.length)} />
            <DetectItem label="Periods" value={periods.join(', ')} />
            <DetectItem label="Confidence" value="Review each tool for details" />
          </div>
          <DataQualityBar
            source="Smart Import"
            periods={`${periods.length} periods`}
            metrics={groupedByMetric.size}
          />
          {/* Global data status */}
          <div style={{
            marginTop: 12, padding: '10px 14px',
            background: 'var(--green-subtle)', border: '1px solid rgba(46,204,113,0.15)',
            borderRadius: 'var(--radius-md)',
            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>
              ✓ Data loaded globally
            </span>
            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
              {dataset.facts.length} metrics across {periods.length} periods
            </span>
            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
              {globalCount > 1 ? `${globalCount} datasets in memory` : 'Available in all tools'}
            </span>
          </div>
        </div>
      </Card>

      {/* Metrics detected */}
      {groupedByMetric.size > 0 && (
        <Card label="Metrics detected" style={{ marginTop: 2 }}>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {[...groupedByMetric.entries()].map(([metric, count]) => (
                <div
                  key={metric}
                  style={{
                    fontSize: 11, fontFamily: 'var(--font-mono)',
                    color: metric === 'Unmapped' ? 'var(--amber)' : 'var(--text-secondary)',
                    padding: '6px 10px', background: 'var(--bg-field)',
                    borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ fontWeight: 600, color: metric === 'Unmapped' ? 'var(--amber)' : 'var(--text)' }}>
                    {metric === 'Unmapped' ? 'Unmapped' : canonicalDisplayName(metric)}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>{count} values</div>
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
      <div className="card-actions" style={{ justifyContent: 'space-between', marginTop: '1rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '12px 20px' }}>
        <button type="button" onClick={onClear} style={{ fontSize: 12 }}>
          Clear imported data
        </button>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/research/filing" className="btn-primary" style={{ fontSize: 12, padding: '7px 16px', textDecoration: 'none' }}>
            Filing comparison →
          </Link>
          <Link href="/tools/dcf" className="btn" style={{ fontSize: 12, padding: '7px 16px', textDecoration: 'none' }}>
            DCF valuation →
          </Link>
          <Link href="/tools/wc" className="btn" style={{ fontSize: 12, padding: '7px 16px', textDecoration: 'none' }}>
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
      <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{value}</div>
    </div>
  );
}

function ConfidenceBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  let color = 'var(--red)';
  if (pct >= 80) color = 'var(--green)';
  else if (pct >= 50) color = 'var(--amber)';

  return (
    <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color, fontWeight: 500 }}>
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
