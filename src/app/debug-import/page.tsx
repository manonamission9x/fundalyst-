'use client';

import { useState } from 'react';
import { importPdf, type PdfImportProgress } from '@/lib/importer/pdf-importer';

export default function DebugImportPage() {
  const [output, setOutput] = useState<string>('ready');

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const log: unknown[] = [];
    const push = (entry: unknown) => {
      log.push(entry);
      setOutput(JSON.stringify(log, null, 2));
    };

    try {
      push({ event: 'start', name: file.name, size: file.size, type: file.type });
      const result = await importPdf(file, (p: PdfImportProgress) => push({ progress: p }));
      push({
        event: 'result',
        success: result.success,
        method: result.method,
        sourceType: result.sourceType,
        warningCount: result.warnings.length,
        warnings: result.warnings,
        tableCount: result.tables.length,
        firstRows: result.tables.slice(0, 3).map((t) => ({
          id: t.id,
          rows: t.rows.slice(0, 5),
          cleanedRows: t.cleanedRows.slice(0, 5),
        })),
        rawTextLength: result.rawText.length,
        rawTextPreview: result.rawText.slice(0, 2000),
        factCount: result.dataset?.facts.length ?? 0,
      });
    } catch (err) {
      push({
        event: 'error',
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <input type="file" accept=".pdf" onChange={handleFile} />
      <pre data-testid="debug-output" style={{ whiteSpace: 'pre-wrap', marginTop: 16 }}>
        {output}
      </pre>
    </main>
  );
}
