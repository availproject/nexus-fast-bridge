"use client";

import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { http, WagmiProvider } from "wagmi";
import {
  arbitrum,
  base,
  bsc,
  type Chain,
  citrea,
  mainnet,
  megaeth,
  monad,
  optimism,
  polygon,
  scroll,
} from "wagmi/chains";
import rpcs from "@/config/rpcs.json";
import type { AppConfig } from "@/types/runtime";

const walletConnectProjectId = import.meta.env.VITE_WALLET_CONNECT_ID;

const hyperevm: Chain = {
  id: 999,
  name: "HyperEVM",
  nativeCurrency: {
    name: "HYPE",
    symbol: "HYPE",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [rpcs.hyperevm || "https://rpc.hyperliquid.xyz/evm"] },
  },
  blockExplorers: {
    default: { name: "Purrsec", url: "https://purrsec.com" },
  },
  testnet: false,
};

const rpcConfig = rpcs as Record<string, string>;

const staticTransports = {
  [mainnet.id]: http(rpcConfig.mainnet || undefined),
  [base.id]: http(rpcConfig.base || undefined),
  [arbitrum.id]: http(rpcConfig.arbitrum || undefined),
  [optimism.id]: http(rpcConfig.optimism || undefined),
  [polygon.id]: http(rpcConfig.polygon || undefined),
  [scroll.id]: http(rpcConfig.scroll || undefined),
  [monad.id]: http(rpcConfig.monad || undefined),
  [megaeth.id]: http(rpcConfig.megaeth || undefined),
  [citrea.id]: http(rpcConfig.citrea || undefined),
  [hyperevm.id]: http(rpcConfig.hyperevm || undefined),
  [bsc.id]: http(rpcConfig.bnb || undefined),
};

const staticChains = [
  mainnet,
  base,
  arbitrum,
  optimism,
  polygon,
  scroll,
  monad,
  megaeth,
  citrea,
  hyperevm,
  bsc,
] as [Chain, ...Chain[]];

const queryClient = new QueryClient();

const metadata = {
  name: "Nexus FastBridge",
  description: "Move assets instantly.",
  url:
    typeof window !== "undefined"
      ? window.location.origin
      : "https://fastbridge.availproject.org",
  icons: [
    "https://fastbridge.availproject.org/landing-assets/fastbridge-icon.svg",
  ],
};

export const wagmiAdapter = new WagmiAdapter({
  networks: staticChains,
  projectId: walletConnectProjectId,
  ssr: false,
  transports: staticTransports,
});

export let appKit: ReturnType<typeof createAppKit> | null = null;

export function initGlobalAppKit() {
  if (appKit) {
    return appKit;
  }

  try {
    appKit = createAppKit({
      adapters: [wagmiAdapter],
      networks: staticChains,
      projectId: walletConnectProjectId,
      metadata,
      allowUnsupportedChain: true,
      features: {
        analytics: true,
        email: false,
        socials: false,
      },
      allWallets: "SHOW",
      enableEIP6963: true,
      featuredWalletIds: [],
      excludeWalletIds: [],
      defaultAccountTypes: { eip155: "eoa" },
      themeMode: "light",
      themeVariables: {
        "--w3m-accent": "#161615",
        "--w3m-border-radius-master": "1px",
      },
    });
    console.log("AppKit initialized successfully");
    return appKit;
  } catch (error) {
    console.error("Failed to initialize AppKit:", error);
  }
}

interface Web3ProviderProps {
  appConfig: AppConfig;
  children: ReactNode;
}

const Web3Provider = ({ children }: Web3ProviderProps) => {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
};

export default Web3Provider;
