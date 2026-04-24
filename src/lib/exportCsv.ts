export function exportCsv(
  data: Record<string, any>[],
  columns: { key: string; header: string }[],
  filename: string
) {
  const headers = columns.map((c) => c.header);
  const rows = data.map((item) =>
    columns.map((c) => {
      const val = item[c.key];
      if (val == null) return '';
      const str = String(val);
      // Escape commas and quotes
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    })
  );

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
