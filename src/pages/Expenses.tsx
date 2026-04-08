import { useEffect, useState } from "react";
import { format } from "date-fns";
import { getExpenses, deleteExpense } from "@/lib/store";
import { Expense, EXPENSE_CATEGORIES } from "@/lib/types";
import { AddExpenseDialog } from "@/components/AddExpenseDialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { motion } from "framer-motion";

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const reload = () => setExpenses(getExpenses());
  useEffect(reload, []);

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  const byCategory = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-semibold">Expenses</h1>
          <p className="text-muted-foreground mt-1">Track every dollar you spend on the job.</p>
        </div>
        <AddExpenseDialog onAdded={reload} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(byCategory).map(([cat, amt]) => (
          <div key={cat} className="glass-card p-4 text-center">
            <p className="text-2xl">{EXPENSE_CATEGORIES[cat as keyof typeof EXPENSE_CATEGORIES]?.icon}</p>
            <p className="text-xs text-muted-foreground mt-1">{EXPENSE_CATEGORIES[cat as keyof typeof EXPENSE_CATEGORIES]?.label}</p>
            <p className="font-heading font-semibold text-foreground mt-1">{fmt(amt)}</p>
          </div>
        ))}
        {expenses.length > 0 && (
          <div className="glass-card p-4 text-center gold-glow">
            <p className="text-2xl">💰</p>
            <p className="text-xs text-muted-foreground mt-1">Total Expenses</p>
            <p className="font-heading font-semibold text-primary mt-1">{fmt(total)}</p>
          </div>
        )}
      </div>

      {expenses.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-muted-foreground">No expenses tracked yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((exp, i) => (
            <motion.div
              key={exp.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="glass-card p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{EXPENSE_CATEGORIES[exp.category]?.icon}</span>
                <div>
                  <p className="font-medium text-foreground">{exp.description || EXPENSE_CATEGORIES[exp.category]?.label}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(exp.date), 'MMM d, yyyy')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium text-foreground">{fmt(exp.amount)}</span>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => { deleteExpense(exp.id); reload(); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
