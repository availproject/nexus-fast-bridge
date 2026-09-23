// biome-ignore-all lint: NexusOne registry component from shadcn registry.

import { CHAIN_METADATA } from "../../common/utils/constant";

export const SWAP_CHAIN_DISPLAY_ORDER = [
  5042, // Arc
  1, // Ethereum
  42161, // Arbitrum
  8453, // Base
  137, // Polygon
  10, // OP
  999, // HyperEVM
  56, // BSC
  43114, // Avalanche
  143, // Monad
  4326, // MegaETH
  4114, // Citrea
] as const;

export const SWAP_CHAIN_DISPLAY_ORDER_RANK = new Map<number, number>(
  SWAP_CHAIN_DISPLAY_ORDER.map((chainId, index) => [chainId, index])
);

export const SWAP_CHAIN_DISPLAY_ORDER_SET = new Set<number>(
  SWAP_CHAIN_DISPLAY_ORDER
);

export const sortChainIdsBySwapDisplayOrder = (chainIds: number[]) =>
  [...chainIds].sort((a, b) => {
    const aRank =
      SWAP_CHAIN_DISPLAY_ORDER_RANK.get(a) ?? Number.MAX_SAFE_INTEGER;
    const bRank =
      SWAP_CHAIN_DISPLAY_ORDER_RANK.get(b) ?? Number.MAX_SAFE_INTEGER;
    if (aRank !== bRank) return aRank - bRank;

    const aName = CHAIN_METADATA[a]?.name ?? String(a);
    const bName = CHAIN_METADATA[b]?.name ?? String(b);
    return aName.localeCompare(bName);
  });

export const compareChainsBySwapDisplayOrder = <
  T extends { chainId?: number; chainName?: string },
>(
  a: T,
  b: T
) => {
  const aRank =
    SWAP_CHAIN_DISPLAY_ORDER_RANK.get(a.chainId ?? -1) ??
    Number.MAX_SAFE_INTEGER;
  const bRank =
    SWAP_CHAIN_DISPLAY_ORDER_RANK.get(b.chainId ?? -1) ??
    Number.MAX_SAFE_INTEGER;
  if (aRank !== bRank) return aRank - bRank;
  return (a.chainName ?? "").localeCompare(b.chainName ?? "");
};
