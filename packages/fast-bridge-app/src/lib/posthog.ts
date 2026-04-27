import posthog from "posthog-js";

const DEFAULT_POSTHOG_KEY = "phc_UD6lQU3PEw1d8oo8E17rJLmRAR7kxJbQ5OseHuCvi7N";
const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";

let isInitialized = false;

/**
 * Initialize PostHog analytics
 */
export function initPostHog(options?: {
  apiKey?: string;
  apiHost?: string;
  debug?: boolean;
}): void {
  if (isInitialized) {
    return;
  }

  const apiKey = options?.apiKey || DEFAULT_POSTHOG_KEY;
  const apiHost = options?.apiHost || DEFAULT_POSTHOG_HOST;
  const debug = options?.debug ?? true; // Always enable debug for troubleshooting

  console.log("[PostHog] Initializing with host:", apiHost);

  posthog.init(apiKey, {
    api_host: apiHost,
    person_profiles: "identified_only",
    autocapture: false,
    capture_pageview: "history_change",
    capture_pageleave: true,
    persistence: "localStorage", // Use localStorage for persistence
    loaded: (ph) => {
      console.log("[PostHog] Loaded successfully");
      if (debug) {
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
  amount: string;
  chain: string | number;
  chainName: string;
  fast_bridge: string;
  tokenSymbol: string;
}

export function trackBridgeSubmit(
  properties: BridgeSubmitEventProperties
): void {
  if (!isInitialized) {
    console.warn("[PostHog] Not initialized, initializing now...");
    initPostHog();
  }

  console.log(
    "[PostHog] Capturing event: nexus_fast_bridge_demo_submit",
    properties
  );
  posthog.capture("nexus_fast_bridge_demo_submit", properties);
}

/**
 * Generic capture wrapper
 */
export function capture(
  event: string,
  properties?: Record<string, unknown>
): void {
  if (!isInitialized) {
    console.warn("[PostHog] Not initialized, initializing now...");
    initPostHog();
  }

  console.log("[PostHog] Capturing event:", event, properties);
  posthog.capture(event, properties);
}
