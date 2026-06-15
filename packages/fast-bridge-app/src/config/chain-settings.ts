import { SUPPORTED_CHAINS } from "@avail-project/nexus-core";
import type { AppConfig, ChainFeatures } from "@/types/runtime";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChainSettings {
  appConfig: AppConfig;
  chainFeatures: ChainFeatures;
  slug: string;
}

export const DEFAULT_CHAIN_SLUG = "ethereum";

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const CHAIN_REGISTRY: Record<string, ChainSettings> = {
  // ── MegaETH ─────────────────────────────────────────────────────────────
  megaeth: {
    slug: "megaeth",
    appConfig: {
      chainId: 4326,
      chainName: "MegaETH",
      chainNativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      chainRpcUrl: "https://rpcs.avail.so/megaeth",
      chainBlockExplorerUrl: "https://explorer.megaeth.systems/",
      chainTestnet: false,
      useChainLogo: true,
      chainIconUrl:
        "https://files.availproject.org/fastbridge/megaeth/megaeth-favicon.svg",
      chainLogoUrl:
        "https://files.availproject.org/nexus-fast-bridge/logos/megaeth.svg",
      backgroundImageUrl:
        "https://files.availproject.org/nexus-fast-bridge/bg/bg-megaeth.png",
      chainGifUrl: "/megaeth.gif",
      chainGifAlt: "Fast MegaETH",
      heroText: "Move your assets to MegaETH faster than ever!",
      appTitle: "MegaETH Fast Bridge",
      appDescription: "MegaETH Fast Bridge",
      primaryColor: "#2B2B2B",
      secondaryColor: "#ECE8E8",
      nexusNetwork: "mainnet",
      nexusSupportedChain: 4326,
      nexusPrimaryToken: "USDM",
      boxShadow:
        "#FFFFFFE6 0px 1px 0px inset, #FFFFFF8C 0px 0px 0px 14px, #2B2B2B0A 0px 2px 4px, #2B2B2B29 0px 12px 24px, #2B2B2B26 0px 32px 64px",
      ribbonPng: "/landing-new/assets/chain-gradients/megaeth-ribbon.png",
      meta: {
        title: "Bridge to MegaETH – Instant Cross-Chain Transfers | FastBridge",
        description:
          "Bridge USDC, USDT, ETH, and other tokens from major EVM chains to MegaETH in one transaction. FastBridge is the fastest way to bridge to MegaETH with low fees from any chain.",
        canonicalUrl: "https://fastbridge.availproject.org/megaeth",
        imageUrl:
          "https://files.availproject.org/nexus-fast-bridge/meta/megaeth.jpg",
        faviconUrl: "/avail_logo.svg",
        themeColor: "#2B2B2B",
        backgroundColor: "#ECE8E8",
      },
    },
    chainFeatures: {
      supportedTokens: ["USDM", "USDT", "ETH"],
      slug: "megaeth",
      buttonFg: "white",
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
      promoBannerLine1:
        "Zero solver and protocol fees when bridging to MegaETH.",
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
    },
  },

  // ── Monad ───────────────────────────────────────────────────────────────
  monad: {
    slug: "monad",
    appConfig: {
      chainId: 143,
      chainName: "Monad",
      chainNativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
      chainRpcUrl: "https://rpcs.avail.so/monad",
      chainBlockExplorerUrl: "https://monadvision.com/",
      chainTestnet: false,
      useChainLogo: true,
      chainIconUrl:
        "https://files.availproject.org/fastbridge/monad/monad-favicon.svg",
      chainLogoUrl:
        "https://files.availproject.org/nexus-fast-bridge/logos/monad.svg",
      backgroundImageUrl:
        "https://files.availproject.org/nexus-fast-bridge/bg/bg-monad.png",
      mascotImageUrl:
        "https://files.availproject.org/nexus-fast-bridge/mascot/mascot-monad.png",
      chainGifUrl: "/salmonad.gif",
      chainGifAlt: "Fast Salmonad",
      heroText: "Move your assets to Monad faster than ever!",
      appTitle: "Monad Fast Bridge",
      appDescription: "Monad Fast Bridge",
      primaryColor: "#836EF9",
      secondaryColor: "#ffffff",
      nexusNetwork: "mainnet",
      nexusSupportedChain: 143,
      nexusPrimaryToken: "USDC",
      boxShadow:
        "#FFFFFFE6 0px 1px 0px inset, #FFFFFF8C 0px 0px 0px 14px, #836EF90A 0px 2px 4px, #836EF929 0px 12px 24px, #836EF926 0px 32px 64px",
      ribbonPng: "/landing-new/assets/chain-gradients/monad-ribbon.png",
      meta: {
        title:
          "Bridge to Monad – Fast & Cheap Cross-Chain Transfers | FastBridge",
        description:
          "Bridge USDC and other tokens from major EVM chains to Monad in one transaction. FastBridge offers the fastest, lowest-fee routes from multiple chains to Monad mainnet.",
        canonicalUrl: "https://fastbridge.availproject.org/monad",
        imageUrl:
          "https://files.availproject.org/nexus-fast-bridge/meta/monad.jpg",
        faviconUrl: "/avail_logo.svg",
        themeColor: "#836EF9",
        backgroundColor: "#ffffff",
      },
    },
    chainFeatures: {
      supportedTokens: ["USDC", "MON"],
      slug: "monad",
      buttonFg: "white",
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
    },
  },

  // ── Citrea ──────────────────────────────────────────────────────────────
  citrea: {
    slug: "citrea",
    appConfig: {
      chainId: 4114,
      chainName: "Citrea",
      chainNativeCurrency: { name: "CBTC", symbol: "cBTC", decimals: 18 },
      chainRpcUrl: "https://rpcs.avail.so/citrea",
      chainBlockExplorerUrl: "https://explorer.mainnet.citrea.xyz",
      chainTestnet: false,
      useChainLogo: true,
      chainIconUrl:
        "https://files.availproject.org/fastbridge/citrea/citrea-favicon.svg",
      chainLogoUrl:
        "https://files.availproject.org/nexus-fast-bridge/logos/citrea.svg",
      backgroundImageUrl:
        "https://files.availproject.org/nexus-fast-bridge/bg/bg-citrea.png",
      mascotImageUrl:
        "https://files.availproject.org/nexus-fast-bridge/mascot/mascot-citrea.png",
      chainGifUrl: "/citrea.gif",
      chainGifAlt: "Bridge to Citrea",
      heroText: "Move assets from any chain to Citrea, instantly.",
      appTitle: "Citrea Fast Bridge",
      appDescription: "Move assets from any chain to Citrea, instantly.",
      primaryColor: "#1A1A1A",
      secondaryColor: "#CDD2D8",
      nexusNetwork: "mainnet",
      nexusSupportedChain: 4114,
      nexusPrimaryToken: "USDC",
      boxShadow:
        "#FFFFFFE6 0px 1px 0px inset, #FFFFFF8C 0px 0px 0px 14px, #1A1A1A0A 0px 2px 4px, #1A1A1A29 0px 12px 24px, #1A1A1A26 0px 32px 64px",
      ribbonPng: "/landing-new/assets/chain-gradients/citrea-ribbon.png",
      meta: {
        title:
          "Bridge to Citrea – Bitcoin ZK Rollup Cross-Chain Bridge | FastBridge",
        description:
          "Bridge USDC, USDT, and other tokens from multiple EVM chains to Citrea in one transaction. FastBridge is the easiest way to bridge to Citrea with fast, low-fee transfers.",
        canonicalUrl: "https://fastbridge.availproject.org/citrea",
        imageUrl:
          "https://files.availproject.org/nexus-fast-bridge/meta/citrea.jpg",
        faviconUrl: "/avail_logo.svg",
        themeColor: "#1A1A1A",
        backgroundColor: "#CDD2D8",
      },
    },
    chainFeatures: {
      supportedTokens: ["USDC", "USDT"],
      slug: "citrea",
      buttonFg: "black",
      analyticsFastBridgeKey: "citrea",
      maxBridgeAmount: 550,
      maxBridgeAmountByTokenAndChain: {
        USDC: { [SUPPORTED_CHAINS.CITREA]: 2000 },
        USDT: { [SUPPORTED_CHAINS.CITREA]: 2000 },
      },
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
    },
  },

  // ── Arbitrum ────────────────────────────────────────────────────────────
  arbitrum: {
    slug: "arbitrum",
    appConfig: {
      chainId: 42_161,
      chainName: "Arbitrum",
      chainNativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      chainRpcUrl: "https://arb1.arbitrum.io/rpc",
      chainBlockExplorerUrl: "https://arbiscan.io",
      chainTestnet: false,
      useChainLogo: true,
      chainIconUrl:
        "https://raw.githubusercontent.com/availproject/nexus-assets/refs/heads/main/chains/arbitrum/logo.png",
      chainLogoUrl:
        "https://files.availproject.org/nexus-fast-bridge/logos/arbitrum.svg",
      backgroundImageUrl:
        "https://files.availproject.org/nexus-fast-bridge/bg/bg-arbitrum.png",
      chainGifUrl: "",
      chainGifAlt: "Bridge to Arbitrum",
      heroText: "Move your assets to Arbitrum faster than ever!",
      appTitle: "Arbitrum Fast Bridge",
      appDescription: "Arbitrum Fast Bridge",
      primaryColor: "#28A0F0",
      secondaryColor: "#ffffff",
      nexusNetwork: "mainnet",
      nexusSupportedChain: 42_161,
      nexusPrimaryToken: "USDC",
      boxShadow:
        "#FFFFFFE6 0px 1px 0px inset, #FFFFFF8C 0px 0px 0px 14px, #28A0F00A 0px 2px 4px, #28A0F029 0px 12px 24px, #28A0F026 0px 32px 64px",
      ribbonPng: "/landing-new/assets/chain-gradients/arbitrum-ribbon.png",
      meta: {
        title:
          "Bridge to Arbitrum from Multiple Chains in One Transaction | FastBridge",
        description:
          "Bridge ETH, USDC, and USDT to Arbitrum One from Ethereum and other chains, all at once. FastBridge offers instant, low-cost cross-chain swaps and transfers to Arbitrum.",
        canonicalUrl: "https://fastbridge.availproject.org/arbitrum",
        imageUrl:
          "https://files.availproject.org/nexus-fast-bridge/meta/arbitrum.jpg",
        faviconUrl: "/avail_logo.svg",
        themeColor: "#28A0F0",
        backgroundColor: "#ffffff",
      },
    },
    chainFeatures: {
      supportedTokens: ["USDC", "USDT", "ETH"],
      slug: "arbitrum",
      buttonFg: "white",
      analyticsFastBridgeKey: "arbitrum",
      maxBridgeAmount: 550,
      mapUsdmToUsdcBalance: true,
      denyIntentOnReset: true,
      tokenDenyListByChainId: {},
      allowanceLogoOverrideByChainId: {},
      dialogShowCloseButton: true,
    },
  },

  // ── Ethereum ────────────────────────────────────────────────────────────
  ethereum: {
    slug: "ethereum",
    appConfig: {
      chainId: 1,
      chainName: "Ethereum",
      chainNativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      chainRpcUrl: "https://eth.drpc.org",
      chainBlockExplorerUrl: "https://etherscan.io",
      chainTestnet: false,
      useChainLogo: true,
      chainIconUrl:
        "https://raw.githubusercontent.com/availproject/nexus-assets/refs/heads/main/chains/ethereum/logo.png",
      chainLogoUrl:
        "https://files.availproject.org/nexus-fast-bridge/logos/ethereum.svg",
      backgroundImageUrl:
        "https://files.availproject.org/nexus-fast-bridge/bg/bg-ethereum.png",
      chainGifUrl: "",
      chainGifAlt: "Bridge to Ethereum",
      heroText: "Move your assets to Ethereum faster than ever!",
      appTitle: "Ethereum Fast Bridge",
      appDescription: "Ethereum Fast Bridge",
      primaryColor: "#627EEA",
      secondaryColor: "#ffffff",
      nexusNetwork: "mainnet",
      nexusSupportedChain: 1,
      nexusPrimaryToken: "USDC",
      boxShadow:
        "#FFFFFFE6 0px 1px 0px inset, #FFFFFF8C 0px 0px 0px 14px, #627EEA0A 0px 2px 4px, #627EEA29 0px 12px 24px, #627EEA26 0px 32px 64px",
      ribbonPng: "/landing-new/assets/chain-gradients/ethereum-ribbon.png",
      meta: {
        title:
          "Bridge to Ethereum – Combine Your L2 Balances in One Transaction | FastBridge",
        description:
          "Bridge from L2 chains like Base, Arbitrum, Optimism, Polygon, and more back to Ethereum mainnet. FastBridge enables cross-chain transfers and swaps with your assets consolidated.",
        canonicalUrl: "https://fastbridge.availproject.org/ethereum",
        imageUrl:
          "https://files.availproject.org/nexus-fast-bridge/meta/ethereum.jpg",
        faviconUrl: "/avail_logo.svg",
        themeColor: "#627EEA",
        backgroundColor: "#ffffff",
      },
    },
    chainFeatures: {
      supportedTokens: ["USDC", "USDT", "ETH"],
      slug: "ethereum",
      buttonFg: "white",
      analyticsFastBridgeKey: "ethereum",
      maxBridgeAmount: 550,
      mapUsdmToUsdcBalance: true,
      denyIntentOnReset: true,
      tokenDenyListByChainId: {},
      allowanceLogoOverrideByChainId: {},
      dialogShowCloseButton: true,
    },
  },

  // ── Polygon ─────────────────────────────────────────────────────────────
  polygon: {
    slug: "polygon",
    appConfig: {
      chainId: 137,
      chainName: "Polygon",
      chainNativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
      chainRpcUrl: "https://polygon-rpc.com",
      chainBlockExplorerUrl: "https://polygonscan.com",
      chainTestnet: false,
      useChainLogo: true,
      chainIconUrl:
        "https://raw.githubusercontent.com/availproject/nexus-assets/refs/heads/main/chains/polygon/logo.png",
      chainLogoUrl:
        "https://files.availproject.org/nexus-fast-bridge/logos/polygon.svg",
      backgroundImageUrl:
        "https://files.availproject.org/nexus-fast-bridge/bg/bg-polygon.png",
      mascotImageUrl:
        "https://files.availproject.org/nexus-fast-bridge/mascot/mascot-polygon.png",
      chainGifUrl: "",
      chainGifAlt: "Bridge to Polygon",
      heroText: "Move your assets to Polygon faster than ever!",
      appTitle: "Polygon Fast Bridge",
      appDescription: "Polygon Fast Bridge",
      primaryColor: "#8247E5",
      secondaryColor: "#ffffff",
      nexusNetwork: "mainnet",
      nexusSupportedChain: 137,
      nexusPrimaryToken: "USDC",
      boxShadow:
        "#FFFFFFE6 0px 1px 0px inset, #FFFFFF8C 0px 0px 0px 14px, #8247E50A 0px 2px 4px, #8247E529 0px 12px 24px, #8247E526 0px 32px 64px",
      ribbonPng: "/landing-new/assets/chain-gradients/polygon-ribbon.png",
      meta: {
        title:
          "Bridge to Polygon – Instant Cross-Chain Swaps & Transfers | FastBridge",
        description:
          "Bridge USDC, USDT and POL to Polygon from Ethereum, Arbitrum, and more. FastBridge combines your balances across chains and delivers fast, low-fee cross-chain swaps and transfers to Polygon PoS.",
        canonicalUrl: "https://fastbridge.availproject.org/polygon",
        imageUrl:
          "https://files.availproject.org/nexus-fast-bridge/meta/polygon.jpg",
        faviconUrl: "/avail_logo.svg",
        themeColor: "#8247E5",
        backgroundColor: "#ffffff",
      },
    },
    chainFeatures: {
      supportedTokens: ["USDC", "USDT", "POL"],
      slug: "polygon",
      buttonFg: "white",
      analyticsFastBridgeKey: "polygon",
      maxBridgeAmount: 550,
      mapUsdmToUsdcBalance: true,
      denyIntentOnReset: true,
      tokenDenyListByChainId: {},
      allowanceLogoOverrideByChainId: {},
      dialogShowCloseButton: true,
    },
  },

  // ── Base ────────────────────────────────────────────────────────────────
  base: {
    slug: "base",
    appConfig: {
      chainId: 8453,
      chainName: "Base",
      chainNativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      chainRpcUrl: "https://mainnet.base.org",
      chainBlockExplorerUrl: "https://basescan.org",
      chainTestnet: false,
      useChainLogo: true,
      chainIconUrl:
        "https://raw.githubusercontent.com/availproject/nexus-assets/refs/heads/main/chains/base/logo.png",
      chainLogoUrl:
        "https://files.availproject.org/nexus-fast-bridge/logos/base.svg",
      backgroundImageUrl:
        "https://files.availproject.org/nexus-fast-bridge/bg/bg-base.png",
      mascotImageUrl:
        "https://files.availproject.org/nexus-fast-bridge/mascot/mascot-base.png",
      chainGifUrl: "",
      chainGifAlt: "Bridge to Base",
      heroText: "Move your assets to Base faster than ever!",
      appTitle: "Base Fast Bridge",
      appDescription: "Base Fast Bridge",
      primaryColor: "#0052FF",
      secondaryColor: "#ffffff",
      nexusNetwork: "mainnet",
      nexusSupportedChain: 8453,
      nexusPrimaryToken: "USDC",
      boxShadow:
        "#FFFFFFE6 0px 1px 0px inset, #FFFFFF8C 0px 0px 0px 14px, #0052FF0A 0px 2px 4px, #0052FF29 0px 12px 24px, #0052FF26 0px 32px 64px",
      ribbonPng: "/landing-new/assets/chain-gradients/base-ribbon.png",
      meta: {
        title:
          "Bridge to Base – Fastest ETH & USDC Transfers to Base Chain | FastBridge",
        description:
          "Bridge ETH, and USDC from Ethereum, and other L2 chains to Base, in one transaction. FastBridge combines your multi-chain balances and delivers fast, low-fee transfers to Coinbase’s L2 instantly.",
        canonicalUrl: "https://fastbridge.availproject.org/base",
        imageUrl:
          "https://files.availproject.org/nexus-fast-bridge/meta/base.jpg",
        faviconUrl: "/avail_logo.svg",
        themeColor: "#0052FF",
        backgroundColor: "#ffffff",
      },
    },
    chainFeatures: {
      supportedTokens: ["USDC", "ETH"],
      slug: "base",
      buttonFg: "white",
      analyticsFastBridgeKey: "base",
      maxBridgeAmount: 550,
      mapUsdmToUsdcBalance: true,
      denyIntentOnReset: true,
      tokenDenyListByChainId: {},
      allowanceLogoOverrideByChainId: {},
      dialogShowCloseButton: true,
    },
  },

  // ── OP Mainnet ──────────────────────────────────────────────────────────
  "op-mainnet": {
    slug: "optimism",
    appConfig: {
      chainId: 10,
      chainName: "Optimism",
      chainNativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      chainRpcUrl: "https://mainnet.optimism.io",
      chainBlockExplorerUrl: "https://optimistic.etherscan.io",
      chainTestnet: false,
      useChainLogo: true,
      chainIconUrl:
        "https://raw.githubusercontent.com/availproject/nexus-assets/refs/heads/main/chains/optimism/logo.png",
      chainLogoUrl:
        "https://files.availproject.org/nexus-fast-bridge/logos/optimism.svg",
      backgroundImageUrl:
        "https://files.availproject.org/nexus-fast-bridge/bg/bg-op.png",
      mascotImageUrl:
        "https://files.availproject.org/nexus-fast-bridge/mascot/mascot-op.png",
      chainGifUrl: "",
      chainGifAlt: "Bridge to OP Mainnet",
      heroText: "Move your assets to OP Mainnet faster than ever!",
      appTitle: "OP Mainnet Fast Bridge",
      appDescription: "OP Mainnet Fast Bridge",
      primaryColor: "#FF0420",
      secondaryColor: "#ffffff",
      nexusNetwork: "mainnet",
      nexusSupportedChain: 10,
      nexusPrimaryToken: "USDC",
      boxShadow:
        "#FFFFFFE6 0px 1px 0px inset, #FFFFFF8C 0px 0px 0px 14px, #FF04200A 0px 2px 4px, #FF042029 0px 12px 24px, #FF042026 0px 32px 64px",
      ribbonPng: "/landing-new/assets/chain-gradients/optimism-ribbon.png",
      meta: {
        title:
          "Bridge to Optimism from Multiple Chains in One Transaction | FastBridge",
        description:
          "Bridge ETH, USDC, and USDT to Optimism from Ethereum and other EVM chains. FastBridge combines your balances across chains and delivers fast, low-fee cross-chain swaps and transfers to OP Mainnet.",
        canonicalUrl: "https://fastbridge.availproject.org/op-mainnet",
        imageUrl:
          "https://files.availproject.org/nexus-fast-bridge/meta/optimism.jpg",
        faviconUrl: "/avail_logo.svg",
        themeColor: "#FF0420",
        backgroundColor: "#ffffff",
      },
    },
    chainFeatures: {
      supportedTokens: ["USDC", "USDT", "ETH"],
      slug: "op-mainnet",
      buttonFg: "white",
      analyticsFastBridgeKey: "optimism",
      maxBridgeAmount: 550,
      mapUsdmToUsdcBalance: true,
      denyIntentOnReset: true,
      tokenDenyListByChainId: {},
      allowanceLogoOverrideByChainId: {},
      dialogShowCloseButton: true,
    },
  },

  // ── Scroll ──────────────────────────────────────────────────────────────
  scroll: {
    slug: "scroll",
    appConfig: {
      chainId: 534_352,
      chainName: "Scroll",
      chainNativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      chainRpcUrl: "https://rpc.scroll.io",
      chainBlockExplorerUrl: "https://scrollscan.com",
      chainTestnet: false,
      useChainLogo: true,
      chainIconUrl:
        "https://raw.githubusercontent.com/availproject/nexus-assets/refs/heads/main/chains/scroll/logo.png",
      chainLogoUrl:
        "https://files.availproject.org/nexus-fast-bridge/logos/scroll.svg",
      backgroundImageUrl:
        "https://files.availproject.org/nexus-fast-bridge/bg/bg-scroll.png",
      chainGifUrl: "",
      chainGifAlt: "Bridge to Scroll",
      heroText: "Move your assets to Scroll faster than ever!",
      appTitle: "Scroll Fast Bridge",
      appDescription: "Scroll Fast Bridge",
      primaryColor: "#C4A882",
      secondaryColor: "#ffffff",
      nexusNetwork: "mainnet",
      nexusSupportedChain: 534_352,
      nexusPrimaryToken: "USDC",
      boxShadow:
        "#FFFFFFE6 0px 1px 0px inset, #FFFFFF8C 0px 0px 0px 14px, #C4A8820A 0px 2px 4px, #C4A88224 0px 12px 24px, #C4A88222 0px 32px 64px",
      ribbonPng: "/landing-new/assets/chain-gradients/scroll-ribbon.png",
      meta: {
        title:
          "Bridge to Scroll – Fast zkEVM Cross-Chain Transfers & Swaps | FastBridge",
        description:
          "Bridge ETH, USDC and USDT to Scroll zkEVM from Ethereum and other EVM chains. FastBridge combines your balances across chains and delivers fast, secure cross-chain transfers to Scroll L2.",
        canonicalUrl: "https://fastbridge.availproject.org/scroll",
        imageUrl:
          "https://files.availproject.org/nexus-fast-bridge/meta/scroll.jpg",
        faviconUrl: "/avail_logo.svg",
        themeColor: "#C4A882",
        backgroundColor: "#ffffff",
      },
    },
    chainFeatures: {
      supportedTokens: ["USDC", "USDT", "ETH"],
      slug: "scroll",
      buttonFg: "black",
      analyticsFastBridgeKey: "scroll",
      maxBridgeAmount: 550,
      mapUsdmToUsdcBalance: true,
      denyIntentOnReset: true,
      tokenDenyListByChainId: {},
      allowanceLogoOverrideByChainId: {},
      dialogShowCloseButton: true,
      bottomBannerImageUrl:
        "https://files.availproject.org/nexus-fast-bridge/logos/scroll-banner.svg",
    },
  },

  // ── Kaia ────────────────────────────────────────────────────────────────
  kaia: {
    slug: "kaia",
    appConfig: {
      chainId: 8217,
      chainName: "Kaia",
      chainNativeCurrency: { name: "KAIA", symbol: "KAIA", decimals: 18 },
      chainRpcUrl: "https://public-en.node.kaia.io",
      chainBlockExplorerUrl: "https://kaiascan.io",
      chainTestnet: false,
      useChainLogo: true,
      chainIconUrl:
        "https://raw.githubusercontent.com/availproject/nexus-assets/refs/heads/main/chains/kaia/logo.png",
      chainLogoUrl:
        "https://files.availproject.org/nexus-fast-bridge/logos/kaia.svg",
      backgroundImageUrl:
        "https://files.availproject.org/nexus-fast-bridge/bg/bg-kaia.png",
      mascotImageUrl:
        "https://files.availproject.org/nexus-fast-bridge/mascot/mascot-kaia.png",
      chainGifUrl: "",
      chainGifAlt: "Bridge to Kaia",
      heroText: "Move your assets to Kaia faster than ever!",
      appTitle: "Kaia Fast Bridge",
      appDescription: "Kaia Fast Bridge",
      primaryColor: "#31C48D",
      secondaryColor: "#ffffff",
      nexusNetwork: "mainnet",
      nexusSupportedChain: 8217,
      nexusPrimaryToken: "USDC",
      boxShadow:
        "#FFFFFFE6 0px 1px 0px inset, #FFFFFF8C 0px 0px 0px 14px, #31C48D0A 0px 2px 4px, #31C48D29 0px 12px 24px, #31C48D26 0px 32px 64px",
      ribbonPng: "/landing-new/assets/chain-gradients/kaia-ribbon.png",
      meta: {
        title:
          "Bridge to Kaia – Fast Cross-Chain Transfers & Swaps to Kaia Blockchain | FastBridge",
        description:
          "Bridge USDT and KAIA tokens to Kaia blockchain from Ethereum and other EVM chains. FastBridge combines your balances across chains and delivers fast, secure cross-chain transfers to Kaia (formerly Klaytn).",
        canonicalUrl: "https://fastbridge.availproject.org/kaia",
        imageUrl:
          "https://files.availproject.org/nexus-fast-bridge/meta/kaia.jpg",
        faviconUrl: "/avail_logo.svg",
        themeColor: "#31C48D",
        backgroundColor: "#ffffff",
      },
    },
    chainFeatures: {
      supportedTokens: ["USDT", "KAIA"],
      slug: "kaia",
      buttonFg: "black",
      analyticsFastBridgeKey: "kaia",
      maxBridgeAmount: 550,
      mapUsdmToUsdcBalance: true,
      denyIntentOnReset: true,
      tokenDenyListByChainId: {},
      allowanceLogoOverrideByChainId: {},
      dialogShowCloseButton: true,
    },
  },

  // ── BNB Smart Chain ─────────────────────────────────────────────────────
  "bnb-smart-chain": {
    slug: "bnb-smart-chain",
    appConfig: {
      chainId: 56,
      chainName: "BNB Smart Chain",
      chainNativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
      chainRpcUrl: "https://bsc-dataseed.binance.org",
      chainBlockExplorerUrl: "https://bscscan.com",
      chainTestnet: false,
      useChainLogo: true,
      chainIconUrl:
        "https://raw.githubusercontent.com/availproject/nexus-assets/refs/heads/main/chains/bsc/logo.png",
      chainLogoUrl:
        "https://files.availproject.org/nexus-fast-bridge/logos/bnb.png",
      backgroundImageUrl:
        "https://files.availproject.org/nexus-fast-bridge/bg/bg-bnb.png",
      mascotImageUrl:
        "https://files.availproject.org/nexus-fast-bridge/mascot/mascot-bnb.png",
      chainGifUrl: "",
      chainGifAlt: "Bridge to BNB Smart Chain",
      heroText: "Move your assets to BNB Smart Chain faster than ever!",
      appTitle: "BNB Smart Chain Fast Bridge",
      appDescription: "BNB Smart Chain Fast Bridge",
      primaryColor: "#F3BA2F",
      secondaryColor: "#ffffff",
      nexusNetwork: "mainnet",
      nexusSupportedChain: 56,
      nexusPrimaryToken: "USDC",
      boxShadow:
        "#FFFFFFE6 0px 1px 0px inset, #FFFFFF8C 0px 0px 0px 14px, #F3BA2F0A 0px 2px 4px, #F3BA2F24 0px 12px 24px, #F3BA2F1A 0px 32px 64px",
      ribbonPng: "/landing-new/assets/chain-gradients/bnb-ribbon.png",
      meta: {
        title:
          "Bridge to BNB Smart Chain – Fast ETH to BNB Transfers | FastBridge",
        description:
          "Bridge ETH, BNB, USDT and USDC to BNB chain from Ethereum, Polygon, Arbitrum and other EVM chains, all at once. FastBridge combines your balances from multiple chains and delivers low-fee cross-chain transfers to BSC.",
        canonicalUrl: "https://fastbridge.availproject.org/bnb-smart-chain",
        imageUrl:
          "https://files.availproject.org/nexus-fast-bridge/meta/bnb.jpg",
        faviconUrl: "/avail_logo.svg",
        themeColor: "#F3BA2F",
        backgroundColor: "#ffffff",
      },
    },
    chainFeatures: {
      supportedTokens: ["USDC", "USDT", "ETH", "BNB"],
      slug: "bnb-smart-chain",
      buttonFg: "black",
      analyticsFastBridgeKey: "bsc",
      maxBridgeAmount: 550,
      mapUsdmToUsdcBalance: true,
      denyIntentOnReset: true,
      tokenDenyListByChainId: {},
      allowanceLogoOverrideByChainId: {},
      dialogShowCloseButton: true,
    },
  },

  // ── HyperEVM ────────────────────────────────────────────────────────────
  hyperevm: {
    slug: "hyperevm",
    appConfig: {
      chainId: 999,
      chainName: "HyperEVM",
      chainNativeCurrency: { name: "Hype", symbol: "HYPE", decimals: 18 },
      chainRpcUrl: "https://rpc.hyperliquid.xyz/evm",
      chainBlockExplorerUrl: "https://purrsec.com",
      chainTestnet: false,
      useChainLogo: true,
      chainIconUrl:
        "https://raw.githubusercontent.com/availproject/nexus-assets/refs/heads/main/chains/hyperevm/logo.png",
      chainLogoUrl:
        "https://files.availproject.org/nexus-fast-bridge/logos/hyperevm.svg",
      backgroundImageUrl:
        "https://files.availproject.org/nexus-fast-bridge/bg/bg-hyperevm.png",
      mascotImageUrl:
        "https://files.availproject.org/nexus-fast-bridge/mascot/mascot-hyperevm.png",
      chainGifUrl: "",
      chainGifAlt: "Bridge to HyperEVM",
      heroText: "Move your assets to HyperEVM faster than ever!",
      appTitle: "HyperEVM Fast Bridge",
      appDescription: "HyperEVM Fast Bridge",
      primaryColor: "#50E3C2",
      secondaryColor: "#ffffff",
      nexusNetwork: "mainnet",
      nexusSupportedChain: 999,
      nexusPrimaryToken: "USDC",
      boxShadow:
        "#FFFFFFE6 0px 1px 0px inset, #FFFFFF8C 0px 0px 0px 14px, #50E3C20A 0px 2px 4px, #50E3C229 0px 12px 24px, #50E3C226 0px 32px 64px",
      ribbonPng: "/landing-new/assets/chain-gradients/hyperevm-ribbon.png",
      meta: {
        title:
          "Bridge to HyperEVM from Multiple Chains in One Transaction | FastBridge",
        description:
          "Bridge USDC, USDT and HYPE to HyperEVM, Hyperliquid's EVM L1. FastBridge combines your balances from Ethereum, Arbitrum, and other EVM chains in a single transaction and delivers unified cross-chain swaps and transfers to HyperEVM.",
        canonicalUrl: "https://fastbridge.availproject.org/hyperevm",
        imageUrl:
          "https://files.availproject.org/nexus-fast-bridge/meta/hyperliquid.jpg",
        faviconUrl: "/avail_logo.svg",
        themeColor: "#50E3C2",
        backgroundColor: "#ffffff",
      },
    },
    chainFeatures: {
      supportedTokens: ["USDC", "USDT", "HYPE"],
      slug: "hyperevm",
      buttonFg: "black",
      analyticsFastBridgeKey: "hyperevm",
      maxBridgeAmount: 550,
      mapUsdmToUsdcBalance: true,
      denyIntentOnReset: true,
      tokenDenyListByChainId: {},
      allowanceLogoOverrideByChainId: {},
      dialogShowCloseButton: true,
    },
  },

  // ── Avalanche C-Chain ───────────────────────────────────────────────────
  avalanche: {
    slug: "avalanche",
    appConfig: {
      chainId: 43_114,
      chainName: "Avalanche C-Chain",
      chainNativeCurrency: { name: "AVAX", symbol: "AVAX", decimals: 18 },
      chainRpcUrl: "https://api.avax.network/ext/bc/C/rpc",
      chainBlockExplorerUrl: "https://snowscan.xyz",
      chainTestnet: false,
      useChainLogo: true,
      chainIconUrl:
        "https://raw.githubusercontent.com/availproject/nexus-assets/refs/heads/main/chains/avalanche/logo.png",
      chainLogoUrl:
        "https://files.availproject.org/nexus-fast-bridge/logos/avalanche.png",
      backgroundImageUrl:
        "https://files.availproject.org/nexus-fast-bridge/bg/bg-avax.png",
      mascotImageUrl:
        "https://files.availproject.org/nexus-fast-bridge/mascot/mascot-avalanche.png",
      chainGifUrl: "",
      chainGifAlt: "Bridge to Avalanche",
      heroText: "Move your assets to Avalanche faster than ever!",
      appTitle: "Avalanche Fast Bridge",
      appDescription: "Avalanche Fast Bridge",
      primaryColor: "#E84142",
      secondaryColor: "#ffffff",
      nexusNetwork: "mainnet",
      nexusSupportedChain: 43_114,
      nexusPrimaryToken: "USDC",
      boxShadow:
        "#FFFFFFE6 0px 1px 0px inset, #FFFFFF8C 0px 0px 0px 14px, #E841420A 0px 2px 4px, #E8414229 0px 12px 24px, #E8414226 0px 32px 64px",
      ribbonPng: "/landing-new/assets/chain-gradients/avalanche-ribbon.png",
      meta: {
        title:
          "Bridge to Avalanche from Multiple Chains in One Transaction | FastBridge",
        description:
          "Bridge USDC, USDT and AVAX to Avalanche C-Chain from Ethereum, Arbitrum, BNB and other EVM chains. FastBridge consolidates your funds across chains and delivers fast, unified cross-chain transfers to Avax chain, in a single transaction.",
        canonicalUrl: "https://fastbridge.availproject.org/avalanche",
        imageUrl:
          "https://files.availproject.org/nexus-fast-bridge/meta/avalanche.jpg",
        faviconUrl: "/avail_logo.svg",
        themeColor: "#E84142",
        backgroundColor: "#ffffff",
      },
    },
    chainFeatures: {
      supportedTokens: ["USDC", "USDT", "AVAX"],
      slug: "avalanche",
      buttonFg: "white",
      analyticsFastBridgeKey: "avalanche",
      maxBridgeAmount: 550,
      mapUsdmToUsdcBalance: true,
      denyIntentOnReset: true,
      tokenDenyListByChainId: {},
      allowanceLogoOverrideByChainId: {},
      dialogShowCloseButton: true,
    },
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getChainSettings(slug: string): ChainSettings {
  const normalized = slug === "optimism" ? "op-mainnet" : slug;
  return CHAIN_REGISTRY[normalized] ?? CHAIN_REGISTRY[DEFAULT_CHAIN_SLUG];
}

export function getAllChainSlugs(): string[] {
  const slugs = Object.keys(CHAIN_REGISTRY);
  if (!slugs.includes("optimism")) {
    slugs.push("optimism");
  }
  return slugs;
}

export function isValidChainSlug(slug: string): boolean {
  const normalized = slug === "optimism" ? "op-mainnet" : slug;
  return normalized in CHAIN_REGISTRY;
}

export function getChainSlugById(chainId: number): string | undefined {
  const settings = Object.values(CHAIN_REGISTRY).find(
    (s) => s.appConfig.chainId === chainId
  );
  return settings?.slug;
}

function normalizeChainLookupValue(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function getChainSlugByName(chainName?: string): string | undefined {
  if (!chainName) {
    return undefined;
  }

  const normalized = normalizeChainLookupValue(chainName);
  const settings = Object.values(CHAIN_REGISTRY).find((entry) =>
    [entry.slug, entry.appConfig.chainName].some(
      (candidate) => normalizeChainLookupValue(candidate) === normalized
    )
  );

  return settings?.slug;
}
