import posthog from 'posthog-js';

const key = import.meta.env.VITE_POSTHOG_KEY;
const host = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

let enabled = false;

// No-op until VITE_POSTHOG_KEY is set (see .env.example) — lets the app run
// fine before the PostHog project exists, instead of erroring.
export function initAnalytics() {
  if (!key) {
    console.warn('VITE_POSTHOG_KEY not set — analytics disabled');
    return;
  }
  posthog.init(key, {
    api_host: host,
    // No accounts/login in this app — each device gets a stable anonymous
    // id (PostHog's default distinct_id, persisted in Preferences-backed
    // storage would be more durable than localStorage, but PostHog's own
    // persistence already survives app updates on iOS in practice; revisit
    // if we ever see distinct_id churn).
    autocapture: true,
    capture_pageview: false, // no URL-based routing in this app — tab_viewed events (see App.tsx) cover navigation instead
  });
  enabled = true;
}

export function track(event: string, properties?: Record<string, unknown>) {
  if (!enabled) return;
  posthog.capture(event, properties);
}
