import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportPdf(
  data: Record<string, any>[],
  columns: { key: string; header: string }[],
  filename: string,
  title?: string
) {
  const doc = new jsPDF();

  if (title) {
    doc.setFontSize(16);
    doc.text(title, 14, 15);
  }

  const headers = columns.map((c) => c.header);
  const rows = data.map((item) =>
    columns.map((c) => {
      const val = item[c.key];
      if (val == null) return '';
      return String(val);
    })
  );

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: title ? 25 : 15,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 130, 246] },
  });

  doc.save(`${filename}.pdf`);
}
