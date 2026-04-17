import type { TourStep } from "@/components/SpotlightTour";

/**
 * Steps reference real DOM elements via `data-tour` attributes.
 * Add `data-tour="<name>"` to any element you want highlighted.
 */
export const tourSteps: TourStep[] = [
  {
    title: "Welcome to ModelBook",
    body: "A quick tour to show you where everything lives. Use the arrow keys or the buttons.",
    route: "/",
  },
  {
    selector: '[data-tour="nav-jobs"]',
    route: "/",
    title: "Jobs",
    body: "Every booking lives here — rates, agency, payment status, and attachments.",
  },
  {
    selector: '[data-tour="jobs-add"]',
    route: "/jobs",
    title: "Add a job",
    body: "Log a new booking. Pick an agency and the commission, currency, and net days auto-fill.",
  },
  {
    selector: '[data-tour="nav-agencies"]',
    route: "/jobs",
    title: "Agencies",
    body: "Set each agency's default commission, currency, and payment terms once — reused on every job.",
  },
  {
    selector: '[data-tour="nav-expenses"]',
    route: "/agencies",
    title: "Expenses",
    body: "Log business expenses, mark them reimbursable or as tax write-offs, and link them to a job.",
  },
  {
    selector: '[data-tour="nav-invoices"]',
    route: "/expenses",
    title: "Invoices (optional)",
    body: "Generate PDF invoices when you bill a client directly.",
  },
  {
    selector: '[data-tour="nav-dashboard"]',
    route: "/expenses",
    title: "Dashboard",
    body: "Your money at a glance: owed, received, tax to set aside, and total earnings.",
  },
  {
    selector: '[data-tour="dash-currency"]',
    route: "/",
    title: "Display currency",
    body: "Convert every figure on the dashboard into your preferred currency in one click.",
  },
  {
    selector: '[data-tour="dash-chase"]',
    route: "/",
    title: "Chase Payment",
    body: "When a job goes overdue, tap here to draft a polite follow-up email to the agency or the client in seconds.",
  },
  {
    selector: '[data-tour="nav-bookkeeping"]',
    route: "/",
    title: "Bookkeeping",
    body: "Export jobs and expenses as CSV and Excel for your accountant — filtered by any date range.",
  },
  {
    selector: '[data-tour="nav-guide"]',
    route: "/",
    title: "Need a refresher?",
    body: "The Guide page lets you replay this tour anytime.",
  },
  {
    selector: '[data-tour="feedback-button"]',
    route: "/",
    title: "Give feedback",
    body: "Spotted a bug or have an idea? Tap this floating button anywhere in the app to send it straight to us — screenshot included.",
  },
];
