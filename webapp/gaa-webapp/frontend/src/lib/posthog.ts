import posthog from 'posthog-js';

let posthogInitialized = false;

export function initPostHog() {
  if (typeof window !== 'undefined' && !posthogInitialized) {
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';
    
    if (!posthogKey) {
      console.warn('⚠️ PostHog key not found. Set NEXT_PUBLIC_POSTHOG_KEY in your environment variables.');
      return;
    }

    posthog.init(posthogKey, {
      api_host: posthogHost,
      loaded: (posthog) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('📊 PostHog initialized');
        }
      },
      capture_pageview: true, // Automatic page view tracking
      capture_pageleave: true, // Track when users leave
      autocapture: true, // Auto-track clicks, form submissions
    });
    posthogInitialized = true;
  }
}

// Track custom events
export function trackEvent(eventName: string, properties?: Record<string, any>) {
  if (typeof window !== 'undefined') {
    posthog.capture(eventName, properties);
  }
}

// Identify user
export function identifyUser(userId: string, properties?: Record<string, any>) {
  if (typeof window !== 'undefined') {
    posthog.identify(userId, properties);
  }
}

export default posthog;

