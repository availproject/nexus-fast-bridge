// biome-ignore-all lint: NexusOne registry component from shadcn registry.

import {
  CHAIN_METADATA,
  getShortChainName,
  SUPPORTED_CHAINS,
  TOKEN_METADATA,
} from "../../common/utils/constant";
import type { SwapTokenOption } from "../components/swap-asset-selector";

export const ARC_CHAIN_ID = SUPPORTED_CHAINS.ARC;
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const ARC_EXCLUDED_TOKEN_ADDRESS =
  "0x3600000000000000000000000000000000000000".toLowerCase();

export const isArcExcludedToken = (address?: string): boolean => {
  if (!address) return false;
  return address.toLowerCase() === ARC_EXCLUDED_TOKEN_ADDRESS;
};

export const isArcNativeUsdc = (
  token?: {
    chainId?: number;
    symbol?: string;
    contractAddress?: string;
  } | null
): boolean => {
  if (!token) return false;
  const isArcChain = token.chainId === ARC_CHAIN_ID;
  if (!isArcChain) return false;
  const isUsdcSymbol = token.symbol?.toUpperCase() === "USDC";
  const isNativeAddress =
    !token.contractAddress ||
    token.contractAddress.toLowerCase() === ZERO_ADDRESS ||
    token.contractAddress.toLowerCase() ===
      "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
  return isUsdcSymbol && isNativeAddress;
};

export const getArcChainMeta = () => ({
  logo:
    CHAIN_METADATA[ARC_CHAIN_ID]?.logo ??
    "https://cdn.prod.website-files.com/685311a976e7c248b5dfde95/68921f69e5659feee825637e_9a3d143150a36125b5d7f0c2367c9ca6_arc-favicon-test.png",
  name: getShortChainName(ARC_CHAIN_ID, "Arc"),
});

export const getArcNativeTokenOption = (): SwapTokenOption => {
  const chain = getArcChainMeta();
  return {
    balance: "0",
    balanceInFiat: "$0.00",
    chainId: ARC_CHAIN_ID,
    chainLogo: chain.logo,
    chainName: chain.name,
    contractAddress: ZERO_ADDRESS,
    decimals: 18,
    logo: TOKEN_METADATA.USDC.logo,
    name: "USDC",
    symbol: "USDC",
    priceUSD: "1.00",
  };
};

export const getArcReceiveTokenOptions = (): SwapTokenOption[] => [
  getArcNativeTokenOption(),
];
