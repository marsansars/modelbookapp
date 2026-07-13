import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Sparkles, Loader2, X } from "lucide-react";
import { addJob, getAgencies } from "@/lib/store";
import { Agency, CurrencyCode, CURRENCIES, DEFAULT_NET_DAYS, LineItem } from "@/lib/types";
import { maybeCompressImage } from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  onAdded: () => void;
}

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });

export function AddJobDialog({ onAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: crypto.randomUUID(), description: '', amount: 0 },
  ]);
  const [form, setForm] = useState({
    client: '', description: '', jobDate: '',
    agentPercent: '20', taxPercent: '30', currency: 'USD' as CurrencyCode,
    netDays: String(DEFAULT_NET_DAYS), agencyId: '', notes: '',
  });

  const [scanning, setScanning] = useState(false);
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      getAgencies().then(setAgencies);
    }
  }, [open]);

  const handleScreenshot = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file.');
      return;
    }
    setScanning(true);
    try {
      const compressed = await maybeCompressImage(file);
      const dataUrl = await fileToDataUrl(compressed);
      setScanPreview(dataUrl);
      const { data, error } = await supabase.functions.invoke('scan-job-screenshot', {
        body: { imageDataUrl: dataUrl },
      });
      if (error) throw error;
      const extracted = data?.data;
      if (!extracted) throw new Error('No data returned');

      // Merge extracted values into form
      setForm(f => {
        const next = { ...f };
        if (extracted.client) next.client = extracted.client;
        if (extracted.description) next.description = extracted.description;
        if (extracted.jobDate) next.jobDate = extracted.jobDate;
        if (extracted.currency && CURRENCIES[extracted.currency as CurrencyCode]) {
          next.currency = extracted.currency as CurrencyCode;
        }
        if (typeof extracted.agentPercent === 'number') next.agentPercent = String(extracted.agentPercent);
        if (typeof extracted.taxPercent === 'number') next.taxPercent = String(extracted.taxPercent);
        if (typeof extracted.netDays === 'number') next.netDays = String(extracted.netDays);
        if (extracted.notes) next.notes = extracted.notes;

        // Fuzzy agency match
        if (extracted.agencyName && !next.agencyId) {
          const needle = String(extracted.agencyName).toLowerCase();
          const match = agencies.find(a =>
            a.name.toLowerCase() === needle ||
            a.name.toLowerCase().includes(needle) ||
            needle.includes(a.name.toLowerCase())
          );
          if (match) {
            next.agencyId = match.id;
            // Fill agency defaults only where the scan didn't provide values
            if (typeof extracted.agentPercent !== 'number') next.agentPercent = String(match.defaultAgentPercent);
            if (!extracted.currency) next.currency = match.defaultCurrency;
            if (typeof extracted.netDays !== 'number') next.netDays = String(match.defaultNetDays);
          }
        }
        return next;
      });

      if (Array.isArray(extracted.lineItems) && extracted.lineItems.length > 0) {
        setLineItems(extracted.lineItems.map((li: { description: string; amount: number }) => ({
          id: crypto.randomUUID(),
          description: li.description || '',
          amount: li.amount || 0,
        })));
      }

      toast.success('Filled from screenshot — please review before saving.');
    } catch (err) {
      const msg = (err as { message?: string })?.message || 'Could not read screenshot';
      toast.error(msg);
      setScanPreview(null);
    } finally {
      setScanning(false);
    }
  };


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
    await addJob({
      client: form.client.trim(),
      description: form.description.trim(),
      jobDate: form.jobDate,
      rate: totalRate,
      currency: form.currency,
      agentPercent: parseFloat(form.agentPercent) || 0,
      taxPercent: parseFloat(form.taxPercent) || 0,
      netDays: parseInt(form.netDays) || DEFAULT_NET_DAYS,
      agencyId: form.agencyId || undefined,
      status: 'pending',
      notes: form.notes.trim() || undefined,
      lineItems: lineItems.filter(li => li.amount > 0),
    });
    setForm({ client: '', description: '', jobDate: '', agentPercent: '20', taxPercent: '30', currency: 'USD', netDays: String(DEFAULT_NET_DAYS), agencyId: '', notes: '' });
    setLineItems([{ id: crypto.randomUUID(), description: '', amount: 0 }]);
    setScanPreview(null);
    setOpen(false);
    onAdded();
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-tour="jobs-add" className="gap-2"><Plus className="h-4 w-4" /> Add Job</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">New Job</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Agency</Label>
            <Select value={form.agencyId || '_none'} onValueChange={handleAgencyChange}>
              <SelectTrigger><SelectValue placeholder="Select agency" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">No agency (direct booking)</SelectItem>
                {agencies.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name} ({a.defaultAgentPercent}%)</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {agencies.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">No agencies yet — add one from the Agencies page.</p>
            )}
          </div>
          <div>
            <Label htmlFor="client">Client / Brand</Label>
            <Input id="client" value={form.client} onChange={set('client')} required placeholder="e.g. Vogue, Gucci" />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Input id="description" value={form.description} onChange={set('description')} placeholder="e.g. Ecomm, Lookbook, Campaign" />
          </div>
          <div>
            <Label htmlFor="jobDate">Job Date</Label>
            <Input id="jobDate" type="date" value={form.jobDate} onChange={set('jobDate')} required />
          </div>

          {/* Line Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Add Item</Label>
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addLineItem}>
                <Plus className="h-3 w-3" /> Add Item
              </Button>
            </div>
            {lineItems.map((li, idx) => (
              <div key={li.id} className="flex items-center gap-2">
                <Input
                  placeholder="e.g. Day Rate, Usage, OT"
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
              <Label htmlFor="agentPercent">Agent %</Label>
              <Input id="agentPercent" type="number" min="0" max="100" step="0.01" value={form.agentPercent} onChange={set('agentPercent')} />
            </div>
            <div>
              <Label htmlFor="taxPercent">Tax %</Label>
              <Input id="taxPercent" type="number" min="0" max="100" step="0.01" value={form.taxPercent} onChange={set('taxPercent')} />
            </div>
            <div>
              <Label htmlFor="netDays">Net Days</Label>
              <Input id="netDays" type="number" min="1" value={form.netDays} onChange={set('netDays')} />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Job details, call time, location, contacts..."
              className="min-h-[60px]"
            />
          </div>

          <Button type="submit" className="w-full">Save Job</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
