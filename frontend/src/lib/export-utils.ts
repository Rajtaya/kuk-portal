// Export helpers (CSV + Excel via `exceljs`,
// PDF via the browser's print-to-PDF — no jsPDF/html2canvas needed).

export interface ExportColumn {
  key: string;
  label: string;
  /** Optional accessor for nested/derived values; defaults to row[key]. */
  value?: (row: any) => string | number;
}

function cellValue(col: ExportColumn, row: any): string {
  const raw = col.value ? col.value(row) : row[col.key];
  return raw === null || raw === undefined ? '' : String(raw);
}

export function exportToCSV(filename: string, columns: ExportColumn[], data: any[]) {
  const headers = columns.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(',');
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const v = cellValue(col, row).replace(/"/g, '""');
        return `"${v}"`;
      })
      .join(',')
  );
  const csv = [headers, ...rows].join('\r\n');
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${filename}.csv`);
}

export async function exportToExcel(filename: string, columns: ExportColumn[], data: any[]) {
  const { Workbook } = await import('exceljs');
  const wb = new Workbook();
  const ws = wb.addWorksheet('Data');
  ws.columns = columns.map((c) => ({ header: c.label, key: c.label, width: Math.max(c.label.length + 2, 14) }));
  data.forEach((row) => {
    const r: Record<string, string> = {};
    columns.forEach((col) => { r[col.label] = cellValue(col, row); });
    ws.addRow(r);
  });
  const buf = await wb.xlsx.writeBuffer();
  downloadBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${filename}.xlsx`);
}

/** Opens a print window with a styled table; the user picks "Save as PDF". */
export function exportToPDF(title: string, columns: ExportColumn[], data: any[]) {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const head = columns.map((c) => `<th>${esc(c.label)}</th>`).join('');
  const body = data
    .map(
      (row) =>
        `<tr>${columns.map((col) => `<td>${esc(cellValue(col, row))}</td>`).join('')}</tr>`
    )
    .join('');

  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) {
    alert('Please allow pop-ups to export PDF.');
    return;
  }
  win.document.write(`<!DOCTYPE html><html><head><title>${esc(title)}</title>
<style>
  * { font-family: -apple-system, Segoe UI, Roboto, sans-serif; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .meta { color: #666; font-size: 12px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: left; }
  th { background: #f3f4f6; font-weight: 600; }
  tr:nth-child(even) td { background: #fafafa; }
  @media print { @page { margin: 14mm; } }
</style></head><body>
  <h1>${esc(title)}</h1>
  <div class="meta">${data.length} records &middot; Generated ${new Date().toLocaleString()}</div>
  <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 250); };</script>
</body></html>`);
  win.document.close();
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
