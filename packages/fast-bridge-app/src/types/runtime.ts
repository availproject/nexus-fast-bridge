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
  enableGtagOnConnectWallet?: boolean;
  feeBreakdownHideGasSupplied?: boolean;
  feeBreakdownKeepZeroRows?: boolean;
  feeBreakdownZeroForNonCaGasOnDestinationId?: number;
  hideMegaethSourceForUsdm?: boolean;
  mapUsdmDisplaySymbolToUsdc?: boolean;
  mapUsdmToUsdcBalance?: boolean;
  maxBridgeAmount: number;
  pageDescription?: string;
  postBridgeWatchAsset?: {
    destinationChainId: number;
    tokenSymbol: string;
    walletAsset: {
      address: string;
      decimals: number;
      image: string;
      symbol: string;
    };
  };
  promoBannerImageUrl?: string;
  promoBannerLine1?: string;
  promoBannerLine2?: string;
  showFluffeyMascot?: boolean;
  showPromoBanner?: boolean;
  showSupportCta?: boolean;
  slug: string;
  supportCtaHref?: string;
  supportCtaLine1?: string;
  supportCtaLine2?: string;
  tokenDenyListByChainId?: Record<number, string[]>;
  tokenLogoOverrideBySymbol?: Record<string, string>;
  walletInitDelayMs?: number;
}

export const defaultChainFeatures: ChainFeatures = {
  slug: "default",
  analyticsFastBridgeKey: "default",
  maxBridgeAmount: 550,
  walletInitDelayMs: 0,
  showFluffeyMascot: false,
  showPromoBanner: false,
  showSupportCta: false,
  mapUsdmDisplaySymbolToUsdc: false,
  mapUsdmToUsdcBalance: false,
  denyIntentOnReset: true,
  tokenDenyListByChainId: {},
  tokenLogoOverrideBySymbol: {},
  allowanceLogoOverrideByChainId: {},
  amountInputUseCalculatedMaxHeader: false,
  amountInputShowDestinationBadge: false,
  amountInputUseSourceSymbolInBreakdown: false,
  hideMegaethSourceForUsdm: true,
  feeBreakdownHideGasSupplied: false,
  feeBreakdownKeepZeroRows: false,
  dialogShowCloseButton: true,
  enableGtagOnConnectWallet: false,
};
