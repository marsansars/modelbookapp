import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice, SenderInfo, CURRENCIES, calculateJobBreakdown, parseLocalDate } from './types';

const fmtDate = (s: string) => parseLocalDate(s).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
const money = (n: number, code: string) => `${CURRENCIES[code as keyof typeof CURRENCIES]?.symbol || ''}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Editorial palette (RGB)
const GOLD: [number, number, number] = [191, 149, 63];
const INK: [number, number, number] = [28, 28, 30];
const MUTED: [number, number, number] = [120, 120, 124];
const RULE: [number, number, number] = [220, 220, 220];

export function generateInvoicePdf(invoice: Invoice, sender: SenderInfo): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' }); // 612 x 792
  const W = doc.internal.pageSize.getWidth();
  const M = 50;
  const snap = invoice.snapshot;
  const showAgent = invoice.type === 'detailed';
  const lineItemsSubtotal = snap.lineItems.length > 0
    ? snap.lineItems.reduce((s, li) => s + (li.amount || 0), 0)
    : snap.rate;
  const expenses = snap.expenses || [];
  const expensesTotal = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const subtotal = lineItemsSubtotal;
  const { agentFee, netPay } = calculateJobBreakdown(subtotal, snap.agentPercent);
  const total = (showAgent ? netPay : subtotal) + expensesTotal;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(...INK);
  doc.text('INVOICE', M, 70);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text(`# ${invoice.number}`, M, 88);

  // Right meta
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text('ISSUED', W - M, 60, { align: 'right' });
  doc.text('DUE', W - M, 88, { align: 'right' });
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(fmtDate(invoice.issueDate), W - M, 74, { align: 'right' });
  doc.text(fmtDate(invoice.dueDate), W - M, 102, { align: 'right' });

  // Gold rule
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1.5);
  doc.line(M, 120, W - M, 120);

  // From / Bill To
  let y = 145;
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text('FROM', M, y);
  doc.text('BILL TO', W / 2, y);

  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.text(sender.legalName || '—', M, y + 16);
  doc.text(invoice.billToName || '—', W / 2, y + 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  const colW = (W / 2) - M - 10;
  const splitMulti = (val?: string | null): string[] => {
    if (!val) return [];
    const raw = String(val).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const out: string[] = [];
    raw.forEach(line => {
      const wrapped = doc.splitTextToSize(line, colW) as string[];
      out.push(...wrapped);
    });
    return out;
  };
  const fromLines: string[] = [
    ...splitMulti(sender.address),
    ...(sender.email ? [sender.email] : []),
    ...(sender.phone ? [sender.phone] : []),
    ...(sender.taxId ? [`Tax ID: ${sender.taxId}`] : []),
  ];
  const billLines: string[] = [
    ...splitMulti(invoice.billToAddress),
    ...(invoice.billToEmail ? [invoice.billToEmail] : []),
  ];
  const LH = 13;
  fromLines.forEach((l, i) => doc.text(l, M, y + 32 + i * LH));
  billLines.forEach((l, i) => doc.text(l, W / 2, y + 32 + i * LH));

  const blockBottom = y + 32 + Math.max(fromLines.length, billLines.length, 1) * LH;

  // Job summary line
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.5);
  doc.line(M, blockBottom + 14, W - M, blockBottom + 14);

  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`JOB · ${fmtDate(snap.jobDate)}`, M, blockBottom + 30);
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.text(snap.client, M, blockBottom + 46);
  doc.setFont('helvetica', 'normal');
  if (snap.description) {
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text(snap.description, M, blockBottom + 60);
  }

  // Line items + reimbursable expenses table
  const baseRows: (string[] | { content: string; colSpan?: number; styles?: any }[])[] = (snap.lineItems.length > 0
    ? snap.lineItems.map(li => [li.description || 'Item', money(li.amount, snap.currency)])
    : [[`${snap.client} — ${snap.description || 'Services'}`, money(snap.rate, snap.currency)]]);

  const expenseRows: any[] = expenses.length > 0
    ? [
        [{ content: 'REIMBURSABLE EXPENSES', colSpan: 2, styles: { fontStyle: 'bold', fontSize: 9, textColor: MUTED, cellPadding: { top: 14, bottom: 6, left: 0, right: 0 } } }],
        ...expenses.map(e => [`${fmtDate(e.date)} — ${e.description || 'Expense'}`, money(e.amount, snap.currency)]),
      ]
    : [];

  autoTable(doc, {
    startY: blockBottom + 78,
    margin: { left: M, right: M },
    head: [['DESCRIPTION', 'AMOUNT']],
    body: [...baseRows, ...expenseRows],
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 10, cellPadding: { top: 10, bottom: 10, left: 0, right: 0 }, textColor: INK },
    headStyles: { fontStyle: 'bold', fontSize: 9, textColor: MUTED, lineWidth: { bottom: 0.75 }, lineColor: RULE },
    columnStyles: { 0: { cellWidth: 'auto' }, 1: { halign: 'right', cellWidth: 100 } },
    didParseCell: (data) => {
      if (data.section === 'body') {
        data.cell.styles.lineWidth = { bottom: 0.5 } as any;
        data.cell.styles.lineColor = RULE;
      }
    },
  });

  // Totals
  let ty = (doc as any).lastAutoTable.finalY + 18;
  const totalsX = W - M;
  const labelX = W - M - 130;

  const drawRow = (label: string, value: string, bold = false, color: [number, number, number] = INK) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 12 : 10);
    doc.setTextColor(...(bold ? color : MUTED));
    doc.text(label, labelX, ty, { align: 'right' });
    doc.setTextColor(...color);
    doc.text(value, totalsX, ty, { align: 'right' });
    ty += bold ? 22 : 16;
  };

  drawRow('Subtotal', money(subtotal, snap.currency));
  if (showAgent && snap.agentPercent > 0) {
    drawRow(`Agent commission (${snap.agentPercent}%)`, `−${money(agentFee, snap.currency)}`);
  }
  if (expensesTotal > 0) {
    drawRow('Reimbursable expenses', money(expensesTotal, snap.currency));
  }

  // Gold total bar
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1);
  doc.line(labelX - 20, ty - 4, totalsX, ty - 4);
  ty += 4;
  drawRow('Total Due', money(total, snap.currency), true, INK);

  // Notes & payment instructions
  if (invoice.notes || sender.paymentInstructions) {
    ty += 10;
    doc.setDrawColor(...RULE);
    doc.line(M, ty, W - M, ty);
    ty += 18;

    if (sender.paymentInstructions) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...MUTED);
      doc.text('PAYMENT', M, ty);
      ty += 14;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...INK);
      const lines = doc.splitTextToSize(sender.paymentInstructions, W - 2 * M);
      doc.text(lines, M, ty);
      ty += lines.length * 13 + 10;
    }

    if (invoice.notes) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...MUTED);
      doc.text('NOTES', M, ty);
      ty += 14;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...INK);
      const lines = doc.splitTextToSize(invoice.notes, W - 2 * M);
      doc.text(lines, M, ty);
    }
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(`Net ${Math.max(0, Math.round((parseLocalDate(invoice.dueDate).getTime() - parseLocalDate(invoice.issueDate).getTime()) / 86400000))} terms · Generated by ModelBook`, W / 2, 770, { align: 'center' });

  return doc;
}

export function downloadInvoicePdf(invoice: Invoice, sender: SenderInfo) {
  const doc = generateInvoicePdf(invoice, sender);
  doc.save(`Invoice-${invoice.number}.pdf`);
}
