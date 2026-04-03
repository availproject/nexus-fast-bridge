import { SUPPORTED_CHAINS } from "@avail-project/nexus-core";
import type { ChainFeatures } from "@/types/runtime";
import config from "../config";

export const appConfig = config;

export const chainFeatures: ChainFeatures = {
  slug: "megaeth",
  analyticsFastBridgeKey: "megaeth",
  maxBridgeAmount: 550,
  maxBridgeAmountByTokenAndChain: {
    USDM: {
      [SUPPORTED_CHAINS.MEGAETH]: 10_000,
    },
  },

  walletInitDelayMs: 500,
  showFluffeyMascot: true,
  showPromoBanner: false,
  promoBannerLine1: "Zero solver and protocol fees when bridging to MegaETH.",
  promoBannerLine2: "Till Friday the 13th. Don't fade anon.",
  promoBannerImageUrl:
    "https://files.availproject.org/fastbridge/megaeth/megaeth-mascot-1.png",
  pageDescription:
    "Avail Fast Bridge for MegaETH enables instant, secure bridging of USDC and ETH to the MegaETH network. Powered by Avail Nexus, it supports seamless transfers from Ethereum, Base, Optimism, Arbitrum, and more, ensuring liquidity is unified without complex wrapping.",
  showSupportCta: true,
  supportCtaHref: "https://discord.com/invite/AvailProject",
  supportCtaLine1: "Reach out to us if",
  supportCtaLine2: "you face any issues",
  mapUsdmDisplaySymbolToUsdc: false,
  mapUsdmToUsdcBalance: true,
  tokenLogoOverrideBySymbol: {
    USDM: "https://mega.etherscan.io/token/images/usdm_32.png",
  },
  postBridgeWatchAsset: {
    destinationChainId: SUPPORTED_CHAINS.MEGAETH,
    tokenSymbol: "USDM",
    walletAsset: {
      address: "0xFAfDdbb3FC7688494971a79cc65DCa3EF82079E7",
      symbol: "USDm",
      decimals: 18,
      image: "https://mega.etherscan.io/token/images/usdm_32.png",
    },
  },
  denyIntentOnReset: false,
  tokenDenyListByChainId: {},
  allowanceLogoOverrideByChainId: {},
  amountInputUseCalculatedMaxHeader: true,
  amountInputShowDestinationBadge: true,
  amountInputUseSourceSymbolInBreakdown: true,
  hideMegaethSourceForUsdm: false,
  feeBreakdownHideGasSupplied: true,
  feeBreakdownKeepZeroRows: true,
  dialogShowCloseButton: false,
  enableGtagOnConnectWallet: true,
};
