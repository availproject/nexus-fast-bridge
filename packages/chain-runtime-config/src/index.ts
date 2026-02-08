export type ChainSlug = "monad" | "megaeth" | "citrea";

export type NexusNetworkConfig =
  | "mainnet"
  | "testnet"
  | {
      NETWORK_HINT: number;
      COSMOS_GRPC_URL: string;
      COSMOS_REST_URL: string;
      COSMOS_RPC_URL: string;
      COSMOS_WS_URL: string;
      INTENT_EXPLORER_URL: string;
      VSC_BASE_URL: string;
      VSC_WS_URL: string;
    };

export interface ChainFastBridgeConfig {
  maxBridgeAmount: number;
  analyticsTag: string;
  logStepEvents: boolean;
  hiddenTokensByChainId: Record<number, string[]>;
  logoOverridesByChainId: Record<number, string>;
}

export interface ChainRuntimeConfig {
  slug: ChainSlug;
  nexus: {
    network: NexusNetworkConfig;
    debug: boolean;
  };
  fastBridge: ChainFastBridgeConfig;
}

const CERISE_NETWORK_HINT = 1;
const CITREA_CHAIN_ID = 4114;

const chainRuntimeConfig: Record<ChainSlug, ChainRuntimeConfig> = {
  monad: {
    slug: "monad",
    nexus: {
      network: "mainnet",
      debug: true,
    },
    fastBridge: {
      maxBridgeAmount: 550,
      analyticsTag: "monad",
      logStepEvents: false,
      hiddenTokensByChainId: {},
      logoOverridesByChainId: {},
    },
  },
  megaeth: {
    slug: "megaeth",
    nexus: {
      network: {
        NETWORK_HINT: CERISE_NETWORK_HINT,
        COSMOS_GRPC_URL: "https://debugnet.availproject.org/grpc-web/",
        COSMOS_REST_URL: "https://debugnet.availproject.org",
        COSMOS_RPC_URL: "https://debugnet.availproject.org:26650",
        COSMOS_WS_URL: "wss://debugnet.availproject.org:26650/websocket",
        INTENT_EXPLORER_URL: "https://explorer.nexus-cerise.availproject.org",
        VSC_BASE_URL: "https://vsc-debugnet.availproject.org",
        VSC_WS_URL: "wss://vsc-debugnet.availproject.org",
      },
      debug: true,
    },
    fastBridge: {
      maxBridgeAmount: 5000,
      analyticsTag: "megaeth",
      logStepEvents: false,
      hiddenTokensByChainId: {},
      logoOverridesByChainId: {},
    },
  },
  citrea: {
    slug: "citrea",
    nexus: {
      network: "mainnet",
      debug: true,
    },
    fastBridge: {
      maxBridgeAmount: 550,
      analyticsTag: "citrea",
      logStepEvents: true,
      hiddenTokensByChainId: {
        [CITREA_CHAIN_ID]: ["cBTC"],
      },
      logoOverridesByChainId: {
        [CITREA_CHAIN_ID]: "/citrea-chain-logo.webp",
      },
    },
  },
};

export function getChainRuntimeConfig(slug: ChainSlug): ChainRuntimeConfig {
  return chainRuntimeConfig[slug];
}
