export const buildMailtoUrl = ({
  to,
  subject,
  body,
}: {
  to?: string;
  subject: string;
  body: string;
}) => `mailto:${to?.trim() || ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

export const openMailtoDraft = ({
  to,
  subject,
  body,
}: {
  to?: string;
  subject: string;
  body: string;
}) => {
  const mailtoUrl = buildMailtoUrl({ to, subject, body });

  try {
    // Navigate the current window to the mailto: URL.
    // Browsers intercept the mailto: protocol BEFORE any actual navigation
    // happens — the OS hands the URL to the default mail client and the
    // page itself never unloads. Works in both the preview iframe and the
    // published standalone app, and never loads mail.google.com into a frame.
    window.location.href = mailtoUrl;
  } catch {
    // Extremely rare fallback: if a browser extension blocks the assignment,
    // copy the email contents to the clipboard so the user can paste them.
    try {
      void navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    } catch {
      // Nothing else we can do — caller can show their own error UI.
    }
  }
};
