export const buildMailtoUrl = ({
  to,
  subject,
  body,
}: {
  to?: string;
  subject: string;
  body: string;
}) => `mailto:${to?.trim() || ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

export const buildGmailComposeUrl = ({
  to,
  subject,
  body,
}: {
  to?: string;
  subject: string;
  body: string;
}) =>
  `https://mail.google.com/mail/u/0/?tf=cm&source=mailto&to=${encodeURIComponent(to?.trim() || "")}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

export const openMailtoDraft = ({
  to,
  subject,
  body,
}: {
  to?: string;
  subject: string;
  body: string;
}) => {
  window.location.assign(buildMailtoUrl({ to, subject, body }));
};

export const openGmailCompose = ({
  to,
  subject,
  body,
}: {
  to?: string;
  subject: string;
  body: string;
}) => {
  window.location.assign(buildGmailComposeUrl({ to, subject, body }));
};