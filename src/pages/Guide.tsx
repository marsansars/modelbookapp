import { Button } from "@/components/ui/button";
import { startTour } from "@/lib/tour-controller";
import {
  Briefcase, Receipt, LayoutDashboard, Building2, BookOpen,
  Sparkles, FileCheck,
} from "lucide-react";

const sections = [
  {
    icon: Briefcase,
    title: "Jobs",
    blurb: "Every booking — rates, status, attachments.",
  },
  {
    icon: Building2,
    title: "Agencies",
    blurb: "Defaults that auto-fill new jobs.",
  },
  {
    icon: Receipt,
    title: "Expenses",
    blurb: "Reimbursable or tax write-off, linked to a job.",
  },
  {
    icon: LayoutDashboard,
    title: "Dashboard",
    blurb: "Owed, received, tax — at a glance.",
  },
  {
    icon: FileCheck,
    title: "Invoices",
    blurb: "PDF invoices when you bill direct.",
  },
  {
    icon: BookOpen,
    title: "Bookkeeping",
    blurb: "CSV and Excel exports for your accountant.",
  },
];

export default function Guide() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-heading font-semibold">Guide</h1>
        <p className="text-muted-foreground mt-1 font-body">
          Take the interactive tour to see exactly where everything lives.
        </p>
      </div>

      {/* Hero CTA */}
      <button
        onClick={startTour}
        className="w-full glass-card p-6 sm:p-8 flex items-center gap-5 text-left hover:border-primary/40 transition-all group"
      >
        <div className="h-14 w-14 rounded-xl bg-primary/15 flex items-center justify-center shrink-0 group-hover:bg-primary/25 transition-colors">
          <Sparkles className="h-7 w-7 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-heading font-semibold text-xl text-foreground">
            Start the interactive tour
          </h2>
          <p className="text-sm text-muted-foreground font-body mt-1">
            10 quick stops. Each one points to the exact spot in the app.
          </p>
        </div>
        <Button className="gap-2 shrink-0 hidden sm:inline-flex">
          Start <Sparkles className="h-4 w-4" />
        </Button>
      </button>

      {/* What's inside */}
      <div>
        <h2 className="text-sm font-body uppercase tracking-wider text-muted-foreground mb-4">
          What you'll see
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sections.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.title}
                className="glass-card p-4 flex items-center gap-3"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-heading font-medium text-foreground text-sm">{s.title}</h3>
                  <p className="text-xs text-muted-foreground font-body">{s.blurb}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
