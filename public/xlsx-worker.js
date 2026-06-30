/**
 * XLSX Parser Web Worker
 *
 * Isolates the xlsx library (which has known prototype pollution and ReDoS
 * advisories) in a separate thread. The main thread can terminate this worker
 * to enforce a real timeout.
 *
 * Messages (main -> worker): { id: number, buffer: ArrayBuffer }
 * Messages (worker -> main): { id: number, rows: string[][] | null, error: string | null }
 */

importScripts('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');

self.onmessage = function (e) {
  var id = e.data.id;
  var buffer = e.data.buffer;

  try {
    var workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
    var firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      self.postMessage({ id: id, rows: null, error: 'XLSX file contains no sheets.' });
      return;
    }

    var sheet = workbook.Sheets[firstSheetName];
    var ref = sheet['!ref'];
    if (!ref) {
      self.postMessage({ id: id, rows: null, error: 'XLSX sheet is empty.' });
      return;
    }

    var range = decodeRange(ref);
    var rows = [];

    for (var R = range.s.r; R <= range.e.r; R++) {
      var row = [];
      for (var C = range.s.c; C <= range.e.c; C++) {
        var addr = encodeCell(R, C);
        var cell = sheet[addr];
        if (cell === undefined || cell.t === 'z') {
          row.push('');
        } else if (cell.w !== undefined) {
          row.push(String(cell.w));
        } else if (cell.v !== undefined) {
          row.push(String(cell.v));
        } else {
          row.push('');
        }
      }
      if (row.some(function (c) { return c.trim() !== ''; })) {
        rows.push(row);
      }
    }

    self.postMessage({ id: id, rows: rows, error: null });
  } catch (err) {
    self.postMessage({
      id: id,
      rows: null,
      error: err instanceof Error ? err.message : 'Unknown XLSX parsing error.',
    });
  }
};

// Minimal XLSX cell address helpers
function decodeRange(ref) {
  var parts = ref.split(':');
  return { s: decodeCell(parts[0]), e: decodeCell(parts[1]) };
}

function decodeCell(addr) {
  var match = addr.match(/^([A-Z]+)(\d+)$/);
  if (!match) return { c: 0, r: 0 };
  return { c: colToNum(match[1]), r: parseInt(match[2], 10) - 1 };
}

function encodeCell(r, c) {
  return numToCol(c) + (r + 1);
}

function colToNum(col) {
  var n = 0;
  for (var i = 0; i < col.length; i++) {
    n = n * 26 + (col.charCodeAt(i) - 64);
  }
  return n - 1;
}

function numToCol(n) {
  var s = '';
  n++;
  while (n > 0) {
    var m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - m) / 26);
  }
  return s;
}
