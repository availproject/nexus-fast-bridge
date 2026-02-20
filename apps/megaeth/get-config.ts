import type { AppEnv } from "./src/vite-env.d";

const withFallback = <T>(value: T, fallbackValue: T): T =>
  value || fallbackValue;

export function getConfig(env: AppEnv) {
  return {
    chainId: Number(withFallback(env.VITE_CONFIG_CHAIN_ID, 143)),
    chainName: withFallback(env.VITE_CONFIG_CHAIN_NAME, "Monad"),
    chainNativeCurrency: {
      name: withFallback(env.VITE_CONFIG_CHAIN_NATIVE_CURRENCY_NAME, "Monad"),
      symbol: withFallback(env.VITE_CONFIG_CHAIN_NATIVE_CURRENCY_SYMBOL, "MON"),
      decimals: Number(
        withFallback(env.VITE_CONFIG_CHAIN_NATIVE_CURRENCY_DECIMALS, 18)
      ),
    },
    chainRpcUrl: withFallback(
      env.VITE_CONFIG_CHAIN_RPC_URL,
      "https://rpcs.avail.so/monad"
    ),
    chainBlockExplorerUrl: withFallback(
      env.VITE_CONFIG_CHAIN_BLOCK_EXPLORER_URL,
      "https://monadvision.com/"
    ),
    chainTestnet: env.VITE_CONFIG_CHAIN_TESTNET,
    useChainLogo: env.VITE_CONFIG_CHAIN_USE_CHAIN_LOGO,
    chainIconUrl: withFallback(
      env.VITE_CONFIG_CHAIN_ICON_URL,
      "/Monad_Logomark.svg"
    ),
    chainLogoUrl: withFallback(
      env.VITE_CONFIG_CHAIN_LOGO_URL,
      "/Monad_Logo.svg"
    ),
    chainGifUrl: withFallback(env.VITE_CONFIG_CHAIN_GIF_URL, "/salmonad.gif"),
    chainGifAlt: withFallback(env.VITE_CONFIG_CHAIN_GIF_ALT, "Fast Salmonad"),
    heroText: withFallback(
      env.VITE_CONFIG_CHAIN_HERO_TEXT,
      "Move your assets to Monad faster than ever!"
    ),

    appTitle: withFallback(env.VITE_CONFIG_APP_TITLE, "Monad Fast Bridge"),
    appDescription: withFallback(
      env.VITE_CONFIG_APP_DESCRIPTION,
      "Monad Fast Bridge"
    ),

    primaryColor: withFallback(env.VITE_CONFIG_PRIMARY_COLOR, "#19191A"),
    secondaryColor: withFallback(env.VITE_CONFIG_SECONDARY_COLOR, "#ECE8E8"),
    nexusNetwork: withFallback(env.VITE_CONFIG_NEXUS_NETWORK, "mainnet"),
    nexusSupportedChain: Number(
      withFallback(env.VITE_CONFIG_NEXUS_SUPPORTED_CHAIN, 143)
    ),
    nexusPrimaryToken: withFallback(
      env.VITE_CONFIG_NEXUS_PRIMARY_TOKEN,
      "USDC"
    ),

    meta: {
      title: withFallback(
        env.VITE_CONFIG_APP_META_TITLE,
        "Monad Fast Bridge - Powered by Avail Nexus"
      ),
      description: withFallback(
        env.VITE_CONFIG_APP_META_DESCRIPTION,
        "Move your unified USDC and USDT from 12 chains to Monad, faster than ever."
      ),
      canonicalUrl: withFallback(
        env.VITE_CONFIG_APP_META_CANONICAL_URL,
        "https://monadfastbridge.com"
      ),
      imageUrl: withFallback(
        env.VITE_CONFIG_APP_META_IMAGE_URL,
        "https://monadfastbridge.com/MonadFBMeta.png"
      ),
      faviconUrl: withFallback(
        env.VITE_CONFIG_APP_META_FAVICON_URL,
        "https://monadfastbridge.com/faviconV2.png"
      ),
      themeColor: withFallback(env.VITE_CONFIG_APP_META_THEME_COLOR, "#19191A"),
      backgroundColor: withFallback(
        env.VITE_CONFIG_APP_META_BACKGROUND_COLOR,
        "#ECE8E8"
      ),
    },
  };
}
