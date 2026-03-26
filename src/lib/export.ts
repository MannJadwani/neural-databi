import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export async function exportAsPNG(element: HTMLElement, filename = 'dashboard.png'): Promise<void> {
  const canvas = await html2canvas(element, {
    backgroundColor: '#050505',
    scale: 2,
    useCORS: true,
    logging: false,
  });
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export async function exportAsPDF(element: HTMLElement, filename = 'dashboard.pdf'): Promise<void> {
  const canvas = await html2canvas(element, {
    backgroundColor: '#050505',
    scale: 2,
    useCORS: true,
    logging: false,
  });

  const imgData = canvas.toDataURL('image/png');
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  // A4 landscape
  const pdf = new jsPDF({
    orientation: imgWidth > imgHeight ? 'landscape' : 'portrait',
    unit: 'px',
    format: [imgWidth / 2, imgHeight / 2],
  });

  pdf.addImage(imgData, 'PNG', 0, 0, imgWidth / 2, imgHeight / 2);
  pdf.save(filename);
}

export function exportAsCSV(data: Record<string, unknown>[], filename = 'data.csv'): void {
  if (data.length === 0) return;

  const columns = Object.keys(data[0]);
  const header = columns.map(escapeCSV).join(',');
  const rows = data.map((row) =>
    columns.map((col) => escapeCSV(String(row[col] ?? ''))).join(',')
  );

  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
