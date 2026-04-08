import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus } from "lucide-react";
import { addExpense, getJobs } from "@/lib/store";
import { Expense, ExpenseCategory, EXPENSE_CATEGORIES, CurrencyCode, CURRENCIES, Job } from "@/lib/types";

interface Props {
  onAdded: () => void;
  defaultJobId?: string;
}

export function AddExpenseDialog({ onAdded, defaultJobId }: Props) {
  const [open, setOpen] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [form, setForm] = useState({
    date: '', category: 'meals' as ExpenseCategory, description: '', amount: '',
    currency: 'USD' as CurrencyCode, jobId: defaultJobId || '', reimbursable: false,
  });

  const handleOpen = (o: boolean) => {
    setOpen(o);
    if (o) setJobs(getJobs());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const expense: Expense = {
      id: crypto.randomUUID(),
      date: form.date,
      category: form.category,
      description: form.description.trim(),
      amount: parseFloat(form.amount) || 0,
      currency: form.currency,
      jobId: form.jobId || undefined,
      reimbursable: form.reimbursable,
      reimbursed: false,
    };
    addExpense(expense);
    setForm({ date: '', category: 'meals', description: '', amount: '', currency: form.currency, jobId: defaultJobId || '', reimbursable: false });
    setOpen(false);
    onAdded();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="h-4 w-4" /> Add Expense</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">New Expense</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="expDate">Date</Label>
            <Input id="expDate" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v as ExpenseCategory }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="expDesc">Description</Label>
            <Input id="expDesc" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Uber to set" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="expAmt">Amount</Label>
              <Input id="expAmt" type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
            </div>
            <div>
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v as CurrencyCode }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CURRENCIES).map(([code, { symbol }]) => (
                    <SelectItem key={code} value={code}>{symbol} {code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!defaultJobId && (
            <div>
              <Label>Link to Job (optional)</Label>
              <Select value={form.jobId || '_none'} onValueChange={v => setForm(f => ({ ...f, jobId: v === '_none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="No job linked" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">No job linked</SelectItem>
                  {jobs.map(j => (
                    <SelectItem key={j.id} value={j.id}>{j.client} — {j.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Checkbox
              id="reimbursable"
              checked={form.reimbursable}
              onCheckedChange={v => setForm(f => ({ ...f, reimbursable: !!v }))}
            />
            <Label htmlFor="reimbursable" className="text-sm cursor-pointer">This expense is reimbursable</Label>
          </div>

          <Button type="submit" className="w-full">Save Expense</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
