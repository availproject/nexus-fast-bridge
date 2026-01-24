import type { AppEnv } from "./src/vite-env.d";

export function getConfig(env: AppEnv) {
    const config = {
        chainId: Number(env.VITE_CONFIG_CHAIN_ID || 143),
        chainName: env.VITE_CONFIG_CHAIN_NAME || "Monad",
        chainNativeCurrency: {
            name: env.VITE_CONFIG_CHAIN_NATIVE_CURRENCY_NAME || "Monad",
            symbol: env.VITE_CONFIG_CHAIN_NATIVE_CURRENCY_SYMBOL || "MON",
            decimals: Number(env.VITE_CONFIG_CHAIN_NATIVE_CURRENCY_DECIMALS || 18),
        },
        chainRpcUrl: env.VITE_CONFIG_CHAIN_RPC_URL || "https://rpcs.avail.so/monad",
        chainBlockExplorerUrl:
            env.VITE_CONFIG_CHAIN_BLOCK_EXPLORER_URL || "https://monadvision.com/",
        chainTestnet: env.VITE_CONFIG_CHAIN_TESTNET || false,
        useChainLogo: env.VITE_CONFIG_CHAIN_USE_CHAIN_LOGO || false,
        chainIconUrl: env.VITE_CONFIG_CHAIN_ICON_URL || "/Monad_Logomark.svg",
        chainLogoUrl: env.VITE_CONFIG_CHAIN_LOGO_URL || "/Monad_Logo.svg",
        chainGifUrl: env.VITE_CONFIG_CHAIN_GIF_URL || "/salmonad.gif",
        chainGifAlt: env.VITE_CONFIG_CHAIN_GIF_ALT || "Fast Salmonad",
        heroText:
            env.VITE_CONFIG_CHAIN_HERO_TEXT ||
            "Move your assets to Monad faster than ever!",

        appTitle: env.VITE_CONFIG_APP_TITLE || "Monad Fast Bridge",
        appDescription: env.VITE_CONFIG_APP_DESCRIPTION || "Monad Fast Bridge",

        primaryColor: env.VITE_CONFIG_PRIMARY_COLOR || "#19191A",
        secondaryColor: env.VITE_CONFIG_SECONDARY_COLOR || "#ECE8E8",
        nexusNetwork: env.VITE_CONFIG_NEXUS_NETWORK || "mainnet",
        nexusSupportedChain:
            Number(env.VITE_CONFIG_NEXUS_SUPPORTED_CHAIN) || 143,
        nexusPrimaryToken: env.VITE_CONFIG_NEXUS_PRIMARY_TOKEN || "USDC",

        meta: {
            title:
                env.VITE_CONFIG_APP_META_TITLE ||
                "Monad Fast Bridge - Powered by Avail Nexus",
            description:
                env.VITE_CONFIG_APP_META_DESCRIPTION ||
                "Move your unified USDC and USDT from 12 chains to Monad, faster than ever.",
            canonicalUrl:
                env.VITE_CONFIG_APP_META_CANONICAL_URL || "https://monadfastbridge.com",
            imageUrl:
                env.VITE_CONFIG_APP_META_IMAGE_URL ||
                "https://monadfastbridge.com/MonadFBMeta.png",
            faviconUrl:
                env.VITE_CONFIG_APP_META_FAVICON_URL ||
                "https://monadfastbridge.com/faviconV2.png",
            themeColor: env.VITE_CONFIG_APP_META_THEME_COLOR || "#19191A",
            backgroundColor: env.VITE_CONFIG_APP_META_BACKGROUND_COLOR || "#ECE8E8",
        },
    };

    return config;
}