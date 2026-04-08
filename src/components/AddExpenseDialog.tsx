import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { addExpense } from "@/lib/store";
import { Expense, ExpenseCategory, EXPENSE_CATEGORIES, CurrencyCode, CURRENCIES } from "@/lib/types";

interface Props {
  onAdded: () => void;
}

export function AddExpenseDialog({ onAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    date: '', category: 'meals' as ExpenseCategory, description: '', amount: '', currency: 'USD' as CurrencyCode,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const expense: Expense = {
      id: crypto.randomUUID(),
      date: form.date,
      category: form.category,
      description: form.description.trim(),
      amount: parseFloat(form.amount) || 0,
      currency: form.currency,
    };
    addExpense(expense);
    setForm({ date: '', category: 'meals', description: '', amount: '', currency: form.currency });
    setOpen(false);
    onAdded();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="h-4 w-4" /> Add Expense</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
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
          <Button type="submit" className="w-full">Save Expense</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
