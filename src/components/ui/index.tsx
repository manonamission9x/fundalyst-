1|'use client';
2|
3|import Link from 'next/link';
4|import { useRef } from 'react';
5|
6|// ── PageHeader ──
7|interface PageHeaderProps {
8|  title: string;
9|  subtitle: string;
10|  answer?: string;
11|}
12|export function PageHeader({ title, subtitle, answer }: PageHeaderProps) {
13|  return (
14|    <div className="page-hero">
15|      <h1>{title}</h1>
16|      <p className="page-hero-sub">{subtitle}</p>
17|      {answer && <p className="page-hero-answer">{answer}</p>}
18|    </div>
19|  );
20|}
21|
22|// ── Card (generic container) ──
23|interface CardProps {
24|  label?: string;
25|  children: React.ReactNode;
26|  style?: React.CSSProperties;
27|  className?: string;
28|  accent?: boolean;
29|}
30|export function Card({ label, children, style, className, accent }: CardProps) {
31|  return (
32|    <div className={`card${className ? ' ' + className : ''}`} style={style}>
33|      {accent && <div style={{ height: 3, backgroundColor: 'var(--primary)', borderTopLeftRadius: 8, borderTopRightRadius: 8 }} />}
34|      {label && (
35|        <div className="card-header">
36|          <span className="card-label">{label}</span>
37|        </div>
38|      )}
39|      {children}
40|    </div>
41|  );
42|}
43|
44|// ── UploadBar ──
45|interface UploadBarProps {
46|  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
47|  hint?: string;
48|}
49|export function UploadBar({ onUpload, hint }: UploadBarProps) {
50|  return (
51|    <div className="upload-zone">
52|      <label className="upload-label">
53|        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3">
54|          <path d="M7 2v10M2 7h10" />
55|        </svg>
56|        Upload file
57|        <input type="file" accept=".csv,.tsv,.txt,.xlsx,.xls,.pdf,.png,.jpg,.jpeg,.gif,.webp" style={{ display: 'none' }} onChange={onUpload} />
58|      </label>
59|      <span className="upload-sep">·</span>
60|      <span className="upload-hint">{hint || 'Select a CSV or Excel file'}</span>
61|    </div>
62|  );
63|}
64|
65|// ── Field ──
66|let _fieldId = 0;
67|interface FieldProps {
68|  label: string;
69|  value: number | '' | null;
70|  onChange: (v: number | '') => void;
71|  hint?: string;
72|}
73|export function Field({ label, value, onChange, hint }: FieldProps) {
74|  const id = `field-${++_fieldId}`;
75|  return (
76|    <div className="field-group">
77|      <label className="field-label" htmlFor={id}>{label}</label>
78|      <input
79|        id={id}
80|        type="number"
81|        className="num-input"
82|        value={value !== null && value !== '' ? value : ''}
83|        onChange={(e) => onChange(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
84|        aria-describedby={hint ? `${id}-hint` : undefined}
85|      />
86|      {hint && <div className="field-hint" id={`${id}-hint`}>{hint}</div>}
87|    </div>
88|  );
89|}
90|
91|// ── FieldGrid ──
92|export function FieldGrid({ children }: { children: React.ReactNode }) {
93|  return <div className="field-grid">{children}</div>;
94|}
95|
96|// ── Toolbar ──
97|interface ToolbarProps {
98|  onClear?: () => void;
99|  onAction?: () => void;
100|  actionLabel?: string;
101|  hint?: string;
102|  isLoading?: boolean;
103|}
104|export function Toolbar({ onClear, onAction, actionLabel, hint, isLoading }: ToolbarProps) {
105|  return (
106|    <div className="card-actions">
107|      {onClear && (
108|        <button type="button" onClick={onClear} className="btn-ghost">
109|          Clear
110|        </button>
111|      )}
112|      {hint && <span className="upload-hint">{hint}</span>}
113|      {onAction && (
114|        <button
115|          type="button"
116|          className="btn-primary"
117|          disabled={isLoading}
118|          style={{ marginLeft: 'auto', opacity: isLoading ? 0.6 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }}
119|          onClick={onAction}
120|        >
121|          {isLoading ? (
122|            <>
123|              <span className="spinner" style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', marginRight: 6, verticalAlign: 'middle', animation: 'spin 0.6s linear infinite' }} />
124|              Calculating…
125|            </>
126|          ) : (
127|            actionLabel
128|          )}
129|        </button>
130|      )}
131|    </div>
132|  );
133|}
134|
135|// ── NextLinks ──
136|interface NextLink {
137|  label: string;
138|  href: string;
139|}
140|export function NextLinks({ links }: { links: NextLink[] }) {
141|  return (
142|    <div className="next-links">
143|      <span className="next-label">Next:</span>
144|      {links.map((l, i) => (
145|        <span key={i}>
146|          <Link href={l.href}>{l.label} →</Link>
147|        </span>
148|      ))}
149|    </div>
150|  );
151|}
152|
153|// ── Disclaimer ──
154|export function Disclaimer({ extra }: { extra?: string }) {
155|  return (
156|    <div className="disclaimer">
157|      <span>All calculations performed client-side</span>
158|      <span>For research purposes only · Not financial advice</span>
159|      {extra && <span>{extra}</span>}
160|    </div>
161|  );
162|}
163|
164|// ── EmptyState ──
165|interface EmptyStateProps {
166|  title: string;
167|  desc: string;
168|  icon?: string;
169|}
170|export function EmptyState({ title, desc, icon }: EmptyStateProps) {
171|  return (
172|    <Card style={{ marginTop: '1.5rem' }}>
173|      <div style={{ height: 3, backgroundColor: 'var(--primary)', borderTopLeftRadius: 8, borderTopRightRadius: 8 }} />
174|      <div className="empty-state">
175|        {icon && <div className="empty-state-icon">{icon}</div>}
176|        <div className="empty-state-title">{title}</div>
177|        <div className="empty-state-desc">{desc}</div>
178|      </div>
179|    </Card>
180|  );
181|}
182|
183|// ── MetricGrid ──
184|interface Metric {
185|  label: string;
186|  value: string;
187|  sub?: string;
188|  cls?: 'good' | 'warn' | 'neutral' | '';
189|  /** Trend direction: up, down, or flat */
190|  trend?: 'up' | 'down' | 'flat';
191|  /** Optional inline bar value (0-1) for comparison visuals */
192|  bar?: number;
193|}
194|export function MetricGrid({ metrics }: { metrics: Metric[] }) {
195|  return (
196|    <div className="metric-grid">
197|      {metrics.map((m, i) => (
198|        <div className={'metric-cell' + (m.cls ? ' ' + m.cls : '')} key={i}>
199|          <div className="metric-label">
200|            {m.trend && (
201|              <span className={`trend-arrow trend-${m.trend}`}>
202|                {m.trend === 'up' ? '↑' : m.trend === 'down' ? '↓' : '→'}
203|              </span>
204|            )}
205|            {m.label}
206|          </div>
207|          <div className={'metric-value' + (m.cls ? ' ' + m.cls : '')}>
208|            {m.value}
209|          </div>
210|          {m.sub && <div className="metric-sub">{m.sub}</div>}
211|          {m.bar !== undefined && (
212|            <div className="metric-bar">
213|              <div className="metric-bar-fill" style={{ width: `${Math.max(2, m.bar * 100)}%` }} />
214|            </div>
215|          )}
216|        </div>
217|      ))}
218|    </div>
219|  );
220|}
221|
222|// ── InsightCard ──
223|interface InsightCardProps {
224|  type: 'positive' | 'risk' | 'warning' | 'info';
225|  title: string;
226|  text: string;
227|  formula?: string;
228|}
229|export function InsightCard({ type, title, text, formula }: InsightCardProps) {
230|  const icons: Record<string, React.ReactNode> = {
231|    positive: (
232|      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
233|        <path d="M2 16l5-5 3 3 6-6" />
234|        <path d="M12 8h4v4" />
235|      </svg>
236|    ),
237|    risk: (
238|      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
239|        <path d="M9 1L1 17h16L9 1z" />
240|        <path d="M9 7v4" />
241|        <circle cx="9" cy="13.5" r="1" fill="currentColor" stroke="none" />
242|      </svg>
243|    ),
244|    warning: (
245|      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
246|        <circle cx="9" cy="9" r="8" />
247|        <path d="M9 5v5" />
248|        <circle cx="9" cy="13" r="0.8" fill="currentColor" stroke="none" />
249|      </svg>
250|    ),
251|    info: (
252|      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
253|        <circle cx="9" cy="9" r="8" />
254|        <path d="M9 8v5" />
255|        <circle cx="9" cy="5.5" r="0.8" fill="currentColor" stroke="none" />
256|      </svg>
257|    ),
258|  };
259|  return (
260|    <div className={`insight-card ${type}`}>
261|      <div className="insight-icon">{icons[type]}</div>
262|      <div className="insight-content">
263|        <div className="insight-title">{title}</div>
264|        <div className="insight-text">{text}</div>
265|        {formula && <div className="insight-formula">{formula}</div>}
266|      </div>
267|    </div>
268|  );
269|}
270|
271|// ── WarningCard ──
272|interface WarningCardProps {
273|  level: 'danger' | 'caution';
274|  label: string;
275|  text: string;
276|}
277|export function WarningCard({ level, label, text }: WarningCardProps) {
278|  return (
279|    <div className={`warning-card ${level}`}>
280|      <span className="warning-badge">{level === 'danger' ? 'High' : 'Note'}</span>
281|      <div>
282|        <div className="warning-label">{label}</div>
283|        <div className="warning-text">{text}</div>
284|      </div>
285|    </div>
286|  );
287|}
288|
289|// ── DataQualityBar ──
290|interface DataQualityBarProps {
291|  source: string;
292|  periods?: string;
293|  metrics?: number;
294|  missing?: number;
295|}
296|export function DataQualityBar({ source, periods, metrics, missing }: DataQualityBarProps) {
297|  const dotClass = source === 'Manual mode' ? 'muted' : source.includes('sample') ? 'warn' : 'good';
298|  return (
299|    <div className="data-quality" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem 1.5rem', alignItems: 'center', padding: '0.5rem 0' }}>
300|      <span className="data-quality-item" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
301|        <span className={`data-quality-dot ${dotClass}`} style={{ width: 10, height: 10, borderRadius: '50%', display: 'inline-block' }} />
302|        Source: {source}
303|      </span>
304|      {periods && (
305|        <span className="data-quality-item" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
306|          <span className={`data-quality-dot ${dotClass}`} style={{ width: 10, height: 10, borderRadius: '50%', display: 'inline-block' }} />
307|          {periods}
308|        </span>
309|      )}
310|      {metrics !== undefined && (
311|        <span className="data-quality-item" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
312|          <span className="data-quality-dot good" style={{ width: 10, height: 10, borderRadius: '50%', display: 'inline-block' }} />
313|          {metrics} metrics
314|        </span>
315|      )}
316|      {missing !== undefined && missing > 0 && (
317|        <span className="data-quality-item" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
318|          <span className="data-quality-dot warn" style={{ width: 10, height: 10, borderRadius: '50%', display: 'inline-block' }} />
319|          {missing} missing
320|        </span>
321|      )}
322|    </div>
323|  );
324|}
325|
326|// ── FormulaDisclosure ──
327|interface FormulaDisclosureProps {
328|  formula: string;
329|  label?: string;
330|}
331|export function FormulaDisclosure({ formula, label }: FormulaDisclosureProps) {
332|  return (
333|    <div className="insight-formula" style={{ padding: '8px 0' }}>
334|      {label && <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{label}: </span>}
335|      <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>{formula}</code>
336|    </div>
337|  );
338|}
339|
340|// ── SectionTitle ──
341|export function SectionTitle({ children }: { children: React.ReactNode }) {
342|  return <div className="section-title">{children}</div>;
343|}
344|
345|// ── Calculated timestamp ──
346|export function CalcTimestamp() {
347|  const timeRef = useRef(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
348|  return (
349|    <div className="calc-timestamp">
350|      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
351|        <circle cx="6" cy="6" r="5" />
352|        <path d="M6 3v3l2 2" />
353|      </svg>
354|      Calculated {timeRef.current}
355|    </div>
356|  );
357|}
358|interface ResultPanelProps {
359|  children: React.ReactNode;
360|  label?: string;
361|  id?: string;
362|}
363|export function ResultPanel({ children, label, id }: ResultPanelProps) {
364|  return (
365|    <div id={id} style={{ marginTop: '1.5rem' }}>
366|      {label && <SectionTitle>{label}</SectionTitle>}
367|      {children}
368|    </div>
369|  );
370|}
371|