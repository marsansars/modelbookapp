import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { addJob } from "@/lib/store";
import { Job } from "@/lib/types";

interface Props {
  onAdded: () => void;
}

export function AddJobDialog({ onAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    client: '', description: '', jobDate: '', rate: '', agentPercent: '20', taxPercent: '30',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const job: Job = {
      id: crypto.randomUUID(),
      client: form.client.trim(),
      description: form.description.trim(),
      jobDate: form.jobDate,
      rate: parseFloat(form.rate) || 0,
      agentPercent: parseFloat(form.agentPercent) || 0,
      taxPercent: parseFloat(form.taxPercent) || 0,
      status: 'pending',
    };
    addJob(job);
    setForm({ client: '', description: '', jobDate: '', rate: '', agentPercent: '20', taxPercent: '30' });
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">New Job</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="rate">Rate ($)</Label>
              <Input id="rate" type="number" min="0" step="0.01" value={form.rate} onChange={set('rate')} required />
            </div>
            <div>
              <Label htmlFor="agentPercent">Agent %</Label>
              <Input id="agentPercent" type="number" min="0" max="100" value={form.agentPercent} onChange={set('agentPercent')} />
            </div>
            <div>
              <Label htmlFor="taxPercent">Tax %</Label>
              <Input id="taxPercent" type="number" min="0" max="100" value={form.taxPercent} onChange={set('taxPercent')} />
            </div>
          </div>
          <Button type="submit" className="w-full">Save Job</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
