export const buildMailtoUrl = ({
  to,
  subject,
  body,
}: {
  to?: string;
  subject: string;
  body: string;
}) => `mailto:${to?.trim() || ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

export type OpenMailtoResult = "opened" | "blocked_in_preview" | "clipboard_fallback" | "failed";

const isLovablePreviewEnv = (): boolean => {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  const onPreviewHost =
    host.includes("id-preview--") || host.includes("lovableproject.com");
  let inIframe = false;
  try {
    inIframe = window.self !== window.top;
  } catch {
    inIframe = true;
  }
  return onPreviewHost || inIframe;
};

export const openMailtoDraft = ({
  to,
  subject,
  body,
}: {
  to?: string;
  subject: string;
  body: string;
}): OpenMailtoResult => {
  const mailtoUrl = buildMailtoUrl({ to, subject, body });

  // In Lovable preview / iframe, the browser may resolve the mailto: handler
  // to a webmail provider (e.g. Gmail), which then refuses to load inside the
  // preview iframe ("mail.google.com refused to connect"). Skip the protocol
  // handoff and fall back to clipboard so the user gets a clear, working path.
  if (isLovablePreviewEnv()) {
    try {
      void navigator.clipboard.writeText(`To: ${to || ""}\nSubject: ${subject}\n\n${body}`);
      return "blocked_in_preview";
    } catch {
      return "blocked_in_preview";
    }
  }

  try {
    // Standalone / published app: hand the standard mailto: URL to the OS
    // mail handler. Browsers intercept the protocol before any navigation.
    window.location.href = mailtoUrl;
    return "opened";
  } catch {
    try {
      void navigator.clipboard.writeText(`To: ${to || ""}\nSubject: ${subject}\n\n${body}`);
      return "clipboard_fallback";
    } catch {
      return "failed";
    }
  }
};

export const isEmailPreviewBlocked = (): boolean => isLovablePreviewEnv();
