/**
 * Tiny event bus to start the SpotlightTour from anywhere in the app.
 * The tour itself lives in ProtectedLayout (App.tsx) so it persists across route changes.
 */
const EVENT = "modelbook:start-tour";

export function startTour() {
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function onStartTour(handler: () => void) {
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
