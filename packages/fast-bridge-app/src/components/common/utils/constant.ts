import { formatUnits, parseUnits } from "viem";

const FRACTION_TRAILING_ZEROES_REGEX = /(\.\d*?[1-9])0+$/u;
const DECIMAL_TRAILING_ZEROES_REGEX = /\.0+$/u;
const ONLY_DOT_REGEX = /^\.$/u;

export const SUPPORTED_CHAINS = {
  ETHEREUM: 1,
  BASE: 8453,
  ARBITRUM: 42_161,
  OPTIMISM: 10,
  POLYGON: 137,
  AVALANCHE: 43_114,
  SCROLL: 534_352,
  KAIA: 8217,
  BNB: 56,
  MONAD: 220_024,
  HYPEREVM: 999,
  MEGAETH: 4326,
  CITREA: 4114,
  SEPOLIA: 11_155_111,
  BASE_SEPOLIA: 84_532,
  ARBITRUM_SEPOLIA: 421_614,
  OPTIMISM_SEPOLIA: 11_155_420,
  POLYGON_AMOY: 80_002,
  MONAD_TESTNET: 10_143,
} as const;

export type SUPPORTED_CHAINS_IDS =
  (typeof SUPPORTED_CHAINS)[keyof typeof SUPPORTED_CHAINS];

export type SUPPORTED_TOKENS = string;

export const CHAIN_METADATA: Record<
  number,
  {
    blockExplorerUrls?: string[];
    logo: string;
    name: string;
    nativeCurrency: { decimals: number; name: string; symbol: string };
    rpcUrls?: string[];
  }
> = {
  [SUPPORTED_CHAINS.ETHEREUM]: {
    logo: "https://raw.githubusercontent.com/availproject/nexus-assets/main/chains/ethereum/logo.png",
    name: "Ethereum",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    blockExplorerUrls: ["https://etherscan.io"],
  },
  [SUPPORTED_CHAINS.BASE]: {
    logo: "https://raw.githubusercontent.com/availproject/nexus-assets/main/chains/base/logo.png",
    name: "Base",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    blockExplorerUrls: ["https://basescan.org"],
  },
  [SUPPORTED_CHAINS.ARBITRUM]: {
    logo: "https://raw.githubusercontent.com/availproject/nexus-assets/main/chains/arbitrum/logo.png",
    name: "Arbitrum",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    blockExplorerUrls: ["https://arbiscan.io"],
  },
  [SUPPORTED_CHAINS.OPTIMISM]: {
    logo: "https://raw.githubusercontent.com/availproject/nexus-assets/main/chains/optimism/logo.png",
    name: "Optimism",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    blockExplorerUrls: ["https://optimistic.etherscan.io"],
  },
  [SUPPORTED_CHAINS.POLYGON]: {
    logo: "https://raw.githubusercontent.com/availproject/nexus-assets/main/chains/polygon/logo.png",
    name: "Polygon",
    nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
    blockExplorerUrls: ["https://polygonscan.com"],
  },
  [SUPPORTED_CHAINS.AVALANCHE]: {
    logo: "https://raw.githubusercontent.com/availproject/nexus-assets/main/chains/avalanche/logo.png",
    name: "Avalanche",
    nativeCurrency: { name: "AVAX", symbol: "AVAX", decimals: 18 },
    blockExplorerUrls: ["https://snowtrace.io"],
  },
  [SUPPORTED_CHAINS.SCROLL]: {
    logo: "https://raw.githubusercontent.com/availproject/nexus-assets/main/chains/scroll/logo.png",
    name: "Scroll",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    blockExplorerUrls: ["https://scrollscan.com"],
  },
  [SUPPORTED_CHAINS.KAIA]: {
    logo: "https://assets.coingecko.com/asset_platforms/images/9672/large/kaia.png",
    name: "Kaia",
    nativeCurrency: { name: "KAIA", symbol: "KAIA", decimals: 18 },
    blockExplorerUrls: ["https://kaiascan.io"],
  },
  [SUPPORTED_CHAINS.BNB]: {
    logo: "https://raw.githubusercontent.com/availproject/nexus-assets/main/chains/bnb/logo.png",
    name: "BNB Smart Chain",
    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
    blockExplorerUrls: ["https://bscscan.com"],
  },
  [SUPPORTED_CHAINS.MONAD]: {
    logo: "https://raw.githubusercontent.com/availproject/nexus-assets/main/chains/monad/logo.png",
    name: "Monad",
    nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  },
  [SUPPORTED_CHAINS.HYPEREVM]: {
    logo: "https://assets.coingecko.com/asset_platforms/images/243/large/hyperliquid.png",
    name: "HyperEVM",
    nativeCurrency: { name: "HYPE", symbol: "HYPE", decimals: 18 },
  },
  [SUPPORTED_CHAINS.MEGAETH]: {
    logo: "https://files.availproject.org/nexus-fast-bridge/logos/megaeth.svg",
    name: "MegaETH",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    blockExplorerUrls: ["https://explorer.megaeth.systems"],
  },
  [SUPPORTED_CHAINS.CITREA]: {
    logo: "https://raw.githubusercontent.com/availproject/nexus-assets/main/chains/citrea/logo.png",
    name: "Citrea",
    nativeCurrency: { name: "cBTC", symbol: "cBTC", decimals: 18 },
    blockExplorerUrls: ["https://explorer.citrea.xyz"],
  },
  [SUPPORTED_CHAINS.SEPOLIA]: {
    logo: "https://raw.githubusercontent.com/availproject/nexus-assets/main/chains/ethereum/logo.png",
    name: "Sepolia",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    blockExplorerUrls: ["https://sepolia.etherscan.io"],
  },
  [SUPPORTED_CHAINS.BASE_SEPOLIA]: {
    logo: "https://raw.githubusercontent.com/availproject/nexus-assets/main/chains/base/logo.png",
    name: "Base Sepolia",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    blockExplorerUrls: ["https://sepolia.basescan.org"],
  },
  [SUPPORTED_CHAINS.ARBITRUM_SEPOLIA]: {
    logo: "https://raw.githubusercontent.com/availproject/nexus-assets/main/chains/arbitrum/logo.png",
    name: "Arbitrum Sepolia",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    blockExplorerUrls: ["https://sepolia.arbiscan.io"],
  },
  [SUPPORTED_CHAINS.OPTIMISM_SEPOLIA]: {
    logo: "https://raw.githubusercontent.com/availproject/nexus-assets/main/chains/optimism/logo.png",
    name: "Optimism Sepolia",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    blockExplorerUrls: ["https://sepolia-optimism.etherscan.io"],
  },
  [SUPPORTED_CHAINS.POLYGON_AMOY]: {
    logo: "https://raw.githubusercontent.com/availproject/nexus-assets/main/chains/polygon/logo.png",
    name: "Polygon Amoy",
    nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
    blockExplorerUrls: ["https://amoy.polygonscan.com"],
  },
  [SUPPORTED_CHAINS.MONAD_TESTNET]: {
    logo: "https://raw.githubusercontent.com/availproject/nexus-assets/main/chains/monad/logo.png",
    name: "Monad Testnet",
    nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  },
};

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

