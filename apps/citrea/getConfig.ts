import type { AppEnv } from "./src/vite-env.d";

export function getConfig(env: AppEnv) {
    const config = {
        chainId: Number(env.VITE_CONFIG_CHAIN_ID || 4114),
        chainName: env.VITE_CONFIG_CHAIN_NAME || "Citrea",
        chainNativeCurrency: {
            name: env.VITE_CONFIG_CHAIN_NATIVE_CURRENCY_NAME || "CBTC",
            symbol: env.VITE_CONFIG_CHAIN_NATIVE_CURRENCY_SYMBOL || "cBTC",
            decimals: Number(env.VITE_CONFIG_CHAIN_NATIVE_CURRENCY_DECIMALS || 18),
        },
        chainRpcUrl: env.VITE_CONFIG_CHAIN_RPC_URL || "https://rpcs.avail.so/citrea",
        chainBlockExplorerUrl:
            env.VITE_CONFIG_CHAIN_BLOCK_EXPLORER_URL || "https://explorer.mainnet.citrea.xyz",
        chainTestnet: env.VITE_CONFIG_CHAIN_TESTNET || false,
        useChainLogo: env.VITE_CONFIG_CHAIN_USE_CHAIN_LOGO || false,
        chainIconUrl: env.VITE_CONFIG_CHAIN_ICON_URL || "/citrea-favicon.svg",
        chainLogoUrl: env.VITE_CONFIG_CHAIN_LOGO_URL || "/citrea-logo.svg",
        chainGifUrl: env.VITE_CONFIG_CHAIN_GIF_URL || "/citrea.gif",
        chainGifAlt: env.VITE_CONFIG_CHAIN_GIF_ALT || "Bridge to Citrea",
        heroText:
            env.VITE_CONFIG_CHAIN_HERO_TEXT ||
            "Move assets from any chain to Citrea, instantly.",

        appTitle: env.VITE_CONFIG_APP_TITLE || "Citrea Fast Bridge",
        appDescription: env.VITE_CONFIG_APP_DESCRIPTION || "Move assets from any chain to Citrea, instantly.",

        primaryColor: env.VITE_CONFIG_PRIMARY_COLOR || "#EF8F36",
        secondaryColor: env.VITE_CONFIG_SECONDARY_COLOR || "#CDD2D8",
        nexusNetwork: env.VITE_CONFIG_NEXUS_NETWORK || "mainnet",
        nexusSupportedChain:
            Number(env.VITE_CONFIG_NEXUS_SUPPORTED_CHAIN) || 4114,
        nexusPrimaryToken: env.VITE_CONFIG_NEXUS_PRIMARY_TOKEN || "USDC",

        meta: {
            title:
                env.VITE_CONFIG_APP_META_TITLE || "Citrea Fast Bridge - Powered by Avail",
            description:
                env.VITE_CONFIG_APP_META_DESCRIPTION || "Move assets from any chain to Citrea, instantly.",
            canonicalUrl:
                env.VITE_CONFIG_APP_META_CANONICAL_URL || "https://megaeth-fast-bridge.vercel.app",
            imageUrl: env.VITE_CONFIG_APP_META_IMAGE_URL || "https://files.availproject.org/fastbridge/megaeth/megaeth-meta-2.png",
            faviconUrl: env.VITE_CONFIG_APP_META_FAVICON_URL || "https://megaeth-fast-bridge.vercel.app/faviconV2.png",
            themeColor: env.VITE_CONFIG_APP_META_THEME_COLOR || "#EF8F36",
            backgroundColor: env.VITE_CONFIG_APP_META_BACKGROUND_COLOR || "#CDD2D8",
        },
    };

    return config;
}
