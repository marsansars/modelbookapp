import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { addInvoice, getJobs, getAgencies, getInvoices, getExpenses, updateExpense } from "@/lib/store";
import { Job, Agency, Invoice, InvoiceType, Expense, parseLocalDate, getDueDate, CURRENCIES, calculateJobBreakdown } from "@/lib/types";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  presetJobId?: string;
  onCreated: (invoice: Invoice) => void;
}

export function NewInvoiceDialog({ open, onOpenChange, presetJobId, onCreated }: Props) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [existing, setExisting] = useState<Invoice[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<Set<string>>(new Set());
  const [jobId, setJobId] = useState<string>('');
  const [number, setNumber] = useState('');
  const [type, setType] = useState<InvoiceType>('detailed');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [billToName, setBillToName] = useState('');
  const [billToEmail, setBillToEmail] = useState('');
  const [billToAddress, setBillToAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    Promise.all([getJobs(), getAgencies(), getInvoices(), getExpenses()]).then(([j, a, i, e]) => {
      setJobs(j);
      setAgencies(a);
      setExisting(i);
      setAllExpenses(e);
      if (presetJobId) setJobId(presetJobId);
    });
  }, [open, presetJobId]);

  const job = jobs.find(j => j.id === jobId);
  const agency = job?.agencyId ? agencies.find(a => a.id === job.agencyId) : undefined;

  // Expenses linked to the selected job (any reimbursable expense — let the user decide)
  const jobExpenses = useMemo(() => {
    if (!job) return [];
    return allExpenses.filter(e => e.jobId === job.id);
  }, [job, allExpenses]);

  // Auto-select reimbursable + not-yet-reimbursed expenses by default
  useEffect(() => {
    if (!job) { setSelectedExpenseIds(new Set()); return; }
    const auto = jobExpenses.filter(e => e.reimbursable && !e.reimbursed).map(e => e.id);
    setSelectedExpenseIds(new Set(auto));
  }, [jobId, jobExpenses.length]);

  // Auto-fill bill-to and due date when job changes
  useEffect(() => {
    if (!job) return;
    const billed = agency?.name || job.client;
    setBillToName(billed);
    const due = getDueDate(job.jobDate, job.netDays);
    setDueDate(due.toISOString().slice(0, 10));
  }, [jobId, agencies.length]);

  const subtotal = useMemo(() => {
    if (!job) return 0;
    return (job.lineItems && job.lineItems.length > 0)
      ? job.lineItems.reduce((s, li) => s + (li.amount || 0), 0)
      : job.rate;
  }, [job]);

  const selectedExpenses = useMemo(
    () => jobExpenses.filter(e => selectedExpenseIds.has(e.id)),
    [jobExpenses, selectedExpenseIds]
  );
  const expensesTotal = selectedExpenses.reduce((s, e) => s + (e.amount || 0), 0);

  const { agentFee, netPay } = job ? calculateJobBreakdown(subtotal, job.agentPercent) : { agentFee: 0, netPay: 0 };
  const total = (type === 'detailed' ? netPay : subtotal) + expensesTotal;

  const toggleExpense = (id: string) => {
    setSelectedExpenseIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const create = async () => {
    if (!job) { toast.error('Pick a job first'); return; }
    if (!number.trim()) { toast.error('Enter an invoice number'); return; }
    if (!billToName.trim()) { toast.error('Enter a bill-to name'); return; }
    setSaving(true);
    try {
      const invoice = await addInvoice({
        jobId: job.id,
        number: number.trim(),
        type,
        issueDate,
        dueDate,
        status: 'draft',
        billToName: billToName.trim(),
        billToEmail: billToEmail.trim() || undefined,
        billToAddress: billToAddress.trim() || undefined,
        notes: notes.trim() || undefined,
        snapshot: {
          client: job.client,
          description: job.description,
          jobDate: job.jobDate,
          currency: job.currency,
          agencyName: agency?.name,
          agentPercent: job.agentPercent,
          rate: job.rate,
          lineItems: job.lineItems || [],
        },
      });
      toast.success('Invoice created');
      onCreated(invoice);
      onOpenChange(false);
      // Reset
      setJobId(''); setNumber(''); setType('detailed'); setNotes('');
      setBillToName(''); setBillToEmail(''); setBillToAddress('');
    } catch (e: any) {
      toast.error(e.message || 'Failed to create invoice');
    } finally {
      setSaving(false);
    }
  };

  const symbol = job ? CURRENCIES[job.currency].symbol : '';
  const fmtMoney = (n: number) => `${symbol}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">New Invoice</DialogTitle>
          <DialogDescription>Generate a professional invoice for any job.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Job</Label>
            <Select value={jobId} onValueChange={setJobId}>
              <SelectTrigger><SelectValue placeholder="Pick a job to invoice" /></SelectTrigger>
              <SelectContent>
                {jobs.map(j => {
                  const has = existing.some(i => i.jobId === j.id);
                  return (
                    <SelectItem key={j.id} value={j.id}>
                      {j.client} — {parseLocalDate(j.jobDate).toLocaleDateString()}{has ? ' · already invoiced' : ''}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {job && (
            <div className="rounded-md border border-border bg-secondary/30 p-3 text-sm space-y-1">
              <p className="text-foreground font-medium">{job.client}{job.description ? ` · ${job.description}` : ''}</p>
              <p className="text-muted-foreground text-xs">
                {agency ? `${agency.name} · ` : ''}Subtotal {fmtMoney(subtotal)} · Agent {job.agentPercent}% ({fmtMoney(agentFee)}) · Net {fmtMoney(netPay)}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Invoice #</Label>
              <Input value={number} onChange={e => setNumber(e.target.value)} placeholder="INV-0001" />
            </div>
            <div>
              <Label>Issue Date</Label>
              <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Due Date</Label>
            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>

          <div>
            <Label>Invoice Style</Label>
            <RadioGroup value={type} onValueChange={(v) => setType(v as InvoiceType)} className="grid grid-cols-2 gap-2 mt-1">
              <label className={`flex flex-col gap-1 rounded-md border p-3 cursor-pointer ${type === 'detailed' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="detailed" id="t-d" />
                  <span className="text-sm font-medium text-foreground">Detailed</span>
                </div>
                <span className="text-xs text-muted-foreground">Shows agent commission and net</span>
              </label>
              <label className={`flex flex-col gap-1 rounded-md border p-3 cursor-pointer ${type === 'clean' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="clean" id="t-c" />
                  <span className="text-sm font-medium text-foreground">Clean</span>
                </div>
                <span className="text-xs text-muted-foreground">Client-facing, just the total</span>
              </label>
            </RadioGroup>
          </div>

          <div className="border-t border-border pt-3 space-y-3">
            <div>
              <Label>Bill To</Label>
              <Input value={billToName} onChange={e => setBillToName(e.target.value)} placeholder="Agency or client name" />
            </div>
            <div>
              <Label>Email (for delivery)</Label>
              <Input type="email" value={billToEmail} onChange={e => setBillToEmail(e.target.value)} placeholder="accounts@agency.com" />
            </div>
            <div>
              <Label>Address (optional)</Label>
              <Textarea value={billToAddress} onChange={e => setBillToAddress(e.target.value)} className="min-h-[50px]" />
            </div>
          </div>

          <div>
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Thanks, payment terms, references…" className="min-h-[60px]" />
          </div>

          {job && (
            <div className="flex items-center justify-between rounded-md bg-primary/10 border border-primary/30 p-3">
              <span className="text-sm text-muted-foreground">Total Due</span>
              <span className="font-heading text-xl text-primary">{fmtMoney(total)}</span>
            </div>
          )}

          <Button onClick={create} disabled={saving || !job} className="w-full">
            {saving ? 'Creating…' : 'Create Invoice'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
