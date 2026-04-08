import { useMemo, useState } from "react";
import { Job, CurrencyCode, calculateJobBreakdown, parseLocalDate } from "@/lib/types";
import { convertAmount, formatCurrency } from "@/lib/currency";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Period = "this_year" | "last_year" | "this_month";

interface Props {
  jobs: Job[];
  displayCur: CurrencyCode;
  rates: Record<string, number>;
}

export function EarningsChart({ jobs, displayCur, rates }: Props) {
  const [period, setPeriod] = useState<Period>("this_year");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const conv = (n: number, from: CurrencyCode) => convertAmount(n, from, displayCur, rates);
  const fmt = (n: number) => formatCurrency(n, displayCur);

  const { totalGross, totalNet, jobCount, rows } = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const filtered = jobs.filter(j => {
      const d = parseLocalDate(j.jobDate);
      if (period === "this_year") return d.getFullYear() === year;
      if (period === "last_year") return d.getFullYear() === year - 1;
      return d.getFullYear() === year && d.getMonth() === month;
    });

    const totalGross = filtered.reduce((s, j) => s + conv(j.rate, j.currency), 0);
    const totalNet = filtered.reduce((s, j) => s + conv(calculateJobBreakdown(j.rate, j.agentPercent, j.taxPercent).netPay, j.currency), 0);

    let rows: { label: string; gross: number; net: number }[];
    if (period === "this_month") {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      rows = [];
      for (let w = 0; w < Math.ceil(daysInMonth / 7); w++) {
        const start = w * 7 + 1;
        const end = Math.min(start + 6, daysInMonth);
        const weekJobs = filtered.filter(j => {
          const day = parseLocalDate(j.jobDate).getDate();
          return day >= start && day <= end;
        });
        rows.push({
          label: `${start}–${end}`,
          gross: weekJobs.reduce((s, j) => s + conv(j.rate, j.currency), 0),
          net: weekJobs.reduce((s, j) => s + conv(calculateJobBreakdown(j.rate, j.agentPercent, j.taxPercent).netPay, j.currency), 0),
        });
      }
    } else {
      const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      rows = labels.map((label, i) => {
        const monthJobs = filtered.filter(j => parseLocalDate(j.jobDate).getMonth() === i);
        return {
          label,
          gross: monthJobs.reduce((s, j) => s + conv(j.rate, j.currency), 0),
          net: monthJobs.reduce((s, j) => s + conv(calculateJobBreakdown(j.rate, j.agentPercent, j.taxPercent).netPay, j.currency), 0),
        };
      });
    }

    return { totalGross, totalNet, jobCount: filtered.length, rows };
  }, [jobs, period, displayCur, rates]);

  // Reset selection when period changes
  const handlePeriodChange = (v: string) => {
    setPeriod(v as Period);
    setSelectedIndex(null);
  };

  const handleBarClick = (_: unknown, index: number) => {
    setSelectedIndex(prev => prev === index ? null : index);
  };

  const displayGross = selectedIndex !== null ? rows[selectedIndex]?.gross ?? totalGross : totalGross;
  const displayNet = selectedIndex !== null ? rows[selectedIndex]?.net ?? totalNet : totalNet;
  const displayLabel = selectedIndex !== null ? rows[selectedIndex]?.label : (period === "this_year" ? "Full Year" : period === "last_year" ? "Full Year" : "Full Month");

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading text-lg font-semibold">Earnings</h2>
        <Select value={period} onValueChange={handlePeriodChange}>
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

      {/* Interactive chart */}
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={rows} margin={{ top: 5, right: 0, left: 0, bottom: 0 }} onClick={(e) => {
          if (e && e.activeTooltipIndex !== undefined) {
            handleBarClick(null, e.activeTooltipIndex);
          }
        }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Bar dataKey="net" radius={[3, 3, 0, 0]} cursor="pointer">
            {rows.map((_, i) => (
              <Cell
                key={i}
                fill={selectedIndex === i ? 'hsl(var(--primary))' : 'hsl(var(--primary))'}
                opacity={selectedIndex === null ? 0.7 : selectedIndex === i ? 1 : 0.25}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Summary boxes */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="rounded-lg bg-secondary/50 p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Gross</p>
          <p className="text-xl font-heading font-semibold text-foreground">{fmt(displayGross)}</p>
        </div>
        <div className="rounded-lg bg-primary/10 p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Net</p>
          <p className="text-xl font-heading font-semibold text-primary">{fmt(displayNet)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-2 px-1">
        <p className="text-xs text-muted-foreground">
          {selectedIndex !== null ? (
            <button onClick={() => setSelectedIndex(null)} className="text-primary hover:underline">
              ← Show {period === "this_month" ? "full month" : "full year"}
            </button>
          ) : (
            `${jobCount} job${jobCount !== 1 ? 's' : ''} in period`
          )}
        </p>
        {selectedIndex !== null && (
          <p className="text-xs font-medium text-muted-foreground">{displayLabel}</p>
        )}
      </div>
    </div>
  );
}
