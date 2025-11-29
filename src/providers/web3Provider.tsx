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
  type Chain,
} from "wagmi/chains";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import config from "../../config";

const walletConnectProjectId = import.meta.env.VITE_WALLET_CONNECT_ID;

const monad: Chain = {
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
    default: { name: "MonVision", url: config.chainBlockExplorerUrl },
  },
  testnet: config.chainTestnet,
};

const defaultConfigParams = getDefaultConfig({
  appName: config.appTitle ?? "Nexus Elements",
  walletConnectProjectId,
  chains: [
    monad,
    mainnet,
    base,
    sophon,
    kaia,
    arbitrum,
    avalanche,
    optimism,
    polygon,
    scroll,
  ],
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
