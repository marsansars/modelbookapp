import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Building2 } from "lucide-react";
import { addAgency, getAgencies, deleteAgency } from "@/lib/store";
import { Agency, CurrencyCode, CURRENCIES, DEFAULT_NET_DAYS } from "@/lib/types";

interface Props {
  onChanged?: () => void;
}

export function ManageAgenciesDialog({ onChanged }: Props) {
  const [open, setOpen] = useState(false);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [form, setForm] = useState({
    name: '', defaultAgentPercent: '20', defaultCurrency: 'USD' as CurrencyCode, defaultNetDays: String(DEFAULT_NET_DAYS),
  });

  const reload = () => setAgencies(getAgencies());

  const handleOpen = (o: boolean) => {
    setOpen(o);
    if (o) reload();
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    addAgency({
      id: crypto.randomUUID(),
      name: form.name.trim(),
      defaultAgentPercent: parseFloat(form.defaultAgentPercent) || 20,
      defaultCurrency: form.defaultCurrency,
      defaultNetDays: parseInt(form.defaultNetDays) || DEFAULT_NET_DAYS,
    });
    setForm({ name: '', defaultAgentPercent: '20', defaultCurrency: 'USD', defaultNetDays: String(DEFAULT_NET_DAYS) });
    reload();
    onChanged?.();
  };

  const handleDelete = (id: string) => {
    deleteAgency(id);
    reload();
    onChanged?.();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2"><Building2 className="h-4 w-4" /> Agencies</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Manage Agencies</DialogTitle>
        </DialogHeader>

        {agencies.length > 0 && (
          <div className="space-y-2 mb-4">
            {agencies.map(a => (
              <div key={a.id} className="flex items-center justify-between p-3 rounded-md bg-secondary/50">
                <div>
                  <p className="font-medium text-foreground">{a.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.defaultAgentPercent}% fee · {CURRENCIES[a.defaultCurrency].symbol} {a.defaultCurrency} · Net {a.defaultNetDays}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => handleDelete(a.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleAdd} className="space-y-3 border-t border-border pt-4">
          <p className="text-sm font-medium text-foreground">Add New Agency</p>
          <div>
            <Label htmlFor="agencyName">Agency Name</Label>
            <Input id="agencyName" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. IMG Models, Storm" required />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="defAgent">Agent %</Label>
              <Input id="defAgent" type="number" min="0" max="100" value={form.defaultAgentPercent} onChange={e => setForm(f => ({ ...f, defaultAgentPercent: e.target.value }))} />
            </div>
            <div>
              <Label>Currency</Label>
              <Select value={form.defaultCurrency} onValueChange={v => setForm(f => ({ ...f, defaultCurrency: v as CurrencyCode }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CURRENCIES).map(([code, { symbol }]) => (
                    <SelectItem key={code} value={code}>{symbol} {code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="defNet">Net Days</Label>
              <Input id="defNet" type="number" min="1" value={form.defaultNetDays} onChange={e => setForm(f => ({ ...f, defaultNetDays: e.target.value }))} />
            </div>
          </div>
          <Button type="submit" className="w-full gap-2"><Plus className="h-4 w-4" /> Add Agency</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
