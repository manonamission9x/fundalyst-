1|'use client';
2|
3|import { useState, useEffect, useRef } from 'react';
4|import { parseLines, computeDiff, generateRiskFlags, fmtINR } from '@/lib/calculations';
5|import { readFile, downloadCSV } from '@/lib/helpers';
6|import { useFilingStore, useAnalysisStore } from '@/store';
7|import { useToast } from '@/components/shared/ToastProvider';
8|import {
9|  PageHeader, Card, UploadBar, Toolbar, NextLinks, Disclaimer,
10|  EmptyState, InsightCard, WarningCard, SectionTitle, ResultPanel,
11|  DataQualityBar, CalcTimestamp,
12|} from '@/components/ui';
13|import { useGlobalImportFill, getDataSourceLabel, extractFilingInputs } from '@/lib/importer/import-hooks';
14|
15|export default function FilingPage() {
16|  const showToast = useToast();
17|  const {
18|    labelA, labelB, periodA, periodB, diffs, flags, showResults, errMsg,
19|    setLabelA, setLabelB, setPeriodA, setPeriodB,
20|    setDiffs, setFlags, setShowResults, setErrMsg, clear,
21|  } = useFilingStore();
22|  const { setFiling } = useAnalysisStore();
23|  const [loading, setLoading] = useState(false);
24|
25|  // Pre-fill from imported data
26|  const dataInfo = useGlobalImportFill(
27|    (vals) => {
28|      setLabelA(vals.labelA);
29|      setLabelB(vals.labelB);
30|      setPeriodA(vals.periodA);
31|      setPeriodB(vals.periodB);
32|    },
33|    extractFilingInputs
34|  );
35|
36|  // Auto-demo: run comparison on first visit with sample data
37|  const autoDemoRef = useRef(false);
38|  useEffect(() => {
39|    if (autoDemoRef.current) return;
40|    autoDemoRef.current = true;
41|    if (!showResults && periodA && periodB) {
42|      const timer = setTimeout(() => handleCompare(), 500);
43|      return () => clearTimeout(timer);
44|    }
45|  }, []);
46|
47|  async function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
48|    const file = e.target.files?.[0];
49|    if (!file) return;
50|    try {
51|      const text = await readFile(file);
52|      const rows = text.split('\n').filter(Boolean);
53|      if (rows.length < 3) { showToast('Need at least 2 data rows'); return; }
54|      const headers = rows[0].split(',').map((s) => s.trim());
55|      const labels: string[] = [];
56|      const valsA: string[] = [];
57|      const valsB: string[] = [];
58|      for (let i = 1; i < rows.length; i++) {
59|        const cols = rows[i].split(',').map((s) => s.trim());
60|        if (cols.length >= 3) { labels.push(cols[0]); valsA.push(cols[1]); valsB.push(cols[2]); }
61|      }
62|      setLabelA(headers[1] || 'Earlier');
63|      setLabelB(headers[2] || 'Latest');
64|      setPeriodA(labels.map((l, i) => l + ': ' + valsA[i]).join('\n'));
65|      setPeriodB(labels.map((l, i) => l + ': ' + valsB[i]).join('\n'));
66|      showToast('Loaded ' + labels.length + ' line items');
67|    } catch (err: unknown) {
68|      showToast('Error reading file: ' + (err instanceof Error ? err.message : 'unknown'));
69|    }
70|    e.target.value = '';
71|  }
72|
73|  function handleCompare() {
74|    setLoading(true);
75|    setErrMsg('');
76|    const pA = parseLines(periodA);
77|    const pB = parseLines(periodB);
78|    if (pA.length === 0 || pB.length === 0) {
79|      setErrMsg('Add at least one line item to each period.');
80|      setLoading(false);
81|      return;
82|    }
83|    const result = computeDiff(pA, pB);
84|    setDiffs(result);
85|    setShowResults(true);
86|
87|    const flagList = generateRiskFlags(result);
88|    setFlags(flagList);
89|    setFiling({
90|      labels: periodA.split('\n').filter(Boolean).length.toString() + ' items',
91|      diffs: result,
92|      flags: flagList,
93|    });
94|    setTimeout(() => {
95|      setLoading(false);
96|      // Scroll to results
97|      document.getElementById('filing-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
98|    }, 300);
99|    showToast('Comparison complete');
100|  }
101|
102|  function handleClear() {
103|    clear();
104|  }
105|
106|  function handleExportCSV() {
107|    downloadCSV('filing-comparison.csv', [
108|      ['Line item', labelA || 'Earlier', labelB || 'Latest', 'Change %'],
109|      ...diffs.map((d) => [d.label, d.a ?? '', d.b ?? '', d.pct !== null ? d.pct.toFixed(1) + '%' : '']),
110|    ]);
111|    showToast('CSV downloaded');
112|  }
113|
114|  // Derive insight cards from diffs — show top 3 most significant changes
115|  const topChanges = diffs
116|    .filter((d) => d.dir !== 'flat' && d.pct !== null)
117|    .slice(0, 3)
118|    .map((d) => ({
119|      type: d.dir === 'up' ? 'positive' as const : 'warning' as const,
120|      title: d.label + ' ' + (d.dir === 'up' ? 'increased' : 'decreased'),
121|      text: `Changed by ${Math.abs(d.pct!).toFixed(1)}% (${fmtINR(d.abs ?? 0)})`,
122|      formula: d.isPct ? 'Percentage-point metric' : undefined,
123|    }));
124|
125|  // Map store flags (danger|warn) to WarningCard (danger|caution)
126|  const riskFlags = flags.map((f) => ({
127|    level: (f.level === 'danger' ? 'danger' : 'caution') as 'danger' | 'caution',
128|    label: f.label,
129|    text: f.text,
130|  }));
131|
132|  return (
133|    <div>
134|      <PageHeader
135|        title="Filing Comparison"
136|        subtitle="Compare two reporting periods line by line and spot what changed."
137|        answer="What this helps you answer: Is revenue growing? Are margins compressing? Is debt rising?"
138|      />
139|
140|      <DataQualityBar source={getDataSourceLabel(dataInfo.dataSource, dataInfo.companyName)} />
141|
142|      <UploadBar onUpload={handleCsvFile} hint="CSV: Label, Period1, Period2 or paste Label: value below" />
143|
144|      <Card label="Input periods">
145|        <div className="inputs-row">
146|          {[
147|            { heading: 'Earlier period', label: labelA, setLabel: setLabelA, period: periodA, setPeriod: setPeriodA, phLabel: 'e.g. Q4 FY25', phPeriod: 'Revenue: 1240' },
148|            { heading: 'Latest period', label: labelB, setLabel: setLabelB, period: periodB, setPeriod: setPeriodB, phLabel: 'e.g. Q4 FY26', phPeriod: 'Revenue: 1530' },
149|          ].map((col, ci) => (
150|            <div className="input-col" key={ci}>
151|              <div className="input-col-label">{col.heading}</div>
152|              <div className="field-hint filing-hint">Label: value per line</div>
153|              <input
154|                id={`period-${ci}`}
155|                type="text"
156|                className="period-label-input"
157|                placeholder={col.phLabel}
158|                value={col.label}
159|                onChange={(e) => col.setLabel(e.target.value)}
160|              />
161|              <textarea
162|                id={`period-text-${ci}`}
163|                rows={8}
164|                className="filing-textarea num-input"
165|                placeholder={col.phPeriod}
166|                value={col.period}
167|                onChange={(e) => col.setPeriod(e.target.value)}
168|                aria-label={`${col.heading} data`}
169|              />
170|              <div className="label-examples">
171|                <span className="label-examples-title">Valid labels:</span>
172|                <span className="label-examples-item">Revenue</span>
173|                <span className="label-examples-item">Net Profit</span>
174|                <span className="label-examples-item">EBITDA Margin</span>
175|                <span className="label-examples-item">Total Debt</span>
176|                <span className="label-examples-item">Promoter Holding</span>
177|                <span className="label-examples-more">+ many more</span>
178|              </div>
179|            </div>
180|          ))}
181|        </div>
182|        {errMsg && <div className="px-5 py-3"><span className="err-msg">{errMsg}</span></div>}
183|        <Toolbar onClear={handleClear} onAction={handleCompare} actionLabel={loading ? 'Comparing...' : 'Compare'} isLoading={loading} />
184|      </Card>
185|
186|      {showResults && diffs.length > 0 && (
187|        <ResultPanel label="Results — what changed" id="filing-results">
188|          {/* Insight cards for top changes */}
189|          {topChanges.length > 0 && (
190|            <div className="flex flex-col gap-3 mb-4">
191|              {topChanges.map((ic, i) => (
192|                <InsightCard key={i} type={ic.type} title={ic.title} text={ic.text} formula={ic.formula} />
193|              ))}
194|            </div>
195|          )}
196|
197|          {/* Diff table */}
198|          <Card label="Line item comparison">
199|            <table className="diff-table">
200|              <thead>
201|                <tr>
202|                  <th>Line item</th>
203|                  <th>{labelA || 'Earlier'}</th>
204|                  <th>{labelB || 'Latest'}</th>
205|                  <th>Change</th>
206|                  <th>Magnitude</th>
207|                </tr>
208|              </thead>
209|              <tbody>
210|                {(() => {
211|                  // Calculate max absolute change for bar scaling
212|                  const maxAbs = Math.max(0.01, ...diffs.map(d => Math.abs(d.pct ?? 0)));
213|                  return diffs.map((d, i) => {
214|                    const absPct = Math.abs(d.pct ?? 0);
215|                    const barW = (absPct / maxAbs) * 100;
216|                    return (
217|                      <tr key={i}>
218|                        <td>{d.label}</td>
219|                        <td>{d.a !== null ? (d.isPct ? d.a + '%' : fmtINR(d.a)) : '—'}</td>
220|                        <td>{d.b !== null ? (d.isPct ? d.b + '%' : fmtINR(d.b)) : '—'}</td>
221|                        <td className={d.dir === 'up' ? 'change-up' : d.dir === 'down' ? 'change-down' : 'change-flat'}>
222|                          {d.dir === 'up' ? '↑' : d.dir === 'down' ? '↓' : '→'} {d.pct !== null ? Math.abs(d.pct).toFixed(1) + '%' : '—'}
223|                        </td>
224|                        <td className="change-mag-cell">
225|                          {d.pct !== null && (
226|                            <div className="change-bar-wrap">
227|                              <div
228|                                className={`change-bar ${d.dir === 'up' ? 'change-bar-up' : 'change-bar-down'}`}
229|                                style={{ width: `${Math.max(4, barW)}%` }}
230|                              />
231|                            </div>
232|                          )}
233|                        </td>
234|                      </tr>
235|                    );
236|                  });
237|                })()}
238|              </tbody>
239|            </table>
240|          </Card>
241|
242|          {/* Risk flags */}
243|          {riskFlags.length > 0 && (
244|            <Card label="Risk flags" style={{ marginTop: 16 }}>
245|              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
246|                {riskFlags.map((f, i) => (
247|                  <WarningCard key={i} level={f.level} label={f.label} text={f.text} />
248|                ))}
249|              </div>
250|            </Card>
251|          )}
252|
253|          {/* Export and next steps */}
254|          <div className="flex gap-3 mt-4">
255|            <button type="button" className="btn-primary btn-sm" onClick={handleExportCSV}>
256|              Download CSV
257|            </button>
258|          </div>
259|
260|          <NextLinks links={[{ label: 'Plot trends', href: '/research/trends' }, { label: 'Estimate value', href: '/tools/dcf' }]} />
261|          <CalcTimestamp />
262|          <Disclaimer extra="Pct change = ((B−A)/|A|)×100" />
263|        </ResultPanel>
264|      )}
265|
266|      {!showResults && (
267|        <EmptyState
268|          title="See what changed between two reporting periods."
269|          desc="Paste line items as Label: value in both columns above, then click Compare. Sample data is pre-loaded — click Clear to start fresh."
270|        />
271|      )}
272|    </div>
273|  );
274|}
275|