import * as XLSX from 'xlsx';

// ── CSV / Excel Download ──

/** Properly quote a CSV cell value — wraps in quotes if it contains commas, quotes, or newlines */
function csvCell(v: string | number): string {
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function downloadCSV(filename: string, rows: (string | number)[][]): void {
  const csv = rows.map((r) => r.map(csvCell).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── File Reading (CSV + Excel) ──

function parseExcel(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as (string | number)[][];
        const csv = json.filter((r) => r.length > 0).map((r) => r.join(',')).join('\n');
        resolve(csv);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

export function readFile(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'xlsx' || ext === 'xls') {
    return parseExcel(file);
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target!.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

// ── Financial Terms Dictionary (currently unused — kept for reference) ──


export const TERMS: Record<string, { label: string; desc: string }> = {
  dso: { label: 'DSO', desc: 'Days Sales Outstanding — average days to collect payment from customers. Lower is better.' },
  dio: { label: 'DIO', desc: 'Days Inventory Outstanding — average days inventory sits before being sold.' },
  dpo: { label: 'DPO', desc: 'Days Payable Outstanding — average days to pay suppliers. Higher can preserve cash.' },
  ccc: { label: 'CCC', desc: 'Cash Conversion Cycle — DSO + DIO − DPO. Days from paying suppliers to collecting from customers.' },
  wacc: { label: 'WACC', desc: 'Weighted Average Cost of Capital — the blended return expected by all capital providers.' },
  ggm: { label: 'GGM', desc: 'Gordon Growth Model — calculates terminal value as FCF × (1+g) / (WACC − g). Assumes perpetual stable growth.' },
  iv: { label: 'Intrinsic Value', desc: 'Estimated fair value per share based on discounted future cash flows. Not a guarantee of market price.' },
  mos: { label: 'Margin of Safety', desc: 'Percentage discount from intrinsic value to current price. Larger margins reduce downside risk.' },
};
