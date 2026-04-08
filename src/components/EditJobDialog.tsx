import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil } from "lucide-react";
import { updateJob, getAgencies } from "@/lib/store";
import { Job, Agency, CurrencyCode, CURRENCIES, DEFAULT_NET_DAYS } from "@/lib/types";

interface Props {
  job: Job;
  onUpdated: () => void;
}

export function EditJobDialog({ job, onUpdated }: Props) {
  const [open, setOpen] = useState(false);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [form, setForm] = useState({
    client: job.client,
    description: job.description,
    jobDate: job.jobDate,
    rate: String(job.rate),
    agentPercent: String(job.agentPercent),
    taxPercent: String(job.taxPercent),
    currency: job.currency,
    netDays: String(job.netDays),
    agencyId: job.agencyId || '',
  });

  useEffect(() => {
    if (open) {
      getAgencies().then(setAgencies);
      setForm({
        client: job.client,
        description: job.description,
        jobDate: job.jobDate,
        rate: String(job.rate),
        agentPercent: String(job.agentPercent),
        taxPercent: String(job.taxPercent),
        currency: job.currency,
        netDays: String(job.netDays),
        agencyId: job.agencyId || '',
      });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateJob(job.id, {
      client: form.client.trim(),
      description: form.description.trim(),
      jobDate: form.jobDate,
      rate: parseFloat(form.rate) || 0,
      currency: form.currency,
      agentPercent: parseFloat(form.agentPercent) || 0,
      taxPercent: parseFloat(form.taxPercent) || 0,
      netDays: parseInt(form.netDays) || DEFAULT_NET_DAYS,
      agencyId: form.agencyId || undefined,
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="edit-rate">Rate</Label>
              <Input id="edit-rate" type="number" min="0" step="0.01" value={form.rate} onChange={set('rate')} required />
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
              <Label htmlFor="edit-agent">Agent %</Label>
              <Input id="edit-agent" type="number" min="0" max="100" value={form.agentPercent} onChange={set('agentPercent')} />
            </div>
            <div>
              <Label htmlFor="edit-tax">Tax %</Label>
              <Input id="edit-tax" type="number" min="0" max="100" value={form.taxPercent} onChange={set('taxPercent')} />
            </div>
            <div>
              <Label htmlFor="edit-net">Net Days</Label>
              <Input id="edit-net" type="number" min="1" value={form.netDays} onChange={set('netDays')} />
            </div>
          </div>
          <Button type="submit" className="w-full">Save Changes</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
