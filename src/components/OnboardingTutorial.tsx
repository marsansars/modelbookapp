import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, Receipt, LayoutDashboard, Building2, BookOpen, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";

interface Props {
  open: boolean;
  onComplete: () => void;
}

const steps = [
  {
    icon: Sparkles,
    title: "Welcome to ModelBook!",
    description: "Your personal finance tracker built for models. Let's walk you through the key features so you can hit the ground running.",
    tips: [
      "Track every job, expense, and payment in one place",
      "See what you're owed and what's overdue at a glance",
      "Export data for your accountant at tax time",
    ],
  },
  {
    icon: Briefcase,
    title: "Jobs & Bookings",
    description: "Add every job you book — editorial shoots, campaigns, fittings, and more.",
    tips: [
      "Add multiple rate lines for multi-day jobs (e.g. 3 shoot days + 1 fitting)",
      "Track payment status: pending → invoiced → paid",
      "Attach call sheets, receipts, and statements to each job",
      "Add notes with job details like call time and location",
    ],
  },
  {
    icon: Building2,
    title: "Agencies",
    description: "Set up your agencies with their default commission rates and currencies.",
    tips: [
      "Each agency stores its default agent %, currency, and net days",
      "When you add a job, selecting an agency auto-fills these fields",
      "You can work with multiple agencies or book direct",
    ],
  },
  {
    icon: Receipt,
    title: "Expenses",
    description: "Log every business expense and link them to specific jobs.",
    tips: [
      "Categorize expenses: meals, transport, flights, wardrobe, etc.",
      "Mark expenses as reimbursable to track what agencies owe you",
      "Non-reimbursable expenses become tax write-offs",
      "Attach receipt photos for your records",
    ],
  },
  {
    icon: LayoutDashboard,
    title: "Dashboard",
    description: "Your financial overview at a glance.",
    tips: [
      "See current owed, payments received, and total earnings",
      "Track estimated tax you should set aside",
      "View earnings charts and payment status breakdowns",
      "Switch display currency to see everything converted",
    ],
  },
  {
    icon: BookOpen,
    title: "Bookkeeping",
    description: "Export your data when you need it.",
    tips: [
      "Export jobs and expenses as CSV for your accountant",
      "Filter by date range for quarterly or annual reports",
      "All currency conversions included in exports",
    ],
  },
];

export function OnboardingTutorial({ open, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const current = steps[step];
  const isLast = step === steps.length - 1;
  const isFirst = step === 0;
  const Icon = current.icon;

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-md p-0 overflow-hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <div className="p-6 space-y-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-heading font-semibold text-lg text-foreground">{current.title}</h2>
                  <p className="text-xs text-muted-foreground">Step {step + 1} of {steps.length}</p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground font-body">{current.description}</p>

              <ul className="space-y-2">
                {current.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="text-primary mt-0.5">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </AnimatePresence>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep(s => s - 1)}
              disabled={isFirst}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>

            {isLast ? (
              <Button size="sm" onClick={onComplete} className="gap-1">
                Get Started <Sparkles className="h-4 w-4" />
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={onComplete} className="text-muted-foreground text-xs">
                  Skip
                </Button>
                <Button size="sm" onClick={() => setStep(s => s + 1)} className="gap-1">
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
