"use client";
import "@rainbow-me/rainbowkit/styles.css";
import {
  getDefaultConfig,
  RainbowKitProvider,
  type Chain,
} from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
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
  sepolia,
  baseSepolia,
  arbitrumSepolia,
  optimismSepolia,
  polygonAmoy,
} from "wagmi/chains";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import config from "../../config";

const monadTestnet: Chain = {
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

const wagmiConfig = getDefaultConfig({
  appName: "Nexus Elements",
  projectId: config.projectId,
  chains: [
    mainnet,
    base,
    sophon,
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
  ],
});

const queryClient = new QueryClient();

const Web3Provider = ({ children }: { children: React.ReactNode }) => {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider initialChain={config.chainId} modalSize="compact">
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default Web3Provider;
