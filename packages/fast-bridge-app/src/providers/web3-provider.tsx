"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectKitProvider, getDefaultConfig } from "connectkit";
import { type ReactNode, useMemo } from "react";
import { createConfig, http, WagmiProvider } from "wagmi";
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
] as const;

const queryClient = new QueryClient();

interface Web3ProviderProps {
  appConfig: AppConfig;
  children: ReactNode;
}

const Web3Provider = ({ appConfig, children }: Web3ProviderProps) => {
  const wagmiConfig = useMemo(() => {
    const destinationChain: Chain = {
      id: appConfig.chainId,
      name: appConfig.chainName,
      nativeCurrency: {
        name: appConfig.chainNativeCurrency.name,
        symbol: appConfig.chainNativeCurrency.symbol,
        decimals: appConfig.chainNativeCurrency.decimals,
      },
      rpcUrls: {
        default: { http: [appConfig.chainRpcUrl] },
      },
      blockExplorers: {
        default: { name: "Explorer", url: appConfig.chainBlockExplorerUrl },
      },
      testnet: appConfig.chainTestnet,
    };

    const transports = {
      ...staticTransports,
      [destinationChain.id]: http(appConfig.chainRpcUrl),
    };

    // De-dupe chains: if the destination is already in staticChains, don't add twice
    const allChains = staticChains.some((c) => c.id === destinationChain.id)
      ? [...staticChains]
      : [destinationChain, ...staticChains];

    const defaultConfigParams = getDefaultConfig({
      appName: appConfig.appTitle ?? "Nexus Elements",
      walletConnectProjectId,
      // @ts-expect-error - wagmi chains tuple type is strict but runtime array works
      chains: allChains,
      transports,
      enableFamily: false,
    });

    return createConfig(defaultConfigParams);
  }, [appConfig]);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider mode="light" theme="minimal">
          {children}
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default Web3Provider;
