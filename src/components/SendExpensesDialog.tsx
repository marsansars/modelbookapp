import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Copy, Check, Mail, Loader2, FileText, Share2, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Job, Agency, Expense, ExpenseCategoryInfo, JobAttachment, parseLocalDate, CURRENCIES } from "@/lib/types";
import { generateExpenseReportPdf, groupExpensesByCategory } from "@/lib/expense-pdf";
import { uploadBlob, getAttachmentUrl } from "@/lib/storage";
import { getDisplayName } from "@/lib/store";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job?: Job;
  agencies: Agency[];
  expenses: Expense[];
  cats: Record<string, ExpenseCategoryInfo>;
}

const money = (n: number, code: string) =>
  `${CURRENCIES[code as keyof typeof CURRENCIES]?.symbol || ''}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function SendExpensesDialog({ open, onOpenChange, job, agencies, expenses, cats }: Props) {
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [yourName, setYourName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [generating, setGenerating] = useState(false);
  const [pdfLink, setPdfLink] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfFilename, setPdfFilename] = useState<string>("");
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState<"subject" | "body" | "all" | "link" | null>(null);

  const jobExpenses = useMemo(
    () => (job ? expenses.filter((e) => e.jobId === job.id) : []),
    [expenses, job],
  );
  const receipts: JobAttachment[] = useMemo(
    () => (job?.attachments || []).filter((a) => a.label === 'Receipt'),
    [job],
  );
  const groups = useMemo(() => groupExpensesByCategory(jobExpenses, cats), [jobExpenses, cats]);
  const agencyName = useMemo(
    () => (job?.agencyId ? agencies.find((a) => a.id === job.agencyId)?.name || "" : ""),
    [job, agencies],
  );

  // Reset & prefill on open
  useEffect(() => {
    if (!open || !job) return;
    setPdfLink(null);
    setPdfBlob(null);
    setPdfFilename("");
    setCopied(null);
    getDisplayName().then((n) => { if (n) setYourName(n); });
    if (agencyName && !recipientName) setRecipientName(agencyName);
    setSubject(`Expenses – ${job.client}${job.description ? ` / ${job.description}` : ''} (${format(parseLocalDate(job.jobDate), 'MMM d, yyyy')})`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, job?.id]);

  // Build editable body whenever inputs change
  useEffect(() => {
    if (!job) return;
    const lines: string[] = [];
    lines.push(`Hi ${recipientName || '[Name]'},`);
    lines.push('');
    lines.push(
      `Please find attached the receipts for ${job.client}${job.description ? ` – ${job.description}` : ''} (${format(parseLocalDate(job.jobDate), 'MMM d, yyyy')}).`,
    );
    lines.push('');
    if (groups.length > 0) {
      for (const g of groups) {
        lines.push(`${money(g.total, g.currency)} for ${g.label.toLowerCase()}`);
      }
      lines.push('');
    }
    if (pdfBlob || pdfLink) {
      lines.push('Receipts are attached as a PDF (summary + every receipt).');
      lines.push('');
    }
    lines.push('Thanks,');
    lines.push(yourName || '[Your Name]');
    setBody(lines.join('\n'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.id, recipientName, yourName, pdfLink, pdfBlob, groups.length]);

  const handleGenerate = async () => {
    if (!job) return;
    setGenerating(true);
    try {
      const agency = agencies.find((a) => a.id === job.agencyId);
      const blob = await generateExpenseReportPdf({ job, agency, expenses: jobExpenses, cats, receipts, yourName });
      const safeClient = job.client.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 40);
      const filename = `expenses-${safeClient}-${job.jobDate}.pdf`;
      setPdfBlob(blob);
      setPdfFilename(filename);
      // Also upload for a backup link (useful if share/attach isn't available)
      try {
        const { storagePath } = await uploadBlob(blob, filename, 'application/pdf');
        const url = await getAttachmentUrl(storagePath, 60 * 60 * 24 * 30);
        setPdfLink(url);
      } catch {
        // Non-fatal — share/download still work from the in-memory blob
      }
      toast({ title: 'Report ready', description: 'Use Share or Download to attach it to your email.' });
    } catch (err: any) {
      toast({ title: 'Could not generate report', description: err?.message || String(err), variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!pdfBlob) return;
    setSharing(true);
    try {
      const file = new File([pdfBlob], pdfFilename, { type: 'application/pdf' });
      const nav = navigator as any;
      const canShareFiles = typeof nav.canShare === 'function' && nav.canShare({ files: [file] });
      if (canShareFiles && typeof nav.share === 'function') {
        await nav.share({ files: [file], title: subject, text: body });
      } else {
        // Desktop fallback — download the file so the user can attach it manually
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = pdfFilename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast({ title: 'PDF downloaded', description: 'Attach it to your email manually.' });
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        toast({ title: 'Share failed', description: err?.message || String(err), variant: 'destructive' });
      }
    } finally {
      setSharing(false);
    }
  };

  const handleDownload = () => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = pdfFilename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const copy = async (text: string, key: typeof copied) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      toast({ title: 'Copied to clipboard' });
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  const openInMail = () => {
    const to = recipientEmail.trim();
    // Use an anchor click — more reliable than window.location.href, which can
    // be swallowed by PWAs / Gmail handlers and just opens the inbox.
    const url = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const a = document.createElement('a');
    a.href = url;
    a.rel = 'noopener noreferrer';
    a.target = '_self';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const openInGmail = () => {
    const to = recipientEmail.trim();
    // Gmail web compose — guaranteed to open a new draft, not the inbox.
    const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Send Expenses</DialogTitle>
          <DialogDescription>
            Generate a PDF report (summary + every receipt) and draft an email to your agent or client.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary preview */}
          <div className="rounded-md border border-border/50 bg-secondary/30 p-3 space-y-1.5">
            <p className="text-xs text-muted-foreground">
              {jobExpenses.length} expense{jobExpenses.length === 1 ? '' : 's'} · {receipts.length} receipt{receipts.length === 1 ? '' : 's'} attached
            </p>
            {groups.length === 0 ? (
              <p className="text-sm text-muted-foreground">No expenses linked to this job yet.</p>
            ) : (
              <div className="space-y-0.5">
                {groups.map((g) => (
                  <div key={g.key} className="flex justify-between text-sm">
                    <span className="text-foreground">{g.label}</span>
                    <span className="font-medium text-foreground">{money(g.total, g.currency)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="recipient-name">Recipient name</Label>
              <Input id="recipient-name" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="e.g. Taylor" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="your-name">Your name</Label>
              <Input id="your-name" value={yourName} onChange={(e) => setYourName(e.target.value)} placeholder="Your name" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipient-email">Recipient email</Label>
            <Input
              id="recipient-email"
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="agent@agency.com"
            />
          </div>

          <div className="space-y-2">
            <Label>Receipts PDF</Label>
            {pdfBlob ? (
              <div className="space-y-2">
                <div className="rounded-md border border-border/50 bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
                  <FileText className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />
                  {pdfFilename} · {(pdfBlob.size / 1024 / 1024).toFixed(2)} MB
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button onClick={handleShare} disabled={sharing} variant="outline" className="flex-1">
                    {sharing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Share2 className="h-4 w-4 mr-2" />}
                    Share / Attach
                  </Button>
                  <Button onClick={handleDownload} variant="outline" className="flex-1">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  {pdfLink && (
                    <Button size="default" variant="ghost" onClick={() => copy(pdfLink, 'link')} className="flex-1">
                      {copied === 'link' ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                      Copy link
                    </Button>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  On phone: tap <strong>Share / Attach</strong> and pick Mail/Gmail to send the PDF as an attachment. On desktop: <strong>Download</strong> the PDF and attach it manually.
                </p>
              </div>
            ) : (
              <Button onClick={handleGenerate} disabled={generating || jobExpenses.length === 0} variant="outline" className="w-full">
                {generating ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating…</>) : (<><FileText className="h-4 w-4 mr-2" /> Generate Report PDF</>)}
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="subject">Subject</Label>
              <Button size="sm" variant="ghost" onClick={() => copy(subject, 'subject')} className="h-7 text-xs">
                {copied === 'subject' ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                Copy
              </Button>
            </div>
            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="body">Email body</Label>
              <Button size="sm" variant="ghost" onClick={() => copy(body, 'body')} className="h-7 text-xs">
                {copied === 'body' ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                Copy
              </Button>
            </div>
            <Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} rows={12} className="font-body text-sm leading-relaxed" />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button onClick={() => copy(`Subject: ${subject}\n\n${body}`, 'all')} variant="outline" className="flex-1">
              {copied === 'all' ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              Copy All
            </Button>
            <Button onClick={openInMail} className="flex-1">
              <Mail className="h-4 w-4 mr-2" />
              Open in Email
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
