I investigated the current email flow and found the core issue:

- The app already builds a standard `mailto:to?subject=...&body=...` URL in `src/lib/email.ts`.
- The helper currently uses `window.location.href = mailtoUrl`, so the code is no longer explicitly routing through Gmail.
- However, in Lovable preview the app runs inside an iframe. If the browser’s default mail handler is Gmail, the `mailto:` handoff can still resolve to `mail.google.com`, and Gmail refuses to render inside that iframe. That matches the error you’re still seeing.
- So this is not really a malformed mailto-link problem anymore; it is a preview-environment handoff problem.

Plan:

1. Make the email helper environment-aware
- Update `src/lib/email.ts` to detect Lovable preview / iframe usage using the same host + iframe pattern already used elsewhere in the app.
- Keep the normal `mailto:` navigation for standalone/published usage.
- In preview/iframe mode, do not attempt to launch the mail handler directly.

2. Return a structured result from the helper
- Refactor `openMailtoDraft` so it reports what happened, for example:
  - `opened`
  - `blocked_in_preview`
  - `clipboard_fallback`
- This lets the UI explain the situation instead of failing with the Gmail iframe error.

3. Improve the dialogs that use the helper
- Update:
  - `src/components/SendExpensesDialog.tsx`
  - `src/components/FollowUpDialog.tsx`
  - `src/pages/Invoices.tsx`
- When the helper reports preview blocking, show a clear toast/message like:
  - “Email apps can’t open from the preview. Use Copy All, or open the published app to launch your mail client.”
- Keep the existing Copy / Copy All workflow as the primary fallback.

4. Add preview-specific UX guidance near the button
- In the email dialogs, add a small note under or near “Open in Email” explaining that preview may block mail apps, while the published app should work normally.
- This prevents the same confusion from recurring.

5. Verify both environments
- Test in preview to confirm the Gmail iframe error is no longer triggered by the app flow and that the user sees a helpful fallback instead.
- Test the published app to confirm `mailto:` still launches the mail client normally there.

Technical details
- Files to update:
  - `src/lib/email.ts`
  - `src/components/SendExpensesDialog.tsx`
  - `src/components/FollowUpDialog.tsx`
  - `src/pages/Invoices.tsx`
- Reuse existing preview detection conventions from `src/main.tsx` / `src/lib/analytics.ts`.
- Preserve the standard mailto structure exactly; the change is about when to trigger it, not how to encode it.

If you approve, I’ll implement the preview-safe behavior so the button stops surfacing the Gmail iframe error and gives a clear fallback path.