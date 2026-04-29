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

  const popup = window.open(mailtoUrl, "_blank", "noopener,noreferrer");
  if (popup) {
    popup.opener = null;
    return;
  }

  const link = document.createElement("a");
  link.href = mailtoUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
};
