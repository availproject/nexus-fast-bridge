"use client";

import { appConfig } from "@fastbridge/runtime";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectKitProvider, getDefaultConfig } from "connectkit";
import type React from "react";
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

const walletConnectProjectId = import.meta.env.VITE_WALLET_CONNECT_ID;

const chain: Chain = {
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

const megaeth: Chain = {
  id: 4326,
  name: "MegaETH Mainnet",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [import.meta.env.VITE_MEGAETH_RPC] },
  },
  blockExplorers: {
    default: { name: "Explorer", url: "https://megaeth.blockscout.com" },
  },
  testnet: false,
};

//ideally we should add private rpcs for each, for now it fallbacks to default rpcs
const transports = {
  [mainnet.id]: http(import.meta.env.VITE_MAINNET_RPC),
  [base.id]: http(import.meta.env.VITE_BASE_RPC),
  [arbitrum.id]: http(import.meta.env.VITE_ARBITRUM_RPC),
  [optimism.id]: http(import.meta.env.VITE_OPTIMISM_RPC),
  [polygon.id]: http(import.meta.env.VITE_POLYGON_RPC),
  [scroll.id]: http(import.meta.env.VITE_SCROLL_RPC),
  [avalanche.id]: http(import.meta.env.VITE_AVALANCHE_RPC),
  [sophon.id]: http(import.meta.env.VITE_SOPHON_RPC),
  [kaia.id]: http(import.meta.env.VITE_KAIA_RPC),
  [chain.id]: http(appConfig.chainRpcUrl),
  [monad.id]: http(import.meta.env.VITE_MONAD_RPC),
  [megaeth.id]: http(import.meta.env.VITE_MEGAETH_RPC),
};

const defaultConfigParams = getDefaultConfig({
  appName: appConfig.appTitle ?? "Nexus Elements",
  walletConnectProjectId,
  chains: [
    chain,
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
  ],
  transports,
  enableFamily: false,
});

const wagmiConfig = createConfig(defaultConfigParams);
const queryClient = new QueryClient();

const Web3Provider = ({ children }: { children: React.ReactNode }) => {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider theme="minimal">{children}</ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default Web3Provider;
