export interface AppConfig {
  appDescription: string;
  appTitle: string;
  chainBlockExplorerUrl: string;
  chainGifAlt: string;
  chainGifUrl: string;
  chainIconUrl: string;
  chainId: number;
  chainLogoUrl: string;
  chainName: string;
  chainNativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  chainRpcUrl: string;
  chainTestnet: boolean;
  heroText: string;
  meta: {
    title: string;
    description: string;
    canonicalUrl: string;
    imageUrl: string;
    faviconUrl: string;
    themeColor: string;
    backgroundColor: string;
  };
  nexusNetwork: string;
  nexusPrimaryToken: string;
  nexusSupportedChain: number;
  primaryColor: string;
  secondaryColor: string;
  useChainLogo: boolean;
}

export interface ChainFeatures {
  allowanceLogoOverrideByChainId?: Record<number, string>;
  amountInputShowDestinationBadge?: boolean;
  amountInputUseCalculatedMaxHeader?: boolean;
  amountInputUseSourceSymbolInBreakdown?: boolean;
  analyticsFastBridgeKey: string;
  denyIntentOnReset?: boolean;
  dialogShowCloseButton?: boolean;
  feeBreakdownHideGasSupplied?: boolean;
  feeBreakdownKeepZeroRows?: boolean;
  feeBreakdownZeroForNonCaGasOnDestinationId?: number;
  hideMegaethSourceForUsdm?: boolean;
  mapUsdmDisplaySymbolToUsdc?: boolean;
  mapUsdmToUsdcBalance?: boolean;
  maxBridgeAmount: number;
  promoBannerImageUrl?: string;
  promoBannerLine1?: string;
  promoBannerLine2?: string;
  showFluffeyMascot?: boolean;
  showPromoBanner?: boolean;
  slug: string;
  tokenDenyListByChainId?: Record<number, string[]>;
  walletInitDelayMs?: number;
}

export const defaultChainFeatures: ChainFeatures = {
  slug: "default",
  analyticsFastBridgeKey: "default",
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
