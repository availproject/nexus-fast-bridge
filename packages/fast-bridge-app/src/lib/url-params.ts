import { isAddress } from "viem";

type SupportedBridgeToken = "USDC" | "USDT";
export type SwapParam = "in" | "out";

const ALLOWED_TOKENS = new Set<SupportedBridgeToken>(["USDC", "USDT"]);
const FILTERED_CHAIN_ID = 728_126_428;
const AMOUNT_PATTERN = /^\d*\.?\d*$/;

interface BridgeParams {
  amount?: string;
  recipient?: `0x${string}`;
  to?: number;
  token?: SupportedBridgeToken;
}

function isValidToken(token: string | null): token is SupportedBridgeToken {
  if (!token) {
    return false;
  }
  const upperToken = token.toUpperCase().trim();
  return ALLOWED_TOKENS.has(upperToken as SupportedBridgeToken);
}

function isValidChain(chainStr: string | null): boolean {
  if (!chainStr) {
    return false;
  }
  const chainId = Number.parseInt(chainStr, 10);
  if (
    !Number.isInteger(chainId) ||
    chainId <= 0 ||
    chainId > Number.MAX_SAFE_INTEGER
  ) {
    return false;
  }
  if (chainId === FILTERED_CHAIN_ID) {
    return false;
  }
  return true;
}

function sanitizeAmount(amount: string | null): string | undefined {
  if (!amount) {
    return undefined;
  }
  const sanitized = amount.trim();
  if (sanitized === "" || sanitized === ".") {
    return undefined;
  }
  if (!AMOUNT_PATTERN.test(sanitized)) {
    return undefined;
  }
  const num = Number.parseFloat(sanitized);
  if (Number.isNaN(num) || num <= 0) {
    return undefined;
  }
  if (num > 1e9) {
    return undefined;
  }
  return sanitized;
}

export function readBridgeParams(): BridgeParams {
  const params = new URLSearchParams(window.location.search);
  const toStr = params.get("to") || params.get("toChain");
  const tokenStr = params.get("token");
  const recipient = params.get("recipient") || params.get("address");
  const amountStr = params.get("amount");

  const to =
    toStr && toStr !== "self" && isValidChain(toStr)
      ? Number.parseInt(toStr, 10)
      : undefined;
  const token = isValidToken(tokenStr)
    ? (tokenStr.toUpperCase() as SupportedBridgeToken)
    : undefined;
  const sanitizedAmount = sanitizeAmount(amountStr);
  const recipientAddress =
    recipient && isAddress(recipient) ? recipient : undefined;

  return {
    to,
    token,
    recipient: recipientAddress,
    amount: sanitizedAmount,
  };
}

export function readSwapParam(): SwapParam {
  if (typeof window === "undefined") {
    return "in";
  }
  return new URLSearchParams(window.location.search).get("swap") === "out"
    ? "out"
    : "in";
}

export function writeSwapParam(mode: SwapParam): void {
  const url = new URL(window.location.href);
  url.searchParams.set("swap", mode);
  window.history.replaceState(window.history.state, "", url.toString());
}

export function writeBridgeParams(params: BridgeParams): void {
  const url = new URL(window.location.href);

  url.searchParams.delete("to");
  url.searchParams.delete("token");
  url.searchParams.delete("recipient");
  url.searchParams.delete("amount");

  if (params.to && isValidChain(String(params.to))) {
    url.searchParams.set("to", String(params.to));
  }
  if (params.token && ALLOWED_TOKENS.has(params.token)) {
    url.searchParams.set("token", params.token);
  }
  if (params.recipient && isAddress(params.recipient)) {
    url.searchParams.set("recipient", params.recipient);
  }
  const sanitizedAmount = sanitizeAmount(params.amount ?? null);
  if (sanitizedAmount) {
    url.searchParams.set("amount", sanitizedAmount);
  }

  window.history.replaceState({}, "", url.toString());
}
