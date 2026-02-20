import { SUPPORTED_CHAINS } from "@avail-project/nexus-core";
import type { ChainFeatures } from "@/types/runtime";
import config from "../config";

export const appConfig = config;

export const chainFeatures: ChainFeatures = {
  slug: "megaeth",
  analyticsFastBridgeKey: "megaeth",
  maxBridgeAmount: 5000,
  walletInitDelayMs: 500,
  showFluffeyMascot: true,
  showPromoBanner: true,
  promoBannerLine1: "Zero solver and protocol fees when bridging to MegaETH.",
  promoBannerLine2: "48h window. Don't fade anon.",
  promoBannerImageUrl:
    "https://files.availproject.org/fastbridge/megaeth/megaeth-mascot-1.png",
  mapUsdmDisplaySymbolToUsdc: true,
  mapUsdmToUsdcBalance: true,
  denyIntentOnReset: false,
  tokenDenyListByChainId: {},
  allowanceLogoOverrideByChainId: {},
  amountInputUseCalculatedMaxHeader: true,
  amountInputShowDestinationBadge: true,
  amountInputUseSourceSymbolInBreakdown: true,
  hideMegaethSourceForUsdm: false,
  feeBreakdownHideGasSupplied: true,
  feeBreakdownKeepZeroRows: true,
  feeBreakdownZeroForNonCaGasOnDestinationId: SUPPORTED_CHAINS.MEGAETH,
  dialogShowCloseButton: false,
};
