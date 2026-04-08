import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { addJob, getAgencies } from "@/lib/store";
import { Agency, CurrencyCode, CURRENCIES, DEFAULT_NET_DAYS } from "@/lib/types";

interface Props {
  onAdded: () => void;
}

export function AddJobDialog({ onAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [form, setForm] = useState({
    client: '', description: '', jobDate: '', rate: '',
    agentPercent: '20', taxPercent: '30', currency: 'USD' as CurrencyCode,
    netDays: String(DEFAULT_NET_DAYS), agencyId: '',
  });

  useEffect(() => {
    if (open) {
      getAgencies().then(setAgencies);
    }
  }, [open]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addJob({
      client: form.client.trim(),
      description: form.description.trim(),
      jobDate: form.jobDate,
      rate: parseFloat(form.rate) || 0,
      currency: form.currency,
      agentPercent: parseFloat(form.agentPercent) || 0,
      taxPercent: parseFloat(form.taxPercent) || 0,
      netDays: parseInt(form.netDays) || DEFAULT_NET_DAYS,
      agencyId: form.agencyId || undefined,
      status: 'pending',
    });
    setForm({ client: '', description: '', jobDate: '', rate: '', agentPercent: '20', taxPercent: '30', currency: 'USD', netDays: String(DEFAULT_NET_DAYS), agencyId: '' });
    setOpen(false);
    onAdded();
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="h-4 w-4" /> Add Job</Button>
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
            <Input id="description" value={form.description} onChange={set('description')} placeholder="e.g. Editorial shoot" />
          </div>
          <div>
            <Label htmlFor="jobDate">Job Date</Label>
            <Input id="jobDate" type="date" value={form.jobDate} onChange={set('jobDate')} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="rate">Rate</Label>
              <Input id="rate" type="number" min="0" step="0.01" value={form.rate} onChange={set('rate')} required />
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
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="agentPercent">Agent %</Label>
              <Input id="agentPercent" type="number" min="0" max="100" value={form.agentPercent} onChange={set('agentPercent')} />
            </div>
            <div>
              <Label htmlFor="taxPercent">Tax %</Label>
              <Input id="taxPercent" type="number" min="0" max="100" value={form.taxPercent} onChange={set('taxPercent')} />
            </div>
            <div>
              <Label htmlFor="netDays">Net Days</Label>
              <Input id="netDays" type="number" min="1" value={form.netDays} onChange={set('netDays')} />
            </div>
          </div>
          <Button type="submit" className="w-full">Save Job</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
