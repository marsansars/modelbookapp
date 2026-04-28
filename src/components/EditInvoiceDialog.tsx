import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { updateInvoice, getExpenses, updateExpense } from "@/lib/store";
import { Invoice, InvoiceType, Expense, parseLocalDate, CURRENCIES, calculateJobBreakdown } from "@/lib/types";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  invoice: Invoice | null;
  onSaved: () => void;
}

export function EditInvoiceDialog({ open, onOpenChange, invoice, onSaved }: Props) {
  const [number, setNumber] = useState('');
  const [type, setType] = useState<InvoiceType>('detailed');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [billToName, setBillToName] = useState('');
  const [billToEmail, setBillToEmail] = useState('');
  const [billToAddress, setBillToAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // Hydrate fields when invoice changes / dialog opens
  useEffect(() => {
    if (!open || !invoice) return;
    setNumber(invoice.number);
    setType(invoice.type);
    setIssueDate(invoice.issueDate);
    setDueDate(invoice.dueDate);
    setBillToName(invoice.billToName);
    setBillToEmail(invoice.billToEmail || '');
    setBillToAddress(invoice.billToAddress || '');
    setNotes(invoice.notes || '');
    const initial = new Set((invoice.snapshot.expenses || []).map(e => e.id));
    setSelectedExpenseIds(initial);
    getExpenses().then(setAllExpenses);
  }, [open, invoice?.id]);

  const jobExpenses = useMemo(() => {
    if (!invoice) return [];
    return allExpenses.filter(e => e.jobId === invoice.jobId);
  }, [invoice, allExpenses]);

  const selectedExpenses = useMemo(
    () => jobExpenses.filter(e => selectedExpenseIds.has(e.id)),
    [jobExpenses, selectedExpenseIds]
  );

  const subtotal = useMemo(() => {
    if (!invoice) return 0;
    return invoice.snapshot.lineItems.length > 0
      ? invoice.snapshot.lineItems.reduce((s, li) => s + (li.amount || 0), 0)
      : invoice.snapshot.rate;
  }, [invoice]);

  const expensesTotal = selectedExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const { agentFee, netPay } = invoice
    ? calculateJobBreakdown(subtotal, invoice.snapshot.agentPercent)
    : { agentFee: 0, netPay: 0 };
  const total = (type === 'detailed' ? netPay : subtotal) + expensesTotal;

  const symbol = invoice ? CURRENCIES[invoice.snapshot.currency]?.symbol || '' : '';
  const fmtMoney = (n: number) => `${symbol}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const toggleExpense = (id: string) => {
    setSelectedExpenseIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const save = async () => {
    if (!invoice) return;
    if (!number.trim()) { toast.error('Enter an invoice number'); return; }
    if (!billToName.trim()) { toast.error('Enter a bill-to name'); return; }
    setSaving(true);
    try {
      const previouslyAttached = new Set((invoice.snapshot.expenses || []).map(e => e.id));
      const newSnapshot = {
        ...invoice.snapshot,
        expenses: selectedExpenses.map(e => ({
          id: e.id,
          date: e.date,
          description: e.description,
          amount: e.amount,
          currency: e.currency,
        })),
      };
      await updateInvoice(invoice.id, {
        number: number.trim(),
        type,
        issueDate,
        dueDate,
        billToName: billToName.trim(),
        billToEmail: billToEmail.trim() || undefined,
        billToAddress: billToAddress.trim() || undefined,
        notes: notes.trim() || undefined,
        snapshot: newSnapshot,
      });

      // Sync expense reimbursed flags: newly added reimbursable -> mark reimbursed; removed -> unmark
      const newlyAdded = selectedExpenses.filter(e => !previouslyAttached.has(e.id) && e.reimbursable && !e.reimbursed);
      const removed = (invoice.snapshot.expenses || [])
        .filter(prev => !selectedExpenseIds.has(prev.id))
        .map(prev => allExpenses.find(e => e.id === prev.id))
        .filter((e): e is Expense => !!e && !!e.reimbursable && !!e.reimbursed);

      await Promise.all([
        ...newlyAdded.map(e => updateExpense(e.id, { reimbursed: true }).catch(() => {})),
        ...removed.map(e => updateExpense(e.id, { reimbursed: false }).catch(() => {})),
      ]);

      toast.success('Invoice updated');
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || 'Failed to update invoice');
    } finally {
      setSaving(false);
    }
  };

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Edit Invoice</DialogTitle>
          <DialogDescription>Update invoice details. The underlying job stays the same.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-md border border-border bg-secondary/30 p-3 text-sm space-y-1">
            <p className="text-foreground font-medium">{invoice.snapshot.client}{invoice.snapshot.description ? ` · ${invoice.snapshot.description}` : ''}</p>
            <p className="text-muted-foreground text-xs">
              {invoice.snapshot.agencyName ? `${invoice.snapshot.agencyName} · ` : ''}Subtotal {fmtMoney(subtotal)} · Agent {invoice.snapshot.agentPercent}% ({fmtMoney(agentFee)}) · Net {fmtMoney(netPay)}
            </p>
          </div>

          {jobExpenses.length > 0 && (
            <div className="rounded-md border border-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Bill expenses from this job</Label>
                <span className="text-xs text-muted-foreground">{selectedExpenses.length} selected · {fmtMoney(expensesTotal)}</span>
              </div>
              <div className="space-y-1.5 max-h-44 overflow-y-auto">
                {jobExpenses.map(e => {
                  const checked = selectedExpenseIds.has(e.id);
                  const sym = CURRENCIES[e.currency]?.symbol || '';
                  return (
                    <label key={e.id} className="flex items-start gap-2 text-sm cursor-pointer hover:bg-secondary/40 rounded px-2 py-1.5">
                      <Checkbox checked={checked} onCheckedChange={() => toggleExpense(e.id)} className="mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-foreground truncate">{e.description || 'Expense'}</span>
                          <span className="text-foreground tabular-nums">{sym}{e.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <span>{parseLocalDate(e.date).toLocaleDateString()}</span>
                          {e.reimbursable && <span className="text-primary">Reimbursable</span>}
                          {e.reimbursed && <span className="text-success">Reimbursed</span>}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">Adding/removing reimbursable expenses keeps your bookkeeping in sync automatically.</p>
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
                  <RadioGroupItem value="detailed" id="et-d" />
                  <span className="text-sm font-medium text-foreground">Detailed</span>
                </div>
                <span className="text-xs text-muted-foreground">Shows agent commission and net</span>
              </label>
              <label className={`flex flex-col gap-1 rounded-md border p-3 cursor-pointer ${type === 'clean' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="clean" id="et-c" />
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

          <div className="flex items-center justify-between rounded-md bg-primary/10 border border-primary/30 p-3">
            <span className="text-sm text-muted-foreground">Total Due</span>
            <span className="font-heading text-xl text-primary">{fmtMoney(total)}</span>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancel</Button>
            <Button onClick={save} disabled={saving} className="flex-1">
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
