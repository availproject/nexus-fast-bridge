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
  mapUsdmDisplaySymbolToUsdc: false,
  mapUsdmToUsdcBalance: false,
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
