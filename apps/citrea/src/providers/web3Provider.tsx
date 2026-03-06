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
import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";

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
  [chain.id]: http(config.chainRpcUrl),
  [monad.id]: http(import.meta.env.VITE_MONAD_RPC),
  [megaeth.id]: http(import.meta.env.VITE_MEGAETH_RPC),
};

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
] as any;

const defaultConfigParams = getDefaultConfig({
  appName: config.appTitle ?? "Citrea Fast Bridge",
  appDescription:
    config.appDescription ?? "Move assets from any chain to Citrea, instantly.",
  appUrl:
    typeof window !== "undefined"
      ? window.location.origin
      : (config.meta.canonicalUrl ??
        "https://fastbridge.availproject.org/citrea"),
  appIcon:
    config.meta.faviconUrl ??
    "https://fastbridge.availproject.org/citrea/faviconV2.png",
  walletConnectProjectId,
  chains: networks as any,
  transports,
  enableFamily: false,
});

const metadata = {
  name: config.appTitle ?? "Citrea Fast Bridge",
  description:
    config.appDescription ?? "Move assets from any chain to Citrea, instantly.",
  url: config.meta.canonicalUrl ?? "https://fastbridge.availproject.org/citrea", // origin must match your domain & subdomain
  icons: [
    config.meta.faviconUrl ??
      "https://fastbridge.availproject.org/citrea/faviconV2.png",
  ],
};

const queryClient = new QueryClient();

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

const Web3Provider = ({ children }: { children: React.ReactNode }) => {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider theme="minimal">{children}</ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default Web3Provider;
