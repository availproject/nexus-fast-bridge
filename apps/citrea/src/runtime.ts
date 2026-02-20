import { SUPPORTED_CHAINS } from "@avail-project/nexus-core";
import type { ChainFeatures } from "@/types/runtime";
import config from "../config";

export const appConfig = config;

export const chainFeatures: ChainFeatures = {
  slug: "citrea",
  analyticsFastBridgeKey: "citrea",
  maxBridgeAmount: 550,
  walletInitDelayMs: 0,
  showFluffeyMascot: false,
  showPromoBanner: false,
  mapUsdmDisplaySymbolToUsdc: false,
  mapUsdmToUsdcBalance: false,
  denyIntentOnReset: true,
  tokenDenyListByChainId: {
    [SUPPORTED_CHAINS.CITREA]: ["cBTC"],
  },
  allowanceLogoOverrideByChainId: {
    [SUPPORTED_CHAINS.CITREA]: "/citrea-chain-logo.webp",
  },
  amountInputUseCalculatedMaxHeader: false,
  amountInputShowDestinationBadge: false,
  amountInputUseSourceSymbolInBreakdown: false,
  hideMegaethSourceForUsdm: true,
  feeBreakdownHideGasSupplied: false,
  feeBreakdownKeepZeroRows: false,
  dialogShowCloseButton: true,
};
