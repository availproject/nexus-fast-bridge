import type { ChainFeatures } from "@/types/runtime";
import config from "../config";

export const appConfig = config;

export const chainFeatures: ChainFeatures = {
  slug: "monad",
  analyticsFastBridgeKey: "monad",
  maxBridgeAmount: 550,
  walletInitDelayMs: 0,
  showFluffeyMascot: false,
  showPromoBanner: false,
  pageDescription:
    "Experience the fastest way to bridge assets to Monad. Avail Fast Bridge facilitates instant stablecoin and token transfers from Ethereum, Base, Arbitrum, and Optimism. Built on Avail Nexus, it ensures your transition to the Monad ecosystem is secure and seamless.",
  mapUsdmDisplaySymbolToUsdc: false,
  mapUsdmToUsdcBalance: true,
  tokenLogoOverrideBySymbol: {
    USDM: "https://raw.githubusercontent.com/availproject/nexus-assets/refs/heads/main/tokens/usdm/logo.png",
  },
  denyIntentOnReset: true,
  tokenDenyListByChainId: {},
  allowanceLogoOverrideByChainId: {},
  amountInputUseCalculatedMaxHeader: false,
  amountInputShowDestinationBadge: false,
  amountInputUseSourceSymbolInBreakdown: false,
  hideMegaethSourceForUsdm: true,
  feeBreakdownHideGasSupplied: false,
  feeBreakdownKeepZeroRows: false,
  dialogShowCloseButton: true,
};
