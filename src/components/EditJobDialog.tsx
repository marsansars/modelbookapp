import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { updateJob, getAgencies } from "@/lib/store";
import { Job, Agency, CurrencyCode, CURRENCIES, DEFAULT_NET_DAYS, LineItem } from "@/lib/types";

interface Props {
  job: Job;
  onUpdated: () => void;
}

export function EditJobDialog({ job, onUpdated }: Props) {
  const [open, setOpen] = useState(false);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [form, setForm] = useState({
    client: job.client,
    description: job.description,
    jobDate: job.jobDate,
    agentPercent: String(job.agentPercent),
    taxPercent: String(job.taxPercent),
    currency: job.currency,
    netDays: String(job.netDays),
    agencyId: job.agencyId || '',
    notes: job.notes || '',
  });

  useEffect(() => {
    if (open) {
      getAgencies().then(setAgencies);
      setForm({
        client: job.client,
        description: job.description,
        jobDate: job.jobDate,
        agentPercent: String(job.agentPercent),
        taxPercent: String(job.taxPercent),
        currency: job.currency,
        netDays: String(job.netDays),
        agencyId: job.agencyId || '',
        notes: job.notes || '',
      });
      const items = job.lineItems && job.lineItems.length > 0
        ? job.lineItems
        : [{ id: crypto.randomUUID(), description: '', amount: job.rate }];
      setLineItems(items);
    }
  }, [open, job]);

  const handleAgencyChange = (agencyId: string) => {
    if (agencyId === '_none') {
      setForm(f => ({ ...f, agencyId: '' }));
      return;
    }
    const agency = agencies.find(a => a.id === agencyId);
    if (agency) {
      setForm(f => ({
        ...f,
        agencyId,
        agentPercent: String(agency.defaultAgentPercent),
        currency: agency.defaultCurrency,
        netDays: String(agency.defaultNetDays),
      }));
    }
  };

  const totalRate = lineItems.reduce((sum, li) => sum + (li.amount || 0), 0);

  const updateLineItem = (id: string, field: 'description' | 'amount', value: string) => {
    setLineItems(items => items.map(li =>
      li.id === id ? { ...li, [field]: field === 'amount' ? (parseFloat(value) || 0) : value } : li
    ));
  };

  const addLineItem = () => {
    setLineItems(items => [...items, { id: crypto.randomUUID(), description: '', amount: 0 }]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length <= 1) return;
    setLineItems(items => items.filter(li => li.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const filteredItems = lineItems.filter(li => li.amount > 0);
    await updateJob(job.id, {
      client: form.client.trim(),
      description: form.description.trim(),
      jobDate: form.jobDate,
      rate: totalRate,
      currency: form.currency,
      agentPercent: parseFloat(form.agentPercent) || 0,
      taxPercent: parseFloat(form.taxPercent) || 0,
      netDays: parseInt(form.netDays) || DEFAULT_NET_DAYS,
      agencyId: form.agencyId || undefined,
      notes: form.notes.trim() || undefined,
      lineItems: filteredItems,
    });
    setOpen(false);
    onUpdated();
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Edit Job</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {agencies.length > 0 && (
            <div>
              <Label>Agency</Label>
              <Select value={form.agencyId || '_none'} onValueChange={handleAgencyChange}>
                <SelectTrigger><SelectValue placeholder="Select agency" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">No agency</SelectItem>
                  {agencies.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label htmlFor="edit-client">Client / Brand</Label>
            <Input id="edit-client" value={form.client} onChange={set('client')} required />
          </div>
          <div>
            <Label htmlFor="edit-desc">Description</Label>
            <Input id="edit-desc" value={form.description} onChange={set('description')} />
          </div>
          <div>
            <Label htmlFor="edit-date">Job Date</Label>
            <Input id="edit-date" type="date" value={form.jobDate} onChange={set('jobDate')} required />
          </div>

          {/* Line Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Rate Line Items</Label>
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addLineItem}>
                <Plus className="h-3 w-3" /> Add Line
              </Button>
            </div>
            {lineItems.map((li, idx) => (
              <div key={li.id} className="flex items-center gap-2">
                <Input
                  placeholder={`Line ${idx + 1} description`}
                  value={li.description}
                  onChange={e => updateLineItem(li.id, 'description', e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Amount"
                  value={li.amount || ''}
                  onChange={e => updateLineItem(li.id, 'amount', e.target.value)}
                  className="w-28"
                />
                {lineItems.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeLineItem(li.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
            <div className="flex justify-end text-sm font-medium text-foreground pt-1 border-t border-border/50">
              Total: {CURRENCIES[form.currency].symbol}{totalRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div>
            <Label>Currency</Label>
            <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v as CurrencyCode }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(CURRENCIES).map(([code, { label, symbol }]) => (
                  <SelectItem key={code} value={code}>{symbol} {code} — {label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="edit-agent">Agent %</Label>
              <Input id="edit-agent" type="number" min="0" max="100" step="0.01" value={form.agentPercent} onChange={set('agentPercent')} />
            </div>
            <div>
              <Label htmlFor="edit-tax">Tax %</Label>
              <Input id="edit-tax" type="number" min="0" max="100" step="0.01" value={form.taxPercent} onChange={set('taxPercent')} />
            </div>
            <div>
              <Label htmlFor="edit-net">Net Days</Label>
              <Input id="edit-net" type="number" min="1" value={form.netDays} onChange={set('netDays')} />
            </div>
          </div>

          <div>
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea
              id="edit-notes"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Job details, call time, location, contacts..."
              className="min-h-[60px]"
            />
          </div>

          <Button type="submit" className="w-full">Save Changes</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
