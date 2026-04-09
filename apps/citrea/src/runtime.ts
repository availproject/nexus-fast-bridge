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
  pageDescription:
    "Bridge USDC to Citrea instantly with Avail Fast Bridge. Leveraging Avail Nexus infrastructure, we provide a secure, decentralized path to move liquidity from 12+ chains including Ethereum and major L2s directly to Citrea.",
  mapUsdmDisplaySymbolToUsdc: false,
  mapUsdmToUsdcBalance: true,
  tokenLogoOverrideBySymbol: {
    USDM: "https://raw.githubusercontent.com/availproject/nexus-assets/refs/heads/main/tokens/usdm/logo.png",
  },
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
  enableGtagOnConnectWallet: true,
};
