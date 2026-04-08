import { useMemo } from "react";
import { Job, CurrencyCode, calculateJobBreakdown, getDaysUntilDue } from "@/lib/types";
import { convertAmount, formatCurrency } from "@/lib/currency";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface Props {
  jobs: Job[];
  displayCur: CurrencyCode;
  rates: Record<string, number>;
}

const COLORS = {
  paid: 'hsl(var(--success))',
  due: 'hsl(var(--primary))',
  almostDue: 'hsl(var(--warning))',
  overdue: 'hsl(var(--destructive))',
};

export function PaymentStatusChart({ jobs, displayCur, rates }: Props) {
  const conv = (n: number, from: CurrencyCode) => convertAmount(n, from, displayCur, rates);
  const fmt = (n: number) => formatCurrency(n, displayCur);

  const buckets = useMemo(() => {
    let paid = 0, due = 0, almostDue = 0, overdue = 0;
    let paidCount = 0, dueCount = 0, almostCount = 0, overdueCount = 0;

    for (const j of jobs) {
      const net = conv(calculateJobBreakdown(j.rate, j.agentPercent, j.taxPercent).netPay, j.currency);
      if (j.status === 'paid') { paid += net; paidCount++; continue; }
      const days = getDaysUntilDue(j.jobDate, j.netDays);
      if (days < 0) { overdue += net; overdueCount++; }
      else if (days <= 14) { almostDue += net; almostCount++; }
      else { due += net; dueCount++; }
    }

    return [
      { name: 'Paid', value: paid, color: COLORS.paid, count: paidCount },
      { name: 'Due (>14 days)', value: due, color: COLORS.due, count: dueCount },
      { name: 'Almost Due (≤14 days)', value: almostDue, color: COLORS.almostDue, count: almostCount },
      { name: 'Overdue', value: overdue, color: COLORS.overdue, count: overdueCount },
    ].filter(b => b.value > 0);
  }, [jobs, displayCur, rates]);

  if (buckets.length === 0) {
    return (
      <div>
        <h2 className="font-heading text-lg font-semibold mb-4">Payment Status</h2>
        <p className="text-muted-foreground text-sm">No jobs to display.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-heading text-lg font-semibold mb-4">Payment Status</h2>
      <div className="flex items-center gap-4">
        <ResponsiveContainer width={160} height={160}>
          <PieChart>
            <Pie data={buckets} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} strokeWidth={0}>
              {buckets.map((b, i) => <Cell key={i} fill={b.color} />)}
            </Pie>
            <Tooltip
              contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12, color: 'hsl(var(--foreground))' }}
              itemStyle={{ color: 'hsl(var(--foreground))' }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={(value: number) => [fmt(value)]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-2">
          {buckets.map(b => (
            <div key={b.name} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: b.color }} />
                <span className="text-muted-foreground">{b.name}</span>
                <span className="text-xs text-muted-foreground/60">({b.count})</span>
              </span>
              <span className="font-medium">{fmt(b.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
