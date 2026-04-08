import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil } from "lucide-react";
import { updateExpense, getJobs, getAllExpenseCategories } from "@/lib/store";
import { Expense, ExpenseCategory, CurrencyCode, CURRENCIES, Job, ExpenseCategoryInfo } from "@/lib/types";

interface Props {
  expense: Expense;
  onUpdated: () => void;
}

export function EditExpenseDialog({ expense, onUpdated }: Props) {
  const [open, setOpen] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [categories, setCategories] = useState<Record<string, ExpenseCategoryInfo>>({});
  const [form, setForm] = useState({
    date: expense.date,
    category: expense.category,
    description: expense.description,
    amount: String(expense.amount),
    currency: expense.currency,
    jobId: expense.jobId || '',
    reimbursable: expense.reimbursable || false,
  });

  useEffect(() => {
    if (open) {
      Promise.all([getJobs(), getAllExpenseCategories()]).then(([j, c]) => {
        setJobs(j);
        setCategories(c);
      });
      setForm({
        date: expense.date,
        category: expense.category,
        description: expense.description,
        amount: String(expense.amount),
        currency: expense.currency,
        jobId: expense.jobId || '',
        reimbursable: expense.reimbursable || false,
      });
    }
  }, [open, expense]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateExpense(expense.id, {
      date: form.date,
      category: form.category,
      description: form.description.trim(),
      amount: parseFloat(form.amount) || 0,
      currency: form.currency,
      jobId: form.jobId || undefined,
      reimbursable: form.reimbursable,
    });
    setOpen(false);
    onUpdated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Edit Expense</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="edit-exp-date">Date</Label>
            <Input id="edit-exp-date" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v as ExpenseCategory }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(categories).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="edit-exp-desc">Description</Label>
            <Input id="edit-exp-desc" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="edit-exp-amt">Amount</Label>
              <Input id="edit-exp-amt" type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
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
          <div className="flex items-center gap-2">
            <Checkbox
              id="edit-reimbursable"
              checked={form.reimbursable}
              onCheckedChange={v => setForm(f => ({ ...f, reimbursable: !!v }))}
            />
            <Label htmlFor="edit-reimbursable" className="text-sm cursor-pointer">This expense is reimbursable</Label>
          </div>
          <Button type="submit" className="w-full">Save Changes</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
