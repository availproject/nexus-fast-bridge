import { type SUPPORTED_CHAINS_IDS, type SUPPORTED_TOKENS } from "@avail-project/nexus-core";
import { isAddress } from "viem";

interface BridgeParams {
  to?: SUPPORTED_CHAINS_IDS;
  token?: SUPPORTED_TOKENS;
  recipient?: `0x${string}`;
  amount?: string;
}

export function readBridgeParams(): BridgeParams {
  const params = new URLSearchParams(window.location.search);
  const toStr = params.get("to");
  const token = params.get("token") as SUPPORTED_TOKENS | null;
  const recipient = params.get("recipient") as `0x${string}` | null;
  const amount = params.get("amount") ?? undefined;

  const to = toStr && toStr !== "self" ? (Number(toStr) as SUPPORTED_CHAINS_IDS) : undefined;

  return {
    to,
    token: token ?? undefined,
    recipient: recipient && isAddress(recipient) ? recipient : undefined,
    amount,
  };
}

export function writeBridgeParams(params: BridgeParams): void {
  const url = new URL(window.location.href);

  url.searchParams.delete("to");
  url.searchParams.delete("token");
  url.searchParams.delete("recipient");
  url.searchParams.delete("amount");

  if (params.to) url.searchParams.set("to", String(params.to));
  if (params.token) url.searchParams.set("token", params.token);
  if (params.recipient && isAddress(params.recipient)) url.searchParams.set("recipient", params.recipient);
  if (params.amount) url.searchParams.set("amount", params.amount);

  window.history.replaceState({}, "", url.toString());
}
