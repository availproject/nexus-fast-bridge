/// <reference types="vite/client" />

import { SUPPORTED_CHAINS } from "@avail-project/nexus-core";

export interface AppEnv {
    readonly VITE_CONFIG_CHAIN_ID: number;
    readonly VITE_CONFIG_CHAIN_NAME: string;
    readonly VITE_CONFIG_CHAIN_NATIVE_CURRENCY_NAME: string;
    readonly VITE_CONFIG_CHAIN_NATIVE_CURRENCY_SYMBOL: string;
    readonly VITE_CONFIG_CHAIN_NATIVE_CURRENCY_DECIMALS: number;
    readonly VITE_CONFIG_CHAIN_RPC_URL: string;
    readonly VITE_CONFIG_CHAIN_BLOCK_EXPLORER_URL: string;
    readonly VITE_CONFIG_CHAIN_TESTNET: boolean;
    readonly VITE_CONFIG_CHAIN_USE_CHAIN_LOGO: boolean;
    readonly VITE_CONFIG_CHAIN_ICON_URL: string;
    readonly VITE_CONFIG_CHAIN_LOGO_URL: string;
    readonly VITE_CONFIG_CHAIN_GIF_URL: string;
    readonly VITE_CONFIG_CHAIN_GIF_ALT: string;
    readonly VITE_CONFIG_CHAIN_HERO_TEXT: string;
    readonly VITE_CONFIG_APP_TITLE: string;
    readonly VITE_CONFIG_APP_DESCRIPTION: string;
    readonly VITE_CONFIG_PRIMARY_COLOR: string;
    readonly VITE_CONFIG_SECONDARY_COLOR: string;
    readonly VITE_CONFIG_NEXUS_NETWORK: 'mainnet' | 'testnet' | 'devnet';
    readonly VITE_CONFIG_NEXUS_SUPPORTED_CHAIN: SUPPORTED_CHAINS;
    readonly VITE_CONFIG_NEXUS_PRIMARY_TOKEN: string;

    readonly VITE_CONFIG_APP_META_TITLE: string;
    readonly VITE_CONFIG_APP_META_DESCRIPTION: string;
    readonly VITE_CONFIG_APP_META_CANONICAL_URL: string;
    readonly VITE_CONFIG_APP_META_FAVICON_URL: string;
    readonly VITE_CONFIG_APP_META_THEME_COLOR: string;
    readonly VITE_CONFIG_APP_META_IMAGE_URL: string;
    readonly VITE_CONFIG_APP_META_BACKGROUND_COLOR: string;
}

declare global {

    interface ImportMetaEnv extends AppEnv {
        readonly readonly VITE_WALLET_CONNECT_ID: string;
        readonly VITE_MAINNET_RPC: string;
        readonly VITE_BASE_RPC: string;
        readonly VITE_ARBITRUM_RPC: string;
        readonly VITE_OPTIMISM_RPC: string;
        readonly VITE_POLYGON_RPC: string;
        readonly VITE_SCROLL_RPC: string;
        readonly VITE_AVALANCHE_RPC: string;
        readonly VITE_SOPHON_RPC: string;
        readonly VITE_KAIA_RPC: string;
        readonly VITE_MONAD_RPC: string;
        readonly VITE_MEGAETH_RPC: string;
        readonly VITE_BASE: string;
    }

    interface ImportMeta {
        readonly env: ImportMetaEnv;
    }
}