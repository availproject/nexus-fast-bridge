import { asRecord, safeText } from "./error-safety";

const DEFAULT_MESSAGE = "We couldn't complete this request. Please try again.";
export const TRANSACTION_STATUS_MESSAGE =
  "We couldn't confirm the transaction. Check your wallet or the explorer before trying again.";
const REJECTION_MESSAGE =
  "You declined the request in your wallet. Try again when you're ready.";
const BALANCE_MESSAGE =
  "There isn't enough usable balance for this amount. Reduce the amount or choose another source asset.";
const QUOTE_MESSAGE =
  "We couldn't get a quote for this route. Try again or choose a different token or chain.";
const GAS_MESSAGE = "We couldn't estimate the network fee. Please try again.";

const ERROR_MESSAGES: Record<string, string> = {
  "4001": REJECTION_MESSAGE,
  ACTION_REJECTED: REJECTION_MESSAGE,
  USER_DENIED_INTENT: REJECTION_MESSAGE,
  "4100":
    "Your wallet hasn't authorized this connection. Reconnect your wallet and try again.",
  "4900": "Your wallet is disconnected. Reconnect it and try again.",
  "4901":
    "Your wallet isn't connected to the required network. Switch networks in your wallet and try again.",
  "validation/insufficient_balance": BALANCE_MESSAGE,
  "validation/no_balance_for_address":
    "No usable balance was found on the supported source chains. Choose another asset or add funds.",
  "validation/amount_too_low":
    "The amount is too small to cover the transfer fees. Enter a larger amount.",
  "validation/sdk_not_initialized":
    "FastBridge is still connecting. Wait a moment, then try again.",
  "validation/sdk_init_state_unexpected":
    "FastBridge couldn't finish connecting. Reconnect your wallet and try again.",
  "validation/wallet_not_connected": "Connect your wallet to continue.",
  "validation/chain_not_found":
    "This chain isn't supported for the selected route. Choose another chain.",
  "validation/chain_data_not_found":
    "We couldn't load the selected chain. Try again or choose another chain.",
  "validation/asset_not_found":
    "The selected asset wasn't found in your balances. Refresh your balances or choose another asset.",
  "validation/token_not_supported":
    "This token isn't supported for the selected route. Choose another token.",
  "validation/invalid_address_length":
    "The recipient address isn't valid for the selected chain. Check the address and try again.",
  "validation/invalid_allowance_hook":
    "We couldn't prepare the token approval. Refresh the quote and try again.",
  "validation/vault_contract_not_found":
    "This deposit isn't available on the selected chain. Choose another destination.",
  "execution/intent_sign_failed":
    "Your wallet couldn't sign the transfer request. Check your wallet and try again.",
  "execution/permit_sign_failed":
    "Your wallet couldn't sign the token permission. Check your wallet and try again.",
  "execution/wallet_connect_failed":
    "We couldn't connect to your wallet. Unlock it and try connecting again.",
  "execution/chain_switch_failed":
    "Your wallet couldn't switch to the required network. Switch networks in your wallet and try again.",
  "execution/gas_estimate_failed": GAS_MESSAGE,
  "execution/gas_price_fetch_failed": GAS_MESSAGE,
  "execution/l1_fee_estimate_failed": GAS_MESSAGE,
  "execution/erc20_allowance_read_failed":
    "We couldn't check your token approval. Please try again.",
  "execution/approval_tx_send_failed":
    "We couldn't submit the token approval. Check your wallet activity before trying again.",
  "execution/approval_tx_confirm_failed":
    "We couldn't confirm the token approval. Check your wallet or the explorer before trying again.",
  "execution/exec_tx_send_failed":
    "We couldn't submit the transaction. Check your wallet activity before trying again.",
  "execution/exec_tx_confirm_failed": TRANSACTION_STATUS_MESSAGE,
  "execution/tx_receipt_wait_timeout": TRANSACTION_STATUS_MESSAGE,
  "execution/tx_receipt_check_failed": TRANSACTION_STATUS_MESSAGE,
  "execution/tx_onchain_reverted":
    "The transaction reverted on-chain. Check the explorer for details before trying again.",
  "execution/tx_submission_reverted":
    "The network rejected the transaction. Refresh the quote and check your wallet before trying again.",
  "execution/slippage_exceeded":
    "The price moved beyond your slippage limit. Refresh the quote and review the new amount.",
  "execution/vault_deposit_send_failed":
    "We couldn't submit the deposit. Check your wallet activity before trying again.",
  "execution/vault_deposit_confirm_failed":
    "We couldn't confirm the deposit. Check your wallet or the explorer before trying again.",
  "execution/destination_sweep_failed":
    "The final transfer couldn't be completed. Check the transaction status in the explorer before trying again.",
  "execution/refund_send_failed":
    "We couldn't submit the refund transaction. Check the intent explorer for its status.",
  "execution/refund_check_failed":
    "We couldn't check the refund status. Check the intent explorer for the latest update.",
  "backend/balances_fetch_failed":
    "We couldn't load your balances. Check your connection and try again.",
  "backend/deployment_fetch_failed":
    "We couldn't load the supported chains and tokens. Please try again.",
  "backend/oracle_prices_fetch_failed":
    "Token prices are temporarily unavailable. Please try again.",
  "backend/get_quote_failed": QUOTE_MESSAGE,
  "backend/get_mayan_quote_failed": QUOTE_MESSAGE,
  "backend/fulfilment_wait_timeout": TRANSACTION_STATUS_MESSAGE,
  "backend/rff_submit_failed":
    "We couldn't submit the transfer request. Check the intent explorer before trying again.",
  "backend/rff_fetch_failed":
    "We couldn't load the transfer details. Check the intent explorer for its status.",
  "backend/rff_status_fetch_failed": TRANSACTION_STATUS_MESSAGE,
  "backend/rff_list_failed":
    "We couldn't load your transaction history. Please try again.",
  "backend/simulation_bundle_failed":
    "We couldn't check whether this transaction will succeed. Refresh the quote and try again.",
  "external_service/destination_swap_quote_failed": QUOTE_MESSAGE,
  "external_service/source_swap_quote_failed": QUOTE_MESSAGE,
  "external_service/swap_route_build_failed": QUOTE_MESSAGE,
  "external_service/rates_drift_exceeded":
    "The exchange rate changed while preparing your transfer. Refresh the quote and review the new amount.",
  "external_service/exchange_rate_fetch_failed":
    "We couldn't load the exchange rate. Please try again.",
  "simulation/eth_call_failed":
    "The transaction couldn't be simulated successfully. Check the amount and token approvals, then refresh the quote.",
};

