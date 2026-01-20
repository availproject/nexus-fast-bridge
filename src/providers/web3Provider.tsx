"use client";

import React from "react";
import { ConnectKitProvider, getDefaultConfig } from "connectkit";
import { WagmiProvider, createConfig, http } from "wagmi";
import {
  mainnet,
  scroll,
  polygon,
  optimism,
  arbitrum,
  base,
  avalanche,
  sophon,
  kaia,
  monad,
  type Chain,
} from "wagmi/chains";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import config from "../../config";

const walletConnectProjectId = import.meta.env.VITE_WALLET_CONNECT_ID;

const chain: Chain = {
  id: config.chainId,
  name: config.chainName,
  nativeCurrency: {
    name: config.chainNativeCurrency.name,
    symbol: config.chainNativeCurrency.symbol,
    decimals: config.chainNativeCurrency.decimals,
  },
  rpcUrls: {
    default: { http: [config.chainRpcUrl] },
  },
  blockExplorers: {
    default: { name: "Explorer", url: config.chainBlockExplorerUrl },
  },
  testnet: config.chainTestnet,
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
  [chain.id]: http(config.chainRpcUrl),
  [monad.id]: http(import.meta.env.VITE_MONAD_RPC),
};

const defaultConfigParams = getDefaultConfig({
  appName: config.appTitle ?? "Nexus Elements",
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
