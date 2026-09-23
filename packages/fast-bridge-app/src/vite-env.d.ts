/// <reference types="vite/client" />

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