const SECRET_CONTENT =
  /\b(?:mnemonic|seed[ _-]?phrase|private[ _-]?key|passphrase)\b/i;
const SECRET_ASSIGNMENT =
  /\b(?:signature|signed[ _-]?message|calldata|authorization|password|secret|api[ _-]?key|access[ _-]?token)\s*["']?\s*[:=]/i;
const TECHNICAL_PAYLOAD =
  /(?:\b(?:request (?:body|arguments)|transaction arguments|stack trace|version|docs|details|calldata)\s*:|\{\s*["']|\n\s*at\s)/i;
const TECHNICAL_MESSAGE =
  /^(?:0x[\da-f]+|\[object Object\]|(?:type|reference|syntax)error\b|cannot (?:read|access)\b|undefined\b|null\b|request failed with status code\b|unexpected token\b|unexpected end of JSON\b|minified react error\b)/i;
const GENERIC_MESSAGE =
  /^(?:error|unknown error|unexpected error|internal error|timed out|transaction timed out|timeout|transaction failed|swap failed|send failed|deposit failed|something went wrong|oops!?[.! ]*)[.! ]*$/i;
const ERROR_PREFIX = /^(?:(?:[\w.]*Error|COSMOS|Internal error):\s*)+/i;
const LONG_PAYLOAD = /\b[A-Za-z0-9+/=_-]{48,}\b/g;
const REJECTED =
  /user (?:rejected|denied)|rejected request|denied transaction signature/i;
const NETWORK_FAILURE =
  /failed to fetch|fetch failed|network (?:request failed|error)|HTTP request failed|ECONNREFUSED|ENOTFOUND/i;
const GAS_SHORTFALL =
  /insufficient funds.*(?:gas|fee)|not enough (?:native|gas)|insufficient (?:native|gas)/i;
const NO_ROUTE =
  /no (?:swap )?route (?:found|available)|no quotes? (?:found|available)/i;
const URL_CONTENT = /https?:\/\/[^\s"<>]+/gi;
const CONSOLE_INSTRUCTION = /check (?:the )?console/i;
const WHITESPACE = /\s+/g;
const DOUBLE_PERIOD = /\.\s*\./g;
const BALANCE_SHORTFALL =
  /insufficient (?:balance|sources)|not enough (?:usable )?(?:balance|funds)/i;
const EM_DASH = /\s*[\u2013\u2014]\s*/g;

/** Only explicit error fields are inspected. Provider details and request payloads stay out of the UI. */
function errorChain(error: unknown): unknown[] {
  const entries: unknown[] = [];
  const seen = new Set<unknown>();
  const pending = [error];
  while (pending.length && entries.length < 8) {
    const current = pending.shift();
    if (current == null || seen.has(current)) {
      continue;
    }
    seen.add(current);
    entries.push(current);
    const record = asRecord(current);
    pending.push(
      record.cause,
      record.error,
      asRecord(record.data).originalError
    );
  }
  return entries;
}

function readableMessage(value: string): string | undefined {
  const summary = value
    .split(TECHNICAL_PAYLOAD, 1)[0]
    .replace(URL_CONTENT, "[url]");
  if (SECRET_CONTENT.test(summary) || SECRET_ASSIGNMENT.test(summary)) {
    return undefined;
  }
  const cleaned = safeText(summary)
    .replace(LONG_PAYLOAD, "[redacted]")
    .replace(ERROR_PREFIX, "")
    .replace(EM_DASH, ". ")
    .replace(WHITESPACE, " ")
    .replace(DOUBLE_PERIOD, ".")
    .trim();
  if (
    !cleaned ||
    GENERIC_MESSAGE.test(cleaned) ||
    TECHNICAL_MESSAGE.test(cleaned)
  ) {
    return undefined;
  }
  // Long provider dumps and developer diagnostics don't make useful instructions.
  if (cleaned.length > 320 || CONSOLE_INSTRUCTION.test(cleaned)) {
    return undefined;
  }
  return cleaned;
}

function messageFromCandidate(candidate: unknown): string | undefined {
  if (typeof candidate !== "string") {
    return undefined;
  }
  if (REJECTED.test(candidate)) {
    return REJECTION_MESSAGE;
  }
  if (GAS_SHORTFALL.test(candidate)) {
    return "There isn't enough native token to pay the network fee. Add gas funds or choose another source chain.";
  }
  if (BALANCE_SHORTFALL.test(candidate)) {
    return BALANCE_MESSAGE;
  }
  if (NETWORK_FAILURE.test(candidate)) {
    return "We couldn't reach the network. Check your connection and try again.";
  }
  if (NO_ROUTE.test(candidate)) {
    return QUOTE_MESSAGE;
  }
  return readableMessage(candidate);
}

function messageFromEntry(entry: unknown): string | undefined {
  const record = asRecord(entry);
  for (const candidate of [
    record.reason,
    record.shortMessage,
    record.message,
    entry,
  ]) {
    const message = messageFromCandidate(candidate);
    if (message) {
      return message;
    }
  }
  return undefined;
}

export function getUserFacingError(
  error: unknown,
  fallback = DEFAULT_MESSAGE
): string {
  const entries = errorChain(error);
  for (const entry of entries) {
    const code = String(asRecord(entry).code ?? "");
    if (
      code.startsWith("user_action/") ||
      ["4001", "ACTION_REJECTED", "USER_DENIED_INTENT"].includes(code)
    ) {
      return REJECTION_MESSAGE;
    }
  }
  for (const entry of [...entries].reverse()) {
    const code = String(asRecord(entry).code ?? "");
    if (Object.hasOwn(ERROR_MESSAGES, code)) {
      return ERROR_MESSAGES[code];
    }
  }
  for (const entry of entries) {
    const message = messageFromEntry(entry);
    if (message) {
      return message;
    }
  }
  return readableMessage(fallback) ?? DEFAULT_MESSAGE;
}

/** Older receipts may have only a generic step label; prefer the captured reason. */
export function getReceiptErrorMessage(entry: {
  error?: string;
  failureDescription?: string;
  failureMessage?: string;
}): string {
  return getUserFacingError(
    {
      message: entry.error,
      cause: { message: entry.failureDescription, cause: entry.failureMessage },
    },
    TRANSACTION_STATUS_MESSAGE
  );
}
