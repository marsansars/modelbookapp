import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Building2, Pencil, Check, X } from "lucide-react";
import { addAgency, getAgencies, deleteAgency, updateAgency } from "@/lib/store";
import { Agency, CurrencyCode, CURRENCIES, DEFAULT_NET_DAYS } from "@/lib/types";

interface Props {
  onChanged?: () => void;
}

export function ManageAgenciesDialog({ onChanged }: Props) {
  const [open, setOpen] = useState(false);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '', defaultAgentPercent: '', defaultCurrency: 'USD' as CurrencyCode, defaultNetDays: '',
  });
  const [form, setForm] = useState({
    name: '', defaultAgentPercent: '20', defaultCurrency: 'USD' as CurrencyCode, defaultNetDays: String(DEFAULT_NET_DAYS),
  });

  const reload = async () => setAgencies(await getAgencies());

  const handleOpen = async (o: boolean) => {
    setOpen(o);
    if (o) await reload();
    else setEditingId(null);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    await addAgency({
      name: form.name.trim(),
      defaultAgentPercent: parseFloat(form.defaultAgentPercent) || 20,
      defaultCurrency: form.defaultCurrency,
      defaultNetDays: parseInt(form.defaultNetDays) || DEFAULT_NET_DAYS,
    });
    setForm({ name: '', defaultAgentPercent: '20', defaultCurrency: 'USD', defaultNetDays: String(DEFAULT_NET_DAYS) });
    await reload();
    onChanged?.();
  };

  const handleDelete = async (id: string) => {
    await deleteAgency(id);
    await reload();
    onChanged?.();
  };

  const startEdit = (a: Agency) => {
    setEditingId(a.id);
    setEditForm({
      name: a.name,
      defaultAgentPercent: String(a.defaultAgentPercent),
      defaultCurrency: a.defaultCurrency,
      defaultNetDays: String(a.defaultNetDays),
    });
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async () => {
    if (!editingId || !editForm.name.trim()) return;
    await updateAgency(editingId, {
      name: editForm.name.trim(),
      defaultAgentPercent: parseFloat(editForm.defaultAgentPercent) || 0,
      defaultCurrency: editForm.defaultCurrency,
      defaultNetDays: parseInt(editForm.defaultNetDays) || DEFAULT_NET_DAYS,
    });
    setEditingId(null);
    await reload();
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
              <div key={a.id}>
                {editingId === a.id ? (
                  <div className="p-3 rounded-md bg-secondary/50 space-y-3">
                    <div>
                      <Label>Agency Name</Label>
                      <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label>Agent %</Label>
                        <Input type="number" min="0" max="100" value={editForm.defaultAgentPercent} onChange={e => setEditForm(f => ({ ...f, defaultAgentPercent: e.target.value }))} />
                      </div>
                      <div>
                        <Label>Currency</Label>
                        <Select value={editForm.defaultCurrency} onValueChange={v => setEditForm(f => ({ ...f, defaultCurrency: v as CurrencyCode }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(CURRENCIES).map(([code, { symbol }]) => (
                              <SelectItem key={code} value={code}>{symbol} {code}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Net Days</Label>
                        <Input type="number" min="1" value={editForm.defaultNetDays} onChange={e => setEditForm(f => ({ ...f, defaultNetDays: e.target.value }))} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="gap-1" onClick={saveEdit}><Check className="h-3.5 w-3.5" /> Save</Button>
                      <Button size="sm" variant="ghost" className="gap-1" onClick={cancelEdit}><X className="h-3.5 w-3.5" /> Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 rounded-md bg-secondary/50">
                    <div>
                      <p className="font-medium text-foreground">{a.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.defaultAgentPercent}% fee · {CURRENCIES[a.defaultCurrency].symbol} {a.defaultCurrency} · Net {a.defaultNetDays}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={() => startEdit(a)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => handleDelete(a.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
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
