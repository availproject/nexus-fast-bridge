import { SUPPORTED_CHAINS } from "@avail-project/nexus-core";

/**
 * Global token+chain max bridge amount limits (in USD).
 *
 * These rules apply across ALL fastbridge apps regardless of which chain
 * wrapper is running. Chain-specific `chainFeatures.maxBridgeAmountByTokenAndChain`
 * values are merged on top and can override individual entries here.
 *
 * Keys are uppercased token symbols. Values map destination chain ID → USD limit.
 */
export const GLOBAL_MAX_AMOUNT_BY_TOKEN_AND_CHAIN: Record<
  string,
  Record<number, number>
> = {
  // USDM bridging to MegaETH: $10,000 cap
  USDM: {
    [SUPPORTED_CHAINS.MEGAETH]: 10_000,
  },
  // USDC bridging to Citrea: $2,000 cap
  USDC: {
    [SUPPORTED_CHAINS.CITREA]: 2000,
  },
  // USDT bridging to Citrea: $2,000 cap
  USDT: {
    [SUPPORTED_CHAINS.CITREA]: 2000,
  },
};

/**
 * Resolves the effective USD limit for a token+chain combination.
 *
 * Priority (highest → lowest):
 *   1. chainFeatures.maxBridgeAmountByTokenAndChain  (per-app override)
 *   2. GLOBAL_MAX_AMOUNT_BY_TOKEN_AND_CHAIN           (cross-chain global rules)
 *   3. chainFeatures.maxBridgeAmountByDestinationChainId
 *   4. maxBridgeAmount / maxAmount                    (flat default)
 *
 * @param token    Selected token symbol (e.g. "USDC", "USDM"). Case-insensitive.
 * @param chainId  Selected destination chain ID.
 * @param options  The relevant chainFeatures values and flat max.
 * @returns        USD limit, or undefined when no cap applies.
 */
export function resolveUsdLimit({
  token,
  chainId,
  maxAmount,
  maxAmountByDestinationChainId,
  maxAmountByTokenAndChain,
}: {
  token: string | undefined;
  chainId: number | undefined | null;
  maxAmount: string | number | undefined;
  maxAmountByDestinationChainId?: Record<number, number>;
  maxAmountByTokenAndChain?: Record<string, Record<number, number>>;
}): number | undefined {
  if (token && chainId !== undefined && chainId !== null) {
    const tokenKey = token.toUpperCase();

    // 1. Chain-feature override (merged on top of global)
    const featureMap = maxAmountByTokenAndChain?.[tokenKey];
    if (featureMap?.[chainId] !== undefined) {
      return featureMap[chainId];
    }

    // 2. Global cross-chain rules
    const globalMap = GLOBAL_MAX_AMOUNT_BY_TOKEN_AND_CHAIN[tokenKey];
    if (globalMap?.[chainId] !== undefined) {
      return globalMap[chainId];
    }
  }

  // 3. Chain-only override
  if (chainId !== undefined && chainId !== null) {
    const chainOverride = maxAmountByDestinationChainId?.[chainId];
    if (chainOverride !== undefined) {
      return chainOverride;
    }
  }

  // 4. Flat default
  if (maxAmount === undefined || maxAmount === null) {
    return undefined;
  }
  const parsed = Number(maxAmount);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}
