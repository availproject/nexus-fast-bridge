/// <reference types="vite/client" />

export interface AppEnv {
  readonly VITE_APP_BASE_PATH?: string;

  readonly VITE_CONFIG_NEXUS_CHANNEL?: "stable" | "preview" | string;
  readonly VITE_CONFIG_NEXUS_NETWORK?:
    | "mainnet"
    | "testnet"
    | "devnet"
    | "canary"
    | string;
}

declare global {
  interface ImportMetaEnv {
    readonly VITE_IS_APP_DOWN?: string;
    readonly VITE_SANITY_API_TOKEN?: string;
    readonly VITE_SANITY_DATASET?: string;
    readonly VITE_SANITY_PROJECT_ID?: string;
    readonly VITE_TURNSTILE_SITE_KEY: string;
    readonly VITE_WALLET_CONNECT_ID: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}
