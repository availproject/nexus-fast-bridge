"use client";
import { createConfig, WagmiProvider } from "wagmi";
import { ConnectKitProvider, getDefaultConfig } from "connectkit";
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
  bsc,
  sepolia,
  baseSepolia,
  arbitrumSepolia,
  optimismSepolia,
  polygonAmoy,
  monadTestnet,
} from "wagmi/chains";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import config from "../../config";
import { defineChain } from "viem";

const walletConnectProjectId = import.meta.env.VITE_WALLET_CONNECT_ID;

const monad = {
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
  iconUrl: config.chainIconUrl,
};

// Add chain icons for RainbowKit
type ConnectKitChain = Chain & { iconUrl?: string; iconBackground?: string };

const hyperEVM = defineChain({
  id: 999,
  name: "HyperEVM",
  nativeCurrency: { name: "HYPE", symbol: "HYPE", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.hyperliquid.xyz/evm"] },
  },
  blockExplorers: {
    default: { name: "HyperEVM Scan", url: "https://hyperevmscan.io" },
  },
});

const hyperEVMWithIcon: ConnectKitChain = {
  ...hyperEVM,
  iconUrl:
    "https://assets.coingecko.com/coins/images/50882/standard/hyperliquid.jpg?1729431300",
  iconBackground: "#0a3cff",
};

const walletConfig = createConfig(
  getDefaultConfig({
    appName: "Monad Fast Bridge",
    walletConnectProjectId: walletConnectProjectId,
    chains: [
      mainnet,
      base,
      sophon,
      bsc,
      kaia,
      arbitrum,
      avalanche,
      optimism,
      polygon,
      scroll,
      sepolia,
      baseSepolia,
      arbitrumSepolia,
      optimismSepolia,
      polygonAmoy,
      monadTestnet,
      monad,
      hyperEVMWithIcon,
    ],
  })
);

const queryClient = new QueryClient();

const Web3Provider = ({ children }: { children: React.ReactNode }) => {
  return (
    <WagmiProvider config={walletConfig}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider
          options={{
            initialChainId: config.chainId,
          }}
        >
          {children}
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default Web3Provider;
