/** Quote every cell and trigger a browser download of `rows` as a CSV file. */
export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows.map((r) => r.map((x) => `"${String(x ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
}

export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv' }));
  Object.assign(document.createElement('a'), { href: url, download: filename }).click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
