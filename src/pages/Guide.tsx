import { Button } from "@/components/ui/button";
import { useState } from "react";
import { OnboardingTutorial } from "@/components/OnboardingTutorial";
import {
  Briefcase, Receipt, LayoutDashboard, Building2, BookOpen,
  Sparkles, HelpCircle, Plus, CalendarCheck, Paperclip, FileText
} from "lucide-react";

const sections = [
  {
    icon: Briefcase,
    title: "Jobs & Bookings",
    description: "Track every job you book and monitor payment status.",
    details: [
      "Go to the Jobs page and click 'Add Job' to log a new booking",
      "Select your agency to auto-fill commission rate, currency, and net days",
      "Use 'Add Line' to add multiple rate lines for multi-day jobs (e.g. 3 shoot days at different rates)",
      "The total rate is automatically calculated from all line items",
      "Add notes with job details like call time, location, and contacts",
      "Attach files and label them as Call Sheet, Receipt, or Statement",
      "Click 'Record Payment' when you get paid to track the payment date",
      "Expand a job to see linked expenses and attachments",
    ],
  },
  {
    icon: Building2,
    title: "Agencies",
    description: "Set up your agencies with default settings to save time.",
    details: [
      "Go to the Agencies page to add your mother agency or any booking agencies",
      "Set default agent commission %, preferred currency, and payment terms (net days)",
      "When adding a job, selecting an agency auto-fills these defaults",
      "You can always override defaults on individual jobs",
      "Use 'No agency (direct booking)' for jobs you book yourself",
    ],
  },
  {
    icon: Receipt,
    title: "Expenses",
    description: "Log business expenses and track reimbursements.",
    details: [
      "Add expenses from the Expenses page or directly from a job card",
      "Categorize each expense: meals, transport, flights, wardrobe, beauty, portfolio, etc.",
      "Mark expenses as 'Reimbursable' when your agency or client should pay you back",
      "Track reimbursement status — mark as reimbursed when you receive payment",
      "Non-reimbursable expenses are tracked as tax write-offs",
      "Link expenses to specific jobs to see the full cost of each booking",
    ],
  },
  {
    icon: LayoutDashboard,
    title: "Dashboard",
    description: "Your financial overview at a glance.",
    details: [
      "View four key stats: Current Owed, Payments Received, Tax Planning, and Total Earnings",
      "Click the first card to toggle between 'Current Owed' and 'Overdue' amounts",
      "The Estimated Tax Planning card shows how much you should set aside",
      "Use the currency selector to view all amounts converted to your preferred currency",
      "Charts show your earnings over time and payment status breakdown",
      "Expense breakdowns show pending reimbursements and tax write-offs",
    ],
  },
  {
    icon: BookOpen,
    title: "Bookkeeping & Exports",
    description: "Export your data for tax filing or your accountant.",
    details: [
      "Go to the Bookkeeping page to export jobs and expenses as CSV",
      "Filter by date range for quarterly or annual reporting",
      "All data exports include currency information and converted amounts",
      "Share CSV files directly with your accountant or bookkeeper",
    ],
  },
];

export default function Guide() {
  const [showTutorial, setShowTutorial] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-heading font-semibold">Guide</h1>
          <p className="text-muted-foreground mt-1">Everything you need to know about ModelBook.</p>
        </div>
        <Button className="gap-2" onClick={() => setShowTutorial(true)}>
          <Sparkles className="h-4 w-4" /> Replay Tutorial
        </Button>
      </div>

      <div className="space-y-4">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <details key={section.title} className="glass-card group">
              <summary className="flex items-center gap-3 p-5 cursor-pointer list-none">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading font-semibold text-foreground">{section.title}</h3>
                  <p className="text-sm text-muted-foreground">{section.description}</p>
                </div>
                <svg className="h-5 w-5 text-muted-foreground transition-transform group-open:rotate-180 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </summary>
              <div className="px-5 pb-5 pt-0">
                <ul className="space-y-2 ml-12">
                  {section.details.map((detail, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          );
        })}
      </div>

      <OnboardingTutorial open={showTutorial} onComplete={() => setShowTutorial(false)} />
    </div>
  );
}
