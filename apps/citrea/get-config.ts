import type { AppEnv } from "./src/vite-env.d";

const withFallback = <T>(value: T, fallbackValue: T): T =>
  value || fallbackValue;

export function getConfig(env: AppEnv) {
  return {
    chainId: Number(withFallback(env.VITE_CONFIG_CHAIN_ID, 4114)),
    chainName: withFallback(env.VITE_CONFIG_CHAIN_NAME, "Citrea"),
    chainNativeCurrency: {
      name: withFallback(env.VITE_CONFIG_CHAIN_NATIVE_CURRENCY_NAME, "CBTC"),
      symbol: withFallback(
        env.VITE_CONFIG_CHAIN_NATIVE_CURRENCY_SYMBOL,
        "cBTC"
      ),
      decimals: Number(
        withFallback(env.VITE_CONFIG_CHAIN_NATIVE_CURRENCY_DECIMALS, 18)
      ),
    },
    chainRpcUrl: withFallback(
      env.VITE_CONFIG_CHAIN_RPC_URL,
      "https://rpcs.avail.so/citrea"
    ),
    chainBlockExplorerUrl: withFallback(
      env.VITE_CONFIG_CHAIN_BLOCK_EXPLORER_URL,
      "https://explorer.mainnet.citrea.xyz"
    ),
    chainTestnet: env.VITE_CONFIG_CHAIN_TESTNET,
    useChainLogo: env.VITE_CONFIG_CHAIN_USE_CHAIN_LOGO,
    chainIconUrl: withFallback(
      env.VITE_CONFIG_CHAIN_ICON_URL,
      "/citrea-favicon.svg"
    ),
    chainLogoUrl: withFallback(
      env.VITE_CONFIG_CHAIN_LOGO_URL,
      "/citrea-logo.svg"
    ),
    chainGifUrl: withFallback(env.VITE_CONFIG_CHAIN_GIF_URL, "/citrea.gif"),
    chainGifAlt: withFallback(
      env.VITE_CONFIG_CHAIN_GIF_ALT,
      "Bridge to Citrea"
    ),
    heroText: withFallback(
      env.VITE_CONFIG_CHAIN_HERO_TEXT,
      "Move assets from any chain to Citrea, instantly."
    ),

    appTitle: withFallback(env.VITE_CONFIG_APP_TITLE, "Citrea Fast Bridge"),
    appDescription: withFallback(
      env.VITE_CONFIG_APP_DESCRIPTION,
      "Move assets from any chain to Citrea, instantly."
    ),

    primaryColor: withFallback(env.VITE_CONFIG_PRIMARY_COLOR, "#EF8F36"),
    secondaryColor: withFallback(env.VITE_CONFIG_SECONDARY_COLOR, "#CDD2D8"),
    nexusNetwork: withFallback(env.VITE_CONFIG_NEXUS_NETWORK, "mainnet"),
    nexusSupportedChain: Number(
      withFallback(env.VITE_CONFIG_NEXUS_SUPPORTED_CHAIN, 4114)
    ),
    nexusPrimaryToken: withFallback(
      env.VITE_CONFIG_NEXUS_PRIMARY_TOKEN,
      "USDC"
    ),

    meta: {
      title: withFallback(
        env.VITE_CONFIG_APP_META_TITLE,
        "Citrea Fast Bridge - Powered by Avail"
      ),
      description: withFallback(
        env.VITE_CONFIG_APP_META_DESCRIPTION,
        "Move assets from any chain to Citrea, instantly."
      ),
      canonicalUrl: withFallback(
        env.VITE_CONFIG_APP_META_CANONICAL_URL,
        "https://fastbridge.availproject.org/citrea/"
      ),
      imageUrl: withFallback(
        env.VITE_CONFIG_APP_META_IMAGE_URL,
        "https://files.availproject.org/fastbridge/megaeth/megaeth-meta-2.png"
      ),
      faviconUrl: withFallback(
        env.VITE_CONFIG_APP_META_FAVICON_URL,
        "https://fastbridge.availproject.org/citrea/faviconV2.png"
      ),
      themeColor: withFallback(env.VITE_CONFIG_APP_META_THEME_COLOR, "#EF8F36"),
      backgroundColor: withFallback(
        env.VITE_CONFIG_APP_META_BACKGROUND_COLOR,
        "#CDD2D8"
      ),
    },
  };
}
