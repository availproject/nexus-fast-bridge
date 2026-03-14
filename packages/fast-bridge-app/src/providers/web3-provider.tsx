"use client";

import { appConfig } from "@fastbridge/runtime";
import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectKitProvider } from "connectkit";
import type React from "react";
import { WagmiProvider } from "wagmi";
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

const networks = [
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
] as [Chain, ...Chain[]];

const metadata = {
  name: appConfig.appTitle ?? "Nexus Elements",
  description: appConfig.appDescription ?? "Move assets instantly.",
  url:
    typeof window !== "undefined"
      ? window.location.origin
      : "https://fastbridge.availproject.org",
  icons: [appConfig.meta?.faviconUrl ?? ""],
};

const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId: walletConnectProjectId,
  ssr: false,
});

createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId: walletConnectProjectId,
  metadata,
  features: {
    analytics: true,
    email: false,
    socials: false,
  },
  allWallets: "SHOW",
  enableEIP6963: true,
  // Ensure that MetaMask and Base are the featured wallets on top
  featuredWalletIds: [
    "c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96", // MetaMask
    "fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa", // Coinbase/Base Wallet
  ],
  excludeWalletIds: [
    "c34de246586459b8a33e82efe825fec5f75ac6cee50098e76abfd8161de827f2",
  ],
  defaultAccountTypes: { eip155: "eoa" },
});

const queryClient = new QueryClient();

const Web3Provider = ({ children }: { children: React.ReactNode }) => {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider mode="light" theme="minimal">
          {children}
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default Web3Provider;
