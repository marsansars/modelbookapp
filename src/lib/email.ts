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

  const link = document.createElement("a");
  link.href = mailtoUrl;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
};