export const TOKEN_METADATA: Record<
  string,
  { decimals: number; icon: string; logo: string; name: string; symbol: string }
> = {
  ETH: {
    decimals: 18,
    name: "Ethereum",
    symbol: "ETH",
    logo: "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png?1696501628",
    icon: "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png?1696501628",
  },
  USDC: {
    decimals: 6,
    name: "USD Coin",
    symbol: "USDC",
    logo: "https://coin-images.coingecko.com/coins/images/6319/large/usdc.png",
    icon: "https://coin-images.coingecko.com/coins/images/6319/large/usdc.png",
  },
  USDT: {
    decimals: 6,
    name: "Tether USD",
    symbol: "USDT",
    logo: "https://coin-images.coingecko.com/coins/images/35023/large/USDT.png",
    icon: "https://coin-images.coingecko.com/coins/images/35023/large/USDT.png",
  },
  USDM: {
    decimals: 18,
    name: "USDm",
    symbol: "USDM",
    logo: "https://raw.githubusercontent.com/availproject/nexus-assets/refs/heads/main/tokens/usdm/logo.png",
    icon: "https://raw.githubusercontent.com/availproject/nexus-assets/refs/heads/main/tokens/usdm/logo.png",
  },
  DAI: {
    decimals: 18,
    name: "Dai Stablecoin",
    symbol: "DAI",
    logo: "https://coin-images.coingecko.com/coins/images/9956/large/Badge_Dai.png?1696509996",
    icon: "https://coin-images.coingecko.com/coins/images/9956/large/Badge_Dai.png?1696509996",
  },
  WBTC: {
    decimals: 8,
    name: "Wrapped BTC",
    symbol: "WBTC",
    logo: "https://raw.githubusercontent.com/availproject/nexus-assets/main/tokens/wbtc/logo.png",
    icon: "https://raw.githubusercontent.com/availproject/nexus-assets/main/tokens/wbtc/logo.png",
  },
};

