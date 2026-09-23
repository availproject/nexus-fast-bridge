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
/** Arc's standard USDC contract representation used by Relay. */
export const ARC_RELAY_USDC_ADDRESS =
  "0x3600000000000000000000000000000000000000".toLowerCase();

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

export const isArcErc20Usdc = (
  token?: {
    chainId?: number;
    symbol?: string;
    contractAddress?: string;
  } | null
): boolean => {
  if (!token) return false;
  const isArc =
    token.chainId === ARC_CHAIN_ID || token.chainId === SUPPORTED_CHAINS.ARC;
  if (!isArc) return false;
  const isUsdc = token.symbol?.toUpperCase() === "USDC";
  if (!isUsdc) return false;
  const address = (token.contractAddress ?? "").toLowerCase();
  const isNative =
    !address ||
    address === ZERO_ADDRESS ||
    address === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
  return !isNative;
};

export const isArcRelayUsdc = (
  token?: {
    chainId?: number;
    symbol?: string;
    contractAddress?: string;
  } | null
): boolean =>
  isArcErc20Usdc(token) &&
  token?.contractAddress?.toLowerCase() === ARC_RELAY_USDC_ADDRESS;

/** Reject unknown Arc ERC-20 USDC contracts while allowing Relay's canonical token. */
export const isArcUnsupportedErc20Usdc = (
  token?: {
    chainId?: number;
    symbol?: string;
    contractAddress?: string;
  } | null
): boolean => isArcErc20Usdc(token) && !isArcRelayUsdc(token);

export const getArcReceiveTokenOptions = (): SwapTokenOption[] => [
  getArcNativeTokenOption(),
];
