// biome-ignore-all lint: NexusOne registry component from shadcn registry.

import { isArcUnsupportedErc20Usdc, ZERO_ADDRESS } from "./arc-tokens";

export type RawReceiveToken = {
  address?: string;
  decimals?: number;
  logoURI?: string;
  name?: string;
  priceUSD?: number | string;
  providers?: string[];
  symbol?: string;
  verificationStatus?: "flagged" | "unverified" | "verified";
};

export type RelayCurrencyResponse = {
  address: string;
  chainId: number;
  decimals: number;
  metadata?: {
    logoURI?: string;
    verified?: boolean;
  };
  name: string;
  symbol: string;
  vmType?: string;
};

export const normalizeReceiveTokenAddress = (address?: string): string => {
  if (!address) return "";
  const lower = address.toLowerCase();
  if (
    lower === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" ||
    lower === ZERO_ADDRESS
  ) {
    return ZERO_ADDRESS;
  }
  return lower;
};

export const fetchRelayCurrenciesForChain = async (
  chainId: number
): Promise<RawReceiveToken[]> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const response = await fetch("https://api.relay.link/currencies/v2", {
      body: JSON.stringify({
        chainIds: [chainId],
        limit: 100,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as RelayCurrencyResponse[];
    if (!Array.isArray(data)) {
      return [];
    }

    const tokens: RawReceiveToken[] = [];
    for (const item of data) {
      if (!item || typeof item !== "object") continue;
      if (!item.address || !item.symbol) continue;

      tokens.push({
        address: item.address,
        decimals: typeof item.decimals === "number" ? item.decimals : 18,
        logoURI: item.metadata?.logoURI || "",
        name: item.name || item.symbol,
        symbol: item.symbol,
        providers: ["relay"],
        verificationStatus: item.metadata?.verified ? "verified" : "unverified",
      });
    }

    return tokens;
  } catch {
    return [];
  }
};

export const fetchRelayCurrenciesForChains = async (
  chainIds: readonly number[] | number[]
): Promise<Record<number, RawReceiveToken[]>> => {
  const settled = await Promise.allSettled(
    chainIds.map(async (chainId) => {
      const tokens = await fetchRelayCurrenciesForChain(chainId);
      return { chainId, tokens };
    })
  );

  const result: Record<number, RawReceiveToken[]> = {};
  for (const item of settled) {
    if (item.status === "fulfilled" && item.value.tokens.length > 0) {
      result[item.value.chainId] = item.value.tokens;
    }
  }
  return result;
};

export const mergeRelayTokensIntoLifi = (
  lifiTokens: Record<string, RawReceiveToken[]>,
  relayTokensByChain: Record<number, RawReceiveToken[]>
): Record<string, RawReceiveToken[]> => {
  const merged: Record<string, RawReceiveToken[]> = { ...lifiTokens };

  for (const [chainIdKey, relayTokens] of Object.entries(relayTokensByChain)) {
    const chainId = Number(chainIdKey);
    const existingTokens = merged[chainIdKey] ?? [];

    const existingAddresses = new Set<string>();
    const existingNativeSymbols = new Set<string>();

    for (const token of existingTokens) {
      const normalized = normalizeReceiveTokenAddress(token.address);
      if (normalized) {
        existingAddresses.add(normalized);
      }
      if (normalized === ZERO_ADDRESS && token.symbol) {
        existingNativeSymbols.add(token.symbol.toUpperCase());
      }
    }

    const tokensToAdd: RawReceiveToken[] = [];
    for (const token of relayTokens) {
      if (!token.address || !token.symbol) continue;

      if (
        isArcUnsupportedErc20Usdc({
          chainId,
          contractAddress: token.address,
          symbol: token.symbol,
        })
      ) {
        continue;
      }

      const normalized = normalizeReceiveTokenAddress(token.address);

      const existingToken = existingTokens.find(
        (candidate) =>
          normalizeReceiveTokenAddress(candidate.address) === normalized
      );
      if (existingToken) {
        existingToken.providers = Array.from(
          new Set([...(existingToken.providers ?? []), "relay"])
        );
      }

      if (normalized === ZERO_ADDRESS) {
        if (
          existingAddresses.has(normalized) ||
          existingNativeSymbols.has(token.symbol.toUpperCase())
        ) {
          continue;
        }
      } else if (existingAddresses.has(normalized)) {
        continue;
      }

      existingAddresses.add(normalized);
      tokensToAdd.push({
        ...token,
        providers: Array.from(new Set([...(token.providers ?? []), "relay"])),
      });
    }

    if (tokensToAdd.length > 0) {
      merged[chainIdKey] = [...existingTokens, ...tokensToAdd];
    }
  }

  return merged;
};
