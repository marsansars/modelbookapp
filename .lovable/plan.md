
## Goal
Let users upload a screenshot (booking confirmation, agency email, call sheet) at the top of the **Add Job** dialog and have Lovable AI read it and auto-populate the fields — no more hand-jamming.

## User flow
1. In the "New Job" dialog, a new "Scan from screenshot" area sits above the form.
2. User clicks/drops an image (or pastes from clipboard). A thumbnail + "Scanning…" state appears.
3. The app sends the image to a Supabase edge function which calls Lovable AI (Gemini vision) with a structured-output schema.
4. Extracted fields (client, description, job date, line items, currency, agent %, net days, notes, agency name) merge into the form. User reviews/edits and hits Save.
5. If a returned agency name matches an existing agency, auto-select it (and apply its defaults for anything the screenshot didn't specify).

## What gets extracted
- `client` (brand/client)
- `description` (shoot type — ecomm, editorial, campaign…)
- `jobDate` (normalized YYYY-MM-DD)
- `lineItems[]` (description + amount — day rate, usage, OT, travel, fitting…)
- `currency` (USD/EUR/GBP…)
- `agentPercent`, `taxPercent` (only if explicit), `netDays` (only if explicit)
- `agencyName` (fuzzy-matched to user's existing agencies)
- `notes` (call time, location, contacts, anything else useful)

Fields not present in the screenshot stay at their current defaults so nothing is overwritten with junk.

## Technical details
- New edge function `supabase/functions/scan-job-screenshot/index.ts`:
  - Accepts `{ imageDataUrl }` (JWT-verified).
  - Calls `https://ai.gateway.lovable.dev/v1/chat/completions` with `google/gemini-3-flash-preview`, message content including `image_url` block, using AI SDK `Output.object` (Zod schema of the fields above) — schema kept flat, no min/max bounds; limits stated in the prompt only.
  - Wraps the call with `NoObjectGeneratedError` fallback so malformed output degrades instead of crashing.
  - Surfaces 429/402 with clear error text.
- Client changes in `src/components/AddJobDialog.tsx`:
  - New `<ScreenshotScanner>` block at top: file input + drag/drop + paste handler, ~1.5 MB auto-compress reusing the existing image compression util used for attachments.
  - `supabase.functions.invoke('scan-job-screenshot', …)`, then merge results into `form` and `lineItems` (only non-empty fields).
  - Fuzzy agency match (case-insensitive contains) against loaded `agencies`; on match, call the existing `handleAgencyChange` so agency defaults apply.
  - Toast on success ("Filled from screenshot — please review") and on error.
- Same scanner added to `EditJobDialog.tsx` as an optional "Re-scan" affordance (small button, off by default) — kept minimal, can drop if you'd rather scope to Add only.

## Out of scope
- OCR of scanned PDFs / multi-page docs (screenshots only for now).
- Auto-saving without user review.
- Attaching the scanned image as a job file (can add later — for now it's only used for extraction).

## Confirm before I build
- Add the scanner to **both** Add and Edit dialogs, or only Add?
- OK to use Lovable AI credits (Gemini vision) for each scan? Roughly a fraction of a cent per screenshot.
