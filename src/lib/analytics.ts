// Lightweight wrappers around PostHog + Sentry that no-op when keys are absent.
// All keys are public/client-side and live in .env (VITE_*).

import posthog from 'posthog-js';
import * as Sentry from '@sentry/react';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || 'https://us.i.posthog.com';
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

let posthogReady = false;
let sentryReady = false;

export function initAnalytics() {
  // Skip in Lovable preview iframe
  const isPreview =
    typeof window !== 'undefined' &&
    (window.location.hostname.includes('id-preview--') ||
      window.location.hostname.includes('lovableproject.com'));

  if (POSTHOG_KEY && !posthogReady && !isPreview) {
    try {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        capture_pageview: true,
        capture_pageleave: true,
        autocapture: true,
        // Don't capture sensitive form values
        mask_all_text: false,
        mask_personal_data_properties: true,
      });
      posthogReady = true;
    } catch (e) {
      console.warn('PostHog init failed', e);
    }
  }

  if (SENTRY_DSN && !sentryReady && !isPreview) {
    try {
      Sentry.init({
        dsn: SENTRY_DSN,
        integrations: [Sentry.browserTracingIntegration()],
        tracesSampleRate: 0.2,
        environment: import.meta.env.MODE,
      });
      sentryReady = true;
    } catch (e) {
      console.warn('Sentry init failed', e);
    }
  }
}

export function identifyUser(userId: string, traits?: Record<string, unknown>) {
  if (posthogReady) {
    try { posthog.identify(userId, traits); } catch {}
  }
  if (sentryReady) {
    try { Sentry.setUser({ id: userId, ...(traits as any) }); } catch {}
  }
}

export function resetIdentity() {
  if (posthogReady) {
    try { posthog.reset(); } catch {}
  }
  if (sentryReady) {
    try { Sentry.setUser(null); } catch {}
  }
}

export function track(event: string, props?: Record<string, unknown>) {
  if (posthogReady) {
    try { posthog.capture(event, props); } catch {}
  }
}

export function trackPageView(path: string) {
  if (posthogReady) {
    try { posthog.capture('$pageview', { $current_url: path }); } catch {}
  }
}
