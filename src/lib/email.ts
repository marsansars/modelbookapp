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
    if (window.top && window.top !== window) {
      window.top.location.href = mailtoUrl;
      return;
    }
  } catch {
    // Fall back to the current window when top navigation isn't available.
  }

  window.location.href = mailtoUrl;
};
