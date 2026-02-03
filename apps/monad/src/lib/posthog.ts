import posthog from 'posthog-js';

const DEFAULT_POSTHOG_KEY = 'phc_UD6lQU3PEw1d8oo8E17rJLmRAR7kxJbQ5OseHuCvi7N';
const DEFAULT_POSTHOG_HOST = 'https://us.i.posthog.com';

let isInitialized = false;

/**
 * Initialize PostHog analytics
 */
export function initPostHog(options?: {
    apiKey?: string;
    apiHost?: string;
    debug?: boolean;
}): void {
    if (isInitialized) return;

    const apiKey = options?.apiKey || DEFAULT_POSTHOG_KEY;
    const apiHost = options?.apiHost || DEFAULT_POSTHOG_HOST;
    const debug = options?.debug || false;

    posthog.init(apiKey, {
        api_host: apiHost,
        person_profiles: 'identified_only', // Only create profiles for identified users
        autocapture: false, // Manual tracking only for SDK operations
        capture_pageview: false, // Manual pageview tracking
        capture_pageleave: true, // Track when users leave
        loaded: (ph) => {
            if (debug) {
                console.log('[PostHog] Initialized successfully');
                ph.debug();
            }
        },
    });

    isInitialized = true;
}

/**
 * Capture a bridge submit event
 */
export interface BridgeSubmitEventProperties {
    chain: string | number;
    token: string;
    amount: string;
    fast_bridge: 'megaeth' | 'citrea' | 'monad';
}

export function trackBridgeSubmit(properties: BridgeSubmitEventProperties): void {
    if (!isInitialized) {
        initPostHog();
    }

    posthog.capture('nexus_fast_bridge_demo_submit', properties);
}

/**
 * Generic capture wrapper
 */
export function capture(event: string, properties?: Record<string, unknown>): void {
    if (!isInitialized) {
        initPostHog();
    }

    posthog.capture(event, properties);
}

export { posthog };
