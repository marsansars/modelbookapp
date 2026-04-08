import { useMemo, useState } from "react";
import { Job, CurrencyCode, calculateJobBreakdown } from "@/lib/types";
import { convertAmount, formatCurrency } from "@/lib/currency";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Period = "this_year" | "last_year" | "this_month";

interface Props {
  jobs: Job[];
  displayCur: CurrencyCode;
  rates: Record<string, number>;
}

export function EarningsChart({ jobs, displayCur, rates }: Props) {
  const [period, setPeriod] = useState<Period>("this_year");

  const conv = (n: number, from: CurrencyCode) => convertAmount(n, from, displayCur, rates);
  const fmt = (n: number) => formatCurrency(n, displayCur);

  const { totalGross, totalNet, jobCount, rows } = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const filtered = jobs.filter(j => {
      const d = new Date(j.jobDate);
      if (period === "this_year") return d.getFullYear() === year;
      if (period === "last_year") return d.getFullYear() === year - 1;
      return d.getFullYear() === year && d.getMonth() === month;
    });

    const totalGross = filtered.reduce((s, j) => s + conv(j.rate, j.currency), 0);
    const totalNet = filtered.reduce((s, j) => s + conv(calculateJobBreakdown(j.rate, j.agentPercent, j.taxPercent).netPay, j.currency), 0);

    // Build monthly or weekly rows
    let rows: { label: string; gross: number; net: number }[];
    if (period === "this_month") {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      rows = [];
      for (let w = 0; w < Math.ceil(daysInMonth / 7); w++) {
        const start = w * 7 + 1;
        const end = Math.min(start + 6, daysInMonth);
        const weekJobs = filtered.filter(j => {
          const day = new Date(j.jobDate).getDate();
          return day >= start && day <= end;
        });
        const g = weekJobs.reduce((s, j) => s + conv(j.rate, j.currency), 0);
        const n = weekJobs.reduce((s, j) => s + conv(calculateJobBreakdown(j.rate, j.agentPercent, j.taxPercent).netPay, j.currency), 0);
        if (g > 0) rows.push({ label: `${start}–${end}`, gross: g, net: n });
      }
    } else {
      rows = [];
      const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      for (let i = 0; i < 12; i++) {
        const monthJobs = filtered.filter(j => new Date(j.jobDate).getMonth() === i);
        const g = monthJobs.reduce((s, j) => s + conv(j.rate, j.currency), 0);
        const n = monthJobs.reduce((s, j) => s + conv(calculateJobBreakdown(j.rate, j.agentPercent, j.taxPercent).netPay, j.currency), 0);
        if (g > 0) rows.push({ label: labels[i], gross: g, net: n });
      }
    }

    return { totalGross, totalNet, jobCount: filtered.length, rows };
  }, [jobs, period, displayCur, rates]);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-heading text-lg font-semibold">Earnings</h2>
        <Select value={period} onValueChange={v => setPeriod(v as Period)}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="this_year">This Year</SelectItem>
            <SelectItem value="last_year">Last Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="rounded-lg bg-secondary/50 p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Gross</p>
          <p className="text-xl font-heading font-semibold text-foreground">{fmt(totalGross)}</p>
        </div>
        <div className="rounded-lg bg-primary/10 p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Net</p>
          <p className="text-xl font-heading font-semibold text-primary">{fmt(totalNet)}</p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-2">{jobCount} job{jobCount !== 1 ? 's' : ''} in period</p>

      {/* Breakdown rows */}
      {rows.length > 0 && (
        <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
          {rows.map(r => (
            <div key={r.label} className="flex items-center justify-between text-sm py-1.5 px-2 rounded-md bg-secondary/30">
              <span className="text-muted-foreground font-medium">{r.label}</span>
              <div className="flex gap-6">
                <span className="text-foreground/70 w-24 text-right">{fmt(r.gross)}</span>
                <span className="font-medium text-primary w-24 text-right">{fmt(r.net)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {rows.length > 0 && (
        <div className="flex justify-end gap-6 mt-1.5 text-[10px] text-muted-foreground/60 pr-2">
          <span className="w-24 text-right">Gross</span>
          <span className="w-24 text-right">Net</span>
        </div>
      )}
    </div>
  );
}
