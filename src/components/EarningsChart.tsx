import { useMemo, useState } from "react";
import { Job, CurrencyCode, calculateJobBreakdown, CURRENCIES } from "@/lib/types";
import { convertAmount, formatCurrency } from "@/lib/currency";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
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

  const data = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const filtered = jobs.filter(j => {
      const d = new Date(j.jobDate);
      if (period === "this_year") return d.getFullYear() === year;
      if (period === "last_year") return d.getFullYear() === year - 1;
      return d.getFullYear() === year && d.getMonth() === month;
    });

    if (period === "this_month") {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const weeks: { label: string; gross: number; net: number }[] = [];
      for (let w = 0; w < Math.ceil(daysInMonth / 7); w++) {
        const start = w * 7 + 1;
        const end = Math.min(start + 6, daysInMonth);
        const weekJobs = filtered.filter(j => {
          const day = new Date(j.jobDate).getDate();
          return day >= start && day <= end;
        });
        weeks.push({
          label: `${start}-${end}`,
          gross: weekJobs.reduce((s, j) => s + conv(j.rate, j.currency), 0),
          net: weekJobs.reduce((s, j) => s + conv(calculateJobBreakdown(j.rate, j.agentPercent, j.taxPercent).netPay, j.currency), 0),
        });
      }
      return weeks;
    }

    const months = Array.from({ length: 12 }, (_, i) => {
      const monthJobs = filtered.filter(j => new Date(j.jobDate).getMonth() === i);
      return {
        label: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
        gross: monthJobs.reduce((s, j) => s + conv(j.rate, j.currency), 0),
        net: monthJobs.reduce((s, j) => s + conv(calculateJobBreakdown(j.rate, j.agentPercent, j.taxPercent).netPay, j.currency), 0),
      };
    });
    return months;
  }, [jobs, period, displayCur, rates]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
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
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={50}
            tickFormatter={v => {
              if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
              return v;
            }}
          />
          <Tooltip
            contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
            formatter={(value: number, name: string) => [fmt(value), name === 'gross' ? 'Gross' : 'Net']}
          />
          <Bar dataKey="gross" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} opacity={0.3} />
          <Bar dataKey="net" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground justify-center">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-primary/30 inline-block" /> Gross</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-primary inline-block" /> Net</span>
      </div>
    </div>
  );
}
