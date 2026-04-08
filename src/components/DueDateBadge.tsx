import { getDaysUntilDue } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

export function DueDateBadge({ jobDate, status, netDays }: { jobDate: string; status: string; netDays?: number }) {
  if (status === 'paid') return <Badge className="bg-success/20 text-success border-success/30">Paid</Badge>;

  const days = getDaysUntilDue(jobDate, netDays);

  if (days < 0) return <Badge className="bg-destructive/20 text-destructive border-destructive/30">Overdue {Math.abs(days)}d</Badge>;
  if (days <= 7) return <Badge className="bg-warning/20 text-warning border-warning/30">Due in {days}d</Badge>;
  return <Badge className="bg-info/20 text-info border-info/30">Due in {days}d</Badge>;
}
