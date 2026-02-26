import type { AppEnv } from "./src/vite-env.d";

export function getConfig(env: AppEnv) {
    const config = {
        chainId: Number(env.VITE_CONFIG_CHAIN_ID || 1337), // Valid MegaETH chainID needed
        chainName: env.VITE_CONFIG_CHAIN_NAME || "MegaETH",
        chainNativeCurrency: {
            name: env.VITE_CONFIG_CHAIN_NATIVE_CURRENCY_NAME || "MegaETH",
            symbol: env.VITE_CONFIG_CHAIN_NATIVE_CURRENCY_SYMBOL || "ETH",
            decimals: Number(env.VITE_CONFIG_CHAIN_NATIVE_CURRENCY_DECIMALS || 18),
        },
        chainRpcUrl: env.VITE_CONFIG_CHAIN_RPC_URL || "https://rpcs.avail.so/megaeth",
        chainBlockExplorerUrl:
            env.VITE_CONFIG_CHAIN_BLOCK_EXPLORER_URL || "https://explorer.megaeth.systems/",
        chainTestnet: env.VITE_CONFIG_CHAIN_TESTNET || false,
        useChainLogo: env.VITE_CONFIG_CHAIN_USE_CHAIN_LOGO || false,
        chainIconUrl: env.VITE_CONFIG_CHAIN_ICON_URL || "/megaeth-favicon.svg",
        chainLogoUrl: env.VITE_CONFIG_CHAIN_LOGO_URL || "/megaeth-logo.svg",
        chainGifUrl: env.VITE_CONFIG_CHAIN_GIF_URL || "/megaeth.gif",
        chainGifAlt: env.VITE_CONFIG_CHAIN_GIF_ALT || "Fast MegaETH",
        heroText:
            env.VITE_CONFIG_CHAIN_HERO_TEXT ||
            "Move your assets to MegaETH faster than ever!",

        appTitle: env.VITE_CONFIG_APP_TITLE || "MegaETH Fast Bridge",
        appDescription: env.VITE_CONFIG_APP_DESCRIPTION || "MegaETH Fast Bridge",

        primaryColor: env.VITE_CONFIG_PRIMARY_COLOR || "#19191A",
        secondaryColor: env.VITE_CONFIG_SECONDARY_COLOR || "#ECE8E8",
        nexusNetwork: env.VITE_CONFIG_NEXUS_NETWORK || "mainnet",
        nexusSupportedChain:
            Number(env.VITE_CONFIG_NEXUS_SUPPORTED_CHAIN) || 1337,
        nexusPrimaryToken: env.VITE_CONFIG_NEXUS_PRIMARY_TOKEN || "USDC",

        meta: {
            title:
                env.VITE_CONFIG_APP_META_TITLE ||
                "MegaETH Fast Bridge - Powered by Avail Nexus",
            description:
                env.VITE_CONFIG_APP_META_DESCRIPTION ||
                "Move your unified USDC and USDT from 12 chains to MegaETH, faster than ever.",
            canonicalUrl:
                env.VITE_CONFIG_APP_META_CANONICAL_URL || "https://fastbridge.availproject.org/megaeth/",
            imageUrl:
                env.VITE_CONFIG_APP_META_IMAGE_URL ||
                "https://fastbridge.availproject.org/megaeth/megaeth-meta.png",
            faviconUrl:
                env.VITE_CONFIG_APP_META_FAVICON_URL ||
                "https://fastbridge.availproject.org/megaeth/faviconV2.png",
            themeColor: env.VITE_CONFIG_APP_META_THEME_COLOR || "#19191A",
            backgroundColor: env.VITE_CONFIG_APP_META_BACKGROUND_COLOR || "#ECE8E8",
        },
    };

    return config;
}