# Sync Paid Status: Jobs ↔ Invoices

Today, a job and its invoice track payment independently. Marking a job paid (Dashboard "Record Payment" or Jobs tab toggle) doesn't update the invoice, and marking an invoice paid (Invoices tab) doesn't update the job. This plan links them so any one of those three places stays in sync with the others.

## Behavior

**When a job is marked paid** (from Dashboard's Record Payment dialog or the Jobs tab toggle):
- All invoices linked to that job (`invoice.job_id = job.id`) become `status: 'paid'`.
- The invoice's paid date is set to the job's `paidDate`.

**When a job is reverted to unpaid** (Jobs tab "Mark as Unpaid"):
- All linked invoices revert from `paid` back to `sent` (so they're not lost as drafts).
- Invoice paid date is cleared.

**When an invoice is marked paid** (Invoices tab status cycle: draft → sent → paid):
- The linked job is also marked `paid`, with `paidDate` = invoice's paid date (today's date when toggled).
- If the job was already paid, no change.

**When an invoice is reverted from paid → draft** (the existing cycle wraps back to draft):
- We do NOT auto-unpay the job. Reasoning: a user might just be editing invoice metadata, and other invoices for the same job could still be paid. Unpaying a job is a deliberate action that should happen on the Jobs tab.

## Where the changes happen

All write paths funnel through two functions in `src/lib/store.ts`:

- `updateJob(id, updates)` — extend so that when `updates.status` becomes `'paid'`, we also update all invoices for that job to paid (with the same `paidDate`). When `updates.status` changes away from `'paid'`, demote linked `paid` invoices back to `sent` and clear their paid date.
- `updateInvoice(id, updates)` — extend so that when `updates.status` becomes `'paid'`, fetch the invoice's `job_id` and mark that job paid (with today's date if no paid date exists).

Doing this in the store layer means every caller (Dashboard, Jobs tab, Invoices tab, Record Payment dialog, Edit Invoice dialog) gets the sync behavior automatically — no per-page changes needed.

## Storing the invoice's paid date

Invoices currently have no dedicated paid-date column. Two options:

1. **Add `paid_date text` column to `invoices` table** (mirrors `jobs.paid_date`). Cleanest, supports filtering/reporting later.
2. **Stash it in `notes` or `snapshot`**. Hacky.

Going with option 1 — a small migration adds `paid_date text` (nullable) to `invoices`, plus mapping it through `mapInvoiceFromDb` and the `Invoice` type in `src/lib/types.ts`.

## UI tweaks

- **Invoices tab** (`src/pages/Invoices.tsx`): when an invoice row shows "Paid", display the paid date next to it (mirrors how Jobs displays "Paid: Mar 5, 2026").
- **Record Payment dialog**: add a small note under the date field — "This will also mark the linked invoice as paid" — only when the selected job has an invoice.
- No changes needed on the Dashboard tile itself; it already reads from job status.

## Technical details

```text
updateJob(id, { status: 'paid', paidDate })
  └─► UPDATE invoices SET status='paid', paid_date=:paidDate
        WHERE job_id = :id AND status != 'paid'

updateJob(id, { status: 'pending', paidDate: '' })
  └─► UPDATE invoices SET status='sent', paid_date=NULL
        WHERE job_id = :id AND status = 'paid'

updateInvoice(id, { status: 'paid' })
  └─► SELECT job_id FROM invoices WHERE id = :id
      UPDATE jobs SET status='paid', paid_date=:today
        WHERE id = :job_id AND status != 'paid'
```

Migration:
```sql
ALTER TABLE public.invoices ADD COLUMN paid_date text;
```

## Files to edit
- `supabase/migrations/<new>.sql` — add `paid_date` to invoices.
- `src/lib/types.ts` — add `paidDate?: string` to `Invoice`.
- `src/lib/store.ts` — extend `updateJob`, `updateInvoice`, `mapInvoiceFromDb`, `addInvoice`.
- `src/pages/Invoices.tsx` — show paid date in the row.
- `src/components/RecordPaymentDialog.tsx` — small helper note.

## Out of scope
- Partial payments / multiple invoices per job edge cases (we update all linked invoices uniformly).
- Backfilling paid dates for existing already-paid invoices (they'll just show "Paid" without a date until edited).
