import { capture } from "./posthog";

const HEX_PREFIX_REGEX = /^0x/i;

/**
 * Formats a wallet address by removing the '0x' prefix and truncating:
 * eg: 65435.....ab123 (first 5 chars + "....." + last 5 chars)
 */
export function formatTruncatedWalletAddress(address?: string | null): string {
  if (!address) {
    return "";
  }
  const clean = address.replace(HEX_PREFIX_REGEX, "");
  if (clean.length <= 10) {
    return clean;
  }
  return `${clean.slice(0, 5)}.....${clean.slice(-5)}`;
}

/**
 * Generates a unique quote/session ID for funnel tracking
 */
export function generateQuoteId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `quote_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export interface FastBridgeFailPayload {
  chain_id?: number;
  chain_id_list?: number[];
  destination_chain_id?: number;
  error_code?: string | number;
  failure_type:
    | "sdk_init"
    | "balance_fetch"
    | "quote_fetch"
    | "step_failure"
    | "transaction_failure";
  quote_id?: string;
  reason: string;
  rff_id?: string;
  source_tokens_count?: number;
  step_type?: string;
  time_taken_ms?: number;
  token_address?: string;
  tx_hash?: string;
  user_rejected?: boolean;
  wallet_address?: string;
  [key: string]: unknown;
}

export interface FastBridgeSuccessPayload {
  chain_id_list?: number[];
  destination_chain_id?: number;
  duration_seconds?: number;
  quote_id?: string;
  rff_id?: string;
  source_tokens_count?: number;
  success_type: "quote_fetched" | "transaction_success";
  time_taken_ms?: number;
  tx_hash?: string;
  wallet_address?: string;
  [key: string]: unknown;
}

export interface FastBridgeIntentConfirmedPayload {
  chain_id_list: number[];
  destination_amount?: string;
  destination_chain_id: number;
  destination_token?: string;
  fee_usd?: number;
  quote_id?: string;
  source_tokens?: Array<{
    symbol?: string;
    amount?: string;
    chainId?: number;
    contractAddress?: string;
  }>;
  source_tokens_count: number;
  wallet_address?: string;
  [key: string]: unknown;
}

/**
 * Tracks a FastBridge failure event on PostHog: `fastbridge_fail`
 */
export function trackFastBridgeFail(data: FastBridgeFailPayload): void {
  const properties = {
    ...data,
    wallet_address: formatTruncatedWalletAddress(data.wallet_address),
  };
  capture("fastbridge_fail", properties);
}

/**
 * Tracks a FastBridge success event on PostHog: `fastbridge_success`
 */
export function trackFastBridgeSuccess(data: FastBridgeSuccessPayload): void {
  const properties = {
    ...data,
    wallet_address: formatTruncatedWalletAddress(data.wallet_address),
  };
  capture("fastbridge_success", properties);
}

/**
 * Tracks when a user accepts/confirms an intent: `fastbridge_intent_confirmed`
 */
export function trackFastBridgeIntentConfirmed(
  data: FastBridgeIntentConfirmedPayload
): void {
  const properties = {
    ...data,
    wallet_address: formatTruncatedWalletAddress(data.wallet_address),
  };
  capture("fastbridge_intent_confirmed", properties);
}
