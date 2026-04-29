import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  TaxPayment, getTaxPayments, addTaxPayment, deleteTaxPayment,
} from "@/lib/store";
import { CurrencyCode, CURRENCIES, parseLocalDate } from "@/lib/types";
import { convertAmount, formatCurrency } from "@/lib/currency";
import { CurrencySelector } from "@/components/CurrencySelector";

interface Props {
  recommendedTaxThisYear: number; // already converted to displayCur
  displayCur: CurrencyCode;
  rates: Record<string, number>;
  onChange?: (totalPaidConverted: number) => void;
}

const QUARTER_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: "Q1 · Jan–Mar",
  2: "Q2 · Apr–May",
  3: "Q3 · Jun–Aug",
  4: "Q4 · Sep–Dec",
};

const QUARTER_DUE: Record<1 | 2 | 3 | 4, string> = {
  1: "Due Apr 15",
  2: "Due Jun 15",
  3: "Due Sep 15",
  4: "Due Jan 15",
};

export function QuarterlyTaxPayments({
  recommendedTaxThisYear, displayCur, rates, onChange,
}: Props) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);
  const [payments, setPayments] = useState<TaxPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formQuarter, setFormQuarter] = useState<1 | 2 | 3 | 4>(1);
  const [formAmount, setFormAmount] = useState("");
  const [formCurrency, setFormCurrency] = useState<CurrencyCode>(displayCur);
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formNotes, setFormNotes] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await getTaxPayments();
      setPayments(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const yearPayments = useMemo(
    () => payments.filter(p => p.year === year),
    [payments, year]
  );

  const totalsByQuarter = useMemo(() => {
    const totals: Record<1 | 2 | 3 | 4, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const p of yearPayments) {
      totals[p.quarter] += convertAmount(p.amount, p.currency, displayCur, rates);
    }
    return totals;
  }, [yearPayments, displayCur, rates]);

  const totalPaid = totalsByQuarter[1] + totalsByQuarter[2] + totalsByQuarter[3] + totalsByQuarter[4];

  useEffect(() => {
    onChange?.(totalPaid);
  }, [totalPaid, onChange]);

  const remaining = Math.max(0, recommendedTaxThisYear - totalPaid);

  const availableYears = useMemo(() => {
    const years = new Set<number>([currentYear, currentYear - 1]);
    payments.forEach(p => years.add(p.year));
    return Array.from(years).sort((a, b) => b - a);
  }, [payments, currentYear]);

  const openAdd = (q: 1 | 2 | 3 | 4) => {
    setFormQuarter(q);
    setFormAmount("");
    setFormCurrency(displayCur);
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormNotes("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const amt = Number(formAmount);
    if (!isFinite(amt) || amt <= 0) return;
    await addTaxPayment({
      year,
      quarter: formQuarter,
      amount: amt,
      currency: formCurrency,
      paymentDate: formDate,
      notes: formNotes || null,
    });
    setDialogOpen(false);
    await load();
  };

  const handleDelete = async (id: string) => {
    await deleteTaxPayment(id);
    await load();
  };

  const fmt = (n: number) => formatCurrency(n, displayCur);

  return (
    <motion.div
      id="quarterly-taxes"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="glass-card p-6 scroll-mt-24"
    >
      <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
        <div>
          <h2 className="font-heading text-lg font-semibold">Quarterly Tax Payments</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Track estimated tax payments by quarter. Payments reduce your remaining tax planning.
          </p>
        </div>
        <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
          <SelectTrigger className="w-32 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableYears.map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3 mb-5 p-3 rounded-md bg-muted/30 border border-border">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Recommended ({year})</p>
          <p className="font-heading font-semibold mt-0.5">{fmt(recommendedTaxThisYear)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Paid</p>
          <p className="font-heading font-semibold text-success mt-0.5">{fmt(totalPaid)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Remaining</p>
          <p className="font-heading font-semibold text-primary mt-0.5">{fmt(remaining)}</p>
        </div>
      </div>

      {/* Quarter cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {([1, 2, 3, 4] as const).map(q => {
          const qPayments = yearPayments.filter(p => p.quarter === q);
          return (
            <div key={q} className="rounded-md border border-border p-3 flex flex-col">
              <div className="flex items-baseline justify-between">
                <p className="font-heading font-semibold text-sm">{QUARTER_LABELS[q]}</p>
              </div>
              <p className="text-[10px] text-muted-foreground">{QUARTER_DUE[q]}</p>
              <p className="font-heading text-xl font-semibold mt-2">{fmt(totalsByQuarter[q])}</p>

              <div className="flex-1 mt-2 space-y-1">
                {qPayments.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No payments yet</p>
                ) : qPayments.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-xs gap-2 group">
                    <div className="min-w-0 flex-1">
                      <p className="truncate">
                        {formatCurrency(p.amount, p.currency)}
                        <span className="text-muted-foreground ml-1.5">
                          {parseLocalDate(p.paymentDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </p>
                      {p.notes && <p className="truncate text-muted-foreground text-[10px]">{p.notes}</p>}
                    </div>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      aria-label="Delete payment"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                className="mt-3 h-8 text-xs"
                onClick={() => openAdd(q)}
              >
                <Plus className="h-3 w-3 mr-1" /> Add Payment
              </Button>
            </div>
          );
        })}
      </div>

      {loading && <p className="text-xs text-muted-foreground mt-4">Loading…</p>}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">
              Add {QUARTER_LABELS[formQuarter]} Payment · {year}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Quarter</Label>
                <Select value={String(formQuarter)} onValueChange={v => setFormQuarter(Number(v) as 1 | 2 | 3 | 4)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {([1, 2, 3, 4] as const).map(q => (
                      <SelectItem key={q} value={String(q)}>{QUARTER_LABELS[q]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Date Paid</Label>
                <Input
                  type="date"
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <div>
                <Label className="text-xs">Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={formAmount}
                  onChange={e => setFormAmount(e.target.value)}
                  className="mt-1"
                  autoFocus
                />
              </div>
              <div>
                <Label className="text-xs">Currency</Label>
                <div className="mt-1">
                  <CurrencySelector value={formCurrency} onChange={setFormCurrency} />
                </div>
              </div>
            </div>
            <div>
              <Label className="text-xs">Notes (optional)</Label>
              <Input
                placeholder="e.g. IRS Form 1040-ES"
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                className="mt-1"
                maxLength={200}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!formAmount || Number(formAmount) <= 0}>
              <Calendar className="h-4 w-4 mr-1.5" /> Save Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
