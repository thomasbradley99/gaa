'use client';

import posthog from 'posthog-js';
import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname && typeof window !== 'undefined') {
      const url = window.origin + pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
      console.log('📊 PostHog pageview:', url);
      posthog.capture('$pageview', {
        $current_url: url,
      });
    }
  }, [pathname, searchParams]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check if PostHog is already initialized
      if ((posthog as any).__loaded || (posthog as any).__initialized) {
        return;
      }
      
      const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
      const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';
      
      if (!posthogKey) {
        console.warn('⚠️ PostHog key not found. Set NEXT_PUBLIC_POSTHOG_KEY in your environment variables.');
        return;
      }

      posthog.init(posthogKey, {
        api_host: posthogHost,
        person_profiles: 'identified_only',
        capture_pageview: false, // Manual tracking
        capture_pageleave: true,
        autocapture: true,
        // Session replay - maximum data collection (no masking)
        session_recording: {
          maskAllInputs: false, // Don't mask inputs - capture everything
          maskInputOptions: {
            password: false, // Capture passwords
            email: false, // Capture emails
          },
          maskTextSelector: '', // Don't mask any text
          maskAllText: false, // Don't mask text content
        },
        loaded: () => {
          console.log('✅ PostHog initialized successfully');
        },
      });
    }
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </>
  );
}