export const TOKEN_IMAGES: Record<string, string> = {
  USDC: "https://coin-images.coingecko.com/coins/images/6319/large/usdc.png",
  USDT: "https://coin-images.coingecko.com/coins/images/35023/large/USDT.png",
  "USD₮0":
    "https://coin-images.coingecko.com/coins/images/35023/large/USDT.png",
  USDM: "https://raw.githubusercontent.com/availproject/nexus-assets/refs/heads/main/tokens/usdm/logo.png",
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

export const TOKEN_CONTRACT_ADDRESSES = {
  USDC: {
    1: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    137: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359",
    42161: "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
    10: "0x0b2c639c533813f4aa9d7837caf62653d097ff85",
    534352: "0x06efdbff2a14a7c8e15944d1f4a48f9f95f663a4",
    43114: "0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e",
    56: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    999: "0xb88339CB7199b77E23DB6E890353E22632Ba630f",
    220024: "0x754704Bc059F8C67012fEd69BC8A327a5aafb603",
    4114: "0xE045e6c36cF77FAA2CfB54466D71A3aEF7bbE839",
    11155111: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    84532: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    421614: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
    11155420: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7",
    80002: "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582",
    10143: "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea",
    5115: "0xb669dC8cC6D044307Ba45366C0c836eC3c7e31AA",
  },
  USDT: {
    1: "0xdac17f958d2ee523a2206206994597c13d831ec7",
    137: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
    42161: "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9",
    8217: "0xd077a400968890eacc75cdc901f0356c943e4fdb",
    10: "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58",
    534352: "0xf55bec9cafdbe8730f096aa55dad6d22d44099df",
    43114: "0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7",
    56: "0x55d398326f99059fF775485246999027B3197955",
    999: "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb",
    4114: "0x9f3096Bac87e7F03DC09b0B416eB0DF837304dc4",
    4326: "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb",
    946007: "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb",
    421614: "0xF954d4A5859b37De88a91bdbb8Ad309056FB04B1",
    11155420: "0x6462693c2F21AC0E517f12641D404895030F7426",
    10143: "0x1c56F176D6735888fbB6f8bD9ADAd8Ad7a023a0b",
  },
  USDM: {
    4326: "0xFAfDdbb3FC7688494971a79cc65DCa3EF82079E7",
    946007: "0xFAfDdbb3FC7688494971a79cc65DCa3EF82079E7",
  },
} as Record<string, Record<number, `0x${string}`>>;

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
  balanceIsBaseUnits = false
): string {
  if (!balanceStr) {
    return "0";
  }

  // parse balance into base units (BigInt)
  const balanceUnits: bigint = balanceIsBaseUnits
    ? BigInt(balanceStr)
    : parseUnits(balanceStr, decimals);

  if (balanceUnits === BigInt(0)) {
    return "0";
  }

  // Use an integer precision multiplier to avoid FP issues
  const PREC = 1_000_000; // 1e6 precision for fraction & safety margin
  const safetyMul = BigInt(Math.max(0, Math.floor((1 - safetyMargin) * PREC))); // (1 - safetyMargin) * PREC
  const fractionMul = BigInt(Math.max(0, Math.floor(fraction * PREC))); // fraction * PREC

  // Apply safety margin: floor(balance * (1 - safetyMargin))
  const maxAfterSafety = (balanceUnits * safetyMul) / BigInt(PREC);

  // Apply fraction and floor: floor(maxAfterSafety * fraction)
  let desiredUnits = (maxAfterSafety * fractionMul) / BigInt(PREC);

  // Extra clamp just in case
  if (desiredUnits > balanceUnits) {
    desiredUnits = balanceUnits;
  }
  if (desiredUnits < BigInt(0)) {
    desiredUnits = BigInt(0);
  }

  // format back to human readable decimal string with token decimals (formatUnits truncates/keeps decimals)
  // formatUnits will produce exactly decimals digits if fractional part exists; we'll strip trailing zeros.
  const raw = formatUnits(desiredUnits, decimals);
  // strip trailing zeros and possible trailing dot
  return raw
    .replace(FRACTION_TRAILING_ZEROES_REGEX, "$1")
    .replace(DECIMAL_TRAILING_ZEROES_REGEX, "")
    .replace(ONLY_DOT_REGEX, "0");
}

export const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const usdFormatterPrecise = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

/**
 * Format a USD number for display.
 * Values smaller than 0.001 are shown as "< $0.001".
 * Values between 0.001 and 0.01 are shown with 3 decimals.
 */
export function formatUsdForDisplay(value: number): string {
  if (!Number.isFinite(value)) {
    return usdFormatter.format(0);
  }
  const absValue = Math.abs(value);

  if (absValue === 0) {
    return usdFormatter.format(0);
  }
  if (absValue < 0.001) {
    return "< $0.001";
  }
  if (absValue < 0.01) {
    return usdFormatterPrecise.format(value);
  }

  return usdFormatter.format(value);
}
