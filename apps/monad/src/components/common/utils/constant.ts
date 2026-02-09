import { SUPPORTED_CHAINS } from "@avail-project/nexus-core";
import { formatUnits, parseUnits } from "viem";

export const SHORT_CHAIN_NAME: Record<number, string> = {
  [SUPPORTED_CHAINS.ETHEREUM]: "Ethereum",
  [SUPPORTED_CHAINS.BASE]: "Base",
  [SUPPORTED_CHAINS.ARBITRUM]: "Arbitrum",
  [SUPPORTED_CHAINS.OPTIMISM]: "Optimism",
  [SUPPORTED_CHAINS.POLYGON]: "Polygon",
  [SUPPORTED_CHAINS.AVALANCHE]: "Avalanche",
  [SUPPORTED_CHAINS.SCROLL]: "Scroll",
  [SUPPORTED_CHAINS.KAIA]: "Kaia",
  [SUPPORTED_CHAINS.BNB]: "BNB",
  [SUPPORTED_CHAINS.MONAD]: "Monad",
  [SUPPORTED_CHAINS.HYPEREVM]: "HyperEVM",
  4326: "MegaETH",
  4114: "Citrea",

  [SUPPORTED_CHAINS.SEPOLIA]: "Sepolia",
  [SUPPORTED_CHAINS.BASE_SEPOLIA]: "Base Sepolia",
  [SUPPORTED_CHAINS.ARBITRUM_SEPOLIA]: "Arbitrum Sepolia",
  [SUPPORTED_CHAINS.OPTIMISM_SEPOLIA]: "Optimism Sepolia",
  [SUPPORTED_CHAINS.POLYGON_AMOY]: "Polygon Amoy",
  [SUPPORTED_CHAINS.MONAD_TESTNET]: "Monad Testnet",
} as const;

const DEFAULT_SAFETY_MARGIN = 0.01; // 1%

export const TOKEN_IMAGES: Record<string, string> = {
  USDC: "https://coin-images.coingecko.com/coins/images/6319/large/usdc.png",
  USDT: "https://coin-images.coingecko.com/coins/images/35023/large/USDT.png",
  "USD₮0":
    "https://coin-images.coingecko.com/coins/images/35023/large/USDT.png",
  USDM: "https://assets.coingecko.com/coins/images/31719/large/usdm.png",
  WETH: "https://assets.coingecko.com/coins/images/279/large/ethereum.png?1595348880",
  USDS: "https://assets.coingecko.com/coins/images/39926/standard/usds.webp?1726666683",
  SOPH: "https://assets.coingecko.com/coins/images/38680/large/sophon_logo_200.png",
  KAIA: "https://assets.coingecko.com/asset_platforms/images/9672/large/kaia.png",
  BNB: "https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png",
  // Add ETH as fallback for any ETH-related tokens
  ETH: "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png?1696501628",
  // Add common token fallbacks
  POL: "https://coin-images.coingecko.com/coins/images/32440/standard/polygon.png",
  AVAX: "https://assets.coingecko.com/coins/images/12559/standard/Avalanche_Circle_RedWhite_Trans.png",
  FUEL: "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png",
  HYPE: "https://assets.coingecko.com/asset_platforms/images/243/large/hyperliquid.png",
  // Popular swap tokens
  DAI: "https://coin-images.coingecko.com/coins/images/9956/large/Badge_Dai.png?1696509996",
  UNI: "https://coin-images.coingecko.com/coins/images/12504/large/uni.jpg?1696512319",
  AAVE: "https://coin-images.coingecko.com/coins/images/12645/large/AAVE.png?1696512452",
  LDO: "https://coin-images.coingecko.com/coins/images/13573/large/Lido_DAO.png?1696513326",
  PEPE: "https://coin-images.coingecko.com/coins/images/29850/large/pepe-token.jpeg?1696528776",
  OP: "https://coin-images.coingecko.com/coins/images/25244/large/Optimism.png?1696524385",
  ZRO: "https://coin-images.coingecko.com/coins/images/28206/large/ftxG9_TJ_400x400.jpeg?1696527208",
  OM: "https://assets.coingecko.com/coins/images/12151/standard/OM_Token.png?1696511991",
  KAITO:
    "https://assets.coingecko.com/coins/images/54411/standard/Qm4DW488_400x400.jpg",
};

/**
 * Compute an amount string for fraction buttons (25%, 50%, 75%, 100%).
 *
 * @param balanceStr - user's balance as a human decimal string (e.g. "12.345") OR as base-unit integer string if `balanceIsBaseUnits` true
 * @param fraction - fraction e.g. 0.25, 0.5, 0.75, 1
 * @param decimals - token decimals (6 for USDC/USDT, 18 for ETH)
 * @param safetyMargin - 0.01 for 1% default
 * @param balanceIsBaseUnits - if true, balanceStr is already base units integer string (wei / smallest unit)
 * @returns decimal string clipped to token decimals (rounded down)
 */
export function computeAmountFromFraction(
  balanceStr: string,
  fraction: number,
  decimals: number,
  safetyMargin = DEFAULT_SAFETY_MARGIN,
  balanceIsBaseUnits = false,
): string {
  if (!balanceStr) return "0";

  // parse balance into base units (BigInt)
  const balanceUnits: bigint = balanceIsBaseUnits
    ? BigInt(balanceStr)
    : parseUnits(balanceStr, decimals);

  if (balanceUnits === BigInt(0)) return "0";

  // Use an integer precision multiplier to avoid FP issues
  const PREC = 1_000_000; // 1e6 precision for fraction & safety margin
  const safetyMul = BigInt(Math.max(0, Math.floor((1 - safetyMargin) * PREC))); // (1 - safetyMargin) * PREC
  const fractionMul = BigInt(Math.max(0, Math.floor(fraction * PREC))); // fraction * PREC

  // Apply safety margin: floor(balance * (1 - safetyMargin))
  const maxAfterSafety = (balanceUnits * safetyMul) / BigInt(PREC);

  // Apply fraction and floor: floor(maxAfterSafety * fraction)
  let desiredUnits = (maxAfterSafety * fractionMul) / BigInt(PREC);

  // Extra clamp just in case
  if (desiredUnits > balanceUnits) desiredUnits = balanceUnits;
  if (desiredUnits < BigInt(0)) desiredUnits = BigInt(0);

  // format back to human readable decimal string with token decimals (formatUnits truncates/keeps decimals)
  // formatUnits will produce exactly decimals digits if fractional part exists; we'll strip trailing zeros.
  const raw = formatUnits(desiredUnits, decimals);
  // strip trailing zeros and possible trailing dot
  return raw
    .replace(/(\.\d*?[1-9])0+$/u, "$1")
    .replace(/\.0+$/u, "")
    .replace(/^\.$/u, "0");
}

export const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
