## Problem

The "Open in Email" button does nothing in the Lovable preview, and earlier produced "mail.google.com refused to connect" errors. The URL we build is already the standard form you described:

```
mailto:example@example.com?subject=Subject&body=Message
```

The bug is in *how* we hand that URL to the browser. The current `openMailtoDraft` calls `window.open(mailtoUrl, "_blank", ...)` and falls back to a hidden `<a target="_blank">`. Both attempt to open a **new browsing context**, which:

- Is silently blocked by the preview iframe's sandbox for the `mailto:` protocol (no error, no popup — exactly what we just reproduced in the browser test).
- When it does open, hands off to the user's registered web mail handler (Gmail), which the OS launches as `https://mail.google.com/...`. If that ever gets loaded inside our iframe, Gmail's `X-Frame-Options: DENY` triggers the "refused to connect" error.

## Fix

Stop opening a new tab. Just navigate the current window's location to the `mailto:` URL. Browsers intercept the `mailto:` protocol **before** any actual navigation happens — the OS/browser hands the URL to the default mail client (Apple Mail, Outlook, Gmail web handler, etc.), and the page itself does not unload. This works identically in the preview iframe and the published standalone app, and it never loads `mail.google.com` into a frame.

### Changes to `src/lib/email.ts`

Keep `buildMailtoUrl` unchanged (already produces the exact standard URL).

Rewrite `openMailtoDraft` to:

1. Build the standard mailto URL via `buildMailtoUrl`.
2. Set `window.location.href = mailtoUrl`. This is the simplest, most universally compatible way to trigger the OS mail handler.
3. Wrap in a try/catch. If the assignment throws (extremely rare — only if a browser extension blocks it), copy `Subject: ...\n\n<body>` to the clipboard and show a toast: "Couldn't open your mail app — email content copied to clipboard."

No other files need to change. The three call sites (`FollowUpDialog.tsx`, `SendExpensesDialog.tsx`, `Invoices.tsx`) keep their existing `onClick={() => openMailtoDraft({ ... })}` calls and inherit the fix automatically.

## Why this works where prior attempts failed

| Prior attempt | Why it failed |
|---|---|
| `window.open(mailto, "_blank")` | Sandboxed iframe blocks popups for non-http schemes — returns null, silently does nothing. |
| Hidden `<a target="_blank">` + click | Same sandbox restriction — new browsing context refused for `mailto:`. |
| `<a target="_top" href="mailto:">` | Worked for handoff, but if Gmail is the default web handler, the top frame navigated to `mail.google.com` and got blocked by `X-Frame-Options: DENY`. |
| **`window.location.href = mailto`** (new) | Browser intercepts `mailto:` before navigation — OS launches mail handler, page never unloads, no new context, no Gmail iframe load. |

## Out of scope

- No changes to the email body/subject templating in any dialog.
- No changes to PDF generation, Share/Attach, or Copy buttons.
- No new dependencies.
