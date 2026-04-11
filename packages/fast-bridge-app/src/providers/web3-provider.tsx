"use client";

import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { http, WagmiProvider } from "wagmi";
import {
  arbitrum,
  avalanche,
  base,
  type Chain,
  kaia,
  mainnet,
  monad,
  optimism,
  polygon,
  scroll,
  sophon,
} from "wagmi/chains";
import rpcs from "@/config/rpcs.json";
import type { AppConfig } from "@/types/runtime";

const walletConnectProjectId = import.meta.env.VITE_WALLET_CONNECT_ID;

const megaeth: Chain = {
  id: 4326,
  name: "MegaETH Mainnet",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [rpcs.megaeth || "https://rpcs.avail.so/megaeth"] },
  },
  blockExplorers: {
    default: { name: "Explorer", url: "https://megaeth.blockscout.com" },
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
  [avalanche.id]: http(rpcConfig.avalanche || undefined),
  [sophon.id]: http(rpcConfig.sophon || undefined),
  [kaia.id]: http(rpcConfig.kaia || undefined),
  [monad.id]: http(rpcConfig.monad || undefined),
  [megaeth.id]: http(rpcConfig.megaeth || undefined),
};

const staticChains = [
  mainnet,
  base,
  sophon,
  kaia,
  arbitrum,
  avalanche,
  optimism,
  polygon,
  scroll,
  monad,
  megaeth,
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

createAppKit({
  adapters: [wagmiAdapter],
  networks: staticChains,
  projectId: walletConnectProjectId,
  metadata,
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
});

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
