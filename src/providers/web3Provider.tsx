"use client";
import { createConfig, WagmiProvider } from "wagmi";
import {
  sepolia,
  baseSepolia,
  arbitrumSepolia,
  optimismSepolia,
  polygonAmoy,
  monadTestnet,
  type Chain,
} from "wagmi/chains";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { ConnectKitProvider, getDefaultConfig } from "connectkit";
import config from "../../config";

const monadTestnetChain = {
  ...monadTestnet,
  logo: <img src={config.chainIconUrl} alt={config.chainName} />,
} as unknown as Chain;

const wagmiConfig = createConfig(
  getDefaultConfig({
    appName: "Nexus Elements",
    walletConnectProjectId: config.projectId,
    chains: [
      sepolia,
      baseSepolia,
      arbitrumSepolia,
      optimismSepolia,
      polygonAmoy,
      monadTestnetChain,
    ],
  })
);

const queryClient = new QueryClient();

const Web3Provider = ({ children }: { children: React.ReactNode }) => {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider options={{ initialChainId: config.chainId }}>
          {children}
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default Web3Provider;
