import { type SUPPORTED_CHAINS_IDS, type SUPPORTED_TOKENS } from "@avail-project/nexus-core";
import { isAddress } from "viem";

const ALLOWED_TOKENS = new Set(["USDC", "USDT"]) as Set<SUPPORTED_TOKENS>;

interface BridgeParams {
  to?: SUPPORTED_CHAINS_IDS;
  token?: SUPPORTED_TOKENS;
  recipient?: `0x${string}`;
  amount?: string;
}

function isValidToken(token: string | null): token is SUPPORTED_TOKENS {
  if (!token) return false;
  const upperToken = token.toUpperCase().trim();
  return ALLOWED_TOKENS.has(upperToken as SUPPORTED_TOKENS);
}

function isValidChain(chainStr: string | null): boolean {
  if (!chainStr) return false;
  const chainId = Number.parseInt(chainStr, 10);
  return Number.isInteger(chainId) && chainId > 0 && chainId <= Number.MAX_SAFE_INTEGER;
}

function sanitizeAmount(amount: string | null): string | undefined {
  if (!amount) return undefined;
  const sanitized = amount.trim();
  if (sanitized === "" || sanitized === ".") return undefined;
  if (!/^\d*\.?\d*$/.test(sanitized)) return undefined;
  const num = Number.parseFloat(sanitized);
  if (Number.isNaN(num) || num <= 0) return undefined;
  if (num > 1e9) return undefined;
  return sanitized;
}

export function readBridgeParams(): BridgeParams {
  const params = new URLSearchParams(window.location.search);
  const toStr = params.get("to");
  const tokenStr = params.get("token");
  const recipient = params.get("recipient");
  const amountStr = params.get("amount");

  const to = toStr && toStr !== "self" && isValidChain(toStr) ? (Number.parseInt(toStr, 10) as SUPPORTED_CHAINS_IDS) : undefined;
  const token = isValidToken(tokenStr) ? (tokenStr!.toUpperCase() as SUPPORTED_TOKENS) : undefined;
  const sanitizedAmount = sanitizeAmount(amountStr);
  const recipientAddress = recipient && isAddress(recipient) ? recipient : undefined;

  return {
    to,
    token,
    recipient: recipientAddress,
    amount: sanitizedAmount,
  };
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
