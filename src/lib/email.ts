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
  window.location.href = buildMailtoUrl({ to, subject, body });
};
