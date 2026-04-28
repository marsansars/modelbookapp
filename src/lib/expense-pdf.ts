import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Job, Expense, Agency, ExpenseCategoryInfo, CURRENCIES, parseLocalDate, JobAttachment } from './types';
import { getAttachmentUrl } from './storage';

const GOLD: [number, number, number] = [191, 149, 63];
const INK: [number, number, number] = [28, 28, 30];
const MUTED: [number, number, number] = [120, 120, 124];

const fmtDate = (s: string) => parseLocalDate(s).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
const money = (n: number, code: string) =>
  `${CURRENCIES[code as keyof typeof CURRENCIES]?.symbol || ''}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export interface CategoryGroup {
  key: string;
  label: string;
  total: number;
  currency: string;
  items: Expense[];
}

export function groupExpensesByCategory(
  expenses: Expense[],
  cats: Record<string, ExpenseCategoryInfo>,
): CategoryGroup[] {
  const map = new Map<string, CategoryGroup>();
  for (const e of expenses) {
    const key = e.category || 'other';
    const label = cats[key]?.label || key;
    const g = map.get(key) || { key, label, total: 0, currency: e.currency, items: [] };
    g.total += e.amount || 0;
    g.items.push(e);
    map.set(key, g);
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

async function fetchAsDataUrl(url: string): Promise<{ dataUrl: string; mime: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
    return { dataUrl, mime: blob.type || 'application/octet-stream' };
  } catch {
    return null;
  }
}

function imageFormatFromMime(mime: string): 'JPEG' | 'PNG' | 'WEBP' | null {
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'JPEG';
  if (mime.includes('png')) return 'PNG';
  if (mime.includes('webp')) return 'WEBP';
  return null;
}

async function loadImageDimensions(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: 1, h: 1 });
    img.src = dataUrl;
  });
}

interface BuildOpts {
  job: Job;
  agency?: Agency;
  expenses: Expense[];
  cats: Record<string, ExpenseCategoryInfo>;
  receipts: JobAttachment[]; // attachments labeled "Receipt"
  yourName?: string;
}

export async function generateExpenseReportPdf(opts: BuildOpts): Promise<Blob> {
  const { job, agency, expenses, cats, receipts, yourName } = opts;
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 50;

  // ---------- Cover page ----------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(...INK);
  doc.text('EXPENSE REPORT', M, 70);

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1.2);
  doc.line(M, 78, M + 80, 78);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  let y = 110;
  doc.setFont('helvetica', 'bold');
  doc.text(job.client, M, y);
  doc.setFont('helvetica', 'normal');
  if (job.description) {
    y += 16;
    doc.setTextColor(...MUTED);
    doc.text(job.description, M, y);
  }
  y += 16;
  doc.setTextColor(...MUTED);
  doc.text(`Job date: ${fmtDate(job.jobDate)}`, M, y);
  if (agency) {
    y += 14;
    doc.text(`Agency: ${agency.name}`, M, y);
  }
  if (yourName) {
    y += 14;
    doc.text(`Submitted by: ${yourName}`, M, y);
  }
  y += 14;
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, M, y);

  // ---------- Totals by category ----------
  const groups = groupExpensesByCategory(expenses, cats);
  y += 30;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...INK);
  doc.text('Totals by Category', M, y);
  y += 8;

  if (groups.length === 0) {
    y += 18;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...MUTED);
    doc.text('No expenses recorded for this job.', M, y);
  } else {
    autoTable(doc, {
      startY: y + 6,
      head: [['Category', 'Items', 'Total']],
      body: groups.map((g) => [g.label, String(g.items.length), money(g.total, g.currency)]),
      theme: 'plain',
      styles: { font: 'helvetica', fontSize: 10, textColor: INK, cellPadding: 6 },
      headStyles: { fontStyle: 'bold', textColor: INK, fillColor: [245, 245, 245] },
      columnStyles: {
        0: { cellWidth: 280 },
        1: { halign: 'center', cellWidth: 80 },
        2: { halign: 'right' },
      },
      margin: { left: M, right: M },
    });

    const grandTotalByCurrency = new Map<string, number>();
    for (const g of groups) grandTotalByCurrency.set(g.currency, (grandTotalByCurrency.get(g.currency) || 0) + g.total);

    let yt = (doc as any).lastAutoTable.finalY + 14;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    for (const [cur, tot] of grandTotalByCurrency.entries()) {
      doc.text(`Grand total: ${money(tot, cur)}`, W - M, yt, { align: 'right' });
      yt += 16;
    }

    // ---------- Itemised list ----------
    yt += 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Itemised Expenses', M, yt);

    autoTable(doc, {
      startY: yt + 8,
      head: [['Date', 'Category', 'Description', 'Amount']],
      body: expenses
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((e) => [
          fmtDate(e.date),
          cats[e.category]?.label || e.category,
          e.description || '—',
          money(e.amount, e.currency),
        ]),
      theme: 'striped',
      styles: { font: 'helvetica', fontSize: 9, textColor: INK, cellPadding: 5 },
      headStyles: { fillColor: GOLD, textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 110 },
        2: { cellWidth: 220 },
        3: { halign: 'right' },
      },
      margin: { left: M, right: M },
    });
  }

  // ---------- Receipt pages ----------
  if (receipts.length > 0) {
    let receiptIndex = 0;
    for (const att of receipts) {
      receiptIndex++;
      // Resolve URL
      let url: string | undefined;
      if (att.storagePath) {
        try {
          url = await getAttachmentUrl(att.storagePath, 60 * 60 * 24 * 30);
        } catch {
          url = undefined;
        }
      } else if ((att as any).dataUrl) {
        url = (att as any).dataUrl;
      }
      if (!url) continue;

      doc.addPage();
      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...INK);
      doc.text(`Receipt ${receiptIndex} of ${receipts.length}`, M, 50);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...MUTED);
      doc.text(att.name, M, 64);

      const fetched = await fetchAsDataUrl(url);
      if (!fetched) {
        doc.setFontSize(11);
        doc.setTextColor(...MUTED);
        doc.text('Receipt unavailable.', M, 100);
        continue;
      }

      const fmt = imageFormatFromMime(fetched.mime);
      if (fmt) {
        const dims = await loadImageDimensions(fetched.dataUrl);
        const maxW = W - M * 2;
        const maxH = H - 110;
        const scale = Math.min(maxW / dims.w, maxH / dims.h);
        const dw = dims.w * scale;
        const dh = dims.h * scale;
        const dx = (W - dw) / 2;
        const dy = 90;
        try {
          doc.addImage(fetched.dataUrl, fmt, dx, dy, dw, dh, undefined, 'FAST');
        } catch {
          doc.setFontSize(11);
          doc.setTextColor(...MUTED);
          doc.text('Could not render image.', M, 100);
        }
      } else {
        // Non-image (e.g. PDF, doc) — provide a clickable link
        doc.setFontSize(11);
        doc.setTextColor(...INK);
        doc.text('This receipt is a non-image file. Click to open:', M, 100);
        doc.setTextColor(...GOLD);
        doc.textWithLink(att.name, M, 120, { url });
      }
    }
  }

  // Footer page numbers
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(`Page ${i} of ${pageCount}`, W - M, H - 24, { align: 'right' });
  }

  return doc.output('blob');
}
