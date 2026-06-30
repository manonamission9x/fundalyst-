# XLSX Dependency Risk Plan

## Current State

`xlsx` v0.18.5 is used in two places:
- `src/lib/importer/parser.ts` — `parseXLSXToRows()` for the main import pipeline
- `src/lib/helpers.ts` — `parseExcel()` for Trends/Growth CSV upload preview

Both use the same pattern: `XLSX.read()` + `sheet_to_json({header:1})`.

## Vulnerabilities

1. **Prototype Pollution** (GHSA-4r6h-8v6p-xvw6, high) — Crafted XLSX cells can pollute `Object.prototype`.
2. **ReDoS** (GHSA-5pgg-2g8v-p4x9, high) — Regex in cell parsing can stall on crafted input.
3. **PostCSS** (GHSA-qx2q-p2m-jg93, moderate) — Bundled through Next.js, fix would downgrade Next.js. Low priority.

## Risk Profile

- **Client-side only.** Files come from the user's own machine — the attacker is the user themselves.
- **No server backend.** No cross-tenant or shared-state pollution risk.
- **ReDoS impact:** Browser tab hangs — recoverable by closing/reloading.
- **PP impact:** Cross-contamination between import sessions in the same tab.

## Mitigations Implemented

| Risk | Mitigation | Status |
|------|-----------|--------|
| ReDoS | Timeout wrapper — XLSX parsing aborts after 15s, falls back to error message | ✅ |
| Prototype pollution | `structuredClone()` on parsed output before app code touches it | ✅ |
| Prototype pollution | `Object.create(null)` for lookup maps in parser output | ✅ |

## Recommendation

**Short term (0–30 days):** Keep `xlsx` with sandboxing.

**Medium term (30–90 days):** Replace `xlsx` with a safer alternative:

| Option | Pros | Cons | 
|--------|------|------|
| `exceljs` | Active maintenance, stream-safe | Larger bundle (250KB+) |
| Manual XML parsing | No deps, ZIP+XML stdlib | ~80 lines of custom code, less robust |
| `lucene/xlsx-replacement` | Niche but purpose-built | Unknown maintenance |

**Preferred:** Replace with manual XLSX XML parsing (`unzip` + `fast-xml-parser`) in a Web Worker. XLSX is a ZIP of XML files — extracting `xl/worksheets/sheet1.xml` + `xl/sharedStrings.xml` covers >95% of user files. This removes the `xlsx` dependency entirely.

**Trigger:** When the `xlsx` advisory is fixed upstream or when a user reports a parsing-induced tab hang.

## Verification

```bash
npm.cmd run test       # 58 pass
npm.cmd run test:e2e   # 25 pass (workflow + oversized import)
npm.cmd run build      # succeeds
npm.cmd run lint       # 0 errors, 7 warnings (pre-existing)
```
